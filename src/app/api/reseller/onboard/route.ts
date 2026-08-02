export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { calculateOfflineAmount, getResellerTierById, RESELLER_CAPS, RESELLER_SYSTEM_FLAGS } from "@config/resellerPricing";
import { DB_COLLECTIONS } from "@constant/database";
import { getGeneratedEmail, getMenuUrl, SIGNIN_URL } from "@constant/urls";
import { getOwnerRoleId } from "@data/defaultRoles";
import { FALLBACK_BUSINESS_TYPE } from "@data/shared/businessTypes";
import {
    createResellerOnboardingBilling,
    getResellerOfflineCapFromError,
    getResellerProfile,
} from "@database/reseller/server";
import { getSubscriptionById } from "@database/subscriptions/server";
import { getCurrentPlatformUser, getCurrentUser } from "@lib/auth/currentPlatformUser";
import { resolveExactSessionPlatformRole } from "@lib/auth/sessionPlatformRole";
import { getBoundedResellerApiStringContext, getResellerApiFailureLogData, logResellerApiFailure } from "@lib/billing/resellerApiDiagnostics";
import { safeSyncStorePlanEntitlementFromSubscription } from "@lib/billing/subscriptionEntitlementSync";
import { revalidateMenuCache } from "@lib/actions/revalidateMenuCache";
import { admin, authAdmin } from "@lib/firebase/firebaseAdmin";
import { sanitizeForFirestore } from "@lib/firestore/sanitizeForFirestore";
import { getBoundedErrorCode } from '@lib/monitoring/boundedLogContext';
import { logger } from "@lib/monitoring/logger";
import { compensateFailedTenantStoreOnboarding } from "@lib/onboarding/compensateFailedOnboarding";
import { createTenantStoreInTransaction, preCheckSubdomain } from "@lib/onboarding/createTenantStore";
import { requireOnboardingUserId } from "@lib/onboarding/onboardingUserId";
import { normalizePhoneNumberForStorage } from "@lib/phone/phoneNumber";
import {
    canDeleteCreatedResellerAuthUser,
    readResellerOwnerClaimInTransaction,
    ResellerOwnerClaimConflictError,
} from "@lib/reseller/resellerOwnerClaim";
import { safelyRecordOwnerReferralPaymentAndRepair } from '@lib/ownerReferral/ownerReferralSettlementServer';
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getOrCreateRazorpayPlan } from "@lib/razorpay/plan-handler";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { normalizeRazorpaySubscriptionCheckoutUrl } from "@lib/razorpay/checkoutUrl";
import {
    projectResellerProviderSubscriptionForAttempt,
    type ResellerProviderSubscription,
} from "@lib/reseller/resellerProviderSubscription";
import {
    getResellerOnboardingOperationFingerprint,
    getMatchingResellerOnboardingOperation,
    getMatchingResellerOnboardingProvisioningOperation,
    isMatchingResellerOnboardingOperation,
    isMatchingResellerOnboardingProvisioningResources,
    isMatchingResellerOnboardingReplayResources,
    type MatchingResellerOnboardingProvisioningOperation,
} from "@lib/reseller/resellerOnboardingOperation";
import {
    projectResellerOfflineCapacity,
    resellerMutationDate,
} from "@lib/reseller/resellerMutationState";
import { isActiveResellerProfileForSession } from "@lib/reseller/resellerProfileAuthority";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import { validateAPIInput } from "@lib/security/inputValidation";
import { getEmailValidationError, validateEmail } from "@lib/validation/emailDomainValidator";
import { ResellerOnboardSchema } from "@lib/validation/resellerSchemas";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { Timestamp } from "firebase/firestore";
import { writeLogEntry } from "logs/utils";
import { withAuth } from "../../../../middleware/auth";
import { hashPublicRateLimitValue } from "../../../../middleware/publicApi";
import { resellerPrivateJson, withResellerPrivateHeaders } from "../readRateLimit";

const LOG_FILE = "reseller-onboarding.log";
const RESELLER_ACTION_MAX_BODY_BYTES = 16 * 1024;
const RESELLER_ONBOARD_AUTH_CLEANUP_FAILED = "reseller_onboard_auth_cleanup_failed";
const RESELLER_ONBOARD_AUTH_FINALIZATION_FAILED = "reseller_onboard_auth_finalization_failed";
const RESELLER_ONBOARD_AUTH_CLAIMS_COMPENSATION_FAILED = "reseller_onboard_auth_claims_compensation_failed";
const RESELLER_ONBOARD_PROVIDER_COMPENSATION_FAILED = "reseller_onboard_provider_compensation_failed";
const RESELLER_ONBOARD_PROVIDER_COMPENSATION_CACHE_REVALIDATION_FAILED = "reseller_onboard_provider_compensation_cache_revalidation_failed";
const RESELLER_ONBOARD_PROVIDER_RECOVERY_HOLD_MS = 15 * 60 * 1000;
const RESELLER_ONBOARD_PROVIDER_RECOVERY_PAGE_SIZE = 100;
const RESELLER_ONBOARD_PROVIDER_RECOVERY_MAX_PAGES = 3;

const removeUndefinedFields = (
    data: FirebaseFirestore.UpdateData<FirebaseFirestore.DocumentData>,
) => sanitizeForFirestore(data, {
    undefinedObjectValue: "omit",
});

const getFirebaseAuthErrorCode = (error: unknown): string | null => {
    return getBoundedErrorCode(error) || null;
};

async function recoverResellerProviderSubscription(params: {
    attempt: Parameters<typeof projectResellerProviderSubscriptionForAttempt>[1];
    startedAtMillis: number;
}): Promise<{
    searchComplete: boolean;
    subscription: ResellerProviderSubscription | null;
}> {
    const from = Math.max(946684800, Math.floor((params.startedAtMillis - RESELLER_ONBOARD_PROVIDER_RECOVERY_HOLD_MS) / 1000));
    const to = Math.floor((Date.now() + RESELLER_ONBOARD_PROVIDER_RECOVERY_HOLD_MS) / 1000);
    let matchingSubscription: ResellerProviderSubscription | null = null;
    for (let page = 0; page < RESELLER_ONBOARD_PROVIDER_RECOVERY_MAX_PAGES; page += 1) {
        const response = await razorpayClient.subscriptions.all({
            count: RESELLER_ONBOARD_PROVIDER_RECOVERY_PAGE_SIZE,
            from,
            plan_id: params.attempt.providerPlanId,
            skip: page * RESELLER_ONBOARD_PROVIDER_RECOVERY_PAGE_SIZE,
            to,
        });
        const candidates = response.items
            .map((candidate) => projectResellerProviderSubscriptionForAttempt(candidate, params.attempt))
            .filter((candidate): candidate is ResellerProviderSubscription => candidate !== null);
        if (candidates.length > 1 || (matchingSubscription && candidates.length > 0)) {
            throw new Error('Multiple provider subscriptions match one reseller onboarding operation.');
        }
        if (candidates[0]) matchingSubscription = candidates[0];
        if (response.items.length < RESELLER_ONBOARD_PROVIDER_RECOVERY_PAGE_SIZE) {
            return { searchComplete: true, subscription: matchingSubscription };
        }
    }
    return { searchComplete: false, subscription: null };
}

async function deleteResellerProvisioningOperation(params: {
    db: admin.firestore.Firestore;
    fingerprint: string;
    operationId: string;
    resellerId: string;
    storeId: number;
    tenantId: number;
}): Promise<void> {
    const operationRef = params.db.collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS).doc(params.operationId);
    await params.db.runTransaction(async (transaction) => {
        const snapshot = await transaction.get(operationRef);
        const operation = getMatchingResellerOnboardingProvisioningOperation({
            fingerprint: params.fingerprint,
            operationData: snapshot.data(),
            operationId: params.operationId,
            resellerId: params.resellerId,
        });
        if (
            !snapshot.exists
            || !operation
            || operation.storeId !== params.storeId
            || operation.tenantId !== params.tenantId
        ) {
            throw new Error('Reseller onboarding provisioning operation changed before cleanup.');
        }
        transaction.delete(operationRef);
    });
}

async function getAuthUserByEmail(email: string) {
    try {
        return await authAdmin.getUserByEmail(email);
    } catch (error: unknown) {
        if (getFirebaseAuthErrorCode(error) === 'auth/user-not-found') return null;
        throw error;
    }
}

async function assertOwnerLoginIsAvailable(params: {
    db: admin.firestore.Firestore;
    email: string;
    existingFirebaseUid?: string;
    existingOwnerDocId?: string;
    username: string;
}) {
    const [emailSnapshot, usernameSnapshot, authUser] = await Promise.all([
        params.db.collection(DB_COLLECTIONS.USERS).where('email', '==', params.email).limit(2).get(),
        params.db.collection(DB_COLLECTIONS.USERS).where('username', '==', params.username).limit(2).get(),
        getAuthUserByEmail(params.email),
    ]);

    if (emailSnapshot.docs.some((emailDoc) => emailDoc.id !== params.existingOwnerDocId)) {
        return "This owner email is already linked to another MenuList account.";
    }

    if (usernameSnapshot.docs.some((usernameDoc) => usernameDoc.id !== params.existingOwnerDocId)) {
        return "This owner phone is already used as a login username.";
    }

    if (authUser && authUser.uid !== params.existingOwnerDocId && authUser.uid !== params.existingFirebaseUid) {
        return "This owner email already has a login account.";
    }

    return null;
}

async function prepareOwnerAuthUser(params: {
    active: boolean;
    displayName: string;
    email: string;
    existingOwnerData?: Record<string, unknown>;
    existingOwnerDocId?: string;
    password: string;
}) {
    const storedFirebaseUid = typeof params.existingOwnerData?.firebaseUid === 'string'
        ? params.existingOwnerData.firebaseUid.trim()
        : '';
    const existingAuthId = storedFirebaseUid || params.existingOwnerDocId;
    let authUser = existingAuthId
        ? await authAdmin.getUser(existingAuthId).catch((error: unknown): null => {
            if (getFirebaseAuthErrorCode(error) === 'auth/user-not-found') return null;
            throw error;
        })
        : null;

    if (!authUser) {
        authUser = await getAuthUserByEmail(params.email);
    }

    if (authUser) {
        return {
            active: params.active,
            cleanupOnFailure: false,
            requiresProfileUpdate: true,
            uid: authUser.uid,
        };
    }

    const createdUser = await authAdmin.createUser({
        disabled: !params.active,
        displayName: params.displayName,
        email: params.email,
        emailVerified: true,
        password: params.password,
    });

    return {
        active: params.active,
        cleanupOnFailure: true,
        requiresProfileUpdate: false,
        uid: createdUser.uid,
    };
}

async function compensateResellerOnboardingFailure(params: {
    authUid: string;
    db: admin.firestore.Firestore;
    reason: string;
    resellerId: string;
    storeId: number;
    tenantId: number;
    userId: string;
}): Promise<boolean> {
    const context = {
        ...getBoundedResellerApiStringContext('resellerId', params.resellerId),
        ...getBoundedResellerApiStringContext('tenantId', params.tenantId),
        ...getBoundedResellerApiStringContext('storeId', params.storeId),
        ...getBoundedResellerApiStringContext('authUid', params.authUid),
    };

    try {
        await compensateFailedTenantStoreOnboarding({
            db: params.db,
            reason: params.reason,
            source: "RESELLER_ONBOARDING",
            storeId: params.storeId,
            tenantId: params.tenantId,
            userId: params.userId,
        });
    } catch (compensationError) {
        logResellerApiFailure(RESELLER_ONBOARD_PROVIDER_COMPENSATION_FAILED, compensationError, context);
        return false;
    }

    try {
        await authAdmin.setCustomUserClaims(params.authUid, {
            platformRole: 'OWNER',
            role: getOwnerRoleId(),
            uId: params.userId,
        });
    } catch (claimsError) {
        logResellerApiFailure(RESELLER_ONBOARD_AUTH_CLAIMS_COMPENSATION_FAILED, claimsError, context);
    }

    try {
        await revalidateMenuCache(params.storeId, { tId: params.tenantId });
    } catch (cacheError) {
        logResellerApiFailure(RESELLER_ONBOARD_PROVIDER_COMPENSATION_CACHE_REVALIDATION_FAILED, cacheError, context);
    }

    return true;
}

/**
 * POST /api/reseller/onboard — Reseller creates store + subscription for a client
 * 
 * Reuses atomic transaction pattern from /api/onboarding/create-subscription.
 * For online: creates Razorpay subscription (same as self-serve).
 * For offline: creates manual subscription with validUntil.
 * 
 * @see __docs__/reseller-dashboard/reseller-dashboard_impl.md §4.1
 */
export const POST = withAuth(async (request, session) => {
    const resellerId = session.user.id;
    const isPlatformUser = resolveExactSessionPlatformRole(session) === 'PLATFORM';

    try {
        // 0. Feature flag check
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return resellerPrivateJson({ error: "Feature not available." }, { status: 404 });
        }

        // 1. Rate limiting
        const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');
        const resellerRateLimitHash = hashPublicRateLimitValue(resellerId);
        const rateLimitResult = await checkRateLimit({
            key: `reseller-onboard:${resellerRateLimitHash}`,
            ...rateLimitConfig,
            failClosedOnProviderError: true,
        });
        if (!rateLimitResult.allowed) {
            if (rateLimitResult.reason === 'provider_unavailable') {
                return resellerPrivateJson({
                    error: "Service temporarily unavailable. Please try again later.",
                }, { status: 503 });
            }
            return resellerPrivateJson({
                error: "Too many requests. Please try again later.",
                resetAt: rateLimitResult.resetAt,
            }, { status: 429 });
        }

        // 2. Validate input
        const bodyResult = await readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
        });
        if (bodyResult.ok === false) return withResellerPrivateHeaders(bodyResult.response);
        const validation = validateAPIInput(ResellerOnboardSchema, bodyResult.data);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            logger.security('Reseller Onboard Input Validation Failed', {
                ...getBoundedSecurityRouteContext(session, request),
                endpoint: '/api/reseller/onboard',
                error: errorMsg,
            }, 'medium');
            return resellerPrivateJson({ error: 'Invalid input', details: errorMsg }, { status: 400 });
        }

        const { operationId, businessName, businessType, ownerCountryCode, ownerDialCode, ownerPhone, ownerEmail, ownerPassword, pricingTier, billingInterval, commitmentMonths, locationCount, paymentMode } = validation.data;

        // 3. Validate reseller profile exists and is active
        const [currentActor, resellerProfile] = await Promise.all([
            isPlatformUser ? getCurrentPlatformUser(session) : getCurrentUser(session),
            isPlatformUser
                ? Promise.resolve(null)
                : getResellerProfile(
                    resellerId,
                    session.user.email,
                    session.user.resellerProfileId,
                ),
        ]);
        if (!currentActor) {
            return resellerPrivateJson({ error: "Access denied." }, { status: 403 });
        }
        if (!isPlatformUser && !isActiveResellerProfileForSession({
            actorId: resellerId,
            profile: resellerProfile,
            sessionEmail: session.user.email,
            sessionProfileId: session.user.resellerProfileId,
        })) {
            logger.security('Reseller Onboard - Profile Not Found or Inactive', {
                ...getBoundedSecurityRouteContext(session, request),
                ...getBoundedResellerApiStringContext('resellerId', resellerId),
            }, 'high');
            return resellerPrivateJson({ error: "Reseller profile not found or inactive." }, { status: 403 });
        }

        // 4. Validate pricing tier is active (sunset flags)
        const tier = getResellerTierById(pricingTier);
        if (!tier) {
            return resellerPrivateJson({ error: "Selected pricing tier is not available." }, { status: 400 });
        }

        // 5. If offline: check concurrent cap + system flag
        if (paymentMode === 'offline') {
            if (!RESELLER_SYSTEM_FLAGS.OFFLINE_MODE_ACTIVE) {
                return resellerPrivateJson({ error: "Offline payment mode is no longer available." }, { status: 400 });
            }
            const offlineCapacity = isPlatformUser
                ? null
                : projectResellerOfflineCapacity(
                    resellerProfile,
                    RESELLER_CAPS.MAX_CONCURRENT_OFFLINE_PER_RESELLER,
                );
            if (!isPlatformUser && !offlineCapacity) {
                return resellerPrivateJson({
                    error: "Reseller profile capacity needs support review.",
                }, { status: 409 });
            }
            if (offlineCapacity && offlineCapacity.current >= offlineCapacity.cap) {
                return resellerPrivateJson({
                    error: `Maximum offline activations reached (${offlineCapacity.cap}). Use online payment mode or wait for existing stores to expire.`,
                }, { status: 409 });
            }
        }

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RESELLER_ONBOARD_STARTED',
            data: {
                ...getBoundedResellerApiStringContext('resellerId', resellerId),
                ...getBoundedResellerApiStringContext('businessName', businessName),
                ...getBoundedResellerApiStringContext('pricingTier', pricingTier),
                paymentMode,
                locationCount,
            },
        });

        // 6. Normalize owner login and recover an already-committed request.
        const db = admin.firestore();
        const normalizedOwnerEmail = ownerEmail?.toLowerCase()?.trim() || '';
        const normalizedOwnerPhone = normalizePhoneNumberForStorage({
            countryCode: ownerCountryCode,
            dialCode: ownerDialCode,
            phoneNumber: ownerPhone,
        });
        const ownerUsername = normalizedOwnerPhone.phoneUsername;
        if (ownerUsername.length < 10 || ownerUsername.length > 15) {
            return resellerPrivateJson({ error: "Enter a valid owner phone number." }, { status: 400 });
        }
        const ownerLoginEmail = normalizedOwnerEmail || getGeneratedEmail(ownerUsername);
        const emailValidation = validateEmail(ownerLoginEmail);
        if (!emailValidation.valid) {
            return resellerPrivateJson({ error: getEmailValidationError(ownerLoginEmail) }, { status: 400 });
        }

        const operationFingerprint = getResellerOnboardingOperationFingerprint({
            billingInterval,
            businessName,
            businessType,
            commitmentMonths: commitmentMonths || null,
            locationCount,
            ownerLoginEmail,
            ownerPassword,
            ownerUsername,
            paymentMode,
            pricingTier,
        });
        const operationRef = db.collection(DB_COLLECTIONS.RESELLER_TRANSACTIONS).doc(operationId);
        let resumedProvisioningOperation: MatchingResellerOnboardingProvisioningOperation | null = null;
        let provisioningStartedAtMillis = Date.now();
        let persistedProviderPlanId: string | null = null;
        let providerRecoveryAvailableAtMillis = 0;
        const existingOperationSnapshot = await operationRef.get();
        if (existingOperationSnapshot.exists) {
            const operation = existingOperationSnapshot.data() || {};
            const matchingOperation = getMatchingResellerOnboardingOperation({
                fingerprint: operationFingerprint,
                operationData: operation,
                operationId,
                resellerId,
            });
            resumedProvisioningOperation = getMatchingResellerOnboardingProvisioningOperation({
                fingerprint: operationFingerprint,
                operationData: operation,
                operationId,
                resellerId,
            });
            if (resumedProvisioningOperation) {
                const provisioningStartedAt = resellerMutationDate(operation.createdOn);
                const recoveryAvailableAt = resellerMutationDate(operation.providerRecoveryAvailableAt);
                if (!provisioningStartedAt) {
                    return resellerPrivateJson({ error: "This onboarding result needs support review." }, { status: 409 });
                }
                provisioningStartedAtMillis = provisioningStartedAt.getTime();
                persistedProviderPlanId = typeof operation.providerPlanId === 'string'
                    ? operation.providerPlanId.trim() || null
                    : null;
                providerRecoveryAvailableAtMillis = recoveryAvailableAt?.getTime() || 0;
            }
            if (!matchingOperation && !resumedProvisioningOperation) {
                return resellerPrivateJson({ error: "This onboarding retry belongs to another request." }, { status: 409 });
            }
            if (matchingOperation) {
            const replaySubscriptionId = matchingOperation.subscriptionId;
            const replayStoreId = matchingOperation.storeId;
            const replayTenantId = matchingOperation.tenantId;
            const [replaySubscription, replayStoreSnapshot] = await Promise.all([
                getSubscriptionById(replaySubscriptionId),
                db.collection(DB_COLLECTIONS.STORES).doc(String(replayStoreId)).get(),
            ]);
            if (!replaySubscription || !replayStoreSnapshot.exists) {
                return resellerPrivateJson({ error: "This onboarding result needs support review." }, { status: 409 });
            }
            const replayStore = replayStoreSnapshot.data() || {};
            if (!isMatchingResellerOnboardingReplayResources({
                resellerId,
                storeData: replayStore,
                storeId: replayStoreId,
                subscriptionData: replaySubscription,
                tenantId: replayTenantId,
            })) {
                return resellerPrivateJson({ error: "This onboarding result needs support review." }, { status: 409 });
            }
            const replaySubdomain = String(replayStore.subdomain || '').trim() || undefined;
            const replayShortUrl = normalizeRazorpaySubscriptionCheckoutUrl(replaySubscription.shortUrl) || undefined;
            if (replaySubscription.billingMode === 'auto' && !replayShortUrl) {
                return resellerPrivateJson({ error: "This payment link needs support review." }, { status: 409 });
            }
            if (replaySubscription.billingMode === 'manual' && replaySubscription.status === 'active') {
                const replayPaidAt = resellerMutationDate(operation.validFrom);
                if (!replayPaidAt) {
                    return resellerPrivateJson({ error: "This onboarding result needs support review." }, { status: 409 });
                }
                await safeSyncStorePlanEntitlementFromSubscription(
                    replaySubscription,
                    'api:reseller-onboard-offline-replay',
                );
                await safelyRecordOwnerReferralPaymentAndRepair({
                    paidScope: { tenantId: replayTenantId, storeId: replayStoreId },
                    evidence: {
                        paidAt: replayPaidAt,
                        paymentEvidenceId: operationId,
                        source: 'api:reseller-onboard-offline-replay',
                        subscriptionId: replaySubscriptionId,
                    },
                });
            }

            return resellerPrivateJson({
                dashboardUrl: SIGNIN_URL,
                locationCount,
                loginEmail: ownerLoginEmail,
                ownerUsername,
                passwordSet: true,
                publicUrl: replaySubdomain ? getMenuUrl(replaySubdomain) : undefined,
                shortUrl: replayShortUrl,
                status: replaySubscription.status === 'active' ? 'active' : 'pending',
                storeId: replayStoreId,
                subdomain: replaySubdomain,
                subscriptionId: replaySubscriptionId,
                tenantId: replayTenantId,
                transactionId: operationId,
            });
            }
        }

        let authAccount: {
            active: boolean;
            cleanupOnFailure: boolean;
            requiresProfileUpdate: boolean;
            uid: string;
        };
        let result: {
            authUid: string;
            loginEmail: string;
            ownerUsername: string;
            storeId: number;
            storeName: string;
            subdomain?: string;
            tenantId: number;
            userId: string;
        };

        if (resumedProvisioningOperation) {
            const [storeSnapshot, userSnapshot] = await Promise.all([
                db.collection(DB_COLLECTIONS.STORES).doc(String(resumedProvisioningOperation.storeId)).get(),
                db.collection(DB_COLLECTIONS.USERS).doc(resumedProvisioningOperation.userId).get(),
            ]);
            if (
                !storeSnapshot.exists
                || !userSnapshot.exists
                || !isMatchingResellerOnboardingProvisioningResources({
                    operation: resumedProvisioningOperation,
                    ownerEmail: ownerLoginEmail,
                    ownerUsername,
                    resellerId,
                    storeData: storeSnapshot.data(),
                    userData: userSnapshot.data(),
                })
            ) {
                return resellerPrivateJson({ error: "This onboarding result needs support review." }, { status: 409 });
            }
            const storeData = storeSnapshot.data() || {};
            const persistedSubdomain = typeof storeData.subdomain === 'string'
                ? storeData.subdomain.trim()
                : '';
            authAccount = {
                active: userSnapshot.data()?.active !== false,
                cleanupOnFailure: false,
                requiresProfileUpdate: true,
                uid: resumedProvisioningOperation.authUid,
            };
            result = {
                authUid: resumedProvisioningOperation.authUid,
                loginEmail: ownerLoginEmail,
                ownerUsername,
                storeId: resumedProvisioningOperation.storeId,
                storeName: typeof storeData.name === 'string' ? storeData.name : businessName,
                subdomain: persistedSubdomain || undefined,
                tenantId: resumedProvisioningOperation.tenantId,
                userId: resumedProvisioningOperation.userId,
            };
        } else {
        // Pre-check subdomain uniqueness (must be outside transaction).
        const preCheckedSubdomain = await preCheckSubdomain(db, businessName);

        const existingOwnerSnapshot = await db.collection(DB_COLLECTIONS.USERS)
            .where('email', '==', ownerLoginEmail)
            .limit(1)
            .get();
        const existingOwnerDoc = existingOwnerSnapshot && !existingOwnerSnapshot.empty
            ? existingOwnerSnapshot.docs[0]
            : null;
        const existingOwnerData = existingOwnerDoc?.data();

        if (existingOwnerData?.tenantId || existingOwnerData?.storeId) {
            return resellerPrivateJson({
                error: "This owner login is already linked to another business. Use a different email or phone.",
            }, { status: 409 });
        }

        const uniquenessError = await assertOwnerLoginIsAvailable({
            db,
            email: ownerLoginEmail,
            existingFirebaseUid: existingOwnerData?.firebaseUid,
            existingOwnerDocId: existingOwnerDoc?.id,
            username: ownerUsername,
        });
        if (uniquenessError) {
            return resellerPrivateJson({ error: uniquenessError }, { status: 409 });
        }

        authAccount = await prepareOwnerAuthUser({
            active: existingOwnerData?.active !== false,
            displayName: businessName,
            email: ownerLoginEmail,
            existingOwnerData,
            existingOwnerDocId: existingOwnerDoc?.id,
            password: ownerPassword,
        });

        try {
            result = await db.runTransaction(async (transaction) => {
                const userId = requireOnboardingUserId(existingOwnerDoc?.id || authAccount.uid);
                const ownerClaim = await readResellerOwnerClaimInTransaction({
                    authUid: authAccount.uid,
                    db,
                    existingOwnerExpected: Boolean(existingOwnerDoc),
                    expectedEmail: ownerLoginEmail,
                    transaction,
                    userId,
                });
                // Centralized tenant + store creation
                const core = await createTenantStoreInTransaction(transaction, db, {
                    businessName,
                    businessType: businessType || FALLBACK_BUSINESS_TYPE,
                    businessIndustry: 'B2C',
                    email: normalizedOwnerEmail || ownerLoginEmail,
                    onboardingSource: 'RESELLER_ONBOARDING',
                    subdomain: { preChecked: preCheckedSubdomain },
                    includeTimeSlotPresets: true,
                    tenantExtra: {
                        countryCode: normalizedOwnerPhone.countryCode,
                        dialCode: normalizedOwnerPhone.dialCode,
                        phone: normalizedOwnerPhone.phone,
                        phoneNumber: normalizedOwnerPhone.phoneNumber,
                        resellerId,
                    },
                    storeExtra: {
                        countryCode: normalizedOwnerPhone.countryCode,
                        dialCode: normalizedOwnerPhone.dialCode,
                        phone: normalizedOwnerPhone.phone,
                        phoneNumber: normalizedOwnerPhone.phoneNumber,
                        resellerId,
                    },
                });

                const ownerStoreMapping = { storeId: core.storeId, name: core.storeName, role: getOwnerRoleId() };
                if (existingOwnerDoc) {
                    const freshOwnerData = ownerClaim.data;
                    const currentStores = Array.isArray(freshOwnerData.stores) ? freshOwnerData.stores : [];
                    const currentStoreIds = Array.isArray(freshOwnerData.storeIds) ? freshOwnerData.storeIds : [];

                    transaction.update(ownerClaim.ref, removeUndefinedFields({
                        active: freshOwnerData.active !== false,
                        firebaseUid: authAccount.uid,
                        isVerified: true,
                        tenantId: core.tenantId,
                        storeId: core.storeId,
                        stores: [...currentStores, ownerStoreMapping],
                        storeIds: Array.from(new Set([...currentStoreIds, core.storeId])),
                        platformRole: freshOwnerData.platformRole || 'OWNER',
                        role: freshOwnerData.role || getOwnerRoleId(),
                        onboardingSource: 'RESELLER_ONBOARDING',
                        email: ownerLoginEmail,
                        loginEmail: ownerLoginEmail,
                        pendingOwnerEmail: null,
                        countryCode: normalizedOwnerPhone.countryCode,
                        dialCode: normalizedOwnerPhone.dialCode,
                        phone: normalizedOwnerPhone.phone,
                        phoneNumber: normalizedOwnerPhone.phoneNumber,
                        phoneUsername: ownerUsername,
                        username: ownerUsername,
                        modifiedOn: core.now,
                    }));
                } else {
                    transaction.create(ownerClaim.ref, {
                        firebaseUid: authAccount.uid,
                        countryCode: normalizedOwnerPhone.countryCode,
                        dialCode: normalizedOwnerPhone.dialCode,
                        phone: normalizedOwnerPhone.phone,
                        phoneNumber: normalizedOwnerPhone.phoneNumber,
                        phoneUsername: ownerUsername,
                        username: ownerUsername,
                        email: ownerLoginEmail,
                        loginEmail: ownerLoginEmail,
                        contactEmail: normalizedOwnerEmail || null,
                        pendingOwnerEmail: null,
                        name: businessName,
                        isVerified: true,
                        active: true,
                        platformRole: "OWNER",
                        role: getOwnerRoleId(),
                        tenantId: core.tenantId,
                        storeId: core.storeId,
                        stores: [ownerStoreMapping],
                        storeIds: [core.storeId],
                        profileImage: "",
                        createdVia: "reseller-onboarding",
                        onboardingSource: "RESELLER_ONBOARDING",
                        claimToken: null,
                        claimTokenExpiresAt: null,
                        createdOn: core.now,
                        modifiedOn: core.now,
                    });
                }

                transaction.create(operationRef, {
                    action: 'ONBOARD',
                    authUid: authAccount.uid,
                    createdOn: core.now,
                    modifiedOn: core.now,
                    operationFingerprint,
                    operationId,
                    paymentMode,
                    resellerId,
                    status: 'provider_provisioning',
                    storeId: core.storeId,
                    tenantId: core.tenantId,
                    userId,
                });

                return {
                    authUid: authAccount.uid,
                    loginEmail: ownerLoginEmail,
                    ownerUsername,
                    storeId: core.storeId,
                    storeName: core.storeName,
                    subdomain: core.subdomain,
                    tenantId: core.tenantId,
                    userId,
                };
            });
        } catch (error) {
            if (authAccount.cleanupOnFailure) {
                try {
                    if (await canDeleteCreatedResellerAuthUser(db, authAccount.uid)) {
                        await authAdmin.deleteUser(authAccount.uid);
                    }
                } catch (cleanupError) {
                    logResellerApiFailure(RESELLER_ONBOARD_AUTH_CLEANUP_FAILED, cleanupError, {
                        ...getBoundedResellerApiStringContext('resellerId', resellerId),
                        ...getBoundedResellerApiStringContext('authUid', authAccount.uid),
                        ...getBoundedResellerApiStringContext('ownerLoginEmail', ownerLoginEmail),
                        hadExistingOwnerDoc: Boolean(existingOwnerDoc),
                    });
                }
            }
            if (error instanceof ResellerOwnerClaimConflictError) {
                return resellerPrivateJson({ error: "This owner login was linked by another request." }, { status: 409 });
            }
            throw error;
        }
        }

        try {
            await authAdmin.setCustomUserClaims(result.authUid, {
                platformRole: 'OWNER',
                role: getOwnerRoleId(),
                tenantId: String(result.tenantId),
                storeId: String(result.storeId),
                uId: result.userId,
            });
            if (authAccount.requiresProfileUpdate) {
                await authAdmin.updateUser(result.authUid, {
                    disabled: !authAccount.active,
                    displayName: businessName,
                    email: ownerLoginEmail,
                    emailVerified: true,
                    password: ownerPassword,
                });
            }
        } catch (authFinalizationError) {
            logResellerApiFailure(RESELLER_ONBOARD_AUTH_FINALIZATION_FAILED, authFinalizationError, {
                ...getBoundedResellerApiStringContext('resellerId', resellerId),
                ...getBoundedResellerApiStringContext('tenantId', result.tenantId),
                ...getBoundedResellerApiStringContext('storeId', result.storeId),
                ...getBoundedResellerApiStringContext('authUid', result.authUid),
            });
            return resellerPrivateJson({
                error: 'Owner access setup is still incomplete. Retry this onboarding request.',
            }, { status: 503 });
        }

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RESELLER_ONBOARD_TRANSACTION_COMPLETE',
            data: {
                ...getBoundedResellerApiStringContext('resellerId', resellerId),
                ...getBoundedResellerApiStringContext('tenantId', result.tenantId),
                ...getBoundedResellerApiStringContext('storeId', result.storeId),
            },
        });

        try {
            await revalidateMenuCache(result.storeId, { tId: result.tenantId });
        } catch (cacheError) {
            logResellerApiFailure('reseller_onboard_cache_revalidation_failed', cacheError, {
                ...getBoundedResellerApiStringContext('resellerId', resellerId),
                ...getBoundedResellerApiStringContext('tenantId', result.tenantId),
                ...getBoundedResellerApiStringContext('storeId', result.storeId),
            });
        }

        // 7. Create provider/manual subscription plus ledger/profile state.
        let subscriptionId = '';
        let shortUrl: string | undefined;
        const transactionId = operationId;
        const durationForOffline = commitmentMonths || 3;
        const billingAmount = billingInterval === 'MONTH' ? tier.monthlyPriceINR : tier.yearlyPriceINR;
        const transactionBase = {
            action: 'ONBOARD' as const,
            billingInterval,
            commitmentMonths: paymentMode === 'offline' ? durationForOffline : commitmentMonths,
            currency: 'INR' as const,
            locationCount,
            operationFingerprint,
            operationId,
            paymentMode,
            pricingTier,
            resellerEmail: session.user.email || '',
            resellerId,
            resellerProfileId: resellerProfile?.id || null,
            storeId: result.storeId,
            storeName: result.storeName,
            subscriptionQuantity: locationCount,
            tenantId: result.tenantId,
        };

        if (paymentMode === 'online') {
            const totalCount = billingInterval === 'MONTH' ? 36 : 3;
            let razorpayPlanId = '';
            let razorpaySubscription: ResellerProviderSubscription | null = null;
            let providerOutcomeMayExist = Boolean(persistedProviderPlanId);

            try {
                razorpayPlanId = await getOrCreateRazorpayPlan({
                    price: billingAmount,
                    currency: 'INR',
                    interval: billingInterval,
                    userType: 'B2C',
                    planId: tier.planId,
                });
                if (persistedProviderPlanId && persistedProviderPlanId !== razorpayPlanId) {
                    return resellerPrivateJson({ error: "This onboarding result needs support review." }, { status: 409 });
                }
                const providerAttempt = {
                    locationCount,
                    operationFingerprint,
                    operationId,
                    planId: tier.planId,
                    providerPlanId: razorpayPlanId,
                    resellerId,
                    storeId: result.storeId,
                    tenantId: result.tenantId,
                };
                if (persistedProviderPlanId) {
                    const recovery = await recoverResellerProviderSubscription({
                        attempt: providerAttempt,
                        startedAtMillis: provisioningStartedAtMillis,
                    });
                    if (!recovery.searchComplete) {
                        return resellerPrivateJson({
                            error: 'Payment setup needs support review before it can continue.',
                        }, { status: 503 });
                    }
                    razorpaySubscription = recovery.subscription;
                    if (!razorpaySubscription && Date.now() < providerRecoveryAvailableAtMillis) {
                        return resellerPrivateJson({
                            error: 'Payment setup is still being verified. Retry this onboarding request later.',
                        }, { status: 503 });
                    }
                }
                if (!razorpaySubscription) {
                    const recoveryAvailableAt = Date.now() + RESELLER_ONBOARD_PROVIDER_RECOVERY_HOLD_MS;
                    await db.runTransaction(async (firestoreTransaction) => {
                        const operationSnapshot = await firestoreTransaction.get(operationRef);
                        const provisioningOperation = getMatchingResellerOnboardingProvisioningOperation({
                            fingerprint: operationFingerprint,
                            operationData: operationSnapshot.data(),
                            operationId,
                            resellerId,
                        });
                        if (
                            !operationSnapshot.exists
                            || !provisioningOperation
                            || provisioningOperation.storeId !== result.storeId
                            || provisioningOperation.tenantId !== result.tenantId
                            || provisioningOperation.userId !== result.userId
                        ) {
                            throw new Error('Reseller onboarding provisioning operation changed.');
                        }
                        const currentProviderPlanId = operationSnapshot.data()?.providerPlanId;
                        if (currentProviderPlanId && currentProviderPlanId !== razorpayPlanId) {
                            throw new Error('Reseller onboarding provider plan changed.');
                        }
                        firestoreTransaction.update(operationRef, {
                            modifiedOn: admin.firestore.Timestamp.now(),
                            providerPlanId: razorpayPlanId,
                            providerRecoveryAvailableAt: admin.firestore.Timestamp.fromMillis(recoveryAvailableAt),
                            providerStartedAt: operationSnapshot.data()?.providerStartedAt || admin.firestore.Timestamp.now(),
                        });
                    });
                    providerOutcomeMayExist = true;
                    providerRecoveryAvailableAtMillis = recoveryAvailableAt;
                    try {
                        const providerSubscription = await razorpayClient.subscriptions.create({
                            plan_id: razorpayPlanId,
                            total_count: totalCount,
                            quantity: locationCount,
                            notes: {
                                tenantId: result.tenantId,
                                storeId: result.storeId,
                                userId: result.userId,
                                userType: 'B2C',
                                planId: tier.planId,
                                priceKey: 'priceINR',
                                interval: billingInterval,
                                name: businessName,
                                email: result.loginEmail,
                                ownerUsername: result.ownerUsername,
                                price: billingAmount,
                                locationCount,
                                resellerId,
                                operationId,
                                operationFingerprint,
                                remainingCredits: 0,
                            },
                        });
                        razorpaySubscription = projectResellerProviderSubscriptionForAttempt(
                            providerSubscription,
                            providerAttempt,
                        );
                    } catch (providerCreateError) {
                        try {
                            const recovery = await recoverResellerProviderSubscription({
                                attempt: providerAttempt,
                                startedAtMillis: provisioningStartedAtMillis,
                            });
                            razorpaySubscription = recovery.searchComplete ? recovery.subscription : null;
                        } catch (providerRecoveryError) {
                            logResellerApiFailure('reseller_onboard_provider_recovery_failed', providerRecoveryError, {
                                ...getBoundedResellerApiStringContext('resellerId', resellerId),
                                ...getBoundedResellerApiStringContext('tenantId', result.tenantId),
                                ...getBoundedResellerApiStringContext('storeId', result.storeId),
                            });
                        }
                        if (!razorpaySubscription) {
                            logResellerApiFailure('reseller_onboard_provider_recovery_pending', providerCreateError, {
                                ...getBoundedResellerApiStringContext('resellerId', resellerId),
                                ...getBoundedResellerApiStringContext('tenantId', result.tenantId),
                                ...getBoundedResellerApiStringContext('storeId', result.storeId),
                            });
                            return resellerPrivateJson({
                                error: 'Payment setup is still being verified. Retry this onboarding request later.',
                            }, { status: 503 });
                        }
                    }
                }
                if (!razorpaySubscription) {
                    return resellerPrivateJson({
                        error: 'Payment setup is still being verified. Retry this onboarding request later.',
                    }, { status: 503 });
                }
                shortUrl = razorpaySubscription.checkoutUrl;
            } catch (providerError) {
                if (providerOutcomeMayExist && !razorpaySubscription) {
                    logResellerApiFailure('reseller_onboard_provider_recovery_pending', providerError, {
                        ...getBoundedResellerApiStringContext('resellerId', resellerId),
                        ...getBoundedResellerApiStringContext('tenantId', result.tenantId),
                        ...getBoundedResellerApiStringContext('storeId', result.storeId),
                    });
                    return resellerPrivateJson({
                        error: 'Payment setup is still being verified. Retry this onboarding request later.',
                    }, { status: 503 });
                }
                if (razorpaySubscription?.id) {
                    try {
                        await razorpayClient.subscriptions.cancel(razorpaySubscription.id);
                    } catch (providerCompensationError) {
                        logResellerApiFailure(RESELLER_ONBOARD_PROVIDER_COMPENSATION_FAILED, providerCompensationError, {
                            ...getBoundedResellerApiStringContext('resellerId', resellerId),
                            ...getBoundedResellerApiStringContext('subscriptionId', razorpaySubscription.id),
                        });
                        throw providerError;
                    }
                }
                const compensated = await compensateResellerOnboardingFailure({
                    authUid: result.authUid,
                    db,
                    reason: 'reseller_online_provider_setup_failed',
                    resellerId,
                    storeId: result.storeId,
                    tenantId: result.tenantId,
                    userId: result.userId,
                });
                if (compensated) {
                    await deleteResellerProvisioningOperation({
                        db,
                        fingerprint: operationFingerprint,
                        operationId,
                        resellerId,
                        storeId: result.storeId,
                        tenantId: result.tenantId,
                    });
                }
                throw providerError;
            }

            if (!razorpaySubscription) {
                throw new Error('Razorpay subscription response is invalid.');
            }
            subscriptionId = razorpaySubscription.id;
            const subscriptionPayload: Omit<FirestoreSubscriptionDoc, "id"> = {
                paymentProvider: 'razorpay',
                providerSubscriptionId: subscriptionId,
                providerPlanId: razorpayPlanId,
                userId: result.userId,
                name: businessName,
                email: result.loginEmail,
                tenantId: result.tenantId,
                storeId: result.storeId,
                planType: billingInterval,
                userType: 'B2C',
                currency: 'INR',
                amount: billingAmount,
                status: 'pending',
                lastWebhook: null,
                planId: tier.planId,
                planName: tier.displayName,
                cycleStartDate: null,
                subscriptionEndDate: null,
                subscriptionStartDate: null,
                pastDueSinceAt: null,
                totalPaymentsNeededCount: totalCount,
                totalPaymentsMadeCount: 0,
                cycleEndDate: null,
                renewsOn: null,
                monthlyCreditsAllowance: tier.monthlyCredits,
                monthlyCredits: tier.monthlyCredits,
                topUpCredits: 0,
                creditsLastResetMonth: new Date().getFullYear() * 100 + (new Date().getMonth() + 1),
                shortUrl,
                paymentMethod: { type: '', brand: '', last4: '', upiId: '', upiTransactionId: '' },
                statuses: [{
                    status: 'pending',
                    timestamp: Timestamp.now(),
                    amount: billingAmount * locationCount,
                    currency: 'INR',
                    remark: `Reseller onboarding (${tier.name}) — ${locationCount} location${locationCount > 1 ? 's' : ''} awaiting client payment`,
                }],
                billingHistory: [],
                quantity: locationCount,
                billingMode: 'auto',
                onboardingSource: 'RESELLER_ONBOARDING',
                resellerId,
                resellerProfileId: resellerProfile?.id || null,
                resellerPricingTier: pricingTier,
                commitmentPeriodMonths: commitmentMonths || null,
            };

            try {
                await createResellerOnboardingBilling({
                    profileId: resellerProfile?.id,
                    subscription: subscriptionPayload,
                    subscriptionId,
                    transaction: {
                        ...transactionBase,
                        amountExpected: billingAmount * locationCount,
                        profileRevenueRecognized: false,
                        status: 'pending_payment',
                        subscriptionId,
                        validFrom: null,
                        validUntil: null,
                    },
                });
            } catch (persistenceError) {
                const [subscriptionRead, operationRead] = await Promise.allSettled([
                    getSubscriptionById(subscriptionId),
                    operationRef.get(),
                ]);
                if (subscriptionRead.status === 'rejected' || operationRead.status === 'rejected') {
                    logResellerApiFailure('reseller_onboard_billing_commit_verification_failed', persistenceError, {
                        ...getBoundedResellerApiStringContext('resellerId', resellerId),
                        ...getBoundedResellerApiStringContext('subscriptionId', subscriptionId),
                    });
                    return resellerPrivateJson({
                        error: 'Billing setup is still being verified. Retry this onboarding request.',
                    }, { status: 503 });
                }
                const persistedSubscription = subscriptionRead.value;
                const persistedOperation = operationRead.value;
                const operationPersisted = Boolean(
                    persistedOperation?.exists
                    && isMatchingResellerOnboardingOperation({
                        fingerprint: operationFingerprint,
                        operationData: persistedOperation.data(),
                        operationId,
                        resellerId,
                    }),
                );
                if (persistedSubscription?.providerSubscriptionId !== subscriptionId || !operationPersisted) {
                    try {
                        await razorpayClient.subscriptions.cancel(subscriptionId);
                    } catch (providerCompensationError) {
                        logResellerApiFailure(RESELLER_ONBOARD_PROVIDER_COMPENSATION_FAILED, providerCompensationError, {
                            ...getBoundedResellerApiStringContext('resellerId', resellerId),
                            ...getBoundedResellerApiStringContext('subscriptionId', subscriptionId),
                        });
                        throw persistenceError;
                    }
                    const compensated = await compensateResellerOnboardingFailure({
                        authUid: result.authUid,
                        db,
                        reason: 'reseller_online_billing_persistence_failed',
                        resellerId,
                        storeId: result.storeId,
                        tenantId: result.tenantId,
                        userId: result.userId,
                    });
                    if (compensated) {
                        await deleteResellerProvisioningOperation({
                            db,
                            fingerprint: operationFingerprint,
                            operationId,
                            resellerId,
                            storeId: result.storeId,
                            tenantId: result.tenantId,
                        });
                    }
                    throw persistenceError;
                }
            }
        } else {
            const paidAt = new Date();
            const validUntil = new Date(paidAt);
            validUntil.setMonth(validUntil.getMonth() + durationForOffline);
            const totalAmount = calculateOfflineAmount(pricingTier, durationForOffline, locationCount);
            subscriptionId = `manual_${operationId}`;
            const paidAtTimestamp = Timestamp.fromDate(paidAt);
            const validUntilTimestamp = Timestamp.fromDate(validUntil);
            const subscriptionPayload: Omit<FirestoreSubscriptionDoc, "id"> = {
                paymentProvider: 'razorpay',
                providerSubscriptionId: subscriptionId,
                providerPlanId: '',
                userId: result.userId,
                name: businessName,
                email: result.loginEmail,
                tenantId: result.tenantId,
                storeId: result.storeId,
                planType: 'MONTH',
                userType: 'B2C',
                currency: 'INR',
                amount: totalAmount,
                status: 'active',
                lastWebhook: null,
                planId: tier.planId,
                planName: tier.displayName,
                cycleStartDate: paidAtTimestamp,
                subscriptionEndDate: validUntilTimestamp,
                subscriptionStartDate: paidAtTimestamp,
                pastDueSinceAt: null,
                totalPaymentsNeededCount: 1,
                totalPaymentsMadeCount: 1,
                cycleEndDate: validUntilTimestamp,
                renewsOn: null,
                monthlyCreditsAllowance: tier.monthlyCredits,
                monthlyCredits: tier.monthlyCredits,
                topUpCredits: 0,
                creditsLastResetMonth: new Date().getFullYear() * 100 + (new Date().getMonth() + 1),
                shortUrl: '',
                paymentMethod: { type: 'offline', brand: '', last4: '', upiId: '', upiTransactionId: '' },
                statuses: [{
                    status: 'active',
                    timestamp: paidAtTimestamp,
                    amount: totalAmount,
                    currency: 'INR',
                    remark: `Reseller offline onboarding (${tier.name}) — ${locationCount} location${locationCount > 1 ? 's' : ''}, ${durationForOffline} months`,
                }],
                billingHistory: [],
                quantity: locationCount,
                billingMode: 'manual',
                validUntil: validUntilTimestamp,
                onboardingSource: 'RESELLER_ONBOARDING',
                resellerId,
                resellerProfileId: resellerProfile?.id || null,
                resellerPricingTier: pricingTier,
                commitmentPeriodMonths: durationForOffline,
                manualPaymentConfirmed: true,
                manualPaymentConfirmedAt: paidAtTimestamp,
            };

            try {
                await createResellerOnboardingBilling({
                    profileId: resellerProfile?.id,
                    subscription: subscriptionPayload,
                    subscriptionId,
                    transaction: {
                        ...transactionBase,
                        amountExpected: totalAmount,
                        profileRevenueRecognized: true,
                        status: 'active',
                        subscriptionId,
                        validFrom: paidAtTimestamp,
                        validUntil: validUntilTimestamp,
                    },
                });
            } catch (persistenceError) {
                const exceededOfflineCap = getResellerOfflineCapFromError(persistenceError);
                const [subscriptionRead, operationRead] = await Promise.allSettled([
                    getSubscriptionById(subscriptionId),
                    operationRef.get(),
                ]);
                if (subscriptionRead.status === 'rejected' || operationRead.status === 'rejected') {
                    logResellerApiFailure('reseller_onboard_billing_commit_verification_failed', persistenceError, {
                        ...getBoundedResellerApiStringContext('resellerId', resellerId),
                        ...getBoundedResellerApiStringContext('subscriptionId', subscriptionId),
                    });
                    return resellerPrivateJson({
                        error: 'Billing setup is still being verified. Retry this onboarding request.',
                    }, { status: 503 });
                }
                const persistedSubscription = subscriptionRead.value;
                const persistedOperation = operationRead.value;
                const operationPersisted = Boolean(
                    persistedOperation?.exists
                    && isMatchingResellerOnboardingOperation({
                        fingerprint: operationFingerprint,
                        operationData: persistedOperation.data(),
                        operationId,
                        resellerId,
                    }),
                );
                if (persistedSubscription?.providerSubscriptionId !== subscriptionId || !operationPersisted) {
                    const compensated = await compensateResellerOnboardingFailure({
                        authUid: result.authUid,
                        db,
                        reason: exceededOfflineCap
                            ? 'reseller_offline_cap_rejected'
                            : 'reseller_offline_billing_persistence_failed',
                        resellerId,
                        storeId: result.storeId,
                        tenantId: result.tenantId,
                        userId: result.userId,
                    });
                    if (compensated) {
                        await deleteResellerProvisioningOperation({
                            db,
                            fingerprint: operationFingerprint,
                            operationId,
                            resellerId,
                            storeId: result.storeId,
                            tenantId: result.tenantId,
                        });
                    }
                    if (exceededOfflineCap && compensated) {
                        return resellerPrivateJson({
                            error: `Maximum offline activations reached (${exceededOfflineCap}). Use online payment mode or wait for existing stores to expire.`,
                        }, { status: 409 });
                    }
                    throw persistenceError;
                }
            }

            await safeSyncStorePlanEntitlementFromSubscription(
                { ...subscriptionPayload, id: subscriptionId },
                'api:reseller-onboard-offline',
            );
            await safelyRecordOwnerReferralPaymentAndRepair({
                paidScope: { tenantId: result.tenantId, storeId: result.storeId },
                evidence: {
                    paidAt,
                    paymentEvidenceId: operationId,
                    source: 'api:reseller-onboard-offline',
                    subscriptionId,
                },
            });
        }

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RESELLER_ONBOARD_COMPLETE',
            data: {
                ...getBoundedResellerApiStringContext('resellerId', resellerId),
                ...getBoundedResellerApiStringContext('tenantId', result.tenantId),
                ...getBoundedResellerApiStringContext('storeId', result.storeId),
                ...getBoundedResellerApiStringContext('subscriptionId', subscriptionId),
                ...getBoundedResellerApiStringContext('transactionId', transactionId),
                paymentMode,
            },
        });

        return resellerPrivateJson({
            storeId: result.storeId,
            tenantId: result.tenantId,
            subscriptionId,
            shortUrl,
            publicUrl: result.subdomain ? getMenuUrl(result.subdomain) : undefined,
            dashboardUrl: SIGNIN_URL,
            loginEmail: result.loginEmail,
            ownerUsername: result.ownerUsername,
            passwordSet: true,
            locationCount,
            subdomain: result.subdomain,
            status: paymentMode === 'offline' ? 'active' : 'pending',
            transactionId,
        });

    } catch (error) {
        logResellerApiFailure('reseller_onboard_route_failed', error, {
            ...getBoundedResellerApiStringContext('resellerId', resellerId),
        });
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RESELLER_ONBOARD_ERROR',
            data: getResellerApiFailureLogData('reseller_onboard_route_failed', error, {
                ...getBoundedResellerApiStringContext('resellerId', resellerId),
            }),
        });
        return resellerPrivateJson(
            { error: 'Failed to onboard client. Please try again.' },
            { status: 500 }
        );
    }
}, { requiredPlatformRole: 'RESELLER' });

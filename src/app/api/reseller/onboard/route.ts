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
import { getCurrentPlatformUser } from "@lib/auth/currentPlatformUser";
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
    projectResellerProviderSubscription,
    type ResellerProviderSubscription,
} from "@lib/reseller/resellerProviderSubscription";
import {
    getResellerOnboardingOperationFingerprint,
    getMatchingResellerOnboardingOperation,
    isMatchingResellerOnboardingOperation,
    isMatchingResellerOnboardingReplayResources,
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
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";
import { hashPublicRateLimitValue } from "../../../../middleware/publicApi";

const LOG_FILE = "reseller-onboarding.log";
const RESELLER_ACTION_MAX_BODY_BYTES = 16 * 1024;
const RESELLER_ONBOARD_AUTH_CLEANUP_FAILED = "reseller_onboard_auth_cleanup_failed";
const RESELLER_ONBOARD_AUTH_CLAIMS_COMPENSATION_FAILED = "reseller_onboard_auth_claims_compensation_failed";
const RESELLER_ONBOARD_PROVIDER_COMPENSATION_FAILED = "reseller_onboard_provider_compensation_failed";
const RESELLER_ONBOARD_PROVIDER_COMPENSATION_CACHE_REVALIDATION_FAILED = "reseller_onboard_provider_compensation_cache_revalidation_failed";

const removeUndefinedFields = (data: Record<string, unknown>) => sanitizeForFirestore(data, {
    undefinedObjectValue: "omit",
});

const getFirebaseAuthErrorCode = (error: unknown): string | null => {
    return getBoundedErrorCode(error) || null;
};

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
        ? await authAdmin.getUser(existingAuthId).catch((error: unknown) => {
            if (getFirebaseAuthErrorCode(error) === 'auth/user-not-found') return null;
            throw error;
        })
        : null;

    if (!authUser) {
        authUser = await getAuthUserByEmail(params.email);
    }

    if (authUser) {
        await authAdmin.updateUser(authUser.uid, {
            disabled: !params.active,
            displayName: params.displayName,
            email: params.email,
            emailVerified: true,
            password: params.password,
        });
        return { cleanupOnFailure: false, uid: authUser.uid };
    }

    const createdUser = await authAdmin.createUser({
        disabled: !params.active,
        displayName: params.displayName,
        email: params.email,
        emailVerified: true,
        password: params.password,
    });

    return { cleanupOnFailure: true, uid: createdUser.uid };
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
            return NextResponse.json({ error: "Feature not available." }, { status: 404 });
        }

        // 1. Rate limiting
        const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');
        const resellerRateLimitHash = hashPublicRateLimitValue(resellerId);
        const rateLimitResult = await checkRateLimit({
            key: `reseller-onboard:${resellerRateLimitHash}`,
            ...rateLimitConfig,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({
                error: "Too many requests. Please try again later.",
                resetAt: rateLimitResult.resetAt,
            }, { status: 429 });
        }

        // 2. Validate input
        const bodyResult = await readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const validation = validateAPIInput(ResellerOnboardSchema, bodyResult.data);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            logger.security('Reseller Onboard Input Validation Failed', {
                ...getBoundedSecurityRouteContext(session, request),
                endpoint: '/api/reseller/onboard',
                error: errorMsg,
            }, 'medium');
            return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
        }

        const { operationId, businessName, businessType, ownerCountryCode, ownerDialCode, ownerPhone, ownerEmail, ownerPassword, pricingTier, billingInterval, commitmentMonths, locationCount, paymentMode } = validation.data;

        // 3. Validate reseller profile exists and is active
        const resellerProfile = isPlatformUser
            ? null
            : await getResellerProfile(
                resellerId,
                session.user.email,
                session.user.resellerProfileId,
            );
        if (isPlatformUser) {
            if (!await getCurrentPlatformUser(session)) {
                return NextResponse.json({ error: "Access denied." }, { status: 403 });
            }
        } else if (!isActiveResellerProfileForSession({
            actorId: resellerId,
            profile: resellerProfile,
            sessionEmail: session.user.email,
            sessionProfileId: session.user.resellerProfileId,
        })) {
            logger.security('Reseller Onboard - Profile Not Found or Inactive', {
                ...getBoundedSecurityRouteContext(session, request),
                ...getBoundedResellerApiStringContext('resellerId', resellerId),
            }, 'high');
            return NextResponse.json({ error: "Reseller profile not found or inactive." }, { status: 403 });
        }

        // 4. Validate pricing tier is active (sunset flags)
        const tier = getResellerTierById(pricingTier);
        if (!tier) {
            return NextResponse.json({ error: "Selected pricing tier is not available." }, { status: 400 });
        }

        // 5. If offline: check concurrent cap + system flag
        if (paymentMode === 'offline') {
            if (!RESELLER_SYSTEM_FLAGS.OFFLINE_MODE_ACTIVE) {
                return NextResponse.json({ error: "Offline payment mode is no longer available." }, { status: 400 });
            }
            const offlineCapacity = isPlatformUser
                ? null
                : projectResellerOfflineCapacity(
                    resellerProfile,
                    RESELLER_CAPS.MAX_CONCURRENT_OFFLINE_PER_RESELLER,
                );
            if (!isPlatformUser && !offlineCapacity) {
                return NextResponse.json({
                    error: "Reseller profile capacity needs support review.",
                }, { status: 409 });
            }
            if (offlineCapacity && offlineCapacity.current >= offlineCapacity.cap) {
                return NextResponse.json({
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
            return NextResponse.json({ error: "Enter a valid owner phone number." }, { status: 400 });
        }
        const ownerLoginEmail = normalizedOwnerEmail || getGeneratedEmail(ownerUsername);
        const emailValidation = validateEmail(ownerLoginEmail);
        if (!emailValidation.valid) {
            return NextResponse.json({ error: getEmailValidationError(ownerLoginEmail) }, { status: 400 });
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
        const existingOperationSnapshot = await operationRef.get();
        if (existingOperationSnapshot.exists) {
            const operation = existingOperationSnapshot.data() || {};
            const matchingOperation = getMatchingResellerOnboardingOperation({
                fingerprint: operationFingerprint,
                operationData: operation,
                operationId,
                resellerId,
            });
            if (!matchingOperation) {
                return NextResponse.json({ error: "This onboarding retry belongs to another request." }, { status: 409 });
            }

            const replaySubscriptionId = matchingOperation.subscriptionId;
            const replayStoreId = matchingOperation.storeId;
            const replayTenantId = matchingOperation.tenantId;
            const [replaySubscription, replayStoreSnapshot] = await Promise.all([
                getSubscriptionById(replaySubscriptionId),
                db.collection(DB_COLLECTIONS.STORES).doc(String(replayStoreId)).get(),
            ]);
            if (!replaySubscription || !replayStoreSnapshot.exists) {
                return NextResponse.json({ error: "This onboarding result needs support review." }, { status: 409 });
            }
            const replayStore = replayStoreSnapshot.data() || {};
            if (!isMatchingResellerOnboardingReplayResources({
                resellerId,
                storeData: replayStore,
                storeId: replayStoreId,
                subscriptionData: replaySubscription,
                tenantId: replayTenantId,
            })) {
                return NextResponse.json({ error: "This onboarding result needs support review." }, { status: 409 });
            }
            const replaySubdomain = String(replayStore.subdomain || '').trim() || undefined;
            const replayShortUrl = normalizeRazorpaySubscriptionCheckoutUrl(replaySubscription.shortUrl) || undefined;
            if (replaySubscription.billingMode === 'auto' && !replayShortUrl) {
                return NextResponse.json({ error: "This payment link needs support review." }, { status: 409 });
            }
            if (replaySubscription.billingMode === 'manual' && replaySubscription.status === 'active') {
                const replayPaidAt = resellerMutationDate(operation.validFrom);
                if (!replayPaidAt) {
                    return NextResponse.json({ error: "This onboarding result needs support review." }, { status: 409 });
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

            return NextResponse.json({
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
            return NextResponse.json({
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
            return NextResponse.json({ error: uniquenessError }, { status: 409 });
        }

        const authAccount = await prepareOwnerAuthUser({
            active: existingOwnerData?.active !== false,
            displayName: businessName,
            email: ownerLoginEmail,
            existingOwnerData,
            existingOwnerDocId: existingOwnerDoc?.id,
            password: ownerPassword,
        });

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
                return NextResponse.json({ error: "This owner login was linked by another request." }, { status: 409 });
            }
            throw error;
        }

        await authAdmin.setCustomUserClaims(result.authUid, {
            platformRole: 'OWNER',
            role: getOwnerRoleId(),
            tenantId: String(result.tenantId),
            storeId: String(result.storeId),
            uId: result.userId,
        });

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

            try {
                razorpayPlanId = await getOrCreateRazorpayPlan({
                    price: billingAmount,
                    currency: 'INR',
                    interval: billingInterval,
                    userType: 'B2C',
                    planId: tier.planId,
                });
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
                        remainingCredits: 0,
                    },
                });
                razorpaySubscription = projectResellerProviderSubscription(providerSubscription);
                if (!razorpaySubscription) {
                    throw new Error('Razorpay subscription response is invalid.');
                }
                shortUrl = razorpaySubscription.checkoutUrl;
            } catch (providerError) {
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
                await compensateResellerOnboardingFailure({
                    authUid: result.authUid,
                    db,
                    reason: 'reseller_online_provider_setup_failed',
                    resellerId,
                    storeId: result.storeId,
                    tenantId: result.tenantId,
                    userId: result.userId,
                });
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
                const [persistedSubscription, persistedOperation] = await Promise.all([
                    getSubscriptionById(subscriptionId).catch(() => null),
                    operationRef.get().catch(() => null),
                ]);
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
                    await compensateResellerOnboardingFailure({
                        authUid: result.authUid,
                        db,
                        reason: 'reseller_online_billing_persistence_failed',
                        resellerId,
                        storeId: result.storeId,
                        tenantId: result.tenantId,
                        userId: result.userId,
                    });
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
                const [persistedSubscription, persistedOperation] = await Promise.all([
                    getSubscriptionById(subscriptionId).catch(() => null),
                    operationRef.get().catch(() => null),
                ]);
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
                    if (exceededOfflineCap && compensated) {
                        return NextResponse.json({
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

        return NextResponse.json({
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
        return NextResponse.json(
            { error: 'Failed to onboard client. Please try again.' },
            { status: 500 }
        );
    }
}, { requiredPlatformRole: 'RESELLER' });

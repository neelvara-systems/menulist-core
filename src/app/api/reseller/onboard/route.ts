export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { calculateOfflineAmount, getResellerTierById, RESELLER_CAPS, RESELLER_SYSTEM_FLAGS } from "@config/resellerPricing";
import { DB_COLLECTIONS } from "@constant/database";
import { getGeneratedEmail, getMenuUrl, SIGNIN_URL } from "@constant/urls";
import { getOwnerRoleId } from "@data/defaultRoles";
import { FALLBACK_BUSINESS_TYPE } from "@data/shared/businessTypes";
import { createResellerTransaction, getResellerProfile, updateResellerStatsOnOnboarding } from "@database/reseller/server";
import { createInitialSubscription } from "@database/subscriptions/server";
import { getBoundedResellerApiStringContext, getResellerApiFailureLogData, logResellerApiFailure } from "@lib/billing/resellerApiDiagnostics";
import { safeSyncStorePlanEntitlementFromSubscription } from "@lib/billing/subscriptionEntitlementSync";
import { revalidateMenuCache } from "@lib/actions/revalidateMenuCache";
import { admin, authAdmin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { compensateFailedTenantStoreOnboarding } from "@lib/onboarding/compensateFailedOnboarding";
import { createTenantStoreInTransaction, preCheckSubdomain } from "@lib/onboarding/createTenantStore";
import { requireOnboardingUserId } from "@lib/onboarding/onboardingUserId";
import { normalizePhoneNumberForStorage } from "@lib/phone/phoneNumber";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getOrCreateRazorpayPlan } from "@lib/razorpay/plan-handler";
import { razorpayClient } from "@lib/razorpay/razorpay";
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

const removeUndefinedFields = (data: Record<string, unknown>) => Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
);

async function getAuthUserByEmail(email: string) {
    try {
        return await authAdmin.getUserByEmail(email);
    } catch (error: any) {
        if (error?.code === 'auth/user-not-found') return null;
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
        params.db.collection(DB_COLLECTIONS.USERS).where('email', '==', params.email).limit(1).get(),
        params.db.collection(DB_COLLECTIONS.USERS).where('username', '==', params.username).limit(1).get(),
        getAuthUserByEmail(params.email),
    ]);

    const emailDoc = emailSnapshot.docs[0];
    if (emailDoc && emailDoc.id !== params.existingOwnerDocId) {
        return "This owner email is already linked to another MenuList account.";
    }

    const usernameDoc = usernameSnapshot.docs[0];
    if (usernameDoc && usernameDoc.id !== params.existingOwnerDocId) {
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
    existingOwnerData?: admin.firestore.DocumentData;
    existingOwnerDocId?: string;
    password: string;
}) {
    const existingAuthId = params.existingOwnerData?.firebaseUid || params.existingOwnerDocId;
    let authUser = existingAuthId
        ? await authAdmin.getUser(String(existingAuthId)).catch((error: any) => {
            if (error?.code === 'auth/user-not-found') return null;
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

async function compensateResellerPaymentProviderFailure(params: {
    authUid: string;
    db: admin.firestore.Firestore;
    resellerId: string;
    storeId: number;
    tenantId: number;
    userId: string;
}) {
    const context = {
        ...getBoundedResellerApiStringContext('resellerId', params.resellerId),
        ...getBoundedResellerApiStringContext('tenantId', params.tenantId),
        ...getBoundedResellerApiStringContext('storeId', params.storeId),
        ...getBoundedResellerApiStringContext('authUid', params.authUid),
    };

    try {
        await compensateFailedTenantStoreOnboarding({
            db: params.db,
            reason: 'reseller_online_provider_setup_failed',
            source: "RESELLER_ONBOARDING",
            storeId: params.storeId,
            tenantId: params.tenantId,
            userId: params.userId,
        });
    } catch (compensationError) {
        logResellerApiFailure(RESELLER_ONBOARD_PROVIDER_COMPENSATION_FAILED, compensationError, context);
        return;
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
    const isPlatformUser = session.user.platformRole === 'PLATFORM' || session.platformRole === 'PLATFORM';

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
        const body = bodyResult.data as any;
        const validation = validateAPIInput(ResellerOnboardSchema, body);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            logger.security('Reseller Onboard Input Validation Failed', {
                ...getBoundedSecurityRouteContext(session, request),
                endpoint: '/api/reseller/onboard',
                error: errorMsg,
            }, 'medium');
            return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
        }

        const { businessName, businessType, ownerCountryCode, ownerDialCode, ownerPhone, ownerEmail, ownerPassword, pricingTier, billingInterval, commitmentMonths, locationCount, paymentMode } = validation.data;

        // 3. Validate reseller profile exists and is active
        const resellerProfile = await getResellerProfile(resellerId, session.user.email);
        if (!isPlatformUser && (!resellerProfile || !resellerProfile.active)) {
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
            const offlineCap = resellerProfile?.maxOfflineActivations || RESELLER_CAPS.MAX_CONCURRENT_OFFLINE_PER_RESELLER;
            if (!isPlatformUser && resellerProfile && resellerProfile.currentActiveOfflineStores >= offlineCap) {
                return NextResponse.json({
                    error: `Maximum offline activations reached (${offlineCap}). Use online payment mode or wait for existing stores to expire.`,
                }, { status: 400 });
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

        // 6. ATOMIC TRANSACTION: Create Tenant, Store, User (centralized utility)
        const db = admin.firestore();

        // Pre-check subdomain uniqueness (must be outside transaction)
        const preCheckedSubdomain = await preCheckSubdomain(db, businessName);
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
                const userId = existingOwnerDoc?.id || authAccount.uid;

                if (existingOwnerDoc) {
                    const currentStores = Array.isArray(existingOwnerData?.stores) ? existingOwnerData.stores : [];
                    const currentStoreIds = Array.isArray(existingOwnerData?.storeIds) ? existingOwnerData.storeIds : [];

                    transaction.update(existingOwnerDoc.ref, removeUndefinedFields({
                        active: existingOwnerData?.active !== false,
                        firebaseUid: authAccount.uid,
                        isVerified: true,
                        tenantId: core.tenantId,
                        storeId: core.storeId,
                        stores: [...currentStores, ownerStoreMapping],
                        storeIds: Array.from(new Set([...currentStoreIds, core.storeId])),
                        platformRole: existingOwnerData?.platformRole || 'OWNER',
                        role: existingOwnerData?.role || getOwnerRoleId(),
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
                    const userRef = db.collection(DB_COLLECTIONS.USERS).doc(requireOnboardingUserId(authAccount.uid));

                    transaction.set(userRef, {
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
                    await authAdmin.deleteUser(authAccount.uid);
                } catch (cleanupError) {
                    logResellerApiFailure(RESELLER_ONBOARD_AUTH_CLEANUP_FAILED, cleanupError, {
                        ...getBoundedResellerApiStringContext('resellerId', resellerId),
                        ...getBoundedResellerApiStringContext('authUid', authAccount.uid),
                        ...getBoundedResellerApiStringContext('ownerLoginEmail', ownerLoginEmail),
                        hadExistingOwnerDoc: Boolean(existingOwnerDoc),
                    });
                }
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

        // 7. Create Subscription
        let subscriptionId = '';
        let shortUrl: string | undefined;
        const durationForOffline = commitmentMonths || 3;
        const billingAmount = billingInterval === 'MONTH' ? tier.monthlyPriceINR : tier.yearlyPriceINR;

        if (paymentMode === 'online') {
            // Create Razorpay Subscription (same as self-serve)
            const totalCount = (billingInterval || 'MONTH') === 'MONTH' ? 36 : 3;
            let razorpayPlanId = '';
            let razorpaySubscription: any;

            try {
                razorpayPlanId = await getOrCreateRazorpayPlan({
                    price: billingAmount,
                    currency: 'INR',
                    interval: billingInterval || 'MONTH',
                    userType: 'B2C',
                    planId: tier.planId,
                });

                razorpaySubscription = await razorpayClient.subscriptions.create({
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
                        interval: billingInterval || 'MONTH',
                        name: businessName,
                        email: result.loginEmail,
                        ownerUsername: result.ownerUsername,
                        price: billingAmount,
                        locationCount,
                        resellerId,
                        remainingCredits: 0,
                    },
                });
            } catch (providerError) {
                await compensateResellerPaymentProviderFailure({
                    authUid: result.authUid,
                    db,
                    resellerId,
                    storeId: result.storeId,
                    tenantId: result.tenantId,
                    userId: result.userId,
                });
                throw providerError;
            }

            subscriptionId = razorpaySubscription.id;
            shortUrl = razorpaySubscription.short_url;

            // Create Firestore subscription record
            const subscriptionPayload: Omit<FirestoreSubscriptionDoc, "id"> = {
                paymentProvider: "razorpay",
                providerSubscriptionId: razorpaySubscription.id,
                providerPlanId: razorpayPlanId,
                userId: result.userId,
                name: businessName,
                email: result.loginEmail,
                tenantId: result.tenantId,
                storeId: result.storeId,
                planType: billingInterval || 'MONTH',
                userType: 'B2C',
                currency: 'INR',
                amount: billingAmount,
                status: "pending",
                lastWebhook: null,
                planId: tier.planId,
                planName: tier.displayName,
                cycleStartDate: null as any,
                subscriptionEndDate: null as any,
                subscriptionStartDate: null as any,
                pastDueSinceAt: null as any,
                totalPaymentsNeededCount: totalCount,
                totalPaymentsMadeCount: 0,
                cycleEndDate: null as any,
                renewsOn: null as any,
                monthlyCreditsAllowance: tier.monthlyCredits,
                monthlyCredits: tier.monthlyCredits,
                topUpCredits: 0,
                creditsLastResetMonth: new Date().getFullYear() * 100 + (new Date().getMonth() + 1),
                shortUrl: razorpaySubscription.short_url,
                paymentMethod: { type: "", brand: "", last4: "", upiId: "", upiTransactionId: "" },
                statuses: [{
                    status: "pending",
                    timestamp: Timestamp.now(),
                    amount: billingAmount * locationCount,
                    currency: 'INR',
                    remark: `Reseller onboarding (${tier.name}) — ${locationCount} location${locationCount > 1 ? 's' : ''} awaiting client payment`,
                }],
                billingHistory: [],
                quantity: locationCount,
                // Reseller fields
                billingMode: 'auto',
                onboardingSource: 'RESELLER_ONBOARDING',
                resellerId,
                resellerProfileId: resellerProfile?.id || null,
                resellerPricingTier: pricingTier,
                commitmentPeriodMonths: commitmentMonths || null,
            };

            await createInitialSubscription(razorpaySubscription.id, subscriptionPayload);
            if (resellerProfile?.id) {
                await updateResellerStatsOnOnboarding(
                    resellerProfile.id,
                    paymentMode,
                    billingAmount * locationCount,
                );
            }
        } else {
            // OFFLINE: Create manual subscription
            const now = new Date();
            const validUntil = new Date(now);
            validUntil.setMonth(validUntil.getMonth() + durationForOffline);

            const totalAmount = calculateOfflineAmount(pricingTier, durationForOffline, locationCount);
            subscriptionId = `manual_${result.tenantId}_${result.storeId}_${Date.now()}`;

            const subscriptionPayload: Omit<FirestoreSubscriptionDoc, "id"> = {
                paymentProvider: "razorpay",
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
                status: "active",
                lastWebhook: null,
                planId: tier.planId,
                planName: tier.displayName,
                cycleStartDate: Timestamp.now(),
                subscriptionEndDate: Timestamp.fromDate(validUntil),
                subscriptionStartDate: Timestamp.now(),
                pastDueSinceAt: null as any,
                totalPaymentsNeededCount: 1,
                totalPaymentsMadeCount: 1,
                cycleEndDate: Timestamp.fromDate(validUntil),
                renewsOn: null as any,
                monthlyCreditsAllowance: tier.monthlyCredits,
                monthlyCredits: tier.monthlyCredits,
                topUpCredits: 0,
                creditsLastResetMonth: new Date().getFullYear() * 100 + (new Date().getMonth() + 1),
                shortUrl: '',
                paymentMethod: { type: "offline", brand: "", last4: "", upiId: "", upiTransactionId: "" },
                statuses: [{
                    status: "active",
                    timestamp: Timestamp.now(),
                    amount: totalAmount,
                    currency: 'INR',
                    remark: `Reseller offline onboarding (${tier.name}) — ${locationCount} location${locationCount > 1 ? 's' : ''}, ${durationForOffline} months`,
                }],
                billingHistory: [],
                quantity: locationCount,
                // Reseller fields
                billingMode: 'manual',
                validUntil: Timestamp.fromDate(validUntil),
                onboardingSource: 'RESELLER_ONBOARDING',
                resellerId,
                resellerProfileId: resellerProfile?.id || null,
                resellerPricingTier: pricingTier,
                commitmentPeriodMonths: durationForOffline,
                manualPaymentConfirmed: true,
                manualPaymentConfirmedAt: Timestamp.now(),
            };

            await createInitialSubscription(subscriptionId, subscriptionPayload);
            await safeSyncStorePlanEntitlementFromSubscription(
                { ...subscriptionPayload, id: subscriptionId },
                'api:reseller-onboard-offline',
            );
            if (resellerProfile?.id) {
                await updateResellerStatsOnOnboarding(resellerProfile.id, paymentMode, totalAmount);
            }
        }

        // 8. Create reseller transaction record (immutable)
        const transactionId = await createResellerTransaction({
            resellerId,
            resellerProfileId: resellerProfile?.id || null,
            resellerEmail: session.user.email || '',
            storeId: result.storeId,
            tenantId: result.tenantId,
            storeName: 'Main Store',
            action: 'ONBOARD',
            pricingTier,
            billingInterval: billingInterval || 'MONTH',
            commitmentMonths: commitmentMonths || durationForOffline,
            amountExpected: paymentMode === 'offline'
                ? calculateOfflineAmount(pricingTier, durationForOffline, locationCount)
                : billingAmount * locationCount,
            currency: 'INR',
            locationCount,
            subscriptionQuantity: locationCount,
            paymentMode,
            status: paymentMode === 'offline' ? 'active' : 'pending_payment',
            subscriptionId,
            validFrom: paymentMode === 'offline' ? Timestamp.now() : null,
            validUntil: paymentMode === 'offline' ? Timestamp.fromDate((() => {
                const d = new Date();
                d.setMonth(d.getMonth() + durationForOffline);
                return d;
            })()) : null,
        });

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
            userId: result.userId,
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

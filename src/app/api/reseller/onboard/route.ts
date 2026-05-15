export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { calculateOfflineAmount, getResellerTierById, RESELLER_CAPS, RESELLER_SYSTEM_FLAGS } from "@config/resellerPricing";
import { DB_COLLECTIONS } from "@constant/database";
import { getGeneratedEmail, getMenuUrl, SIGNIN_URL } from "@constant/urls";
import { getOwnerRoleId } from "@data/defaultRoles";
import { createResellerTransaction, getResellerProfile, updateResellerStatsOnOnboarding } from "@database/reseller";
import { createInitialSubscription } from "@database/subscriptions";
import { safeSyncStorePlanEntitlementFromSubscription } from "@lib/billing/subscriptionEntitlementSync";
import { admin, authAdmin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { createTenantStoreInTransaction, preCheckSubdomain } from "@lib/onboarding/createTenantStore";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getOrCreateRazorpayPlan } from "@lib/razorpay/plan-handler";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { getEmailValidationError, validateEmail } from "@lib/validation/emailDomainValidator";
import { ResellerOnboardSchema } from "@lib/validation/resellerSchemas";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { Timestamp } from "firebase/firestore";
import { writeLogEntry } from "logs/utils";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";

const LOG_FILE = "reseller-onboarding.log";

const normalizeOwnerUsername = (phone: string) => phone.replace(/[^0-9]/g, '');

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
        const rateLimitResult = await checkRateLimit({
            key: `reseller-onboard:${resellerId}`,
            ...rateLimitConfig,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({
                error: "Too many requests. Please try again later.",
                resetAt: rateLimitResult.resetAt,
            }, { status: 429 });
        }

        // 2. Validate input
        const body = await request.json();
        const validation = validateAPIInput(ResellerOnboardSchema, body);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            logger.security('Reseller Onboard Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/reseller/onboard',
                error: errorMsg,
            }, 'medium');
            return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
        }

        const { businessName, businessType, ownerPhone, ownerEmail, ownerPassword, pricingTier, billingInterval, commitmentMonths, paymentMode } = validation.data;

        // 3. Validate reseller profile exists and is active
        const resellerProfile = await getResellerProfile(resellerId, session.user.email);
        if (!isPlatformUser && (!resellerProfile || !resellerProfile.active)) {
            logger.security('Reseller Onboard - Profile Not Found or Inactive', {
                ...buildSecurityContext(session, request),
                resellerId,
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

        await writeLogEntry({ logFileName: LOG_FILE, logType: 'RESELLER_ONBOARD_STARTED', data: { resellerId, businessName, pricingTier, paymentMode } });

        // 6. ATOMIC TRANSACTION: Create Tenant, Store, User (centralized utility)
        const db = admin.firestore();

        // Pre-check subdomain uniqueness (must be outside transaction)
        const preCheckedSubdomain = await preCheckSubdomain(db, businessName);
        const normalizedOwnerEmail = ownerEmail?.toLowerCase()?.trim() || '';
        const ownerUsername = normalizeOwnerUsername(ownerPhone);
        if (ownerUsername.length < 10) {
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
                    businessType: businessType || 'Restaurant',
                    businessIndustry: 'B2C',
                    email: normalizedOwnerEmail || ownerLoginEmail,
                    onboardingSource: 'RESELLER_ONBOARDING',
                    subdomain: { preChecked: preCheckedSubdomain },
                    includeTimeSlotPresets: true,
                    tenantExtra: { phone: ownerPhone, resellerId },
                    storeExtra: { phone: ownerPhone, resellerId },
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
                        phone: ownerPhone,
                        phoneUsername: ownerUsername,
                        username: ownerUsername,
                        modifiedOn: core.now,
                    }));
                } else {
                    const userRef = db.collection(DB_COLLECTIONS.USERS).doc(authAccount.uid);

                    transaction.set(userRef, {
                        firebaseUid: authAccount.uid,
                        phone: ownerPhone,
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
                await authAdmin.deleteUser(authAccount.uid).catch(() => undefined);
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
            data: { resellerId, tenantId: result.tenantId, storeId: result.storeId },
        });

        // 7. Create Subscription
        let subscriptionId = '';
        let shortUrl: string | undefined;
        const durationForOffline = commitmentMonths || 3;

        if (paymentMode === 'online') {
            // Create Razorpay Subscription (same as self-serve)
            const razorpayPlanId = await getOrCreateRazorpayPlan({
                price: billingInterval === 'MONTH' ? tier.monthlyPriceINR : tier.yearlyPriceINR,
                currency: 'INR',
                interval: billingInterval || 'MONTH',
                userType: 'B2C',
                planId: tier.planId,
            });

            const totalCount = (billingInterval || 'MONTH') === 'MONTH' ? 36 : 3;

            const razorpaySubscription = await razorpayClient.subscriptions.create({
                plan_id: razorpayPlanId,
                total_count: totalCount,
                quantity: 1,
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
                    price: billingInterval === 'MONTH' ? tier.monthlyPriceINR : tier.yearlyPriceINR,
                    resellerId,
                    remainingCredits: 0,
                },
            });

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
                amount: billingInterval === 'MONTH' ? tier.monthlyPriceINR : tier.yearlyPriceINR,
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
                    amount: billingInterval === 'MONTH' ? tier.monthlyPriceINR : tier.yearlyPriceINR,
                    currency: 'INR',
                    remark: `Reseller onboarding (${tier.name}) — awaiting client payment`,
                }],
                billingHistory: [],
                quantity: 1,
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
                    billingInterval === 'MONTH' ? tier.monthlyPriceINR : tier.yearlyPriceINR,
                );
            }
        } else {
            // OFFLINE: Create manual subscription
            const now = new Date();
            const validUntil = new Date(now);
            validUntil.setMonth(validUntil.getMonth() + durationForOffline);

            const totalAmount = calculateOfflineAmount(pricingTier, durationForOffline);
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
                    remark: `Reseller offline onboarding (${tier.name}) — ${durationForOffline} months`,
                }],
                billingHistory: [],
                quantity: 1,
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
                ? calculateOfflineAmount(pricingTier, durationForOffline)
                : (billingInterval === 'MONTH' ? tier.monthlyPriceINR : tier.yearlyPriceINR),
            currency: 'INR',
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
            data: { resellerId, tenantId: result.tenantId, storeId: result.storeId, subscriptionId, transactionId, paymentMode },
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
            subdomain: result.subdomain,
            userId: result.userId,
            status: paymentMode === 'offline' ? 'active' : 'pending',
            transactionId,
        });

    } catch (error) {
        console.error('[Reseller Onboard] Failed:', error);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RESELLER_ONBOARD_ERROR',
            data: { resellerId, error: (error as Error).message },
        });
        return NextResponse.json(
            { error: 'Failed to onboard client. Please try again.' },
            { status: 500 }
        );
    }
}, { requiredPlatformRole: 'RESELLER' });

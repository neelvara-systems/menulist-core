export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { calculateOfflineAmount, getResellerTierById, RESELLER_CAPS, RESELLER_SYSTEM_FLAGS } from "@config/resellerPricing";
import { DB_COLLECTIONS } from "@constant/database";
import { getOwnerRoleId } from "@data/defaultRoles";
import { createResellerTransaction, getResellerProfile, incrementResellerOfflineCount, incrementResellerOnlineCount } from "@database/reseller";
import { createInitialSubscription } from "@database/subscriptions";
import { safeSyncStorePlanEntitlementFromSubscription } from "@lib/billing/subscriptionEntitlementSync";
import { admin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { createTenantStoreInTransaction, preCheckSubdomain } from "@lib/onboarding/createTenantStore";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getOrCreateRazorpayPlan } from "@lib/razorpay/plan-handler";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { ResellerOnboardSchema } from "@lib/validation/resellerSchemas";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { writeLogEntry } from "logs/utils";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";

const LOG_FILE = "reseller-onboarding.log";

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

        const { businessName, businessType, ownerPhone, ownerEmail, pricingTier, billingInterval, commitmentMonths, paymentMode, skipMenuUpload } = validation.data;

        // 3. Validate reseller profile exists and is active
        const resellerProfile = await getResellerProfile(resellerId);
        if (!resellerProfile || !resellerProfile.active) {
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
            if (resellerProfile.currentActiveOfflineStores >= RESELLER_CAPS.MAX_CONCURRENT_OFFLINE_PER_RESELLER) {
                return NextResponse.json({
                    error: `Maximum offline activations reached (${RESELLER_CAPS.MAX_CONCURRENT_OFFLINE_PER_RESELLER}). Use online payment mode or wait for existing stores to expire.`,
                }, { status: 400 });
            }
        }

        await writeLogEntry({ logFileName: LOG_FILE, logType: 'RESELLER_ONBOARD_STARTED', data: { resellerId, businessName, pricingTier, paymentMode } });

        // 6. ATOMIC TRANSACTION: Create Tenant, Store, User (centralized utility)
        const db = admin.firestore();

        // Pre-check subdomain uniqueness (must be outside transaction)
        const preCheckedSubdomain = await preCheckSubdomain(db, businessName);

        const result = await db.runTransaction(async (transaction) => {
            // Centralized tenant + store creation
            const core = await createTenantStoreInTransaction(transaction, db, {
                businessName,
                businessType: businessType || 'Restaurant',
                businessIndustry: 'B2C',
                email: ownerEmail || '',
                onboardingSource: 'RESELLER_ONBOARDING',
                subdomain: { preChecked: preCheckedSubdomain },
                includeTimeSlotPresets: true,
                tenantExtra: { phone: ownerPhone, resellerId },
                storeExtra: { phone: ownerPhone, resellerId },
            });

            // Create User record for client (if email provided)
            if (ownerEmail) {
                const usersSnapshot = await db.collection(DB_COLLECTIONS.USERS)
                    .where('email', '==', ownerEmail)
                    .limit(1)
                    .get();

                if (!usersSnapshot.empty) {
                    // User exists — update with new tenant/store
                    const existingUserDoc = usersSnapshot.docs[0];
                    transaction.update(existingUserDoc.ref, {
                        tenantId: core.tenantId,
                        storeId: core.storeId,
                        stores: [{ storeId: core.storeId, name: core.storeName, role: getOwnerRoleId() }],
                        modifiedOn: core.now,
                    });
                }
                // If user doesn't exist, they'll create account via OAuth later
            }

            return { tenantId: core.tenantId, storeId: core.storeId };
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
                    userId: '', // Client hasn't logged in yet
                    userType: 'B2C',
                    planId: tier.planId,
                    priceKey: 'priceINR',
                    interval: billingInterval || 'MONTH',
                    name: businessName,
                    email: ownerEmail || '',
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
                userId: '',
                name: businessName,
                email: ownerEmail || '',
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
                    timestamp: admin.firestore.Timestamp.now() as any,
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
                resellerPricingTier: pricingTier,
                commitmentPeriodMonths: commitmentMonths || null,
            };

            await createInitialSubscription(razorpaySubscription.id, subscriptionPayload);
            await incrementResellerOnlineCount(resellerId);
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
                userId: '',
                name: businessName,
                email: ownerEmail || '',
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
                cycleStartDate: admin.firestore.Timestamp.now() as any,
                subscriptionEndDate: admin.firestore.Timestamp.fromDate(validUntil) as any,
                subscriptionStartDate: admin.firestore.Timestamp.now() as any,
                pastDueSinceAt: null as any,
                totalPaymentsNeededCount: 1,
                totalPaymentsMadeCount: 1,
                cycleEndDate: admin.firestore.Timestamp.fromDate(validUntil) as any,
                renewsOn: null as any,
                monthlyCreditsAllowance: tier.monthlyCredits,
                monthlyCredits: tier.monthlyCredits,
                topUpCredits: 0,
                creditsLastResetMonth: new Date().getFullYear() * 100 + (new Date().getMonth() + 1),
                shortUrl: '',
                paymentMethod: { type: "offline", brand: "", last4: "", upiId: "", upiTransactionId: "" },
                statuses: [{
                    status: "active",
                    timestamp: admin.firestore.Timestamp.now() as any,
                    amount: totalAmount,
                    currency: 'INR',
                    remark: `Reseller offline onboarding (${tier.name}) — ${durationForOffline} months`,
                }],
                billingHistory: [],
                quantity: 1,
                // Reseller fields
                billingMode: 'manual',
                validUntil: admin.firestore.Timestamp.fromDate(validUntil) as any,
                onboardingSource: 'RESELLER_ONBOARDING',
                resellerId,
                resellerPricingTier: pricingTier,
                commitmentPeriodMonths: durationForOffline,
                manualPaymentConfirmed: true,
                manualPaymentConfirmedAt: admin.firestore.Timestamp.now() as any,
            };

            await createInitialSubscription(subscriptionId, subscriptionPayload);
            await safeSyncStorePlanEntitlementFromSubscription(
                { ...subscriptionPayload, id: subscriptionId },
                'api:reseller-onboard-offline',
            );
            await incrementResellerOfflineCount(resellerId);
        }

        // 8. Create reseller transaction record (immutable)
        const transactionId = await createResellerTransaction({
            resellerId,
            resellerEmail: session.user.email || '',
            storeId: result.storeId,
            tenantId: result.tenantId,
            storeName: `${businessName} - Main Store`,
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
            validFrom: paymentMode === 'offline' ? admin.firestore.Timestamp.now() as any : null,
            validUntil: paymentMode === 'offline' ? admin.firestore.Timestamp.fromDate((() => {
                const d = new Date();
                d.setMonth(d.getMonth() + durationForOffline);
                return d;
            })()) as any : null,
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

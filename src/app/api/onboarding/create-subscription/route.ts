export const dynamic = 'force-dynamic';
import { getB2BPlansList, getB2CPlansList } from "@data/PlatformPlansList";
import { createInitialSubscription } from "@database/subscriptions";
import { handlePaymentError } from "@lib/errors/firestoreErrors";
import { admin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { createTenantStoreInTransaction, preCheckSubdomain, updateUserWithTenantStore } from "@lib/onboarding/createTenantStore";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getOrCreateRazorpayPlan } from "@lib/razorpay/plan-handler";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { OnboardingSubscriptionSchema } from "@lib/validation/apiSchemas";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { writeLogEntry } from "logs/utils";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-subscription.log";

/**
 * Onboarding API - Create Tenant, Store & Subscription (New Users Only)
 * ═══════════════════════════════════════════════════════════════
 * 
 * SECURITY:
 * - Server-side tenant/store creation (no client access)
 * - Atomic transaction (prevents race conditions)
 * - Session-based auth (no client-provided IDs)
 * - Input validation (OWASP A03)
 * 
 * FLOW:
 * 1. Verify user doesn't already have tenant/store
 * 2. Validate business details + plan selection
 * 3. Create tenant, store, update user (ATOMIC)
 * 4. Create Razorpay subscription
 * 5. Create Firestore subscription record
 * 6. Return subscription + new IDs for session update
 */
export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    const userId = session.user.id;

    try {
        // 1. CRITICAL: Verify user does NOT already have tenant/store
        if (session.user.tenantId || session.user.storeId) {
            logger.security('Onboarding Attempt by Existing User', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/onboarding/create-subscription',
                error: 'User already has tenant/store',
                tenantId: session.user.tenantId,
                storeId: session.user.storeId,
            }, 'medium');

            return NextResponse.json(
                { error: 'User already onboarded. Use regular subscription endpoint.' },
                { status: 400 }
            );
        }

        // 2. 🔒 RATE LIMITING: Prevent onboarding spam (centralized config)
        const rateLimitConfig = getRateLimitForFeature('PAYMENT_ONBOARDING');
        const rateLimitResult = await checkRateLimit({
            key: `onboarding:${userId}`,
            ...rateLimitConfig
        });

        if (!rateLimitResult.allowed) {
            logger.security('Onboarding Rate Limit Exceeded', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/onboarding/create-subscription',
                error: 'Too many onboarding attempts',
                currentAttempts: rateLimitResult.current,
                resetAt: new Date(rateLimitResult.resetAt).toISOString(),
            }, 'high');

            return NextResponse.json({
                error: 'Too many onboarding attempts. Please try again later.',
                resetAt: rateLimitResult.resetAt
            }, { status: 429 });
        }

        // 3. Validate Input
        const body = await request.json();
        const validation = validateAPIInput(OnboardingSubscriptionSchema, body);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            logger.security('Onboarding Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/onboarding/create-subscription',
                error: errorMsg,
                attemptedData: {
                    businessName: body?.businessName?.substring(0, 50), // Truncate for logging
                    businessIndustry: body?.businessIndustry,
                    planId: body?.planId,
                    interval: body?.interval,
                    currency: body?.currency,
                    userType: body?.userType,
                },
            }, 'critical');

            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const { businessName, businessIndustry, planId, interval, currency, userType, timeZone, businessDayEndTime } = validation.data;

        // 3. Find Plan Details
        const plans = userType === "B2C" ? getB2CPlansList() : getB2BPlansList();
        const selectedPlan = plans.find(p => p.planId === planId && p.billingInterval === interval);

        if (!selectedPlan) {
            return NextResponse.json({ error: "Plan not found." }, { status: 404 });
        }

        const priceKey = `price${currency.toUpperCase()}`;

        // 4. 🔒 ATOMIC TRANSACTION: Create Tenant, Store, Update User
        await writeLogEntry({ logFileName: LOG_FILE, logType: 'ONBOARDING_STARTED', data: { userId, businessName, planId } });

        const db = admin.firestore();

        // Pre-check subdomain uniqueness (must be outside transaction)
        const preCheckedSubdomain = await preCheckSubdomain(db, businessName);

        const result = await db.runTransaction(async (transaction) => {
            // Centralized tenant + store creation
            const core = await createTenantStoreInTransaction(transaction, db, {
                businessName,
                businessType: businessIndustry || 'Restaurant',
                businessIndustry: userType,
                timeZone,
                businessDayEndTime,
                email: session.user.email,
                onboardingSource: 'WEBSITE_ONBOARDING',
                subdomain: { preChecked: preCheckedSubdomain },
                includeTimeSlotPresets: true,
            });

            // Update User with tenant/store IDs
            updateUserWithTenantStore(transaction, db, userId, core);

            return { tenantId: core.tenantId, storeId: core.storeId };
        });

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'ONBOARDING_TRANSACTION_COMPLETE',
            data: { userId, tenantId: result.tenantId, storeId: result.storeId }
        });

        // 5. Create Razorpay Subscription (AFTER transaction succeeds)
        const razorpayPlanId = await getOrCreateRazorpayPlan({
            price: selectedPlan[priceKey].price,
            currency,
            interval,
            userType,
            planId,
        });

        let totalCount: number = interval === 'MONTH' ? 36 : 3; // Monthly: 36 cycles (3 years), Yearly: 3 cycles (3 years)

        const razorpaySubscription = await razorpayClient.subscriptions.create({
            plan_id: razorpayPlanId,
            total_count: totalCount,
            quantity: 1,
            notes: {
                tenantId: result.tenantId,  // ← Server-created IDs (secure)
                storeId: result.storeId,
                userId,
                userType,
                planId,
                priceKey,
                interval,
                name: session.user.name,
                email: session.user.email,
                price: selectedPlan[priceKey].price,
                remainingCredits: 0, // New user, no carry-forward credits
            },
        });

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'ONBOARDING_RAZORPAY_SUBSCRIPTION_CREATED',
            data: { subscriptionId: razorpaySubscription.id, tenantId: result.tenantId }
        });

        // 6. Create Firestore Subscription Record
        const subscriptionPayload: Omit<FirestoreSubscriptionDoc, "id"> = {
            paymentProvider: "razorpay",
            providerSubscriptionId: razorpaySubscription.id,
            providerPlanId: razorpayPlanId,
            userId,
            name: session.user.name || '',
            email: session.user.email || '',
            tenantId: result.tenantId,
            storeId: result.storeId,
            planType: interval,
            userType,
            currency,
            amount: selectedPlan[priceKey].price,
            status: "pending",
            lastWebhook: null,
            planId: planId,
            planName: selectedPlan.name,
            cycleStartDate: null,
            subscriptionEndDate: null,
            subscriptionStartDate: null,
            pastDueSinceAt: null,
            totalPaymentsNeededCount: razorpaySubscription.total_count,
            totalPaymentsMadeCount: 0,
            cycleEndDate: null,
            renewsOn: null,
            monthlyCreditsAllowance: selectedPlan[priceKey].monthlyCredits,
            monthlyCredits: selectedPlan[priceKey].monthlyCredits,
            topUpCredits: 0, // New user, no carry-forward
            creditsLastResetMonth: new Date().getFullYear() * 100 + (new Date().getMonth() + 1),
            shortUrl: razorpaySubscription.short_url,
            paymentMethod: {
                type: "",
                brand: "",
                last4: "",
                upiId: "",
                upiTransactionId: "",
            },
            statuses: [
                {
                    status: "pending",
                    timestamp: admin.firestore.Timestamp.now() as any,
                    amount: selectedPlan[priceKey].price,
                    currency: currency,
                    remark: "Onboarding Subscription Initiated",
                },
            ],
            billingHistory: [],
            quantity: 1,  // Multi-Outlet Billing (Feature #4C-B): 1 = single store (master)
        };

        await createInitialSubscription(razorpaySubscription.id, subscriptionPayload);

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'ONBOARDING_COMPLETE',
            data: { userId, tenantId: result.tenantId, storeId: result.storeId, subscriptionId: razorpaySubscription.id }
        });

        console.log(`✅ [Onboarding] User ${userId} onboarded successfully with tenant ${result.tenantId}`);

        // 7. Return subscription + new IDs for session update
        return NextResponse.json({
            subscription: razorpaySubscription,
            tenantId: result.tenantId,
            storeId: result.storeId
        });

    } catch (error) {
        console.error('[Onboarding] Failed:', error);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'ONBOARDING_ERROR',
            data: { userId, error: (error as Error).message }
        });

        // Use improved error handler with Firestore/Razorpay specific handling
        return handlePaymentError(error, {
            operation: 'onboarding',
            userId,
            endpoint: '/api/onboarding/create-subscription'
        });
    }
});

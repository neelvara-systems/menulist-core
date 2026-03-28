export const dynamic = 'force-dynamic';
import { getB2BPlansList, getB2CPlansList } from "@data/PlatformPlansList";
import { createInitialSubscription } from "@database/subscriptions";
import { handlePaymentError } from "@lib/errors/firestoreErrors";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getOrCreateRazorpayPlan } from "@lib/razorpay/plan-handler";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { CreateSubscriptionRequestSchema } from "@lib/validation/apiSchemas";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { Timestamp } from "firebase/firestore";
import { writeLogEntry } from "logs/utils";
import { NextResponse } from "next/server";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-subscription.log";
export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;

    try {
        // 🔒 CRITICAL: ONLY use session data, NEVER body data
        const { tenantId, storeId } = session.user;

        if (!tenantId || !storeId) {
            logger.security('User Not Onboarded - Create Subscription', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/create-subscription',
                error: 'User attempted to create subscription without tenant/store',
            }, 'high');

            return NextResponse.json(
                { error: 'User not onboarded. Complete onboarding first.' },
                { status: 400 }
            );
        }

        // 🔒 CRITICAL: Verify user owns this tenant/store
        if (!verifyTenantAccess(session, tenantId, storeId, request)) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        // 🔒 RATE LIMITING: Prevent subscription spam (centralized config)
        const rateLimitConfig = getRateLimitForFeature('PAYMENT_SUBSCRIPTION');
        const rateLimitResult = await checkRateLimit({
            key: `subscription:${userId}:${tenantId}`,
            ...rateLimitConfig
        });

        if (!rateLimitResult.allowed) {
            logger.security('Subscription Creation Rate Limit Exceeded', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/create-subscription',
                error: 'Too many subscription attempts',
                currentAttempts: rateLimitResult.current,
                resetAt: new Date(rateLimitResult.resetAt).toISOString(),
            }, 'high');

            return NextResponse.json({
                error: 'Too many subscription attempts. Please try again later.',
                resetAt: rateLimitResult.resetAt
            }, { status: 429 });
        }

        const body = await request.json();

        // 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const validation = validateAPIInput(CreateSubscriptionRequestSchema, body);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            // Log to Sentry (CRITICAL - payment/subscription creation)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/create-subscription',
                error: errorMsg,
                attemptedData: {
                    planId: body?.planId,
                    interval: body?.interval,
                    currency: body?.currency,
                    userType: body?.userType,
                },
            }, 'critical'); // CRITICAL - money/subscription involved!

            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        // 2. Extract validated data
        const { planId, interval, currency, userType } = validation.data;
        const name = session?.user?.name || body.name;
        const email = session?.user?.email || body.email;
        const remainingCredits = body.rc;

        // 3. Find Plan Details from Local Constants
        const plans = userType === "B2C" ? getB2CPlansList() : getB2BPlansList();
        const selectedPlan = plans.find((p) => p.planId === planId && p.billingInterval === interval);

        if (!selectedPlan) {
            return NextResponse.json({ error: "Plan not found." }, { status: 404 });
        }

        const priceKey = `price${currency.toUpperCase()}`;

        // 4. Orchestration Logic
        // Step A: Get Provider Plan
        const razorpayPlanId = await getOrCreateRazorpayPlan({
            price: selectedPlan[priceKey].price,
            currency,
            interval,
            userType,
            planId,
        });

        let totalCount: number = 3; // Yearly: 3 cycles (auto-renewal for up to 3 years)
        if (interval === 'MONTH') totalCount = 36; // Monthly: 36 cycles (3 years)

        // Step B: Create Provider Subscription
        const RazorpayCreateObj: any = {
            plan_id: razorpayPlanId,
            total_count: totalCount, // 36 cycles for monthly (3 years), 3 cycles for yearly (3 years)
            quantity: 1,
            notes: {
                tenantId,
                storeId,
                userId,
                userType,
                planId,
                priceKey,
                interval,
                name,
                email,
                price: selectedPlan[priceKey].price,
                remainingCredits,//Credits Carry Forward from previous subscription
            },
        }
        await writeLogEntry({ logFileName: LOG_FILE, logType: 'NEW_SUBSCRIPTION', data: { data: "#########" }, });
        await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_CREATE_SUBSCRIPTION_PAYLOAD', data: { RazorpayCreateObj }, });
        const razorpaySubscription = await razorpayClient.subscriptions.create(RazorpayCreateObj);
        await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_CREATE_SUBSCRIPTION_RESPONSE', data: { razorpaySubscription }, });

        // Step C: Create Firestore Record
        const subscriptionPayload: Omit<FirestoreSubscriptionDoc, "id"> = {
            paymentProvider: "razorpay",
            providerSubscriptionId: razorpaySubscription.id,
            providerPlanId: razorpayPlanId,
            userId,
            name,
            email,
            tenantId,
            storeId,
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
            topUpCredits: remainingCredits || 0,//Credits Carry Forward from previous subscription are added as a topup credits
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
                    timestamp: Timestamp.now(),
                    amount: selectedPlan[priceKey].price,
                    currency: currency,
                    remark: Boolean(remainingCredits) ? `Subscription Upgrade Initiated with Credits Carry Forward: ${remainingCredits}` : "Subscription Initiated",
                },
            ],
            billingHistory: [],
            quantity: 1,  // Multi-Outlet Billing (Feature #4C-B): 1 = single store (master)
        };

        await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_CREATE_SUBSCRIPTION_INTERNAL', data: { subscriptionPayload }, });
        await createInitialSubscription(razorpaySubscription.id, subscriptionPayload);

        // 5. Response
        return NextResponse.json({ subscription: razorpaySubscription });
    } catch (error) {
        console.error("Error creating Razorpay subscription:", error);
        await writeLogEntry({ logFileName: LOG_FILE, logType: 'ERROR', data: { error }, });

        // Use improved error handler with Firestore/Razorpay specific handling
        return handlePaymentError(error, {
            operation: 'create-subscription',
            userId,
            tenantId: session.user.tenantId,
            endpoint: '/api/razorpay/create-subscription'
        });
    }
});

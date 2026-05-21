export const dynamic = 'force-dynamic';
import { canManageBillingMutation } from "@lib/billing/billingAccess";
import {
    createProductInitialSubscription,
    resolveBillingScopeFromSession,
} from "@lib/billing/productBillingServer";
import {
    getBillingPlansForProduct,
    isCanonicaBillingProduct,
    normalizeBillingProductId,
} from "@lib/billing/productBillingPlans";
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

const createSubscriptionLogSummary = (input: {
    currency: string;
    interval: string;
    planId: string;
    quantity: number;
    remainingCredits: number;
    storeId: string | number;
    tenantId: string | number;
    unitAmount: number;
    userType?: string;
}) => ({
    currency: input.currency,
    interval: input.interval,
    planId: input.planId,
    quantity: input.quantity,
    hasCarriedCredits: input.remainingCredits > 0,
    storeId: input.storeId,
    tenantId: input.tenantId,
    unitAmount: input.unitAmount,
    userType: input.userType,
});

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;

    try {
        const body = await request.json();

        // 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const validation = validateAPIInput(CreateSubscriptionRequestSchema, body);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/create-subscription',
                error: errorMsg,
                attemptedData: {
                    productId: body?.productId,
                    planId: body?.planId,
                    interval: body?.interval,
                    currency: body?.currency,
                    userType: body?.userType,
                    quantity: body?.quantity,
                },
            }, 'critical');

            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const productId = normalizeBillingProductId(validation.data.productId);
        const scope = resolveBillingScopeFromSession(session, productId);
        if (!scope) {
            logger.security('User Not Onboarded - Create Subscription', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/create-subscription',
                error: 'User attempted to create subscription without product tenant/store',
                productId,
            }, 'high');

            return NextResponse.json(
                { error: 'User not onboarded. Complete onboarding first.' },
                { status: 400 }
            );
        }

        const { tenantId, storeId } = scope;

        if (!isCanonicaBillingProduct(productId) && !verifyTenantAccess(session, tenantId, storeId, request)) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (!isCanonicaBillingProduct(productId) && !(await canManageBillingMutation(session, request, '/api/razorpay/create-subscription'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        // 🔒 RATE LIMITING: Prevent subscription spam (centralized config)
        const rateLimitConfig = getRateLimitForFeature('PAYMENT_SUBSCRIPTION');
        const rateLimitResult = await checkRateLimit({
            key: `subscription:${productId}:${userId}:${tenantId}`,
            ...rateLimitConfig
        });

        if (!rateLimitResult.allowed) {
            logger.security('Subscription Creation Rate Limit Exceeded', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/create-subscription',
                error: 'Too many subscription attempts',
                productId,
                currentAttempts: rateLimitResult.current,
                resetAt: new Date(rateLimitResult.resetAt).toISOString(),
            }, 'high');

            return NextResponse.json({
                error: 'Too many subscription attempts. Please try again later.',
                resetAt: rateLimitResult.resetAt
            }, { status: 429 });
        }

        // 2. Extract validated data
        const { planId, interval, currency, userType, quantity: requestedQuantity = 1, rc = 0 } = validation.data;
        const name = session?.user?.name || body.name;
        const email = session?.user?.email || body.email;
        const remainingCredits = rc;
        const quantity = Math.max(1, requestedQuantity);

        // 3. Find Plan Details from Local Constants
        const plans = getBillingPlansForProduct(productId, userType || "B2C");
        const selectedPlan = plans.find((p) => p.planId === planId && p.billingInterval === interval);

        if (!selectedPlan) {
            return NextResponse.json({ error: "Plan not found." }, { status: 404 });
        }

        const priceKey = `price${currency.toUpperCase()}`;
        const unitAmount = selectedPlan[priceKey].price;
        const monthlyCredits = selectedPlan[priceKey].monthlyCredits;

        if (typeof unitAmount !== "number" || typeof monthlyCredits !== "number") {
            return NextResponse.json({ error: "Plan price not available." }, { status: 400 });
        }

        // 4. Orchestration Logic
        // Step A: Get Provider Plan
        const razorpayPlanId = await getOrCreateRazorpayPlan({
            productId,
            price: unitAmount,
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
            quantity,
            notes: {
                productId,
                pId: productId,
                tenantId,
                storeId,
                tId: tenantId,
                sId: storeId,
                userId,
                uId: userId,
                userType,
                planId,
                quantity,
                priceKey,
                interval,
                name,
                email,
                price: unitAmount,
                remainingCredits,//Credits Carry Forward from previous subscription
            },
        }
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CREATE_SUBSCRIPTION_REQUEST',
            data: createSubscriptionLogSummary({
                currency,
                interval,
                planId,
                quantity,
                remainingCredits,
                storeId,
                tenantId,
                unitAmount,
                userType,
            }),
        });
        const razorpaySubscription = await razorpayClient.subscriptions.create(RazorpayCreateObj);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CREATE_SUBSCRIPTION_RESPONSE',
            data: {
                subscriptionId: razorpaySubscription.id,
                status: razorpaySubscription.status,
                totalCount: razorpaySubscription.total_count,
                hasShortUrl: Boolean(razorpaySubscription.short_url),
            },
        });

        // Step C: Create Firestore Record
        const subscriptionPayload: Omit<FirestoreSubscriptionDoc, "id"> = {
            paymentProvider: "razorpay",
            providerSubscriptionId: razorpaySubscription.id,
            providerPlanId: razorpayPlanId,
            productId,
            pId: productId,
            userId,
            uId: userId,
            name,
            email,
            tenantId,
            storeId,
            tId: tenantId,
            sId: storeId,
            planType: interval,
            userType,
            currency,
            amount: unitAmount,
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
            monthlyCreditsAllowance: monthlyCredits,
            monthlyCredits: monthlyCredits,
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
                    amount: unitAmount * quantity,
                    currency: currency,
                    remark: Boolean(remainingCredits)
                        ? `Subscription Upgrade Initiated with Credits Carry Forward: ${remainingCredits}; quantity ${quantity}`
                        : `Subscription Initiated; quantity ${quantity}`,
                },
            ],
            billingHistory: [],
            quantity,  // Multi-Outlet Billing (Feature #4C-B): master + paid outlet locations
        };

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CREATE_SUBSCRIPTION_INTERNAL',
            data: {
                subscriptionId: razorpaySubscription.id,
                tenantId,
                storeId,
                planId,
                interval,
                currency,
                quantity,
                status: subscriptionPayload.status,
            },
        });
        await createProductInitialSubscription(productId, razorpaySubscription.id, subscriptionPayload);

        // 5. Response
        return NextResponse.json({ subscription: razorpaySubscription });
    } catch (error) {
        logger.error('Subscription creation failed', error as Error, {
            operation: 'create-subscription',
            userId,
            tenantId: session.user.tenantId,
            storeId: session.user.storeId,
            endpoint: '/api/razorpay/create-subscription',
        });

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CREATE_SUBSCRIPTION_ERROR',
            data: {
                message: error instanceof Error ? error.message : 'Unknown error',
            },
        });

        return NextResponse.json(
            { error: 'Failed to create subscription' },
            { status: 500 }
        );
    }
});

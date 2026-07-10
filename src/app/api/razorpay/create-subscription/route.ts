export const dynamic = 'force-dynamic';
import { DB_COLLECTIONS } from '@constant/database';
import { getStoreContextName } from '@lib/businessIdentity/names';
import { canManageBillingMutation } from "@lib/billing/billingAccess";
import {
    createProductInitialSubscription,
    resolveBillingScopeFromSession,
} from "@lib/billing/productBillingServer";
import {
    getBillingPlansForProduct,
    isAnswerlatticeBillingProduct,
    normalizeBillingProductId,
} from "@lib/billing/productBillingPlans";
import {
    getBoundedRazorpaySecurityContext,
    getBoundedRazorpayStringContext,
    getRazorpayFailureLogData,
    getRazorpaySubscriptionMutationLogContext,
} from "@lib/billing/razorpayDiagnostics";
import { logger } from "@lib/monitoring/logger";
import { firestoreAdmin } from '@lib/firebase/firebaseAdmin';
import {
    clearOwnerReferralCookie,
    readOwnerReferralCookie,
    resolveOwnerReferralCookieForAttribution,
    setOwnerReferralAttributionBeforeSubscription,
} from '@lib/ownerReferral/ownerReferralAttributionServer';
import { isOwnerReferralAcquisitionEnabled } from '@lib/ownerReferral/ownerReferralFeature';
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getOrCreateRazorpayPlan } from "@lib/razorpay/plan-handler";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CreateSubscriptionRequestSchema } from "@lib/validation/apiSchemas";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { Timestamp } from "firebase/firestore";
import { writeLogEntry } from "logs/utils";
import { NextResponse } from "next/server";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-subscription.log";
const RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES = 8 * 1024;

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
    ...getBoundedRazorpayStringContext('currency', input.currency),
    ...getBoundedRazorpayStringContext('interval', input.interval),
    ...getBoundedRazorpayStringContext('planId', input.planId),
    quantity: input.quantity,
    hasCarriedCredits: input.remainingCredits > 0,
    ...getBoundedRazorpayStringContext('storeId', input.storeId),
    ...getBoundedRazorpayStringContext('tenantId', input.tenantId),
    unitAmount: input.unitAmount,
    ...getBoundedRazorpayStringContext('userType', input.userType),
});

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;
    let subscriptionForLog: any = null;
    let clearReferralCookieOnResponse = false;

    try {
        const bodyResult = await readBoundedJsonBody(request, RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data as any;

        // 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const validation = validateAPIInput(CreateSubscriptionRequestSchema, body);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            logger.security('Input Validation Failed', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/create-subscription',
                error: errorMsg,
                attemptedData: {
                    ...getBoundedRazorpayStringContext('productId', body?.productId),
                    ...getBoundedRazorpayStringContext('planId', body?.planId),
                    ...getBoundedRazorpayStringContext('interval', body?.interval),
                    ...getBoundedRazorpayStringContext('currency', body?.currency),
                    ...getBoundedRazorpayStringContext('userType', body?.userType),
                    quantity: Number.isFinite(Number(body?.quantity)) ? Number(body.quantity) : undefined,
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
                ...getBoundedRazorpaySecurityContext(session, request),
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

        if (!isAnswerlatticeBillingProduct(productId) && !verifyTenantAccess(session, tenantId, storeId, request)) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (!isAnswerlatticeBillingProduct(productId) && !(await canManageBillingMutation(session, request, '/api/razorpay/create-subscription'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        // 🔒 RATE LIMITING: Prevent subscription spam (centralized config)
        const rateLimitConfig = getRateLimitForFeature('PAYMENT_SUBSCRIPTION');
        const userRateLimitHash = hashPublicRateLimitValue(userId);
        const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);
        const rateLimitResult = await checkRateLimit({
            key: `subscription:${productId}:${userRateLimitHash}:${tenantRateLimitHash}`,
            ...rateLimitConfig
        });

        if (!rateLimitResult.allowed) {
            logger.security('Subscription Creation Rate Limit Exceeded', {
                ...getBoundedRazorpaySecurityContext(session, request),
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
        const { planId, interval, currency, userType, quantity: requestedQuantity = 1 } = validation.data;
        const name = session?.user?.name || '';
        const email = session?.user?.email || '';
        const remainingCredits = 0;
        const quantity = Math.max(1, requestedQuantity);

        if (!isAnswerlatticeBillingProduct(productId)) {
            const referralCookiePresent = Boolean(readOwnerReferralCookie(request));
            const resolvedReferral = isOwnerReferralAcquisitionEnabled()
                ? await resolveOwnerReferralCookieForAttribution(request)
                : null;
            if (referralCookiePresent && !resolvedReferral) clearReferralCookieOnResponse = true;

            if (resolvedReferral) {
                const storeSnapshot = await firestoreAdmin
                    .collection(DB_COLLECTIONS.STORES)
                    .doc(String(storeId))
                    .get();
                const referredBusinessName = getStoreContextName(
                    storeSnapshot.exists ? storeSnapshot.data() as any : null,
                    name || 'Invited business',
                );
                await setOwnerReferralAttributionBeforeSubscription({
                    referredBusinessName,
                    referredScope: { tenantId: Number(tenantId), storeId: Number(storeId) },
                    resolvedToken: resolvedReferral,
                    onboardingSource: 'REGULAR_SUBSCRIPTION',
                });
                clearReferralCookieOnResponse = true;
            }
        }

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

        // Razorpay subscription notes allow max 15 keys; keep provider notes canonical and compact.
        const subscriptionNotes = {
            productId,
            tenantId,
            storeId,
            userId,
            userType,
            planId,
            quantity,
            priceKey,
            interval,
            name,
            email,
            price: unitAmount,
            remainingCredits,
        };

        // Step B: Create Provider Subscription
        const RazorpayCreateObj: any = {
            plan_id: razorpayPlanId,
            total_count: totalCount, // 36 cycles for monthly (3 years), 3 cycles for yearly (3 years)
            quantity,
            notes: subscriptionNotes,
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
        subscriptionForLog = razorpaySubscription;
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CREATE_SUBSCRIPTION_RESPONSE',
            data: {
                ...getRazorpaySubscriptionMutationLogContext(razorpaySubscription),
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
            topUpCredits: 0,
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
                    remark: `Subscription Initiated; quantity ${quantity}`,
                },
            ],
            billingHistory: [],
            quantity,  // Multi-Outlet Billing (Feature #4C-B): master + paid outlet locations
        };

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CREATE_SUBSCRIPTION_INTERNAL',
            data: {
                ...getRazorpaySubscriptionMutationLogContext({
                    id: razorpaySubscription.id,
                    planId,
                    providerSubscriptionId: razorpaySubscription.id,
                    status: subscriptionPayload.status,
                    storeId,
                    tenantId,
                }),
                ...getBoundedRazorpayStringContext('interval', interval),
                ...getBoundedRazorpayStringContext('currency', currency),
                quantity,
            },
        });
        await createProductInitialSubscription(productId, razorpaySubscription.id, subscriptionPayload);

        // 5. Response
        const response = NextResponse.json({ subscription: razorpaySubscription });
        if (clearReferralCookieOnResponse) clearOwnerReferralCookie(response);
        return response;
    } catch (error) {
        const failureData = getRazorpayFailureLogData('razorpay_create_subscription_failed', error, {
            ...getRazorpaySubscriptionMutationLogContext(subscriptionForLog),
            ...getBoundedRazorpayStringContext('userId', userId),
            ...getBoundedRazorpayStringContext('tenantId', session.user.tenantId),
            ...getBoundedRazorpayStringContext('storeId', session.user.storeId),
        });
        logger.error('Subscription creation failed', new Error('razorpay_create_subscription_failed'), failureData);

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CREATE_SUBSCRIPTION_ERROR',
            data: failureData,
        });

        const response = NextResponse.json(
            { error: 'Failed to create subscription' },
            { status: 500 }
        );
        if (clearReferralCookieOnResponse) clearOwnerReferralCookie(response);
        return response;
    }
});

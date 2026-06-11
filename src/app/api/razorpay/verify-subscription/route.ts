export const dynamic = 'force-dynamic';
import { canManageBillingMutation } from "@lib/billing/billingAccess";
import { getPlanDetailsFromConstants, getSubscriptionEndDate } from "@lib/billing/billingUtils";
import {
    getProductSubscriptionById,
    safeSyncProductSubscriptionEntitlementFromSubscription,
    updateProductSubscription,
    resolveBillingScopeFromSession,
} from "@lib/billing/productBillingServer";
import { isAnswerlatticeBillingProduct, normalizeBillingProductId } from "@lib/billing/productBillingPlans";
import { validateTransition } from "@lib/billing/subscriptionStateMachine";
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { markResellerTransactionsActiveForSubscription } from "@lib/reseller/resellerLedger";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { VerifyPaymentRequestSchema } from "@lib/validation/apiSchemas";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { Timestamp } from "firebase/firestore";
import { writeLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { createHmac, timingSafeEqual } from "crypto";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-subscription.log";

const summarizePaymentForLog = (payment: any) => ({
    paymentId: payment?.id,
    status: payment?.status,
    amount: payment?.amount,
    currency: payment?.currency,
    method: payment?.method,
    invoiceId: payment?.invoice_id,
    hasCard: Boolean(payment?.card),
    hasUpi: Boolean(payment?.vpa || payment?.acquirer_data?.upi_transaction_id),
});

const summarizeSubscriptionForLog = (subscription: any) => ({
    subscriptionId: subscription?.id,
    status: subscription?.status,
    currentStart: subscription?.current_start,
    currentEnd: subscription?.current_end,
    paidCount: subscription?.paid_count,
    totalCount: subscription?.total_count,
    quantity: subscription?.quantity,
    planId: subscription?.notes?.planId,
    interval: subscription?.notes?.interval,
});

const verifyRazorpaySubscriptionSignature = (
    paymentId: string,
    subscriptionId: string,
    signature: string,
) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return false;

    const expectedSignature = createHmac('sha256', keySecret)
        .update(`${paymentId}|${subscriptionId}`)
        .digest('hex');
    const expected = Buffer.from(expectedSignature, 'hex');
    const actual = Buffer.from(signature, 'hex');

    return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;

    try {
        // 2. 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const rawData = await request.json();
        const validation = validateAPIInput(VerifyPaymentRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            // Log to Sentry (CRITICAL - payment verification)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/verify-subscription',
                error: errorMsg,
                attemptedData: {
                    productId: rawData?.productId,
                    hasPaymentId: !!rawData?.razorpay_payment_id,
                    hasSubscriptionId: !!rawData?.razorpay_subscription_id,
                },
            }, 'critical'); // CRITICAL - payment verification

            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const { razorpay_payment_id, razorpay_subscription_id, razorpay_signature } = validation.data;
        if (!verifyRazorpaySubscriptionSignature(razorpay_payment_id, razorpay_subscription_id, razorpay_signature)) {
            logger.security('Invalid Subscription Payment Signature', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/verify-subscription',
                error: 'Razorpay checkout signature mismatch',
                subscriptionId: razorpay_subscription_id,
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - payment verification failed' },
                { status: 403 }
            );
        }

        // 3. --- SERVER-SIDE VERIFICATION ---
        // This is the crucial security step. We do not trust the client.
        // We ask Razorpay's servers directly about the status of this payment.

        // Step A: Fetch the payment from Razorpay to verify its status
        const payment = await razorpayClient.payments.fetch(razorpay_payment_id);
        await writeLogEntry({
            logFileName: LOG_FILE,
            userId: userId,
            logType: 'RAZORPAY_PAYMENT_RESPONSE_VERIFY_SUBSCRIPTION',
            data: summarizePaymentForLog(payment),
        });

        // Step B: Fetch the full subscription details from Razorpay for accurate date info
        const providerSubscription = await razorpayClient.subscriptions.fetch(razorpay_subscription_id);
        await writeLogEntry({
            logFileName: LOG_FILE,
            userId: userId,
            logType: 'RAZORPAY_SUBSCRIPTION_RESPONSE_VERIFY_SUBSCRIPTION',
            data: summarizeSubscriptionForLog(providerSubscription),
        });

        const productId = normalizeBillingProductId(validation.data.productId || providerSubscription?.notes?.productId);
        const scope = resolveBillingScopeFromSession(session, productId);
        if (!scope) {
            return NextResponse.json({ error: "Missing tenant/store data" }, { status: 400 });
        }

        const { tenantId, storeId } = scope;
        if (!isAnswerlatticeBillingProduct(productId) && !verifyTenantAccess(session, tenantId, storeId, request)) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (!isAnswerlatticeBillingProduct(productId) && !(await canManageBillingMutation(session, request, '/api/razorpay/verify-subscription'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        // Step C: Find our internal Firestore document for this subscription
        const internalSub = await getProductSubscriptionById(productId, razorpay_subscription_id);
        await writeLogEntry({
            logFileName: LOG_FILE,
            userId: userId,
            logType: 'INTERNAL_SUBSCRIPTION_RESPONSE_VERIFY_SUBSCRIPTION',
            data: {
                subscriptionId: razorpay_subscription_id,
                productId,
                found: Boolean(internalSub),
                status: internalSub?.status,
                tenantId: internalSub?.tenantId,
                storeId: internalSub?.storeId,
                planId: internalSub?.planId,
                quantity: internalSub?.quantity,
            },
        });

        if (providerSubscription?.id !== razorpay_subscription_id) {
            logger.security('Subscription Verification Provider Mismatch', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/verify-subscription',
                error: 'Fetched provider subscription id mismatch',
                requestedSubscriptionId: razorpay_subscription_id,
                fetchedSubscriptionId: providerSubscription?.id,
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - payment mismatch' },
                { status: 403 }
            );
        }

        const paymentSubscriptionId = String(payment?.subscription_id || '');
        if (payment.status !== 'captured' || paymentSubscriptionId !== razorpay_subscription_id) {
            logger.security('Subscription Payment Verification Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/verify-subscription',
                error: 'Payment is not captured or does not belong to subscription',
                paymentStatus: payment.status,
                paymentSubscriptionId,
                requestedSubscriptionId: razorpay_subscription_id,
            }, 'critical');

            return NextResponse.json(
                { error: 'Payment could not be verified.' },
                { status: 402 }
            );
        }

        if (!internalSub) {
            logger.error('Internal subscription not found', undefined, {
                razorpaySubscriptionId: razorpay_subscription_id,
                userId: userId
            });
            // The webhook will eventually handle this, but we can't activate it now.
            return NextResponse.json({ success: false, error: "Internal subscription record not found." }, { status: 404 });
        }

        // 🔒 CRITICAL: Verify user owns this subscription's tenant/store
        const subscriptionMatchesScope = Number(internalSub.tenantId) === Number(tenantId)
            && Number(internalSub.storeId) === Number(storeId);
        if (!subscriptionMatchesScope || (!isAnswerlatticeBillingProduct(productId) && !verifyTenantAccess(session, internalSub.tenantId, internalSub.storeId, request))) {
            logger.security('Unauthorized Subscription Verification Attempt', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/verify-subscription',
                error: 'User attempted to verify subscription for different tenant/store',
                productId,
                subscriptionTenantId: internalSub.tenantId,
                subscriptionStoreId: internalSub.storeId,
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        // If the subscription is already active (e.g., the webhook beat this call), we don't need to do anything.
        if (internalSub.status === 'active') {
            await safeSyncProductSubscriptionEntitlementFromSubscription(productId, internalSub as FirestoreSubscriptionDoc, 'api:verify-subscription:already-active');
            logger.info('Subscription already active', {
                subscriptionId: razorpay_subscription_id,
                productId,
                userId: userId
            });
            return NextResponse.json({ success: true, status: 'active' });
        }

        // 4. --- OPTIMISTIC UPDATE ---
        // The payment is verified. We can now confidently update our own database immediately.
        logger.info('Payment verified successfully', {
            subscriptionId: razorpay_subscription_id,
            userId: userId,
            action: 'activating'
        });

        const planDetails = getPlanDetailsFromConstants(providerSubscription.notes);
        if (!planDetails) {
            logger.error('Plan details not found in subscription notes', undefined, {
                subscriptionId: razorpay_subscription_id,
                planId: providerSubscription.notes?.planId,
                interval: providerSubscription.notes?.interval,
                userType: providerSubscription.notes?.userType,
                userId: userId
            });
            return NextResponse.json({ success: false, error: "Could not derive plan details." }, { status: 500 });
        }

        const priceKey = `price${payment.currency.toUpperCase()}`;
        const creditsForPlan = planDetails[priceKey]?.monthlyCredits || 0;
        const paymentAmount = Number(payment.amount || 0);

        if (!validateTransition(internalSub.status, 'active', 'api:verify-subscription')) {
            return NextResponse.json({ error: "Subscription cannot be activated in its current state." }, { status: 409 });
        }
        const updatePayload: Partial<FirestoreSubscriptionDoc> = {
            productId,
            pId: productId,
            tenantId,
            storeId,
            tId: tenantId,
            sId: storeId,
            userId,
            uId: userId,
            status: 'active',
            planName: planDetails.name,
            planId: planDetails.planId,

            // Set up the credit system
            monthlyCreditsAllowance: creditsForPlan,
            monthlyCredits: creditsForPlan,
            topUpCredits: internalSub.topUpCredits || 0, // Preserve existing top-up credits if any
            creditsLastResetMonth: (() => {
                const s = new Date(providerSubscription.current_start * 1000);
                const n = new Date();
                let y = n.getFullYear(), m = n.getMonth() + 1;
                const dim = new Date(y, n.getMonth() + 1, 0).getDate();
                const anchor = Math.min(s.getDate(), dim);
                if (n.getDate() < anchor) { m -= 1; if (m === 0) { m = 12; y -= 1; } }
                return y * 100 + m;
            })(),

            // Set billing cycle dates from the definitive source (Razorpay API)
            cycleStartDate: Timestamp.fromMillis(providerSubscription.current_start * 1000),
            cycleEndDate: Timestamp.fromMillis(providerSubscription.current_end * 1000),
            renewsOn: Timestamp.fromMillis(providerSubscription.charge_at * 1000),
            subscriptionEndDate: getSubscriptionEndDate(providerSubscription),
            subscriptionStartDate: Timestamp.fromMillis(providerSubscription.start_at * 1000),
            totalPaymentsNeededCount: providerSubscription.total_count,
            totalPaymentsMadeCount: providerSubscription.paid_count,
            pastDueSinceAt: null,
            quantity: Number(providerSubscription.quantity || internalSub.quantity || 1),
            // Store payment method
            paymentMethod: {
                type: payment.method,
                brand: payment.card?.network,
                last4: payment.card?.last4,
                upiId: payment.vpa,
                upiTransactionId: payment?.acquirer_data?.upi_transaction_id,
            },
            statuses: [
                ...internalSub.statuses,
                {
                    status: "verified",
                    timestamp: Timestamp.now(),
                    amount: Number.isFinite(paymentAmount) ? paymentAmount : 0,
                    currency: payment.currency,
                    remark: "Subscription verified",
                },
            ],

            // Add this payment to the history
            billingHistory: [razorpay_payment_id],
        };

        await writeLogEntry({
            logFileName: LOG_FILE,
            userId: userId,
            logType: 'UPDATE_SUBSCRIPTION_VERIFY_SUBSCRIPTION',
            data: {
                subscriptionId: razorpay_subscription_id,
                status: updatePayload.status,
                quantity: updatePayload.quantity,
                totalPaymentsMadeCount: updatePayload.totalPaymentsMadeCount,
                totalPaymentsNeededCount: updatePayload.totalPaymentsNeededCount,
            },
        });
        await updateProductSubscription(productId, razorpay_subscription_id, updatePayload);
        if (!isAnswerlatticeBillingProduct(productId)) {
            await markResellerTransactionsActiveForSubscription(razorpay_subscription_id, 'api:verify-subscription');
        }
        await safeSyncProductSubscriptionEntitlementFromSubscription(
            productId,
            {
                ...internalSub,
                ...updatePayload,
                id: razorpay_subscription_id,
            } as FirestoreSubscriptionDoc,
            'api:verify-subscription',
        );

        if (!isAnswerlatticeBillingProduct(productId)) {
            // 📧 LIFECYCLE MESSAGE: First payment / subscription activation (fire-and-forget)
            try {
                const { sendLifecycleMessage } = await import('@lib/messaging');
                sendLifecycleMessage({
                    storeId: String(internalSub.storeId),
                    tenantId: String(internalSub.tenantId),
                    eventType: 'PAYMENT_SUCCESS',
                    referenceId: `payment-${razorpay_payment_id}`,
                    recipientEmail: internalSub.email || session.user.email || '',
                    storeName: internalSub.name || '',
                    metadata: {
                        amount: payment.amount ? (Number(payment.amount) / 100) : 0,
                        currency: payment.currency?.toUpperCase() || 'INR',
                        planName: planDetails.name || 'Subscription',
                        nextBillingAt: providerSubscription.charge_at
                            ? new Date(providerSubscription.charge_at * 1000).toISOString()
                            : null,
                    },
                }).catch(() => { /* non-blocking */ });
            } catch { /* non-blocking */ }

            // 📧 INTERNAL: Notify founder about new subscription revenue
            try {
                const { sendInternalNotification } = await import('@lib/messaging');
                sendInternalNotification({
                    eventType: 'INTERNAL_SUBSCRIPTION_PURCHASED',
                    storeId: String(internalSub.storeId),
                    tenantId: String(internalSub.tenantId),
                    metadata: {
                        storeName: internalSub.name || '',
                        planName: planDetails.name || '',
                        amount: payment.amount ? (Number(payment.amount) / 100) : 0,
                        currency: payment.currency?.toUpperCase() || 'INR',
                        customerEmail: internalSub.email || session.user.email || '',
                        storeId: String(internalSub.storeId),
                        tenantId: String(internalSub.tenantId),
                    },
                }).catch(() => { /* non-blocking */ });
            } catch { /* non-blocking */ }
        }

        // 5. Respond to the client
        return NextResponse.json({ success: true, status: 'active' });

    } catch (error) {
        logger.error('Subscription verification failed', error, {
            api: 'verify-subscription',
            userId: userId
        });
        await writeLogEntry({
            logFileName: LOG_FILE,
            userId,
            logType: 'VERIFY_SUBSCRIPTION_ERROR',
            data: {
                message: error instanceof Error ? error.message : 'Unknown error',
            },
        });
        return NextResponse.json(
            { error: 'Failed to verify subscription' },
            { status: 500 }
        );
    }
});

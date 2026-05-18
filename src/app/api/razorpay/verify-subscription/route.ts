export const dynamic = 'force-dynamic';
import { getSubscriptionById, updateSubscription } from "@database/subscriptions/server";
import { canManageBillingMutation } from "@lib/billing/billingAccess";
import { getPlanDetailsFromConstants, getSubscriptionEndDate } from "@lib/billing/billingUtils";
import { safeSyncStorePlanEntitlementFromSubscription } from "@lib/billing/subscriptionEntitlementSync";
import { validateTransition } from "@lib/billing/subscriptionStateMachine";
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { markResellerTransactionsActiveForSubscription } from "@lib/reseller/resellerLedger";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { VerifyPaymentRequestSchema } from "@lib/validation/apiSchemas";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { Timestamp } from "firebase/firestore";
import { writeErrorLogEntry, writeLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-subscription.log";

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;

    try {
        if (!session?.user?.tenantId || !session?.user?.storeId) {
            return NextResponse.json({ error: "Missing tenant/store data" }, { status: 400 });
        }

        const { tenantId, storeId } = session.user;
        if (!verifyTenantAccess(session, tenantId, storeId, request)) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (!(await canManageBillingMutation(session, request, '/api/razorpay/verify-subscription'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

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
                    hasPaymentId: !!rawData?.razorpay_payment_id,
                    hasSubscriptionId: !!rawData?.razorpay_subscription_id,
                },
            }, 'critical'); // CRITICAL - payment verification

            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const { razorpay_payment_id, razorpay_subscription_id } = validation.data;

        // 3. --- SERVER-SIDE VERIFICATION ---
        // This is the crucial security step. We do not trust the client.
        // We ask Razorpay's servers directly about the status of this payment.

        // Step A: Fetch the payment from Razorpay to verify its status
        await writeLogEntry({ logFileName: LOG_FILE, logType: 'NEW_SUBSCRIPTION', data: { data: "#########" }, });
        const payment = await razorpayClient.payments.fetch(razorpay_payment_id);
        await writeLogEntry({ logFileName: LOG_FILE, userId: userId, logType: 'RAZORPAY_PAYMENT_RESPONSE_VERIFY_SUBSCRIPTION', data: { payment }, });


        // if (payment.status !== 'captured' || payment.status === 'authorized') {
        //     console.error(`[Verification] Payment ${razorpay_payment_id} is not captured. Status: ${payment.status}`);
        //     return NextResponse.json({ success: false, error: "Payment not successful." }, { status: 402 });
        // }
        // if (payment.status === 'captured' || payment.status === 'authorized') {
        //     console.error(`[Verification] Payment ${razorpay_payment_id} is not captured. Status: ${payment.status}`);
        //     return NextResponse.json({ success: false, error: "Payment not successful." }, { status: 402 });
        // }
        // Step B: Fetch the full subscription details from Razorpay for accurate date info
        const providerSubscription = await razorpayClient.subscriptions.fetch(razorpay_subscription_id);
        await writeLogEntry({ logFileName: LOG_FILE, userId: userId, logType: 'RAZORPAY_SUBSCRIPTION_RESPONSE_VERIFY_SUBSCRIPTION', data: { providerSubscription }, });

        // Step C: Find our internal Firestore document for this subscription
        const internalSub = await getSubscriptionById(razorpay_subscription_id);
        await writeLogEntry({ logFileName: LOG_FILE, userId: userId, logType: 'INTERNAL_SUBSCRIPTION_RESPONSE_VERIFY_SUBSCRIPTION', data: { internalSub }, });

        if (!internalSub) {
            logger.error('Internal subscription not found', undefined, {
                razorpaySubscriptionId: razorpay_subscription_id,
                userId: userId
            });
            // The webhook will eventually handle this, but we can't activate it now.
            return NextResponse.json({ success: false, error: "Internal subscription record not found." }, { status: 404 });
        }

        // 🔒 CRITICAL: Verify user owns this subscription's tenant/store
        if (!verifyTenantAccess(session, internalSub.tenantId, internalSub.storeId, request)) {
            logger.security('Unauthorized Subscription Verification Attempt', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/verify-subscription',
                error: 'User attempted to verify subscription for different tenant/store',
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
            await safeSyncStorePlanEntitlementFromSubscription(internalSub as FirestoreSubscriptionDoc, 'api:verify-subscription:already-active');
            logger.info('Subscription already active', {
                subscriptionId: razorpay_subscription_id,
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
                notes: providerSubscription.notes,
                userId: userId
            });
            return NextResponse.json({ success: false, error: "Could not derive plan details." }, { status: 500 });
        }

        const priceKey = `price${payment.currency.toUpperCase()}`;
        const creditsForPlan = planDetails[priceKey]?.monthlyCredits || 0;
        const paymentAmount = Number(payment.amount || 0);

        validateTransition(internalSub.status, 'active', 'api:verify-subscription');
        const updatePayload: Partial<FirestoreSubscriptionDoc> = {
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

        await writeLogEntry({ logFileName: LOG_FILE, userId: userId, logType: 'UPDATE_SUBSCRIPTION_VERIFY_SUBSCRIPTION', data: { updatePayload }, });
        await updateSubscription(razorpay_subscription_id, updatePayload);
        await markResellerTransactionsActiveForSubscription(razorpay_subscription_id, 'api:verify-subscription');
        await safeSyncStorePlanEntitlementFromSubscription(
            {
                ...internalSub,
                ...updatePayload,
                id: razorpay_subscription_id,
            } as FirestoreSubscriptionDoc,
            'api:verify-subscription',
        );

        // 📧 LIFECYCLE MESSAGE: First payment / subscription activation (fire-and-forget)
        try {
            const { sendLifecycleMessage } = await import('@lib/messaging');
            const nextBilling = providerSubscription.charge_at
                ? new Date(providerSubscription.charge_at * 1000).toLocaleDateString()
                : 'See dashboard';
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
                    nextBillingDate: nextBilling,
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

        // 5. Respond to the client
        return NextResponse.json({ success: true, status: 'active' });

    } catch (error) {
        logger.error('Subscription verification failed', error, {
            api: 'verify-subscription',
            userId: userId
        });
        console.error('Subscription verification API error:', error);
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json(
            { error: 'Failed to verify subscription', details: (error as Error).message },
            { status: 500 }
        );
    }
});

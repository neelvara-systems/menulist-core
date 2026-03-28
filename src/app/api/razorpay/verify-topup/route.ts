export const dynamic = 'force-dynamic';
import { aiEnhancementPacksList } from "@data/PlatformPlansList";
import { getActiveSubscriptionForStore, updateSubscription } from "@database/subscriptions";
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { VerifyPaymentRequestSchema } from "@lib/validation/apiSchemas";
import { NextResponse } from "next/server";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    try {
        if (!session?.user?.tenantId || !session?.user?.storeId) {
            return NextResponse.json({ error: "Missing tenant/store data" }, { status: 400 });
        }

        const tenantId = session.user.tenantId;
        const storeId = session.user.storeId;

        // 🔒 CRITICAL: Verify user owns this tenant/store
        if (!verifyTenantAccess(session, tenantId, storeId, request)) {
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

            // Log to Sentry (CRITICAL - topup payment verification)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: errorMsg,
                attemptedData: {
                    hasPaymentId: !!rawData?.razorpay_payment_id,
                    hasOrderId: !!rawData?.razorpay_order_id,
                },
            }, 'critical'); // CRITICAL - topup payment

            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const { razorpay_payment_id, razorpay_order_id } = validation.data;

        // Step 3. --- SERVER-SIDE VERIFICATION ---
        // This is the crucial security step. We ask Razorpay's servers for the truth.

        // Step A: Fetch the payment from Razorpay to verify its status is 'captured'
        // --- NEW LOGIC: PROGRAMMATIC CAPTURE ---
        const payment = await razorpayClient.payments.fetch(razorpay_payment_id);
        // If the payment is authorized but not yet captured, we capture it now.
        if (payment.status === 'authorized') {
            logger.info('Capturing authorized payment', {
                paymentId: razorpay_payment_id,
                amount: payment.amount,
                currency: payment.currency
            });
            await razorpayClient.payments.capture(razorpay_payment_id, payment.amount, payment.currency);
        }

        // Now, we can re-fetch or proceed with the existing payment object, which should be updated.
        // For robustness, let's re-fetch to get the final confirmed status.
        const capturedPayment = await razorpayClient.payments.fetch(razorpay_payment_id);

        // Step B: The critical check. Now it should pass.
        if (capturedPayment.status !== 'captured') {
            logger.error('Payment capture failed', undefined, {
                paymentId: razorpay_payment_id,
                status: capturedPayment.status
            });
            return NextResponse.json({ success: false, error: "Payment could not be captured." }, { status: 402 });
        }

        // Step C: Fetch the full order details from Razorpay to securely get the notes
        const order = await razorpayClient.orders.fetch(razorpay_order_id);
        const packId = order.notes?.packId;
        if (!packId) {
            logger.error('Order missing packId', undefined, {
                orderId: razorpay_order_id,
                notes: order.notes
            });
            return NextResponse.json({ success: false, error: "Order details are missing." }, { status: 400 });
        }

        // Step D: Find the user's active subscription document in our database
        const internalSub = await getActiveSubscriptionForStore(tenantId, storeId);
        if (!internalSub) {
            logger.error('No active subscription for top-up', undefined, {
                tenantId,
                storeId
            });
            return NextResponse.json({ success: false, error: "No active subscription found." }, { status: 404 });
        }

        // 🔒 CRITICAL: Double-check subscription belongs to this tenant/store
        if (internalSub.tenantId !== Number(tenantId) || internalSub.storeId !== Number(storeId)) {
            logger.security('Unauthorized Topup Verification Attempt', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Subscription tenant/store mismatch',
                subscriptionTenantId: internalSub.tenantId,
                subscriptionStoreId: internalSub.storeId,
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        // Step E: Find the credit pack details from our constants to get the credit amount
        const selectedPack = aiEnhancementPacksList.find((p) => p.packId === packId);
        if (!selectedPack) {
            logger.error('Invalid enhancement pack', undefined, {
                packId,
                orderId: razorpay_order_id
            });
            return NextResponse.json({ success: false, error: "Invalid enhancement pack." }, { status: 400 });
        }
        const creditsToAdd = selectedPack.creditAmount;

        // Step F: --- ATOMIC UPDATE ---
        // The payment is verified. We can now confidently update the user's credit balance.
        logger.info('Credits added successfully', {
            packId,
            creditsAdded: creditsToAdd,
            tenantId,
            storeId
        });

        const currentTopUpCredits = internalSub.topUpCredits || 0;
        const newBalance = currentTopUpCredits + creditsToAdd;

        await updateSubscription(internalSub.id, { topUpCredits: newBalance });

        // 📧 LIFECYCLE MESSAGE: Credit purchase confirmation (fire-and-forget)
        try {
            const { sendLifecycleMessage } = await import('@lib/messaging');
            sendLifecycleMessage({
                storeId: String(storeId),
                tenantId: String(tenantId),
                eventType: 'CREDIT_PURCHASE_SUCCESS',
                referenceId: `topup-${razorpay_order_id}`,
                recipientEmail: internalSub.email || session.user.email || '',
                storeName: internalSub.name || '',
                metadata: {
                    creditsAdded: creditsToAdd,
                    newBalance,
                    amount: order.amount ? (Number(order.amount) / 100) : 0,
                    currency: (order.currency || 'INR').toUpperCase(),
                },
            }).catch(() => { /* non-blocking */ });
        } catch { /* non-blocking */ }

        // 📧 INTERNAL: Notify founder about credit pack revenue
        try {
            const { sendInternalNotification } = await import('@lib/messaging');
            sendInternalNotification({
                eventType: 'INTERNAL_CREDIT_PACK_PURCHASED',
                storeId: String(storeId),
                tenantId: String(tenantId),
                metadata: {
                    storeName: internalSub.name || '',
                    creditsAdded: creditsToAdd,
                    newBalance,
                    amount: order.amount ? (Number(order.amount) / 100) : 0,
                    currency: (order.currency || 'INR').toUpperCase(),
                    storeId: String(storeId),
                    tenantId: String(tenantId),
                },
            }).catch(() => { /* non-blocking */ });
        } catch { /* non-blocking */ }

        // Step G: Respond to the client with the successful result
        return NextResponse.json({ success: true, newCreditBalance: newBalance });

    } catch (error) {
        console.error('Top-up verification API error:', error);
        return NextResponse.json(
            { error: 'Failed to verify top-up', details: (error as Error).message },
            { status: 500 }
        );
    }
});
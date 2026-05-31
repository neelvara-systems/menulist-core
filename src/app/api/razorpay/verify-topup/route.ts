export const dynamic = 'force-dynamic';
import { DB_COLLECTIONS } from "@constant/database";
import { canManageBillingMutation } from "@lib/billing/billingAccess";
import {
    getActiveProductSubscriptionForStore,
    getBillingFirestoreAdminForProduct,
    resolveBillingScopeFromSession,
} from "@lib/billing/productBillingServer";
import { getCreditPacksForProduct, isAnswerlatticeBillingProduct, normalizeBillingProductId } from "@lib/billing/productBillingPlans";
import { admin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { VerifyTopupRequestSchema } from "@lib/validation/apiSchemas";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const verifyRazorpayOrderSignature = (
    orderId: string,
    paymentId: string,
    signature: string,
) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) return false;

    const expectedSignature = createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');
    const expected = Buffer.from(expectedSignature, 'hex');
    const actual = Buffer.from(signature, 'hex');

    return expected.length === actual.length && timingSafeEqual(expected, actual);
};

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    try {
        // 2. 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const rawData = await request.json();
        const validation = validateAPIInput(VerifyTopupRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            // Log to Sentry (CRITICAL - topup payment verification)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: errorMsg,
                attemptedData: {
                    productId: rawData?.productId,
                    hasPaymentId: !!rawData?.razorpay_payment_id,
                    hasOrderId: !!rawData?.razorpay_order_id,
                },
            }, 'critical'); // CRITICAL - topup payment

            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = validation.data;
        if (!verifyRazorpayOrderSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
            logger.security('Invalid Topup Payment Signature', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Razorpay checkout signature mismatch',
                orderId: razorpay_order_id,
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - payment verification failed' },
                { status: 403 }
            );
        }

        // Step 3. --- SERVER-SIDE VERIFICATION ---
        // This is the crucial security step. We ask Razorpay's servers for the truth.

        // Step A: Fetch the full order details from Razorpay before capture.
        const order = await razorpayClient.orders.fetch(razorpay_order_id);
        const productId = normalizeBillingProductId(validation.data.productId || order.notes?.productId);
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

        if (!isAnswerlatticeBillingProduct(productId) && !(await canManageBillingMutation(session, request, '/api/razorpay/verify-topup'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        const orderTenantId = Number(order.notes?.tenantId);
        const orderStoreId = Number(order.notes?.storeId);
        if (orderTenantId !== Number(tenantId) || orderStoreId !== Number(storeId)) {
            logger.security('Unauthorized Topup Order Verification Attempt', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Order tenant/store mismatch',
                productId,
                orderTenantId,
                orderStoreId,
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        const billingDb = getBillingFirestoreAdminForProduct(productId);
        const topupRef = billingDb.collection(DB_COLLECTIONS.TOPUPS).doc(razorpay_order_id);
        const existingTopupSnap = await topupRef.get();
        const existingTopup = existingTopupSnap.exists ? existingTopupSnap.data() : null;

        if (
            existingTopup
            && (
                (existingTopup.tenantId != null && Number(existingTopup.tenantId) !== Number(tenantId))
                || (existingTopup.storeId != null && Number(existingTopup.storeId) !== Number(storeId))
            )
        ) {
            logger.security('Unauthorized Topup Order Verification Attempt', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Stored topup tenant/store mismatch',
                productId,
                orderId: razorpay_order_id,
                storedTenantId: existingTopup.tenantId,
                storedStoreId: existingTopup.storeId,
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (existingTopup?.status === 'paid') {
            if (existingTopup.providerPaymentId && existingTopup.providerPaymentId !== razorpay_payment_id) {
                logger.security('Topup Order Payment Mismatch', {
                    ...buildSecurityContext(session, request),
                    endpoint: '/api/razorpay/verify-topup',
                    error: 'Paid topup was verified with a different payment id',
                    orderId: razorpay_order_id,
                }, 'critical');

                return NextResponse.json({ error: 'Forbidden - payment mismatch' }, { status: 403 });
            }

            const currentSub = await getActiveProductSubscriptionForStore(productId, Number(tenantId), Number(storeId));
            return NextResponse.json({
                success: true,
                newCreditBalance: currentSub?.topUpCredits ?? existingTopup.creditsAdded ?? 0,
                alreadyVerified: true,
            });
        }

        const packId = order.notes?.packId;
        if (!packId) {
            logger.error('Order missing packId', undefined, {
                orderId: razorpay_order_id,
                notes: order.notes
            });
            return NextResponse.json({ success: false, error: "Order details are missing." }, { status: 400 });
        }

        // Step B: Fetch the payment from Razorpay to verify its status is 'captured'
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

        // Step C: The critical check. Now it should pass.
        if (capturedPayment.status !== 'captured') {
            logger.error('Payment capture failed', undefined, {
                paymentId: razorpay_payment_id,
                status: capturedPayment.status
            });
            return NextResponse.json({ success: false, error: "Payment could not be captured." }, { status: 402 });
        }

        const capturedPaymentOrderId = String((capturedPayment as any).order_id || '');
        if (capturedPaymentOrderId !== razorpay_order_id) {
            logger.security('Topup Payment Order Mismatch', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Captured payment does not belong to requested order',
                orderId: razorpay_order_id,
                paymentOrderId: capturedPaymentOrderId,
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - payment mismatch' },
                { status: 403 }
            );
        }

        // Step D: Find the user's active subscription document in our database
        const internalSub = await getActiveProductSubscriptionForStore(productId, Number(tenantId), Number(storeId));
        if (!internalSub) {
            logger.error('No active subscription for top-up', undefined, {
                tenantId,
                storeId,
                productId,
            });
            return NextResponse.json({ success: false, error: "No active subscription found." }, { status: 404 });
        }

        // 🔒 CRITICAL: Double-check subscription belongs to this tenant.
        // Store may differ when an outlet inherits HQ billing.
        if (Number(internalSub.tenantId) !== Number(tenantId)) {
            logger.security('Unauthorized Topup Verification Attempt', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Subscription tenant mismatch',
                productId,
                subscriptionTenantId: internalSub.tenantId,
                subscriptionStoreId: internalSub.storeId,
                requestStoreId: storeId,
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        // Step E: Find the credit pack details from our constants to get the credit amount
        const selectedPack = getCreditPacksForProduct(productId).find((p) => p.packId === packId);
        if (!selectedPack) {
            logger.error('Invalid credit pack', undefined, {
                productId,
                packId,
                orderId: razorpay_order_id
            });
            return NextResponse.json({ success: false, error: "Invalid credit pack." }, { status: 400 });
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

        const subscriptionRef = billingDb.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(internalSub.id);
        const subscriptionTenantId = Number(internalSub.tenantId ?? internalSub.tId ?? tenantId);
        const subscriptionStoreId = Number(internalSub.storeId ?? internalSub.sId ?? storeId);
        const transactionResult = await billingDb.runTransaction(async (tx) => {
            const [topupSnap, subscriptionSnap] = await Promise.all([
                tx.get(topupRef),
                tx.get(subscriptionRef),
            ]);
            const topupData = topupSnap.exists ? topupSnap.data() : null;
            const subscriptionData = subscriptionSnap.exists ? subscriptionSnap.data() : null;

            if (topupData?.status === 'paid') {
                if (topupData.providerPaymentId && topupData.providerPaymentId !== razorpay_payment_id) {
                    return {
                        alreadyVerified: false,
                        newBalance: subscriptionData?.topUpCredits ?? topupData.creditsAdded ?? 0,
                        paymentMismatch: true,
                    };
                }

                return {
                    alreadyVerified: true,
                    newBalance: subscriptionData?.topUpCredits ?? topupData.creditsAdded ?? 0,
                };
            }

            const currentTopUpCredits = Number(subscriptionData?.topUpCredits ?? internalSub.topUpCredits ?? 0);
            const newBalance = currentTopUpCredits + creditsToAdd;
            const serverNow = admin.firestore.FieldValue.serverTimestamp();

            tx.set(subscriptionRef, {
                topUpCredits: newBalance,
                productId,
                pId: productId,
                tenantId: subscriptionTenantId,
                storeId: subscriptionStoreId,
                tId: subscriptionTenantId,
                sId: subscriptionStoreId,
                modifiedOn: serverNow,
            }, { merge: true });
            tx.set(topupRef, {
                paymentProvider: 'razorpay',
                providerOrderId: razorpay_order_id,
                providerPaymentId: razorpay_payment_id,
                creditsAdded: creditsToAdd,
                amount: order.amount,
                currency: (order.currency || capturedPayment.currency || 'INR').toUpperCase(),
                status: 'paid',
                userId: session.user.id,
                tenantId,
                storeId,
                productId,
                pId: productId,
                tId: tenantId,
                sId: storeId,
                uId: session.user.id,
                packId,
                type: isAnswerlatticeBillingProduct(productId) ? 'answerlattice_credit_pack' : 'ai_enhancement_pack',
                packName: selectedPack.name,
                paidAt: serverNow,
                updatedOn: serverNow,
                createdOn: topupData?.createdOn || existingTopup?.createdOn || serverNow,
            }, { merge: true });

            return { alreadyVerified: false, newBalance, paymentMismatch: false };
        });

        if (transactionResult.paymentMismatch) {
            logger.security('Topup Order Payment Mismatch', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Paid topup was verified with a different payment id during transaction',
                orderId: razorpay_order_id,
            }, 'critical');

            return NextResponse.json({ error: 'Forbidden - payment mismatch' }, { status: 403 });
        }

        if (transactionResult.alreadyVerified) {
            return NextResponse.json({
                success: true,
                newCreditBalance: transactionResult.newBalance,
                alreadyVerified: true,
            });
        }

        const newBalance = transactionResult.newBalance;

        if (!isAnswerlatticeBillingProduct(productId)) {
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
        }

        // Step G: Respond to the client with the successful result
        return NextResponse.json({ success: true, newCreditBalance: newBalance });

    } catch (error) {
        logger.error('Top-up verification API error', error as Error, {
            endpoint: '/api/razorpay/verify-topup',
            tenantId: session?.user?.tenantId,
            storeId: session?.user?.storeId,
        });
        return NextResponse.json(
            { error: 'Failed to verify top-up' },
            { status: 500 }
        );
    }
});

export const dynamic = 'force-dynamic';
import { DB_COLLECTIONS } from "@constant/database";
import { canManageBillingMutation } from "@lib/billing/billingAccess";
import {
    getActiveProductSubscriptionForStore,
    getBillingFirestoreAdminForProduct,
    resolveBillingScopeFromSession,
} from "@lib/billing/productBillingServer";
import {
    getBoundedRazorpaySecurityContext,
    getBoundedRazorpayStringContext,
    getRazorpayFailureLogData,
    logRazorpayNonBlockingFailure,
} from "@lib/billing/razorpayDiagnostics";
import { getCreditPacksForProduct, isAnswerlatticeBillingProduct, normalizeBillingProductId } from "@lib/billing/productBillingPlans";
import { admin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { recordFounderRevenueMovement } from "@lib/ops/founderRevenueReadModel";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { VerifyTopupRequestSchema } from "@lib/validation/apiSchemas";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES = 8 * 1024;

const buildFounderTopupMovementId = (paymentId: string): string => `cash:${paymentId}`;

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

const mirrorAnswerlatticeCreditSummary = async (
    billingDb: FirebaseFirestore.Firestore,
    storeId: number | string,
    subscription: any,
    topUpCredits?: number,
) => {
    if (!subscription) return;
    const serverNow = admin.firestore.FieldValue.serverTimestamp();
    await billingDb.collection(DB_COLLECTIONS.STORES).doc(String(storeId)).set({
        'answerlatticeSubscription.id': subscription.id || subscription.providerSubscriptionId || null,
        'answerlatticeSubscription.providerSubscriptionId': subscription.providerSubscriptionId || subscription.id || null,
        'answerlatticeSubscription.monthlyCreditsAllowance': Number(subscription.monthlyCreditsAllowance ?? 0),
        'answerlatticeSubscription.monthlyCredits': Number(subscription.monthlyCredits ?? 0),
        'answerlatticeSubscription.topUpCredits': Number(topUpCredits ?? subscription.topUpCredits ?? 0),
        'answerlatticeSubscription.creditsLastResetMonth': Number(subscription.creditsLastResetMonth ?? 0) || null,
        'answerlatticeSubscription.updatedAt': serverNow,
        answerlatticeBillingUpdatedAt: serverNow,
    }, { merge: true });
};

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    try {
        // 2. 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const bodyResult = await readBoundedJsonBody(request, RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const rawData = bodyResult.data as any;
        const validation = validateAPIInput(VerifyTopupRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            // Log to Sentry (CRITICAL - topup payment verification)
            logger.security('Input Validation Failed', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: errorMsg,
                attemptedData: {
                    ...getBoundedRazorpayStringContext('productId', rawData?.productId),
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
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Razorpay checkout signature mismatch',
                ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
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
        const isAnswerlatticeProduct = isAnswerlatticeBillingProduct(productId);
        const scope = resolveBillingScopeFromSession(session, productId);
        if (!scope) {
            return NextResponse.json({ error: "Missing tenant/store data" }, { status: 400 });
        }

        const { tenantId, storeId } = scope;
        if (!isAnswerlatticeProduct && !verifyTenantAccess(session, tenantId, storeId, request)) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (!isAnswerlatticeProduct && !(await canManageBillingMutation(session, request, '/api/razorpay/verify-topup'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        const orderTenantId = Number(order.notes?.tenantId);
        const orderStoreId = Number(order.notes?.storeId);
        if (orderTenantId !== Number(tenantId) || orderStoreId !== Number(storeId)) {
            logger.security('Unauthorized Topup Order Verification Attempt', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Order tenant/store mismatch',
                ...getBoundedRazorpayStringContext('productId', productId),
                ...getBoundedRazorpayStringContext('tenantId', tenantId),
                ...getBoundedRazorpayStringContext('storeId', storeId),
                ...getBoundedRazorpayStringContext('orderTenantId', orderTenantId),
                ...getBoundedRazorpayStringContext('orderStoreId', orderStoreId),
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
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Stored topup tenant/store mismatch',
                ...getBoundedRazorpayStringContext('productId', productId),
                ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
                ...getBoundedRazorpayStringContext('tenantId', tenantId),
                ...getBoundedRazorpayStringContext('storeId', storeId),
                ...getBoundedRazorpayStringContext('storedTenantId', existingTopup.tenantId),
                ...getBoundedRazorpayStringContext('storedStoreId', existingTopup.storeId),
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (existingTopup?.status === 'paid') {
            if (existingTopup.providerPaymentId && existingTopup.providerPaymentId !== razorpay_payment_id) {
                logger.security('Topup Order Payment Mismatch', {
                    ...getBoundedRazorpaySecurityContext(session, request),
                    endpoint: '/api/razorpay/verify-topup',
                    error: 'Paid topup was verified with a different payment id',
                    ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
                    ...getBoundedRazorpayStringContext('paymentId', razorpay_payment_id),
                    ...getBoundedRazorpayStringContext('storedPaymentId', existingTopup.providerPaymentId),
                }, 'critical');

                return NextResponse.json({ error: 'Forbidden - payment mismatch' }, { status: 403 });
            }

            const currentSub = await getActiveProductSubscriptionForStore(productId, Number(tenantId), Number(storeId));
            if (isAnswerlatticeProduct && currentSub) {
                try {
                    await mirrorAnswerlatticeCreditSummary(billingDb, storeId, currentSub, currentSub.topUpCredits ?? existingTopup.creditsAdded ?? 0);
                } catch (summaryError) {
                    logger.error('Answerlattice top-up summary mirror failed for already verified order', new Error('razorpay_topup_summary_mirror_failed'), {
                        ...getRazorpayFailureLogData('razorpay_topup_summary_mirror_failed', summaryError),
                        ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
                        ...getBoundedRazorpayStringContext('productId', productId),
                        ...getBoundedRazorpayStringContext('tenantId', tenantId),
                        ...getBoundedRazorpayStringContext('storeId', storeId),
                    });
                }
            }
            return NextResponse.json({
                success: true,
                newCreditBalance: currentSub?.topUpCredits ?? existingTopup.creditsAdded ?? 0,
                alreadyVerified: true,
            });
        }

        const packId = order.notes?.packId;
        if (!packId) {
            logger.error('Order missing packId', undefined, {
                ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
                notesPresent: Boolean(order.notes),
            });
            return NextResponse.json({ success: false, error: "Order details are missing." }, { status: 400 });
        }

        // Step B: Fetch the payment from Razorpay to verify its status is 'captured'
        // --- NEW LOGIC: PROGRAMMATIC CAPTURE ---
        const payment = await razorpayClient.payments.fetch(razorpay_payment_id);
        // If the payment is authorized but not yet captured, we capture it now.
        if (payment.status === 'authorized') {
            logger.info('Capturing authorized payment', {
                ...getBoundedRazorpayStringContext('paymentId', razorpay_payment_id),
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
                ...getBoundedRazorpayStringContext('paymentId', razorpay_payment_id),
                status: capturedPayment.status
            });
            return NextResponse.json({ success: false, error: "Payment could not be captured." }, { status: 402 });
        }

        const capturedPaymentOrderId = String((capturedPayment as any).order_id || '');
        if (capturedPaymentOrderId !== razorpay_order_id) {
            logger.security('Topup Payment Order Mismatch', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Captured payment does not belong to requested order',
                ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
                ...getBoundedRazorpayStringContext('paymentOrderId', capturedPaymentOrderId),
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
                ...getBoundedRazorpayStringContext('tenantId', tenantId),
                ...getBoundedRazorpayStringContext('storeId', storeId),
                ...getBoundedRazorpayStringContext('productId', productId),
            });
            return NextResponse.json({ success: false, error: "No active subscription found." }, { status: 404 });
        }

        // 🔒 CRITICAL: Double-check subscription belongs to this tenant.
        // Store may differ when an outlet inherits HQ billing.
        if (Number(internalSub.tenantId) !== Number(tenantId)) {
            logger.security('Unauthorized Topup Verification Attempt', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Subscription tenant mismatch',
                ...getBoundedRazorpayStringContext('productId', productId),
                ...getBoundedRazorpayStringContext('subscriptionTenantId', internalSub.tenantId),
                ...getBoundedRazorpayStringContext('subscriptionStoreId', internalSub.storeId),
                ...getBoundedRazorpayStringContext('requestStoreId', storeId),
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
                ...getBoundedRazorpayStringContext('productId', productId),
                ...getBoundedRazorpayStringContext('packId', packId),
                ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
            });
            return NextResponse.json({ success: false, error: "Invalid credit pack." }, { status: 400 });
        }
        const creditsToAdd = selectedPack.creditAmount;

        // Step F: --- ATOMIC UPDATE ---
        // The payment is verified. We can now confidently update the user's credit balance.
        logger.info('Credits added successfully', {
            ...getBoundedRazorpayStringContext('packId', packId),
            creditsAdded: creditsToAdd,
            ...getBoundedRazorpayStringContext('tenantId', tenantId),
            ...getBoundedRazorpayStringContext('storeId', storeId),
        });

        const subscriptionRef = billingDb.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(internalSub.id);
        const answerlatticeStoreRef = isAnswerlatticeProduct
            ? billingDb.collection(DB_COLLECTIONS.STORES).doc(String(storeId))
            : null;
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
            const monthlyCredits = Number(subscriptionData?.monthlyCredits ?? internalSub.monthlyCredits ?? 0);
            const monthlyCreditsAllowance = Number(subscriptionData?.monthlyCreditsAllowance ?? internalSub.monthlyCreditsAllowance ?? 0);
            const creditsLastResetMonth = Number(subscriptionData?.creditsLastResetMonth ?? internalSub.creditsLastResetMonth ?? 0) || null;
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
                type: isAnswerlatticeProduct ? 'answerlattice_credit_pack' : 'ai_enhancement_pack',
                packName: selectedPack.name,
                paidAt: serverNow,
                updatedOn: serverNow,
                createdOn: topupData?.createdOn || existingTopup?.createdOn || serverNow,
            }, { merge: true });

            if (answerlatticeStoreRef) {
                tx.set(answerlatticeStoreRef, {
                    'answerlatticeSubscription.id': internalSub.id || internalSub.providerSubscriptionId || null,
                    'answerlatticeSubscription.providerSubscriptionId': internalSub.providerSubscriptionId || internalSub.id || null,
                    'answerlatticeSubscription.monthlyCreditsAllowance': monthlyCreditsAllowance,
                    'answerlatticeSubscription.monthlyCredits': monthlyCredits,
                    'answerlatticeSubscription.topUpCredits': newBalance,
                    'answerlatticeSubscription.creditsLastResetMonth': creditsLastResetMonth,
                    'answerlatticeSubscription.updatedAt': serverNow,
                    answerlatticeBillingUpdatedAt: serverNow,
                }, { merge: true });
            }

            return { alreadyVerified: false, newBalance, paymentMismatch: false };
        });

        if (transactionResult.paymentMismatch) {
            logger.security('Topup Order Payment Mismatch', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Paid topup was verified with a different payment id during transaction',
                ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
                ...getBoundedRazorpayStringContext('paymentId', razorpay_payment_id),
            }, 'critical');

            return NextResponse.json({ error: 'Forbidden - payment mismatch' }, { status: 403 });
        }

        if (transactionResult.alreadyVerified) {
            if (isAnswerlatticeProduct) {
                try {
                    await mirrorAnswerlatticeCreditSummary(billingDb, storeId, internalSub, transactionResult.newBalance);
                } catch (summaryError) {
                    logger.error('Answerlattice top-up summary mirror failed for transaction retry', new Error('razorpay_topup_summary_mirror_failed'), {
                        ...getRazorpayFailureLogData('razorpay_topup_summary_mirror_failed', summaryError),
                        ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
                        ...getBoundedRazorpayStringContext('productId', productId),
                        ...getBoundedRazorpayStringContext('tenantId', tenantId),
                        ...getBoundedRazorpayStringContext('storeId', storeId),
                    });
                }
            }
            return NextResponse.json({
                success: true,
                newCreditBalance: transactionResult.newBalance,
                alreadyVerified: true,
            });
        }

        const newBalance = transactionResult.newBalance;
        await recordFounderRevenueMovement({
            amountPaise: Number(order.amount || capturedPayment.amount || 0),
            currency: capturedPayment.currency || order.currency || 'INR',
            description: 'Razorpay credit top-up payment verified.',
            eventName: 'order.paid',
            id: buildFounderTopupMovementId(razorpay_payment_id),
            kind: 'cash_collected',
            occurredAt: (capturedPayment as any).created_at ? Number((capturedPayment as any).created_at) * 1000 : Date.now(),
            productId,
            source: 'api:verify-topup',
            storeId,
            tenantId,
        });

        if (!isAnswerlatticeProduct) {
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
                }).catch((notificationError) => {
                    logRazorpayNonBlockingFailure('razorpay_verify_topup_lifecycle_message_failed', notificationError, {
                        eventType: 'CREDIT_PURCHASE_SUCCESS',
                        ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
                        ...getBoundedRazorpayStringContext('paymentId', razorpay_payment_id),
                        ...getBoundedRazorpayStringContext('tenantId', tenantId),
                        ...getBoundedRazorpayStringContext('storeId', storeId),
                        ...getBoundedRazorpayStringContext('userId', session.user.id),
                        ...getBoundedRazorpayStringContext('productId', productId),
                    });
                });
            } catch (notificationImportError) {
                logRazorpayNonBlockingFailure('razorpay_verify_topup_lifecycle_message_import_failed', notificationImportError, {
                    eventType: 'CREDIT_PURCHASE_SUCCESS',
                    ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
                    ...getBoundedRazorpayStringContext('paymentId', razorpay_payment_id),
                    ...getBoundedRazorpayStringContext('tenantId', tenantId),
                    ...getBoundedRazorpayStringContext('storeId', storeId),
                    ...getBoundedRazorpayStringContext('userId', session.user.id),
                    ...getBoundedRazorpayStringContext('productId', productId),
                });
            }

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
                }).catch((notificationError) => {
                    logRazorpayNonBlockingFailure('razorpay_verify_topup_internal_notification_failed', notificationError, {
                        eventType: 'INTERNAL_CREDIT_PACK_PURCHASED',
                        ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
                        ...getBoundedRazorpayStringContext('paymentId', razorpay_payment_id),
                        ...getBoundedRazorpayStringContext('tenantId', tenantId),
                        ...getBoundedRazorpayStringContext('storeId', storeId),
                        ...getBoundedRazorpayStringContext('userId', session.user.id),
                        ...getBoundedRazorpayStringContext('productId', productId),
                    });
                });
            } catch (notificationImportError) {
                logRazorpayNonBlockingFailure('razorpay_verify_topup_internal_notification_import_failed', notificationImportError, {
                    eventType: 'INTERNAL_CREDIT_PACK_PURCHASED',
                    ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
                    ...getBoundedRazorpayStringContext('paymentId', razorpay_payment_id),
                    ...getBoundedRazorpayStringContext('tenantId', tenantId),
                    ...getBoundedRazorpayStringContext('storeId', storeId),
                    ...getBoundedRazorpayStringContext('userId', session.user.id),
                    ...getBoundedRazorpayStringContext('productId', productId),
                });
            }
        }

        // Step G: Respond to the client with the successful result
        return NextResponse.json({ success: true, newCreditBalance: newBalance });

    } catch (error) {
        logger.error('Top-up verification API error', new Error('razorpay_verify_topup_failed'), getRazorpayFailureLogData('razorpay_verify_topup_failed', error, {
            endpoint: '/api/razorpay/verify-topup',
            ...getBoundedRazorpayStringContext('userId', session?.user?.id),
            ...getBoundedRazorpayStringContext('tenantId', session?.user?.tenantId),
            ...getBoundedRazorpayStringContext('storeId', session?.user?.storeId),
        }));
        return NextResponse.json(
            { error: 'Failed to verify top-up' },
            { status: 500 }
        );
    }
});

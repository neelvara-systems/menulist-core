export const dynamic = 'force-dynamic';
import { menulistServerEnv } from '@lib/env/menulistServerEnv';
import { DB_COLLECTIONS } from "@constant/database";
import { canManageAnswerlatticeBillingMutation, canManageBillingMutation } from "@lib/billing/billingAccess";
import {
    getActiveProductSubscriptionForStore,
    getBillingFirestoreAdminForProduct,
    resolveBillingScopeFromSession,
} from "@lib/billing/productBillingServer";
import { getProductSubscriptionBillingScope } from '@lib/billing/productSubscriptionScopeBoundary';
import { normalizeBillingSubscriptionDocumentId } from "@lib/billing/subscriptionDocumentIdBoundary";
import { normalizeBillingTopupDocumentId, normalizeBillingTopupScopeDocumentId } from "@lib/billing/topupDocumentIdBoundary";
import { resolveRazorpayRevenueOccurredAtMillis } from '@lib/billing/razorpayRevenueProjectionBoundary';
import {
    getBoundedRazorpaySecurityContext,
    getBoundedRazorpayStringContext,
    getRazorpayFailureLogData,
    logRazorpayNonBlockingFailure,
} from "@lib/billing/razorpayDiagnostics";
import { isAnswerlatticeBillingProduct, normalizeBillingProductId, resolveProviderBillingProductId } from "@lib/billing/productBillingPlans";
import {
    resolveCurrentTopupSubscriptionSettlement,
    resolveVerifiedTopupSettlement,
    type CurrentTopupSubscriptionSettlement,
} from '@lib/billing/topupSettlement';
import { admin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { recordFounderRevenueMovement } from "@lib/ops/founderRevenueReadModel";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { VerifyTopupRequestSchema } from "@lib/validation/apiSchemas";
import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES = 8 * 1024;

const buildFounderTopupMovementId = (paymentId: string): string => `cash:${paymentId}`;

const verifyRazorpayOrderSignature = (
    orderId: string,
    paymentId: string,
    signature: string,
) => {
    const keySecret = menulistServerEnv.razorpayKeySecret;
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
    storeDocumentId: string,
    subscription: CurrentTopupSubscriptionSettlement,
) => {
    const serverNow = admin.firestore.FieldValue.serverTimestamp();
    await billingDb.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId).set({
        answerlatticeSubscription: {
            id: subscription.id || subscription.providerSubscriptionId || null,
            providerSubscriptionId: subscription.providerSubscriptionId || subscription.id || null,
            monthlyCreditsAllowance: subscription.monthlyCreditsAllowance,
            monthlyCredits: subscription.monthlyCredits,
            topUpCredits: subscription.topUpCredits,
            creditsLastResetMonth: subscription.creditsLastResetMonth,
            updatedAt: serverNow,
        },
        answerlatticeBillingUpdatedAt: serverNow,
    }, { merge: true });
};

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    try {
        const rateLimitConfig = getRateLimitForFeature('PAYMENT_VERIFICATION');
        const userRateLimitHash = hashPublicRateLimitValue(session.user.id);
        const rateLimitResult = await checkRateLimit({
            failClosedOnProviderError: true,
            key: `payment-verify:topup:${userRateLimitHash}`,
            ...rateLimitConfig,
        });

        if (!rateLimitResult.allowed) {
            const providerUnavailable = rateLimitResult.reason === 'provider_unavailable';
            const waitSeconds = Math.max(1, Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000));
            logger.security(providerUnavailable ? 'Payment Verification Rate Limit Provider Unavailable' : 'Payment Verification Rate Limit Exceeded', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: providerUnavailable ? 'Rate limit provider unavailable' : 'Too many payment verification attempts',
                feature: 'PAYMENT_VERIFICATION',
                ...(providerUnavailable ? {} : {
                    limit: rateLimitConfig.limit,
                    waitSeconds,
                    window: rateLimitConfig.window,
                }),
            }, 'high');

            return NextResponse.json(
                {
                    error: providerUnavailable
                        ? 'Payment verification is temporarily unavailable. Please try again.'
                        : 'Too many payment verification attempts. Please try again later.',
                    ...(providerUnavailable ? {} : { retryAfter: waitSeconds }),
                },
                {
                    status: providerUnavailable ? 503 : 429,
                    headers: providerUnavailable ? {} : {
                        'Retry-After': String(waitSeconds),
                        'X-RateLimit-Limit': String(rateLimitConfig.limit),
                        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
                        'X-RateLimit-Reset': String(rateLimitResult.resetAt),
                    },
                },
            );
        }

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
        const topupDocumentId = normalizeBillingTopupDocumentId(razorpay_order_id);
        if (!topupDocumentId) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

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

        const requestedProductId = normalizeBillingProductId(validation.data.productId);
        if (isAnswerlatticeBillingProduct(requestedProductId) && !(await canManageAnswerlatticeBillingMutation(session, request))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        // Step 3. --- SERVER-SIDE VERIFICATION ---
        // This is the crucial security step. We ask Razorpay's servers for the truth.

        // Step A: Fetch the full order details from Razorpay before capture.
        const order = await razorpayClient.orders.fetch(razorpay_order_id);
        const productId = resolveProviderBillingProductId(
            validation.data.productId,
            order.notes?.productId ?? order.notes?.pId,
        );
        if (!productId) {
            logger.security('Topup Verification Product Mismatch', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Provider order product does not match request product',
                ...getBoundedRazorpayStringContext('requestProductId', validation.data.productId),
                ...getBoundedRazorpayStringContext('providerProductId', order.notes?.productId ?? order.notes?.pId),
                ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
            }, 'critical');
            return NextResponse.json({ error: 'Forbidden - payment mismatch' }, { status: 403 });
        }
        const isAnswerlatticeProduct = isAnswerlatticeBillingProduct(productId);
        const scope = resolveBillingScopeFromSession(session, productId);
        if (!scope) {
            return NextResponse.json({ error: "Missing tenant/store data" }, { status: 400 });
        }

        const tenantScope = normalizeBillingTopupScopeDocumentId(scope.tenantId);
        const storeScope = normalizeBillingTopupScopeDocumentId(scope.storeId);
        if (!tenantScope || !storeScope) {
            logger.security('Invalid Billing Scope - Verify Topup', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Resolved billing scope failed document ID admission',
                ...getBoundedRazorpayStringContext('productId', productId),
                ...getBoundedRazorpayStringContext('tenantId', scope.tenantId),
                ...getBoundedRazorpayStringContext('storeId', scope.storeId),
            }, 'high');

            return NextResponse.json({ error: "Missing tenant/store data" }, { status: 400 });
        }

        const tenantId = tenantScope.numericId;
        const storeId = storeScope.numericId;
        const storeDocumentId = storeScope.documentId;
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
        if (orderTenantId !== tenantId || orderStoreId !== storeId) {
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
        const topupRef = billingDb.collection(DB_COLLECTIONS.TOPUPS).doc(topupDocumentId);
        const existingTopupSnap = await topupRef.get();
        const existingTopup = existingTopupSnap.exists ? existingTopupSnap.data() : null;

        if (
            existingTopup
            && (
                (existingTopup.tenantId != null && Number(existingTopup.tenantId) !== tenantId)
                || (existingTopup.storeId != null && Number(existingTopup.storeId) !== storeId)
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

        const storedSettlement = resolveVerifiedTopupSettlement({
            expectedOrderId: razorpay_order_id,
            expectedPaymentId: razorpay_payment_id,
            expectedProductId: productId,
            expectedStoreId: storeId,
            expectedTenantId: tenantId,
            order,
            topupSnapshot: existingTopup,
        });
        if (!storedSettlement) {
            logger.security('Topup Settlement Snapshot Mismatch', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Provider order does not match the pending topup snapshot',
                ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
                ...getBoundedRazorpayStringContext('productId', productId),
                ...getBoundedRazorpayStringContext('tenantId', tenantId),
                ...getBoundedRazorpayStringContext('storeId', storeId),
            }, 'critical');
            return NextResponse.json({ error: 'Payment order could not be matched.' }, { status: 409 });
        }

        const recordFounderTopupRevenue = (occurredAt: Date | number | string | null) => (
            recordFounderRevenueMovement({
                amountPaise: storedSettlement.amount,
                currency: storedSettlement.currency,
                description: 'Razorpay credit top-up payment verified.',
                eventName: 'order.paid',
                id: buildFounderTopupMovementId(razorpay_payment_id),
                kind: 'cash_collected',
                occurredAt,
                productId,
                requireDurableWrite: true,
                source: 'api:verify-topup',
                storeId,
                tenantId,
            })
        );

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

            const currentSub = await getActiveProductSubscriptionForStore(productId, tenantId, storeId);
            const currentSubScope = getProductSubscriptionBillingScope(productId, currentSub);
            const currentTopupState = currentSubScope
                ? resolveCurrentTopupSubscriptionSettlement({
                    expectedProductId: productId,
                    expectedStoreId: currentSubScope.storeId,
                    expectedTenantId: currentSubScope.tenantId,
                    subscriptionSnapshot: currentSub,
                })
                : null;
            if (
                !currentSub
                || !currentSubScope
                || currentSubScope.tenantId !== tenantId
                || !currentTopupState
                || storedSettlement.billingStoreId !== currentTopupState.storeId
            ) {
                return NextResponse.json({ error: 'Top-up requires billing reconciliation.' }, { status: 409 });
            }
            if (isAnswerlatticeProduct) {
                try {
                    await mirrorAnswerlatticeCreditSummary(billingDb, storeDocumentId, currentTopupState);
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
            await recordFounderTopupRevenue(
                typeof existingTopup.paidAt?.toDate === 'function'
                    ? existingTopup.paidAt.toDate()
                    : Date.now(),
            );
            return NextResponse.json({
                success: true,
                newCreditBalance: currentTopupState.topUpCredits,
                alreadyVerified: true,
            });
        }

        const packId = storedSettlement.packId;

        // Resolve the current target before a provider capture. The transaction
        // below re-reads and revalidates the same subscription before crediting.
        const internalSub = await getActiveProductSubscriptionForStore(productId, tenantId, storeId);
        if (!internalSub) {
            logger.error('No active subscription for top-up', undefined, {
                ...getBoundedRazorpayStringContext('tenantId', tenantId),
                ...getBoundedRazorpayStringContext('storeId', storeId),
                ...getBoundedRazorpayStringContext('productId', productId),
            });
            return NextResponse.json({ success: false, error: "No active subscription found." }, { status: 404 });
        }

        // Store may differ when an outlet inherits HQ billing.
        const internalSubscriptionScope = getProductSubscriptionBillingScope(productId, internalSub);
        if (!internalSubscriptionScope || internalSubscriptionScope.tenantId !== tenantId) {
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

        const subscriptionId = normalizeBillingSubscriptionDocumentId(internalSub.id);
        const subscriptionTenantId = internalSubscriptionScope.tenantId;
        const subscriptionStoreId = internalSubscriptionScope.storeId;
        if (
            !subscriptionId
            || storedSettlement.billingStoreId !== subscriptionStoreId
        ) {
            return NextResponse.json({ success: false, error: "Active subscription not found." }, { status: 404 });
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

        // Settle the immutable order-creation snapshot, not mutable live pack constants.
        const creditsToAdd = storedSettlement.creditsToAdd;

        // Revenue projection is deterministic and required before the credit
        // transaction. A retry sees the same movement ID, so a projection
        // success followed by a credit-write failure remains safe to replay.
        await recordFounderTopupRevenue(
            resolveRazorpayRevenueOccurredAtMillis((capturedPayment as any).created_at) ?? Date.now(),
        );

        // Step F: --- ATOMIC UPDATE ---
        // The payment is verified. We can now confidently update the user's credit balance.
        logger.info('Credits added successfully', {
            ...getBoundedRazorpayStringContext('packId', packId),
            creditsAdded: creditsToAdd,
            ...getBoundedRazorpayStringContext('tenantId', tenantId),
            ...getBoundedRazorpayStringContext('storeId', storeId),
        });

        const subscriptionRef = billingDb.collection(DB_COLLECTIONS.SUBSCRIPTIONS).doc(subscriptionId);
        const answerlatticeStoreRef = isAnswerlatticeProduct
            ? billingDb.collection(DB_COLLECTIONS.STORES).doc(storeDocumentId)
            : null;
        const transactionResult = await billingDb.runTransaction(async (tx) => {
            const [topupSnap, subscriptionSnap] = await Promise.all([
                tx.get(topupRef),
                tx.get(subscriptionRef),
            ]);
            const topupData = topupSnap.exists ? topupSnap.data() : null;
            const subscriptionData = subscriptionSnap.exists ? subscriptionSnap.data() : null;

            if (topupData?.status === 'paid') {
                const existingSettlement = resolveVerifiedTopupSettlement({
                    expectedOrderId: razorpay_order_id,
                    expectedPaymentId: razorpay_payment_id,
                    expectedProductId: productId,
                    expectedStoreId: storeId,
                    expectedTenantId: tenantId,
                    order,
                    payment: capturedPayment,
                    topupSnapshot: topupData,
                });
                const currentSubscription = resolveCurrentTopupSubscriptionSettlement({
                    expectedProductId: productId,
                    expectedStoreId: subscriptionStoreId,
                    expectedTenantId: subscriptionTenantId,
                    subscriptionSnapshot: subscriptionData,
                });
                if (!existingSettlement || !currentSubscription) {
                    return {
                        alreadyVerified: false,
                        invalidSettlement: !existingSettlement,
                        invalidSubscription: !currentSubscription,
                        newBalance: 0,
                        paymentMismatch: false,
                    };
                }
                if (existingSettlement.billingStoreId !== currentSubscription.storeId) {
                    return {
                        alreadyVerified: false,
                        invalidSettlement: true,
                        newBalance: 0,
                        paymentMismatch: false,
                    };
                }

                return {
                    alreadyVerified: true,
                    newBalance: currentSubscription.topUpCredits,
                    subscription: currentSubscription,
                };
            }

            const transactionSettlement = resolveVerifiedTopupSettlement({
                expectedOrderId: razorpay_order_id,
                expectedPaymentId: razorpay_payment_id,
                expectedProductId: productId,
                expectedStoreId: storeId,
                expectedTenantId: tenantId,
                order,
                payment: capturedPayment,
                topupSnapshot: topupData,
            });
            if (!transactionSettlement) {
                return {
                    alreadyVerified: false,
                    invalidSettlement: true,
                    newBalance: subscriptionData?.topUpCredits ?? internalSub.topUpCredits ?? 0,
                    paymentMismatch: false,
                };
            }

            const currentSubscription = resolveCurrentTopupSubscriptionSettlement({
                expectedProductId: productId,
                expectedStoreId: subscriptionStoreId,
                expectedTenantId: subscriptionTenantId,
                subscriptionSnapshot: subscriptionData,
            });
            if (
                !currentSubscription
                || transactionSettlement.billingStoreId !== currentSubscription.storeId
            ) {
                return {
                    alreadyVerified: false,
                    invalidSettlement: false,
                    invalidSubscription: true,
                    newBalance: 0,
                    paymentMismatch: false,
                };
            }

            const newBalance = currentSubscription.topUpCredits + transactionSettlement.creditsToAdd;
            if (!Number.isSafeInteger(newBalance)) {
                return {
                    alreadyVerified: false,
                    invalidSettlement: false,
                    invalidSubscription: true,
                    newBalance: 0,
                    paymentMismatch: false,
                };
            }
            const serverNow = admin.firestore.FieldValue.serverTimestamp();

            tx.set(subscriptionRef, {
                topUpCredits: newBalance,
                modifiedOn: serverNow,
            }, { merge: true });
            tx.set(topupRef, {
                paymentProvider: 'razorpay',
                providerOrderId: topupDocumentId,
                providerPaymentId: razorpay_payment_id,
                creditsAdded: transactionSettlement.creditsToAdd,
                amount: transactionSettlement.amount,
                currency: transactionSettlement.currency,
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
                packName: transactionSettlement.packName,
                paidAt: serverNow,
                updatedOn: serverNow,
                createdOn: topupData?.createdOn || existingTopup?.createdOn || serverNow,
            }, { merge: true });

            if (answerlatticeStoreRef) {
                tx.set(answerlatticeStoreRef, {
                    answerlatticeSubscription: {
                        id: currentSubscription.id || currentSubscription.providerSubscriptionId || null,
                        providerSubscriptionId: currentSubscription.providerSubscriptionId || currentSubscription.id || null,
                        monthlyCreditsAllowance: currentSubscription.monthlyCreditsAllowance,
                        monthlyCredits: currentSubscription.monthlyCredits,
                        topUpCredits: newBalance,
                        creditsLastResetMonth: currentSubscription.creditsLastResetMonth,
                        updatedAt: serverNow,
                    },
                    answerlatticeBillingUpdatedAt: serverNow,
                }, { merge: true });
            }

            return {
                alreadyVerified: false,
                newBalance,
                paymentMismatch: false,
                subscription: {
                    ...currentSubscription,
                    topUpCredits: newBalance,
                },
            };
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

        if (transactionResult.invalidSettlement) {
            logger.security('Topup Settlement Transaction Mismatch', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Topup snapshot changed or did not match captured payment',
                ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
                ...getBoundedRazorpayStringContext('paymentId', razorpay_payment_id),
            }, 'critical');
            return NextResponse.json({ error: 'Payment order could not be matched.' }, { status: 409 });
        }

        if (transactionResult.invalidSubscription) {
            logger.security('Topup Subscription Transaction Mismatch', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/verify-topup',
                error: 'Current subscription is missing, malformed, or outside the selected billing scope',
                ...getBoundedRazorpayStringContext('orderId', razorpay_order_id),
                ...getBoundedRazorpayStringContext('subscriptionId', subscriptionId),
                ...getBoundedRazorpayStringContext('productId', productId),
                ...getBoundedRazorpayStringContext('tenantId', tenantId),
                ...getBoundedRazorpayStringContext('storeId', storeId),
            }, 'critical');
            return NextResponse.json({ error: 'Top-up requires billing reconciliation.' }, { status: 409 });
        }

        if (transactionResult.alreadyVerified) {
            if (!transactionResult.subscription) {
                return NextResponse.json({ error: 'Top-up requires billing reconciliation.' }, { status: 409 });
            }
            if (isAnswerlatticeProduct) {
                try {
                    await mirrorAnswerlatticeCreditSummary(
                        billingDb,
                        storeDocumentId,
                        transactionResult.subscription,
                    );
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
        {
            // Lifecycle delivery is best-effort for the response outcome, but
            // awaited so the server runtime cannot terminate before enqueue.
            try {
                const { sendLifecycleMessage } = await import('@lib/messaging');
                await sendLifecycleMessage({
                    productId,
                    storeId: String(storeId),
                    tenantId: String(tenantId),
                    eventType: 'CREDIT_PURCHASE_SUCCESS',
                    referenceId: `topup-${razorpay_order_id}`,
                    recipientEmail: internalSub.email || session.user.email || '',
                    storeName: internalSub.name || '',
                    metadata: {
                        creditsAdded: creditsToAdd,
                        newBalance,
                        amount: storedSettlement.amount / 100,
                        currency: storedSettlement.currency,
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
                        amount: storedSettlement.amount / 100,
                        currency: storedSettlement.currency,
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

export const dynamic = 'force-dynamic';
import { DB_COLLECTIONS } from "@constant/database";
import { canManageAnswerlatticeBillingMutation, canManageBillingMutation } from "@lib/billing/billingAccess";
import {
    claimBillingCheckoutLease,
    completeBillingCheckoutLease,
    markBillingCheckoutProviderCreated,
    releaseBillingCheckoutLease,
    renewExpiredBillingCheckoutLease,
} from '@lib/billing/billingCheckoutLease';
import {
    getActiveProductSubscriptionForStore,
    getBillingFirestoreAdminForProduct,
    resolveBillingScopeFromSession,
} from "@lib/billing/productBillingServer";
import {
    getBoundedRazorpaySecurityContext,
    getBoundedRazorpayStringContext,
    getRazorpayFailureLogData,
} from "@lib/billing/razorpayDiagnostics";
import { normalizeBillingTopupDocumentId, normalizeBillingTopupScopeDocumentId } from "@lib/billing/topupDocumentIdBoundary";
import { getCreditPacksForProduct, isAnswerlatticeBillingProduct, normalizeBillingProductId } from "@lib/billing/productBillingPlans";
import { projectRazorpayTopupCheckoutResponse } from '@lib/billing/paymentCheckoutBoundary';
import { admin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CreateTopupOrderRequestSchema } from "@lib/validation/apiSchemas";
import { writeLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-topup.log";
const RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES = 8 * 1024;

function getTopupCheckoutReceipt(attemptId: string): string {
    return `mlt_${attemptId.replace(/-/g, '')}`;
}

function isMatchingCheckoutOrder(candidate: any, expected: {
    amount: number;
    attemptId: string;
    billingStoreId: string | number;
    currency: string;
    packId: string;
    productId: string;
    receipt: string;
    storeId: string | number;
    tenantId: string | number;
}): boolean {
    const notes = candidate?.notes || {};
    return typeof candidate?.id === 'string'
        && candidate.status === 'created'
        && candidate.receipt === expected.receipt
        && Number(candidate.amount) === expected.amount
        && String(candidate.currency || '').toUpperCase() === expected.currency.toUpperCase()
        && String(notes.checkoutAttemptId || '') === expected.attemptId
        && String(notes.billingStoreId || '') === String(expected.billingStoreId)
        && String(notes.productId || notes.pId || '') === expected.productId
        && String(notes.tenantId || notes.tId || '') === String(expected.tenantId)
        && String(notes.storeId || notes.sId || '') === String(expected.storeId)
        && String(notes.packId || '') === expected.packId;
}

async function recoverCheckoutOrder(expected: Parameters<typeof isMatchingCheckoutOrder>[1]): Promise<any | null> {
    const response = await razorpayClient.orders.all({
        count: 100,
        receipt: expected.receipt,
    });
    return response.items.find((candidate) => isMatchingCheckoutOrder(candidate, expected)) || null;
}

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const { id: userId } = session.user;
    let logTenantId: string | number | undefined = session.user?.tenantId;
    let logStoreId: string | number | undefined = session.user?.storeId;
    let checkoutLeaseIdentity: Parameters<typeof claimBillingCheckoutLease>[0] | null = null;
    let checkoutAttemptId: string | null = null;
    let providerOrderCreateAttempted = false;
    let providerOrderCreated = false;
    let topupPersisted = false;

    try {
        // 2. 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const bodyResult = await readBoundedJsonBody(request, RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid credit pack request.',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data as any;
        const validation = validateAPIInput(CreateTopupOrderRequestSchema, body);

        if (!validation.success) {
            const validationError = 'error' in validation ? validation.error : 'Invalid input';
            logger.security('Input Validation Failed', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/create-topup-order',
                error: validationError,
                attemptedData: {
                    ...getBoundedRazorpayStringContext('productId', body?.productId),
                    ...getBoundedRazorpayStringContext('packId', body?.packId),
                    ...getBoundedRazorpayStringContext('currency', body?.currency),
                },
            }, 'critical');

            return NextResponse.json(
                { error: "Invalid credit pack request." },
                { status: 400 }
            );
        }

        const productId = normalizeBillingProductId(validation.data.productId);
        const scope = resolveBillingScopeFromSession(session, productId);
        if (!scope) {
            logger.security('User Not Onboarded - Create Topup Order', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/create-topup-order',
                error: 'User attempted to create topup order without product tenant/store',
                productId,
            }, 'high');

            return NextResponse.json(
                { error: 'User not onboarded. Complete onboarding first.' },
                { status: 400 }
            );
        }

        const tenantScope = normalizeBillingTopupScopeDocumentId(scope.tenantId);
        const storeScope = normalizeBillingTopupScopeDocumentId(scope.storeId);
        if (!tenantScope || !storeScope) {
            logger.security('Invalid Billing Scope - Create Topup Order', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/create-topup-order',
                error: 'Resolved billing scope failed document ID admission',
                productId,
                ...getBoundedRazorpayStringContext('tenantId', scope.tenantId),
                ...getBoundedRazorpayStringContext('storeId', scope.storeId),
            }, 'high');

            return NextResponse.json(
                { error: 'User not onboarded. Complete onboarding first.' },
                { status: 400 }
            );
        }

        const tenantId = tenantScope.numericId;
        const storeId = storeScope.numericId;
        logTenantId = tenantId;
        logStoreId = storeId;

        // Rate-limit before current-role/store authorization reads so denied
        // callers cannot turn the permission boundary into an unbounded read path.
        const rateLimitConfig = getRateLimitForFeature('PAYMENT_TOPUP');
        const userRateLimitHash = hashPublicRateLimitValue(userId);
        const tenantRateLimitHash = hashPublicRateLimitValue(tenantId);
        const rateLimitResult = await checkRateLimit({
            key: `topup:${productId}:${userRateLimitHash}:${tenantRateLimitHash}`,
            ...rateLimitConfig
        });

        if (!rateLimitResult.allowed) {
            logger.security('Topup Order Rate Limit Exceeded', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/create-topup-order',
                error: 'Too many topup attempts',
                productId,
                currentAttempts: rateLimitResult.current,
            }, 'high');

            return NextResponse.json({
                error: 'Too many topup attempts. Please try again later.',
                resetAt: rateLimitResult.resetAt
            }, { status: 429 });
        }

        if (isAnswerlatticeBillingProduct(productId) && !(await canManageAnswerlatticeBillingMutation(session, request))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }
        // 🔒 CRITICAL: Verify user owns this tenant/store
        if (!isAnswerlatticeBillingProduct(productId) && !verifyTenantAccess(session, tenantId, storeId, request)) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (!isAnswerlatticeBillingProduct(productId) && !(await canManageBillingMutation(session, request, '/api/razorpay/create-topup-order'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        const activeSubscription = await getActiveProductSubscriptionForStore(
            productId,
            tenantId,
            storeId,
        );
        if (!activeSubscription) {
            return NextResponse.json(
                { error: 'An active subscription is required before buying enhancement packs.' },
                { status: 404 }
            );
        }
        const billingStoreId = Number(activeSubscription.storeId ?? activeSubscription.sId);
        if (!Number.isSafeInteger(billingStoreId) || billingStoreId <= 0) {
            return NextResponse.json(
                { error: 'The active billing subscription requires support.' },
                { status: 409 },
            );
        }

        const { packId, currency } = validation.data;
        const priceKey = `price${currency.toUpperCase()}`;
        // 3. Find Pack Details
        const selectedPack = getCreditPacksForProduct(productId).find((p) => p.packId === packId);

        if (!selectedPack) {
            return NextResponse.json({ error: "Credit pack not found." }, { status: 404 });
        }

        const price = selectedPack[priceKey].price;
        if (price === undefined) {
            return NextResponse.json({ error: `Pricing for currency ${currency} not available for this pack.` }, { status: 400 });
        }

        checkoutLeaseIdentity = {
            actorId: userId,
            kind: 'topup',
            productId,
            tenantId,
            storeId,
            requestFacts: {
                currency,
                packId,
                price,
                productId,
                billingStoreId,
                storeId: String(storeId),
                tenantId: String(tenantId),
            },
        };
        const checkoutClaim = await claimBillingCheckoutLease(checkoutLeaseIdentity);
        if (checkoutClaim.outcome === 'in_progress' || checkoutClaim.outcome === 'conflict') {
            return NextResponse.json(
                { error: 'A billing checkout is already being prepared. Please wait and try again.' },
                { status: 409 },
            );
        }
        checkoutAttemptId = checkoutClaim.attemptId;
        let receipt = getTopupCheckoutReceipt(checkoutAttemptId);
        const orderExpectation = () => ({
            amount: price,
            attemptId: checkoutAttemptId as string,
            billingStoreId,
            currency,
            packId,
            productId,
            receipt,
            storeId,
            tenantId,
        });

        let recoveredOrder: any | null = null;
        if (checkoutClaim.outcome === 'provider_created') {
            const candidate = await razorpayClient.orders.fetch(checkoutClaim.providerEntityId);
            if (!isMatchingCheckoutOrder(candidate, orderExpectation())) {
                throw new Error('billing_checkout_provider_order_mismatch');
            }
            recoveredOrder = candidate;
        } else if (checkoutClaim.outcome === 'recover_attempt') {
            recoveredOrder = await recoverCheckoutOrder(orderExpectation());
            if (!recoveredOrder) {
                const renewed = await renewExpiredBillingCheckoutLease(
                    checkoutLeaseIdentity,
                    checkoutClaim.attemptId,
                );
                if (!renewed.acquired || !renewed.attemptId) {
                    return NextResponse.json(
                        { error: 'A billing checkout is already being prepared. Please wait and try again.' },
                        { status: 409 },
                    );
                }
                checkoutAttemptId = renewed.attemptId;
                receipt = getTopupCheckoutReceipt(checkoutAttemptId);
            }
        }

        // 4. Orchestration Logic
        // Step A: Create or recover the Razorpay Order.
        const orderPayload = {
            amount: price,
            currency,
            receipt,
            notes: {
                productId,
                pId: productId,
                tenantId,
                storeId,
                tId: tenantId,
                sId: storeId,
                userId,
                uId: userId,
                packId,
                creditAmount: selectedPack.creditAmount,
                packName: selectedPack.name,
                price: price,
                currency,
                checkoutAttemptId,
                billingStoreId,
            },
        };
        let razorpayOrder: any;
        if (recoveredOrder) {
            razorpayOrder = recoveredOrder;
        } else {
            providerOrderCreateAttempted = true;
            try {
                razorpayOrder = await razorpayClient.orders.create(orderPayload);
            } catch (providerCreateError) {
                const recovered = await recoverCheckoutOrder(orderExpectation());
                if (!recovered) throw providerCreateError;
                razorpayOrder = recovered;
            }
        }
        providerOrderCreated = true;
        if (!checkoutAttemptId || !(await markBillingCheckoutProviderCreated({
            attemptId: checkoutAttemptId,
            identity: checkoutLeaseIdentity,
            providerEntityId: razorpayOrder.id,
        }))) throw new Error('billing_checkout_provider_order_claim_lost');

        const topupDocumentId = normalizeBillingTopupDocumentId(razorpayOrder.id);
        if (!topupDocumentId) {
            throw new Error('razorpay_topup_order_id_invalid');
        }

        await getBillingFirestoreAdminForProduct(productId).collection(DB_COLLECTIONS.TOPUPS).doc(topupDocumentId).set({
            paymentProvider: 'razorpay',
            providerOrderId: topupDocumentId,
            creditsAdded: selectedPack.creditAmount,
            amount: price,
            currency,
            status: 'pending',
            userId,
            tenantId,
            storeId,
            productId,
            pId: productId,
            tId: tenantId,
            sId: storeId,
            uId: userId,
            packId,
            type: isAnswerlatticeBillingProduct(productId) ? 'answerlattice_credit_pack' : 'ai_enhancement_pack',
            packName: selectedPack.name,
            billingStoreId,
            createdOn: admin.firestore.FieldValue.serverTimestamp(),
            updatedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
        topupPersisted = true;

        await completeBillingCheckoutLease({
            attemptId: checkoutAttemptId,
            identity: checkoutLeaseIdentity,
        }).catch((completionError) => {
            logger.warn('Top-up checkout replay checkpoint failed', {
                ...getRazorpayFailureLogData('razorpay_topup_checkout_completion_failed', completionError),
            });
            return false;
        });

        const responsePayload = projectRazorpayTopupCheckoutResponse(razorpayOrder);
        if (!responsePayload) {
            throw new Error('razorpay_topup_checkout_response_invalid');
        }
        return NextResponse.json(responsePayload);

    } catch (error) {
        if (
            checkoutLeaseIdentity
            && checkoutAttemptId
            && !providerOrderCreated
            && !providerOrderCreateAttempted
            && !topupPersisted
        ) {
            await releaseBillingCheckoutLease({
                attemptId: checkoutAttemptId,
                identity: checkoutLeaseIdentity,
            }).catch(() => false);
        }
        const failureData = getRazorpayFailureLogData('razorpay_create_topup_order_failed', error, {
            operation: 'create-topup-order',
            ...getBoundedRazorpayStringContext('userId', userId),
            ...getBoundedRazorpayStringContext('tenantId', logTenantId),
            ...getBoundedRazorpayStringContext('storeId', logStoreId),
            endpoint: '/api/razorpay/create-topup-order',
        });
        logger.error('Top-up order creation failed', new Error('razorpay_create_topup_order_failed'), failureData);

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CREATE_TOPUP_ORDER_ERROR',
            data: failureData,
        });

        return NextResponse.json(
            { error: 'Failed to create top-up order' },
            { status: 500 }
        );
    }
});

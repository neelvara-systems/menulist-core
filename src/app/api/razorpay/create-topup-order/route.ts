export const dynamic = 'force-dynamic';
import { DB_COLLECTIONS } from "@constant/database";
import { canManageAnswerlatticeBillingMutation, canManageBillingMutation } from "@lib/billing/billingAccess";
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

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const { id: userId } = session.user;
    let logTenantId: string | number | undefined = session.user?.tenantId;
    let logStoreId: string | number | undefined = session.user?.storeId;

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

        // 4. Orchestration Logic
        // Step A: Create Razorpay Order
        const razorpayOrder = await razorpayClient.orders.create({
            amount: price,
            currency,
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
            },
        });

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
            createdOn: admin.firestore.FieldValue.serverTimestamp(),
            updatedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return NextResponse.json({ order: razorpayOrder });

    } catch (error) {
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

export const dynamic = 'force-dynamic';
import { DB_COLLECTIONS } from "@constant/database";
import { canManageBillingMutation } from "@lib/billing/billingAccess";
import { getBillingFirestoreAdminForProduct, resolveBillingScopeFromSession } from "@lib/billing/productBillingServer";
import { getCreditPacksForProduct, isAnswerlatticeBillingProduct, normalizeBillingProductId } from "@lib/billing/productBillingPlans";
import { admin } from "@lib/firebase/firebaseAdmin";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { CreateTopupOrderRequestSchema } from "@lib/validation/apiSchemas";
import { writeLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-topup.log";

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const { id: userId } = session.user;
    let logTenantId: string | number | undefined = session.user?.tenantId;
    let logStoreId: string | number | undefined = session.user?.storeId;

    try {
        // 2. 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const body = await request.json();
        const validation = validateAPIInput(CreateTopupOrderRequestSchema, body);

        if (!validation.success) {
            const validationError = 'error' in validation ? validation.error : 'Invalid input';
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/create-topup-order',
                error: validationError,
                attemptedData: {
                    productId: body?.productId,
                    packId: body?.packId,
                    currency: body?.currency,
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
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/create-topup-order',
                error: 'User attempted to create topup order without product tenant/store',
                productId,
            }, 'high');

            return NextResponse.json(
                { error: 'User not onboarded. Complete onboarding first.' },
                { status: 400 }
            );
        }

        const { tenantId, storeId } = scope;
        logTenantId = tenantId;
        logStoreId = storeId;
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

        // 🔒 RATE LIMITING: Prevent topup spam (centralized config)
        const rateLimitConfig = getRateLimitForFeature('PAYMENT_TOPUP');
        const rateLimitResult = await checkRateLimit({
            key: `topup:${productId}:${userId}:${tenantId}`,
            ...rateLimitConfig
        });

        if (!rateLimitResult.allowed) {
            logger.security('Topup Order Rate Limit Exceeded', {
                ...buildSecurityContext(session, request),
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

        await getBillingFirestoreAdminForProduct(productId).collection(DB_COLLECTIONS.TOPUPS).doc(razorpayOrder.id).set({
            paymentProvider: 'razorpay',
            providerOrderId: razorpayOrder.id,
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
        logger.error('Top-up order creation failed', error as Error, {
            operation: 'create-topup-order',
            userId,
            tenantId: logTenantId,
            storeId: logStoreId,
            endpoint: '/api/razorpay/create-topup-order',
        });

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CREATE_TOPUP_ORDER_ERROR',
            data: {
                message: error instanceof Error ? error.message : 'Unknown error',
            },
        });

        return NextResponse.json(
            { error: 'Failed to create top-up order' },
            { status: 500 }
        );
    }
});

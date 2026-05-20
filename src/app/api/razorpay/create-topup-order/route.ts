export const dynamic = 'force-dynamic';
import { DB_COLLECTIONS } from "@constant/database";
import { aiEnhancementPacksList } from '@data/PlatformPlansList';
import { canManageBillingMutation } from "@lib/billing/billingAccess";
import { admin, firestoreAdmin } from "@lib/firebase/firebaseAdmin";
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
    const { tenantId, storeId, id: userId } = session.user;

    try {
        if (!tenantId || !storeId) {
            logger.security('User Not Onboarded - Create Topup Order', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/create-topup-order',
                error: 'User attempted to create topup order without tenant/store',
            }, 'high');

            return NextResponse.json(
                { error: 'User not onboarded. Complete onboarding first.' },
                { status: 400 }
            );
        }

        // 🔒 CRITICAL: Verify user owns this tenant/store
        if (!verifyTenantAccess(session, tenantId, storeId, request)) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (!(await canManageBillingMutation(session, request, '/api/razorpay/create-topup-order'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        // 🔒 RATE LIMITING: Prevent topup spam (centralized config)
        const rateLimitConfig = getRateLimitForFeature('PAYMENT_TOPUP');
        const rateLimitResult = await checkRateLimit({
            key: `topup:${userId}:${tenantId}`,
            ...rateLimitConfig
        });

        if (!rateLimitResult.allowed) {
            logger.security('Topup Order Rate Limit Exceeded', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/create-topup-order',
                error: 'Too many topup attempts',
                currentAttempts: rateLimitResult.current,
            }, 'high');

            return NextResponse.json({
                error: 'Too many topup attempts. Please try again later.',
                resetAt: rateLimitResult.resetAt
            }, { status: 429 });
        }

        // 2. 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const body = await request.json();
        const validation = validateAPIInput(CreateTopupOrderRequestSchema, body);

        if (!validation.success) {
            const validationError = 'error' in validation ? validation.error : 'Invalid input';
            // Log to Sentry (CRITICAL - topup order creation)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/create-topup-order',
                error: validationError,
                attemptedData: {
                    packId: body?.packId,
                    currency: body?.currency,
                },
            }, 'critical'); // CRITICAL - topup payment order

            return NextResponse.json(
                { error: "Invalid enhancement pack request." },
                { status: 400 }
            );
        }

        const { packId, currency } = validation.data;
        const priceKey = `price${currency.toUpperCase()}`;
        // 3. Find Pack Details
        const selectedPack = aiEnhancementPacksList.find((p) => p.packId === packId);

        if (!selectedPack) {
            return NextResponse.json({ error: "Enhancement pack not found." }, { status: 404 });
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
                tenantId,
                storeId,
                userId,
                packId,
                creditAmount: selectedPack.creditAmount,
                packName: selectedPack.name,
                price: price,
                currency,
            },
        });

        await firestoreAdmin.collection(DB_COLLECTIONS.TOPUPS).doc(razorpayOrder.id).set({
            paymentProvider: 'razorpay',
            providerOrderId: razorpayOrder.id,
            creditsAdded: selectedPack.creditAmount,
            amount: price,
            currency,
            status: 'pending',
            userId,
            tenantId,
            storeId,
            packId,
            type: 'ai_enhancement_pack',
            packName: selectedPack.name,
            createdOn: admin.firestore.FieldValue.serverTimestamp(),
            updatedOn: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });

        return NextResponse.json({ order: razorpayOrder });

    } catch (error) {
        logger.error('Top-up order creation failed', error as Error, {
            operation: 'create-topup-order',
            userId,
            tenantId,
            storeId,
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

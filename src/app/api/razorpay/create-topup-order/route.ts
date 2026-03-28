export const dynamic = 'force-dynamic';
import { Currency } from "@data/common";
import { aiEnhancementPacksList } from '@data/PlatformPlansList';
import { handlePaymentError } from "@lib/errors/firestoreErrors";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { buildSecurityContext } from "@lib/security/securityContext";
import { writeErrorLogEntry } from 'logs/utils';
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
        const { packId, currency } = body as { packId: string; currency: Currency };

        if (!packId || !currency) {
            // Log to Sentry (CRITICAL - topup order creation)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/create-topup-order',
                error: 'Missing required fields: packId or currency',
                attemptedData: {
                    packId: body?.packId,
                    currency: body?.currency,
                },
            }, 'critical'); // CRITICAL - topup payment order

            return NextResponse.json(
                { error: "Missing required fields: packId or currency." },
                { status: 400 }
            );
        }

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

        return NextResponse.json({ order: razorpayOrder });

    } catch (error) {
        console.error("Error creating Razorpay top-up order:", error);
        await writeErrorLogEntry(LOG_FILE, error);

        // Use improved error handler with Firestore/Razorpay specific handling
        return handlePaymentError(error, {
            operation: 'create-topup-order',
            userId,
            tenantId,
            endpoint: '/api/razorpay/create-topup-order'
        });
    }
});

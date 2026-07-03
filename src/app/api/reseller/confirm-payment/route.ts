export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { getSubscriptionById, updateSubscription } from "@database/subscriptions/server";
import { getBoundedResellerApiStringContext, logResellerApiFailure } from "@lib/billing/resellerApiDiagnostics";
import { safeSyncStorePlanEntitlementFromSubscription } from "@lib/billing/subscriptionEntitlementSync";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { getBoundedSecurityRouteContext } from "@lib/security/securityDiagnostics";
import { validateAPIInput } from "@lib/security/inputValidation";
import { ResellerConfirmPaymentSchema } from "@lib/validation/resellerSchemas";
import { Timestamp } from "firebase/firestore";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";
import { hashPublicRateLimitValue } from "../../../../middleware/publicApi";

const RESELLER_ACTION_MAX_BODY_BYTES = 16 * 1024;

/**
 * POST /api/reseller/confirm-payment — Offline payment confirmation
 * 
 * Reseller confirms they received cash/UPI from the client.
 * Updates subscription status from pending to active.
 * 
 * @see __docs__/reseller-dashboard/reseller-dashboard_impl.md §4.2
 */
export const POST = withAuth(async (request, session) => {
    const resellerId = session.user.id;
    const isPlatformUser = session.user.platformRole === 'PLATFORM' || session.platformRole === 'PLATFORM';

    try {
        if (!FEATURE_FLAGS.ENABLE_RESELLER_DASHBOARD) {
            return NextResponse.json({ error: "Feature not available." }, { status: 404 });
        }

        const rateLimitConfig = getRateLimitForFeature('DATA_WRITE');
        const resellerRateLimitHash = hashPublicRateLimitValue(resellerId);
        const rateLimitResult = await checkRateLimit({
            key: `reseller-confirm-payment:${resellerRateLimitHash}`,
            ...rateLimitConfig,
        });
        if (!rateLimitResult.allowed) {
            return NextResponse.json({
                error: "Too many requests. Please try again later.",
                resetAt: rateLimitResult.resetAt,
            }, { status: 429 });
        }

        const bodyResult = await readBoundedJsonBody(request, RESELLER_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data as any;
        const validation = validateAPIInput(ResellerConfirmPaymentSchema, body);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
        }

        const { subscriptionId } = validation.data;

        // Verify subscription exists and belongs to this reseller
        const subscription = await getSubscriptionById(subscriptionId);
        if (!subscription) {
            return NextResponse.json({ error: "Subscription not found." }, { status: 404 });
        }

        if (subscription.resellerId !== resellerId && !isPlatformUser) {
            logger.security('Reseller Confirm Payment - Unauthorized Access', {
                ...getBoundedSecurityRouteContext(session, request),
                ...getBoundedResellerApiStringContext('resellerId', resellerId),
                ...getBoundedResellerApiStringContext('subscriptionId', subscriptionId),
                ...getBoundedResellerApiStringContext('actualResellerId', subscription.resellerId),
            }, 'high');
            return NextResponse.json({ error: "Access denied." }, { status: 403 });
        }

        if (subscription.billingMode !== 'manual') {
            return NextResponse.json({ error: "This subscription uses online payment. No manual confirmation needed." }, { status: 400 });
        }

        if (subscription.status === 'active' && subscription.manualPaymentConfirmed) {
            return NextResponse.json({ error: "Payment already confirmed." }, { status: 400 });
        }

        // Update subscription to active
        await updateSubscription(subscriptionId, {
            status: 'active',
            manualPaymentConfirmed: true,
            manualPaymentConfirmedAt: Timestamp.now(),
            statuses: [
                ...subscription.statuses,
                {
                    status: 'active',
                    timestamp: Timestamp.now(),
                    amount: subscription.amount,
                    currency: subscription.currency,
                    remark: 'Offline payment confirmed by reseller',
                },
            ],
        });
        await safeSyncStorePlanEntitlementFromSubscription(
            { ...subscription, id: subscriptionId, status: 'active' },
            'api:reseller-confirm-payment',
        );

        return NextResponse.json({
            success: true,
            subscriptionId,
            status: 'active',
        });

    } catch (error) {
        logResellerApiFailure('reseller_confirm_payment_route_failed', error, {
            ...getBoundedResellerApiStringContext('resellerId', resellerId),
        });
        return NextResponse.json(
            { error: 'Failed to confirm payment. Please try again.' },
            { status: 500 }
        );
    }
}, { requiredPlatformRole: 'RESELLER' });

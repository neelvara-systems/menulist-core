export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { getSubscriptionById, updateSubscription } from "@database/subscriptions";
import { safeSyncStorePlanEntitlementFromSubscription } from "@lib/billing/subscriptionEntitlementSync";
import { logger } from "@lib/monitoring/logger";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { ResellerConfirmPaymentSchema } from "@lib/validation/resellerSchemas";
import { Timestamp } from "firebase/firestore";
import { NextResponse } from "next/server";
import { withAuth } from "../../../../middleware/auth";

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

        const body = await request.json();
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
                ...buildSecurityContext(session, request),
                resellerId,
                subscriptionId,
                actualResellerId: subscription.resellerId,
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
        console.error('[Reseller Confirm Payment] Failed:', error);
        return NextResponse.json(
            { error: 'Failed to confirm payment. Please try again.' },
            { status: 500 }
        );
    }
}, { requiredPlatformRole: 'RESELLER' });

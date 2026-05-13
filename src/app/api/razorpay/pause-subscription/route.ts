export const dynamic = 'force-dynamic';
import { getActiveSubscriptionForStore, getSubscriptionById, updateSubscription } from "@database/subscriptions";
import { canManageBillingMutation } from "@lib/billing/billingAccess";
import { safeSyncStorePlanEntitlementFromSubscription } from "@lib/billing/subscriptionEntitlementSync";
import { validateTransition } from "@lib/billing/subscriptionStateMachine";
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { buildSecurityContext } from "@lib/security/securityContext";
import { Timestamp } from "firebase/firestore";
import { writeErrorLogEntry, writeLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-subscription.log";

export const POST = withAuth(async (request, session) => {
    const userId = session.user.id;
    try {
        // 🔒 RATE LIMITING: Prevent rapid-fire subscription mutations
        const { checkRateLimit } = await import('@lib/rateLimit');
        const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
        const rl = await checkRateLimit({ key: `sub-mutate:${userId}`, ...getRateLimitForFeature('SUBSCRIPTION_MUTATION') });
        if (!rl.allowed) {
            return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
        }

        if (!session?.user?.tenantId || !session?.user?.storeId) {
            return NextResponse.json({ error: "Missing tenant/store data" }, { status: 400 });
        }
        const { tenantId, storeId } = session.user;

        // 🔒 CRITICAL: Verify user owns this tenant/store
        if (!verifyTenantAccess(session, tenantId, storeId, request)) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (!(await canManageBillingMutation(session, request, '/api/razorpay/pause-subscription'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { reason, subscriptionId } = body;

        // Find the user's active subscription
        const internalSub = subscriptionId ? await getSubscriptionById(subscriptionId) : await getActiveSubscriptionForStore(Number(tenantId), Number(storeId));
        if (!internalSub || !internalSub.providerSubscriptionId) {
            return NextResponse.json({ error: "No active subscription found to pause." }, { status: 404 });
        }

        // 🔒 CRITICAL: Verify subscription belongs to user's tenant/store
        if (internalSub.tenantId !== Number(tenantId) || internalSub.storeId !== Number(storeId)) {
            logger.security('Unauthorized Subscription Pause Attempt', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/pause-subscription',
                error: 'User attempted to pause subscription for different tenant/store',
                subscriptionTenantId: internalSub.tenantId,
                subscriptionStoreId: internalSub.storeId,
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (internalSub.status !== 'active') {
            return NextResponse.json({ error: "Only active subscriptions can be paused." }, { status: 400 });
        }

        await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_PAUSE_SUBSCRIPTION_FLOW', data: { internalSub } });

        // Call Razorpay Pause API — pause_at: "now" is the only request param per Razorpay docs
        await razorpayClient.subscriptions.pause(internalSub.providerSubscriptionId, {
            pause_at: 'now'
        });

        await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_PAUSE_SUBSCRIPTION_FLOW_SUCCESS', data: { internalSub } });

        // Update internal record
        validateTransition(internalSub.status, 'paused', 'api:pause-subscription');
        await updateSubscription(internalSub.id, {
            status: 'paused',
            statuses: [
                ...internalSub.statuses,
                {
                    status: "paused",
                    timestamp: Timestamp.now(),
                    amount: internalSub.amount,
                    currency: internalSub.currency,
                    remark: `Paused by user${reason ? `, reason: ${reason}` : ''}`,
                },
            ],
        });
        await safeSyncStorePlanEntitlementFromSubscription(
            { ...internalSub, status: 'paused' },
            'api:pause-subscription',
        );

        logger.info('Subscription paused successfully', {
            subscriptionId: internalSub.id,
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, message: "Subscription paused successfully." });
    } catch (error) {
        logger.error('Subscription pause failed', error, {
            api: 'pause-subscription',
            userId
        });
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json({ error: 'Failed to pause subscription', details: (error as Error).message }, { status: 500 });
    }
});

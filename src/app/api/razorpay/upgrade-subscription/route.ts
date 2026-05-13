export const dynamic = 'force-dynamic';
import { getSubscriptionById, updateSubscription } from '@database/subscriptions';
import { canManageBillingMutation } from '@lib/billing/billingAccess';
import { safeSyncStorePlanEntitlementFromSubscription } from '@lib/billing/subscriptionEntitlementSync';
import { validateTransition } from '@lib/billing/subscriptionStateMachine';
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { buildSecurityContext } from "@lib/security/securityContext";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { Timestamp } from "firebase/firestore";
import { writeErrorLogEntry, writeLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-subscription.log";

export const POST = withAuth(async (request, session) => {
    // Session guaranteed by withAuth middleware
    // Auth failures automatically logged to Sentry
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

        if (!(await canManageBillingMutation(session, request, '/api/razorpay/upgrade-subscription'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { rc, nSi, oSi } = body;
        const remainingCredits = Number(rc);
        const newSubscriptionId = nSi;
        const oldSubscriptionId = oSi;

        if (!newSubscriptionId || !oldSubscriptionId) {
            // Log to Sentry (CRITICAL - subscription upgrade)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/upgrade-subscription',
                error: 'Missing required fields: subscription IDs',
                attemptedData: {
                    hasNewSubscriptionId: !!body?.nSi,
                    hasOldSubscriptionId: !!body?.oSi,
                    remainingCredits: body?.rc,
                },
            }, 'critical'); // CRITICAL - subscription upgrade

            return NextResponse.json({ error: "Subscription ID is required." }, { status: 400 });
        }

        const internalSub: FirestoreSubscriptionDoc = await getSubscriptionById(oldSubscriptionId);
        if (!internalSub || !internalSub.providerSubscriptionId) {
            return NextResponse.json({ error: "No active subscription found to upgrade." }, { status: 404 });
        }

        // 🔒 CRITICAL: Verify old subscription belongs to user's tenant/store
        if (Number(tenantId) != internalSub.tenantId || Number(storeId) != internalSub.storeId) {
            logger.security('Unauthorized Subscription Upgrade Attempt', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/upgrade-subscription',
                error: 'User attempted to upgrade subscription for different tenant/store',
                subscriptionTenantId: internalSub.tenantId,
                subscriptionStoreId: internalSub.storeId,
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_FLOW_INTERNAL_SUB', data: { internalSub }, });

        const providerSubscriptionBeforeCancel = await razorpayClient.subscriptions.fetch(internalSub.providerSubscriptionId);
        await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_FLOW_PROVIDER_SUBSCRIPTION_BEFORE_CANCEL', data: { providerSubscriptionBeforeCancel }, });

        if (providerSubscriptionBeforeCancel.status === "completed") {
            await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_FLOW_PROVIDER_SUBSCRIPTION_BEFORE_CANCEL_COMPLETED', data: { providerSubscriptionBeforeCancel }, });
        } else {
            await razorpayClient.subscriptions.cancel(internalSub.providerSubscriptionId); // Immediate cancel
            const providerSubscriptionAfterCancel = await razorpayClient.subscriptions.fetch(internalSub.providerSubscriptionId);
            await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_FLOW_PROVIDER_SUBSCRIPTION_AFTER_CANCEL', data: { providerSubscriptionAfterCancel }, });
        }

        validateTransition(internalSub.status, 'expired', 'api:upgrade-subscription');
        await updateSubscription(internalSub.id, {
            status: 'expired',
            cycleEndDate: Timestamp.now(),
            subscriptionEndDate: Timestamp.now(),
            statuses: [
                ...internalSub.statuses,
                {
                    status: 'expired',
                    timestamp: Timestamp.now(),
                    amount: internalSub.amount,
                    currency: internalSub.currency,
                    remark: `Upgrading Plan with Credits Carry Forward: ${remainingCredits} credits, New Subscription ID: ${newSubscriptionId}, Old Subscription ID: ${oldSubscriptionId}`,
                },
            ],
        });
        await safeSyncStorePlanEntitlementFromSubscription(
            { ...internalSub, status: 'expired' },
            'api:upgrade-subscription:old-expired',
        );
        await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_FLOW_SUCCESS', data: { internalSub }, });
        logger.info('Subscription upgraded successfully', {
            oldSubscriptionId: internalSub.id,
            newSubscriptionId,
            userId: session.user.id,
            remainingCredits
        });
        return NextResponse.json({ success: true, message: "Subscription upgraded successfully." });
    } catch (error) {
        logger.error('Subscription upgrade failed', error, {
            api: 'upgrade-subscription',
            userId: session?.user?.id
        });
        console.error('Subscription upgrade API error:', error);
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json({ error: 'Failed to upgrade subscription', details: (error as Error).message }, { status: 500 });
    }
});

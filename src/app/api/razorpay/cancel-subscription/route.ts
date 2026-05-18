export const dynamic = 'force-dynamic';
import { getActiveSubscriptionForStore, getSubscriptionById, updateSubscription } from "@database/subscriptions/server";
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
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
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

        if (!(await canManageBillingMutation(session, request, '/api/razorpay/cancel-subscription'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { reason, otherReason, consent, subscriptionId } = body;

        if (!reason || consent === undefined) {
            // Log to Sentry (CRITICAL - subscription cancellation)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/cancel-subscription',
                error: 'Missing required fields: reason or consent',
                attemptedData: {
                    hasReason: !!body?.reason,
                    hasConsent: body?.consent !== undefined,
                    subscriptionId: body?.subscriptionId,
                },
            }, 'critical'); // CRITICAL - subscription cancellation

            return NextResponse.json({ error: "Cancellation reason and consent are required." }, { status: 400 });
        }

        // 2. Find the user's active subscription in our database
        const internalSub = subscriptionId ? await getSubscriptionById(subscriptionId) : await getActiveSubscriptionForStore(Number(tenantId), Number(storeId));
        if (!internalSub || !internalSub.providerSubscriptionId) {
            return NextResponse.json({ error: "No active subscription found to cancel." }, { status: 404 });
        }

        // 🔒 CRITICAL: Verify subscription belongs to user's tenant/store
        if (internalSub.tenantId !== Number(tenantId) || internalSub.storeId !== Number(storeId)) {
            logger.security('Unauthorized Subscription Cancellation Attempt', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/cancel-subscription',
                error: 'User attempted to cancel subscription for different tenant/store',
                subscriptionTenantId: internalSub.tenantId,
                subscriptionStoreId: internalSub.storeId,
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }
        await writeLogEntry({ logFileName: LOG_FILE, logType: 'NEW_SUBSCRIPTION_FLOW', data: { data: "#########" }, });
        await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_internalSub', data: { internalSub }, });

        console.log(`[Cancel API] ${internalSub.paymentMethod?.type} subscription detected. Performing immediate cancellation for ${internalSub.id}.`);
        const providerSubscriptionBeforeCancel = await razorpayClient.subscriptions.fetch(internalSub.providerSubscriptionId);
        await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_PROVIDER_SUBSCRIPTION_BEFORE_CANCEL', data: { providerSubscriptionBeforeCancel }, });

        if (providerSubscriptionBeforeCancel.status === "completed") {
            await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_PROVIDER_SUBSCRIPTION_BEFORE_CANCEL_COMPLETED', data: { providerSubscriptionBeforeCancel }, });
        } else {
            await razorpayClient.subscriptions.cancel(internalSub.providerSubscriptionId); // Immediate cancel
            const providerSubscriptionAfterCancel = await razorpayClient.subscriptions.fetch(internalSub.providerSubscriptionId);
            providerSubscriptionBeforeCancel.status = providerSubscriptionAfterCancel.status;
            await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_PROVIDER_SUBSCRIPTION_AFTER_CANCEL', data: { providerSubscriptionAfterCancel }, });
        }

        const currentStatus = providerSubscriptionBeforeCancel.status;
        if (currentStatus === 'cancelled' || currentStatus === 'completed') {
            validateTransition(internalSub.status, 'cancelled', 'api:cancel-subscription');
            await updateSubscription(internalSub.id, {
                status: 'cancelled',
                cycleEndDate: internalSub.cycleEndDate,
                subscriptionEndDate: internalSub.cycleEndDate,
                statuses: [
                    ...internalSub.statuses,
                    {
                        status: "cancelled",
                        timestamp: Timestamp.now(),
                        amount: internalSub.amount,
                        currency: internalSub.currency,
                        remark: `Cancelled by user, reason: ${reason}, otherReason: ${otherReason}, consent: ${consent ? "Yes" : "No"}`,
                    },
                ],
            });
            await safeSyncStorePlanEntitlementFromSubscription(
                { ...internalSub, status: 'cancelled' },
                'api:cancel-subscription',
            );
            await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_SUCCESS', data: { internalSub }, });
            console.log(`Subscription ${internalSub.id} for user ${session.user.id} has been cancelled successfully.`);
            return NextResponse.json({ success: true, message: "Subscription cancelled successfully." });
        } else {
            console.error(`Failed to schedule cancellation for subscription ${internalSub.providerSubscriptionId} on Razorpay.`);
            await writeLogEntry({ logFileName: LOG_FILE, logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_FAILURE', data: { internalSub }, });
            return NextResponse.json({ success: false, error: "Failed to cancel subscription on payment gateway." }, { status: 500 });
        }
    } catch (error) {
        console.error('Subscription cancellation API error:', error);
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json({ error: 'Failed to cancel subscription', details: (error as Error).message }, { status: 500 });
    }
});

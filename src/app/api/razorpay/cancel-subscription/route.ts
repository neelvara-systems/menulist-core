export const dynamic = 'force-dynamic';
import { getDirectActiveSubscriptionForStore, getSubscriptionById, updateSubscription } from "@database/subscriptions/server";
import { canManageBillingMutation } from "@lib/billing/billingAccess";
import { safeSyncStorePlanEntitlementFromSubscription } from "@lib/billing/subscriptionEntitlementSync";
import { validateTransition } from "@lib/billing/subscriptionStateMachine";
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { CancelSubscriptionRequestSchema } from "@lib/validation/apiSchemas";
import { Timestamp } from "firebase/firestore";
import { writeLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-subscription.log";

const summarizeSubscriptionForCancelLog = (subscription: any) => ({
    subscriptionId: subscription?.id || subscription?.providerSubscriptionId,
    status: subscription?.status,
    tenantId: subscription?.tenantId,
    storeId: subscription?.storeId,
    planId: subscription?.planId,
    quantity: subscription?.quantity,
    providerSubscriptionId: subscription?.providerSubscriptionId,
});

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
        const validation = validateAPIInput(CancelSubscriptionRequestSchema, body);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            // Log to Sentry (CRITICAL - subscription cancellation)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/cancel-subscription',
                error: errorMsg,
                attemptedData: {
                    hasReason: !!body?.reason,
                    hasConsent: body?.consent !== undefined,
                    subscriptionId: body?.subscriptionId,
                },
            }, 'critical'); // CRITICAL - subscription cancellation

            return NextResponse.json({ error: "Cancellation reason and consent are required." }, { status: 400 });
        }

        const { reason, otherReason, consent, subscriptionId } = validation.data;

        // 2. Find the user's active subscription in our database
        const internalSub = subscriptionId ? await getSubscriptionById(subscriptionId) : await getDirectActiveSubscriptionForStore(Number(tenantId), Number(storeId));
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
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_INTERNAL',
            data: summarizeSubscriptionForCancelLog(internalSub),
        });

        if (!validateTransition(internalSub.status, 'cancelled', 'api:cancel-subscription')) {
            return NextResponse.json({ error: "Subscription cannot be cancelled in its current state." }, { status: 409 });
        }

        const providerSubscriptionBeforeCancel = await razorpayClient.subscriptions.fetch(internalSub.providerSubscriptionId);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_PROVIDER_BEFORE_CANCEL',
            data: summarizeSubscriptionForCancelLog(providerSubscriptionBeforeCancel),
        });

        if (providerSubscriptionBeforeCancel.status === "completed") {
            await writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_PROVIDER_ALREADY_COMPLETED',
                data: summarizeSubscriptionForCancelLog(providerSubscriptionBeforeCancel),
            });
        } else {
            await razorpayClient.subscriptions.cancel(internalSub.providerSubscriptionId); // Immediate cancel
            const providerSubscriptionAfterCancel = await razorpayClient.subscriptions.fetch(internalSub.providerSubscriptionId);
            providerSubscriptionBeforeCancel.status = providerSubscriptionAfterCancel.status;
            await writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_PROVIDER_AFTER_CANCEL',
                data: summarizeSubscriptionForCancelLog(providerSubscriptionAfterCancel),
            });
        }

        const currentStatus = providerSubscriptionBeforeCancel.status;
        if (currentStatus === 'cancelled' || currentStatus === 'completed') {
            const targetStatus = currentStatus === 'completed' ? 'completed' : 'cancelled';
            if (!validateTransition(internalSub.status, targetStatus, 'api:cancel-subscription:provider-status')) {
                return NextResponse.json({ error: "Subscription state changed while cancelling. Please refresh and try again." }, { status: 409 });
            }
            await updateSubscription(internalSub.id, {
                status: targetStatus,
                cycleEndDate: internalSub.cycleEndDate,
                subscriptionEndDate: internalSub.cycleEndDate,
                statuses: [
                    ...internalSub.statuses,
                    {
                        status: targetStatus,
                        timestamp: Timestamp.now(),
                        amount: internalSub.amount,
                        currency: internalSub.currency,
                        remark: targetStatus === 'completed'
                            ? "Subscription was already completed at payment gateway"
                            : `Cancelled by user, reason: ${reason}, otherReason: ${otherReason}, consent: ${consent ? "Yes" : "No"}`,
                    },
                ],
            });
            await safeSyncStorePlanEntitlementFromSubscription(
                { ...internalSub, status: targetStatus },
                'api:cancel-subscription',
            );
            await writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_SUCCESS',
                data: summarizeSubscriptionForCancelLog({ ...internalSub, status: targetStatus }),
            });
            return NextResponse.json({
                success: true,
                message: targetStatus === 'completed' ? "Subscription is already completed." : "Subscription cancelled successfully.",
            });
        } else {
            await writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_FAILURE',
                data: summarizeSubscriptionForCancelLog(internalSub),
            });
            return NextResponse.json({ success: false, error: "Failed to cancel subscription on payment gateway." }, { status: 500 });
        }
    } catch (error) {
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_ERROR',
            data: {
                message: error instanceof Error ? error.message : 'Unknown error',
            },
        });
        return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
    }
});

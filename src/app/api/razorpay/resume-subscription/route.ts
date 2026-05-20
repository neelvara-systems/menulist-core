export const dynamic = 'force-dynamic';
import { getDirectActiveSubscriptionForStore, getSubscriptionById, updateSubscription } from "@database/subscriptions/server";
import { canManageBillingMutation } from "@lib/billing/billingAccess";
import { safeSyncStorePlanEntitlementFromSubscription } from "@lib/billing/subscriptionEntitlementSync";
import { validateTransition } from "@lib/billing/subscriptionStateMachine";
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { ResumeSubscriptionRequestSchema } from "@lib/validation/apiSchemas";
import { Timestamp } from "firebase/firestore";
import { writeLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-subscription.log";

const summarizeSubscriptionForMutationLog = (subscription: any) => ({
    subscriptionId: subscription?.id || subscription?.providerSubscriptionId,
    providerSubscriptionId: subscription?.providerSubscriptionId,
    status: subscription?.status,
    tenantId: subscription?.tenantId,
    storeId: subscription?.storeId,
    planId: subscription?.planId,
    quantity: subscription?.quantity,
});

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

        if (!(await canManageBillingMutation(session, request, '/api/razorpay/resume-subscription'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        const body = await request.json();
        const validation = validateAPIInput(ResumeSubscriptionRequestSchema, body);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/resume-subscription',
                error: errorMsg,
                attemptedData: {
                    hasSubscriptionId: !!body?.subscriptionId,
                },
            }, 'critical');

            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        const { subscriptionId } = validation.data;

        // Find the user's paused subscription
        const internalSub = subscriptionId ? await getSubscriptionById(subscriptionId) : await getDirectActiveSubscriptionForStore(Number(tenantId), Number(storeId));
        if (!internalSub || !internalSub.providerSubscriptionId) {
            return NextResponse.json({ error: "No subscription found to resume." }, { status: 404 });
        }

        // 🔒 CRITICAL: Verify subscription belongs to user's tenant/store
        if (internalSub.tenantId !== Number(tenantId) || internalSub.storeId !== Number(storeId)) {
            logger.security('Unauthorized Subscription Resume Attempt', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/resume-subscription',
                error: 'User attempted to resume subscription for different tenant/store',
                subscriptionTenantId: internalSub.tenantId,
                subscriptionStoreId: internalSub.storeId,
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (internalSub.status !== 'paused') {
            return NextResponse.json({ error: "Only paused subscriptions can be resumed." }, { status: 400 });
        }

        if (!validateTransition(internalSub.status, 'active', 'api:resume-subscription')) {
            return NextResponse.json({ error: "Subscription cannot be resumed in its current state." }, { status: 409 });
        }

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_RESUME_SUBSCRIPTION_FLOW',
            data: summarizeSubscriptionForMutationLog(internalSub),
        });

        // Call Razorpay Resume API — resume_at: "now" is the only request param per Razorpay docs
        await razorpayClient.subscriptions.resume(internalSub.providerSubscriptionId, {
            resume_at: 'now'
        });

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_RESUME_SUBSCRIPTION_FLOW_SUCCESS',
            data: summarizeSubscriptionForMutationLog(internalSub),
        });

        // Update internal record
        await updateSubscription(internalSub.id, {
            status: 'active',
            statuses: [
                ...internalSub.statuses,
                {
                    status: "resumed",
                    timestamp: Timestamp.now(),
                    amount: internalSub.amount,
                    currency: internalSub.currency,
                    remark: "Resumed by user",
                },
            ],
        });
        await safeSyncStorePlanEntitlementFromSubscription(
            { ...internalSub, status: 'active' },
            'api:resume-subscription',
        );

        logger.info('Subscription resumed successfully', {
            subscriptionId: internalSub.id,
            userId: session.user.id,
        });

        return NextResponse.json({ success: true, message: "Subscription resumed successfully." });
    } catch (error) {
        logger.error('Subscription resume failed', error, {
            api: 'resume-subscription',
            userId
        });
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_RESUME_SUBSCRIPTION_ERROR',
            data: {
                message: error instanceof Error ? error.message : 'Unknown error',
            },
        });
        return NextResponse.json({ error: 'Failed to resume subscription' }, { status: 500 });
    }
});

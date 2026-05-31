export const dynamic = 'force-dynamic';
import { isFeatureEnabled } from "@config/features";
import { canManageBillingMutation } from "@lib/billing/billingAccess";
import {
    getDirectActiveProductSubscriptionForStore,
    getProductSubscriptionById,
    resolveBillingScopeFromSession,
    safeSyncProductSubscriptionEntitlementFromSubscription,
    updateProductSubscription,
} from "@lib/billing/productBillingServer";
import { isAnswerlatticeBillingProduct, normalizeBillingProductId } from "@lib/billing/productBillingPlans";
import { validateTransition } from "@lib/billing/subscriptionStateMachine";
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { PauseSubscriptionRequestSchema } from "@lib/validation/apiSchemas";
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
        if (!isFeatureEnabled('ENABLE_SUBSCRIPTION_PAUSE')) {
            return NextResponse.json({ error: "Subscription pause is not available." }, { status: 404 });
        }

        // 🔒 RATE LIMITING: Prevent rapid-fire subscription mutations
        const { checkRateLimit } = await import('@lib/rateLimit');
        const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
        const rl = await checkRateLimit({ key: `sub-mutate:${userId}`, ...getRateLimitForFeature('SUBSCRIPTION_MUTATION') });
        if (!rl.allowed) {
            return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
        }

        const body = await request.json();
        const validation = validateAPIInput(PauseSubscriptionRequestSchema, body);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/pause-subscription',
                error: errorMsg,
                attemptedData: {
                    productId: body?.productId,
                    hasSubscriptionId: !!body?.subscriptionId,
                    hasReason: !!body?.reason,
                },
            }, 'critical');

            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        const productId = normalizeBillingProductId(validation.data.productId);
        const scope = resolveBillingScopeFromSession(session, productId);
        if (!scope) {
            return NextResponse.json({ error: "Missing tenant/store data" }, { status: 400 });
        }
        const { tenantId, storeId } = scope;

        if (!isAnswerlatticeBillingProduct(productId) && !verifyTenantAccess(session, tenantId, storeId, request)) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (!isAnswerlatticeBillingProduct(productId) && !(await canManageBillingMutation(session, request, '/api/razorpay/pause-subscription'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        const { reason, subscriptionId } = validation.data;

        // Find the user's active subscription
        const internalSub = subscriptionId
            ? await getProductSubscriptionById(productId, subscriptionId)
            : await getDirectActiveProductSubscriptionForStore(productId, Number(tenantId), Number(storeId));
        if (!internalSub || !internalSub.providerSubscriptionId) {
            return NextResponse.json({ error: "No active subscription found to pause." }, { status: 404 });
        }

        // 🔒 CRITICAL: Verify subscription belongs to user's tenant/store
        if (internalSub.tenantId !== Number(tenantId) || internalSub.storeId !== Number(storeId)) {
            logger.security('Unauthorized Subscription Pause Attempt', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/pause-subscription',
                error: 'User attempted to pause subscription for different tenant/store',
                productId,
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

        if (!validateTransition(internalSub.status, 'paused', 'api:pause-subscription')) {
            return NextResponse.json({ error: "Subscription cannot be paused in its current state." }, { status: 409 });
        }

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_PAUSE_SUBSCRIPTION_FLOW',
            data: summarizeSubscriptionForMutationLog(internalSub),
        });

        // Call Razorpay Pause API — pause_at: "now" is the only request param per Razorpay docs
        await razorpayClient.subscriptions.pause(internalSub.providerSubscriptionId, {
            pause_at: 'now'
        });

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_PAUSE_SUBSCRIPTION_FLOW_SUCCESS',
            data: summarizeSubscriptionForMutationLog(internalSub),
        });

        // Update internal record
        await updateProductSubscription(productId, internalSub.id, {
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
        await safeSyncProductSubscriptionEntitlementFromSubscription(
            productId,
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
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_PAUSE_SUBSCRIPTION_ERROR',
            data: {
                message: error instanceof Error ? error.message : 'Unknown error',
            },
        });
        return NextResponse.json({ error: 'Failed to pause subscription' }, { status: 500 });
    }
});

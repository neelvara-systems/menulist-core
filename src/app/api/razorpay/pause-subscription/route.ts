export const dynamic = 'force-dynamic';
import { isFeatureEnabled } from "@config/features";
import { canManageAnswerlatticeBillingMutation, canManageBillingMutation } from "@lib/billing/billingAccess";
import {
    applyProductSubscriptionStatusTransition,
    getDirectActiveProductSubscriptionForStore,
    getProductSubscriptionById,
    resolveBillingScopeFromSession,
    safeSyncProductSubscriptionEntitlementFromSubscription,
} from "@lib/billing/productBillingServer";
import {
    getBoundedRazorpaySecurityContext,
    getBoundedRazorpayStringContext,
    getRazorpayFailureLogData,
    getRazorpaySubscriptionMutationLogContext,
    logRazorpayNonBlockingFailure,
} from "@lib/billing/razorpayDiagnostics";
import { isAnswerlatticeBillingProduct, normalizeBillingProductId } from "@lib/billing/productBillingPlans";
import { validateTransition } from "@lib/billing/subscriptionStateMachine";
import { getRazorpayManagedSubscriptionId } from "@lib/billing/subscriptionProviderSync";
import { normalizeBillingSubscriptionDocumentId } from "@lib/billing/subscriptionDocumentIdBoundary";
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { PauseSubscriptionRequestSchema } from "@lib/validation/apiSchemas";
import { Timestamp } from "firebase/firestore";
import { writeLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-subscription.log";
const RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES = 8 * 1024;

export const POST = withAuth(async (request, session) => {
    const userId = session.user.id;
    let subscriptionForLog: any = null;
    try {
        if (!isFeatureEnabled('ENABLE_SUBSCRIPTION_PAUSE')) {
            return NextResponse.json({ error: "Subscription pause is not available." }, { status: 404 });
        }

        // 🔒 RATE LIMITING: Prevent rapid-fire subscription mutations
        const userRateLimitHash = hashPublicRateLimitValue(userId);
        const { checkRateLimit } = await import('@lib/rateLimit');
        const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
        const rl = await checkRateLimit({ key: `sub-mutate:${userRateLimitHash}`, ...getRateLimitForFeature('SUBSCRIPTION_MUTATION') });
        if (!rl.allowed) {
            return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
        }

        const bodyResult = await readBoundedJsonBody(request, RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Invalid input',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data as any;
        const validation = validateAPIInput(PauseSubscriptionRequestSchema, body);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            logger.security('Input Validation Failed', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/pause-subscription',
                error: errorMsg,
                attemptedData: {
                    ...getBoundedRazorpayStringContext('productId', body?.productId),
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

        if (isAnswerlatticeBillingProduct(productId) && !(await canManageAnswerlatticeBillingMutation(session, request))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

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
        const internalSubscriptionId = normalizeBillingSubscriptionDocumentId(internalSub.id);
        if (!internalSubscriptionId) {
            return NextResponse.json({ error: "Subscription requires billing reconciliation." }, { status: 409 });
        }
        subscriptionForLog = internalSub;

        // 🔒 CRITICAL: Verify subscription belongs to user's tenant/store
        if (Number(internalSub.tenantId) !== Number(tenantId) || Number(internalSub.storeId) !== Number(storeId)) {
            logger.security('Unauthorized Subscription Pause Attempt', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/pause-subscription',
                error: 'User attempted to pause subscription for different tenant/store',
                ...getBoundedRazorpayStringContext('productId', productId),
                ...getRazorpaySubscriptionMutationLogContext(internalSub),
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

        const providerSubscriptionId = getRazorpayManagedSubscriptionId(internalSub);
        if (!providerSubscriptionId) {
            return NextResponse.json(
                { error: "Prepaid subscriptions are managed by your reseller or support." },
                { status: 409 },
            );
        }

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_PAUSE_SUBSCRIPTION_FLOW',
            data: getRazorpaySubscriptionMutationLogContext(internalSub),
        });

        // Call Razorpay Pause API — pause_at: "now" is the only request param per Razorpay docs
        await razorpayClient.subscriptions.pause(providerSubscriptionId, {
            pause_at: 'now'
        });

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_PAUSE_SUBSCRIPTION_FLOW_SUCCESS',
            data: getRazorpaySubscriptionMutationLogContext(internalSub),
        });

        const statusApplication = await applyProductSubscriptionStatusTransition(productId, {
            expectedStatuses: ['active'],
            nextStatus: 'paused',
            statusEntry: {
                status: "paused",
                timestamp: Timestamp.now(),
                amount: internalSub.amount,
                currency: internalSub.currency,
                remark: `Paused by user${reason ? `, reason: ${reason}` : ''}`,
            },
            subscriptionId: internalSubscriptionId,
        });
        if (!statusApplication || (!statusApplication.applied && !statusApplication.duplicate)) {
            return NextResponse.json({ error: "Subscription state changed while pausing. Please refresh and try again." }, { status: 409 });
        }
        await safeSyncProductSubscriptionEntitlementFromSubscription(
            productId,
            statusApplication.subscription,
            'api:pause-subscription',
        );

        if (!isAnswerlatticeBillingProduct(productId) && statusApplication.applied) {
            try {
                const { sendLifecycleMessage } = await import('@lib/messaging');
                sendLifecycleMessage({
                    storeId: String(internalSub.storeId),
                    tenantId: String(internalSub.tenantId),
                    eventType: 'SUBSCRIPTION_PAUSED',
                    referenceId: `subscription-paused-${internalSub.id}`,
                    recipientEmail: internalSub.email || session.user.email || '',
                    storeName: internalSub.name || '',
                    metadata: {
                        amount: internalSub.amount,
                        currency: internalSub.currency || 'INR',
                        planName: internalSub.planName || 'Subscription',
                        sentAt: new Date().toISOString(),
                    },
                }).catch((notificationError) => {
                    logRazorpayNonBlockingFailure('razorpay_pause_subscription_lifecycle_message_failed', notificationError, {
                        eventType: 'SUBSCRIPTION_PAUSED',
                        ...getBoundedRazorpayStringContext('subscriptionId', internalSub.id),
                        ...getBoundedRazorpayStringContext('providerSubscriptionId', internalSub.providerSubscriptionId),
                        ...getBoundedRazorpayStringContext('tenantId', internalSub.tenantId),
                        ...getBoundedRazorpayStringContext('storeId', internalSub.storeId),
                        ...getBoundedRazorpayStringContext('userId', userId),
                    });
                });
            } catch (notificationImportError) {
                logRazorpayNonBlockingFailure('razorpay_pause_subscription_lifecycle_message_import_failed', notificationImportError, {
                    eventType: 'SUBSCRIPTION_PAUSED',
                    ...getBoundedRazorpayStringContext('subscriptionId', internalSub.id),
                    ...getBoundedRazorpayStringContext('providerSubscriptionId', internalSub.providerSubscriptionId),
                    ...getBoundedRazorpayStringContext('tenantId', internalSub.tenantId),
                    ...getBoundedRazorpayStringContext('storeId', internalSub.storeId),
                    ...getBoundedRazorpayStringContext('userId', userId),
                });
            }
        }

        logger.info('Subscription paused successfully', getRazorpaySubscriptionMutationLogContext(internalSub));

        return NextResponse.json({ success: true, message: "Subscription paused successfully." });
    } catch (error) {
        const failureData = getRazorpayFailureLogData('razorpay_pause_subscription_failed', error, {
            ...getRazorpaySubscriptionMutationLogContext(subscriptionForLog),
            ...getBoundedRazorpayStringContext('userId', userId),
        });
        logger.error('Subscription pause failed', new Error('razorpay_pause_subscription_failed'), failureData);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_PAUSE_SUBSCRIPTION_ERROR',
            data: failureData,
        });
        return NextResponse.json({ error: 'Failed to pause subscription' }, { status: 500 });
    }
});

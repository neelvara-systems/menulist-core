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
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { ResumeSubscriptionRequestSchema } from "@lib/validation/apiSchemas";
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
            return NextResponse.json({ error: "Subscription resume is not available." }, { status: 404 });
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
        const validation = validateAPIInput(ResumeSubscriptionRequestSchema, body);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            logger.security('Input Validation Failed', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/resume-subscription',
                error: errorMsg,
                attemptedData: {
                    ...getBoundedRazorpayStringContext('productId', body?.productId),
                    hasSubscriptionId: !!body?.subscriptionId,
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

        if (!isAnswerlatticeBillingProduct(productId) && !(await canManageBillingMutation(session, request, '/api/razorpay/resume-subscription'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        const { subscriptionId } = validation.data;

        // Find the user's paused subscription
        const internalSub = subscriptionId
            ? await getProductSubscriptionById(productId, subscriptionId)
            : await getDirectActiveProductSubscriptionForStore(productId, Number(tenantId), Number(storeId));
        if (!internalSub || !internalSub.providerSubscriptionId) {
            return NextResponse.json({ error: "No subscription found to resume." }, { status: 404 });
        }
        subscriptionForLog = internalSub;

        // 🔒 CRITICAL: Verify subscription belongs to user's tenant/store
        if (Number(internalSub.tenantId) !== Number(tenantId) || Number(internalSub.storeId) !== Number(storeId)) {
            logger.security('Unauthorized Subscription Resume Attempt', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/resume-subscription',
                error: 'User attempted to resume subscription for different tenant/store',
                ...getBoundedRazorpayStringContext('productId', productId),
                ...getRazorpaySubscriptionMutationLogContext(internalSub),
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

        const providerSubscriptionId = getRazorpayManagedSubscriptionId(internalSub);
        if (!providerSubscriptionId) {
            return NextResponse.json(
                { error: "Prepaid subscriptions are managed by your reseller or support." },
                { status: 409 },
            );
        }

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_RESUME_SUBSCRIPTION_FLOW',
            data: getRazorpaySubscriptionMutationLogContext(internalSub),
        });

        // Call Razorpay Resume API — resume_at: "now" is the only request param per Razorpay docs
        await razorpayClient.subscriptions.resume(providerSubscriptionId, {
            resume_at: 'now'
        });

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_RESUME_SUBSCRIPTION_FLOW_SUCCESS',
            data: getRazorpaySubscriptionMutationLogContext(internalSub),
        });

        const statusApplication = await applyProductSubscriptionStatusTransition(productId, {
            expectedStatuses: ['paused'],
            nextStatus: 'active',
            statusEntry: {
                status: "resumed",
                timestamp: Timestamp.now(),
                amount: internalSub.amount,
                currency: internalSub.currency,
                remark: "Resumed by user",
            },
            subscriptionId: internalSub.id,
        });
        if (!statusApplication || (!statusApplication.applied && !statusApplication.duplicate)) {
            return NextResponse.json({ error: "Subscription state changed while resuming. Please refresh and try again." }, { status: 409 });
        }
        await safeSyncProductSubscriptionEntitlementFromSubscription(
            productId,
            statusApplication.subscription,
            'api:resume-subscription',
        );

        if (!isAnswerlatticeBillingProduct(productId) && statusApplication.applied) {
            try {
                const { sendLifecycleMessage } = await import('@lib/messaging');
                sendLifecycleMessage({
                    storeId: String(internalSub.storeId),
                    tenantId: String(internalSub.tenantId),
                    eventType: 'SUBSCRIPTION_RESUMED',
                    referenceId: `subscription-resumed-${internalSub.id}`,
                    recipientEmail: internalSub.email || session.user.email || '',
                    storeName: internalSub.name || '',
                    metadata: {
                        amount: internalSub.amount,
                        currency: internalSub.currency || 'INR',
                        planName: internalSub.planName || 'Subscription',
                        sentAt: new Date().toISOString(),
                    },
                }).catch((notificationError) => {
                    logRazorpayNonBlockingFailure('razorpay_resume_subscription_lifecycle_message_failed', notificationError, {
                        eventType: 'SUBSCRIPTION_RESUMED',
                        ...getBoundedRazorpayStringContext('subscriptionId', internalSub.id),
                        ...getBoundedRazorpayStringContext('providerSubscriptionId', internalSub.providerSubscriptionId),
                        ...getBoundedRazorpayStringContext('tenantId', internalSub.tenantId),
                        ...getBoundedRazorpayStringContext('storeId', internalSub.storeId),
                        ...getBoundedRazorpayStringContext('userId', userId),
                    });
                });
            } catch (notificationImportError) {
                logRazorpayNonBlockingFailure('razorpay_resume_subscription_lifecycle_message_import_failed', notificationImportError, {
                    eventType: 'SUBSCRIPTION_RESUMED',
                    ...getBoundedRazorpayStringContext('subscriptionId', internalSub.id),
                    ...getBoundedRazorpayStringContext('providerSubscriptionId', internalSub.providerSubscriptionId),
                    ...getBoundedRazorpayStringContext('tenantId', internalSub.tenantId),
                    ...getBoundedRazorpayStringContext('storeId', internalSub.storeId),
                    ...getBoundedRazorpayStringContext('userId', userId),
                });
            }
        }

        logger.info('Subscription resumed successfully', getRazorpaySubscriptionMutationLogContext(internalSub));

        return NextResponse.json({ success: true, message: "Subscription resumed successfully." });
    } catch (error) {
        const failureData = getRazorpayFailureLogData('razorpay_resume_subscription_failed', error, {
            ...getRazorpaySubscriptionMutationLogContext(subscriptionForLog),
            ...getBoundedRazorpayStringContext('userId', userId),
        });
        logger.error('Subscription resume failed', new Error('razorpay_resume_subscription_failed'), failureData);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_RESUME_SUBSCRIPTION_ERROR',
            data: failureData,
        });
        return NextResponse.json({ error: 'Failed to resume subscription' }, { status: 500 });
    }
});

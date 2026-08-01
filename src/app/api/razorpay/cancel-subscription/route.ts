export const dynamic = 'force-dynamic';
import { canManageAnswerlatticeBillingMutation, canManageBillingMutation } from "@lib/billing/billingAccess";
import {
    CANCELLATION_REASON,
    normalizeCancellationReasonCode,
    sanitizeCancellationReasonDetail,
} from "@lib/billing/cancellationReasons";
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
import { recordFounderSubscriptionChurn } from "@lib/ops/founderRevenueReadModel";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { CancelSubscriptionRequestSchema } from "@lib/validation/apiSchemas";
import { Timestamp } from "firebase/firestore";
import { writeLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-subscription.log";
const RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES = 8 * 1024;

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;
    let subscriptionForLog: any = null;
    try {
        // 🔒 RATE LIMITING: Prevent rapid-fire subscription mutations
        const userRateLimitHash = hashPublicRateLimitValue(userId);
        const { checkRateLimit } = await import('@lib/rateLimit');
        const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
        const rl = await checkRateLimit({ key: `sub-mutate:${userRateLimitHash}`, ...getRateLimitForFeature('SUBSCRIPTION_MUTATION') });
        if (!rl.allowed) {
            return NextResponse.json({ error: "Too many attempts. Please wait before trying again." }, { status: 429 });
        }

        const bodyResult = await readBoundedJsonBody(request, RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Cancellation reason and consent are required.',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data as any;
        const validation = validateAPIInput(CancelSubscriptionRequestSchema, body);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            // Log to Sentry (CRITICAL - subscription cancellation)
            logger.security('Input Validation Failed', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/cancel-subscription',
                error: errorMsg,
                attemptedData: {
                    ...getBoundedRazorpayStringContext('productId', body?.productId),
                    hasReason: !!body?.reason,
                    hasConsent: body?.consent !== undefined,
                    ...getBoundedRazorpayStringContext('subscriptionId', body?.subscriptionId),
                },
            }, 'critical'); // CRITICAL - subscription cancellation

            return NextResponse.json({ error: "Cancellation reason and consent are required." }, { status: 400 });
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

        if (!isAnswerlatticeBillingProduct(productId) && !(await canManageBillingMutation(session, request, '/api/razorpay/cancel-subscription'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        const { reason, otherReason, consent, subscriptionId } = validation.data;
        const isLegacyMobileCancellation = reason === 'mobile_cancellation';
        const cancellationReasonCode = normalizeCancellationReasonCode(reason);
        const cancellationReasonDetail = cancellationReasonCode === CANCELLATION_REASON.OTHER
            ? sanitizeCancellationReasonDetail(otherReason)
            : undefined;
        if (
            !cancellationReasonCode
            || (
                cancellationReasonCode === CANCELLATION_REASON.OTHER
                && !cancellationReasonDetail
                && !isLegacyMobileCancellation
            )
        ) {
            return NextResponse.json({ error: "Choose a valid cancellation reason." }, { status: 400 });
        }

        // 2. Find the user's active subscription in our database
        const internalSub = subscriptionId
            ? await getProductSubscriptionById(productId, subscriptionId)
            : await getDirectActiveProductSubscriptionForStore(productId, Number(tenantId), Number(storeId));
        if (!internalSub || !internalSub.providerSubscriptionId) {
            return NextResponse.json({ error: "No active subscription found to cancel." }, { status: 404 });
        }
        const internalSubscriptionId = normalizeBillingSubscriptionDocumentId(internalSub.id);
        if (!internalSubscriptionId) {
            return NextResponse.json({ error: "Subscription requires billing reconciliation." }, { status: 409 });
        }
        subscriptionForLog = internalSub;

        // 🔒 CRITICAL: Verify subscription belongs to user's tenant/store
        if (Number(internalSub.tenantId) !== Number(tenantId) || Number(internalSub.storeId) !== Number(storeId)) {
            logger.security('Unauthorized Subscription Cancellation Attempt', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/cancel-subscription',
                error: 'User attempted to cancel subscription for different tenant/store',
                ...getBoundedRazorpayStringContext('productId', productId),
                ...getBoundedRazorpayStringContext('subscriptionTenantId', internalSub.tenantId),
                ...getBoundedRazorpayStringContext('subscriptionStoreId', internalSub.storeId),
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_INTERNAL',
            data: getRazorpaySubscriptionMutationLogContext(internalSub),
        });

        if (!validateTransition(internalSub.status, 'cancelled', 'api:cancel-subscription')) {
            return NextResponse.json({ error: "Subscription cannot be cancelled in its current state." }, { status: 409 });
        }

        const providerSubscriptionId = getRazorpayManagedSubscriptionId(internalSub);
        if (!providerSubscriptionId) {
            return NextResponse.json(
                { error: "Prepaid subscriptions are managed by your reseller or support." },
                { status: 409 },
            );
        }

        const providerSubscriptionBeforeCancel = await razorpayClient.subscriptions.fetch(providerSubscriptionId);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_PROVIDER_BEFORE_CANCEL',
            data: getRazorpaySubscriptionMutationLogContext(providerSubscriptionBeforeCancel),
        });

        if (['cancelled', 'completed', 'expired'].includes(String(providerSubscriptionBeforeCancel.status))) {
            await writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_PROVIDER_ALREADY_COMPLETED',
                data: getRazorpaySubscriptionMutationLogContext(providerSubscriptionBeforeCancel),
            });
        } else {
            await razorpayClient.subscriptions.cancel(providerSubscriptionId); // Immediate cancel
            const providerSubscriptionAfterCancel = await razorpayClient.subscriptions.fetch(providerSubscriptionId);
            providerSubscriptionBeforeCancel.status = providerSubscriptionAfterCancel.status;
            await writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_PROVIDER_AFTER_CANCEL',
                data: getRazorpaySubscriptionMutationLogContext(providerSubscriptionAfterCancel),
            });
        }

        const currentStatus = providerSubscriptionBeforeCancel.status;
        if (currentStatus === 'cancelled' || currentStatus === 'completed' || currentStatus === 'expired') {
            const targetStatus = currentStatus === 'completed'
                ? 'completed'
                : currentStatus === 'expired'
                    ? 'expired'
                    : 'cancelled';
            if (!validateTransition(internalSub.status, targetStatus, 'api:cancel-subscription:provider-status')) {
                return NextResponse.json({ error: "Subscription state changed while cancelling. Please refresh and try again." }, { status: 409 });
            }
            const statusApplication = await applyProductSubscriptionStatusTransition(productId, {
                nextStatus: targetStatus,
                statusEntry: {
                    status: targetStatus,
                    timestamp: Timestamp.now(),
                    amount: internalSub.amount,
                    currency: internalSub.currency,
                    remark: targetStatus === 'completed'
                        ? "Subscription was already completed at payment gateway"
                        : targetStatus === 'expired'
                            ? 'Subscription was already expired at payment gateway'
                            : `Cancelled by owner, reason code: ${cancellationReasonCode}, consent: ${consent ? "Yes" : "No"}`,
                },
                subscriptionId: internalSubscriptionId,
                update: {
                    cancellation: {
                        reasonCode: cancellationReasonCode,
                        ...(cancellationReasonDetail ? { detail: cancellationReasonDetail } : {}),
                        requestedAt: Timestamp.now(),
                        source: 'owner',
                    },
                    cycleEndDate: internalSub.cycleEndDate,
                    subscriptionEndDate: internalSub.cycleEndDate,
                },
            });
            if (!statusApplication || (!statusApplication.applied && !statusApplication.duplicate)) {
                return NextResponse.json({ error: "Subscription state changed while cancelling. Please refresh and try again." }, { status: 409 });
            }
            const transitionedSubscription = statusApplication.subscription;
            await safeSyncProductSubscriptionEntitlementFromSubscription(
                productId,
                transitionedSubscription,
                'api:cancel-subscription',
            );
            await recordFounderSubscriptionChurn({
                cancellationReasonCode,
                productId,
                requireDurableWrite: true,
                source: 'api:cancel-subscription',
                subscription: transitionedSubscription,
                occurredAt: Date.now(),
            });
            await writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_SUCCESS',
                data: getRazorpaySubscriptionMutationLogContext(transitionedSubscription),
            });

            if (!isAnswerlatticeBillingProduct(productId) && targetStatus === 'cancelled' && statusApplication.applied) {
                try {
                    const { sendLifecycleMessage } = await import('@lib/messaging');
                    sendLifecycleMessage({
                        storeId: String(internalSub.storeId),
                        tenantId: String(internalSub.tenantId),
                        eventType: 'SUBSCRIPTION_CANCELLED',
                        referenceId: `subscription-cancelled-${internalSub.id}`,
                        recipientEmail: internalSub.email || session.user.email || '',
                        storeName: internalSub.name || '',
                        metadata: {
                            amount: internalSub.amount,
                            currency: internalSub.currency || 'INR',
                            planName: internalSub.planName || 'Subscription',
                            sentAt: new Date().toISOString(),
                        },
                    }).catch((notificationError) => {
                        logRazorpayNonBlockingFailure('razorpay_cancel_subscription_lifecycle_message_failed', notificationError, {
                            eventType: 'SUBSCRIPTION_CANCELLED',
                            ...getBoundedRazorpayStringContext('subscriptionId', internalSub.id),
                            ...getBoundedRazorpayStringContext('providerSubscriptionId', internalSub.providerSubscriptionId),
                            ...getBoundedRazorpayStringContext('tenantId', internalSub.tenantId),
                            ...getBoundedRazorpayStringContext('storeId', internalSub.storeId),
                            ...getBoundedRazorpayStringContext('userId', userId),
                        });
                    });
                } catch (notificationImportError) {
                    logRazorpayNonBlockingFailure('razorpay_cancel_subscription_lifecycle_message_import_failed', notificationImportError, {
                        eventType: 'SUBSCRIPTION_CANCELLED',
                        ...getBoundedRazorpayStringContext('subscriptionId', internalSub.id),
                        ...getBoundedRazorpayStringContext('providerSubscriptionId', internalSub.providerSubscriptionId),
                        ...getBoundedRazorpayStringContext('tenantId', internalSub.tenantId),
                        ...getBoundedRazorpayStringContext('storeId', internalSub.storeId),
                        ...getBoundedRazorpayStringContext('userId', userId),
                    });
                }
            }

            return NextResponse.json({
                success: true,
                message: targetStatus === 'completed' ? "Subscription is already completed." : "Subscription cancelled successfully.",
            });
        } else {
            await writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_FAILURE',
                data: getRazorpaySubscriptionMutationLogContext(internalSub),
            });
            return NextResponse.json({ success: false, error: "Failed to cancel subscription on payment gateway." }, { status: 500 });
        }
    } catch (error) {
        const failureData = getRazorpayFailureLogData('razorpay_cancel_subscription_failed', error, {
            ...getRazorpaySubscriptionMutationLogContext(subscriptionForLog),
            ...getBoundedRazorpayStringContext('userId', userId),
        });
        logger.error('Subscription cancellation failed', new Error('razorpay_cancel_subscription_failed'), failureData);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_CANCEL_SUBSCRIPTION_FLOW_ERROR',
            data: failureData,
        });
        return NextResponse.json({ error: 'Failed to cancel subscription' }, { status: 500 });
    }
});

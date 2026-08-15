export const dynamic = 'force-dynamic';
import { canManageAnswerlatticeBillingMutation, canManageBillingMutation } from '@lib/billing/billingAccess';
import {
    applyProductSubscriptionUpgradeCarryForward,
    getProductSubscriptionById,
    resolveBillingScopeFromSession,
    safeSyncProductSubscriptionEntitlementFromSubscription,
} from '@lib/billing/productBillingServer';
import {
    getBoundedRazorpaySecurityContext,
    getBoundedRazorpayStringContext,
    getRazorpayFailureLogData,
    getRazorpaySubscriptionMutationLogContext,
    logRazorpayNonBlockingFailure,
} from '@lib/billing/razorpayDiagnostics';
import { isAnswerlatticeBillingProduct, normalizeBillingProductId } from '@lib/billing/productBillingPlans';
import { validateTransition } from '@lib/billing/subscriptionStateMachine';
import { getRazorpayManagedSubscriptionId } from '@lib/billing/subscriptionProviderSync';
import { resolveSubscriptionReplacementEvidence } from '@lib/billing/subscriptionReplacementEvidence';
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { UpgradeSubscriptionRequestSchema } from "@lib/validation/apiSchemas";
import { writeLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from "src/middleware/publicApi";
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const LOG_FILE = "razorpay-subscription.log";
const RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES = 8 * 1024;

export const POST = withAuth(async (request, session) => {
    // Session guaranteed by withAuth middleware
    // Auth failures automatically logged to Sentry
    const userId = session.user.id;
    let subscriptionForLog: any = null;

    try {
        // 🔒 RATE LIMITING: Prevent rapid-fire subscription mutations
        const userRateLimitHash = hashPublicRateLimitValue(userId);
        const { checkRateLimit } = await import('@lib/rateLimit');
        const { getRateLimitForFeature } = await import('@lib/rateLimit/configs');
        const rl = await checkRateLimit({ failClosedOnProviderError: true, key: `sub-mutate:${userRateLimitHash}`, ...getRateLimitForFeature('SUBSCRIPTION_MUTATION') });
        if (!rl.allowed) {
            const providerUnavailable = rl.reason === 'provider_unavailable';
            return NextResponse.json({
                error: providerUnavailable
                    ? 'Billing changes are temporarily unavailable. Please try again.'
                    : 'Too many attempts. Please wait before trying again.',
            }, { status: providerUnavailable ? 503 : 429 });
        }

        const bodyResult = await readBoundedJsonBody(request, RAZORPAY_PAYMENT_ACTION_MAX_BODY_BYTES, {
            invalidJsonMessage: 'Subscription ID is required.',
        });
        if (bodyResult.ok === false) return bodyResult.response;
        const body = bodyResult.data as any;
        const validation = validateAPIInput(UpgradeSubscriptionRequestSchema, body);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            // Log to Sentry (CRITICAL - subscription upgrade)
            logger.security('Input Validation Failed', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/upgrade-subscription',
                error: errorMsg,
                attemptedData: {
                    ...getBoundedRazorpayStringContext('productId', body?.productId),
                    hasNewSubscriptionId: !!body?.nSi,
                    hasOldSubscriptionId: !!body?.oSi,
                    remainingCredits: Number.isFinite(Number(body?.rc)) ? Number(body.rc) : undefined,
                },
            }, 'critical'); // CRITICAL - subscription upgrade

            return NextResponse.json({ error: "Subscription ID is required." }, { status: 400 });
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

        if (!isAnswerlatticeBillingProduct(productId) && !(await canManageBillingMutation(session, request, '/api/razorpay/upgrade-subscription'))) {
            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        const { nSi, oSi } = validation.data;
        const newSubscriptionId = nSi;
        const oldSubscriptionId = oSi;

        if (newSubscriptionId === oldSubscriptionId) {
            return NextResponse.json({ error: "New and old subscriptions must be different." }, { status: 400 });
        }

        const internalSub = await getProductSubscriptionById(productId, oldSubscriptionId);
        if (!internalSub || !internalSub.providerSubscriptionId) {
            return NextResponse.json({ error: "No active subscription found to upgrade." }, { status: 404 });
        }
        subscriptionForLog = internalSub;

        const newInternalSub = await getProductSubscriptionById(productId, newSubscriptionId);
        if (!newInternalSub || !newInternalSub.providerSubscriptionId) {
            return NextResponse.json({ error: "New subscription was not found." }, { status: 404 });
        }
        const oldProviderSubscriptionId = getRazorpayManagedSubscriptionId(internalSub);
        const newProviderSubscriptionId = getRazorpayManagedSubscriptionId(newInternalSub);
        if (!oldProviderSubscriptionId || !newProviderSubscriptionId) {
            return NextResponse.json(
                { error: 'Prepaid subscriptions are managed by your reseller or support.' },
                { status: 409 },
            );
        }
        const replacementEvidence = resolveSubscriptionReplacementEvidence(newInternalSub);
        if (
            replacementEvidence.outcome !== 'replacement'
            || replacementEvidence.subscriptionId !== oldSubscriptionId
        ) {
            return NextResponse.json(
                { error: 'The replacement subscription does not match the current subscription.' },
                { status: 409 },
            );
        }

        // 🔒 CRITICAL: Verify old subscription belongs to user's tenant/store
        if (Number(tenantId) != Number(internalSub.tenantId) || Number(storeId) != Number(internalSub.storeId)) {
            logger.security('Unauthorized Subscription Upgrade Attempt', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/upgrade-subscription',
                error: 'User attempted to upgrade subscription for different tenant/store',
                ...getBoundedRazorpayStringContext('productId', productId),
                ...getRazorpaySubscriptionMutationLogContext(internalSub),
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (Number(tenantId) != Number(newInternalSub.tenantId) || Number(storeId) != Number(newInternalSub.storeId)) {
            logger.security('Unauthorized New Subscription Upgrade Attempt', {
                ...getBoundedRazorpaySecurityContext(session, request),
                endpoint: '/api/razorpay/upgrade-subscription',
                error: 'User attempted to carry credits to a subscription for different tenant/store',
                ...getBoundedRazorpayStringContext('productId', productId),
                ...getRazorpaySubscriptionMutationLogContext(newInternalSub),
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (
            internalSub.status === 'expired'
            && newInternalSub.carryForwardFromSubscriptionId === oldSubscriptionId
        ) {
            const duplicateApplication = await applyProductSubscriptionUpgradeCarryForward(productId, {
                newSubscriptionId,
                oldSubscriptionId,
                storeId: Number(storeId),
                tenantId: Number(tenantId),
            });
            if (!duplicateApplication?.duplicate) {
                return NextResponse.json({ error: "Subscription state changed while upgrading. Please refresh and try again." }, { status: 409 });
            }
            await safeSyncProductSubscriptionEntitlementFromSubscription(
                productId,
                duplicateApplication.newSubscription,
                'api:upgrade-subscription:idempotent',
            );
            return NextResponse.json({ success: true, message: "Subscription upgraded successfully." });
        }

        if (newInternalSub.status !== 'active') {
            return NextResponse.json(
                { error: 'The replacement subscription is not active.' },
                { status: 409 },
            );
        }

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_FLOW_INTERNAL_SUB',
            data: getRazorpaySubscriptionMutationLogContext(internalSub),
        });

        if (!validateTransition(internalSub.status, 'expired', 'api:upgrade-subscription')) {
            return NextResponse.json({ error: "Subscription cannot be upgraded in its current state." }, { status: 409 });
        }

        const providerSubscriptionBeforeCancel = await razorpayClient.subscriptions.fetch(oldProviderSubscriptionId);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_FLOW_PROVIDER_SUBSCRIPTION_BEFORE_CANCEL',
            data: getRazorpaySubscriptionMutationLogContext(providerSubscriptionBeforeCancel),
        });

        if (['cancelled', 'completed', 'expired'].includes(String(providerSubscriptionBeforeCancel.status))) {
            await writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_FLOW_PROVIDER_SUBSCRIPTION_BEFORE_CANCEL_COMPLETED',
                data: getRazorpaySubscriptionMutationLogContext(providerSubscriptionBeforeCancel),
            });
        } else {
            await razorpayClient.subscriptions.cancel(oldProviderSubscriptionId); // Immediate cancel
            const providerSubscriptionAfterCancel = await razorpayClient.subscriptions.fetch(oldProviderSubscriptionId);
            await writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_FLOW_PROVIDER_SUBSCRIPTION_AFTER_CANCEL',
                data: getRazorpaySubscriptionMutationLogContext(providerSubscriptionAfterCancel),
            });
        }

        const upgradeApplication = await applyProductSubscriptionUpgradeCarryForward(productId, {
            newSubscriptionId,
            oldSubscriptionId,
            storeId: Number(storeId),
            tenantId: Number(tenantId),
        });
        if (!upgradeApplication || (!upgradeApplication.applied && !upgradeApplication.duplicate)) {
            return NextResponse.json({ error: "Subscription state changed while upgrading. Please refresh and try again." }, { status: 409 });
        }
        await safeSyncProductSubscriptionEntitlementFromSubscription(
            productId,
            upgradeApplication.oldSubscription,
            'api:upgrade-subscription:old-expired',
        );
        await safeSyncProductSubscriptionEntitlementFromSubscription(
            productId,
            upgradeApplication.newSubscription,
            'api:upgrade-subscription:new-active',
        );
        const remainingCredits = upgradeApplication.remainingCredits;
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_FLOW_SUCCESS',
            data: getRazorpaySubscriptionMutationLogContext(internalSub),
        });
        logger.info('Subscription upgraded successfully', {
            ...getRazorpaySubscriptionMutationLogContext(internalSub),
            ...getBoundedRazorpayStringContext('newSubscriptionId', newSubscriptionId),
            remainingCredits,
        });

        {
            try {
                const { sendLifecycleMessage } = await import('@lib/messaging');
                await sendLifecycleMessage({
                    productId,
                    storeId: String(internalSub.storeId),
                    tenantId: String(internalSub.tenantId),
                    eventType: 'SUBSCRIPTION_UPGRADED',
                    referenceId: `subscription-upgraded-${oldSubscriptionId}-${newSubscriptionId}`,
                    recipientEmail: internalSub.email || session.user.email || '',
                    storeName: internalSub.name || '',
                    metadata: {
                        amount: internalSub.amount,
                        currency: internalSub.currency || 'INR',
                        planName: internalSub.planName || 'Subscription',
                        newSubscriptionId,
                        remainingCredits,
                        sentAt: new Date().toISOString(),
                    },
                }).catch((notificationError) => {
                    logRazorpayNonBlockingFailure('razorpay_upgrade_subscription_lifecycle_message_failed', notificationError, {
                        eventType: 'SUBSCRIPTION_UPGRADED',
                        ...getBoundedRazorpayStringContext('subscriptionId', oldSubscriptionId),
                        ...getBoundedRazorpayStringContext('newSubscriptionId', newSubscriptionId),
                        ...getBoundedRazorpayStringContext('providerSubscriptionId', internalSub.providerSubscriptionId),
                        ...getBoundedRazorpayStringContext('tenantId', internalSub.tenantId),
                        ...getBoundedRazorpayStringContext('storeId', internalSub.storeId),
                        ...getBoundedRazorpayStringContext('userId', userId),
                    });
                });
            } catch (notificationImportError) {
                logRazorpayNonBlockingFailure('razorpay_upgrade_subscription_lifecycle_message_import_failed', notificationImportError, {
                    eventType: 'SUBSCRIPTION_UPGRADED',
                    ...getBoundedRazorpayStringContext('subscriptionId', oldSubscriptionId),
                    ...getBoundedRazorpayStringContext('newSubscriptionId', newSubscriptionId),
                    ...getBoundedRazorpayStringContext('providerSubscriptionId', internalSub.providerSubscriptionId),
                    ...getBoundedRazorpayStringContext('tenantId', internalSub.tenantId),
                    ...getBoundedRazorpayStringContext('storeId', internalSub.storeId),
                    ...getBoundedRazorpayStringContext('userId', userId),
                });
            }
        }

        return NextResponse.json({ success: true, message: "Subscription upgraded successfully." });
    } catch (error) {
        const failureData = getRazorpayFailureLogData('razorpay_upgrade_subscription_failed', error, {
            ...getRazorpaySubscriptionMutationLogContext(subscriptionForLog),
            ...getBoundedRazorpayStringContext('userId', session?.user?.id),
        });
        logger.error('Subscription upgrade failed', new Error('razorpay_upgrade_subscription_failed'), failureData);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_ERROR',
            data: failureData,
        });
        return NextResponse.json({ error: 'Failed to upgrade subscription' }, { status: 500 });
    }
});

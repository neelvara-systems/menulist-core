export const dynamic = 'force-dynamic';
import { canManageBillingMutation } from '@lib/billing/billingAccess';
import {
    getProductSubscriptionById,
    resolveBillingScopeFromSession,
    safeSyncProductSubscriptionEntitlementFromSubscription,
    updateProductSubscription,
} from '@lib/billing/productBillingServer';
import { isAnswerlatticeBillingProduct, normalizeBillingProductId } from '@lib/billing/productBillingPlans';
import { validateTransition } from '@lib/billing/subscriptionStateMachine';
import { logger } from "@lib/monitoring/logger";
import { razorpayClient } from "@lib/razorpay/razorpay";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { UpgradeSubscriptionRequestSchema } from "@lib/validation/apiSchemas";
import { FirestoreSubscriptionDoc } from "@type/razorpay";
import { calculateRemainingCredits } from "@util/razorpay";
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

        const body = await request.json();
        const validation = validateAPIInput(UpgradeSubscriptionRequestSchema, body);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            // Log to Sentry (CRITICAL - subscription upgrade)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/upgrade-subscription',
                error: errorMsg,
                attemptedData: {
                    productId: body?.productId,
                    hasNewSubscriptionId: !!body?.nSi,
                    hasOldSubscriptionId: !!body?.oSi,
                    remainingCredits: body?.rc,
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

        const newInternalSub = await getProductSubscriptionById(productId, newSubscriptionId);
        if (!newInternalSub || !newInternalSub.providerSubscriptionId) {
            return NextResponse.json({ error: "New subscription was not found." }, { status: 404 });
        }

        // 🔒 CRITICAL: Verify old subscription belongs to user's tenant/store
        if (Number(tenantId) != Number(internalSub.tenantId) || Number(storeId) != Number(internalSub.storeId)) {
            logger.security('Unauthorized Subscription Upgrade Attempt', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/upgrade-subscription',
                error: 'User attempted to upgrade subscription for different tenant/store',
                productId,
                subscriptionTenantId: internalSub.tenantId,
                subscriptionStoreId: internalSub.storeId,
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        if (Number(tenantId) != Number(newInternalSub.tenantId) || Number(storeId) != Number(newInternalSub.storeId)) {
            logger.security('Unauthorized New Subscription Upgrade Attempt', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/razorpay/upgrade-subscription',
                error: 'User attempted to carry credits to a subscription for different tenant/store',
                productId,
                newSubscriptionTenantId: newInternalSub.tenantId,
                newSubscriptionStoreId: newInternalSub.storeId,
            }, 'critical');

            return NextResponse.json(
                { error: 'Forbidden - Access denied' },
                { status: 403 }
            );
        }

        const alreadyAppliedCarryForward = (newInternalSub as any).carryForwardFromSubscriptionId === oldSubscriptionId;
        if (internalSub.status === 'expired' && alreadyAppliedCarryForward) {
            await safeSyncProductSubscriptionEntitlementFromSubscription(
                productId,
                { ...internalSub, status: 'expired' },
                'api:upgrade-subscription:old-expired-idempotent',
            );
            return NextResponse.json({ success: true, message: "Subscription upgraded successfully." });
        }

        const calculatedCredits = calculateRemainingCredits(internalSub);
        const remainingCredits = Math.max(
            0,
            Math.min(
                1_000_000,
                Math.floor(Number(calculatedCredits.totalRemainingCredits || 0)),
            ),
        );

        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_FLOW_INTERNAL_SUB',
            data: summarizeSubscriptionForMutationLog(internalSub),
        });

        if (!validateTransition(internalSub.status, 'expired', 'api:upgrade-subscription')) {
            return NextResponse.json({ error: "Subscription cannot be upgraded in its current state." }, { status: 409 });
        }

        const providerSubscriptionBeforeCancel = await razorpayClient.subscriptions.fetch(internalSub.providerSubscriptionId);
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_FLOW_PROVIDER_SUBSCRIPTION_BEFORE_CANCEL',
            data: summarizeSubscriptionForMutationLog(providerSubscriptionBeforeCancel),
        });

        if (providerSubscriptionBeforeCancel.status === "completed") {
            await writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_FLOW_PROVIDER_SUBSCRIPTION_BEFORE_CANCEL_COMPLETED',
                data: summarizeSubscriptionForMutationLog(providerSubscriptionBeforeCancel),
            });
        } else {
            await razorpayClient.subscriptions.cancel(internalSub.providerSubscriptionId); // Immediate cancel
            const providerSubscriptionAfterCancel = await razorpayClient.subscriptions.fetch(internalSub.providerSubscriptionId);
            await writeLogEntry({
                logFileName: LOG_FILE,
                logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_FLOW_PROVIDER_SUBSCRIPTION_AFTER_CANCEL',
                data: summarizeSubscriptionForMutationLog(providerSubscriptionAfterCancel),
            });
        }

        await updateProductSubscription(productId, internalSub.id, {
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
        if (!alreadyAppliedCarryForward) {
            await updateProductSubscription(productId, newInternalSub.id, {
                topUpCredits: remainingCredits,
                carryForwardCredits: remainingCredits,
                carryForwardFromSubscriptionId: oldSubscriptionId,
                carryForwardAppliedAt: Timestamp.now(),
                statuses: [
                    ...(newInternalSub.statuses || []),
                    {
                        status: 'carry_forward_applied',
                        timestamp: Timestamp.now(),
                        amount: newInternalSub.amount,
                        currency: newInternalSub.currency,
                        remark: `Credits carried forward from upgraded subscription: ${remainingCredits}`,
                    },
                ],
            } as Partial<FirestoreSubscriptionDoc>);
        }
        await safeSyncProductSubscriptionEntitlementFromSubscription(
            productId,
            { ...internalSub, status: 'expired' },
            'api:upgrade-subscription:old-expired',
        );
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_FLOW_SUCCESS',
            data: summarizeSubscriptionForMutationLog(internalSub),
        });
        logger.info('Subscription upgraded successfully', {
            oldSubscriptionId: internalSub.id,
            newSubscriptionId,
            userId: session.user.id,
            remainingCredits
        });

        if (!isAnswerlatticeBillingProduct(productId)) {
            try {
                const { sendLifecycleMessage } = await import('@lib/messaging');
                sendLifecycleMessage({
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
                }).catch(() => { /* non-blocking */ });
            } catch { /* non-blocking */ }
        }

        return NextResponse.json({ success: true, message: "Subscription upgraded successfully." });
    } catch (error) {
        logger.error('Subscription upgrade failed', error, {
            api: 'upgrade-subscription',
            userId: session?.user?.id
        });
        await writeLogEntry({
            logFileName: LOG_FILE,
            logType: 'RAZORPAY_UPGRADE_SUBSCRIPTION_ERROR',
            data: {
                message: error instanceof Error ? error.message : 'Unknown error',
            },
        });
        return NextResponse.json({ error: 'Failed to upgrade subscription' }, { status: 500 });
    }
});

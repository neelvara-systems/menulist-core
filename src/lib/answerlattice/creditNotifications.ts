import { PRODUCT_IDS } from '@constant/product';
import { resolveCreditNotificationMilestone } from '@data/shared/creditNotificationPolicy';
import {
    getAnswerlatticeScopeLogContext,
    logAnswerlatticeFailure,
} from '@lib/answerlattice/diagnostics';

type AnswerlatticeCreditNotificationScope = {
    tId: number;
    sId: number;
};

export async function notifyAnswerlatticeCreditState(params: {
    billingPeriod: number | null;
    email?: string;
    monthlyAllowance: number;
    name?: string;
    planName?: string;
    previousRemainingCredits: number;
    remainingCredits: number;
    scope: AnswerlatticeCreditNotificationScope;
    sourcePath: string;
    subscriptionId: string | null;
}): Promise<void> {
    if (!params.billingPeriod || !params.subscriptionId) return;
    const decision = resolveCreditNotificationMilestone({
        monthlyAllowance: params.monthlyAllowance,
        previousRemainingCredits: params.previousRemainingCredits,
        remainingCredits: params.remainingCredits,
    });
    if (!decision.eventType || !decision.milestone) return;

    try {
        const { enqueueOwnerNotification } = await import('@lib/owner-notifications');
        await enqueueOwnerNotification({
            productId: PRODUCT_IDS.ANSWERLATTICE,
            triggerType: decision.eventType,
            tenantId: String(params.scope.tId),
            storeId: String(params.scope.sId),
            workspaceId: String(params.scope.sId),
            referenceId: `${decision.eventType.toLowerCase()}-${decision.milestone}-${params.subscriptionId}-${params.billingPeriod}`,
            recipientHints: {
                email: params.email,
                name: params.name,
            },
            metadata: {
                creditMilestone: decision.milestone,
                newBalance: params.remainingCredits,
                lowThreshold: decision.lowThreshold,
                planName: params.planName,
                warningThreshold: decision.warningThreshold,
            },
            source: {
                runtime: 'next',
                path: params.sourcePath,
            },
        }, { processImmediately: true, processExisting: false });
    } catch (notificationError) {
        logAnswerlatticeFailure(
            'answerlattice_credit_notification_failed',
            notificationError,
            getAnswerlatticeScopeLogContext(params.scope),
        );
    }
}

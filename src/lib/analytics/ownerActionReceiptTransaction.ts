import { addDaysToAnalyticsDateKey } from './dateKey';
import { FieldValue } from 'firebase-admin/firestore';

const MAX_OWNER_ACTION_RECEIPTS = 20;
const RESULT_CHECK_DELAY_DAYS = 7;
const OWNER_ACTION_RECEIPT_ID_PATTERN = /^[a-f0-9]{32}$/;

export type OwnerActionReceiptTransactionOutcome =
    | { ok: true; receipt: Record<string, unknown> }
    | { ok: false; error: string; status: 404 | 409 };

export type OwnerActionReceiptTransactionParams = {
    actionId: string;
    actionLabel: string;
    actionTitle: string;
    actionType: string;
    dashboardRef: FirebaseFirestore.DocumentReference;
    metricLabel?: string;
    receiptId: string;
    userId: string;
};

function isOwnerActionReceiptId(value: unknown): value is string {
    return typeof value === 'string' && OWNER_ACTION_RECEIPT_ID_PATTERN.test(value);
}

function pickBaselineMetrics(data: Record<string, any>) {
    return data?.wtd?.metrics
        || data?.weekly?.metrics
        || data?.daily?.metrics
        || data?.overview?.wtd?.metrics
        || data?.overview?.yesterday?.metrics
        || {};
}

function getReceiptEntries(data: Record<string, any>) {
    const receipts = data.ownerActionReceipts
        || data.ownerActionPlan?.receipts
        || data.overview?.ownerActionPlan?.receipts
        || {};
    return Object.entries(receipts).filter(([, receipt]) => receipt && typeof receipt === 'object');
}

function getExistingReceipt(
    data: Record<string, any>,
    receiptId: string,
): Record<string, unknown> | null {
    const receipt = data.ownerActionReceipts?.[receiptId]
        || data.ownerActionPlan?.receipts?.[receiptId]
        || data.overview?.ownerActionPlan?.receipts?.[receiptId];
    return receipt && typeof receipt === 'object' && !Array.isArray(receipt)
        ? receipt as Record<string, unknown>
        : null;
}

export function getOwnerActionReceiptIdsToPrune(
    data: Record<string, any>,
    incomingReceiptId: string,
): string[] {
    const entries = getReceiptEntries(data).filter(([receiptId]) => isOwnerActionReceiptId(receiptId));
    const incomingAlreadyExists = entries.some(([receiptId]) => receiptId === incomingReceiptId);
    const nextReceiptCount = entries.length + (incomingAlreadyExists ? 0 : 1);
    const pruneCount = Math.max(0, nextReceiptCount - MAX_OWNER_ACTION_RECEIPTS);
    if (pruneCount === 0) return [];

    return entries
        .sort(([, a], [, b]) => {
            const aTime = new Date((a as any).markedDoneAt || 0).getTime() || 0;
            const bTime = new Date((b as any).markedDoneAt || 0).getTime() || 0;
            return aTime - bTime;
        })
        .filter(([receiptId]) => receiptId !== incomingReceiptId)
        .slice(0, pruneCount)
        .map(([receiptId]) => receiptId)
        .filter(isOwnerActionReceiptId);
}

export async function markOwnerActionDoneTransaction(
    firestore: FirebaseFirestore.Firestore,
    params: OwnerActionReceiptTransactionParams,
): Promise<OwnerActionReceiptTransactionOutcome> {
    return firestore.runTransaction(async (transaction) => {
        const dashboardSnap = await transaction.get(params.dashboardRef);
        if (!dashboardSnap.exists) {
            return { ok: false, error: 'Action list is not ready yet', status: 404 };
        }

        const dashboardData = dashboardSnap.data() || {};
        const existingReceipt = getExistingReceipt(dashboardData, params.receiptId);
        if (existingReceipt) {
            if (
                existingReceipt.receiptId !== params.receiptId
                || existingReceipt.actionId !== params.actionId
            ) {
                return { ok: false, error: 'Action receipt conflicts with existing data', status: 409 };
            }
            return { ok: true, receipt: existingReceipt };
        }

        const actionPlan = dashboardData.ownerActionPlan || dashboardData.overview?.ownerActionPlan;
        const currentAction = Array.isArray(actionPlan?.actions)
            ? actionPlan.actions.find((action: any) => action?.id === params.actionId)
            : null;
        if (!currentAction) {
            return { ok: false, error: 'Action is no longer available', status: 409 };
        }

        const baselineLocalDate = dashboardData.lastSettledLocalDate || dashboardData.daily?.date || null;
        if (!baselineLocalDate) {
            return { ok: false, error: 'Settled analytics are not ready yet', status: 409 };
        }

        const checkAfterLocalDate = addDaysToAnalyticsDateKey(baselineLocalDate, RESULT_CHECK_DELAY_DAYS);
        const receipt = {
            receiptId: params.receiptId,
            actionId: params.actionId,
            actionType: currentAction.type || params.actionType,
            actionTitle: currentAction.title || params.actionTitle,
            actionLabel: currentAction.actionLabel || params.actionLabel,
            ...(currentAction.metricLabel || params.metricLabel
                ? { metricLabel: currentAction.metricLabel || params.metricLabel }
                : {}),
            status: 'marked_done',
            markedDoneAt: new Date().toISOString(),
            markedBy: params.userId,
            baselineLocalDate,
            checkAfterLocalDate,
            baselineSnapshot: pickBaselineMetrics(dashboardData),
            result: {
                status: 'pending',
                label: 'Marked',
                message: 'Marked done. MenuList will check the next settled results after a few days.',
                checkAfterLocalDate,
            },
        };

        const updates: Record<string, any> = {
            [`ownerActionReceipts.${params.receiptId}`]: receipt,
            [`ownerActionPlan.receipts.${params.receiptId}`]: receipt,
            [`overview.ownerActionPlan.receipts.${params.receiptId}`]: receipt,
            modifiedOn: FieldValue.serverTimestamp(),
        };
        getOwnerActionReceiptIdsToPrune(dashboardData, params.receiptId).forEach((receiptIdToPrune) => {
            updates[`ownerActionReceipts.${receiptIdToPrune}`] = FieldValue.delete();
            updates[`ownerActionPlan.receipts.${receiptIdToPrune}`] = FieldValue.delete();
            updates[`overview.ownerActionPlan.receipts.${receiptIdToPrune}`] = FieldValue.delete();
        });

        transaction.update(params.dashboardRef, updates);
        return { ok: true, receipt };
    });
}

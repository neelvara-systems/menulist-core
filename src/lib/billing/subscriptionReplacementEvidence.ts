import { normalizeBillingSubscriptionDocumentId } from './subscriptionDocumentIdBoundary';

export type SubscriptionReplacementEvidence =
    | { outcome: 'none' }
    | { outcome: 'replacement'; previousMrrPaise: number; subscriptionId: string }
    | { outcome: 'invalid' };

const asRecord = (value: unknown): Record<string, unknown> | null => (
    value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null
);

const projectSnapshot = (value: unknown): SubscriptionReplacementEvidence => {
    const snapshot = asRecord(value);
    if (!snapshot) return { outcome: 'invalid' };

    const rawSubscriptionId = snapshot.founderMonitorReplacementForSubscriptionId;
    const rawPreviousMrrPaise = snapshot.founderMonitorReplacementMrrPaise;
    const hasSubscriptionId = rawSubscriptionId != null && rawSubscriptionId !== '';
    const hasPreviousMrr = rawPreviousMrrPaise != null;
    if (!hasSubscriptionId) {
        return !hasPreviousMrr || rawPreviousMrrPaise === 0
            ? { outcome: 'none' }
            : { outcome: 'invalid' };
    }

    const subscriptionId = normalizeBillingSubscriptionDocumentId(rawSubscriptionId);
    if (
        !subscriptionId
        || typeof rawPreviousMrrPaise !== 'number'
        || !Number.isSafeInteger(rawPreviousMrrPaise)
        || rawPreviousMrrPaise < 0
    ) {
        return { outcome: 'invalid' };
    }
    return {
        outcome: 'replacement',
        previousMrrPaise: rawPreviousMrrPaise,
        subscriptionId,
    };
};

export const resolveSubscriptionReplacementEvidence = (
    ...snapshots: unknown[]
): SubscriptionReplacementEvidence => {
    if (snapshots.length === 0) return { outcome: 'invalid' };
    const projections = snapshots.map(projectSnapshot);
    if (projections.some((projection) => projection.outcome === 'invalid')) {
        return { outcome: 'invalid' };
    }
    const [first] = projections;
    if (!first || projections.some((projection) => (
        projection.outcome !== first.outcome
        || (
            projection.outcome === 'replacement'
            && first.outcome === 'replacement'
            && (
                projection.subscriptionId !== first.subscriptionId
                || projection.previousMrrPaise !== first.previousMrrPaise
            )
        )
    ))) {
        return { outcome: 'invalid' };
    }
    return first;
};

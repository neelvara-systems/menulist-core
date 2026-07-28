import { parseFounderOnboardingTransitionScope } from './founderMonitorScopeBoundary';

type PersistedTransition = Record<string, unknown>;

export type FounderOnboardingTransitionCompletionCandidate = {
    firstLiveAt: Date;
    paymentAt: Date;
    storeId: string;
    tenantId: string | null;
};

export type FounderOnboardingTransitionCompletionDecision =
    | { status: 'already_complete' }
    | { status: 'scope_conflict' }
    | {
        firstLiveAt: Date;
        paymentAt: Date;
        status: 'write';
        timeToLiveHours: number;
    };

function toDate(value: unknown): Date | null {
    if (value instanceof Date) {
        return Number.isFinite(value.getTime()) ? value : null;
    }
    if (!value || typeof value !== 'object') return null;
    const timestamp = value as {
        _seconds?: unknown;
        seconds?: unknown;
        toDate?: unknown;
    };
    if (typeof timestamp.toDate === 'function') {
        try {
            const date = timestamp.toDate.call(value);
            return date instanceof Date && Number.isFinite(date.getTime()) ? date : null;
        } catch {
            return null;
        }
    }
    const seconds = timestamp.seconds ?? timestamp._seconds;
    if (typeof seconds !== 'number' || !Number.isSafeInteger(seconds)) return null;
    const date = new Date(seconds * 1000);
    return Number.isFinite(date.getTime()) ? date : null;
}

function toNonNegativeFiniteNumber(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
        ? value
        : null;
}

function hoursBetween(start: Date, end: Date): number {
    return Math.max(
        0,
        Math.round(((end.getTime() - start.getTime()) / (60 * 60 * 1000)) * 10) / 10,
    );
}

export function resolveFounderOnboardingTransitionCompletion(params: {
    candidate: FounderOnboardingTransitionCompletionCandidate;
    currentData: PersistedTransition | undefined;
    documentId: string;
}): FounderOnboardingTransitionCompletionDecision {
    const { candidate, currentData, documentId } = params;
    if (currentData) {
        const currentScope = parseFounderOnboardingTransitionScope(documentId, currentData);
        if (
            !currentScope
            || (
                currentScope.tenantId !== null
                && currentScope.tenantId !== candidate.tenantId
            )
        ) {
            return { status: 'scope_conflict' };
        }
    }

    const currentPaymentAt = toDate(currentData?.paymentAt);
    const currentFirstLiveAt = toDate(currentData?.firstLiveAt);
    const currentTimeToLiveHours = toNonNegativeFiniteNumber(currentData?.timeToLiveHours);
    if (currentPaymentAt && currentFirstLiveAt && currentTimeToLiveHours !== null) {
        return { status: 'already_complete' };
    }

    const paymentAt = currentPaymentAt || candidate.paymentAt;
    const firstLiveAt = currentFirstLiveAt || candidate.firstLiveAt;
    return {
        firstLiveAt,
        paymentAt,
        status: 'write',
        timeToLiveHours: hoursBetween(paymentAt, firstLiveAt),
    };
}

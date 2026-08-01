export type AnswerlatticePendingMutationEntry = {
    attempts: Set<symbol>;
    fingerprint: string;
    requestId: string;
};

export type AnswerlatticePendingMutationClaim = {
    attempt: symbol;
    fingerprint: string;
    requestId: string;
};

export const acquireAnswerlatticePendingMutation = (
    registry: Map<string, AnswerlatticePendingMutationEntry>,
    key: string,
    fingerprint: string,
    createRequestId: () => string,
    maxEntries: number,
): AnswerlatticePendingMutationClaim => {
    const existing = registry.get(key);
    const attempt = Symbol('answerlattice-pending-mutation');
    if (existing?.fingerprint === fingerprint) {
        existing.attempts.add(attempt);
        return { attempt, fingerprint, requestId: existing.requestId };
    }

    if (registry.size >= maxEntries && !registry.has(key)) {
        const oldestKey = registry.keys().next().value;
        if (oldestKey) registry.delete(oldestKey);
    }

    const requestId = createRequestId();
    registry.set(key, {
        attempts: new Set([attempt]),
        fingerprint,
        requestId,
    });
    return { attempt, fingerprint, requestId };
};

export const settleAnswerlatticePendingMutation = (
    registry: Map<string, AnswerlatticePendingMutationEntry>,
    key: string,
    claim: AnswerlatticePendingMutationClaim,
): boolean => {
    const current = registry.get(key);
    if (
        !current
        || current.fingerprint !== claim.fingerprint
        || current.requestId !== claim.requestId
        || !current.attempts.delete(claim.attempt)
    ) {
        return false;
    }

    if (current.attempts.size === 0) registry.delete(key);
    return true;
};

import { createHash } from 'crypto';

export function stableStringify(value: unknown): string {
    if (value === null || typeof value !== 'object') {
        return JSON.stringify(value);
    }

    if (Array.isArray(value)) {
        return `[${value.map(stableStringify).join(',')}]`;
    }

    const entries = Object.entries(value as Record<string, unknown>)
        .filter(([, entry]) => entry !== undefined)
        .sort(([a], [b]) => a.localeCompare(b));

    return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(',')}}`;
}

export function hashStableValue(value: unknown): string {
    return createHash('sha256').update(stableStringify(value)).digest('hex');
}

export function buildDailySessionId(params: {
    tId: string | number;
    sId: string | number;
    projectId?: string;
    sessionDate: string;
}) {
    const raw = `${params.tId}:${params.sId}:${params.projectId || 'store'}:${params.sessionDate}`;
    return `amm_${hashStableValue(raw).slice(0, 24)}`;
}

export function buildProposalId(params: {
    tId: string | number;
    sId: string | number;
    projectId?: string;
    idempotencyKey: string;
    actionType: string;
    patchHash?: string;
}) {
    const raw = `${params.tId}:${params.sId}:${params.projectId || 'store'}:${params.actionType}:${params.idempotencyKey}:${params.patchHash || ''}`;
    return `amm_prop_${hashStableValue(raw).slice(0, 28)}`;
}

export function buildExecutionId(proposalId: string, idempotencyKey: string) {
    return `amm_exec_${hashStableValue(`${proposalId}:${idempotencyKey}`).slice(0, 28)}`;
}

export function todaySessionDate(now = new Date()) {
    return now.toISOString().slice(0, 10);
}

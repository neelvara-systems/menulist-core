import {
    normalizeAiMenuManagerProjectId,
    normalizeAiMenuManagerScopeDocumentId,
} from './routeIds';

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

function stableHashHex(value: string) {
    let h1 = 0xdeadbeef ^ value.length;
    let h2 = 0x41c6ce57 ^ value.length;
    let h3 = 0xc0decafe ^ value.length;
    let h4 = 0x9e3779b9 ^ value.length;

    for (let index = 0; index < value.length; index += 1) {
        const code = value.charCodeAt(index);
        h1 = Math.imul(h1 ^ code, 2654435761);
        h2 = Math.imul(h2 ^ code, 1597334677);
        h3 = Math.imul(h3 ^ code, 2246822507);
        h4 = Math.imul(h4 ^ code, 3266489909);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h3 ^ (h3 >>> 13), 3266489909);
    h3 = Math.imul(h3 ^ (h3 >>> 16), 2246822507) ^ Math.imul(h4 ^ (h4 >>> 13), 3266489909);
    h4 = Math.imul(h4 ^ (h4 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return [h1, h2, h3, h4]
        .map((entry) => (entry >>> 0).toString(16).padStart(8, '0'))
        .join('');
}

export function hashStableValue(value: unknown): string {
    return stableHashHex(stableStringify(value));
}

type AiMenuManagerDailySessionScope = {
    tId: string | number;
    sId: string | number;
    projectId: string;
    sessionDate: string;
};

export function normalizeAiMenuManagerSessionDate(value: unknown): string | null {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
        ? value
        : null;
}

function requireDailySessionScope(params: AiMenuManagerDailySessionScope) {
    const tenant = normalizeAiMenuManagerScopeDocumentId(params.tId);
    const store = normalizeAiMenuManagerScopeDocumentId(params.sId);
    const projectId = normalizeAiMenuManagerProjectId(params.projectId);
    const sessionDate = normalizeAiMenuManagerSessionDate(params.sessionDate);
    if (!tenant || !store || !projectId || !sessionDate) {
        throw new Error('Invalid session scope');
    }
    return {
        tId: tenant.documentId,
        sId: store.documentId,
        projectId,
        sessionDate,
    };
}

function buildLegacyDailySessionId(params: AiMenuManagerDailySessionScope) {
    const scope = requireDailySessionScope(params);
    const raw = `${scope.tId}:${scope.sId}:${scope.projectId}:${scope.sessionDate}`;
    return `amm_${hashStableValue(raw).slice(0, 24)}`;
}

export function buildDailySessionId(params: AiMenuManagerDailySessionScope) {
    const scope = requireDailySessionScope(params);
    return `amm2_${scope.tId}_${scope.sId}_${scope.sessionDate}_${scope.projectId}`;
}

export function isDailySessionIdForScope(params: {
    sessionId: string;
    tId: string | number;
    sId: string | number;
    projectId: string;
    sessionDate: string;
}) {
    try {
        return params.sessionId === buildDailySessionId(params)
            || params.sessionId === buildLegacyDailySessionId(params);
    } catch {
        return false;
    }
}

export function resolveDailySessionDateFromId(params: {
    sessionId: string;
    tId: string | number;
    sId: string | number;
    projectId: string;
}): string | null {
    try {
        const scope = requireDailySessionScope({
            ...params,
            sessionDate: '2000-01-01',
        });
        const prefix = `amm2_${scope.tId}_${scope.sId}_`;
        const suffix = `_${scope.projectId}`;
        if (!params.sessionId.startsWith(prefix) || !params.sessionId.endsWith(suffix)) return null;

        const sessionDate = normalizeAiMenuManagerSessionDate(
            params.sessionId.slice(prefix.length, -suffix.length),
        );
        return sessionDate && isDailySessionIdForScope({ ...scope, sessionDate, sessionId: params.sessionId })
            ? sessionDate
            : null;
    } catch {
        return null;
    }
}

export function resolveDailySessionId(params: {
    sessionId?: string;
    tId: string | number;
    sId: string | number;
    projectId: string;
    sessionDate: string;
}) {
    const expectedSessionId = buildDailySessionId(params);
    if (params.sessionId && !isDailySessionIdForScope({ ...params, sessionId: params.sessionId })) {
        throw new Error('Session scope mismatch');
    }
    return params.sessionId || expectedSessionId;
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

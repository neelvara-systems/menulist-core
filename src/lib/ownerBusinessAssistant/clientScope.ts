import { resolveCurrentSessionUserDocumentId } from '@lib/auth/sessionUserDocumentId';

type OwnerBusinessAssistantSessionScope = {
    sId?: unknown;
    tId?: unknown;
    uId?: unknown;
    user?: {
        id?: unknown;
    } | null;
};

export type OwnerBusinessAssistantClientScope = {
    actorId: string;
    cacheScope: string;
    storeId: string;
    tenantId: string;
};

export const buildOwnerBusinessAssistantThreadStorageKey = (
    projectId: string | undefined,
    scope: OwnerBusinessAssistantClientScope,
): string => (
    `ownerBusinessAssistant-thread:${scope.cacheScope}:${encodeURIComponent(scope.actorId)}:${
        projectId ? `project:${encodeURIComponent(projectId)}` : 'all'
    }`
);

const normalizeScopeId = (value: unknown): string | null => {
    if (typeof value === 'number') {
        return Number.isSafeInteger(value) && value > 0 ? String(value) : null;
    }
    if (typeof value !== 'string') return null;
    const normalized = value.trim();
    return /^[1-9]\d{0,15}$/.test(normalized) ? normalized : null;
};

export const resolveOwnerBusinessAssistantClientScope = (
    session: OwnerBusinessAssistantSessionScope | null | undefined,
    requestedStoreId?: unknown,
    requestedTenantId?: unknown,
): OwnerBusinessAssistantClientScope | null => {
    const tenantId = typeof session?.tId === 'number'
        && Number.isSafeInteger(session.tId)
        && session.tId > 0
        ? String(session.tId)
        : null;
    const storeId = typeof session?.sId === 'number'
        && Number.isSafeInteger(session.sId)
        && session.sId > 0
        ? String(session.sId)
        : null;
    const actorId = resolveCurrentSessionUserDocumentId(session);
    if (!tenantId || !storeId || !actorId) return null;

    if (requestedStoreId !== undefined && requestedStoreId !== null && requestedStoreId !== '') {
        const requested = normalizeScopeId(requestedStoreId);
        if (!requested || requested !== storeId) return null;
    }
    if (requestedTenantId !== undefined && requestedTenantId !== null && requestedTenantId !== '') {
        const requested = normalizeScopeId(requestedTenantId);
        if (!requested || requested !== tenantId) return null;
    }

    return {
        actorId,
        cacheScope: `${tenantId}:${storeId}`,
        storeId,
        tenantId,
    };
};

import {
    normalizeStoreSummaryNumericAliases,
    normalizeStoreSummaryNumericDocumentId,
} from '../sharedData/storeSummaryBoundary';

type PersistedScopeRecord = Record<string, unknown>;

export type FounderMonitorScope = {
    storeId: string;
    tenantId: string;
};

export type FounderOnboardingTransitionScope = {
    storeId: string;
    tenantId: string | null;
};

function hasExactAnswerlatticeProductAliases(value: PersistedScopeRecord): boolean {
    const aliases = [value.pId, value.productId]
        .filter((alias) => alias !== undefined && alias !== null);
    return aliases.length > 0 && aliases.every((alias) => alias === 'AL');
}

export function parseFounderMonitorSupportTicketScope(
    value: PersistedScopeRecord,
): FounderMonitorScope | null {
    if (!hasExactAnswerlatticeProductAliases(value)) return null;
    const tenantId = normalizeStoreSummaryNumericAliases([value.tId, value.tenantId]);
    const storeId = normalizeStoreSummaryNumericAliases([value.sId, value.storeId]);
    return tenantId && storeId ? { tenantId, storeId } : null;
}

export function parseFounderOnboardingTransitionScope(
    documentId: unknown,
    value: PersistedScopeRecord,
): FounderOnboardingTransitionScope | null {
    const storeId = normalizeStoreSummaryNumericDocumentId(documentId);
    if (!storeId) return null;

    const suppliedStoreAliases = [value.storeId, value.sId]
        .filter((alias) => alias !== undefined && alias !== null);
    const embeddedStoreId = suppliedStoreAliases.length > 0
        ? normalizeStoreSummaryNumericAliases(suppliedStoreAliases)
        : storeId;
    if (embeddedStoreId !== storeId) return null;

    const suppliedTenantAliases = [value.tenantId, value.tId]
        .filter((alias) => alias !== undefined && alias !== null);
    const tenantId = suppliedTenantAliases.length > 0
        ? normalizeStoreSummaryNumericAliases(suppliedTenantAliases)
        : null;
    if (suppliedTenantAliases.length > 0 && !tenantId) return null;

    return { storeId, tenantId };
}

export function buildFounderMonitorScopeKey(scope: FounderMonitorScope): string {
    return `${scope.tenantId}:${scope.storeId}`;
}

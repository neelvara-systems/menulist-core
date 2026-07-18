import { normalizeMultiOutletNumericDocumentId, normalizeMultiOutletProjectId } from "@lib/multiOutlet/projectIdBoundary";
import { hashString } from "@util/hash";

export const MAX_PROJECT_PROPAGATION_STORES = 200;

type StoreListEntry = {
    active?: unknown;
    blocked?: unknown;
    deleted?: unknown;
    isMaster?: unknown;
    storeId?: unknown;
};

export type ProjectPropagationPlan = {
    outletStoreIds: string[];
    sourceStoreId: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> => (
    value !== null && typeof value === "object" && !Array.isArray(value)
);

export function normalizeProjectPropagationPlan(
    storesList: unknown,
    sourceStoreId: unknown,
    sourceStore: unknown,
    tenantId: unknown,
): ProjectPropagationPlan | null {
    const sourceScope = normalizeMultiOutletNumericDocumentId(sourceStoreId);
    const tenantScope = normalizeMultiOutletNumericDocumentId(tenantId);
    if (
        !sourceScope
        || !tenantScope
        || !isRecord(sourceStore)
        || !Array.isArray(storesList)
        || storesList.length > MAX_PROJECT_PROPAGATION_STORES
    ) {
        return null;
    }

    const entries = new Map<string, StoreListEntry>();
    for (const value of storesList) {
        if (!isRecord(value)) return null;
        const storeScope = normalizeMultiOutletNumericDocumentId(value.storeId);
        if (!storeScope || entries.has(storeScope.documentId)) return null;
        entries.set(storeScope.documentId, value);
    }

    const source = entries.get(sourceScope.documentId);
    if (
        !source
        || String(sourceStore.storeId) !== sourceScope.documentId
        || String(sourceStore.tenantId) !== tenantScope.documentId
        || sourceStore.isMaster !== true
        || sourceStore.active === false
        || sourceStore.blocked === true
        || sourceStore.deleted === true
    ) {
        return null;
    }

    const outletStoreIds = Array.from(entries.entries())
        .filter(([storeId, entry]) => (
            storeId !== sourceScope.documentId
            && entry.isMaster !== true
            && entry.active !== false
            && entry.blocked !== true
            && entry.deleted !== true
        ))
        .map(([storeId]) => storeId);

    return {
        outletStoreIds,
        sourceStoreId: sourceScope.documentId,
    };
}

export function buildDeterministicOutletProjectId(params: {
    masterProjectId: string;
    outletStoreId: string;
    tenantId: string;
}): string | null {
    const tenantScope = normalizeMultiOutletNumericDocumentId(params.tenantId);
    const outletScope = normalizeMultiOutletNumericDocumentId(params.outletStoreId);
    const masterScope = normalizeMultiOutletProjectId(params.masterProjectId);
    if (
        !tenantScope
        || !outletScope
        || !masterScope
        || masterScope.tenantDocumentId !== tenantScope.documentId
    ) {
        return null;
    }

    const projectId = `${tenantScope.documentId}-linked-${hashString(masterScope.projectId)}-${outletScope.documentId}`;
    const projectScope = normalizeMultiOutletProjectId(projectId);
    return projectScope
        && projectScope.tenantDocumentId === tenantScope.documentId
        && projectScope.storeDocumentId === outletScope.documentId
        ? projectId
        : null;
}

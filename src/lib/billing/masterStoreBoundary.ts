import { normalizeBillingSubscriptionScopeDocumentId } from '@lib/billing/subscriptionDocumentIdBoundary';

type NormalizedStoreListEntry = {
    active: boolean;
    isMaster: boolean | undefined;
    storeId: number;
};

function readOptionalExactBoolean(value: unknown): boolean | undefined | null {
    if (value === undefined) return undefined;
    return typeof value === 'boolean' ? value : null;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    try {
        const prototype = Object.getPrototypeOf(value);
        return prototype === Object.prototype || prototype === null;
    } catch {
        return false;
    }
}

function normalizeStoreListEntry(value: unknown): NormalizedStoreListEntry | null {
    if (!isPlainRecord(value)) return null;
    const entry = value;
    const nested = entry.storeDetails;
    if (nested !== undefined && !isPlainRecord(nested)) {
        return null;
    }
    const nestedEntry = (nested || {}) as Record<string, unknown>;

    const storeScope = normalizeBillingSubscriptionScopeDocumentId(entry.storeId);
    if (!storeScope) return null;
    if (nestedEntry.storeId !== undefined) {
        const nestedStoreScope = normalizeBillingSubscriptionScopeDocumentId(nestedEntry.storeId);
        if (!nestedStoreScope || nestedStoreScope.numericId !== storeScope.numericId) return null;
    }

    const active = readOptionalExactBoolean(entry.active);
    const nestedActive = readOptionalExactBoolean(nestedEntry.active);
    const isMaster = readOptionalExactBoolean(entry.isMaster);
    const nestedIsMaster = readOptionalExactBoolean(nestedEntry.isMaster);
    if (active === null || nestedActive === null || isMaster === null || nestedIsMaster === null) {
        return null;
    }
    if (active !== undefined && nestedActive !== undefined && active !== nestedActive) return null;
    if (isMaster !== undefined && nestedIsMaster !== undefined && isMaster !== nestedIsMaster) return null;

    return {
        active: active !== false && nestedActive !== false,
        isMaster: isMaster ?? nestedIsMaster,
        storeId: storeScope.numericId,
    };
}

export function getExactMasterStoreIdFromList(storesList: unknown): number | null {
    if (!Array.isArray(storesList) || storesList.length === 0) return null;

    const entries: NormalizedStoreListEntry[] = [];
    const storeIds = new Set<number>();
    for (const value of storesList) {
        let entry: NormalizedStoreListEntry | null;
        try {
            entry = normalizeStoreListEntry(value);
        } catch {
            return null;
        }
        if (!entry || storeIds.has(entry.storeId)) return null;
        storeIds.add(entry.storeId);
        entries.push(entry);
    }

    const explicitMasters = entries.filter((entry) => entry.active && entry.isMaster === true);
    if (explicitMasters.length === 1) return explicitMasters[0].storeId;
    if (explicitMasters.length > 1) return null;

    const activeEntries = entries.filter((entry) => entry.active);
    if (activeEntries.length === 1) return activeEntries[0].storeId;

    const unflaggedActiveEntries = activeEntries.filter((entry) => entry.isMaster === undefined);
    return unflaggedActiveEntries.length === 1 ? unflaggedActiveEntries[0].storeId : null;
}

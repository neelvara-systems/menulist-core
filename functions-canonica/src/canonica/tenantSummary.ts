import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';

export const CANONICA_TENANT_SUMMARY_DOC_ID = 'canonicaTenantsSummary';

export interface CanonicaTenantStore {
    tId: number;
    sId: number;
}

export interface CanonicaTenantSummaryEntry extends CanonicaTenantStore {
    pId: 'CN';
    active: boolean;
    hasEntities?: boolean;
    source: string;
    createdAt?: Timestamp;
    lastSeenAt: Timestamp;
    updatedAt: Timestamp;
}

function normalizeTenantStore(tId: number | string, sId: number | string): CanonicaTenantStore | null {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (!Number.isFinite(tenantId) || tenantId <= 0 || !Number.isFinite(storeId) || storeId <= 0) {
        return null;
    }
    return { tId: tenantId, sId: storeId };
}

export function getCanonicaTenantSummaryKey(tId: number | string, sId: number | string): string {
    const scope = normalizeTenantStore(tId, sId);
    if (!scope) {
        throw new Error('Cannot build Canonica tenant summary key without valid tId and sId.');
    }
    return `${scope.tId}_${scope.sId}`;
}

export function parseCanonicaTenantSummary(data: Record<string, any> | undefined): CanonicaTenantStore[] {
    const tenants = data?.tenants;
    if (!tenants || typeof tenants !== 'object' || Array.isArray(tenants)) return [];

    const result: CanonicaTenantStore[] = [];
    for (const entry of Object.values(tenants) as Array<Record<string, any>>) {
        if (!entry || entry.active === false) continue;
        if (entry.hasEntities === false) continue;
        const scope = normalizeTenantStore(entry.tId, entry.sId);
        if (scope) result.push(scope);
    }

    return result;
}

export async function upsertCanonicaTenantSummary(
    db: Firestore,
    tId: number | string,
    sId: number | string,
    options: { source: string; active?: boolean; hasEntities?: boolean }
): Promise<void> {
    const scope = normalizeTenantStore(tId, sId);
    if (!scope) {
        throw new Error('Cannot update Canonica tenant summary without valid tId and sId.');
    }

    const now = Timestamp.now();
    const key = getCanonicaTenantSummaryKey(scope.tId, scope.sId);
    const entry: CanonicaTenantSummaryEntry = {
        pId: 'CN',
        ...scope,
        active: options.active !== false,
        hasEntities: options.hasEntities,
        source: options.source,
        lastSeenAt: now,
        updatedAt: now,
    };

    await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(CANONICA_TENANT_SUMMARY_DOC_ID).set({
        tenants: {
            [key]: entry,
        },
        updatedAt: now,
    }, { merge: true });
}

export async function upsertCanonicaTenantSummaryEntries(
    db: Firestore,
    tenants: CanonicaTenantStore[],
    options: { source: string; active?: boolean; hasEntities?: boolean }
): Promise<void> {
    if (tenants.length === 0) return;

    const now = Timestamp.now();
    const entries: Record<string, CanonicaTenantSummaryEntry> = {};
    for (const tenant of tenants) {
        const scope = normalizeTenantStore(tenant.tId, tenant.sId);
        if (!scope) continue;
        entries[getCanonicaTenantSummaryKey(scope.tId, scope.sId)] = {
            pId: 'CN',
            ...scope,
            active: options.active !== false,
            hasEntities: options.hasEntities,
            source: options.source,
            lastSeenAt: now,
            updatedAt: now,
        };
    }

    if (Object.keys(entries).length === 0) return;

    await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(CANONICA_TENANT_SUMMARY_DOC_ID).set({
        tenants: entries,
        updatedAt: now,
    }, { merge: true });
}

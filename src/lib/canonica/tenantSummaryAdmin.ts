import { DB_COLLECTIONS } from '@constant/database';
import { canonicaFirestoreAdmin } from '@lib/firebase/canonicaFirebaseAdmin';
import { admin } from '@lib/firebase/firebaseAdmin';

export const CANONICA_TENANT_SUMMARY_DOC_ID = 'canonicaTenantsSummary';

const normalizeTenantStore = (tId: number | string, sId: number | string) => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (!Number.isFinite(tenantId) || tenantId <= 0 || !Number.isFinite(storeId) || storeId <= 0) {
        return null;
    }
    return { tId: tenantId, sId: storeId };
};

export async function upsertCanonicaTenantSummaryAdmin(params: {
    tId: number | string;
    sId: number | string;
    source: string;
    active?: boolean;
    hasEntities?: boolean;
}): Promise<{ skipped: boolean }> {
    const scope = normalizeTenantStore(params.tId, params.sId);
    if (!scope) {
        throw new Error('Cannot update Canonica tenant summary without valid tId and sId.');
    }

    const db = canonicaFirestoreAdmin as any;
    if (!db || typeof db.collection !== 'function') {
        return { skipped: true };
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const key = `${scope.tId}_${scope.sId}`;

    await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(CANONICA_TENANT_SUMMARY_DOC_ID).set({
        tenants: {
            [key]: {
                pId: 'CN',
                ...scope,
                active: params.active !== false,
                hasEntities: params.hasEntities,
                source: params.source,
                lastSeenAt: now,
                updatedAt: now,
            },
        },
        updatedAt: now,
    }, { merge: true });

    return { skipped: false };
}

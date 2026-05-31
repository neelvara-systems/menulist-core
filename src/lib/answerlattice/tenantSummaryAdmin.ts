import { DB_COLLECTIONS } from '@constant/database';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import * as admin from 'firebase-admin';

export const ANSWERLATTICE_TENANT_SUMMARY_DOC_ID = 'answerlatticeTenantsSummary';

const normalizeTenantStore = (tId: number | string, sId: number | string) => {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (!Number.isFinite(tenantId) || tenantId <= 0 || !Number.isFinite(storeId) || storeId <= 0) {
        return null;
    }
    return { tId: tenantId, sId: storeId };
};

export async function upsertAnswerlatticeTenantSummaryAdmin(params: {
    tId: number | string;
    sId: number | string;
    source: string;
    active?: boolean;
    hasEntities?: boolean;
    timeZone?: string;
    businessDayEndTime?: string;
    schedulerHour?: number;
}): Promise<{ skipped: boolean }> {
    const scope = normalizeTenantStore(params.tId, params.sId);
    if (!scope) {
        throw new Error('Cannot update Answerlattice tenant summary without valid tId and sId.');
    }

    const db = answerlatticeFirestoreAdmin as any;
    if (!db || typeof db.collection !== 'function') {
        return { skipped: true };
    }

    const now = admin.firestore.FieldValue.serverTimestamp();
    const key = `${scope.tId}_${scope.sId}`;

    const entry: Record<string, any> = {
        pId: 'AL',
        ...scope,
        active: params.active !== false,
        hasEntities: params.hasEntities,
        source: params.source,
        lastSeenAt: now,
        updatedAt: now,
    };
    if (params.timeZone) entry.timeZone = String(params.timeZone).slice(0, 80);
    if (params.businessDayEndTime) entry.businessDayEndTime = String(params.businessDayEndTime).slice(0, 5);
    if (Number.isInteger(params.schedulerHour) && Number(params.schedulerHour) >= 0 && Number(params.schedulerHour) <= 23) {
        entry.schedulerHour = Number(params.schedulerHour);
    }

    await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(ANSWERLATTICE_TENANT_SUMMARY_DOC_ID).set({
        tenants: {
            [key]: entry,
        },
        updatedAt: now,
    }, { merge: true });

    return { skipped: false };
}

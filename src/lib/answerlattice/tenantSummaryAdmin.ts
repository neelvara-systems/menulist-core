import { DB_COLLECTIONS } from '@constant/database';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { admin } from '@lib/firebase/firebaseAdminCompat';
import type { Transaction, WriteBatch } from 'firebase-admin/firestore';

export const ANSWERLATTICE_TENANT_SUMMARY_DOC_ID = 'answerlatticeTenantsSummary';
export const ANSWERLATTICE_TENANT_SUMMARY_SHARD_COUNT = 64;
export const ANSWERLATTICE_TENANT_SUMMARY_SHARD_PREFIX = 'answerlatticeTenantsSummaryShard_';
export const ANSWERLATTICE_TENANT_SUMMARY_SHARD_TYPE = 'answerlattice_tenant_registry_shard';

const normalizeTenantStore = (tId: unknown, sId: unknown) => {
    if (
        typeof tId !== 'number'
        || !Number.isSafeInteger(tId)
        || tId <= 0
        || typeof sId !== 'number'
        || !Number.isSafeInteger(sId)
        || sId <= 0
    ) {
        return null;
    }
    return { tId, sId };
};

export const getAnswerlatticeTenantSummaryShardId = (tId: number, sId: number) => {
    const scope = normalizeTenantStore(tId, sId);
    if (!scope) throw new Error('Cannot build Answerlattice tenant summary shard without valid tId and sId.');
    const key = `${scope.tId}_${scope.sId}`;
    let hash = 2166136261;
    for (let index = 0; index < key.length; index += 1) {
        hash ^= key.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    const foldedHash = ((hash >>> 0) ^ (hash >>> 16)) >>> 0;
    const shard = foldedHash % ANSWERLATTICE_TENANT_SUMMARY_SHARD_COUNT;
    return `${ANSWERLATTICE_TENANT_SUMMARY_SHARD_PREFIX}${String(shard).padStart(2, '0')}`;
};

const timestampMillis = (value: any): number => {
    if (typeof value?.toMillis === 'function') return value.toMillis();
    if (typeof value?.seconds === 'number') return value.seconds * 1000;
    if (value instanceof Date) return value.getTime();
    const parsed = typeof value === 'string' || typeof value === 'number' ? new Date(value).getTime() : 0;
    return Number.isFinite(parsed) ? parsed : 0;
};

export async function readAnswerlatticeTenantSummaryDataAdmin(
    db: FirebaseFirestore.Firestore,
): Promise<{ tenants: Record<string, any>; updatedAt?: unknown; readDocs: number }> {
    const collection = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY);
    const [legacySnapshot, shardSnapshot] = await Promise.all([
        collection.doc(ANSWERLATTICE_TENANT_SUMMARY_DOC_ID).get(),
        collection
            .where('summaryType', '==', ANSWERLATTICE_TENANT_SUMMARY_SHARD_TYPE)
            .limit(ANSWERLATTICE_TENANT_SUMMARY_SHARD_COUNT)
            .get(),
    ]);
    const documents = [
        ...(legacySnapshot.exists ? [legacySnapshot.data() || {}] : []),
        ...shardSnapshot.docs.map((document) => document.data()),
    ];
    const tenants: Record<string, any> = {};
    let updatedAt: unknown;
    documents.forEach((document) => {
        if (document.tenants && typeof document.tenants === 'object' && !Array.isArray(document.tenants)) {
            Object.assign(tenants, document.tenants);
        }
        if (timestampMillis(document.updatedAt) > timestampMillis(updatedAt)) updatedAt = document.updatedAt;
    });
    return {
        tenants,
        updatedAt,
        readDocs: (legacySnapshot.exists ? 1 : 0) + shardSnapshot.size,
    };
}

type AnswerlatticeTenantSummaryWriteParams = {
    tId: number;
    sId: number;
    source: string;
    active?: boolean;
    hasEntities?: boolean;
    timeZone?: string;
    businessDayEndTime?: string;
    schedulerHour?: number;
};

export function appendAnswerlatticeTenantSummaryAdmin(
    writer: WriteBatch | Transaction,
    params: AnswerlatticeTenantSummaryWriteParams,
): { skipped: boolean } {
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
        source: params.source,
        lastSeenAt: now,
        updatedAt: now,
    };
    if (params.active !== undefined) entry.active = params.active;
    if (params.hasEntities !== undefined) entry.hasEntities = params.hasEntities;
    if (params.timeZone) entry.timeZone = String(params.timeZone).slice(0, 80);
    if (params.businessDayEndTime) entry.businessDayEndTime = String(params.businessDayEndTime).slice(0, 5);
    if (Number.isInteger(params.schedulerHour) && Number(params.schedulerHour) >= 0 && Number(params.schedulerHour) <= 23) {
        entry.schedulerHour = Number(params.schedulerHour);
    }

    const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(
        getAnswerlatticeTenantSummaryShardId(scope.tId, scope.sId),
    );
    const summaryData = {
        summaryType: ANSWERLATTICE_TENANT_SUMMARY_SHARD_TYPE,
        shardVersion: 1,
        tenants: {
            [key]: entry,
        },
        updatedAt: now,
    };

    if ('commit' in writer) {
        writer.set(summaryRef, summaryData, { merge: true });
    } else {
        writer.set(summaryRef, summaryData, { merge: true });
    }

    return { skipped: false };
}

export async function upsertAnswerlatticeTenantSummaryAdmin(
    params: AnswerlatticeTenantSummaryWriteParams,
): Promise<{ skipped: boolean }> {
    const db = answerlatticeFirestoreAdmin as any;
    if (!db || typeof db.collection !== 'function') {
        return { skipped: true };
    }
    const batch = db.batch();
    const result = appendAnswerlatticeTenantSummaryAdmin(batch, params);
    if (result.skipped) return result;
    await batch.commit();
    return result;
}

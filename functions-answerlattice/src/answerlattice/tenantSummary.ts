import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';
import { parseExactAnswerlatticeScope, parseStoredAnswerlatticeScope } from './scopeBoundary';

export const ANSWERLATTICE_TENANT_SUMMARY_DOC_ID = 'answerlatticeTenantsSummary';
export const ANSWERLATTICE_TENANT_SUMMARY_SHARD_COUNT = 64;
export const ANSWERLATTICE_TENANT_SUMMARY_SHARD_PREFIX = 'answerlatticeTenantsSummaryShard_';
export const ANSWERLATTICE_TENANT_SUMMARY_SHARD_TYPE = 'answerlattice_tenant_registry_shard';

export interface AnswerlatticeTenantStore {
    tId: number;
    sId: number;
    timeZone?: string;
    businessDayEndTime?: string;
    schedulerHour?: number;
}

export interface AnswerlatticeTenantSummaryEntry extends AnswerlatticeTenantStore {
    pId: 'AL';
    active?: boolean;
    hasEntities?: boolean;
    source: string;
    createdAt?: Timestamp;
    lastSeenAt: Timestamp;
    updatedAt: Timestamp;
}

function normalizeOptionalString(value: unknown, maxLength: number): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed.slice(0, maxLength) : undefined;
}

function normalizeOptionalHour(value: unknown): number | undefined {
    const hour = Number(value);
    return Number.isInteger(hour) && hour >= 0 && hour <= 23 ? hour : undefined;
}

export function getAnswerlatticeTenantSummaryKey(tId: number, sId: number): string {
    const scope = parseExactAnswerlatticeScope(tId, sId);
    if (!scope) {
        throw new Error('Cannot build Answerlattice tenant summary key without valid tId and sId.');
    }
    return `${scope.tId}_${scope.sId}`;
}

export function getAnswerlatticeTenantSummaryShardId(tId: number, sId: number): string {
    const key = getAnswerlatticeTenantSummaryKey(tId, sId);
    let hash = 2166136261;
    for (let index = 0; index < key.length; index += 1) {
        hash ^= key.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    const foldedHash = ((hash >>> 0) ^ (hash >>> 16)) >>> 0;
    const shard = foldedHash % ANSWERLATTICE_TENANT_SUMMARY_SHARD_COUNT;
    return `${ANSWERLATTICE_TENANT_SUMMARY_SHARD_PREFIX}${String(shard).padStart(2, '0')}`;
}

function mergeAnswerlatticeTenantSummaryDocuments(
    documents: Array<Record<string, any> | undefined>,
): Record<string, any> {
    return documents.reduce<Record<string, any>>((merged, document) => {
        const tenants = document?.tenants;
        if (tenants && typeof tenants === 'object' && !Array.isArray(tenants)) {
            Object.assign(merged, tenants);
        }
        return merged;
    }, {});
}

export async function readAnswerlatticeTenantSummaryRegistry(
    db: Firestore,
): Promise<{ tenants: AnswerlatticeTenantStore[]; readDocs: number }> {
    const summaryCollection = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY);
    const [legacySnapshot, shardSnapshot] = await Promise.all([
        summaryCollection.doc(ANSWERLATTICE_TENANT_SUMMARY_DOC_ID).get(),
        summaryCollection
            .where('summaryType', '==', ANSWERLATTICE_TENANT_SUMMARY_SHARD_TYPE)
            .limit(ANSWERLATTICE_TENANT_SUMMARY_SHARD_COUNT)
            .get(),
    ]);
    const documents = [
        legacySnapshot.exists ? legacySnapshot.data() : undefined,
        ...shardSnapshot.docs.map((document) => document.data()),
    ];
    const tenants = parseAnswerlatticeTenantSummary({
        tenants: mergeAnswerlatticeTenantSummaryDocuments(documents),
    });
    return {
        tenants,
        readDocs: (legacySnapshot.exists ? 1 : 0) + shardSnapshot.size,
    };
}

export function parseAnswerlatticeTenantSummary(data: Record<string, any> | undefined): AnswerlatticeTenantStore[] {
    const tenants = data?.tenants;
    if (!tenants || typeof tenants !== 'object' || Array.isArray(tenants)) return [];

    const result: AnswerlatticeTenantStore[] = [];
    for (const [key, entry] of Object.entries(tenants) as Array<[string, Record<string, any>]>) {
        if (!entry || entry.pId !== 'AL' || entry.active !== true || entry.hasEntities !== true) continue;
        const scope = parseStoredAnswerlatticeScope(entry.tId, entry.sId);
        if (!scope || key !== `${scope.tId}_${scope.sId}`) continue;
        result.push({
            ...scope,
            timeZone: normalizeOptionalString(entry.timeZone, 80),
            businessDayEndTime: normalizeOptionalString(entry.businessDayEndTime, 5),
            schedulerHour: normalizeOptionalHour(entry.schedulerHour),
        });
    }

    return result;
}

export async function upsertAnswerlatticeTenantSummary(
    db: Firestore,
    tId: number,
    sId: number,
    options: { source: string; active?: boolean; hasEntities?: boolean }
): Promise<void> {
    const scope = parseExactAnswerlatticeScope(tId, sId);
    if (!scope) {
        throw new Error('Cannot update Answerlattice tenant summary without valid tId and sId.');
    }

    const now = Timestamp.now();
    const key = getAnswerlatticeTenantSummaryKey(scope.tId, scope.sId);
    const entry: AnswerlatticeTenantSummaryEntry = {
        pId: 'AL',
        ...scope,
        source: options.source,
        lastSeenAt: now,
        updatedAt: now,
    };
    if (options.active !== undefined) entry.active = options.active;
    if (options.hasEntities !== undefined) entry.hasEntities = options.hasEntities;

    const sourceOptions = options as typeof options & Pick<AnswerlatticeTenantStore, 'timeZone' | 'businessDayEndTime' | 'schedulerHour'>;
    const timeZone = normalizeOptionalString(sourceOptions.timeZone, 80);
    const businessDayEndTime = normalizeOptionalString(sourceOptions.businessDayEndTime, 5);
    const schedulerHour = normalizeOptionalHour(sourceOptions.schedulerHour);
    if (timeZone) entry.timeZone = timeZone;
    if (businessDayEndTime) entry.businessDayEndTime = businessDayEndTime;
    if (schedulerHour !== undefined) entry.schedulerHour = schedulerHour;

    await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(
        getAnswerlatticeTenantSummaryShardId(scope.tId, scope.sId),
    ).set({
        summaryType: ANSWERLATTICE_TENANT_SUMMARY_SHARD_TYPE,
        shardVersion: 1,
        tenants: {
            [key]: entry,
        },
        updatedAt: now,
    }, { merge: true });
}

export async function upsertAnswerlatticeTenantSummaryEntries(
    db: Firestore,
    tenants: AnswerlatticeTenantStore[],
    options: { source: string; active?: boolean; hasEntities?: boolean }
): Promise<void> {
    if (tenants.length === 0) return;

    const now = Timestamp.now();
    const entriesByShard = new Map<string, Record<string, AnswerlatticeTenantSummaryEntry>>();
    for (const tenant of tenants) {
        const scope = parseExactAnswerlatticeScope(tenant.tId, tenant.sId);
        if (!scope) continue;
        const sourceTenant = tenant as AnswerlatticeTenantStore;
        const entry: AnswerlatticeTenantSummaryEntry = {
            pId: 'AL',
            ...scope,
            source: options.source,
            lastSeenAt: now,
            updatedAt: now,
        };
        if (options.active !== undefined) entry.active = options.active;
        if (options.hasEntities !== undefined) entry.hasEntities = options.hasEntities;
        const timeZone = normalizeOptionalString(sourceTenant.timeZone, 80);
        const businessDayEndTime = normalizeOptionalString(sourceTenant.businessDayEndTime, 5);
        const schedulerHour = normalizeOptionalHour(sourceTenant.schedulerHour);
        if (timeZone) entry.timeZone = timeZone;
        if (businessDayEndTime) entry.businessDayEndTime = businessDayEndTime;
        if (schedulerHour !== undefined) entry.schedulerHour = schedulerHour;
        const shardId = getAnswerlatticeTenantSummaryShardId(scope.tId, scope.sId);
        const entries = entriesByShard.get(shardId) || {};
        entries[getAnswerlatticeTenantSummaryKey(scope.tId, scope.sId)] = entry;
        entriesByShard.set(shardId, entries);
    }

    if (entriesByShard.size === 0) return;

    const batch = db.batch();
    entriesByShard.forEach((entries, shardId) => {
        batch.set(db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(shardId), {
            summaryType: ANSWERLATTICE_TENANT_SUMMARY_SHARD_TYPE,
            shardVersion: 1,
            tenants: entries,
            updatedAt: now,
        }, { merge: true });
    });
    await batch.commit();
}

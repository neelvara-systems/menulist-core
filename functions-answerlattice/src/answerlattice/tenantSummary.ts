import { Firestore, Timestamp } from 'firebase-admin/firestore';
import { DB_COLLECTIONS } from '../constants/database';

export const ANSWERLATTICE_TENANT_SUMMARY_DOC_ID = 'answerlatticeTenantsSummary';

export interface AnswerlatticeTenantStore {
    tId: number;
    sId: number;
    timeZone?: string;
    businessDayEndTime?: string;
    schedulerHour?: number;
}

export interface AnswerlatticeTenantSummaryEntry extends AnswerlatticeTenantStore {
    pId: 'AL';
    active: boolean;
    hasEntities?: boolean;
    source: string;
    createdAt?: Timestamp;
    lastSeenAt: Timestamp;
    updatedAt: Timestamp;
}

function normalizeTenantStore(tId: number | string, sId: number | string): AnswerlatticeTenantStore | null {
    const tenantId = Number(tId);
    const storeId = Number(sId);
    if (!Number.isFinite(tenantId) || tenantId <= 0 || !Number.isFinite(storeId) || storeId <= 0) {
        return null;
    }
    return { tId: tenantId, sId: storeId };
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

export function getAnswerlatticeTenantSummaryKey(tId: number | string, sId: number | string): string {
    const scope = normalizeTenantStore(tId, sId);
    if (!scope) {
        throw new Error('Cannot build Answerlattice tenant summary key without valid tId and sId.');
    }
    return `${scope.tId}_${scope.sId}`;
}

export function parseAnswerlatticeTenantSummary(data: Record<string, any> | undefined): AnswerlatticeTenantStore[] {
    const tenants = data?.tenants;
    if (!tenants || typeof tenants !== 'object' || Array.isArray(tenants)) return [];

    const result: AnswerlatticeTenantStore[] = [];
    for (const entry of Object.values(tenants) as Array<Record<string, any>>) {
        if (!entry || entry.active === false) continue;
        if (entry.hasEntities === false) continue;
        const scope = normalizeTenantStore(entry.tId, entry.sId);
        if (scope) {
            result.push({
                ...scope,
                timeZone: normalizeOptionalString(entry.timeZone, 80),
                businessDayEndTime: normalizeOptionalString(entry.businessDayEndTime, 5),
                schedulerHour: normalizeOptionalHour(entry.schedulerHour),
            });
        }
    }

    return result;
}

export async function upsertAnswerlatticeTenantSummary(
    db: Firestore,
    tId: number | string,
    sId: number | string,
    options: { source: string; active?: boolean; hasEntities?: boolean }
): Promise<void> {
    const scope = normalizeTenantStore(tId, sId);
    if (!scope) {
        throw new Error('Cannot update Answerlattice tenant summary without valid tId and sId.');
    }

    const now = Timestamp.now();
    const key = getAnswerlatticeTenantSummaryKey(scope.tId, scope.sId);
    const entry: AnswerlatticeTenantSummaryEntry = {
        pId: 'AL',
        ...scope,
        active: options.active !== false,
        hasEntities: options.hasEntities,
        source: options.source,
        lastSeenAt: now,
        updatedAt: now,
    };

    const sourceOptions = options as typeof options & Pick<AnswerlatticeTenantStore, 'timeZone' | 'businessDayEndTime' | 'schedulerHour'>;
    const timeZone = normalizeOptionalString(sourceOptions.timeZone, 80);
    const businessDayEndTime = normalizeOptionalString(sourceOptions.businessDayEndTime, 5);
    const schedulerHour = normalizeOptionalHour(sourceOptions.schedulerHour);
    if (timeZone) entry.timeZone = timeZone;
    if (businessDayEndTime) entry.businessDayEndTime = businessDayEndTime;
    if (schedulerHour !== undefined) entry.schedulerHour = schedulerHour;

    await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(ANSWERLATTICE_TENANT_SUMMARY_DOC_ID).set({
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
    const entries: Record<string, AnswerlatticeTenantSummaryEntry> = {};
    for (const tenant of tenants) {
        const scope = normalizeTenantStore(tenant.tId, tenant.sId);
        if (!scope) continue;
        const sourceTenant = tenant as AnswerlatticeTenantStore;
        const entry: AnswerlatticeTenantSummaryEntry = {
            pId: 'AL',
            ...scope,
            active: options.active !== false,
            hasEntities: options.hasEntities,
            source: options.source,
            lastSeenAt: now,
            updatedAt: now,
        };
        const timeZone = normalizeOptionalString(sourceTenant.timeZone, 80);
        const businessDayEndTime = normalizeOptionalString(sourceTenant.businessDayEndTime, 5);
        const schedulerHour = normalizeOptionalHour(sourceTenant.schedulerHour);
        if (timeZone) entry.timeZone = timeZone;
        if (businessDayEndTime) entry.businessDayEndTime = businessDayEndTime;
        if (schedulerHour !== undefined) entry.schedulerHour = schedulerHour;
        entries[getAnswerlatticeTenantSummaryKey(scope.tId, scope.sId)] = entry;
    }

    if (Object.keys(entries).length === 0) return;

    await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(ANSWERLATTICE_TENANT_SUMMARY_DOC_ID).set({
        tenants: entries,
        updatedAt: now,
    }, { merge: true });
}

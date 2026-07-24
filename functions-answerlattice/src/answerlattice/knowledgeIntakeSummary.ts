import { createHash } from 'crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';
import { type AnswerlatticeSchedulerReadObserver } from './schedulerReadTelemetry';

const MAX_JOBS_TO_SUMMARIZE = 20;
const ANSWERLATTICE_PRODUCT_ID = 'AL';
const JOB_STATUSES = new Set([
    'draft',
    'collecting',
    'reviewing',
    'publishing',
    'published',
    'failed',
    'cancelled',
]);
const ACTIVE_JOB_STATUSES = new Set(['draft', 'collecting', 'reviewing', 'publishing']);

type NormalizedIntakeJob = {
    id: string;
    title: string | null;
    status: string;
    sourceCount: number;
    readySourceCount: number;
    reviewItemCount: number;
    acceptedItemCount: number;
    publishedItemCount: number;
    rejectedItemCount: number;
    usageUnitsConsumed: number;
    publishedOnMs: number | null;
};

type IntakeSummaryResult = {
    jobsScanned: number;
    summaryWritten: boolean;
    activeJobs: number;
    reviewItems: number;
    readySources: number;
    usageUnitsConsumed: number;
    lastJobStatus: string | null;
    unchanged?: boolean;
};

function stableStringify(value: any): string {
    if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
    if (value && typeof value === 'object') {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(value);
}

function hashSummary(value: any): string {
    return createHash('sha256').update(stableStringify(value)).digest('hex');
}

function toMillis(value: any): number | null {
    if (!value) return null;
    if (typeof value.toMillis === 'function') return value.toMillis();
    if (typeof value.toDate === 'function') return value.toDate().getTime();
    if (typeof value.seconds === 'number') return value.seconds * 1000;
    if (value instanceof Date) return value.getTime();
    if (typeof value === 'number') return value;
    return null;
}

function readNonNegativeInteger(value: unknown, field: string, documentId: string): number {
    const normalized = value === undefined || value === null ? 0 : Number(value);
    if (!Number.isSafeInteger(normalized) || normalized < 0) {
        throw new Error(`Knowledge intake job ${documentId} has invalid ${field}.`);
    }
    return normalized;
}

function readNonNegativeNumber(value: unknown, field: string, documentId: string): number {
    const normalized = value === undefined || value === null ? 0 : Number(value);
    if (!Number.isFinite(normalized) || normalized < 0) {
        throw new Error(`Knowledge intake job ${documentId} has invalid ${field}.`);
    }
    return normalized;
}

function normalizeScopeId(value: unknown): number | null {
    if (typeof value !== 'string' && typeof value !== 'number') return null;
    const raw = String(value);
    if (!/^[1-9]\d*$/.test(raw)) return null;
    const normalized = Number(raw);
    return Number.isSafeInteger(normalized) && normalized > 0 && String(normalized) === raw
        ? normalized
        : null;
}

export function normalizeKnowledgeIntakeSummaryJob(
    documentId: string,
    data: FirebaseFirestore.DocumentData,
    scope: { tId: number; sId: number },
): NormalizedIntakeJob {
    const productId = data.pId;
    const tenantId = normalizeScopeId(data.tId);
    const storeId = normalizeScopeId(data.sId);
    const status = typeof data.status === 'string' ? data.status.trim() : '';

    if (
        productId !== ANSWERLATTICE_PRODUCT_ID
        || !Number.isSafeInteger(tenantId)
        || !Number.isSafeInteger(storeId)
        || tenantId !== scope.tId
        || storeId !== scope.sId
        || !JOB_STATUSES.has(status)
    ) {
        throw new Error(`Knowledge intake job ${documentId} has invalid identity or status.`);
    }

    const sourceCount = readNonNegativeInteger(data.sourceCount, 'sourceCount', documentId);
    const readySourceCount = readNonNegativeInteger(
        data.readySourceCount ?? data.sourceReadyCount ?? data.sourceCount,
        'readySourceCount',
        documentId,
    );
    if (readySourceCount > sourceCount) {
        throw new Error(`Knowledge intake job ${documentId} has inconsistent source counters.`);
    }

    return {
        id: documentId,
        title: typeof data.title === 'string' ? data.title.trim().slice(0, 120) || null : null,
        status,
        sourceCount,
        readySourceCount,
        reviewItemCount: readNonNegativeInteger(data.reviewItemCount, 'reviewItemCount', documentId),
        acceptedItemCount: readNonNegativeInteger(data.acceptedItemCount, 'acceptedItemCount', documentId),
        publishedItemCount: readNonNegativeInteger(data.publishedItemCount, 'publishedItemCount', documentId),
        rejectedItemCount: readNonNegativeInteger(data.rejectedItemCount, 'rejectedItemCount', documentId),
        usageUnitsConsumed: readNonNegativeNumber(data.usageUnitsConsumed, 'usageUnitsConsumed', documentId),
        publishedOnMs: toMillis(data.publishedOn),
    };
}

export async function syncKnowledgeIntakeSummary(
    tId: number,
    sId: number,
    readObserver?: AnswerlatticeSchedulerReadObserver,
): Promise<IntakeSummaryResult> {
    const result: IntakeSummaryResult = {
        jobsScanned: 0,
        summaryWritten: false,
        activeJobs: 0,
        reviewItems: 0,
        readySources: 0,
        usageUnitsConsumed: 0,
        lastJobStatus: null,
    };

    const jobsSnap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS)
        .where('pId', '==', ANSWERLATTICE_PRODUCT_ID)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .orderBy('modifiedOn', 'desc')
        .limit(MAX_JOBS_TO_SUMMARIZE)
        .get();
    readObserver?.record({
        source: DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS,
        window: 'recent_all',
        documentsReturned: jobsSnap.size,
        queryLimit: MAX_JOBS_TO_SUMMARIZE,
        saturated: jobsSnap.size >= MAX_JOBS_TO_SUMMARIZE,
    });

    result.jobsScanned = jobsSnap.size;
    const jobs = jobsSnap.docs.map(doc => normalizeKnowledgeIntakeSummaryJob(
        doc.id,
        doc.data(),
        { tId, sId },
    ));
    const latestJob = jobs[0] || null;
    result.lastJobStatus = latestJob?.status || null;

    let acceptedItems = 0;
    let publishedItems = 0;
    let rejectedItems = 0;
    let sourceCount = 0;
    let lastPublishedAtMs = 0;

    for (const job of jobs) {
        if (ACTIVE_JOB_STATUSES.has(job.status)) result.activeJobs++;
        sourceCount += job.sourceCount;
        result.readySources += job.readySourceCount;
        result.reviewItems += job.reviewItemCount;
        acceptedItems += job.acceptedItemCount;
        publishedItems += job.publishedItemCount;
        rejectedItems += job.rejectedItemCount;
        result.usageUnitsConsumed += job.usageUnitsConsumed;
        lastPublishedAtMs = Math.max(lastPublishedAtMs, job.publishedOnMs || 0);
    }

    const activeJob = jobs.find(job => ACTIVE_JOB_STATUSES.has(job.status)) || null;
    const summaryPayload = {
        schemaVersion: 1,
        pId: 'AL',
        tId,
        sId,
        activeJobId: activeJob?.id || null,
        activeJobTitle: activeJob?.title || null,
        activeJobs: result.activeJobs,
        recentJobs: jobs.length,
        sourceCount,
        readySources: result.readySources,
        reviewItems: result.reviewItems,
        acceptedItems,
        publishedItems,
        rejectedItems,
        usageUnitsConsumed: result.usageUnitsConsumed,
        lastJobStatus: result.lastJobStatus,
        lastPublishedAt: lastPublishedAtMs > 0 ? Timestamp.fromMillis(lastPublishedAtMs) : null,
    };
    const summaryHash = hashSummary(summaryPayload);
    const summaryRef = db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(`knowledgeIntakeSummary_${tId}_${sId}`);
    const existingSnap = await summaryRef.get();
    if (existingSnap.exists && existingSnap.data()?.summaryHash === summaryHash) {
        result.unchanged = true;
        return result;
    }

    await summaryRef.set({
        ...summaryPayload,
        latestJobStatus: FieldValue.delete(),
        summaryHash,
        lastUpdated: Timestamp.now(),
        summarySource: 'answerlattice_nightly',
    }, { merge: true });

    result.summaryWritten = true;
    logger.info('[Answerlattice Intake] Summary synced', {
        tId,
        sId,
        jobsScanned: result.jobsScanned,
        activeJobs: result.activeJobs,
        reviewItems: result.reviewItems,
        usageUnitsConsumed: result.usageUnitsConsumed,
    });
    return result;
}

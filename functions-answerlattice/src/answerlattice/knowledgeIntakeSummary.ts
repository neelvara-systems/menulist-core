import { createHash } from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import * as logger from 'firebase-functions/logger';
import { DB_COLLECTIONS } from '../constants/database';
import { firestoreAdmin as db } from '../firebaseAdmin';

const MAX_JOBS_TO_SUMMARIZE = 20;
const ACTIVE_JOB_STATUSES = new Set(['draft', 'collecting', 'reviewing', 'publishing']);

type IntakeSummaryResult = {
    jobsScanned: number;
    summaryWritten: boolean;
    activeJobs: number;
    reviewItems: number;
    readySources: number;
    usageUnitsConsumed: number;
    latestJobStatus: string | null;
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

export async function syncKnowledgeIntakeSummary(tId: number, sId: number): Promise<IntakeSummaryResult> {
    const result: IntakeSummaryResult = {
        jobsScanned: 0,
        summaryWritten: false,
        activeJobs: 0,
        reviewItems: 0,
        readySources: 0,
        usageUnitsConsumed: 0,
        latestJobStatus: null,
    };

    const jobsSnap = await db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS)
        .where('tId', '==', tId)
        .where('sId', '==', sId)
        .orderBy('modifiedOn', 'desc')
        .limit(MAX_JOBS_TO_SUMMARIZE)
        .get();

    result.jobsScanned = jobsSnap.size;
    if (jobsSnap.empty) return result;

    const jobs = jobsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Array<Record<string, any>>;
    const latestJob = jobs[0];
    result.latestJobStatus = typeof latestJob.status === 'string' ? latestJob.status : null;

    let acceptedItems = 0;
    let publishedItems = 0;
    let rejectedItems = 0;
    let sourceCount = 0;
    let lastPublishedAtMs = 0;

    for (const job of jobs) {
        const status = String(job.status || '');
        if (ACTIVE_JOB_STATUSES.has(status)) result.activeJobs++;
        sourceCount += Number(job.sourceCount || 0);
        result.readySources += Number(job.readySourceCount ?? job.sourceReadyCount ?? job.sourceCount ?? 0);
        result.reviewItems += Number(job.reviewItemCount || 0);
        acceptedItems += Number(job.acceptedItemCount || 0);
        publishedItems += Number(job.publishedItemCount || 0);
        rejectedItems += Number(job.rejectedItemCount || 0);
        result.usageUnitsConsumed += Number(job.usageUnitsConsumed || 0);
        lastPublishedAtMs = Math.max(lastPublishedAtMs, toMillis(job.publishedOn) || 0);
    }

    const activeJob = jobs.find(job => ACTIVE_JOB_STATUSES.has(String(job.status || ''))) || latestJob;
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
        latestJobStatus: result.latestJobStatus,
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

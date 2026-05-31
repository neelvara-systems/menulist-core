export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { secureError } from '@lib/security/secureLogger';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPlatformAuth } from '../../../../middleware/auth';

const TENANT_SUMMARY_DOC_ID = 'answerlatticeTenantsSummary';
const SCHEDULER_LOG_LIMIT = 8;

const QuerySchema = z.object({
    limit: z.coerce.number().int().min(5).max(25).optional().default(10),
    tId: z.coerce.number().int().positive().optional(),
    sId: z.coerce.number().int().positive().optional(),
}).refine((value) => {
    const hasTenant = value.tId !== undefined;
    const hasStore = value.sId !== undefined;
    return hasTenant === hasStore;
}, { message: 'tId and sId must be provided together.' });

const TriggerSchema = z.object({
    action: z.literal('trigger-nightly'),
    tId: z.coerce.number().int().positive(),
    sId: z.coerce.number().int().positive(),
});

const ACTIVE_JOB_STATUSES = new Set(['draft', 'collecting', 'reviewing', 'publishing']);

type TenantOption = {
    key: string;
    tId: number;
    sId: number;
    active: boolean;
    hasEntities?: boolean;
    source?: string | null;
    timeZone?: string | null;
    businessDayEndTime?: string | null;
    schedulerHour?: number | null;
    lastSeenAt?: string | null;
    updatedAt?: string | null;
};

function toIso(value: any): string | null {
    if (!value) return null;
    try {
        if (typeof value.toDate === 'function') return value.toDate().toISOString();
        if (typeof value.seconds === 'number') return new Date(value.seconds * 1000).toISOString();
        if (value instanceof Date) return value.toISOString();
        if (typeof value === 'string' || typeof value === 'number') {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? null : date.toISOString();
        }
    } catch {
        return null;
    }
    return null;
}

function cleanText(value: unknown, max = 220): string {
    return String(value || '')
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, max);
}

function safeNumber(value: unknown): number {
    const parsed = Number(value || 0);
    return Number.isFinite(parsed) ? parsed : 0;
}

function scopeKey(tId: number, sId: number) {
    return `${tId}_${sId}`;
}

function parseTenantOptions(data: Record<string, any> | undefined): TenantOption[] {
    const tenants = data?.tenants;
    if (!tenants || typeof tenants !== 'object' || Array.isArray(tenants)) return [];

    const result: TenantOption[] = [];
    for (const [key, value] of Object.entries(tenants)) {
        const item = value && typeof value === 'object' ? value as Record<string, any> : {};
        const tId = safeNumber(item.tId);
        const sId = safeNumber(item.sId);
        if (!Number.isInteger(tId) || tId <= 0 || !Number.isInteger(sId) || sId <= 0) continue;
        result.push({
            key: key || scopeKey(tId, sId),
            tId,
            sId,
            active: item.active !== false,
            hasEntities: typeof item.hasEntities === 'boolean' ? item.hasEntities : undefined,
            source: cleanText(item.source, 120) || null,
            timeZone: cleanText(item.timeZone, 80) || null,
            businessDayEndTime: cleanText(item.businessDayEndTime, 5) || null,
            schedulerHour: Number.isInteger(Number(item.schedulerHour)) ? Number(item.schedulerHour) : null,
            lastSeenAt: toIso(item.lastSeenAt),
            updatedAt: toIso(item.updatedAt),
        });
    }
    return result.sort((a, b) => `${a.tId}/${a.sId}`.localeCompare(`${b.tId}/${b.sId}`));
}

function serializeJob(doc: FirebaseFirestore.QueryDocumentSnapshot) {
    const data = doc.data() || {};
    return {
        id: doc.id,
        tId: safeNumber(data.tId),
        sId: safeNumber(data.sId),
        title: cleanText(data.title || doc.id),
        status: cleanText(data.status, 80) || 'unknown',
        sourceCount: safeNumber(data.sourceCount),
        readySourceCount: safeNumber(data.readySourceCount ?? data.sourceReadyCount ?? data.sourceCount),
        reviewItemCount: safeNumber(data.reviewItemCount),
        acceptedItemCount: safeNumber(data.acceptedItemCount),
        publishedItemCount: safeNumber(data.publishedItemCount),
        rejectedItemCount: safeNumber(data.rejectedItemCount),
        usageUnitsConsumed: safeNumber(data.usageUnitsConsumed),
        lastAnalyzedAt: toIso(data.lastAnalyzedAt),
        publishedOn: toIso(data.publishedOn),
        createdOn: toIso(data.createdOn),
        modifiedOn: toIso(data.modifiedOn),
        errorMessage: cleanText(data.errorMessage, 320) || null,
    };
}

function serializeLedger(doc: FirebaseFirestore.QueryDocumentSnapshot) {
    const data = doc.data() || {};
    return {
        id: doc.id,
        tId: safeNumber(data.tId),
        sId: safeNumber(data.sId),
        jobId: cleanText(data.jobId, 160) || null,
        sourceId: cleanText(data.sourceId, 160) || null,
        action: cleanText(data.action, 120) || 'unknown',
        status: cleanText(data.status, 80) || 'unknown',
        provider: cleanText(data.provider, 80) || null,
        model: cleanText(data.model, 120) || null,
        fileName: cleanText(data.fileName, 180) || null,
        mimeType: cleanText(data.mimeType, 120) || null,
        byteSize: safeNumber(data.byteSize),
        unitsReserved: safeNumber(data.unitsReserved),
        unitsCharged: safeNumber(data.unitsCharged),
        chargedMonthlyCredits: safeNumber(data.chargedMonthlyCredits),
        chargedTopUpCredits: safeNumber(data.chargedTopUpCredits),
        createdOn: toIso(data.createdOn),
        settledOn: toIso(data.settledOn),
        refundedOn: toIso(data.refundedOn),
        errorMessage: cleanText(data.errorMessage, 320) || null,
    };
}

function findTenantRun(data: Record<string, any>, selectedScope: { tId: number; sId: number } | null) {
    if (!selectedScope || !Array.isArray(data.tenantRuns)) return null;
    const run = data.tenantRuns.find((item: any) =>
        Number(item?.tId) === selectedScope.tId && Number(item?.sId) === selectedScope.sId,
    );
    if (!run || typeof run !== 'object') return null;
    return {
        tId: selectedScope.tId,
        sId: selectedScope.sId,
        status: cleanText(run.status, 80) || 'unknown',
        durationMs: safeNumber(run.durationMs),
        taskCount: Array.isArray(run.tasks) ? run.tasks.length : 0,
        errorCount: Array.isArray(run.errors) ? run.errors.length : 0,
        driftDetected: safeNumber(run.driftDetected),
        proposalsCreated: safeNumber(run.proposalsCreated),
        coverageRate: safeNumber(run.coverageRate),
    };
}

function serializeSchedulerRun(doc: FirebaseFirestore.QueryDocumentSnapshot, selectedScope: { tId: number; sId: number } | null) {
    const data = doc.data() || {};
    const totals = data.totals || {};
    const metadata = data.metadata || {};
    return {
        id: doc.id,
        runLogId: cleanText(data.runLogId || doc.id, 160),
        status: cleanText(data.status, 80) || 'unknown',
        trigger: cleanText(data.trigger, 80) || 'unknown',
        tenantsProcessed: safeNumber(data.tenantsProcessed),
        durationMs: safeNumber(data.durationMs),
        startedAt: toIso(data.startedAt),
        updatedAt: toIso(data.updatedAt),
        knowledgeIntakeJobsScanned: safeNumber(totals.knowledgeIntakeJobsScanned),
        knowledgeIntakeSummaryWritten: safeNumber(totals.knowledgeIntakeSummaryWritten),
        knowledgeIntakeUsageUnits: safeNumber(totals.knowledgeIntakeUsageUnits),
        knowledgeIntakeSchedulerEnabled: Boolean(metadata.knowledgeIntakeSchedulerEnabled),
        selectedTenantRun: findTenantRun(data, selectedScope),
        errorCount: Array.isArray(data.errorMessages) ? data.errorMessages.length : 0,
        errorMessages: Array.isArray(data.errorMessages)
            ? data.errorMessages.slice(0, 5).map((item: unknown) => cleanText(item, 220)).filter(Boolean)
            : [],
    };
}

function buildEmptyStats(latestSchedulerRun: any) {
    return {
        recentJobs: 0,
        activeJobs: 0,
        failedJobs: 0,
        readySources: 0,
        reviewItems: 0,
        acceptedItems: 0,
        publishedItems: 0,
        usageUnitsConsumed: 0,
        ledgerRows: 0,
        ledgerReservedUnits: 0,
        ledgerChargedUnits: 0,
        ledgerRefundedUnits: 0,
        mediaExtractions: 0,
        latestSchedulerRun,
    };
}

async function loadTenantOptions(db: FirebaseFirestore.Firestore) {
    const summarySnap = await db.collection(DB_COLLECTIONS.PLATFORM_SUMMARY).doc(TENANT_SUMMARY_DOC_ID).get();
    return {
        tenants: parseTenantOptions(summarySnap.data()),
        tenantSummaryUpdatedAt: toIso(summarySnap.data()?.updatedAt),
    };
}

function getManualTriggerUrl() {
    const explicitUrl = process.env.ANSWERLATTICE_TRIGGER_NIGHTLY_URL || process.env.ANSWERLATTICE_NIGHTLY_TRIGGER_URL;
    if (explicitUrl) return explicitUrl;
    const projectId = process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID;
    return projectId ? `https://us-central1-${projectId}.cloudfunctions.net/triggerAnswerlatticeNightly` : '';
}

export const GET = withPlatformAuth(async (request: NextRequest) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_PLATFORM_MONITOR) {
        return NextResponse.json({ error: 'Answerlattice intake monitor is disabled.' }, { status: 404 });
    }

    const validation = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!validation.success) {
        return NextResponse.json({ error: 'Invalid query', details: validation.error.flatten() }, { status: 400 });
    }

    const db = answerlatticeFirestoreAdmin as FirebaseFirestore.Firestore;
    if (!db || typeof (db as any).collection !== 'function') {
        return NextResponse.json({ error: 'Answerlattice Firebase is not configured.' }, { status: 503 });
    }

    const { limit, tId, sId } = validation.data;
    const selectedScope = tId && sId ? { tId, sId } : null;

    try {
        const [tenantSummary, schedulerSnap] = await Promise.all([
            loadTenantOptions(db),
            db.collection(DB_COLLECTIONS.ANSWERLATTICE_SCHEDULER_RUN_LOGS)
                .orderBy('startedAt', 'desc')
                .limit(SCHEDULER_LOG_LIMIT)
                .get(),
        ]);

        const selectedTenant = selectedScope
            ? tenantSummary.tenants.find(item => item.tId === selectedScope.tId && item.sId === selectedScope.sId)
            : null;
        if (selectedScope && !selectedTenant) {
            return NextResponse.json({ error: 'Selected Answerlattice workspace is not present in answerlatticeTenantsSummary.' }, { status: 404 });
        }

        const schedulerRuns = schedulerSnap.docs.map(doc => serializeSchedulerRun(doc, selectedScope));
        const latestSchedulerRun = schedulerRuns[0] || null;

        let jobs: ReturnType<typeof serializeJob>[] = [];
        let ledger: ReturnType<typeof serializeLedger>[] = [];

        if (selectedScope) {
            const [jobsSnap, ledgerSnap] = await Promise.all([
                db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS)
                    .where('tId', '==', selectedScope.tId)
                    .where('sId', '==', selectedScope.sId)
                    .orderBy('modifiedOn', 'desc')
                    .limit(limit)
                    .get(),
                db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_USAGE_LEDGER)
                    .where('tId', '==', selectedScope.tId)
                    .where('sId', '==', selectedScope.sId)
                    .orderBy('createdOn', 'desc')
                    .limit(limit)
                    .get(),
            ]);

            jobs = jobsSnap.docs.map(serializeJob);
            ledger = ledgerSnap.docs.map(serializeLedger);
        }

        const failedJobs = jobs.filter(job => job.status === 'failed');
        const activeJobs = jobs.filter(job => ACTIVE_JOB_STATUSES.has(job.status));
        const stats = selectedScope
            ? {
                recentJobs: jobs.length,
                activeJobs: activeJobs.length,
                failedJobs: failedJobs.length,
                readySources: jobs.reduce((sum, job) => sum + job.readySourceCount, 0),
                reviewItems: jobs.reduce((sum, job) => sum + job.reviewItemCount, 0),
                acceptedItems: jobs.reduce((sum, job) => sum + job.acceptedItemCount, 0),
                publishedItems: jobs.reduce((sum, job) => sum + job.publishedItemCount, 0),
                usageUnitsConsumed: jobs.reduce((sum, job) => sum + job.usageUnitsConsumed, 0),
                ledgerRows: ledger.length,
                ledgerReservedUnits: ledger.reduce((sum, row) => sum + row.unitsReserved, 0),
                ledgerChargedUnits: ledger.reduce((sum, row) => sum + row.unitsCharged, 0),
                ledgerRefundedUnits: ledger
                    .filter(row => row.status === 'refunded' || row.status === 'failed_refunded')
                    .reduce((sum, row) => sum + row.unitsReserved, 0),
                mediaExtractions: ledger.filter(row => row.action.toLowerCase().includes('ocr') || row.action.toLowerCase().includes('transcription')).length,
                latestSchedulerRun,
            }
            : buildEmptyStats(latestSchedulerRun);

        const selectedTenantRun = latestSchedulerRun?.selectedTenantRun || null;
        const warnings = [
            ...(!selectedScope ? ['Select an Answerlattice workspace to load job and usage-ledger details.'] : []),
            ...(failedJobs.length ? [`${failedJobs.length} selected-workspace intake job${failedJobs.length === 1 ? '' : 's'} failed.`] : []),
            ...(ledger.some(row => row.status === 'reserved') ? ['Some selected-workspace intake credit reservations are not settled yet.'] : []),
            ...(selectedTenantRun?.errorCount ? ['Latest run for the selected workspace recorded errors.'] : []),
            ...(!selectedScope && latestSchedulerRun && latestSchedulerRun.errorCount > 0 ? ['Latest Answerlattice scheduler run recorded errors. Select a workspace before retrying.'] : []),
            ...(!latestSchedulerRun?.knowledgeIntakeSchedulerEnabled ? ['Knowledge intake summary task is not enabled in the latest scheduler metadata.'] : []),
        ];

        return NextResponse.json({
            tenants: tenantSummary.tenants,
            tenantSummaryUpdatedAt: tenantSummary.tenantSummaryUpdatedAt,
            selectedTenant: selectedTenant || null,
            stats,
            jobs,
            ledger,
            schedulerRuns,
            warnings,
            costModel: {
                readPattern: selectedScope
                    ? `Selected workspace refresh reads 1 tenant summary, up to ${limit} intake jobs, up to ${limit} usage-ledger rows, and ${SCHEDULER_LOG_LIMIT} scheduler logs.`
                    : `Initial refresh reads 1 tenant summary and ${SCHEDULER_LOG_LIMIT} scheduler logs only. No intake job or ledger rows are read until a workspace is selected.`,
                realtime: false,
                writes: false,
            },
        });
    } catch (error) {
        secureError('[Answerlattice Intake Monitor] Failed to load snapshot', error as Error, {
            endpoint: request.nextUrl.pathname,
        });
        return NextResponse.json({ error: 'Failed to load Answerlattice intake monitor.' }, { status: 500 });
    }
});

export const POST = withPlatformAuth(async (request: NextRequest) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_PLATFORM_MONITOR) {
        return NextResponse.json({ error: 'Answerlattice intake monitor is disabled.' }, { status: 404 });
    }

    const body = await request.json().catch(() => null);
    const validation = TriggerSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json({ error: 'Invalid manual trigger payload', details: validation.error.flatten() }, { status: 400 });
    }

    const db = answerlatticeFirestoreAdmin as FirebaseFirestore.Firestore;
    if (!db || typeof (db as any).collection !== 'function') {
        return NextResponse.json({ error: 'Answerlattice Firebase is not configured.' }, { status: 503 });
    }

    const { tId, sId } = validation.data;
    const secret = process.env.ANSWERLATTICE_CRON_SECRET || process.env.CRON_SECRET;
    const triggerUrl = getManualTriggerUrl();
    if (!secret || !triggerUrl) {
        return NextResponse.json({ error: 'Answerlattice manual scheduler trigger is not configured.' }, { status: 503 });
    }

    try {
        const { tenants } = await loadTenantOptions(db);
        const selectedTenant = tenants.find(item => item.tId === tId && item.sId === sId);
        if (!selectedTenant) {
            return NextResponse.json({ error: 'Selected Answerlattice workspace is not present in answerlatticeTenantsSummary.' }, { status: 404 });
        }

        const response = await fetch(triggerUrl, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${secret}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tId, sId }),
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            return NextResponse.json({
                error: result?.error || 'Answerlattice nightly retry failed.',
                result,
            }, { status: response.status });
        }

        return NextResponse.json({
            success: true,
            scope: { tId, sId },
            result,
            costModel: {
                readPattern: 'Manual retry first reads answerlatticeTenantsSummary once, then runs Answerlattice nightly for the selected workspace only.',
                realtime: false,
                writes: true,
            },
        });
    } catch (error) {
        secureError('[Answerlattice Intake Monitor] Manual nightly retry failed', error as Error, {
            tId,
            sId,
        });
        return NextResponse.json({ error: 'Failed to trigger selected Answerlattice nightly retry.' }, { status: 500 });
    }
});

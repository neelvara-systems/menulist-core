export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { DB_COLLECTIONS } from '@constant/database';
import { DEPLOYMENT_TARGETS } from '@constant/deploymentTargets';
import { getCurrentPlatformUser, resolveCurrentSessionUserDocumentId } from '@lib/auth/currentPlatformUser';
import { PRODUCT_IDS } from '@constant/product';
import {
    ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS,
} from '@lib/answerlattice/accessControl';
import {
    getAnswerlatticeSecurityLogContext,
    getBoundedAnswerlatticeStringContext,
} from '@lib/answerlattice/diagnostics';
import { buildAnswerlatticeRateLimitKey } from '@lib/answerlattice/rateLimitKeys';
import { readAnswerlatticeTenantSummaryDataAdmin } from '@lib/answerlattice/tenantSummaryAdmin';
import { parseAnswerlatticeKnowledgeIntakeJob } from '@lib/answerlattice/knowledgeIntakeContracts';
import { normalizeAnswerlatticeIntakeUsageLedgerId } from '@lib/answerlattice/billingDocumentIdBoundary';
import { answerlatticeFirestoreAdmin } from '@lib/firebase/answerlatticeFirebaseAdmin';
import { logger } from '@lib/monitoring/logger';
import { checkRateLimit } from '@lib/rateLimit';
import { getRateLimitForFeature } from '@lib/rateLimit/configs';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { readJsonResponseWithLimit } from '@lib/security/boundedResponseBody';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { validateServerNetworkTargetUrl } from '@lib/security/serverNetworkTarget';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withPlatformAuth } from '../../../../middleware/auth';
import { getBoundedErrorName } from '@lib/monitoring/boundedLogContext';

const SCHEDULER_LOG_LIMIT = 8;
const SCHEDULER_READ_WINDOW_LIMIT = 80;
const ANSWERLATTICE_INTAKE_MONITOR_RATE_LIMIT_KEY = 'answerlattice-intake-monitor';
const ANSWERLATTICE_INTAKE_MANUAL_TRIGGER_RATE_LIMIT_KEY = 'answerlattice-intake-manual-trigger';

const QuerySchema = z.object({
    limit: z.coerce.number().int().min(5).max(25).optional().default(10),
    tId: z.coerce.number().int().positive().optional(),
    sId: z.coerce.number().int().positive().optional(),
}).strict().refine((value) => {
    const hasTenant = value.tId !== undefined;
    const hasStore = value.sId !== undefined;
    return hasTenant === hasStore;
}, { message: 'tId and sId must be provided together.' });

const TriggerSchema = z.object({
    action: z.literal('trigger-nightly'),
    tId: z.number().int().positive(),
    sId: z.number().int().positive(),
}).strict();
const ANSWERLATTICE_INTAKE_TRIGGER_MAX_BODY_BYTES = 2 * 1024;
const ANSWERLATTICE_MANUAL_TRIGGER_RESPONSE_MAX_BYTES = 512 * 1024;
const ANSWERLATTICE_MANUAL_TRIGGER_PATH = '/triggerAnswerlatticeNightly';
const ANSWERLATTICE_ALLOWED_PROJECT_IDS = new Set([
    DEPLOYMENT_TARGETS.preview.answerlattice.firebaseProjectId,
    DEPLOYMENT_TARGETS.production.answerlattice.firebaseProjectId,
]);
const ANSWERLATTICE_ALLOWED_MANUAL_TRIGGER_HOSTS = new Set(
    Array.from(ANSWERLATTICE_ALLOWED_PROJECT_IDS, projectId => `us-central1-${projectId}.cloudfunctions.net`),
);

const ACTIVE_JOB_STATUSES = new Set(['draft', 'collecting', 'reviewing', 'publishing']);

function privateJson(body: unknown, init: ResponseInit = {}) {
    const headers = new Headers(init.headers);
    Object.entries(ANSWERLATTICE_PRIVATE_RESPONSE_HEADERS).forEach(([name, value]) => {
        headers.set(name, value);
    });
    return NextResponse.json(body, { ...init, headers });
}

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

type ManualTriggerTaskSummary = {
    name: string;
    status: string;
    activity: boolean;
    durationMs: number | null;
};

type ManualTriggerResultSummary = {
    scheduler: string | null;
    runId: string | null;
    status: string;
    trigger: string | null;
    durationMs: number | null;
    taskCount: number;
    failedTaskCount: number;
    tasks: ManualTriggerTaskSummary[];
};

function toIso(value: unknown): string | null {
    if (!value) return null;
    try {
        const timestamp = value as { seconds?: unknown; toDate?: unknown };
        if (typeof timestamp.toDate === 'function') return (timestamp.toDate as () => Date)().toISOString();
        if (typeof timestamp.seconds === 'number') return new Date(timestamp.seconds * 1000).toISOString();
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
    const parsed = value === undefined || value === null ? 0 : Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function safeCounter(value: unknown): number {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 10_000_000 ? parsed : 0;
}

function safeNullableNumber(value: unknown): number | null {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function scopeKey(tId: number, sId: number) {
    return `${tId}_${sId}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function summarizeManualTriggerTask(value: unknown): ManualTriggerTaskSummary {
    const task = isRecord(value) ? value : {};
    return {
        name: cleanText(task.name, 120) || 'unknown',
        status: cleanText(task.status, 80) || 'unknown',
        activity: Boolean(task.activity),
        durationMs: safeNullableNumber(task.durationMs),
    };
}

function buildRejectedManualTriggerResult(response: Response): ManualTriggerResultSummary {
    return {
        scheduler: null,
        runId: null,
        status: response.status >= 500 ? 'failed' : 'rejected',
        trigger: null,
        durationMs: null,
        taskCount: 0,
        failedTaskCount: 0,
        tasks: [],
    };
}

function summarizeManualTriggerResult(payload: unknown): ManualTriggerResultSummary | null {
    if (!isRecord(payload)) return null;
    const status = cleanText(payload.status, 80);
    if (!status) return null;

    const rawTasks = Array.isArray(payload.tasks) ? payload.tasks : [];
    const failedTaskCount = rawTasks.filter((task) => (
        isRecord(task) && cleanText(task.status, 80) === 'failed'
    )).length;

    return {
        scheduler: cleanText(payload.scheduler, 120) || null,
        runId: cleanText(payload.runId || payload.runLogId, 180) || null,
        status,
        trigger: cleanText(payload.trigger, 80) || null,
        durationMs: safeNullableNumber(payload.durationMs),
        taskCount: rawTasks.length,
        failedTaskCount,
        tasks: rawTasks.slice(0, 10).map(summarizeManualTriggerTask),
    };
}

function parseTenantOptions(data: Record<string, unknown> | undefined): TenantOption[] {
    const tenants = data?.tenants;
    if (!tenants || typeof tenants !== 'object' || Array.isArray(tenants)) return [];

    const result: TenantOption[] = [];
    for (const [key, value] of Object.entries(tenants)) {
        const item = isRecord(value) ? value : {};
        const tId = item.tId;
        const sId = item.sId;
        if (
            item.pId !== PRODUCT_IDS.ANSWERLATTICE
            || typeof tId !== 'number'
            || !Number.isSafeInteger(tId)
            || tId <= 0
            || typeof sId !== 'number'
            || !Number.isSafeInteger(sId)
            || sId <= 0
            || key !== scopeKey(tId, sId)
        ) continue;
        result.push({
            key: key || scopeKey(tId, sId),
            tId,
            sId,
            active: item.active === true,
            hasEntities: typeof item.hasEntities === 'boolean' ? item.hasEntities : undefined,
            source: cleanText(item.source, 120) || null,
            timeZone: cleanText(item.timeZone, 80) || null,
            businessDayEndTime: cleanText(item.businessDayEndTime, 5) || null,
            schedulerHour: typeof item.schedulerHour === 'number' && Number.isInteger(item.schedulerHour)
                ? item.schedulerHour
                : null,
            lastSeenAt: toIso(item.lastSeenAt),
            updatedAt: toIso(item.updatedAt),
        });
    }
    return result.sort((a, b) => `${a.tId}/${a.sId}`.localeCompare(`${b.tId}/${b.sId}`));
}

function serializeJob(
    doc: FirebaseFirestore.QueryDocumentSnapshot,
    scope: { tId: number; sId: number },
) {
    const data = parseAnswerlatticeKnowledgeIntakeJob(doc.data(), doc.id);
    if (data.tId !== scope.tId || data.sId !== scope.sId) {
        throw new Error('Answerlattice intake monitor job scope is invalid.');
    }
    return {
        id: doc.id,
        tId: safeNumber(data.tId),
        sId: safeNumber(data.sId),
        title: cleanText(data.title || doc.id),
        status: cleanText(data.status, 80) || 'unknown',
        sourceCount: safeNumber(data.sourceCount),
        readySourceCount: safeNumber(data.readySourceCount ?? data.sourceCount),
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

function serializeLedger(
    doc: FirebaseFirestore.QueryDocumentSnapshot,
    scope: { tId: number; sId: number },
) {
    const data = doc.data() || {};
    if (
        !normalizeAnswerlatticeIntakeUsageLedgerId(doc.id)
        || data.id !== doc.id
        || data.pId !== PRODUCT_IDS.ANSWERLATTICE
        || data.tId !== scope.tId
        || data.sId !== scope.sId
    ) {
        throw new Error('Answerlattice intake monitor usage ledger scope is invalid.');
    }
    const status = cleanText(data.status, 80) || 'unknown';
    const isRefunded = status === 'refunded' || status === 'failed_refunded';
    const chargedMonthlyCredits = safeNumber(data.chargedMonthlyCredits);
    const chargedTopUpCredits = safeNumber(data.chargedTopUpCredits);
    const hasExplicitRefundAllocation = data.refundedMonthlyCredits != null || data.refundedTopUpCredits != null;
    return {
        id: doc.id,
        tId: safeNumber(data.tId),
        sId: safeNumber(data.sId),
        jobId: cleanText(data.jobId, 160) || null,
        sourceId: cleanText(data.sourceId, 160) || null,
        action: cleanText(data.action, 120) || 'unknown',
        status,
        provider: cleanText(data.provider, 80) || null,
        model: cleanText(data.model, 120) || null,
        fileName: cleanText(data.fileName, 180) || null,
        mimeType: cleanText(data.mimeType, 120) || null,
        byteSize: safeNumber(data.byteSize),
        unitsReserved: safeNumber(data.unitsReserved),
        unitsCharged: safeNumber(data.unitsCharged),
        chargedMonthlyCredits,
        chargedTopUpCredits,
        refundedMonthlyCredits: hasExplicitRefundAllocation
            ? safeNumber(data.refundedMonthlyCredits)
            : isRefunded ? chargedMonthlyCredits : 0,
        refundedTopUpCredits: hasExplicitRefundAllocation
            ? safeNumber(data.refundedTopUpCredits)
            : isRefunded ? chargedTopUpCredits : 0,
        expiredMonthlyCredits: safeNumber(data.expiredMonthlyCredits),
        createdOn: toIso(data.createdOn),
        settledOn: toIso(data.settledOn),
        refundedOn: toIso(data.refundedOn),
        errorMessage: cleanText(data.errorMessage, 320) || null,
    };
}

function findTenantRun(data: Record<string, unknown>, selectedScope: { tId: number; sId: number } | null) {
    if (!selectedScope) return null;
    const scopeKey = `${selectedScope.tId}_${selectedScope.sId}`;
    const detailedRuns = isRecord(data.tenantRunsByScope) ? data.tenantRunsByScope : {};
    const legacyRun = Array.isArray(data.tenantRuns)
        ? data.tenantRuns.find((item: unknown) =>
            isRecord(item) && item.tId === selectedScope.tId && item.sId === selectedScope.sId,
        )
        : null;
    const run = isRecord(detailedRuns[scopeKey]) ? detailedRuns[scopeKey] : legacyRun;
    if (!isRecord(run)) return null;
    const storedSequence = (value: unknown): unknown[] => Array.isArray(value)
        ? value
        : isRecord(value)
            ? Object.keys(value).sort().map(key => value[key])
            : [];
    const readWindows: Array<{
        key: string;
        task: string;
        source: string;
        window: string;
        operationCount: number;
        documentsReturned: number;
        configuredLimit: number;
        saturated: boolean;
    }> = [];
    const tasks = storedSequence(run.tasks);
    for (const task of tasks) {
        if (!isRecord(task)) continue;
        const taskName = cleanText(task.name, 80) || 'unknown';
        for (const entryValue of storedSequence(task.readWindows)) {
            if (readWindows.length >= SCHEDULER_READ_WINDOW_LIMIT) break;
            const entry = storedSequence(entryValue);
            if (entry.length !== 6) continue;
            const source = cleanText(entry[0], 80);
            const window = cleanText(entry[1], 80);
            if (!source || !window) continue;
            const key = `${taskName}:${source}:${window}:${readWindows.length}`;
            readWindows.push({
                key,
                task: taskName,
                source,
                window,
                operationCount: safeCounter(entry[2]),
                documentsReturned: safeCounter(entry[3]),
                configuredLimit: safeCounter(entry[4]),
                saturated: entry[5] === 1,
            });
        }
        if (readWindows.length >= SCHEDULER_READ_WINDOW_LIMIT) break;
    }
    return {
        tId: selectedScope.tId,
        sId: selectedScope.sId,
        status: cleanText(run.status, 80) || 'unknown',
        durationMs: safeNumber(run.durationMs),
        taskCount: tasks.length,
        errorCount: safeNumber(run.errorCount) || storedSequence(run.errors).length,
        driftDetected: safeNumber(run.driftDetected),
        proposalsCreated: safeNumber(run.proposalsCreated),
        coverageRate: safeNumber(run.coverageRate),
        observedOperationCount: readWindows.reduce((sum, entry) => sum + entry.operationCount, 0),
        observedDocumentsReturned: readWindows.reduce((sum, entry) => sum + entry.documentsReturned, 0),
        saturatedReadWindowCount: readWindows.filter(entry => entry.saturated).length,
        readWindows,
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

function isDevelopmentRuntime() {
    return process.env.NODE_ENV !== 'production';
}

function isAllowedDevelopmentTriggerTarget(url: URL) {
    if (!isDevelopmentRuntime()) return false;
    const hostname = url.hostname.toLowerCase();
    return (url.protocol === 'http:' || url.protocol === 'https:')
        && (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1')
        && url.pathname.endsWith(ANSWERLATTICE_MANUAL_TRIGGER_PATH);
}

function isAllowedAnswerlatticeManualTriggerUrl(url: URL) {
    if (isAllowedDevelopmentTriggerTarget(url)) return true;
    return url.protocol === 'https:'
        && ANSWERLATTICE_ALLOWED_MANUAL_TRIGGER_HOSTS.has(url.hostname.toLowerCase())
        && url.pathname === ANSWERLATTICE_MANUAL_TRIGGER_PATH
        && !url.search
        && !url.hash;
}

async function resolveManualTriggerTarget(triggerUrl: string) {
    let parsed: URL;
    try {
        parsed = new URL(triggerUrl);
    } catch (error) {
        return {
            valid: false as const,
            error: 'invalid_url',
            errorName: getBoundedErrorName(error) || typeof error,
        };
    }

    if (!isAllowedAnswerlatticeManualTriggerUrl(parsed)) {
        return {
            valid: false as const,
            error: 'disallowed_trigger_target',
        };
    }

    const targetValidation = await validateServerNetworkTargetUrl(parsed.toString(), {
        allowLocalhostInDevelopment: true,
        allowedProtocols: parsed.protocol === 'http:' ? ['http:'] : ['https:'],
    });
    if (!targetValidation.valid || !targetValidation.normalizedUrl) {
        return {
            valid: false as const,
            addressCount: targetValidation.addressCount,
            error: targetValidation.error || 'network_target_rejected',
            errorName: targetValidation.errorName,
        };
    }

    return {
        valid: true as const,
        addressCount: targetValidation.addressCount,
        normalizedUrl: targetValidation.normalizedUrl,
    };
}

async function loadTenantOptions(db: FirebaseFirestore.Firestore) {
    const summary = await readAnswerlatticeTenantSummaryDataAdmin(db);
    return {
        tenants: parseTenantOptions(summary),
        tenantSummaryUpdatedAt: toIso(summary.updatedAt),
        tenantSummaryReadDocs: summary.readDocs,
    };
}

async function checkAnswerlatticeIntakeMonitorReadRateLimit(request: NextRequest, session: any) {
    const rateLimitConfig = getRateLimitForFeature('DATA_READ');
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!userId) {
        return privateJson(
            { error: 'Forbidden' },
            { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
        );
    }

    const rateLimit = await checkRateLimit({
        key: buildAnswerlatticeRateLimitKey(ANSWERLATTICE_INTAKE_MONITOR_RATE_LIMIT_KEY, userId),
        ...rateLimitConfig,
        failClosedOnProviderError: true,
    });

    if (rateLimit.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    logger.security('Rate Limit Exceeded - Answerlattice Intake Monitor', {
        ...getAnswerlatticeSecurityLogContext(session, request, request.nextUrl.pathname, {
            ...getBoundedAnswerlatticeStringContext('userId', userId),
        }),
        limit: rateLimitConfig.limit,
        waitSeconds,
        window: rateLimitConfig.window,
    }, 'medium');

    return privateJson(
        {
            error: rateLimit.reason === 'provider_unavailable'
                ? 'Answerlattice intake monitor is temporarily unavailable.'
                : 'Too many requests. Please try again later.',
            retryAfter: waitSeconds,
            resetAt: rateLimit.resetAt,
        },
        {
            headers: {
                'Cache-Control': 'private, no-store',
                'Retry-After': String(waitSeconds),
                'X-RateLimit-Limit': String(rateLimitConfig.limit),
                'X-RateLimit-Remaining': String(rateLimit.remaining),
                'X-RateLimit-Reset': String(rateLimit.resetAt),
            },
            status: rateLimit.reason === 'provider_unavailable' ? 503 : 429,
        },
    );
}

async function checkAnswerlatticeManualTriggerRateLimit(
    request: NextRequest,
    session: any,
    scope: { tId: number; sId: number },
) {
    const rateLimitConfig = getRateLimitForFeature('ANSWERLATTICE_MANUAL_NIGHTLY_TRIGGER');
    const userId = resolveCurrentSessionUserDocumentId(session);
    if (!userId) {
        return privateJson(
            { error: 'Forbidden' },
            { status: 403, headers: { 'Cache-Control': 'private, no-store' } },
        );
    }
    const rateLimit = await checkRateLimit({
        key: buildAnswerlatticeRateLimitKey(
            ANSWERLATTICE_INTAKE_MANUAL_TRIGGER_RATE_LIMIT_KEY,
            `${userId}:${scope.tId}:${scope.sId}`,
        ),
        ...rateLimitConfig,
        failClosedOnProviderError: true,
    });
    if (rateLimit.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    logger.security('Rate Limit Exceeded - Answerlattice Manual Nightly Trigger', {
        ...getAnswerlatticeSecurityLogContext(session, request, request.nextUrl.pathname, {
            ...getBoundedAnswerlatticeStringContext('userId', userId),
            ...getBoundedAnswerlatticeStringContext('tenantId', scope.tId),
            ...getBoundedAnswerlatticeStringContext('storeId', scope.sId),
        }),
        limit: rateLimitConfig.limit,
        waitSeconds,
        window: rateLimitConfig.window,
    }, 'high');

    return privateJson(
        {
            error: rateLimit.reason === 'provider_unavailable'
                ? 'Manual retry is temporarily unavailable.'
                : 'Manual retry limit reached. Please wait before running it again.',
        },
        {
            headers: {
                'Cache-Control': 'private, no-store',
                'Retry-After': String(waitSeconds),
                'X-RateLimit-Limit': String(rateLimitConfig.limit),
                'X-RateLimit-Remaining': String(rateLimit.remaining),
                'X-RateLimit-Reset': String(rateLimit.resetAt),
            },
            status: rateLimit.reason === 'provider_unavailable' ? 503 : 429,
        },
    );
}

function getManualTriggerUrl() {
    const explicitUrl = process.env.ANSWERLATTICE_TRIGGER_NIGHTLY_URL || process.env.ANSWERLATTICE_NIGHTLY_TRIGGER_URL;
    if (explicitUrl) return explicitUrl;
    const projectId = process.env.NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_PROJECT_ID || process.env.ANSWERLATTICE_FIREBASE_PROJECT_ID;
    const normalizedProjectId = String(projectId || '').trim();
    return ANSWERLATTICE_ALLOWED_PROJECT_IDS.has(normalizedProjectId)
        ? `https://us-central1-${normalizedProjectId}.cloudfunctions.net${ANSWERLATTICE_MANUAL_TRIGGER_PATH}`
        : '';
}

async function readManualTriggerResponse(
    response: Response,
    scope: { tId: number; sId: number },
): Promise<ManualTriggerResultSummary | null> {
    let payload: unknown;

    try {
        payload = await readJsonResponseWithLimit<unknown>(
            response,
            ANSWERLATTICE_MANUAL_TRIGGER_RESPONSE_MAX_BYTES,
        );
    } catch (error) {
        logRuntimeFailure('answerlattice_intake_monitor_manual_trigger_response_parse_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tId),
            ...getBoundedRuntimeStringContext('storeId', scope.sId),
            responseOk: response.ok,
            responseStatus: response.status,
        });
        return response.ok ? null : buildRejectedManualTriggerResult(response);
    }

    const result = summarizeManualTriggerResult(payload);
    if (result) return result;

    if (response.ok) {
        logRuntimeFailure('answerlattice_intake_monitor_manual_trigger_response_invalid', undefined, {
            ...getBoundedRuntimeStringContext('tenantId', scope.tId),
            ...getBoundedRuntimeStringContext('storeId', scope.sId),
            responseOk: response.ok,
            responseStatus: response.status,
        });
        return null;
    }

    return buildRejectedManualTriggerResult(response);
}

export const GET = withPlatformAuth(async (request: NextRequest, session: any) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_PLATFORM_MONITOR) {
        return privateJson({ error: 'Answerlattice intake monitor is disabled.' }, { status: 404 });
    }

    const validation = QuerySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!validation.success) {
        return privateJson({ error: 'Invalid query', details: getSafeZodValidationDetails(validation.error) }, { status: 400 });
    }

    const db = answerlatticeFirestoreAdmin;
    if (!db) {
        return privateJson({ error: 'Answerlattice Firebase is not configured.' }, { status: 503 });
    }

    const { limit, tId, sId } = validation.data;
    const selectedScope = tId && sId ? { tId, sId } : null;

    try {
        const rateLimitResponse = await checkAnswerlatticeIntakeMonitorReadRateLimit(request, session);
        if (rateLimitResponse) return rateLimitResponse;

        const currentPlatformUser = await getCurrentPlatformUser(session);
        if (!currentPlatformUser) {
            return privateJson({ error: 'Forbidden' }, { status: 403 });
        }

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
            return privateJson({ error: 'Selected Answerlattice workspace is not present in answerlatticeTenantsSummary.' }, { status: 404 });
        }

        const schedulerRuns = schedulerSnap.docs.map(doc => serializeSchedulerRun(doc, selectedScope));
        const latestSchedulerRun = schedulerRuns[0] || null;

        let jobs: ReturnType<typeof serializeJob>[] = [];
        let ledger: ReturnType<typeof serializeLedger>[] = [];

        if (selectedScope) {
            const [jobsSnap, ledgerSnap] = await Promise.all([
                db.collection(DB_COLLECTIONS.ANSWERLATTICE_KNOWLEDGE_INTAKE_JOBS)
                    .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                    .where('tId', '==', selectedScope.tId)
                    .where('sId', '==', selectedScope.sId)
                    .orderBy('modifiedOn', 'desc')
                    .limit(limit)
                    .get(),
                db.collection(DB_COLLECTIONS.ANSWERLATTICE_INTAKE_USAGE_LEDGER)
                    .where('pId', '==', PRODUCT_IDS.ANSWERLATTICE)
                    .where('tId', '==', selectedScope.tId)
                    .where('sId', '==', selectedScope.sId)
                    .orderBy('createdOn', 'desc')
                    .limit(limit)
                    .get(),
            ]);

            jobs = jobsSnap.docs.map(doc => serializeJob(doc, selectedScope));
            ledger = ledgerSnap.docs.map(doc => serializeLedger(doc, selectedScope));
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
                    .reduce((sum, row) => sum + row.refundedMonthlyCredits + row.refundedTopUpCredits, 0),
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

        return privateJson({
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
        logRuntimeFailure('answerlattice_intake_monitor_snapshot_failed', error, {
            ...getBoundedRuntimeStringContext('endpoint', request.nextUrl.pathname),
            ...(selectedScope ? {
                ...getBoundedRuntimeStringContext('tenantId', selectedScope.tId),
                ...getBoundedRuntimeStringContext('storeId', selectedScope.sId),
            } : {}),
        });
        return privateJson({ error: 'Failed to load Answerlattice intake monitor.' }, { status: 500 });
    }
});

export const POST = withPlatformAuth(async (request: NextRequest, session: any) => {
    if (!FEATURE_FLAGS.ENABLE_ANSWERLATTICE_INTAKE_PLATFORM_MONITOR) {
        return privateJson({ error: 'Answerlattice intake monitor is disabled.' }, { status: 404 });
    }

    const currentPlatformUser = await getCurrentPlatformUser(session);
    if (!currentPlatformUser) {
        return privateJson({ error: 'Forbidden' }, { status: 403 });
    }

    const bodyResult = await readBoundedJsonBody(request, ANSWERLATTICE_INTAKE_TRIGGER_MAX_BODY_BYTES, {
        invalidJsonMessage: 'Invalid manual trigger payload',
        tooLargeMessage: 'Request body too large',
    });
    if (bodyResult.ok === false) {
        return privateJson(
            { error: bodyResult.response.status === 413 ? 'Request body too large' : 'Invalid manual trigger payload' },
            { status: bodyResult.response.status },
        );
    }

    const validation = TriggerSchema.safeParse(bodyResult.data);
    if (!validation.success) {
        return privateJson({ error: 'Invalid manual trigger payload', details: getSafeZodValidationDetails(validation.error) }, { status: 400 });
    }

    const db = answerlatticeFirestoreAdmin;
    if (!db) {
        return privateJson({ error: 'Answerlattice Firebase is not configured.' }, { status: 503 });
    }

    const { tId, sId } = validation.data;
    const rateLimitResponse = await checkAnswerlatticeManualTriggerRateLimit(request, session, { tId, sId });
    if (rateLimitResponse) return rateLimitResponse;
    const secret = process.env.ANSWERLATTICE_CRON_SECRET;
    const triggerUrl = getManualTriggerUrl();
    if (!secret || !triggerUrl) {
        return privateJson({ error: 'Answerlattice manual scheduler trigger is not configured.' }, { status: 503 });
    }

    try {
        const { tenants } = await loadTenantOptions(db);
        const selectedTenant = tenants.find(item => item.tId === tId && item.sId === sId);
        if (!selectedTenant || !selectedTenant.active) {
            return privateJson({ error: 'Selected Answerlattice workspace is not present in answerlatticeTenantsSummary.' }, { status: 404 });
        }

        const triggerTarget = await resolveManualTriggerTarget(triggerUrl);
        if (!triggerTarget.valid) {
            logRuntimeFailure('answerlattice_intake_monitor_manual_trigger_target_rejected', new Error('answerlattice_manual_trigger_target_rejected'), {
                addressCount: 'addressCount' in triggerTarget ? triggerTarget.addressCount || 0 : 0,
                targetErrorCode: triggerTarget.error,
                targetErrorName: 'errorName' in triggerTarget ? triggerTarget.errorName : undefined,
            });
            return privateJson({ error: 'Answerlattice manual scheduler trigger is not configured.' }, { status: 503 });
        }

        const response = await fetch(triggerTarget.normalizedUrl, {
            method: 'POST',
            redirect: 'manual',
            headers: {
                Authorization: `Bearer ${secret}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ tId, sId }),
        });
        const result = await readManualTriggerResponse(response, { tId, sId });

        if (!response.ok) {
            return privateJson({
                error: 'Answerlattice nightly retry failed.',
                result: result || buildRejectedManualTriggerResult(response),
            }, { status: response.status });
        }

        if (!result) {
            return privateJson({
                error: 'Answerlattice nightly retry response was invalid.',
            }, { status: 502 });
        }

        return privateJson({
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
        logRuntimeFailure('answerlattice_intake_monitor_manual_retry_failed', error, {
            ...getBoundedRuntimeStringContext('tenantId', tId),
            ...getBoundedRuntimeStringContext('storeId', sId),
        });
        return privateJson({ error: 'Failed to trigger selected Answerlattice nightly retry.' }, { status: 500 });
    }
});

/**
 * Answerlattice Cloud Functions — Entry Point
 * 
 * All Answerlattice-specific Cloud Functions are exported from here.
 * Deploys to Answerlattice Firebase projects:
 * - QA/staging: answerlattice-qa
 * - Production: answerlattice
 * 
 * Exported Functions:
 * - answerlatticeNightly: Scheduled Answerlattice master scheduler alias
 * - triggerAnswerlatticeNightly: HTTPS manual trigger guarded by CRON_SECRET
 * 
 * @see __docs__/answerlattice/doctrine/07-multi-product-tenancy.md
 * @see __docs__/answerlattice/doctrine/08-product-separation-playbook.md
 */

// ⚠️ MUST BE FIRST: Load .env.local before any other imports (emulator)
if (process.env.FUNCTIONS_EMULATOR === 'true') {
    require('dotenv').config({ path: '.env.local' });
    require('firebase-functions/logger').info('[Answerlattice Dev] Loaded .env.local for emulator');
}

import { onDocumentCreated, onDocumentDeleted, onDocumentUpdated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import * as logger from 'firebase-functions/logger';
import { runAnswerlatticeMasterScheduler } from './answerlattice/answerlatticeMasterScheduler';
import { refreshAnswerlatticeSupportBoardLiveSummary } from './answerlattice/supportBoardSummary';
import {
    acquireChatAnalyticsBackfillLease,
    backfillChatAnalyticsDays,
    releaseChatAnalyticsBackfillLease,
} from './answerlattice/chatAnalyticsAggregation';
import { recoverChatAnalyticsAfterDeletedSession } from './answerlattice/chatAnalyticsDeletionRecovery';
import {
    isAnswerlatticeChatAnalyticsStoreScope,
    parseAnswerlatticeChatAnalyticsBackfillInput,
} from './answerlattice/chatAnalyticsBackfillBoundary';
import {
    isAnswerlatticeManualSchedulerAuthorized,
    parseAnswerlatticeManualSchedulerRequest,
} from './answerlattice/manualSchedulerBoundary';
import { assertAnswerlatticePlatformCallable } from './callableAuth';
import { ANSWERLATTICE_SECRET_GROUPS, readAnswerlatticeCronSecret } from './config/secrets';
import { DB_COLLECTIONS } from './constants/database';
import { FUNCTION_FLAGS } from './constants/features';
import { firestoreAdmin } from './firebaseAdmin';
import { processEvent } from './integrations/eventProcessor';
import { updateEventStatus } from './integrations/deliveryLogger';
import { IntegrationEvent } from './integrations/types';
import { embedArticleWorkerLogic } from './logic/embedArticleWorker';
import { startGenerationLogic } from './logic/startGeneration';
import { dispatchPublishingEmbeddingTasks, finalizePublishingJob } from './logic/kbPublishingLifecycle';
import { publishApprovedJobLogic } from './logic/publishApprovedJob';
import { regenerateEmbeddingLogic } from './logic/regenerateEmbedding';
import { EmbedArticleType, INGESTION_JOB_STATUS, IngestionJob, IngestionJobCategoriesMap } from './types';

const ANSWERLATTICE_AI_OPTIONS = {
    region: 'us-central1' as const,
    timeoutSeconds: 540,
    memory: '1GiB' as const,
    maxInstances: 3,
    secrets: ANSWERLATTICE_SECRET_GROUPS.AI,
};

const ANSWERLATTICE_KB_EVENT_OPTIONS = {
    region: 'us-central1' as const,
    timeoutSeconds: 540,
    memory: '1GiB' as const,
    maxInstances: 2,
    secrets: ANSWERLATTICE_SECRET_GROUPS.AI,
};

const ANSWERLATTICE_EMBED_TASK_OPTIONS = {
    ...ANSWERLATTICE_AI_OPTIONS,
    retryConfig: {
        maxAttempts: 3,
        maxBackoffSeconds: 120,
        maxDoublings: 2,
        minBackoffSeconds: 10,
    },
    rateLimits: {
        maxConcurrentDispatches: 3,
        maxDispatchesPerSecond: 3,
    },
};

export const answerlatticeSupportBoardSummaryOnWrite = onDocumentWritten(
    {
        region: 'us-central1',
        document: `${DB_COLLECTIONS.ANSWERLATTICE_SUPPORT_BOARD_CARDS}/{cardId}`,
        retry: true,
        timeoutSeconds: 60,
        memory: '256MiB',
        maxInstances: 3,
    },
    async (event) => {
        await refreshAnswerlatticeSupportBoardLiveSummary({
            before: event.data?.before.exists ? event.data.before.data() || null : null,
            after: event.data?.after.exists ? event.data.after.data() || null : null,
            eventId: event.id,
            eventTime: event.time,
        });
    },
);

export const answerlatticeChatAnalyticsOnDelete = onDocumentDeleted(
    {
        region: 'us-central1',
        document: `${DB_COLLECTIONS.CHAT_SESSIONS}/{sessionId}`,
        retry: true,
        timeoutSeconds: 120,
        memory: '256MiB',
        maxInstances: 3,
    },
    async (event) => {
        const result = await recoverChatAnalyticsAfterDeletedSession(
            event.params.sessionId,
            event.data?.data(),
        );
        if (!result.aggregate) {
            logger.warn('[Answerlattice Chat Analytics] Deleted session was outside the aggregate contract', {
                failureCode: 'answerlattice_chat_analytics_delete_source_invalid',
                eventIdPresent: Boolean(event.id),
                sessionIdPresent: Boolean(event.params.sessionId),
            });
        }
    },
);

export const backfillChatAnalytics = onCall(
    {
        region: 'us-central1',
        timeoutSeconds: 540,
        memory: '1GiB',
        maxInstances: 1,
    },
    async (request) => {
        const caller = await assertAnswerlatticePlatformCallable(request, 'backfillChatAnalytics');
        let input: ReturnType<typeof parseAnswerlatticeChatAnalyticsBackfillInput>;
        try {
            input = parseAnswerlatticeChatAnalyticsBackfillInput(request.data);
        } catch {
            throw new HttpsError('invalid-argument', 'Invalid chat analytics backfill request.');
        }
        const storeSnapshot = await firestoreAdmin.collection(DB_COLLECTIONS.STORES).doc(String(input.sId)).get();
        if (!storeSnapshot.exists || !isAnswerlatticeChatAnalyticsStoreScope(storeSnapshot.data(), input.tId, input.sId)) {
            logger.warn('[Answerlattice Chat Analytics] Backfill store scope rejected', {
                tIdPresent: input.tId > 0,
                sIdPresent: input.sId > 0,
            });
            throw new HttpsError('permission-denied', 'Chat analytics backfill is not available for this workspace.');
        }
        const leaseId = await acquireChatAnalyticsBackfillLease(input.tId, input.sId, caller);
        if (!leaseId) {
            throw new HttpsError('resource-exhausted', 'A recent chat analytics backfill is already running.');
        }
        let result: Awaited<ReturnType<typeof backfillChatAnalyticsDays>>;
        try {
            result = await backfillChatAnalyticsDays(input.tId, input.sId, input.days);
        } catch (error) {
            logger.error('[Answerlattice Chat Analytics] Backfill failed', {
                failureCode: 'answerlattice_chat_backfill_failed',
                days: input.days,
                sourceErrorName: error instanceof Error ? error.name : typeof error,
            });
            try {
                await releaseChatAnalyticsBackfillLease(input.tId, input.sId, leaseId);
            } catch (releaseError) {
                logger.error('[Answerlattice Chat Analytics] Failed to release backfill lease after aggregation failure', {
                    failureCode: 'answerlattice_chat_backfill_failure_lease_release_failed',
                    sourceErrorName: releaseError instanceof Error ? releaseError.name : typeof releaseError,
                });
            }
            throw new HttpsError('internal', 'Chat analytics backfill failed.');
        }
        try {
            await releaseChatAnalyticsBackfillLease(input.tId, input.sId, leaseId);
        } catch (error) {
            logger.error('[Answerlattice Chat Analytics] Failed to release completed backfill lease', {
                failureCode: 'answerlattice_chat_backfill_success_lease_release_failed',
                sourceErrorName: error instanceof Error ? error.name : typeof error,
            });
        }
        return result;
    },
);

function assertFirestoreDocumentId(value: unknown, fieldName: string): string {
    const id = typeof value === 'string' ? value.trim() : '';
    if (id !== value || !id || id.length > 180 || id === '.' || id === '..' || id.includes('/') || /^__.*__$/.test(id)) {
        throw new HttpsError('invalid-argument', `${fieldName} must be a valid Firestore document ID.`);
    }
    return id;
}

function getKbCallableContext(value: string, fieldName: 'articleId' | 'jobId', caller?: { platformRole?: string; uid?: string }): Record<string, string | number | boolean> {
    return {
        fieldName,
        idLength: value.length,
        callerUidLength: caller?.uid?.length || 0,
        platformRole: caller?.platformRole || '',
    };
}

function getKbTaskContext(articleData: EmbedArticleType, jobId: string): Record<string, string | number | boolean> {
    return {
        jobIdLength: jobId.length,
        articleIdLength: articleData.id?.length || 0,
        categoryTitleLength: articleData.categoryTitle?.length || 0,
        hasSectionTitle: Boolean(articleData.sectionTitle),
    };
}

// KB generation lifecycle lives in the Answerlattice Firebase project. The
// owner route redirects to Knowledge Intake, but the internal platform import
// tool and persisted legacy jobs still require this production-safe pipeline.
export const startGeneration = onDocumentCreated(
    {
        ...ANSWERLATTICE_KB_EVENT_OPTIONS,
        document: `${DB_COLLECTIONS.KB_GENERATION_JOBS}/{jobId}`,
        retry: false,
    },
    async (event) => {
        if (!event.data) return;
        const jobId = assertFirestoreDocumentId(event.params.jobId, 'jobId');
        await startGenerationLogic(jobId, event.id);
    },
);

export const retryGeneration = onDocumentUpdated(
    {
        ...ANSWERLATTICE_KB_EVENT_OPTIONS,
        document: `${DB_COLLECTIONS.KB_GENERATION_JOBS}/{jobId}`,
        retry: false,
    },
    async (event) => {
        const before = event.data?.before.data() as IngestionJob | undefined;
        const after = event.data?.after.data() as IngestionJob | undefined;
        if (!before || !after) return;
        if (before.status !== INGESTION_JOB_STATUS.FAILED || after.status !== INGESTION_JOB_STATUS.PENDING) return;
        const jobId = assertFirestoreDocumentId(event.params.jobId, 'jobId');
        await startGenerationLogic(jobId, event.id);
    },
);

export const finalizePublish = onDocumentUpdated(
    {
        ...ANSWERLATTICE_KB_EVENT_OPTIONS,
        document: `${DB_COLLECTIONS.KB_GENERATION_JOBS}/{jobId}`,
        retry: true,
    },
    async (event) => {
        const after = event.data?.after.data() as IngestionJob | undefined;
        if (!after || after.status !== INGESTION_JOB_STATUS.PUBLISHING) return;
        const jobId = assertFirestoreDocumentId(event.params.jobId, 'jobId');
        await dispatchPublishingEmbeddingTasks(jobId, after);
        await finalizePublishingJob(jobId);
    },
);

function getAnswerlatticeIndexStringContext(label: string, value: unknown): Record<string, number | boolean> {
    const text = typeof value === 'string' ? value : '';
    return {
        [`${label}Present`]: text.length > 0,
        [`${label}Length`]: text.length,
    };
}

function getManualSchedulerScopeContext(scope?: { tId: number; sId: number } | null): Record<string, boolean> {
    return {
        scoped: Boolean(scope),
        hasTenantScope: Number.isFinite(scope?.tId),
        hasStoreScope: Number.isFinite(scope?.sId),
    };
}

// ═══════════════════════════════════════════════════════════════
// ANSWERLATTICE MASTER SCHEDULER
// One scheduled function owns Answerlattice scheduled work. It runs hourly and the
// master scheduler filters tenants by workspace-local EOD + settlement buffer.
// The export name stays answerlatticeNightly for deploy compatibility.
// ═══════════════════════════════════════════════════════════════

export const answerlatticeNightly = onSchedule(
    {
        region: 'us-central1',
        schedule: '30 * * * *',
        timeZone: 'UTC',
        timeoutSeconds: 540,
        memory: '512MiB',
        maxInstances: 1,
        secrets: ANSWERLATTICE_SECRET_GROUPS.AI,
    },
    async () => {
        logger.info('[Answerlattice Scheduler] Starting master scheduler tick...');
        const result = await runAnswerlatticeMasterScheduler({ trigger: 'scheduled', triggeredBy: 'system' });
        logger.info('[Answerlattice Scheduler] Complete', {
            runLogId: result.runId,
            status: result.status,
            tasks: result.tasks.map(task => ({ name: task.name, status: task.status, activity: task.activity })),
        });
    }
);

// ═══════════════════════════════════════════════════════════════
// MANUAL TRIGGER (for testing/debugging)
// Call via HTTPS with Authorization: Bearer ${CRON_SECRET}
// ═══════════════════════════════════════════════════════════════

function isManualTriggerAuthorized(req: any): boolean {
    const authHeader = req.get?.('authorization') || req.headers?.authorization || '';
    return isAnswerlatticeManualSchedulerAuthorized({
        authorizationHeader: authHeader,
        cronSecret: readAnswerlatticeCronSecret(),
        emulator: process.env.FUNCTIONS_EMULATOR === 'true',
    });
}

export const triggerAnswerlatticeNightly = onRequest(
    {
        region: 'us-central1',
        timeoutSeconds: 540,
        memory: '512MiB',
        maxInstances: 1,
        secrets: ANSWERLATTICE_SECRET_GROUPS.MANUAL_SCHEDULER_WITH_AI,
    },
    async (req, res) => {
        if (req.method !== 'POST') {
            res.set('Allow', 'POST');
            res.status(405).json({ error: 'Method not allowed' });
            return;
        }
        if (!String(req.get?.('content-type') || '').toLowerCase().startsWith('application/json')) {
            res.status(415).json({ error: 'Content-Type must be application/json' });
            return;
        }
        if (Buffer.byteLength(req.rawBody || Buffer.from(JSON.stringify(req.body || {}))) > 2 * 1024) {
            res.status(413).json({ error: 'Request body too large' });
            return;
        }
        if (!isManualTriggerAuthorized(req)) {
            logger.warn('[Answerlattice Manual] Unauthorized manual scheduler trigger blocked', {
                failureCode: 'answerlattice_manual_scheduler_unauthorized',
                ...getAnswerlatticeIndexStringContext('requestIp', req.ip),
                hasAuthorizationHeader: Boolean(req.get?.('authorization') || req.headers?.authorization),
            });
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        let parsedRequest: ReturnType<typeof parseAnswerlatticeManualSchedulerRequest>;
        try {
            parsedRequest = parseAnswerlatticeManualSchedulerRequest(req.body);
        } catch {
            res.status(400).json({ error: 'ANSWERLATTICE_MANUAL_SCOPE_INVALID' });
            return;
        }
        const scope = parsedRequest.scope;

        logger.info('[Answerlattice Manual] Triggered master scheduler manually...', {
            ...getManualSchedulerScopeContext(scope),
        });
        const result = await runAnswerlatticeMasterScheduler({
            trigger: 'manual',
            triggeredBy: 'cron_secret',
            forceAllTenants: parsedRequest.forceAllTenants,
            tenantScope: scope ? [scope] : undefined,
        });
        logger.info('[Answerlattice Manual] Complete', {
            runLogId: result.runId,
            status: result.status,
            scoped: Boolean(scope),
            tasks: result.tasks.map(task => ({ name: task.name, status: task.status, activity: task.activity })),
        });
        res.status(result.status === 'failed' ? 500 : 200).json(result);
    }
);

// ═══════════════════════════════════════════════════════════════
// INTEGRATION EVENT PROCESSOR (Expansion Item #7)
// Triggered by onCreate on answerlattice_integrationEvents.
// Dispatches events to configured adapters (Slack, Email, Linear, GitHub).
// Feature-flagged: ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS
// @see __docs__/answerlattice/workflow-integrations/
// ═══════════════════════════════════════════════════════════════

export const processIntegrationEvent = onDocumentCreated(
    {
        region: 'us-central1',
        document: `${DB_COLLECTIONS.ANSWERLATTICE_INTEGRATION_EVENTS}/{eventId}`,
        // Four sequential adapters can consume up to ~145 seconds across their
        // bounded attempts/backoff. Keep enough headroom to persist final state.
        timeoutSeconds: 240,
        memory: '256MiB',
        maxInstances: 5,
        retry: true,
        secrets: ANSWERLATTICE_SECRET_GROUPS.WORKFLOW_INTEGRATIONS,
    },
    async (firestoreEvent) => {
        if (!FUNCTION_FLAGS.ENABLE_ANSWERLATTICE_WORKFLOW_INTEGRATIONS) return;

        const snapshot = firestoreEvent.data;
        if (!snapshot) {
            logger.warn('[Answerlattice Integration] No data in event snapshot');
            return;
        }

        const eventId = firestoreEvent.params.eventId;
        const event = snapshot.data() as IntegrationEvent;

        logger.info('[Answerlattice Integration] Processing event', {
            eventType: event.eventType,
            ...getAnswerlatticeIndexStringContext('eventId', eventId),
        });

        let result: Awaited<ReturnType<typeof processEvent>>;
        try {
            result = await processEvent(eventId, event);
        } catch (error) {
            const statusUpdated = await updateEventStatus(eventId, 'failed', event);
            logger.error('[Answerlattice Integration] Event processor invocation failed', {
                failureCode: 'answerlattice_integration_processor_invocation_failed',
                eventType: event.eventType,
                ...getAnswerlatticeIndexStringContext('eventId', eventId),
                sourceErrorName: error instanceof Error ? error.name.slice(0, 80) : typeof error,
                statusUpdated,
            });
            throw error;
        }

        logger.info('[Answerlattice Integration] Event processed', {
            ...getAnswerlatticeIndexStringContext('eventId', eventId),
            delivered: result.delivered,
            failed: result.failed,
        });
    }
);

// ═══════════════════════════════════════════════════════════════
// KB INGESTION CALLABLES
// These run inside the Answerlattice Firebase project. The dashboard calls them via
// answerlatticeFunctions so separate-mode production does not fall back to MenuList.
// ═══════════════════════════════════════════════════════════════

export const embedArticleWorker = onTaskDispatched(ANSWERLATTICE_EMBED_TASK_OPTIONS, async (request) => {
    const { articleData, embeddingRunId, jobId } = request.data as {
        articleData: EmbedArticleType;
        embeddingRunId?: string;
        jobId: string;
    };

    if (!articleData?.id || !jobId) {
        throw new HttpsError('invalid-argument', 'Missing required payload: articleData.id, jobId.');
    }

    logger.info('[Answerlattice KB] Re-embedding queued article', getKbTaskContext(articleData, jobId));
    await embedArticleWorkerLogic(articleData, jobId, {
        embeddingRunId,
        retryCount: request.retryCount,
        finalAttempt: request.retryCount >= 2,
    });
});

export const regenerateEmbedding = onCall(ANSWERLATTICE_AI_OPTIONS, async (request) => {
    const caller = await assertAnswerlatticePlatformCallable(request, 'regenerateEmbedding', {
        allowPlatformSupport: true,
    });
    const { articleId } = request.data || {};
    if (!articleId) {
        throw new HttpsError('invalid-argument', 'The function must be called with articleId.');
    }
    const safeArticleId = assertFirestoreDocumentId(articleId, 'articleId');

    logger.info('[Answerlattice KB] Authorized regenerateEmbedding request', {
        ...getKbCallableContext(safeArticleId, 'articleId', caller),
    });
    return regenerateEmbeddingLogic(safeArticleId);
});

export const publishApprovedJobFn = onCall(ANSWERLATTICE_AI_OPTIONS, async (request) => {
    const caller = await assertAnswerlatticePlatformCallable(request, 'publishApprovedJobFn', {
        allowPlatformSupport: true,
    });
    const { jobId, finalCategories }: { jobId: string; finalCategories: IngestionJobCategoriesMap } = request.data || {};
    if (!jobId || !finalCategories) {
        throw new HttpsError('invalid-argument', 'Missing required payload: jobId, finalCategories.');
    }
    const safeJobId = assertFirestoreDocumentId(jobId, 'jobId');

    logger.info('[Answerlattice KB] Authorized publishApprovedJobFn request', {
        ...getKbCallableContext(safeJobId, 'jobId', caller),
    });
    return publishApprovedJobLogic(safeJobId, finalCategories);
});

export const dev_triggerStartGeneration = onCall(ANSWERLATTICE_AI_OPTIONS, async (request) => {
    if (process.env.FUNCTIONS_EMULATOR !== 'true') {
        throw new HttpsError('failed-precondition', 'This callable is available only in the local emulator.');
    }
    await assertAnswerlatticePlatformCallable(request, 'dev_triggerStartGeneration', {
        allowPlatformSupport: true,
    });
    const safeJobId = assertFirestoreDocumentId(request.data?.jobId, 'jobId');
    return startGenerationLogic(safeJobId);
});

export const dev_triggerFinalizePublish = onCall(ANSWERLATTICE_AI_OPTIONS, async (request) => {
    if (process.env.FUNCTIONS_EMULATOR !== 'true') {
        throw new HttpsError('failed-precondition', 'This callable is available only in the local emulator.');
    }
    await assertAnswerlatticePlatformCallable(request, 'dev_triggerFinalizePublish', {
        allowPlatformSupport: true,
    });
    const safeJobId = assertFirestoreDocumentId(request.data?.jobId, 'jobId');
    const snapshot = await firestoreAdmin.collection(DB_COLLECTIONS.KB_GENERATION_JOBS).doc(safeJobId).get();
    if (!snapshot.exists) throw new HttpsError('not-found', 'Job not found.');
    const job = { id: snapshot.id, ...snapshot.data() } as IngestionJob;
    await dispatchPublishingEmbeddingTasks(safeJobId, job);
    return finalizePublishingJob(safeJobId);
});

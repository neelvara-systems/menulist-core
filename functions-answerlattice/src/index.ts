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

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import * as logger from 'firebase-functions/logger';
import { runAnswerlatticeMasterScheduler } from './answerlattice/answerlatticeMasterScheduler';
import { assertAnswerlatticePlatformCallable } from './callableAuth';
import { ANSWERLATTICE_SECRET_GROUPS, readAnswerlatticeCronSecret } from './config/secrets';
import { DB_COLLECTIONS } from './constants/database';
import { FUNCTION_FLAGS } from './constants/features';
import { processEvent } from './integrations/eventProcessor';
import { IntegrationEvent } from './integrations/types';
import { embedArticleWorkerLogic } from './logic/embedArticleWorker';
import { publishApprovedJobLogic } from './logic/publishApprovedJob';
import { regenerateEmbeddingLogic } from './logic/regenerateEmbedding';
import { EmbedArticleType, IngestionJobCategoriesMap } from './types';

const ANSWERLATTICE_AI_OPTIONS = {
    region: 'us-central1' as const,
    timeoutSeconds: 540,
    memory: '1GiB' as const,
    maxInstances: 3,
    secrets: ANSWERLATTICE_SECRET_GROUPS.AI,
};

function assertFirestoreDocumentId(value: unknown, fieldName: string): string {
    const id = typeof value === 'string' ? value.trim() : '';
    if (!id || id === '.' || id === '..' || id.includes('/') || /^__.*__$/.test(id)) {
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

function getManualSchedulerScopeErrorResponse(error: unknown): { code: string; status: number } {
    if (error instanceof HttpsError && error.code === 'invalid-argument') {
        return { code: 'ANSWERLATTICE_MANUAL_SCOPE_INVALID', status: 400 };
    }
    return { code: 'ANSWERLATTICE_MANUAL_SCOPE_INVALID', status: 400 };
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
    if (process.env.FUNCTIONS_EMULATOR === 'true') return true;

    const cronSecret = readAnswerlatticeCronSecret();
    const authHeader = req.get?.('authorization') || req.headers?.authorization || '';

    return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}

function parseManualTenantScope(req: any): { tId: number; sId: number } | null {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const tId = Number(body.tId);
    const sId = Number(body.sId);
    if (!Number.isFinite(tId) && !Number.isFinite(sId)) return null;
    if (!Number.isInteger(tId) || tId <= 0 || !Number.isInteger(sId) || sId <= 0) {
        throw new HttpsError('invalid-argument', 'Both tId and sId are required for scoped Answerlattice nightly retry.');
    }
    return { tId, sId };
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
        if (!isManualTriggerAuthorized(req)) {
            logger.warn('[Answerlattice Manual] Unauthorized manual scheduler trigger blocked', {
                failureCode: 'answerlattice_manual_scheduler_unauthorized',
                ...getAnswerlatticeIndexStringContext('requestIp', req.ip),
                hasAuthorizationHeader: Boolean(req.get?.('authorization') || req.headers?.authorization),
            });
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        let scope: { tId: number; sId: number } | null = null;
        try {
            scope = parseManualTenantScope(req);
        } catch (error) {
            const response = getManualSchedulerScopeErrorResponse(error);
            res.status(response.status).json({ error: response.code });
            return;
        }

        logger.info('[Answerlattice Manual] Triggered master scheduler manually...', {
            ...getManualSchedulerScopeContext(scope),
        });
        const result = await runAnswerlatticeMasterScheduler({
            trigger: 'manual',
            triggeredBy: 'cron_secret',
            forceAllTenants: !scope,
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
        timeoutSeconds: 60,
        memory: '256MiB',
        maxInstances: 5,
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

        const result = await processEvent(eventId, event);

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

export const embedArticleWorker = onTaskDispatched(ANSWERLATTICE_AI_OPTIONS, async (request) => {
    const { articleData, jobId } = request.data as { articleData: EmbedArticleType; jobId: string };

    if (!articleData?.id || !jobId) {
        throw new HttpsError('invalid-argument', 'Missing required payload: articleData.id, jobId.');
    }

    logger.info('[Answerlattice KB] Re-embedding queued article', getKbTaskContext(articleData, jobId));
    await embedArticleWorkerLogic(articleData, jobId);
});

export const regenerateEmbedding = onCall(ANSWERLATTICE_AI_OPTIONS, async (request) => {
    const caller = assertAnswerlatticePlatformCallable(request, 'regenerateEmbedding');
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
    const caller = assertAnswerlatticePlatformCallable(request, 'publishApprovedJobFn');
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

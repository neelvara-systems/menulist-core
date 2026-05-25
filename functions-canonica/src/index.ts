/**
 * Canonica Cloud Functions — Entry Point
 * 
 * All Canonica-specific Cloud Functions are exported from here.
 * Deploys to Canonica Firebase projects:
 * - QA/staging: canonica-qa
 * - Production: canonica
 * 
 * Exported Functions:
 * - canonicaNightly: Scheduled Canonica master scheduler alias
 * - triggerCanonicaNightly: HTTPS manual trigger guarded by CRON_SECRET
 * 
 * @see __docs__/canonica/doctrine/07-multi-product-tenancy.md
 * @see __docs__/canonica/doctrine/08-product-separation-playbook.md
 */

// ⚠️ MUST BE FIRST: Load .env.local before any other imports (emulator)
if (process.env.FUNCTIONS_EMULATOR === 'true') {
    require('dotenv').config({ path: '.env.local' });
    require('firebase-functions/logger').info('[Canonica Dev] Loaded .env.local for emulator');
}

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import * as logger from 'firebase-functions/logger';
import { runCanonicaMasterScheduler } from './canonica/canonicaMasterScheduler';
import { assertCanonicaPlatformCallable } from './callableAuth';
import { CANONICA_SECRET_GROUPS, readCanonicaCronSecret } from './config/secrets';
import { DB_COLLECTIONS } from './constants/database';
import { FUNCTION_FLAGS } from './constants/features';
import { processEvent } from './integrations/eventProcessor';
import { IntegrationEvent } from './integrations/types';
import { embedArticleWorkerLogic } from './logic/embedArticleWorker';
import { publishApprovedJobLogic } from './logic/publishApprovedJob';
import { regenerateEmbeddingLogic } from './logic/regenerateEmbedding';
import { EmbedArticleType, IngestionJobCategoriesMap } from './types';

const CANONICA_AI_OPTIONS = {
    region: 'us-central1' as const,
    timeoutSeconds: 540,
    memory: '1GiB' as const,
    maxInstances: 3,
};

// ═══════════════════════════════════════════════════════════════
// CANONICA MASTER SCHEDULER
// One scheduled function owns Canonica scheduled work. It runs hourly and the
// master scheduler filters tenants by workspace-local EOD + settlement buffer.
// The export name stays canonicaNightly for deploy compatibility.
// ═══════════════════════════════════════════════════════════════

export const canonicaNightly = onSchedule(
    {
        region: 'us-central1',
        schedule: '30 * * * *',
        timeZone: 'UTC',
        timeoutSeconds: 540,
        memory: '512MiB',
        maxInstances: 1,
    },
    async () => {
        logger.info('[Canonica Scheduler] Starting master scheduler tick...');
        const result = await runCanonicaMasterScheduler({ trigger: 'scheduled', triggeredBy: 'system' });
        logger.info('[Canonica Scheduler] Complete', {
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

    const cronSecret = readCanonicaCronSecret();
    const authHeader = req.get?.('authorization') || req.headers?.authorization || '';

    return Boolean(cronSecret && authHeader === `Bearer ${cronSecret}`);
}

export const triggerCanonicaNightly = onRequest(
    {
        region: 'us-central1',
        timeoutSeconds: 540,
        memory: '512MiB',
        maxInstances: 1,
        secrets: CANONICA_SECRET_GROUPS.MANUAL_SCHEDULER,
    },
    async (req, res) => {
        if (!isManualTriggerAuthorized(req)) {
            logger.warn('[Canonica Manual] Unauthorized manual scheduler trigger blocked', {
                ip: req.ip,
                hasAuthorizationHeader: Boolean(req.get?.('authorization') || req.headers?.authorization),
            });
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        logger.info('[Canonica Manual] Triggered master scheduler manually...');
        const result = await runCanonicaMasterScheduler({
            trigger: 'manual',
            triggeredBy: 'cron_secret',
            forceAllTenants: true,
        });
        logger.info('[Canonica Manual] Complete', {
            runLogId: result.runId,
            status: result.status,
            tasks: result.tasks.map(task => ({ name: task.name, status: task.status, activity: task.activity })),
        });
        res.status(result.status === 'failed' ? 500 : 200).json(result);
    }
);

// ═══════════════════════════════════════════════════════════════
// INTEGRATION EVENT PROCESSOR (Expansion Item #7)
// Triggered by onCreate on canonica_integrationEvents.
// Dispatches events to configured adapters (Slack, Email, Linear, GitHub).
// Feature-flagged: ENABLE_CANONICA_WORKFLOW_INTEGRATIONS
// @see __docs__/canonica/workflow-integrations/
// ═══════════════════════════════════════════════════════════════

export const processIntegrationEvent = onDocumentCreated(
    {
        region: 'us-central1',
        document: `${DB_COLLECTIONS.CANONICA_INTEGRATION_EVENTS}/{eventId}`,
        timeoutSeconds: 60,
        memory: '256MiB',
        maxInstances: 5,
    },
    async (firestoreEvent) => {
        if (!FUNCTION_FLAGS.ENABLE_CANONICA_WORKFLOW_INTEGRATIONS) return;

        const snapshot = firestoreEvent.data;
        if (!snapshot) {
            logger.warn('[Canonica Integration] No data in event snapshot');
            return;
        }

        const eventId = firestoreEvent.params.eventId;
        const event = snapshot.data() as IntegrationEvent;

        logger.info('[Canonica Integration] Processing event', { eventType: event.eventType, eventId });

        const result = await processEvent(eventId, event);

        logger.info('[Canonica Integration] Event processed', { eventId, delivered: result.delivered, failed: result.failed });
    }
);

// ═══════════════════════════════════════════════════════════════
// KB INGESTION CALLABLES
// These run inside the Canonica Firebase project. The dashboard calls them via
// canonicaFunctions so separate-mode production does not fall back to MenuList.
// ═══════════════════════════════════════════════════════════════

export const embedArticleWorker = onTaskDispatched(CANONICA_AI_OPTIONS, async (request) => {
    const { articleData, jobId } = request.data as { articleData: EmbedArticleType; jobId: string };

    if (!articleData?.id || !jobId) {
        throw new HttpsError('invalid-argument', 'Missing required payload: articleData.id, jobId.');
    }

    logger.info('[Canonica KB] Re-embedding queued article', { jobId, articleId: articleData.id });
    await embedArticleWorkerLogic(articleData, jobId);
});

export const regenerateEmbedding = onCall(CANONICA_AI_OPTIONS, async (request) => {
    const caller = assertCanonicaPlatformCallable(request, 'regenerateEmbedding');
    const { articleId } = request.data || {};
    if (!articleId) {
        throw new HttpsError('invalid-argument', 'The function must be called with articleId.');
    }

    logger.info('[Canonica KB] Authorized regenerateEmbedding request', {
        articleId,
        uid: caller.uid,
        platformRole: caller.platformRole,
    });
    return regenerateEmbeddingLogic(articleId);
});

export const publishApprovedJobFn = onCall(CANONICA_AI_OPTIONS, async (request) => {
    const caller = assertCanonicaPlatformCallable(request, 'publishApprovedJobFn');
    const { jobId, finalCategories }: { jobId: string; finalCategories: IngestionJobCategoriesMap } = request.data || {};
    if (!jobId || !finalCategories) {
        throw new HttpsError('invalid-argument', 'Missing required payload: jobId, finalCategories.');
    }

    logger.info('[Canonica KB] Authorized publishApprovedJobFn request', {
        jobId,
        uid: caller.uid,
        platformRole: caller.platformRole,
    });
    return publishApprovedJobLogic(jobId, finalCategories);
});

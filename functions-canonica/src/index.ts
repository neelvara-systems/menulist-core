/**
 * Canonica Cloud Functions — Entry Point
 * 
 * All Canonica-specific Cloud Functions are exported from here.
 * Deploys to the "canonica" Firebase project (separate from MenuList's ecomsai).
 * 
 * Exported Functions:
 * - canonicaNightly: Scheduled 8-step batch (drift, mutation, resolution, KPI, etc.)
 * - triggerCanonicaNightly: HTTP-callable manual trigger for testing
 * 
 * @see __docs__/canonica/doctrine/07-multi-product-tenancy.md
 * @see __docs__/canonica/doctrine/08-product-separation-playbook.md
 */

// ⚠️ MUST BE FIRST: Load .env.local before any other imports (emulator)
if (process.env.FUNCTIONS_EMULATOR === 'true') {
    require('dotenv').config({ path: '.env.local' });
    console.log('[Canonica Dev] Loaded .env.local for emulator');
}

import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { runCanonicaNightly } from './canonica/canonicaNightly';
import { FUNCTION_FLAGS } from './constants/features';
import { processEvent } from './integrations/eventProcessor';
import { IntegrationEvent } from './integrations/types';

// ═══════════════════════════════════════════════════════════════
// CANONICA NIGHTLY SCHEDULER
// 8-step batch: drift → resolution → mutation → KPI → fallback → impact → confidence → TTL
// Runs daily at 3:00 AM UTC (offset from MenuList's 2:30 AM)
// ═══════════════════════════════════════════════════════════════

export const canonicaNightly = onSchedule(
    {
        schedule: '0 3 * * *',
        timeZone: 'UTC',
        timeoutSeconds: 540,
        memory: '512MiB',
        maxInstances: 1,
    },
    async () => {
        console.log('[Canonica Scheduler] Starting nightly batch...');
        const result = await runCanonicaNightly();
        console.log('[Canonica Scheduler] Complete:', JSON.stringify(result));
    }
);

// ═══════════════════════════════════════════════════════════════
// MANUAL TRIGGER (for testing/debugging)
// Call via: firebase functions:call triggerCanonicaNightly --project canonica
// ═══════════════════════════════════════════════════════════════

export const triggerCanonicaNightly = onRequest(
    {
        timeoutSeconds: 540,
        memory: '512MiB',
        maxInstances: 1,
    },
    async (req, res) => {
        console.log('[Canonica Manual] Triggered manually...');
        const result = await runCanonicaNightly();
        console.log('[Canonica Manual] Complete:', JSON.stringify(result));
        res.json(result);
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
        document: 'canonica_integrationEvents/{eventId}',
        timeoutSeconds: 60,
        memory: '256MiB',
        maxInstances: 5,
    },
    async (firestoreEvent) => {
        if (!FUNCTION_FLAGS.ENABLE_CANONICA_WORKFLOW_INTEGRATIONS) return;

        const snapshot = firestoreEvent.data;
        if (!snapshot) {
            console.warn('[Canonica Integration] No data in event snapshot');
            return;
        }

        const eventId = firestoreEvent.params.eventId;
        const event = snapshot.data() as IntegrationEvent;

        console.log(`[Canonica Integration] Processing event: ${event.eventType} (${eventId})`);

        const result = await processEvent(eventId, event);

        console.log(`[Canonica Integration] Event ${eventId}: delivered=${result.delivered}, failed=${result.failed}`);
    }
);

// ═══════════════════════════════════════════════════════════════
// FUTURE: Additional Canonica Cloud Functions
// These will be migrated from functions/ as needed:
// - embedArticleWorker (KB article embedding)
// - regenerateEmbedding (single article re-embedding)
// - publishApprovedJob (KB job publishing)
// - kbQuality (KB quality analysis)
// ═══════════════════════════════════════════════════════════════

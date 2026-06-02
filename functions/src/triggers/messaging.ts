/**
 * Messaging Onboarding Triggers
 * ═══════════════════════════════════════════════════════════════
 * 
 * WhatsApp webhook, extraction watcher, and related triggers
 * for the Zero-Friction SMB Acquisition Engine.
 * 
 * @see __docs__/messaging-onboarding/messaging-onboarding_impl.md
 */

import * as functions from 'firebase-functions';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { FUNCTION_OPTIONS, SECRET_GROUPS } from '../config/secrets';
import { handleExtractionJobUpdate, messagingOnboardingWebhook } from '../messagingOnboarding';
import { MENU_IMAGE_PROCESSING_JOBS_COLLECTION } from '../types';

// Messaging onboarding webhook — onRequest (first in codebase — §19.1)
// Route: /messagingOnboarding/{provider}
export const messagingOnboarding = onRequest(
    {
        ...FUNCTION_OPTIONS.messagingWebhook,
        secrets: Array.from(new Set([
            ...SECRET_GROUPS.WHATSAPP,
            ...SECRET_GROUPS.PLATFORM_ALERT_DELIVERY,
        ])),
    },
    messagingOnboardingWebhook,
);

// Extraction watcher — detects when extraction completes for messaging onboarding jobs
// Uses onDocumentUpdated on menuImageProcessingJobs (same collection as dashboard extraction)
// @see impl.md §8.2.6 — ADR-9
export const msgExtractionWatcher = onDocumentUpdated(
    {
        ...FUNCTION_OPTIONS.base,
        timeoutSeconds: 540,
        secrets: Array.from(new Set([
            ...SECRET_GROUPS.WHATSAPP_OUTBOUND,
            ...SECRET_GROUPS.PLATFORM_ALERT_DELIVERY,
        ])),
        document: `${MENU_IMAGE_PROCESSING_JOBS_COLLECTION}/{jobId}`,
    },
    async (event) => {
        const before = event.data?.before.data();
        const after = event.data?.after.data();
        if (!before || !after) return;

        // Early return for non-messaging-onboarding jobs (cost: ~zero)
        if (!after.projectId?.startsWith('msg-onboarding-')) return;

        try {
            await handleExtractionJobUpdate(event.params.jobId, before, after);
        } catch (error: any) {
            functions.logger.error('[msgExtractionWatcher] Failed', {
                jobId: event.params.jobId,
                error: error.message,
            });
        }
    },
);

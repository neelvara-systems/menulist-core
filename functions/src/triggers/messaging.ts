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
import { isMessagingOnboardingMenuExtractionProjectId } from '../sharedData/menuExtractionJob';
import { MENU_IMAGE_PROCESSING_JOBS_COLLECTION } from '../types';
import { getBoundedFunctionsErrorCode, getBoundedFunctionsErrorStatus, getBoundedFunctionsErrorName } from '../utils/boundedErrorContext';

const MSG_EXTRACTION_WATCHER_FAILED = 'MSG_EXTRACTION_WATCHER_FAILED';

function getMessagingTriggerStringContext(label: string, value: unknown): Record<string, boolean | number> {
    const normalized = value === undefined || value === null ? '' : String(value);
    return {
        [`${label}Present`]: normalized.length > 0,
        [`${label}Length`]: normalized.length,
    };
}

function getMessagingTriggerErrorCode(error: Error): string | undefined {
    return getBoundedFunctionsErrorCode(error);
}

function getMessagingTriggerErrorStatus(error: Error): number | undefined {
    return getBoundedFunctionsErrorStatus(error);
}

function getMessagingTriggerErrorName(error: unknown): string {
    return getBoundedFunctionsErrorName(error) || 'Error';
}

function getMessagingTriggerErrorContext(error: unknown): {
    sourceErrorName: string;
    sourceErrorCode?: string;
    sourceErrorStatus?: number;
} {
    if (error instanceof Error) {
        return {
            sourceErrorName: getMessagingTriggerErrorName(error),
            sourceErrorCode: getMessagingTriggerErrorCode(error),
            sourceErrorStatus: getMessagingTriggerErrorStatus(error),
        };
    }

    return {
        sourceErrorName: getMessagingTriggerErrorName(error),
    };
}

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
        retry: true,
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
        if (!isMessagingOnboardingMenuExtractionProjectId(after.projectId)) return;

        try {
            await handleExtractionJobUpdate(event.params.jobId, before, after);
        } catch (error) {
            functions.logger.error('[msgExtractionWatcher] Failed', {
                failureCode: MSG_EXTRACTION_WATCHER_FAILED,
                ...getMessagingTriggerStringContext('jobId', event.params.jobId),
                ...getMessagingTriggerErrorContext(error),
            });
            throw error;
        }
    },
);

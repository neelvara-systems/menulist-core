/**
 * Shared Callable Functions
 * ═══════════════════════════════════════════════════════════════
 * 
 * onCall and onTaskDispatched functions available in ALL environments.
 * These are invoked directly by the client or task queue.
 */

import * as functions from 'firebase-functions';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { FUNCTION_OPTIONS } from '../config/secrets';
import { ECOMSAI_PLATFORM_USER_ROLE } from '../constants/user';
import { embedArticleWorkerLogic } from '../logic/embedArticleWorker';
import { processMenuImagesLogic } from '../logic/processMenuImages';
import { publishApprovedJobLogic } from '../logic/publishApprovedJob';
import { regenerateEmbeddingLogic } from '../logic/regenerateEmbedding';
import {
    EmbedArticleType,
    IngestionJobCategoriesMap,
    ProcessMenuImagesRequest,
} from '../types';

function getRequesterRole(request: { auth?: { token?: Record<string, any> } }): string {
    return String(request.auth?.token?.platformRole || request.auth?.token?.role || '');
}

function assertAuthenticatedAccount(request: { auth?: { token?: Record<string, any> } }, action: string) {
    if (!request.auth) {
        throw new HttpsError('unauthenticated', `Must be authenticated to ${action}.`);
    }

    const token = request.auth.token || {};
    if (token.active === false || token.isVerified === false || token.deleted === true) {
        throw new HttpsError('permission-denied', 'Account is not allowed to perform this action.');
    }
}

function assertPlatformOwner(request: { auth?: { token?: Record<string, any> } }, action: string) {
    assertAuthenticatedAccount(request, action);

    if (getRequesterRole(request) !== ECOMSAI_PLATFORM_USER_ROLE) {
        throw new HttpsError('permission-denied', `Only platform owners can ${action}.`);
    }
}

function assertStoreScopedAccount(request: { auth?: { token?: Record<string, any> } }, action: string) {
    assertAuthenticatedAccount(request, action);

    if (getRequesterRole(request) === ECOMSAI_PLATFORM_USER_ROLE) return;

    const token = request.auth?.token || {};
    const tenantId = token.tenantId || token.tId;
    const storeId = token.storeId || token.sId;

    if (!tenantId || !storeId) {
        throw new HttpsError('failed-precondition', 'Tenant ID and Store ID are required for this action.');
    }
}

function assertFirestoreDocumentId(value: unknown, fieldName: string): string {
    const id = typeof value === 'string' ? value.trim() : '';
    if (!id || id === '.' || id === '..' || id.includes('/') || /^__.*__$/.test(id)) {
        throw new HttpsError('invalid-argument', `${fieldName} must be a valid Firestore document ID.`);
    }
    return id;
}

// ═══════════════════════════════════════════════════════════════
// KB INGESTION — Shared callable functions
// ═══════════════════════════════════════════════════════════════

// STEP 6 (PART 2) - The Worker - Triggered by the Task Queue
export const embedArticleWorker = onTaskDispatched(FUNCTION_OPTIONS.aiCallable, async (request) => {
    const data = request.data;
    const logger = functions.logger;
    const { articleData, jobId } = data as { articleData: EmbedArticleType; jobId: string };

    logger.info(`[${jobId}] Worker starting to re-embed article ${articleData.id}.`);
    await embedArticleWorkerLogic(articleData, jobId);
});

// ON-SAVE HOOK - Triggered by the client UI
export const regenerateEmbedding = onCall(FUNCTION_OPTIONS.aiCallable, async (request) => {
    assertPlatformOwner(request, 'regenerate knowledge-base embeddings');

    const articleId = assertFirestoreDocumentId(request.data?.articleId, 'articleId');
    await regenerateEmbeddingLogic(articleId);
});

// STEP 6 & 7 (PART 1) - The Orchestrator - Triggered by the client UI
export const publishApprovedJobFn = onCall(FUNCTION_OPTIONS.aiCallable, async (request) => {
    assertPlatformOwner(request, 'publish approved knowledge-base jobs');

    const { finalCategories }: { finalCategories: IngestionJobCategoriesMap } = request.data;
    const jobId = assertFirestoreDocumentId(request.data?.jobId, 'jobId');
    if (!finalCategories) {
        throw new HttpsError('invalid-argument', 'Missing required payload: jobId, finalCategories.');
    }

    await publishApprovedJobLogic(jobId, finalCategories);
});

// ═══════════════════════════════════════════════════════════════
// MENU IMAGE PROCESSING — Parallel callable
// ═══════════════════════════════════════════════════════════════

/**
 * Process menu images in parallel using Gemini AI.
 * Extended timeout (540s) and better memory (2GB) vs Next.js API routes.
 */
export const processMenuImages = onCall(
    FUNCTION_OPTIONS.aiParallel,
    async (request) => {
        assertStoreScopedAccount(request, 'process menu images');

        const logger = functions.logger;
        const data = request.data as ProcessMenuImagesRequest;

        // Validate required fields
        if (!data.files || !Array.isArray(data.files) || data.files.length === 0) {
            throw new HttpsError('invalid-argument', 'files array is required and must not be empty');
        }

        if (!data.targetLanguages || !Array.isArray(data.targetLanguages)) {
            throw new HttpsError('invalid-argument', 'targetLanguages array is required');
        }

        // Validate each file
        for (const file of data.files) {
            if (!file.url) {
                throw new HttpsError('invalid-argument', `File "${file.name}" is missing URL`);
            }
            if (!file.url.startsWith('https://') && !file.url.startsWith('data:')) {
                throw new HttpsError('invalid-argument', `File "${file.name}" has invalid URL (must be HTTPS or data URI)`);
            }
        }

        logger.info('[processMenuImages] Function called', {
            filesCount: data.files.length,
            targetLanguages: data.targetLanguages.map(l => l.code),
            projectId: data.projectId,
            fileId: data.fileId,
        });

        try {
            const result = await processMenuImagesLogic(data);
            return result;
        } catch (error: any) {
            logger.error('[processMenuImages] Function error', { error: error.message });

            if (error.message?.includes('Rate limit')) {
                throw new HttpsError('resource-exhausted', error.message);
            }
            throw new HttpsError('internal', error.message || 'Image processing failed');
        }
    },
);

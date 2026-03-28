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
import { embedArticleWorkerLogic } from '../logic/embedArticleWorker';
import { processMenuImagesLogic } from '../logic/processMenuImages';
import { publishApprovedJobLogic } from '../logic/publishApprovedJob';
import { regenerateEmbeddingLogic } from '../logic/regenerateEmbedding';
import {
    EmbedArticleType,
    IngestionJobCategoriesMap,
    ProcessMenuImagesRequest,
} from '../types';

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
    const { articleId } = request.data;
    if (!articleId) {
        throw new HttpsError('invalid-argument', 'The function must be called with one argument "articleId".');
    }
    await regenerateEmbeddingLogic(articleId);
});

// STEP 6 & 7 (PART 1) - The Orchestrator - Triggered by the client UI
export const publishApprovedJobFn = onCall(FUNCTION_OPTIONS.aiCallable, async (request) => {
    const { jobId, finalCategories }: { jobId: string; finalCategories: IngestionJobCategoriesMap } = request.data;
    if (!jobId || !finalCategories) {
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

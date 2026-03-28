import * as functions from 'firebase-functions';
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FUNCTION_OPTIONS, isDeployed } from './config/secrets';
import { finalizePublishLogic } from './logic/finalizePublish';
import { processMenuImagesJobLogic } from './logic/processMenuImagesJob';
import { startGenerationLogic } from "./logic/startGeneration";
import { IngestionJob, MenuImageProcessingJob } from "./types";

// A helper to ensure these functions can only be called in a dev environment
const ensureDevEnvironment = () => {
    if (isDeployed) {
        throw new HttpsError('failed-precondition', 'This function is for development and testing only.');
    }
};

/**
 * DEV-ONLY CALLABLE: Manually triggers the 'startGeneration' logic.
 * Simulates the onDocumentCreated trigger.
 */
export const dev_triggerStartGeneration = onCall(FUNCTION_OPTIONS.aiCallable, async (request) => {
    ensureDevEnvironment();
    const { jobId, jobData } = request.data;
    if (!jobId || !jobData) throw new HttpsError('invalid-argument', 'jobId and jobData are required.');

    functions.logger.info(`[DEV_TRIGGER] Manually starting generation for job ${jobId}`);
    await startGenerationLogic(jobId, jobData as IngestionJob);
    return { success: true, message: `Successfully triggered generation for ${jobId}` };
});

/**
 * DEV-ONLY CALLABLE: Manually triggers the 'finalizePublish' logic.
 * Simulates the final onDocumentUpdated trigger.
 */
export const dev_triggerFinalizePublish = onCall(FUNCTION_OPTIONS.aiCallable, async (request) => {
    ensureDevEnvironment();
    const { jobId, jobData } = request.data;
    if (!jobId || !jobData) throw new HttpsError('invalid-argument', 'jobId and jobData are required.');

    functions.logger.info(`[DEV_TRIGGER] Manually finalizing publish for job ${jobId}`);
    await finalizePublishLogic(jobData as IngestionJob, jobId);
    return { success: true };
});

// ═══════════════════════════════════════════════════════════════════════════
// MENU IMAGE PROCESSING JOB QUEUE
// Spec Reference: MENU-IMAGE-PROCESSING-JOB-QUEUE-SPEC.md Section 2, Question 1
// ═══════════════════════════════════════════════════════════════════════════


/**
 * DEV-ONLY CALLABLE: Manually triggers the 'processMenuImagesJob' logic.
 * Simulates the onDocumentCreated trigger for menu image processing jobs.
 * 
 * Usage from client (emulator only):
 * ```typescript
 * const devTrigger = httpsCallable(functions, 'dev_triggerProcessMenuImages');
 * await devTrigger({ jobId, jobData });
 * ```
 */
export const dev_triggerProcessMenuImages = onCall(FUNCTION_OPTIONS.aiParallel, async (request) => {
    try {
        functions.logger.info(`[DEV_TRIGGER] Called with data:`, request.data);

        ensureDevEnvironment();
        const { jobId, jobData } = request.data;

        functions.logger.info(`[DEV_TRIGGER] Extracted data:`, { jobId, jobDataKeys: jobData ? Object.keys(jobData) : null });

        if (!jobId || !jobData) {
            functions.logger.error(`[DEV_TRIGGER] Missing data:`, { jobId: !!jobId, jobData: !!jobData });
            throw new HttpsError('invalid-argument', 'jobId and jobData are required.');
        }

        functions.logger.info(`[DEV_TRIGGER] Processing menu images for job ${jobId}`);
        await processMenuImagesJobLogic(jobId, jobData as MenuImageProcessingJob);
        return {
            success: true,
            message: `Successfully triggered processing for ${jobId}`,
        };
    } catch (error) {
        functions.logger.error(`[DEV_TRIGGER] Error:`, error);
        throw error;
    }
});
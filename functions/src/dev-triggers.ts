import * as functions from 'firebase-functions';
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { FUNCTION_OPTIONS, isDeployed } from './config/secrets';
import { finalizePublishLogic } from './logic/finalizePublish';
import { processMenuImagesJobLogic } from './logic/processMenuImagesJob';
import { startGenerationLogic } from "./logic/startGeneration";
import { IngestionJob, MenuImageProcessingJob } from "./types";

const DEV_TRIGGER_FAILED_CODE = 'DEV_TRIGGER_FAILED';
const DEV_TRIGGER_MISSING_DATA_CODE = 'DEV_TRIGGER_MISSING_DATA';

function boundedDiagnosticValue(value: unknown): string | number | boolean | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed ? trimmed.slice(0, 80) : null;
    }
    return null;
}

function getDevTriggerRequestContext(data: unknown, triggerName: string): Record<string, string | number | boolean | null> {
    const requestData = data && typeof data === 'object' ? data as Record<string, unknown> : {};
    const jobId = typeof requestData.jobId === 'string' ? requestData.jobId : '';
    const jobData = requestData.jobData && typeof requestData.jobData === 'object' ? requestData.jobData as Record<string, unknown> : null;
    return {
        triggerName,
        hasJobId: Boolean(jobId),
        jobIdLength: jobId.length,
        hasJobData: Boolean(jobData),
        jobDataKeyCount: jobData ? Object.keys(jobData).length : 0,
    };
}

function getDevTriggerErrorContext(error: unknown): Record<string, string | number | boolean | null> {
    const sourceError = error as { code?: unknown; status?: unknown; statusCode?: unknown };
    return {
        sourceErrorName: error instanceof Error ? (error.name || 'Error').slice(0, 80) : typeof error,
        sourceErrorCode: boundedDiagnosticValue(sourceError?.code),
        sourceErrorStatus: boundedDiagnosticValue(sourceError?.status || sourceError?.statusCode),
    };
}

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

    functions.logger.info('[DEV_TRIGGER] Manually starting generation.', getDevTriggerRequestContext(request.data, 'dev_triggerStartGeneration'));
    await startGenerationLogic(jobId, jobData as IngestionJob);
    return { success: true, message: 'Successfully triggered generation.' };
});

/**
 * DEV-ONLY CALLABLE: Manually triggers the 'finalizePublish' logic.
 * Simulates the final onDocumentUpdated trigger.
 */
export const dev_triggerFinalizePublish = onCall(FUNCTION_OPTIONS.aiCallable, async (request) => {
    ensureDevEnvironment();
    const { jobId, jobData } = request.data;
    if (!jobId || !jobData) throw new HttpsError('invalid-argument', 'jobId and jobData are required.');

    functions.logger.info('[DEV_TRIGGER] Manually finalizing publish.', getDevTriggerRequestContext(request.data, 'dev_triggerFinalizePublish'));
    await finalizePublishLogic(jobData as IngestionJob, jobId);
    return { success: true };
});

// ═══════════════════════════════════════════════════════════════════════════
// MENU IMAGE PROCESSING JOB QUEUE
// Spec Reference: menu-image-processing-job-queue-spec.md Section 2, Question 1
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
        functions.logger.info('[DEV_TRIGGER] Called.', getDevTriggerRequestContext(request.data, 'dev_triggerProcessMenuImages'));

        ensureDevEnvironment();
        const { jobId, jobData } = request.data;

        functions.logger.info('[DEV_TRIGGER] Extracted data.', getDevTriggerRequestContext(request.data, 'dev_triggerProcessMenuImages'));

        if (!jobId || !jobData) {
            functions.logger.error('[DEV_TRIGGER] Missing data.', {
                failureCode: DEV_TRIGGER_MISSING_DATA_CODE,
                ...getDevTriggerRequestContext(request.data, 'dev_triggerProcessMenuImages'),
            });
            throw new HttpsError('invalid-argument', 'jobId and jobData are required.');
        }

        functions.logger.info('[DEV_TRIGGER] Processing menu images.', getDevTriggerRequestContext(request.data, 'dev_triggerProcessMenuImages'));
        await processMenuImagesJobLogic(jobId, jobData as MenuImageProcessingJob);
        return {
            success: true,
            message: 'Successfully triggered processing.',
        };
    } catch (error) {
        functions.logger.error('[DEV_TRIGGER] Error.', {
            failureCode: DEV_TRIGGER_FAILED_CODE,
            ...getDevTriggerRequestContext(request.data, 'dev_triggerProcessMenuImages'),
            ...getDevTriggerErrorContext(error),
        });
        throw error;
    }
});

export const dynamic = 'force-dynamic';
import { BATCH_IMAGE_GENERATION_JOB_STATUS } from '@constant/AI';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { markImageBatchProcessingJobFailedAdmin, updateImageBatchProcessingJobAdmin } from '@database/imageBatchProcessing/server';
import { checkAICapacity } from '@lib/ai/capacityCheck';
import { sanitizeImageGenerationConfigForLogging } from '@lib/ai/imageOperationLogging';
import { enqueueImageGenerationTask } from '@lib/google/cloudTask';
import { logger } from '@lib/monitoring/logger';
import { getLinkedOutletPolicyBlockReason } from '@lib/multiOutlet/serverOutletPolicy';
import { checkBatchOperationLimit } from '@lib/rateLimit/helpers';
import { validateAPIInput } from '@lib/security/inputValidation';
import { buildSecurityContext } from '@lib/security/securityContext';
import { BatchImageGenerationRequestSchema } from '@lib/validation/apiSchemas';
import { GenerateImageViaApiPayloadBatchType } from '@template/main-app/projects/types';
import { getISOStringDate } from '@util/dateTime';
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { AI_MODEL_TYPE } from "../generators";
import { getImagePrompts } from "../prompt";
import { withAuth } from "../../../../middleware/auth";

const LOG_FILE = "batch-image-generation.log"
const AI_MODEL: AI_MODEL_TYPE = "GEMINI";

function isFailedTaskResult(result: PromiseSettledResult<unknown>) {
    return result.status === 'rejected'
        || (result.status === 'fulfilled'
            && Boolean(result.value)
            && typeof result.value === 'object'
            && 'error' in result.value);
}

function summarizeTaskResults(results: PromiseSettledResult<unknown>[]) {
    return {
        failedCount: results.filter(isFailedTaskResult).length,
        fulfilledCount: results.filter((result) => result.status === 'fulfilled').length,
        totalCount: results.length,
    };
}

function summarizeFailedTask(result: PromiseSettledResult<unknown>) {
    if (result.status === 'rejected') {
        return { message: result.reason instanceof Error ? result.reason.message : 'Task enqueue rejected' };
    }
    if (result.value && typeof result.value === 'object') {
        const value = result.value as { error?: unknown; menuItemId?: unknown };
        return {
            error: typeof value.error === 'string' ? value.error : 'Task enqueue failed',
            menuItemId: value.menuItemId,
        };
    }
    return { message: 'Task enqueue failed' };
}

function getBatchPromptEstimate({
    businessType,
    generationConfig,
    itemsList,
    projectId,
}: Required<Pick<GenerateImageViaApiPayloadBatchType, 'generationConfig' | 'itemsList' | 'projectId'>> & Pick<GenerateImageViaApiPayloadBatchType, 'businessType'>) {
    return itemsList.reduce((summary, itemDetails) => {
        const prompts = getImagePrompts({
            businessType: businessType || '',
            generationConfig,
            itemDetails,
            projectId,
        }, AI_MODEL);

        if (!prompts.length) {
            summary.itemsWithoutPrompts.push(itemDetails.id || itemDetails.name || 'unknown');
        }

        summary.estimatedQuantity += Math.max(
            prompts.length,
            Number(generationConfig?.numberOfImages || 1),
            1,
        );

        return summary;
    }, {
        estimatedQuantity: 0,
        itemsWithoutPrompts: [] as string[],
    });
}

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;

    try {

        // �️ SAFE_MODE: Block expensive operations during system maintenance
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        // �🔒 RATE LIMITING: Prevent batch job spam (3 per 5 minutes)
        const rateLimitResponse = await checkBatchOperationLimit();
        if (rateLimitResponse) return rateLimitResponse;

        // 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const rawData = await request.json();
        const validation = validateAPIInput(BatchImageGenerationRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            // Log to Sentry (potential attack attempt - HIGH severity: batch expensive operations)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/image-generation/batch-trigger',
                error: errorMsg,
                attemptedData: {
                    itemsListCount: rawData?.itemsList?.length || 0,
                    projectId: rawData?.projectId,
                    jobId: rawData?.jobId,
                },
            }, 'high'); // HIGH severity - batch expensive operations

            await writeMissingParamsLogEntry(LOG_FILE, userId, rawData?.projectId, '', {
                error: errorMsg,
                hasGenerationConfig: !!rawData?.generationConfig,
                hasReferenceImage: !!rawData?.generationConfig?.referanceImage?.url,
                itemsListCount: rawData?.itemsList?.length || 0,
                projectId: rawData?.projectId,
                jobId: rawData?.jobId,
            });
            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const { generationConfig, projectId, itemsList, businessType, jobId } = validation.data as unknown as Required<Pick<GenerateImageViaApiPayloadBatchType, 'generationConfig' | 'itemsList' | 'jobId'>> & GenerateImageViaApiPayloadBatchType;

        const outletPolicyBlockReason = await getLinkedOutletPolicyBlockReason({
            action: "image",
            itemIds: itemsList.map((item) => item?.id ? String(item.id) : "").filter(Boolean),
            projectId,
            session,
        });
        if (outletPolicyBlockReason) {
            await markImageBatchProcessingJobFailedAdmin(jobId, projectId, outletPolicyBlockReason).catch((error) => {
                logger.error('Failed to mark image batch job failed after policy block', error, { jobId, projectId });
            });
            logger.security('Outlet Policy Violation - Batch Image Generation API', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/image-generation/batch-trigger',
                projectId,
                reason: outletPolicyBlockReason,
            }, 'medium');
            return NextResponse.json({ error: outletPolicyBlockReason }, { status: 403 });
        }

        const promptEstimate = getBatchPromptEstimate({
            businessType,
            generationConfig,
            itemsList,
            projectId,
        });
        if (promptEstimate.itemsWithoutPrompts.length > 0) {
            const reason = `Batch image generation could not build prompts for ${promptEstimate.itemsWithoutPrompts.length} item(s).`;
            await markImageBatchProcessingJobFailedAdmin(jobId, projectId, reason).catch((error) => {
                logger.error('Failed to mark image batch job failed after prompt estimation block', error, { jobId, projectId });
            });
            return NextResponse.json({
                error: reason,
                items: promptEstimate.itemsWithoutPrompts.slice(0, 10),
            }, { status: 400 });
        }

        const capacityCheck = await checkAICapacity(
            session.tId,
            session.sId,
            AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION,
            promptEstimate.estimatedQuantity,
        );
        if (!capacityCheck.allowed) {
            const reason = capacityCheck.reason === 'maintenance'
                ? 'AI enhancements are temporarily unavailable.'
                : 'Additional AI enhancements needed for this batch.';
            await markImageBatchProcessingJobFailedAdmin(jobId, projectId, reason).catch((error) => {
                logger.error('Failed to mark image batch job failed after capacity block', error, { jobId, projectId });
            });
            return NextResponse.json({
                error: reason,
                code: capacityCheck.reason,
            }, { status: 402 });
        }

        await writeLogEntry({
            logFileName: LOG_FILE,
            userId,
            projectId,
            logType: 'BATCH_GENERATION_TASK_STARTED',
            error: null,
            data: {
                generationConfig: sanitizeImageGenerationConfigForLogging(generationConfig as unknown as Record<string, unknown>),
                itemIds: itemsList.map((item) => item.id),
                itemCount: itemsList.length,
                jobId,
                promptQuantity: promptEstimate.estimatedQuantity,
            },
        });

        await updateImageBatchProcessingJobAdmin({
            id: jobId,
            requestedItemIds: itemsList.map((item) => item.id),
        }, projectId);

        const taskPromises = itemsList.map(itemDetails => enqueueImageGenerationTask({ jobId, generationConfig, projectId, businessType, itemDetails })
            .catch(e => {
                logger.error(`Failed to enqueue task for menu item ${itemDetails.id}`, e);
                return ({ menuItemId: itemDetails.id, error: e.message || 'Failed to enqueue task' })
            })
        );

        const results = await Promise.allSettled(taskPromises);

        await writeLogEntry({
            logFileName: LOG_FILE,
            userId,
            projectId,
            logType: 'BATCH_GENERATION_TASK_ENQUEUED',
            error: null,
            data: {
                jobId,
                ...summarizeTaskResults(results),
            },
        });

        const failedTasks = results.filter(isFailedTaskResult);
        if (failedTasks.length > 0) {
            logger.warn(`Some tasks failed to enqueue`, { jobId, failedCount: failedTasks.length });

            // Determine failure reason
            const allTasksFailed = failedTasks.length === itemsList.length;
            const statusReason = allTasksFailed
                ? 'GCT FAILURE: All tasks failed to enqueue.'
                : `GCT FAILURE: Failed to enqueue ${failedTasks.length}/${itemsList.length} tasks.`;

            // Single job status update
            await updateImageBatchProcessingJobAdmin({
                id: jobId,
                status: BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
                statusHistory: [
                    {
                        status: BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
                        reason: statusReason,
                        createdOn: getISOStringDate(),
                    },
                ]
            }, projectId);

            await writeLogEntry({
                logFileName: LOG_FILE,
                userId,
                projectId,
                logType: 'BATCH_GENERATION_TASK_FAILED',
                error: { message: 'Failed to enqueue tasks' },
                data: {
                    failedTasks: failedTasks.map(summarizeFailedTask),
                    jobId,
                    ...summarizeTaskResults(results),
                },
            });
            return NextResponse.json({ jobId, warning: statusReason }, { status: 500 });
        }

        await writeLogEntry({ logFileName: LOG_FILE, userId: userId, projectId: projectId, logType: 'BATCH_GENERATION_TASK_COMPLETED', error: null, data: null });
        return NextResponse.json({ data: { jobId }, message: 'Batch job started successfully' }, { status: 200 });

    } catch (error) {
        logger.error('Batch trigger API error', error);
        const errorMessage = error instanceof Error ? error.message : 'Internal Server Error';
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json({ error: 'Batch trigger failed', message: errorMessage }, { status: 500 });
    }
});

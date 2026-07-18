export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from '@config/features';
import { BATCH_IMAGE_GENERATION_JOB_STATUS } from '@constant/AI';
import { AI_ACTIONS_TYPES } from '@constant/common';
import { PERMISSIONS } from '@constant/permissions';
import {
    markImageBatchProcessingJobFailedAdmin,
    prepareImageBatchProcessingJobForTriggerAdmin,
    updateImageBatchProcessingJobAdmin,
} from '@database/imageBatchProcessing/server';
import { checkAICapacity } from '@lib/ai/capacityCheck';
import { normalizeImageBatchJobId, normalizeImageBatchProjectId } from '@lib/ai/imageBatchIdBoundary';
import { mapWithConcurrency } from '@lib/async/boundedConcurrency';
import { enqueueImageGenerationTask, getImageGenerationTaskConfigStatus } from '@lib/google/cloudTask';
import { getAIRouteSecurityContext } from '@lib/google/genAi/diagnostics';
import { logger } from '@lib/monitoring/logger';
import { getLinkedOutletPolicyBlockReason } from '@lib/multiOutlet/serverOutletPolicy';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { checkBatchOperationLimit } from '@lib/rateLimit/helpers';
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { validateAPIInput } from '@lib/security/inputValidation';
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
const BATCH_IMAGE_TRIGGER_MAX_BODY_BYTES = 4 * 1024 * 1024;
const IMAGE_BATCH_TASK_ENQUEUE_CONCURRENCY = 8;
const IMAGE_BATCH_TASK_CONFIG_MISSING = 'image_batch_task_config_missing';
const IMAGE_BATCH_TASK_ENQUEUE_FAILED = 'image_batch_task_enqueue_failed';
const IMAGE_BATCH_TASK_ENQUEUE_REJECTED = 'image_batch_task_enqueue_rejected';

type BatchImageRouteLogContext = Record<string, boolean | number | string | null | undefined>;

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
        return { failureCode: IMAGE_BATCH_TASK_ENQUEUE_REJECTED };
    }
    if (result.value && typeof result.value === 'object') {
        const value = result.value as { error?: unknown; menuItemId?: unknown };
        return {
            failureCode: value.error === IMAGE_BATCH_TASK_ENQUEUE_FAILED
                ? IMAGE_BATCH_TASK_ENQUEUE_FAILED
                : IMAGE_BATCH_TASK_ENQUEUE_REJECTED,
            menuItemId: value.menuItemId,
        };
    }
    return { failureCode: IMAGE_BATCH_TASK_ENQUEUE_REJECTED };
}

function getBatchGenerationConfigSummary(config: Record<string, any> | undefined | null) {
    return {
        aspectRatio: typeof config?.aspectRatio === 'string' ? config.aspectRatio : undefined,
        colorCount: Array.isArray(config?.colors) ? config.colors.length : 0,
        compositionCount: Array.isArray(config?.compositions) ? config.compositions.length : 0,
        environmentCount: Array.isArray(config?.environments) ? config.environments.length : 0,
        hasBackgroundColor: Boolean(config?.backgroundColor),
        hasForegroundColor: Boolean(config?.foregroundColor),
        hasNegativePrompt: Boolean(config?.negativePrompt),
        hasPrompt: typeof config?.prompt === 'string' && config.prompt.length > 0,
        hasReferenceImage: Boolean(config?.referanceImage?.url),
        isMultiMode: Boolean(config?.isMultiMode),
        lightingCount: Array.isArray(config?.lighting) ? config.lighting.length : 0,
        moodCount: Array.isArray(config?.moods) ? config.moods.length : 0,
        negativePromptLength: typeof config?.negativePrompt === 'string' ? config.negativePrompt.length : 0,
        numberOfImages: Number(config?.numberOfImages || 1),
        promptLength: typeof config?.prompt === 'string' ? config.prompt.length : 0,
        selectedImageTypeCount: Array.isArray(config?.selectedImageTypes) ? config.selectedImageTypes.length : 0,
        styleCount: Array.isArray(config?.styles) ? config.styles.length : 0,
        stylesCategoryPresent: Boolean(config?.stylesCategory),
        transparentBg: Boolean(config?.transparentBg),
    };
}

function getBatchImageRouteLogContext({
    itemCount,
    itemId,
    jobId,
    projectId,
}: {
    itemCount?: number;
    itemId?: unknown;
    jobId?: unknown;
    projectId?: unknown;
}): BatchImageRouteLogContext {
    return {
        ...getBoundedRuntimeStringContext('projectId', projectId),
        ...getBoundedRuntimeStringContext('jobId', jobId),
        ...getBoundedRuntimeStringContext('itemId', itemId),
        itemCount,
    };
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

        if (!prompts.length) summary.itemsWithoutPromptsCount += 1;

        summary.estimatedQuantity += Math.max(
            prompts.length,
            Number(generationConfig?.numberOfImages || 1),
            1,
        );

        return summary;
    }, {
        estimatedQuantity: 0,
        itemsWithoutPromptsCount: 0,
    });
}

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;
    let requestLogContext: BatchImageRouteLogContext = getBatchImageRouteLogContext({});

    try {
        if (!FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION) {
            return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
        }

        // �️ SAFE_MODE: Block expensive operations during system maintenance
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        // �🔒 RATE LIMITING: Prevent batch job spam (3 per 5 minutes)
        const rateLimitResponse = await checkBatchOperationLimit();
        if (rateLimitResponse) return rateLimitResponse;

        // 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const bodyResult = await readBoundedJsonBody(request, BATCH_IMAGE_TRIGGER_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return bodyResult.response;

        const rawData = bodyResult.data as any;
        requestLogContext = getBatchImageRouteLogContext({
            itemCount: Array.isArray(rawData?.itemsList) ? rawData.itemsList.length : 0,
            jobId: rawData?.jobId,
            projectId: rawData?.projectId,
        });
        const validation = validateAPIInput(BatchImageGenerationRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            // Log to Sentry (potential attack attempt - HIGH severity: batch expensive operations)
            logger.security('Input Validation Failed', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/image-generation/batch-trigger',
                error: errorMsg,
                attemptedData: requestLogContext,
            }, 'high'); // HIGH severity - batch expensive operations

            await writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, {
                error: errorMsg,
                attemptedData: {
                    ...requestLogContext,
                    hasGenerationConfig: !!rawData?.generationConfig,
                    hasReferenceImage: !!rawData?.generationConfig?.referanceImage?.url,
                },
            });
            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const { generationConfig, projectId: requestedProjectId, itemsList, businessType, jobId: requestedJobId } = validation.data as unknown as Required<Pick<GenerateImageViaApiPayloadBatchType, 'generationConfig' | 'itemsList' | 'jobId'>> & GenerateImageViaApiPayloadBatchType;
        const projectScope = normalizeImageBatchProjectId(requestedProjectId);
        const jobId = normalizeImageBatchJobId(requestedJobId);
        if (!projectScope || !jobId) {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }
        const projectId = projectScope.projectId;
        requestLogContext = getBatchImageRouteLogContext({
            itemCount: itemsList.length,
            jobId,
            projectId,
        });
        if (String(session.tId) !== projectScope.tId || String(session.sId) !== projectScope.sId) {
            logger.security('Batch image generation project/session scope mismatch', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/image-generation/batch-trigger',
                ...requestLogContext,
            }, 'critical');
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const permissionError = await requireAnyStorePermission(
            request,
            session,
            [PERMISSIONS.GENERATE_IMAGES],
            "Batch image generation",
        );
        if (permissionError) return permissionError;

        const requestedItemIds = itemsList.map((item) => String(item.id));
        const jobPreflight = await prepareImageBatchProcessingJobForTriggerAdmin({
            expectedGenerationConfig: generationConfig,
            expectedItemIds: requestedItemIds,
            jobId,
            projectId,
        });
        const persistedJob = jobPreflight.job;
        if (!jobPreflight.ready) {
            logger.security('Batch image generation job/request contract mismatch', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/image-generation/batch-trigger',
                ...requestLogContext,
                jobExists: Boolean(persistedJob),
                jobStatus: persistedJob?.status,
            }, 'high');
            return NextResponse.json({ error: 'The image batch is no longer ready to start.' }, { status: 409 });
        }

        const outletPolicyBlockReason = await getLinkedOutletPolicyBlockReason({
            action: "image",
            itemIds: itemsList.map((item) => item?.id ? String(item.id) : "").filter(Boolean),
            projectId,
            session,
        });
        if (outletPolicyBlockReason) {
            await markImageBatchProcessingJobFailedAdmin(jobId, projectId, outletPolicyBlockReason).catch((error) => {
                logRuntimeFailure('image_batch_policy_block_status_update_failed', error, requestLogContext);
            });
            logger.security('Outlet Policy Violation - Batch Image Generation API', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/image-generation/batch-trigger',
                project: getBatchImageRouteLogContext({ projectId }),
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
        if (promptEstimate.itemsWithoutPromptsCount > 0) {
            const reason = `Batch image generation could not build prompts for ${promptEstimate.itemsWithoutPromptsCount} item(s).`;
            await markImageBatchProcessingJobFailedAdmin(jobId, projectId, reason).catch((error) => {
                logRuntimeFailure('image_batch_prompt_block_status_update_failed', error, {
                    ...requestLogContext,
                    itemsWithoutPromptsCount: promptEstimate.itemsWithoutPromptsCount,
                });
            });
            return NextResponse.json({
                error: reason,
                itemsWithoutPromptsCount: promptEstimate.itemsWithoutPromptsCount,
            }, { status: 400 });
        }

        const taskConfigStatus = getImageGenerationTaskConfigStatus();
        if (!taskConfigStatus.ready) {
            const reason = 'Image generation is temporarily unavailable.';
            logRuntimeDiagnostic(IMAGE_BATCH_TASK_CONFIG_MISSING, {
                ...requestLogContext,
                ...taskConfigStatus,
            });
            await markImageBatchProcessingJobFailedAdmin(jobId, projectId, reason).catch((error) => {
                logRuntimeFailure('image_batch_config_block_status_update_failed', error, requestLogContext);
            });
            return NextResponse.json({
                error: reason,
                code: IMAGE_BATCH_TASK_CONFIG_MISSING,
            }, { status: 503 });
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
                logRuntimeFailure('image_batch_capacity_block_status_update_failed', error, {
                    ...requestLogContext,
                    capacityReason: capacityCheck.reason,
                    promptQuantity: promptEstimate.estimatedQuantity,
                });
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
                generationConfigSummary: getBatchGenerationConfigSummary(generationConfig as Record<string, any>),
                itemCount: itemsList.length,
                itemsWithIdCount: itemsList.filter((item) => Boolean(item.id)).length,
                jobId,
                promptQuantity: promptEstimate.estimatedQuantity,
            },
        });

        const results = await mapWithConcurrency(
            itemsList,
            IMAGE_BATCH_TASK_ENQUEUE_CONCURRENCY,
            async (itemDetails) => {
                const [result] = await Promise.allSettled([
                    enqueueImageGenerationTask({ jobId, generationConfig, projectId, businessType, itemDetails })
                        .catch(e => {
                            logRuntimeFailure(IMAGE_BATCH_TASK_ENQUEUE_FAILED, e, getBatchImageRouteLogContext({
                                itemCount: itemsList.length,
                                itemId: itemDetails.id,
                                jobId,
                                projectId,
                            }));
                            return ({ menuItemId: itemDetails.id, error: IMAGE_BATCH_TASK_ENQUEUE_FAILED });
                        }),
                ]);
                return result;
            },
        );

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
            logRuntimeDiagnostic(IMAGE_BATCH_TASK_ENQUEUE_REJECTED, {
                ...requestLogContext,
                failedCount: failedTasks.length,
            });

            const failedItemIds = failedTasks
                .map(summarizeFailedTask)
                .map((failure) => failure.menuItemId)
                .filter((itemId): itemId is string => typeof itemId === 'string');
            const allTasksFailed = failedTasks.length === itemsList.length;
            const statusReason = allTasksFailed
                ? 'Image generation could not start.'
                : 'Some image generation tasks could not start.';
            const nextStatus = allTasksFailed
                ? BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED
                : BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING;

            await updateImageBatchProcessingJobAdmin({
                enqueueFailedItemIds: failedItemIds,
                failedItemIds,
                id: jobId,
                status: nextStatus,
                statusHistory: [
                    {
                        status: nextStatus,
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
            return NextResponse.json({
                data: { failedItemIds, jobId, partial: !allTasksFailed },
                message: statusReason,
            }, { status: allTasksFailed ? 503 : 202 });
        }

        await writeLogEntry({ logFileName: LOG_FILE, userId: userId, projectId: projectId, logType: 'BATCH_GENERATION_TASK_COMPLETED', error: null, data: null });
        return NextResponse.json({ data: { failedItemIds: [], jobId, partial: false }, message: 'Batch job started successfully' }, { status: 200 });

    } catch (error) {
        logRuntimeFailure('image_batch_trigger_api_failed', error, requestLogContext);
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json(
            { error: 'Batch trigger failed', message: 'Could not start the image batch. Please try again.' },
            { status: 500 },
        );
    }
});

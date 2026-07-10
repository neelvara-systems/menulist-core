export const dynamic = 'force-dynamic';
import { BATCH_IMAGE_GENERATION_JOB_STATUS } from "@constant/AI";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { appendImageBatchItemResultAdmin, getImageBatchProcessingJobByIdAdmin, updateImageBatchProcessingJobAdmin } from "@database/imageBatchProcessing/server";
import { uploadBase64MediaImageAdmin } from "@database/storage/uploadBase64MediaImageAdmin";
import { finalizeAiOperationAccounting } from "@lib/ai/accounting";
import { checkAICapacity } from "@lib/ai/capacityCheck";
import { normalizeImageBatchJobId, normalizeImageBatchProjectId } from "@lib/ai/imageBatchIdBoundary";
import { copyCachedImagePromptToStore, isImagePromptCacheEligible, writeImagePromptCacheSource } from "@lib/ai/imageGenerationPromptCache";
import { summarizeImageProviderResponse } from "@lib/ai/imageOperationLogging";
import { mapWithConcurrency } from "@lib/async/boundedConcurrency";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { createUppercaseRandomIdSegment } from "@lib/runtime/randomId";
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { BatchImageGenerationJobType, GenerateImageViaApiPayloadBatchType, GenerateImageViaApiPayloadItemDetailsType } from "@template/main-app/projects/types";
import { getBase64Length } from "@util/utils";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from "crypto";
import { AI_MODEL_TYPE, GeneratedImagePayload, runImageGenerationPrompts } from "../generators";
import { getImagePrompts } from "../prompt";
import { validateAPIInput } from "@lib/security/inputValidation";
import { BatchImageGenerationWorkerRequestSchema } from "@lib/validation/apiSchemas";
import { hashPublicRateLimitValue } from "../../../../middleware/publicApi";

const AI_MODEL: AI_MODEL_TYPE = "GEMINI";
const LOG_FILE = "batch-image-generation.log"
const BATCH_IMAGE_WORKER_MAX_BODY_BYTES = 16 * 1024 * 1024;
const BATCH_IMAGE_WORKER_RATE_LIMIT_KEY = 'batch-image-worker';
const IMAGE_UPLOAD_CONCURRENCY = 3;
const IMAGE_BATCH_WORKER_JOB_NOT_FOUND = 'image_batch_worker_job_not_found';
const TERMINAL_JOB_STATUSES = new Set([
    BATCH_IMAGE_GENERATION_JOB_STATUS.CANCELLED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED,
]);

type BatchWorkerLogContext = Record<string, boolean | number | string | null | undefined>;

function summarizeBatchItem(item: GenerateImageViaApiPayloadItemDetailsType) {
    return {
        attributeCount: item.attributes?.length || 0,
        hasDescription: Boolean(item.description),
        ...getBoundedRuntimeStringContext('itemId', item.id),
        ...getBoundedRuntimeStringContext('itemName', item.name),
        ...getBoundedRuntimeStringContext('itemCategory', item.category),
    };
}

function getBatchWorkerLogContext({
    itemId,
    itemName,
    jobId,
    projectId,
    sId,
    status,
    tId,
}: {
    itemId?: unknown;
    itemName?: unknown;
    jobId?: unknown;
    projectId?: unknown;
    sId?: unknown;
    status?: unknown;
    tId?: unknown;
}): BatchWorkerLogContext {
    return {
        ...getBoundedRuntimeStringContext('projectId', projectId),
        ...getBoundedRuntimeStringContext('jobId', jobId),
        ...getBoundedRuntimeStringContext('itemId', itemId),
        ...getBoundedRuntimeStringContext('itemName', itemName),
        ...getBoundedRuntimeStringContext('tenantId', tId),
        ...getBoundedRuntimeStringContext('storeId', sId),
        jobStatus: status === undefined || status === null ? undefined : String(status).slice(0, 48),
    };
}

function summarizeUploadedGeneratedImages(images: Array<{ mimeType: string; uploadedUrl?: string }>) {
    return images.map((image) => ({
        hasUploadedUrl: Boolean(image.uploadedUrl),
        mimeType: image.mimeType,
    }));
}

function summarizeBatchGenerationConfig(config: Record<string, any> | undefined | null) {
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

async function uploadGeneratedImages({
    aspectRatio,
    images,
    itemDetails,
    sId,
    tId,
}: {
    aspectRatio?: string | null;
    images: GeneratedImagePayload[];
    itemDetails: GenerateImageViaApiPayloadItemDetailsType & { id: string; name: string };
    sId: string;
    tId: string;
}) {
    return mapWithConcurrency(images, IMAGE_UPLOAD_CONCURRENCY, async (imageData, index) => {
        if (!imageData.base64 || imageData.uploadedUrl) return imageData;

        const randomStr = createUppercaseRandomIdSegment(6);
        let base64Url = imageData.base64;
        if (!base64Url.startsWith('data:')) {
            base64Url = `data:${imageData.mimeType};base64,${base64Url}`;
        }

        const uploadedUrl = await uploadBase64MediaImageAdmin({
            aspectRatio,
            dataUrl: base64Url,
            entityId: `${itemDetails.id}-${index}-${randomStr}`,
            profile: 'menuItem',
            storeId: sId,
            tenantId: tId,
        });

        return {
            ...imageData,
            uploadedUrl,
        };
    });
}

function hasValidWorkerSecret(request: Request) {
    const expectedSecret = process.env.BATCH_IMAGE_GENERATION_WORKER_SECRET?.trim();
    const providedSecret = request.headers.get('x-menulist-task-secret')?.trim();
    if (!expectedSecret || !providedSecret) return false;

    const expected = Buffer.from(expectedSecret);
    const provided = Buffer.from(providedSecret);
    return expected.length === provided.length && timingSafeEqual(expected, provided);
}

async function applyBatchImageWorkerRateLimit({
    jobId,
    sId,
    tId,
}: {
    jobId: string;
    sId: string;
    tId: string;
}): Promise<Response | null> {
    const rateLimitConfig = getRateLimitForFeature('BATCH_IMAGE_WORKER');
    const tenantRateLimitHash = hashPublicRateLimitValue(tId);
    const storeRateLimitHash = hashPublicRateLimitValue(sId);
    const rateLimit = await checkRateLimit({
        key: `${BATCH_IMAGE_WORKER_RATE_LIMIT_KEY}:${tenantRateLimitHash}:${storeRateLimitHash}`,
        ...rateLimitConfig,
    });

    if (rateLimit.allowed) return null;

    const waitSeconds = Math.max(1, Math.ceil((rateLimit.resetAt - Date.now()) / 1000));
    logger.security('Rate Limit Exceeded - Batch Image Worker', {
        endpoint: '/api/image-generation/batch-generation',
        feature: 'BATCH_IMAGE_WORKER',
        ...getBatchWorkerLogContext({ jobId, sId, tId }),
    }, 'medium');

    return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter: waitSeconds },
        {
            status: 429,
            headers: {
                'Retry-After': String(waitSeconds),
                'X-RateLimit-Limit': String(rateLimitConfig.limit),
                'X-RateLimit-Remaining': '0',
                'X-RateLimit-Reset': String(rateLimit.resetAt),
            },
        },
    );
}

export async function POST(request: Request) {
    // 🛡️ SAFE_MODE: Block expensive AI operations during system maintenance
    try {
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;
    } catch (safeModeError) {
        logRuntimeFailure('image_batch_worker_safe_mode_check_failed', safeModeError, {
            endpoint: '/api/image-generation/batch-generation',
            failOpen: true,
        });
    }

    const expectedProjectId = process.env.FIREBASE_PROJECT_ID;
    const requestProjectId = request.headers.get('project-id');
    if (!expectedProjectId || requestProjectId !== expectedProjectId || !hasValidWorkerSecret(request)) {
        logger.security('Unauthorized Batch Image Generation Worker Request', {
            endpoint: '/api/image-generation/batch-generation',
            error: 'Missing or invalid Cloud Tasks project header/secret',
            hasExpectedProjectId: Boolean(expectedProjectId),
            hasRequestProjectId: Boolean(requestProjectId),
            hasWorkerSecret: Boolean(process.env.BATCH_IMAGE_GENERATION_WORKER_SECRET),
        }, 'critical');

        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let userIdForLog = 'N/A';
    const bodyResult = await readBoundedJsonBody(request, BATCH_IMAGE_WORKER_MAX_BODY_BYTES);
    if (bodyResult.ok === false) return bodyResult.response;

    const rawData = bodyResult.data as any;
    const validation = validateAPIInput(BatchImageGenerationWorkerRequestSchema, rawData);
    if (!validation.success) {
        const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
        await writeMissingParamsLogEntry(LOG_FILE, userIdForLog, undefined, undefined, {
            error: errorMsg,
            attemptedData: getBatchWorkerLogContext({
                itemId: rawData?.itemDetails?.id,
                itemName: rawData?.itemDetails?.name,
                jobId: rawData?.jobId,
                projectId: rawData?.projectId,
            }),
            hasGenerationConfig: !!rawData?.generationConfig,
        });
        return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
    }

    const { generationConfig, projectId: requestedProjectId, itemDetails, businessType, jobId: requestedJobId } = validation.data as unknown as GenerateImageViaApiPayloadBatchType & { itemDetails: GenerateImageViaApiPayloadItemDetailsType & { id: string; name: string } };
    const projectScope = normalizeImageBatchProjectId(requestedProjectId);
    const jobId = normalizeImageBatchJobId(requestedJobId);
    if (!projectScope || !jobId) {
        return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    const { projectId, sId, tId } = projectScope;
    const workerLogContext = getBatchWorkerLogContext({
        itemId: itemDetails.id,
        itemName: itemDetails.name,
        jobId,
        projectId,
        sId,
        tId,
    });
    if (!tId || !sId) {
        return NextResponse.json({ error: 'Invalid project scope' }, { status: 400 });
    }

    const rateLimitResponse = await applyBatchImageWorkerRateLimit({ jobId, sId, tId });
    if (rateLimitResponse) return rateLimitResponse;

    const currentJobData = await getImageBatchProcessingJobByIdAdmin(jobId, { tId, sId });

    if (!currentJobData) {
        logRuntimeDiagnostic(IMAGE_BATCH_WORKER_JOB_NOT_FOUND, workerLogContext);
        return NextResponse.json({ success: true, message: 'Task acknowledged because job no longer exists.' }, { status: 200 });
    }

    if (TERMINAL_JOB_STATUSES.has(currentJobData.status)) {
        logger.info(`Task skipped`, {
            ...workerLogContext,
            jobStatus: currentJobData.status,
        });
        await writeLogEntry({
            logFileName: LOG_FILE,
            userId: userIdForLog,
            projectId,
            logType: 'BATCH_GENERATION_IMAGE_GEN_SKIPPED',
            error: { message: 'Task skipped due to terminal job status' },
            data: {
                item: summarizeBatchItem(itemDetails),
                jobId,
                jobStatus: currentJobData.status,
            },
        });
        return NextResponse.json({ success: true, message: `Task skipped due to job ${currentJobData.status}.` }, { status: 200 });
    }

    if (currentJobData.projectId !== projectId) {
        logger.security('Batch image generation task/project mismatch', {
            endpoint: '/api/image-generation/batch-generation',
            ...workerLogContext,
            ...getBoundedRuntimeStringContext('jobProjectId', currentJobData.projectId),
        }, 'critical');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (Array.isArray(currentJobData.requestedItemIds)
        && currentJobData.requestedItemIds.length > 0
        && !currentJobData.requestedItemIds.includes(String(itemDetails.id))) {
        logger.security('Batch image generation item not registered on job', {
            endpoint: '/api/image-generation/batch-generation',
            ...workerLogContext,
            requestedItemCount: currentJobData.requestedItemIds.length,
        }, 'critical');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingItem = (currentJobData.itemsList || []).find((item) => item.id === itemDetails.id);
    if (existingItem?.images?.length) {
        logger.info('Batch image generation task skipped - item already has generated images', {
            ...workerLogContext,
            existingImageCount: existingItem.images.length,
        });
        return NextResponse.json({ success: true, message: 'Task skipped because item already has generated images.' }, { status: 200 });
    }

    const promptsToExecute = getImagePrompts({ generationConfig, projectId, itemDetails, businessType }, AI_MODEL);
    if (!promptsToExecute.length) {
        return NextResponse.json({ error: 'Image generation needs a prompt or item details.' }, { status: 400 });
    }

    const estimatedImageQuantity = Math.max(
        promptsToExecute.length,
        Number(generationConfig?.numberOfImages || 1),
        1,
    );

    let promptCacheImage: GeneratedImagePayload | null = null;
    if (isImagePromptCacheEligible({ generationConfig, prompts: promptsToExecute })) {
        promptCacheImage = await copyCachedImagePromptToStore({
            aiModel: AI_MODEL,
            entityId: `${itemDetails.id}-cache-${createUppercaseRandomIdSegment(6)}`,
            generationConfig,
            prompt: promptsToExecute[0],
            sId,
            tId,
        });
    }

    // 🔋 AI CAPACITY CHECK: Verify store has sufficient capacity (uses tId/sId from projectId)
    let capacityCheck: Awaited<ReturnType<typeof checkAICapacity>> | null = null;
    if (!promptCacheImage) {
        capacityCheck = await checkAICapacity(
            Number(tId),
            Number(sId),
            AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION,
            estimatedImageQuantity,
        );
        if (!capacityCheck.allowed) {
            logger.info('Batch image generation blocked - insufficient capacity', {
                ...workerLogContext,
                capacityReason: capacityCheck.reason,
                estimatedImageQuantity,
            });
            return NextResponse.json({
                error: capacityCheck.reason === 'maintenance'
                    ? 'AI enhancements are temporarily unavailable.'
                    : 'Additional AI enhancements needed for your menu.',
                code: capacityCheck.reason,
            }, { status: 402 });
        }
    }

    try {
        const startTime = new Date().getTime();

        await writeLogEntry({
            logFileName: LOG_FILE,
            userId: userIdForLog,
            projectId,
            logType: 'BATCH_GENERATION_IMAGE_GEN_STARTED',
            data: {
                generationConfigSummary: summarizeBatchGenerationConfig(generationConfig as Record<string, any>),
                item: summarizeBatchItem(itemDetails),
                jobId,
                promptCount: promptsToExecute.length,
                promptLengths: promptsToExecute.map((prompt) => prompt.length),
            },
        });

        const promptRun = promptCacheImage
            ? {
                failedPromptCount: 0,
                images: [promptCacheImage],
                promptCount: promptsToExecute.length,
                responses: [],
            }
            : await runImageGenerationPrompts({
                generationConfig,
                logFile: LOG_FILE,
                prompts: promptsToExecute,
                referenceImageStorageScope: { sId, tId },
            });
        let genratedImages = promptRun.images;
        const generatedImagesResponse = promptRun.responses;

        if (!promptCacheImage && isImagePromptCacheEligible({ generationConfig, prompts: promptsToExecute }) && genratedImages[0]) {
            await writeImagePromptCacheSource({
                aiModel: AI_MODEL,
                generationConfig,
                image: genratedImages[0],
                prompt: promptsToExecute[0],
            });
        }

        genratedImages = await uploadGeneratedImages({
            aspectRatio: generationConfig?.aspectRatio,
            images: genratedImages,
            itemDetails,
            sId,
            tId,
        });
        if (!genratedImages?.length) {
            throw new Error('Image generation produced no image.');
        }
        const endTime = new Date().getTime();
        const processingTime = endTime - startTime;

        // Initialize transaction object outside the if block
        let transactionObject: any = {
            totalCharge: 0,
            totalCredits: 0,
            totalTokenCount: 0,
            candidatesTokenCount: 0,
            promptTokenCount: 0,
            transactionId: null
        };

        if (promptCacheImage) {
            transactionObject = {
                ...transactionObject,
                action: AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION,
                billingMode: 'free',
                failedPromptCount: 0,
                imageCount: genratedImages.length,
                itemSummary: summarizeBatchItem(itemDetails),
                promptCacheHitCount: genratedImages.filter((image) => image.cacheHit).length,
                promptCount: promptRun.promptCount,
                generationConfigSummary: summarizeBatchGenerationConfig(generationConfig as Record<string, any>),
                projectId,
                processingTime,
                clientResponse: genratedImages.map((image: { mimeType: string }) => image.mimeType),
                model: AI_MODEL,
                geminiResponse: [],
                tokenPerCredit: TOKENS_PER_CREDIT,
                chargePerCredit: CHARGE_PER_CREDIT,
                realCostPaise: 0,
                ourChargePaise: 0,
                marginPaise: 0,
                sId: Number(sId),
                source: 'ai_image_prompt_cache',
                tId: Number(tId),
                totalCharge: 0,
                totalCredits: 0,
                totalTokenCount: 0,
                uId: userIdForLog === 'N/A' ? undefined : userIdForLog,
                unitsConsumed: 0,
            };
            const accounting = await finalizeAiOperationAccounting({
                context: { jobId, projectId, itemId: itemDetails.id, action: transactionObject.action, tId, sId, cacheHit: true },
                input: transactionObject,
                logLabel: 'Batch image generation cache hit',
            });
            transactionObject.transactionId = accounting.transactionId;
            transactionObject.unitsConsumed = accounting.unitsConsumed;
        } else if (generatedImagesResponse?.length > 0 && capacityCheck) {
            generatedImagesResponse.forEach((response) => {
                const usageMetadata = response.usageMetadata;
                if (usageMetadata) {
                    transactionObject.promptTokenCount += usageMetadata.promptTokenCount || 0;
                    transactionObject.candidatesTokenCount += usageMetadata.candidatesTokenCount || 0;
                    transactionObject.totalTokenCount += usageMetadata.totalTokenCount || 0;
                }
            });

            // Calculate total credits and charge based on cumulative Gemini tokens.
            transactionObject.totalCredits = transactionObject.totalTokenCount / TOKENS_PER_CREDIT;
            transactionObject.totalCharge = CHARGE_PER_CREDIT * transactionObject.totalCredits; // in paise

            // Update the transaction object with calculated values and other details
            transactionObject = {
                ...transactionObject,
                action: AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION,
                failedPromptCount: promptRun.failedPromptCount,
                imageCount: genratedImages.length,
                itemSummary: summarizeBatchItem(itemDetails),
                promptCount: promptRun.promptCount,
                generationConfigSummary: summarizeBatchGenerationConfig(generationConfig as Record<string, any>),
                projectId,
                processingTime,
                clientResponse: genratedImages.map((image: { base64: string; mimeType: string }) => image.mimeType),
                model: AI_MODEL,
                geminiResponse: generatedImagesResponse.map(summarizeImageProviderResponse),
                tokenPerCredit: TOKENS_PER_CREDIT,
                chargePerCredit: CHARGE_PER_CREDIT,
                // Deep tracking: real Google cost vs our charge vs margin (all in paise)
                realCostPaise: getRealCostPaise(AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION) * Math.max(genratedImages.length, promptRun.promptCount, 1),
                ourChargePaise: getOurChargePaise(AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION) * Math.max(genratedImages.length, promptRun.promptCount, 1),
                marginPaise: (getOurChargePaise(AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION) - getRealCostPaise(AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION)) * Math.max(genratedImages.length, promptRun.promptCount, 1),
                sId: Number(sId),
                tId: Number(tId),
                uId: userIdForLog === 'N/A' ? undefined : userIdForLog,
            };

            transactionObject.unitsConsumed = Math.max(
                capacityCheck.unitsRequired,
                getUnitCost(transactionObject.action) * Math.max(genratedImages.length, promptRun.promptCount, 1),
            );
            const accounting = await finalizeAiOperationAccounting({
                capacitySubscription: capacityCheck.subscription,
                context: { jobId, projectId, itemId: itemDetails.id, action: transactionObject.action, tId, sId },
                input: transactionObject,
                logLabel: 'Batch image generation',
            });
            transactionObject.unitsConsumed = accounting.unitsConsumed;
            transactionObject.transactionId = accounting.transactionId;
        }

        const randomStr = createUppercaseRandomIdSegment(6);
        const updatedItem = {
            id: itemDetails.id,
            name: itemDetails.name,
            images: genratedImages.map((image: { base64: string; mimeType: string; uploadedUrl?: string }, index) => {
                const imageData = {
                    name: `${itemDetails.name}`,
                    size: getBase64Length(image.base64),
                    type: image.mimeType,
                    url: image.uploadedUrl,
                    uid: `${itemDetails.id}_${index}_${randomStr}`,
                }
                return imageData;
            }),
        }

        await writeLogEntry({
            logFileName: LOG_FILE,
            userId: userIdForLog,
            projectId,
            logType: 'BATCH_GENERATION_IMAGE_GEN_SUCCESS',
            data: {
                imageCount: updatedItem.images.length,
                images: summarizeUploadedGeneratedImages(genratedImages),
                item: summarizeBatchItem(itemDetails),
                jobId,
            },
        });

        const updatedJobSummary = await appendImageBatchItemResultAdmin({
            item: updatedItem,
            jobId,
            projectId,
        });

        await writeLogEntry({
            logFileName: LOG_FILE,
            userId: userIdForLog,
            projectId,
            logType: 'BATCH_GENERATION_JOB_UPDATED',
            data: {
                jobId,
                ...updatedJobSummary,
            },
        });
        // Task succeeded, return 200 OK to Cloud Tasks
        return NextResponse.json({ success: true, message: 'Image generation completed for this item.' }, { status: 200 });

    } catch (error) {
        logRuntimeFailure('image_batch_worker_generation_failed', error, workerLogContext);
        await writeErrorLogEntry(LOG_FILE, error);
        const ownerSafeError = 'Image generation failed for this item.';
        const ownerSafeReason = 'Image generation failed for this item.';
        // Update job with error for this specific item if possible, or general job error
        try {

            const latestJobData = await getImageBatchProcessingJobByIdAdmin(jobId, { tId, sId });
            const failedAttemptCount = (latestJobData?.generatedCount || currentJobData.generatedCount || 0) + 1;
            const nextStatus = failedAttemptCount >= (latestJobData?.totalImages || currentJobData.totalImages)
                ? BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED
                : BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING;

            await updateImageBatchProcessingJobAdmin({
                error: ownerSafeError,
                id: jobId,
                generatedCount: failedAttemptCount,
                status: nextStatus,
                statusHistory: [
                    ...(latestJobData?.statusHistory || currentJobData.statusHistory),
                    {
                        status: BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
                        reason: ownerSafeReason,
                        createdOn: new Date().toISOString(),
                    },
                ],
            }, projectId);
        } catch (updateError) {
            await writeErrorLogEntry(LOG_FILE, updateError);
            logRuntimeFailure('image_batch_worker_failure_status_update_failed', updateError, workerLogContext);
        }
        // For Cloud Tasks, if you return an error status (5xx), it might retry.
        // If the error is non-recoverable for this item, return 200 to stop retries for THIS task.
        // The job itself is marked as having an error.
        return NextResponse.json({ error: ownerSafeReason }, { status: 200 });
    }
}

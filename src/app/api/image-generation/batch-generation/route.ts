export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { BATCH_IMAGE_GENERATION_JOB_STATUS } from "@constant/AI";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import {
    appendImageBatchItemResultAdmin,
    claimImageBatchItemAdmin,
    getImageBatchProcessingJobByIdAdmin,
    markImageBatchItemAttemptFailedAdmin,
    stageImageBatchItemResultAdmin,
} from "@database/imageBatchProcessing/server";
import { uploadBase64MediaImageAdminWithMetadata } from "@database/storage/uploadBase64MediaImageAdmin";
import { finalizeAiOperationAccounting } from "@lib/ai/accounting";
import {
    checkAICapacity,
    refundDurableAiCapacityReservationByIdSafely,
    refundAiCapacityReservationSafely,
    reserveAiCapacity,
} from "@lib/ai/capacityCheck";
import { normalizeImageBatchJobId, normalizeImageBatchProjectId } from "@lib/ai/imageBatchIdBoundary";
import {
    areImageBatchJsonValuesEquivalent,
    getImageBatchOperationId,
    imageBatchExecutionNeedsAccounting,
    normalizeImageBatchStoredMediaMetadata,
} from "@lib/ai/imageBatchServerBoundary";
import { isImageBatchGeneratedStorageAsset } from "@lib/ai/imageBatchStorageBoundary";
import { copyCachedImagePromptToStore, isImagePromptCacheEligible, writeImagePromptCacheSource } from "@lib/ai/imageGenerationPromptCache";
import { mapWithConcurrency } from "@lib/async/boundedConcurrency";
import { logger } from "@lib/monitoring/logger";
import { checkRateLimit } from "@lib/rateLimit";
import { getRateLimitForFeature } from "@lib/rateLimit/configs";
import { getBoundedRuntimeStringContext, logRuntimeDiagnostic, logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import {
    type BatchImageAccountingInput,
    BatchImageGenerationJobType,
} from "@template/main-app/projects/types";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from "crypto";
import { AI_MODEL_TYPE, GeneratedImagePayload, IMAGE_AI_MODELS, runImageGenerationPrompts } from "../generators";
import { getImagePrompts } from "../prompt";
import { validateAPIInput } from "@lib/security/inputValidation";
import {
    type BatchImageGenerationWorkerRequest,
    BatchImageGenerationWorkerRequestSchema,
} from "@lib/validation/apiSchemas";
import { hashPublicRateLimitValue } from "../../../../middleware/publicApi";
import { storageAdmin } from '@lib/firebase/firebaseAdmin';

const AI_MODEL: AI_MODEL_TYPE = "GEMINI";
const AI_MODEL_ID = IMAGE_AI_MODELS[AI_MODEL];
const LOG_FILE = "batch-image-generation.log"
const BATCH_IMAGE_WORKER_MAX_BODY_BYTES = 256 * 1024;
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

class NonRetryableBatchImageError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NonRetryableBatchImageError';
    }
}

type BatchWorkerLogContext = Record<string, boolean | number | string | null | undefined>;

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function summarizeBatchItem(item: BatchImageGenerationWorkerRequest['itemDetails']) {
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
        jobStatus: typeof status === 'string'
            ? status.slice(0, 48)
            : (typeof status === 'number' && Number.isFinite(status) ? status.toString().slice(0, 48) : undefined),
    };
}

function summarizeUploadedGeneratedImages(images: Array<{ mimeType: string; uploadedUrl?: string }>) {
    return images.map((image) => ({
        hasUploadedUrl: Boolean(image.uploadedUrl),
        mimeType: image.mimeType,
    }));
}

function summarizeBatchGenerationConfig(config: Record<string, unknown> | undefined | null) {
    const referenceImage = isRecord(config?.referanceImage) ? config.referanceImage : null;
    return {
        aspectRatio: typeof config?.aspectRatio === 'string' ? config.aspectRatio : undefined,
        colorCount: Array.isArray(config?.colors) ? config.colors.length : 0,
        compositionCount: Array.isArray(config?.compositions) ? config.compositions.length : 0,
        environmentCount: Array.isArray(config?.environments) ? config.environments.length : 0,
        hasBackgroundColor: Boolean(config?.backgroundColor),
        hasForegroundColor: Boolean(config?.foregroundColor),
        hasNegativePrompt: Boolean(config?.negativePrompt),
        hasPrompt: typeof config?.prompt === 'string' && config.prompt.length > 0,
        hasReferenceImage: typeof referenceImage?.url === 'string' && referenceImage.url.length > 0,
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
    operationId,
    sId,
    tId,
}: {
    aspectRatio?: string | null;
    images: GeneratedImagePayload[];
    operationId: string;
    sId: string;
    tId: string;
}) {
    return mapWithConcurrency(images, IMAGE_UPLOAD_CONCURRENCY, async (imageData, index) => {
        if (imageData.uploadedUrl) {
            if (!imageData.storagePath || !isImageBatchGeneratedStorageAsset(imageData.uploadedUrl, {
                expectedBucket: storageAdmin.bucket().name,
                expectedStoragePath: imageData.storagePath,
                storeId: sId,
                tenantId: tId,
            })) {
                throw new NonRetryableBatchImageError('Generated image storage metadata is invalid.');
            }
            return imageData;
        }
        if (!imageData.base64) throw new NonRetryableBatchImageError('Generated image data is missing.');

        let base64Url = imageData.base64;
        if (!base64Url.startsWith('data:')) {
            base64Url = `data:${imageData.mimeType};base64,${base64Url}`;
        }

        const uploaded = await uploadBase64MediaImageAdminWithMetadata({
            aspectRatio,
            dataUrl: base64Url,
            entityId: operationId,
            mediaId: `${operationId}_${index}`,
            profile: 'menuItem',
            storeId: sId,
            tenantId: tId,
        });
        if (!isImageBatchGeneratedStorageAsset(uploaded.url, {
            expectedBucket: storageAdmin.bucket().name,
            expectedStoragePath: uploaded.path,
            storeId: sId,
            tenantId: tId,
        })) throw new Error('Uploaded image storage metadata is invalid.');
        const storedMetadata = normalizeImageBatchStoredMediaMetadata(uploaded);
        if (!storedMetadata) throw new Error('Uploaded image content metadata is invalid.');

        return {
            ...imageData,
            ...storedMetadata,
            storagePath: uploaded.path,
            uploadedUrl: uploaded.url,
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
        failClosedOnProviderError: true,
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

    const providerUnavailable = rateLimit.reason === 'provider_unavailable';
    return NextResponse.json(
        { error: 'Too many requests. Please try again later.', retryAfter: waitSeconds },
        {
            status: providerUnavailable ? 503 : 429,
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
            failOpen: false,
        });
        return NextResponse.json({ error: 'Image generation is temporarily unavailable.' }, { status: 503 });
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

    // Keep already-enqueued Cloud Tasks retryable while the master switch is off.
    // No job state or credit reservation is changed until the switch is restored.
    if (!FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION) {
        return NextResponse.json(
            { error: 'Image generation is temporarily unavailable.' },
            { status: 503, headers: { 'Retry-After': '60' } },
        );
    }

    let userIdForLog = 'N/A';
    const bodyResult = await readBoundedJsonBody(request, BATCH_IMAGE_WORKER_MAX_BODY_BYTES);
    if (bodyResult.ok === false) return bodyResult.response;

    const rawData = bodyResult.data;
    const rawRecord = isRecord(rawData) ? rawData : null;
    const rawItemDetails = isRecord(rawRecord?.itemDetails) ? rawRecord.itemDetails : null;
    const validation = validateAPIInput(BatchImageGenerationWorkerRequestSchema, rawData);
    if (!validation.success) {
        const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
        await writeMissingParamsLogEntry(LOG_FILE, userIdForLog, undefined, undefined, {
            error: errorMsg,
            attemptedData: getBatchWorkerLogContext({
                itemId: rawItemDetails?.id,
                itemName: rawItemDetails?.name,
                jobId: rawRecord?.jobId,
                projectId: rawRecord?.projectId,
            }),
            hasGenerationConfig: isRecord(rawRecord?.generationConfig),
        });
        return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
    }

    const { generationConfig, projectId: requestedProjectId, itemDetails, businessType, jobId: requestedJobId } = validation.data;
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

    if (currentJobData.projectId !== projectId) {
        logger.security('Batch image generation task/project mismatch', {
            endpoint: '/api/image-generation/batch-generation',
            ...workerLogContext,
            ...getBoundedRuntimeStringContext('jobProjectId', currentJobData.projectId),
        }, 'critical');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!areImageBatchJsonValuesEquivalent(currentJobData.generationConfig, generationConfig)) {
        logger.security('Batch image generation task/config mismatch', {
            endpoint: '/api/image-generation/batch-generation',
            ...workerLogContext,
        }, 'critical');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!Array.isArray(currentJobData.requestedItemIds)
        || currentJobData.requestedItemIds.length !== currentJobData.totalImages
        || !currentJobData.requestedItemIds.includes(String(itemDetails.id))) {
        logger.security('Batch image generation item not registered on job', {
            endpoint: '/api/image-generation/batch-generation',
            ...workerLogContext,
            requestedItemCount: currentJobData.requestedItemIds?.length || 0,
        }, 'critical');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const operationId = getImageBatchOperationId(jobId, String(itemDetails.id));
    if (TERMINAL_JOB_STATUSES.has(currentJobData.status)) {
        await refundDurableAiCapacityReservationByIdSafely({
            action: AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION,
            context: { endpoint: '/api/image-generation/batch-generation', jobId },
            operationId,
            reason: 'image_batch_job_terminal_before_settlement',
            sId,
            tId,
        });
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

    const claim = await claimImageBatchItemAdmin({
        itemId: String(itemDetails.id),
        jobId,
        projectId,
    });
    if (claim.state === 'in_flight') {
        return NextResponse.json(
            { error: 'Image generation is already processing this item.' },
            { status: 503, headers: { 'Retry-After': '30' } },
        );
    }
    if (claim.state !== 'claimed') {
        if (claim.state === 'failed' || claim.state === 'terminal') {
            await refundDurableAiCapacityReservationByIdSafely({
                action: AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION,
                context: { endpoint: '/api/image-generation/batch-generation', jobId },
                operationId,
                reason: `image_batch_item_${claim.state}_before_settlement`,
                sId,
                tId,
            });
        }
        return NextResponse.json({ success: true, message: `Task acknowledged because item is ${claim.state}.` }, { status: 200 });
    }
    const { claimToken, execution } = claim;
    let accountingFinalized = execution.requiresFinalization === true;
    let stagedResultPersisted = Boolean(execution.stagedItem && execution.stagedAccountingInput);
    let retainCapacityReservationForRetry = false;
    let uploadedStoragePaths: string[] = [];
    let capacityReservation: Awaited<ReturnType<typeof reserveAiCapacity>> | null = null;

    try {
        const promptsToExecute = getImagePrompts({ generationConfig, projectId, itemDetails, businessType }, AI_MODEL);
        if (!promptsToExecute.length) {
            throw new NonRetryableBatchImageError('Image generation needs a prompt or item details.');
        }

        const estimatedImageQuantity = Math.max(
            promptsToExecute.length,
            Number(generationConfig?.numberOfImages || 1),
            1,
        );
        let capacityCheck: Awaited<ReturnType<typeof checkAICapacity>> | null = null;

        if (execution.stagedItem && execution.stagedAccountingInput) {
            if (imageBatchExecutionNeedsAccounting(execution)) {
                const stagedUnits = execution.stagedAccountingInput.unitsConsumed;
                if (stagedUnits > 0) {
                    const unitCost = Math.max(getUnitCost(execution.stagedAccountingInput.action), 1);
                    capacityCheck = await checkAICapacity(
                        Number(tId),
                        Number(sId),
                        execution.stagedAccountingInput.action,
                        Math.max(1, Math.ceil(stagedUnits / unitCost)),
                    );
                    if (capacityCheck.subscription) {
                        try {
                            capacityReservation = await reserveAiCapacity({
                                action: execution.stagedAccountingInput.action,
                                idempotencyKey: execution.operationId,
                                recoveryMode: 'durable_retry',
                                sId,
                                source: 'image_batch_generation',
                                subscription: capacityCheck.subscription,
                                tId,
                                uId: userIdForLog === 'N/A' ? undefined : userIdForLog,
                                unitsToReserve: stagedUnits,
                            });
                        } catch (reservationError) {
                            if (!capacityCheck.allowed && capacityCheck.reason !== 'maintenance') {
                                throw new NonRetryableBatchImageError('Additional AI enhancements are needed for your menu.');
                            }
                            throw reservationError;
                        }
                    }
                }

                try {
                    await finalizeAiOperationAccounting({
                        capacityReservation: capacityReservation || undefined,
                        capacitySubscription: capacityCheck?.allowed ? capacityCheck.subscription : undefined,
                        context: { jobId, projectId, itemId: itemDetails.id, resumed: true, tId, sId },
                        idempotencyKey: execution.operationId,
                        input: execution.stagedAccountingInput,
                        logLabel: 'Batch image generation resumed accounting',
                    });
                    capacityReservation = null;
                    accountingFinalized = true;
                } catch (accountingError) {
                    if (capacityCheck && !capacityCheck.allowed && capacityCheck.reason !== 'maintenance') {
                        throw new NonRetryableBatchImageError('Additional AI enhancements are needed for your menu.');
                    }
                    throw accountingError;
                }
            }

            const updatedJobSummary = await appendImageBatchItemResultAdmin({
                claimToken,
                itemId: String(itemDetails.id),
                jobId,
                projectId,
            });
            await writeLogEntry({
                logFileName: LOG_FILE,
                userId: userIdForLog,
                projectId,
                logType: 'BATCH_GENERATION_JOB_UPDATED',
                data: { jobId, resumedFromStagedResult: true, ...updatedJobSummary },
            });
            return NextResponse.json({ success: true, message: 'Image generation completed for this item.' }, { status: 200 });
        }

        let promptCacheImage: GeneratedImagePayload | null = null;
        if (isImagePromptCacheEligible({ generationConfig, prompts: promptsToExecute })) {
            promptCacheImage = await copyCachedImagePromptToStore({
                aiModel: AI_MODEL,
                destinationMediaId: `${execution.operationId}_cache`,
                entityId: execution.operationId,
                generationConfig,
                prompt: promptsToExecute[0],
                sId,
                tId,
            });
        }

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
                if (capacityCheck.reason === 'maintenance') {
                    throw new Error('AI enhancements are temporarily unavailable.');
                }
                throw new NonRetryableBatchImageError('Additional AI enhancements are needed for your menu.');
            }
            capacityReservation = await reserveAiCapacity({
                action: AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION,
                idempotencyKey: execution.operationId,
                recoveryMode: 'durable_retry',
                sId,
                source: 'image_batch_generation',
                subscription: capacityCheck.subscription!,
                tId,
                uId: userIdForLog === 'N/A' ? undefined : userIdForLog,
                unitsToReserve: capacityCheck.unitsRequired,
            });
        }

        const startTime = Date.now();
        await writeLogEntry({
            logFileName: LOG_FILE,
            userId: userIdForLog,
            projectId,
            logType: 'BATCH_GENERATION_IMAGE_GEN_STARTED',
            data: {
                generationConfigSummary: summarizeBatchGenerationConfig(generationConfig),
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
        let generatedImages = promptRun.images;
        const generatedImagesResponse = promptRun.responses;

        if (!promptCacheImage && isImagePromptCacheEligible({ generationConfig, prompts: promptsToExecute }) && generatedImages[0]) {
            await writeImagePromptCacheSource({
                aiModel: AI_MODEL,
                generationConfig,
                image: generatedImages[0],
                prompt: promptsToExecute[0],
            });
        }

        generatedImages = await uploadGeneratedImages({
            aspectRatio: generationConfig?.aspectRatio,
            images: generatedImages,
            operationId: execution.operationId,
            sId,
            tId,
        });
        if (!generatedImages.length || generatedImages.some((image) => (
            !image.storagePath
            || !isImageBatchGeneratedStorageAsset(image.uploadedUrl, {
                expectedBucket: storageAdmin.bucket().name,
                expectedStoragePath: image.storagePath,
                storeId: sId,
                tenantId: tId,
            })
        ))) {
            throw new Error('Image generation produced no durable image.');
        }
        uploadedStoragePaths = generatedImages.map((image) => image.storagePath as string);
        const processingTime = Date.now() - startTime;

        const tokenTotals = generatedImagesResponse.reduce((totals, response) => {
            const usageMetadata = response.usageMetadata;
            return {
                candidatesTokenCount: totals.candidatesTokenCount + Number(usageMetadata?.candidatesTokenCount || 0),
                promptTokenCount: totals.promptTokenCount + Number(usageMetadata?.promptTokenCount || 0),
                totalTokenCount: totals.totalTokenCount + Number(usageMetadata?.totalTokenCount || 0),
            };
        }, { candidatesTokenCount: 0, promptTokenCount: 0, totalTokenCount: 0 });
        const outputQuantity = Math.max(generatedImages.length, promptRun.promptCount, 1);
        const totalCredits = tokenTotals.totalTokenCount / TOKENS_PER_CREDIT;
        const accountingInput: BatchImageAccountingInput = {
            action: AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION,
            billingMode: promptCacheImage ? 'free' as const : 'billable' as const,
            candidatesTokenCount: tokenTotals.candidatesTokenCount,
            chargePerCredit: CHARGE_PER_CREDIT,
            clientResponse: {
                generatedImageCount: generatedImages.length,
                responseSummaryKind: 'batch_image_generation' as const,
            },
            failedPromptCount: promptRun.failedPromptCount,
            imageCount: generatedImages.length,
            marginPaise: promptCacheImage
                ? 0
                : (getOurChargePaise(AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION) - getRealCostPaise(AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION)) * outputQuantity,
            model: AI_MODEL_ID,
            ourChargePaise: promptCacheImage ? 0 : getOurChargePaise(AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION) * outputQuantity,
            processingTime,
            projectId,
            promptCacheHitCount: generatedImages.filter((image) => image.cacheHit).length,
            promptCount: promptRun.promptCount,
            promptTokenCount: tokenTotals.promptTokenCount,
            realCostPaise: promptCacheImage ? 0 : getRealCostPaise(AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION) * outputQuantity,
            sId: Number(sId),
            source: promptCacheImage
                ? 'ai_image_prompt_cache' as const
                : 'gemini_image_generation' as const,
            tId: Number(tId),
            tokenPerCredit: TOKENS_PER_CREDIT,
            totalCharge: CHARGE_PER_CREDIT * totalCredits,
            totalCredits,
            totalTokenCount: tokenTotals.totalTokenCount,
            uId: userIdForLog === 'N/A' ? undefined : userIdForLog,
            unitsConsumed: promptCacheImage
                ? 0
                : capacityReservation!.unitsReserved,
        };
        const updatedItem = {
            id: String(itemDetails.id),
            name: itemDetails.name,
            images: generatedImages.map((image, index) => {
                if (!Number.isSafeInteger(image.sizeBytes) || Number(image.sizeBytes) <= 0) {
                    throw new NonRetryableBatchImageError('Generated image storage size is invalid.');
                }
                return {
                    name: itemDetails.name,
                    size: Number(image.sizeBytes),
                    type: image.mimeType,
                    uid: `${itemDetails.id}_${index}_${execution.operationId.slice(-12)}`,
                    url: image.uploadedUrl,
                };
            }),
        };

        const stagedExecution = await stageImageBatchItemResultAdmin({
            accountingInput,
            claimToken,
            item: updatedItem,
            jobId,
            projectId,
            storagePaths: uploadedStoragePaths,
        });
        stagedResultPersisted = true;
        await finalizeAiOperationAccounting({
            capacityReservation: capacityReservation || undefined,
            capacitySubscription: capacityCheck?.subscription,
            context: { jobId, projectId, itemId: itemDetails.id, tId, sId, cacheHit: Boolean(promptCacheImage) },
            idempotencyKey: execution.operationId,
            input: stagedExecution.stagedAccountingInput!,
            logLabel: promptCacheImage ? 'Batch image generation cache hit' : 'Batch image generation',
        });
        capacityReservation = null;
        accountingFinalized = true;

        await writeLogEntry({
            logFileName: LOG_FILE,
            userId: userIdForLog,
            projectId,
            logType: 'BATCH_GENERATION_IMAGE_GEN_SUCCESS',
            data: {
                imageCount: updatedItem.images.length,
                images: summarizeUploadedGeneratedImages(generatedImages),
                item: summarizeBatchItem(itemDetails),
                jobId,
            },
        });

        const updatedJobSummary = await appendImageBatchItemResultAdmin({
            claimToken,
            itemId: String(itemDetails.id),
            jobId,
            projectId,
        });
        await writeLogEntry({
            logFileName: LOG_FILE,
            userId: userIdForLog,
            projectId,
            logType: 'BATCH_GENERATION_JOB_UPDATED',
            data: { jobId, ...updatedJobSummary },
        });
        return NextResponse.json({ success: true, message: 'Image generation completed for this item.' }, { status: 200 });
    } catch (error) {
        logRuntimeFailure('image_batch_worker_generation_failed', error, workerLogContext);
        await writeErrorLogEntry(LOG_FILE, error);
        const ownerSafeReason = 'Image generation failed for this item.';
        try {
            const failure = await markImageBatchItemAttemptFailedAdmin({
                claimToken,
                itemId: String(itemDetails.id),
                jobId,
                preserveForRetry: accountingFinalized,
                projectId,
                reason: ownerSafeReason,
                retryable: !(error instanceof NonRetryableBatchImageError),
            });
            const cleanupStoragePaths = failure.stale
                ? []
                : Array.from(new Set([
                    ...failure.cleanupStoragePaths,
                    ...(!stagedResultPersisted && !failure.retainsStagedResult ? uploadedStoragePaths : []),
                ]));
            if (cleanupStoragePaths.length > 0) {
                await Promise.allSettled(
                    cleanupStoragePaths.map((storagePath) => storageAdmin.bucket().file(storagePath).delete({ ignoreNotFound: true })),
                );
            }
            if (failure.stale) {
                retainCapacityReservationForRetry = stagedResultPersisted;
                return NextResponse.json({ success: true, message: 'Task acknowledged because the item was already finalized.' }, { status: 200 });
            }
            if (failure.terminal) {
                return NextResponse.json({ success: true, message: 'Task acknowledged because the job is no longer active.' }, { status: 200 });
            }
            if (failure.shouldRetry) {
                retainCapacityReservationForRetry = stagedResultPersisted;
                return NextResponse.json(
                    { error: ownerSafeReason },
                    { status: 503, headers: { 'Retry-After': '30' } },
                );
            }
        } catch (updateError) {
            retainCapacityReservationForRetry = stagedResultPersisted;
            await writeErrorLogEntry(LOG_FILE, updateError);
            logRuntimeFailure('image_batch_worker_failure_status_update_failed', updateError, workerLogContext);
            return NextResponse.json(
                { error: ownerSafeReason },
                { status: 503, headers: { 'Retry-After': '30' } },
            );
        }
        return NextResponse.json({ error: ownerSafeReason }, { status: 200 });
    } finally {
        if (!retainCapacityReservationForRetry) {
            await refundAiCapacityReservationSafely(capacityReservation, 'image_batch_provider_work_did_not_stage', {
                endpoint: '/api/image-generation/batch-generation',
                jobId,
            });
        }
    }
}

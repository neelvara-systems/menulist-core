export const dynamic = 'force-dynamic';
import { BATCH_IMAGE_GENERATION_JOB_STATUS } from "@constant/AI";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, CHARGE_PER_IMAGEN_IMAGE, TOKENS_PER_CREDIT, TOKENS_PER_IMAGEN_IMAGE } from "@constant/common";
import { appendImageBatchItemResultAdmin, getImageBatchProcessingJobByIdAdmin, updateImageBatchProcessingJobAdmin } from "@database/imageBatchProcessing/server";
import { uploadBase64MediaImageAdmin } from "@database/storage/uploadBase64MediaImageAdmin";
import { finalizeAiOperationAccounting } from "@lib/ai/accounting";
import { checkAICapacity } from "@lib/ai/capacityCheck";
import { sanitizeImageGenerationConfigForLogging, summarizeImageProviderResponse } from "@lib/ai/imageOperationLogging";
import { mapWithConcurrency } from "@lib/async/boundedConcurrency";
import { logger } from "@lib/monitoring/logger";
import { BatchImageGenerationJobType, GenerateImageViaApiPayloadBatchType, GenerateImageViaApiPayloadItemDetailsType } from "@template/main-app/projects/types";
import { getBase64Length } from "@util/utils";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from "crypto";
import { AI_MODEL_TYPE, GeneratedImagePayload, runImageGenerationPrompts } from "../generators";
import { getImagePrompts } from "../prompt";
import { validateAPIInput } from "@lib/security/inputValidation";
import { BatchImageGenerationWorkerRequestSchema } from "@lib/validation/apiSchemas";

const AI_MODEL: AI_MODEL_TYPE = "GEMINI";
const LOG_FILE = "batch-image-generation.log"
const IMAGE_UPLOAD_CONCURRENCY = 3;
const TERMINAL_JOB_STATUSES = new Set([
    BATCH_IMAGE_GENERATION_JOB_STATUS.CANCELLED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.COMPLETED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.FINISHED,
    BATCH_IMAGE_GENERATION_JOB_STATUS.DISCARDED,
]);

function summarizeBatchItem(item: GenerateImageViaApiPayloadItemDetailsType) {
    return {
        attributeCount: item.attributes?.length || 0,
        hasDescription: Boolean(item.description),
        id: item.id,
        name: item.name,
    };
}

function summarizeUploadedGeneratedImages(images: Array<{ mimeType: string; uploadedUrl?: string }>) {
    return images.map((image) => ({
        hasUploadedUrl: Boolean(image.uploadedUrl),
        mimeType: image.mimeType,
    }));
}

async function uploadGeneratedImages({
    images,
    itemDetails,
    sId,
    tId,
}: {
    images: GeneratedImagePayload[];
    itemDetails: GenerateImageViaApiPayloadItemDetailsType & { id: string; name: string };
    sId: string;
    tId: string;
}) {
    return mapWithConcurrency(images, IMAGE_UPLOAD_CONCURRENCY, async (imageData, index) => {
        if (!imageData.base64 || imageData.uploadedUrl) return imageData;

        const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
        let base64Url = imageData.base64;
        if (!base64Url.startsWith('data:')) {
            base64Url = `data:${imageData.mimeType};base64,${base64Url}`;
        }

        const uploadedUrl = await uploadBase64MediaImageAdmin({
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

export async function POST(request: Request) {
    // 🛡️ SAFE_MODE: Block expensive AI operations during system maintenance
    try {
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;
    } catch { /* fail-open */ }

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
    const rawData = await request.json();
    const validation = validateAPIInput(BatchImageGenerationWorkerRequestSchema, rawData);
    if (!validation.success) {
        const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
        await writeMissingParamsLogEntry(LOG_FILE, userIdForLog, rawData?.projectId, '', {
            error: errorMsg,
            jobId: rawData?.jobId,
            projectId: rawData?.projectId,
        });
        return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
    }

    const { generationConfig, projectId, itemDetails, businessType, jobId } = validation.data as unknown as GenerateImageViaApiPayloadBatchType & { itemDetails: GenerateImageViaApiPayloadItemDetailsType & { id: string; name: string } };

    const [tId, , sId] = projectId.split("-");
    if (!tId || !sId) {
        return NextResponse.json({ error: 'Invalid project scope' }, { status: 400 });
    }

    const currentJobData = await getImageBatchProcessingJobByIdAdmin(jobId, { tId, sId });
    logger.debug('Fetched job data', { jobId, projectId, tId, sId, status: currentJobData?.status });

    if (!currentJobData) {
        logger.warn('Batch image generation task skipped - job not found', { item: itemDetails.name, jobId, projectId });
        return NextResponse.json({ success: true, message: 'Task acknowledged because job no longer exists.' }, { status: 200 });
    }

    if (TERMINAL_JOB_STATUSES.has(currentJobData.status)) {
        logger.info(`Task skipped`, { item: itemDetails.name, jobId, status: currentJobData.status });
        await writeLogEntry({ logFileName: LOG_FILE, userId: userIdForLog, projectId, logType: 'BATCH_GENERATION_IMAGE_GEN_SKIPPED', error: `Task for item ${itemDetails.name} in job ${jobId} skipped due to ${currentJobData.status}.`, data: { jobId, item: summarizeBatchItem(itemDetails) } });
        return NextResponse.json({ success: true, message: `Task skipped due to job ${currentJobData.status}.` }, { status: 200 });
    }

    if (currentJobData.projectId !== projectId) {
        logger.security('Batch image generation task/project mismatch', {
            endpoint: '/api/image-generation/batch-generation',
            jobId,
            jobProjectId: currentJobData.projectId,
            requestProjectId: projectId,
        }, 'critical');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (Array.isArray(currentJobData.requestedItemIds)
        && currentJobData.requestedItemIds.length > 0
        && !currentJobData.requestedItemIds.includes(String(itemDetails.id))) {
        logger.security('Batch image generation item not registered on job', {
            endpoint: '/api/image-generation/batch-generation',
            itemId: itemDetails.id,
            jobId,
            projectId,
        }, 'critical');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const existingItem = (currentJobData.itemsList || []).find((item) => item.id === itemDetails.id);
    if (existingItem?.images?.length) {
        logger.info('Batch image generation task skipped - item already has generated images', {
            itemId: itemDetails.id,
            jobId,
            projectId,
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

    // 🔋 AI CAPACITY CHECK: Verify store has sufficient capacity (uses tId/sId from projectId)
    const capacityCheck = await checkAICapacity(
        Number(tId),
        Number(sId),
        AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION,
        estimatedImageQuantity,
    );
    if (!capacityCheck.allowed) {
        logger.info('Batch image generation blocked - insufficient capacity', { jobId, tId, sId, reason: capacityCheck.reason });
        return NextResponse.json({
            error: capacityCheck.reason === 'maintenance'
                ? 'AI enhancements are temporarily unavailable.'
                : 'Additional AI enhancements needed for your menu.',
            code: capacityCheck.reason,
        }, { status: 402 });
    }

    try {
        const startTime = new Date().getTime();

        await writeLogEntry({
            logFileName: LOG_FILE,
            userId: userIdForLog,
            projectId,
            logType: 'BATCH_GENERATION_IMAGE_GEN_STARTED',
            data: {
                generationConfig: sanitizeImageGenerationConfigForLogging(generationConfig as unknown as Record<string, unknown>),
                item: summarizeBatchItem(itemDetails),
                jobId,
                promptCount: promptsToExecute.length,
                promptLengths: promptsToExecute.map((prompt) => prompt.length),
            },
        });

        const promptRun = await runImageGenerationPrompts({
            aiModel: AI_MODEL,
            generationConfig,
            logFile: LOG_FILE,
            prompts: promptsToExecute,
        });
        let genratedImages = promptRun.images;
        const generatedImagesResponse = promptRun.responses;

        genratedImages = await uploadGeneratedImages({ images: genratedImages, itemDetails, sId, tId });
        if (!genratedImages?.length) {
            throw new Error('Image generation produced no image.');
        }
        logger.debug('Images uploaded', { count: genratedImages.length })
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

        if (generatedImagesResponse?.length > 0) {

            if (AI_MODEL === "GEMINI") {
                generatedImagesResponse.forEach((response) => {
                    const usageMetadata = 'usageMetadata' in response ? response.usageMetadata : undefined;
                    if (usageMetadata) {
                        transactionObject.promptTokenCount += usageMetadata.promptTokenCount || 0;
                        transactionObject.candidatesTokenCount += usageMetadata.candidatesTokenCount || 0;
                        transactionObject.totalTokenCount += usageMetadata.totalTokenCount || 0;
                    }
                });

                // Calculate total credits and charge based on cumulative tokens
                transactionObject.totalCredits = transactionObject.totalTokenCount / TOKENS_PER_CREDIT;
                transactionObject.totalCharge = CHARGE_PER_CREDIT * transactionObject.totalCredits; // in paise
            } else {
                transactionObject.totalCredits = genratedImages.length * TOKENS_PER_IMAGEN_IMAGE;
                transactionObject.totalCharge = CHARGE_PER_IMAGEN_IMAGE * transactionObject.totalCredits;
            }

            // Update the transaction object with calculated values and other details
            transactionObject = {
                ...transactionObject,
                action: AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION,
                failedPromptCount: promptRun.failedPromptCount,
                imageCount: genratedImages.length,
                itemDetails,
                promptCount: promptRun.promptCount,
                generationConfig: sanitizeImageGenerationConfigForLogging(generationConfig as unknown as Record<string, unknown>),
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
            logger.debug('Batch image generation transaction recorded', { transactionId: accounting.transactionId });
            transactionObject.unitsConsumed = accounting.unitsConsumed;
            transactionObject.transactionId = accounting.transactionId;
            logger.debug('Batch generation capacity consumed', { remainingBalance: accounting.remainingBalance });
        }

        const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
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
        logger.debug('Batch job updated', { jobId, ...updatedJobSummary });

        // Task succeeded, return 200 OK to Cloud Tasks
        return NextResponse.json({ success: true, message: `Image generation completed for item ${itemDetails.name}-${itemDetails.id}` }, { status: 200 });

    } catch (error) {
        logger.error('Batch image generation API error', error);
        await writeErrorLogEntry(LOG_FILE, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error in worker.';
        // Update job with error for this specific item if possible, or general job error
        try {

            const latestJobData = await getImageBatchProcessingJobByIdAdmin(jobId, { tId, sId });
            const failedAttemptCount = (latestJobData?.generatedCount || currentJobData.generatedCount || 0) + 1;
            const nextStatus = failedAttemptCount >= (latestJobData?.totalImages || currentJobData.totalImages)
                ? BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED
                : BATCH_IMAGE_GENERATION_JOB_STATUS.PROCESSING;

            await updateImageBatchProcessingJobAdmin({
                error: errorMessage,
                id: jobId,
                generatedCount: failedAttemptCount,
                status: nextStatus,
                statusHistory: [
                    ...(latestJobData?.statusHistory || currentJobData.statusHistory),
                    {
                        status: BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
                        reason: `Failed on item ${itemDetails.name}-${itemDetails.id}: ${errorMessage}`,
                        createdOn: new Date().toISOString(),
                    },
                ],
            }, projectId);
        } catch (updateError) {
            await writeErrorLogEntry(LOG_FILE, updateError);
            logger.error('Failed to update batch job with error status', { jobId, error: updateError });
        }
        // For Cloud Tasks, if you return an error status (5xx), it might retry.
        // If the error is non-recoverable for this item, return 200 to stop retries for THIS task.
        // The job itself is marked as having an error.
        return NextResponse.json({ error: `Processing failed for ${itemDetails.name}-${itemDetails.id}: ${errorMessage}` }, { status: 200 });
    }
}

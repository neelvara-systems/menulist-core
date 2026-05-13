export const dynamic = 'force-dynamic';
import { BATCH_IMAGE_GENERATION_JOB_STATUS } from "@constant/AI";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, CHARGE_PER_IMAGEN_IMAGE, TOKENS_PER_CREDIT, TOKENS_PER_IMAGEN_IMAGE } from "@constant/common";
import { addAiOperation } from "@database/aiOperations";
import { getImageBatchProcessingJobById, updateImageBatchProcessingJob } from "@database/imageBatchProcessing";
import { uploadFile } from "@database/projects";
import { GenerateContentResponse } from "@google/genai";
import { checkAICapacity, consumeAICapacity } from "@lib/ai/capacityCheck";
import { logger } from "@lib/monitoring/logger";
import { BatchImageGenerationJobType, GenerateImageViaApiPayloadBatchType } from "@template/main-app/projects/types";
import { getISOStringDate } from "@util/dateTime";
import { getBase64Length } from "@util/utils";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { AI_MODEL_TYPE, selectImageGenerator } from "../generators";
import { getImagePrompts } from "../prompt";

const AI_MODEL: AI_MODEL_TYPE = "GEMINI";
const LOG_FILE = "batch-image-generation.log"

export async function POST(request: Request) {
    // 🛡️ SAFE_MODE: Block expensive AI operations during system maintenance
    try {
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;
    } catch { /* fail-open */ }

    const expectedProjectId = process.env.FIREBASE_PROJECT_ID;
    const requestProjectId = request.headers.get('project-id');
    if (!expectedProjectId || requestProjectId !== expectedProjectId) {
        logger.security('Unauthorized Batch Image Generation Worker Request', {
            endpoint: '/api/image-generation/batch-generation',
            error: 'Missing or invalid Cloud Tasks project header',
            hasExpectedProjectId: Boolean(expectedProjectId),
            hasRequestProjectId: Boolean(requestProjectId),
        }, 'critical');

        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // const mainSession = await getServerSession(authOptions); // Get session early for logging if possible
    let userIdForLog = 'N/A';
    const { generationConfig, projectId, itemDetails, businessType, jobId }: GenerateImageViaApiPayloadBatchType = await request.json();

    if (!generationConfig || !projectId || !itemDetails || !businessType || !jobId) {
        await writeMissingParamsLogEntry(LOG_FILE, userIdForLog, projectId, '', { generationConfig, projectId, itemDetails, businessType, jobId });
        return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }

    const [tId, pId, sId] = projectId.split("-");
    const currentJobData: BatchImageGenerationJobType = await getImageBatchProcessingJobById(jobId, { tId, sId });
    logger.debug('Fetched job data', { jobId, projectId, tId, sId, status: currentJobData?.status });

    // 🔋 AI CAPACITY CHECK: Verify store has sufficient capacity (uses tId/sId from projectId)
    const capacityCheck = await checkAICapacity(
        Number(tId),
        Number(sId),
        AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION,
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
        if (currentJobData?.status === BATCH_IMAGE_GENERATION_JOB_STATUS.CANCELLED || currentJobData?.status === BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED) {
            logger.info(`Task skipped`, { item: itemDetails.name, jobId, status: currentJobData?.status });
            // Return 200 to acknowledge task completion in Cloud Tasks, preventing retries.
            // The job status is already 'cancelled', so no further action needed here.
            await writeLogEntry({ logFileName: LOG_FILE, userId: userIdForLog, projectId, logType: 'BATCH_GENERATION_IMAGE_GEN_SKIPPED', error: `Task for item ${itemDetails.name} in job ${jobId} skipped due to ${currentJobData?.status}.`, data: { jobId, itemDetails } });
            return NextResponse.json({ success: true, message: `Task skipped due to job ${currentJobData?.status}.` }, { status: 200 });
        }

        const startTime = new Date().getTime();
        const promptsToExecute = getImagePrompts({ generationConfig, projectId, itemDetails, businessType }, AI_MODEL);
        const imageGenerationApi = selectImageGenerator(AI_MODEL, generationConfig);

        await writeLogEntry({ logFileName: LOG_FILE, userId: userIdForLog, projectId, logType: 'BATCH_GENERATION_IMAGE_GEN_STARTED', data: { jobId, itemDetails, promptsToExecute } });

        let genratedImages: { base64: string; mimeType: string; uploadedUrl?: string }[] | null = [];
        let generatedImagesResponse: any[] | null = [];


        if (promptsToExecute.length > 1) {
            // Multiple specific prompts -> Separate calls, n=1 each
            for (const specificPrompt of promptsToExecute) {
                const result = await imageGenerationApi(specificPrompt, generationConfig, LOG_FILE);
                if (result) {
                    genratedImages.push(...result?.images);
                    generatedImagesResponse.push(result?.response);
                }
            }
        } else {
            // Single generic prompt -> One call, n can be > 1
            const result = await imageGenerationApi(promptsToExecute[0], generationConfig, LOG_FILE);
            if (result) {
                genratedImages = result?.images;
                generatedImagesResponse = [result?.response];
            }
        }

        const getUploadedImages = async (images: { base64: string; mimeType: string; uploadedUrl?: string }[]) => {

            for (const imageData of images) {
                const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
                if (imageData.base64 && !imageData.uploadedUrl) {
                    let base64Url = imageData.base64;
                    if (!base64Url.startsWith('data:')) {
                        base64Url = `data:${imageData.mimeType};base64,${base64Url}`;
                    }
                    const uploadedUrl = await uploadFile({ url: base64Url, type: imageData.mimeType, uid: `${itemDetails.id}-${randomStr}` }, 'itemImages')
                    imageData.uploadedUrl = uploadedUrl;
                }
            }
            return images;
        }
        genratedImages = await getUploadedImages(genratedImages);
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
            transactionId: "test" // Default/fallback ID
        };

        if (generatedImagesResponse?.length > 0) {

            if (AI_MODEL === "GEMINI") {
                generatedImagesResponse.forEach((response: GenerateContentResponse) => {
                    if (response.usageMetadata) {
                        transactionObject.promptTokenCount += response.usageMetadata.promptTokenCount || 0;
                        transactionObject.candidatesTokenCount += response.usageMetadata.candidatesTokenCount || 0;
                        transactionObject.totalTokenCount += response.usageMetadata.totalTokenCount || 0;
                    }
                });

                // Calculate total credits and charge based on cumulative tokens
                transactionObject.totalCredits = transactionObject.totalTokenCount / TOKENS_PER_CREDIT;
                transactionObject.totalCharge = CHARGE_PER_CREDIT * transactionObject.totalCredits; // in paise
            } else {
                transactionObject.totalCredits = generatedImagesResponse.length * TOKENS_PER_IMAGEN_IMAGE;
                transactionObject.totalCharge = CHARGE_PER_IMAGEN_IMAGE * transactionObject.totalCredits;
            }

            // Update the transaction object with calculated values and other details
            transactionObject = {
                ...transactionObject,
                action: AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION,
                itemDetails,
                generationConfig,
                projectId,
                processingTime,
                clientResponse: genratedImages.map((image: { base64: string; mimeType: string }) => image.mimeType),
                model: AI_MODEL,
                geminiResponse: generatedImagesResponse, // Store all responses
                tokenPerCredit: TOKENS_PER_CREDIT,
                chargePerCredit: CHARGE_PER_CREDIT,
                // Deep tracking: real Google cost vs our charge vs margin (all in paise)
                realCostPaise: getRealCostPaise(AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION),
                ourChargePaise: getOurChargePaise(AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION),
                marginPaise: getOurChargePaise(AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION) - getRealCostPaise(AI_ACTIONS_TYPES.BATCH_IMAGE_GENERATION),
            };

            // Add the operation to the database
            transactionObject.unitsConsumed = getUnitCost(transactionObject.action);
            const transactionId = await addAiOperation(transactionObject);
            logger.debug('Batch image generation transaction recorded', { transactionId });
            transactionObject.transactionId = transactionId; // Update transaction ID
            // Consume capacity after successful operation
            if (capacityCheck.subscription && transactionObject.unitsConsumed > 0) {
                const remainingBalance = await consumeAICapacity(capacityCheck.subscription, transactionObject.unitsConsumed);
                logger.debug('Batch generation capacity consumed', { remainingBalance });
            }
        }

        const updatedItems = [...currentJobData.itemsList];
        const index = currentJobData.itemsList.findIndex((item) => item.id === itemDetails.id);

        const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
        const updatedItem = {
            id: itemDetails.id,
            name: itemDetails.name,
            images: [...(index > -1 ? currentJobData.itemsList[index].images : []), ...genratedImages.map((image: { base64: string; mimeType: string; uploadedUrl: string }) => {
                const imageData = {
                    name: `${itemDetails.name}`,
                    size: getBase64Length(image.base64),
                    type: image.mimeType,
                    url: image.uploadedUrl,
                    uid: `${itemDetails.id}_${randomStr}`,
                }
                return imageData;
            })],
        }
        if (index > -1) updatedItems[index] = updatedItem;
        else updatedItems.push(updatedItem);

        await writeLogEntry({ logFileName: LOG_FILE, userId: userIdForLog, projectId, logType: 'BATCH_GENERATION_IMAGE_GEN_SUCCESS', data: updatedItem });

        const newGeneratedCount = currentJobData.generatedCount + 1;
        const updatedJob: BatchImageGenerationJobType = {
            ...currentJobData,
            id: jobId,
            itemsList: updatedItems,
            generatedCount: newGeneratedCount,
            status: newGeneratedCount >= currentJobData.totalImages ? 'completed' : 'processing',
            statusHistory: [
                ...currentJobData.statusHistory,
                {
                    status: newGeneratedCount >= currentJobData.totalImages ? 'completed' : 'processing',
                    reason: `Generated ${newGeneratedCount} out of ${currentJobData.totalImages}`,
                    createdOn: getISOStringDate(),
                },
            ],
        };

        await writeLogEntry({ logFileName: LOG_FILE, userId: userIdForLog, projectId, logType: 'BATCH_GENERATION_JOB_UPDATED', data: updatedJob });

        await updateImageBatchProcessingJob({ ...updatedJob }, projectId);
        logger.debug('Batch job updated', { jobId, status: updatedJob.status, generatedCount: updatedJob.generatedCount, totalImages: updatedJob.totalImages });

        await writeLogEntry({ logFileName: LOG_FILE, userId: userIdForLog, projectId, logType: 'BATCH_GENERATION_IMAGE_GEN_SUCCESS', data: updatedJob });
        // Task succeeded, return 200 OK to Cloud Tasks
        return NextResponse.json({ success: true, message: `Image generation completed for item ${itemDetails.name}-${itemDetails.id}` }, { status: 200 });

    } catch (error) {
        logger.error('Batch image generation API error', error);
        await writeErrorLogEntry(LOG_FILE, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error in worker.';
        // Update job with error for this specific item if possible, or general job error
        try {

            /*
            #this is single item image generation failure so we are not holding job for upcomming generation requests#
           
            await updateImageBatchProcessingJob({
                id: jobId,
                status: BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED, // Or a partial error status like 'processing_with_errors'
                statusHistory: [
                    ...currentJobData.statusHistory,
                    {
                        status: BATCH_IMAGE_GENERATION_JOB_STATUS.FAILED,
                        reason: `Failed on item ${itemDetails.name}-${itemDetails.id}: ${errorMessage}`,
                        createdOn: getISOStringDate(),
                    },
                ],
            });

            #this is single item image generation failure so we are not holding job for upcomming generation requests#
            */


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

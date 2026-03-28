export const dynamic = 'force-dynamic';
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, CHARGE_PER_IMAGEN_IMAGE, TOKENS_PER_CREDIT, TOKENS_PER_IMAGEN_IMAGE } from "@constant/common";
import { addAiOperation } from "@database/aiOperations";
import { GenerateContentResponse } from "@google/genai";
import { checkAICapacity, consumeAICapacity } from "@lib/ai/capacityCheck";
import { logger } from "@lib/monitoring/logger";
import { checkExpensiveAILimit } from "@lib/rateLimit/helpers";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { ImageGenerationRequestSchema } from "@lib/validation/apiSchemas";
import { GenerateImageViaApiPayloadType } from "@template/main-app/projects/types";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { withAuth } from "../../../middleware/auth";
import { AI_MODEL_TYPE, selectImageGenerator } from "./generators";
import { getImagePrompts } from "./prompt";

const AI_MODEL: AI_MODEL_TYPE = "GEMINI";
const LOG_FILE = "image-generation.log"


export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;

    try {

        // �️ SAFE_MODE: Block expensive operations during system maintenance
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        // �🔒 RATE LIMITING: Prevent API abuse (5 req/min - expensive operation)
        const rateLimitResponse = await checkExpensiveAILimit();
        if (rateLimitResponse) return rateLimitResponse;

        // 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const rawData = await request.json();
        const validation = validateAPIInput(ImageGenerationRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            // Log to Sentry (potential attack attempt - HIGH severity: very expensive operation)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/image-generation',
                error: errorMsg,
                attemptedData: {
                    hasGenerationConfig: !!rawData?.generationConfig,
                    hasPrompt: !!rawData?.generationConfig?.prompt,
                    projectId: rawData?.projectId,
                    fileId: rawData?.fileId,
                    businessType: rawData?.businessType,
                },
            }, 'high'); // HIGH severity - very expensive operation

            await writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, rawData);
            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const jsonData = rawData as GenerateImageViaApiPayloadType;
        const { generationConfig, projectId, fileId, itemDetails, businessType } = jsonData;

        // 🔋 AI CAPACITY CHECK: Verify store has sufficient capacity
        const capacityCheck = await checkAICapacity(
            session.tId,
            session.sId,
            AI_ACTIONS_TYPES.IMAGE_GENERATION,
        );
        if (!capacityCheck.allowed) {
            return NextResponse.json({
                error: capacityCheck.reason === 'maintenance'
                    ? 'AI enhancements are temporarily unavailable.'
                    : 'Additional AI enhancements needed for your menu.',
                code: capacityCheck.reason,
            }, { status: 402 });
        }

        const startTime = new Date().getTime();
        const promptsToExecute = getImagePrompts({ generationConfig, projectId, fileId, itemDetails, businessType }, AI_MODEL);
        const imageGenerator = selectImageGenerator(AI_MODEL, generationConfig);

        logger.debug('Prompts to execute', { count: promptsToExecute.length })

        let genratedImages: any[] | null = [];
        let generatedImagesResponse: any[] | null = [];
        if (promptsToExecute.length > 1) {
            // Multiple specific prompts -> Separate calls, n=1 each
            for (const specificPrompt of promptsToExecute) {
                const result = await imageGenerator(specificPrompt, generationConfig, LOG_FILE);
                if (result) {
                    genratedImages.push(...result?.images);
                    generatedImagesResponse.push(result?.response);
                }
            }
        } else {
            // Single generic prompt -> One call, n can be > 1
            const result = await imageGenerator(promptsToExecute[0], generationConfig, LOG_FILE);
            if (result) {
                genratedImages = result?.images;
                generatedImagesResponse = [result?.response];
            }
        }

        const endTime = new Date().getTime();
        const processingTime = endTime - startTime;

        // Initialize transaction object outside the if block
        let remainingBalance = null;
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
                // Process Gemini usage metadata
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
                itemDetails,
                generationConfig,
                projectId,
                fileId,
                action: AI_ACTIONS_TYPES.IMAGE_GENERATION,
                processingTime,
                clientResponse: genratedImages.map((image: { base64: string; mimeType: string }) => image.mimeType),
                model: AI_MODEL,
                geminiResponse: generatedImagesResponse, // Store all responses
                tokenPerCredit: TOKENS_PER_CREDIT,
                chargePerCredit: CHARGE_PER_CREDIT,
                // Deep tracking: real Google cost vs our charge vs margin (all in paise)
                realCostPaise: getRealCostPaise(AI_ACTIONS_TYPES.IMAGE_GENERATION),
                ourChargePaise: getOurChargePaise(AI_ACTIONS_TYPES.IMAGE_GENERATION),
                marginPaise: getOurChargePaise(AI_ACTIONS_TYPES.IMAGE_GENERATION) - getRealCostPaise(AI_ACTIONS_TYPES.IMAGE_GENERATION),
            };

            // Add the operation to the database
            try {
                transactionObject.unitsConsumed = getUnitCost(transactionObject.action);
                const transactionId = await addAiOperation(transactionObject);
                logger.debug('Image generation transaction recorded', { transactionId });
                transactionObject.transactionId = transactionId; // Update transaction ID
                // Consume capacity after successful operation
                if (capacityCheck.subscription && transactionObject.unitsConsumed > 0) {
                    remainingBalance = await consumeAICapacity(capacityCheck.subscription, transactionObject.unitsConsumed);
                }
            } catch (transactionError) {
                logger.error('Failed to record image generation transaction', transactionError);
                // Continue with the function even if transaction recording fails
            }
        }

        // Log successful response
        await writeLogEntry({
            logFileName: LOG_FILE, userId: userId, projectId, fileId, logType: 'SUCCESS_RESPONSE',
            data: {
                request: { generationConfig, itemDetails },
                response: generatedImagesResponse,
                transaction: transactionObject
            }
        });

        return NextResponse.json({
            data: genratedImages,
            message: "",
            transaction: {
                totalCharge: transactionObject.totalCharge,
                totalCredits: transactionObject.totalCredits,
                processingTime: transactionObject.processingTime,
                transactionId: transactionObject.transactionId
            },
            remainingBalance,
        }, { status: 200 });

    } catch (error) {
        logger.error('Image generation API error', error);
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json({ error: error, message: (error as Error).message }, { status: 500 });
    }
});

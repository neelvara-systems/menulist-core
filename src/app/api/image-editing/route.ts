export const dynamic = 'force-dynamic';
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { GenerateContentResponse, Modality } from "@google/genai";
import { finalizeAiOperationAccounting } from "@lib/ai/accounting";
import { checkAICapacity } from "@lib/ai/capacityCheck";
import { getImageAsBase64 } from "@lib/apiUtils";
import { genAIClient } from "@lib/google/genAi";
import { logger } from "@lib/monitoring/logger";
import { getLinkedOutletPolicyBlockReason } from "@lib/multiOutlet/serverOutletPolicy";
import { checkExpensiveAILimit } from "@lib/rateLimit/helpers";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { ImageEditingRequestSchema } from "@lib/validation/apiSchemas";
import { EditImageViaApiPayloadType } from "@template/main-app/projects/types";
import { UserUploadedFileType } from "@type/common";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { withAuth } from "../../../middleware/auth";
import { generateImageEditingPrompt } from "./promptsList";

const AI_MODEL = "gemini-2.5-flash-image";
const LOG_FILE = "image-editing.log"

async function editImageViaFlash(generationConfig: { prompt?: string, referanceImage: UserUploadedFileType, promptImages?: UserUploadedFileType[] }): Promise<{ images: { base64: string; mimeType: string }[], response: GenerateContentResponse } | null | NextResponse> {
    try {

        const { base64ImageData, mimeType } = await getImageAsBase64(generationConfig.referanceImage);
        let promptImagesBase64Data: { base64: string; mimeType: string }[] = [];
        if (generationConfig.promptImages && generationConfig.promptImages.length > 0) {
            for (const promptImage of generationConfig.promptImages) {
                const { base64ImageData, mimeType } = await getImageAsBase64(promptImage);
                promptImagesBase64Data.push({ base64: base64ImageData, mimeType });
            }
        }

        const response = await genAIClient.models.generateContent({
            model: AI_MODEL,
            contents: [
                { text: `${generationConfig.prompt}` },
                { inlineData: { mimeType: mimeType, data: base64ImageData } },
                ...promptImagesBase64Data.map((image) => ({ inlineData: { mimeType: image.mimeType, data: image.base64 } })),
            ],
            config: {
                responseModalities: [Modality.TEXT, Modality.IMAGE],
            },
        });
        logger.debug('Started image edit via flash', { promptLength: generationConfig.prompt?.length })

        let genratedImages: { base64: string; mimeType: string }[] = [];
        if (response.candidates && response.candidates.length > 0 && response.candidates[0].content && response.candidates[0].content.parts) {
            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    const base64Image = part.inlineData.data;
                    const mimeType = `image/${part.inlineData.mimeType.split('/').pop()}`; // Extract extension
                    genratedImages.push({ base64: base64Image, mimeType });
                }
            }
        }

        logger.debug('Completed image edit via flash', { imageCount: genratedImages.length })
        return { images: genratedImages, response };
    } catch (error) {
        logger.error('Error editing image', error);
        await writeLogEntry({ logFileName: LOG_FILE, logType: 'FLASH_ERROR', error });
        return NextResponse.json(
            { error: error, message: (error as Error).message },
            { status: 500 }
        );
    }
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

        // �🔒 RATE LIMITING: Prevent API abuse (5 req/min - expensive operation)
        const rateLimitResponse = await checkExpensiveAILimit();
        if (rateLimitResponse) return rateLimitResponse;

        // 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const rawData = await request.json();
        const validation = validateAPIInput(ImageEditingRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            // Log to Sentry (potential attack attempt - HIGH severity: very expensive)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/image-editing',
                error: errorMsg,
                attemptedData: {
                    hasGenerationConfig: !!rawData?.generationConfig,
                    projectId: rawData?.projectId,
                    fileId: rawData?.fileId,
                },
            }, 'high'); // HIGH severity - very expensive

            await writeMissingParamsLogEntry(LOG_FILE, userId, rawData?.projectId, rawData?.fileId, rawData);

            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const { generationConfig, projectId, fileId, itemDetails, businessType } = rawData as EditImageViaApiPayloadType;

        const outletPolicyBlockReason = await getLinkedOutletPolicyBlockReason({
            action: "image",
            itemIds: itemDetails?.id ? [String(itemDetails.id)] : [],
            projectId,
            session,
        });
        if (outletPolicyBlockReason) {
            logger.security('Outlet Policy Violation - Image Editing API', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/image-editing',
                projectId,
                reason: outletPolicyBlockReason,
            }, 'medium');
            return NextResponse.json({ error: outletPolicyBlockReason }, { status: 403 });
        }

        // 🔋 AI CAPACITY CHECK: Verify store has sufficient capacity
        const capacityCheck = await checkAICapacity(
            session.tId,
            session.sId,
            AI_ACTIONS_TYPES.IMAGE_EDITING,
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
        generationConfig.prompt = generateImageEditingPrompt(businessType, generationConfig, itemDetails)
        logger.debug('Prompt generated for image edit', { promptLength: generationConfig.prompt?.length })
        let imageEditGemeiniResponse: any = await editImageViaFlash(generationConfig);

        const endTime = new Date().getTime();
        const processingTime = endTime - startTime;

        // Update the transaction object with calculated values and other details
        const transactionObject = {
            transactionId: null,
            action: AI_ACTIONS_TYPES.IMAGE_EDITING,
            unitsConsumed: 0,
            itemDetails,
            generationConfig,
            projectId,
            fileId,
            processingTime,
            clientResponse: null,// imageEditGemeiniResponse?.images?.map((image: { base64: string; mimeType: string }) => image.mimeType),
            model: AI_MODEL,
            promptTokenCount: imageEditGemeiniResponse?.response?.usageMetadata?.promptTokenCount,//Number of tokens in the prompt.
            candidatesTokenCount: imageEditGemeiniResponse?.response?.usageMetadata?.candidatesTokenCount,//Total number of tokens across the generated candidates.
            totalTokenCount: imageEditGemeiniResponse?.response?.usageMetadata?.totalTokenCount,//Total token count for the generation request (prompt + candidates).
            tokenPerCredit: TOKENS_PER_CREDIT,
            chargePerCredit: CHARGE_PER_CREDIT,
            totalCredits: ((imageEditGemeiniResponse?.response?.usageMetadata?.totalTokenCount || 0) / TOKENS_PER_CREDIT),
            totalCharge: CHARGE_PER_CREDIT * ((imageEditGemeiniResponse?.response?.usageMetadata?.totalTokenCount || 0) / TOKENS_PER_CREDIT),//in paise
            // Deep tracking: real Google cost vs our charge vs margin (all in paise)
            realCostPaise: getRealCostPaise(AI_ACTIONS_TYPES.IMAGE_EDITING),
            ourChargePaise: getOurChargePaise(AI_ACTIONS_TYPES.IMAGE_EDITING),
            marginPaise: getOurChargePaise(AI_ACTIONS_TYPES.IMAGE_EDITING) - getRealCostPaise(AI_ACTIONS_TYPES.IMAGE_EDITING),
        };

        // Add the operation to the database
        let remainingBalance = null;
        try {
            transactionObject.unitsConsumed = getUnitCost(transactionObject.action);
            const accounting = await finalizeAiOperationAccounting({
                capacitySubscription: capacityCheck.subscription,
                context: { userId, projectId, fileId, action: transactionObject.action },
                input: transactionObject,
                logLabel: 'Image editing',
                session,
            });
            transactionObject.unitsConsumed = accounting.unitsConsumed;
            transactionObject.transactionId = accounting.transactionId;
            remainingBalance = accounting.remainingBalance;
        } catch (transactionError) {
            logger.error('Failed to record transaction', transactionError);
            await writeLogEntry({ logFileName: LOG_FILE, userId: "N/A", projectId, fileId, logType: 'TRANSACTION_DB_ERROR', data: transactionObject, error: transactionError });
            throw transactionError;
        }

        // Log successful response to file using the new generic function
        await writeLogEntry({ logFileName: LOG_FILE, userId: session.user.id, projectId, fileId, logType: 'SUCCESS_RESPONSE', data: { imageEditGemeiniResponse, transactionObject }, });

        return NextResponse.json({
            data: imageEditGemeiniResponse?.images,
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
        logger.error('Image editing API error', error);
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json({ error: 'Image editing failed' }, { status: 500 });
    }
});

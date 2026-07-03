export const dynamic = 'force-dynamic';
import { GEMINI_MODELS } from "@constant/AI/models";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { PERMISSIONS } from "@constant/permissions";
import { GenerateContentResponse, Modality } from "@google/genai";
import { finalizeAiOperationAccounting } from "@lib/ai/accounting";
import { checkAICapacity } from "@lib/ai/capacityCheck";
import { sanitizeImageGenerationConfigForLogging, summarizeImageProviderResponse } from "@lib/ai/imageOperationLogging";
import { getImageAsBase64, type ImageFetchStorageScope } from "@lib/apiUtils";
import { genAIClient } from "@lib/google/genAi";
import { getAIGatewayDiagnostics, getAIRouteLogContext, getAIRouteSecurityContext, logAIRouteFailure } from "@lib/google/genAi/diagnostics";
import { logger } from "@lib/monitoring/logger";
import { getLinkedOutletPolicyBlockReason } from "@lib/multiOutlet/serverOutletPolicy";
import { requireAnyStorePermission } from "@lib/permissions/server";
import { checkExpensiveAILimit } from "@lib/rateLimit/helpers";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { ImageEditingRequestSchema } from "@lib/validation/apiSchemas";
import { EditImageViaApiPayloadType } from "@template/main-app/projects/types";
import { UserUploadedFileType } from "@type/common";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { withAuth } from "../../../middleware/auth";
import { generateImageEditingPrompt } from "./promptsList";

const AI_MODEL = GEMINI_MODELS.IMAGE_GEN;
const ACTION = AI_ACTIONS_TYPES.IMAGE_EDITING;
const LOG_FILE = "image-editing.log"
const IMAGE_EDITING_AI_MAX_BODY_BYTES = 64 * 1024 * 1024;

async function editImageViaFlash(
    generationConfig: { prompt?: string, referanceImage: UserUploadedFileType, promptImages?: UserUploadedFileType[] },
    referenceImageStorageScope?: ImageFetchStorageScope,
): Promise<{ images: { base64: string; mimeType: string }[], response: GenerateContentResponse } | null> {
    try {

        const { base64ImageData, mimeType } = await getImageAsBase64(generationConfig.referanceImage, {
            storageScope: referenceImageStorageScope,
        });
        let promptImagesBase64Data: { base64: string; mimeType: string }[] = [];
        if (generationConfig.promptImages && generationConfig.promptImages.length > 0) {
            for (const promptImage of generationConfig.promptImages) {
                const { base64ImageData, mimeType } = await getImageAsBase64(promptImage, {
                    storageScope: referenceImageStorageScope,
                });
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
        logAIRouteFailure('image_editing_flash_failed', error, {
            action: ACTION,
            hasReferenceImage: Boolean(generationConfig.referanceImage?.url),
            model: AI_MODEL,
            promptImageCount: generationConfig.promptImages?.length || 0,
            promptLength: generationConfig.prompt?.length || 0,
        });
        await writeLogEntry({ logFileName: LOG_FILE, logType: 'FLASH_ERROR', error });
        throw error;
    }
}

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;
    const requestId = crypto.randomUUID();
    let projectIdForLog: string | undefined;
    let fileIdForLog: string | undefined;

    try {
        // �️ SAFE_MODE: Block expensive operations during system maintenance
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        // �🔒 RATE LIMITING: Prevent API abuse (5 req/min - expensive operation)
        const rateLimitResponse = await checkExpensiveAILimit();
        if (rateLimitResponse) return rateLimitResponse;

        // 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const bodyResult = await readBoundedJsonBody(request, IMAGE_EDITING_AI_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return bodyResult.response;

        const rawData = bodyResult.data as any;
        const validation = validateAPIInput(ImageEditingRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            // Log to Sentry (potential attack attempt - HIGH severity: very expensive)
            logger.security('Input Validation Failed', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/image-editing',
                error: errorMsg,
                attemptedData: getAIRouteLogContext({
                    hasGenerationConfig: !!rawData?.generationConfig,
                    projectId: rawData?.projectId,
                    fileId: rawData?.fileId,
                }),
                requestId,
            }, 'high'); // HIGH severity - very expensive

            await writeMissingParamsLogEntry(LOG_FILE, userId, rawData?.projectId, rawData?.fileId, {
                error: errorMsg,
                hasGenerationConfig: !!rawData?.generationConfig,
                hasPrompt: !!rawData?.generationConfig?.prompt,
                hasPromptImages: Array.isArray(rawData?.generationConfig?.promptImages),
                hasReferenceImage: !!rawData?.generationConfig?.referanceImage?.url,
                projectId: rawData?.projectId,
                fileId: rawData?.fileId,
            });

            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const { generationConfig, projectId, fileId, itemDetails, businessType } = validation.data as unknown as EditImageViaApiPayloadType;
        projectIdForLog = projectId;
        fileIdForLog = fileId;

        const permissionError = await requireAnyStorePermission(
            request,
            session,
            [PERMISSIONS.GENERATE_IMAGES],
            "Image editing",
        );
        if (permissionError) return permissionError;

        const outletPolicyBlockReason = await getLinkedOutletPolicyBlockReason({
            action: "image",
            itemIds: itemDetails?.id ? [String(itemDetails.id)] : [],
            projectId,
            session,
        });
        if (outletPolicyBlockReason) {
            logger.security('Outlet Policy Violation - Image Editing API', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/image-editing',
                project: getAIRouteLogContext({ projectId }),
                reason: outletPolicyBlockReason,
                requestId,
            }, 'medium');
            return NextResponse.json({ error: outletPolicyBlockReason }, { status: 403 });
        }

        // 🔋 AI CAPACITY CHECK: Verify store has sufficient capacity
        const capacityCheck = await checkAICapacity(
            session.tId,
            session.sId,
            ACTION,
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
        const generatedPrompt = generateImageEditingPrompt(businessType, generationConfig, itemDetails);
        if (!generatedPrompt) {
            return NextResponse.json({ error: 'Image editing needs a valid editing prompt' }, { status: 400 });
        }
        generationConfig.prompt = generatedPrompt;
        logger.debug('Prompt generated for image edit', { promptLength: generationConfig.prompt?.length })
        const promptImages = (generationConfig.promptImages || []).filter((image): image is UserUploadedFileType => Boolean(image?.url));
        let imageEditGemeiniResponse = await editImageViaFlash({
            ...generationConfig,
            promptImages,
        }, {
            sId: session.sId,
            tId: session.tId,
        });

        const endTime = new Date().getTime();
        const processingTime = endTime - startTime;

        if (!imageEditGemeiniResponse?.images?.length) {
            await writeLogEntry({
                logFileName: LOG_FILE,
                userId,
                projectId,
                fileId,
                logType: 'NO_IMAGE_EDIT_GENERATED',
                data: {
                    generationConfig: sanitizeImageGenerationConfigForLogging(generationConfig as unknown as Record<string, unknown>),
                    itemDetails,
                    response: summarizeImageProviderResponse(imageEditGemeiniResponse?.response),
                },
            });
            return NextResponse.json({ error: 'Image editing produced no image' }, { status: 502 });
        }

        // Update the transaction object with calculated values and other details
        const transactionObject = {
            transactionId: null,
            action: ACTION,
            unitsConsumed: 0,
            itemDetails,
            generationConfig: sanitizeImageGenerationConfigForLogging(generationConfig as unknown as Record<string, unknown>),
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
            realCostPaise: getRealCostPaise(ACTION),
            ourChargePaise: getOurChargePaise(ACTION),
            marginPaise: getOurChargePaise(ACTION) - getRealCostPaise(ACTION),
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
            logAIRouteFailure('image_editing_accounting_failed', transactionError, {
                action: ACTION,
                fileId,
                imageCount: imageEditGemeiniResponse.images.length,
                model: AI_MODEL,
                processingTime,
                projectId,
                requestId,
                userId,
            });
            if (transactionError && typeof transactionError === 'object') {
                (transactionError as Record<string, unknown>).__imageEditingLogged = true;
            }
            await writeLogEntry({ logFileName: LOG_FILE, userId: "N/A", projectId, fileId, logType: 'TRANSACTION_DB_ERROR', data: transactionObject, error: transactionError });
            throw transactionError;
        }

        // Log successful response to file using the new generic function
        await writeLogEntry({
            logFileName: LOG_FILE,
            userId: session.user.id,
            projectId,
            fileId,
            logType: 'SUCCESS_RESPONSE',
            data: {
                imageEditResponse: {
                    imageCount: imageEditGemeiniResponse.images.length,
                    response: summarizeImageProviderResponse(imageEditGemeiniResponse.response),
                },
                transactionObject,
            },
        });

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
        if (!(error && typeof error === 'object' && '__imageEditingLogged' in error)) {
            logAIRouteFailure('image_editing_api_failed', error, {
                action: ACTION,
                fileId: fileIdForLog,
                gatewayDiagnostics: getAIGatewayDiagnostics(genAIClient),
                model: AI_MODEL,
                projectId: projectIdForLog,
                requestId,
                userId,
            });
        }
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json({ error: 'Image editing failed' }, { status: 500 });
    }
});

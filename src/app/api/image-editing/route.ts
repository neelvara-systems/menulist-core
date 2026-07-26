export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { GEMINI_MODELS } from "@constant/AI/models";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { PERMISSIONS } from "@constant/permissions";
import { GenerateContentResponse, Modality } from "@google/genai";
import { finalizeAiOperationAccounting } from "@lib/ai/accounting";
import { checkAICapacity, refundAiCapacityReservationSafely, reserveAiCapacity } from "@lib/ai/capacityCheck";
import { normalizeGeneratedImagesFromProvider } from "@lib/ai/generatedImageOutput";
import { summarizeImageProviderResponse } from "@lib/ai/imageOperationLogging";
import { getImageAsBase64, type ImageFetchStorageScope } from "@lib/apiUtils";
import { genAIClient } from "@lib/google/genAi";
import { getAIGatewayDiagnostics, getAIErrorDiagnostics, getAIRouteLogContext, getAIRouteSecurityContext, logAIRouteFailure } from "@lib/google/genAi/diagnostics";
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

const getImageEditingConfigLogSummary = (config: Record<string, any> | undefined | null) => ({
    hasPrompt: typeof config?.prompt === 'string' && config.prompt.length > 0,
    hasReferenceImage: Boolean(config?.referanceImage?.url),
    promptImageCount: Array.isArray(config?.promptImages) ? config.promptImages.length : 0,
    promptLength: typeof config?.prompt === 'string' ? config.prompt.length : 0,
});

const getImageItemDetailsLogSummary = (itemDetails: Record<string, any> | undefined | null) => ({
    attributeCount: Array.isArray(itemDetails?.attributes) ? itemDetails.attributes.length : 0,
    categoryLength: typeof itemDetails?.category === 'string' ? itemDetails.category.length : 0,
    descriptionLength: typeof itemDetails?.description === 'string' ? itemDetails.description.length : 0,
    hasCategory: Boolean(itemDetails?.category),
    hasDescription: Boolean(itemDetails?.description),
    hasId: Boolean(itemDetails?.id),
    hasName: Boolean(itemDetails?.name),
    nameLength: typeof itemDetails?.name === 'string' ? itemDetails.name.length : 0,
});

async function editImageViaFlash(
    generationConfig: { prompt?: string, referanceImage: UserUploadedFileType, promptImages?: UserUploadedFileType[] },
    referenceImageStorageScope?: ImageFetchStorageScope,
): Promise<{ images: { base64: string; mimeType: string }[], response: GenerateContentResponse } | null> {
    try {

        const { base64ImageData, mimeType } = await getImageAsBase64(generationConfig.referanceImage, {
            storageScope: referenceImageStorageScope,
        });
        const promptImagesBase64Data: { base64: string; mimeType: string }[] = [];
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
        const genratedImages = normalizeGeneratedImagesFromProvider(response);
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
    let capacityReservation: Awaited<ReturnType<typeof reserveAiCapacity>> | null = null;

    try {
        if (!FEATURE_FLAGS.ENABLE_AI_IMAGE_GENERATION) {
            return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
        }

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

            await writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, {
                error: errorMsg,
                attemptedData: getAIRouteLogContext({
                    hasGenerationConfig: !!rawData?.generationConfig,
                    hasPrompt: !!rawData?.generationConfig?.prompt,
                    hasPromptImages: Array.isArray(rawData?.generationConfig?.promptImages),
                    hasReferenceImage: !!rawData?.generationConfig?.referanceImage?.url,
                    projectId: rawData?.projectId,
                    fileId: rawData?.fileId,
                }),
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
        capacityReservation = await reserveAiCapacity({
            action: ACTION,
            pId: session.pId ?? session.user?.pId ?? session.user?.productId,
            sId: session.sId,
            source: '/api/image-editing',
            subscription: capacityCheck.subscription!,
            tId: session.tId,
            uId: session.uId ?? session.user?.id,
            unitsToReserve: capacityCheck.unitsRequired,
        });

        const startTime = new Date().getTime();
        const generatedPrompt = generateImageEditingPrompt(businessType, generationConfig, itemDetails);
        if (!generatedPrompt) {
            return NextResponse.json({ error: 'Image editing needs a valid editing prompt' }, { status: 400 });
        }
        generationConfig.prompt = generatedPrompt;
        const promptImages = (generationConfig.promptImages || []).filter((image): image is UserUploadedFileType => Boolean(image?.url));
        const imageEditGemeiniResponse = await editImageViaFlash({
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
                    requestSummary: {
                        generationConfig: getImageEditingConfigLogSummary(generationConfig as Record<string, any>),
                        itemDetails: getImageItemDetailsLogSummary(itemDetails as Record<string, any>),
                    },
                    responseSummary: summarizeImageProviderResponse(imageEditGemeiniResponse?.response),
                },
            });
            return NextResponse.json({ error: 'Image editing produced no image' }, { status: 502 });
        }

        // Update the transaction object with calculated values and other details
        const transactionObject = {
            transactionId: null,
            action: ACTION,
            unitsConsumed: 0,
            itemSummary: getImageItemDetailsLogSummary(itemDetails as Record<string, any>),
            generationConfigSummary: getImageEditingConfigLogSummary(generationConfig as Record<string, any>),
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
        const getTransactionLogSummary = () => ({
            action: transactionObject.action,
            candidatesTokenCount: transactionObject.candidatesTokenCount,
            fileId: transactionObject.fileId,
            imageCount: imageEditGemeiniResponse.images.length,
            model: transactionObject.model,
            processingTime: transactionObject.processingTime,
            projectId: transactionObject.projectId,
            promptTokenCount: transactionObject.promptTokenCount,
            responseSummary: {
                generatedImageCount: imageEditGemeiniResponse.images.length,
                mimeTypes: imageEditGemeiniResponse.images.map((image: { mimeType: string }) => image.mimeType),
                providerResponse: summarizeImageProviderResponse(imageEditGemeiniResponse.response),
            },
            totalCharge: transactionObject.totalCharge,
            totalCredits: transactionObject.totalCredits,
            totalTokenCount: transactionObject.totalTokenCount,
            transactionId: transactionObject.transactionId,
            unitsConsumed: transactionObject.unitsConsumed,
        });

        // Add the operation to the database
        let remainingBalance = null;
        try {
            transactionObject.unitsConsumed = getUnitCost(transactionObject.action);
            const accounting = await finalizeAiOperationAccounting({
                capacityReservation,
                capacitySubscription: capacityCheck.subscription,
                context: { userId, projectId, fileId, action: transactionObject.action },
                input: transactionObject,
                logLabel: 'Image editing',
                session,
            });
            capacityReservation = null;
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
            await writeLogEntry({ logFileName: LOG_FILE, userId: "N/A", projectId, fileId, logType: 'TRANSACTION_DB_ERROR', data: getTransactionLogSummary(), error: getAIErrorDiagnostics(transactionError) });
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
                requestSummary: {
                    generationConfig: getImageEditingConfigLogSummary(generationConfig as Record<string, any>),
                    itemDetails: getImageItemDetailsLogSummary(itemDetails as Record<string, any>),
                },
                responseSummary: getTransactionLogSummary().responseSummary,
                transaction: getTransactionLogSummary(),
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
    } finally {
        await refundAiCapacityReservationSafely(capacityReservation, 'image_editing_request_did_not_settle', {
            endpoint: '/api/image-editing',
            requestId,
        });
    }
});

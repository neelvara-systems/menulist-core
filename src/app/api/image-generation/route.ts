export const dynamic = 'force-dynamic';
import { FEATURE_FLAGS } from "@config/features";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { PERMISSIONS } from "@constant/permissions";
import { finalizeAiOperationAccounting } from "@lib/ai/accounting";
import { checkAICapacity, refundAiCapacityReservationSafely, reserveAiCapacity } from "@lib/ai/capacityCheck";
import { summarizeImageProviderResponse } from "@lib/ai/imageOperationLogging";
import { ImageSubjectProfileError, resolveImageSubjectProfileForGeneration } from "@lib/ai/imageSubjectProfiles";
import { genAIClient } from "@lib/google/genAi";
import { getAIGatewayDiagnostics, getAIRouteLogContext, getAIRouteSecurityContext, logAIRouteFailure } from "@lib/google/genAi/diagnostics";
import { logger } from "@lib/monitoring/logger";
import { getLinkedOutletPolicyBlockReason } from "@lib/multiOutlet/serverOutletPolicy";
import { requireAnyStorePermission } from "@lib/permissions/server";
import { checkExpensiveAILimit } from "@lib/rateLimit/helpers";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { ImageGenerationRequestSchema } from "@lib/validation/apiSchemas";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { withAuth } from "../../../middleware/auth";
import { AI_MODEL_TYPE, IMAGE_AI_MODELS, runImageGenerationPrompts } from "./generators";
import { getImagePrompts } from "./prompt";

const AI_MODEL: AI_MODEL_TYPE = "GEMINI";
const AI_MODEL_ID = IMAGE_AI_MODELS[AI_MODEL];
const ACTION = AI_ACTIONS_TYPES.IMAGE_GENERATION;
const LOG_FILE = "image-generation.log"
const IMAGE_GENERATION_AI_MAX_BODY_BYTES = 16 * 1024 * 1024;

const toUnknownRecord = (value: unknown): Record<string, unknown> => (
    value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {}
);

const getImageGenerationConfigLogSummary = (value: unknown) => {
    const config = toUnknownRecord(value);
    const referenceImage = toUnknownRecord(config.referanceImage);
    return {
        aspectRatio: typeof config.aspectRatio === 'string' ? config.aspectRatio : undefined,
        colorCount: Array.isArray(config.colors) ? config.colors.length : 0,
        compositionCount: Array.isArray(config.compositions) ? config.compositions.length : 0,
        environmentCount: Array.isArray(config.environments) ? config.environments.length : 0,
        hasBackgroundColor: Boolean(config.backgroundColor),
        hasForegroundColor: Boolean(config.foregroundColor),
        hasNegativePrompt: Boolean(config.negativePrompt),
        hasPrompt: typeof config.prompt === 'string' && config.prompt.length > 0,
        hasReferenceImage: Boolean(referenceImage.url),
        hasSubjectProfile: typeof config.subjectProfileId === 'string' && config.subjectProfileId.length > 0,
        isMultiMode: Boolean(config.isMultiMode),
        lightingCount: Array.isArray(config.lighting) ? config.lighting.length : 0,
        moodCount: Array.isArray(config.moods) ? config.moods.length : 0,
        negativePromptLength: typeof config.negativePrompt === 'string' ? config.negativePrompt.length : 0,
        numberOfImages: typeof config.numberOfImages === 'number' && Number.isFinite(config.numberOfImages)
            ? config.numberOfImages
            : 1,
        promptLength: typeof config.prompt === 'string' ? config.prompt.length : 0,
        selectedImageTypeCount: Array.isArray(config.selectedImageTypes) ? config.selectedImageTypes.length : 0,
        styleCount: Array.isArray(config.styles) ? config.styles.length : 0,
        stylesCategoryPresent: Boolean(config.stylesCategory),
        transparentBg: Boolean(config.transparentBg),
    };
};

const getImageItemDetailsLogSummary = (value: unknown) => {
    const itemDetails = toUnknownRecord(value);
    return {
        attributeCount: Array.isArray(itemDetails.attributes) ? itemDetails.attributes.length : 0,
        categoryLength: typeof itemDetails.category === 'string' ? itemDetails.category.length : 0,
        descriptionLength: typeof itemDetails.description === 'string' ? itemDetails.description.length : 0,
        hasCategory: Boolean(itemDetails.category),
        hasDescription: Boolean(itemDetails.description),
        hasId: Boolean(itemDetails.id),
        hasName: Boolean(itemDetails.name),
        nameLength: typeof itemDetails.name === 'string' ? itemDetails.name.length : 0,
    };
};

type ImageGenerationTransactionLog = {
    action: typeof ACTION;
    candidatesTokenCount: number;
    chargePerCredit?: number;
    clientResponse?: string[];
    failedPromptCount?: number;
    fileId?: string;
    geminiResponse?: ReturnType<typeof summarizeImageProviderResponse>[];
    generationConfigSummary?: ReturnType<typeof getImageGenerationConfigLogSummary>;
    imageCount?: number;
    itemSummary?: ReturnType<typeof getImageItemDetailsLogSummary>;
    marginPaise?: number;
    model?: string;
    ourChargePaise?: number;
    processingTime?: number;
    projectId?: string;
    promptCount?: number;
    promptTokenCount: number;
    realCostPaise?: number;
    tokenPerCredit?: number;
    totalCharge: number;
    totalCredits: number;
    totalTokenCount: number;
    transactionId: string | null;
    unitsConsumed?: number;
};


export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;
    const requestId = crypto.randomUUID();
    let projectIdForLog: string | undefined;
    let fileIdForLog: string | undefined;
    let capacityReservation: Awaited<ReturnType<typeof reserveAiCapacity>> | null = null;
    let accountingFailureLogged = false;

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
        const bodyResult = await readBoundedJsonBody(request, IMAGE_GENERATION_AI_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return bodyResult.response;

        const rawData = toUnknownRecord(bodyResult.data);
        const rawGenerationConfig = toUnknownRecord(rawData.generationConfig);
        const rawReferenceImage = toUnknownRecord(rawGenerationConfig.referanceImage);
        const validation = validateAPIInput(ImageGenerationRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            // Log to Sentry (potential attack attempt - HIGH severity: very expensive operation)
            logger.security('Input Validation Failed', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/image-generation',
                error: errorMsg,
                attemptedData: getAIRouteLogContext({
                    hasGenerationConfig: Boolean(rawData.generationConfig),
                    hasPrompt: Boolean(rawGenerationConfig.prompt),
                    projectId: rawData.projectId,
                    fileId: rawData.fileId,
                    businessType: rawData.businessType,
                }),
                requestId,
            }, 'high'); // HIGH severity - very expensive operation

            await writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, {
                error: errorMsg,
                attemptedData: getAIRouteLogContext({
                    hasGenerationConfig: Boolean(rawData.generationConfig),
                    hasPrompt: Boolean(rawGenerationConfig.prompt),
                    hasReferenceImage: Boolean(rawReferenceImage.url),
                    projectId: rawData.projectId,
                    fileId: rawData.fileId,
                    businessType: rawData.businessType,
                }),
            });
            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const jsonData = validation.data;
        const { generationConfig, projectId, fileId, itemDetails, businessType } = jsonData;
        projectIdForLog = projectId;
        fileIdForLog = fileId;

        const permissionError = await requireAnyStorePermission(
            request,
            session,
            [PERMISSIONS.GENERATE_IMAGES],
            "Image generation",
        );
        if (permissionError) return permissionError;

        const outletPolicyBlockReason = await getLinkedOutletPolicyBlockReason({
            action: "image",
            itemIds: itemDetails?.id ? [String(itemDetails.id)] : [],
            projectId,
            session,
        });
        if (outletPolicyBlockReason) {
            logger.security('Outlet Policy Violation - Image Generation API', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/image-generation',
                project: getAIRouteLogContext({ projectId }),
                reason: outletPolicyBlockReason,
                requestId,
            }, 'medium');
            return NextResponse.json({ error: outletPolicyBlockReason }, { status: 403 });
        }

        if (generationConfig.subjectProfileId && !FEATURE_FLAGS.ENABLE_AI_SUBJECT_PROFILES) {
            return NextResponse.json({ error: 'Saved person profiles are unavailable.' }, { status: 404 });
        }
        let subjectProfile;
        try {
            subjectProfile = await resolveImageSubjectProfileForGeneration({
                expectedVersion: generationConfig.subjectProfileVersion,
                profileId: generationConfig.subjectProfileId,
                sId: String(session.sId),
                tId: String(session.tId),
            });
        } catch (error) {
            if (error instanceof ImageSubjectProfileError) {
                return NextResponse.json({ error: 'The selected saved person is no longer available. Choose it again or continue without it.' }, { status: error.code === 'NOT_FOUND' ? 404 : 409 });
            }
            throw error;
        }

        const promptsToExecute = getImagePrompts({ generationConfig, projectId, fileId, itemDetails, businessType }, AI_MODEL);
        if (!promptsToExecute.length) {
            return NextResponse.json({ error: 'Image generation needs a prompt or item details' }, { status: 400 });
        }

        const estimatedImageQuantity = Math.max(
            promptsToExecute.length,
            Number(generationConfig?.numberOfImages || 1),
            1,
        );

        // 🔋 AI CAPACITY CHECK: Verify store has sufficient capacity before provider work
        const capacityCheck = await checkAICapacity(
            session.tId,
            session.sId,
            ACTION,
            estimatedImageQuantity,
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
            source: '/api/image-generation',
            subscription: capacityCheck.subscription!,
            tId: session.tId,
            uId: session.uId ?? session.user?.id,
            unitsToReserve: capacityCheck.unitsRequired,
        });

        const startTime = new Date().getTime();

        const promptRun = await runImageGenerationPrompts({
            generationConfig,
            logFile: LOG_FILE,
            prompts: promptsToExecute,
            referenceImageStorageScope: {
                sId: session.sId,
                tId: session.tId,
            },
            subjectReferences: subjectProfile?.references,
        });
        const genratedImages = promptRun.images;
        const generatedImagesResponse = promptRun.responses;

        const endTime = new Date().getTime();
        const processingTime = endTime - startTime;

        if (!genratedImages?.length) {
            await writeLogEntry({
                logFileName: LOG_FILE,
                userId,
                projectId,
                fileId,
                logType: 'NO_IMAGE_GENERATED',
                data: {
                    requestSummary: {
                        generationConfig: getImageGenerationConfigLogSummary(generationConfig),
                        itemDetails: getImageItemDetailsLogSummary(itemDetails),
                    },
                    responseSummary: {
                        providerResponseCount: generatedImagesResponse?.length || 0,
                        responses: generatedImagesResponse?.map(summarizeImageProviderResponse) || [],
                    },
                },
            });
            return NextResponse.json({ error: 'Image generation produced no image' }, { status: 502 });
        }

        // Initialize transaction object outside the if block
        let remainingBalance = null;
        let transactionObject: ImageGenerationTransactionLog = {
            action: ACTION,
            totalCharge: 0,
            totalCredits: 0,
            totalTokenCount: 0,
            candidatesTokenCount: 0,
            promptTokenCount: 0,
            transactionId: null
        };

        if (generatedImagesResponse?.length > 0) {
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

            const billableImageCount = Math.max(genratedImages.length, promptRun.promptCount, 1);
            const realCostPaise = getRealCostPaise(AI_ACTIONS_TYPES.IMAGE_GENERATION) * billableImageCount;
            const ourChargePaise = getOurChargePaise(AI_ACTIONS_TYPES.IMAGE_GENERATION) * billableImageCount;

            // Update the transaction object with calculated values and other details
            transactionObject = {
                ...transactionObject,
                itemSummary: getImageItemDetailsLogSummary(itemDetails),
                generationConfigSummary: getImageGenerationConfigLogSummary(generationConfig),
                projectId,
                fileId,
                action: ACTION,
                failedPromptCount: promptRun.failedPromptCount,
                imageCount: genratedImages.length,
                promptCount: promptRun.promptCount,
                processingTime,
                clientResponse: genratedImages.map((image: { base64: string; mimeType: string }) => image.mimeType),
                model: AI_MODEL_ID,
                geminiResponse: generatedImagesResponse.map(summarizeImageProviderResponse),
                tokenPerCredit: TOKENS_PER_CREDIT,
                chargePerCredit: CHARGE_PER_CREDIT,
                // Deep tracking: real Google cost vs our charge vs margin (all in paise)
                realCostPaise,
                ourChargePaise,
                marginPaise: ourChargePaise - realCostPaise,
            };

            // Add the operation to the database
            try {
                transactionObject.unitsConsumed = capacityReservation.unitsReserved;
                const accounting = await finalizeAiOperationAccounting({
                    capacityReservation,
                    capacitySubscription: capacityCheck.subscription,
                    context: { userId, projectId, fileId, action: transactionObject.action },
                    input: transactionObject,
                    logLabel: 'Image generation',
                    session,
                });
                capacityReservation = null;
                transactionObject.unitsConsumed = accounting.unitsConsumed;
                transactionObject.transactionId = accounting.transactionId;
                remainingBalance = accounting.remainingBalance;
            } catch (transactionError) {
                logAIRouteFailure('image_generation_accounting_failed', transactionError, {
                    action: ACTION,
                    failedPromptCount: promptRun.failedPromptCount,
                    fileId,
                    imageCount: genratedImages.length,
                    model: AI_MODEL_ID,
                    projectId,
                    promptCount: promptRun.promptCount,
                    requestId,
                    userId,
                });
                accountingFailureLogged = true;
                throw transactionError;
            }
        }
        const getTransactionLogSummary = () => ({
            action: transactionObject.action || ACTION,
            candidatesTokenCount: transactionObject.candidatesTokenCount,
            failedPromptCount: transactionObject.failedPromptCount || 0,
            fileId: transactionObject.fileId || fileId,
            imageCount: transactionObject.imageCount || genratedImages.length,
            model: transactionObject.model || AI_MODEL_ID,
            processingTime: transactionObject.processingTime || processingTime,
            projectId: transactionObject.projectId || projectId,
            promptCount: transactionObject.promptCount || promptRun.promptCount,
            promptTokenCount: transactionObject.promptTokenCount,
            responseSummary: {
                generatedImageCount: genratedImages.length,
                mimeTypes: genratedImages.map((image: { mimeType: string }) => image.mimeType),
                providerResponseCount: generatedImagesResponse.length,
            },
            totalCharge: transactionObject.totalCharge,
            totalCredits: transactionObject.totalCredits,
            totalTokenCount: transactionObject.totalTokenCount,
            transactionId: transactionObject.transactionId,
            unitsConsumed: transactionObject.unitsConsumed,
        });

        // Log successful response
        await writeLogEntry({
            logFileName: LOG_FILE, userId: userId, projectId, fileId, logType: 'SUCCESS_RESPONSE',
            data: {
                requestSummary: {
                    generationConfig: getImageGenerationConfigLogSummary(generationConfig),
                    itemDetails: getImageItemDetailsLogSummary(itemDetails),
                },
                responseSummary: getTransactionLogSummary().responseSummary,
                transaction: getTransactionLogSummary()
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
        if (!accountingFailureLogged) {
            logAIRouteFailure('image_generation_api_failed', error, {
                action: ACTION,
                fileId: fileIdForLog,
                gatewayDiagnostics: getAIGatewayDiagnostics(genAIClient),
                model: AI_MODEL_ID,
                projectId: projectIdForLog,
                requestId,
                userId,
            });
        }
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json({ error: 'Image generation failed' }, { status: 500 });
    } finally {
        await refundAiCapacityReservationSafely(capacityReservation, 'image_generation_request_did_not_settle', {
            endpoint: '/api/image-generation',
            requestId,
        });
    }
});

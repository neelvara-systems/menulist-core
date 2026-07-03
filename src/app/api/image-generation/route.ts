export const dynamic = 'force-dynamic';
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, CHARGE_PER_IMAGEN_IMAGE, TOKENS_PER_CREDIT, TOKENS_PER_IMAGEN_IMAGE } from "@constant/common";
import { PERMISSIONS } from "@constant/permissions";
import { finalizeAiOperationAccounting } from "@lib/ai/accounting";
import { checkAICapacity } from "@lib/ai/capacityCheck";
import { sanitizeImageGenerationConfigForLogging, summarizeImageProviderResponse } from "@lib/ai/imageOperationLogging";
import { genAIClient } from "@lib/google/genAi";
import { getAIGatewayDiagnostics, getAIRouteLogContext, getAIRouteSecurityContext, logAIRouteFailure } from "@lib/google/genAi/diagnostics";
import { logger } from "@lib/monitoring/logger";
import { getLinkedOutletPolicyBlockReason } from "@lib/multiOutlet/serverOutletPolicy";
import { requireAnyStorePermission } from "@lib/permissions/server";
import { checkExpensiveAILimit } from "@lib/rateLimit/helpers";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { ImageGenerationRequestSchema } from "@lib/validation/apiSchemas";
import { GenerateImageViaApiPayloadType } from "@template/main-app/projects/types";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { withAuth } from "../../../middleware/auth";
import { AI_MODEL_TYPE, runImageGenerationPrompts } from "./generators";
import { getImagePrompts } from "./prompt";

const AI_MODEL: AI_MODEL_TYPE = "GEMINI";
const ACTION = AI_ACTIONS_TYPES.IMAGE_GENERATION;
const LOG_FILE = "image-generation.log"
const IMAGE_GENERATION_AI_MAX_BODY_BYTES = 16 * 1024 * 1024;


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
        const bodyResult = await readBoundedJsonBody(request, IMAGE_GENERATION_AI_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return bodyResult.response;

        const rawData = bodyResult.data as any;
        const validation = validateAPIInput(ImageGenerationRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            // Log to Sentry (potential attack attempt - HIGH severity: very expensive operation)
            logger.security('Input Validation Failed', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/image-generation',
                error: errorMsg,
                attemptedData: getAIRouteLogContext({
                    hasGenerationConfig: !!rawData?.generationConfig,
                    hasPrompt: !!rawData?.generationConfig?.prompt,
                    projectId: rawData?.projectId,
                    fileId: rawData?.fileId,
                    businessType: rawData?.businessType,
                }),
                requestId,
            }, 'high'); // HIGH severity - very expensive operation

            await writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, {
                error: errorMsg,
                hasGenerationConfig: !!rawData?.generationConfig,
                hasPrompt: !!rawData?.generationConfig?.prompt,
                hasReferenceImage: !!rawData?.generationConfig?.referanceImage?.url,
                projectId: rawData?.projectId,
                fileId: rawData?.fileId,
                businessType: rawData?.businessType,
            });
            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const jsonData = validation.data as unknown as GenerateImageViaApiPayloadType;
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

        const startTime = new Date().getTime();

        logger.debug('Prompts to execute', { count: promptsToExecute.length })

        const promptRun = await runImageGenerationPrompts({
            aiModel: AI_MODEL,
            generationConfig,
            logFile: LOG_FILE,
            prompts: promptsToExecute,
            referenceImageStorageScope: {
                sId: session.sId,
                tId: session.tId,
            },
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
                    generationConfig: sanitizeImageGenerationConfigForLogging(generationConfig as unknown as Record<string, unknown>),
                    itemDetails,
                    response: generatedImagesResponse?.map(summarizeImageProviderResponse),
                },
            });
            return NextResponse.json({ error: 'Image generation produced no image' }, { status: 502 });
        }

        // Initialize transaction object outside the if block
        let remainingBalance = null;
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
                // Process Gemini usage metadata
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
                const generatedImageCount = genratedImages.length;
                transactionObject.totalCredits = generatedImageCount * TOKENS_PER_IMAGEN_IMAGE;
                transactionObject.totalCharge = CHARGE_PER_IMAGEN_IMAGE * transactionObject.totalCredits;
            }

            const billableImageCount = Math.max(genratedImages.length, promptRun.promptCount, 1);
            const realCostPaise = getRealCostPaise(AI_ACTIONS_TYPES.IMAGE_GENERATION) * billableImageCount;
            const ourChargePaise = getOurChargePaise(AI_ACTIONS_TYPES.IMAGE_GENERATION) * billableImageCount;

            // Update the transaction object with calculated values and other details
            transactionObject = {
                ...transactionObject,
                itemDetails,
                generationConfig: sanitizeImageGenerationConfigForLogging(generationConfig as unknown as Record<string, unknown>),
                projectId,
                fileId,
                action: ACTION,
                failedPromptCount: promptRun.failedPromptCount,
                imageCount: genratedImages.length,
                promptCount: promptRun.promptCount,
                processingTime,
                clientResponse: genratedImages.map((image: { base64: string; mimeType: string }) => image.mimeType),
                model: AI_MODEL,
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
                transactionObject.unitsConsumed = Math.max(
                    capacityCheck.unitsRequired,
                    getUnitCost(transactionObject.action) * Math.max(genratedImages.length, promptRun.promptCount, 1),
                );
                const accounting = await finalizeAiOperationAccounting({
                    capacitySubscription: capacityCheck.subscription,
                    context: { userId, projectId, fileId, action: transactionObject.action },
                    input: transactionObject,
                    logLabel: 'Image generation',
                    session,
                });
                logger.debug('Image generation transaction recorded', getAIRouteLogContext({ transactionId: accounting.transactionId }));
                transactionObject.unitsConsumed = accounting.unitsConsumed;
                transactionObject.transactionId = accounting.transactionId;
                remainingBalance = accounting.remainingBalance;
            } catch (transactionError) {
                logAIRouteFailure('image_generation_accounting_failed', transactionError, {
                    action: ACTION,
                    failedPromptCount: promptRun.failedPromptCount,
                    fileId,
                    imageCount: genratedImages.length,
                    model: AI_MODEL,
                    projectId,
                    promptCount: promptRun.promptCount,
                    requestId,
                    userId,
                });
                if (transactionError && typeof transactionError === 'object') {
                    (transactionError as Record<string, unknown>).__imageGenerationLogged = true;
                }
                throw transactionError;
            }
        }

        // Log successful response
        await writeLogEntry({
            logFileName: LOG_FILE, userId: userId, projectId, fileId, logType: 'SUCCESS_RESPONSE',
            data: {
                request: {
                    generationConfig: sanitizeImageGenerationConfigForLogging(generationConfig as unknown as Record<string, unknown>),
                    itemDetails,
                },
                response: generatedImagesResponse.map(summarizeImageProviderResponse),
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
        if (!(error && typeof error === 'object' && '__imageGenerationLogged' in error)) {
            logAIRouteFailure('image_generation_api_failed', error, {
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
        return NextResponse.json({ error: 'Image generation failed' }, { status: 500 });
    }
});

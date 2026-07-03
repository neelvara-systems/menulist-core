export const dynamic = 'force-dynamic';
import { GEMINI_MODELS } from "@constant/AI/models";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { PERMISSIONS } from "@constant/permissions";
import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { finalizeAiOperationAccounting } from "@lib/ai/accounting";
import { checkAICapacity } from "@lib/ai/capacityCheck";
import { getAIGatewayDiagnostics, getAIRouteLogContext, getAIRouteSecurityContext, getPreviewText, logAIRouteFailure } from "@lib/google/genAi/diagnostics";
import { genAIClient } from "@lib/google/genAi";
import { logger } from "@lib/monitoring/logger";
import { requireAnyStorePermission } from "@lib/permissions/server";
import { checkAIOperationLimit } from "@lib/rateLimit/helpers";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { getSafeFallbackCaption, sanitizeAIOutput } from "@lib/trust/phraseGuard";
import { CampaignCaptionRequestSchema } from "@lib/validation/apiSchemas";
import { CAMPAIGN_CAPTION_PROMPT_V1, CampaignCaptionInput } from "@services/gemini/prompts/v1/campaignCaption.prompt";
import { NextResponse } from 'next/server';
import { verifyTenantAccess, withAuth } from "../../../../middleware/auth";

const AI_MODEL = GEMINI_MODELS.TEXT_GEN;
const ACTION = AI_ACTIONS_TYPES.CAMPAIGN_CAPTION;
const CAMPAIGN_CAPTION_AI_MAX_BODY_BYTES = 64 * 1024;

/**
 * Campaign Caption Generation API
     *
 * Per Strategy Doc:
 * - Generate simple, friendly captions for campaign items
 * - No marketing jargon, no "AI" language
 * - Appropriate for WhatsApp, Poster, etc.
     *
 * Follows existing patterns from descriptions API
 */
export const POST = withAuth(async (request, session) => {
    const userId = session.user.id;
    const requestId = crypto.randomUUID();

    try {
        // �️ SAFE_MODE: Block expensive operations during system maintenance
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        // �🔒 RATE LIMITING: Prevent API abuse
        const rateLimitResponse = await checkAIOperationLimit();
        if (rateLimitResponse) return rateLimitResponse;

        // 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const bodyResult = await readBoundedJsonBody(request, CAMPAIGN_CAPTION_AI_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return bodyResult.response;

        const rawData = bodyResult.data as any;
        const validation = validateAPIInput(CampaignCaptionRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            logger.security('Campaign Caption Input Validation Failed', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/campaigns/caption',
                error: errorMsg,
                requestId,
            }, 'medium');

            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const validated = validation.data;
        const { itemName, itemDescription, itemPrice, categoryName, businessName, campaignType, surface, language, projectId } = validated;

        const permissionError = await requireAnyStorePermission(
            request,
            session,
            [PERMISSIONS.MANAGE_MENU_SHARING, PERMISSIONS.PUBLISH_MENU, PERMISSIONS.MANAGE_MENU],
            "Campaign caption",
        );
        if (permissionError) return permissionError;

        // 🔒 TENANT ISOLATION: Verify user owns this project
        if (projectId) {
            const tenantId = session.tId;
            const storeId = session.sId;

            if (!verifyTenantAccess(session, tenantId, storeId, request)) {
                logger.security('Tenant Access Violation - Campaign Caption API', {
                    ...getAIRouteSecurityContext(session, request),
                    endpoint: '/api/campaigns/caption',
                    attemptedProject: getAIRouteLogContext({ projectId }),
                    requestId,
                }, 'critical');
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const capacityCheck = await checkAICapacity(session.tId, session.sId, ACTION);
        if (!capacityCheck.allowed) {
            return NextResponse.json({
                error: capacityCheck.reason === 'maintenance'
                    ? 'AI enhancements are temporarily unavailable.'
                    : 'Additional AI enhancements needed for your menu.',
                code: capacityCheck.reason,
            }, { status: 402 });
        }

        const startTime = Date.now();

        // Build prompt input
        const promptInput: CampaignCaptionInput = {
            itemName,
            itemDescription,
            itemPrice,
            categoryName,
            businessName,
            campaignType,
            surface,
            language
        };

        // Get prompt from registry
        const prompt = CAMPAIGN_CAPTION_PROMPT_V1;
        const userPrompt = prompt.user(promptInput);

        const generationConfig = {
            responseMimeType: "application/json",
            temperature: prompt.config.temperature,
            topP: prompt.config.topP,
            topK: prompt.config.topK,
            systemInstruction: prompt.system,
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
                }
            ]
        };

        let response;
        try {
            response = await genAIClient.models.generateContent({
                model: AI_MODEL,
                contents: userPrompt,
                config: generationConfig,
            });
        } catch (generationError) {
            logAIRouteFailure('campaign_caption_model_call_failed', generationError, {
                action: ACTION,
                campaignType,
                gatewayDiagnostics: getAIGatewayDiagnostics(genAIClient),
                language,
                model: AI_MODEL,
                projectId,
                requestId,
                storeId: session.sId,
                surface,
                tenantId: session.tId,
                userId,
            });
            if (generationError && typeof generationError === 'object') {
                (generationError as Record<string, unknown>).__campaignCaptionLogged = true;
            }
            throw generationError;
        }

        const endTime = Date.now();
        const processingTime = endTime - startTime;

        let generatedData: any;
        try {
            generatedData = JSON.parse(response.text);
        } catch (parseError) {
            logAIRouteFailure('campaign_caption_invalid_json', parseError, {
                action: ACTION,
                campaignType,
                language,
                model: AI_MODEL,
                userId,
                projectId,
                responseTextLength: typeof response.text === 'string' ? response.text.length : 0,
                responseTextSummary: getPreviewText(response.text, 400),
                responseTextPresent: Boolean(response.text),
                responseUsage: response.usageMetadata || null,
                requestId,
                storeId: session.sId,
                surface,
                tenantId: session.tId,
            });
            return NextResponse.json({
                error: 'Failed to parse AI response',
            }, { status: 500 });
        }

        // 🛡️ TRUST GUARD: Sanitize AI output for forbidden phrases
        const fallbackCaption = getSafeFallbackCaption(campaignType);
        if (generatedData.caption) {
            generatedData.caption = sanitizeAIOutput(
                generatedData.caption,
                fallbackCaption,
                'campaign_caption'
            );
        }
        if (generatedData.shortCaption) {
            generatedData.shortCaption = sanitizeAIOutput(
                generatedData.shortCaption,
                fallbackCaption,
                'campaign_short_caption'
            );
        }

        const transactionObject: any = {
            action: ACTION,
            businessName,
            campaignType,
            categoryName,
            chargePerCredit: CHARGE_PER_CREDIT,
            clientResponse: generatedData,
            generationConfig: {
                responseMimeType: "application/json",
                temperature: prompt.config.temperature,
                topP: prompt.config.topP,
                topK: prompt.config.topK,
            },
            geminiResponse: response,
            itemDescription,
            itemName,
            itemPrice,
            language,
            model: AI_MODEL,
            processingTime,
            projectId,
            promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
            candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
            totalTokenCount: response.usageMetadata?.totalTokenCount || 0,
            tokenPerCredit: TOKENS_PER_CREDIT,
            totalCredits: ((response.usageMetadata?.totalTokenCount || 0) / TOKENS_PER_CREDIT),
            totalCharge: CHARGE_PER_CREDIT * ((response.usageMetadata?.totalTokenCount || 0) / TOKENS_PER_CREDIT),
            realCostPaise: getRealCostPaise(ACTION),
            ourChargePaise: getOurChargePaise(ACTION),
            marginPaise: getOurChargePaise(ACTION) - getRealCostPaise(ACTION),
            surface,
            unitsConsumed: getUnitCost(ACTION),
        };

        let remainingBalance = null;
        try {
            const accounting = await finalizeAiOperationAccounting({
                capacitySubscription: capacityCheck.subscription,
                context: { userId, projectId, action: ACTION, storeId: session.sId, tenantId: session.tId },
                input: transactionObject,
                logLabel: 'Campaign caption',
                session,
            });
            transactionObject.unitsConsumed = accounting.unitsConsumed;
            transactionObject.transactionId = accounting.transactionId;
            remainingBalance = accounting.remainingBalance;
        } catch (transactionError) {
            logAIRouteFailure('campaign_caption_accounting_failed', transactionError, {
                action: ACTION,
                campaignType,
                language,
                model: AI_MODEL,
                projectId,
                requestId,
                storeId: session.sId,
                surface,
                tenantId: session.tId,
                userId,
            });
            if (transactionError && typeof transactionError === 'object') {
                (transactionError as Record<string, unknown>).__campaignCaptionLogged = true;
            }
            throw transactionError;
        }

        return NextResponse.json({
            data: generatedData,
            meta: {
                processingTime,
                promptVersion: prompt.version.version,
                surface,
                campaignType
            },
            remainingBalance,
            transaction: {
                totalCharge: transactionObject.totalCharge,
                totalCredits: transactionObject.totalCredits,
                processingTime: transactionObject.processingTime,
                transactionId: transactionObject.transactionId,
            },
        }, { status: 200 });

    } catch (error) {
        if (!(error && typeof error === 'object' && '__campaignCaptionLogged' in error)) {
            logAIRouteFailure('campaign_caption_api_failed', error, {
                action: ACTION,
                gatewayDiagnostics: getAIGatewayDiagnostics(genAIClient),
                model: AI_MODEL,
                requestId,
                storeId: session.sId,
                tenantId: session.tId,
                userId,
            });
        }
        return NextResponse.json({
            error: 'Caption generation failed'
        }, { status: 500 });
    }
});

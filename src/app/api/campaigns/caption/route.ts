export const dynamic = 'force-dynamic';
import { GEMINI_MODELS } from "@constant/AI/models";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { PERMISSIONS } from "@constant/permissions";
import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { finalizeAiOperationAccounting } from "@lib/ai/accounting";
import { normalizeCampaignCaptionGenerationResult } from "@lib/ai/campaignCaptionOutput";
import { checkAICapacity, refundAiCapacityReservationSafely, reserveAiCapacity } from "@lib/ai/capacityCheck";
import { getAIGatewayDiagnostics, getAIRouteLogContext, getAIRouteSecurityContext, logAIRouteFailure } from "@lib/google/genAi/diagnostics";
import { genAIClient } from "@lib/google/genAi";
import { logger } from "@lib/monitoring/logger";
import { requireAnyStorePermission } from "@lib/permissions/server";
import { getSessionProjectAccessBlockReason } from "@lib/menu/serverProjectAccess";
import { checkAIOperationLimit } from "@lib/rateLimit/helpers";
import { logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { getSafeFallbackCaption, sanitizeAIOutput } from "@lib/trust/phraseGuard";
import { CampaignCaptionRequestSchema } from "@lib/validation/apiSchemas";
import { CAMPAIGN_CAPTION_PROMPT_V1, CampaignCaptionInput } from "@services/gemini/prompts/v1/campaignCaption.prompt";
import { NextResponse } from 'next/server';
import { withAuth } from "../../../../middleware/auth";

const AI_MODEL = GEMINI_MODELS.TEXT_GEN;
const ACTION = AI_ACTIONS_TYPES.CAMPAIGN_CAPTION;
const CAMPAIGN_CAPTION_AI_MAX_BODY_BYTES = 64 * 1024;
const MAX_CAMPAIGN_CAPTION_PROVIDER_RESPONSE_PARSE_DIAGNOSTICS = 25;

type CampaignCaptionProviderResponseParseStage =
    | 'empty_response'
    | 'object_fragment'
    | 'object_fragment_missing';

type CampaignCaptionProviderResponseParseContext = {
    action: string;
    campaignType: string;
    language: string;
    projectId?: unknown;
    requestId: string;
    responseUsage?: unknown;
    storeId: unknown;
    surface: string;
    tenantId: unknown;
    userId: unknown;
};

type CampaignCaptionProviderResponseParseFailureContext = CampaignCaptionProviderResponseParseContext & {
    candidateLength: number;
    hasFence: boolean;
    hasObjectFragment: boolean;
    responseTextLength: number;
    stage: CampaignCaptionProviderResponseParseStage;
    trimmedTextLength: number;
};

const reportedCampaignCaptionProviderResponseParseFailures = new Set<string>();

function logCampaignCaptionProviderResponseParseFailure(
    error: unknown,
    context: CampaignCaptionProviderResponseParseFailureContext,
): void {
    const failureKey = [
        context.stage,
        context.responseTextLength,
        context.trimmedTextLength,
        context.candidateLength,
        context.hasFence ? 'fenced' : 'plain',
        context.hasObjectFragment ? 'object-fragment' : 'no-object-fragment',
    ].join(':');

    if (reportedCampaignCaptionProviderResponseParseFailures.has(failureKey)) return;
    if (reportedCampaignCaptionProviderResponseParseFailures.size >= MAX_CAMPAIGN_CAPTION_PROVIDER_RESPONSE_PARSE_DIAGNOSTICS) return;
    reportedCampaignCaptionProviderResponseParseFailures.add(failureKey);

    logRuntimeFailure('campaign_caption_provider_response_parse_failed', error, {
        ...getAIRouteLogContext({
            action: context.action,
            campaignType: context.campaignType,
            language: context.language,
            model: AI_MODEL,
            projectId: context.projectId,
            requestId: context.requestId,
            responseUsage: context.responseUsage,
            storeId: context.storeId,
            surface: context.surface,
            tenantId: context.tenantId,
            userId: context.userId,
        }),
        candidateLength: context.candidateLength,
        fallbackPolicy: 'return_caption_generation_failed',
        hasFence: context.hasFence,
        hasObjectFragment: context.hasObjectFragment,
        parseStage: context.stage,
        responseTextLength: context.responseTextLength,
        trimmedTextLength: context.trimmedTextLength,
    });
}

function parseCampaignCaptionProviderResponse(
    responseText: string | undefined,
    context: CampaignCaptionProviderResponseParseContext,
): unknown {
    const rawText = String(responseText || '');
    const trimmedText = rawText.trim();
    const hasFence = trimmedText.startsWith('```') || trimmedText.endsWith('```');
    const cleaned = trimmedText
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();

    if (!cleaned) {
        const error = new Error('Campaign caption returned empty response');
        logCampaignCaptionProviderResponseParseFailure(error, {
            ...context,
            candidateLength: 0,
            hasFence,
            hasObjectFragment: false,
            responseTextLength: rawText.length,
            stage: 'empty_response',
            trimmedTextLength: trimmedText.length,
        });
        throw error;
    }

    try {
        return JSON.parse(cleaned);
    } catch (fullParseError) {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        const hasObjectFragment = firstBrace >= 0 && lastBrace > firstBrace;
        if (hasObjectFragment) {
            const objectCandidate = cleaned.slice(firstBrace, lastBrace + 1);
            try {
                return JSON.parse(objectCandidate);
            } catch (fragmentParseError) {
                logCampaignCaptionProviderResponseParseFailure(fragmentParseError, {
                    ...context,
                    candidateLength: objectCandidate.length,
                    hasFence,
                    hasObjectFragment,
                    responseTextLength: rawText.length,
                    stage: 'object_fragment',
                    trimmedTextLength: trimmedText.length,
                });
                throw fragmentParseError;
            }
        }

        logCampaignCaptionProviderResponseParseFailure(fullParseError, {
            ...context,
            candidateLength: 0,
            hasFence,
            hasObjectFragment,
            responseTextLength: rawText.length,
            stage: 'object_fragment_missing',
            trimmedTextLength: trimmedText.length,
        });
        throw fullParseError;
    }
}

function getCampaignCaptionResponseSummary(response: Record<string, unknown>) {
    const caption = typeof response.caption === 'string' ? response.caption : '';
    const shortCaption = typeof response.shortCaption === 'string' ? response.shortCaption : '';
    const callToAction = typeof response.callToAction === 'string' ? response.callToAction : '';
    const hashtags = Array.isArray(response.hashtags) ? response.hashtags : [];

    return {
        callToActionLength: callToAction.length,
        captionLength: caption.length,
        hasCallToAction: callToAction.trim().length > 0,
        hasCaption: caption.trim().length > 0,
        hashtagCount: hashtags.length,
        hasShortCaption: shortCaption.trim().length > 0,
        objectKeyCount: Object.keys(response).length,
        responseShape: 'object',
        responseSummaryKind: 'campaign_caption',
        shortCaptionLength: shortCaption.length,
    };
}

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
    let capacityReservation: Awaited<ReturnType<typeof reserveAiCapacity>> | null = null;

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
        const promptSummary = {
            businessNameLength: businessName?.length || 0,
            categoryNameLength: categoryName?.length || 0,
            hasBusinessName: Boolean(businessName),
            hasCategoryName: Boolean(categoryName),
            hasItemDescription: Boolean(itemDescription),
            hasItemName: Boolean(itemName),
            hasItemPrice: Boolean(itemPrice),
            itemDescriptionLength: itemDescription?.length || 0,
            itemNameLength: itemName?.length || 0,
            itemPriceLength: itemPrice?.length || 0,
            languageLength: language?.length || 0,
        };

        const permissionError = await requireAnyStorePermission(
            request,
            session,
            [PERMISSIONS.MANAGE_MENU_SHARING, PERMISSIONS.PUBLISH_MENU, PERMISSIONS.MANAGE_MENU],
            "Campaign caption",
        );
        if (permissionError) return permissionError;

        // Tenant isolation: a supplied project may only identify an existing
        // project in the authenticated tenant/store scope.
        if (projectId) {
            const projectAccessBlockReason = await getSessionProjectAccessBlockReason({ projectId, session });
            if (projectAccessBlockReason) {
                logger.security('Tenant Access Violation - Campaign Caption API', {
                    ...getAIRouteSecurityContext(session, request),
                    endpoint: '/api/campaigns/caption',
                    attemptedProject: getAIRouteLogContext({ projectId }),
                    requestId,
                }, 'critical');
                return NextResponse.json({ error: projectAccessBlockReason }, { status: 403 });
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
        capacityReservation = await reserveAiCapacity({
            action: ACTION,
            pId: session.pId ?? session.user?.pId ?? session.user?.productId,
            sId: session.sId,
            source: '/api/campaigns/caption',
            subscription: capacityCheck.subscription!,
            tId: session.tId,
            uId: session.uId ?? session.user?.id,
            unitsToReserve: capacityCheck.unitsRequired,
        });

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

        let providerData: unknown;
        try {
            providerData = parseCampaignCaptionProviderResponse(response.text, {
                action: ACTION,
                campaignType,
                language,
                projectId,
                requestId,
                responseUsage: response.usageMetadata || null,
                storeId: session.sId,
                surface,
                tenantId: session.tId,
                userId,
            });
        } catch (parseError) {
            logAIRouteFailure('campaign_caption_invalid_json', parseError, {
                action: ACTION,
                campaignType,
                language,
                model: AI_MODEL,
                userId,
                projectId,
                responseTextLength: response.text?.length || 0,
                responseTextPresent: Boolean(response.text),
                responseUsage: response.usageMetadata || null,
                requestId,
                storeId: session.sId,
                surface,
                tenantId: session.tId,
            });
            return NextResponse.json({
                error: 'Caption generation failed',
            }, { status: 500 });
        }

        const normalizedProviderData = normalizeCampaignCaptionGenerationResult(providerData);
        if (!normalizedProviderData) {
            logAIRouteFailure('campaign_caption_non_object_response', undefined, {
                action: ACTION,
                campaignType,
                isArray: Array.isArray(providerData),
                language,
                model: AI_MODEL,
                projectId,
                requestId,
                responseTextLength: response.text?.length || 0,
                responseType: typeof providerData,
                responseUsage: response.usageMetadata || null,
                storeId: session.sId,
                surface,
                tenantId: session.tId,
                userId,
            });
            return NextResponse.json({
                error: 'Caption generation failed',
            }, { status: 500 });
        }

        // 🛡️ TRUST GUARD: Sanitize AI output for forbidden phrases
        const fallbackCaption = getSafeFallbackCaption(campaignType);
        const generatedData = {
            ...normalizedProviderData,
            caption: sanitizeAIOutput(normalizedProviderData.caption, fallbackCaption, 'campaign_caption'),
            shortCaption: sanitizeAIOutput(normalizedProviderData.shortCaption, fallbackCaption, 'campaign_short_caption'),
        };

        const transactionObject: any = {
            action: ACTION,
            campaignType,
            chargePerCredit: CHARGE_PER_CREDIT,
            clientResponse: getCampaignCaptionResponseSummary(generatedData),
            generationConfig: {
                responseMimeType: "application/json",
                temperature: prompt.config.temperature,
                topP: prompt.config.topP,
                topK: prompt.config.topK,
            },
            geminiResponse: response,
            model: AI_MODEL,
            processingTime,
            promptSummary,
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
                capacityReservation,
                capacitySubscription: capacityCheck.subscription,
                context: { userId, projectId, action: ACTION, storeId: session.sId, tenantId: session.tId },
                input: transactionObject,
                logLabel: 'Campaign caption',
                session,
            });
            capacityReservation = null;
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
    } finally {
        await refundAiCapacityReservationSafely(capacityReservation, 'campaign_caption_request_did_not_settle', {
            endpoint: '/api/campaigns/caption',
            requestId,
        });
    }
});

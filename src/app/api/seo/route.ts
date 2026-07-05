export const dynamic = 'force-dynamic';

import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { PERMISSIONS } from "@constant/permissions";
import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { finalizeAiOperationAccounting } from "@lib/ai/accounting";
import { checkAICapacity } from "@lib/ai/capacityCheck";
import { getModelName } from "@constant/AI/models";
import { getAIGatewayDiagnostics, getAIErrorDiagnostics, getAIRouteLogContext, getAIRouteSecurityContext, logAIRouteFailure } from "@lib/google/genAi/diagnostics";
import { genAIClient } from "@lib/google/genAi";
import { logger } from "@lib/monitoring/logger";
import { requireAnyStorePermission } from "@lib/permissions/server";
import { checkAIOperationLimit } from "@lib/rateLimit/helpers";
import { logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { SeoGenerationRequestSchema } from "@lib/validation/apiSchemas";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { withAuth } from "../../../middleware/auth";
import seoPrompt, { seoPromptSystemInstruction } from "./prompt";

const AI_MODEL = getModelName('DESCRIPTION_GENERATION');
const LOG_FILE = "seo-generation.log";
const SEO_AI_MAX_BODY_BYTES = 256 * 1024;
const MAX_SEO_PROVIDER_RESPONSE_PARSE_DIAGNOSTICS = 25;

function getSeoClientResponseSummary(response: {
    keywords?: string[];
    metaDescription?: string;
    metaTitle?: string;
    tagline?: string;
}) {
    return {
        keywordCount: Array.isArray(response.keywords) ? response.keywords.length : 0,
        metaDescriptionLength: response.metaDescription?.length || 0,
        metaTitleLength: response.metaTitle?.length || 0,
        objectKeyCount: Object.keys(response).length,
        responseShape: 'object',
        responseSummaryKind: 'seo_generation',
        taglineLength: response.tagline?.length || 0,
    };
}

type SeoProviderResponseParseStage =
    | 'empty_response'
    | 'object_fragment'
    | 'object_fragment_missing';

type SeoProviderResponseParseContext = {
    action: string;
    categoryCount: number;
    itemCount: number;
    requestId: string;
    responseUsage?: unknown;
    sourceLang: string;
    storeId: unknown;
    tenantId: unknown;
    userId: unknown;
};

type SeoProviderResponseParseFailureContext = SeoProviderResponseParseContext & {
    candidateLength: number;
    hasFence: boolean;
    hasObjectFragment: boolean;
    responseTextLength: number;
    stage: SeoProviderResponseParseStage;
    trimmedTextLength: number;
};

const reportedSeoProviderResponseParseFailures = new Set<string>();

function logSeoProviderResponseParseFailure(
    error: unknown,
    context: SeoProviderResponseParseFailureContext,
): void {
    const failureKey = [
        context.stage,
        context.responseTextLength,
        context.trimmedTextLength,
        context.candidateLength,
        context.hasFence ? 'fenced' : 'plain',
        context.hasObjectFragment ? 'object-fragment' : 'no-object-fragment',
    ].join(':');

    if (reportedSeoProviderResponseParseFailures.has(failureKey)) return;
    if (reportedSeoProviderResponseParseFailures.size >= MAX_SEO_PROVIDER_RESPONSE_PARSE_DIAGNOSTICS) return;
    reportedSeoProviderResponseParseFailures.add(failureKey);

    logRuntimeFailure('seo_provider_response_parse_failed', error, {
        ...getAIRouteLogContext({
            action: context.action,
            categoryCount: context.categoryCount,
            itemCount: context.itemCount,
            model: AI_MODEL,
            requestId: context.requestId,
            responseUsage: context.responseUsage,
            sourceLang: context.sourceLang,
            storeId: context.storeId,
            tenantId: context.tenantId,
            userId: context.userId,
        }),
        candidateLength: context.candidateLength,
        fallbackPolicy: 'return_seo_generation_failed',
        hasFence: context.hasFence,
        hasObjectFragment: context.hasObjectFragment,
        parseStage: context.stage,
        responseTextLength: context.responseTextLength,
        trimmedTextLength: context.trimmedTextLength,
    });
}

function parseSeoProviderResponse(
    responseText: string | undefined,
    context: SeoProviderResponseParseContext,
): Record<string, any> {
    const rawText = String(responseText || '');
    const trimmedText = rawText.trim();
    const hasFence = trimmedText.startsWith('```') || trimmedText.endsWith('```');
    const cleaned = trimmedText
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();

    if (!cleaned) {
        const error = new Error('SEO generation returned empty response');
        logSeoProviderResponseParseFailure(error, {
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
                logSeoProviderResponseParseFailure(fragmentParseError, {
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

        logSeoProviderResponseParseFailure(fullParseError, {
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

export const POST = withAuth(async (request, session) => {
    const userId = session.user.id;
    const action = AI_ACTIONS_TYPES.SEO_AEO_GENERATION;
    const requestId = crypto.randomUUID();

    try {
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        const rateLimitResponse = await checkAIOperationLimit();
        if (rateLimitResponse) return rateLimitResponse;

        const bodyResult = await readBoundedJsonBody(request, SEO_AI_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return bodyResult.response;

        const rawData = bodyResult.data as any;
        const validation = validateAPIInput(SeoGenerationRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            const attemptedData = getAIRouteLogContext({
                categoryCount: Array.isArray(rawData?.menu?.categories) ? rawData.menu.categories.length : 0,
                itemCount: Array.isArray(rawData?.menu?.items) ? rawData.menu.items.length : 0,
                storeName: rawData?.store?.name,
            });
            logger.security('Input Validation Failed', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/seo',
                error: errorMsg,
                attemptedData,
            }, 'medium');
            await writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, attemptedData);
            return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
        }

        const payload = validation.data;
        const sourceLangCode = 'unspecified';
        const permissionError = await requireAnyStorePermission(
            request,
            session,
            [PERMISSIONS.MANAGE_PUBLIC_PRESENCE, PERMISSIONS.MANAGE_STORE],
            "SEO generation",
        );
        if (permissionError) return permissionError;

        logger.info('SEO generation requested', getAIRouteLogContext({
            action,
            categoryCount: payload.menu?.categories?.length || 0,
            itemCount: payload.menu?.items?.length || 0,
            model: AI_MODEL,
            requestId,
            sourceLang: sourceLangCode,
            storeId: session.sId,
            tenantId: session.tId,
            userId,
        }));

        const capacityCheck = await checkAICapacity(session.tId, session.sId, action);
        if (!capacityCheck.allowed) {
            return NextResponse.json({
                error: capacityCheck.reason === 'maintenance'
                    ? 'AI enhancements are temporarily unavailable.'
                    : 'Additional AI enhancements needed for your menu.',
                code: capacityCheck.reason,
            }, { status: 402 });
        }

        const startTime = Date.now();
        const generationConfig = {
            responseMimeType: "application/json" as const,
            temperature: 0.5,
            topP: 0.9,
            topK: 40,
            systemInstruction: seoPromptSystemInstruction,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            ],
        };

        let response;
        try {
            response = await genAIClient.models.generateContent({
                model: AI_MODEL,
                contents: seoPrompt(payload),
                config: generationConfig,
            });
        } catch (generationError) {
            const errorDiagnostics = getAIErrorDiagnostics(generationError);
            const gatewayDiagnostics = getAIGatewayDiagnostics(genAIClient);

            logAIRouteFailure('seo_generation_model_call_failed', generationError, {
                action,
                categoryCount: payload.menu?.categories?.length || 0,
                gatewayDiagnostics,
                itemCount: payload.menu?.items?.length || 0,
                model: AI_MODEL,
                requestId,
                sourceLang: sourceLangCode,
                storeId: session.sId,
                tenantId: session.tId,
            });
            await writeLogEntry({
                logFileName: LOG_FILE,
                userId,
                logType: 'MODEL_CALL_ERROR',
                data: {
                    action,
                    categoryCount: payload.menu?.categories?.length || 0,
                    gatewayDiagnostics,
                    itemCount: payload.menu?.items?.length || 0,
                    model: AI_MODEL,
                    requestId,
                    sourceLang: sourceLangCode,
                    storeId: session.sId,
                    tenantId: session.tId,
                },
                error: errorDiagnostics,
            });
            if (generationError && typeof generationError === 'object') {
                (generationError as Record<string, unknown>).__seoLogged = true;
            }
            throw generationError;
        }

        let generatedData: any;
        try {
            generatedData = parseSeoProviderResponse(response.text, {
                action,
                categoryCount: payload.menu?.categories?.length || 0,
                itemCount: payload.menu?.items?.length || 0,
                requestId,
                responseUsage: response.usageMetadata || null,
                sourceLang: sourceLangCode,
                storeId: session.sId,
                tenantId: session.tId,
                userId,
            });
        } catch (parseError) {
            logAIRouteFailure('seo_generation_invalid_json', parseError, {
                categoryCount: payload.menu?.categories?.length || 0,
                itemCount: payload.menu?.items?.length || 0,
                model: AI_MODEL,
                responseTextLength: response.text?.length || 0,
                requestId,
                responseUsage: response.usageMetadata || null,
                sourceLang: sourceLangCode,
                storeId: session.sId,
                tenantId: session.tId,
            });
            await writeLogEntry({
                logFileName: LOG_FILE,
                userId,
                logType: 'INVALID_JSON_RESPONSE',
                data: {
                    categoryCount: payload.menu?.categories?.length || 0,
                    itemCount: payload.menu?.items?.length || 0,
                    model: AI_MODEL,
                    responseTextLength: response.text?.length || 0,
                    requestId,
                    responseUsage: response.usageMetadata || null,
                    sourceLang: sourceLangCode,
                    storeId: session.sId,
                    tenantId: session.tId,
                },
                error: parseError,
            });
            return NextResponse.json({ error: 'SEO generation failed' }, { status: 500 });
        }

        if (!generatedData || typeof generatedData !== 'object' || Array.isArray(generatedData)) {
            logAIRouteFailure('seo_generation_non_object_response', undefined, {
                isArray: Array.isArray(generatedData),
                model: AI_MODEL,
                requestId,
                responseType: typeof generatedData,
                sourceLang: sourceLangCode,
                storeId: session.sId,
                tenantId: session.tId,
            });
            await writeLogEntry({
                logFileName: LOG_FILE,
                userId,
                logType: 'NON_OBJECT_RESPONSE',
                data: {
                    isArray: Array.isArray(generatedData),
                    model: AI_MODEL,
                    requestId,
                    responseType: typeof generatedData,
                    sourceLang: sourceLangCode,
                    storeId: session.sId,
                    tenantId: session.tId,
                },
            });
            return NextResponse.json({ error: 'SEO generation failed' }, { status: 500 });
        }

        const cleaned = {
            metaTitle: String(generatedData.metaTitle || '').trim().slice(0, 60),
            metaDescription: String(generatedData.metaDescription || '').trim().slice(0, 160),
            tagline: String(generatedData.tagline || '').trim().slice(0, 100),
            keywords: Array.isArray(generatedData.keywords)
                ? generatedData.keywords.map((value: unknown) => String(value || '').trim()).filter(Boolean).slice(0, 10)
                : [],
        };

        const processingTime = Date.now() - startTime;
        const transactionObject: any = {
            action,
            chargePerCredit: CHARGE_PER_CREDIT,
            clientResponse: getSeoClientResponseSummary(cleaned),
            generationConfig,
            geminiResponse: response,
            itemsList: [],
            model: AI_MODEL,
            processingTime,
            promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
            candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
            totalTokenCount: response.usageMetadata?.totalTokenCount || 0,
            tokenPerCredit: TOKENS_PER_CREDIT,
            totalCredits: ((response.usageMetadata?.totalTokenCount || 0) / TOKENS_PER_CREDIT),
            totalCharge: CHARGE_PER_CREDIT * ((response.usageMetadata?.totalTokenCount || 0) / TOKENS_PER_CREDIT),
            realCostPaise: getRealCostPaise(action),
            ourChargePaise: getOurChargePaise(action),
            marginPaise: getOurChargePaise(action) - getRealCostPaise(action),
            unitsConsumed: getUnitCost(action),
        };
        const getTransactionLogSummary = () => ({
            action: transactionObject.action,
            candidatesTokenCount: transactionObject.candidatesTokenCount,
            model: transactionObject.model,
            processingTime: transactionObject.processingTime,
            promptTokenCount: transactionObject.promptTokenCount,
            responseSummary: {
                keywordCount: cleaned.keywords.length,
                metaDescriptionLength: cleaned.metaDescription.length,
                metaTitleLength: cleaned.metaTitle.length,
                taglineLength: cleaned.tagline.length,
            },
            totalCharge: transactionObject.totalCharge,
            totalCredits: transactionObject.totalCredits,
            totalTokenCount: transactionObject.totalTokenCount,
            transactionId: transactionObject.transactionId,
            unitsConsumed: transactionObject.unitsConsumed,
        });

        let remainingBalance = null;
        try {
            const accounting = await finalizeAiOperationAccounting({
                capacitySubscription: capacityCheck.subscription,
                context: { userId, requestId, action, storeId: session.sId, tenantId: session.tId },
                input: transactionObject,
                logLabel: 'SEO generation',
                session,
            });
            transactionObject.unitsConsumed = accounting.unitsConsumed;
            transactionObject.transactionId = accounting.transactionId;
            remainingBalance = accounting.remainingBalance;
        } catch (transactionError) {
            logAIRouteFailure('seo_generation_accounting_failed', transactionError, {
                action,
                model: AI_MODEL,
                requestId,
                storeId: session.sId,
                tenantId: session.tId,
                userId,
            });
            await writeLogEntry({ logFileName: LOG_FILE, userId, logType: 'TRANSACTION_DB_ERROR', data: getTransactionLogSummary(), error: getAIErrorDiagnostics(transactionError) });
            throw transactionError;
        }

        logger.info('SEO generation completed', getAIRouteLogContext({
            action,
            keywordCount: cleaned.keywords.length,
            metaDescriptionLength: cleaned.metaDescription.length,
            metaTitleLength: cleaned.metaTitle.length,
            requestId,
            sourceLang: sourceLangCode,
            storeId: session.sId,
            taglineLength: cleaned.tagline.length,
            tenantId: session.tId,
            transactionId: transactionObject.transactionId,
            userId,
        }));

        return NextResponse.json({
            data: cleaned,
            message: "",
            transaction: {
                totalCharge: transactionObject.totalCharge,
                totalCredits: transactionObject.totalCredits,
                processingTime: transactionObject.processingTime,
                transactionId: transactionObject.transactionId,
            },
            remainingBalance,
        }, { status: 200 });
    } catch (error) {
        if (!(error && typeof error === 'object' && '__seoLogged' in error)) {
            logAIRouteFailure('seo_generation_api_failed', error, {
                action,
                gatewayDiagnostics: getAIGatewayDiagnostics(genAIClient),
                model: AI_MODEL,
                requestId,
                storeId: session.sId,
                tenantId: session.tId,
                userId,
            });
        }
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json({ error: 'SEO generation failed' }, { status: 500 });
    }
});

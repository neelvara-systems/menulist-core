export const dynamic = 'force-dynamic';

import { getModelName } from "@constant/AI/models";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { PERMISSIONS } from "@constant/permissions";
import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { finalizeAiOperationAccounting } from "@lib/ai/accounting";
import { checkAICapacity } from "@lib/ai/capacityCheck";
import { getAIGatewayDiagnostics, getAIErrorDiagnostics, getPreviewText, getAIRouteLogContext, getAIRouteSecurityContext, logAIRouteFailure } from "@lib/google/genAi/diagnostics";
import { genAIClient } from "@lib/google/genAi";
import { logger } from "@lib/monitoring/logger";
import { requireAnyStorePermission } from "@lib/permissions/server";
import { checkAIOperationLimit } from "@lib/rateLimit/helpers";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { BusinessCopyGenerationRequestSchema } from "@lib/validation/apiSchemas";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { withAuth } from "../../../middleware/auth";
import businessCopyPrompt, { businessCopyPromptSystemInstruction } from "./prompt";

const AI_MODEL = getModelName('DESCRIPTION_GENERATION');
const LOG_FILE = "business-copy-generation.log";
const BUSINESS_COPY_AI_MAX_BODY_BYTES = 256 * 1024;
const GENERATION_CONFIG = {
    responseMimeType: "application/json" as const,
    temperature: 0.55,
    topP: 0.9,
    topK: 40,
    systemInstruction: businessCopyPromptSystemInstruction,
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
};

export const POST = withAuth(async (request, session) => {
    const userId = session.user.id;
    const action = AI_ACTIONS_TYPES.BUSINESS_COPY_GENERATION;
    const requestId = crypto.randomUUID();

    try {
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        const rateLimitResponse = await checkAIOperationLimit();
        if (rateLimitResponse) return rateLimitResponse;

        const bodyResult = await readBoundedJsonBody(request, BUSINESS_COPY_AI_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return bodyResult.response;

        const rawData = bodyResult.data as any;
        const validation = validateAPIInput(BusinessCopyGenerationRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            const attemptedData = getAIRouteLogContext({
                categoryCount: Array.isArray(rawData?.menu?.categories) ? rawData.menu.categories.length : 0,
                itemCount: Array.isArray(rawData?.menu?.items) ? rawData.menu.items.length : 0,
                sourceLang: rawData?.sourceLang?.code || rawData?.sourceLang,
                storeName: rawData?.store?.name,
            });
            logger.security('Input Validation Failed', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/business-copy',
                error: errorMsg,
                attemptedData,
            }, 'medium');
            await writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, attemptedData);
            return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
        }

        const payload = validation.data;
        const permissionError = await requireAnyStorePermission(
            request,
            session,
            [PERMISSIONS.MANAGE_PUBLIC_PRESENCE, PERMISSIONS.MANAGE_STORE],
            "Business copy generation",
        );
        if (permissionError) return permissionError;

        logger.info('Business copy generation requested', getAIRouteLogContext({
            categoryCount: payload.menu?.categories?.length || 0,
            itemCount: payload.menu?.items?.length || 0,
            model: AI_MODEL,
            requestId,
            sourceLang: payload.sourceLang?.code || 'unspecified',
            storeId: session.sId,
            storeName: payload.store?.name,
            tenantId: session.tId,
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
        let response;
        try {
            response = await genAIClient.models.generateContent({
                model: AI_MODEL,
                contents: businessCopyPrompt(payload),
                config: GENERATION_CONFIG,
            });
        } catch (generationError) {
            const errorDiagnostics = getAIErrorDiagnostics(generationError);
            const gatewayDiagnostics = getAIGatewayDiagnostics(genAIClient);

            logAIRouteFailure('business_copy_generation_model_call_failed', generationError, {
                action,
                categoryCount: payload.menu?.categories?.length || 0,
                gatewayDiagnostics,
                itemCount: payload.menu?.items?.length || 0,
                model: AI_MODEL,
                requestId,
                sourceLang: payload.sourceLang?.code || 'unspecified',
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
                    sourceLang: payload.sourceLang?.code || 'unspecified',
                    storeId: session.sId,
                    tenantId: session.tId,
                },
                error: errorDiagnostics,
            });
            if (generationError && typeof generationError === 'object') {
                (generationError as Record<string, unknown>).__businessCopyLogged = true;
            }
            throw generationError;
        }

        let generatedData: any;
        let parsedRawText = getResponseText(response);
        try {
            generatedData = parseJsonLikeResponse(parsedRawText);
        } catch (parseError) {
            logger.warn('Business copy generation returned invalid JSON, retrying once', getAIRouteLogContext({
                model: AI_MODEL,
                responseTextLength: parsedRawText.length,
                responseTextSummary: getPreviewText(parsedRawText, 400),
                requestId,
                responseUsage: response.usageMetadata || null,
                sourceLang: payload.sourceLang?.code || 'unspecified',
                storeId: session.sId,
                tenantId: session.tId,
                userId,
            }));

            const retryResponse = await genAIClient.models.generateContent({
                model: AI_MODEL,
                contents: `${businessCopyPrompt(payload)}\n\nReturn valid JSON only. Do not add markdown, commentary, or code fences.`,
                config: GENERATION_CONFIG,
            });
            parsedRawText = getResponseText(retryResponse);

            try {
                generatedData = parseJsonLikeResponse(parsedRawText);
                response = retryResponse;
            } catch (retryParseError) {
                logAIRouteFailure('business_copy_generation_invalid_json_after_retry', retryParseError, {
                    model: AI_MODEL,
                    responseTextLength: parsedRawText.length,
                    responseTextSummary: getPreviewText(parsedRawText, 400),
                    requestId,
                    responseUsage: retryResponse.usageMetadata || null,
                    sourceLang: payload.sourceLang?.code || 'unspecified',
                    storeId: session.sId,
                    tenantId: session.tId,
                });
                await writeLogEntry({
                    logFileName: LOG_FILE,
                    userId,
                    logType: 'INVALID_JSON_RESPONSE',
                    data: {
                        model: AI_MODEL,
                        responseTextLength: parsedRawText.length,
                        responseTextSummary: getPreviewText(parsedRawText, 400),
                        requestId,
                        responseUsage: retryResponse.usageMetadata || null,
                        sourceLang: payload.sourceLang?.code || 'unspecified',
                        storeId: session.sId,
                        tenantId: session.tId,
                    },
                    error: retryParseError,
                });
                return NextResponse.json({ error: 'Business copy generation failed' }, { status: 500 });
            }
        }

        if (!generatedData || typeof generatedData !== 'object' || Array.isArray(generatedData)) {
            logAIRouteFailure('business_copy_generation_non_object_response', undefined, {
                isArray: Array.isArray(generatedData),
                model: AI_MODEL,
                requestId,
                responseType: typeof generatedData,
                sourceLang: payload.sourceLang?.code || 'unspecified',
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
                    sourceLang: payload.sourceLang?.code || 'unspecified',
                    storeId: session.sId,
                    tenantId: session.tId,
                },
            });
            return NextResponse.json({ error: 'Business copy generation failed' }, { status: 500 });
        }

        const cleaned = {
            descriptor: String(generatedData.descriptor || '').trim().slice(0, 40),
            knownFor: String(generatedData.knownFor || '').trim().slice(0, 40),
            tagline: String(generatedData.tagline || '').trim().slice(0, 100),
            metaTitle: String(generatedData.metaTitle || '').trim().slice(0, 60),
            metaDescription: String(generatedData.metaDescription || '').trim().slice(0, 160),
            keywords: Array.isArray(generatedData.keywords)
                ? generatedData.keywords.map((value: unknown) => String(value || '').trim()).filter(Boolean).slice(0, 10)
                : [],
            pwaShortName: String(generatedData.pwaShortName || '').trim().slice(0, 12),
        };

        const processingTime = Date.now() - startTime;
        const transactionObject: any = {
            action,
            chargePerCredit: CHARGE_PER_CREDIT,
            clientResponse: cleaned,
            generationConfig: { temperature: 0.55, topP: 0.9, topK: 40, responseMimeType: 'application/json' },
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

        let remainingBalance = null;
        try {
            const accounting = await finalizeAiOperationAccounting({
                capacitySubscription: capacityCheck.subscription,
                context: { userId, requestId, action, storeId: session.sId, tenantId: session.tId },
                input: transactionObject,
                logLabel: 'Business copy generation',
                session,
            });
            transactionObject.unitsConsumed = accounting.unitsConsumed;
            transactionObject.transactionId = accounting.transactionId;
            remainingBalance = accounting.remainingBalance;
        } catch (transactionError) {
            logAIRouteFailure('business_copy_generation_accounting_failed', transactionError, {
                action,
                model: AI_MODEL,
                requestId,
                storeId: session.sId,
                tenantId: session.tId,
                userId,
            });
            await writeLogEntry({ logFileName: LOG_FILE, userId, logType: 'TRANSACTION_DB_ERROR', data: transactionObject, error: transactionError });
            throw transactionError;
        }

        logger.info('Business copy generation completed', getAIRouteLogContext({
            action,
            descriptorLength: cleaned.descriptor.length,
            keywordCount: cleaned.keywords.length,
            metaDescriptionLength: cleaned.metaDescription.length,
            metaTitleLength: cleaned.metaTitle.length,
            pwaShortNameLength: cleaned.pwaShortName.length,
            requestId,
            sourceLang: payload.sourceLang?.code || 'unspecified',
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
        if (!(error && typeof error === 'object' && '__businessCopyLogged' in error)) {
            logAIRouteFailure('business_copy_generation_api_failed', error, {
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
        return NextResponse.json({ error: 'Business copy generation failed' }, { status: 500 });
    }
});

function getResponseText(response: any) {
    return String(
        response?.text
        || response?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('')
        || '',
    ).trim();
}

function parseJsonLikeResponse(rawText: string) {
    const cleaned = rawText
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();

    if (!cleaned) {
        throw new Error('Empty AI response');
    }

    try {
        return JSON.parse(cleaned);
    } catch {
        const firstBrace = cleaned.indexOf('{');
        const lastBrace = cleaned.lastIndexOf('}');
        if (firstBrace >= 0 && lastBrace > firstBrace) {
            return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
        }
        throw new Error('Invalid JSON response');
    }
}

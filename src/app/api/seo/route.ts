export const dynamic = 'force-dynamic';

import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { addAiOperation } from "@database/aiOperations";
import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { checkAICapacity, consumeAICapacity } from "@lib/ai/capacityCheck";
import { getModelName } from "@constant/AI/models";
import { getAIGatewayDiagnostics, getAIErrorDiagnostics, getPreviewText } from "@lib/google/genAi/diagnostics";
import { genAIClient } from "@lib/google/genAi";
import { logger } from "@lib/monitoring/logger";
import { checkAIOperationLimit } from "@lib/rateLimit/helpers";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { SeoGenerationRequestSchema } from "@lib/validation/apiSchemas";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { withAuth } from "../../../middleware/auth";
import seoPrompt, { seoPromptSystemInstruction } from "./prompt";

const AI_MODEL = getModelName('DESCRIPTION_GENERATION');
const LOG_FILE = "seo-generation.log";

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

        const rawData = await request.json();
        const validation = validateAPIInput(SeoGenerationRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/seo',
                error: errorMsg,
            }, 'medium');
            await writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, rawData);
            return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
        }

        const payload = validation.data;
        const sourceLangCode = 'unspecified';

        logger.info('SEO generation requested', {
            action,
            categoryCount: payload.menu?.categories?.length || 0,
            itemCount: payload.menu?.items?.length || 0,
            model: AI_MODEL,
            requestId,
            sourceLang: sourceLangCode,
            storeId: session.sId,
            tenantId: session.tId,
            userId,
        });

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

            logger.error('SEO generation model call failed', generationError, {
                ...errorDiagnostics,
                action,
                categoryCount: payload.menu?.categories?.length || 0,
                gatewayDiagnostics,
                itemCount: payload.menu?.items?.length || 0,
                model: AI_MODEL,
                requestId,
                sourceLang: sourceLangCode,
                storeId: session.sId,
                tenantId: session.tId,
                userId,
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

        let rawText = response.text || '';
        rawText = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        let generatedData: any;
        try {
            generatedData = JSON.parse(rawText);
        } catch (parseError) {
            logger.error('SEO generation returned invalid JSON', parseError, {
                model: AI_MODEL,
                rawTextLength: rawText.length,
                rawTextPreview: getPreviewText(rawText, 300),
                requestId,
                responseUsage: response.usageMetadata || null,
                sourceLang: sourceLangCode,
                storeId: session.sId,
                tenantId: session.tId,
                userId,
            });
            await writeLogEntry({
                logFileName: LOG_FILE,
                userId,
                logType: 'INVALID_JSON_RESPONSE',
                data: {
                    model: AI_MODEL,
                    rawTextLength: rawText.length,
                    rawTextPreview: getPreviewText(rawText, 300),
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
            logger.error('SEO generation returned non-object response', null, {
                isArray: Array.isArray(generatedData),
                model: AI_MODEL,
                requestId,
                responseType: typeof generatedData,
                sourceLang: sourceLangCode,
                storeId: session.sId,
                tenantId: session.tId,
                userId,
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
            clientResponse: cleaned,
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

        let remainingBalance = null;
        try {
            transactionObject.transactionId = await addAiOperation(transactionObject);
            if (capacityCheck.subscription && transactionObject.unitsConsumed > 0) {
                remainingBalance = await consumeAICapacity(capacityCheck.subscription, transactionObject.unitsConsumed);
            }
        } catch (transactionError) {
            logger.error('Failed to record SEO generation transaction', transactionError, { userId });
            await writeLogEntry({ logFileName: LOG_FILE, userId, logType: 'TRANSACTION_DB_ERROR', data: transactionObject, error: transactionError });
        }

        logger.info('SEO generation completed', {
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
        });

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
            logger.error('SEO generation API error', error, {
                action,
                gatewayDiagnostics: getAIGatewayDiagnostics(genAIClient),
                model: AI_MODEL,
                requestId,
                ...getAIErrorDiagnostics(error),
                storeId: session.sId,
                tenantId: session.tId,
                userId,
            });
        }
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json({ error: 'SEO generation failed' }, { status: 500 });
    }
});

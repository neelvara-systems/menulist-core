export const dynamic = 'force-dynamic';
import { AI_BLOCKED_METADATA_FIELDS } from "@config/itemMetadataConfig";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { addAiOperation } from "@database/aiOperations";
import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { checkAICapacity, consumeAICapacity } from "@lib/ai/capacityCheck";
import { getAIGatewayDiagnostics, getAIErrorDiagnostics, getPreviewText } from "@lib/google/genAi/diagnostics";
import { genAIClient } from "@lib/google/genAi";
import { logger } from "@lib/monitoring/logger";
import { checkAIOperationLimit } from "@lib/rateLimit/helpers";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { NewItemMetadataRequestSchema } from "@lib/validation/apiSchemas";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { withAuth } from "../../../middleware/auth";
import getMultilingualNewItemPrompt from "./prompt";

const AI_MODEL = "gemini-2.5-flash";
const LOG_FILE = "new-item-metadata.log";
const action = AI_ACTIONS_TYPES.NEW_ITEM_METADATA;

function stripForbiddenGeneratedMetadata<T extends Record<string, unknown>>(generatedData: T): T {
    const sanitized = { ...generatedData };
    for (const field of AI_BLOCKED_METADATA_FIELDS) {
        delete sanitized[field];
    }
    if (sanitized.decisionFacts && typeof sanitized.decisionFacts === 'object' && !Array.isArray(sanitized.decisionFacts)) {
        const decisionFacts = { ...(sanitized.decisionFacts as Record<string, unknown>) };
        for (const field of AI_BLOCKED_METADATA_FIELDS) {
            delete decisionFacts[field];
        }
        (sanitized as Record<string, unknown>).decisionFacts = Object.keys(decisionFacts).length > 0 ? decisionFacts : undefined;
    }
    return sanitized;
}

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;
    const requestId = crypto.randomUUID();

    try {
        // 🛡️ SAFE_MODE: Block expensive AI operations during system maintenance
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        // 🔒 RATE LIMITING: Prevent API abuse
        const rateLimitResponse = await checkAIOperationLimit();
        if (rateLimitResponse) return rateLimitResponse;

        // 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const rawData = await request.json();
        const validation = validateAPIInput(NewItemMetadataRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            // Log to Sentry (potential attack attempt)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/new-item-metadata',
                error: errorMsg,
                attemptedData: {
                    item: typeof rawData?.item === 'string'
                        ? rawData.item.substring(0, 50)
                        : rawData?.item?.name?.substring?.(0, 50) || '[object]',
                    targetLang: rawData?.targetLang,
                    sourceLang: rawData?.sourceLang,
                    contentLength: rawData?.contentLength,
                },
            }, 'medium');

            await writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, rawData);
            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const validated = validation.data;
        // Use raw data for complex types that schemas can't fully validate
        const item = rawData.item;
        const targetLang = rawData.targetLang;
        const sourceLang = rawData.sourceLang;
        const { projectId, fileId, contentLength, businessType, tone } = validated;
        const targetLangCodes = Array.isArray(targetLang)
            ? targetLang.map((language: { code?: string }) => language?.code || 'unspecified')
            : [targetLang?.code || 'unspecified'];

        logger.info('New item metadata requested', {
            businessType: businessType || 'unspecified',
            contentLength,
            fileId,
            model: AI_MODEL,
            projectId,
            requestId,
            sourceLang: sourceLang?.code || 'unspecified',
            storeId: session.sId,
            targetLangs: targetLangCodes,
            tenantId: session.tId,
            tone: tone || 'Professional',
            userId,
        });

        // 🔋 AI CAPACITY CHECK: Verify store has sufficient capacity
        const capacityCheck = await checkAICapacity(
            session.tId,
            session.sId,
            action,
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
        // Temperature settings - Standard/Detailed only
        let temperature = 0.8; // Default (Standard)
        let topP = 0.9; // Default (Standard)

        if (contentLength === "Detailed") {
            temperature = 0.9;
            topP = 0.92;
        }

        const prompt = getMultilingualNewItemPrompt({ item, targetLang, sourceLang, businessType, tone });
        const generationConfig = {
            responseMimeType: "application/json",
            temperature,
            topP,
            topK: 40,
            // maxOutputTokens: 8192,
            safetySettings: [{
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            }]
        };

        let response;
        try {
            response = await genAIClient.models.generateContent({
                model: AI_MODEL,
                contents: prompt,
                config: generationConfig,
            });
        } catch (generationError) {
            const errorDiagnostics = getAIErrorDiagnostics(generationError);
            const gatewayDiagnostics = getAIGatewayDiagnostics(genAIClient);

            logger.error('New item metadata model call failed', generationError, {
                ...errorDiagnostics,
                businessType: businessType || 'unspecified',
                contentLength,
                gatewayDiagnostics,
                model: AI_MODEL,
                projectId,
                requestId,
                sourceLang: sourceLang?.code || 'unspecified',
                storeId: session.sId,
                targetLangs: targetLangCodes,
                tenantId: session.tId,
                tone: tone || 'Professional',
                userId,
            });
            await writeLogEntry({
                logFileName: LOG_FILE,
                userId,
                projectId,
                fileId,
                logType: 'MODEL_CALL_ERROR',
                data: {
                    businessType: businessType || 'unspecified',
                    contentLength,
                    gatewayDiagnostics,
                    model: AI_MODEL,
                    projectId,
                    requestId,
                    sourceLang: sourceLang?.code || 'unspecified',
                    storeId: session.sId,
                    targetLangs: targetLangCodes,
                    tenantId: session.tId,
                    tone: tone || 'Professional',
                },
                error: errorDiagnostics,
            });
            if (generationError && typeof generationError === 'object') {
                (generationError as Record<string, unknown>).__newItemMetadataLogged = true;
            }
            throw generationError;
        }
        await writeLogEntry({ logFileName: LOG_FILE, userId, projectId, fileId, logType: 'API_RESPONSE', data: response });

        const endTime = new Date().getTime();
        const processingTime = endTime - startTime;

        let generatedData: any;
        try {
            const rawText = String(response.text || '').replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
            generatedData = JSON.parse(rawText);
        } catch (parseError) {
            const rawText = String(response.text || '').trim();
            logger.error('New item metadata returned invalid JSON', parseError, {
                model: AI_MODEL,
                projectId,
                rawTextLength: rawText.length,
                rawTextPreview: getPreviewText(rawText, 300),
                requestId,
                responseUsage: response.usageMetadata || null,
                sourceLang: sourceLang?.code || 'unspecified',
                storeId: session.sId,
                targetLangs: targetLangCodes,
                tenantId: session.tId,
                userId,
            });
            await writeLogEntry({
                logFileName: LOG_FILE,
                userId,
                projectId,
                fileId,
                logType: 'INVALID_JSON_RESPONSE',
                data: {
                    model: AI_MODEL,
                    rawTextLength: rawText.length,
                    rawTextPreview: getPreviewText(rawText, 300),
                    requestId,
                    responseUsage: response.usageMetadata || null,
                    sourceLang: sourceLang?.code || 'unspecified',
                    storeId: session.sId,
                    targetLangs: targetLangCodes,
                    tenantId: session.tId,
                },
                error: parseError,
            });
            return NextResponse.json({ error: 'Metadata generation failed' }, { status: 500 });
        }

        if (!generatedData || typeof generatedData !== 'object' || Array.isArray(generatedData)) {
            logger.error('New item metadata returned non-object response', null, {
                isArray: Array.isArray(generatedData),
                model: AI_MODEL,
                projectId,
                requestId,
                responseType: typeof generatedData,
                sourceLang: sourceLang?.code || 'unspecified',
                storeId: session.sId,
                targetLangs: targetLangCodes,
                tenantId: session.tId,
                userId,
            });
            await writeLogEntry({
                logFileName: LOG_FILE,
                userId,
                projectId,
                fileId,
                logType: 'NON_OBJECT_RESPONSE',
                data: {
                    isArray: Array.isArray(generatedData),
                    model: AI_MODEL,
                    requestId,
                    responseType: typeof generatedData,
                    sourceLang: sourceLang?.code || 'unspecified',
                    storeId: session.sId,
                    targetLangs: targetLangCodes,
                    tenantId: session.tId,
                },
            });
            return NextResponse.json({ error: 'Metadata generation failed' }, { status: 500 });
        }
        generatedData = stripForbiddenGeneratedMetadata(generatedData);

        let transactionObject = {
            transactionId: null,
            contentLength,
            item,
            targetLang,
            sourceLang,
            projectId,
            fileId,
            action,
            unitsConsumed: 0,
            clientResponse: generatedData,
            geminiResponse: response,
            generationConfig,
            model: AI_MODEL,
            promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
            candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
            totalTokenCount: response.usageMetadata?.totalTokenCount || 0,
            processingTime, // in ms
            tokenPerCredit: TOKENS_PER_CREDIT,
            chargePerCredit: CHARGE_PER_CREDIT,
            totalCredits: ((response.usageMetadata?.totalTokenCount || 0) / TOKENS_PER_CREDIT),
            totalCharge: CHARGE_PER_CREDIT * ((response.usageMetadata?.totalTokenCount || 0) / TOKENS_PER_CREDIT), // in paise
            // Deep tracking: real Google cost vs our charge vs margin (all in paise)
            realCostPaise: getRealCostPaise(action),
            ourChargePaise: getOurChargePaise(action),
            marginPaise: getOurChargePaise(action) - getRealCostPaise(action),
        };

        let remainingBalance = null;
        try {
            transactionObject.unitsConsumed = getUnitCost(transactionObject.action);
            transactionObject.transactionId = await addAiOperation(transactionObject);
            // Consume capacity after successful operation
            if (capacityCheck.subscription && transactionObject.unitsConsumed > 0) {
                remainingBalance = await consumeAICapacity(capacityCheck.subscription, transactionObject.unitsConsumed);
            }
        } catch (transactionError) {
            logger.error('Failed to record new item metadata transaction', transactionError, { userId, projectId, fileId });
            await writeLogEntry({ logFileName: LOG_FILE, userId, projectId, fileId, logType: 'TRANSACTION_DB_ERROR', data: transactionObject, error: transactionError });
        }

        await writeLogEntry({
            logFileName: LOG_FILE, userId, projectId, fileId, logType: 'SUCCESS_RESPONSE',
            data: {
                action,
                request: { item, targetLang, sourceLang, contentLength },
                response: generatedData,
                transaction: transactionObject,
            }
        });

        logger.info('New item metadata completed', {
            businessType: businessType || 'unspecified',
            contentLength,
            fileId,
            projectId,
            requestId,
            sourceLang: sourceLang?.code || 'unspecified',
            storeId: session.sId,
            targetLangs: targetLangCodes,
            tenantId: session.tId,
            transactionId: transactionObject.transactionId,
            userId,
        });

        return NextResponse.json({
            data: generatedData,
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
        if (!(error && typeof error === 'object' && '__newItemMetadataLogged' in error)) {
            logger.error('New item metadata API error', error, {
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
        return NextResponse.json({ error: 'Metadata generation failed' }, { status: 500 });
    }
});

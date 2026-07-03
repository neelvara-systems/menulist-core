export const dynamic = 'force-dynamic';
import { AI_BLOCKED_METADATA_FIELDS } from "@config/itemMetadataConfig";
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
import { NewItemMetadataRequestSchema } from "@lib/validation/apiSchemas";
import type { LanguageType, NewItemMetadataItem } from "@template/main-app/projects/types";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { withAuth } from "../../../middleware/auth";
import getMultilingualNewItemPrompt from "./prompt";

const AI_MODEL = getModelName('NEW_ITEM_METADATA');
const LOG_FILE = "new-item-metadata.log";
const action = AI_ACTIONS_TYPES.NEW_ITEM_METADATA;
const NEW_ITEM_METADATA_AI_MAX_BODY_BYTES = 256 * 1024;

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

function toPromptLanguage(language: {
    code?: string;
    direction?: 'ltr' | 'rtl';
    name?: string;
    nativeName?: string;
}): LanguageType {
    return {
        code: language.code || 'und',
        direction: language.direction,
        name: language.name || language.code || 'Unknown',
        nativeName: language.nativeName,
    };
}

function toPromptItem(item: {
    attributes?: Array<{
        id?: string;
        name?: string;
        price?: number | string;
    }>;
    category?: string;
    description?: string;
    id?: string;
    name?: string;
}): NewItemMetadataItem {
    return {
        attributes: item.attributes?.map((attribute) => ({
            id: attribute.id || '',
            name: attribute.name || '',
            price: attribute.price === undefined ? undefined : String(attribute.price),
        })),
        category: item.category || '',
        description: item.description,
        id: item.id || '',
        name: item.name || '',
    };
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
        const bodyResult = await readBoundedJsonBody(request, NEW_ITEM_METADATA_AI_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return bodyResult.response;

        const rawData = bodyResult.data as any;
        const validation = validateAPIInput(NewItemMetadataRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            const attemptedData = getAIRouteLogContext({
                contentLength: rawData?.contentLength,
                itemCount: rawData?.item ? 1 : 0,
                sourceLang: rawData?.sourceLang?.code || rawData?.sourceLang,
                targetLang: rawData?.targetLang?.code || rawData?.targetLang,
            });

            // Log to Sentry (potential attack attempt)
            logger.security('Input Validation Failed', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/new-item-metadata',
                error: errorMsg,
                attemptedData,
            }, 'medium');

            await writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, attemptedData);
            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const validated = validation.data;
        const { item, targetLang, sourceLang, projectId, fileId, contentLength, businessType, tone } = validated;
        const promptItem = toPromptItem(item);
        const promptTargetLang = targetLang.map(toPromptLanguage);
        const promptSourceLang = toPromptLanguage(sourceLang);
        const targetLangCodes = promptTargetLang.map((language) => language.code || 'unspecified');

        const permissionError = await requireAnyStorePermission(
            request,
            session,
            [PERMISSIONS.GENERATE_DESCRIPTIONS],
            "New item metadata",
        );
        if (permissionError) return permissionError;

        logger.info('New item metadata requested', getAIRouteLogContext({
            businessType: businessType || 'unspecified',
            contentLength,
            fileId,
            model: AI_MODEL,
            projectId,
            requestId,
            sourceLang: promptSourceLang.code || 'unspecified',
            storeId: session.sId,
            targetLangs: targetLangCodes,
            tenantId: session.tId,
            tone: tone || 'Professional',
            userId,
        }));

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

        const prompt = getMultilingualNewItemPrompt({
            businessType: businessType || 'unspecified',
            item: promptItem,
            sourceLang: promptSourceLang,
            targetLang: promptTargetLang,
            tone,
        });
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

            logAIRouteFailure('new_item_metadata_model_call_failed', generationError, {
                businessType: businessType || 'unspecified',
                contentLength,
                gatewayDiagnostics,
                model: AI_MODEL,
                projectId,
                requestId,
                sourceLang: promptSourceLang.code || 'unspecified',
                storeId: session.sId,
                targetLangs: targetLangCodes,
                tenantId: session.tId,
                tone: tone || 'Professional',
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
                    sourceLang: promptSourceLang.code || 'unspecified',
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
            logAIRouteFailure('new_item_metadata_invalid_json', parseError, {
                model: AI_MODEL,
                projectId,
                responseTextLength: rawText.length,
                responseTextSummary: getPreviewText(rawText, 300),
                requestId,
                responseUsage: response.usageMetadata || null,
                sourceLang: promptSourceLang.code || 'unspecified',
                storeId: session.sId,
                targetLangs: targetLangCodes,
                tenantId: session.tId,
            });
            await writeLogEntry({
                logFileName: LOG_FILE,
                userId,
                projectId,
                fileId,
                logType: 'INVALID_JSON_RESPONSE',
                data: {
                    model: AI_MODEL,
                    responseTextLength: rawText.length,
                    responseTextSummary: getPreviewText(rawText, 300),
                    requestId,
                    responseUsage: response.usageMetadata || null,
                    sourceLang: promptSourceLang.code || 'unspecified',
                    storeId: session.sId,
                    targetLangs: targetLangCodes,
                    tenantId: session.tId,
                },
                error: parseError,
            });
            return NextResponse.json({ error: 'Metadata generation failed' }, { status: 500 });
        }

        if (!generatedData || typeof generatedData !== 'object' || Array.isArray(generatedData)) {
            logAIRouteFailure('new_item_metadata_non_object_response', undefined, {
                isArray: Array.isArray(generatedData),
                model: AI_MODEL,
                projectId,
                requestId,
                responseType: typeof generatedData,
                sourceLang: promptSourceLang.code || 'unspecified',
                storeId: session.sId,
                targetLangs: targetLangCodes,
                tenantId: session.tId,
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
                    sourceLang: promptSourceLang.code || 'unspecified',
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
            const accounting = await finalizeAiOperationAccounting({
                capacitySubscription: capacityCheck.subscription,
                context: { userId, projectId, fileId, requestId, action },
                input: transactionObject,
                logLabel: 'New item metadata',
                session,
            });
            transactionObject.unitsConsumed = accounting.unitsConsumed;
            transactionObject.transactionId = accounting.transactionId;
            remainingBalance = accounting.remainingBalance;
        } catch (transactionError) {
            logAIRouteFailure('new_item_metadata_accounting_failed', transactionError, {
                action,
                fileId,
                model: AI_MODEL,
                projectId,
                requestId,
                storeId: session.sId,
                tenantId: session.tId,
                userId,
            });
            await writeLogEntry({ logFileName: LOG_FILE, userId, projectId, fileId, logType: 'TRANSACTION_DB_ERROR', data: transactionObject, error: transactionError });
            throw transactionError;
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

        logger.info('New item metadata completed', getAIRouteLogContext({
            action,
            businessType: businessType || 'unspecified',
            contentLength,
            fileId,
            projectId,
            requestId,
            sourceLang: promptSourceLang.code || 'unspecified',
            storeId: session.sId,
            targetLangs: targetLangCodes,
            tenantId: session.tId,
            transactionId: transactionObject.transactionId,
            userId,
        }));

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
            logAIRouteFailure('new_item_metadata_api_failed', error, {
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
        return NextResponse.json({ error: 'Metadata generation failed' }, { status: 500 });
    }
});

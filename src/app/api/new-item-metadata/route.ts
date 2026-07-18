export const dynamic = 'force-dynamic';
import { getModelName } from "@constant/AI/models";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { PERMISSIONS } from "@constant/permissions";
import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { finalizeAiOperationAccounting } from "@lib/ai/accounting";
import { checkAICapacity } from "@lib/ai/capacityCheck";
import {
    createNewItemMetadataProviderAliases,
    normalizeNewItemMetadataOutput,
    restoreNewItemMetadataProviderAttributeIds,
} from "@lib/ai/newItemMetadataOutput";
import { getAIGatewayDiagnostics, getAIErrorDiagnostics, getAIRouteLogContext, getAIRouteSecurityContext, logAIRouteFailure } from "@lib/google/genAi/diagnostics";
import { genAIClient } from "@lib/google/genAi";
import { logger } from "@lib/monitoring/logger";
import { getLinkedOutletPolicyBlockReason } from "@lib/multiOutlet/serverOutletPolicy";
import { requireAnyStorePermission } from "@lib/permissions/server";
import { checkAIOperationLimit } from "@lib/rateLimit/helpers";
import { logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
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
const MAX_NEW_ITEM_METADATA_PROVIDER_RESPONSE_PARSE_DIAGNOSTICS = 25;

type NewItemMetadataProviderResponseParseStage =
    | 'empty_response'
    | 'object_fragment'
    | 'object_fragment_missing';

type NewItemMetadataProviderResponseParseContext = {
    action: string;
    attributeCount: number;
    businessType: string;
    contentLength: string;
    fileId?: unknown;
    projectId?: unknown;
    requestId: string;
    responseUsage?: unknown;
    sourceLang: string;
    storeId: unknown;
    targetLangs: string[];
    tenantId: unknown;
    tone: string;
    userId: unknown;
};

type NewItemMetadataProviderResponseParseFailureContext = NewItemMetadataProviderResponseParseContext & {
    candidateLength: number;
    hasFence: boolean;
    hasObjectFragment: boolean;
    responseTextLength: number;
    stage: NewItemMetadataProviderResponseParseStage;
    trimmedTextLength: number;
};

const reportedNewItemMetadataProviderResponseParseFailures = new Set<string>();

function logNewItemMetadataProviderResponseParseFailure(
    error: unknown,
    context: NewItemMetadataProviderResponseParseFailureContext,
): void {
    const failureKey = [
        context.stage,
        context.responseTextLength,
        context.trimmedTextLength,
        context.candidateLength,
        context.hasFence ? 'fenced' : 'plain',
        context.hasObjectFragment ? 'object-fragment' : 'no-object-fragment',
    ].join(':');

    if (reportedNewItemMetadataProviderResponseParseFailures.has(failureKey)) return;
    if (reportedNewItemMetadataProviderResponseParseFailures.size >= MAX_NEW_ITEM_METADATA_PROVIDER_RESPONSE_PARSE_DIAGNOSTICS) return;
    reportedNewItemMetadataProviderResponseParseFailures.add(failureKey);

    logRuntimeFailure('new_item_metadata_provider_response_parse_failed', error, {
        ...getAIRouteLogContext({
            action: context.action,
            attributeCount: context.attributeCount,
            businessType: context.businessType,
            contentLength: context.contentLength,
            fileId: context.fileId,
            model: AI_MODEL,
            projectId: context.projectId,
            requestId: context.requestId,
            responseUsage: context.responseUsage,
            sourceLang: context.sourceLang,
            storeId: context.storeId,
            targetLangs: context.targetLangs,
            tenantId: context.tenantId,
            tone: context.tone,
            userId: context.userId,
        }),
        candidateLength: context.candidateLength,
        fallbackPolicy: 'return_metadata_generation_failed',
        hasFence: context.hasFence,
        hasObjectFragment: context.hasObjectFragment,
        parseStage: context.stage,
        responseTextLength: context.responseTextLength,
        trimmedTextLength: context.trimmedTextLength,
    });
}

function parseNewItemMetadataProviderResponse(
    responseText: string | undefined,
    context: NewItemMetadataProviderResponseParseContext,
): Record<string, any> {
    const rawText = String(responseText || '');
    const trimmedText = rawText.trim();
    const hasFence = trimmedText.startsWith('```') || trimmedText.endsWith('```');
    const cleaned = trimmedText
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();

    if (!cleaned) {
        const error = new Error('New item metadata returned empty response');
        logNewItemMetadataProviderResponseParseFailure(error, {
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
                logNewItemMetadataProviderResponseParseFailure(fragmentParseError, {
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

        logNewItemMetadataProviderResponseParseFailure(fullParseError, {
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

function getNewItemMetadataClientResponseSummary(response: Record<string, unknown>) {
    const attributes = Array.isArray(response.attributes) ? response.attributes : [];
    const description = response.description && typeof response.description === 'object' && !Array.isArray(response.description)
        ? response.description as Record<string, unknown>
        : {};
    const name = response.name && typeof response.name === 'object' && !Array.isArray(response.name)
        ? response.name as Record<string, unknown>
        : {};
    const descriptionValues = Object.values(description).filter((value): value is string => typeof value === 'string');
    const nameValues = Object.values(name).filter((value): value is string => typeof value === 'string');

    return {
        attributeCount: attributes.length,
        descriptionLanguageCount: descriptionValues.length,
        descriptionTotalLength: descriptionValues.reduce((total, value) => total + value.length, 0),
        hasAttributes: attributes.length > 0,
        hasDescription: descriptionValues.some((value) => value.trim().length > 0),
        hasName: nameValues.some((value) => value.trim().length > 0),
        nameLanguageCount: nameValues.length,
        nameTotalLength: nameValues.reduce((total, value) => total + value.length, 0),
        objectKeyCount: Object.keys(response).length,
        responseShape: 'object',
        responseSummaryKind: 'new_item_metadata',
    };
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
        const normalizedItem = toPromptItem(item);
        const {
            originalAttributeIdsByAlias,
            providerItem: promptItem,
        } = createNewItemMetadataProviderAliases(normalizedItem);
        const promptTargetLang = targetLang.map(toPromptLanguage);
        const promptSourceLang = toPromptLanguage(sourceLang);
        const targetLangCodes = promptTargetLang.map((language) => language.code || 'unspecified');
        const itemAttributeCount = Array.isArray(item.attributes) ? item.attributes.length : 0;
        const itemSummary = {
            attributeCount: itemAttributeCount,
            hasCategory: Boolean(item.category),
            hasDescription: Boolean(item.description),
            hasName: Boolean(item.name),
        };
        const languageSummary = {
            sourceLang: promptSourceLang.code || 'unspecified',
            targetLangCount: targetLangCodes.length,
        };

        const permissionError = await requireAnyStorePermission(
            request,
            session,
            [PERMISSIONS.GENERATE_DESCRIPTIONS],
            "New item metadata",
        );
        if (permissionError) return permissionError;

        const outletPolicyBlockReason = await getLinkedOutletPolicyBlockReason({
            action: 'description',
            itemIds: [item.id],
            projectId,
            session,
        });
        if (outletPolicyBlockReason) {
            logger.security('Outlet Policy Violation - New Item Metadata API', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/new-item-metadata',
                reason: outletPolicyBlockReason,
            }, 'medium');
            return NextResponse.json({ error: outletPolicyBlockReason }, { status: 403 });
        }

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
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
            ]
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
        await writeLogEntry({
            logFileName: LOG_FILE,
            userId,
            projectId,
            fileId,
            logType: 'API_RESPONSE',
            data: {
                model: AI_MODEL,
                requestId,
                responseTextLength: response.text?.length || 0,
                responseTextPresent: Boolean(response.text),
                responseUsage: response.usageMetadata || null,
            },
        });

        const endTime = new Date().getTime();
        const processingTime = endTime - startTime;

        let parsedGeneratedData: Record<string, unknown>;
        try {
            parsedGeneratedData = parseNewItemMetadataProviderResponse(response.text, {
                action,
                attributeCount: itemAttributeCount,
                businessType: businessType || 'unspecified',
                contentLength,
                fileId,
                projectId,
                requestId,
                responseUsage: response.usageMetadata || null,
                sourceLang: promptSourceLang.code || 'unspecified',
                storeId: session.sId,
                targetLangs: targetLangCodes,
                tenantId: session.tId,
                tone: tone || 'Professional',
                userId,
            });
        } catch (parseError) {
            logAIRouteFailure('new_item_metadata_invalid_json', parseError, {
                businessType: businessType || 'unspecified',
                contentLength,
                fileId,
                model: AI_MODEL,
                projectId,
                responseTextLength: response.text?.length || 0,
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
                    businessType: businessType || 'unspecified',
                    contentLength,
                    model: AI_MODEL,
                    responseTextLength: response.text?.length || 0,
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

        const restoredGeneratedData = restoreNewItemMetadataProviderAttributeIds(
            parsedGeneratedData,
            originalAttributeIdsByAlias,
        );
        const generatedData = normalizeNewItemMetadataOutput(restoredGeneratedData, {
            businessType,
            item: normalizedItem,
            sourceLanguageCode: promptSourceLang.code,
            targetLanguageCodes: targetLangCodes,
        });
        if (!generatedData) {
            logAIRouteFailure('new_item_metadata_invalid_shape_response', undefined, {
                isArray: Array.isArray(parsedGeneratedData),
                model: AI_MODEL,
                projectId,
                requestId,
                responseType: typeof parsedGeneratedData,
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
                    isArray: Array.isArray(parsedGeneratedData),
                    model: AI_MODEL,
                    requestId,
                    responseType: typeof parsedGeneratedData,
                    sourceLang: promptSourceLang.code || 'unspecified',
                    storeId: session.sId,
                    targetLangs: targetLangCodes,
                    tenantId: session.tId,
                },
            });
            return NextResponse.json({ error: 'Metadata generation failed' }, { status: 500 });
        }

        let transactionObject = {
            transactionId: null,
            contentLength,
            itemSummary,
            languageSummary,
            businessType: businessType || 'unspecified',
            tone: tone || 'Professional',
            projectId,
            fileId,
            action,
            unitsConsumed: 0,
            clientResponse: getNewItemMetadataClientResponseSummary(generatedData),
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
        const getTransactionLogSummary = () => ({
            action: transactionObject.action,
            businessType: transactionObject.businessType,
            contentLength: transactionObject.contentLength,
            fileId: transactionObject.fileId,
            itemSummary: transactionObject.itemSummary,
            languageSummary: transactionObject.languageSummary,
            model: transactionObject.model,
            processingTime: transactionObject.processingTime,
            projectId: transactionObject.projectId,
            promptTokenCount: transactionObject.promptTokenCount,
            candidatesTokenCount: transactionObject.candidatesTokenCount,
            totalTokenCount: transactionObject.totalTokenCount,
            totalCharge: transactionObject.totalCharge,
            totalCredits: transactionObject.totalCredits,
            transactionId: transactionObject.transactionId,
            unitsConsumed: transactionObject.unitsConsumed,
        });

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
            await writeLogEntry({ logFileName: LOG_FILE, userId, projectId, fileId, logType: 'TRANSACTION_DB_ERROR', data: getTransactionLogSummary(), error: getAIErrorDiagnostics(transactionError) });
            throw transactionError;
        }

        const generatedDataRecord = generatedData as Record<string, unknown>;
        const responseSummary = getNewItemMetadataClientResponseSummary(generatedDataRecord);

        await writeLogEntry({
            logFileName: LOG_FILE, userId, projectId, fileId, logType: 'SUCCESS_RESPONSE',
            data: {
                action,
                requestSummary: {
                    ...itemSummary,
                    contentLength,
                    sourceLang: promptSourceLang.code || 'unspecified',
                    targetLangCount: targetLangCodes.length,
                },
                responseSummary,
                transaction: getTransactionLogSummary(),
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

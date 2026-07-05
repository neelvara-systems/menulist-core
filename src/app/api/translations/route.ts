export const dynamic = 'force-dynamic';
import { getModelName } from "@constant/AI/models";
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { PERMISSIONS } from "@constant/permissions";
import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { finalizeAiOperationAccounting } from "@lib/ai/accounting";
import { checkAICapacity } from "@lib/ai/capacityCheck";
import { getAIGatewayDiagnostics, getAIErrorDiagnostics, getAIRouteLogContext, getAIRouteSecurityContext, logAIRouteFailure } from "@lib/google/genAi/diagnostics";
import { genAIClient } from "@lib/google/genAi";
import { logger } from "@lib/monitoring/logger";
import { getLinkedOutletPolicyBlockReason } from "@lib/multiOutlet/serverOutletPolicy";
import { requireAnyStorePermission } from "@lib/permissions/server";
import { checkAIOperationLimit } from "@lib/rateLimit/helpers";
import { logRuntimeFailure } from "@lib/runtime/runtimeDiagnostics";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { TranslationRequestSchema } from "@lib/validation/apiSchemas";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { verifyTenantAccess, withAuth } from "../../../middleware/auth";
import getPrompt, { systemInstruction } from "./prompt";

const AI_MODEL = getModelName('TRANSLATION');
const LOG_FILE = "translations.log"
const TRANSLATION_AI_MAX_BODY_BYTES = 1024 * 1024;
const MAX_TRANSLATION_PROVIDER_RESPONSE_PARSE_DIAGNOSTICS = 25;

type TranslationProviderResponseParseAttempt = 'initial' | 'retry';
type TranslationProviderResponseParseStage =
    | 'empty_response'
    | 'object_fragment'
    | 'object_fragment_missing';

type TranslationProviderResponseParseContext = {
    action: string;
    attempt: TranslationProviderResponseParseAttempt;
    fileId?: unknown;
    inputKeyCount: number;
    isBatch: boolean;
    projectId?: unknown;
    requestId: string;
    responseUsage?: unknown;
    sourceLang: string;
    storeId: unknown;
    targetLangs: string[];
    tenantId: unknown;
    userId: unknown;
};

type TranslationProviderResponseParseFailureContext = TranslationProviderResponseParseContext & {
    candidateLength: number;
    hasFence: boolean;
    hasObjectFragment: boolean;
    responseTextLength: number;
    stage: TranslationProviderResponseParseStage;
    trimmedTextLength: number;
};

const reportedTranslationProviderResponseParseFailures = new Set<string>();

function logTranslationProviderResponseParseFailure(
    error: unknown,
    context: TranslationProviderResponseParseFailureContext,
): void {
    const failureKey = [
        context.attempt,
        context.stage,
        context.responseTextLength,
        context.trimmedTextLength,
        context.candidateLength,
        context.hasFence ? 'fenced' : 'plain',
        context.hasObjectFragment ? 'object-fragment' : 'no-object-fragment',
    ].join(':');

    if (reportedTranslationProviderResponseParseFailures.has(failureKey)) return;
    if (reportedTranslationProviderResponseParseFailures.size >= MAX_TRANSLATION_PROVIDER_RESPONSE_PARSE_DIAGNOSTICS) return;
    reportedTranslationProviderResponseParseFailures.add(failureKey);

    logRuntimeFailure('translation_provider_response_parse_failed', error, {
        ...getAIRouteLogContext({
            action: context.action,
            attempt: context.attempt,
            fileId: context.fileId,
            inputKeyCount: context.inputKeyCount,
            isBatch: context.isBatch,
            model: AI_MODEL,
            projectId: context.projectId,
            requestId: context.requestId,
            responseUsage: context.responseUsage,
            sourceLang: context.sourceLang,
            storeId: context.storeId,
            targetLangs: context.targetLangs,
            tenantId: context.tenantId,
            userId: context.userId,
        }),
        candidateLength: context.candidateLength,
        fallbackPolicy: 'retry_once_then_return_translation_failed',
        hasFence: context.hasFence,
        hasObjectFragment: context.hasObjectFragment,
        parseStage: context.stage,
        responseTextLength: context.responseTextLength,
        trimmedTextLength: context.trimmedTextLength,
    });
}

function parseTranslationProviderResponse(
    responseText: string | undefined,
    context: TranslationProviderResponseParseContext,
): Record<string, any> {
    const rawText = String(responseText || '');
    const trimmedText = rawText.trim();
    const hasFence = trimmedText.startsWith('```') || trimmedText.endsWith('```');
    const cleaned = trimmedText
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();

    if (!cleaned) {
        const error = new Error(context.attempt === 'retry'
            ? 'Gemini retry also returned empty response'
            : 'Gemini returned empty response');
        logTranslationProviderResponseParseFailure(error, {
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
                logTranslationProviderResponseParseFailure(fragmentParseError, {
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

        logTranslationProviderResponseParseFailure(fullParseError, {
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

const isStringRecord = (value: unknown): value is Record<string, string> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeTranslatedField = (value: unknown, fallbackValue: string) => {
    if (typeof value !== 'string') return fallbackValue;
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : fallbackValue;
};

const extractTranslationTargetIds = (inputJson: Record<string, string>) => {
    const itemIds = new Set<string>();
    const categoryIds = new Set<string>();

    Object.keys(inputJson || {}).forEach((key) => {
        if (key.endsWith('_c')) {
            categoryIds.add(key.slice(0, -2));
            return;
        }

        if (key.endsWith('_i') || key.endsWith('_d')) {
            itemIds.add(key.slice(0, -2));
            return;
        }

        if (key.endsWith('_a')) {
            itemIds.add(key);
        }
    });

    return {
        categoryIds: Array.from(categoryIds).filter(Boolean),
        itemIds: Array.from(itemIds).filter(Boolean),
    };
};

const normalizeSingleTranslationResponse = ({
    generatedData,
    inputJson,
    inputKeys,
    languageCode,
}: {
    generatedData: Record<string, any>;
    inputJson: Record<string, string>;
    inputKeys: string[];
    languageCode: string;
}) => {
    const rawTranslations = generatedData?.translations;
    if (!isStringRecord(rawTranslations)) {
        throw new Error('Translation failed: AI returned invalid single-language response shape');
    }

    const normalizedTranslations = Object.fromEntries(
        inputKeys.map((key) => [key, normalizeTranslatedField(rawTranslations[key], inputJson[key])])
    );
    const missingKeys = inputKeys.filter((key) => !(key in rawTranslations));
    const invalidKeys = inputKeys.filter((key) => key in rawTranslations && normalizeTranslatedField(rawTranslations[key], '') === '');

    return {
        normalizedData: { translations: normalizedTranslations },
        translationCoverage: [{
            language: languageCode,
            missingKeys,
            invalidKeys,
            translatedKeyCount: Object.keys(rawTranslations).length,
            fallbackKeyCount: missingKeys.length + invalidKeys.length,
        }],
    };
};

const normalizeBatchTranslationResponse = ({
    generatedData,
    inputJson,
    inputKeys,
    targetLanguages,
}: {
    generatedData: Record<string, any>;
    inputJson: Record<string, string>;
    inputKeys: string[];
    targetLanguages: Array<{ code?: string }>;
}) => {
    const rawTranslationsByLanguage = generatedData?.translationsByLanguage;
    if (typeof rawTranslationsByLanguage !== 'object' || rawTranslationsByLanguage === null || Array.isArray(rawTranslationsByLanguage)) {
        throw new Error('Translation failed: AI returned invalid batch response shape');
    }

    const normalizedTranslationsByLanguage = Object.fromEntries(
        targetLanguages.map((language) => {
            if (!language.code) {
                throw new Error('Translation failed: target language code is missing');
            }
            const rawTranslations = rawTranslationsByLanguage[language.code];
            if (!isStringRecord(rawTranslations)) {
                throw new Error(`Translation failed: AI returned invalid language payload for ${language.code}`);
            }

            const normalizedTranslations = Object.fromEntries(
                inputKeys.map((key) => [key, normalizeTranslatedField(rawTranslations[key], inputJson[key])])
            );

            return [language.code, normalizedTranslations];
        })
    );

    const translationCoverage = targetLanguages.map((language) => {
        if (!language.code) {
            throw new Error('Translation failed: target language code is missing');
        }
        const rawTranslations = rawTranslationsByLanguage[language.code] as Record<string, unknown>;
        const missingKeys = inputKeys.filter((key) => !(key in rawTranslations));
        const invalidKeys = inputKeys.filter((key) => key in rawTranslations && normalizeTranslatedField(rawTranslations[key], '') === '');

        return {
            language: language.code,
            missingKeys,
            invalidKeys,
            translatedKeyCount: Object.keys(rawTranslations).length,
            fallbackKeyCount: missingKeys.length + invalidKeys.length,
        };
    });

    return {
        normalizedData: { translationsByLanguage: normalizedTranslationsByLanguage },
        translationCoverage,
    };
};

const getTranslationClientResponseSummary = (
    normalizedData: Record<string, unknown>,
    translationCoverageSummary: {
        fallbackKeyCount: number;
        hasPartialCoverage: boolean;
        translatedKeyCount: number;
        translationCoverageCount: number;
    },
) => ({
    fallbackKeyCount: translationCoverageSummary.fallbackKeyCount,
    hasPartialCoverage: translationCoverageSummary.hasPartialCoverage,
    objectKeyCount: Object.keys(normalizedData).length,
    responseShape: 'object',
    responseSummaryKind: 'translation_generation',
    targetLanguageCount: translationCoverageSummary.translationCoverageCount,
    translatedKeyCount: translationCoverageSummary.translatedKeyCount,
    translationsCount: translationCoverageSummary.translatedKeyCount,
});

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;
    const requestId = crypto.randomUUID();
    let requestAction = 'unknown';
    try {

        // �️ SAFE_MODE: Block expensive operations during system maintenance
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        // �🔒 RATE LIMITING: Prevent API abuse
        const rateLimitResponse = await checkAIOperationLimit();
        if (rateLimitResponse) return rateLimitResponse;

        // 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const bodyResult = await readBoundedJsonBody(request, TRANSLATION_AI_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return bodyResult.response;

        const rawData = bodyResult.data as any;
        const validation = validateAPIInput(TranslationRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            const attemptedData = getAIRouteLogContext({
                action: rawData?.action,
                inputKeyCount: Object.keys(rawData?.inputJson || {}).length,
                sourceLang: rawData?.sourceLang?.code || rawData?.sourceLang,
                targetLang: rawData?.targetLang?.code || rawData?.targetLang,
            });

            // Log to Sentry (potential attack attempt)
            logger.security('Input Validation Failed', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/translations',
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
        const { inputJson, targetLang, sourceLang, action, projectId, fileId } = validated;
        requestAction = action;
        const targetLanguages = Array.isArray(targetLang) ? targetLang : [targetLang];
        const permissionError = await requireAnyStorePermission(
            request,
            session,
            [PERMISSIONS.GENERATE_DESCRIPTIONS],
            "Translation generation",
        );
        if (permissionError) return permissionError;

        logger.info('Translation requested', getAIRouteLogContext({
            action,
            fileId,
            inputKeyCount: Object.keys(inputJson || {}).length,
            isBatch: Array.isArray(targetLang),
            model: AI_MODEL,
            projectId,
            requestId,
            sourceLang: sourceLang.code,
            storeId: session.sId,
            targetLangs: targetLanguages.map((language) => language.code),
            tenantId: session.tId,
            userId,
        }));

        if (projectId) {
            if (!verifyTenantAccess(session, session.tId, session.sId, request)) {
                logger.security('Tenant Access Violation - Translation API', {
                    ...getAIRouteSecurityContext(session, request),
                    endpoint: '/api/translations',
                    attemptedProject: getAIRouteLogContext({ projectId }),
                }, 'critical');
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }

            const translationTargets = extractTranslationTargetIds(inputJson as Record<string, string>);
            const outletPolicyBlockReason = await getLinkedOutletPolicyBlockReason({
                action: "translation",
                categoryIds: translationTargets.categoryIds,
                itemIds: translationTargets.itemIds,
                projectId,
                session,
            });
            if (outletPolicyBlockReason) {
                logger.security('Outlet Policy Violation - Translation API', {
                    ...getAIRouteSecurityContext(session, request),
                    endpoint: '/api/translations',
                    project: getAIRouteLogContext({ projectId }),
                    reason: outletPolicyBlockReason,
                }, 'medium');
                return NextResponse.json({ error: outletPolicyBlockReason }, { status: 403 });
            }
        }

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
        const prompt = getPrompt({
            inputJson: inputJson as Record<string, string>,
            targetLang: Array.isArray(targetLang)
                ? targetLang.map((language) => `${language.name} (${language.code})`)
                : `${targetLang.name} (${targetLang.code})`,
            sourceLang: `${sourceLang.name} (${sourceLang.code})`
        });
        const generationConfig = {
            responseMimeType: "application/json",
            temperature: 0.3,
            topP: 0.85,
            topK: 40,
            // maxOutputTokens: 8192,
            systemInstruction: systemInstruction,
            safetySettings: [{
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_NONE
            }]
        }
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

            logAIRouteFailure('translation_model_call_failed', generationError, {
                action,
                gatewayDiagnostics,
                inputKeyCount: Object.keys(inputJson || {}).length,
                isBatch: Array.isArray(targetLang),
                model: AI_MODEL,
                projectId,
                requestId,
                sourceLang: sourceLang.code,
                storeId: session.sId,
                targetLangs: targetLanguages.map((language) => language.code),
                tenantId: session.tId,
            });
            await writeLogEntry({
                logFileName: LOG_FILE,
                userId,
                projectId,
                fileId,
                logType: 'MODEL_CALL_ERROR',
                data: {
                    action,
                    gatewayDiagnostics,
                    inputKeyCount: Object.keys(inputJson || {}).length,
                    isBatch: Array.isArray(targetLang),
                    model: AI_MODEL,
                    projectId,
                    requestId,
                    sourceLang: sourceLang.code,
                    storeId: session.sId,
                    targetLangs: targetLanguages.map((language) => language.code),
                    tenantId: session.tId,
                },
                error: errorDiagnostics,
            });
            if (generationError && typeof generationError === 'object') {
                (generationError as Record<string, unknown>).__translationLogged = true;
            }
            throw generationError;
        }

        const endTime = new Date().getTime();
        const processingTime = endTime - startTime;

        let generatedData: Record<string, any>;
        try {
            generatedData = parseTranslationProviderResponse(response.text, {
                action,
                attempt: 'initial',
                fileId,
                inputKeyCount: Object.keys(inputJson || {}).length,
                isBatch: Array.isArray(targetLang),
                projectId,
                requestId,
                responseUsage: response.usageMetadata || null,
                sourceLang: sourceLang.code,
                storeId: session.sId,
                targetLangs: targetLanguages.map((language) => language.code),
                tenantId: session.tId,
                userId,
            });
        } catch (parseError) {
            // Retry once — LLMs occasionally produce malformed JSON
            let retryResponse;
            try {
                retryResponse = await genAIClient.models.generateContent({
                    model: AI_MODEL,
                    contents: prompt,
                    config: generationConfig,
                });
            } catch (retryGenerationError) {
                const errorDiagnostics = getAIErrorDiagnostics(retryGenerationError);
                const gatewayDiagnostics = getAIGatewayDiagnostics(genAIClient);

                logAIRouteFailure('translation_retry_model_call_failed', retryGenerationError, {
                    action,
                    attempt: 'retry',
                    gatewayDiagnostics,
                    inputKeyCount: Object.keys(inputJson || {}).length,
                    isBatch: Array.isArray(targetLang),
                    model: AI_MODEL,
                    projectId,
                    requestId,
                    sourceLang: sourceLang.code,
                    storeId: session.sId,
                    targetLangs: targetLanguages.map((language) => language.code),
                    tenantId: session.tId,
                });
                await writeLogEntry({
                    logFileName: LOG_FILE,
                    userId,
                    projectId,
                    fileId,
                    logType: 'MODEL_CALL_ERROR',
                    data: {
                        action,
                        attempt: 'retry',
                        gatewayDiagnostics,
                        inputKeyCount: Object.keys(inputJson || {}).length,
                        isBatch: Array.isArray(targetLang),
                        model: AI_MODEL,
                        projectId,
                        requestId,
                        sourceLang: sourceLang.code,
                        storeId: session.sId,
                        targetLangs: targetLanguages.map((language) => language.code),
                        tenantId: session.tId,
                    },
                    error: errorDiagnostics,
                });
                if (retryGenerationError && typeof retryGenerationError === 'object') {
                    (retryGenerationError as Record<string, unknown>).__translationLogged = true;
                }
                throw retryGenerationError;
            }
            try {
                generatedData = parseTranslationProviderResponse(retryResponse.text, {
                    action,
                    attempt: 'retry',
                    fileId,
                    inputKeyCount: Object.keys(inputJson || {}).length,
                    isBatch: Array.isArray(targetLang),
                    projectId,
                    requestId,
                    responseUsage: retryResponse.usageMetadata || null,
                    sourceLang: sourceLang.code,
                    storeId: session.sId,
                    targetLangs: targetLanguages.map((language) => language.code),
                    tenantId: session.tId,
                    userId,
                });
                response = retryResponse;
            } catch (retryParseError) {
                logAIRouteFailure('translation_invalid_json_after_retry', retryParseError, {
                    inputKeyCount: Object.keys(inputJson || {}).length,
                    isBatch: Array.isArray(targetLang),
                    model: AI_MODEL,
                    responseTextLength: retryResponse.text?.length || 0,
                    requestId,
                    responseUsage: retryResponse.usageMetadata || null,
                    sourceLang: sourceLang.code,
                    storeId: session.sId,
                    targetLangs: targetLanguages.map((language) => language.code),
                    tenantId: session.tId,
                });
                await writeLogEntry({
                    logFileName: LOG_FILE,
                    userId,
                    projectId,
                    fileId,
                    logType: 'INVALID_JSON_RESPONSE',
                    data: {
                        inputKeyCount: Object.keys(inputJson || {}).length,
                        isBatch: Array.isArray(targetLang),
                        model: AI_MODEL,
                        responseTextLength: retryResponse.text?.length || 0,
                        requestId,
                        responseUsage: retryResponse.usageMetadata || null,
                        sourceLang: sourceLang.code,
                        storeId: session.sId,
                        targetLangs: targetLanguages.map((language) => language.code),
                        tenantId: session.tId,
                    },
                    error: retryParseError,
                });
                const translationError = new Error('Translation failed: AI returned invalid JSON after retry');
                (translationError as unknown as Record<string, unknown>).__translationLogged = true;
                throw translationError;
            }
        }

        const inputKeys = Object.keys(inputJson || {});
        const isBatchRequest = targetLanguages.length > 1;
        const {
            normalizedData,
            translationCoverage,
        } = isBatchRequest
            ? normalizeBatchTranslationResponse({
                generatedData,
                inputJson,
                inputKeys,
                targetLanguages,
            })
            : normalizeSingleTranslationResponse({
                generatedData,
                inputJson,
                inputKeys,
                languageCode: targetLanguages[0]?.code || sourceLang.code,
            });
        const hasPartialCoverage = translationCoverage.some((entry) => entry.fallbackKeyCount > 0);
        const fallbackKeyCount = translationCoverage.reduce((total, entry) => total + entry.fallbackKeyCount, 0);
        const translatedKeyCount = translationCoverage.reduce((total, entry) => total + entry.translatedKeyCount, 0);
        const targetLanguageSummary = targetLanguages.map((language) => ({
            code: language.code || 'unspecified',
        }));
        const inputSummary = {
            inputKeyCount: inputKeys.length,
            inputValueTotalLength: inputKeys.reduce((total, key) => total + String(inputJson[key] || '').length, 0),
            isBatchRequest,
        };
        const languageSummary = {
            sourceLang: sourceLang.code,
            targetLangCount: targetLanguageSummary.length,
        };
        const translationCoverageSummary = {
            fallbackKeyCount,
            hasPartialCoverage,
            translatedKeyCount,
            translationCoverageCount: translationCoverage.length,
        };

        let transactionObject = {
            transactionId: null,
            inputSummary,
            languageSummary,
            targetLanguages: targetLanguageSummary,
            projectId,
            fileId,
            action,
            unitsConsumed: 0,
            clientResponse: getTranslationClientResponseSummary(normalizedData, translationCoverageSummary),
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
            translationCoverageSummary,
        };
        const getTransactionLogSummary = () => ({
            action: transactionObject.action,
            fileId: transactionObject.fileId,
            inputSummary: transactionObject.inputSummary,
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
            translationCoverageSummary: transactionObject.translationCoverageSummary,
            unitsConsumed: transactionObject.unitsConsumed,
        });

        // Add the operation to the database
        let remainingBalance = null;
        try {
            transactionObject.unitsConsumed = getUnitCost(transactionObject.action);
            const accounting = await finalizeAiOperationAccounting({
                capacitySubscription: capacityCheck.subscription,
                context: {
                    action,
                    fileId,
                    projectId,
                    requestId,
                    storeId: session.sId,
                    tenantId: session.tId,
                    userId,
                },
                input: transactionObject,
                logLabel: 'Translation',
                session,
            });
            transactionObject.unitsConsumed = accounting.unitsConsumed;
            transactionObject.transactionId = accounting.transactionId;
            remainingBalance = accounting.remainingBalance;
        } catch (transactionError) {
            logAIRouteFailure('translation_accounting_failed', transactionError, {
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

        await writeLogEntry({
            logFileName: LOG_FILE, userId, projectId, fileId, logType: 'SUCCESS_RESPONSE',
            data: {
                action,
                requestSummary: {
                    ...inputSummary,
                    sourceLang: sourceLang.code,
                    targetLangCount: targetLanguageSummary.length,
                },
                responseSummary: translationCoverageSummary,
                transaction: getTransactionLogSummary(),
            }
        });

        if (hasPartialCoverage) {
            logger.warn('Translation completed with partial coverage', getAIRouteLogContext({
                action,
                fileId,
                fallbackKeyCount: translationCoverage.reduce((total, entry) => total + entry.fallbackKeyCount, 0),
                inputKeyCount: inputKeys.length,
                projectId,
                requestId,
                sourceLang: sourceLang.code,
                storeId: session.sId,
                targetLangs: targetLanguages.map((language) => language.code),
                tenantId: session.tId,
                translatedKeyCount: translationCoverage.reduce((total, entry) => total + entry.translatedKeyCount, 0),
                translationCoverageCount: translationCoverage.length,
                transactionId: transactionObject.transactionId,
            }));
        } else {
            logger.info('Translation completed with full coverage', getAIRouteLogContext({
                action,
                fileId,
                inputKeyCount: inputKeys.length,
                isBatch: isBatchRequest,
                projectId,
                requestId,
                sourceLang: sourceLang.code,
                storeId: session.sId,
                targetLangs: targetLanguages.map((language) => language.code),
                tenantId: session.tId,
                transactionId: transactionObject.transactionId,
            }));
        }

        return NextResponse.json({
            data: normalizedData,
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
        if (!(error && typeof error === 'object' && '__translationLogged' in error)) {
            logAIRouteFailure('translation_api_failed', error, {
                action: requestAction,
                gatewayDiagnostics: getAIGatewayDiagnostics(genAIClient),
                model: AI_MODEL,
                requestId,
                storeId: session.sId,
                tenantId: session.tId,
                userId,
            });
        }
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json(
            { error: 'Translation failed' },
            { status: 500 }
        );
    }
});

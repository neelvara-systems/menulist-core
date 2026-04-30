export const dynamic = 'force-dynamic';
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { addAiOperation } from "@database/aiOperations";
import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { checkAICapacity, consumeAICapacity } from "@lib/ai/capacityCheck";
import { getAIGatewayDiagnostics, getAIErrorDiagnostics, getPreviewText } from "@lib/google/genAi/diagnostics";
import { genAIClient } from "@lib/google/genAi";
import { logger } from "@lib/monitoring/logger";
import { checkAIOperationLimit } from "@lib/rateLimit/helpers";
import { validateAPIInput } from "@lib/security/inputValidation";
import { buildSecurityContext } from "@lib/security/securityContext";
import { TranslationRequestSchema } from "@lib/validation/apiSchemas";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { withAuth } from "../../../middleware/auth";
import getPrompt, { systemInstruction } from "./prompt";

const AI_MODEL = "gemini-2.5-flash"//"gemini-2.0-flash-001";
const LOG_FILE = "translations.log"

const isStringRecord = (value: unknown): value is Record<string, string> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const normalizeTranslatedField = (value: unknown, fallbackValue: string) => {
    if (typeof value !== 'string') return fallbackValue;
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : fallbackValue;
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
        const rawData = await request.json();
        const validation = validateAPIInput(TranslationRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';

            // Log to Sentry (potential attack attempt)
            logger.security('Input Validation Failed', {
                ...buildSecurityContext(session, request),
                endpoint: '/api/translations',
                error: errorMsg,
                attemptedData: {
                    inputJsonKeys: Object.keys(rawData?.inputJson || {}).length,
                    targetLang: rawData?.targetLang,
                    sourceLang: rawData?.sourceLang,
                    action: rawData?.action,
                },
            }, 'medium');

            await writeMissingParamsLogEntry(LOG_FILE, userId, undefined, undefined, rawData);
            return NextResponse.json({
                error: 'Invalid input',
                details: errorMsg
            }, { status: 400 });
        }

        const validated = validation.data;
        const { inputJson, targetLang, sourceLang, action, projectId, fileId } = validated;
        requestAction = action;
        const targetLanguages = Array.isArray(targetLang) ? targetLang : [targetLang];
        logger.info('Translation requested', {
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

            logger.error('Translation model call failed', generationError, {
                ...errorDiagnostics,
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
                userId,
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
            if (!response.text) throw new Error('Gemini returned empty response');
            generatedData = JSON.parse(response.text);
        } catch (parseError) {
            // Retry once — LLMs occasionally produce malformed JSON
            logger.warn('Translation returned invalid JSON, retrying once', {
                inputKeyCount: Object.keys(inputJson || {}).length,
                isBatch: Array.isArray(targetLang),
                model: AI_MODEL,
                rawTextLength: response.text?.length || 0,
                rawTextPreview: getPreviewText(response.text, 300),
                requestId,
                responseUsage: response.usageMetadata || null,
                sourceLang: sourceLang.code,
                storeId: session.sId,
                targetLangs: targetLanguages.map((language) => language.code),
                tenantId: session.tId,
                userId,
            });
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

                logger.error('Translation retry model call failed', retryGenerationError, {
                    ...errorDiagnostics,
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
                    userId,
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
            if (!retryResponse.text) throw new Error('Gemini retry also returned empty response');
            try {
                generatedData = JSON.parse(retryResponse.text);
                response = retryResponse;
            } catch (retryParseError) {
                logger.error('Translation returned invalid JSON after retry', retryParseError, {
                    inputKeyCount: Object.keys(inputJson || {}).length,
                    isBatch: Array.isArray(targetLang),
                    model: AI_MODEL,
                    rawTextLength: retryResponse.text.length,
                    rawTextPreview: getPreviewText(retryResponse.text, 300),
                    requestId,
                    responseUsage: retryResponse.usageMetadata || null,
                    sourceLang: sourceLang.code,
                    storeId: session.sId,
                    targetLangs: targetLanguages.map((language) => language.code),
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
                        inputKeyCount: Object.keys(inputJson || {}).length,
                        isBatch: Array.isArray(targetLang),
                        model: AI_MODEL,
                        rawTextLength: retryResponse.text.length,
                        rawTextPreview: getPreviewText(retryResponse.text, 300),
                        requestId,
                        responseUsage: retryResponse.usageMetadata || null,
                        sourceLang: sourceLang.code,
                        storeId: session.sId,
                        targetLangs: targetLanguages.map((language) => language.code),
                        tenantId: session.tId,
                    },
                    error: retryParseError,
                });
                throw new Error('Translation failed: AI returned invalid JSON after retry');
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

        let transactionObject = {
            transactionId: null,
            inputJson,
            targetLang,
            sourceLang,
            projectId,
            fileId,
            action,
            unitsConsumed: 0,
            clientResponse: normalizedData,
            geminiResponse: JSON.stringify(response),
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
            translationCoverage,
        };

        // Add the operation to the database
        let remainingBalance = null;
        try {
            transactionObject.unitsConsumed = getUnitCost(transactionObject.action);
            transactionObject.transactionId = await addAiOperation(transactionObject);
            // Consume capacity after successful operation
            if (capacityCheck.subscription && transactionObject.unitsConsumed > 0) {
                remainingBalance = await consumeAICapacity(capacityCheck.subscription, transactionObject.unitsConsumed);
            }
        } catch (transactionError) {
            logger.error('Failed to record translation transaction', transactionError, {
                action,
                fileId,
                projectId,
                requestId,
                storeId: session.sId,
                tenantId: session.tId,
                userId,
            });
            await writeLogEntry({ logFileName: LOG_FILE, userId, projectId, fileId, logType: 'TRANSACTION_DB_ERROR', data: transactionObject, error: transactionError });
        }

        await writeLogEntry({
            logFileName: LOG_FILE, userId, projectId, fileId, logType: 'SUCCESS_RESPONSE',
            data: {
                action,
                request: {
                    inputJson,
                    targetLang: targetLanguages.map((language) => language.code),
                    sourceLang: sourceLang.code
                },
                response: normalizedData,
                transaction: transactionObject,
            }
        });

        if (hasPartialCoverage) {
            logger.warn('Translation completed with partial coverage', {
                action,
                fileId,
                inputKeyCount: inputKeys.length,
                projectId,
                requestId,
                sourceLang: sourceLang.code,
                storeId: session.sId,
                targetLangs: targetLanguages.map((language) => language.code),
                tenantId: session.tId,
                translationCoverage,
                transactionId: transactionObject.transactionId,
            });
        } else {
            logger.info('Translation completed with full coverage', {
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
            });
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
            logger.error('Translation API error', error, {
                action: requestAction,
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
        return NextResponse.json(
            { error: 'Translation failed', message: (error as Error).message },
            { status: 500 }
        );
    }
});

export const dynamic = 'force-dynamic';
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { addAiOperation } from "@database/aiOperations";
import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { checkAICapacity, consumeAICapacity } from "@lib/ai/capacityCheck";
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

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;
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
        const targetLanguages = Array.isArray(targetLang) ? targetLang : [targetLang];

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
        const response = await genAIClient.models.generateContent({
            model: AI_MODEL,
            contents: prompt,
            config: generationConfig,
        });

        const endTime = new Date().getTime();
        const processingTime = endTime - startTime;

        let generatedData: Record<string, Record<string, string>>;
        try {
            if (!response.text) throw new Error('Gemini returned empty response');
            generatedData = JSON.parse(response.text);
        } catch (parseError) {
            // Retry once — LLMs occasionally produce malformed JSON
            console.error('Translation JSON parse failed, retrying:', parseError);
            const retryResponse = await genAIClient.models.generateContent({
                model: AI_MODEL,
                contents: prompt,
                config: generationConfig,
            });
            if (!retryResponse.text) throw new Error('Gemini retry also returned empty response');
            try {
                generatedData = JSON.parse(retryResponse.text);
            } catch (retryParseError) {
                console.error('Translation retry JSON parse also failed:', retryParseError);
                throw new Error('Translation failed: AI returned invalid JSON after retry');
            }
        }

        // Record the transaction
        let transactionObject = {
            transactionId: null,
            inputJson,
            targetLang,
            sourceLang,
            projectId,
            fileId,
            action,
            unitsConsumed: 0,
            clientResponse: generatedData,
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
            console.error("Failed to record translation transaction:", transactionError);
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
                response: generatedData,
                transaction: transactionObject,
            }
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
        console.error('Translation API error:', error);
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json(
            { error: 'Translation failed', message: (error as Error).message },
            { status: 500 }
        );
    }
});

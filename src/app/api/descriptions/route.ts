export const dynamic = 'force-dynamic';
import { getOurChargePaise, getRealCostPaise, getUnitCost } from "@constant/AI/unitCosts";
import { getModelName } from "@constant/AI/models";
import { CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from "@constant/common";
import { PERMISSIONS } from "@constant/permissions";
import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { finalizeAiOperationAccounting } from "@lib/ai/accounting";
import { checkAICapacity } from "@lib/ai/capacityCheck";
import { getAIGatewayDiagnostics, getAIErrorDiagnostics, getPreviewText, getAIRouteLogContext, getAIRouteSecurityContext, logAIRouteFailure } from "@lib/google/genAi/diagnostics";
import { genAIClient } from "@lib/google/genAi";
import { logger } from "@lib/monitoring/logger";
import { getLinkedOutletPolicyBlockReason } from "@lib/multiOutlet/serverOutletPolicy";
import { requireAnyStorePermission } from "@lib/permissions/server";
import { checkAIOperationLimit } from "@lib/rateLimit/helpers";
import { readBoundedJsonBody } from "@lib/security/boundedRequestBody";
import { validateAPIInput } from "@lib/security/inputValidation";
import { DescriptionRequestSchema } from "@lib/validation/apiSchemas";
import { DescriptionAPIParams } from "@template/main-app/projects/types";
import { writeErrorLogEntry, writeLogEntry, writeMissingParamsLogEntry } from 'logs/utils';
import { NextResponse } from 'next/server';
import { verifyTenantAccess, withAuth } from "../../../middleware/auth";
import descriptionPrompt, { descriptionPromptSystemInstruction } from "./prompt";

const AI_MODEL = getModelName('DESCRIPTION_GENERATION');
const LOG_FILE = "descriptions.log";
const DESCRIPTION_AI_MAX_BODY_BYTES = 256 * 1024;

export const POST = withAuth(async (request, session) => {
    // ✅ Session guaranteed by withAuth middleware
    // ✅ Auth failures automatically logged to Sentry
    const userId = session.user.id;
    const requestId = crypto.randomUUID();
    try {

        // �️ SAFE_MODE: Block expensive operations during system maintenance
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        // �🔒 RATE LIMITING: Prevent API abuse
        const rateLimitResponse = await checkAIOperationLimit();
        if (rateLimitResponse) return rateLimitResponse;

        // 🔒 INPUT VALIDATION: Prevent injection attacks (OWASP A03)
        const bodyResult = await readBoundedJsonBody(request, DESCRIPTION_AI_MAX_BODY_BYTES);
        if (bodyResult.ok === false) return bodyResult.response;

        const rawData = bodyResult.data as any;
        const validation = validateAPIInput(DescriptionRequestSchema, rawData);

        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            const attemptedData = getAIRouteLogContext({
                action: rawData?.action,
                itemCount: Array.isArray(rawData?.itemsList) ? rawData.itemsList.length : 0,
                sourceLang: rawData?.sourceLang?.code || rawData?.sourceLang,
                targetLang: rawData?.targetLang?.code || rawData?.targetLang,
            });

            // Log to Sentry (potential attack attempt)
            logger.security('Input Validation Failed', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/descriptions',
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
        const { itemsList, targetLang, sourceLang, projectId, fileId, contentLength, tone } = validated;
        const targetLangList = (Array.isArray(targetLang) ? targetLang : [targetLang]) as Array<{ code?: string }>;
        const targetLangCodes = targetLangList.map((language) => language?.code || 'unspecified');

        const permissionError = await requireAnyStorePermission(
            request,
            session,
            [PERMISSIONS.GENERATE_DESCRIPTIONS],
            "Description generation",
        );
        if (permissionError) return permissionError;

        logger.info('Description generation requested', getAIRouteLogContext({
            action: validated.action,
            contentLength,
            itemCount: itemsList.length,
            model: AI_MODEL,
            projectId,
            requestId,
            sourceLang: sourceLang?.code || 'unspecified',
            storeId: session.sId,
            targetLangs: targetLangCodes,
            tenantId: session.tId,
            tone: tone || 'default',
            userId,
        }));

        // 🔒 TENANT ISOLATION: Verify user owns this project
        if (projectId) {
            // Extract tenantId from projectId if embedded (format: tId_sId_projectId)
            // or verify through session context
            const tenantId = session.tId;
            const storeId = session.sId;

            if (!verifyTenantAccess(session, tenantId, storeId, request)) {
                logger.security('Tenant Access Violation - Description API', {
                    ...getAIRouteSecurityContext(session, request),
                    endpoint: '/api/descriptions',
                    attemptedProject: getAIRouteLogContext({ projectId }),
                }, 'critical');
                return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
            }
        }

        const outletPolicyBlockReason = await getLinkedOutletPolicyBlockReason({
            action: "description",
            itemIds: itemsList.map((item) => item.id).filter(Boolean),
            projectId,
            session,
        });
        if (outletPolicyBlockReason) {
            logger.security('Outlet Policy Violation - Description API', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: '/api/descriptions',
                project: getAIRouteLogContext({ projectId }),
                reason: outletPolicyBlockReason,
            }, 'medium');
            return NextResponse.json({ error: outletPolicyBlockReason }, { status: 403 });
        }

        // Map validated action to expected prompt action type
        const action = validated.action as DescriptionAPIParams['action'];

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

        // 🎛️ AI GENERATION PARAMETERS — Fixed deterministic values
        // Tone is locked to Professional (infrastructure = predictable output)
        const lengthSettings: Record<string, { temp: number; topP: number }> = {
            Standard: { temp: 0.70, topP: 0.90 },  // Focused, concise
            Detailed: { temp: 0.75, topP: 0.92 }   // Slightly more expressive
        };

        const baseSetting = lengthSettings[contentLength] || lengthSettings.Standard;
        const temperature = baseSetting.temp;
        const topP = baseSetting.topP;

        const prompt = descriptionPrompt(contentLength, action, { itemsList, targetLang, sourceLang }, tone);
        const generationConfig = {
            responseMimeType: "application/json",
            temperature,
            topP,
            topK: 40,
            // maxOutputTokens: 8192,
            systemInstruction: descriptionPromptSystemInstruction,
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


        // No need to pass generationConfig here, it's part of the model
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

            logAIRouteFailure('description_generation_model_call_failed', generationError, {
                action,
                contentLength,
                gatewayDiagnostics,
                itemCount: itemsList.length,
                model: AI_MODEL,
                projectId,
                requestId,
                sourceLang: sourceLang?.code || 'unspecified',
                storeId: session.sId,
                targetLangs: targetLangCodes,
                tenantId: session.tId,
                tone: tone || 'default',
            });
            await writeLogEntry({
                logFileName: LOG_FILE,
                userId,
                projectId,
                fileId,
                logType: 'MODEL_CALL_ERROR',
                data: {
                    action,
                    contentLength,
                    gatewayDiagnostics,
                    itemCount: itemsList.length,
                    model: AI_MODEL,
                    requestId,
                    sourceLang: sourceLang?.code || 'unspecified',
                    storeId: session.sId,
                    targetLangs: targetLangCodes,
                    tenantId: session.tId,
                    tone: tone || 'default',
                },
                error: errorDiagnostics,
            });
            if (generationError && typeof generationError === 'object') {
                (generationError as Record<string, unknown>).__descriptionLogged = true;
            }
            throw generationError;
        }
        await writeLogEntry({ logFileName: LOG_FILE, userId, projectId, fileId, logType: 'API_RESPONSE', data: response });

        const endTime = new Date().getTime();
        const processingTime = endTime - startTime;

        // Safe JSON extraction — strip markdown wrappers if model returns ```json blocks
        let rawText = response.text || '';
        rawText = rawText.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
        let generatedData: any;
        try {
            generatedData = JSON.parse(rawText);
        } catch (parseError) {
            logAIRouteFailure('description_generation_invalid_json', parseError, {
                fileId,
                model: AI_MODEL,
                projectId,
                responseTextLength: rawText.length,
                responseTextSummary: getPreviewText(rawText, 300),
                requestId,
                responseUsage: response.usageMetadata || null,
                sourceLang: sourceLang?.code || 'unspecified',
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
                    sourceLang: sourceLang?.code || 'unspecified',
                    storeId: session.sId,
                    targetLangs: targetLangCodes,
                    tenantId: session.tId,
                },
                error: parseError,
            });
            return NextResponse.json({ error: 'Description generation failed' }, { status: 500 });
        }

        // Type guard — ensure response is an object (not array, string, null, etc.)
        if (!generatedData || typeof generatedData !== 'object' || Array.isArray(generatedData)) {
            logAIRouteFailure('description_generation_non_object_response', undefined, {
                isArray: Array.isArray(generatedData),
                model: AI_MODEL,
                projectId,
                requestId,
                responseType: typeof generatedData,
                sourceLang: sourceLang?.code || 'unspecified',
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
                    sourceLang: sourceLang?.code || 'unspecified',
                    storeId: session.sId,
                    targetLangs: targetLangCodes,
                    tenantId: session.tId,
                },
            });
            return NextResponse.json({ error: 'Description generation failed' }, { status: 500 });
        }

        // Response ID validation — verify returned IDs match requested IDs to prevent data corruption
        const requestedIds = new Set(itemsList.map((item: any) => item.id));
        const returnedIds = new Set(Object.keys(generatedData));
        const missingIds = Array.from(requestedIds).filter(id => !returnedIds.has(id));
        if (missingIds.length > 0) {
            logger.warn('Description generation returned incomplete response', getAIRouteLogContext({
                userId,
                projectId,
                fileId,
                requestId,
                requestedCount: requestedIds.size,
                returnedCount: returnedIds.size,
                missingIdCount: missingIds.length,
            }));
        }

        let transactionObject = {
            transactionId: null,
            contentLength,
            itemsList,
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
                logLabel: 'Description generation',
                session,
            });
            transactionObject.unitsConsumed = accounting.unitsConsumed;
            transactionObject.transactionId = accounting.transactionId;
            remainingBalance = accounting.remainingBalance;
        } catch (transactionError) {
            logAIRouteFailure('description_generation_accounting_failed', transactionError, {
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
                request: { itemsList, targetLang, sourceLang, contentLength },
                response: generatedData,
                transaction: transactionObject,
            }
        });

        logger.info('Description generation completed', getAIRouteLogContext({
            action: validated.action,
            fileId,
            itemCount: itemsList.length,
            processingTime,
            projectId,
            requestId,
            storeId: session.sId,
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
        if (!(error && typeof error === 'object' && '__descriptionLogged' in error)) {
            logAIRouteFailure('description_generation_api_failed', error, {
                gatewayDiagnostics: getAIGatewayDiagnostics(genAIClient),
                model: AI_MODEL,
                requestId,
                storeId: session.sId,
                tenantId: session.tId,
                userId,
            });
        }
        await writeErrorLogEntry(LOG_FILE, error);
        return NextResponse.json({ error: 'Description generation failed' }, { status: 500 });
    }
});

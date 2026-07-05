export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { getModelName } from '@constant/AI/models';
import { getOurChargePaise, getRealCostPaise, getUnitCost } from '@constant/AI/unitCosts';
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from '@constant/common';
import { PERMISSIONS } from '@constant/permissions';
import { getActiveSubscriptionForStore } from '@database/subscriptions/server';
import { HarmBlockThreshold, HarmCategory } from '@google/genai';
import { finalizeAiOperationAccounting } from '@lib/ai/accounting';
import { checkAICapacity } from '@lib/ai/capacityCheck';
import { getAIGatewayDiagnostics, getAIRouteLogContext, getAIRouteSecurityContext, logAIRouteFailure } from '@lib/google/genAi/diagnostics';
import { genAIClient } from '@lib/google/genAi';
import { logger } from '@lib/monitoring/logger';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { checkAIOperationLimit } from '@lib/rateLimit/helpers';
import { logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { validateAPIInput } from '@lib/security/inputValidation';
import { normalizeMenuCardDesignAdvice } from '@lib/menu-card-export/ai/designAdvisor';
import type { MenuCardDesignAdvisorRecommendation } from '@lib/menu-card-export/ai/designAdvisor';
import { MenuCardDesignAdvisorRequestSchema } from '@lib/validation/apiSchemas';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { NextRequest, NextResponse } from 'next/server';
import { verifyTenantAccess, withAuth } from '../../../../middleware/auth';
import menuCardDesignAdvisorPrompt, { menuCardDesignAdvisorSystemInstruction } from './prompt';

const ACTION = AI_ACTIONS_TYPES.MENU_CARD_EXPORT_DESIGN_ADVISOR;
const AI_MODEL = getModelName('DESCRIPTION_GENERATION');
const ENDPOINT = '/api/menu-card-export/design-advisor';
const MENU_CARD_DESIGN_ADVISOR_MAX_BODY_BYTES = 128 * 1024;
const MAX_MENU_CARD_DESIGN_ADVISOR_PARSE_DIAGNOSTICS = 25;
const GENERATION_CONFIG = {
    responseMimeType: 'application/json' as const,
    temperature: 0.35,
    topP: 0.8,
    topK: 30,
    systemInstruction: menuCardDesignAdvisorSystemInstruction,
    safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
    ],
};

function getMenuCardDesignAdvisorClientResponseSummary(recommendation: MenuCardDesignAdvisorRecommendation) {
    return {
        density: recommendation.density,
        includeContactBlock: recommendation.includeContactBlock,
        includeDescriptions: recommendation.includeDescriptions,
        includeQr: recommendation.includeQr,
        objectKeyCount: Object.keys(recommendation).length,
        ownerNoteLength: recommendation.ownerNote.length,
        preset: recommendation.preset,
        reasonLength: recommendation.reason.length,
        responseShape: 'object',
        responseSummaryKind: 'menu_card_design_advisor',
        styleId: recommendation.styleId,
        warningCount: recommendation.warnings.length,
    };
}

type MenuCardDesignAdvisorParseStage =
    | 'empty_response'
    | 'object_fragment'
    | 'object_fragment_missing';

type MenuCardDesignAdvisorParseBaseContext = {
    projectId: unknown;
    requestId: string;
    storeId: unknown;
    tenantId: unknown;
    userId: unknown;
};

type MenuCardDesignAdvisorParseFailureContext = MenuCardDesignAdvisorParseBaseContext & {
    candidateLength: number;
    hasFence: boolean;
    hasObjectFragment: boolean;
    responseTextLength: number;
    stage: MenuCardDesignAdvisorParseStage;
    trimmedTextLength: number;
};

const reportedMenuCardDesignAdvisorParseFailures = new Set<string>();

function logMenuCardDesignAdvisorParseFailure(
    error: unknown,
    context: MenuCardDesignAdvisorParseFailureContext,
): void {
    const failureKey = [
        context.stage,
        context.responseTextLength,
        context.trimmedTextLength,
        context.candidateLength,
        context.hasFence ? 'fenced' : 'plain',
        context.hasObjectFragment ? 'object-fragment' : 'no-object-fragment',
    ].join(':');

    if (reportedMenuCardDesignAdvisorParseFailures.has(failureKey)) return;
    if (reportedMenuCardDesignAdvisorParseFailures.size >= MAX_MENU_CARD_DESIGN_ADVISOR_PARSE_DIAGNOSTICS) return;
    reportedMenuCardDesignAdvisorParseFailures.add(failureKey);

    logRuntimeFailure('menu_card_design_advisor_provider_response_parse_failed', error, {
        ...getAIRouteLogContext({
            action: ACTION,
            model: AI_MODEL,
            projectId: context.projectId,
            requestId: context.requestId,
            storeId: context.storeId,
            tenantId: context.tenantId,
            userId: context.userId,
        }),
        candidateLength: context.candidateLength,
        fallbackPolicy: 'return_layout_suggestion_failed',
        hasFence: context.hasFence,
        hasObjectFragment: context.hasObjectFragment,
        parseStage: context.stage,
        responseTextLength: context.responseTextLength,
        trimmedTextLength: context.trimmedTextLength,
    });
}

function getResponseText(response: any): string {
    return String(
        response?.text
        || response?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('')
        || '',
    ).trim();
}

function parseJsonLikeResponse(rawText: string, context: MenuCardDesignAdvisorParseBaseContext): unknown {
    const trimmedText = rawText.trim();
    const hasFence = trimmedText.startsWith('```') || trimmedText.endsWith('```');
    const cleaned = trimmedText
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim();

    if (!cleaned) {
        logMenuCardDesignAdvisorParseFailure(new Error('Empty AI response'), {
            ...context,
            candidateLength: 0,
            hasFence,
            hasObjectFragment: false,
            responseTextLength: rawText.length,
            stage: 'empty_response',
            trimmedTextLength: trimmedText.length,
        });
        throw new Error('Empty AI response');
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
                logMenuCardDesignAdvisorParseFailure(fragmentParseError, {
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
        logMenuCardDesignAdvisorParseFailure(fullParseError, {
            ...context,
            candidateLength: 0,
            hasFence,
            hasObjectFragment,
            responseTextLength: rawText.length,
            stage: 'object_fragment_missing',
            trimmedTextLength: trimmedText.length,
        });
        throw new Error('Invalid JSON response');
    }
}

function normalizePlanToken(value: unknown): string[] {
    const normalized = String(value || '').toLowerCase().trim();
    if (!normalized) return [];
    return normalized.split(/[^a-z0-9]+/).filter(Boolean);
}

function hasAllowedAdvisorPlan(subscription: FirestoreSubscriptionDoc | null): boolean {
    if (!subscription) return false;
    const allowedPlanIds = FEATURE_FLAGS.MENU_CARD_EXPORT_AI_ADVISOR_PLAN_IDS || [];
    const planTokens = [
        ...normalizePlanToken(subscription.planId),
        ...normalizePlanToken(subscription.planName),
        ...normalizePlanToken(subscription.providerPlanId),
    ];
    return allowedPlanIds.some((planId) => planTokens.includes(String(planId).toLowerCase()));
}

export const POST = withAuth(async (request: NextRequest, session) => {
    const requestId = crypto.randomUUID();
    const userId = session.user?.id || session.uId;
    const tenantId = Number(session.tId);
    const storeId = Number(session.sId);

    if (!FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT || !FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_AI_ADVISOR) {
        return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
    }

    if (!Number.isFinite(tenantId) || !Number.isFinite(storeId)) {
        logger.security('Invalid session scope - Menu Card Design Advisor', {
            ...getAIRouteSecurityContext(session, request),
            endpoint: ENDPOINT,
            requestId,
        }, 'high');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const { checkSafeMode } = await import('@lib/ops/safeMode');
        const safeModeResponse = await checkSafeMode();
        if (safeModeResponse) return safeModeResponse;

        const rateLimitResponse = await checkAIOperationLimit();
        if (rateLimitResponse) return rateLimitResponse;

        if (!verifyTenantAccess(session, tenantId, storeId, request)) {
            logger.security('Tenant Access Violation - Menu Card Design Advisor', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: ENDPOINT,
                requestId,
            }, 'critical');
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const bodyResult = await readBoundedJsonBody(
            request,
            MENU_CARD_DESIGN_ADVISOR_MAX_BODY_BYTES,
            { invalidJsonMessage: 'Invalid input' },
        );
        if (bodyResult.ok === false) return bodyResult.response;

        const rawData = bodyResult.data;

        const validation = validateAPIInput(MenuCardDesignAdvisorRequestSchema, rawData);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            logger.security('Input Validation Failed - Menu Card Design Advisor', {
                ...getAIRouteSecurityContext(session, request),
                endpoint: ENDPOINT,
                error: errorMsg,
                requestId,
            }, 'medium');
            return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
        }

        const payload = validation.data;
        const permissionError = await requireAnyStorePermission(
            request,
            session,
            [PERMISSIONS.MANAGE_MENU_SHARING, PERMISSIONS.PUBLISH_MENU, PERMISSIONS.MANAGE_MENU],
            "Menu Card design advisor",
        );
        if (permissionError) return permissionError;

        const subscription = await getActiveSubscriptionForStore(tenantId, storeId);
        if (!hasAllowedAdvisorPlan(subscription)) {
            return NextResponse.json({
                error: 'Layout suggestions are included in Pro and Premium.',
                code: 'plan_required',
                requiredPlans: FEATURE_FLAGS.MENU_CARD_EXPORT_AI_ADVISOR_PLAN_IDS,
            }, { status: 403 });
        }

        const capacityCheck = await checkAICapacity(tenantId, storeId, ACTION, 1, subscription);
        if (!capacityCheck.allowed) {
            return NextResponse.json({
                error: capacityCheck.reason === 'maintenance'
                    ? 'AI enhancements are temporarily unavailable.'
                    : 'Additional AI enhancements needed for your menu.',
                code: capacityCheck.reason,
            }, { status: 402 });
        }

        logger.info('Menu card design advisor requested', getAIRouteLogContext({
            action: ACTION,
            categoryCount: payload.sourceSummary.categoryCount,
            itemCount: payload.sourceSummary.itemCount,
            model: AI_MODEL,
            pageCount: payload.sourceSummary.pageCount,
            projectId: payload.projectId,
            requestId,
            storeId,
            tenantId,
        }));

        const startTime = Date.now();
        let response;
        try {
            response = await genAIClient.models.generateContent({
                model: AI_MODEL,
                contents: menuCardDesignAdvisorPrompt(payload),
                config: GENERATION_CONFIG,
            });
        } catch (generationError) {
            logAIRouteFailure('menu_card_design_advisor_model_call_failed', generationError, {
                action: ACTION,
                categoryCount: payload.sourceSummary.categoryCount,
                gatewayDiagnostics: getAIGatewayDiagnostics(genAIClient),
                itemCount: payload.sourceSummary.itemCount,
                model: AI_MODEL,
                pageCount: payload.sourceSummary.pageCount,
                projectId: payload.projectId,
                requestId,
                storeId,
                tenantId,
                userId,
            });
            if (generationError && typeof generationError === 'object') {
                (generationError as Record<string, unknown>).__menuCardDesignAdvisorLogged = true;
            }
            throw generationError;
        }
        const processingTime = Date.now() - startTime;

        let recommendation;
        let responseText = '';
        try {
            responseText = getResponseText(response);
            const parsed = parseJsonLikeResponse(responseText, {
                projectId: payload.projectId,
                requestId,
                storeId,
                tenantId,
                userId,
            });
            recommendation = normalizeMenuCardDesignAdvice(parsed, {
                preset: payload.currentSettings.preset || 'home_print',
                styleId: payload.currentSettings.styleId || 'classic',
                density: payload.currentSettings.density || 'balanced',
                includeDescriptions: Boolean(payload.currentSettings.includeDescriptions),
                includeQr: Boolean(payload.currentSettings.includeQr),
                includeContactBlock: Boolean(payload.currentSettings.includeContactBlock),
            });
            if (recommendation.preset === 'print_shop_packet' && !FEATURE_FLAGS.ENABLE_MENU_CARD_EXPORT_PRINT_SHOP) {
                recommendation = {
                    ...recommendation,
                    preset: 'home_print',
                    ownerNote: 'Layout suggestion is ready for home print.',
                };
            }
        } catch (parseError) {
            logAIRouteFailure('menu_card_design_advisor_invalid_json', parseError, {
                action: ACTION,
                model: AI_MODEL,
                responseTextLength: responseText.length,
                requestId,
                responseUsage: response.usageMetadata || null,
                storeId,
                tenantId,
                userId,
            });
            return NextResponse.json({ error: 'Layout suggestion failed' }, { status: 500 });
        }

        const unitsConsumed = getUnitCost(ACTION);
        let remainingBalance = null;
        let transactionId: string | null = null;

        try {
            const accounting = await finalizeAiOperationAccounting({
                capacitySubscription: capacityCheck.subscription,
                context: {
                    endpoint: ENDPOINT,
                    projectId: payload.projectId,
                    requestId,
                    storeId,
                    tenantId,
                    userId,
                },
                input: {
                    action: ACTION,
                    billingMode: 'billable',
                    chargePerCredit: CHARGE_PER_CREDIT,
                    clientResponse: getMenuCardDesignAdvisorClientResponseSummary(recommendation),
                    generationConfig: { responseMimeType: 'application/json', temperature: 0.35, topP: 0.8, topK: 30 },
                    geminiResponse: response,
                    model: AI_MODEL,
                    processingTime,
                    projectId: payload.projectId,
                    promptTokenCount: response.usageMetadata?.promptTokenCount || 0,
                    candidatesTokenCount: response.usageMetadata?.candidatesTokenCount || 0,
                    totalTokenCount: response.usageMetadata?.totalTokenCount || 0,
                    tokenPerCredit: TOKENS_PER_CREDIT,
                    totalCredits: ((response.usageMetadata?.totalTokenCount || 0) / TOKENS_PER_CREDIT),
                    totalCharge: CHARGE_PER_CREDIT * ((response.usageMetadata?.totalTokenCount || 0) / TOKENS_PER_CREDIT),
                    unitsConsumed,
                    realCostPaise: getRealCostPaise(ACTION),
                    ourChargePaise: getOurChargePaise(ACTION),
                    source: 'menu_card_export_design_advisor',
                    sourceHash: payload.sourceHash,
                },
                logLabel: 'Menu card design advisor',
                session,
            });
            transactionId = accounting.transactionId;
            remainingBalance = accounting.remainingBalance;
        } catch (transactionError) {
            logAIRouteFailure('menu_card_design_advisor_accounting_failed', transactionError, {
                endpoint: ENDPOINT,
                projectId: payload.projectId,
                requestId,
                storeId,
                tenantId,
                userId,
            });
            if (transactionError && typeof transactionError === 'object') {
                (transactionError as Record<string, unknown>).__menuCardDesignAdvisorLogged = true;
            }
            throw transactionError;
        }

        return NextResponse.json({
            success: true,
            recommendation,
            remainingBalance,
            transaction: {
                transactionId,
                unitsConsumed,
                processingTime,
            },
        }, { status: 200 });
    } catch (error) {
        if (!(error && typeof error === 'object' && '__menuCardDesignAdvisorLogged' in error)) {
            logAIRouteFailure('menu_card_design_advisor_api_failed', error, {
                action: ACTION,
                endpoint: ENDPOINT,
                gatewayDiagnostics: getAIGatewayDiagnostics(genAIClient),
                model: AI_MODEL,
                requestId,
                storeId,
                tenantId,
                userId,
            });
        }
        return NextResponse.json({ error: 'Layout suggestion failed' }, { status: 500 });
    }
});

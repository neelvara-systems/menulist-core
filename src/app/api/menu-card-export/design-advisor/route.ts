export const dynamic = 'force-dynamic';

import { FEATURE_FLAGS } from '@config/features';
import { getModelName } from '@constant/AI/models';
import { getOurChargePaise, getRealCostPaise, getUnitCost } from '@constant/AI/unitCosts';
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from '@constant/common';
import { getActiveSubscriptionForStore } from '@database/subscriptions/server';
import { HarmBlockThreshold, HarmCategory } from '@google/genai';
import { checkAICapacity, consumeAICapacity } from '@lib/ai/capacityCheck';
import { recordAiOperationForSession } from '@lib/ai/operationLog';
import { getAIGatewayDiagnostics, getAIErrorDiagnostics, getPreviewText } from '@lib/google/genAi/diagnostics';
import { genAIClient } from '@lib/google/genAi';
import { logger } from '@lib/monitoring/logger';
import { checkAIOperationLimit } from '@lib/rateLimit/helpers';
import { validateAPIInput } from '@lib/security/inputValidation';
import { buildSecurityContext } from '@lib/security/securityContext';
import { normalizeMenuCardDesignAdvice } from '@lib/menu-card-export/ai/designAdvisor';
import { MenuCardDesignAdvisorRequestSchema } from '@lib/validation/apiSchemas';
import { FirestoreSubscriptionDoc } from '@type/razorpay';
import { NextRequest, NextResponse } from 'next/server';
import { verifyTenantAccess, withAuth } from '../../../../middleware/auth';
import menuCardDesignAdvisorPrompt, { menuCardDesignAdvisorSystemInstruction } from './prompt';

const ACTION = AI_ACTIONS_TYPES.MENU_CARD_EXPORT_DESIGN_ADVISOR;
const AI_MODEL = getModelName('DESCRIPTION_GENERATION');
const ENDPOINT = '/api/menu-card-export/design-advisor';
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

function getResponseText(response: any): string {
    return String(
        response?.text
        || response?.candidates?.[0]?.content?.parts?.map((part: any) => part?.text || '').join('')
        || '',
    ).trim();
}

function parseJsonLikeResponse(rawText: string): unknown {
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
            ...buildSecurityContext(session, request),
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
                ...buildSecurityContext(session, request),
                endpoint: ENDPOINT,
                requestId,
            }, 'critical');
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        let rawData: unknown;
        try {
            rawData = await request.json();
        } catch {
            return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
        }

        const validation = validateAPIInput(MenuCardDesignAdvisorRequestSchema, rawData);
        if (!validation.success) {
            const errorMsg = 'error' in validation ? validation.error : 'Invalid input';
            logger.security('Input Validation Failed - Menu Card Design Advisor', {
                ...buildSecurityContext(session, request),
                endpoint: ENDPOINT,
                error: errorMsg,
                requestId,
            }, 'medium');
            return NextResponse.json({ error: 'Invalid input', details: errorMsg }, { status: 400 });
        }

        const payload = validation.data;
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

        logger.info('Menu card design advisor requested', {
            action: ACTION,
            categoryCount: payload.sourceSummary.categoryCount,
            itemCount: payload.sourceSummary.itemCount,
            model: AI_MODEL,
            pageCount: payload.sourceSummary.pageCount,
            projectId: payload.projectId,
            requestId,
            storeId,
            tenantId,
        });

        const startTime = Date.now();
        const response = await genAIClient.models.generateContent({
            model: AI_MODEL,
            contents: menuCardDesignAdvisorPrompt(payload),
            config: GENERATION_CONFIG,
        });
        const processingTime = Date.now() - startTime;

        let recommendation;
        try {
            const parsed = parseJsonLikeResponse(getResponseText(response));
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
            logger.error('Menu card design advisor returned invalid JSON', parseError, {
                action: ACTION,
                model: AI_MODEL,
                rawTextPreview: getPreviewText(getResponseText(response), 400),
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
            transactionId = await recordAiOperationForSession(session, {
                action: ACTION,
                billingMode: 'billable',
                chargePerCredit: CHARGE_PER_CREDIT,
                clientResponse: recommendation,
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
            });
            if (capacityCheck.subscription && unitsConsumed > 0) {
                remainingBalance = await consumeAICapacity(capacityCheck.subscription, unitsConsumed);
            }
        } catch (transactionError) {
            logger.error('Failed to record menu card design advisor transaction', transactionError, {
                endpoint: ENDPOINT,
                projectId: payload.projectId,
                requestId,
                storeId,
                tenantId,
                userId,
            });
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
        logger.error('Menu card design advisor API error', error, {
            action: ACTION,
            endpoint: ENDPOINT,
            gatewayDiagnostics: getAIGatewayDiagnostics(genAIClient),
            model: AI_MODEL,
            requestId,
            ...getAIErrorDiagnostics(error),
            storeId,
            tenantId,
            userId,
        });
        return NextResponse.json({ error: 'Layout suggestion failed' }, { status: 500 });
    }
});

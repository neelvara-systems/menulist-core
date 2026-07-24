export const dynamic = 'force-dynamic';
/**
 * Review Reply Suggestion API
 *
 * POST /api/reviews/suggest — Generate AI reply for a pasted review
 *
 * Dormant reply-assist endpoint. Owner-pasted review suggestions stay disabled
 * until the reviews reputation parent flag and GBP-backed ingestion are enabled.
 *
 * @see __docs__/reputation-protection/reputation-protection_impl.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { GEMINI_MODELS } from '@constant/AI/models';
import { AI_ACTIONS_TYPES, CHARGE_PER_CREDIT, TOKENS_PER_CREDIT } from '@constant/common';
import { getOurChargePaise, getRealCostPaise, getUnitCost } from '@constant/AI/unitCosts';
import { PERMISSIONS } from '@constant/permissions';
import { finalizeAiOperationAccounting } from '@lib/ai/accounting';
import {
    checkAICapacity,
    refundAiCapacityReservationSafely,
    reserveAiCapacity,
} from '@lib/ai/capacityCheck';
import { genAIClient } from '@lib/google/genAi';
import { getAIRouteSecurityContext } from '@lib/google/genAi/diagnostics';
import { requireAnyStorePermission } from '@lib/permissions/server';
import { checkRateLimit } from '@lib/rateLimit';
import { readBoundedJsonBody } from '@lib/security/boundedRequestBody';
import { getSafeZodValidationDetails } from '@lib/security/inputValidation';
import { logger } from '@lib/monitoring/logger';
import { getBoundedRuntimeStringContext, logRuntimeFailure } from '@lib/runtime/runtimeDiagnostics';
import { NextRequest, NextResponse } from 'next/server';
import { hashPublicRateLimitValue } from 'src/middleware/publicApi';
import { z } from 'zod';
import { verifyTenantAccess, withAuth } from '../../../../middleware/auth';

const REVIEW_PROMPT_TEXT_MAX_LENGTH = 2000;
const REVIEW_BUSINESS_TYPE_MAX_LENGTH = 80;

const SuggestSchema = z.object({
    reviewText: z.string().min(1).max(REVIEW_PROMPT_TEXT_MAX_LENGTH),
    rating: z.number().int().min(1).max(5),
    businessType: z.string().max(REVIEW_BUSINESS_TYPE_MAX_LENGTH).optional(),
});

const REPLY_SYSTEM_PROMPT = `You are writing a public reply to a customer review on behalf of a business.

Your goal is to produce a calm, professional, and respectful response that improves public perception of the business.

STRICT RULES:

- Keep the reply between 2 to 4 sentences.
- Use simple, clear language.
- Do not use emojis.
- Do not use excessive enthusiasm or exclamation marks.
- Do not be defensive or argumentative.
- Do not blame the customer or staff.
- Do not over-apologize (avoid phrases like "we sincerely apologize" or "this is unacceptable").
- Do not make guarantees or promises you cannot verify.
- Do not mention policies, legal language, or internal processes.
- Do not ask for reviews or ratings.

STYLE:

- Stay calm, neutral, and professional.
- Acknowledge the feedback specifically (not generic).
- Maintain dignity even if the review is harsh or unfair.
- Close the response politely (invite them back or offer contact if appropriate).

STRUCTURE BASED ON RATING:

If rating is 4 or 5:
- Thank the customer
- Reference something they appreciated
- Close positively

If rating is 3:
- Acknowledge both positive and negative aspects (if present)
- Indicate improvement intent
- Close politely

If rating is 1 or 2:
- Acknowledge the concern
- Stay composed and non-defensive
- Indicate the issue will be looked into
- Optionally offer to continue the conversation offline`;

// Industry-specific constraint modifiers (minimal — keeps core prompt universal)
const INDUSTRY_CONSTRAINTS: Record<string, string> = {
    'healthcare': '\n\nADDITIONAL: Never suggest medical advice. Never comment on diagnosis or treatment. Use "please contact us directly" instead of "we hope to see you again".',
    'clinic': '\n\nADDITIONAL: Never suggest medical advice. Never comment on diagnosis or treatment. Use "please contact us directly" instead of "we hope to see you again".',
    'salon': '\n\nADDITIONAL: Avoid implying blame on individual staff. Use "we\'ll review this with our team" instead of "we\'ll address this with our staff".',
    'spa': '\n\nADDITIONAL: Avoid implying blame on individual staff. Use "we\'ll review this with our team" instead of "we\'ll address this with our staff".',
    'gym': '\n\nADDITIONAL: Avoid performance claims or transformation language. Stay neutral.',
    'fitness': '\n\nADDITIONAL: Avoid performance claims or transformation language. Stay neutral.',
    'hotel': '\n\nADDITIONAL: Slightly warmer tone acceptable, but still controlled. Include "we appreciate you staying with us" when relevant.',
    'hospitality': '\n\nADDITIONAL: Slightly warmer tone acceptable, but still controlled. Include "we appreciate you staying with us" when relevant.',
};

// Forbidden phrases — if output contains these, use fallback
const FORBIDDEN_PHRASES = [
    'we sincerely apologize',
    'this is unacceptable',
    'we guarantee',
    '100%',
];

// Fallback templates — used when AI output fails validation
const FALLBACK_REPLIES: Record<string, string> = {
    positive: 'Thank you for your kind words. We\'re glad you had a good experience and appreciate your support. We look forward to welcoming you again.',
    negative: 'Thank you for your feedback. We\'re sorry your experience didn\'t meet expectations and will take this into account as we improve. We hope to have the opportunity to serve you better.',
    neutral: 'Thank you for sharing your feedback. We appreciate you taking the time and are always working to improve. We hope to serve you better on your next visit.',
};

const ACTION = AI_ACTIONS_TYPES.REVIEW_REPLY_SUGGESTION;
const AI_MODEL = GEMINI_MODELS.TEXT_GEN;
const REVIEW_SUGGEST_MAX_BODY_BYTES = 16 * 1024;

function sanitizeReviewPromptText(value: unknown, maxLength = REVIEW_PROMPT_TEXT_MAX_LENGTH) {
    if (typeof value !== 'string') return '';

    return value
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/[{}<>`$\\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength)
        .trim();
}

function getReviewSuggestLogContext(
    session: any,
    metadata: {
        businessType?: unknown;
        rating?: unknown;
        usedFallback?: boolean;
    } = {},
) {
    return {
        endpoint: '/api/reviews/suggest',
        ...getBoundedRuntimeStringContext('tenantId', session.tId),
        ...getBoundedRuntimeStringContext('storeId', session.sId),
        ...getBoundedRuntimeStringContext('userId', session.uId),
        ...getBoundedRuntimeStringContext('businessType', metadata.businessType),
        rating: typeof metadata.rating === 'number' ? metadata.rating : null,
        usedFallback: Boolean(metadata.usedFallback),
    };
}

function getReviewReplyClientResponseSummary({
    rating,
    reply,
    source,
}: {
    rating: number;
    reply: string;
    source: 'ai' | 'fallback';
}) {
    return {
        hasReply: reply.trim().length > 0,
        rating,
        replyLength: reply.length,
        responseShape: 'object',
        responseSummaryKind: 'review_reply_suggestion',
        source,
    };
}

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_REVIEWS_REPUTATION || !FEATURE_FLAGS.ENABLE_AI_REPLY_ASSIST) {
        return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
    }

    const { checkSafeMode } = await import('@lib/ops/safeMode');
    const safeModeResponse = await checkSafeMode();
    if (safeModeResponse) return safeModeResponse;

    // Rate limiting — 10 suggestions per minute per user
    const userRateLimitHash = hashPublicRateLimitValue(session.uId);
    const rateLimitResult = await checkRateLimit({
        key: `review-suggest:${userRateLimitHash}`,
        limit: 10,
        window: 60,
    });
    if (!rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again in a minute.' },
            { status: 429 },
        );
    }

    if (!verifyTenantAccess(session, session.tId, session.sId, request)) {
        logger.security('Tenant Access Violation - Review Suggest API', {
            ...getAIRouteSecurityContext(session, request),
            endpoint: '/api/reviews/suggest',
        }, 'critical');
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const bodyResult = await readBoundedJsonBody(request, REVIEW_SUGGEST_MAX_BODY_BYTES);
    if (bodyResult.ok === false) return bodyResult.response;

    const validation = SuggestSchema.safeParse(bodyResult.data);
    if (!validation.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: getSafeZodValidationDetails(validation.error) },
            { status: 400 },
        );
    }

    const { reviewText, rating, businessType } = validation.data;
    const promptReviewText = sanitizeReviewPromptText(reviewText, REVIEW_PROMPT_TEXT_MAX_LENGTH);
    const promptBusinessType = sanitizeReviewPromptText(businessType, REVIEW_BUSINESS_TYPE_MAX_LENGTH);
    if (!promptReviewText) {
        return NextResponse.json({ error: 'Validation failed' }, { status: 400 });
    }

    const permissionError = await requireAnyStorePermission(
        request,
        session,
        [PERMISSIONS.MANAGE_FEEDBACK],
        'Review reply',
    );
    if (permissionError) return permissionError;

    const capacityCheck = await checkAICapacity(session.tId, session.sId, ACTION);
    if (!capacityCheck.allowed) {
        return NextResponse.json({
            error: capacityCheck.reason === 'maintenance'
                ? 'AI enhancements are temporarily unavailable.'
                : 'Additional AI enhancements needed for your menu.',
            code: capacityCheck.reason,
        }, { status: 402 });
    }

    // Build prompt with optional industry constraints
    let systemPrompt = REPLY_SYSTEM_PROMPT;
    if (promptBusinessType) {
        const normalizedType = promptBusinessType.toLowerCase();
        for (const [key, constraint] of Object.entries(INDUSTRY_CONSTRAINTS)) {
            if (normalizedType.includes(key)) {
                systemPrompt += constraint;
                break;
            }
        }
    }

    const userPrompt = `INPUT REVIEW:\n${JSON.stringify(promptReviewText)}\n\nRATING:\n${rating}\n\nNow write the reply.`;
    let capacityReservation: Awaited<ReturnType<typeof reserveAiCapacity>> | null = await reserveAiCapacity({
        action: ACTION,
        pId: session.pId ?? session.user?.pId ?? session.user?.productId,
        sId: session.sId,
        source: '/api/reviews/suggest',
        subscription: capacityCheck.subscription!,
        tId: session.tId,
        uId: session.uId ?? session.user?.id,
        unitsToReserve: capacityCheck.unitsRequired,
    });

    try {
        const startTime = Date.now();
        const model = genAIClient.models;
        const result = await model.generateContent({
            model: AI_MODEL,
            contents: userPrompt,
            config: {
                systemInstruction: systemPrompt,
                maxOutputTokens: 200,
                temperature: 0.7,
            },
        });
        const processingTime = Date.now() - startTime;

        let reply = result.text?.trim() || '';

        // Strip quotes if AI wrapped in quotes
        if (reply.startsWith('"') && reply.endsWith('"')) {
            reply = reply.slice(1, -1);
        }

        // Validate output — check for forbidden phrases
        const hasForbidden = FORBIDDEN_PHRASES.some(phrase =>
            reply.toLowerCase().includes(phrase.toLowerCase())
        );

        let usedFallback = false;
        if (!reply || reply.length < 20 || reply.length > 500 || hasForbidden) {
            // Use fallback
            const category = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';
            reply = FALLBACK_REPLIES[category];
            usedFallback = true;
        }

        const unitsConsumed = getUnitCost(ACTION);
        let remainingBalance = null;
        let transactionId: string | null = null;
        try {
            const accounting = await finalizeAiOperationAccounting({
                capacityReservation,
                capacitySubscription: capacityCheck.subscription,
                context: {
                    endpoint: '/api/reviews/suggest',
                    rating,
                    userId: session.uId,
                },
                input: {
                    action: ACTION,
                    billingMode: 'billable',
                    chargePerCredit: CHARGE_PER_CREDIT,
                    clientResponse: getReviewReplyClientResponseSummary({
                        rating,
                        reply,
                        source: usedFallback ? 'fallback' : 'ai',
                    }),
                    geminiResponse: result,
                    model: AI_MODEL,
                    processingTime,
                    tokenPerCredit: TOKENS_PER_CREDIT,
                    unitsConsumed,
                    realCostPaise: getRealCostPaise(ACTION),
                    ourChargePaise: getOurChargePaise(ACTION),
                },
                logLabel: 'Review reply suggestion',
                session,
            });
            capacityReservation = null;
            transactionId = accounting.transactionId;
            remainingBalance = accounting.remainingBalance;
        } catch (transactionError) {
            logRuntimeFailure('review_reply_accounting_failed', transactionError, getReviewSuggestLogContext(session, {
                businessType: promptBusinessType,
                rating,
                usedFallback,
            }));
            return NextResponse.json({ error: 'Review reply accounting failed' }, { status: 500 });
        }

        return NextResponse.json({
            success: true,
            reply,
            source: usedFallback ? 'fallback' : 'ai',
            remainingBalance,
            transaction: {
                transactionId,
                unitsConsumed,
            },
        });
    } catch (error) {
        // AI failure — return fallback
        const category = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';
        logRuntimeFailure('review_reply_generation_failed', error, getReviewSuggestLogContext(session, {
            businessType: promptBusinessType,
            rating,
            usedFallback: true,
        }));
        return NextResponse.json({
            success: true,
            reply: FALLBACK_REPLIES[category],
            source: 'fallback',
        });
    } finally {
        await refundAiCapacityReservationSafely(capacityReservation, 'review_reply_request_did_not_settle', {
            endpoint: '/api/reviews/suggest',
        });
    }
});

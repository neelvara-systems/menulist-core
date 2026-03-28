export const dynamic = 'force-dynamic';
/**
 * Review Reply Suggestion API
 *
 * POST /api/reviews/suggest — Generate AI reply for a pasted review
 *
 * Standalone tool: works WITHOUT GBP API.
 * Owner pastes review text + rating → gets professional reply suggestion.
 *
 * @see __docs__/reputation-protection/reputation-protection_impl.md
 */

import { FEATURE_FLAGS } from '@config/features';
import { genAIClient } from '@lib/google/genAi';
import { checkRateLimit } from '@lib/rateLimit';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '../../../../middleware/auth';

const SuggestSchema = z.object({
    reviewText: z.string().min(1).max(2000),
    rating: z.number().int().min(1).max(5),
    businessType: z.string().optional(),
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

export const POST = withAuth(async (request: NextRequest, session) => {
    if (!FEATURE_FLAGS.ENABLE_AI_REPLY_ASSIST) {
        return NextResponse.json({ error: 'Feature disabled' }, { status: 404 });
    }

    // Rate limiting — 10 suggestions per minute per user
    const rateLimitResult = await checkRateLimit({
        key: `review-suggest:${session.uId}`,
        limit: 10,
        window: 60,
    });
    if (!rateLimitResult.allowed) {
        return NextResponse.json(
            { error: 'Rate limit exceeded. Please try again in a minute.' },
            { status: 429 },
        );
    }

    const body = await request.json();
    const validation = SuggestSchema.safeParse(body);
    if (!validation.success) {
        return NextResponse.json(
            { error: 'Validation failed', details: validation.error.flatten() },
            { status: 400 },
        );
    }

    const { reviewText, rating, businessType } = validation.data;

    // Build prompt with optional industry constraints
    let systemPrompt = REPLY_SYSTEM_PROMPT;
    if (businessType) {
        const normalizedType = businessType.toLowerCase();
        for (const [key, constraint] of Object.entries(INDUSTRY_CONSTRAINTS)) {
            if (normalizedType.includes(key)) {
                systemPrompt += constraint;
                break;
            }
        }
    }

    const userPrompt = `INPUT REVIEW:\n"${reviewText.slice(0, 2000)}"\n\nRATING:\n${rating}\n\nNow write the reply.`;

    try {
        const model = genAIClient.models;
        const result = await model.generateContent({
            model: 'gemini-2.0-flash',
            contents: userPrompt,
            config: {
                systemInstruction: systemPrompt,
                maxOutputTokens: 200,
                temperature: 0.7,
            },
        });

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

        return NextResponse.json({
            success: true,
            reply,
            source: usedFallback ? 'fallback' : 'ai',
        });
    } catch (error) {
        // AI failure — return fallback
        const category = rating >= 4 ? 'positive' : rating <= 2 ? 'negative' : 'neutral';
        return NextResponse.json({
            success: true,
            reply: FALLBACK_REPLIES[category],
            source: 'fallback',
        });
    }
});

/**
 * Forbidden Phrase Guard
 * Prevents trust-breaking language from reaching owner-facing surfaces
 * 
 * Per Strategy Doc: "If trust breaks once, the product dies"
 */

import { logger } from '@lib/monitoring/logger';
import { getBoundedLogValueContext } from '@lib/monitoring/boundedLogContext';

/**
 * Phrases that should NEVER appear in owner-facing AI outputs
 * These break the "confirmation, not analytics" principle
 */
export const FORBIDDEN_PHRASES = [
    // Analytics/Data language
    'analytics',
    'data shows',
    'based on data',
    'insights',
    'metrics',

    // Causal claims
    'worked',
    'improved',
    'increased sales',
    'boosted',
    'optimized',

    // AI/Algorithm language  
    'ai says',
    'ai recommends',
    'our algorithm',
    'recommended by ai',
    'machine learning',

    // Time-based claims
    'best time',
    'optimal time',
    'peak hours',

    // Marketing hype
    'proven to',
    'guaranteed to',
    'will increase',
    'performance',
] as const;

export interface PhraseCheckResult {
    hasForbidden: boolean;
    matches: string[];
    sanitizedText?: string;
}

/**
 * Check if text contains any forbidden phrases
 * @param text - Text to check
 * @returns Object with hasForbidden flag and matched phrases
 */
export function containsForbiddenPhrase(text: string): PhraseCheckResult {
    if (!text || typeof text !== 'string') {
        return { hasForbidden: false, matches: [] };
    }

    const lowerText = text.toLowerCase();
    const matches: string[] = [];

    for (const phrase of FORBIDDEN_PHRASES) {
        if (lowerText.includes(phrase.toLowerCase())) {
            matches.push(phrase);
        }
    }

    return {
        hasForbidden: matches.length > 0,
        matches
    };
}

/**
 * Sanitize AI output by checking for forbidden phrases
 * Returns fallback text if forbidden phrases detected
 * 
 * @param text - AI generated text
 * @param fallback - Safe fallback text to use if forbidden phrases found
 * @param context - Context for logging (e.g., 'campaign_caption', 'description')
 * @returns Original text if clean, fallback if contaminated
 */
export function sanitizeAIOutput(
    text: string,
    fallback: string,
    context: string = 'ai_output'
): string {
    const check = containsForbiddenPhrase(text);

    if (check.hasForbidden) {
        logger.security('Forbidden phrase detected in AI output', {
            ...getBoundedLogValueContext('context', context),
            matches: check.matches,
            originalLength: text.length,
        }, 'low');

        return containsForbiddenPhrase(fallback).hasForbidden
            ? "From our kitchen to you"
            : fallback;
    }

    return text;
}

/**
 * Safe fallback captions for different campaign types
 * Used when AI generates forbidden phrases
 */
export const SAFE_FALLBACK_CAPTIONS = {
    todays_special: "Today's special is ready for you",
    weekend_pick: "Perfect for your weekend",
    now_available: "Now available",
    menu_highlight: "From our menu",
    meal_push: "Ready to serve",
    bestseller_boost: "Customer favorite",
    slow_item_rescue: "Something special today",
    festival: "Celebrate with us",
    new_item: "New on our menu",
    default: "From our kitchen to you"
} as const;

/**
 * Get safe fallback caption for a campaign type
 */
export function getSafeFallbackCaption(campaignType: string): string {
    return SAFE_FALLBACK_CAPTIONS[campaignType as keyof typeof SAFE_FALLBACK_CAPTIONS]
        || SAFE_FALLBACK_CAPTIONS.default;
}

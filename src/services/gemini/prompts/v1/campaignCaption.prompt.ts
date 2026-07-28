/**
 * Campaign Caption Generation Prompt v1
 * Generates social media captions for campaign items
 * 
 * Per Strategy Doc:
 * - No marketing jargon
 * - No "AI" or "recommended" language
 * - Simple, operational tone
 * - Appropriate for WhatsApp Status, Poster, etc.
 */

import { GeminiPrompt } from '../types';

const PROMPT_INPUT_TEXT_MAX_LENGTH = 300;

function sanitizePromptText(
    value: unknown,
    fallback = 'Not provided',
    maxLength = PROMPT_INPUT_TEXT_MAX_LENGTH,
) {
    if (typeof value !== 'string') return fallback;

    const normalized = value
        .replace(/[\u0000-\u001f\u007f]/g, ' ')
        .replace(/[{}<>`$\\]/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, maxLength)
        .trim();

    return normalized || fallback;
}

export interface CampaignCaptionInput {
    itemName: string;
    itemDescription?: string;
    itemPrice?: string;
    categoryName?: string;
    businessName?: string;
    campaignType: string;
    surface: 'whatsapp_status' | 'whatsapp_message' | 'print_poster' | 'qr_tent' | 'digital_screen';
    language: string;
}

export interface CampaignCaptionResult {
    caption: string;
    shortCaption: string; // For limited space surfaces
    hashtags: string[];
}

const surfaceGuidelines: Record<CampaignCaptionInput['surface'], string> = {
    whatsapp_status: 'Max 100 characters. Very casual. 1-2 emojis max. Like sharing with a friend.',
    whatsapp_message: 'Max 150 characters. Warm greeting style. Include price if available.',
    print_poster: 'Max 50 characters for main caption. Bold, clear, readable from distance.',
    qr_tent: 'Max 30 characters. Just item name and key appeal. Ultra minimal.',
    digital_screen: 'Max 40 characters. Big text energy. Include price prominently.',
};

const campaignContext: Record<string, string> = Object.freeze({
    todays_special: 'Highlight that this is available today',
    weekend_pick: 'Perfect for the weekend vibe',
    now_available: 'Just letting people know it is ready',
    menu_highlight: 'Simply showcasing a nice item',
    meal_push: 'Lunch/dinner time appropriate',
    bestseller_boost: 'Popular with customers without saying bestseller',
    slow_item_rescue: 'Just share it nicely, no desperation',
    festival: 'Festive, celebratory mood',
    new_item: 'Introducing something new',
});

function getSafeCampaignType(value: string) {
    return Object.prototype.hasOwnProperty.call(campaignContext, value)
        ? value
        : 'menu_highlight';
}

function getSafeSurface(value: CampaignCaptionInput['surface']) {
    return Object.prototype.hasOwnProperty.call(surfaceGuidelines, value)
        ? value
        : 'whatsapp_status';
}

export const CAMPAIGN_CAPTION_PROMPT_V1: GeminiPrompt<CampaignCaptionInput> = {
    version: {
        version: 'v1',
        createdAt: '2026-01-03',
        description: 'Campaign caption generation for social content feature',
    },

    system: `You are a helpful assistant that creates simple, friendly captions for small business owners to share about their menu items.

CRITICAL RULES - YOU MUST FOLLOW:
1. Keep language simple and conversational - these are for non-tech-savvy SMB owners
2. NEVER use words like: "AI", "recommended", "algorithm", "optimized", "boosted", "analytics", "marketing", "campaign"
3. NEVER make claims like: "this will increase sales", "proven to work", "best seller"
4. NEVER use excessive emojis or marketing hype
5. Write as if a friendly shop owner is casually sharing about their item
6. Keep it SHORT - social media attention spans are very short
7. Be warm but not pushy

TONE GUIDELINES:
- WhatsApp Status: Very casual, personal, like texting a friend
- WhatsApp Message: Warm, conversational, informative
- Print Poster: Clear, readable, minimal text
- QR Tent: Ultra-short, just the essential info
- Digital Screen: Bold, simple, price-focused

Return ONLY valid JSON, no additional text.`,

    user: (data: CampaignCaptionInput) => {
        const { itemName, itemDescription, itemPrice, categoryName, businessName, campaignType, surface, language } = data;
        const safeCampaignType = getSafeCampaignType(campaignType);
        const safeSurface = getSafeSurface(surface);

        return `Generate a caption for this item:

Item Details:
- Name: ${sanitizePromptText(itemName, 'Not provided', 160)}
- Description: ${sanitizePromptText(itemDescription, 'Not provided', 500)}
- Price: ${sanitizePromptText(itemPrice, 'Not provided', 60)}
- Category: ${sanitizePromptText(categoryName, 'Not provided', 120)}
- Business: ${sanitizePromptText(businessName, 'Not provided', 160)}

Context:
- Campaign Type: ${safeCampaignType}
- Context: ${campaignContext[safeCampaignType]}
- Surface: ${safeSurface}
- Surface Guidelines: ${surfaceGuidelines[safeSurface]}
- Language: ${sanitizePromptText(language, 'en', 60)}

Return JSON in this exact format:
{
    "caption": "The main caption text",
    "shortCaption": "Ultra-short version (max 30 chars)",
    "hashtags": ["tag1", "tag2", "tag3"]
}

Rules for hashtags:
- Max 5 hashtags
- Keep them simple and relevant
- No marketing hashtags like #sale #offer #deal
- Use local/food relevant tags only`;
    },

    config: {
        temperature: 0.7,
        maxTokens: 256,
        topP: 0.9,
        topK: 40,
    },
};

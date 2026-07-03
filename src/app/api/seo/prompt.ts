import type { SeoGenerationRequest } from '@lib/validation/apiSchemas';
import { normalizeMetaText } from '@lib/seo/publicMetadata';

const PROMPT_INPUT_TEXT_MAX_LENGTH = 300;
const PROMPT_INPUT_LIST_ITEM_MAX_LENGTH = 120;
const PROMPT_INPUT_LIST_MAX_ITEMS = 20;

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

function metaTextOrFallback(value: unknown, fallback = 'Not provided', maxLength = PROMPT_INPUT_TEXT_MAX_LENGTH) {
    return sanitizePromptText(normalizeMetaText(value, fallback), fallback, maxLength);
}

function listOrFallback(items?: string[], fallback = 'Not provided') {
    const values = (items || [])
        .slice(0, PROMPT_INPUT_LIST_MAX_ITEMS)
        .map((item) => sanitizePromptText(item, '', PROMPT_INPUT_LIST_ITEM_MAX_LENGTH))
        .filter(Boolean);
    return values.length ? values.join(', ') : fallback;
}

export default function seoPrompt(payload: SeoGenerationRequest) {
    const { store, menu } = payload;

    return `Generate factual SEO and AEO metadata for this restaurant or SMB menu presence.

Rules:
- Return valid JSON only.
- Be factual. Do not invent awards, popularity, or claims not present in input.
- Keep metaTitle under 60 characters.
- Keep metaDescription under 160 characters.
- Keep tagline under 100 characters.
- keywords must be an array of 6 to 10 short phrases.
- Prefer clear business facts, cuisine/menu terms, service mode, and location.
- Generate a fresh tagline. Do not repeat the current tagline verbatim unless there is no better factual rewrite.
- Do not include quotation marks around values.
- Do not generate canonicalUrl.

Business:
- Brand name: ${sanitizePromptText(store.tenantName || store.name, 'Not provided', 120)}
- Store/location name: ${sanitizePromptText(store.name, 'Not provided', 120)}
- Business category: ${sanitizePromptText(store.businessCategory)}
- Business type: ${sanitizePromptText(store.businessType)}
- City: ${sanitizePromptText(store.city)}
- State: ${sanitizePromptText(store.state)}
- Country: ${sanitizePromptText(store.country)}
- Address line: ${sanitizePromptText(store.addressLine)}
- Existing description: ${sanitizePromptText(store.description, 'Not provided', 800)}
- Current tagline to improve or replace: ${metaTextOrFallback(store.tagline, 'Not provided', 200)}
- Current Customer App short name: ${sanitizePromptText(store.pwaShortName, 'Not provided', 40)}
- Active business attributes: ${listOrFallback(store.businessAttributes)}
- Social media handles/links: ${listOrFallback(store.socialMedia)}
- Public descriptor: ${metaTextOrFallback(store.publicPresence?.descriptor, 'Not provided', 120)}
- Known for: ${metaTextOrFallback(store.publicPresence?.knownFor, 'Not provided', 120)}
- WhatsApp number present: ${store.publicPresence?.whatsappNumber ? 'Yes' : 'No'}
- Google Maps URL present: ${store.publicPresence?.googleMapsUrl ? 'Yes' : 'No'}
- Google Review URL present: ${store.publicPresence?.googleReviewUrl ? 'Yes' : 'No'}
- Reservation URL present: ${store.publicPresence?.reservationUrl ? 'Yes' : 'No'}
- Order URL present: ${store.publicPresence?.orderUrl ? 'Yes' : 'No'}
- Established year: ${store.publicPresence?.establishedYear || 'Not provided'}

Menu:
- Project name: ${metaTextOrFallback(menu?.projectName, 'Not provided', 160)}
- Project description: ${metaTextOrFallback(menu?.projectDescription, 'Not provided', 500)}
- Categories: ${listOrFallback(menu?.categories)}
- Items: ${listOrFallback(menu?.items)}

Return JSON in exactly this shape:
{
  "metaTitle": "string",
  "metaDescription": "string",
  "tagline": "string",
  "keywords": ["string"]
}`;
}

export const seoPromptSystemInstruction = `You generate concise, factual SEO and AEO metadata for SMB business pages and menus.
Always return valid JSON.
Never invent claims, ratings, awards, or unavailable offerings.
Prefer plain language that helps search engines and answer engines understand the business quickly.`;

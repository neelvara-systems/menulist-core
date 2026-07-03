import type { BusinessCopyGenerationRequest } from '@lib/validation/apiSchemas';

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

function listOrFallback(items?: string[], fallback = 'Not provided') {
    const values = (items || [])
        .slice(0, PROMPT_INPUT_LIST_MAX_ITEMS)
        .map((item) => sanitizePromptText(item, '', PROMPT_INPUT_LIST_ITEM_MAX_LENGTH))
        .filter(Boolean);
    return values.length ? values.join(', ') : fallback;
}

function textOrFallback(value: unknown, fallback = 'Not provided', maxLength = PROMPT_INPUT_TEXT_MAX_LENGTH) {
    if (typeof value === 'string') {
        return sanitizePromptText(value, fallback, maxLength);
    }

    if (value && typeof value === 'object') {
        const candidates = Object.values(value as Record<string, unknown>)
            .filter((entry): entry is string => typeof entry === 'string')
            .map((entry) => entry.trim())
            .filter(Boolean);

        if (candidates.length > 0) {
            return sanitizePromptText(candidates[0], fallback, maxLength);
        }
    }

    return fallback;
}

export default function businessCopyPrompt(payload: BusinessCopyGenerationRequest) {
    const { store, menu, sourceLang } = payload;
    const sourceLanguageName = sanitizePromptText(sourceLang?.name, 'English', 60);
    const sourceLanguageCode = sanitizePromptText(sourceLang?.code, '', 10);

    return `Generate factual business copy for a small business public presence.

Rules:
- Return valid JSON only.
- Be factual. Do not invent awards, popularity, claims, menu items, or services not present in input.
- descriptor must be 40 characters or less.
- knownFor must be 40 characters or less.
- specialNote must be 140 characters or less.
- tagline must be 100 characters or less.
- metaTitle must be 60 characters or less.
- metaDescription must be 160 characters or less.
- pwaShortName must be 12 characters or less.
- keywords must be an array of 6 to 10 short phrases.
- Prefer clear business facts, menu truths, service modes, and location.
- Generate fresh copy. Improve existing values when possible, but do not repeat them verbatim unless there is no better factual rewrite.
- Do not include quotation marks around values.
- Do not generate canonicalUrl.
- Generate every returned value in ${sourceLanguageName}${sourceLanguageCode ? ` (${sourceLanguageCode})` : ''}.

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
- Current tagline: ${textOrFallback(store.tagline, 'Not provided', 200)}
- Current Customer App short name: ${sanitizePromptText(store.pwaShortName, 'Not provided', 40)}
- Active business attributes: ${listOrFallback(store.businessAttributes)}
- Social media handles/links: ${listOrFallback(store.socialMedia)}
- Public descriptor: ${textOrFallback(store.publicPresence?.descriptor, 'Not provided', 120)}
- Known for: ${textOrFallback(store.publicPresence?.knownFor, 'Not provided', 120)}
- Special note: ${textOrFallback(store.publicPresence?.specialNote, 'Not provided', 200)}
- WhatsApp number present: ${store.publicPresence?.whatsappNumber ? 'Yes' : 'No'}
- Google Maps URL present: ${store.publicPresence?.googleMapsUrl ? 'Yes' : 'No'}
- Google Review URL present: ${store.publicPresence?.googleReviewUrl ? 'Yes' : 'No'}
- Reservation URL present: ${store.publicPresence?.reservationUrl ? 'Yes' : 'No'}
- Order URL present: ${store.publicPresence?.orderUrl ? 'Yes' : 'No'}
- Established year: ${store.publicPresence?.establishedYear || 'Not provided'}

Menu:
- Project name: ${textOrFallback(menu?.projectName, 'Not provided', 160)}
- Project description: ${textOrFallback(menu?.projectDescription, 'Not provided', 500)}
- Categories: ${listOrFallback(menu?.categories)}
- Items: ${listOrFallback(menu?.items)}

Return JSON in exactly this shape:
{
  "descriptor": "string",
  "knownFor": "string",
  "specialNote": "string",
  "tagline": "string",
  "metaTitle": "string",
  "metaDescription": "string",
  "keywords": ["string"],
  "pwaShortName": "string"
}`;
}

export const businessCopyPromptSystemInstruction = `You generate concise, factual business copy for SMB public presence setup.
Always return valid JSON.
Never invent claims, ratings, awards, or unavailable offerings.
Prefer plain language owners can trust and customers can understand quickly.`;

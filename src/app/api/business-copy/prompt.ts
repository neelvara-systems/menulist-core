import type { BusinessCopyGenerationRequest } from '@lib/validation/apiSchemas';

function listOrFallback(items?: string[], fallback = 'Not provided') {
    return items && items.length ? items.join(', ') : fallback;
}

function textOrFallback(value: unknown, fallback = 'Not provided') {
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed || fallback;
    }

    if (value && typeof value === 'object') {
        const candidates = Object.values(value as Record<string, unknown>)
            .filter((entry): entry is string => typeof entry === 'string')
            .map((entry) => entry.trim())
            .filter(Boolean);

        if (candidates.length > 0) {
            return candidates[0];
        }
    }

    return fallback;
}

export default function businessCopyPrompt(payload: BusinessCopyGenerationRequest) {
    const { store, menu, sourceLang } = payload;

    return `Generate factual business copy for a small business public presence.

Rules:
- Return valid JSON only.
- Be factual. Do not invent awards, popularity, claims, menu items, or services not present in input.
- displayName must be 60 characters or less.
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
- Generate every returned value in ${sourceLang?.name || 'English'}${sourceLang?.code ? ` (${sourceLang.code})` : ''}.

Business:
- Name: ${store.name}
- Business category: ${store.businessCategory || 'Not provided'}
- Business type: ${store.businessType || 'Not provided'}
- City: ${store.city || 'Not provided'}
- State: ${store.state || 'Not provided'}
- Country: ${store.country || 'Not provided'}
- Address line: ${store.addressLine || 'Not provided'}
- Existing description: ${store.description || 'Not provided'}
- Current tagline: ${textOrFallback(store.tagline)}
- Current Customer App short name: ${store.pwaShortName || 'Not provided'}
- Active business attributes: ${listOrFallback(store.businessAttributes)}
- Social media handles/links: ${listOrFallback(store.socialMedia)}
- Public display name: ${textOrFallback(store.publicPresence?.displayName)}
- Public descriptor: ${textOrFallback(store.publicPresence?.descriptor)}
- Known for: ${textOrFallback(store.publicPresence?.knownFor)}
- Special note: ${textOrFallback(store.publicPresence?.specialNote)}
- WhatsApp number present: ${store.publicPresence?.whatsappNumber ? 'Yes' : 'No'}
- Google Maps URL present: ${store.publicPresence?.googleMapsUrl ? 'Yes' : 'No'}
- Google Review URL present: ${store.publicPresence?.googleReviewUrl ? 'Yes' : 'No'}
- Reservation URL present: ${store.publicPresence?.reservationUrl ? 'Yes' : 'No'}
- Order URL present: ${store.publicPresence?.orderUrl ? 'Yes' : 'No'}
- Established year: ${store.publicPresence?.establishedYear || 'Not provided'}

Menu:
- Project name: ${textOrFallback(menu?.projectName)}
- Project description: ${textOrFallback(menu?.projectDescription)}
- Categories: ${listOrFallback(menu?.categories)}
- Items: ${listOrFallback(menu?.items)}

Return JSON in exactly this shape:
{
  "displayName": "string",
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

import type { SeoGenerationRequest } from '@lib/validation/apiSchemas';

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
- Brand name: ${store.tenantName || store.name}
- Store/location name: ${store.name}
- Business category: ${store.businessCategory || 'Not provided'}
- Business type: ${store.businessType || 'Not provided'}
- City: ${store.city || 'Not provided'}
- State: ${store.state || 'Not provided'}
- Country: ${store.country || 'Not provided'}
- Address line: ${store.addressLine || 'Not provided'}
- Existing description: ${store.description || 'Not provided'}
- Current tagline to improve or replace: ${textOrFallback(store.tagline)}
- Current Customer App short name: ${store.pwaShortName || 'Not provided'}
- Active business attributes: ${listOrFallback(store.businessAttributes)}
- Social media handles/links: ${listOrFallback(store.socialMedia)}
- Public descriptor: ${textOrFallback(store.publicPresence?.descriptor)}
- Known for: ${textOrFallback(store.publicPresence?.knownFor)}
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

import type { BusinessCopyGenerationRequest } from '@lib/validation/apiSchemas';

function listOrFallback(items?: string[], fallback = 'Not provided') {
    return items && items.length ? items.join(', ') : fallback;
}

export default function businessCopyPrompt(payload: BusinessCopyGenerationRequest) {
    const { store, menu } = payload;

    return `Generate factual business copy for a small business public presence.

Rules:
- Return valid JSON only.
- Be factual. Do not invent awards, popularity, claims, menu items, or services not present in input.
- displayName must be 60 characters or less.
- descriptor must be 40 characters or less.
- knownFor must be 40 characters or less.
- tagline must be 100 characters or less.
- metaTitle must be 60 characters or less.
- metaDescription must be 160 characters or less.
- pwaShortName must be 12 characters or less.
- keywords must be an array of 6 to 10 short phrases.
- Prefer clear business facts, menu truths, service modes, and location.
- Generate fresh copy. Improve existing values when possible, but do not repeat them verbatim unless there is no better factual rewrite.
- Do not include quotation marks around values.
- Do not generate canonicalUrl.

Business:
- Name: ${store.name}
- Business category: ${store.businessCategory || 'Not provided'}
- Business type: ${store.businessType || 'Not provided'}
- City: ${store.city || 'Not provided'}
- State: ${store.state || 'Not provided'}
- Country: ${store.country || 'Not provided'}
- Address line: ${store.addressLine || 'Not provided'}
- Existing description: ${store.description || 'Not provided'}
- Current tagline: ${store.tagline || 'Not provided'}
- Current Customer App short name: ${store.pwaShortName || 'Not provided'}
- Active business attributes: ${listOrFallback(store.businessAttributes)}
- Social media handles/links: ${listOrFallback(store.socialMedia)}
- Public display name: ${store.publicPresence?.displayName || 'Not provided'}
- Public descriptor: ${store.publicPresence?.descriptor || 'Not provided'}
- Known for: ${store.publicPresence?.knownFor || 'Not provided'}
- WhatsApp number present: ${store.publicPresence?.whatsappNumber ? 'Yes' : 'No'}
- Google Maps URL present: ${store.publicPresence?.googleMapsUrl ? 'Yes' : 'No'}
- Google Review URL present: ${store.publicPresence?.googleReviewUrl ? 'Yes' : 'No'}
- Reservation URL present: ${store.publicPresence?.reservationUrl ? 'Yes' : 'No'}
- Order URL present: ${store.publicPresence?.orderUrl ? 'Yes' : 'No'}
- Established year: ${store.publicPresence?.establishedYear || 'Not provided'}

Menu:
- Project name: ${menu?.projectName || 'Not provided'}
- Project description: ${menu?.projectDescription || 'Not provided'}
- Categories: ${listOrFallback(menu?.categories)}
- Items: ${listOrFallback(menu?.items)}

Return JSON in exactly this shape:
{
  "displayName": "string",
  "descriptor": "string",
  "knownFor": "string",
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

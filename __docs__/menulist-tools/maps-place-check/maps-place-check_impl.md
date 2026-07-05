# Maps Place Check - Implementation

**Status:** Backend prototype
**Primary runtime:** Firebase Callable Function

## File Structure

```txt
functions/src/logic/mapsPlaceCheck.ts
functions/src/triggers/shared.ts
functions/src/index.ts
functions/src/constants/features.ts
src/config/features.ts
__docs__/menulist-tools/maps-place-check/
```

## Callable Contract

Function name:

```txt
mapsPlaceCheck
```

Input:

```ts
{
  tenantId: string | number;
  storeId: string | number;
  businessName: string;
  address?: string;
  latLng?: { latitude: number; longitude: number };
  languageCode?: string; // English variants only, for example "en" or "en-US"
}
```

Output:

```ts
{
  status: "needs_owner_confirmation" | "no_grounded_result";
  attributionRequired: boolean;
  checkedAt: string;
  model: string;
  candidate: {
    title?: string;
    placeId?: string;
    uri?: string;
    proposedFacts: {
      address?: string;
      openingHours?: string;
      amenities?: string[];
      paymentOptions?: string[];
      accessibility?: string[];
      serviceOptions?: string[];
    };
    sources: Array<{
      title: string;
      uri: string;
      placeId?: string;
    }>;
  } | null;
}
```

## Runtime Flow

1. `mapsPlaceCheck` callable receives the request.
2. Authentication and tenant/store access are checked in the trigger.
3. `ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK` must be enabled in Functions.
4. SAFE_MODE is checked before the provider call.
5. Upstash-backed Function rate limiting runs before the provider call.
6. `runMapsPlaceCheck` calls `genAIClient.models.generateContent` with `tools: [{ googleMaps: {} }]`.
7. The parser extracts JSON facts from the response text and Maps sources from `groundingMetadata.groundingChunks`.
8. The response is returned to the caller without raw provider response text.
9. No Firestore writes are performed.

## Model Path

Use the existing MenuList Functions GenAI gateway:

```ts
genAIClient.models.generateContent({
  model: MAPS_PLACE_CHECK_MODEL,
  contents,
  config: {
    tools: [{ googleMaps: {} }],
    toolConfig: { retrievalConfig },
    responseMimeType: "application/json"
  }
})
```

This keeps MenuList on one Functions-side AI path. Do not add `firebase/ai`, `firebase/vertexai`, or `@google-cloud/vertexai`.

The prototype remains feature-flagged off until a provider smoke test confirms Maps grounding on the pinned `@google/genai` `1.16.0` `generateContent` path or a scoped SDK migration is approved. Current Google AI Gemini API documentation defaults to the newer Interactions API for Maps grounding, while the installed SDK still exposes `googleMaps` on `generateContent`.

`languageCode` is limited to English variants because current Gemini API Maps grounding documentation says prompts and responses are English-only.

## Write Policy

Allowed in this prototype:

- return `placeId`
- return Maps URI
- return source title/URI/place ID
- return proposed facts for review

Not allowed:

- write `stores`
- write `businessEntityIndex`
- write menus, prices, reviews, ratings, availability, or hours
- persist raw Maps grounded text
- return raw provider response text
- persist review snippets or photo payloads

## Future Confirmation Flow

A later UI may add an owner/admin confirmation action. That action must be a separate write path with:

- explicit owner/admin decision
- cache invalidation for public menu and OBP if public store fields change
- source attribution in UI when Maps-grounded generated content is displayed
- capped audit metadata, not raw Maps payload storage

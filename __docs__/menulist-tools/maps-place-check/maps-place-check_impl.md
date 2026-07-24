# Maps Place Check - Implementation

**Status:** Guarded backend and owner-confirmation contract complete
**Primary runtime:** Firebase Callable Function

## File Structure

```txt
functions/src/logic/mapsPlaceCheck.ts
functions/src/triggers/shared.ts
functions/src/index.ts
functions/src/constants/features.ts
src/config/features.ts
src/lib/public-truth-tools/externalLocationIdentity.ts
src/lib/public-truth-tools/mapsPlaceCheckClient.ts
src/database/stores/index.tsx
src/types/platform/store.ts
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
7. The parser extracts bounded JSON facts from the response text and validates
   Maps source identity from `groundingMetadata.groundingChunks` without
   accepting or truncating model-parsed Place IDs or source URLs.
8. The response is returned to the caller without raw provider response text.
9. No Firestore writes are performed.

## Internal Location Identity Contract

The optional store field is provider-neutral and location-scoped:

```ts
externalLocationIdentity?: {
  schemaVersion: "menulist.external-location-identity.v1";
  bindings?: {
    google_maps?: {
      provider: "google_maps";
      providerLocationId?: string;
      providerUri?: string;
      resolution: "provider_uri" | "provider_location_id";
      confirmationStatus: "owner_confirmed";
      source: "owner_maps_link" | "maps_place_check";
      confirmedAt: string;
    };
    google_business_profile?: {
      // Same generic binding contract; current GBP runtime remains disabled.
    };
  };
}
```

The contract stores only the provider identifier/URI and confirmation metadata.
It does not store proposed address/hours, generated text, source snapshots,
reviews, ratings, photos, aliases, or match confidence.

An owner-saved Maps URI is a confirmed link binding, not a resolved Place-ID
match. Only the separately reviewed Maps Place Check candidate can create a
`provider_location_id` binding, and its Place ID plus URI must come from the
same Maps grounding source rather than model-parsed response text. There is no
bulk backfill: an existing public Maps link is mirrored only the next time the
owner explicitly saves that field.

[Google documents no maximum Place ID length](https://developers.google.com/maps/documentation/places/web-service/place-id).
MenuList therefore preserves valid IDs exactly up to a 2,048-character
application safety ceiling and rejects oversized values instead of truncating
them. `confirmedAt` supplies the freshness marker; a stored ID older than 12
months must be revalidated before a future provider-backed workflow treats it
as current.

## Confirmation and Reversal

`src/database/stores/index.tsx` owns the narrow mutation boundary:

- `confirmExternalLocationIdentity` validates the binding again, requires the
  current tenant and active owner store, requires the Maps Place Check feature
  flag, rejects deleted/blocked stores, stamps the confirmation time in the DAL,
  and transactionally writes one Google Maps provider binding. The client
  confirmation adapter independently enforces the same flag. Generic store
  updates cannot submit identity metadata and the browser path cannot
  manufacture a Google Business Profile connection.
- `clearExternalLocationIdentity` removes only the selected provider binding.
- the existing owner `publicPresence.googleMapsUrl` mutation mirrors or removes
  the `google_maps` URI binding in the same store write;
- `externalLocationIdentity` is a nested-patch field, so concurrent and
  different-provider bindings are preserved.

`src/lib/public-truth-tools/mapsPlaceCheckClient.ts` owns the guarded client
callable and explicit grounded-candidate confirmation adapter. It cannot call the
provider while `ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK` is false.

The confirmed binding stays internal and is not added to Platform Pull or public structured data.

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

The prototype remains feature-flagged off until a provider smoke test confirms Maps grounding on the pinned `@google/genai` `1.16.0` `generateContent` path or a scoped SDK migration is approved. Current Google AI Gemini API documentation defaults to the newer Interactions API for Maps grounding but still documents a `generateContent` variant, while the installed SDK exposes `googleMaps` on `generateContent`.

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

## Remaining Activation Work

A future grounded-candidate UI may call the implemented separate confirmation
path. It must:

- explicit owner/admin decision
- source attribution in UI when Maps-grounded generated content is displayed
- avoid changing canonical business fields in the identity-confirmation action
- keep provider activation behind current provider smoke, cost, SAFE_MODE,
  rate-limit, and deployment gates

Public cache invalidation remains the responsibility of a separate canonical
business-field mutation. The internal identity-only confirmation does not change
public output.

Provider smoke is necessary but not sufficient for grounded-candidate UI
release. The current embedded store binding has no cross-store uniqueness claim.
Before activation, MenuList must approve and source-gate a server-authoritative,
transaction-safe, reversible collision policy for one provider location ID
appearing on multiple stores. No speculative identity collection, alias table,
or collision queue is added while the feature remains disabled.

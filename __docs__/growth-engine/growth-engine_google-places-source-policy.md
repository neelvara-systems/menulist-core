# Growth Engine - Google Places Source Policy

**Status:** Implementation policy
**Decision date:** June 1, 2026
**Purpose:** Decide how Growth Engine may use Google Places API as a controlled source adapter for restaurant target discovery without turning Google content into MenuList truth.

---

## 1. Verdict

The pasted Google Places workflow is useful for Growth Engine, but only as a source adapter inside the owned enrichment waterfall.

Use Google Places for:

- place ID seeding
- candidate discovery
- identity matching
- limited contactability hints
- rough opportunity prioritization
- source confidence signals

Do not use Google Places for:

- durable MenuList truth
- public pages
- public artifacts
- sitemap/feed/truth-packet content
- review/photo/profile rehosting
- broad lead database export
- bypassing owner confirmation

The correct product role is:

```txt
Google Places = candidate source and identity handle
Growth Engine = evidence, scoring, routing, and distribution automation
MenuList = confirmed public menu truth
```

Provider setup belongs in [Connections And Activation Screen](./growth-engine_connections-activation-screen.md). Google Places source runs require an active `google_places` adapter, server-only API key secret ref, source policy, field-mask profile, provider budget cap, kill switch, validation run, and audit state before any request is queued.

## 2. Current Official Constraints

| Constraint | Source | Product impact |
| --- | --- | --- |
| Field masks are required for Place Details, Nearby Search, and Text Search. | https://developers.google.com/maps/documentation/places/web-service/choose-fields | Growth Engine must define named field-mask profiles. No wildcard field mask in production. |
| Field masks affect billing and latency. | https://developers.google.com/maps/documentation/places/web-service/choose-fields and https://developers.google.com/maps/documentation/places/web-service/usage-and-billing | Each Places source run needs cost preview and per-field approval. |
| Text Search (New) can return up to 60 results across pages, subject to change. | https://developers.google.com/maps/documentation/places/web-service/text-search | Query planning must shard by city/category/grid and avoid assuming complete market coverage from one query. |
| Place Details (New) uses place ID and field masks; phone, website, ratings, opening hours, and reviews are richer fields. | https://developers.google.com/maps/documentation/places/web-service/place-details | Deep enrichment should run only after filtering/scoring, not for every seed. |
| Places API uses SKU-based pay-as-you-go billing. | https://developers.google.com/maps/documentation/places/web-service/usage-and-billing | Google Places needs provider budget caps, quota alerts, and field-tier reporting. |
| Place IDs can be stored indefinitely, but broader Places API content has caching/storage restrictions. | https://developers.google.com/maps/documentation/places/web-service/policies | Persist `placeId`; do not persist Google content as canonical or public truth. |
| Places API output has attribution/display requirements. | https://developers.google.com/maps/documentation/places/web-service/policies | If Google content is displayed internally, show required attribution. Do not show it as MenuList-owned truth. |

## 3. Source Adapter Decision

Add `google_places` as an approved source-provider option only after source policy approval.

Required source policy:

```ts
{
  provider: 'google_places',
  allowedUse: 'candidate_discovery',
  allowedFields: [
    'places.id',
    'places.name',
    'nextPageToken',
    'id',
    'formattedAddress',
    'types',
    'businessStatus',
    'displayName',
    'websiteUri',
    'nationalPhoneNumber',
    'internationalPhoneNumber',
    'rating',
    'userRatingCount',
    'regularOpeningHours'
  ],
  blockedFields: [
    'photos',
    'reviews',
    'reviewSummary',
    'generativeSummary',
    'editorialSummary'
  ],
  rawPayloadRetentionDays: 0,
  mayUseForOutreach: false,
  mayUseInArtifact: false
}
```

Notes:

- `rawPayloadRetentionDays: 0` means no durable raw Places response by default. If legal/compliance approves short operational retention, store only a TTL-bound encrypted Storage object with request ID, field mask, response hash, and attribution metadata.
- `mayUseForOutreach: false` means Google Places alone cannot make a target contactable. It can route to owned website/contact checks.
- `mayUseInArtifact: false` means Google facts do not appear in private claim artifacts unless a separate policy explicitly approves a field and attribution handling.

## 4. Cost-Safe Workflow

Use a two-level approach.

### Level A: Seed Discovery

Goal: get candidate handles cheaply.

Default Text Search field mask:

```txt
places.id,places.name,nextPageToken
```

Allowed controls:

- `includedType` for restaurant-like categories where applicable
- city/location query
- `pageSize` up to provider policy limit
- query cap per city/category
- max total results per run
- cost estimate before execution

Output:

- `googlePlaceId`
- `placeResourceName`
- query metadata
- source run ID
- field mask used
- fetched timestamp
- no durable Google business facts

### Level B: Selective Details Enrichment

Goal: enrich only targets that passed dedupe, source policy, and preliminary opportunity checks.

Allowed detail masks by profile:

| Profile | Field mask | Use |
| --- | --- | --- |
| `identity_essentials` | `id,formattedAddress,types` | Resolve location identity and type. |
| `identity_with_name` | `id,displayName,formattedAddress,types,primaryType,businessStatus` | Human/operator review or dedupe when name is needed. |
| `contactability_check` | `id,websiteUri,nationalPhoneNumber,internationalPhoneNumber` | Decide whether to inspect owned website/contact channels. |
| `opportunity_signal` | `id,websiteUri,rating,userRatingCount,regularOpeningHours,businessStatus` | High-level prioritization after target is already eligible. |

Blocked detail masks:

- `*`
- `photos`
- `reviews`
- `reviewSummary`
- `generativeSummary`
- `editorialSummary`
- any field not approved in the source policy

## 5. Opportunity Detection Rule

Google can help answer:

- Does a restaurant-like place exist?
- Is there a place ID for dedupe?
- Is there a website or phone hint?
- Is the business active enough to inspect further?
- Is there enough public attention to justify a review?

Google cannot answer:

- Does the owner want MenuList?
- Who is the decision maker?
- Is the menu truth owner-confirmed?
- Is the menu outdated enough to make a public claim?
- What should be published on MenuList?

Growth Engine must use Google only to decide where to inspect next.

MenuList opportunity must come from allowed first-party, owner-site, owner-provided, or verified MenuList evidence.

## 6. Data Model Additions

```ts
type GrowthGooglePlacesSourceRun = {
  sourceRunId: string;
  sourcePolicyId: string;
  provider: 'google_places';
  query: string;
  includedType?: string;
  regionCode?: string;
  languageCode?: string;
  fieldMask: string;
  pageSize: number;
  maxPages: number;
  estimatedSkuTier: 'ids_only' | 'essentials' | 'pro' | 'enterprise' | 'enterprise_atmosphere';
  status: 'draft' | 'queued' | 'running' | 'succeeded' | 'blocked' | 'failed';
  blockers: string[];
  createdAt: string;
  completedAt?: string;
};

type GrowthExternalPlaceIdentity = {
  targetId: string;
  provider: 'google_places';
  externalPlaceId: string;
  resourceName?: string;
  lastCheckedAt: string;
  sourceRunId: string;
  fieldMaskUsed: string;
  durableContentStored: false;
};
```

## 7. Firebase And Storage Rule

Firestore may store:

- `googlePlaceId`
- resource name
- source run ID
- field mask
- request metadata
- response hash
- derived non-Google-owned decision state
- decision snapshot references

Firestore must not store:

- full Places response
- reviews
- photos
- Google profile descriptions
- Google menu data
- Google ratings as public claims
- Google contact data as canonical facts

Cloud Storage should not store raw Places responses by default. If policy approves a temporary evidence cache, the file must be encrypted, TTL-bound, not used for public output, and referenced only from internal evidence packets.

## 8. Tests

Required tests:

- Text Search source run without source policy is blocked.
- Text Search using wildcard field mask is blocked.
- Text Search requesting non-ID fields requires higher budget approval.
- Details enrichment before dedupe/pre-score is blocked.
- Details request with `photos`, `reviews`, `reviewSummary`, `generativeSummary`, or `editorialSummary` is blocked.
- `googlePlaceId` persists after raw payload expiry.
- Places content cannot be used in public surfaces, artifacts, sitemaps, feeds, or truth packets.
- Query run stops at policy result cap even if more pages exist.
- Cost estimate shows expected SKU tier before run approval.
- Missing Google attribution blocks any internal display of Places content.

## 9. Final Decision

The information is useful, and it should be adopted with a stricter policy:

```txt
Use Places IDs to discover and dedupe.
Use field masks to control cost.
Use selective Details only after pre-filtering.
Use AI to score opportunity from allowed evidence.
Use MenuList confirmation to create truth.
Never turn Google Places content into public MenuList truth.
```

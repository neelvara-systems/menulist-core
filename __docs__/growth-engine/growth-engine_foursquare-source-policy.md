# Growth Engine - Foursquare Source Policy

**Status:** Implementation policy
**Decision date:** June 1, 2026
**Purpose:** Decide whether Foursquare Places is useful for Growth Engine and define the safe product boundary.

---

## 1. Verdict

The Foursquare information is useful, but not as a direct cold-outreach source under standard pay-as-you-go API terms.

Use Foursquare for:

- POI identity matching
- category and chain intelligence
- parent/child place relationships
- source confidence and quality signals
- address/location disambiguation
- business truth graph design inspiration

Do not use Foursquare Places API pay-as-you-go data for:

- contacting listed businesses as prospective customers
- public MenuList truth
- public claim artifacts
- sitemaps, menu feeds, or truth packets
- bulk lead database export
- review/tip/photo rehosting
- bypassing owner confirmation

The product decision is:

```txt
Foursquare = graph and identity signal
Growth Engine = source policy, scoring, routing, and distribution automation
MenuList = confirmed public business truth
```

Provider setup belongs in [Connections And Activation Screen](./growth-engine_connections-activation-screen.md). Foursquare source runs require an active `foursquare_places_api` or `fsq_os_places` adapter, server-only credential ref where needed, source policy, field profile, provider budget cap, kill switch, validation run, and audit state before any request/import is queued.

## 2. Current Official Constraints

| Area | Source | Product impact |
| --- | --- | --- |
| Places API capabilities | https://docs.foursquare.com/developer/reference/places-api-overview | Foursquare supports search/data, geotagging, autocomplete, address data, and feedback workflows. Useful as a source adapter. |
| Place Search parameters | https://docs.foursquare.com/developer/reference/place-search | Search supports query, lat/long, radius, category IDs, chain IDs, fields, price, open-now/open-at, bounds, sort, and limit. Useful for controlled discovery and filtering. |
| Response fields | https://docs.foursquare.com/developer/reference/response-fields | API fields include `fsq_id`, categories, location, geocodes, chains, related places, contact fields, hours, menu, photos, stats, popularity, price, rating, tips, and venue reality signals. Growth Engine must split these into safe identity fields and blocked premium/public-claim fields. |
| Categories | https://docs.foursquare.com/data-products/docs/categories | Foursquare uses a proprietary taxonomy of 1K+ categories with category IDs and labels. Useful for MenuList target classification. |
| Chains | https://docs.foursquare.com/data-products/docs/chains | Foursquare links chain names and chain IDs to brick-and-mortar locations. Useful for multi-location and franchise identity. |
| FSQ OS Places schema | https://docs.foursquare.com/data-products/docs/places-os-data-schema | Open Source Places exposes `fsq_place_id`, name, coordinates, address, website, email, social handles, categories, `placemaker_url`, unresolved flags, and Apache 2.0 licensing. Evaluate separately from paid API terms. |
| Pricing | https://foursquare.com/pricing/ | Places API has Pro and Premium endpoint pricing. Premium fields such as tips and photos increase cost. Provider budgets and field profiles are required. |
| PAYG API terms | https://foursquare.com/legal/terms/apilicenseagreement/ | Pay-as-you-go terms require attribution, restrict bulk exposure, and prohibit using Places Data to contact businesses included in Places Data as prospective customers. |

## 3. Source Adapter Decision

Add two separate provider options:

```ts
provider: 'foursquare_places_api' | 'fsq_os_places'
```

Default approval:

| Provider | Default allowed use | Outreach eligibility |
| --- | --- | --- |
| `foursquare_places_api` | identity matching, category/chain enrichment, graph signal | Blocked unless a contract or written permission explicitly allows prospecting. |
| `fsq_os_places` | open-source POI seed and identity graph enrichment | Requires source-license review, field allowlist, and no public truth use until verified. |

Foursquare should never be treated as MenuList truth. It can only explain where to inspect next.

## 4. Field Profile Policy

### Pro Identity Profile

Allowed for identity matching and target dedupe:

```txt
fsq_id
fsq_place_id
name
categories
location
geocodes
latitude
longitude
tel
email
website
social_media
chains
store_id
related_places
date_closed
unresolved_flags
```

Use:

- detect duplicate targets
- detect chain/multi-location relationships
- identify likely restaurant subtype
- identify closed/duplicate/private/inappropriate flags
- decide whether to inspect owner website or first-party sources

### Premium Signal Profile

Blocked by default:

```txt
attributes
description
hours
hours_popular
menu
photos
place_actions
popularity
price
rating
stats
tastes
tips
veracity_rating
```

These fields may be useful, but they require explicit approval because they can increase cost, include user/content signals, or create public-claim risk.

Premium fields must not be used in public artifacts, public pages, sitemaps, feeds, or truth packets.

## 5. Foursquare Place Graph Lesson

The most useful lesson is not the API. It is the graph model.

Foursquare models places through identity and relationships:

- POI identity
- address/location
- category taxonomy
- chain membership
- parent/child places
- related places
- quality flags
- closure/merge signals
- refreshed/edited history in data products

Growth Engine should copy that pattern for MenuList:

```txt
business identity
-> location identity
-> outlet relationship
-> menu identity
-> owner claim relationship
-> canonical public surface
-> source evidence
-> distribution handoff
-> freshness state
-> attribution history
```

Do not build disconnected pages. Build durable business identities and relationships.

## 6. Business Truth Rule

The public asset is not a menu page alone.

The public asset is the MenuList Business Truth Graph:

- official menu
- official hours
- official contact
- official ordering links
- official QR/share links
- official social links
- official offers where owner-confirmed
- official locations and outlets
- official brand assets where owner-confirmed
- freshness and verification state

Growth Engine can create candidate graph edges. MenuList creates confirmed truth edges.

## 7. Data Model Additions

```ts
type GrowthFoursquareSourceRun = {
  sourceRunId: string;
  sourcePolicyId: string;
  provider: 'foursquare_places_api' | 'fsq_os_places';
  query?: string;
  ll?: string;
  radius?: number;
  near?: string;
  fsqCategoryIds?: string[];
  fsqChainIds?: string[];
  fieldsProfile: 'pro_identity' | 'premium_signal';
  limit: number;
  estimatedTier: 'pro' | 'premium';
  status: 'draft' | 'queued' | 'running' | 'succeeded' | 'blocked' | 'failed';
  blockers: string[];
  createdAt: string;
  completedAt?: string;
};

type GrowthBusinessTruthGraphNode = {
  nodeId: string;
  targetId: string;
  type: 'business' | 'location' | 'outlet' | 'menu' | 'surface' | 'source' | 'handoff' | 'claim';
  truthState: 'candidate' | 'owner_confirmed' | 'menulist_verified' | 'blocked';
  sourceRefs: string[];
  updatedAt: string;
};

type GrowthBusinessTruthGraphEdge = {
  edgeId: string;
  fromNodeId: string;
  toNodeId: string;
  relation:
    | 'same_as'
    | 'located_at'
    | 'has_outlet'
    | 'has_menu'
    | 'claimed_by'
    | 'published_as'
    | 'sourced_from'
    | 'handed_off_to'
    | 'supersedes';
  confidence: 'high' | 'medium' | 'low';
  truthState: 'candidate' | 'owner_confirmed' | 'menulist_verified' | 'blocked';
  createdAt: string;
};
```

## 8. Tests

Required tests:

- Foursquare Places API source run starts without source policy: blocked.
- Foursquare Places API source run attempts outreach eligibility under PAYG terms: blocked.
- Foursquare Places API data is used to contact a business as a prospect: test fails.
- Foursquare source run requests Premium fields without approval: blocked.
- Foursquare photos, tips, ratings, descriptions, or popularity appear in public artifacts: test fails.
- Foursquare category or chain signal creates candidate graph edge only: allowed.
- Foursquare unresolved flag `closed`, `duplicate`, `privatevenue`, or `doesnt_exist` creates hold/review: allowed.
- FSQ OS Places source run starts without license/source review: blocked.
- Foursquare content is written as MenuList truth without owner confirmation: test fails.
- Business truth graph edge with low confidence reaches public publishing: blocked.

## 9. Final Decision

The information is useful in two ways:

1. Use Foursquare as a controlled identity/category/chain graph signal.
2. Adopt the graph principle as a core Growth Engine architecture rule.

But do not use Foursquare Places API pay-as-you-go data as a cold outreach source. For that, require a separate contract, written permission, or a different source path that allows prospecting.

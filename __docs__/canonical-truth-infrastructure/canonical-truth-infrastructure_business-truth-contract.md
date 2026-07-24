# MenuList Business Truth Contract

**Status:** Frozen inventory of the current v1 source and projection boundaries  
**Last updated:** July 22, 2026  
**Owner:** MenuList  
**Scope:** Business, location, menu, offering, provenance, time, external identity, and distribution projections

## Decision

MenuList owns one owner-authorized, location-specific business record. Public
pages, QR destinations, structured data, Platform Pull responses, and future
adapters are projections of that record.

This contract consolidates the runtime that already exists. It does not create
a second canonical collection, a generic `canonicalClaim` graph, an anonymous
JSON endpoint, or a public MCP server.

## Authority Order

1. The exact active `stores/{storeId}` document owns location-scoped business
   identity, contact, hours, public-presence settings, and store lifecycle.
2. The exact active `projects/{tenantId}/{storeId}/{projectId}` document owns
   menu or offering content. The Firestore document ID is authoritative over an
   inconsistent embedded project ID.
3. A linked outlet is rendered from the approved master project plus the exact
   outlet overrides and outlet-local entries. The resolved projection is not a
   second persisted menu.
4. Owner-entered item `decisionFacts` may record source, confirmation, and
   update time. Legacy top-level item facts remain compatibility mirrors.
5. External provider evidence is never canonical business truth. A confirmed
   external-location binding identifies the exact store only; changing address,
   hours, services, menu, price, availability, or allergens remains a separate
   owner-authorized canonical mutation.

## Stable Identity

| Entity | Current identity | Contract |
| --- | --- | --- |
| MenuList product | `ML` | Internal product code; public slugs remain full names. |
| Business account | numeric tenant ID | Exact tenant document path and response identity. |
| Physical or service location | numeric `storeId` | One exact store document per MenuList location. A master and its outlets never share location identity. |
| Menu or offering list | Firestore project document ID | Stable `projectId`; linked outlet output retains the outlet project identity. |
| Category | category `id` | Stable inside the menu contract. |
| Item or service | item `id` | Stable inside the menu contract and canonical item URL. |
| Variant or attribute | attribute `id` | Stable inside its parent item. |
| External location | provider plus provider location ID | Internal, optional, owner-confirmed, reversible, non-propagating, and not a MenuList primary key. |

Names, phone numbers, coordinates, and addresses are evidence. They are not
safe merge keys. MenuList never merges two locations only because those values
look similar.

## Current Projections

| Projection | Access | Version or identity | Current boundary |
| --- | --- | --- | --- |
| Official Business Page | Anonymous public page | Canonical URL, MenuList entity ID, `dateModified` | Human-readable business truth and schema.org JSON-LD. |
| Customer menu or offering page | Anonymous public page | Project, category, item and variant IDs; canonical item URL | Visible menu truth and matching JSON-LD. |
| Platform Pull Business API | `X-API-Key` with `public:read` | `schemaVersion: "1.0"`, stable ETag | Business/location projection. Private caching and fail-closed target admission. |
| Platform Pull Menu API | `X-API-Key` with `public:read` | `schemaVersion: "1.0"`, menu version, stable ETag | Resolved published menu projection. Request timestamps do not change ETag identity. |
| Menu observation and snapshot infrastructure | Internal | Publish/menu versions and bounded snapshots | Audit and recovery evidence; not a separate public source. |
| External location identity | Internal | `menulist.external-location-identity.v1` | Exact store binding only. Excluded from OBP, JSON-LD and Platform Pull v1. |

## Time And Trust Semantics

- `modifiedOn` means the store record changed. A modification timestamp is not
  owner verification of every public fact.
- The visible OBP freshness line therefore says `Updated today` or
  `Updated {date}`. It must never translate generic `modifiedOn` into `verified`.
- `lastPublishedAt` and the menu version describe menu publication state.
- `tempStatus.expiresAt` controls temporary public status expiry.
- `decisionFacts.*.confirmed` and `decisionFacts.*.updatedAt` describe the
  specific owner-confirmed item fact when that workflow is used.
- `externalLocationIdentity.*.confirmedAt` confirms the binding decision only;
  it does not verify provider facts or all MenuList business fields.
- A future public `verified` statement requires a scoped confirmation field and
  a real owner workflow for the exact fact being described.

## Provenance Boundary

Current canonical item decision facts can retain `source`, `confirmed`, and
`updatedAt`. Platform Pull v1 deliberately exposes the approved decision value
without internal provenance metadata. The dormant generic `_provenance` utility
is not part of the active contract.

Business-level claim provenance is not generalized. Add a scoped confirmation
or effective-period field only when a real owner workflow, consumer, or legal
requirement needs it. Do not replace business fields with generic claim rows.

Allergens remain owner-confirmation-only. Automated extraction must not infer or
publish them. Ingredient evidence, variant-specific allergens, `contains`
versus precautionary statements, printable alternatives, and jurisdictional
compliance are not implied by the existing item-level allergen array.

## External Location Collision Gate

The current embedded binding prevents automatic merging and master-to-outlet
propagation, but it does not provide a server-authoritative uniqueness claim
across every store.

Therefore:

- the Maps Place Check provider path remains disabled;
- no grounded-candidate confirmation UI may be released merely because the
  provider callable passes smoke testing;
- before activation, MenuList must approve and verify a cross-store policy for
  one provider location ID appearing on more than one MenuList store;
- a collision must fail closed, remain reviewable, and be reversible;
- URI-only owner Maps links do not establish resolved Place-ID uniqueness;
- no identity registry, alias history, confidence score, or collision queue is
  created while the provider path remains disabled and no observed collision
  requires that storage.

If activation evidence later requires a uniqueness claim, it must be
server-authoritative, exact-store scoped, transaction-safe, cost documented,
and independently removable. It must not turn provider data into canonical
MenuList business truth.

## Version Policy

- Backward-compatible field additions may remain within Platform Pull `1.0`
  only when existing consumers can safely ignore them and the focused contract
  fixtures pass.
- Removing, renaming, changing meaning, changing identity, or changing a field
  from optional to required requires a new API schema version and migration
  decision.
- Internal external-location bindings version independently from public APIs.
- A public MCP or another provider adapter may only read an approved versioned
  projection. It may not become a new source of truth.

## Source Gates

```bash
npm run verify:public-business-truth
npm run verify:platform-pull-api-boundary
npm run verify:public-customer-localization
npm run verify:public-truth-check
```

These gates cover truthful freshness wording, stable response identity,
business/menu projection boundaries, linked-outlet resolution, item/variant
identity, approved fact-value projection, public localization, and the internal
provider boundary. Live API-key, authenticated owner, provider, deployed-host,
and browser/device evidence remain separate release gates.

## Explicit Non-Goals

- Public MCP server before a consumer and adapter contract are approved
- Duplicate anonymous public JSON endpoint
- Consumer restaurant or local-business discovery engine
- Google-shaped canonical domain model
- Automatic AI allergen publication
- Generic AI visibility score
- Social scheduling, inbox, or campaign suite inside MenuList

# Product Surface Contexts Firebase Notes

## Collections

### `answerlattice_productSurfaces`

Purpose: owner-managed product surface map.

Operations:

- list surfaces for current Answerlattice tenant/store: one bounded query, limit 301 so overflow above the maintained 300-surface boundary fails visibly
- create/update/archive surface: one transactional ownership read plus one document write
- owner save/archive and starter-template creation require an explicit `{ success: true, sourceChanged: true }` DAL acknowledgement before UI state, summary rebuild, reload, or success copy advances

Security:

- tenant scoped through `pId`, `tId`, and `sId`
- readable/writable by platform users or tenant users with `canManageKnowledge`
- client creates must use the deterministic `{tId}_{sId}_{key}` document ID and cannot set Knowledge Intake lineage fields
- client updates cannot change the context key, scope, product identity, lineage, creation metadata, or undeclared fields
- hard delete is not used; surfaces are archived with `active: false`

### `platformSummary/contextContent_{tId}_{sId}`

Purpose: compact read model for runtime related content.

Operations:

- runtime search/widget: one small read, server-memory cached
- rebuild: one write
- browser rebuild requests use no-store cache, same-origin credentials, and manual redirect handling before responses are capped at 64 KB and required to include a valid `summary` object before local summary state or success copy advances

Contents:

- surface metadata
- compact article refs
- compact FAQ refs
- compact changelog refs
- ticket counts only

Public runtime must not expose ticket subjects, messages, requester data, or internal notes.

### `feedback`

Purpose: owner-reviewed feedback rows that can be sorted by Product Surface.

Operations:

- owner review reads feedback through one bounded `tId+sId` query
- assigning or clearing a surface updates one feedback document
- Support Board card creation copies surface context into the card without additional reads

Surface fields:

- `contextKey`
- `surfaceId`
- `surfaceLabel`
- `surfaceAssignedBy`
- `surfaceAssignedAt`

Security stays on the existing support-control update rule for `feedback`; no separate public write path is added for surface assignment.

## Rebuild Reads

The summary rebuild endpoint uses bounded reads:

- active product surfaces: max 300, queried before the cap; row 301 rejects the rebuild
- published KB articles: max 500; row 501 rejects the rebuild
- published FAQs: max 500; row 501 rejects the rebuild
- latest changelog pages: max 3 pages
- recent support tickets: max 300, ordered by `createdOn desc` before the limit so ticket counts reflect the newest fallback activity

Feedback surface assignment does not rebuild the summary because feedback is owner-triage input, not public related-content output.

The rebuild happens on explicit management operations, not every customer page load.

Rebuild writes replace the complete `contextContent` document rather than merging the nested `surfaces` map. This removes archived/renamed entries and rejects duplicate active keys before any write. Optional compact fields are omitted instead of written as `undefined`, which keeps the payload valid for Firestore.

Cached, followed-redirect, malformed, oversized, rejected, or summary-less rebuild responses fail before owner success copy. This does not add Firestore reads/writes; it only pins the browser request boundary and validates the existing rebuild response before the browser treats the summary as refreshed.

## Indexes

Required composite indexes:

- `answerlattice_productSurfaces`: `tId`, `sId`, `active`, `priority`
- `answerlattice_productSurfaces`: `tId`, `sId`, `key`
- `supportTickets`: `tId`, `sId`, `deleted`, `createdOn desc`

## Cost Impact

Runtime cost stays low because the widget/search flow reads one compact summary instead of querying articles, FAQs, changelogs, and tickets by tag on every request.

The heavier scan is moved to owner save/manual rebuild time where freshness matters and frequency is low. The transaction ownership read adds one billed read to each product-surface create, edit, or archive; overflow detection adds one read only when a maintained cap is reached.

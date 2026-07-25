# Product Surface Contexts Implementation

## Code Ownership

Answerlattice-owned code lives under Answerlattice folders:

- `src/types/answerlattice/index.ts`
- `src/constants/answerlattice/database.ts`
- `src/database/answerlattice/productSurfaces.ts`
- `src/lib/answerlattice/productSurfaceContent.ts`
- `src/lib/answerlattice/productSurfaceContentServer.ts`
- `src/components/templates/answerlattice/productSurfaces/`
- `src/app/(answerlattice)/answerlattice/product-surfaces/page.tsx`
- `src/app/api/answerlattice/product-surfaces/rebuild-summary/route.ts`

The rebuild-summary route resolves Answerlattice session scope, uses the normalized scope directly, applies the existing per-workspace rebuild limiter before permission/rebuild work, then requires `MANAGE_KNOWLEDGE` before reading the bounded body. The body must contain the exact initiating `{tId,sId}`; `src/lib/answerlattice/productSurfaceSummaryContracts.ts` rejects malformed scope and the route returns `409` when it differs from current authority before any summary source read or write. A successful response acknowledges the same scope, and the browser validates that acknowledgement before accepting the rebuilt `platformSummary/contextContent_{tId}_{sId}`. Failure diagnostics use the fixed `answerlattice_product_surface_summary_rebuild_failed` code with bounded tenant/store metadata.

The Product Surfaces owner screen must treat `saveProductSurface()` and `archiveProductSurface()` as complete only after `src/database/answerlattice/productSurfaces.ts` returns explicit acknowledgement envelopes and `AnswerlatticeProductSurfaces` calls `assertAnswerlatticeProductSurfaceWriteSucceeded()` or `assertAnswerlatticeProductSurfaceArchiveSucceeded()`. Starter template creation uses the same write acknowledgement guard for every created surface before summary rebuild, reload, selection, or success copy continues. Answerlattice App Product Surface ID Boundary: `src/lib/answerlattice/productSurfaceIdBoundary.ts` validates owner-provided and generated surface IDs before parser output, product-surface document refs, archive refs, direct reads, and compiled-context source-version IDs. The manual/post-write summary rebuild client sends the browser request with no-store cache, same-origin credentials, and manual redirect handling, uses a 64 KB bounded JSON response parser, and rejects successful HTTP responses that do not contain a valid exact-`AL`, exact-workspace, allowlisted `summary` object.

Owner creates, edits, and archives are transaction-backed. Create fails when the deterministic `{tId}_{sId}_{key}` document already exists, update requires an existing exact-workspace document, and the context key cannot change after creation. The `id` is used only as the document address and is removed from the mutable payload before composition. Dedicated and shared Firestore rules allow only the bounded product-surface shape, forbid client-created Knowledge Intake lineage, preserve tenant/store ownership, and restrict updates to owner-editable fields plus standard mutation metadata.

Product-surface session and override scope now reuse the shared Answerlattice exact positive numeric Firestore document-ID scope helper before product-surface queries, summary document refs, or source-version markers. Explicit platform feedback-review scope overrides must be complete and exact; malformed partial overrides fail before product-surface reads instead of silently falling back to the current session. Valid owner/session product-surface reads keep the same bounded query and summary rebuild behavior.

Stored product-surface documents and `platformSummary/contextContent_{tId}_{sId}` read-model documents are not trusted only because they came from a scoped query or summary document ID. `src/lib/answerlattice/productSurfaceContent.ts` parses stored surfaces and summaries back through exact `pId=AL`, exact numeric `tId/sId`, normalized surface keys, bounded route/list fields, resolved entity IDs, bounded ticket counters, and allowlisted related article/FAQ/changelog fields before server memory cache, browser state, activation readiness, search related-content enrichment, or compiled-context fallback use. Invalid derived surfaces are skipped and the validated surface count is recomputed; malformed or cross-product summaries fail closed until rebuilt.

Summary rebuilds query active surfaces before applying the 300-surface cap, read one extra surface/article/FAQ row to detect overflow, reject duplicate active context keys, omit undefined optional nested fields, and replace the complete summary document. Complete replacement is required so archived or renamed nested surface entries cannot survive a rebuild. The owner management list also reads one extra row and refuses silent truncation when the workspace exceeds the maintained 300-surface boundary.

Client-side linked-content writers use `rebuildProductSurfaceContentSummaryWithDiagnostics()` from `src/database/answerlattice/productSurfaces.ts` after confirmed KB article, approved KB-generation publish, changelog, or ticket writes. Each caller captures the initiating workspace and passes it through the request and response acknowledgement. The helper keeps the same rebuild route and summary write path, but a workspace transition or other failed refresh logs caller-specific bounded `answerlattice_*_summary_refresh_*_failed` diagnostics and returns `false` so callers can show fixed contextual-help refresh warning copy instead of silently dropping the failure.

Shared existing surfaces receive additive fields only:

- KB article modal: `contextKeys`
- Changelog drawer: `contextKeys`
- Ticket detail: `contextKeys`
- Feedback Review: `contextKey`, `surfaceId`, `surfaceLabel` assignment
- Search/widget response: `relatedContent`

## Data Model

Collection: `answerlattice_productSurfaces`

Required fields:

- `pId`
- `tId`
- `sId`
- `key`
- `label`
- `routePatterns`
- `feature`
- `page`
- `workflow`
- `entityHints`
- `entityIds`
- `tags`
- `visibility`
- `active`
- `priority`

Read model:

- `platformSummary/contextContent_{tId}_{sId}`

The summary stores compact related article, FAQ and changelog references per surface key plus internal ticket counts. Public runtime responses expose allowlisted related content only and always zero ticket details before returning contextual help.

## Runtime Matching

Runtime context may include:

- `contextKey`
- `path`
- `title`
- `feature`
- `page`
- `workflow`
- `entityHints`
- `role` / `userRole`
- `locale`
- `plan`
- `state`
- `version`

Matching order:

1. exact `contextKey`
2. exact route pattern
3. longest matching wildcard route pattern, then global `*`
4. semantic score from feature/page/workflow
5. overlap with entity hints and tags

The winning surface can add trusted surface hints to retrieval. Target visibility is checked before selection. `path` is sanitized for deterministic surface matching but is not copied into the compact `page` slug and is not written into widget search history. `version` is normalized into the numeric canonical retrieval version boundary; plan, role, and state remain strict answer-applicability constraints. Unknown context fields are stripped by validation.

## Feedback Review Integration

`/answerlattice/feedback` loads the same surface list as the Product Surface manager. Owners can assign or clear a surface on each feedback row. This writes only compact fields to `feedback` and preserves the original submitter fields. When the owner creates a Support Board card from feedback, `relatedSurfaceId` and `relatedContextKeys` are copied into the card.

Widget search history stores only compact surface fields (`contextKey`, `surfaceFeature`, `surfacePage`, `surfaceWorkflow`) so negative widget feedback can emit context-aware support signals without persisting the full transient `AnswerlatticeContextPayload`.

## Cost Pattern

Normal widget/search request:

- At most one compact platform summary read, cached in server memory for a short TTL.
- No broad article/changelog/ticket query.
- No realtime listener.

Summary rebuild:

- Runs after owner saves a surface or linked KB/changelog/ticket content, and can also be triggered manually.
- Uses bounded queries and compact output.
- Writes one summary document.
- Linked-content refresh failures are observable through bounded diagnostics; the primary linked-content write is not rolled back.

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

The rebuild-summary route resolves Answerlattice session scope, uses the normalized scope directly, applies the existing per-workspace rebuild limiter before permission/rebuild work, then requires `MANAGE_KNOWLEDGE` before reading the bounded optional body and rebuilding `platformSummary/contextContent_{tId}_{sId}`. Failure diagnostics use the fixed `answerlattice_product_surface_summary_rebuild_failed` code with bounded tenant/store metadata.

The Product Surfaces owner screen must treat `saveProductSurface()` and `archiveProductSurface()` as complete only after `src/database/answerlattice/productSurfaces.ts` returns explicit acknowledgement envelopes and `AnswerlatticeProductSurfaces` calls `assertAnswerlatticeProductSurfaceWriteSucceeded()` or `assertAnswerlatticeProductSurfaceArchiveSucceeded()`. Starter template creation uses the same write acknowledgement guard for every created surface before summary rebuild, reload, selection, or success copy continues. Answerlattice App Product Surface ID Boundary: `src/lib/answerlattice/productSurfaceIdBoundary.ts` validates owner-provided and generated surface IDs before parser output, product-surface document refs, archive refs, direct reads, and compiled-context source-version IDs. The manual/post-write summary rebuild client sends the browser request with no-store cache, same-origin credentials, and manual redirect handling, uses a 64 KB bounded JSON response parser, and rejects successful HTTP responses that do not contain a valid `summary` object.

Product-surface session and override scope now reuse the shared Answerlattice exact positive numeric Firestore document-ID scope helper before product-surface queries, summary document refs, or source-version markers. Explicit platform feedback-review scope overrides must be complete and exact; malformed partial overrides fail before product-surface reads instead of silently falling back to the current session. Valid owner/session product-surface reads keep the same bounded query and summary rebuild behavior.

Client-side linked-content writers use `rebuildProductSurfaceContentSummaryWithDiagnostics()` from `src/database/answerlattice/productSurfaces.ts` after confirmed KB article, approved KB-generation publish, changelog, or ticket writes. The helper keeps the same rebuild route and summary write path, but failed refreshes now log caller-specific bounded `answerlattice_*_summary_refresh_*_failed` diagnostics and return `false` so callers can show fixed contextual-help refresh warning copy instead of silently dropping the failure.

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

The summary stores compact related article and changelog references per surface key plus internal ticket counts. Public runtime responses expose only articles and changelogs.

## Runtime Matching

Runtime context may include:

- `contextKey`
- `feature`
- `page`
- `workflow`
- `entityHints`
- `userRole`
- `plan`

Matching order:

1. exact `contextKey`
2. semantic score from feature/page/workflow
3. overlap with entity hints and tags

The winning surface can add trusted surface hints to retrieval. Unknown context fields are stripped by validation.

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

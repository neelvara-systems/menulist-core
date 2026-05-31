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

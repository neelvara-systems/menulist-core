# Product Surface Contexts Implementation

## Code Ownership

Canonica-owned code lives under Canonica folders:

- `src/types/canonica/index.ts`
- `src/constants/canonica/database.ts`
- `src/database/canonica/productSurfaces.ts`
- `src/lib/canonica/productSurfaceContent.ts`
- `src/lib/canonica/productSurfaceContentServer.ts`
- `src/components/templates/canonica/productSurfaces/`
- `src/app/(canonica)/canonica/product-surfaces/page.tsx`
- `src/app/api/canonica/product-surfaces/rebuild-summary/route.ts`

Shared existing surfaces receive additive fields only:

- KB article modal: `contextKeys`
- Changelog drawer: `contextKeys`
- Ticket detail: `contextKeys`
- Search/widget response: `relatedContent`

## Data Model

Collection: `canonica_productSurfaces`

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

## Cost Pattern

Normal widget/search request:

- At most one compact platform summary read, cached in server memory for a short TTL.
- No broad article/changelog/ticket query.
- No realtime listener.

Summary rebuild:

- Runs after owner saves a surface or linked KB/changelog/ticket content, and can also be triggered manually.
- Uses bounded queries and compact output.
- Writes one summary document.

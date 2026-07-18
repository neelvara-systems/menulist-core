# Asset Library - Validation

## Current Runtime

| Boundary | Evidence |
| --- | --- |
| API | Auth, CampaignCue session scope, rate limit, bounded JSON parsing, strict asset schema, and owner-safe error projection. |
| Persistence | One workspace asset document plus one audit event in one batch; no extra rights/file/usage collections. |
| File truth | Optional Storage path is workspace-scoped and object size/type are read from CampaignCue Storage before persistence. |
| Usage truth | Campaign, output, and channel references are checked against the current workspace campaign before write. |
| Read model | Every bounded asset query projects records through `assetBoundary.ts`; invalid rows are omitted and logged without raw payloads. |
| Download | Direct asset read, strict projection, blocked/fileless guard, then a 15-minute runtime signed URL from private Storage only. |

## Audit Repairs - July 13, 2026

1. Removed owner API support for arbitrary `downloadUrl` values and stopped returning persisted URLs.
2. Added strict runtime projection for document/workspace identity, enums, rights, tags, file metadata, usage refs, and Storage scope.
3. Added server verification for campaign/output/channel linkage.
4. Added authoritative Storage metadata lookup when a file path is registered.
5. Removed stale documentation claims for active upload, filters, archive/approval workflows, thumbnails, and four extra Firebase collections.
6. Added focused adversarial tests and registered them in the full CampaignCue verifier.

## Validation Evidence

- `npm run test:campaigncue-asset-boundary` passed.
- `npm run verify:campaigncue` passed, including 1,723 runtime assertions, 123 operating-loop assertions, 273 PWA assertions, the focused asset boundary suite, all CueLayers/template suites, and both Firebase rules emulators.
- `npx tsc --noEmit --pretty false` passed.
- Scoped ESLint passed for the asset boundary, schema, server, and fixture.

## Residual Risks

- Authenticated hosted owner testing requires the configured CampaignCue Firebase project and credentials.
- The active owner metadata form is not a binary upload UI; CueLayers owns the current image-upload flow.
- Archive/delete, checksum deduplication, previews, and advanced search remain deliberately absent until owner evidence and lifecycle/cost contracts exist.

# Asset Library - Validation

## Current Runtime

| Boundary | Evidence |
| --- | --- |
| API | Auth, CampaignCue session scope, rate limit, bounded JSON parsing, strict asset schema, and owner-safe error projection. |
| Persistence | One workspace asset document plus one audit event in one batch; no extra rights/file/usage collections. |
| File truth | Optional Storage path is workspace-scoped and object size/type are read from CampaignCue Storage before persistence. |
| Usage truth | Campaign, output, and channel references are checked against the current workspace campaign before write. |
| Branch authorization | Campaign-linked records retain `locationId`; local-manager list, preview, and download use one shared fail-closed filter without another Firebase read. |
| Read model | Every bounded asset query projects records through `assetBoundary.ts`; invalid rows are omitted and logged without raw payloads. |
| Download | Direct asset read, strict projection, blocked/fileless guard, then a 15-minute runtime signed URL from private Storage only. |
| Guided capture | Daily Desk tasks and Asset Library use the shared private media helper with explicit consent, local progress, and response-only overview merge. |
| Campaign Pack archive | One deterministic export asset points to the verified current ZIP generation; two object names rotate privately and signed URLs remain runtime-only. Remote QA Storage evidence is pending. |
| Visual readiness | One shared predicate requires image/logo/video type, ready state, confirmed rights, workspace Storage path, and immutable Storage generation. |

## Audit Repairs - July 13, 2026

1. Removed owner API support for arbitrary `downloadUrl` values and stopped returning persisted URLs.
2. Added strict runtime projection for document/workspace identity, enums, rights, tags, file metadata, usage refs, and Storage scope.
3. Added server verification for campaign/output/channel linkage.
4. Added authoritative Storage metadata lookup when a file path is registered.
5. Removed stale documentation claims for active upload, filters, archive/approval workflows, thumbnails, and four extra Firebase collections.
6. Added focused adversarial tests and registered them in the full CampaignCue verifier.

## Guided Media Repairs - August 10, 2026

1. Added Asset Library photo/camera and gallery/clip intake using the existing Video Studio resumable uploader.
2. Added explicit permission states and preserved `unknown` as `needs_review`.
3. Added per-type limits across browser, schema, persisted boundary, server metadata verification, and Storage rules.
4. Prevented audio, metadata-only notes, and mutable/path-only rows from satisfying photo readiness.
5. Added a bounded preview decode timeout and temporary Firebase-auth cleanup.
6. Kept mission state derived from recipes so the feature adds no collection, listener, or completion write.

## Branch Asset Repairs - August 11, 2026

1. Added server-owned `locationId` to campaign-linked Asset Library records, including the deterministic Campaign Pack cloud-copy record.
2. Rechecked campaign location and current membership inside ordinary asset registration and archive-finalize transactions.
3. Applied one shared local-manager visibility predicate to overview, list, preview, and download paths.
4. Hid campaign-linked legacy records without branch identity from local managers instead of guessing their scope.
5. Kept authorization cost-neutral by filtering the already-bounded asset result with the already-loaded workspace membership.

## Validation Evidence

- `npm run test:campaigncue-asset-boundary` passed.
- `npm run test:campaigncue-export-archive` passed 61 checks, including Asset Library branch visibility, deterministic archive registration, and freshness recheck coverage.
- `npm run verify:campaigncue` passed on August 11, 2026, including 2,192 runtime assertions, 166 operating-loop assertions, 273 PWA assertions, every focused CampaignCue suite, and both Firestore and Storage rules emulators.
- `npx tsc --noEmit --pretty false` passed.
- Scoped ESLint passed for the asset boundary, shared location filter, schema, server, archive routes/client, UI, and fixtures.
- `git diff --check` passed.

## Residual Risks

- Authenticated hosted owner testing requires the configured CampaignCue Firebase project and credentials.
- Dedicated CampaignCue QA credentials are still required for authenticated camera/gallery browser evidence and real private-object registration.
- Archive/delete, checksum deduplication, automatic moderation, and advanced search remain deliberately absent until owner evidence and lifecycle/cost contracts exist.

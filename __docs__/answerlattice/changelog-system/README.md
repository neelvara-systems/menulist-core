# Answerlattice Releases and Changelog

**Status:** Feature 11 source-hardened on 2026-07-18. Authenticated QA deployment and hosted browser evidence remain external.

This feature turns a versioned release note into a governed dependency event. A public versioned changelog entry is not merely text with a version label: it must point to an active Answerlattice release whose version, release time, workspace, and changed entities match exactly.

## Owned outcome

- Register releases in increasing version order.
- Evaluate affected approved answers for version drift during activation.
- Keep a versioned note private until release activation succeeds.
- Publish only an exact release-linked entry.
- Invalidate canonical cache, source versions, public cache, and compiled bundles.
- Exclude drafts and legacy unlinked versioned notes from every delivery path.
- Preserve owner retryability when activation fails.

## Primary flow

`draft -> release activation -> linked publication -> surface/public propagation`

Non-versioned announcements may publish without a release. Versioned public entries may not.

## Main source files

- `src/lib/answerlattice/releaseContracts.ts`
- `src/lib/answerlattice/releaseServer.ts`
- `src/lib/answerlattice/changelogContracts.ts`
- `src/lib/answerlattice/changelogServer.ts`
- `src/components/templates/platform/changelog/addEditChangelog.tsx`
- `src/lib/answerlattice/publicContentBoundary.ts`
- `src/lib/answerlattice/publicContentCache.ts`
- `src/lib/answerlattice/productSurfaceContentServer.ts`
- `src/lib/answerlattice/contextBundleBuilderServer.ts`
- `functions-answerlattice/src/answerlattice/contextBundleBuilder.ts`

## Verified boundaries

- Management mutations use authenticated server routes and `MANAGE_KNOWLEDGE` permission.
- Image upload, changelog mutation, release registration/activation, and browser settlement retain one initiating `tId/sId`; current server authority must match before persistence.
- Successful changelog and release mutations acknowledge their exact workspace and browser clients reject mismatched responses.
- Release and changelog document IDs are server-owned or validated Firestore IDs.
- A release label and its normalized integer must agree.
- Activation is leased, retryable, audited, and fail-closed.
- Public projection requires exact `AL`, tenant, and store ownership.
- Public page reads scan past draft-only physical pages within a bounded 25-page window.
- Browser reads re-enter runtime DTO validation.
- Workspace changes clear management rows, previews, editors, and obsolete async settlement before later-workspace truth can render.

## External evidence still required

- QA deployment of the changed Answerlattice context-bundle Function.
- Hosted desktop and narrow-width create, failed activation, retry, publish, unpublish, and pagination smoke.
- Real workspace verification that changed entities identify the intended answer dependencies.

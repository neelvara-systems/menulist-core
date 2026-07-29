# Answerlattice Releases and Changelog

**Status:** Feature 11 source-hardened on 2026-07-18; bounded Release Impact Guard implemented on 2026-07-29. Authenticated QA deployment and hosted browser evidence remain external.

This feature turns a versioned release note into a governed dependency event. A public versioned changelog entry is not merely text with a version label: it must point to an active Answerlattice release whose version, release time, workspace, and changed entities match exactly.

`Release Impact Guard` is an external description of the preventive owner job
inside this existing Releases and Changelog feature. It is not admitted as a
separate release-management product or data model.

## Owned outcome

- Register releases in increasing version order.
- Preview directly affected approved answers and linked Answer Tests before activation.
- Require explicit owner confirmation against a transaction-current impact fingerprint.
- Evaluate affected approved answers for version drift during activation.
- Keep a versioned note private until release activation succeeds.
- Publish only an exact release-linked entry.
- Invalidate canonical cache, source versions, public cache, and compiled bundles.
- Exclude drafts and legacy unlinked versioned notes from every delivery path.
- Preserve owner retryability when activation fails.

## Documentation Decision

- Keep the immutable release registry, changelog separation, canonical drift
  evaluation, Answer Tests release checks, and governed rollback proposals.
- Keep the implemented bounded **pre-activation support-impact preview** inside
  the existing versioned publishing flow.
- Preview only directly entity-linked active canonical answers and explicitly
  linked active Answer Tests.
- Require the activation request to match the current preview inputs; changed
  release or answer evidence must return the owner to review.
- Keep the preview advisory. It does not block deployment, approve answers,
  publish replacements, or mark a release universally support-ready.
- Validate article, procedure, product-surface, and post-release friction
  expansion with real-client mapping before development.
- Reject a parallel Release Guard workspace, change-unit store, impact-item
  queue, readiness score/state machine, scheduled answer activation, or
  release-monitoring collection.

## Primary flow

`draft -> pending release -> impact preview -> owner confirmation -> release activation -> linked publication -> surface/public propagation`

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
- Preview is private/no-store, bounded to 200 directly linked active answers,
  performs no write/provider call, and reads Answer Tests proof only when
  requested and permitted.
- Activation recomputes the fingerprint during lease claim and final
  transaction; stale previews leave the release pending and the note private.
- Public projection requires exact `AL`, tenant, and store ownership.
- Public page reads scan past draft-only physical pages within a bounded 25-page window.
- Browser reads re-enter runtime DTO validation.
- Workspace changes clear management rows, previews, editors, and obsolete async settlement before later-workspace truth can render.

## External evidence still required

- QA deployment of the changed Answerlattice context-bundle Function.
- Hosted desktop and narrow-width create, failed activation, retry, publish, unpublish, and pagination smoke.
- Real workspace verification that changed entities identify the intended answer dependencies.

## Documents

- [Specification](./changelog-system_spec.md)
- [Implementation](./changelog-system_impl.md)
- [Firebase](./changelog-system_firebase.md)
- [Mobile support](./changelog-system_mobile-support.md)
- [Help documentation](./changelog-system_helpdoc.md)
- [Marketing boundary](./changelog-system_marketing.md)
- [Website boundary](./changelog-system_website.md)
- [Test cases](./changelog-system_test-cases.md)
- [Release Impact Guard proposal validation](./changelog-system_validation.md)

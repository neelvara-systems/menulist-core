# Support Truth Change Control Validation

> Initial decision: Accepted as one bounded overlay, not four standalone features.
> Date: 2026-08-10

## Proposal Decisions

| Proposal | Decision | Reason |
| --- | --- | --- |
| Release-to-Truth Review | Extend existing Release Impact Guard | Existing release, canonical-answer, and Answer Test contracts already own the write decision |
| Source Freshness & Conflict Watch | Add direct evidence watch | Canonical answers already retain bounded source IDs; inspect only those sources |
| Cross-Surface Dependency Review | Add direct mapped-surface proof | Existing compact surface summary contains exact entity IDs and visible mapped content |
| Truth Propagation Proof | Add control-plane proof | Existing source-version and bundle-manifest documents provide deterministic evidence |

## Rejected Expansion

- Four new navigation items or dashboards.
- A release dependency collection.
- Full graph traversal or semantic dependency claims.
- Automatic source conflict detection or resolution.
- Automatic answer/document rewrites.
- Scheduled freshness scans.
- A universal release-readiness score.
- Post-release causal analytics.
- Persisted proof snapshots that duplicate existing audit and control state.

## Why This Is Now Admissible

The earlier changelog validation correctly deferred broad article, workflow, and surface dependency claims. The admitted version is narrower:

- surfaces require exact stored entity intersection;
- attached content is labeled visible mapped context, not factual dependency;
- source review follows exact canonical evidence IDs;
- distribution proof covers the existing control plane only;
- caps and missing/partial states prevent completeness claims.

## Verification Record

### Verified locally on 2026-08-10

- Strict four-part DTO and release-response parity are implemented.
- Source metadata reads are direct, capped at 50, and field-masked to identity, title, status, approval, effective/review dates, and conflict IDs; reviewer identity and governance notes are not loaded.
- Malformed legacy evidence references are counted and skipped without blocking the existing release preview.
- Product-surface and propagation proof use three existing compact documents.
- The release emulator now seeds valid surface-summary, source-version, and bundle-manifest documents and proves their ready-state projection through the real release server path.
- A maximum-valid strict preview fixture remains within the shared 256 KiB browser response cap.
- Existing release activation fingerprint and write lifecycle are unchanged.
- Knowledge Intake freshness counters reuse the already-loaded source bundle.
- `npm run verify:answerlattice-support-truth-change-control` passes.
- `npm run test:answerlattice-release-contracts` passes.
- `npm run test:answerlattice-context-bundle-version-boundary` passes.
- `npm run test:answerlattice-changelog-contracts` passes.
- `npm run test:answerlattice-release:emulator` passes against the local Firestore emulator.
- Focused ESLint passes for every changed executable file.
- `npx tsc --noEmit --pretty false` passes.
- `npm run verify:dependency-freeze` passes.
- `npm run docs:check-links` reports zero broken links; its 62 filename warnings are pre-existing video-artifact names outside this feature.
- The Answerlattice runtime-truth source verifier passes with exact feature-flag inventory parity.
- The local protected Changelog route returns HTTP 200 before auth handling and redirects signed-out browser sessions to `/signin` as expected.

### Still external

- Authenticated desktop, 768 px, and 390 px modal evidence; both available local browser sessions were signed out, so this evidence was not fabricated.
- One real workspace review with governed evidence sources and product-surface mappings.
- Vercel deployment and hosted smoke testing.

No Firebase rules, indexes, Storage rules, or Cloud Functions changed, so no Firebase deployment is required for this feature.

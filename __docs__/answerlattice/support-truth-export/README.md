# Support Truth Export

> **Status:** Implemented and locally audited
> **Feature flag:** `ENABLE_ANSWERLATTICE_SUPPORT_TRUTH_EXPORT`
> **Primary surface:** Answerlattice Settings
> **Permission:** `canExportData`

Support Truth Export creates a private, bounded JSON package of approved product-support truth. It exists for portability, customer review, and controlled downstream use without turning Answerlattice into a backup service or legal data-export platform.

## Verified Flow

```text
authorized Settings action
  -> POST /api/answerlattice/support-truth-export
  -> exact session workspace and fail-closed rate limit
  -> canExportData permission
  -> exact AL product + tenant + workspace projected reads
  -> approved/status and translation-review filters
  -> explicit citation/content projection
  -> deterministic ordering and all-or-nothing caps
  -> metadata-only server audit
  -> private no-store JSON download
```

## Included

- active/beta ontology entities;
- active canonical answers that do not require review;
- approved source IDs and reviewer-approved citations;
- active product surfaces;
- active published KB articles and reviewed translations;
- active published FAQs;
- published changelog entries with entity/release linkage;
- active release records.

## Excluded

- tickets, conversations, feedback, embeddings, secrets, raw source bodies, audit-log history, user identifiers, draft/review-required content, and unreviewed AI translations;
- workspace backup/restore state, billing records, account closure, erasure, Auth data, and Storage archives.

## Local Verification

- `npm run test:answerlattice-support-truth-export-contracts`
- `npm run test:answerlattice-governance:rules`
- `npm run test:answerlattice-governance:shared-rules`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- strict root TypeScript and focused ESLint

## Release Boundary

The current source is locally complete. Dedicated and shared rules must be deployed/read back in QA, and the authenticated browser download still needs hosted desktop/mobile proof before release evidence is complete.

## Documents

- `support-truth-export_spec.md`
- `support-truth-export_impl.md`
- `support-truth-export_firebase.md`
- `support-truth-export_helpdoc.md`
- `support-truth-export_marketing.md`
- `support-truth-export_website.md`
- `support-truth-export_mobile-support.md`
- `support-truth-export_test-cases.md`

## Version History

| Date | Version | Change |
| --- | --- | --- |
| 2026-07-20 | 1.0.0 | Completed the feature-flow audit and hardened product scope, reviewed translations, canonical citations, changelog linkage, POST-only generation, audit reservation, docs, and tests. |

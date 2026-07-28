# Support Truth Export - Specification

> **Status:** Implemented in source; hosted deployment proof pending

## Customer Job

Allow an authorized SaaS owner to obtain a portable snapshot of the approved support truth Answerlattice currently governs, without exposing operational conversations or pretending to export every piece of workspace data.

## Admission

1. Feature flag is enabled.
2. Request is authenticated and uses `POST`.
3. The session resolves to one active Answerlattice workspace.
4. The user/workspace passes the fail-closed two-per-hour rate limit.
5. The actor has `canExportData` or platform-admin authority.

## Package Contract

- `schemaVersion: 1`
- `exportType: governed_support_truth`
- generated timestamp and product display name;
- explicit selection policy and excluded-data list;
- section counts and `complete: true`;
- deterministic section ordering;
- maximum serialized response size of 8 MiB;
- no partial package when a section or response exceeds its cap.

## Truth Rules

- Every ordinary collection query is scoped by `pId = AL`, `tId`, and `sId`.
- Canonical answers must be active and not require review.
- KB articles and FAQs must be active/published.
- AI translations require human review evidence; human translations may be included directly.
- Changelog entries must be published and retain their changed-entity and release links.
- Nested changelog pages must corroborate exact `AL`/tenant/workspace identity; missing publication state and unlinked versioned entries are excluded.
- Citation output uses explicit canonical citation fields; arbitrary evidence metadata is discarded.
- Unknown timestamps are failure-contained and portable numeric fields do not coerce strings or booleans.

## Security Rules

- No tickets, chats, feedback, secrets, embeddings, raw audit history, actor metadata, or tenant identifiers enter the file.
- The response is private, no-store, and `nosniff`.
- Browser settlement is owned by the initiating workspace; duplicate clicks are synchronously refused and workspace transitions abort the in-flight download.
- A metadata-only `support_truth_export_generated` audit event is awaited before delivery.
- That audit action is server-reserved in dedicated and shared Firestore rules.

## Deliberate Non-Goals

- legal subject-access export;
- full workspace export, backup, restore, import, or migration engine;
- account closure or erasure;
- scheduled exports;
- exporting private ticket/source archives;
- storing generated files in Firebase Storage;
- generic CSV/report builder.

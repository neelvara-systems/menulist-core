# Support Truth Export - Implementation

## Runtime Files

| File | Responsibility |
| --- | --- |
| `src/app/api/answerlattice/support-truth-export/route.ts` | Auth, rate, permission, build, audit, and private download response. |
| `src/lib/answerlattice/supportTruthExport.ts` | Scoped reads, projection, redaction, ordering, caps, package construction, and audit metadata. |
| `src/components/templates/answerlattice/settings/AnswerlatticeSupportTruthExport.tsx` | Permission-aware owner action and bounded browser download. |
| `scripts/verification/test-answerlattice-support-truth-export-contracts.ts` | Fake-Firestore projection, isolation, completeness, overflow, and audit contracts. |
| `scripts/verification/test-answerlattice-governance-rules.ts` | Client-forgery denial for the reserved export audit action. |

## Request Flow

The browser sends a same-origin, no-store `POST`. The route resolves the session scope, applies a hashed user/tenant/workspace rate key, checks `canExportData`, then passes only the access-context workspace to the builder.

## Read Model

Seven bounded reads cover entities, canonical answers, product surfaces, KB articles, FAQs, releases, and the workspace changelog path. Ordinary collections use exact `AL`/tenant/workspace filters and explicit Firestore projections. Each collection reads cap-plus-one so overflow is detectable rather than silently truncated.

## Projection

- Portable content recursively strips reserved identity, actor, embedding, trace, and source-context keys.
- Canonical citations are rebuilt from `id`, `title`, normalized URL, and optional bounded `sourceId` only.
- Article translations exclude reviewer identity and unreviewed AI output.
- Changelog entries retain `entityChanges` and `releaseId` so release binding survives export.
- Sorting uses a stable code-point comparator instead of locale-sensitive ordering.

## Delivery And Failure

- Collection overflow or response overflow returns `409 EXPORT_TOO_LARGE`.
- Rate provider failure returns `503 RATE_LIMIT_UNAVAILABLE`.
- GET returns `405 METHOD_NOT_ALLOWED`; generation is POST-only because it creates audit state.
- Audit failure returns a generic `500` and prevents delivery.
- The browser reads the body through the shared 8 MiB bounded response helper and never calls unbounded `response.blob()`.

## Remaining External Proof

- hosted auth/session behavior;
- real Firestore index/read behavior on QA data;
- rule deployment/readback;
- desktop and mobile download behavior;
- large real-workspace latency and downstream usefulness.

# Answerlattice Firebase Forensic Audit

**Audit date:** July 11, 2026  
**Runtime namespace:** Answerlattice (`Canonica` remains only where compatibility requires it)  
**Source-of-truth order:** runtime code, Firebase configuration, rules, indexes, Functions, tests, then documentation  
**Verdict:** **Controlled-beta-ready**

## Executive Verdict

The repository-side Firebase architecture is isolated, bounded, and suitable for controlled beta operation. No known critical or high-severity source defect remains after this audit pass. Project selection now fails closed, tenant access lookup is tenant-first, derived summary documents are server-owned, private source uploads require knowledge permission and retention metadata, signal retention uses Firestore TTL, and the active vector query has one matching scoped index.

This is not yet certified as fully production-ready because three operational gates remain outside static source proof:

1. Updated dedicated/shared Firebase infrastructure cannot be confirmed in QA until project IAM permits deployment.
2. Legacy signal documents without `expiresAt` need the bounded migration described below.
3. The hourly single-instance scheduler is bounded for controlled beta but has not been load-proven for thousands of simultaneously due workspaces.

## Architecture Map

```text
NextAuth / productAccounts.AL
  -> Answerlattice custom Firebase token
  -> named browser app
  -> dedicated Answerlattice Auth / Firestore / Storage

Protected Next.js route
  -> trusted session scope
  -> named Answerlattice Admin app
  -> dedicated Firestore / Auth / Storage

Public widget/API credential
  -> hash, purpose, scope, origin and rate checks
  -> trusted workspace resolution
  -> canonical retrieval before bounded fallback

Dedicated Functions codebase
  -> strict project-boundary validation
  -> triggers, task worker, integrations, hourly master scheduler
  -> compact summaries and bounded tenant work
```

Primary evidence: `src/lib/firebase/answerlatticeConfig.ts`, `answerlatticeFirebaseClient.ts`, `answerlatticeFirebaseAdmin.ts`, `functions-answerlattice/src/firebaseAdmin.ts`, `src/data/shared/answerlatticeFirebaseBoundary.ts`, and `firebase-answerlattice.json`.

## Project And Environment Matrix

| Environment | Mode | Required project | Mismatch behavior |
|---|---|---|---|
| Local | Separate by default | `answerlattice-qa` | Invalid; no MenuList fallback |
| Emulator | Explicit emulator | `demo-answerlattice-*` | Allowed only with emulator indicators |
| Local legacy/shared | Explicit `shared` | Local default project | Allowed only locally |
| Vercel preview / QA | Separate | `answerlattice-qa` | Fails closed |
| Production | Separate | `answerlattice` | Fails closed |
| Dedicated Functions | Separate | Runtime project must match stage | Throws before data access |

The project-boundary contract is byte-identical between app and Functions. Shared mode is not inferred from matching project IDs.

## Firebase Inventory

### Deployment Sources

| Concern | Dedicated source |
|---|---|
| Firebase config | `firebase-answerlattice.json` |
| Firestore rules | `firestore-answerlattice.rules` |
| Firestore/vector indexes | `firestore-answerlattice.indexes.json` |
| Storage rules | `storage-answerlattice.rules` |
| Functions | `functions-answerlattice/` (`codebase: answerlattice`) |
| QA / production projects | `answerlattice-qa` / `answerlattice` |

Shared-mode mirrors remain in `firestore.rules`, `firestore.indexes.json`, and `storage.rules` for local migration compatibility and are tested separately.

### Collections And Read Models

- Account and billing: `tenants`, `stores`, `users`, `subscriptions`, `payment_transactions`.
- Compact read models and scheduler state: `platformSummary`.
- Support: `kb_categories`, `kb_sections`, `kb_articles`, `kb_generation_jobs`, `kb_staging_sections`, `kb_staging_chunks`, `kb_review_tasks`, `kb_ai_runs`, `changelog`, `changelog_feedback`, `article_feedback`, `supportTickets`, `chatSessions`, `chatAnalytics`, `weeklyDigests`, `feedback`, `aiSearchHistory`, `queryEmbeddings`.
- Governed knowledge: `answerlattice_entities`, `answerlattice_entitySlugIndex`, `answerlattice_entityRelations`, `answerlattice_entitySearchIndex`, `answerlattice_entityCandidates`, `answerlattice_canonicalAnswers`, `answerlattice_releases`, `answerlattice_changelogEntryIndex`, `answerlattice_signalEvents`, `answerlattice_mutationProposals`, `answerlattice_auditLogs`, `answerlattice_cacheVersions`.
- Owner operations: `answerlattice_productSurfaces`, `answerlattice_faqs`, `answerlattice_supportBoardCards`, `answerlattice_predictiveTriggers`, `answerlattice_frictionDailyStats`.
- Intake: `answerlattice_knowledgeIntakeJobs`, `answerlattice_knowledgeSources`, `answerlattice_intakeReviewItems`, `answerlattice_intakeUsageLedger`.
- Operations: `answerlattice_integrationEvents`, `answerlattice_integrationDeliveryLogs`, `answerlattice_integrationRateLimits`, `answerlattice_schedulerRunLogs`, `answerlattice_notificationLogs`, `answerlattice_contactEnquiries`, `ownerNotificationEvents`, `ownerNotificationDeliveries`, `ownerNotificationRateLimits`.
- AI accounting: `answerlattice_aiOperations/{tId}/{sId}/{operationId}`.

The product-local constant source is `src/constants/answerlattice/database.ts`; the Functions subset is `functions-answerlattice/src/constants/database.ts`. The detailed reader/writer map is [Answerlattice Data Inventory](./data-inventory/answerlattice-data-inventory_data-map.md).

Workspace summaries include activation, coverage, trust, friction, context content, support board, intake, graph, predictive triggers, compiled source versions, bundle manifest, branding, integration health, and scheduler state. Derived health/graph/context summaries are server-owned. Browser writes are limited to owner branding, predictive-trigger cache rebuild, and compiled-context freshness. Client-writable summary IDs must match payload `tId/sId`.

### Storage Inventory

| Path | Access | Policy |
|---|---|---|
| `chatSessions/chatimages/{tId}/{sId}/{id}` | Workspace member | Images, 5 MB |
| `supportTickets/documents/{tId}/{sId}/{id}` | Workspace member | Image/document, 10 MB |
| `supportTickets/messages/{tId}/{sId}/{id}` | Workspace member | Image/document, 10 MB |
| `changelog/files/{tId}/{sId}/{id}` | Knowledge manager | Image/document, 10 MB |
| `ingestion_source_files/{tId}/{sId}/{id}` | Knowledge manager/platform | Supported source, 10 MB, required retention/purpose metadata |
| `answerlattice-context/public/{bundleId}/{version}/**` | Public read | Immutable compiled bundle |
| `answerlattice-context/private/{tId}/{sId}/{version}/**` | Server only | Private compiled bundle |

Ingestion files require `retentionPolicy=delete_on_job_delete`, `sourceUse=knowledge_generation_only`, and `uploadedVia=answerlattice_kb_generation`. Failed upload-to-job handoff deletes successful partial uploads; generation-job deletion owns source cleanup.

### Cloud Functions Inventory

The dedicated codebase exports 11 functions:

1. `startGeneration`, `retryGeneration`, and `finalizePublish` Firestore triggers.
2. `answerlatticeNightly` hourly scheduler and `triggerAnswerlatticeNightly` manual HTTP trigger.
3. `processIntegrationEvent` Firestore trigger.
4. `embedArticleWorker` task worker.
5. `regenerateEmbedding`, `publishApprovedJobFn`, `dev_triggerStartGeneration`, and `dev_triggerFinalizePublish` authenticated callables.

Functions use bounded instance, timeout, memory, concurrency, and retry settings. The scheduler has task/tenant leases, per-tenant failure isolation, deterministic proposal identities, capped queries, sharded tenant discovery, and structured run logs.

## Auth, Claims, And Scope

- NextAuth is the app session authority; `productAccounts.AL` is the product bridge.
- Documents use `pId='AL'`, `tId`, and `sId`.
- Browser rules derive scope from Firebase claims; client-provided IDs are not trusted.
- Server routes derive scope from the session/access context.
- Management access queries `tenantId + email` with `limit(2)`, uses a bounded `tId` legacy fallback only on a miss, validates store membership, and rejects duplicate scoped identities.
- Trusted platform sessions avoid the unnecessary user query.
- Canonical publication, release activation, governance decisions, and derived summaries remain server-owned.

`PLATFORM_SUPPORT` is accepted by server management/callable authorization. Direct client rules retain the narrower `PLATFORM` bypass; support operators use protected server workflows or explicit tenant permission claims instead of unrestricted client database access.

## Public Credentials

Widget/public API keys use high entropy. Only hash and bounded prefix metadata persist; raw keys are returned once. Product, purpose, scope, revocation, origin, route, and rate-limit checks occur before expensive retrieval. Malformed keys fail before private collection access. Runtime tokens are short-lived and scoped. Public responses do not expose raw keys, service credentials, tenant/store IDs, or stack traces.

Evidence: `src/lib/answerlattice/widgetKeyStore.ts`, `src/lib/publicApi/auth.ts`, `src/lib/answerlattice/widgetRuntimeTokenServer.ts`, `test-answerlattice-widget-key-emulator.ts`, and `test-answerlattice-widget-runtime-token.ts`.

## Rules And Index Coverage

`firestore-answerlattice.rules` and `storage-answerlattice.rules` are default-deny. Emulator suites cover governance, ontology, releases, signals, support board, tickets, chat, feedback, intake, integrations, KB publication, platform summaries, Storage auth, MIME, tenant isolation, purpose metadata, and role permission. Server-only collections include canonical mutation, releases, operational logs, AI operations, integration delivery/rate limits, derived analytics, and intake summaries.

The dedicated index manifest has 92 indexes after legacy vector cleanup and 13 TTL/index overrides after signal TTL. The only active vector index is `pId,tId,sId,status,active,embedding` at 768 dimensions. Five obsolete variants were removed after proving the runtime has one `findNearest` query with that exact scoped filter shape.

## Retention And TTL

| Data | Retention | Mechanism |
|---|---:|---|
| Signal events | 365 days | Firestore TTL on `expiresAt` |
| Integration events/deliveries | 90 days | Firestore TTL |
| Integration rate limits | 2/36 hours by bucket | Firestore TTL |
| Scheduler and notification logs | 90 days | Firestore TTL |
| Query embeddings | 30 days | Firestore TTL |
| AI search history | 90 days | Firestore TTL |
| Contact enquiries | 365 days | Firestore TTL |
| Changelog tombstones | Bounded window | Firestore TTL |
| Compiled bundles | Active + two previous versions | Bounded Storage cleanup |
| Generation sources | Job lifetime | Explicit cleanup |

Authoritative entities, canonical answers, audit history, billing truth, account/workspace records, and approved content do not receive TTL.

### Legacy Signal Migration

Dry-run a bounded page:

```bash
npm run migrate:answerlattice-signal-ttl -- --limit=200
```

Apply and resume with the returned cursor:

```bash
npm run migrate:answerlattice-signal-ttl -- --apply --limit=200
npm run migrate:answerlattice-signal-ttl -- --apply --limit=200 --after=<nextCursor>
```

The script caps pages at 450, writes only missing expiry, derives it from `timestamp`/`createdOn`, and is idempotent. It never runs on page load or scheduler tick.

## Cost Map

Exact billing depends on traffic; verified cost shapes are:

| Flow | Cost shape |
|---|---|
| Dashboard/activation | Fixed summary reads plus opened paginated detail |
| Management access | Store read + one tenant/email user result; platform skips user read |
| Widget config | Credential lookup + compact config, bounded cache |
| Canonical hit | Scoped canonical lookup; no vector/LLM fallback |
| RAG fallback | Cached or one query embedding + one scoped vector query + bounded history/accounting writes |
| Signal | One idempotent/append write with TTL; no nightly tenant cleanup query |
| Scheduler discovery | Existing registry shard query; migration-only entity scan fallback |
| Scheduler tenant work | Bounded task reads/writes, leases, and feature gates |
| Intake | Storage + job/source/ledger writes; capped idempotent provider settlement |

Implemented improvements:

1. Platform management skips one user query.
2. Signal TTL removes one cleanup query per processed tenant/night; TTL still incurs normal deletes.
3. Vector consolidation lowers index storage and embedding-write amplification.
4. Upload authorization prevents unauthorized Storage/provider cost.
5. Server-owned summaries prevent forged write amplification.

No exact percentage or currency savings are claimed without billing telemetry.

## Defects Corrected

| Severity | Root cause | Correction | Evidence |
|---|---|---|---|
| Critical prevention | Wrong/default project fallback risk | Strict shared boundary and QA/prod project validation | Project-boundary test, builds |
| High | Email-only `limit(1)` access lookup | Tenant-first bounded lookup, legacy fallback, duplicate rejection | Access scope test |
| High | Browser-writable derived summaries | Real client-writer allowlist only | Dedicated/shared emulator tests |
| Medium | Misleading summary suffix allowed | ID bound to payload scope | Wrong-suffix rejection |
| High | Any member could upload knowledge sources | Knowledge permission and required metadata | Storage emulator tests |
| Medium/cost | Six indexes for one vector query | Kept one active scoped vector index | Manifest/runtime verifier |
| Medium/cost | Per-tenant nightly signal cleanup | Writer TTL + rule cap + TTL override | Signal tests, Functions build |
| Medium | Next.js Admin initializer rejected explicit demo projects after the shared boundary accepted them | Reused the emulator project predicate for env, file, ADC, and existing-app checks while retaining production fail-closed behavior | Project-boundary test and release emulator |

## Long-Term Scalability

Current safe shape: 64 tenant-registry shards, bounded scheduler/analytics/governance queries, paginated or capped UI lists, compact summaries, bounded caches, TTL logs, and deterministic IDs/leases/transactions for retry safety.

At 10-100 active workspaces, the hourly single-instance scheduler is proportionate. At 1,000+ workspaces sharing a settlement window, sequential tenant work may approach the 540-second budget; at 10,000 it is not defensible. The target is an idempotent task per `{tId,sId,localDate}`, with the scheduler limited to due-work discovery and a bounded-concurrency worker preserving existing tenant leases and summaries. This was not introduced without current load evidence because it changes deployment infrastructure and operational behavior. It must be implemented before large-scale certification.

## Validation Evidence

Completed during this audit:

- `npm run verify:answerlattice-runtime-truth` passed;
- `npm run test:answerlattice-firebase-forensic` passed after a full restart from its first test;
- `npx tsc --noEmit --incremental false --pretty false` passed;
- `npm run lint` passed with no warnings or errors;
- `npm --prefix functions-answerlattice run build` passed;
- `npm run build` passed, including all 439 static pages;
- `npm run docs:check-links` passed with 0 broken links and 0 naming violations;
- `npm run verify:dependency-freeze` passed;
- dedicated/shared index JSON parsed with one active 768-dimension scoped vector index each;
- shared project-boundary and retention sources are byte-identical;
- `git diff --check` passed.

QA deployment attempts:

- Dedicated `answerlattice-qa`: Functions predeploy build passed; deployment stopped before upload at the Storage Service Usage check with HTTP 403 `Project not found or permission denied`.
- Shared `menulist-qa`: deployment stopped before upload at the same Storage Service Usage check with HTTP 403.
- No QA rules, indexes, Storage rules, or Functions changed during either failed attempt.

## Remaining Limitations

| Limitation | Risk | Required action | Blocks production |
|---|---|---|---|
| QA deploy blocked by Firebase IAM | Deployed state may lag source | Grant access and run scoped deploy runbook | Yes |
| Legacy signals may lack TTL | Old records persist | Run migration to completion and verify TTL policy | Yes for retention certification |
| No production billing/latency telemetry here | Formulas, not measured savings | Observe QA/prod metrics and alerts | No for beta |
| Scheduler not load-proven at 1k-10k due workspaces | Delayed governance at large scale | Load-test then task fan-out | Blocks large-scale certification |

## Final Confidence

Fully verified locally: project guards, browser/Admin/Functions boundaries, emulator-covered rules, Storage admission, active vector-index shape, signal TTL alignment, Functions compilation, and TypeScript contracts.

Partially verified: shared mode is source/emulator tested but local-only; scheduler scale is reasoned from bounded code and runtime limits, not production load telemetry.

Unverified externally: deployed QA/prod state, billing metrics, Firebase-console TTL activation, and completion of the legacy migration.

Therefore the objective verdict is **Controlled-beta-ready**, not Production-ready.

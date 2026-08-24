# Answerlattice — Production Readiness Certification

> **Historical snapshot:** This May 2026 code-only certification is not current production approval. Use `system-inventory/answerlattice-final-cross-cutting-audit.md` and `deployment/answerlattice-qa-deployment-runbook.md` for the current local-source verdict and unresolved cloud, restore, browser, provider, and real-client evidence.
> **Audit Date:** 2026-05-12 (re-audited after Answerlattice callable/function split, identity composer, route hardening, owner/public UI hardening, and May 16 Firebase cost optimization pass)
> **Auditor:** Cascade (Senior Staff Engineer + Systems Auditor)
> **Method:** Full forensic code-only reconstruction + doc parity verification
> **TypeScript Check:** PASS (0 errors)
> **Operational Loop:** COMPLETE — all 5 readiness components verified

---

## 1. System Overview (Reconstructed from Code)

### 1.1 File Inventory

| Layer                  | Files                                      | Purpose                                                    |
| ---------------------- | ------------------------------------------ | ---------------------------------------------------------- |
| **Types**              | `src/types/answerlattice/index.ts`              | All type definitions, version helpers, Answerlattice identity fields |
| **DAL**                | 12 files in `src/database/answerlattice/`       | Firestore CRUD/read helpers for Answerlattice tenant collections |
| **Lib**                | 6 files in `src/lib/answerlattice/`             | Retrieval, drift, mutation, extraction, signals, tokenizer |
| **Feature Flags**      | 5 flags in `src/config/features.ts`        | Pillar-gated activation                                    |
| **DB Constants**       | 14 Answerlattice constants in database mirrors  | Collection name constants                                  |
| **Firestore Indexes**  | 33 Answerlattice query/vector indexes           | Mirrored for shared and dedicated Firebase deployments      |
| **Integration Points** | 3 touchpoints (tickets, chat, search-kb)   | Signal emission + retrieval                                |
| **Owner UI**           | `src/app/(main)/help-center/page.tsx` + shared help-center components; `/answerlattice/help|docs|support|release-notes` remain direct shell/compatibility routes | Embedded MenuList client support portal |
| **Operator UI**        | `src/app/(answerlattice)/answerlattice/dashboard|governance|settings|tickets|knowledge-base|kb-generation|changelog` + `src/components/answerlattice/*` | Responsive dashboard shell, governance hub, settings, and operational views |
| **Public UI**          | `src/app/sites/answerlattice/*` + `src/app/widget/[apiKey]/*` | Marketing/onboarding pages and embeddable end-user help widget |

### 1.2 Collections (14 Total — All Verified)

| #   | Collection                   | Constant                       | DAL File               | Indexes                                                     |
| --- | ---------------------------- | ------------------------------ | ---------------------- | ----------------------------------------------------------- |
| 1   | `answerlattice_entities`          | `ANSWERLATTICE_ENTITIES`            | `entities.ts`          | tId+sId, tId+sId+type                                       |
| 2   | `answerlattice_entityRelations`   | `ANSWERLATTICE_ENTITY_RELATIONS`    | `entities.ts`          | tId+sId+fromEntityId                                        |
| 3   | `answerlattice_entitySearchIndex` | `ANSWERLATTICE_ENTITY_SEARCH_INDEX` | `entities.ts`          | tId+sId                                                     |
| 4   | `answerlattice_canonicalAnswers`  | `ANSWERLATTICE_CANONICAL_ANSWERS`   | `canonicalAnswers.ts`  | tId+sId+status, tId+sId+entityIds+status, tId+sId+driftFlag |
| 5   | `answerlattice_releases`          | `ANSWERLATTICE_RELEASES`            | `releases.ts`          | tId+sId+status+versionNormalized, tId+sId+versionNormalized |
| 6   | `answerlattice_mutationProposals` | `ANSWERLATTICE_MUTATION_PROPOSALS`  | `mutationProposals.ts` | tId+sId+status+createdOn, tId+sId+createdOn, tId+sId+relatedEntityIds+status |
| 7   | `answerlattice_signalEvents`      | `ANSWERLATTICE_SIGNAL_EVENTS`       | `signalEvents.ts`      | tId+sId+entityId+timestamp, tId+sId+timestamp, tId+sId+type+timestamp |
| 8   | `answerlattice_auditLogs`         | `ANSWERLATTICE_AUDIT_LOGS`          | `auditLogs.ts`         | tId+sId+timestamp, tId+sId+entityId+timestamp, tId+sId+entityType+entityId+timestamp |
| 9   | `answerlattice_entityCandidates`  | `ANSWERLATTICE_ENTITY_CANDIDATES`   | `entityCandidates.ts`  | tId+sId+confidence, tId+sId+status+confidence               |
| 10  | `answerlattice_frictionDailyStats` | `ANSWERLATTICE_FRICTION_DAILY_STATS` | `frictionStats.ts`    | tId+sId+date, tId+sId+entityId+date                         |
| 11  | `answerlattice_schedulerRunLogs`  | `ANSWERLATTICE_SCHEDULER_RUN_LOGS`  | Scheduler only         | Platform read, server write                                 |

### 1.3 Feature Flag Chain (Verified)

```
ENABLE_ANSWERLATTICE_ONTOLOGY (Pillar 1) — all OFF
  └── ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS (Pillar 2)
      └── ENABLE_ANSWERLATTICE_DRIFT_DETECTION (Pillar 3)
          └── ENABLE_ANSWERLATTICE_SIGNAL_MUTATION (Pillar 4)
              └── ENABLE_ANSWERLATTICE_PUBLIC_API (Pillar 5)
```

Core ready-to-use flags are now enabled for Answerlattice activation. Predictive support, workflow notifications, and knowledge graph traversal are also enabled with bounded reads, event caps, sanitized delivery, and fail-closed runtime guards.

---

## 2. Parity Audit Summary (Doc ↔ Code)

### 2.1 Five Pillars

| Pillar                          | Doctrine Claim                                                 | Code Status                                                                                                                                           | Verdict                                    |
| ------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| **1 — Product Ontology**        | 7 entity types, typed relations, search index                  | `entities.ts` + `entityCandidates.ts` + `entityExtraction.ts` — all 7 types in `ANSWERLATTICE_ENTITY_TYPES`, 6 relation types, search index with tokenizer | **VERIFIED**                               |
| **2 — Canonical Answer Engine** | Governed, versioned, scoped answers; canonical-first retrieval | `canonicalAnswers.ts` + `canonicalRetrieval.ts` — 3-layer retrieval stack, version filtering, specificity scoring                                     | **VERIFIED**                               |
| **3 — Drift Governance**        | 4 drift classes, deterministic, idempotent                     | `driftDetection.ts` — all 4 classes implemented: version, signal, scope conflict, orphan                                                              | **VERIFIED**                               |
| **4 — Signal Mutation**         | 3 signal sources, 4 mutation types, human approval             | `signalMutation.ts` + `signalEmitter.ts` + `mutationProposals.ts` — entity-based clustering, proposal generation, state machine guards                | **VERIFIED**                               |
| **5 — Public API**              | Server-side governed retrieval and signal ingestion            | Owner-controlled one-key lifecycle plus `public/v1/answers`, `public/v1/entities`, and `public/v1/signals` with exact AL purpose/scopes, fail-closed limits, browser rejection, active-workspace context, private projections, and replay conflict handling | **VERIFIED, ROLLOUT-GATED** |

### 2.2 Invariants

| Invariant                        | Doctrine                                                                 | Code                                                                                                              | Verdict      |
| -------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ------------ |
| `entityIds.length ≥ 1`           | Mandatory on canonical answers                                           | `addCanonicalAnswer` throws if `scope.entityIds.length === 0`                                                     | **VERIFIED** |
| Entity type immutable            | Cannot change after creation                                             | `updateEntity` destructures `{ type, ...updateData }` — type excluded                                             | **VERIFIED** |
| Append-only audit logs           | No update, no delete                                                     | `auditLogs.ts` only exports `addAuditLog` + read functions                                                        | **VERIFIED** |
| Append-only signal events        | No update, no delete                                                     | `signalEvents.ts` only exports `addSignalEvent` + read functions                                                  | **VERIFIED** |
| Mutation state machine           | `pending_review → approved → implemented` or `pending_review → rejected` | Guards in `approveMutationProposal`, `rejectMutationProposal`, `markMutationImplemented` all check current status | **VERIFIED** |
| Release immutable after creation | Server-owned governed lifecycle                                          | Browser exports no general update; bounded create/activate actions use the authenticated Admin transaction/lease lifecycle with exact stored scope/version admission. | **VERIFIED LOCALLY** |
| Drift derived, not toggled       | Computed from server-owned primitives                                    | Manual and nightly evaluation use the shared four-class policy; browser clients cannot submit authoritative automated reasons | **VERIFIED LOCALLY** |
| Cross-tenant isolation           | tId+sId on all queries                                                   | All DAL queries include `where('tId', '==', tId), where('sId', '==', sId)`                                        | **VERIFIED** |
| Entity deprecation guard         | Cannot deprecate if active answers reference it                          | `deprecateEntity` checks `getActiveAnswersForEntity` before deprecating                                           | **VERIFIED** |
| Release entityChanges mandatory  | Must declare changed entities                                            | `addRelease` throws if `entityChanges.length === 0`                                                               | **VERIFIED** |

### 2.3 Retrieval Doctrine

| Claim                           | Code                                                                                | Verdict      |
| ------------------------------- | ----------------------------------------------------------------------------------- | ------------ |
| Canonical-first                 | `search-kb/route.ts` calls `attemptCanonicalRetrieval` BEFORE RAG pipeline          | **VERIFIED** |
| RAG is fallback                 | If canonical not found, falls through to vector search with `non_canonical` logging | **VERIFIED** |
| Deterministic entity resolution | `matchEntitiesFromIndex` uses inverted index lookup, no LLM                         | **VERIFIED** |
| Specificity scoring rule-based  | `scoreBySpecificity` uses version→scope→recency→confidence order                    | **VERIFIED** |
| Shared tokenizer                | Both `canonicalRetrieval.ts` and `entityExtraction.ts` import `answerlatticeTokenize`    | **VERIFIED** |
| Drift penalty in scoring        | Drifted answers get `-50` score penalty                                             | **VERIFIED** |

### 2.4 Schema Differences (Doc vs Code)

| Field          | Doctrine (05-architecture-evolution.md) | Code (answerlattice.ts)                    | Assessment                                                                                                 |
| -------------- | --------------------------------------- | ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Tenant field   | `tenantId: string`                      | `tId: number, sId: number`            | **IMPLEMENTED DIFFERENTLY** — Code uses MenuList's existing `tId/sId` numeric pattern (correct adaptation) |
| Version format | "Normalized integer (e.g., 002004001)"  | `normalizeVersion("2.4.1") → 2004001` | **VERIFIED** — helper functions provided                                                                   |

---

## 3. Flow Integrity Validation

### Flow A — Ticket Creation → Signal

```
addTicket() → emitAnswerlatticeSignal({ type: TICKET, tId, sId, metadata })
  → Feature flag check (ENABLE_ANSWERLATTICE_SIGNAL_MUTATION)
  → Dynamic import (addSignalEvent)
  → answerlatticeRequestBodyComposer adds pId='AL', sourceContext, traceId, requestId
  → Fire-and-forget (try/catch; failures never block ticket creation)
```

**Verdict:** SAFE. Non-blocking. Types align. No circular imports (dynamic import). No crash risk.

### Flow B — Chat Negative Feedback → Signal

```
submitSearchFeedback({ isGood: false }) → emitAnswerlatticeSignal({ type: CHAT_NEGATIVE, tId, sId })
  → Same fire-and-forget path as Flow A
```

**Verdict:** SAFE. `tId` and `sId` properly passed from `loggedInSession`. No unhandled promise rejections (outer try/catch).

### Flow C — Search KB Retrieval

```
POST /api/helpCenter/search-kb
  → attemptCanonicalRetrieval(query, { tId, sId })
  → Feature flag: ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS
  → Layer 1: getEntitySearchIndex → tokenizeQuery → matchEntitiesFromIndex
  → Layer 2: classifyIntent (rule-based, no LLM)
  → Version resolution: getLatestRelease (if no version in context)
  → getActiveAnswersForEntity (top 3 entities, sequential)
  → Version window filtering
  → Specificity scoring
  → Return canonical answer OR fallback to RAG
```

**Verdict:** SAFE. Graceful degradation on any error (catch returns fallback result). Feature-flag gated. Version window filtering correct. Sequential entity fetch = max 3 reads (acceptable).

### Flow D — Release Activation

```
activateRelease(releaseId)
  → Authenticated route acquires the activation lease
  → Finish transaction re-reads the exact stored release
  → Read capped active answers linked to changed entities
  → Derive Class A version drift with shared policy
  → Write drift/review state, deterministic audits, cache/source invalidation, and bundle-stale state
  → Mark the release active in the same transaction
```

Answerlattice App Release ID Boundary: browser reads normalize release IDs through the shared Firestore document-ID guard. Create/activate actions cross the bounded authenticated route; the Admin transaction/lease lifecycle proves exact release, entity and affected-answer product/workspace/version identity before writes. Malformed, reserved, path-shaped or coercive IDs/scope fail closed.

**Verdict:** SAFE LOCALLY. Detecting drift is advisory and does not reject the release, but invalid scope, malformed stored truth, or an over-cap affected-answer set fails activation closed before partial writes.

### Flow E — Nightly Job

**Status:** Cloud Function implemented in `functions-answerlattice/src/index.ts` with scheduled and CRON_SECRET-guarded manual entry points.

**Verdict:** WIRED AND GUARDED. The nightly entry point runs inside Answerlattice Functions, records a structured run log, and caps tenant discovery plus per-tenant query volume.

- Tenant discovery: `answerlattice_entities` scan capped at 1000 docs with truncation logged
- Cross-tenant safety: Each function takes explicit `tId, sId` — no cross-contamination possible
- Unbounded loop protection: tenant discovery, answers, entities, signals, and search index reads all use explicit limits
- Empty dataset safety: All functions handle `null`/empty returns gracefully
- Manual trigger safety: `triggerAnswerlatticeNightly` requires `Authorization: Bearer ${CRON_SECRET}` outside the Firebase emulator
- Dedicated Firebase auth safety: `/api/auth/set-claims` mints a separate Answerlattice custom token in separate mode so client DAL calls satisfy `firestore-answerlattice.rules`
- KB callable safety: `embedArticleWorker`, `regenerateEmbedding`, and `publishApprovedJobFn` are exported from Answerlattice Functions and run against Answerlattice Firebase Admin + Answerlattice-owned Gemini API secrets in separate mode
- Expensive callable auth safety: `regenerateEmbedding` and `publishApprovedJobFn` require callable auth and `platformRole`/`role` of `PLATFORM` or `PLATFORM_SUPPORT` before embedding/publish work starts
- KB runtime diagnostic safety: `startGeneration`, `embedArticleWorker`, `regenerateEmbedding`, `publishApprovedJobFn`, the publish finalizer, shared/separate AI helpers, and shared/separate trigger/callable wrappers use stable failure codes and bounded source/request metadata. Failed publish/generation records store fixed `Publishing failed` / `Finalize publish failed` / `Knowledge generation failed` text instead of raw provider/runtime exception text.

### Flow F — Widget Key → Search → Feedback

```
Widget settings / onboarding
  → generate al_* widget key once
  → store answerlatticeWidgetApi key hashes + bounded summaries only
  → malformed keys short-circuit before Firestore lookup
  → widget routes rate-limit by key hash, then validate X-API-Key by hash
  → resolved store context must have positive tId+sId
  → coreSearch writes aiSearchHistory with tId+sId+scoped cacheKey
  → widget feedback verifies searchHistory.tId/sId before writing feedback
```

**Verdict:** SAFE. Raw widget keys are not persisted. Rate-limit keys use key hashes, not raw API keys. Malformed keys avoid Firestore reads, misconfigured store contexts fail closed, and feedback cannot update another workspace's search history record.

### Flow F2 — Public API Key -> Governed External Use

```
Flag-gated Public API page
  -> authenticated exact workspace + MANAGE_INTEGRATIONS
  -> fail-closed actor/workspace rate limit + same-origin management
  -> create/rotate one al_* raw key once
  -> stores.publicApi keeps hash + bounded summary only
  -> server-reserved audit summary, no raw key/hash
  -> external trusted server uses X-API-Key
  -> IP + per-key/endpoint fail-closed admission
  -> exact product/purpose/scope + active workspace
  -> canonical answer / public entities / governed signal
```

**Verdict:** SOURCE VERIFIED, ROLLOUT-GATED. Browser-origin external use is rejected, rotation/revocation has no positive-auth cache delay, public answer projections exclude internal guidance/evidence, and signal replay conflicts cannot silently change evidence.

### Flow G — Guided Public Widget

```
Canonical procedure answer
  → coreSearch returns procedure
  → /api/widget/search includes procedure when ENABLE_ANSWERLATTICE_GUIDED_WORKFLOWS
  → WidgetClient renders prerequisites, warnings, steps, expected results, and troubleshooting hints
```

**Verdict:** WIRED. Backend procedure payloads reach the public end-user surface when the guided workflow flag is enabled.

### Flow H — KB Navigation Tenant Scope

```
KB generation publish
  → reads job.tId + job.sId
  → writes kb_categories/categories_{tId}_{sId}
Owner KB screen
  → reads categories_{session.tId}_{session.sId}
  → legacy categories doc fallback is filtered and only exposes unscoped legacy data to PLATFORM users
```

**Verdict:** HARDENED. The owner knowledge-base navigation screen no longer treats the categories document as global product state.

### Flow I — MenuList Client → Answerlattice Support

```
MenuList owner clicks Help / Documentation / Support Tickets
  → desktop sidebar/support popover opens /help-center, /help-center/kb, or /help-center/ticket
  → mobile More tab renders the existing Help Center home/tabs inside MobileShell
  → direct /help-center path tabs and legacy ?tab= URLs resolve to the same Help Center screens
  → nested mobile routes under /help-center/* stay in MobileShell and map to the correct More tab support/doc/release-notes screen
  → /help-center/kb/articles/:articleId and /help-center/changelog/:entryId support direct content links
  → billing help actions route to /help-center/ticket instead of WhatsApp/generic placeholders
  → /answerlattice/help reuses the same Help Center home for direct shell access
  → owner sees KB, ticket, and changelog surfaces without the legacy generic mobile FAQ/WhatsApp placeholder
  → mobile Help Center and direct Answerlattice shell routes expose Back to MenuList
  → Answerlattice DAL reads/writes use answerlatticeFirebaseClient and sourceContext metadata

Platform operator opens Answerlattice management
  → /answerlattice/* authenticated layout loads
  → platformRole=PLATFORM or PLATFORM_SUPPORT can access governance/management routes
  → non-platform sessions are redirected back to /answerlattice/help
  → support ticket admin uses one live initial snapshot for active tickets; deleted tickets are lazy-loaded only when opened
```

**Verdict:** WIRED. MenuList no longer sends mobile owners to generic FAQ/WhatsApp/mail placeholders for primary support actions; the first-client support surface opens Answerlattice client screens directly while platform-only management screens remain separated.

---

## 4. Security Validation

| Check                                            | Status                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| No hardcoded collection names                    | **PASS** — All use `DB_COLLECTIONS` constants                              |
| No missing tenant filters                        | **PASS** — All DAL queries include `tId` + `sId` where clauses             |
| No unscoped queries                              | **PASS** — Every query is tenant-scoped                                    |
| Vector retrieval fail-closed                     | **PASS** — `coreSearch()` returns an empty result when `tId/sId` are invalid and vector search always filters `status + tId + sId` |
| No writes bypassing DAL                          | **PASS** — Answerlattice client writes go through `apiCallComposer` + `answerlatticeRequestBodyComposer`; shared MenuList writes keep `requestBodyComposer` |
| Answerlattice document ownership                      | **PASS** — Answerlattice DAL writes force `pId = 'AL'` and attach source/trace metadata without changing existing tId/sId query scope |
| No direct client writes to sensitive collections | **PASS** — All operations server-side via DAL pattern                      |
| Feature flag gating on all entry points          | **PASS** — Retrieval, signals, drift, extraction all check flags           |
| Dynamic imports for code splitting               | **PASS** — `signalEmitter.ts` uses dynamic import to avoid bundling        |
| Public key lookup cost guard                     | **PASS** — Public API keys require `ml_` or `al_` shape before hash/raw lookup |

---

## 5. Cost Envelope Projection (Worst Case)

### Per Tenant Per Day (Active Use)

| Operation                            | Reads                                                | Writes                | Estimated Cost  |
| ------------------------------------ | ---------------------------------------------------- | --------------------- | --------------- |
| Canonical retrieval (50 queries/day) | 50 × (1 index + 3 entity + 1 version) = 250 reads    | 0                     | $0.003          |
| Signal emission (20 events/day)      | 0                                                    | 20 writes             | $0.0004         |
| Search-history cache lookup          | 1 cache-key lookup on help-center repeat queries, with scoped key/source-freshness verification | 0 | <$0.0001 |
| Help Center KB category load         | 1 scoped category doc read per session, shared by landing/KB/chat/changelog picker | 0 | <$0.0001 |
| Owner ticket live listener           | Initial snapshot capped to latest 100 store tickets, then 1 read per changed ticket | 0 | usage-based |
| Drift evaluation (1 nightly)         | 1 entities + 1 answers + N signal counts = ~20 reads | ~5 governance updates | $0.0003         |
| Mutation engine (1 nightly)          | 1 signals query + ~10 answer lookups = ~15 reads     | ~3 proposals          | $0.0002         |
| **Total per tenant/day**             | ~285 reads                                           | ~28 writes            | **~$0.004/day** |

### Platform Scale (1000 tenants)

| Metric       | Value           |
| ------------ | --------------- |
| Daily reads  | ~285,000        |
| Daily writes | ~28,000         |
| Monthly cost | **~$120/month** |

**Verdict:** Well within Firestore free tier for small scale. At 1000 tenants: ~$120/month — acceptable for infrastructure.

---

## 6. Known Limitations

| #   | Limitation                                    | Impact                                                         | Mitigation                                              |
| --- | --------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Entity extraction depends on Gemini injection | `callGemini` function must be passed in                        | By design — avoids circular dependencies                |
| 2   | Mutation review UI is minimal                 | List + approve/reject only; no inline canonical answer editing | Sufficient for v1; rich editor deferred                 |
| 3   | Heavy governance authoring is desktop-preferred | Mobile supports access/review, but long structured edits remain desk tasks | Responsive shell, scrollable tables, viewport-width modals |

### Resolved Limitations (since initial audit)

| #   | Was                             | Now                                                                               |
| --- | ------------------------------- | --------------------------------------------------------------------------------- |
| 1   | No Cloud Function scheduler     | Exported from `functions-answerlattice/src/index.ts` with the `ENABLE_ANSWERLATTICE_NIGHTLY` flag |
| 2   | No tenant discovery             | `discoverActiveTenants()` queries entity collection for distinct tId/sId          |
| 3   | Sequential retrieval reads      | `Promise.all` for parallel entity answer fetches                                  |
| 4   | Unresolved signal entityIds     | `resolveUnresolvedSignals()` runs nightly, matches against search index           |
| 5   | No coverage KPI                 | `aggregateCoverageKPI()` stores hit/miss rate in `platformSummary/answerlattice_{sId}` |
| 6   | No entity promotion path        | `promoteCandidate()` — one-click: candidate → entity + search index               |
| 7   | No mutation review UI           | `MutationProposalReview.tsx` with approve/reject                                  |
| 8   | No signal dedup                 | In-memory Set in `signalEmitter.ts`                                               |
| 9   | No recurring fallback detection | `detectRecurringFallbacks()` auto-generates proposals for 5+ misses               |
| 10  | No impact tracking              | `trackMutationImpact()` compares pre/post signals after 14 days                   |
| 11  | No drift dashboard visualization | `DriftDashboard` in the Answerlattice governance hub with responsive detail modal      |
| 12  | Owner shell not mobile-safe      | Answerlattice layout now uses mobile drawer navigation and no fixed-width content      |
| 13  | Widget image previews assumed PNG | Widget messages now retain MIME type for uploaded images                          |
| 14  | Help Center did not pass context-aware product context into AI search | `HeroSearchBar` now builds tab-aware `productContext`; `HelpChat` sends it as top-level request data |
| 14a | Help Center image search could over-trust stored image URLs or replay image context | Chat image URLs are tenant/store path-checked and fetched with manual redirect handling, images are not saved as localStorage drafts, previous image URLs are not replayed in assistant context, and answer generation receives bounded visual context instead of a second raw image pass |
| 15  | Server retrieval fast paths could depend on client Firebase DALs | Canonical retrieval, instant-cache search, and server signal writes now use Answerlattice Admin Firestore |
| 16  | Widget context clearing could leave stale context inside iframe | `setContext(null)` now clears widget state and posts the cleared context to the iframe |
| 17  | Graph suggestions could render non-string objects in the widget | Widget suggestions are normalized before rendering and before quick-question clicks |
| 18  | Help Center hero used token-dependent render state during SSR | Token-dependent decorative layer is mounted client-side with stable SSR fallbacks |
| 19  | Pillar 5 public API was deferred | Flag-gated public API now exposes canonical answers, entity registry, and signal ingestion |
| 20  | Answerlattice onboarding used legacy pre-payment packaging | Public onboarding now creates Razorpay recurring subscriptions and pending paid subscription records |
| 21  | Repeated-question caches could serve stale source snapshots | Firestore answer cache and Redis instant cache now validate live source freshness before returning cached answers |
| 22  | Shared Answerlattice document composer could infer MenuList as source product | Composer now accepts source product scope only from explicit session/source context and keeps direct-client context product-neutral |

---

## 7. Activation Order Confirmation

Per doctrine and feature flag chain:

1. **ENABLE_ANSWERLATTICE_ONTOLOGY** → Entity collections, search index, entity candidates
2. **ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS** → Canonical answer engine, retrieval pipeline
3. **ENABLE_ANSWERLATTICE_DRIFT_DETECTION** → 4-class drift engine, governance flags
4. **ENABLE_ANSWERLATTICE_SIGNAL_MUTATION** → Signal emission, mutation proposals, nightly job
5. **ENABLE_ANSWERLATTICE_PUBLIC_API** → External API surface for canonical answers, entity registry, and signal ingestion

Each flag depends on all previous flags being enabled first.

---

## 8. Issues Found & Fixed During Audit

| #   | Issue                                                        | File                         | Fix Applied                                              |
| --- | ------------------------------------------------------------ | ---------------------------- | -------------------------------------------------------- |
| 1   | `getEntitiesByType` — no `limit()` (unbounded reads)         | `entities.ts`                | Added `limit(500)`                                       |
| 2   | `getRelationsForEntity` — no `limit()` (unbounded reads)     | `entities.ts`                | Added `limit(500)`                                       |
| 3   | `getActiveAnswersForEntity` — no `limit()` (unbounded reads) | `canonicalAnswers.ts`        | Added `limit(200)`                                       |
| 4   | `getDriftedAnswers` — no `limit()` (unbounded reads)         | `canonicalAnswers.ts`        | Added `limit(500)`                                       |
| 5   | No nightly scheduler wiring                                  | `functions-answerlattice/src/index.ts` | Added Answerlattice scheduled export with `ENABLE_ANSWERLATTICE_NIGHTLY` |
| 6   | Signal entity resolution missing                             | `answerlatticeNightly.ts`         | Added `resolveUnresolvedSignals()`                       |
| 7   | No entity promotion from candidates                          | `entityCandidates.ts`        | Added `promoteCandidate()`                               |
| 8   | No mutation review UI                                        | New files                    | `MutationProposalReview.tsx` + `useMutationProposals.ts` |
| 9   | No coverage KPI tracking                                     | `answerlatticeNightly.ts`         | Added `aggregateCoverageKPI()`                           |
| 10  | Signal dedup missing                                         | `signalEmitter.ts`           | Added in-memory dedup Set                                |
| 11  | Sequential retrieval reads                                   | `canonicalRetrieval.ts`      | Changed to `Promise.all` parallel reads                  |
| 12  | No CF feature flag for nightly                               | `functions-answerlattice/src/constants/features.ts` | Added `ENABLE_ANSWERLATTICE_NIGHTLY`                          |
| 13  | Recurring fallback not detected                              | `answerlatticeNightly.ts`         | Added `detectRecurringFallbacks()`                       |
| 14  | No post-mutation impact tracking                             | `answerlatticeNightly.ts`         | Added `trackMutationImpact()`                            |
| 15  | No confidence auto-adjustment                                | `answerlatticeNightly.ts`         | Historical implementation retired 2026-07-20; usage is not correctness evidence |
| 16  | Master Execution Prompt missing Answerlattice rules               | `MASTER-EXECUTION-PROMPT.md` | Added STEP 9B with 5-component readiness checklist       |
| 17  | Context-aware Help Center mounting was incomplete            | `HeroSearchBar.tsx`, `HelpChat`, `search-kb/route.ts` | Added validated top-level `productContext` flow and backend session-role override |
| 18  | Context schema allowed fragile or sensitive free-form strings | `contextSchema.ts`           | Added trimming, size limits, sanitization, unknown-field stripping, and contact-detail rejection |
| 19  | Server search/retrieval paths mixed client Firebase access into API code | `canonicalRetrieval.ts`, `searchCore.ts` | Replaced server reads with Answerlattice Admin Firestore helpers |
| 20  | Widget could keep stale context after host context reset      | `answerlattice-widget.js`, `WidgetClient.tsx` | Clear-context messages now update iframe state instead of being ignored |
| 21  | Widget graph suggestions could break React rendering          | `WidgetClient.tsx`           | Added suggestion normalization for object/string suggestion payloads |
| 22  | Public API routes missing for Pillar 5                        | `src/app/api/answerlattice/public/v1/*` | Added answers, entities, and signals endpoints with `al_*` key auth, rate limits, and tenant-derived context |
| 23  | Paid Answerlattice plan onboarding did not create provider subscription | `src/app/api/answerlattice/onboard/route.ts` | Added Razorpay plan/subscription creation for non-beta Answerlattice plans |
| 24  | Repeated-question cache could outlive source truth             | `cacheFreshness.ts`, `searchCore.ts`, `instantCache.ts` | Added source-document validation before serving cached answer snapshots |
| 25  | Help Center home could duplicate KB category reads across sibling widgets | `useKBCategoriesCache.ts`, Help Center/KB/chat/changelog consumers | Added shared in-flight/context cache and fixed category payload shape |
| 26  | Owner ticket realtime listener and user chat history could grow unbounded | `tickets/index.ts`, `chatSessions/index.ts` | Added latest-100 ticket cap and latest-50 store-scoped chat-session cap |
| 27  | ROI calculator used raw chat-session scan despite aggregate analytics existing | `/api/analytics/roi-metrics`, `chatAnalytics/index.ts` | Switched ROI to aggregate DAL, clamped range to 90 days, capped today live reads |
| 25  | Answerlattice core still had a hidden MenuList source-product fallback | `documentComposer.ts`, direct Answerlattice client shell copy | Removed the fallback; direct Answerlattice client-shell labels now use generic client support wording |

All fixes verified with `npx tsc --noEmit` → 0 errors.

---

## 9. Risk Register

| Risk                                                    | Likelihood | Impact                   | Mitigation                                                                                                  |
| ------------------------------------------------------- | ---------- | ------------------------ | ----------------------------------------------------------------------------------------------------------- |
| Firestore query/vector index missing for new query pattern | Low        | Query fails at runtime   | All 33 Answerlattice indexes mirrored in `firestore.indexes.json` and `firestore-answerlattice.indexes.json`, including `kb_articles` tenant-filtered vector search |
| Stale tokenizer breaks retrieval                        | Low        | Silent query miss        | Tokenizer frozen with `FROZEN` comment; shared between index and query time                                 |
| Drift engine marks too many answers as drifted          | Medium     | Admin fatigue            | Configurable thresholds in `SIGNAL_DRIFT_THRESHOLDS`                                                        |
| Signal emission slows ticket creation                   | Very Low   | UX degradation           | Fire-and-forget with try/catch; dynamic import                                                              |
| Version normalization overflow                          | Very Low   | Wrong version comparison | `normalizeVersion` supports up to v999.999.999                                                              |
| Feature flag toggled mid-request                        | Low        | Partial execution        | Each function checks flag at entry — mid-request toggle is safe (worst case: one request gets old behavior) |

---

## 10. Final Verdict

### **READY FOR CONTROLLED EXPERIMENT (Operational Loop Complete)**

**Readiness Checklist (per STEP 9B of Master Execution Prompt):**

| #   | Component                       | Status                                                                  |
| --- | ------------------------------- | ----------------------------------------------------------------------- |
| 1   | Nightly Scheduler CF            | ✅ Exported from `functions-answerlattice/src/index.ts` with `ENABLE_ANSWERLATTICE_NIGHTLY` |
| 2   | Signal Entity Resolution        | ✅ `resolveUnresolvedSignals()` in nightly batch                        |
| 3   | Entity Creation from Candidates | ✅ `promoteCandidate()` — one-click: candidate → entity + search index  |
| 4   | Mutation Proposal Review UI     | ✅ `MutationProposalReview.tsx` + `useMutationProposals.ts`             |
| 5   | Canonical Coverage KPI          | ✅ `aggregateCoverageKPI()` → `platformSummary/answerlattice_{sId}`          |
| 6   | Scheduler Observability         | ✅ Structured run logs and master scheduler state use bounded task diagnostics with fixed failure codes |

**Additional Verification:**

- All 4 active pillars fully implemented with correct invariants
- All Firestore indexes pre-defined for both shared and dedicated deployment modes (33 Answerlattice query/vector indexes)
- All integration points wired (tickets, chat, search-kb)
- Feature flags provide safe activation/rollback
- Zero unbounded queries (all capped with `limit()`)
- Zero TypeScript errors
- Cost envelope acceptable (~$0.004/tenant/day)
- Security model sound (tenant isolation on every query)
- Nightly 7-step batch: drift → resolve → mutate → coverage → fallback → impact → confidence
- Signal deduplication prevents noise
- Parallel retrieval reads for latency optimization

**Conditions for Production:**

1. Seed at least 10 entities + 5 canonical answers for test tenant
2. Enable `ENABLE_ANSWERLATTICE_NIGHTLY` (CF flag) + `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION` (client)
3. Monitor canonical hit rate for 2 weeks via coverage KPI in `platformSummary/answerlattice_{sId}`
4. Verify Firestore rules and indexes are deployed for the selected mode (`firebase deploy --only firestore:rules,firestore:indexes` or the Answerlattice Firebase alias/config), including the `kb_articles` `status + tId + sId + embedding` vector index
5. Enable remaining flags one-by-one following activation order

---

## 11. August 2026 Final Pre-Production Release-Candidate Certification

> **Execution date:** 2026-08-24
> **Gate name:** Answerlattice Final Pre-Production Release-Candidate Certification
> **Final verdict:** `READY FOR PRODUCTION ENVIRONMENT TESTING` — the local release-candidate gates, exact-application-commit hosted-QA gates, scoped QA Firestore Rules publication, authenticated exact readback, and hosted support-board lifecycle are green. No known P0/P1 remains in this pre-production gate.
> **Execution boundary:** local runtime, Firebase emulators, disposable synthetic fixtures, bounded hosted QA, and the explicitly authorized Answerlattice QA Firestore Rules publication. The certification worktree is committed and pushed to `staging`; Vercel's existing Git integration publishes the QA application build. No production Firebase mutation, real payment-provider execution, manual Vercel deployment, or `main` mutation was performed.

This section records the current execution evidence. It does not convert the historical May code-only verdict above into production approval. The local fresh-workspace, authenticated owner, end-user widget, governance, responsive, adversarial rules, scheduler, aggregate regression, exact-application-commit hosted-route gates, QA rules publication/readback, and hosted support-board lifecycle are complete. Production-host certification remains a later, separately authorized gate.

### 11.1 Evidence matrix

| Surface | Evidence status | Evidence |
| --- | --- | --- |
| Code-derived implementation inventory | `PASS_STATIC` | 51 concrete management-route variants, 77 public routes, 81 relevant API routes, feature flags, DAL paths, Firebase surfaces, and Answerlattice Functions were inventoried from current runtime source. |
| Local management routes | `PASS_RUNTIME` | All 51 discovered route variants loaded in Chrome without uncaught exceptions after warning fixes; compatibility redirects were verified for legacy help/docs/support/release routes and disabled governance routes. |
| Public routes, local | `PASS_RUNTIME` | All 77 discovered public routes loaded without console-error evidence. |
| Public routes, hosted QA | `PASS_HOSTED_QA` | 77/77 routes were reachable on `canonica.app`: 76 returned 200 and `/home` intentionally returned 308 to `/`. |
| Hosted authenticated owner routes | `PASS_HOSTED_QA` | `canonica.app` served verified application build `b0e8a3f8349df14aecdcaab5b48bdf23c36dfdda` (`b0e8a3f`), deployment `menulist-core-et9yj5azm-neelvara-systems.vercel.app`; `Continue with Google` rendered and `admin@neelvara.com` reached the Answerlattice owner experience. All 50 authenticated management-route variants settled without sign-in/unauthorized redirects; `/docs` and `/help` resolved to `/knowledge-base`, and `/governance/languages` resolved to `/governance/answers`. A deliberately unrealistic 50-route hard-reload storm exceeded the bounded 30-per-15-minute claim-sync ceiling and returned expected 429s while screens continued rendering from the authenticated session. After the sliding window expired, one normal `/activation` reload settled with no fresh console error, proving automatic recovery. |
| Knowledge intake to published article | `PASS_RUNTIME` | A disposable MenuList-derived synthetic source was created, generated into a review draft, edited, accepted, published, and opened in Knowledge Base with title, content, tags, and context preserved. |
| Widget conversation persistence | `PASS_EMULATOR` | Dedicated widget-conversation emulator suite passed. |
| Onboarding provisioning | `PASS_EMULATOR` | Dedicated onboarding provisioning emulator suite passed. |
| Knowledge intake server lifecycle | `PASS_EMULATOR` | Intake generation and lifecycle suite passed without a Gemini key by exercising the maintained deterministic provider-failure boundary. |
| Knowledge intake tenant/security rules | `PASS_EMULATOR` | Dedicated and shared Firestore rules suites passed, including expected wrong-tenant and forbidden-write denials. |
| Governance lifecycle and tenant/security rules | `PASS_EMULATOR` | Governance lifecycle plus dedicated/shared Firestore rules suites passed. |
| Feedback, content feedback, signals, retention failure handling | `PASS_EMULATOR` | Feedback contracts, Firestore/Storage persistence, dedicated/shared rules, signal rules, and expected cleanup-task failure observability passed. |
| Commercial and billing boundary | `PASS_EMULATOR` | Entitlements, taxation, billing documents, subscription reads, dedicated/shared billing rules, concurrent checkout protection, provider-plan registry, subscription-state lifecycle, and webhook lease behavior passed using emulators only. |
| Actual Razorpay/provider execution | `NOT_APPLICABLE` | Intentionally excluded: no checkout, charge, real webhook completion, refund, or provider transaction was performed. |
| Maintained Answerlattice runtime truth | `PASS_EMULATOR` | The complete `verify:answerlattice-runtime-truth` aggregate passed after all fixes, including public website, dedicated/shared Firestore and Storage rules, Public API, widget, MCP, governance, support, billing, scheduler, summaries, onboarding, retrieval, and owner-control contracts. Expected authorization denials were exercised. |
| Dependency and security audit | `PASS_STATIC` | Dependency freeze passed; root and all Functions dependency audits reported zero vulnerabilities after removing a stale verifier assertion for the intentionally removed, unused root Axios dependency. |
| TypeScript and lint | `PASS_STATIC` | `typecheck:answerlattice` and repository lint passed against the current worktree. |
| Mobile/responsive management runtime | `PASS_RUNTIME` | Activation and First 10 Answers passed at 390×844 without horizontal document overflow. The embedded widget was also exercised in a real narrow Chrome window: verified answer, feedback, attachment/input controls, close-to-launcher, and reopen remained usable without clipping or fresh console errors. |
| Final fresh-workspace journey | `PASS_RUNTIME` | A disposable workspace completed Google OAuth, activation, MenuList-derived intake, draft review/publish, entity and canonical answer governance, product-surface mapping, real widget question/feedback/escalation, owner ticket reply/note/resolution, support board lifecycle, weekly digest, known-issue lifecycle, release activation, audit history, predictive-trigger create/disable/delete, notifications save, and settled-route regression. |
| Hosted First 10 provider boundary | `BLOCKED` | The exact hosted build rendered the complete First 10 surface and fail-closed controls. The QA workspace currently has no hosted knowledge intake, so product-specific generation and both runtime-check actions are correctly disabled. No provider call or customer data mutation was attempted; deterministic canonical/provider-failure behavior was already exercised locally. |
| Firebase release state | `PASS_HOSTED_QA` | Answerlattice QA Firestore Rules were published to ruleset `8ae29338-4225-4f07-bdc6-c46a7d0cf1cb`; authenticated readback matched `firestore-answerlattice.rules` exactly at SHA-256 `a92cbacbf2b64d2939391449044ea5625e706ddb60e23dfab7c4ffb20d3a9e77`, 116222 bytes. Production remains unchanged and requires separate authorization. |

### 11.2 Defects found and fixed in this pass

| Severity | Root cause | Durable fix | Verification |
| --- | --- | --- | --- |
| P1 | The shared login component set `shouldOfferGoogleAuth = !isAnswerlatticeExperience`, hiding Google OAuth precisely on Answerlattice hosts even though dedicated QA/production OAuth clients are configured and Google login is the documented owner flow. | Removed the Answerlattice-only suppression from both normal login and claim-account login; updated auth and Answerlattice runtime verifiers to reject the regression. | Local and hosted QA render `Continue with Google`; the owner confirmed `admin@neelvara.com` reached the hosted `/dashboard`. Auth/onboarding verification, runtime-truth source verification, Answerlattice typecheck, focused lint, and diff checks passed. |
| P2 | Answerlattice authorization failures redirected to the global `/unauthorized` route without retaining the original Answerlattice callback, so **Sign In Again** reopened the generic MenuList sign-in experience on localhost. | Bound the safe same-origin callback to the Answerlattice unauthorized redirect and made the global recovery action preserve only validated relative callbacks. | Auth/onboarding verifier covers both the Answerlattice redirect and the `//` open-redirect rejection; TypeScript, focused lint, and diff checks passed. Local browser recovery retest follows the pending owner account-chooser confirmation. |
| P2 | Normal Google login hardcoded its successful destination to `/signin`; when a local OAuth attempt returned without its short-lived state cookie, NextAuth correctly rejected it but the sign-in screen neither preserved `/answerlattice` nor surfaced a useful recovery message. | Normal Google login now uses the validated same-origin post-login target, and the login page maps only known OAuth callback/sign-in failures to a bounded retry message. Claim-account Google login retains its intentional `/signin` continuation. | Server trace identified `OAUTH_CALLBACK_ERROR: State cookie was missing`; the auth/onboarding suite locks the direct Answerlattice callback and bounded error mapping. The owner completed a clean local Google retry with `admin@neelvara.com` and landed on `/answerlattice/activation`; TypeScript, focused lint, and diff checks passed. |
| P1 | Answerlattice used the shared profile sign-out default, which returned local users to an unscoped `/signin`. The next Google login therefore defaulted to MenuList `/dashboard`, while the Firebase client retained Answerlattice scope and the MenuList tenant bootstrap failed closed. | Added a product-specific sign-out callback contract, preserving `/answerlattice` locally and the clean `/dashboard` route on Answerlattice product hosts. Added a server-layout guard that redirects an explicitly Answerlattice-scoped session away from MenuList owner routes before Firebase bootstrap. | Reproduced the failure, added auth/onboarding regression assertions, passed the maintained suites, then the owner repeated logout → Google login and landed directly on `/answerlattice/activation` with the workspace rendered. |
| P1 | The shared session-expiry monitor redirected to `/signin?expired=true` without retaining the current product callback, so an expired Answerlattice session rendered the MenuList login and would repeat the wrong-product post-login destination. The sign-in page also retained a MenuList-only browser title after its Answerlattice body rendered. | Added a validated relative `loginCallbackPath` contract to all expiry, access-ended, and silent recovery redirects; the Answerlattice layout supplies its current callback path. Sign-in metadata now derives Answerlattice identity from the bounded callback/product query. | Reproduced the expired-state leak, then verified `http://localhost:3000/signin?expired=true&callbackUrl=%2Fanswerlattice` renders Answerlattice logo/copy, Google login, and `Answerlattice - Authentication` title. Auth/onboarding suites, TypeScript, focused lint, and diff checks passed. |
| P1 | Knowledge-intake mutations could wait indefinitely when a network request never settled. | Added a 30-second `AbortController` timeout to the shared knowledge-intake JSON client. | Complete intake edit, accept, publish, and KB-open journey passed; emulator intake suite passed. |
| P2 | Active-job synchronization reset hidden edit/governance forms and emitted a circular dayjs warning. | Scoped synchronization to the selected job and removed the non-serializable form write. | Route reload and intake workflow completed without the warning. |
| P2 | Ant Design `Spin` and modal forms emitted runtime warnings; React 19 static modal behavior lacked the required compatibility bridge. | Nested Spin content, pre-rendered modal form trees, and registered the Answerlattice-scoped React 19 renderer bridge. | Governance/history and Knowledge Base routes reloaded cleanly; route matrix and lint passed. |
| P2 | Commercial-readiness verifier still expected the billing-email request inside the UI after the request moved to the billing client module. | Updated the verifier to inspect the UI action and client endpoint contract at their actual ownership boundaries. | Source and full commercial-readiness suites passed. |
| P2 | Security verifier required a direct Axios pin after the unused root Axios runtime was intentionally removed. | Removed only the obsolete direct-version assertion; vulnerability audits and dependency freeze remain enforced. | Root and all Functions full/production audits passed with zero vulnerabilities. |
| P1 | A real UI-shaped support-board card with assignee and tags exceeded Firestore's 1,000-expression ceiling because optional assignee, due-date, and related-reference validation families were evaluated independently even when absent. | Grouped each optional validation family so absent groups short-circuit, while preserving authorization, tenant, actor, type, length, tag, and status-history invariants. | The exact UI-shaped regression passes in dedicated/shared emulator suites; corrected QA rules were published and read back byte-for-byte; hosted create → triage → needs answer → draft ready → approved/published → resolved passed. |
| P2 | Support-board create/details modal bodies could extend past a short or mobile viewport, leaving footer actions unreachable. | Bounded both modal bodies to the dynamic viewport and enabled contained vertical scrolling while keeping the action footer outside the scroll region. | Source contract, Answerlattice TypeScript, focused lint, and support-board suite pass; hosted responsive retest is performed against the exact staging deployment. |
| P1 | Predictive-trigger create/edit serialized optional keys as `undefined`; the client closed the modal even when creation returned `null`; atomic audit writes used a hard-coded actor and client timestamp rejected by rules. | Omit absent optional fields, close only after a successful mutation, and use the authenticated actor plus server timestamp in the atomic audit. | Browser create → disable → delete lifecycle passed; dedicated/shared predictive rules and aggregate regressions passed. |
| P2 | Weekly Digest could remain on a permanent skeleton when no digest document existed, and several destroyed/modal forms were mutated before their Ant Design form tree mounted. | Added a settled empty/manual-prepare state and kept or populated each affected form only while connected, including Known Issues and Workflow Notifications. | Weekly Digest empty/manual prepare passed; Known Issues publish/edit/resolve/reopen passed; workflow notification save passed without sending; exact-page reloads produced no fresh form warnings. |
| P2 | The disabled Public API management route rendered an ambiguous near-empty page even though the feature correctly failed closed. | Added an explicit rollout-unavailable notice with no-action-needed recovery copy while preserving backend and navigation gating. | Direct route reload rendered the bounded disabled state; Public API contract, key, idempotency, emulator, and dedicated/shared rules suites passed. |

### 11.3 Fixture and evidence handling

The disposable intake fixture was synthetic and contained no customer data. It was created only in local emulators. During the certification restart, the emulator export captured the active `menulist-qa` namespace while the Answerlattice Admin client had written to the separate `neelvara-answerlattice-qa` namespace, so the first disposable documents were not restored. The fixture has now been recreated with the same owner email in both namespaces. Its generated local password was ephemeral, was not displayed or persisted, and is not needed for the Google OAuth journey.

The hosted rules-publication fixture `QA rules lifecycle — disposable 2026-08-24` contains synthetic support context only. It was moved through every supported board state and retained in `Resolved` because resolved cards are intentional recent operational history and client deletion is denied by product rules.

## Version History

| Date       | Change                                                      |
| ---------- | ----------------------------------------------------------- |
| 2026-08-24 | Closed the pre-production gate after exact QA rules publication/readback and hosted support-board lifecycle |
| 2026-08-24 | Began the final pre-production release-candidate certification; recorded route, runtime, emulator, fix, and blocker evidence |
| 2026-05-12 | Added public-key lookup cost guards, fail-closed tenant validation, scoped search-cache lookup, and tenant-filtered `kb_articles` vector index coverage |
| 2026-03-03 | Initial production certification — forensic audit from code |

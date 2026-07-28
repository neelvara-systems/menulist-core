# Founder Support Controls - Implementation

> **Status:** Source implemented; external certification pending
> **Architecture:** Additive and freeze-compatible

## Runtime Map

## Answerlattice Answer Tests Runtime Boundary

Answer Tests is enabled in source and requires `MANAGE_GOVERNANCE`. Save, run, release-check, rollback, and proposal-impact routes resolve exact session scope and apply fail-closed rate limits before the Firestore-backed permission check; limiter-provider uncertainty returns a retryable `503`, never write/provider admission. Full-runtime mode checks SAFE_MODE before loading the suite or entering the search/provider path. The persisted summary requires its exact deterministic ID, product ID, numeric tenant/store scope, supported schema, strict suite revision, valid cases, and unique case IDs. Stored releases use the strict release schema; answer-history, audit-history, and rollback proposal/audit records also require exact Answerlattice ownership and scope.

### Answer Tests

- Types and schemas: `src/lib/answerlattice/answerTestContracts.ts`
- Pure claim/evidence evaluation and proof-status derivation: `src/lib/answerlattice/answerTestEvaluation.ts`
- Input-bound run request identity: `src/lib/answerlattice/answerTestRunIdentity.ts`
- Server retrieval, evaluation, accounting, and summary persistence: `src/lib/answerlattice/answerTestServer.ts`
- Management API: `src/app/api/answerlattice/answer-tests/route.ts`
- Run API: `src/app/api/answerlattice/answer-tests/run/route.ts`
- Release check API: `src/app/api/answerlattice/answer-tests/release-check/route.ts`
- Rollback proposal API: `src/app/api/answerlattice/answer-tests/rollback/route.ts`
- Proposal impact API: `src/app/api/answerlattice/answer-tests/proposal-impact/route.ts`
- Proposal impact request/response and comparison contracts: `src/lib/answerlattice/proposalImpactContracts.ts`
- Proposal candidate preparation and deterministic comparison: `src/lib/answerlattice/governanceServer.ts`, `src/lib/answerlattice/answerTestServer.ts`
- Proposal impact browser client: `src/lib/answerlattice/proposalImpactClient.ts`
- UI and client state: `src/components/templates/answerlattice/answerTests/AnswerlatticeAnswerTests.tsx`
- Route: `src/app/(answerlattice)/answerlattice/answer-tests/page.tsx`
- Storage: `platformSummary/answerTests_{tId}_{sId}`

Each run preloads one capped entity-index query, one KB cache-version read, one compact compiled source-version read, and the latest active release, then shares an in-request canonical-answer cache across test cases. When the First 10 launch screen explicitly requests current proof, the route reads the compact source-version summary once more after saving the retained run; this detects a source mutation that occurred during execution. Standard regression-suite requests skip that post-run read. There is no cross-request preload cache. Canonical-only mode calls `attemptCanonicalRetrieval()` and FAQ retrieval directly. Full-runtime mode is limited to 10 cases, checks capacity before provider fallback, and calls a test-only search-core entrypoint that suppresses search-history and instant-cache writes. Every provider-backed case derives a deterministic accounting key from the request ID, case ID, and stable case-definition hash. The support-credit debit, store balance projection, and AI operation evidence commit atomically; a repeated settlement reads and returns the existing operation without another debit.

Before execution, the route hashes the run kind, mode, current suite revision, ordered selected case IDs, and optional release ID. A transaction reserves that request fingerprint for 15 minutes, caps concurrent reservations at five, returns a completed run only when its fingerprint matches, and rejects a reused request ID with different inputs. It also rejects a run when the suite revision changed between load and reservation. Failed pre-execution reservation release has a route-specific bounded diagnostic; TTL expiry remains the final recovery boundary. If retained-run persistence fails after execution, the reservation remains until expiry instead of allowing an immediate provider rerun. Retained-run writes remove the reservation but do not increment the suite revision, so concurrent evidence retention does not manufacture a case-edit conflict. Summary writes compact old runs and reject payloads above 480 KiB.

The version-4 proof contract includes standard/critical risk, deterministic claim checks, bounded article-reference IDs, one of three evidence policies, a six-counter governed-source snapshot, request fingerprint, and suite revision on each new run. Case admission rejects duplicate references, duplicate phrases, required/blocked phrase overlap, malformed cases, and duplicate persisted case IDs. RAG and FAQ references are projected to at most eight explicit IDs; unknown reference shapes are ignored. Canonical answers remain provable by the expected canonical-answer ID and do not require a separate article reference. The pure evaluator derives `ready`, `review`, or `blocked` from retained case results. These outcomes prove the configured deterministic contract only; no LLM judge or semantic factual-correctness guarantee is introduced.

### Feature 5 Hardening Boundary

The external Critical Answer Test Suite proposal describes a second scenario/evaluation platform, but the shipped Answer Tests runtime already owns bounded authoring, production-equivalent retrieval, side-effect-free test traffic, release checks, in-memory proposal previews, freshness, retained proof, evidence, critical blocking, and founder-facing results. No parallel route, collection, scheduler, artifact store, semantic judge, or scenario engine is admitted.

One code-level gap is verified: `ANSWERLATTICE_ANSWER_TEST_SOURCES` currently includes `rag` for every risk level, and `evaluateAnswerTestCase()` can pass a critical case when expected and actual source are both `rag`. The later implementation pass should stay inside the existing contracts:

1. Add a deterministic evaluator failure whenever `riskLevel === 'critical'` and the resolved source is `rag`.
2. Prevent new or edited critical cases from selecting `rag` in the owner form and return a specific validation message.
3. Continue parsing existing critical-RAG cases so the scoped summary does not become corrupt; their next run must fail and produce `blocked` proof.
4. Reuse the same evaluator for normal runs, release checks, First 10 proof, and proposal previews so the rule cannot diverge by surface.
5. Add focused contract tests and truthful owner copy. Do not add a Firestore migration, schema family, provider call, or summary read.

`faq` remains an admitted critical route because it resolves through published owner-controlled FAQ truth; `escalation` and `no_answer` remain valid safe outcomes when explicitly configured. This hardening does not make those sources factually correct by itself. Existing phrase, identity, context, reference, and freshness assertions still determine whether the configured contract passes.

Activation reads the current compact source-version summary independently of the last compiled bundle manifest. It accepts a retained First 10 proof only when the run covers each current First 10 case, completed after the latest case edit, has the exact current suite revision, and has the same canonical/KB/docs/entity/relation/release counters as current truth. This prevents an old pass from surviving a question, suite, or knowledge change and prevents a newly run proof from being falsely compared with an intentionally stale bundle snapshot. Legacy runs without source-version or suite-revision evidence remain visible but require one rerun. Internal counters never enter the browser response; the client receives only the bounded stale boolean and proof status. Persisted older cases still normalize to standard/no-reference-check defaults, so no migration scan is required. Retained counts/status are recomputed from admitted results, malformed durations become zero, and a corrupted run with no valid result is discarded instead of appearing ready.

Case `createdAt` and `updatedAt` are server-owned on every save. The transaction preserves both timestamps only when the normalized case definition is unchanged, preserves the original creation time when an existing definition changes, and stamps the current server time for changed or new definitions. Browser-supplied future or stale timestamps therefore cannot preserve an old launch proof.

The First 10 launch client opts into current proof with the exact `includeLaunchProof=1` query. Its GET response reads the summary and compact source versions in parallel; its save response performs the existing summary transaction and then derives the same bounded projection. Requests without that exact opt-in return the summary without the extra source-version read. The UI labels retained evidence **Stale** when its suite revision differs, displays **Current First 10 proof** separately, and describes deterministic checks as regression evidence rather than an independent correctness guarantee. The result action is named **Adopt current route and evidence**: it updates source/IDs/confidence/evidence while preserving required and blocked phrase checks for explicit owner review.

Proposal Impact Preview is an owner-triggered read-only branch of this proof runtime. The route requires both the Answer Tests and Signal Mutation flags, requires `MANAGE_GOVERNANCE`, derives workspace scope from the authenticated access record, rate-limits before the Firestore-backed permission read, fails closed when the limiter provider is unavailable, parses a bounded strict payload, and never accepts client tenant/store scope. Governance prepares the candidate with the same builder used by approval and a concrete in-memory validation timestamp. Linked-test selection preserves the complete bounded union of proposal, current-answer, and candidate entities, up to 25 from each source, so removed or newly added scope cannot be hidden by list ordering. The runtime loads the compact answer-test summary, selects at most 10 active tests linked to the target answer or any affected old/new entity, and stops before retrieval when none are linked. For linked tests it reuses the normal deterministic canonical/FAQ path, clones the request-local active-answer cache, overlays the candidate only in memory, and compares current and projected results. The browser bounds the complete request-and-response wait to 30 seconds. The flow performs no full-runtime search, support-credit debit, AI operation, retained run, reservation, signal, analytics, cache-version mutation, or proposal mutation. Final approval remains the only path that validates live entity bindings and active scope/version overlap and commits canonical truth, audit history, and invalidation state.

### Governance Navigation

`AnswerlatticeNavItem.advanced` is a presentation-only classification. Sidebar and header navigation keep the core governance loop visible while advanced routes remain in the flat route inventory, permission matrix, feature-flag checks, and direct-route handling. `GovernanceHub` exposes the authorized advanced tabs through one explicit menu and includes the active advanced screen in the visible tab set. This adds no data fetch and does not change any route authorization.

### Release Safety And Rollback

Release checks normalize the request release ID, parse the stored release through the strict Answerlattice release schema, select related test cases from the answer-test summary, and run only those cases. A critical failure marks only the retained proof result blocked; it does not mutate the release or deployment. Rollback reads the selected canonical answer, immutable audit-history payload, deterministic proposal, and paired audit row inside the same transaction. Exact product/tenant/store ownership, audit-to-answer linkage, current entity bindings, restorable snapshot, and strict procedure shape are therefore current at the write decision. If one half of a valid pair is missing, the transaction repairs it; conflicting target, mutation, source-audit, status, or audit identity fails closed. The server and browser both validate one strict rollback acknowledgement. It never modifies the answer.

### Known Issues

- Types/normalization: additive fields in `src/types/answerlattice/index.ts`
- DAL/hook: existing predictive-trigger DAL and hook
- Owner UI: `src/components/templates/answerlattice/knownIssues/AnswerlatticeKnownIssues.tsx`
- Route: `src/app/(answerlattice)/answerlattice/known-issues/page.tsx`
- Runtime: existing predictive trigger summary, predictive API, widget postMessage, and compiled context bundles

A known issue is a predictive trigger with `kind = known_issue`, `action.type = known_issue`, a bounded notice payload, and an active window. The compact summary retains bounded trigger data for owner management, while its active count excludes resolved/expired notices. Runtime evaluation checks the active window again, and nightly effectiveness scoring skips known issues so customer notices cannot be auto-disabled as low-performing prompts.

### Verified Context

## Answerlattice Widget Security Runtime Boundary

The management API requires `MANAGE_WIDGET`. Key rotation and disable share one hashed three-per-hour mutation budget, while evidence-host updates use a hashed 20-per-minute budget; all three resolve exact session scope and rate-limit before the Firestore-backed permission/store read. Responses are private/no-store. Rotation returns the PKCS#8 private key once, the client requires the one-time marker, and the secret is held only in modal state rather than the reusable public response state.

- Key management and JWT verification: `src/lib/answerlattice/verifiedWidgetContextServer.ts`
- Owner API: `src/app/api/answerlattice/widget-security/route.ts`
- Widget management Access & Security UI: `src/components/templates/answerlattice/widgetManagement/WidgetSecurityControls.tsx`
- Loader API: `identifySigned(token)` added to `public/widget/answerlattice-widget.js`
- Widget iframe: forwards token without decoding it
- Search route: verifies token after widget-key authentication and merges only allowlisted claims

The public key is stored on the exact-scoped store document under `answerlatticeVerifiedContext`. Private key material is returned once and never persisted. Widget search authenticates the widget key, normalizes the resulting tenant/store IDs as exact positive numeric Firestore document IDs, and only then verifies signed claims. Verification uses Node `crypto.verify` with `EdDSA` header enforcement, audience checking, key-ID checking, and a maximum 10-minute lifetime.

### Evidence Links

- Host API: `AnswerlatticeWidget.setEvidenceLinks([{ label, url }])`
- Loader sanitizes label/count/length and forwards links.
- Search API validates HTTPS URLs and configured host allowlist after widget-key authentication.
- Private widget-search history stores at most three validated links.
- Owner surfaces render links with `noopener,noreferrer` and never embed remote content.

Up to 10 exact HTTPS evidence hosts are managed with verified-context settings so no separate configuration collection is introduced. Rotation/disable and evidence-host mutations preserve their separate rate budgets.

### Support Truth Export

- API: `src/app/api/answerlattice/support-truth-export/route.ts`
- UI action: `src/components/templates/answerlattice/settings/AnswerlatticeSupportTruthExport.tsx` in workspace settings
- Format helper: `src/lib/answerlattice/supportTruthExport.ts`

The API uses Admin Firestore because export spans multiple governed collections and requires server-only projection. Its two-per-hour workspace/user limiter runs from exact session scope before the Firestore-backed export permission lookup and fails closed when the limiter provider is unavailable. POST is required because generation appends audit state; GET returns 405. Ordinary collection queries require exact `AL` product, tenant, and workspace scope, use explicit field projections, and are individually capped. Canonical citations are rebuilt from approved fields, unreviewed AI translations and reviewer identity are removed, and changelog release/entity links are preserved. The recursive sanitizer removes private source context, tenant/user/product identifiers, embeddings, and actor metadata. It reads at most 10 changelog page documents and 1000 entries. If any collection exceeds its cap or the response exceeds 8 MiB, the API returns a safe error; it does not return an incomplete package.

After package construction, the server creates one append-only `answerlattice_auditLogs` row with action `support_truth_export_generated`, exact Answerlattice product/workspace identity, actor, schema/type, generated time, counts, completeness, and serialized byte size. The audit contains no exported content. Dedicated and shared rules reserve this action against client forgery. The route awaits the write before returning the file, so an unavailable audit trail fails the export rather than producing an unaccounted sensitive download.

## Feature Flags

- `ENABLE_ANSWERLATTICE_ANSWER_TESTS`
- `ENABLE_ANSWERLATTICE_KNOWN_ISSUES`
- `ENABLE_ANSWERLATTICE_VERIFIED_CONTEXT`
- `ENABLE_ANSWERLATTICE_EXTERNAL_EVIDENCE_LINKS`
- `ENABLE_ANSWERLATTICE_SUPPORT_TRUTH_EXPORT`
- `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT`

Frontend and `functions-answerlattice` flags must match where scheduler/runtime behavior is involved.

## Validation And Failure Behavior

- Every management API uses `withAuth`, Answerlattice permission checks, session-derived scope, bounded JSON parsing, Zod validation, and rate limits.
- Public widget routes authenticate the widget key before resolving workspace scope.
- All new document IDs are derived from validated numeric scope.
- Error responses are generic; diagnostics log only bounded context.
- Test mode never persists production search artifacts.
- After the Feature 5 hardening is implemented, provider-backed RAG can never count as passing critical proof; legacy critical-RAG cases remain readable and fail explicitly.
- Proposal impact preview never persists a run or evaluates unapproved truth through the fallback model.
- Invalid signed context is ignored, signed-only identity claims are discarded, and generic page-aware support continues; no private fallback is attempted.
- Known-issue delivery failure never blocks normal widget answers.
- Export never exposes secret-bearing fields.

## Mobile

Answer Test Suite and Known Issues use the responsive Answerlattice dashboard shell. Dense table layouts collapse into card lists below 768px. Widget behavior remains mobile-first and no new mobile-only DAL is introduced.

## Verification

1. Focused unit tests for token verification, test-case evaluation, notice-window evaluation, evidence-link validation, and export projection.
2. Answerlattice runtime verifier updated with route, flag, and boundary assertions.
3. Root TypeScript check.
4. `functions-answerlattice` build.
5. Firestore rule/index validation if changed.
6. Browser smoke for desktop/mobile routes and widget known-issue display.

### July 11, 2026 QA deployment evidence

`npm --prefix functions-answerlattice run deploy:qa -- --non-interactive` rebuilt the Answerlattice Functions codebase successfully, then stopped before upload because Cloud Resource Manager returned HTTP 403 for project `answerlattice-qa`. No QA Function revision changed. The source and build gates are complete; deployed known-issue scoring behavior remains externally blocked until the caller receives project access.

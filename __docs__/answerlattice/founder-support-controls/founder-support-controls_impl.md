# Founder Support Controls - Implementation

> **Status:** Source implemented; external certification pending
> **Architecture:** Additive and freeze-compatible

## Runtime Map

## Answerlattice Answer Tests Runtime Boundary

Answer Tests is enabled in source and requires `MANAGE_GOVERNANCE`. Save, run, release-check, and rollback routes resolve exact session scope and rate-limit before the Firestore-backed permission check. Full-runtime mode checks SAFE_MODE before loading the suite or entering the search/provider path. Persisted summary, release, answer-history, audit-history, and existing-proposal scope must pass the shared exact Firestore document-ID normalizers.

### Answer Tests

- Types and schemas: `src/lib/answerlattice/answerTestContracts.ts`
- Server retrieval, evaluation, accounting, and summary persistence: `src/lib/answerlattice/answerTestServer.ts`
- Management API: `src/app/api/answerlattice/answer-tests/route.ts`
- Run API: `src/app/api/answerlattice/answer-tests/run/route.ts`
- Release check API: `src/app/api/answerlattice/answer-tests/release-check/route.ts`
- Rollback proposal API: `src/app/api/answerlattice/answer-tests/rollback/route.ts`
- UI and client state: `src/components/templates/answerlattice/answerTests/AnswerlatticeAnswerTests.tsx`
- Route: `src/app/(answerlattice)/answerlattice/answer-tests/page.tsx`
- Storage: `platformSummary/answerTests_{tId}_{sId}`

Each run preloads one capped entity-index query, one KB source-version read, and the latest active release, then shares an in-request canonical-answer cache across test cases. There is no cross-request preload cache. Canonical-only mode calls `attemptCanonicalRetrieval()` and FAQ retrieval directly. Full-runtime mode is limited to 10 cases, checks capacity before provider fallback, and calls a test-only search-core entrypoint that suppresses search-history and instant-cache writes. Every provider-backed case derives a deterministic accounting key from the request ID, case ID, and stable case-definition hash. The support-credit debit, store balance projection, and AI operation evidence commit atomically; a repeated settlement reads and returns the existing operation without another debit. A transaction reserves each request ID for 15 minutes before execution, caps concurrent reservations at five, returns completed runs idempotently, and releases only failures that occur before execution completes. Failed pre-execution reservation release now has a route-specific bounded diagnostic; the primary run error behavior is preserved and TTL expiry remains the final recovery boundary. If retained-run persistence fails after execution, the reservation remains until expiry instead of allowing an immediate provider rerun. Summary writes compact old runs and reject payloads above 480 KiB.

### Release Safety And Rollback

Release checks normalize the request release ID with the shared Firestore release-ID boundary, read that exact-scoped release once, select related test cases from the answer-test summary, and run only those cases. Rollback reads the selected canonical answer and immutable audit-history payload by normalized IDs, validates exact tenant/store scope, and transactionally creates one pending `version_update` mutation proposal plus its audit row. It never modifies the answer.

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

The API uses Admin Firestore because export spans multiple governed collections and requires server-only projection. Its two-per-hour workspace/user limiter runs from exact session scope before the Firestore-backed export permission lookup. Queries are tenant/store scoped, use explicit field projections, and are individually capped. It reads at most 10 changelog page documents and 1000 entries. If any collection exceeds its cap or the response exceeds 8 MiB, the API returns a safe error; it does not return an incomplete package.

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

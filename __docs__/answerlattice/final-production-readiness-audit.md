# Answerlattice Final Production Readiness Audit

> **Historical audit notice:** This July 11 snapshot is retained as audit history. The July 20, 2026 44-feature and C1-C8 source closure, including the current CI/security/recovery state and remaining production evidence, is maintained in `system-inventory/answerlattice-final-cross-cutting-audit.md`. Do not use superseded July 11 statements such as “no CI workflow exists” as current source truth.

**Audit date:** 2026-07-11  
**Branch:** `staging`  
**Verdict:** Not production-ready  
**Method:** Independent code-first attack-surface audit, focused source remediation, emulator verification, production build, HTTP smokes, dependency/secret checks, and clean re-tracing of changed flows.

## 1. Audit scope

The audit covered Answerlattice public pages, host routing, authenticated dashboard routes, NextAuth scope, product-account bridging, management permissions, widget/public credentials, public API and MCP gates, Knowledge Intake uploads, canonical-first/RAG search, billing/credit entitlement, feature flags, separate/shared Firebase configuration, rules, Storage rules, indexes, Cloud Functions, scheduler entry points, public claims, local PWA assets, and operational recovery.

Code inventory at audit time:

- 57 `src/app/api/answerlattice/**/route.ts` files.
- 3 widget API route files and 2 Help Center API route files.
- 31 Answerlattice dashboard page files.
- 75 Answerlattice public website page files.
- 11 exported Answerlattice Cloud Functions, including one consolidated schedule, four Firestore triggers, and five callable/HTTP handlers.
- 52 app-side and 14 Functions-side Answerlattice feature flags.

Existing audits were used only as assertion lists. Runtime code, configuration, and rerun tests determined this verdict.

## 2. Baseline results

Before the final fixes:

- `npm run typecheck`: pass.
- `npm run lint`: pass.
- `npm run build`: pass, 439 static pages; build workers warned when no Gemini key was available.
- `npm --prefix functions-answerlattice run build`: pass.
- Working tree: heavily dirty with pre-existing user/generated changes; no unrelated change was reverted.

The baseline compiler/build success did not prove release readiness. Independent tracing found active-workspace authorization, upload-signature, DOCX expansion, CSP, SAFE_MODE, emulator-gate, and production App Router manifest defects.

## 3. Attack-surface inventory

| Surface | Primary boundary | Status |
|---|---|---|
| Public website | Host/path middleware and public routes | Isolated production build/start HTTP smoke passed; real production host not tested |
| Dashboard | NextAuth, product account, active workspace, role permissions | Source and regression checks pass after fix |
| Public widget | Hashed key, purpose/scope, allowed origin, runtime token, bounded body/rate limits | Emulator/static checks pass |
| Public API v1 | `al_` credential, purpose/scope, rate limit, active workspace | Disabled by default; source boundary passes |
| MCP session and tools | Explicit `mcp:read` server credential, optional `signals:write`, active workspace, ready private bundle, fail-closed limits, and five-minute audience-bound session | Disabled by default; strict local protocol/tool contracts pass. Custom credential exchange is not MCP OAuth, and deployed client/per-source-permission proof remains pending |
| Knowledge Intake media | Auth, permission, active license, body cap, MIME/signature, credit ledger | Source/emulator checks pass after fix |
| RAG search | Auth/widget key, scoped cache, canonical-first, vector filters, schema/reference validation | Static/emulator contracts pass; live adversarial provider run unavailable |
| Billing | Server-owned provider evidence, scoped subscription, transactional credit accounting | Boundary and settlement tests pass |
| Scheduler | One consolidated scheduler, registry/summary discovery, bounded per-tenant tasks | Functions build and focused scheduler tests pass; deployed run unavailable |

## 4. Route and role matrix

| Actor | Public website | Dashboard | Management API | Widget/public API | Platform operations |
|---|---|---|---|---|---|
| Visitor | Allow | Redirect/deny | 401 | Credential-gated only | Deny |
| Authenticated without AL account | Allow | Pricing/onboarding path | Deny | Credential-gated only | Deny |
| Active AL owner | Allow | Allow | Owner permissions | Workspace credentials only | Deny |
| Active AL manager/staff | Allow | Permission-scoped | Permission-scoped | Workspace credentials only | Deny |
| Removed/disabled user | Allow | Deny | Deny | No user-derived grant | Deny |
| Inactive/deleted/blocked workspace | Allow public marketing only | Deny | Deny | Credential rejected after bounded cache window | Deny |
| Platform support/admin | Operational access where explicitly allowed | Owner-equivalent support context | Explicit platform path | No implicit public credential | Platform routes only |

UI visibility is not treated as authorization. Protected APIs use server-side access resolution and Firestore rules independently protect client-accessible data.

## 5. Feature-flag matrix

Generally enabled: canonical answers, ontology, drift, signal mutation, widget, hosted help, governance UI, knowledge intake, media extraction, compiled context, knowledge graph, predictive support, workflow integrations, trust/friction summaries, and nightly processing.

Intentionally disabled by default: Public API, MCP, Support Board auto-sync, native intake connectors, source sync, white label, multi-language, guided workflows, AI escalation, and signal-quality expansion.

The public website does not advertise Public API, MCP, white label, multi-language, or external workflow adapters as generally available. Support Board auto-sync remains off to prevent hidden reads/writes while manual board work remains available.

## 6. Environment matrix

| Environment | Answerlattice Firebase target | Evidence |
|---|---|---|
| Local/shared compatibility | MenuList default Firebase with AL-scoped documents | Config/static and shared-rule emulator tests |
| Local/separate emulator | `demo-answerlattice-*` projects | Firestore and Storage emulator suites |
| QA | `answerlattice-qa` | Source/config verified; deploy blocked by cloud access |
| Production | `answerlattice` | Source/config verified only; no deploy or production telemetry |

Missing or invalid Answerlattice project configuration fails closed; the runtime must not silently fall back to MenuList in separate mode.

## 7. External dependency matrix

| Dependency | Purpose | Audit state |
|---|---|---|
| Firebase/Google Cloud | Auth, Firestore, Storage, Functions | Emulator verified; QA deploy blocked |
| Gemini | embeddings, RAG, intake OCR/transcription/drafts | Prompt/accounting source checked; live provider safety/latency not run |
| Upstash Redis | rate limits and optional instant cache | Fail-closed public rate-limit paths checked; provider smoke unavailable |
| Razorpay | subscriptions and credit top-ups | Boundary tests pass; live webhook/reconciliation unavailable |
| SMTP | owner/ticket/integration email | Source and integration tests; live delivery unavailable |
| Vercel | web deployment and host routing | Local build only; no Vercel deploy requested or performed |

## 8. Security findings

### P1 fixed: inactive workspace authorization inconsistency

Management, Public API, and MCP checked exact tenant/store ownership but did not all reject inactive, deleted, auth-disabled, or platform-blocked workspaces. `isAnswerlatticeActiveStoreInScope` now centralizes exact scope plus lifecycle checks and is used at those boundaries. Regression tests cover valid, inactive, deleted, auth-disabled, and blocked workspaces.

### P2 fixed: content-type confusion in media intake

Audio/video intake accepted any supported container signature regardless of the declared MIME. Exact MIME-to-signature mapping now rejects MP4-as-MP3, AAC-as-MP3, WAVE-as-OGG, and other mismatches before provider accounting/extraction.

### P2 fixed: browser DOCX expansion risk

An 8 MB DOCX could expand `word/document.xml` without an uncompressed-size/ratio check. Browser extraction now rejects missing size metadata, more than 4 MB XML, and compression ratios over 200 before allocating the XML string.

### P2 fixed: separate Functions blocked by CSP

The CSP allowed MenuList callable Function hosts but not fixed Answerlattice QA/production Function origins. Both Answerlattice origins are now allowlisted. `poweredByHeader: false` removes the framework identifier at the Next configuration layer.

### Unresolved security release blocker

The dependency graph reports 3 critical, 26 high, 29 moderate, and 2 low advisories. The pinned Next.js 14.2.35 line is end-of-life and current official advisories require migration to a supported major. A broad Next/React/runtime migration cannot be safely completed as an incidental patch in this dirty worktree. Production release is blocked until the dependency freeze is deliberately migrated and all gates rerun.

Secret scanning found current service-account/local-secret files ignored and untracked. Git history contains private-key/API-key signature hits, including historical `.env.testing.local`. The audit did not print values and cannot prove whether historical values remain live. Credential rotation/disablement must be confirmed operationally before production.

## 9. AI/RAG findings

- Canonical answers are checked before owner FAQ and RAG fallback.
- Vector search requires `pId=AL`, published/active status, exact `tId`, and exact `sId`, with limit 12 and prompt context capped to 6 documents.
- Retrieved documents and image text are explicitly treated as untrusted, not instructions.
- Generated JSON is strict-schema validated; references must resolve to supplied documents or the answer is blocked unless it is an explicit KB refusal.
- Image URL reads are restricted to configured Firebase Storage buckets and exact tenant/store chat-image paths; inline/fetched image sizes and signatures are bounded.
- AI writes remain drafts/proposals until human review.
- Live provider red-team cases were not executed because no controlled provider fixture/credential was available. Static and deterministic boundaries pass, but this remains a production test requirement.

## 10. Reliability findings

### P1 fixed: successful build produced a 500 App Router runtime

The custom server-chunk compatibility plugin added normalized URL aliases to Next's `app-paths-manifest.json`. Next matched an alias such as `/sites/answerlattice/home`, while the generated client-reference manifest was keyed by the canonical `/sites/answerlattice/home/page`, leaving `clientModules` undefined for every App Router page. The plugin now repairs only canonical emitted app entry keys. A clean isolated build plus `next start` returns 200 for `/`, `/__answerlattice`, pricing, security, and `/answerlattice`; protected APIs reject unauthenticated requests. `NEXT_DIST_DIR` is opt-in so concurrent release jobs can use separate mutable build output without changing the production `.next` default.

### P2 fixed: SAFE_MODE read failure spent-provider risk

When cost protection was enabled but `opsConfig/system` could not be read, search previously failed open. It now logs a bounded diagnostic and returns the maintenance response before embedding/model work. A missing SAFE_MODE document still permits normal operation.

### P2 fixed: feedback rules aggregate instability

The feedback rule test performed concurrent transaction reads before expected-denied writes, leading to emulator lock timeouts after the test printed success. The atomic denial test now performs only the intended writes; isolated and shared feedback rule suites exit cleanly.

Background processing has bounded task caps, per-tenant failure isolation, idempotency records, compact summaries, TTL metadata, and one consolidated scheduler. Cloud execution/retry behavior remains unverified until QA deploy access is restored.

## 11. Performance findings

- Widget loader: 47,247 bytes raw and 10,303 bytes gzip in the local audit.
- No Answerlattice realtime `onSnapshot` listener was found in the audited Answerlattice templates/hooks/DAL path; dashboard work is summary/one-time-read oriented.
- Activation reads compact summary documents in parallel.
- Public runtime paths use bounded caches and bounded response/request bodies.
- Production build shows large authenticated Answerlattice route bundles near 1 MB first-load JS for some dashboard pages. This is a P2 mobile/performance risk requiring bundle analysis and browser measurements before general production, not a correctness regression introduced by this audit.
- No production p50/p95/p99 or host-page widget impact telemetry was available.

## 12. Cost findings

- Active workspace rejection adds no Firestore reads; it validates the already-loaded store document.
- Exact media signatures and DOCX caps prevent provider/browser work before any new database operation.
- SAFE_MODE behavior uses the existing one-document read and now avoids downstream embedding/model operations when that read fails.
- CSP and server-header changes add no Firebase or provider cost.
- The test-harness fix adds no runtime cost.
- Existing scheduler and dashboard patterns remain bounded/summary-backed; Support Board auto-sync remains off by default.

Exact financial savings cannot be claimed without production traffic and billing telemetry.

## 13. Accessibility findings

Source components use semantic headings, Ant Design form labeling, keyboard-capable controls, and reduced-motion website behavior. PWA/static asset checks pass. The in-app browser runtime reported no available browser, so keyboard-only, screen-reader, Safari, mobile Safari, 200% zoom, focus trap, and real color-contrast tests were not executed. This blocks a full accessibility release gate.

## 14. Privacy findings

Public privacy/security copy lists Firebase/Cloud, Gemini, Razorpay, SMTP, Upstash, and website analytics. Runtime intake keeps extracted/redacted text and does not persist raw media. Widget screenshots are user-initiated, bounded, and not written as persistent files by the widget search flow. Search/context logging uses bounded metadata rather than raw credentials.

Implemented TTL windows are documented for query embeddings, search history, signals, friction stats, notifications, contact enquiries, integration logs, and scheduler logs. Legal review, verified deletion/export operations, and provider contractual terms remain external requirements.

## 15. Dependency findings

`npm audit --omit=dev --audit-level=high` failed with 60 total advisories. Direct high/critical packages include Next.js, jsPDF, Axios, Nodemailer, `ws`, Fabric, and `next-pwa`; protobufjs is a critical transitive dependency in Firebase/Google libraries. The freeze verifier passing means versions match policy, not that they are secure. The correct target is a controlled dependency migration with package-specific exploitability review, not `npm audit fix --force`.

## 16. Deployment findings

- App and Functions builds pass locally.
- Separate and shared rules/index configuration parse and emulator tests pass.
- Answerlattice QA Firebase rules/indexes/Functions deployment remains blocked by cloud HTTP 403 Service Usage/IAM access; no remote change was made.
- Vercel deployment was not requested and was not performed.
- No CI workflow exists under `.github/workflows`; release gates currently depend on local execution. This is a P1 process risk before multi-contributor production release.
- Deploy order: rules/indexes, Functions, web application, controlled feature enablement, smoke/rollback verification.

## 17. Changes implemented

- Added active workspace lifecycle enforcement to management, Public API, and MCP.
- Added exact intake media signature validation.
- Added DOCX decompression size/ratio guards.
- Made SAFE_MODE read failure stop provider work.
- Added Answerlattice QA/production Function hosts to CSP.
- Disabled `X-Powered-By` through Next configuration.
- Removed invalid normalized App Router manifest aliases that caused production 500 responses.
- Added opt-in isolated Next build output for concurrent release verification.
- Stabilized feedback rules atomic-denial tests.
- Added an exhaustive success guard for the shared MenuList messaging fix-request union found during the integrated build gate.
- Added focused file-safety and active-scope regression checks.
- Added this final source verifier and incident/recovery runbook.
- Corrected stale Functions retention commentary to match Firestore TTL behavior.

## 18. Tests and commands

Passing evidence:

- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm --prefix functions-answerlattice run build`
- `npm run verify:auth-security-failure-matrix`
- `npm run verify:billing-entitlement-boundary`
- `npm run test:billing-settlement-boundaries`
- `npm run verify:env-targets`
- `npm run verify:dependency-freeze`
- `npm run verify:answerlattice-pwa`
- `npm run verify:answerlattice-public-content-boundary`
- `npm run verify:answerlattice-feedback-boundary`
- `npm run verify:answerlattice-faq-boundary`
- `npm run test:answerlattice-canonical-scope`
- `npm run test:answerlattice-intake-file-safety`
- `npm run test:answerlattice-feedback:rules`
- `npm run test:answerlattice-feedback:shared-rules`
- `npm run test:answerlattice-governance:rules`
- `npm run test:answerlattice-governance:shared-rules`
- `npm run test:messaging-fix-request:emulator`
- Split execution of every remaining Firebase forensic component suite after the aggregate wrapper timeout; all component assertions exited 0.
- `NEXT_DIST_DIR=.next-answerlattice-audit NEXT_SKIP_NEXT_BUILD_CHECKS=1 npm run build` after independent `typecheck` and `lint`: pass, 439 static pages.
- `NEXT_DIST_DIR=.next-answerlattice-audit npm start -- -p 3011`: public route/header smoke passed; protected/disabled route behavior matched policy.

The monolithic Firebase forensic aggregate exceeded the execution wrapper window after 23 passing suites. The feedback emulator shutdown defect was fixed, and every remaining component suite was executed independently in isolated and shared modes with exit code 0. This is complete component coverage, not evidence that one long orchestration command can run inside this tool window.

Failed or unavailable evidence:

- `npm audit --omit=dev --audit-level=high`: failed, 60 advisories.
- `npm run verify:production-readiness-local`: stopped at 50/112 because a concurrently edited MenuList verifier still expected the prior queue diagnostic shape; the current `verify:menulist-api-tenant-safety` was rerun immediately and passed. The aggregate was not restarted while other processes were actively changing the shared worktree.
- In-app browser discovery: no browser available.
- `firebase deploy --project answerlattice-qa --config firebase-answerlattice.json --only firestore:rules,firestore:indexes,storage,functions`: Functions predeploy build passed, then Service Usage returned HTTP 403 before any remote change.
- Backup/restore rehearsal: no configured evidence or isolated cloud target.
- Production provider, payment webhook, DNS, browser/device, latency, and billing telemetry: unavailable.

## 19. Remaining limitations

| Priority | Limitation | Required action | Production impact |
|---|---|---|---|
| P1 | End-of-life/vulnerable frozen dependency graph | Plan supported Next migration and safe direct/transitive dependency updates; rerun all gates | Blocks production |
| P1 | No verified backup and restore rehearsal | Configure exports, retention/IAM, then rehearse isolated restore | Blocks production |
| P1 | QA Firebase deploy blocked | Restore Service Usage/Firebase deploy IAM and deploy smallest required targets | Blocks production validation |
| P1 | No CI release workflow | Add required protected release gates during dependency migration | Blocks reliable team release |
| P2 | No real browser/device/a11y run | Run Chrome/Firefox/Safari/mobile/keyboard/screen-reader QA | Blocks general availability |
| P2 | No live provider/payment/DNS rehearsal | Run controlled QA journey with capped spend and test webhook | Blocks general availability |
| P2 | Large dashboard bundles | Run bundle analyzer and browser performance budget; split heavy screens | Controlled-beta risk |
| P2 | Historical secret signatures unverified | Confirm rotation/revocation and scan full history with approved tooling | Blocks production until resolved |

## 20. Rollback considerations

The source fixes are backward-compatible and do not change stored schemas. Active-workspace checks can be rolled back independently but should not be removed. File-safety caps can be tuned if legitimate files are rejected. SAFE_MODE fail-closed behavior can be reverted only with explicit cost-risk acceptance. The App Router manifest fix can be reverted independently, but doing so restores the proven production 500. `NEXT_DIST_DIR` is opt-in and defaults to `.next`. No migration or production data mutation was performed. Firebase deployment remains pending, so remote rollback was not needed.

## 21. Final verdict

**Not production-ready.**

The changed source paths are stronger and their focused tests pass. However, objective release gates fail because the dependency graph is vulnerable/end-of-life, backup restoration is not implemented or rehearsed, QA infrastructure deployment is blocked, browser/accessibility and external-provider journeys are unverified, historical credential rotation is unconfirmed, and no CI release workflow enforces the gates.

## 22. Final confidence statement

Fully verified locally: changed authorization/file-safety/SAFE_MODE/CSP/App Router manifest paths, TypeScript, lint, isolated production build/start, Functions build, billing boundaries, shared/separate rules components, widget-key/search/intake emulator flows, PWA assets, and public-content boundaries.

Partially verified: monolithic Firebase orchestration, production host routing, AI prompt-injection behavior, scheduler execution, billing lifecycle, accessibility, and performance. Firebase components and source/deterministic gates are covered, but required cloud/browser/provider evidence is missing.

Unverified: production deployment state, production secrets/rotation, backup existence and restore time, production traffic/cost/latency, live payment webhooks, DNS/OAuth callbacks, and real browser/device behavior.

Not every objective release gate passed. The final source clean pass passes locally, but the external blockers above continue to prevent a production-ready classification until they are resolved with operational evidence.

## 23. Superseding local certification update — 2026-08-24

This update supersedes the older local dependency, browser, and source-evidence
statements in sections 15-22. It does not convert local evidence into hosted QA
or production evidence.

### Current local verdict

**NOT READY FOR PRODUCTION.** The complete local certification round is green,
but hosted QA and product-specific AI-provider execution remain unverified. No
payment-provider transaction, charging, refund, or payment-webhook completion
was executed.

### Defects fixed and retested

- Widget questions now persist a tenant/workspace-scoped, idempotent,
  50-message-bounded owner conversation. The end-user canonical-answer flow was
  repeated from a fresh emulator and the two-message transcript appeared in the
  owner Conversations screen.
- Widget feedback now updates the matching assistant transcript inside the
  existing feedback transaction. Replay semantics remain idempotent; the fresh
  browser pass showed `Helpful` and `100% positive feedback`.
- The local subscription fixture now includes a current credit cycle and a
  bounded 100-credit allowance, so the real widget flow does not fail with an
  unintended zero-credit `402`.
- Signed-out Answerlattice deep links preserve a sanitized callback path and
  cannot trust an inbound spoofed routing header. A fresh
  `/answerlattice/tickets` journey returned to that exact route after login.
- The narrow ticket segmented control now keeps Dashboard, Ticket Queue, and
  Deleted visible in one horizontal line. The owner navigation and real widget
  were also checked at a 390-by-844 viewport.
- Knowledge Intake no longer validates a hidden form, and the article editor
  synchronously hydrates the selected article before opening. Representative
  MenuList source text was generated, reviewed, accepted, published, searched,
  and edited locally.
- Deprecated Ant Design Empty and Modal properties were migrated across the
  reachable shared surfaces. The production build succeeds; the remaining
  Ant Design React 19 compatibility message is development-only and does not
  appear as a production build failure.
- The local development-port preflight is repository-scoped and bounded instead
  of issuing unguarded process kills.

### Current passing evidence

- `npm run verify:answerlattice-runtime-truth` — full aggregate passed, including
  dedicated/shared Firestore and Storage rules, lifecycle, staff access,
  tickets, conversations, analytics, billing, scheduler, integrations,
  retrieval, governance, support controls, daily brief, and knowledge map.
- `npm run verify:answerlattice-widget-conversation-emulator` — create, replay,
  append, workspace isolation, and cleanup passed.
- `npm run verify:answerlattice-final-readiness` — passed.
- `npm run typecheck:answerlattice` — passed.
- `npm run lint` — passed with zero warnings.
- `npm --prefix functions-answerlattice run build` — passed.
- `npm --prefix packages/answerlattice-web run build` — passed.
- `NEXT_DIST_DIR=.next-answerlattice-certification NEXT_SKIP_NEXT_BUILD_CHECKS=1 npm run build`
  — passed with 451 static pages; the generated output was moved outside the
  worktree after verification.
- `npm run verify:dependency-freeze` — passed.
- `npm run verify:answerlattice-security-audit` — root and all Functions full
  and production audits reported zero vulnerabilities.
- `npm run verify:answerlattice-backup-recovery` — backup/recovery contracts
  passed; this is not a hosted restore rehearsal.
- `npm run verify:answerlattice-pwa` and `git diff --check` — passed.
- Chrome fresh-system journey — exact auth callback, owner Ticket Inbox,
  embedded canonical answer, solved feedback, persisted owner transcript, and
  mobile widget/owner controls passed against Auth, Firestore, and Storage
  emulators.

### Remaining gates

- Local embedding and provider-backed RAG correctly remain unavailable because
  the disposable local environment has no Answerlattice Gemini credential. The
  Vercel QA environment already has a dedicated hidden
  `ANSWERLATTICE_GEMINI_AI_KEY`, and eight active QA Functions bind secret
  version 3; verify provider-backed behavior on hosted QA after deployment.
- Enable Chrome extension access to local file URLs before the final automated
  upload-chooser pass. Pasted-text ingestion and server/browser file-safety
  contracts are already green.
- Deploy this release candidate to the Vercel QA environment only after explicit
  deployment authorization, verify its build ID, then repeat the fresh-system
  journey on the hosted QA origin.
- Firebase CLI access for `admin@neelvara.com` was reauthenticated. Read-only
  inventory confirmed 13 active QA Functions, 12 active production Functions,
  103 indexes and 18 TTL fields in each project, plus dedicated Gemini secret
  bindings in both environments. This inventory does not prove exact deployed
  Rules or source-hash parity; no infrastructure deploy was requested or
  performed in this round.
- Rehearse a hosted backup restore, provider failure/timeout behavior, and the
  supported physical-device/browser matrix before the final production verdict.

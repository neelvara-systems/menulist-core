# Answerlattice Final Cross-Cutting Audit

> **Audit date:** 2026-08-02 Stack Change Watch refresh of the 2026-07-20 closure
> **Scope:** Final C1-C8 pass after the strict 44-feature audit, including the Feature 3 Source Governance overlay, C3 workspace-lifecycle hardening, and product-scoped Gemini spend admission
> **Verdict:** All 44 feature flows and C1-C8 are local-source complete. Answerlattice is not production-certified because required cloud, recovery, browser, provider, and real-client evidence remains external.

## Result

The feature-by-feature audit is complete. Current code, dedicated/shared Firebase policies, maintained docs, focused tests, the complete Answerlattice runtime/emulator aggregate, Functions build, SDK build, strict TypeScript, dependency policy, security policy, backup/recovery contracts, and diff integrity provide the local evidence.

“Local-source complete” does not mean deployed or generally available. It means the source contracts, explicit non-goals, focused verification, and documented external evidence boundaries are coherent on this worktree.

The July 26 Source Governance hardening overlay does not create Feature 45. It strengthens Feature 3 by making source authority, approval, access, citation, applicability, review dates, and unresolved conflicts explicit before source evidence can support a canonical proposal. The workspace lifecycle likewise closes the existing C3 deletion/retention gap instead of creating another product feature. Both remain off by default.

## C1-C8 closure

| ID | Contract | Local verdict | Verified boundary | Required external evidence |
| --- | --- | --- | --- | --- |
| C1 | Product doctrine, separation, environment naming, Firebase identity | Pass | Answerlattice remains `AL` with full-name environment keys, dedicated QA/production projects, separate Firebase config/Functions, and MenuList only as a client/shared-code neighbor. | Read back deployed QA and production project/config state before release. |
| C2 | Auth, tenant/source permissions, privacy, PII, isolation | Pass | Active-workspace admission, exact `pId/tId/sId`, `MANAGE_KNOWLEDGE`, active-license enforcement, key purpose/scope, dedicated/shared rules, bounded private projections, and source/evidence privacy gates pass. Source-governance conflict IDs are validated inside the same intake job and audit events do not copy source content. | Verify real staff-token propagation, App Check decision, provider data handling, and cross-role hosted journeys. |
| C3 | Schema, rules, indexes, TTL, retention, deletion, restore | Source pass; rollout evidence pending | Dedicated/shared Firestore and Storage rules now use live active-workspace checks. Internal flag-gated closure denies access before public cleanup; recovery restores access only; explicit bounded erasure rechecks billing/export/legal gates, preserves declared evidence and foreign records, cleans exact data/Storage/staff/Auth projections, and leaves a compact tombstone. No lifecycle scheduler/index/TTL is added. | Deploy/read back QA rules and TTL state, verify Storage-to-Firestore rule permission, run an isolated restore, and rehearse close/recover/erase with a disposable workspace and dedicated staff Auth identities. |
| C4 | Schedulers, operations, observability, summary docs, cost, scale | Pass for current scale | One consolidated scheduler, leases, caps, compact summaries, stable diagnostics, integration delivery state, and current-workspace cost controls pass. Billed Gemini attempts reserve and settle the bounded `geminiSpendWindows/answerlattice` record in the dedicated/shared Answerlattice database; this adds two transaction reads and two writes per attempt without a listener, index, scheduler, scan, or tenant payload. A common source-governance save adds 2-7 transaction reads/writes; replacing five previous conflicts with five new peers is bounded at 12/12. Canonical acceptance/publication adds at most five direct evidence reads. | Verify the spend record and provider-side Gemini API cap in QA, verify a deployed scheduler run, measure governance-review cost in one real workspace, and load-test 1,000+ simultaneously due workspaces before redesigning fan-out. |
| C5 | AI safety, accounting, rate limits, prompt injection, evidence | Pass | Canonical-first retrieval, fallback boundaries, untrusted-source instructions, schema/reference checks, AI accounting, fail-closed limits, safe abstention/escalation, and human approval pass. Gemini calls now reserve the Answerlattice project rolling spend window before I/O; transient `429` uses structured retry timing/full jitter while hard quota fails fast. Source authority is reviewer-declared, support signals never become truth automatically, reciprocal conflict links keep either source ineligible, and canonical acceptance/publication recheck approved, conflict-free evidence. Usage volume and proposal/extractor scores cannot become canonical correctness. | Run a representative 50-100 question client set plus live-provider adversarial, rolling-limit, latency, and cost testing; measure whether reviewers can apply source authority consistently. |
| C6 | Responsive/mobile, accessibility, localization, timezone | Source pass | Maintained mobile/responsive contracts, safe widget behavior, origin/source-bound guidance messages, bounded copy, workspace timezone fields, scheduler-time contracts, and a responsive Source Governance modal are present. Client-reported guide completion is not treated as independent backend proof. | Complete desktop/mobile browser, keyboard, screen-reader, zoom, contrast, Safari, Source Governance narrow-width, and host-page performance evidence. |
| C7 | CI, dependency freeze, deployment, backup, recovery | Source pass; operationally incomplete | CI workflow, pinned toolchain, dependency/security gates, backup command guards, and recovery runbook pass locally. | Obtain a successful remote CI run, restore Firebase authentication, deploy QA, configure a ready managed backup, and rehearse restore with measured RPO/RTO. |
| C8 | Flags, docs, public claims, packaging, rollout truth | Pass | Rollout-gated features remain off or explicitly controlled. `ENABLE_ANSWERLATTICE_SOURCE_GOVERNANCE` remains false; native connectors, opaque scoring, usage-based confidence, auto-conflict resolution, automatic source authority, and autonomous actions remain absent. Docs and public claims preserve those boundaries. | Verify first-client packaging, pricing/payment, onboarding, hosted deployment, and a bounded source-review pilot before enabling or making general-availability claims. |

## Defects found and fixed

The final Functions build found that `emailAdapter.ts` and `slackAdapter.ts` still called the shared `safePayloadRatio()` guard for coverage percentages after its imports were accidentally removed while opaque proposal-confidence output was deleted. The imports were restored. Confidence remains absent; bounded coverage formatting remains intact.

The frozen-order summary marked Feature 29 complete while its detailed ledger still carried a stale in-progress status, despite a complete dossier and passing contract/emulator evidence. The detailed status is reconciled, and runtime truth now parses all 44 summary rows and detailed sections to enforce exact order, title parity, and local-completion status.

The July 26 Source Governance refresh found no need for a new feature number, Firestore rule/index change, scheduled job, connector, or workflow engine. It added a static Source Governance source gate so future drift in the flag, schema, transaction, API admission, permission, local client update, review UI, browser-write denial, emulator proof, cost contract, or audit ledger fails the maintained Answerlattice runtime verifier.

The C3 completion pass found that the data inventory promised full workspace closure/erasure but no executable lifecycle owned it. The added internal control denies access through live store state before deleting hosted/public runtime output, refreshes staff claims, starts a fresh recovery window after a recovered workspace is closed again, and performs only explicitly continued capped deletion. Shared legacy store/tenant rules now preserve the dedicated server-owned Answerlattice boundary so a stale token cannot read or reopen a closed workspace shell.

The final current-worktree C1 recheck found one verification-maintenance mismatch outside the Answerlattice runtime: the production-readiness checklist had adopted the newer provider-resilience and Upstash preflight wording while `verify:env-targets` still required the retired sentence. The assertion now follows the maintained checklist. Product identity, full-name environment keys, dedicated Firebase targets, and explicit shared-mode compatibility behavior required no runtime change.

The August 2 Stack Change Watch found that Answerlattice's separate Gemini
credentials still shared project-wide quota behavior across keys. The app and
Functions gateways now use the same byte-identical model-price and rolling
spend policy while writing only the Answerlattice project's
`geminiSpendWindows/answerlattice` record. Default admission is USD 8 per ten
minutes, configurable through
`ANSWERLATTICE_GEMINI_SPEND_LIMIT_USD_10M`. Provider-side Gemini API spend-cap
setup, QA deploy, and live rate/cost smoke remain external evidence; no public
surface, doctrine, index, scheduler, or cross-product database was added. The
dedicated and shared Answerlattice rule paths now explicitly deny browser
access to the server-only spend record, backed by the focused emulator matrix.

## Verification

The original July 20 C1-C8 closure passed:

- `npm run verify:answerlattice-runtime-truth`
- `npm run verify:answerlattice-final-readiness`
- `npm run verify:answerlattice-security-audit`
- `npm run verify:answerlattice-backup-recovery`
- `npm run verify:answerlattice-founder-support-controls`
- `npm run verify:dependency-freeze`
- `npm run typecheck:answerlattice`
- `npx tsc --noEmit --pretty false`
- `npm --prefix functions-answerlattice run build`
- `npm --prefix packages/answerlattice-web run build`
- `npm run test:answerlattice-integration-adapter-boundaries`

The July 26 Source Governance refresh passed:

- `npm run test:answerlattice-source-governance`
- `npm run test:answerlattice-knowledge-intake-contracts`
- `npm run test:answerlattice-knowledge-intake:rules`
- `npm run test:answerlattice-knowledge-intake:shared-rules`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- focused Source Governance and runtime-verifier ESLint
- `npx tsc --noEmit --incremental false`
- `npm run typecheck:answerlattice`
- `npm run docs:check-links` with zero broken links; 62 unrelated existing filename warnings remain

The July 26 C3 workspace-lifecycle pass passed:

- `npm run verify:answerlattice-workspace-lifecycle`
- `npm run test:answerlattice-workspace-lifecycle-contracts`
- dedicated and shared workspace-lifecycle Firestore rule emulators
- dedicated and shared Firestore-backed Storage rule emulators
- the Firestore/Storage service emulator covering close, recovery, a fresh re-close window, capped erasure, foreign-row preservation, retained evidence, tombstone completion, and replay
- Answerlattice runtime source verification, focused lint, exact TypeScript, documentation links, package parse, and diff integrity

The final current-worktree C1 recheck also passed:

- `npm run verify:env-targets`
- `npm run test:answerlattice-firebase-project-boundary`
- `npm run verify:answerlattice-final-readiness`
- `node scripts/verification/verify-answerlattice-runtime-truth.js`
- `env -u GOOGLE_APPLICATION_CREDENTIALS npm run verify:answerlattice-runtime-truth`
- `npm run typecheck:answerlattice`
- `npm run verify:dependency-freeze`
- `npm --prefix functions-answerlattice run build`
- `npm --prefix packages/answerlattice-web run build`
- focused verifier syntax, ESLint, and diff integrity

`npm run verify:dependency-freeze` and full root lint pass on the current
worktree. The concurrent Gemini migration is now reconciled with the exact
freeze contract. The final dependency graph gives legacy `minimatch` 3 its
compatible `brace-expansion` 1.1.16 and modern `minimatch` 10 patched 5.0.8;
both consumers run.

Security-policy result: root runtime has zero critical findings and retains one high plus one moderate npm entry for the same stable Next 16.2.11 nested PostCSS chain. Fabric 7.4.0 cleared the former native canvas/tar family; Firebase Admin 14.2.0 and the UUID 11.1.1 compatibility override cleared the root Firebase/Storage/ExcelJS moderate chain. Answerlattice Functions now pin the stable Firebase Admin 13.10.0 / Firebase Functions 6.6.0 pair through modular entry points and report zero vulnerabilities in both full and production audits after a clean install.

## Deployment evidence

The required scoped QA attempts were made after the relevant local verification passes:

```text
firebase deploy --only functions:answerlatticeNightly,functions:triggerAnswerlatticeNightly --project answerlattice-qa --config firebase-answerlattice.json --non-interactive
firebase deploy --only firestore:rules,functions:answerlatticeNightly,functions:processIntegrationEvent --project answerlattice-qa --config firebase-answerlattice.json --non-interactive
firebase deploy --only firestore:rules --project menulist-qa --config firebase.json --non-interactive
firebase deploy --project answerlattice-qa --config firebase-answerlattice.json --only firestore:rules,storage --non-interactive
firebase deploy --project menulist-qa --config firebase.json --only firestore:rules,storage --non-interactive
```

All stopped before upload with:

```text
Error: Failed to authenticate, have you run firebase login?
```

No QA or production revision changed. No Vercel deployment was requested or performed.

The August 2 Stack Change Watch retry used the affected Answerlattice Gemini
subset only:

```text
firebase deploy --project answerlattice-qa --config firebase-answerlattice.json --only functions:answerlattice:startGeneration,functions:answerlattice:retryGeneration,functions:answerlattice:answerlatticeNightly,functions:answerlattice:triggerAnswerlatticeNightly,functions:answerlattice:embedArticleWorker,functions:answerlattice:regenerateEmbedding --non-interactive
```

It stopped before predeploy/upload with the same unauthenticated CLI error. No
remote Function revision changed.

## Remaining release order

1. Restore Firebase authentication and deploy/read back the reviewed dedicated Answerlattice QA Firestore and Storage rules; verify the Storage service account can evaluate the live Firestore workspace check.
2. Rehearse close, recover, re-close, and final erasure on a disposable QA workspace with hosted help, compiled objects, retained billing evidence, and dedicated staff Auth identities. Keep the lifecycle flag off until the evidence is captured.
3. Run authenticated desktop and narrow-width Source Governance review in QA, then let one real SaaS workspace review a bounded evidence set and measure reviewer effort plus blocked-proposal behavior before enabling its flag.
4. Obtain one successful remote Answerlattice CI run.
5. Configure a QA managed backup and complete an isolated timed restore rehearsal.
6. Run the first-client 50-100 question answer-quality set and the full widget/fallback/handoff journey.
7. Complete browser, accessibility, payment, email, DNS, provider, and telemetry evidence.
8. Keep native connectors, opaque signal scoring, autonomous account actions, multilingual delivery, cross-surface white label, automatic authority, and automatic conflict resolution off until their documented evidence gates are met.

## Final product decision

The next valuable work is first-client proof of the governed answer loop, not another horizontal feature. Answerlattice should prove that a founder can import real support knowledge, approve the highest-value answers, deploy one safe support surface, resolve or correctly escalate real questions, and maintain truth after product changes with low weekly review effort.

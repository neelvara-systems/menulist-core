# MenuList SignalDesk Codex Audit Follow-Up - 2026-06-24

## Executive Verdict

**Verdict after blocker fixes: PASS for local trial.**

The four audit blockers are closed for local validation:

- Full local E2E first-build loop now runs against the Firestore emulator.
- Source-policy expiry/review-required/retention/use gates are modeled and enforced.
- Mobile mutation paths are server-blocked, with emergency pause as the only allowed mobile mutation path.
- Firestore and Storage semantic rules tests now cover unauthenticated, MenuList-owner, inactive-member, active-member, and platform-admin contexts.

This is not production or real-outreach clearance. Provider send remains disabled, no Firebase deploy was run, no real paid provider API was called, and SignalDesk remains private/internal.

Final recommendation: **safe for local desktop trial and safe for local mobile observe-only trial. Safe for real outreach only after separate sender/legal/provider review.**

## Commands Run

| Command | Result | Notes |
| --- | --- | --- |
| `git status --short` | PASS with dirty worktree | Worktree already contained unrelated modified/untracked files. I did not revert unrelated work. |
| `npm run verify:signaldesk` | PASS | `SignalDesk runtime verifier passed (1731 checks)`. |
| `node scripts/verification/smoke-signaldesk-routes.js` | PASS after warm rerun | First attempt timed out while Next compiled `/signaldesk`; rerun passed with `SignalDesk route/API smoke passed (45 checks)`. |
| `npm run test:signaldesk:e2e:local` | PASS | Firestore emulator E2E passed. No real send/provider call. |
| `npm run test:signaldesk:rules` | PASS | Firestore/Storage emulator semantic rules verifier passed. Expected denied-write logs were emitted by Firebase SDK. |
| `npx tsc --noEmit --incremental false --pretty false` | PASS | No TypeScript errors after source-policy/mobile changes. |
| `git diff --check` | PASS | No whitespace errors. |
| `firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"` | PASS | Firestore emulator config/rules/index parse succeeded. |

## Findings

| Severity | Area | Finding | Evidence | Risk | Required Fix | File(s) |
| --- | --- | --- | --- | --- | --- | --- |
| LOW | Route smoke | Cold Next compilation can exceed the route-smoke timeout on first run. Warm rerun passes. | First route smoke timed out requesting `/signaldesk`; rerun passed 45 checks. | False-negative local smoke if app is cold. | Start dev server and wait for `/signaldesk` compile, or rerun once after warmup. | `scripts/verification/smoke-signaldesk-routes.js` |
| LOW | Rules tests | Firebase SDK prints expected `PERMISSION_DENIED` logs for `assertFails()` operations. | `npm run test:signaldesk:rules` exits 0 while denied-write/read logs appear. | No runtime risk; logs are noisy. | Accept as rules-unit expected output or add SDK log silencing later. | `scripts/verification/verify-signaldesk-security-rules.js` |
| MEDIUM | Team metadata | Any active SignalDesk member can read `signaldeskTeamMembers` docs under current rules. | Rules allow `isSignedInSignalDeskMember()` reads for team-member docs. | Fine while docs hold non-sensitive metadata; broader than least privilege if sensitive team fields are added later. | Before storing sensitive team metadata, restrict normal members to own doc or summary-only docs. | `firestore-signaldesk.rules` |
| MEDIUM | Real outreach readiness | Local loop is proven, but real outreach still needs sender/legal/provider review. | Provider send flag remains disabled; E2E uses export-only path and local webhook secret. | Unsafe outreach if enabled without sender identity, address, unsubscribe, complaint, and source-policy review. | Keep real send/provider spend disabled until separate review. | `src/config/features.ts`, `src/lib/signaldesk/workflowServer.ts` |

No BLOCKER or HIGH findings remain for the requested local blocker-fix scope.

## Source-Policy Expiry Behavior

`SignalDeskSourcePolicy` now supports `approvedAt`, explicit/computed expiry, provider identity, expanded allowed-use flags, and `policyState` values: `active`, `expires_soon`, `expired`, and `review_required`.

`assertSourcePolicyUsable()` blocks missing, inactive, expired, legacy unbounded, missing-retention, blocked/suppressed, wrong-provider, wrong-source-type, and disallowed-use policies. Blocked source-policy actions write `source_policy_block` audit events and return safe errors:

- `SOURCE_POLICY_EXPIRED`
- `SOURCE_POLICY_REVIEW_REQUIRED`
- `SOURCE_POLICY_USE_NOT_ALLOWED`
- `SOURCE_POLICY_RETENTION_MISSING`

Covered paths include import, provider run, evidence, draft, approval, export/handoff, sequence/send, enrichment, AI assist, and retention refresh.

## Mobile Read-Only Behavior

Mobile detection uses `x-signaldesk-client-mode`, `sec-ch-ua-mobile`, and mobile user-agent signals.

Server behavior:

- `/api/signaldesk/actions` blocks mobile action mutations and writes `mobile_action_blocked` audit events.
- `/api/signaldesk/kill-switches` allows mobile emergency pause only when `mobileConfirmation: "MOBILE_EMERGENCY_PAUSE"` is present.
- Mobile attempts return `MOBILE_READ_ONLY_ACTION_BLOCKED`.

UI behavior: high-risk controls are disabled/hidden for mobile contexts, including approval/export/send, provider run, connector configuration, content approval/schedule, partner spend, and raw-reveal class actions.

## Authenticated Local E2E Result

`scripts/verification/e2e-signaldesk-local.js` seeds a local founder-admin SignalDesk access context and emulator data. It proves:

1. Active source-policy import succeeds.
2. Target summary, provenance, identity index, and contactability exist.
3. Score, decision snapshot, evidence packet, safe draft, approval packet, and human approval exist.
4. Export-only message record is created; no provider send occurs.
5. Reply classification, outcome event, outcome summary, demand signal, and control-room summary update.
6. No top-level MenuList truth collections are written.
7. No raw provider payloads or secret-like keys are stored.

Negative fixtures cover missing/expired/review-required/retention-missing source policies, expired provider/evidence/draft/export use, suppressed export, unsupported draft claim approval, provider-send disabled, sender readiness missing, mobile blocked-action audit, duplicate signed webhook event, and DNC suppression.

## Firestore / Storage Rules-Unit Result

`scripts/verification/verify-signaldesk-security-rules.js` now uses `@firebase/rules-unit-testing@4.0.1` with Firebase 11.

Covered Firestore semantics:

- Public unauthenticated user cannot read SignalDesk docs.
- MenuList owner/customer-style role cannot read SignalDesk docs.
- Inactive SignalDesk member cannot read.
- Active SignalDesk member can read summary docs.
- Platform admin can read audit and AI ledgers.
- Client writes to SignalDesk collections are denied.
- Raw target/detail/message/import/suppression/contact collections are not list-readable by normal member.
- Audit and AI ledgers are not writable by client.

Covered Storage semantics:

- Public and MenuList-owner contexts cannot read SignalDesk artifacts.
- Active SignalDesk member can read allowed imports/evidence/exports artifacts.
- Incidents/admin artifacts are platform-admin only.
- Client writes/deletes are denied.

## Files Changed

| File | Purpose |
| --- | --- |
| `src/types/signaldesk/index.ts` | Source-policy expiry/provider/use/state model. |
| `src/lib/signaldesk/workflowServer.ts` | Source-policy enforcement, blocked-policy audit, unsupported-claim audit, Firestore sentinel sanitizer fix. |
| `src/app/api/signaldesk/actions/route.ts` | Safe source-policy errors and server-side mobile mutation block. |
| `src/app/api/signaldesk/kill-switches/route.ts` | Mobile emergency-pause confirmation and mobile block audit. |
| `src/lib/signaldesk/apiGuards.ts` | Mobile request detector. |
| `src/lib/signaldesk/server.ts` | Mobile blocked-action audit helper and sentinel sanitizer fix. |
| `src/database/signaldesk/index.ts` | Client mobile-readonly header and mobile emergency-pause confirmation payload. |
| `src/components/signaldesk/SignalDeskWorkspace.tsx` | Mobile UI disables for blocked action classes and policy-state display. |
| `scripts/verification/e2e-signaldesk-local.js` | New local E2E workflow and blocker regression fixtures. |
| `scripts/verification/verify-signaldesk-security-rules.js` | Semantic Firestore/Storage rules-unit coverage. |
| `scripts/verification/verify-signaldesk-runtime.js` | Static verifier updated for new source-policy/mobile contracts. |
| `scripts/verification/smoke-signaldesk-workflow.js` | Expired-policy expected error updated to safe code. |
| `package.json`, `package-lock.json` | Added `test:signaldesk:e2e:local`, `test:signaldesk:rules`, and `@firebase/rules-unit-testing@4.0.1`. |
| `__docs__/menulist-signaldesk/menulist-signaldesk_validation.md` | Updated validation status and blocker follow-up. |
| `__docs__/menulist-signaldesk/menulist-signaldesk_codex-audit-2026-06-24-followup.md` | This follow-up report. |

## Tests Added

- `npm run test:signaldesk:e2e:local`
- `npm run test:signaldesk:rules`

## Remaining Risks

- No production deploy was performed or requested.
- No real sender/legal/provider review was performed.
- Authenticated browser/session HTTP role-negative tests remain future work; current E2E uses local server-function access context.
- Team-member rules are broader than least privilege if team docs later store sensitive data.
- Real prospect data still needs retention cleanup and audited contact reveal before live use.

## Clear Recommendation

SignalDesk is **safe for local desktop trial** and **safe for local mobile observe-only trial**.

It is **not safe for real outreach** until sender identity, physical address, unsubscribe, bounce/complaint handling, source-list approval, provider budget, and legal/compliance checks are separately reviewed and approved.

## Current Revalidation - July 15, 2026

**Current verdict: PASS for local controlled internal trial.** The earlier blocker closure remains valid and the current aggregate suite passes with `3521` static assertions, the complete authenticated Firestore-emulator E2E, Firestore/Storage semantic rules tests, 75 warmed private route/API checks, root and Functions TypeScript, scoped lint, dependency freeze, repository-wide diff hygiene, and Firestore emulator configuration startup.

Additional hardening since the original follow-up covers exact sender/CTA/replay authority, bounded concurrent AI admission, persisted source-lifecycle authority, strict workspace timestamps and approval-history projection, revenue-summary product/document identity, committed AI-finalization recovery, published-content authority incidents and explicit resolution, terminal proof/content lifecycle behavior, critical-reply priority in an existing pending daily mission, and collection-wide raw-secret/payload inspection. The prior team-member visibility concern is superseded by current self-only normal-member rules and semantic coverage; platform admins retain the documented broader audit visibility.

Current command evidence and implementation details are maintained in `menulist-signaldesk_validation.md`. No deployment, real send, paid API call, business contact, public SignalDesk surface, or MenuList truth mutation occurred. Real-world outreach remains blocked pending permissioned source/contact authority and separate sender, legal, provider, and owner approval.

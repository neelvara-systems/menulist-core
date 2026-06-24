# MenuList SignalDesk Codex Audit - 2026-06-24

## 1. Executive Verdict

**Verdict: PASS**

SignalDesk is ready for a **local controlled trial with mocked/local data only**. The remaining code-side blockers from the first audit pass were closed: source-policy expiry is enforced, mobile mutation paths are server-blocked, email export requires sender readiness, a local workflow smoke exists, and Firestore/Storage denial checks run against emulators.

This is **not a production clearance**. Real outreach, provider send, paid discovery, production Firebase deploy, and public SignalDesk exposure remain blocked by owner policy and explicit feature gates.

Final recommendation: **safe for local controlled SignalDesk trial; not safe for real outreach or production operation.**

## 2. Commands Run And Results

| Command | Result | Notes |
| --- | --- | --- |
| `git status --short` | PASS with dirty worktree | Worktree already had unrelated modified/untracked files. I did not revert unrelated work. |
| `ls package-lock.json package.json` and package inspection | PASS | Package manager is npm. No install was needed. |
| `npm run verify:signaldesk` | PASS | `SignalDesk runtime verifier passed (1720 checks)`. |
| `npx tsc --noEmit --incremental false --pretty false` | PASS | No TypeScript errors. |
| `git diff --check` | PASS | No whitespace errors. |
| `firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "true"` | PASS | Firestore emulator started, parsed config/rules/indexes, and exited successfully. |
| `node scripts/verification/smoke-signaldesk-routes.js` | PASS | `SignalDesk route/API smoke passed (45 checks)` against local dev server. |
| `firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "node scripts/verification/smoke-signaldesk-workflow.js"` | PASS | Local mocked import -> score -> evidence -> draft -> approval -> export -> reply -> outcome smoke passed. |
| `node scripts/verification/verify-signaldesk-security-rules.js` | PASS | Static Firestore/Storage rules verifier passed. |
| `firebase emulators:exec --only firestore,storage --project demo-signaldesk --config firebase-signaldesk.json "node scripts/verification/verify-signaldesk-security-rules.js"` | PASS | Emulator denial checks passed and exited cleanly. |
| Static searches for public nav/sitemap/website exposure | PASS | No `signaldesk` hits in website app, website components, sitemap, or public MenuList locales. |

No Firebase deploy was run. No real provider send was run.

## 3. Route Smoke Results

| Route | Result | Evidence |
| --- | --- | --- |
| `GET/HEAD /signaldesk` | PASS | HEAD returns 200 with `X-Robots-Tag: noindex`; unauthenticated GET returns local dev shell with redirect metadata to `/signin?callbackUrl=%2Fsignaldesk`. |
| `GET/HEAD /signaldesk/content` | PASS | Internal private route returns noindexed shell/auth gate. |
| `GET/HEAD /signaldesk/partners` | PASS | Internal private route returns noindexed shell/auth gate. |
| `GET/HEAD /signaldesk/settings` | PASS | Internal private route returns noindexed shell/auth gate. |
| `GET/HEAD /signaldesk/control-room` | PASS | Internal private route returns noindexed shell/auth gate. |
| `Host: menulist.digital /sd` | PASS | Rewrites to `/signaldesk`, keeps `/sd` base path, sets SignalDesk product headers and noindex. |
| `Host: menulist.digital /sd/app` | PASS | Rewrites to `/signaldesk`, keeps `/sd` base path. |
| `Host: menulist.digital /sd/content` | PASS | Rewrites to `/signaldesk/content`. |
| `Host: menulist.digital /sd/app/content` | PASS | Rewrites to `/signaldesk/content`. |
| `Host: menulist.ai /sd` | PASS | Returns 404; alias is not exposed on the public MenuList host. |

## 4. API Protection Results

| API surface | Result | Evidence |
| --- | --- | --- |
| `/api/signaldesk/workspace` | PASS | Uses `withAuth`, runtime guard, SignalDesk permission check, section allowlist, and rate limiting. Unauthenticated smoke returns 401. |
| `/api/signaldesk/actions` | PASS WITH ROLE-NEGATIVE COVERAGE GAP | Uses `withAuth`, runtime guard, Zod action envelope/payload schemas, permission mapping, rate limiting, safe error mapping, and mobile mutation block. Unauthenticated provider-send attempt returns 401. |
| `/api/signaldesk/kill-switches` | PASS | Uses `withAuth`, runtime guard, Zod validation, role-specific permission, rate limiting, server-side audit writes, and mobile pause-only enforcement. |
| `/api/signaldesk/webhooks/[provider]` | PASS | Unknown provider returns 404, unsigned Apify webhook returns 400, provider signatures are checked before DB writes, and duplicate event IDs short-circuit before side effects. |

Remaining gap: authenticated role-negative HTTP fixtures still need a seeded test session/Auth emulator. The local workflow smoke verifies server state transitions without real provider calls.

## 5. Firestore And Storage Rules Results

| Surface | Result | Evidence |
| --- | --- | --- |
| Firestore default deny | PASS | `firestore-signaldesk.rules` denies all unmatched reads/writes. |
| Client writes | PASS | SignalDesk collections deny client writes; emulator verifier asserts public summary/source-policy writes are denied. |
| Summary reads | PASS | Internal SignalDesk reads are scoped to `canReadSignalDesk()`. |
| Raw/detail collections | PASS | Raw target read denial is asserted in `scripts/verification/verify-signaldesk-security-rules.js`. |
| Audit/AI ledgers | PASS | Audit and AI ledgers are platform-admin read only. |
| Storage default deny | PASS | `storage-signaldesk.rules` denies all unmatched paths. |
| Storage SignalDesk paths | PASS | Emulator verifier asserts public upload to `signaldesk/imports/denied.csv` is denied. |
| Emulator parse | PASS | `firebase emulators:exec ... "true"` passed. |
| Authenticated member semantics | NOT FULLY COVERED | Public denial is covered; internal member/platform-admin positive reads still need seeded Auth/custom-claims fixtures. |

## 6. Core Workflow E2E Result

**Result: PASS LOCAL EMULATOR SMOKE**

The added workflow smoke runs:

```text
manual target import
-> dedupe/provenance
-> scoring
-> evidence packet
-> draft
-> human approval
-> final suppression/source/sender recheck
-> email export record, not real send
-> reply capture
-> reply classification
-> MenuList route/outcome record
-> outcome summary assertion
```

It also asserts expired source policies are blocked and that top-level MenuList truth collections (`stores`, `menus`, `projects`, `billing`) are not written.

Runnable command:

```bash
firebase emulators:exec --only firestore --project demo-signaldesk --config firebase-signaldesk.json "node scripts/verification/smoke-signaldesk-workflow.js"
```

## 7. Compliance Gate Result

| Gate | Result | Notes |
| --- | --- | --- |
| Source policy required | PASS | Imports, evidence, drafts, provider runs, handoffs, and exports require source policy checks. |
| Missing retention period | PASS | API schema requires `retentionDays` between 1 and 365. |
| Expired source policy | PASS AFTER FIX | `expiresAt`/computed retention expiry is modeled and enforced through `requireActiveSourcePolicy()`. |
| Suppression check | PASS | Import and export paths check suppression; workflow smoke exercises the safe path. |
| Human approval | PASS | Export/send requires approved approval and approved draft. |
| Unsupported draft claims | PASS | Approval blocks drafts with `unsupportedClaims`. |
| Sender readiness for export | PASS AFTER FIX | Email export now requires a ready sender domain. |
| Provider webhook signature | PASS | Signature/secret is checked before DB writes. |
| Webhook duplicate event ID | PASS | Existing webhook event IDs return duplicate before batch side effects. |
| Provider send disabled | PASS | Provider send flag remains false and send code throws before adapter use. |
| Channel-window state for assisted channels | PASS | WhatsApp/Instagram/Messenger handoff/send requires an eligible channel window. |

## 8. Product Boundary Result

**Result: PASS**

SignalDesk is product-local and private:

- `PRODUCT_IDS.SIGNALDESK` is `SD`.
- Runtime code is under SignalDesk app/API/component/lib/database/type areas.
- App shell is under `src/app/(signaldesk)/signaldesk/`, not website folders.
- Layout and middleware keep SignalDesk noindexed.
- `/sd` aliases are scoped to `menulist.digital`, not public `menulist.ai`.
- Static search found no direct SignalDesk MenuList DAL writes to stores, menus, projects, billing, or public output truth.
- Workflow smoke asserts no top-level MenuList truth collections are mutated.

## 9. Provider And Send Safety Result

**Result: PASS**

- `ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND` remains false by default.
- Approved-message send and owned email sequencer send throw before provider adapter use while the flag is false.
- Provider adapter secrets are read from env only.
- Email readiness requires sender config, physical address, and unsubscribe URL.
- Email export now requires a ready sender domain even for export-only flow.
- Smartlead/Instantly/lemlist-style sequencers remain blocked/evaluation handoff records; no external sequencer send path was found.

No real provider sends were run.

## 10. Content Distribution Rail Result

**Result: PASS STATICALLY**

- Content rail requires feature flag and content-distribution kill switch checks.
- Content assets can generate controlled drafts from proof/CTA inputs.
- Held/archived content assets cannot generate drafts because generation requires ready/distributed state.
- Scheduling requires approved draft status.
- No auto-publish adapter, social scheduler send, or paid campaign automation was found.
- Performance capture is manual and kill-switch gated.

## 11. Trust Partner Rail Result

**Result: PASS STATICALLY**

- Partner deal review blocks per-view pricing.
- Approved paid partner deal requires founder approval and active budget policy.
- Budget cap checks exist before spend ledger update.
- Disclosure text is required for partner briefs.
- No automated contracts or payment execution path was found; deal payment state remains ledger state.

## 12. Mobile / Read-Only Result

**Result: PASS AFTER FIX**

Mobile is now enforced as a server-side read-only/emergency context:

- Client DAL sends `x-signaldesk-client-mode: mobile-readonly` for mobile contexts.
- `blockSignalDeskMobileMutation()` blocks `/api/signaldesk/actions` mutations from mobile.
- `/api/signaldesk/kill-switches` allows mobile only to activate a pause; mobile unpause/configuration is blocked.
- The route smoke still verifies the protected API auth posture.

Remaining UX note: the responsive workspace may still render dense desktop controls before auth/data settles. The server gate is the safety boundary; a later UX pass can hide controls on mobile for clarity.

## 13. Test Coverage Matrix

| Requirement / Flow | Automated test | Script/manual verification | Not covered | Implemented but weak | Not implemented |
| --- | --- | --- | --- | --- | --- |
| Product code `SD` and product-local constants | `verify:signaldesk` | Code audit |  |  |  |
| Private `/signaldesk` shell | `smoke-signaldesk-routes.js` | Route smoke |  |  |  |
| `/sd` and `/sd/app` aliases | `smoke-signaldesk-routes.js` | Header/rewrite smoke |  |  |  |
| Auth-gated pages | `smoke-signaldesk-routes.js` | Unauth redirect body check |  | Local dev returns 200 shell with redirect metadata |  |
| Protected workspace API | `smoke-signaldesk-routes.js` | Unauth 401 | Authenticated role-negative roles |  |  |
| Protected action API | `smoke-signaldesk-routes.js`, `verify:signaldesk` | Unauth 401, mobile block static check | Authenticated role-negative roles |  |  |
| Kill switches | `verify:signaldesk` | API code audit | Authenticated mutation fixture |  |  |
| Source policy required | `verify:signaldesk`, workflow smoke | Runtime expired-policy negative | Authenticated HTTP negative payload test |  |  |
| Source policy expiry | `verify:signaldesk`, workflow smoke | Runtime expired-policy negative |  |  |  |
| Import/dedupe/provenance | workflow smoke | Emulator state assertions | Browser-auth fixture |  |  |
| Suppression import/export | `verify:signaldesk`, workflow smoke | Code and state audit | Suppressed-contact HTTP negative |  |  |
| Evidence packets | workflow smoke | Emulator state assertions | Browser-auth fixture |  |  |
| Draft unsupported claims | `verify:signaldesk` | Code audit | Runtime unsupported-claim fixture |  |  |
| Human approval queue | workflow smoke | Emulator state assertions | Browser-auth fixture |  |  |
| Export-only email rail | workflow smoke | Sender readiness gate | Missing-sender negative in smoke |  |  |
| Real provider send disabled | `verify:signaldesk`, route smoke | Static and unauth action smoke | Authenticated provider-send negative |  |  |
| Webhook signature rejection | `smoke-signaldesk-routes.js` | Unsigned webhook smoke | Signed duplicate fixture |  |  |
| Webhook duplicate event ID | `verify:signaldesk` | Static guard check | Runtime duplicate fixture |  |  |
| Reply classification | workflow smoke | Emulator state assertions | Browser-auth fixture |  |  |
| Outcome bridge | workflow smoke | Emulator state assertions | Browser-auth fixture |  |  |
| Demand signals | workflow smoke | Emulator state assertions | Browser-auth fixture |  |  |
| Content rail | `verify:signaldesk` | Code audit | Authenticated E2E assertions |  |  |
| Trust partner rail | `verify:signaldesk` | Code audit | Authenticated E2E assertions |  |  |
| Firestore rules parse | Emulator command | Emulator parse |  |  |  |
| Firestore/Storage denial rules | `verify-signaldesk-security-rules.js` | Static and emulator public denial checks | Authenticated positive/negative custom-claim fixtures |  |  |
| Mobile read-only | `verify:signaldesk` | Server gate code audit | Authenticated mobile browser fixture | UI can be clearer |  |

## 14. Findings

| Severity | Area | Finding | Evidence | Risk | Required Fix | File(s) |
| --- | --- | --- | --- | --- | --- | --- |
| HIGH | Webhooks | Fixed: duplicate provider webhook event IDs now short-circuit before side-effect writes. | `src/lib/signaldesk/webhookServer.ts` duplicate guard; verifier checks the guard. | Duplicate inbox messages, suppression side effects, or outcome writes from provider retries. | Add a signed duplicate webhook fixture when provider secrets/test fixtures exist. | `src/lib/signaldesk/webhookServer.ts`, `scripts/verification/verify-signaldesk-runtime.js` |
| HIGH | Draft compliance | Fixed: approval re-reads draft state and blocks `unsupportedClaims`. | `src/lib/signaldesk/workflowServer.ts`; safe API error in actions route. | Unsupported claims could otherwise move through approval. | Add an authenticated runtime fixture for unsupported-claim rejection. | `src/lib/signaldesk/workflowServer.ts`, `src/app/api/signaldesk/actions/route.ts` |
| HIGH | Source policy | Fixed: source policies now carry expiry and stale policies are blocked. | `SignalDeskSourcePolicy.expiresAt`; `requireActiveSourcePolicy()`; workflow smoke expired-policy negative. | Stale source rights could be used after approved retention/use window. | Closed for local trial; add browser-auth negative fixture later. | `src/types/signaldesk/index.ts`, `src/lib/signaldesk/workflowServer.ts`, `src/app/api/signaldesk/actions/route.ts`, `scripts/verification/smoke-signaldesk-workflow.js` |
| HIGH | E2E proof | Fixed for local service-layer proof: emulator workflow smoke now exercises the first-build spine without real sends. | `scripts/verification/smoke-signaldesk-workflow.js`; emulator command passed. | Static checks alone could miss state transition or summary errors. | Add browser-auth/API role fixtures when a seeded SignalDesk test session exists. | `scripts/verification/smoke-signaldesk-workflow.js` |
| HIGH | Mobile boundary | Fixed: mobile mutations are server-blocked; kill switch permits mobile pause only. | `blockSignalDeskMobileMutation()`; `SignalDesk mobile can only pause outbound`; client mobile header. | Authenticated mobile users could otherwise approve/export/configure contrary to policy. | Closed for safety; add mobile UI hide/disable polish later. | `src/lib/signaldesk/apiGuards.ts`, `src/app/api/signaldesk/actions/route.ts`, `src/app/api/signaldesk/kill-switches/route.ts`, `src/database/signaldesk/index.ts` |
| HIGH | Email export | Fixed: email export now requires sender-domain readiness. | `exportSignalDeskMessageServer()` throws `Sender domain is not ready`; actions safe-error allowlist includes it. | Export rows could leave the system before sender identity/readiness is approved. | Closed for local trial; add missing-sender negative fixture later. | `src/lib/signaldesk/workflowServer.ts`, `src/app/api/signaldesk/actions/route.ts` |
| MEDIUM | Firestore rules testing | Improved: public denial checks now run against Firestore/Storage emulators; custom-claim member/admin fixtures are still missing. | `scripts/verification/verify-signaldesk-security-rules.js`; emulator command passed. | Future rules changes could still regress internal role semantics without seeded claim tests. | Add Auth emulator/custom-token tests for MenuList owner, SignalDesk member, and platform admin. | `scripts/verification/verify-signaldesk-security-rules.js` |
| MEDIUM | Team-member visibility | Any active SignalDesk member can read all team member docs. | `firestore-signaldesk.rules` allows member-scoped team reads. | Broader internal visibility of team metadata than least privilege if team docs later include sensitive fields. | Limit non-platform users to own member doc or role-scoped summary docs before storing sensitive metadata there. | `firestore-signaldesk.rules` |
| MEDIUM | Contact retention/privacy | Raw contact values are stored in denied detail/contact identity collections. | Workflow server writes denied detail docs; rules deny client reads. | Retention/deletion/reveal controls remain critical for real data. | Add retention cleanup, audited reveal API, and masking/encryption review before real prospect data. | `src/lib/signaldesk/workflowServer.ts` |
| MEDIUM | Authenticated negative cases | Role-negative and malformed-authenticated HTTP cases are still not automated. | Route smoke covers unauth 401; workflow smoke covers service state transitions. | Bugs in role permissions or partial writes may not be caught before broader trial. | Add authenticated fixtures for unauthorized role, malformed payloads, disabled kill switch, suppressed contact, missing sender readiness, and provider-send disabled. | New SignalDesk API/E2E harness |
| LOW | Local dev redirect observability | Unauthenticated app routes return local dev shell with redirect metadata instead of a simple 3xx in curl. | Smoke script detects sign-in redirect metadata in body. | Scripts expecting strict 302/307 may misclassify auth-gated pages. | Keep smoke script behavior-aware; use browser-based check if strict redirect status matters. | `scripts/verification/smoke-signaldesk-routes.js` |

## 15. Critical Blockers

No code-side critical blocker remains for a local mocked/emulator SignalDesk trial.

Still blocked for real-world operation:

1. No real outreach or provider send until sender identity, physical address, unsubscribe, bounce, complaint, suppression, budget, and source policy are owner-approved.
2. No production Firebase deploy until owner confirms `menulist-signaldesk-qa` / `menulist-signaldesk` access and explicitly asks for deploy.
3. No paid provider discovery until source rights, provider budget, retention policy, and eval set are approved.
4. No public SignalDesk page or MenuList public navigation connection.

## 16. High-Priority Fixes

1. Add browser-auth/API fixtures for unauthorized role, malformed payloads, disabled kill switch, suppressed contact, missing sender readiness, provider-send disabled, and unsupported claims.
2. Add signed duplicate webhook fixture once local webhook secrets/test payloads are available.
3. Add Auth emulator/custom-claim rules tests for public user, MenuList owner/customer, SignalDesk member, and platform admin.
4. Add retention cleanup/audited reveal path before importing real prospect/contact data.

## 17. Medium / Low-Priority Improvements

1. Hide/disable dense workspace action controls on mobile for clearer read-only UX; server gate already blocks unsafe mutation.
2. Narrow `signaldeskTeamMembers` reads if member docs gain sensitive metadata.
3. Add missing-sender negative assertion to the workflow smoke.
4. Add a route smoke npm script alias if the team wants it in `package.json`.
5. Add browser smoke coverage for authenticated desktop workspace once a test account exists.

## 18. Files Changed

| File | Change |
| --- | --- |
| `src/types/signaldesk/index.ts` | Added source-policy expiry fields. |
| `src/lib/signaldesk/workflowServer.ts` | Enforced active/non-expired source policy across workflow paths; required sender readiness for export; existing webhook/draft safety hardening remains covered. |
| `src/app/api/signaldesk/actions/route.ts` | Added expiry schema support, mobile mutation block, and safe errors for source expiry/sender readiness. |
| `src/lib/signaldesk/apiGuards.ts` | Added SignalDesk mobile request detection and mutation block helper. |
| `src/app/api/signaldesk/kill-switches/route.ts` | Added mobile pause-only enforcement. |
| `src/database/signaldesk/index.ts` | Added mobile read-only request header from the client DAL. |
| `scripts/verification/verify-signaldesk-runtime.js` | Added checks for expiry enforcement, sender readiness, mobile gate, workflow smoke, and rules verifier. |
| `scripts/verification/smoke-signaldesk-routes.js` | Route/API smoke for private shell, `/sd` aliases, noindex headers, unauth API blocks, webhook rejection. |
| `scripts/verification/smoke-signaldesk-workflow.js` | Local emulator workflow smoke for first-build acquisition spine. |
| `scripts/verification/verify-signaldesk-security-rules.js` | Static and emulator Firestore/Storage denial checks. |
| `__docs__/menulist-signaldesk/menulist-signaldesk_codex-audit-2026-06-24.md` | Updated audit report. |
| `__docs__/menulist-signaldesk/menulist-signaldesk_validation.md` | Updated local smoke and remaining-blocker truth. |
| `__docs__/menulist-signaldesk/menulist-signaldesk_action-register.md` | Added audit follow-up implementation rows. |

## 19. Tests Added

| Test/script | Coverage |
| --- | --- |
| `scripts/verification/smoke-signaldesk-routes.js` | Local route/API smoke: `/signaldesk`, `/signaldesk/content`, `/signaldesk/partners`, `/signaldesk/settings`, `/signaldesk/control-room`, `/sd`, `/sd/app`, `/sd/content`, `/sd/app/content`, public host alias denial, unauthenticated API 401s, unsigned Apify webhook 400, unknown webhook 404. |
| `scripts/verification/smoke-signaldesk-workflow.js` | Local emulator state-flow smoke: source policy, expired-policy negative, import, scoring, evidence, draft, approval, export record, reply classification, outcome, demand signal, audit, and no MenuList truth writes. |
| `scripts/verification/verify-signaldesk-security-rules.js` | Static rules checks plus emulator denial checks for public reads/writes and storage upload. |
| `scripts/verification/verify-signaldesk-runtime.js` additions | Static guard checks for source-policy expiry, sender readiness, mobile gate, workflow smoke, and rules verifier presence. |

## 20. Remaining Manual Checks

1. Seed a local/browser SignalDesk team member or platform-admin test session.
2. Run browser-authenticated negative API fixtures for roles, malformed payloads, suppressed contact, missing sender readiness, and provider-send disabled.
3. Inspect authenticated desktop UI for every SignalDesk section.
4. Inspect authenticated mobile viewport and confirm controls are visually read-only/hidden; server mutation gate is already in place.
5. Add custom-claim Firestore/Storage rules tests for SignalDesk member and platform admin.
6. Verify owner-side settings only store connector metadata and never real secrets when real credentials are introduced.
7. Verify real provider credentials stay in env/Secret Manager only when owner chooses to configure them.
8. Verify no provider-send flag is enabled outside a controlled manual safety review.

## Clear Final Recommendation

**Safe for local controlled trial.**

Do not run real outreach, real provider sends, paid provider discovery, production deploy, or public SignalDesk pages. The code-side blockers from the audit follow-up are closed for local mocked/emulator testing; the remaining work is operational proof with seeded auth fixtures and owner-approved real-world policies.

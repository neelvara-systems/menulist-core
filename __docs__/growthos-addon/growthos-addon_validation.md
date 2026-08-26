# GrowthOS Add-on - Implementation Validation

**Date:** June 1, 2026
**Status:** Retest, hardening, and Pro/Multi-location enablement validation complete
**Feature flag state:** `ENABLE_GROWTHOS_ADDON=true`, `GROWTHOS_ADDON_ACCESS="paid"`

---

## Scope Verified

Implemented GrowthOS V1 as a MenuList add-on labelled `Growth Kits`.

Included:

- enabled master flag with Pro/Multi-location-only access
- Pro/Multi-location plan gate with pilot allowlist still requiring Pro/Multi-location
- deterministic source facts, ranking, readiness, kit generation, and Staff Brief
- guarded deterministic review reply from owner-pasted text
- desktop `/growth-kits` route
- Today desktop entry point for eligible stores
- mobile Today card with latest-kit fallback behavior
- API routes for refresh, generate, export, and review guard
- Firestore rules for GrowthOS summary, kit, and export data
- server-side export validation that recomputes current source facts before allowing copy/share/download/export
- blocked-preflight outputs cannot be copied/shared/downloaded

Excluded by code and flag:

- direct posting
- scheduler
- AI image generation
- offer builder
- quick replies
- photo prompts
- multi-outlet fanout
- used-history UI
- ROI, revenue, order, or attribution tracking

## Commands Run

```txt
npm run verify:growthos
```

Result: passed. The dry run executed 36 GrowthOS checks covering enabled master-flag behavior, kill-switch denial, Pro/Multi-location entitlement denial/allowance, pilot allowlist plus plan gating, source facts, action ranking, deterministic kit outputs, unavailable-item exclusion, staff brief inclusion, staff-only preflight isolation, forbidden public claims, review reply escalation, stale hash changes, expiry handling, Today Sales Pack trigger gating, retired legacy Today generation prompts, and deferred-scope leakage.

Trigger checks passed:

- strong menu action surfaces `Today's Sales Pack`
- weak generic action stays quiet
- fresh prepared pack surfaces
- unused stale draft stays quiet
- previously used stale pack surfaces with update-first behavior
- legacy Today owner generation code files are deleted
- old `Generate Today Action` prompt strings are absent from active desktop/mobile Today surfaces

```txt
npx tsc --noEmit --incremental false
```

Result: passed.

```txt
npm run lint
```

Result: passed.

```txt
git diff --check -- src firestore.rules __docs__/growthos-addon public/locales/menulist.ai package.json scripts/verification/verify-growthos-flow.ts
```

Result: passed.

```txt
node -e "const fs=require('fs'); for (const f of fs.readdirSync('public/locales/menulist.ai')) if (f.endsWith('.json')) JSON.parse(fs.readFileSync('public/locales/menulist.ai/'+f,'utf8')); console.log('locale json ok')"
```

Result: passed.

```txt
rg -n "genAI|recordAiOperation|checkAICapacity|consumeAICapacity|GROWTHOS_DIRECT_POSTING|schedule|revenue|orders|roi|customerId|estimatedLift|conversion|attribution|growthosOffers|growthosAssets|growthosQuickReplies|growthosOutletGroups" src/app/api/growthos src/lib/growthos src/database/growthos src/components/templates/main-app/growthos src/components/mobile/components/GrowthKitsMobileCard.tsx
```

Result: no matches.

Historical deploy attempt: `npx firebase deploy --only firestore:rules --project ecomsai`.

Result: failed because this repo does not expose a Firebase executable through `node_modules/.bin`.

Historical deploy evidence: `firebase deploy --only firestore:rules --project ecomsai`.

Result: passed. Rules compiled and released to `cloud.firestore` for project `ecomsai`. This is historical evidence only; do not reuse it as current deployment guidance. Current MenuList rules deploy evidence must target `menulist-qa` first with `firebase.json`, then production only after QA evidence and explicit production approval.

The same command was run again after Firestore rule hardening. Result: passed and released to `cloud.firestore`.

## Hardening Fixes From Retest

Retest found and fixed:

- GrowthOS Firestore kit/export writes were too permissive for direct client writes. They are now API/Admin-SDK owned.
- GrowthOS summary client writes were blocked while keeping current-store reads available.
- Legacy project fallback now proves tenant/store ownership before source facts can be read.
- Export route now verifies the requested output exists in the kit.
- Export route now recomputes current source facts from the kit project before allowing copy/share/download/export, while avoiding a full duplicate context load.
- Export treats an unavailable source project as stale instead of allowing stale copy/share/download from cached summary data.
- Output preflight is now destination-scoped so a staff-only blocked line cannot incorrectly block a safe public output.
- Blocked preflight outputs are now blocked in API, desktop UI, and mobile UI.
- Mobile copy now has a non-Clipboard API fallback.
- API routes now return feature-disabled before schema/rate-limit work when the master flag is off.
- Desktop no longer fetches project lists when GrowthOS is disabled or the store is not entitled.
- Refresh skips no-op summary writes when the normalized summary is unchanged.
- Export summary status/stale writes are skipped when the existing summary already matches.
- Desktop and mobile local state now receives the server stale flag returned by export recording.

## Chrome E2E Flow

Local Chrome E2E was run on June 1, 2026 against `http://localhost:3000/growth-kits` with `NEXT_PUBLIC_ANSWERLATTICE_FIREBASE_MODE=shared` and `ANSWERLATTICE_FIREBASE_MODE=shared` so local MenuList auth claim sync used the shared Firebase mode.

Kill-switch proof:

- `ENABLE_GROWTHOS_ADDON=false` rendered the authenticated desktop shell with `Growth Kits is not available yet.`
- No GrowthOS generation, export, or review action was available while the master flag was off.

Temporary pilot proof:

- The flag was temporarily set to pilot mode for local store `15` during the Chrome run. Current access posture is enabled with paid-plan gating: Pro and Multi-location only.
- Desktop Growth Kits loaded for `Habibis Restaurant - Danysa (HQ)` and resolved the current menu as `Bar Menu`.
- Refresh returned 200 and showed the action `Share 100% fresh fruit juices today`, with secondary actions for `Chocolate milk shake` and `Fruit and nut smoothie`.
- Kit generation returned 200 and rendered WhatsApp, Instagram, Google update, counter prompt, QR table prompt, Staff brief, and Staff Brief Pack outputs using real item/menu facts and the public menu link.
- Copy/export and mark-used calls returned 200 and recorded execution without ROI, order, customer, or attribution fields.
- Guarded review reply accepted owner-pasted review text and showed `Owner review is still required before posting.` before the deterministic draft.

Chrome-run fixes:

- Desktop notification calls now use `App.useApp()` so Ant Design theme/context warnings do not appear in Growth Kits.
- Desktop and mobile copy actions now fall back to textarea copy if the browser exposes `navigator.clipboard.writeText` but blocks or stalls the write.

Local infrastructure notes:

- Upstash rate-limit provider timeout logs appeared locally, but GrowthOS API calls still returned 200.
- The local Next dev process became unstable after hot reload with a missing vendor chunk for `next-auth`; restarting the dev server cleared the issue. This was treated as local dev runtime instability, not a GrowthOS logic failure.

## Owner-Value Hardening Retest

After the mobile Today review showed the feature worked but felt like a side module, the owner-facing surface was hardened into `Today's Sales Pack`.

Changes validated:

- mobile Today card label is `Today's Sales Pack`
- mobile stale state shows `Update pack` and does not expose `Copy WhatsApp`
- mobile Today no longer shows the older `No today action yet` / `Generate Today Action` empty prompt when the Sales Pack is visible
- mobile card no longer exposes the `Growth Kits` system label
- desktop route keeps `Growth Kits` as the module name but frames the core panel as `Today's Sales Pack`
- desktop primary action uses `Prepare Sales Pack`
- owner-facing confidence percentages are removed from the desktop primary action panel
- deterministic templates avoid singular/plural grammar traps such as plural item names followed by `is available`

Commands run after hardening:

```txt
npm run verify:growthos
```

Result: passed with 29 checks.

```txt
npx tsc --noEmit --incremental false
```

Result: passed.

```txt
npm run lint
```

Result: passed.

```txt
git diff --check
```

Result: passed.

Focused Chrome QA:

- mobile Today QA passed at iPhone viewport with touch/mobile user agent and authenticated store `15`; screenshot: `/tmp/growthos-sales-pack-mobile-final-1780314093875.png`
- desktop `/growth-kits` QA passed with Sales Pack framing and no confidence percentage in the primary action panel

## Docs Parity

| Area | Result |
| --- | --- |
| Flags | Docs now include `GROWTHOS_PILOT_STORE_IDS` and `GROWTHOS_PAID_PLAN_IDS`. |
| Data paths | Docs now use nested `growthosKits/{tId}/{sId}/{kitId}` and `growthosExports/{tId}/{sId}/{exportId}` paths. |
| AI accounting | Docs now state V1 kit and review generation are deterministic and do not call providers. |
| Firebase | Docs now state rules changed and were deployed; GrowthOS writes are API/Admin-SDK owned; no indexes, functions, scheduler, or Storage rules were added. |
| Mobile | Docs now point to the implemented mobile card and Today host screen. |
| Public copy | No public website copy was published; candidate copy remains gated. |

## June 19, 2026 Research Parity

Current SMB marketing and local-review research was added to the documentation hub. The research supports the existing implementation boundary and does not add runtime scope.

| Evidence class | Validation decision |
| --- | --- |
| SMBs expect to spend more marketing time and budget in 2026 while adopting AI/automation for workload relief. | Keep GrowthOS as practical paid owner help inside MenuList, not as public acquisition positioning. |
| Google Pomelli and Canva AI 2.0 confirm generic SMB campaign generation is crowded and moving fast. | Keep GrowthOS output-first, source-fact-first, and non-canvas. No scheduler, creative suite, or prompt workspace enters V1. |
| BrightLocal 2026 review data shows review freshness, high star expectations, and AI review summaries matter for local choice. | Review Reply Guard remains manual-paste, deterministic, owner-reviewed, and no-ingestion. Fake reviews, fake testimonials, and generic reply spam remain out of scope. |
| External `GrowthOS` naming usage is active in the market. | `GrowthOS` stays internal terminology; owner-facing surfaces remain `Growth Kits` and `Today's Sales Pack`. |

Cost impact: no Firebase, Storage, Cloud Functions, provider, scheduler, rules, indexes, route, or runtime change. This is documentation-only.

## June 19, 2026 Production-Readiness Hardening

GrowthOS API routes now parse JSON through the shared GrowthOS validation helper before Zod validation. Malformed JSON returns `400 Invalid JSON` and logs a security event instead of falling through to the generic `500` error handler.

Affected routes:

- `/api/growthos/actions/refresh`
- `/api/growthos/kits/generate`
- `/api/growthos/kits/export`
- `/api/growthos/reviews/suggest`

Verifier coverage was expanded so `npm run verify:growthos` fails if those routes reintroduce raw `request.json()` parsing without the invalid-JSON guard.

Commands run:

```txt
npm run verify:growthos
```

Result: passed with 39 checks, including the invalid-JSON guard check.

```txt
npx tsc --noEmit --incremental false
```

Result: passed.

Cost impact: no Firebase, Storage, Cloud Functions, provider, scheduler, rules, indexes, route, or deploy change. This is request-validation hardening only.

## June 29, 2026 API Diagnostic Hardening

GrowthOS API route catch blocks now log fixed failure-code exceptions through `src/lib/growthos/diagnostics.ts` instead of passing raw thrown objects into `logger.error()`. The helper keeps endpoint labels, source error name/code/status metadata, and user-id presence/length only.

Affected routes:

- `/api/growthos/actions/refresh`
- `/api/growthos/kits/generate`
- `/api/growthos/kits/export`
- `/api/growthos/reviews/suggest`

Verifier coverage was expanded so `npm run verify:growthos` fails if those routes reintroduce raw GrowthOS `logger.error(..., error, { userId })` diagnostics or remove the bounded helper.

Cost impact: no Firebase reads/writes/deletes, Storage operations, Cloud Functions logic, provider calls, scheduler work, rules, indexes, routes, owner-facing settings, Firebase deploy requirement, or Vercel deploy. Existing auth, rate limits, JSON parsing, validation, entitlement checks, summary/kit/export writes, response status codes, and fixed owner-facing failure copy are unchanged.

## June 29, 2026 Sales Pack Handoff Diagnostics

`src/components/mobile/components/GrowthKitsMobileCard.tsx` and `src/components/templates/main-app/growthos/index.tsx` now log failed Sales Pack refresh, prepare, copy, share, download, review-reply, and mark-used actions through `src/lib/growthos/diagnostics.ts`. The diagnostic context keeps bounded project, store, tenant, kit, action, output, destination, source error name/code/status, state booleans, output text length, and review text length only. It does not log generated Sales Pack text, review text, project names, raw browser/provider exceptions, or raw identifiers.

Desktop and mobile copy/share now record the GrowthOS export only after the browser copy, native share, or fallback copy succeeds. Desktop download records only after the download is started. Failed browser handoffs keep fixed owner copy and no longer create false copied/shared/downloaded execution signals.

Verifier coverage was expanded so `npm run verify:growthos` fails if either owner surface removes the bounded failure codes, drops bounded project/kit/output context, logs output/review text instead of length, or records copy/share/download before the handoff succeeds.

Cost impact: failed copy/share/download handoffs now avoid unnecessary GrowthOS export writes. This adds no Firebase reads/writes/deletes beyond existing successful export behavior, Storage operations, Cloud Functions logic, provider calls, scheduler work, rules, indexes, routes, owner-facing settings, Firebase deploy requirement, or Vercel deploy. Existing successful refresh, generation, copy/share/download, mark-used, entitlement checks, API routes, and fixed owner-facing failure copy are unchanged.

## June 30, 2026 Copy Support Diagnostics and Review-Reply Copy

Desktop and mobile GrowthOS copy helpers now check Clipboard API support and textarea fallback support before attempting browser handoff. If Clipboard API is unavailable, blocked, or slow, the helpers fall through to acknowledged textarea copy; copied feedback and GrowthOS export writes still happen only after browser acknowledgement. Failed copy/share diagnostics include clipboard/fallback support booleans and bounded output metadata only.

Desktop review-reply copy now waits for the same acknowledged copy helper and logs `desktop_growthos_review_reply_copy_failed` with review reply length only if the browser handoff fails. It no longer calls the copy helper fire-and-forget.

Verifier coverage was expanded so `npm run verify:growthos` fails if desktop or mobile copy helpers lose support checks, fallback failure codes, fallback acknowledgement checks, support metadata, or if desktop review-reply copy returns to fire-and-forget behavior.

Cost impact: browser-local copy diagnostics only. No new GrowthOS reads/writes/deletes are added beyond existing successful export writes, and failed handoffs still avoid export writes. No Storage operations, Cloud Functions logic, provider calls, scheduler work, rules, indexes, routes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action changed.

## June 30, 2026 Client Response Diagnostics

`src/database/growthos/index.ts` now parses GrowthOS API responses through `readJsonResponseWithLimit()` with a 64 KB cap. Malformed, oversized, rejected, or invalid response envelopes log fixed GrowthOS client failure codes with bounded operation and response-status metadata only.

Verifier coverage was expanded so `npm run verify:growthos` fails if the client DAL removes the bounded response parser, drops `growthos_client_response_parse_failed`, `growthos_client_response_rejected`, or `growthos_client_response_invalid`, or reintroduces silent `response.json().catch(() => null)` parsing.

## June 30, 2026 Client Request Boundary

`src/database/growthos/index.ts` now sends GrowthOS refresh, generate, export, and review-reply POSTs with a shared no-store, same-origin, manual-redirect request policy before the existing 64 KB response parser accepts route acknowledgements.

Verifier coverage was expanded so `npm run verify:growthos` fails if the client DAL drops `GROWTHOS_CLIENT_REQUEST_POLICY`, removes no-store cache, same-origin credentials, manual redirect handling, or stops spreading the policy across the four GrowthOS POST calls.

Validation:

- Passed `npm run verify:growthos`.
- Passed `npx tsc --noEmit --incremental false --pretty false`.
- Passed `git diff --check`.

Cost impact: no Firebase reads/writes/deletes, Storage operations, Cloud Functions logic, provider calls, scheduler work, rules, indexes, routes, owner-facing settings, Firebase deploy requirement, or Vercel deploy. Existing successful refresh, generation, copy/share/download, mark-used, entitlement checks, API route responses, request body validation, and fixed owner-facing failure copy are unchanged.

## June 30, 2026 API Security-Log Boundary

GrowthOS refresh, generate, export, and review-guard security logs now use `getGrowthOSSecurityLogContext()` with bounded route/session metadata plus endpoint, method, validation-error, attempted-project, and attempted-kit presence-length fields. The routes no longer import or spread raw `buildSecurityContext()` output into invalid-JSON, validation-failure, or tenant-violation security events.

Verifier coverage was expanded so `npm run verify:growthos` fails if GrowthOS routes reintroduce `buildSecurityContext`, raw validation-error fields, raw attempted project/kit identifiers, or remove the bounded route-security helper.

Cost impact: security-log metadata hardening only. No Firebase reads/writes/deletes, Storage operations, Cloud Functions logic, provider calls, scheduler work, rules, indexes, routes, owner-facing settings, Firebase deploy requirement, or Vercel deploy. Existing successful refresh, generation, export recording, review-guard behavior, entitlement checks, rate limits, API response statuses, and fixed owner-facing copy are unchanged.

## Remaining Rollout Checks

Do not widen beyond the Pro/Multi-location paid gate until:

- a Pro/Multi-location rollout decision is selected
- mobile Today is browser/device-tested at iPhone width
- stale kit behavior is tested with changed menu facts
- support copy is reviewed for paid rollout

## August 26, 2026 Missing-Hours Truthfulness

Hosted QA reproduced a misleading owner warning after `Refresh`: the fixture
had no business hours, but Growth Kits said `Store is marked closed today.`
The public menu had no temporary-closure status and Dashboard correctly showed
hours as missing.

The source-facts boundary now leaves the hours label absent when today's hours
are missing or malformed. Readiness renders `Business hours are missing.` for
that state and retains `Store is marked closed today.` only for an explicit
`closed` schedule. Menu output remains conservative while hours are unknown.

## August 26, 2026 Mark-Used Completion State

Desktop and mobile Staff line controls now render `Marked done` and disable
after a successful mark-used mutation. Both clients preserve the optimistic
`used` state across later handoffs, and the server transaction keeps `used`
terminal when a later copy, share, download, or print export is recorded.

Validation:

- Passed 260 Growth Kits source and contract checks.
- Passed GrowthOS client/rate/timestamp contracts.
- Passed the isolated-project Firestore transaction body against the already
  running emulator on port 8080.
- Passed focused ESLint and strict TypeScript.

Cost impact: the first successful mark-used action keeps its existing one
export write plus kit/summary merge behavior. A repeated click after settlement
is now blocked in both owner clients, avoiding the additional export document
and kit/summary update that the indistinguishable `Done` control previously
allowed. No read, query, cache, entitlement, provider, scheduler, rules, index,
or collection path changed.

## August 26, 2026 Export 404 Attribution

Exact hosted `d58217c…` retained a ready persisted kit but reproduced 404 for
mark-used, following the same 404 seen for copy/export acknowledgement. The
raw QA readback proved two exact-scope kit documents exist with seven expected
outputs, so the remaining ambiguity is between kit projection and output
matching inside the protected route.

Exact diagnostic build `d61d16c…` reproduced mark-used once and emitted only
`growthos_export_kit_not_found` with bounded presence/length metadata. This
confirms projection rejected the existing document before output matching.

The route now emits one of two fixed warning codes at those branches with only
bounded presence/length and existing route/security context. This changes no
response, Firestore read/write, entitlement, rate limit, cache, or owner copy.
The next exact hosted replay must identify the branch before a root correction
is selected.

The bounded persisted-field inspection subsequently confirmed
`sourceFactsSummary.todayHoursLabel` was stored as Firestore null on the
missing-hours kit. The shared projector rejected that null even though every
required scope, kit, output, enum, length, and timestamp field was valid.

The root correction omits an unknown hours label when constructing the persisted
source-facts summary and makes the projector accept legacy null as absent. The
transaction fixture now uses a store with missing hours and proves
the persisted kit omits the field, remains projectable, exports successfully,
and preserves terminal used state. The client contract separately proves an
already persisted nullable-hours kit remains readable.

Root-fix validation:

- Passed 265 Growth Kits source/contract checks.
- Passed GrowthOS client/rate/timestamp contracts.
- Passed the missing-hours Firestore generation/read/export transaction body
  against the isolated project on the existing emulator.
- Passed focused ESLint, strict TypeScript, and `git diff --check`.

Cost impact: no read/query/listener/cache count changes. Successful exports keep
their existing export create plus kit/summary merge. The correction prevents
owners from repeating a deterministic failed attempt that previously consumed
the protected route's entitlement, replay, kit, summary, and source-validation
reads before returning 404.

Validation: the Growth Kits source suite passed 255 checks, including both
missing-hours and explicit-closed regressions. Client contracts and the
isolated-project transaction emulator body remain passing. This correction
adds no Firestore read/write/delete, Storage operation, Function invocation,
provider call, cache, rule, index, or deployment target.

## Current-Worktree Concurrency Cross-Check - July 17, 2026

`npm run verify:growthos` passed 150 source assertions after adding executable
coverage for UUID-backed kit IDs and the atomic kit-plus-summary Firestore batch.
Scoped ESLint and diff integrity also passed. The owner response contract,
Pro/Multi-location admission, deterministic Sales Pack content, export accounting, and
Firebase operation count remain unchanged.

No Firebase rules, indexes, Storage rules, or Cloud Function source changed, so
this GrowthOS fix has no Firebase deployment target. App/Vercel release remains
owner-controlled.

## July 26, 2026 Data-Flow Audit Repair

The repository audit found and repaired browser scope leakage/staleness risk,
rate-limit fail-open behavior, incomplete source hashes, unsafe persisted
summary casts, duplicate mutation settlement, and refresh/generate/export
source/concurrency races.

Validation:

```txt
npm run verify:growthos
```

Result: passed 172 source/dry-run assertions, client runtime-contract tests, and
the Firestore emulator transaction suite.

```txt
npm run test:growthos:transactions
```

Result: passed concurrent same-operation generation/export replay, one-kit and
one-export persistence, atomic kit/summary status, transaction-current stale
rejection, refresh latest-kit preservation, and tenant-mismatched summary
rejection.

The suite is now part of `verify:growthos`. No rules, indexes, Storage rules, or
Cloud Function logic changed; no Firebase deployment target was created.

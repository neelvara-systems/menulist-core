# GrowthOS Add-on - Implementation Validation

**Date:** June 1, 2026
**Status:** Retest, hardening, and Pro/Premium enablement validation complete
**Feature flag state:** `ENABLE_GROWTHOS_ADDON=true`, `GROWTHOS_ADDON_ACCESS="paid"`

---

## Scope Verified

Implemented GrowthOS V1 as a MenuList add-on labelled `Growth Kits`.

Included:

- enabled master flag with Pro/Premium-only access
- Pro/Premium plan gate with pilot allowlist still requiring Pro/Premium
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

Result: passed. The dry run executed 36 GrowthOS checks covering enabled master-flag behavior, kill-switch denial, Pro/Premium entitlement denial/allowance, pilot allowlist plus plan gating, source facts, action ranking, deterministic kit outputs, unavailable-item exclusion, staff brief inclusion, staff-only preflight isolation, forbidden public claims, review reply escalation, stale hash changes, expiry handling, Today Sales Pack trigger gating, retired legacy Today generation prompts, and deferred-scope leakage.

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

```txt
npx firebase deploy --only firestore:rules --project ecomsai
```

Result: failed because this repo does not expose a Firebase executable through `node_modules/.bin`.

```txt
firebase deploy --only firestore:rules --project ecomsai
```

Result: passed. Rules compiled and released to `cloud.firestore` for project `ecomsai`.

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

- The flag was temporarily set to pilot mode for local store `15` during the Chrome run. Current access posture is enabled with paid-plan gating: Pro and Premium only.
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

## Remaining Rollout Checks

Do not widen beyond the Pro/Premium paid gate until:

- a Pro/Premium rollout decision is selected
- mobile Today is browser/device-tested at iPhone width
- stale kit behavior is tested with changed menu facts
- support copy is reviewed for paid rollout

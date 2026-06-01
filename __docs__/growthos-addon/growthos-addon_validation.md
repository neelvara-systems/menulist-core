# GrowthOS Add-on - Implementation Validation

**Date:** June 1, 2026
**Status:** Retest and hardening validation complete
**Feature flag state:** `ENABLE_GROWTHOS_ADDON=false`

---

## Scope Verified

Implemented GrowthOS V1 as a MenuList add-on labelled `Growth Kits`.

Included:

- disabled-by-default feature flags
- pilot and paid plan gates
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

Result: passed. The dry run executed 20 GrowthOS checks covering feature flag default-off behavior, entitlement denial, source facts, action ranking, deterministic kit outputs, unavailable-item exclusion, staff brief inclusion, staff-only preflight isolation, forbidden public claims, review reply escalation, stale hash changes, expiry handling, and deferred-scope leakage.

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

## Docs Parity

| Area | Result |
| --- | --- |
| Flags | Docs now include `GROWTHOS_PILOT_STORE_IDS` and `GROWTHOS_PAID_PLAN_IDS`. |
| Data paths | Docs now use nested `growthosKits/{tId}/{sId}/{kitId}` and `growthosExports/{tId}/{sId}/{exportId}` paths. |
| AI accounting | Docs now state V1 kit and review generation are deterministic and do not call providers. |
| Firebase | Docs now state rules changed and were deployed; GrowthOS writes are API/Admin-SDK owned; no indexes, functions, scheduler, or Storage rules were added. |
| Mobile | Docs now point to the implemented mobile card and Today host screen. |
| Public copy | No public website copy was published; candidate copy remains gated. |

## Remaining Activation Checks

Do not turn the feature on until:

- a real pilot store ID or paid plan rollout decision is selected
- desktop route is browser-tested with an entitled store
- mobile Today is browser/device-tested at iPhone width
- stale kit behavior is tested with changed menu facts
- support copy is reviewed for paid rollout

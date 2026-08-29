# Special Menu Switching — Validation Report

**Status:** ✅ LOCAL SOURCE COMPLETE — Firebase deployment and deployed QA smoke remain pending
**Validated:** July 30, 2026
**Feature Flag:** `ENABLE_SPECIAL_MENU_SWITCHING: true` in frontend and Functions

---

## Engineering Checklist

| #     | Spec Requirement                                   | Implementation                                                                      | Evidence                                                                | Status |
| ----- | -------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------ |
| FR-01 | Create special menu (clone base + edit)       | Transactional DAL clones replace menus or creates an empty-row overlay project with shared editor context | `src/database/projects/index.ts` | ✅ |
| FR-02 | Schedule activation date/time                 | Validated ISO `startsAt` on project metadata and compact summary | project types + DAL | ✅ |
| FR-03 | Schedule deactivation date/time (auto-revert) | Indexed two-minute due task; nightly path repairs missing markers and missed transitions | `functions/src/schedulers/menulistMaintenanceScheduler.ts`, `functions/src/decisionBlocksScoring.ts` | ✅ |
| FR-04 | Replace mode (full menu swap)                 | Public and configured-screen resolvers return the validated active special project | `src/app/client/[[...slug]]/page.tsx`, `src/database/campaigns/serverScreen.ts` | ✅ |
| FR-05 | Overlay mode (add section to base)            | Shared deterministic resolver namespaces and merges only valid overlay rows | `src/lib/menu/specialMenuOverlay.ts` | ✅ |
| FR-06 | One-active constraint enforcement             | Create/edit conflict checks plus transactional exact-project validation of a different store pointer; live contention blocks and stale pointer targets recover | client and Admin lifecycle helpers + Admin emulator | ✅ |
| FR-07 | Feature flag `ENABLE_SPECIAL_MENU_SWITCHING`       | Added to `features.ts` (frontend) + `functions/src/constants/features.ts` (backend) | Both files                                                              | ✅     |
| FR-08 | Auto-set temp status banner on activation          | Transaction helpers set an owned `tempStatus` with `sourceProjectId` | client and Admin lifecycle helpers | ✅ |
| FR-09 | Business-type-aware mode availability              | `getSpecialMenuCapabilities()` maps current business type/category to available modes | `src/config/specialMenuConfig.ts` | ✅ |
| FR-10 | Menu correctness before activation                 | Special projects use the normal editor/persistence guards; there is no separate scheduler-time MCE call | Existing editor and project persistence paths | ✅ |
| FR-11 | Mobile support for management                      | `MobileSpecialMenuScreen` — create, edit metadata/schedule, translate public copy, view, end, cancel | `src/components/mobile/screens/MobileSpecialMenuScreen.tsx`             | ✅     |
| FR-12 | Clear dashboard status indicator                   | `SpecialMenuCard` shows active/scheduled with status badges                         | `src/components/templates/main-app/projects/SpecialMenuCard.tsx`        | ✅     |
| FR-13 | Cancel scheduled; delete only after terminal state | Cancel uses lifecycle DAL; generic delete rejects active/scheduled special menus | lifecycle helper + `deleteProject()` | ✅ |
| FR-14 | Edit scheduled special menu                       | Mobile Special Menus and alternate mobile/desktop project editors route metadata through `updateSpecialMenuProject()` | owner UI paths | ✅ |
| FR-15 | Manual early deactivation                         | Shared lifecycle DAL + desktop/mobile End Now actions | hook/UI + lifecycle helper | ✅ |
| FR-16 | Cache/screen invalidation after lifecycle change   | Client cache helper and Functions store revalidation run post-commit; scheduled path also requests initialized-screen touch | cache helpers | ✅ |
| Tenant/store request ownership | List/detail/SWR reads and mobile action settlement use one captured exact scope; obsolete loads cannot replace current state | hook, DAL, provider, mobile screen | ✅ |
| Atomic translated public truth | Project translation writes project name/description/display name and summary projection in one transaction | project DAL + mobile screen | ✅ |
| Owner project selection partition | Browser selection key includes tenant and store; exact-scope reads reject legacy ambiguous keys | selection boundary test | ✅ |

---

## Files Created

| File                                                                    | Purpose                                  | LOC  |
| ----------------------------------------------------------------------- | ---------------------------------------- | ---- |
| `src/config/specialMenuConfig.ts`                                       | Behavior templates + capability mapping  | ~90  |
| `src/hooks/useSpecialMenus.ts`                                          | SWR hook for special menu data + actions | ~170 |
| `src/components/templates/main-app/projects/SpecialMenuStatusBadge.tsx` | Status badge atom                        | ~45  |
| `src/components/templates/main-app/projects/CreateSpecialMenuModal.tsx` | Creation modal (name, mode, schedule)    | ~190 |
| `src/components/templates/main-app/projects/SpecialMenuCard.tsx`        | Dashboard card with management actions   | ~220 |
| `src/components/mobile/screens/MobileSpecialMenuScreen.tsx`             | Mobile management screen                 | ~230 |
| `src/data/shared/specialMenuSchedule.ts`                                | Canonical next-transition calculation    | Small |
| `src/lib/menu/specialMenuRuntime.ts`                                    | Shared canonical public/screen validator | Small |
| `src/components/templates/main-app/projects/EditSpecialMenuScheduleModal.tsx` | Desktop store-local schedule editor | Small |
| `scripts/verification/test-special-menu-runtime.ts`                     | Runtime eligibility and timezone regression | Small |

## Files Modified

| File                                                                | Change                                                                                                | Impact                                                   |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `src/components/templates/main-app/projects/types/project.types.ts` | Added `SpecialMenuMetadata`, `_specialMenu` on `Project`, special menu fields on `ProjectSummaryData` | Low — additive only                                      |
| `src/types/platform/store.ts`                                       | Added `activeSpecialMenuId` on `StoreDataType` (mode derived from project)                            | Low — additive only                                      |
| `src/config/features.ts`                                            | `ENABLE_SPECIAL_MENU_SWITCHING: true`                                                                 | Low — guarded active runtime                             |
| `src/app/client/[[...slug]]/page.tsx`                               | Resolves validated replace/overlay output through the shared overlay helper                           | Medium — resolver step after base project resolution |
| `src/components/templates/main-app/projects/index.tsx`              | Added `SpecialMenuCard` import + render in upload view                                                | Low — additive, feature-flagged                          |
| `functions/src/schedulers/menulistMaintenanceScheduler.ts`          | Added indexed two-minute lifecycle task                                                               | Medium — new task in existing scheduler                  |
| `functions/src/schedulers/specialMenuLifecycle.ts`                  | Admin transaction + due-marker repair                                                                 | Medium                                                   |
| `functions/src/decisionBlocksScoring.ts`                            | Nightly marker and missed-transition recovery                                                         | Low                                                      |
| `functions/src/constants/features.ts`                               | Added `ENABLE_SPECIAL_MENU_SWITCHING`, `ENABLE_TEMP_STATUS` flags                                     | Low — additive                                           |
| `src/components/mobile/screens/MobileMoreScreen.tsx`                | Added `MobileSpecialMenuScreen` route + menu item                                                     | Low — additive, feature-flagged                          |
| `__docs__/changelog.md`                                             | Added Session 4 entry                                                                                 | Low                                                      |
| `__docs__/strategy/menulist-future-roadmap-ssot.md`                 | Added item #36                                                                                        | Low                                                      |

---

## Critical Bugs Found & Fixed During Review

| Bug                                                   | Impact                                                        | Fix                                                                              | File                                       |
| ----------------------------------------------------- | ------------------------------------------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------ |
| Special menu projects visible in normal slug matching | Customer could navigate to a raw special menu project via URL | Normal slug matching excludes special-menu summary rows | `src/app/client/[[...slug]]/page.tsx` |
| Configured screens required a nonexistent full-project `isSpecialMenu` marker | Screens silently stayed on the regular menu while web customers saw the special menu | Screen runtime now validates canonical `_specialMenu` metadata shared with public menu rendering | `src/database/campaigns/serverScreen.ts`, `src/lib/menu/specialMenuRuntime.ts` |
| Public pointer resolution did not fully validate project/base scope | A malformed or unrelated pointed project could become public output | Shared fail-closed runtime validator plus exact `baseProjectId` match | public route + runtime helper |
| Owner scheduling used browser/device timezone in several paths | A travelling owner could publish at the wrong local business time | Desktop/mobile create/edit convert through `stores.timeZone` | owner modals and mobile screens |
| Date-only mobile categories rendered date-time controls | Controls could be blank and persistence could parse the wrong shape | Capability-aware date/date-time controls and conversions across both mobile editors | mobile special-menu screens |
| Mobile create draft could predate store capability/timezone hydration | The first opened sheet could retain a date shape under a date-time control | Opening/context changes reinitialize schedule values from the hydrated store contract | mobile special-menu screen |
| Desktop lacked schedule editing and hid times | Owners could not efficiently verify or correct a live window | Full schedule range plus desktop edit modal | `SpecialMenuCard.tsx` |
| Immediate create/edit trusted stale store pointers | Owners could remain blocked after interrupted lifecycle cleanup | Exact pointed-project validation repairs stale state transactionally | project DAL |
| Mobile Strict Mode cleanup permanently disabled lifecycle actions | Create, edit, end, and cancel could appear interactive but settle as no-ops in development/runtime replay conditions | Every mounted guard restores `true` on effect setup and `false` only on cleanup | mobile special-menu screen |
| Late base-menu hydration left Create silently inert | A freshly opened sheet could display the base menu while retaining an empty submit identity | Open forms adopt the hydrated default only while their current base is empty, independently from schedule reset | mobile special-menu screen |
| Created/edited/terminal menus retained stale client project truth | The owner could remain on an unnamed, old-name, or ended special menu after a successful mutation | Authoritative create/update results upsert the project cache before selection; terminal transitions restore the base selection | mobile special-menu screen + hook |
| Mixed-shape deletion left dotted summary remnants | Deleted specials reappeared in the selector as `Untitled` ghost menus | One summary write deletes the full entry, every exact legacy dotted subfield, and any nested copy; incomplete rows are not owner-visible | project delete route + summary reader/writer |

---

## Security Compliance

| Check                                     | Status | Details                                                            |
| ----------------------------------------- | ------ | ------------------------------------------------------------------ |
| Client-side DAL with `getActiveSession()` | ✅     | All DAL functions use session for tId/sId scoping                  |
| Feature flag gated                        | ✅     | UI + DAL check `ENABLE_SPECIAL_MENU_SWITCHING`                     |
| No new Firestore collections              | ✅     | Reuses existing `projects`, `platformSummary`, `stores`            |
| No cross-tenant access                    | ✅     | `getDataDocRef` scopes to `session.tId/session.sId` automatically  |
| Cache invalidation                        | ✅     | `revalidateTag` called on all state changes                        |
| Graceful degradation                      | ✅     | Resolver returns base project if special menu not found or errored |
| Base deletion guard                       | ✅     | `deleteProject` blocks if non-expired special menu references base |
| Default project guard                     | ✅     | `updateProjectMetadata` blocks special menu from `isDefault: true` |
| Generic lifecycle mutation guards         | ✅     | Generic deactivate/delete reject active or scheduled special menus |
| Alternate mobile/desktop edit parity      | ✅     | Managed special metadata uses `updateSpecialMenuProject()` instead of partial `_specialMenu` writes |

---

## 3-Year Freeze Compliance

| Check                                               | Status                                        |
| --------------------------------------------------- | --------------------------------------------- |
| Full feature behind feature flag                    | ✅ `ENABLE_SPECIAL_MENU_SWITCHING: true` in frontend and Functions |
| No dependency on future features                    | ✅ Standalone, reuses existing infrastructure |
| Can be toggled without code changes                 | ✅ Feature flag in `features.ts`              |
| No unsupported recurring contract                   | ✅ Current metadata represents one start/end window only |
| No new collections or indexes                       | ✅ Zero new Firestore collections             |

---

## Invariants Verified

| ID    | Invariant                       | Verified                                                        |
| ----- | ------------------------------- | --------------------------------------------------------------- |
| INV-1 | Base menu is NEVER modified     | ✅ Special menu is a separate project document                  |
| INV-2 | Auto-revert protected           | ✅ Indexed due task + nightly recovery + fail-safe public/screen expiry checks |
| INV-3 | Owner always sees current state | ✅ Dashboard card + mobile screen show status                   |
| INV-4 | Zero learning required          | ✅ Same editor, only new thing is schedule picker               |
| INV-5 | One active at a time            | ✅ Overlap check in create route                                |
| INV-6 | System decides behavior         | ✅ `getSpecialMenuCapabilities()` derives from businessType     |
| INV-7 | Not a campaign engine           | ✅ No discounts, coupons, notifications, marketing features     |
| INV-8 | Supported live surfaces follow active menu path | ✅ Public menu/QR link, OBP, and configured screen paths use active special menu/cache/screen refresh evidence; PDF/printed and POS/provider targets stay evidence-bound |

---

## Post-Feedback Changes (February 21, 2026)

| #   | Change                                                                                                                                | Spec Alignment                                                      | Status  |
| --- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------- |
| 1   | Removed `behaviorTemplate` from stored `_specialMenu` metadata — now derived at runtime via `getBehaviorTemplate(store.businessType)` | ADR-7: "derived from getBusinessCategory()" ✅                      | ✅ PASS |
| 2   | Removed `activeSpecialMenuMode` from `StoreDataType` — resolver derives mode from project `_specialMenu.mode`                         | Reduces mutation surface, eliminates store/project mismatch risk ✅ | ✅ PASS |
| 3   | Added base project deletion guard in `deleteProject()` — blocks if non-expired special menu references base                           | Spec INV-1: "Base menu is NEVER modified" ✅                        | ✅ PASS |
| 4   | Added default project guard in `updateProjectMetadata()` — blocks special menu from `isDefault: true`                                 | Prevents routing logic corruption ✅                                | ✅ PASS |

### Production Controls

| #   | Item                                                    | Priority | When                         |
| --- | ------------------------------------------------------- | -------- | ---------------------------- |
| #   | Control                                                  | Status | Evidence |
| --- | -------------------------------------------------------- | ------ | -------- |
| L1  | Activation atomicity (Firestore transaction)             | ✅ | Browser and Admin transaction helpers plus concurrent emulator cases |
| L1a | Stale active-pointer recovery                             | ✅ | Admin emulator proves an expired pointer target is replaced while a real concurrent active target remains blocked |
| L2  | Public/cache and initialized-screen version refresh      | ✅ | Shared public cache invalidation and scheduled screen-version touch |
| L3  | Precise, bounded dispatcher                            | ✅ | Existing consolidated maintenance function, two-minute indexed due query, 50-summary page limit |
| L4  | Overlay runtime ID namespacing and legacy deduplication   | ✅ | `specialMenuOverlay.ts` plus pure projection regression |
| L5  | Process expiries before due activations                   | ✅ | Deterministic scheduler transition ordering and Admin emulator |

## FINAL STATUS: LOCAL SOURCE READY; DEPLOYED QA EVIDENCE PENDING

The July 16, 2026 scoped QA deploy for `menulistMaintenanceScheduler` and `computeDecisionBlocksScores` passed predeploy lint/build, then stopped before upload because Cloud Resource Manager returned HTTP 403 for `menulist-qa`. No Functions runtime changed.

### July 30 End-to-End Audit Verification

Passed:

- `npm run verify:special-menu-lifecycle`
- `npm run test:special-menu-lifecycle:rules`
- `npm run test:special-menu-lifecycle:emulator`
- `npm run verify:digital-screens-boundary`
- `npm run verify:public-business-truth`
- Focused ESLint over all changed special-menu owner, DAL, public, screen, and
  verifier files with zero warnings
- Functions TypeScript build as part of the lifecycle emulator suite
- `npm run docs:check-links` (zero broken links; 62 existing naming warnings
  outside this feature)

Static re-trace covered owner desktop/mobile creation, schedule edit, menu
content edit, translate, activate/end/cancel, summary projection, public cache
invalidation, due scheduler, nightly repair, public menu/OBP route resolution,
configured digital-screen projection, QR links, generic delete/deactivate
guards, tenant/store scope, empty replacement, overlay identity isolation, and
unsupported PDF/POS boundaries.

Full repository TypeScript passes. Authenticated owner visual certification was
blocked by the repository-wide local Turbopack Firebase Admin client-bundling
error. The unauthenticated tenant public route was reachable. No
Vercel/Firebase deployment or full production build was run in this bounded
audit.

---

**Last Updated:** July 30, 2026

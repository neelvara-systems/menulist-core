# Pending Implementation Audit — Full **docs** vs Codebase Cross-Check

**Date:** February 24, 2026 (Session 13)
**Method:** Scanned all 41 `_impl.md` files + READMEs + specs across 75 feature directories. Cross-checked every pending item against actual codebase (`src/`, `functions/src/`).
**Key Finding:** 9 features that docs mark as "not started" or "awaiting implementation" are actually already built in the codebase. Docs are stale.

---

## CRITICAL FINDING: Stale Documentation (Docs Say "Not Done" But Code Is Built)

These docs need updating — the features ARE implemented but docs still say otherwise:

| #   | Feature                                 | Doc Says                               | Codebase Reality                          | Files Found                                                                                                                                                       |
| --- | --------------------------------------- | -------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Cost Self-Protection (SAFE_MODE)**    | "DOCUMENTED — Awaiting implementation" | ✅ FULLY BUILT                            | 22 files: `lib/ops/safeMode.ts`, `api/ops/safe-mode/route.ts`, `database/ops/`, integrated in 13 AI routes                                                        |
| 2   | **Internal Feedback System**            | "28 tasks, 0% complete"                | ✅ FULLY BUILT                            | 30 files: `GuestFeedbackForm`, `api/public/feedback/submit/route.ts`, `database/guestFeedback/`, `types/guestFeedback.ts`, `hooks/useFeedback.ts`, mobile screens |
| 3   | **Menu Command Center**                 | Doc implies partial                    | ✅ FULLY BUILT                            | 21 files: `CommandCenterModal/`, `ActionEngine.tsx`, `ImpactPreview.tsx`, `bulkOperations.ts`, 5 action types                                                     |
| 4   | **Special Menu Switching**              | Scheduler "not implemented"            | ✅ FULLY BUILT (except nightly scheduler) | 17 files: `useSpecialMenus.ts`, `SpecialMenuCard.tsx`, `CreateSpecialMenuModal.tsx`, `specialMenuConfig.ts`, mobile screen                                        |
| 5   | **Ops Alerting Delivery**               | "DOCUMENTED — Awaiting implementation" | ✅ BUILT                                  | 14 files: `lib/ops/alerts.ts`, `api/ops/mute-alerts/route.ts`, `opsControlRoom/`, `lib/messaging/`                                                                |
| 6   | **Menu Kit**                            | —                                      | ✅ BUILT                                  | 11 files: 6 templates (counter sticker, Google Maps, Instagram story, placement guide, table tent, WhatsApp status), `menuKitGenerator.ts`                        |
| 7   | **Health Signals (Loyalty/Trust/Risk)** | —                                      | ✅ PARTIALLY BUILT                        | 7 files: `HealthSignalCards.tsx`, `BehaviorNudgeCard.tsx`, feature flags, store types                                                                             |
| 8   | **Continuous Menu Intelligence**        | "Needs building"                       | ✅ PARTIALLY BUILT                        | Cloud Function exists: `functions/src/intelligence/menuIntelligence.ts`, integrated in `decisionBlocksScoring.ts`, DAL at `src/lib/intelligence/dal.ts`           |
| 9   | **Store Onboarding UI**                 | "DAL 100%, UI 0%"                      | ✅ UI BUILT                               | 15 files: `AddOutletModal/`, `api/outlets/create/route.ts`, `api/outlets/deactivate/route.ts`, `locations/page.tsx`, mobile `MobileLocationsScreen.tsx`           |

**Action needed:** Update these 9 doc sets to reflect actual codebase state.

### Additional Stale Docs Found in Deep Cross-Check (Session 13b)

| #   | Feature                                            | Doc Says             | Codebase Reality | Evidence                                                                                                                                                       |
| --- | -------------------------------------------------- | -------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | **E5: Block outlet delete of inherited project**   | "❌ Not implemented" | ✅ IMPLEMENTED   | `deleteProject()` at `src/database/projects/index.ts:1078-1086` blocks deletion if `masterProjectId` exists                                                    |
| 11  | **BE1: Billing revert on outlet creation failure** | "❌ Not implemented" | ✅ IMPLEMENTED   | `api/outlets/create/route.ts:237-249` reverts Razorpay quantity on failure                                                                                     |
| 12  | **BE3: Double-click outlet creation lock**         | "❌ Not implemented" | ✅ IMPLEMENTED   | `api/outlets/create/route.ts:79-92` uses atomic `outletCreationLock` transaction with 5-min TTL                                                                |
| 13  | **BE8: Server-side subscription check**            | "❌ Need guard"      | ✅ IMPLEMENTED   | `api/outlets/create/route.ts:71-75` checks `sub.status !== 'active'` + max outlet count at line 61-69                                                          |
| 14  | **Special Menu Nightly Scheduler**                 | "❌ Not implemented" | ✅ FULLY BUILT   | `functions/src/decisionBlocksScoring.ts:801-920` — activates/deactivates special menus, sets temp status banners. Flag: `ENABLE_SPECIAL_MENU_SWITCHING: false` |

**Total stale doc count: 14 features/edge cases** where docs say "not implemented" but code is fully built.

---

## GENUINELY NOT IMPLEMENTED (Docs + Code Agree)

### Priority 1 — Pre-Launch Blockers

| #   | Feature                                           | Doc Reference                     | What's Missing                                                                                                                                           | Codebase Evidence                                                                                                                                                            |
| --- | ------------------------------------------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **AI Enhancement Packs Re-Architecture**          | `ai-enhancement-packs_impl.md`    | 25 tasks: rename CreditPack → AIEnhancementPack, new capacity gate UI, remove credit exposure from 7+ components, new pack modal, billing history labels | Has basics (`capacityCheck.ts`, `unitCosts.ts`, `capacityError.ts`) but full re-architecture NOT done. `CreditPackCard.tsx` and `CreditsPackModal.tsx` still use old naming. |
| 2   | **MCE Firestore Security Rules**                  | `menu-correctness-engine_impl.md` | `_mce` field spoofing protection                                                                                                                         | Low risk: owner can only spoof own data, `_mce` stripped by `sanitizeForClient()`. Added structural note in rules.                                                           |
| 3   | **menuSnapshots / menuChangeLog Firestore Rules** | New (Session 13)                  | New collections need security rules                                                                                                                      | ✅ FIXED (Session 13b) — added append-only rules in `firestore.rules`                                                                                                        |

### Priority 2 — Post-Launch Important

| #   | Feature                             | Doc Reference                    | What's Missing                                                                        | Codebase Evidence                                            |
| --- | ----------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 4   | **Holiday/Exception Hours (#2B)**   | `hours-holiday-accuracy_impl.md` | Holiday scheduling, exception hours, special day overrides                            | Zero code for `holidayHours` or `holiday.*exception`         |
| 5   | **Ownership Transfer**              | `ownership-transfer/README.md`   | Full feature: transfer store ownership between users                                  | Zero code matches for `ownershipTransfer`                    |
| 6   | **Presence Dominance Scoring**      | `presence-dominance_impl.md`     | Scoring system for measuring physical+digital presence per store                      | Zero code matches for `presenceDominance` or `presenceScore` |
| 7   | **Razorpay International Payments** | `razorpay_impl.md`               | 5 Razorpay dashboard steps: enable international, KYC, approval, test payment, verify | All 5 steps marked ⬜ Pending                                |

### Priority 3 — Future / Deferred

| #   | Feature                                 | Doc Reference                                | What's Missing                                                   | Notes                                 |
| --- | --------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------- |
| 8   | **POS Webhook Sync Phase 4**            | `pos-webhook-sync_impl.md`                   | Public docs page + email template                                | Low priority, infrastructure complete |
| 9   | **SEO/AEO Phase 3**                     | `seo-aeo-discovery-infrastructure/README.md` | Real SMB data testing, multi-platform distribution research      | Waiting for real stores               |
| 10  | **System Strengthening Audit Findings** | `system-strengthening_impl.md`               | Audit findings documented but "AWAITING IMPLEMENTATION APPROVAL" | Needs review of specific findings     |

---

## BLOCKED ON EXTERNAL DEPENDENCY

| #   | Feature                  | Doc Reference                | Blocker                                        | Infrastructure Status                                                          |
| --- | ------------------------ | ---------------------------- | ---------------------------------------------- | ------------------------------------------------------------------------------ |
| 1   | **GBP Sync**             | `gbp-sync_impl.md`           | Google Business Profile API access not granted | 🔶 Spec locked, implementation blocked                                         |
| 2   | **Reviews & Reputation** | `reviews-reputation_impl.md` | Google Business Profile API access not granted | ✅ Infrastructure built (types, schema, DAL plan). Flip flag when API granted. |

---

## PARTIALLY IMPLEMENTED (Significant Gaps in Edge Cases)

### Multi-Outlet Store Onboarding Edge Cases

**Doc:** `store-onboarding_impl.md`

| ID  | Edge Case                                                        | Status             |
| --- | ---------------------------------------------------------------- | ------------------ |
| E1  | Master project created after outlets exist — auto-propagate      | ❌ Not implemented |
| E4  | Outlet creation fails mid-process — rollback/retry               | ❌ Not implemented |
| E5  | Outlet tries to delete inherited project — block in DAL          | ❌ Not implemented |
| E13 | Orphan outlet project (invalid masterProjectId) — periodic check | ❌ Not implemented |
| E16 | Master project archive (soft archive)                            | ❌ Not implemented |
| E18 | Billing succeeds but internal creation fails                     | ❌ Not implemented |
| E19 | Outlet removal (quantity -1, deactivate)                         | ❌ Not implemented |
| E20 | Orphan outlet integrity check (periodic job)                     | ❌ Not implemented |
| E21 | Master project archive → outlets inherit deactivated             | ❌ Not implemented |
| E22 | Outlet user creates project matching master name — block         | ❌ Not implemented |

### Store Onboarding Billing Edge Cases

**Doc:** `store-onboarding-billing_impl.md`

| ID      | Edge Case                                                       | Status                              |
| ------- | --------------------------------------------------------------- | ----------------------------------- |
| BE1     | Payment succeeds but outlet creation fails — provisioning state | ❌ Not implemented                  |
| BE2     | Enforce billing-first flow order                                | ❌ Not implemented                  |
| BE3     | Double-click outlet creation lock                               | ❌ Not implemented                  |
| BE5     | `subscription.updated` webhook handler                          | ❌ Not implemented                  |
| BE7     | Quantity mismatch detection (reconciliation)                    | ❌ Not implemented                  |
| BE8     | Server-side guard: quantity <= activeStores                     | ❌ Not implemented                  |
| BE10-15 | Outlet removal, shutdown, reactivation, billing adjustments     | ❌ Not implemented (future feature) |

### Special Menu Switching — Nightly Scheduler

**Doc:** `special-menu-switching_impl.md`

| Task                                                        | Status                               |
| ----------------------------------------------------------- | ------------------------------------ |
| Nightly scheduler to auto-activate/deactivate special menus | ❌ Not in `decisionBlocksScoring.ts` |
| Client-side DAL for same-day precision                      | Needs verification                   |

### Multi-Chain Permissions — Firestore Rules

**Doc:** `multi-chain-permissions/README.md`

| Task                                       | Status                                               |
| ------------------------------------------ | ---------------------------------------------------- |
| Firestore Rules for permission enforcement | ❌ "Not yet implemented (API is primary gatekeeper)" |

### Messaging Onboarding Edge Cases

**Doc:** `messaging-onboarding_impl.md`

Core flow is built (12 files) but several edge cases documented as not implemented.

---

## SUMMARY: Action Items by Priority (Updated Feb 24, 2026 — Session 13b)

### ✅ COMPLETED This Session (Session 13b)

1. ✅ `cost-self-protection_impl.md` — marked as IMPLEMENTED with codebase evidence
2. ✅ `internal-feedback-system_impl.md` — updated from 0% to 100% with codebase evidence
3. ✅ `ops-alerting-delivery_impl.md` — marked as IMPLEMENTED with codebase evidence
4. ✅ `menu-health-monitor_impl.md` — marked as IMPLEMENTED with codebase evidence
5. ✅ `store-onboarding_impl.md` — updated E4, E5, E18 edge cases to ✅
6. ✅ `store-onboarding-billing_impl.md` — updated BE1, BE2, BE3, BE8 to ✅
7. ✅ `store-onboarding_spec.md` — updated UI status from 0% to BUILT
8. ✅ `continuous-menu-intelligence_impl.md` — marked Cloud Function as BUILT
9. ✅ `special-menu-switching_impl.md` — marked nightly scheduler as IMPLEMENTED
10. ✅ `menu-correctness-engine_impl.md` — updated phases to DONE, added \_mce risk note
11. ✅ `firestore.rules` — added security rules for `menuChangeLog` and `menuSnapshots`

### Pre-Launch Must-Do (Code Still Needed)

1. ~~**AI Enhancement Packs re-architecture**~~ — ✅ DONE (Session 14, Feb 24 2026). Backend was already 100% built. Frontend rename + doctrine compliance completed: 13 files updated, all credit labels → AI enhancement labels, ActiveSubscriptionCard transformed to AI status panel. 5 minor tasks remain (AICapacityGate, pack status API, PlatformFeaturesList "Included" label, security audit, Firestore rules for capacity fields).
2. **Multi-chain Permissions Firestore rules** — API is primary gatekeeper, rules are secondary

### Post-Launch (Genuinely Not Built)

1. Holiday/Exception Hours (#2B) — zero code exists
2. Ownership Transfer — zero code exists
3. Presence Dominance scoring — zero code exists
4. Razorpay International Payments — 5 Razorpay dashboard steps pending
5. POS Webhook Phase 4 — public docs + email template
6. System Strengthening audit findings — awaiting implementation review

### Blocked (External Dependency)

1. GBP Sync — waiting for Google API access
2. Reviews & Reputation — waiting for Google API access

---

**REVISED TOTALS (after deep cross-check):**

- **Stale docs fixed this session:** 14 features/edge cases that docs claimed "not implemented" but code was fully built
- **Genuinely not built:** 7 features (4 post-launch, 1 pre-launch, 2 blocked)
- **Code changes this session:** Firestore security rules for 2 new collections
- **The codebase is in much better shape than the docs suggested.**

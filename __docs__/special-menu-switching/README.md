# Special Menu Switching

> **"Activate your Diwali menu, Sunday brunch, or seasonal specials — your regular menu stays safe and comes back automatically."**

**Created:** February 20, 2026
**Source:** ChatGPT Strategic Session → Cascade Review + Codebase Cross-Check
**Status:** ✅ IMPLEMENTED — Active behind `ENABLE_SPECIAL_MENU_SWITCHING`
**Feature Flag:** `ENABLE_SPECIAL_MENU_SWITCHING` in `src/config/features.ts`

---

## Quick Navigation

| Document                                                     | Audience     | Purpose                                          |
| ------------------------------------------------------------ | ------------ | ------------------------------------------------ |
| [Spec](./special-menu-switching_spec.md)                     | CEO, PM      | Business requirements, use cases, scope          |
| [Impl](./special-menu-switching_impl.md)                     | Developers   | Technical architecture, DB schema, API contracts |
| [Marketing](./special-menu-switching_marketing.md)           | Sales        | Pitch deck, messaging, sales talking points      |
| [Website](./special-menu-switching_website.md)               | Public       | Landing page content, SEO meta                   |
| [Help Doc](./special-menu-switching_helpdoc.md)              | Customers    | How to use, FAQ, troubleshooting                 |
| [Firebase](./special-menu-switching_firebase.md)             | Cost Control | Reads, writes, cost estimate                     |
| [Mobile Support](./special-menu-switching_mobile-support.md) | Internal     | Mobile admission test, active mobile support spec |
| [ChatGPT Review](./_archive/chatgpt-review.md)               | Internal     | Original conversation analysis + decision matrix |

---

## One-Liner

Temporary menu override system — activate special menus for festivals, events, or seasons with automatic switch-back. Base menu never modified.

---

## Problem Solved

Businesses change their offerings during festivals, events, and seasons. Without this feature, owners manually edit their main menu, forget to revert, and customers see wrong information during peak revenue days. This creates operational chaos at the worst possible time.

---

## Architecture Overview (60-Second Summary)

```
EXISTING PROJECT INFRASTRUCTURE (100% reuse)
  │
  ├── Base Menu (regular project)
  │     └── projectId: "14-abc-15"
  │
  ├── Special Menu (project + _specialMenu metadata)
  │     └── projectId: "14-diwali-15"
  │     └── _specialMenu: { mode, startsAt, endsAt, status }
  │
  └── Resolver (in getProjectBySlugOrDefault)
        └── if store.activeSpecialMenuId → return special project
        └── else → return base project (current behavior)

KEY INSIGHT: Special menu IS a regular project with scheduling metadata.
Zero new editor, zero new collection, zero new UI for menu building.
Uses a transaction-scoped clone-from-base flow, then the same editor for menu content.
```

### How Activation Works

```
Consolidated maintenance scheduler (runs every 2 minutes)
  └── Query only compact project summaries whose specialMenuNextTransitionAt is due
  └── Expire ended windows before activating due windows
  └── If startsAt reached → activate (set store.activeSpecialMenuId)
  └── If endsAt passed → deactivate (clear store.activeSpecialMenuId)
  └── Publish project + summary + store state in one transaction
  └── Invalidate public and initialized-screen caches after commit

Nightly recovery path
  └── Rebuild missing/stale due markers while the existing store maintenance runs
  └── Re-run the same transactional lifecycle helper for any missed boundary

Client-Side DAL
  └── createSpecialMenuProject() with startsAt <= now → auto-activates
  └── activateSpecialMenu() for manual activation
```

---

## Key Design Decisions

| Decision                                  | Why                                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| Special menu = regular project + metadata | Reuses the existing editor, AI extraction, MCE, public link, configured screen paths, and export flows; downloaded or printed artifacts are regenerated or replaced after changes |
| Resolver at data layer                    | Public menu and OBP resolution use `activeSpecialMenuId`; configured screens use their screen data/version path; exported PDFs and POS/provider targets require separate export, replacement, or integration evidence |
| Business-type-aware behavior              | `getBusinessCategory()` determines available modes (replace/overlay). No owner configuration. |
| One active at a time                      | Prevents conflict logic. Block overlapping at creation time.                                  |
| Indexed due-work marker + nightly recovery | The two-minute maintenance task reads only due summary documents; the existing nightly store pass repairs legacy/missing markers. |
| Atomic lifecycle truth                    | Project metadata, compact summary, store pointer, and owned temp banner cannot split across partial writes. |
| Stale pointer recovery                    | A different store pointer blocks activation only while its exact scoped project is still a live active menu. Missing, malformed, inactive, cancelled, expired, or ended pointer targets are replaced by the due menu in the same transaction. |
| Scoped owner cache                        | Special-menu SWR data is keyed by tenant and store; one validated scope supplies both list reads. |
| Overlay rows stay isolated                | New overlays retain the editor file/language context but start with no cloned base rows. Public and screen projections deduplicate legacy clones, namespace new category/item/attribute IDs, and remap category references at runtime. |

---

## Key Files

| File                                                                    | Purpose                                |
| ----------------------------------------------------------------------- | -------------------------------------- |
| `src/config/specialMenuConfig.ts`                                       | Behavior templates, capability map     |
| `src/database/projects/index.ts`                                        | DAL functions (create, activate, etc.) |
| `src/hooks/useSpecialMenus.ts`                                          | SWR hook for dashboard + mobile        |
| `src/components/templates/main-app/projects/SpecialMenuCard.tsx`        | Dashboard card                         |
| `src/components/templates/main-app/projects/CreateSpecialMenuModal.tsx` | Creation modal                         |
| `src/components/templates/main-app/projects/SpecialMenuStatusBadge.tsx` | Status badge atom                      |
| `src/components/mobile/screens/MobileSpecialMenuScreen.tsx`             | Mobile management                      |
| `src/app/client/[[...slug]]/page.tsx`                                   | Client resolver (replace/overlay)      |
| `src/lib/menu/specialMenuOverlay.ts`                                    | Shared safe overlay projection         |
| `src/database/campaigns/serverScreen.ts`                                | Configured-screen active-menu resolver |
| `src/data/shared/specialMenuSchedule.ts`                                | Canonical next-transition calculation  |
| `functions/src/schedulers/menulistMaintenanceScheduler.ts`              | Two-minute due transition dispatcher   |
| `functions/src/schedulers/specialMenuLifecycle.ts`                      | Admin transaction authority            |
| `functions/src/decisionBlocksScoring.ts`                                | Nightly marker/transition recovery      |

---

## Feature Flag

```typescript
ENABLE_SPECIAL_MENU_SWITCHING: true; // In src/config/features.ts and functions/src/constants/features.ts
```

---

## Relationship to Existing Features

| Feature               | Relationship                                                            |
| --------------------- | ----------------------------------------------------------------------- |
| **Temp Status Layer** | Complementary — auto-sets "Special menu available" banner on activation |
| **MCE**               | Normal editor/project persistence runs the existing MCE path; the scheduler adds no separate MCE job |
| **Decision Blocks**   | Run on active menu seamlessly                                           |
| **Digital Screens**   | Configured screens refresh from the active menu path after screen data/version refresh |
| **Multi-Outlet**      | Each outlet manages own special menus independently                     |
| **POS Webhook**       | Integration-bound; do not claim automatic POS updates without provider evidence |

---

## Cost Impact

Costs are region, free-tier, retry, and active-store dependent. The precise path runs one indexed query every two minutes and reads only due compact summary documents (Firestore may charge a minimum read for an empty query). The existing nightly store pass remains a bounded recovery/backfill path. Lifecycle actions use the transactions documented in [special-menu-switching_firebase.md](./special-menu-switching_firebase.md). No separate special-menu collection or persisted overlay projection is added.

---

## Version History

| Version | Date         | Changes                                                                                                                                          |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | Feb 20, 2026 | Initial documentation + implementation                                                                                                           |
| 1.1     | Feb 21, 2026 | ChatGPT feedback: removed stored behaviorTemplate + activeSpecialMenuMode, added deletion/default guards. Feature FROZEN per lifecycle doctrine. |
| 1.2     | Jul 13, 2026 | Atomic lifecycle/scheduler repair, scoped cache reads, owner-banner ownership, and deterministic legacy-safe overlay projection. |
| 1.3     | Jul 16, 2026 | Indexed two-minute switching, nightly marker recovery, generic mutation guards, alternate mobile edit parity, and stale docs repair. |
| 1.4     | Jul 16, 2026 | Browser and Admin activation now recover stale active-menu pointers while preserving real one-active contention. |

---

**Last Updated:** July 16, 2026

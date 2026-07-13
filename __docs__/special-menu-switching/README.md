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
Uses duplicateProject() to create from base, same editor to modify.
```

### How Activation Works

```
Timezone-aware scheduler (runs hourly at :30; each store in its nightly window)
  └── Read the store's compact project summary
  └── Expire ended windows before activating due windows
  └── If startsAt reached → activate (set store.activeSpecialMenuId)
  └── If endsAt passed → deactivate (clear store.activeSpecialMenuId)
  └── Publish project + summary + store state in one transaction
  └── Invalidate public and initialized-screen caches after commit

Client-Side DAL (same-day precision)
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
| Nightly + client-side DAL hybrid          | Cost-optimal. Nightly for overnight transitions, DAL for same-day precision.                  |
| Atomic lifecycle truth                    | Project metadata, compact summary, store pointer, and owned temp banner cannot split across partial writes. |
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
| `functions/src/decisionBlocksScoring.ts`                                | Nightly activation/deactivation        |

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
| **MCE**               | Special menus validated by MCE (same as regular menus)                  |
| **Decision Blocks**   | Run on active menu seamlessly                                           |
| **Digital Screens**   | Configured screens refresh from the active menu path after screen data/version refresh |
| **Multi-Outlet**      | Each outlet manages own special menus independently                     |
| **POS Webhook**       | Integration-bound; do not claim automatic POS updates without provider evidence |

---

## Cost Impact

Costs are region, free-tier, retry, and active-store dependent. The hourly scheduler can perform up to one compact project-summary read per eligible store during its local nightly window (about 30,000 reads per month at 1,000 eligible stores), while lifecycle actions use the bounded transactions documented in [special-menu-switching_firebase.md](./special-menu-switching_firebase.md). No separate special-menu collection or persisted overlay projection is added.

---

## Version History

| Version | Date         | Changes                                                                                                                                          |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | Feb 20, 2026 | Initial documentation + implementation                                                                                                           |
| 1.1     | Feb 21, 2026 | ChatGPT feedback: removed stored behaviorTemplate + activeSpecialMenuMode, added deletion/default guards. Feature FROZEN per lifecycle doctrine. |
| 1.2     | Jul 13, 2026 | Atomic lifecycle/scheduler repair, scoped cache reads, owner-banner ownership, and deterministic legacy-safe overlay projection. |

---

**Last Updated:** July 13, 2026

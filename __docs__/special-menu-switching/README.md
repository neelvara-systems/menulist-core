# Special Menu Switching

> **"Activate your Diwali menu, Sunday brunch, or seasonal specials — your regular menu stays safe and comes back automatically."**

**Created:** February 20, 2026  
**Source:** ChatGPT Strategic Session → Cascade Review + Codebase Cross-Check  
**Status:** ✅ IMPLEMENTED — Feature Flag OFF by Default  
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
| [Mobile Support](./special-menu-switching_mobile-support.md) | Internal     | Mobile admission test, partial support spec      |
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
Nightly Scheduler (2:30 AM UTC)
  └── Check stores with scheduled special menus
  └── If startsAt reached → activate (set store.activeSpecialMenuId)
  └── If endsAt passed → deactivate (clear store.activeSpecialMenuId)
  └── Invalidate cache + bump menuVersion

Client-Side DAL (same-day precision)
  └── createSpecialMenuProject() with startsAt <= now → auto-activates
  └── activateSpecialMenu() for manual activation
```

---

## Key Design Decisions

| Decision                                  | Why                                                                                           |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| Special menu = regular project + metadata | Reuses 100% of existing editor, AI extraction, MCE, publish, screens, PDF                     |
| Resolver at data layer                    | All surfaces (menu, OBP, screens, PDF, POS) automatically get resolved menu                   |
| Business-type-aware behavior              | `getBusinessCategory()` determines available modes (replace/overlay). No owner configuration. |
| One active at a time                      | Prevents conflict logic. Block overlapping at creation time.                                  |
| Nightly + client-side DAL hybrid          | Cost-optimal. Nightly for overnight transitions, DAL for same-day precision.                  |

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
| `src/app/_client/[[...slug]]/page.tsx`                                  | Client resolver (replace/overlay)      |
| `functions/src/decisionBlocksScoring.ts`                                | Nightly activation/deactivation        |

---

## Feature Flag

```typescript
ENABLE_SPECIAL_MENU_SWITCHING: false; // In src/config/features.ts
```

---

## Relationship to Existing Features

| Feature               | Relationship                                                            |
| --------------------- | ----------------------------------------------------------------------- |
| **Temp Status Layer** | Complementary — auto-sets "Special menu available" banner on activation |
| **MCE**               | Special menus validated by MCE (same as regular menus)                  |
| **Decision Blocks**   | Run on active menu seamlessly                                           |
| **Digital Screens**   | Auto-display active menu                                                |
| **Multi-Outlet**      | Each outlet manages own special menus independently                     |
| **POS Webhook**       | Sends resolved menu snapshot on activation change                       |

---

## Cost Impact

**~₹2.50/month per 1,000 stores.** Near-zero incremental cost due to 100% project infrastructure reuse.

---

## Version History

| Version | Date         | Changes                                                                                                                                          |
| ------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0     | Feb 20, 2026 | Initial documentation + implementation                                                                                                           |
| 1.1     | Feb 21, 2026 | ChatGPT feedback: removed stored behaviorTemplate + activeSpecialMenuMode, added deletion/default guards. Feature FROZEN per lifecycle doctrine. |

---

**Last Updated:** February 21, 2026

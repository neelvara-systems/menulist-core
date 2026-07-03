# Special Menu Switching — Mobile Support

**Status:** ✅ IMPLEMENTED — Active behind `ENABLE_SPECIAL_MENU_SWITCHING`; expansion remains governed by `__docs__/constitution/14-feature-lifecycle-doctrine.md`
**Author:** Cascade (Lead Architect)
**Date:** February 20, 2026
**Last Updated:** June 29, 2026
**Audience:** Internal (mobile development)

---

## Feature Admission Test (4 Gates)

| Gate          | Question                                  | Answer                                                                                               | Result     |
| ------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- |
| **Frequency** | Is this done daily or multiple times/day? | Creation is seasonal, but activation, cancellation, and status checks are time-sensitive during active periods. | ⚠️ PARTIAL |
| **Speed**     | Can this complete in <5 seconds?          | Create/edit scheduling and lifecycle actions are short; full menu content editing still opens the Menu tab/editor flow. | ✅ YES |
| **Touch**     | Works with thumb-only?                    | Schedule/name/mode fields, create/edit sheets, activate/end/cancel controls, and translation buttons are touch-friendly. | ✅ YES |
| **Value**     | Needed away from desk?                    | Yes — owners may need to create a same-day special, end an active menu, cancel a schedule, or check status while at the restaurant/event. | ✅ YES |

### Decision: **ACTIVE MOBILE SUPPORT**

Mobile gets:

- ✅ View special menu status (active/scheduled/expired)
- ✅ Create a special menu from an existing base menu
- ✅ Choose replace/overlay mode when the business category allows both modes
- ✅ Edit public special-menu name, description, and schedule
- ✅ Translate missing special-menu public content through the existing translation path
- ✅ End active special menu early ("End Now")
- ✅ Cancel scheduled special menu
- ✅ View schedule details

Mobile does NOT get:

- ❌ Full menu item/category editing inside the Special Menus screen. Owners use the existing Menu tab/editor after the special project opens.
- ❌ New storage, collections, APIs, or mobile-only DAL paths.

---

## Mobile Screen Spec

### Screen: MobileSpecialMenuScreen

**Location:** `src/components/mobile/screens/MobileSpecialMenuScreen.tsx`
**Navigation:** Accessible from MobileMoreScreen ("Special Menus" item)
**Library:** antd-mobile + Tailwind CSS

### Layout

```
┌──────────────────────────┐
│ ← Special Menus          │  NavBar
├──────────────────────────┤
│                          │
│ ┌──────────────────────┐ │
│ │ 🟢 Diwali Menu       │ │  Active card (highlighted)
│ │ Active until Oct 25  │ │
│ │ [End Now]            │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ 📅 Christmas Menu    │ │  Scheduled card
│ │ Dec 20 → Dec 31      │ │
│ │ [Cancel]             │ │
│ └──────────────────────┘ │
│                          │
│ ┌──────────────────────┐ │
│ │ ✓ Sunday Brunch      │ │  Expired card (dimmed)
│ │ Ended Jan 15         │ │
│ └──────────────────────┘ │
│                          │
│ [+ Create special menu] │
│ Edit opens a sheet; full │
│ item editing uses Menu.  │
│                          │
└──────────────────────────┘
```

### Data Source

- Uses `useSpecialMenus()` hook (same as desktop)
- Reads from `projectsSummary` (SWR cached)
- Same DAL function as desktop — no separate mobile DAL

### Interactions

| Action           | UI                    | Confirmation / Boundary                                                                |
| ---------------- | --------------------- | -------------------------------------------------------------------------------------- |
| Create menu      | "Create special menu" | Validates base menu, localized name, schedule, and overlap before calling shared DAL.   |
| Edit metadata    | "Edit" button         | Updates name, description, and schedule through shared special-menu hook/DAL.           |
| Translate copy   | "Translate missing public content" | Uses existing project public-content translation path with bounded diagnostics. |
| Open project     | After create          | Opens the new special-menu project in the existing Menu tab for full menu editing.      |
| End active menu  | "End Now" button      | Dialog: "End Diwali Menu now? Your regular menu will come back immediately."           |
| Cancel scheduled | "Cancel" button       | Dialog: "Cancel Christmas Menu? It won't activate on Dec 20."                          |
| View details     | Card                  | Shows mode, dates, base menu name, and optional description.                            |

### Optimistic Updates

- The screen uses `useSpecialMenus()` for create, update, activate, deactivate, and cancel actions. The hook requires explicit DAL acknowledgement guards before mutating SWR state or returning success, so `apiCallComposer()` fallback values cannot show false create/update/end/cancel success. Lifecycle actions must return the requested project id and expected resulting status (`active`, `expired`, or `cancelled`) before mobile shows success. The hook owns bounded `special_menu_*_failed` diagnostics and cache updates.
- Mobile translation actions log `mobile_special_menu_name_translation_failed` and `mobile_special_menu_project_public_content_translation_failed` with bounded store, tenant, project, language, and draft-length metadata. Project public-content translation writes require `assertProjectUpdateSucceeded()` before draft baselines or success copy update.
- Owner-facing failures use fixed copy. Raw hook errors, project IDs, localized text, provider messages, and exception text must not be shown or logged directly.

---

## Inheritance

| Aspect       | Source                  | Notes                              |
| ------------ | ----------------------- | ---------------------------------- |
| Auth         | NextAuth session        | Same RBAC, owner-only actions      |
| Localization | next-intl               | Date formats follow store timezone |
| Settings     | Redux clientThemeConfig | Theme, language inherited          |
| Icons        | react-icons/lu (Lucide) | LuCalendar, LuCheck, LuX, LuClock  |

---

## Data Format Parity

| Field                      | Desktop Format                                        | Mobile Format | Match? |
| -------------------------- | ----------------------------------------------------- | ------------- | ------ |
| `_specialMenu.status`      | `'scheduled' \| 'active' \| 'expired' \| 'cancelled'` | Same          | ✅     |
| `_specialMenu.startsAt`    | ISO 8601 string                                       | Same          | ✅     |
| `_specialMenu.endsAt`      | ISO 8601 string                                       | Same          | ✅     |
| `_specialMenu.displayName` | string                                                | Same          | ✅     |
| `_specialMenu.mode`        | `'replace' \| 'overlay'`                              | Same          | ✅     |

---

**Last Updated:** February 21, 2026

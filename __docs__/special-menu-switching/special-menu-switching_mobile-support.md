# Special Menu Switching — Mobile Support

**Status:** 🧊 FROZEN — Structurally Complete, Flag OFF. See `__docs__/constitution/14-feature-lifecycle-doctrine.md`  
**Author:** Cascade (Lead Architect)  
**Date:** February 20, 2026  
**Audience:** Internal (mobile development)

---

## Feature Admission Test (4 Gates)

| Gate          | Question                                  | Answer                                                                                               | Result     |
| ------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------------- | ---------- |
| **Frequency** | Is this done daily or multiple times/day? | No — creating special menus is monthly/seasonal. But CHECKING status is daily during active periods. | ⚠️ PARTIAL |
| **Speed**     | Can this complete in <5 seconds?          | Creating: No (needs editor). Managing/checking: Yes (<2s).                                           | ⚠️ PARTIAL |
| **Touch**     | Works with thumb-only?                    | Status check + activate/deactivate: Yes. Full menu editing: No (use desktop editor).                 | ⚠️ PARTIAL |
| **Value**     | Needed away from desk?                    | Yes — owner may need to end a special menu early or check status while at the restaurant/event.      | ✅ YES     |

### Decision: **PARTIAL MOBILE SUPPORT**

Mobile gets:

- ✅ View special menu status (active/scheduled/expired)
- ✅ End active special menu early ("End Now")
- ✅ Cancel scheduled special menu
- ✅ View schedule details

Mobile does NOT get:

- ❌ Create new special menu (requires full editor — desktop only)
- ❌ Edit special menu content (requires full editor — desktop only)
- ❌ Mode selection (done at creation — desktop only)

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
│ ℹ️ Create and edit       │
│ special menus on desktop │
│                          │
└──────────────────────────┘
```

### Data Source

- Uses `useSpecialMenus()` hook (same as desktop)
- Reads from `projectsSummary` (SWR cached)
- Same DAL function as desktop — no separate mobile DAL

### Interactions

| Action           | UI               | Confirmation                                                                 |
| ---------------- | ---------------- | ---------------------------------------------------------------------------- |
| End active menu  | "End Now" button | Dialog: "End Diwali Menu now? Your regular menu will come back immediately." |
| Cancel scheduled | "Cancel" button  | Dialog: "Cancel Christmas Menu? It won't activate on Dec 20."                |
| View details     | Tap card         | Expand to show mode, dates, base menu name                                   |

### Optimistic Updates

- "End Now" → immediately update local state to `expired`, show Toast "Special menu ended"
- "Cancel" → immediately update local state to `cancelled`, show Toast "Special menu cancelled"
- On API error → revert state, show error Toast

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

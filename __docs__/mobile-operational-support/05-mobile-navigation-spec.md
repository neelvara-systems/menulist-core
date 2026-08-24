# Mobile Navigation Specification

**Created:** February 14, 2026
**Status:** Source-bounded navigation reference; not current implementation approval or launch certification
**Author:** Lead Architect (Cascade)
**Source:** Mobile UI Doctrine + Industry Best Practices
**Depends On:** `02-mobile-ui-doctrine.md`, `03-mobile-screens-spec.md`

## Current Release Boundary

This document records the intended MobileShell navigation model and current route-map reference. It does not approve new mobile navigation work, launch readiness, or production certification by itself. Current navigation approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:mobile-shell-route-map`, authenticated owner-shell mobile QA for affected routes, real-device QA where PWA/share behavior is in scope, target deploy evidence, and production-host smoke.

---

## Navigation Philosophy

> **Maximum 2 taps to reach any action. Zero learning curve.**

The mobile navigation is designed so that an owner who has never used the mobile version can find and complete any action within seconds. There is nothing to learn — it works exactly like every mobile app they already use.

---

## Bottom Navigation (TabBar)

### Structure (Exactly 4 Tabs)

| Position | Tab | Icon | Route | Default |
| --- | --- | --- | --- | --- |
| 1 (left) | **Today** | `LuCalendarCheck` | internal | ✅ Active on open |
| 2 | **Menu** | `LuUtensilsCrossed` | `/projects` | |
| 3 | **Share** | `LuQrCode` | internal | |
| 4 (right) | **More** | `LuMoreHorizontal` | internal | |

### Tab Behavior

- **Active tab**: Highlighted with primary color + filled icon
- **Inactive tabs**: Grey icon + label
- **Badge on More**: Show unread feedback count on More tab
- **Tab tap**: Switch content instantly (no page navigation, no loading)
- **Double-tap active tab**: Scroll to top of current content

### Why Exactly 4 Tabs

- **3 tabs**: Not enough. Today, editing, and sharing are all high-frequency on mobile.
- **4 tabs**: Covers daily action, editing, distribution, and settings cleanly.
- **5 tabs**: Too many. Creates decision fatigue. "More" handles overflow cleanly.

### TabBar Visual Specs

| Property | Value |
| --- | --- |
| Height | 56px + bottom SafeArea |
| Background | `colorBgContainer` (theme token) |
| Border top | 1px `colorBorderSecondary` |
| Icon size | 22px |
| Label size | 10px |
| Active color | `colorPrimary` |
| Inactive color | `colorTextSecondary` |
| Position | Fixed bottom |

---

## Screen Flow Diagram

```
┌─────────────────────────────────────────┐
│              MOBILE APP                  │
│                                          │
│  ┌──── TabBar ─────────────────────┐    │
│  │                                  │    │
│  │ [Today]   [Menu] [Share] [More] │    │
│  │    │         │        │       │  │    │
│  └────┼─────────┼────────┼───────┼──┘    │
│       │         │        │       │       │
│       ▼         ▼        ▼       ▼       │
│                                          │
│  ┌ Today ┐ ┌─ Menu ─┐ ┌Share┐ ┌More┐│
│  │       │ │        │ │     │ │    ││
│  │ Daily │ │ Search │ │ Live│ │List││
│  │ Action│ │ Items  │ │links│ │    ││
│  │       │ │        │ │     │ │    ││
│  │Prompt │ │  [+]   │ │ TV  │ │    ││
│  │       │ │  FAB   │ │ QR  │ │    ││
│  └───┬───┘ └───┬────┘ └──┬──┘ └─┬──┘│
│      │           │         │        │    │
│      ▼           ▼         ▼        ▼    │
│                                          │
│  ┌────────┐ ┌────────┐ ┌──────┐ ┌─────┐│
│  │Edit    │ │Edit Day│ │Detail│ │Share││
│  │Sheet   │ │Sheet   │ │+Reply│ │QR   ││
│  │(Popup) │ │(Popup) │ │      │ │     ││
│  └────────┘ └────────┘ └──────┘ │Info ││
│  ┌────────┐                     │Bill ││
│  │Add Item│                     │Acct ││
│  │Sheet   │                     └─────┘│
│  │(Popup) │                            │
│  └────────┘                            │
│                                          │
└──────────────────────────────────────────┘
```

### Navigation Depth Map

| Level | What | Example |
| --- | --- | --- |
| **Level 0** | TabBar | Today, Menu, Share, More |
| **Level 1** | Screen content | campaign view, item list, share hub, more list |
| **Level 2** | Overlay/drill-in | edit sheet, add sheet, project picker, sub-screens |

**Maximum depth: 2.** No Level 3 exists on mobile. If a feature needs Level 3, it belongs on desktop.

---

## Tab: Today

### Internal Navigation

```
Today Tab
├── MobileHoursScreen (default)
│   └── → Dashboard drill-in (Level 2, optional)
```

### Behavior
- **Default open**: Today screen
- **Primary use**: daily campaign/action, staff prompt, quick completion
- **Dashboard access**: opens only as a drill-in when needed

---

## Tab: Menu

### Internal Navigation

```
Menu Tab
├── Menu Screen (default)
│   ├── → Item Quick Edit Sheet (Popup, Level 2)
│   └── → Add Item Sheet (Popup, Level 2)
```

### Behavior
- **Default open**: Menu Screen with search bar focused
- **Back from sheet**: Close sheet → back to menu list
- **No sub-navigation**: Everything happens on one screen + overlays

---

## Tab: Share

### Internal Navigation

```
Share Tab
├── MobileShareScreen (default)
│   ├── → Project selector (Popup, Level 2)
│   ├── → Presence monitor confirmations
│   └── → Customer communication kit actions
```

### Behavior
- **Default open**: share hub with project selector, links, screens, and communication tools
- **Project switch**: inline popup selector
- **Copy/open actions**: single tap, no extra confirmation screens

---

## Tab: More

### Internal Navigation

```
More Tab
├── More Screen (default, list of options)
│   ├── → Feedback Inbox (Level 2)
│   ├── → Dashboard (Level 2)
│   ├── → Digital Screens (Level 2)
│   ├── → Locations (Level 2)
│   ├── → Staff (Level 2)
│   ├── → Business Profile / Brand Settings (Level 2)
│   ├── → Billing Screen (Level 2)
│   ├── → Business settings screens (Level 2)
│   └── → Logout (Dialog, Level 2)
```

### Behavior
- **Default open**: List of menu items
- **Tap item**: Navigate to sub-screen (within same tab)
- **Back from sub-screen**: NavBar back button → return to More list
- **Switch outlet**: Opens inline picker, no navigation

---

## Route Mapping (Desktop ↔ Mobile)

| Desktop Route | Desktop Page | Mobile Screen | Mobile Tab |
| --- | --- | --- | --- |
| `/dashboard` | DashboardPage | MobileHoursScreen / Today tab | Today |
| `/projects` | ProjectsPage (Editor) | MobileMenuScreen | Menu |
| `/today` | TodayPage | MobileHoursScreen | Today |
| `/feedback` | FeedbackPage | MobileFeedbackScreen | More |
| `/qr-code` | QrCodePage | MobileShareScreen | Share |
| `/business-settings` | BusinessSettings | MobileMoreScreen → MobileBasicSettingsScreen | More → Business Profile / Brand Settings |
| `/billing` | BillingPage | MobileBillingScreen | More → Billing |
| `/users` | UsersPage | MobileUsersScreen | More |
| `/transactions` | TransactionsPage | MobileTransactionsScreen | More |
| `/locations` | LocationsPage | MobileLocationsScreen | More |
| `/help-center` | HelpCenter | MobileHelpScreen | More |
| `/platform/*`, `/ops/*`, `/reseller/*` | Internal/partner pages | Role-gated More sub-screens | More |

### Desktop-Only Routes on Mobile

Most canonical owner, platform, ops, and reseller routes map into `MobileShell` through the route-map source gate (`npm run verify:mobile-shell-route-map`). When a mobile user accesses a route that is still desktop-only:

```
Show: "This feature is available on desktop."
Button: "Open Desktop Version" → opens same URL with ?force=desktop param
Button: "Go to Menu" → navigate to Menu tab
```

---

## Gestures

| Gesture | Where | Action |
| --- | --- | --- |
| **Pull down** | Menu list, Feedback list | Pull to refresh |
| **Swipe down** | Bottom sheets | Dismiss sheet |
| **Swipe right** | Feedback card | Quick resolve |
| **Swipe right** | Detail screens | Go back (native feel) |
| **Tap** | All interactive elements | Primary interaction |
| **Long press** | NOT used | Avoid — not discoverable |

---

## Transition Animations

| Transition | Animation | Duration |
| --- | --- | --- |
| Tab switch | Instant (no animation) | 0ms |
| Bottom sheet open | Slide up from bottom | 200ms ease-out |
| Bottom sheet close | Slide down | 150ms ease-in |
| Detail screen open | Slide in from right | 200ms ease-out |
| Detail screen close | Slide out to right | 150ms ease-in |
| Pull to refresh | Spring physics | Native feel |
| Toast appear | Fade in | 150ms |
| Toast disappear | Fade out | 150ms |

### Reduced Motion

When `prefers-reduced-motion` is set:
- All transitions: instant (0ms)
- Pull to refresh: standard (no spring)
- Toasts: instant appear/disappear

---

## Deep Linking

### Supported Deep Links (Mobile)

| URL | Mobile Behavior |
| --- | --- |
| `menulist.app/projects` | Open Menu tab |
| `menulist.app/today` | Open Today tab |
| `menulist.app/share` | Open Share tab |
| `menulist.app/billing` | Open More → Billing |
| `menulist.app/business-settings` | Open More → Business Profile / Brand Settings |

### PWA Shortcuts

```json
{
    "shortcuts": [
        { "name": "Today", "url": "/today" },
        { "name": "Menu", "url": "/projects" },
        { "name": "Share & QR", "url": "/use-menulist" },
        { "name": "Feedback", "url": "/feedback" }
    ]
}
```

Owner PWA shortcuts stay on real owner routes. This keeps route-level
permission checks intact while `MobileShell` maps each owner route into the
intended mobile screen when the app launches from a shortcut.

---

## Outlet Switching (Multi-Outlet Users)

### Location

More tab → "Locations" screen (visible only for multi-outlet users).

### Behavior

1. Tap "Locations"
2. Outlet list opens
3. Tap target outlet
4. Store context switches and screens reload
5. Toast: "Switched to [Outlet Name]"

### State Persistence

- Last selected outlet saved to `localStorage`
- On next app open: auto-select last used outlet
- If outlet removed/deactivated: fall back to first available

### Visual Indicator

When in non-default outlet, show subtle indicator below NavBar:
```
┌─────────────────────────────┐
│ 📍 Viewing: Downtown Branch │  ← Only for multi-outlet, non-primary
├─────────────────────────────┤
```

---

## Force Desktop Mode

### Why Needed

Sometimes mobile users need to access desktop-only features (rare but possible).

### Implementation

In More screen: "Switch to Desktop" option.

Behavior:
1. Tap "Open Desktop View"
2. Sets `?force=desktop` URL parameter
3. Page reloads with desktop layout
4. Show top banner: "Desktop mode. [Switch to Mobile]"

### Persistence

Force desktop mode persists only for the exact selected route tree and is
cleared by the visible "Return to Mobile" action. It does not apply globally or
to sibling routes. Browser values must be a bounded same-app absolute path;
malformed, external-style, control-character, or unreadable state fails back to
the mobile shell.

The subscription gate does not use forced desktop mode. Its **View Plans**
action opens the canonical `/billing` route as the MobileShell Billing screen.
Only that recovery screen bypasses the no-entitlement gate, so an owner can
finish a pending checkout or choose a plan without gaining menu access.

---

## Accessibility

### Tab Navigation (VoiceOver/TalkBack)

- TabBar items: `role="tab"`, `aria-selected`
- Tab content: `role="tabpanel"`
- Active tab announced by screen reader

### Screen Transitions

- New content announced: `aria-live="polite"`
- Loading states: `aria-busy="true"`
- Bottom sheets: `role="dialog"`, `aria-modal="true"`

### Focus Management

- On tab switch: focus moves to first interactive element
- On sheet open: focus moves to first input
- On sheet close: focus returns to trigger element
- On detail open: focus moves to heading

---

## Error States

### Network Error (Mobile-Specific)

```
┌─────────────────────────────┐
│  ⚠️ Connection issue         │
│  Your changes will sync     │
│  when you're back online.   │
│                             │
│  [Retry Now]                │
└─────────────────────────────┘
```

Never block the UI. Show inline message. Allow continued editing.

### Session Expired

```
┌─────────────────────────────┐
│  Session expired            │
│  Please sign in again.      │
│                             │
│  [Sign In]                  │
└─────────────────────────────┘
```

Redirect to sign-in page. After sign-in, return to last screen.

### Empty States (Per Screen)

| Screen | Empty Message |
| --- | --- |
| Menu | "No items yet. Tap + to add your first item." |
| Feedback | "No feedback yet. Customer feedback will appear here." |
| Today | "All done for today." |
| Share | (Never empty — always shows link + QR) |

---

**Document Signature:** Mobile Navigation Specification  
**Version:** 1.0  
**Last Updated:** February 14, 2026

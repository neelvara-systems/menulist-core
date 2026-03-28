# Mobile Navigation Specification

**Created:** February 14, 2026  
**Status:** 📋 SPEC COMPLETE — Ready for implementation  
**Author:** Lead Architect (Cascade)  
**Source:** Mobile UI Doctrine + Industry Best Practices  
**Depends On:** `02-mobile-ui-doctrine.md`, `03-mobile-screens-spec.md`

---

## Navigation Philosophy

> **Maximum 2 taps to reach any action. Zero learning curve.**

The mobile navigation is designed so that an owner who has never used the mobile version can find and complete any action within seconds. There is nothing to learn — it works exactly like every mobile app they already use.

---

## Bottom Navigation (TabBar)

### Structure (Exactly 4 Tabs)

| Position | Tab | Icon | Route | Default |
| --- | --- | --- | --- | --- |
| 1 (left) | **Menu** | `LuFolderHeart` | `/projects` | ✅ Active on open |
| 2 | **Hours** | `LuClock` | `/today` | |
| 3 | **Feedback** | `LuTicket` | `/feedback` | |
| 4 (right) | **More** | `LuMenu` | internal | |

### Tab Behavior

- **Active tab**: Highlighted with primary color + filled icon
- **Inactive tabs**: Grey icon + label
- **Badge on Feedback**: Show dot when new unread feedback exists
- **Tab tap**: Switch content instantly (no page navigation, no loading)
- **Double-tap active tab**: Scroll to top of current content

### Why Exactly 4 Tabs

- **3 tabs**: Not enough. Hours needs its own tab (used daily).
- **4 tabs**: Perfect. Covers all high-frequency features + "More" for rest.
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
│  │  [Menu]   [Hours]  [Feed]  [More]│    │
│  │    │         │        │       │  │    │
│  └────┼─────────┼────────┼───────┼──┘    │
│       │         │        │       │       │
│       ▼         ▼        ▼       ▼       │
│                                          │
│  ┌─ Menu ─┐ ┌─ Hours ─┐ ┌ Feed ┐ ┌More┐│
│  │        │ │         │ │      │ │    ││
│  │ Search │ │ Today   │ │ List │ │List││
│  │ Items  │ │ Status  │ │      │ │    ││
│  │        │ │         │ │      │ │    ││
│  │  [+]   │ │ Weekly  │ │      │ │    ││
│  │  FAB   │ │ Hours   │ │      │ │    ││
│  └───┬────┘ └────┬────┘ └──┬───┘ └─┬──┘│
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
| **Level 0** | TabBar | Menu, Hours, Feedback, More |
| **Level 1** | Screen content | Item list, hours card, feedback inbox, more list |
| **Level 2** | Overlay/drill-in | Edit sheet, add sheet, feedback detail, sub-screens |

**Maximum depth: 2.** No Level 3 exists on mobile. If a feature needs Level 3, it belongs on desktop.

---

## Tab: Menu (Default)

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

## Tab: Hours

### Internal Navigation

```
Hours Tab
├── Hours & Status Screen (default)
│   ├── → Edit Day Hours Sheet (Popup, Level 2)
│   └── → Temp Close Duration Picker (Popup, Level 2)
```

### Behavior
- **Default open**: Today status card at top
- **Edit day**: Tap day row → bottom sheet with time pickers
- **Temp close**: Tap "Temporarily close" → duration picker sheet

---

## Tab: Feedback

### Internal Navigation

```
Feedback Tab
├── Feedback Inbox (default)
│   └── → Feedback Detail (Level 2, separate view)
│       └── Reply + Resolve actions
```

### Behavior
- **Default open**: Feedback list with filters
- **Tap feedback**: Navigate to detail view (within same tab)
- **Back from detail**: NavBar back button → return to inbox
- **Swipe resolve**: Swipe right on card → resolve directly

---

## Tab: More

### Internal Navigation

```
More Tab
├── More Screen (default, list of options)
│   ├── → Share & QR Screen (Level 2)
│   ├── → Public Info Screen (Level 2)
│   ├── → Billing Screen (Level 2)
│   ├── → Switch Outlet (Picker, Level 2)
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
| `/dashboard` | DashboardPage | → Redirect to Menu Screen | Menu |
| `/projects` | ProjectsPage (Editor) | MobileMenuScreen | Menu |
| `/today` | TodayPage | MobileHoursScreen | Hours |
| `/feedback` | FeedbackPage | MobileFeedbackScreen | Feedback |
| `/qr-code` | QrCodePage | MobileShareScreen | More → Share |
| `/business-settings` | BusinessSettings | MobilePublicInfoScreen | More → Info |
| `/billing` | BillingPage | MobileBillingScreen | More → Billing |
| `/users` | UsersPage | NOT on mobile | Desktop only |
| `/transactions` | TransactionsPage | NOT on mobile | Desktop only |
| `/locations` | LocationsPage | NOT on mobile | Desktop only |
| `/help-center` | HelpCenter | NOT on mobile | Desktop only |
| `/platform/*` | PlatformPages | NOT on mobile | Desktop only |

### Desktop-Only Routes on Mobile

When a mobile user accesses a desktop-only route (e.g., deep link to `/users`):

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
| `menulist.app/feedback` | Open Feedback tab |
| `menulist.app/billing` | Open More → Billing |
| `menulist.app/business-settings` | Open More → Public Info |

### PWA Shortcuts

```json
{
    "shortcuts": [
        { "name": "Menu", "url": "/projects" },
        { "name": "Share QR", "url": "/qr-code" },
        { "name": "Feedback", "url": "/feedback" }
    ]
}
```

---

## Outlet Switching (Multi-Outlet Users)

### Location

More tab → "Switch Outlet" option (visible only for multi-outlet users).

### Behavior

1. Tap "Switch Outlet"
2. `Picker` opens with list of outlets
3. Select outlet
4. All screens reload with new outlet data
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

In More screen: "Open Desktop View" option.

Behavior:
1. Tap "Open Desktop View"
2. Sets `?force=desktop` URL parameter
3. Page reloads with desktop layout
4. Show top banner: "Desktop mode. [Switch to Mobile]"

### Persistence

Force desktop mode is NOT persistent. Cleared on next visit. Mobile is always the default for mobile devices.

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
| Hours | (Never empty — always shows today + weekly) |
| Share | (Never empty — always shows link + QR) |

---

**Document Signature:** Mobile Navigation Specification  
**Version:** 1.0  
**Last Updated:** February 14, 2026

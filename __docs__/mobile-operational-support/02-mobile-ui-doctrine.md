# Mobile UI Doctrine — Constitution & Rules

**Created:** February 14, 2026  
**Status:** 🔒 LOCKED — NON-NEGOTIABLE  
**Authority:** Maximum — Applies to ALL mobile screens and ALL future features  
**Author:** Lead Architect (Cascade)  
**Source:** Codebase Analysis + ChatGPT Brainstorm + Industry Best Practices  
**Applies:** Permanent — Every feature from this point forward

---

## The Single Truth

> **"Mobile is where the owner operates. Desktop is where the owner configures."**

This is not a guideline. This is the operating principle for all device-specific decisions in MenuList.

---

## Part 1: Core Philosophy

### 1.1 What Mobile IS

Mobile is a **real-time business control in pocket**. It exists for:
- Urgent corrections during business hours
- Repetitive daily operational tasks
- Quick checks between serving customers
- Sharing menu links with customers on the spot

### 1.2 What Mobile IS NOT

Mobile is NOT:
- A mini version of the desktop dashboard
- A feature-parity companion app
- A design showcase
- An analytics surface
- A configuration environment

### 1.3 The WhatsApp Test

> Every mobile screen must pass the "WhatsApp Test":
> **Would the owner open this as quickly and naturally as they open WhatsApp?**

If a screen feels like "admin software" instead of a "quick utility", it fails.

---

## Part 2: The 12 Laws of Mobile UI

These laws are permanent. They cannot be overridden by feature requests, design preferences, or "nice to have" additions.

### Law 1 — The 5-Second Rule

> **Any common action must complete in ≤5 seconds.**

This includes: price change, availability toggle, close today, copy link, mark feedback resolved.

If an action takes longer than 5 seconds on mobile → redesign it.

**Measurement:** Time from app open to action complete. Not from screen open.

### Law 2 — No Deep Navigation

> **Maximum depth = 2 levels from bottom nav.**

```
Level 0: Bottom Nav (Menu | Hours | Feedback | More)
Level 1: Screen content (item list, hours card, feedback inbox)
Level 2: Action sheet / bottom sheet (edit item, reply feedback)
```

If a feature requires Level 3 → it belongs on desktop.

### Law 3 — Menu Is Home

> **When owner opens the app, they land directly on the Menu screen.**

No dashboard homepage. No welcome screen. No overview cards. No stats.
The Menu screen IS the homepage.

**Rationale:** 90% of mobile actions happen on menu items. Every extra tap before reaching menu = friction.

### Law 4 — Search Is Primary Interaction

> **Global search must be the fastest way to find anything on mobile.**

On mobile, owners will NOT browse categories. They will search by item name.

Search must be:
- Always visible at top of Menu screen
- Client-side filtered (instant, no server calls)
- Works on item name and category name
- Results appear as user types

### Law 5 — Auto-Publish for Operational Edits

> **All small operational edits go live instantly. No publish button on mobile.**

Auto-publish applies to:
- Price changes
- Availability toggles
- Item name corrections
- Adding/deleting items
- Hours changes
- Open/closed status changes
- Public info edits (phone, address)

Manual publish ONLY applies to heavy structural edits (desktop-only operations):
- Bulk AI generation
- Full menu restructuring
- Category reorder (large changes)
- Import operations

### Law 6 — Touch-First, Not Click-Adapted

> **Every interactive element must be designed for thumbs, not mouse pointers.**

Minimum touch targets:
- **Buttons:** 44x44px minimum (Apple HIG standard)
- **Toggle switches:** 51x31px minimum
- **List item tap areas:** Full row width, 48px minimum height
- **Bottom sheet drag handle:** 40px wide, 20px tall
- **Spacing between actions:** 8px minimum to prevent mis-taps

**Forbidden on mobile:**
- Hover states as primary interaction
- Right-click menus
- Drag-and-drop (complex)
- Tiny icon-only buttons without labels
- Desktop-style dropdown menus

### Law 7 — Bottom Sheet Over Modal

> **On mobile, use bottom sheets (Popup) instead of centered modals.**

Bottom sheets are:
- Easier to reach with one hand
- Feel native on mobile
- Can be dismissed by swipe down
- Don't block the full screen

Use centered dialogs ONLY for:
- Destructive confirmations ("Delete this item?")
- Critical alerts

### Law 8 — Optimistic Updates

> **Every edit must feel instant. Update UI first, sync in background.**

Pattern:
1. User taps "toggle unavailable"
2. UI updates immediately (toggle switches)
3. Background sync to Firestore
4. If sync fails → revert UI + show toast

**Never show loading spinners for small edits.** The app must feel like a light switch.

### Law 9 — Offline-Tolerant

> **Mobile must not block usage when network is slow.**

- Edits queue locally and sync when online
- Menu data cached for instant load
- Show subtle "Syncing..." indicator, not blocking loader
- Never show error modals for network issues on mobile
- Toast notification only: "Changes saved" or "Will sync when online"

### Law 10 — No Feature Creep

> **Before adding ANY feature to mobile, ask: "Will the owner use this during working hours while serving customers?"**

If NO → desktop only. Period.

Features that MUST NEVER be on mobile:
- AI image generation
- Bulk description generation
- Translation management
- Menu restructuring
- Import PDF/link
- Deep branding/theme customization
- Analytics dashboards
- Complex settings
- Multi-outlet master linking
- Staff/role management

### Law 11 — Calm UI

> **Mobile must never feel alarming, urgent, or demanding.**

- No red warning colors for low ratings
- No "action required" badges beyond a simple dot
- No gamification
- No "improve your rating" tips
- No engagement nudges
- No "you haven't checked in X days" prompts

MenuList mobile is infrastructure, not a needy app.

### Law 12 — Device-Specific, Not Responsive

> **Mobile screens are purpose-built for mobile, not desktop screens shrunk down.**

Same logic. Different UI. Purpose-built for the context.

This means:
- Mobile components are separate from desktop components
- Both call the same DAL functions and hooks
- Mobile has its own navigation (bottom nav)
- Mobile has its own layout (no sidebar, no desktop header)
- Mobile uses `antd-mobile` components, not `antd`

---

## Part 3: UI Component Rules

### 3.1 Navigation

| Pattern | Component | Library |
| --- | --- | --- |
| Bottom navigation | `TabBar` | antd-mobile |
| Back navigation | `NavBar` | antd-mobile |
| Page transitions | CSS transitions | Tailwind |
| More menu | `List` | antd-mobile |

**Bottom nav tabs (exactly 4, no more):**
1. **Menu** — Default active, most used
2. **Hours** — Business status control
3. **Feedback** — Customer messages
4. **More** — Everything else (low-frequency)

### 3.2 Content Display

| Pattern | Component | Library |
| --- | --- | --- |
| Item lists | `List` + `List.Item` | antd-mobile |
| Cards | `Card` | antd-mobile |
| Empty states | `Empty` | antd-mobile |
| Loading | `DotLoading` / `SpinLoading` | antd-mobile |
| Pull to refresh | `PullToRefresh` | antd-mobile |
| Infinite scroll | `InfiniteScroll` | antd-mobile |
| Swipe actions | `SwipeAction` | antd-mobile |

### 3.3 Inputs & Forms

| Pattern | Component | Library |
| --- | --- | --- |
| Search | `SearchBar` | antd-mobile |
| Text input | `Input` | antd-mobile |
| Number input (price) | `Stepper` or custom | antd-mobile |
| Toggle | `Switch` | antd-mobile |
| Category select | `Selector` / `Picker` | antd-mobile |
| Time picker | `Picker` | antd-mobile |
| Text area | `TextArea` | antd-mobile |

### 3.4 Overlays & Actions

| Pattern | Component | Library |
| --- | --- | --- |
| Bottom sheet (edit) | `Popup` | antd-mobile |
| Action selection | `ActionSheet` | antd-mobile |
| Confirmation | `Dialog` | antd-mobile |
| Toast notification | `Toast` | antd-mobile |
| Floating add button | `FloatingBubble` | antd-mobile |

### 3.5 Layout

| Pattern | Approach |
| --- | --- |
| Page padding | `px-4 py-4` (Tailwind) |
| Section spacing | `space-y-4` (Tailwind) |
| Flex layouts | Tailwind flex utilities |
| Safe area | `SafeArea` (antd-mobile) |
| Full-width buttons | `w-full` (Tailwind) |

---

## Part 4: Visual Design Rules

### 4.1 Typography (Mobile)

| Element | Size | Weight |
| --- | --- | --- |
| Page title | 20px | 600 (semibold) |
| Section heading | 16px | 600 |
| Item name | 15px | 500 (medium) |
| Item price | 15px | 600 |
| Body text | 14px | 400 (regular) |
| Caption/meta | 12px | 400 |
| Badge/label | 11px | 500 |

### 4.2 Spacing

| Context | Value |
| --- | --- |
| Page horizontal padding | 16px |
| Card internal padding | 12px |
| List item vertical padding | 12px |
| Between sections | 16px |
| Between list items | 1px (divider line) |
| Button height | 44px minimum |
| Bottom nav height | 56px + safe area |

### 4.3 Colors

Use Ant Design token system for consistency between desktop and mobile:

| Purpose | Token |
| --- | --- |
| Primary action | `colorPrimary` |
| Background | `colorBgBase` |
| Card background | `colorBgContainer` |
| Text primary | `colorText` |
| Text secondary | `colorTextSecondary` |
| Border | `colorBorder` |
| Success (available) | `colorSuccess` |
| Warning (attention) | `colorWarning` |
| Error (unavailable) | `colorError` |

### 4.4 Dark Mode

Mobile MUST support dark mode from day one:
- Use Ant Design token system (already supports dark mode)
- antd-mobile supports CSS variables for theming
- Never hardcode colors — always use tokens
- Test every screen in both light and dark mode

---

## Part 5: Performance Standards

### 5.1 Speed Requirements (NON-NEGOTIABLE)

| Metric | Target | Unacceptable |
| --- | --- | --- |
| App open to usable | < 1 second | > 3 seconds |
| Search filter response | < 100ms | > 500ms |
| Toggle availability | < 200ms (UI) | > 1 second |
| Price edit save | < 300ms (UI) | > 1 second |
| Screen switch (tab) | < 200ms | > 500ms |
| Bottom sheet open | < 150ms | > 300ms |
| Pull to refresh | < 2 seconds | > 5 seconds |

### 5.2 Caching Strategy

- **Menu data**: Cache in memory + localStorage. Load from cache, refresh in background.
- **Store data**: Cache in provider context (already exists via `PlatformGlobalDataContext`).
- **Feedback**: Fetch fresh on screen open. Cache for session.
- **Images**: Browser cache + CDN. No special handling needed.

### 5.3 Bundle Optimization

- **Code splitting**: Mobile components lazy-loaded. Desktop users never download mobile bundle.
- **Tree shaking**: antd-mobile is tree-shakeable. Only used components bundled.
- **Route-based splitting**: Next.js automatic code splitting per page.

---

## Part 6: Accessibility Requirements

### 6.1 Touch Accessibility

- All interactive elements: 44x44px minimum touch target
- Sufficient spacing between touch targets (8px minimum)
- No gesture-only interactions (always provide button alternative)
- Support for system font size preferences

### 6.2 Screen Reader

- All images: `alt` text
- All buttons: `aria-label` if icon-only
- Form fields: proper `label` association
- Status changes: `aria-live` announcements

### 6.3 Reduced Motion

- Respect `prefers-reduced-motion` media query
- All animations optional, not functional
- No motion-dependent interactions

---

## Part 7: Testing Checklist (For Every Mobile Screen)

Before any mobile screen ships, verify:

### Functional
- [ ] Works on iOS Safari (primary)
- [ ] Works on Android Chrome (primary)
- [ ] Works on Samsung Internet (secondary)
- [ ] Works in PWA mode (Add to Home Screen)
- [ ] All actions complete in ≤5 seconds
- [ ] Search works instantly
- [ ] Offline edits queue correctly
- [ ] Dark mode works correctly

### Visual
- [ ] No horizontal scroll on any screen
- [ ] All text readable without zooming
- [ ] Touch targets ≥ 44x44px
- [ ] Safe area respected (iPhone notch)
- [ ] Bottom nav doesn't overlap content
- [ ] Bottom sheets dismissible by swipe

### Performance
- [ ] Screen loads in < 1 second
- [ ] No janky scrolling
- [ ] No layout shifts during load
- [ ] Images lazy-loaded
- [ ] No unnecessary re-renders

---

## Part 8: Anti-Patterns (FORBIDDEN)

These patterns are permanently forbidden on mobile. If any PR introduces these, it must be rejected.

### 8.1 Forbidden UI Patterns

| Pattern | Why Forbidden |
| --- | --- |
| Horizontal scrolling tables | Unusable on mobile. Use list instead. |
| Desktop-style dropdowns | Too small. Use Picker or ActionSheet. |
| Hover tooltips | No hover on touch. Use tap-to-reveal. |
| Complex drag-and-drop | Imprecise on touch. Desktop only. |
| Multi-column layouts | Screen too narrow. Single column only. |
| Floating context menus | Hard to tap. Use ActionSheet. |
| Nested navigation (>2 levels) | Confusing. Flatten navigation. |
| Auto-playing videos | Battery drain. Never on mobile. |
| Desktop-style date pickers | Use mobile Picker instead. |
| Tiny close buttons (X) | Swipe to dismiss instead. |

### 8.2 Forbidden Behaviors

| Behavior | Why Forbidden |
| --- | --- |
| Blocking loading screens | Use skeleton + optimistic updates |
| Confirmation modals for small actions | One tap = done. No "Are you sure?" for toggles. |
| Force page refresh after edit | Update in-place. |
| Redirect to desktop for features | Show clear message: "Available on desktop" |
| Auto-scroll to top after action | Stay in place. |
| Keyboard covering input field | Scroll input into view automatically. |

### 8.3 Forbidden Engineering Patterns

| Pattern | Why Forbidden |
| --- | --- |
| Importing `antd` in mobile components | Use `antd-mobile` for mobile screens. |
| Device-specific business logic | DAL must be device-agnostic. |
| Copy-pasting desktop component logic | Import shared hooks/DAL instead. |
| Mobile-only API endpoints | Same API for both devices. |
| Storing mobile state separately | Same Firestore collections, same data. |
| Inline styles for layout | Use Tailwind utilities. |

---

## Part 9: Future Feature Gate

### The Mobile Feature Admission Test

Before ANY new feature is added to mobile, it must pass ALL of these gates:

1. **Frequency Gate**: Will this be used multiple times per day during business hours?
2. **Speed Gate**: Can this action complete in ≤5 seconds on mobile?
3. **Complexity Gate**: Can this fit in a single screen or bottom sheet?
4. **Touch Gate**: Is this naturally usable with one thumb?
5. **Value Gate**: Does this directly help the owner operate their business right now?

If ANY gate fails → desktop only. No exceptions. No "let's add it with a simplified version."

### Features Pre-Approved for Mobile

| Feature | Justification |
| --- | --- |
| Menu price editing | Daily, fast, one-tap |
| Availability toggle | Multiple times daily |
| Add simple item | Weekly, fast |
| Hours/status control | Daily, one-tap |
| Feedback inbox + reply | Daily, quick scan |
| Share menu link/QR | Daily, one-tap |
| Public info edit | Monthly, simple form |
| Billing view | Monthly, read-only |

### Features Pre-Rejected for Mobile

| Feature | Rejection Reason |
| --- | --- |
| AI image generation | Slow, complex, rare |
| Bulk description generation | Complex UI, desktop workflow |
| Translation management | Complex, rare |
| Menu restructuring | Drag-and-drop, desktop workflow |
| Import PDF/link | Complex multi-step |
| Theme/branding customization | Visual design, desktop workflow |
| Analytics/reports | Read-heavy, not operational |
| Multi-outlet master controls | Complex, rare |
| POS webhook settings | Configuration, not operational |
| Decision blocks settings | Complex, rare |

---

## Part 10: Device Detection & Breakpoints

### Breakpoint System

| Device | Width | Constant |
| --- | --- | --- |
| Mobile | < 768px | `MOBILE_BREAKPOINT` |
| Tablet | 768px–1024px | `TABLET_BREAKPOINT` |
| Desktop | > 1024px | `DESKTOP_BREAKPOINT` |

### Detection Hook: `useDeviceType`

```typescript
type DeviceType = 'mobile' | 'tablet' | 'desktop';

function useDeviceType(): {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasMounted: boolean;
}
```

### Rendering Strategy

```
if (isMobile) → MobileShell (bottom nav + mobile components)
if (isTablet) → Desktop layout (for now, tablet = desktop)
if (isDesktop) → Desktop layout (existing, unchanged)
```

**Tablet strategy**: Use desktop layout for now. Tablets have enough screen for the sidebar. If needed later, create a tablet-optimized layout. But not now.

---

## Part 11: Enforcement

### Code Review Checklist (Mobile PRs)

Every PR that touches mobile code must be checked against:

- [ ] No `antd` imports in mobile components (use `antd-mobile`)
- [ ] No desktop component reuse without shared hook extraction
- [ ] All touch targets ≥ 44px
- [ ] No horizontal scrolling
- [ ] No blocking loading states
- [ ] No confirmation modals for simple actions
- [ ] Dark mode tested
- [ ] iPhone safe area handled
- [ ] Navigation depth ≤ 2
- [ ] Auto-publish for operational edits

### Metrics to Track (Post-Launch)

| Metric | Target | Signal |
| --- | --- | --- |
| Mobile session duration | < 30 seconds average | Quick in-and-out = success |
| Actions per session | 1-3 | Focused usage = success |
| Time to first action | < 3 seconds | Fast = success |
| Mobile vs desktop ratio | 60/40 mobile-heavy | Mobile becoming primary = success |
| Error rate on mobile | < 0.1% | Reliability = trust |

---

## Final Lock Statement

This doctrine is not optional. It is the engineering constitution for all mobile work in MenuList.

Every mobile screen, every mobile component, every mobile interaction must be traceable back to a specific law in this document.

If a decision conflicts with this doctrine → the doctrine wins.

If the doctrine needs updating → it requires explicit discussion and version bump.

**Mobile must feel like turning on a light switch. Not operating software.**

---

**Document Signature:** Mobile UI Doctrine  
**Version:** 1.0  
**Last Updated:** February 14, 2026

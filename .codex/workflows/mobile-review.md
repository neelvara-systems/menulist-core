---
description: In-depth mobile screen cross-check against all mobile doctrine rules, UI laws, and architecture decisions
---

# Mobile Screen Review & Verification

This workflow performs a deep cross-check of all mobile implementation against the mobile doctrine, UI laws, architecture decisions, and screen specs.

## Prerequisites

1. Read `__docs__/mobile-operational-support/02-mobile-ui-doctrine.md` — the 12 Laws
2. Read `__docs__/mobile-operational-support/03-mobile-screens-spec.md` — screen specifications
3. Read `__docs__/mobile-operational-support/04-mobile-architecture.md` — architecture decisions
4. Read `__docs__/mobile-operational-support/05-mobile-navigation-spec.md` — navigation structure
5. Read `.cascade/rules/MOBILE_SUPPORT_RULES.md` — 10 mandatory rules

## Phase 1: Architecture Compliance

For EVERY mobile file in `src/components/mobile/`:

1. **No `antd` imports** — mobile components MUST use `antd-mobile` only. Grep for `from 'antd'` or `from "antd"` in mobile folder.
2. **No desktop component imports** — mobile must NOT import from `src/components/templates/main-app/`. Shared logic comes from hooks/DAL only.
3. **DAL reuse verified** — every data operation must use existing DAL from `src/database/*`. No new DAL functions created for mobile.
4. **Hooks reuse verified** — state management uses existing hooks from `src/hooks/*` or existing context providers.
5. **Icons: react-icons/lu only** — grep for any non-Lucide icon imports. Must be zero.
6. **Tailwind for layout** — mobile uses Tailwind utilities, not SCSS modules. No `.module.scss` files in mobile folder.
7. **Feature flag check** — `ENABLE_MOBILE_UI` flag exists in `src/config/features.ts` and is used in layout wrapper.

## Phase 2: 12 Laws Compliance (per screen)

For EVERY mobile screen, verify against each law:

8. **Law 1 (5-Second Rule)** — trace user flow for common actions. Count taps from app open to action complete. Must be ≤5 seconds.
9. **Law 2 (No Deep Navigation)** — verify max depth = 2 levels from bottom nav. No Level 3 navigation exists.
10. **Law 3 (Menu Is Home)** — verify app lands on Menu screen by default. No dashboard/welcome/stats screen.
11. **Law 4 (Search Is Primary)** — verify SearchBar is always visible at top of Menu screen. Client-side filtered.
12. **Law 5 (Auto-Publish)** — verify operational edits (price, availability, hours, status) save immediately without "Publish" button.
13. **Law 6 (Touch-First)** — verify all touch targets ≥ 44px. No hover-only interactions. Check spacing ≥ 8px between actions.
14. **Law 7 (Bottom Sheet Over Modal)** — verify edit flows use `Popup` (bottom sheet), not `Modal`. Centered dialogs only for destructive confirmations.
15. **Law 8 (Optimistic Updates)** — verify UI updates before server response. Check for loading spinners that should be optimistic.
16. **Law 9 (Offline-Tolerant)** — verify no blocking error modals for network issues. Toast-only for sync status.
17. **Law 10 (No Feature Creep)** — verify no desktop-only features leaked into mobile (AI generation, bulk edit, analytics, etc.)
18. **Law 11 (Calm UI)** — verify no red warnings, no "action required" badges, no engagement nudges, no gamification.
19. **Law 12 (Device-Specific)** — verify mobile components are purpose-built, not shrunken desktop components.

## Phase 3: Screen-by-Screen Spec Compliance

Cross-check each implemented screen against `03-mobile-screens-spec.md`:

20. **Screen 1 (Menu)** — categories visible, item rows with name/price/availability, search bar, floating add button, swipe actions for quick edit
21. **Screen 2 (Item Edit Sheet)** — bottom sheet with name, price, availability toggle, description, save/cancel
22. **Screen 3 (Add Item Sheet)** — bottom sheet with name, price, category selector, save
23. **Screen 4 (Hours & Status)** — today status card (OPEN/CLOSED/TEMP), close/reopen buttons, weekly hours, Today Actions (WhatsApp share)
24. **Screen 5 (Feedback Inbox)** — feedback list with star rating, message preview, status badge, swipe actions
25. **Screen 6 (Feedback Detail)** — full feedback with reply option, status update, contact info
26. **Screen 7 (Share & QR)** — QR code display, copy link, share buttons (WhatsApp, etc.)
27. **Screen 8 (Public Info)** — editable business info (phone, address, description)
28. **Screen 9 (Billing)** — current plan display, AI capacity, usage stats, contact support
29. **Screen 10 (More)** — navigation list to Share, Public Info, Billing, Support (WhatsApp), Switch to Desktop

## Phase 4: Settings / Auth / Localization Inheritance

30. **Theme inheritance** — verify mobile reads `getDarkModeState` from Redux. Dark mode works on all screens.
31. **Language inheritance** — verify mobile uses `useTranslations()` from `next-intl`. All UI strings are translatable.
32. **RTL support** — verify mobile respects `getRTLDirectionState`. Layout mirrors correctly in RTL.
33. **Timezone/date format** — verify dates use `useFormatter()` from `next-intl`, respecting user's timezone and format settings.
34. **Auth check** — verify mobile is behind same `useSession()` auth check. Unauthenticated users cannot access mobile screens.
35. **RBAC permissions** — verify permission-gated features check `hasPermission()` same as desktop.

## Phase 5: Navigation Compliance

Cross-check against `05-mobile-navigation-spec.md`:

36. **Bottom TabBar** — exactly 4 tabs: Menu, Hours, Feedback, More. No more, no less.
37. **Tab icons** — all from `react-icons/lu`. Active/inactive states visible.
38. **Badge indicators** — unread feedback count on Feedback tab, no other badges.
39. **Tab switching** — instant, no loading state between tabs.
40. **Back navigation** — NavBar with back button on drill-in screens (Feedback Detail, etc.)
41. **Swipe gestures** — back swipe works on drill-in screens. No swipe between tabs.
42. **Safe area** — top and bottom safe areas handled (iPhone notch, home indicator).

## Phase 6: Visual Design Rules

43. **Typography** — verify sizes match doctrine: page title 20px/600, section 16px/600, item name 15px/500, body 14px/400, caption 12px/400
44. **Spacing** — page padding 16px, card padding 12px, list item padding 12px, between sections 16px
45. **Colors** — using Ant Design token system (colorPrimary, colorBgBase, etc.), no hardcoded hex values
46. **Dark mode** — test every screen in dark mode. No broken colors, no invisible text.
47. **No horizontal scroll** — verify on 320px width (smallest common mobile). No content overflows.

## Phase 7: Performance & Anti-Patterns

48. **Code splitting** — mobile components are lazy-loaded. Desktop users never download mobile bundle. Check for `dynamic()` or `lazy()`.
49. **No forbidden UI patterns** — no horizontal scrolling tables, no desktop dropdowns, no hover tooltips, no multi-column layouts, no nested nav >2 levels.
50. **No forbidden behaviors** — no blocking loading screens, no confirmation for small actions, no force refresh, no auto-scroll to top.
51. **No forbidden engineering** — no `antd` in mobile, no device-specific business logic, no copy-pasted desktop logic, no mobile-only API endpoints.

## Phase 8: Desktop Impact Verification (CRITICAL)

52. **Desktop files unchanged** — verify NO modifications to existing desktop components in `src/components/templates/main-app/`, `src/components/organisms/`, `src/components/atoms/`, `src/components/molecules/`
53. **Existing hooks unchanged** — verify `useIsMobile.ts` still exists and works (deprecated but not deleted). No existing hook signatures changed.
54. **Existing providers unchanged** — verify `PlatformGlobalDataContext`, `AntdThemeProvider`, etc. still work as before.
55. **Layout wrapper minimal change** — verify `AntdLayoutWrapper` only adds device detection conditional. All existing desktop rendering path unchanged.
// turbo
56. **Type check** — run `npx tsc --noEmit` to verify zero type errors.
57. **Desktop route test** — manually verify `/dashboard`, `/projects`, `/feedback`, `/billing`, `/business-settings` routes render correctly on desktop width.

## Phase 9: Documentation Sync

58. **Architecture doc matches code** — verify `04-mobile-architecture.md` file structure matches actual files created
59. **Screen spec matches code** — verify each screen in `03-mobile-screens-spec.md` is implemented as specified
60. **Navigation spec matches code** — verify `05-mobile-navigation-spec.md` matches actual navigation implementation
61. **Doctrine version** — verify no doctrine violations discovered. If any, update doctrine with version bump.

## Report Format

After completing all checks, generate a verification report:

```
## Mobile Review Report — [Date]

### Architecture: ✅/❌
### 12 Laws Compliance: ✅/❌ (list any violations)
### Screen Spec Compliance: ✅/❌ (per screen)
### Settings/Auth/i18n: ✅/❌
### Navigation: ✅/❌
### Visual Design: ✅/❌
### Performance: ✅/❌
### Desktop Impact: ✅/❌
### Documentation: ✅/❌

### Issues Found: [list with severity]
### Fixes Applied: [list]
```

## Guardrails

- NEVER modify desktop components to fix mobile issues
- NEVER add new DAL functions for mobile — use existing ones
- NEVER import `antd` in mobile components — use `antd-mobile`
- NEVER use icon libraries other than `react-icons/lu`
- NEVER add navigation depth beyond 2 levels
- If a screen fails the 5-Second Rule → redesign the flow, don't add loading optimizations
- If a feature fails the admission test → remove it from mobile, don't simplify it

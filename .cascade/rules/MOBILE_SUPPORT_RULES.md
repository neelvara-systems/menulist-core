# Mobile Support Rules — Mandatory for ALL Feature Work

**Created:** February 14, 2026  
**Authority:** CRITICAL — Cannot be skipped  
**Applies To:** Every new feature, every refactor, every review

---

## Rule 1: Mobile Assessment Required

Every new feature MUST have a `[feature-name]_mobile-support.md` document in its `__docs__/[feature-name]/` folder. This is mandatory even if the decision is "desktop only".

## Rule 2: Feature Admission Test (4 Gates)

Before adding ANY feature to mobile, ALL 4 gates must pass:

1. **Frequency Gate:** Is this done daily or multiple times per day? (If monthly/rarely → desktop only)
2. **Speed Gate:** Can this complete in <5 seconds on mobile? (If slow/complex → desktop only)
3. **Touch Gate:** Does this work well with thumb-only interaction? (If needs precision → desktop only)
4. **Value Gate:** Does the owner NEED this while away from desk? (If only useful at desk → desktop only)

Any gate fails → Desktop only. Log which gate failed.

## Rule 3: DAL-First Architecture

For every new feature, follow this build order:

```
1. DAL function (src/database/*)     — shared business logic
2. Hook (src/hooks/*)                — shared state management
3. Desktop UI (antd + SCSS)          — full desktop experience
4. Mobile UI (antd-mobile + Tailwind) — IF feature passes admission test
```

Mobile screens MUST use the SAME DAL functions and hooks as desktop. NEVER create separate mobile-specific DAL.

## Rule 4: No Desktop Refactoring for Mobile

NEVER refactor existing desktop code to support mobile. Mobile is a NEW layer on top of existing shared logic.

- Desktop: `antd` + SCSS modules (unchanged)
- Mobile: `antd-mobile` + Tailwind CSS (new)
- Shared: DAL, hooks, Redux, types, constants

## Rule 5: Settings Inheritance

Mobile screens MUST inherit ALL desktop settings automatically:

| Setting | Source | Redux Slice |
| --- | --- | --- |
| Theme (dark/light) | AppSettings panel | `clientThemeConfig` |
| Language | LanguageSwitcher | `clientThemeConfig` |
| Timezone | TimezoneSwitcher | `clientThemeConfig` |
| Date format | DateFormatSwitcher | `clientThemeConfig` |
| Time format | TimeFormatSwitcher | `clientThemeConfig` |
| RTL direction | RTL toggle | `clientThemeConfig` |

Source: `src/components/organisms/appSettings/index.tsx` — all settings stored in Redux, accessible to mobile via same `useAppSelector` hooks.

## Rule 6: Auth Inheritance

Mobile uses the SAME authentication:

- NextAuth.js session (same cookies, same JWT)
- Same RBAC permissions (`hasPermission()`)
- Same multi-tenant isolation (`tId`, `sId`)
- Same `withAuth()` on API routes

NO separate mobile auth flow. NO separate login screen (unless mobile-optimized layout of existing flow).

## Rule 7: Localization Inheritance

Mobile uses the SAME i18n stack:

- `next-intl` (v3.17.2) — same translation files, same locale detection
- RTL support — same `isRTLDirection` from Redux
- Date handling — same `date-fns` (v3.6.0)
- Number/currency formatting — same `useFormatter()` from `next-intl`

## Rule 8: Icons — react-icons/lu Only

ALL icons (desktop AND mobile) use `react-icons/lu` (Lucide). NEVER mix with antd icons or other icon sets.

```typescript
// CORRECT
import { LuHome, LuClock, LuMessageSquare } from 'react-icons/lu';

// WRONG
import { HomeOutlined } from '@ant-design/icons'; // Never use antd icons
import { FaHome } from 'react-icons/fa';           // Never mix icon sets
```

## Rule 9: ICP Compliance — Non-Tech SMB Owner

Our ICP is a non-technical small business owner. ALL UI (desktop AND mobile) must:

- Use zero jargon in UI copy
- Have large touch targets (minimum 44px on mobile)
- Provide instant feedback (optimistic updates)
- Use clear, simple actions (no multi-step wizards on mobile)
- Work on mid-range Android phones (not just latest iPhones)
- Follow Language Governance: no "AI-powered", "Smart", "Dynamic", "You should..."

## Rule 10: Optimistic Updates on Mobile

Mobile edits MUST update the UI instantly, then sync to backend:

```
User taps "Mark Sold Out" → UI shows sold out immediately → Firestore update happens in background
If sync fails → show non-intrusive "Retry" option
```

For v1: NO complex offline queue. Simple try-save, show-retry-on-fail pattern.

## Rule 11: Mobile PWA Shell Navigation Contract

Owner mobile PWA screens that are reached from existing mobile tabs (`Today`, `Menu`, `Share`, or `More`) MUST stay inside the existing `MobileShell` screen system.

- Use `MobileShell` state (`activeTab`, `todayScreen`, `moreScreen`) and local callbacks such as `openSubScreen()` / `onOpen...` to move between mobile screens.
- Use existing mobile providers and caches such as `MobileProjectsProvider` for selected project and project data. Do not create a separate project-loading path unless the screen is intentionally usable outside the PWA shell.
- Direct mobile links may map a route into shell state in `MobileShell`, but mobile tab actions must not use `window.location`, forced reloads, or desktop-route bypasses.
- A standalone Next route is acceptable for login, public pages, desktop-only owner routes, or features explicitly outside the mobile PWA shell. For owner PWA features, shell sub-screen integration is the default.
- Feature docs and verification scripts should guard this pattern when a new mobile screen is added.

---

## Reference Documents

| Document | Location |
| --- | --- |
| Mobile UI Doctrine (12 Laws) | `__docs__/mobile-operational-support/02-mobile-ui-doctrine.md` |
| Mobile Screens Spec | `__docs__/mobile-operational-support/03-mobile-screens-spec.md` |
| Mobile Architecture | `__docs__/mobile-operational-support/04-mobile-architecture.md` |
| Deep Audit (every feature → mobile decision) | `__docs__/mobile-operational-support/06-deep-audit-cross-reference.md` |
| ChatGPT Feedback Audit | `__docs__/mobile-operational-support/07-chatgpt-feedback-audit.md` |

---

**Version:** 1.1
**Last Updated:** June 3, 2026

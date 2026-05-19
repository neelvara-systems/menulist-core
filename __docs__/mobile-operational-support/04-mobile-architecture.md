# Mobile Architecture & Implementation Plan

**Created:** February 14, 2026  
**Status:** ✅ IMPLEMENTED — Feature flag OFF, ready for testing  
**Author:** Lead Architect (Cascade)  
**Source:** Codebase Analysis + Architecture Decision  
**Depends On:** `01-antd-upgrade-and-library-decision.md`, `02-mobile-ui-doctrine.md`

---

## Architecture Overview

### Core Principle

> **New mobile shell + mobile-specific components. Existing desktop code UNTOUCHED.**

No refactoring of existing desktop code. No new abstraction layers. The existing DAL (Database Access Layer) is already the shared logic layer. Mobile components simply call the same DAL functions through the same hooks and providers.

### System Diagram

```
┌──────────────────────────────────────────────────────────┐
│                    NEXT.JS APP ROUTER                     │
│                  src/app/(main)/layout.tsx                │
│                                                          │
│  ┌─ Auth (NextAuth) ─── Providers ─── AntdLayoutWrapper ┐│
│  │                                                       ││
│  │        ┌──── useDeviceType() ────┐                    ││
│  │        │                         │                    ││
│  │   isMobile?              isDesktop?                   ││
│  │        │                         │                    ││
│  │   MobileShell            Desktop Shell                ││
│  │   (TabBar +              (Sidebar +                   ││
│  │    SafeArea)              Header)                     ││
│  │        │                         │                    ││
│  │   Mobile Pages           Desktop Pages                ││
│  │   (antd-mobile)          (antd)                       ││
│  │        │                         │                    ││
│  │        └─────────┬───────────────┘                    ││
│  │                  │                                    ││
│  │          SHARED LAYER                                 ││
│  │   ┌──────────────────────────┐                        ││
│  │   │  src/database/*  (DAL)   │                        ││
│  │   │  src/hooks/*    (Hooks)  │                        ││
│  │   │  src/providers/* (Ctx)   │                        ││
│  │   │  src/types/*    (Types)  │                        ││
│  │   │  src/config/*   (Flags)  │                        ││
│  │   │  src/constants/* (Nav)   │                        ││
│  │   └──────────────────────────┘                        ││
│  └───────────────────────────────────────────────────────┘│
└──────────────────────────────────────────────────────────┘
```

---

## File Structure

### New Files (Mobile Only)

```
src/
├── components/
│   └── mobile/                              ← All mobile components (30 files)
│       ├── MobileShell.tsx                  ← Mobile layout (TabBar + SafeArea)
│       ├── MobileNavigation.tsx             ← Bottom nav configuration
│       ├── screens/                         ← 23 screens
│       │   ├── MobileMenuScreen.tsx         ← Tab: Menu list + search
│       │   ├── MobileHoursScreen.tsx        ← Tab: Hours & status
│       │   ├── MobileFeedbackScreen.tsx     ← Tab: Feedback inbox
│       │   ├── MobileFeedbackDetail.tsx     ← Drill-in: Feedback detail
│       │   ├── MobileMoreScreen.tsx         ← Tab: More hub (19 sub-screens)
│       │   ├── MobileShareScreen.tsx        ← More > Share & QR
│       │   ├── MobilePublicInfoScreen.tsx   ← More > Public info
│       │   ├── MobileBillingScreen.tsx      ← More > Billing
│       │   ├── MobileDashboardScreen.tsx    ← More > Dashboard analytics
│       │   ├── MobileTodayScreen.tsx        ← More > Today campaigns
│       │   ├── MobileUsersScreen.tsx        ← More > Staff management
│       │   ├── MobileTransactionsScreen.tsx ← More > AI credit history
│       │   ├── MobileHelpScreen.tsx         ← More > Help center
│       │   ├── MobileBasicSettingsScreen.tsx     ← More > Basic settings
│       │   ├── MobileLocaleSettingsScreen.tsx    ← More > Language & region
│       │   ├── MobileWorkingHoursEditScreen.tsx  ← More > Edit hours
│       │   ├── MobileRolesScreen.tsx             ← More > Roles & permissions
│       │   ├── MobileDigitalScreensScreen.tsx    ← More > Digital screens
│       │   ├── MobileLocationsScreen.tsx         ← More > Locations & outlets
│       │   ├── MobileAdvancedSettingsScreen.tsx  ← More > Contact/social/feedback
│       │   ├── MobileDesignEditorScreen.tsx      ← More > Menu design (B2C editor)
│       │   ├── MobileSeoAnalyticsScreen.tsx      ← More > SEO & analytics
│       │   └── MobileTimeSlotsScreen.tsx         ← More > Time slot presets
│       └── sheets/                          ← 5 bottom sheets
│           ├── ItemEditSheet.tsx             ← Menu: Quick edit item
│           ├── AddItemSheet.tsx              ← Menu: Add new item
│           ├── MenuUploadSheet.tsx           ← Menu: Photo upload
│           ├── BulkActionsSheet.tsx          ← Menu: Bulk availability/show-hide
│           └── ColorPickerSheet.tsx          ← Design: Brand color picker
│
├── hooks/
│   ├── useDeviceType.ts                 ← Device detection
│   └── useTodayCampaigns.ts            ← Shared: Today campaigns SWR hook
│
├── config/
│   ├── features.ts                      ← ENABLE_MOBILE_UI flag
│   ├── outletPolicy.ts                  ← Shared: Outlet policy categories
│   └── designSystem.ts                  ← Shared: Design system re-exports for mobile
│
└── utils/
    └── campaignUtils.ts                 ← Shared: Campaign utility functions
```

### Existing Files Modified (Minimal Changes)

```
src/
├── components/
│   └── antdComponent/
│       └── layoutWrapper/
│           └── index.tsx               ← MODIFIED: Add device detection switch
│
├── hooks/
│   └── useIsMobile.ts                  ← DEPRECATED: Replaced by useDeviceType
│
├── constants/
│   └── navigations.ts                  ← MODIFIED: Add mobile nav constants
│
└── config/
    └── features.ts                     ← MODIFIED: Add ENABLE_MOBILE_UI flag
```

### Existing Files NOT Modified (Zero Changes)

```
src/
├── database/*                          ← UNTOUCHED: All DAL functions
├── providers/*                         ← UNTOUCHED: All context providers
├── types/*                             ← UNTOUCHED: All type definitions
├── components/
│   ├── organisms/sidebar/*             ← UNTOUCHED: Desktop sidebar
│   ├── organisms/headerComponent/*     ← UNTOUCHED: Desktop header
│   └── templates/main-app/
│       ├── projects/*                  ← UNTOUCHED: Full editor
│       ├── businessSettings/*          ← UNTOUCHED: Settings pages
│       ├── billing/*                   ← UNTOUCHED: Billing pages
│       ├── feedback/*                  ← UNTOUCHED: Desktop feedback
│       ├── today/*                     ← UNTOUCHED: Social content
│       └── dashboard/*                 ← UNTOUCHED: Dashboard page
```

---

## Key Technical Decisions

### 1. Device Detection: Layout-Level Switch

The device detection happens at **one single point** — the `AntdLayoutWrapper`. This is the cleanest approach because:

- All auth, session, providers are already set up above this point
- The wrapper already renders the desktop shell (sidebar + header)
- We simply add a conditional: if mobile → render MobileShell instead

```typescript
// AntdLayoutWrapper (modified)
import useDeviceType from '@hook/useDeviceType';
import MobileShell from '@mobile/MobileShell';

export default function AntdLayoutWrapper(props: any) {
    const { isMobile } = useDeviceType();

    // Skip layout routes work the same for both
    if (SKIP_CLIENT_APP_LAYOUT_ROUTINGS.includes(pathname)) {
        return <>{props.children}</>;
    }

    // Mobile gets entirely different shell
    if (isMobile && FEATURE_FLAGS.ENABLE_MOBILE_UI) {
        return (
            <AntdThemeProvider>
                <NetworkStatusProvider>
                    <MobileShell>{props.children}</MobileShell>
                </NetworkStatusProvider>
            </AntdThemeProvider>
        );
    }

    // Desktop gets existing shell (unchanged)
    return (/* existing desktop layout */);
}
```

### 2. Routing Strategy: Same Routes, Different Rendering

Mobile and desktop share the same Next.js routes. The layout wrapper decides which shell to render. This means:

- `/dashboard` on mobile → MobileShell → Mobile Menu Screen (redirected)
- `/dashboard` on desktop → Desktop Shell → Dashboard Page
- `/feedback` on mobile → MobileShell → Mobile Feedback Screen
- `/feedback` on desktop → Desktop Shell → Desktop Feedback Page

For mobile, we intercept the route content and render the appropriate mobile screen. The page files in `src/app/(main)/` remain unchanged.

**Implementation approach:**

```typescript
// MobileShell.tsx — renders the correct mobile screen based on route
const MobileShell = ({ children }) => {
    const pathname = usePathname();

    const getMobileContent = () => {
        // Mobile has its own screen mapping
        switch(true) {
            case pathname.startsWith('/projects'):
            case pathname === '/dashboard':
                return <MobileMenuScreen />;
            case pathname === '/today':
                return <MobileHoursScreen />;
            case pathname === '/feedback':
                return <MobileFeedbackScreen />;
            case pathname === '/billing':
                return <MobileBillingScreen />;
            case pathname === '/business-settings':
                return <MobilePublicInfoScreen />;
            case pathname === '/qr-code':
                return <MobileShareScreen />;
            default:
                return <MobileMoreScreen />;
        }
    };

    return (
        <div className="mobile-app">
            <SafeArea position="top" />
            <div className="mobile-content">
                {getMobileContent()}
            </div>
            <MobileNavigation />
            <SafeArea position="bottom" />
        </div>
    );
};
```

### 3. State Management: Existing Redux + Context

No new state management library. We use what already exists:

| Data            | Source                      | Already Exists          |
| --------------- | --------------------------- | ----------------------- |
| Store details   | `PlatformGlobalDataContext` | ✅                      |
| Tenant details  | `PlatformGlobalDataContext` | ✅                      |
| Subscription    | `PlatformGlobalDataContext` | ✅                      |
| User session    | `useClientAuthSession()`    | ✅                      |
| Theme/dark mode | Redux (`clientThemeConfig`) | ✅                      |
| Sidebar state   | Redux (`clientThemeConfig`) | ✅ (not used on mobile) |

**New state needed (minimal):**

| State             | Approach                  | Why                   |
| ----------------- | ------------------------- | --------------------- |
| Active mobile tab | `useState` in MobileShell | Local UI state        |
| Menu items cache  | `useState` + localStorage | Performance on mobile |
| Hours override    | `useState` in HoursScreen | Local form state      |
| Edit sheet open   | `useState` in MenuScreen  | Local UI state        |

### 4. Data Fetching: Same DAL, Same Hooks

Mobile screens call the exact same database functions:

```typescript
// Menu Screen — uses existing DAL
import { getProjectData, updateProject } from "@database/projects";
import { getMetadataProjectsList } from "@database/projects";

// Hours Screen — uses existing DAL
import { updateStore } from "@database/stores";

// Feedback Screen — uses existing DAL
import { getFeedbackList, updateFeedbackStatus } from "@database/guestFeedback";

// All screens — uses existing context
import { PlatformGlobalDataContext } from "@providers/platformProviders/platformGlobalDataProvider";
```

**Zero new DAL functions needed** for mobile v1.

### 5. Theming: Shared Ant Design Tokens

Both `antd` and `antd-mobile` can use CSS variables for theming. We configure `antd-mobile` to match the existing Ant Design theme:

```typescript
// Mobile theme configuration
import { setDefaultConfig } from "antd-mobile";

// Match antd tokens — antd-mobile uses CSS variables
// Configure via CSS custom properties matching our antd theme
```

Dark mode works automatically if we use token-based colors throughout.

### 6. Settings Inheritance (from AppSettings)

Mobile screens automatically inherit ALL user settings from the existing `AppSettings` panel (`src/components/organisms/appSettings/index.tsx`). These settings are stored in the `clientThemeConfig` Redux slice and accessible via `useAppSelector`.

| Setting             | Redux Selector                             | Source Component      | Mobile Behavior                        |
| ------------------- | ------------------------------------------ | --------------------- | -------------------------------------- |
| Dark/Light mode     | `getDarkModeState`                         | `ThemeModeSwitcher`   | antd-mobile theme auto-switches        |
| Theme color         | `getLightColorState` / `getDarkColorState` | `EnhancedColorPicker` | CSS variables propagate                |
| RTL direction       | `getRTLDirectionState`                     | RTL toggle buttons    | Layout mirrors automatically           |
| Language            | Redux + `next-intl`                        | `LanguageSwitcher`    | Same `useTranslations()` hook          |
| Timezone            | Redux                                      | `TimezoneSwitcher`    | Same timezone in date formatting       |
| Date format         | Redux                                      | `DateFormatSwitcher`  | Same `useFormatter()` from next-intl   |
| Time format         | Redux                                      | `TimeFormatSwitcher`  | Same `useFormatter()` from next-intl   |
| Layout style        | `getLayoutModeState`                       | `AppLayoutSwitcher`   | Not applicable (mobile has own layout) |
| Fullscreen          | `getFullscreenModeState`                   | Fullscreen toggle     | Not applicable on mobile               |
| Show date in header | `getShowDateInHeaderState`                 | Toggle                | Not applicable (mobile has no header)  |

**Key principle:** Mobile reads the SAME Redux state. Owner changes language on desktop → mobile reflects it immediately. No separate mobile settings screen needed.

### 7. Auth Inheritance

Mobile uses the exact same authentication stack:

```typescript
// Same session — accessible in all mobile components
import { useSession } from "next-auth/react";
const { data: session } = useSession();

// Same permissions — same utility function
import { hasPermission } from "@lib/permissions/hasPermission";

// Same tenant isolation — same context
import { PlatformGlobalDataContext } from "@providers/platformProviders/platformGlobalDataProvider";
const { tenantDetails, storeDetails, userPermissions } = useContext(
  PlatformGlobalDataContext,
);
```

NO separate mobile login, NO separate mobile session, NO separate mobile permissions check.

### 8. Localization Inheritance

Mobile uses the exact same i18n infrastructure:

```typescript
// Same translation hook
import { useTranslations } from "next-intl";
const t = useTranslations("mobile"); // Can add mobile-specific namespace if needed

// Same formatter for dates/numbers/currency
import { useFormatter } from "next-intl";
const formatter = useFormatter();

// RTL support — same Redux state
const isRTL = useAppSelector(getRTLDirectionState);
// Mobile components should use logical properties (start/end) not physical (left/right)
```

---

## Implementation Details

### useDeviceType Hook

```typescript
// src/hooks/useDeviceType.ts
import { useState, useEffect } from "react";

const MOBILE_BREAKPOINT = 768;
const TABLET_BREAKPOINT = 1024;

export type DeviceType = "mobile" | "tablet" | "desktop";

interface UseDeviceTypeReturn {
  deviceType: DeviceType;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  hasMounted: boolean;
}

const useDeviceType = (): UseDeviceTypeReturn => {
  const [deviceType, setDeviceType] = useState<DeviceType>("desktop");
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
    const checkDevice = () => {
      const width = window.innerWidth;
      if (width < MOBILE_BREAKPOINT) {
        setDeviceType("mobile");
      } else if (width < TABLET_BREAKPOINT) {
        setDeviceType("tablet");
      } else {
        setDeviceType("desktop");
      }
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);
    return () => window.removeEventListener("resize", checkDevice);
  }, []);

  return {
    deviceType,
    isMobile: deviceType === "mobile",
    isTablet: deviceType === "tablet",
    isDesktop: deviceType === "desktop" || deviceType === "tablet",
    hasMounted,
  };
};

export default useDeviceType;
```

**Note:** `isDesktop` returns `true` for both desktop AND tablet. Tablet users get the desktop experience for now.

### MobileShell Component

```typescript
// src/components/mobile/MobileShell.tsx
// Uses: antd-mobile TabBar, SafeArea
// Provides: Bottom navigation + safe area handling
// Contains: Route-based mobile screen switching
```

Key responsibilities:

- Render bottom TabBar with 4 tabs
- Handle SafeArea for iPhone notch
- Switch content based on current route/active tab
- Pass through auth/session/provider context (already available from parent)

### Mobile Navigation Constants

```typescript
// Addition to src/constants/navigations.ts
export const MOBILE_NAV_TABS = [
  { key: "menu", label: "Menu", icon: LuFolderHeart, route: "/projects" },
  { key: "hours", label: "Hours", icon: LuClock, route: "/today" },
  { key: "feedback", label: "Feedback", icon: LuTicket, route: "/feedback" },
  { key: "more", label: "More", icon: LuMoreHorizontal, route: "/more" },
] as const;

export const MOBILE_MORE_ITEMS = [
  { key: "share", label: "Share Menu & QR", icon: LuQrCode, route: "/qr-code" },
  {
    key: "public-info",
    label: "Public Info",
    icon: LuHotel,
    route: "/business-settings",
  },
  {
    key: "billing",
    label: "Plan & Billing",
    icon: LuCreditCard,
    route: "/billing",
  },
] as const;
```

---

## Bundle Impact Analysis

### Before Mobile (Current)

| Chunk                | Size (estimated)             |
| -------------------- | ---------------------------- |
| antd                 | ~300KB gzipped (tree-shaken) |
| Application code     | ~200KB gzipped               |
| Total desktop bundle | ~500KB gzipped               |

### After Mobile (With antd-mobile)

| Chunk                      | Size (estimated)               |
| -------------------------- | ------------------------------ |
| antd (desktop pages)       | ~300KB gzipped (unchanged)     |
| antd-mobile (mobile pages) | ~50-80KB gzipped (tree-shaken) |
| Mobile components          | ~30KB gzipped                  |
| Application code           | ~200KB gzipped                 |

**Key point:** Thanks to Next.js code splitting, desktop users NEVER load antd-mobile code. Mobile users NEVER load heavy desktop components (Editor, etc.). Bundle impact is isolated per route.

---

## Migration Path for Existing useIsMobile

The existing `useIsMobile` hook is used in some places. We handle this cleanly:

1. Create `useDeviceType` as the new standard
2. Keep `useIsMobile` working but mark as deprecated
3. Gradually migrate existing usages (not urgent)
4. `useIsMobile` internally can delegate to `useDeviceType`

```typescript
// Updated useIsMobile.ts (backward compatible)
import useDeviceType from "./useDeviceType";

/** @deprecated Use useDeviceType instead */
const useIsMobile = (maxWidth = 768) => {
  const { isMobile, hasMounted } = useDeviceType();
  return { isMobile, hasMounted };
};

export default useIsMobile;
```

---

## Feature Flag

```typescript
// Addition to src/config/features.ts
/**
 * Mobile Operational Support
 *
 * true: Mobile users see mobile-optimized shell (TabBar, mobile screens)
 * false: Mobile users see desktop layout (existing behavior)
 *
 * When enabled:
 * - Mobile devices (< 768px) get MobileShell with bottom TabBar
 * - Desktop/tablet devices get existing sidebar + header layout
 * - Same auth, same session, same data
 *
 * @see __docs__/mobile-operational-support/
 */
ENABLE_MOBILE_UI: false, // Enable when mobile screens are ready
```

---

## Risk Mitigation

| Risk                      | Mitigation                                                       |
| ------------------------- | ---------------------------------------------------------------- |
| Mobile breaks desktop     | Feature flag. Desktop code is UNTOUCHED. Flag off = zero change. |
| antd-mobile CSS conflicts | Different CSS namespace. Verified by Ant team.                   |
| Performance regression    | Code splitting isolates mobile/desktop bundles.                  |
| Data inconsistency        | Same DAL, same Firestore. No separate data layer.                |
| Auth issues on mobile     | Same NextAuth session. Same providers.                           |
| PWA cache stale data      | Version-based cache invalidation.                                |

---

## PWA Enhancement (Phase 4)

After mobile UI is complete:

### manifest.json Updates

```json
{
  "display": "standalone",
  "orientation": "portrait",
  "start_url": "/dashboard",
  "theme_color": "#1677ff",
  "background_color": "#ffffff",
  "shortcuts": [
    {
      "name": "Today",
      "url": "/today#mobile/today"
    },
    {
      "name": "Menu",
      "url": "/projects#mobile/menu"
    },
    {
      "name": "Share & QR",
      "url": "/use-menulist#mobile/share"
    },
    {
      "name": "Feedback",
      "url": "/feedback#mobile/more/feedback"
    }
  ]
}
```

### Service Worker Caching

- Cache menu data for offline access
- Cache static assets aggressively
- Queue edits for offline sync
- Background sync when online

### Install Prompt

Show "Add to Home Screen" prompt after 3rd mobile visit. Non-intrusive. Dismissable. Never show again if dismissed.

---

## Testing Strategy

### Device Testing Matrix

| Device              | Browser          | Priority                 |
| ------------------- | ---------------- | ------------------------ |
| iPhone 12/13/14     | Safari           | P0                       |
| iPhone SE           | Safari           | P0 (small screen)        |
| Samsung Galaxy S21+ | Chrome           | P0                       |
| Pixel 6/7           | Chrome           | P1                       |
| iPad (10.9")        | Safari           | P1 (should show desktop) |
| Any Android         | Samsung Internet | P2                       |

### Automated Testing

- Component tests: Jest + React Testing Library
- E2E mobile tests: Playwright with mobile emulation
- Visual regression: Screenshot comparison at key breakpoints

---

**Document Signature:** Mobile Architecture & Implementation Plan  
**Version:** 1.0  
**Last Updated:** February 14, 2026

# Business Type Labels Audit — Complete

**Date:** 2025-01-XX
**Status:** ✅ IMPLEMENTED — `tsc --noEmit` PASSES

---

## Objective

Replace all hardcoded "menu"-specific UI labels with businessType-aware dynamic labels so that non-food businesses (salons, retail, health, etc.) see contextually appropriate terminology.

## Infrastructure Created

| File                                     | Purpose                                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/lib/menu-kit/businessTypeLabels.ts` | Expanded `OfferingLabels` interface (45+ label keys) + `CATEGORY_LABELS` for 7 business categories |
| `src/hooks/useOfferingLabels.ts`         | React hook — reads `storeDetails.businessType` from context, returns memoized labels               |

### Supported Categories

food, service, retail, health, professional, creative, specialty

### Label Domains

Menu Kit (print/social), Dashboard/Analytics, Share flow, Editor/Processing, Billing/Subscription, Items terminology

---

## Files Modified (20 components + 9 locale files)

### Owner Dashboard (4 files)

| File               | Labels Replaced                                                                    |
| ------------------ | ---------------------------------------------------------------------------------- |
| `OverviewView.tsx` | "Menu Scans", "menu" → `scansLabel`, `offeringLower`                               |
| `DailyView.tsx`    | "Menu Scans" → `scansLabel`                                                        |
| `WeeklyView.tsx`   | "Menu Scans" → `scansLabel` (also fixed missing RiseOutlined/FallOutlined imports) |
| `MonthlyView.tsx`  | "Your Menu This Month" → `thisMonthLabel`                                          |

### Editor (2 files)

| File                       | Labels Replaced                                                                                        |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| `EditorWelcomeBanner.tsx`  | "menu editor", "menu data" → `editorWelcome`, `editorWelcomeDesc`                                      |
| `EditorActionsPopover.tsx` | "Rearrange Menu", "Menu Command Center", action descriptions → dynamic labels via `getActions(labels)` |

### Share Modal (1 file)

| File                   | Labels Replaced                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------- |
| `shareModal/index.tsx` | "Share your menu", share subtitle, staff hint → `shareTitle`, `shareSubtitle`, `shareStaffHint` |

### Analytics Dashboard (3 files)

| File                 | Labels Replaced                                                           |
| -------------------- | ------------------------------------------------------------------------- |
| `OverallMetrics.tsx` | "Total Menu Views", "Top Menu Items" → `totalViewsLabel`, `topItemsLabel` |
| `TrendAnalysis.tsx`  | "Menu Views" → `viewsLabel`                                               |
| `TopItems.tsx`       | "Top Menu Items" → `topItemsLabel`                                        |

### Billing (2 files)

| File                     | Labels Replaced                                             |
| ------------------------ | ----------------------------------------------------------- |
| `NoSubscriptionView.tsx` | "Subscribe to get started with your menu" → `subscribeDesc` |
| `CreditsPackModal.tsx`   | "translations for your menu" → `creditsDesc`                |

### Processing / Onboarding (3 files)

| File                    | Labels Replaced                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `ProcessGuideModal.tsx` | "Upload Your Menu", "reads your menu", "Publish Your Menu", "digital menu" → `uploadLabel`, `aiExtractsDesc`, `publishLabel`, `digitalLabel` |
| `ProcessingOverlay.tsx` | "Reading your menu", "Extracting dishes", "Your menu is ready" → dynamic via `getStageConfig(labels)`                                        |
| `WelcomeModal.tsx`      | "digital menu", "menu images", "menu data", "your menu" → `digitalLabel`, `offeringLower`                                                    |

### Google Analytics (1 file)

| File                  | Labels Replaced                         |
| --------------------- | --------------------------------------- |
| `MenuPerformance.tsx` | "Menu Performance" → `performanceLabel` |

### Mobile (4 files)

| File                        | Labels Replaced                                                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `MenuUploadSheet.tsx`       | "Upload Your Menu", "Processing your menu", "Menu Uploaded", "menu items" → `uploadLabel`, `offeringLower`, `itemsPlural` |
| `MobileShareScreen.tsx`     | "Our Menu", "Check out our menu", "Menu Kit" → `offeringTitle`, `offeringLower`                                           |
| `MobileMenuScreen.tsx`      | `t()` calls now pass `{ offering, items }` interpolation params from `useOfferingLabels()`                                |
| `MobileDashboardScreen.tsx` | `t()` calls now pass `{ offering }` params; `menuScans` replaced with `labels.scansLabel` directly                        |

### i18n Locale Files (9 files × 2 namespaces)

All 9 locale files updated with `next-intl` interpolation variables:

| Locale                                                        | Files       |
| ------------------------------------------------------------- | ----------- |
| en-US, en-GB, ar-SA, bn-IN, es-ES, hi-IN, mr-IN, ta-IN, te-IN | All updated |

| Namespace         | Keys Changed         | Interpolation                                                        |
| ----------------- | -------------------- | -------------------------------------------------------------------- |
| `MobileMenu`      | `searchPlaceholder`  | `{items}` → `labels.itemsPlural`                                     |
| `MobileMenu`      | `createYourMenu`     | `{offering}` → `labels.offeringTitle`                                |
| `MobileMenu`      | `createYourMenuDesc` | `{offering}` → `labels.offeringLower`                                |
| `MobileMenu`      | `uploadMenuPhoto`    | `{offering}` → `labels.offeringTitle`                                |
| `MobileMenu`      | `noMenuItemsYet`     | `{items}` → `labels.itemsPlural`                                     |
| `MobileDashboard` | `noProjects`         | `{offering}` → `labels.offeringLower`                                |
| `MobileDashboard` | `menuWorking`        | `{offering}` → `labels.offeringLower`                                |
| `MobileDashboard` | `noAnalyticsYet`     | `{offering}` → `labels.offeringLower`                                |
| `MobileDashboard` | `menuScans`          | Bypassed — uses `labels.scansLabel` directly (entire phrase changes) |

---

## Architecture Decision: Keep `businessTypeLabels.ts` as Single File

**Decision:** Keep as-is (349 lines). No split.

**Rationale:**

- Interface + data are tightly coupled — every consumer needs `getOfferingLabels()`
- Splitting by domain would fragment `OfferingLabels` type into partial objects
- 349 lines is small for a lookup table — well within manageable size
- Single import path is ergonomic for all consumers

---

## Known Remaining (Informational Only)

| Item                        | Status                                                                                 |
| --------------------------- | -------------------------------------------------------------------------------------- |
| `MobileHelpScreen` FAQ text | Static help content — "menu" refers to the product concept, not business-type variable |

### Not Changed (Intentional)

- **Brand references** (`menulist.ai`, `MenuList`) — product name, not business-type label
- **Internal variable names** (`menuData`, `menuItems`, `fetchMenuData`) — code internals, not UI-facing
- **Answerlattice product** — untouched per rules

---

## Verification

```bash
npx tsc --noEmit  # ✅ Exit code 0 — zero errors
```

## Pattern for Future Usage

```tsx
// In any React component:
import { useOfferingLabels } from "@hook/useOfferingLabels";

function MyComponent() {
  const labels = useOfferingLabels();
  return <h1>{labels.scansLabel}</h1>; // "Menu Scans" or "Page Views"
}

// Outside React (e.g., utility functions):
import { getOfferingLabels } from "@lib/menu-kit/businessTypeLabels";
const labels = getOfferingLabels(businessType);
```

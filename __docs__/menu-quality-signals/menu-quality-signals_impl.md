# Menu Quality Signals — Implementation Plan

> **Version:** 1.4
> **Last Updated:** July 16, 2026
> **Audience:** Developers
> **Status:** ✅ IMPLEMENTED

---

## 1. Architecture Overview

Menu Quality Signals is a **pure read + compute layer** with four adapters: dashboard, editor banner, publish intercept, and MobileShell menu. The owner-facing name is **Menu Check**. It reads the active project's `extractedData` and public-content fields. No new collections or API routes.

```
Project Document (files[].extractedData.data.items)
  ↓
qualitySignals.ts (compute signals)
  ↓
4 Surface Adapters:
  • Dashboard Panel (awareness)
  • Editor Banner (action context)
  • Publish Intercept (highest leverage)
  • Mobile Menu Check (repair + exact filters)
  ↓
Action buttons → open exact editor context, filters, or repair tools
```

---

## 2. Signal Types (v1.1)

| #   | Signal               | Detection                                                    | Help Text                                                  |
| --- | -------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| 1   | Missing descriptions | `item.description` empty in primary lang                     | Customers understand offerings better with details         |
| 2   | Missing images       | `item.images` empty or missing                               | Customers choose faster when they see what they're getting |
| 3   | Missing prices       | `item.price` empty (skips items with variants)               | Customers compare prices before deciding                   |
| 4   | Hidden items         | `item.active === false`                                      | These items won't appear on your public menu               |
| 5   | Price outliers       | Price < 35% or > 300% of category median (≥4 items required) | A price may be significantly different from similar items  |

---

## 3. File Structure

```
src/lib/mce/
├── qualitySignals.ts                 # ~250 lines — Signal computation + helpers
│   Exports: computeQualitySignals(), isAllClear(), getVisibleSignals(), getActionableSignals(), getPrimaryQualitySignal(), isRepairMenuSignal()

src/components/templates/main-app/dashboard/
├── MenuQualitySignals.tsx            # ~170 lines — Dashboard panel

src/components/templates/main-app/projects/editorView/
├── EditorQualityBanner.tsx           # ~65 lines — Editor banner (closable)

src/components/mobile/components/
├── MenuQualitySignals.tsx            # ~115 lines — Mobile version

src/config/features.ts                # ENABLE_MENU_QUALITY_SIGNALS: true

src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx  # Modified — embeds dashboard panel
src/components/templates/main-app/projects/editorView/Editor.tsx      # Modified — embeds banner + publish intercept
src/components/templates/main-app/projects/editorView/EditorFiltersPopover.tsx # Modified — no-price filter for quality actions
src/components/mobile/screens/MobileMenuScreen.tsx                    # Modified — embeds mobile panel
```

---

## 4. Key Exports from qualitySignals.ts

| Export                          | Purpose                                                                 | Used By                           |
| ------------------------------- | ----------------------------------------------------------------------- | --------------------------------- |
| `computeQualitySignals(files)`  | Core computation — returns all signals                                  | All 3 surfaces                    |
| `isAllClear(signals)`           | Check if all signals are ok                                             | Dashboard + Mobile                |
| `getVisibleSignals(signals)`    | Cap warnings at 4, keep ok signals                                      | Dashboard + Mobile                |
| `getActionableSignals(signals)` | Threshold filter for editor/publish (desc≥3, img≥3, price≥1, outlier≥1) | Editor banner + Publish intercept |
| `getPrimaryQualitySignal(signals)` | Chooses the one owner-facing primary action, preferring Repair Menu when repairable gaps exist | Dashboard + Mobile + Editor banner |
| `isRepairMenuSignal(signal)` | Identifies signals Repair Menu can fix now: descriptions, category icons, item translations, project-content translations | Dashboard + Mobile + Editor banner |

---

## 5. Four Surfaces

### 5.1 Dashboard Panel (`MenuQualitySignals.tsx`)

- Mounted in the owner dashboard overview directly below the hero card through `OwnerDashboard/OverviewView`
- Still renders in the overview no-analytics state when a selected/fallback project exists
- Reuses the Owner Dashboard's one SWR project read shared with setup progress; the read is deduped for ten minutes and the quality component does not issue a second read when that payload is supplied
- Calls `computeQualitySignals()` with project files, languages, design visibility settings, and project public content → `getVisibleSignals()` to cap at 4 warnings
- Shows contextual `helpText` below each signal label
- Owner-facing title is "Menu Check"
- Shows one primary action before the signal list:
  - repairable gaps open Repair Menu
  - manual gaps open the top review path
- "All clear" state reads "No action needed" / "Your public menu is ready"
- Shows "Checked just now" after compute
- Stores a pending quality action in `sessionStorage` and routes to `/projects` so the editor can select the matching project and open the relevant repair/filter context
- Failed project loading or signal computation logs `dashboard_menu_quality_signals_load_failed` through `src/components/templates/main-app/projects/utils/projectPageDiagnostics.ts`
- Failed `sessionStorage` handoff logs `dashboard_menu_quality_action_handoff_failed` and still routes the owner to `/projects`
- Gated by `FEATURE_FLAGS.ENABLE_MENU_QUALITY_SIGNALS`

### 5.2 Editor Banner (`EditorQualityBanner.tsx`)

- Reads `projectData.files` already in editor context — zero additional reads
- Uses `getActionableSignals()` (higher thresholds)
- Renders as `Alert` banner with `closable` prop
- Shows one primary action instead of a row of competing actions
- Calls `handleQualityActionRoute()` directly, the same editor action router used by dashboard handoff:
  - missing descriptions, project details, and category icons open Command Center repair
  - missing images applies the "No image" editor filter
  - missing prices applies the "No price" editor filter
  - hidden items applies the hidden-items editor filter
  - translation gaps open language management
  - price outliers open the editor with a review notice

### 5.2.1 Repair Menu Integration

Repair Menu is the first path for fixable problems. Desktop uses `CommandCenterModal` with `initialAction="repairMenu"`. Mobile uses `BulkActionsSheet` with `action="aiRepair"`.

Repair Menu can fix:

- missing descriptions
- missing category icons
- item language gaps
- project public-content translation gaps

Repair Menu intentionally does not invent prices, create item photos, or show hidden items. Those stay review paths.

### 5.3 Publish Intercept (in `Editor.tsx:onContinueClick`)

- Dynamic imports `computeQualitySignals` and `getActionableSignals` for tree-shaking
- Shows `AntdModal.confirm` with signal list + helpText
- **NEVER blocks publishing** — "Publish Anyway" always available
- Failure never blocks the publish flow
- If the dynamic import or signal computation fails, `Editor.tsx` logs `menu_editor_quality_signals_publish_intercept_failed` through `src/components/templates/main-app/projects/utils/editorDiagnostics.ts` with bounded project/count metadata only

### 5.4 Mobile Menu Check

- Mounted inside `MobileMenuScreen`, so it inherits `MobileShell` authentication, store context, localization, and the already-loaded project.
- Repairable signals open the existing mobile Repair Menu sheet.
- Images, prices, hidden items, translations, category icons, and price outliers map to exact mobile filters or review state.
- The panel performs no Firestore read or write and never bypasses the shared mobile save path.

---

## 6. Price Outlier Detection

Algorithm:

1. Group active items by `item.category` (skip items with variants)
2. Parse only a single numeric value; currency symbols and grouping separators are accepted, while text prices and ranges are skipped
3. Skip categories with < 4 priced items
4. Compute median price per category
5. Flag items where `price < median * 0.35` OR `price > median * 3.0`

---

## 7. Security

- **Auth:** Same as dashboard/editor — requires authenticated session
- **Data access:** Reads project data via existing DAL (`getProjectData`)
- **No API routes** — pure client-side computation
- **Tenant isolation:** DAL enforces `{tId}/{sId}` scoping

---

## 8. Testing Guide

1. Set `ENABLE_MENU_QUALITY_SIGNALS: true` in `src/config/features.ts`
2. **Dashboard:** Open `/dashboard` with a project that has items missing descriptions → see signals
3. **Editor:** Open the editor → see banner if ≥3 descriptions or images missing
4. **Publish:** Click "Continue to UI Editor" with signals → see publish intercept modal
5. **All clear:** Complete all descriptions/images/prices → see green checkmark state
6. **Empty project:** Test with no project → panel not shown
7. **Price outliers:** Create items in same category with wildly different prices → see outlier signal
8. **Hidden items:** Set items to `active: false` → see hidden signal
9. **Flag OFF:** Set flag to `false` → all surfaces hidden
10. **Dashboard mount:** Open the dashboard overview → Menu Quality appears below the hero card when a selected/fallback project exists, including the no-analytics state.
11. **Dashboard handoff:** Click a dashboard signal → `/projects` opens the same project in editor view and applies the relevant filter or repair context.
12. **Editor banner routing:** Click an editor banner action → the same `handleQualityActionRoute()` repair/filter/language route is used.
13. **Primary action:** When repairable and manual issues both exist, the primary action opens Repair Menu first.
14. **All-clear copy:** Resolve signals → owner sees "No action needed" and "Your public menu is ready."

---

**Document Signature:** Technical Implementation Plan
**Created:** March 15, 2026
**Updated:** July 16, 2026 — v1.4 (primary-language description and single-value outlier boundaries)

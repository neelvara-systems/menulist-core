# Menu Quality Signals — Implementation Plan

> **Version:** 1.1
> **Last Updated:** March 16, 2026
> **Audience:** Developers
> **Status:** ✅ IMPLEMENTED

---

## 1. Architecture Overview

Menu Quality Signals is a **pure read + compute layer** with **3 UI surfaces**. It reads the active project's `extractedData` items and computes simple quality signals. No new collections, no new API routes.

```
Project Document (files[].extractedData.data.items)
  ↓
qualitySignals.ts (compute signals)
  ↓
3 Surface Adapters:
  • Dashboard Panel (awareness)
  • Editor Banner (action context)
  • Publish Intercept (highest leverage)
  ↓
Action buttons → navigate to existing AI features
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
│   Exports: computeQualitySignals(), isAllClear(), getVisibleSignals(), getActionableSignals()

src/components/templates/main-app/dashboard/
├── MenuQualitySignals.tsx            # ~170 lines — Dashboard panel

src/components/templates/main-app/projects/editorView/
├── EditorQualityBanner.tsx           # ~65 lines — Editor banner (closable)

src/components/mobile/components/
├── MenuQualitySignals.tsx            # ~115 lines — Mobile version

src/config/features.ts                # Modified — ENABLE_MENU_QUALITY_SIGNALS: false

src/components/templates/main-app/dashboard/OwnerDashboard/index.tsx  # Modified — embeds dashboard panel
src/components/templates/main-app/projects/editorView/Editor.tsx      # Modified — embeds banner + publish intercept
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

---

## 5. Three Surfaces

### 5.1 Dashboard Panel (`MenuQualitySignals.tsx`)

- Fetches project data via `getProjectData(projectId)` — 1 additional read per dashboard load
- Calls `computeQualitySignals()` → `getVisibleSignals()` to cap at 4 warnings
- Shows contextual `helpText` below each signal label
- "All clear" state with green checkmark
- Gated by `FEATURE_FLAGS.ENABLE_MENU_QUALITY_SIGNALS`

### 5.2 Editor Banner (`EditorQualityBanner.tsx`)

- Reads `projectData.files` already in editor context — zero additional reads
- Uses `getActionableSignals()` (higher thresholds)
- Renders as `Alert` banner with `closable` prop
- Links action buttons to Description Generator and Image Generator modals

### 5.3 Publish Intercept (in `Editor.tsx:onContinueClick`)

- Dynamic imports `computeQualitySignals` and `getActionableSignals` for tree-shaking
- Shows `AntdModal.confirm` with signal list + helpText
- **NEVER blocks publishing** — "Publish Anyway" always available
- Silent catch — failure never blocks the publish flow

---

## 6. Price Outlier Detection

Algorithm:

1. Group active items by `item.category` (skip items with variants)
2. Parse prices to numbers (strip currency symbols)
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

---

**Document Signature:** Technical Implementation Plan
**Created:** March 15, 2026
**Updated:** March 16, 2026 — v1.1 (ChatGPT review: replaced Large Categories with Hidden Items + Price Outliers, added Editor Banner + Publish Intercept surfaces, added helpText, added signal capping)

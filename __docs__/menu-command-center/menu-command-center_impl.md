# Menu Command Center — Implementation Plan

**Version:** 1.1
**Last Updated:** February 14, 2026
**Status:** ✅ Implementation Complete
**Audience:** Developers, future maintainers

---

## 1. Analysis: ChatGPT vs Codebase

### Agreements

| ChatGPT Suggestion                         | Codebase Reality                                                                                                        | Decision                                                                                       |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Three-panel modal layout                   | Existing modals use 2-column layout (BulkStatusMenuModal, ReorderMenuModal)                                             | **AGREE** — 3-panel is correct for multi-action; different from existing simpler modals        |
| `onApply(updatedProject)` callback pattern | All existing modals use this exact pattern (BulkStatusMenuModal:216, ReorderMenuModal:215, DecisionBlocksSettingsModal) | **AGREE** — follow established pattern                                                         |
| Single batch save to Firebase              | `Editor.tsx:335-369` — `syncChanges()` already does single `updateProject()` call                                       | **AGREE** — existing infra handles this                                                        |
| Selection engine as global state (Zustand) | Editor uses local `useState` for all modal state; no Zustand in project                                                 | **DISAGREE** — use local state within CommandCenterModal, not global Zustand                   |
| Long-press for selection mode              | Mobile-first concern; current editor is desktop-focused                                                                 | **DEFER** — v1 uses explicit item selection within modal only, not editor-level selection mode |
| Undo via reverting project state           | `removeObjRef()` deep-clone pattern exists everywhere                                                                   | **AGREE** — store pre-change snapshot, revert on undo                                          |

### Disagreements / Adjustments

1. **ChatGPT: "Create global selection engine in editor with Zustand"**
   - **Codebase reality**: Editor uses React `useState` for all state. No Zustand dependency. All existing bulk modals manage their own selection internally.
   - **Our approach**: Selection happens INSIDE the CommandCenterModal. No editor-level selection mode needed for v1. Modal receives `projectData` and manages selection state internally — matching `BulkStatusMenuModal` pattern.

2. **ChatGPT: "Selection mode with checkboxes in editor, floating command bar"**
   - **Codebase reality**: Editor has no selection mode. All bulk operations happen inside modals opened from `EditorActionsPopover`.
   - **Our approach**: Keep entry point as a new action in `EditorActionsPopover`. The CommandCenterModal handles its own selection panel (left panel). No editor UI changes needed.

3. **ChatGPT: "MOL audit logging for price changes"**
   - **Codebase reality**: No MOL (Menu Operations Log) system exists yet. `PricingIntegrityState` exists on `ProjectMetadata` (project.types.ts:21-57) for tracking price change timestamps.
   - **Our approach**: Update `PricingIntegrityState` fields when bulk pricing is applied. Skip MOL logging for v1 — add when MOL system is built.

4. **ChatGPT: "POS webhook push on price change"**
   - **Codebase reality**: POS webhook sync is documented but not yet implemented (see `__docs__/pos-webhook-sync/`).
   - **Our approach**: Skip POS webhook trigger for v1. When POS sync is built, it will hook into `updateProject()` automatically.

5. **ChatGPT: "Include attributes in bulk pricing"**
   - **Codebase reality**: `ExtractedDataAttribute` has `price: string` field (extractedData.types.ts:41). Items can have attributes (Small/Medium/Large variants).
   - **Our approach**: YES — bulk pricing must also adjust attribute prices. Otherwise owners get partial updates.

---

## 2. Database Schema

### No New Collections

This feature operates entirely on the existing `projectsData` collection. All changes are applied to the in-memory `Project` object and saved via existing `updateProject()` DAL function.

### Affected Fields

```typescript
// ExtractedDataItem (extractedData.types.ts:46-72)
{
    price?: string;          // Item base price — modified by bulk pricing
    active: boolean;         // Modified by Show/Hide Items (permanent visibility)
    available?: boolean;     // Modified by Change Availability (temporary stock status)
    category: string;        // Modified by move-to-category
}

// ExtractedDataAttribute (extractedData.types.ts:38-44)
{
    price: string;           // Attribute price — modified by bulk pricing
    active: boolean;         // Could be modified by bulk availability (future)
}

// PricingIntegrityState (project.types.ts:21-57)
// Updated on bulk price changes to trigger downstream surface refreshes
{
    lastPriceChangeOn: Timestamp;
    lastPriceChangeBy: string;
    pdf.status: 'STALE';
    pdf.version: number;     // Increment
    screens.version: number; // Increment
}
```

### No Schema Changes Required

All fields already exist. No Firestore schema migration needed.

---

## 3. API Contracts

### No New API Routes

This feature is **100% frontend**. All computation happens client-side on the `Project` object. The only Firebase interaction is the existing `updateProject()` DAL call.

---

## 4. File Structure (Exact Paths)

### New Files

```
src/components/templates/main-app/projects/
├── types/
│   └── commandCenter.types.ts              # ~80 lines — Command center types
├── editorView/
│   └── CommandCenterModal/
│       ├── index.tsx                        # ~250 lines — Main modal shell, 3-panel layout
│       ├── SelectionContext.tsx              # ~180 lines — Left panel: selection summary
│       ├── ActionEngine.tsx                 # ~120 lines — Center panel: action list + routing
│       ├── ImpactPreview.tsx                # ~200 lines — Right panel: live impact display
│       ├── actions/
│       │   ├── PricingAction.tsx            # ~250 lines — Pricing controls + methods
│       │   ├── AvailabilityAction.tsx       # ~120 lines — Available/unavailable toggle
│       │   └── MoveCategoryAction.tsx       # ~130 lines — Category picker + move logic
│       └── utils/
│           └── bulkOperations.ts            # ~300 lines — Pure functions for all bulk ops
```

### Modified Files

```
src/components/templates/main-app/projects/editorView/
├── EditorActionsPopover.tsx                 # Add 'commandCenter' action to ACTIONS array + EditorAction type
├── Editor.tsx                               # Add modal state + handler + render CommandCenterModal
src/config/features.ts                       # Add ENABLE_MENU_COMMAND_CENTER flag
```

---

## 5. Types Definition

```typescript
// src/components/templates/main-app/projects/types/commandCenter.types.ts

import {
  ExtractedDataCategory,
  ExtractedDataItem,
} from "./extractedData.types";
import { ProjectFileType } from "./project.types";

// ─────────────────────────────────────────
// COMMAND CENTER ACTION TYPES
// ─────────────────────────────────────────

export type CommandCenterAction = "pricing" | "availability" | "moveCategory";

// ─────────────────────────────────────────
// SELECTION STATE
// ─────────────────────────────────────────

export interface SelectedItemInfo {
  id: string;
  name: string;
  price: string;
  category: string;
  categoryName: string;
  fileUid: string;
  active: boolean;
  available: boolean;
  isLocked: boolean; // true if inherited from master and not overridable
  attributes?: Array<{
    id: string;
    name: string;
    price: string;
  }>;
}

export interface SelectionSummary {
  totalSelected: number;
  editableCount: number;
  lockedCount: number;
  activeCount: number;
  inactiveCount: number;
  categories: string[]; // Unique category names
  outletName: string; // 'Master menu' or outlet name
  isMasterMenu: boolean;
}

// ─────────────────────────────────────────
// PRICING ACTION
// ─────────────────────────────────────────

export type PricingMethod =
  | "increasePercent"
  | "decreasePercent"
  | "addFlat"
  | "reduceFlat"
  | "setFixed";

export interface PricingConfig {
  method: PricingMethod;
  value: number;
}

// ─────────────────────────────────────────
// SAFETY GUARDRAILS
// ─────────────────────────────────────────

export const PRICING_GUARDRAILS = {
  MAX_INCREASE_PERCENT: 200,
  MAX_DECREASE_PERCENT: 80,
  MIN_PRICE: 1, // No zero or negative prices
  ROUNDING: "nearest_whole", // Round to nearest ₹1
} as const;

export const PRICING_WARNINGS = {
  LARGE_INCREASE_THRESHOLD: 40, // Show warning above 40% increase
  LARGE_DECREASE_THRESHOLD: 40, // Show warning above 40% decrease
} as const;

// ─────────────────────────────────────────
// IMPACT PREVIEW
// ─────────────────────────────────────────

export interface PriceChangePreview {
  itemId: string;
  itemName: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  isAttribute?: boolean;
  attributeName?: string;
}

export interface ImpactSummary {
  itemsAffected: number;
  itemsSkipped: number; // Zero price, locked, etc.
  avgPriceBefore: number;
  avgPriceAfter: number;
  netChangePercent: number;
  sampleChanges: PriceChangePreview[]; // Max 8 items for preview
  warnings: string[]; // Safety warnings
}

// ─────────────────────────────────────────
// AVAILABILITY ACTION
// ─────────────────────────────────────────

export type AvailabilityTarget = "available" | "unavailable";

export interface AvailabilityPreview {
  itemsToChange: number;
  itemsAlreadyInState: number;
}

// ─────────────────────────────────────────
// MOVE CATEGORY ACTION
// ─────────────────────────────────────────

export interface MoveCategoryPreview {
  itemsToMove: number;
  sourceCategories: string[];
  destinationCategory: string;
}

// ─────────────────────────────────────────
// UNDO STATE
// ─────────────────────────────────────────

export interface UndoState {
  /** Deep clone of project before last apply */
  previousProject: any; // Project type — using any to avoid circular import
  /** Description for toast */
  description: string;
  /** Timestamp when undo expires */
  expiresAt: number;
}
```

---

## 6. Component Architecture

### CommandCenterModal (index.tsx)

```
Props:
- open: boolean
- projectData: Project
- isMasterLinked: boolean
- itemStates: Record<string, InheritanceState>
- categoryStates: Record<string, InheritanceState>
- masterPrices: Record<string, string>
- onClose: () => void
- onApply: (updatedProject: Project) => void

Internal State:
- selectedItems: Map<string, SelectedItemInfo>   // Selection
- activeAction: CommandCenterAction | null        // Current action
- actionInProgress: boolean                       // Has unsaved action input
- undoState: UndoState | null                     // For undo toast

Layout:
┌──────────────────────────────────────────────────────────────┐
│ Modal Title: "Menu Command Center"                     [X]   │
├──────────┬─────────────────────┬─────────────────────────────┤
│ LEFT     │ CENTER              │ RIGHT                       │
│          │                     │                             │
│ Selection│ Action list         │ Impact preview              │
│ Context  │ OR                  │ (computed from selection     │
│          │ Action-specific UI  │  + action input)            │
│          │                     │                             │
├──────────┴─────────────────────┴─────────────────────────────┤
│ [Cancel action]                             [Apply Changes]  │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Modal opens → builds item list from projectData.files
2. User selects items/categories in left panel
3. User picks action in center panel
4. Action UI appears → user enters values
5. ImpactPreview computes changes in real-time (pure functions)
6. User clicks "Apply Changes"
7. Confirmation dialog
8. bulkOperations.ts computes updatedProject (deep clone + mutations)
9. onApply(updatedProject) called → Editor receives it
10. Editor calls syncChanges(updatedProject) → single updateProject() to Firebase
11. Toast with undo appears
12. Modal stays open → action resets to list
```

### Undo Flow

```
1. Before apply: store deep clone of current projectData as undoState
2. After apply: show toast "X items updated — Undo" for 30 seconds
3. If Undo clicked: call onApply(undoState.previousProject)
4. Toast dismisses → undoState cleared
5. If another action applied: previous undoState replaced (only last action undoable)
```

---

## 7. Bulk Operations Utils (Pure Functions)

```typescript
// bulkOperations.ts — All pure functions, no side effects

// ─── PRICING ───
export function computePricingPreview(
  selectedItems: SelectedItemInfo[],
  config: PricingConfig,
): ImpactSummary;

export function applyBulkPricing(
  project: Project,
  selectedItemIds: Set<string>,
  config: PricingConfig,
): Project; // Returns deep clone with pricing applied

// ─── AVAILABILITY ───
export function computeAvailabilityPreview(
  selectedItems: SelectedItemInfo[],
  target: AvailabilityTarget,
): AvailabilityPreview;

export function applyBulkAvailability(
  project: Project,
  selectedItemIds: Set<string>,
  target: AvailabilityTarget,
): Project;

// ─── MOVE CATEGORY ───
export function computeMoveCategoryPreview(
  selectedItems: SelectedItemInfo[],
  destinationCategoryId: string,
  destinationCategoryName: string,
): MoveCategoryPreview;

export function applyBulkMoveCategory(
  project: Project,
  selectedItemIds: Set<string>,
  destinationCategoryId: string,
): Project;

// ─── HELPERS ───
export function calculateNewPrice(
  currentPrice: number,
  config: PricingConfig,
): number; // Applies method + rounding + guardrails

export function roundPrice(price: number): number;
// Round to nearest whole number (₹1)

export function validatePricingConfig(config: PricingConfig): {
  valid: boolean;
  error?: string;
};

export function buildSelectedItemsFromProject(
  project: Project,
  selectedIds: Set<string>,
  activeLang: string,
  itemStates?: Record<string, InheritanceState>,
): SelectedItemInfo[];
```

---

## 8. Integration with Editor.tsx

### Changes to EditorActionsPopover.tsx

```typescript
// Add to EditorAction type (line 8):
export type EditorAction = 'language' | 'description' | 'images' | 'activeInactive'
    | 'reorder' | 'decisionBlocks' | 'storeCustomization' | 'commandCenter';

// Add to ACTIONS array (line 19-64) — INSERT AS FIRST ITEM:
{
    key: 'commandCenter',
    icon: <LuTerminalSquare style={{ fontSize: 20 }} />,
    title: 'Menu Command Center',
    description: 'Bulk update prices, availability, and categories for many items at once',
    isNew: true
}
```

### Changes to Editor.tsx

```typescript
// Add state (near line 105):
const [isCommandCenterOpen, setIsCommandCenterOpen] = useState(false);

// Add to handleActionClick switch (near line 698):
case 'commandCenter':
    setIsCommandCenterOpen(true);
    break;

// Add handler:
const handleCommandCenterApply = async (updatedProject: Project) => {
    // Same pattern as BulkStatusMenuModal, ReorderMenuModal, etc.
    setProjectData(updatedProject);
    setHasChanges(true);
    hasChangesRef.current = true;
    // Trigger immediate save (not debounced) for bulk operations
    await syncChanges(updatedProject);
};

// Add modal render (near other modals ~line 1050):
{FEATURE_FLAGS.ENABLE_MENU_COMMAND_CENTER && (
    <CommandCenterModal
        open={isCommandCenterOpen}
        projectData={projectData}
        isMasterLinked={isMasterLinked}
        itemStates={itemStates}
        categoryStates={categoryStates}
        masterPrices={masterPrices}
        onClose={() => setIsCommandCenterOpen(false)}
        onApply={handleCommandCenterApply}
    />
)}
```

---

## 9. Security Checklist

| Check                             | Status  | Notes                                     |
| --------------------------------- | ------- | ----------------------------------------- |
| No new API routes                 | N/A     | Feature is 100% frontend                  |
| No new Firestore collections      | N/A     | Uses existing projectsData                |
| No direct Firestore access        | PASS    | Uses existing `updateProject()` DAL       |
| Input validation (pricing values) | PLANNED | Guardrails in `validatePricingConfig()`   |
| No PII exposure                   | PASS    | No user data involved                     |
| Feature flag gated                | PLANNED | `ENABLE_MENU_COMMAND_CENTER`              |
| Multi-tenant isolation            | PASS    | Inherited from existing `updateProject()` |
| No console.log in production      | PLANNED | Use secureLog if needed                   |

---

## 10. Implementation Phases

### Phase 1: Foundation (Core modal + pricing)

- [ ] Create `commandCenter.types.ts` with all type definitions
- [ ] Create `bulkOperations.ts` with pricing pure functions + tests
- [ ] Create `CommandCenterModal/index.tsx` — 3-panel shell
- [ ] Create `SelectionContext.tsx` — item/category selection with checkboxes
- [ ] Create `ActionEngine.tsx` — action list routing
- [ ] Create `actions/PricingAction.tsx` — pricing method + value input
- [ ] Create `ImpactPreview.tsx` — live preview panel
- [ ] Add `'commandCenter'` to `EditorActionsPopover.tsx` ACTIONS array
- [ ] Add modal state + handler in `Editor.tsx`
- [ ] Add feature flag `ENABLE_MENU_COMMAND_CENTER` to `features.ts`

### Phase 2: Additional Actions

- [ ] Create `actions/AvailabilityAction.tsx`
- [ ] Create `actions/MoveCategoryAction.tsx`
- [ ] Add availability + move functions to `bulkOperations.ts`
- [ ] Wire up multi-action session flow (action reset after apply)

### Phase 3: Safety & Polish

- [ ] Implement undo toast system (store pre-change project snapshot)
- [ ] Add safety guardrail warnings (large increase/decrease)
- [ ] Add discard confirmation on modal close
- [ ] Handle edge cases (empty selection, 0-price items, attributes)
- [ ] Performance optimization for 500+ item menus
- [ ] Update `PricingIntegrityState` on bulk price changes

---

## 11. Pricing Calculation Logic (Critical)

```typescript
function calculateNewPrice(
  currentPrice: number,
  config: PricingConfig,
): number {
  let newPrice: number;

  switch (config.method) {
    case "increasePercent":
      newPrice = currentPrice * (1 + config.value / 100);
      break;
    case "decreasePercent":
      newPrice = currentPrice * (1 - config.value / 100);
      break;
    case "addFlat":
      newPrice = currentPrice + config.value;
      break;
    case "reduceFlat":
      newPrice = currentPrice - config.value;
      break;
    case "setFixed":
      newPrice = config.value;
      break;
  }

  // Guardrails
  if (newPrice < PRICING_GUARDRAILS.MIN_PRICE) {
    newPrice = PRICING_GUARDRAILS.MIN_PRICE;
  }

  // Round to nearest whole number
  newPrice = Math.round(newPrice);

  return newPrice;
}
```

**Important**: Price field is `string` in `ExtractedDataItem.price` and `ExtractedDataAttribute.price`. All calculations must:

1. Parse string → number (`parseFloat`)
2. Calculate
3. Round
4. Convert back to string (`String(newPrice)`)

Items without price (`undefined` or empty string) are **skipped** in bulk pricing.

---

## 12. Multi-Outlet Handling

### Master Menu Editing

- Bulk changes apply to master project data
- Items with outlet overrides are NOT directly affected (outlet reads its own `overrides.items[id].price`)
- `PricingIntegrityState` update triggers downstream surface refreshes

### Outlet Menu Editing

- Only items marked as editable (not locked by master) can be changed
- Locked items shown in selection panel with lock icon + count
- Locked items excluded from `applyBulkPricing()` computation
- Detection: `itemStates[itemId]` === 'inherited' → locked

### Detection Logic

```typescript
const isLocked = isMasterLinked && itemStates[item.id] === "inherited";
```

---

## 13. Existing Patterns Reference

### How Existing Bulk Modals Work (Pattern to Follow)

**BulkStatusMenuModal** (`editorView/BulkStatusMenuModal.tsx:195-218`):

```typescript
const handleApply = () => {
  const updatedProject = removeObjRef(projectData); // Deep clone
  // ... mutate updatedProject locally ...
  onApply(updatedProject); // Return to Editor
  onClose();
};
```

**Editor receives it** (`Editor.tsx` — same pattern for all modals):

- Calls `setProjectData(updatedProject)`
- Triggers auto-save via `hasChanges` state → `syncChanges()` → `updateProject()`

**Single batch save**: The `updateProject()` DAL function at `src/database/projects/index.ts` sends the entire project document in one Firestore write. No per-item writes.

---

## 14. Testing Guide

### Manual Test Scenarios

| #   | Scenario                 | Steps                                              | Expected                            |
| --- | ------------------------ | -------------------------------------------------- | ----------------------------------- |
| 1   | Full menu price increase | Select all → Pricing → +10% → Preview → Apply      | All prices +10%, rounded to whole ₹ |
| 2   | Category-only change     | Select one category → Pricing → +15% → Apply       | Only that category's items change   |
| 3   | Mixed selection          | Select items from 2+ categories → Pricing → Apply  | Only selected items change          |
| 4   | Large increase warning   | Enter +50% → should show warning                   | Warning shown, not blocked          |
| 5   | Extreme increase blocked | Enter +250% → should be blocked                    | Error message, cannot apply         |
| 6   | Decrease >80% blocked    | Enter -90% → should be blocked                     | Error message, cannot apply         |
| 7   | Zero price prevention    | Reduce flat by more than item price → min ₹1       | Price floors at ₹1                  |
| 8   | Undo after apply         | Apply pricing → click Undo in toast                | Prices revert to original           |
| 9   | Multi-action session     | Apply pricing → then apply availability → close    | Both actions persisted              |
| 10  | Outlet locked items      | Edit outlet with inherited items → some locked     | Locked items excluded, count shown  |
| 11  | Attribute pricing        | Items with variants → bulk pricing                 | Attribute prices also change        |
| 12  | Empty selection          | Try to apply with 0 items                          | Apply button disabled               |
| 13  | Large menu (300+ items)  | Select all on large menu → preview                 | No UI lag, preview instant          |
| 14  | Discard confirmation     | Enter values → close modal without applying        | Confirmation dialog appears         |
| 15  | Availability bulk change | Select items → Change availability → Unavailable   | Items marked unavailable            |
| 16  | Move category            | Select items → Move to Category → pick destination | Items moved to new category         |

---

## 15. Firebase Cost Impact

**Zero additional Firebase cost.**

This feature reuses the existing `updateProject()` call. The only write is the same single project document update that happens with any editor change. No new reads, no new collections, no new Cloud Functions.

See `menu-command-center_firebase.md` for detailed breakdown.

---

**Document Signature:** Implementation Plan
**Created:** February 13, 2026

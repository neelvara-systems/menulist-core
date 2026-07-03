# Data Editor — Product Specification

**Feature:** Visual Menu Data Editor  
**Parent Feature:** Projects (Menu Digitization)  
**Status:** Implemented source evidence; not current launch certification
**Last Updated:** January 2026

**Launch boundary:** This spec documents the menu data editor. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, browser/mobile editor QA, publish/cache evidence for edited public truth, and deploy evidence for the target environment.

---

## Executive Summary

The Data Editor is the visual interface where restaurant owners review, edit, and organize their extracted menu data. After AI extraction, users fine-tune categories, items, prices, and descriptions before publishing.

### What It Does

- **Category Management** → Add, edit, delete, reorder menu sections
- **Item Management** → Edit names, prices, descriptions, images
- **Attribute Management** → Variants, sizes, options with individual prices
- **Multi-Language Editing** → Edit content in multiple languages
- **Auto-Save** → Changes saved automatically, no data loss
- **Undo/Redo** → Revert and restore changes easily
- **Validation** → Catches errors before publishing

### What It Does NOT Do

- ❌ Does not extract data (that's AI Data Extraction)
- ❌ Does not generate images (that's AI Image Generation)
- ❌ Does not render the final menu (that's B2C View)

---

## Goals

| Goal                     | Success Metric                      |
| ------------------------ | ----------------------------------- |
| **Zero data loss**       | Auto-save prevents lost work        |
| **Professional UX**      | Undo/redo, keyboard shortcuts       |
| **Error prevention**     | Validation blocks bad publishes     |
| **Efficient editing**    | Batch operations, drag-drop reorder |
| **Multi-language ready** | Easy language switching             |

---

## User Stories

### Restaurant Owner

> "As a restaurant owner, I want to review and correct AI-extracted data so my digital menu is accurate."

**Acceptance Criteria:**

- See all extracted categories and items
- Edit names, descriptions, prices inline
- Add missing items or categories
- Delete incorrect extractions
- Changes auto-saved

### Multi-Language Owner

> "As an owner with an English and Hindi menu, I want to edit both language versions side by side."

**Acceptance Criteria:**

- Switch between languages easily
- See which items need translation
- Edit each language version
- Validate both before publishing

---

## User Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ User arrives at Editor (View 2) after extraction                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ EDITOR INTERFACE                                                 │
│   ┌──────────────┬──────────────────────────────────────┐       │
│   │ Categories   │ Items Grid/List                      │       │
│   │ Sidebar      │                                      │       │
│   │              │ [Item Cards with edit controls]      │       │
│   │ + Add        │                                      │       │
│   │ ⬍ Reorder    │ [Search] [Filters] [View Mode]      │       │
│   └──────────────┴──────────────────────────────────────┘       │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ EDITING ACTIONS                                                  │
│   • Click item → Edit inline or open modal                      │
│   • Drag items → Reorder within category                        │
│   • Add button → Create new item/category                       │
│   • Delete → Remove with confirmation                           │
│   • Batch → Bulk activate/deactivate                            │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ AUTO-SAVE (Background)                                           │
│   • Detects changes (isSameObjects comparison)                  │
│   • Debounced: 15s after last change                            │
│   • Throttled: Min 30s between saves                            │
│   • Status: "Saving..." → "All changes saved"                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│ PUBLISH / CONTINUE                                               │
│   • Validation runs (names, categories, prices)                 │
│   • Errors shown → Must fix before proceeding                   │
│   • Success → Navigate to Preview (View 3)                      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Requirements

### Functional Requirements

| ID    | Requirement                     | Priority | Status |
| ----- | ------------------------------- | -------- | ------ |
| FR-01 | Add, edit, delete categories    | P0       | ✅     |
| FR-02 | Add, edit, delete items         | P0       | ✅     |
| FR-03 | Edit item attributes (variants) | P0       | ✅     |
| FR-04 | Auto-save with change detection | P0       | ✅     |
| FR-05 | Undo/redo functionality         | P1       | ✅     |
| FR-06 | Keyboard shortcuts              | P1       | ✅     |
| FR-07 | Validation before publish       | P1       | ✅     |
| FR-08 | Drag-drop reordering            | P1       | ✅     |
| FR-09 | Multi-language editing          | P1       | ✅     |
| FR-10 | Search and filter items         | P1       | ✅     |
| FR-11 | Bulk status toggle              | P2       | ✅     |
| FR-12 | Multiple view modes             | P2       | ✅     |

### Non-Functional Requirements

| ID     | Requirement        | Target          | Status |
| ------ | ------------------ | --------------- | ------ |
| NFR-01 | Auto-save debounce | 15 seconds      | ✅     |
| NFR-02 | Auto-save throttle | Min 30 seconds  | ✅     |
| NFR-03 | Undo history depth | 10 snapshots    | ✅     |
| NFR-04 | Snapshot throttle  | 1 per second    | ✅     |
| NFR-05 | Change detection   | Deep comparison | ✅     |

---

## Editor Views

### View Modes

| Mode            | Description                              | Best For                  |
| --------------- | ---------------------------------------- | ------------------------- |
| **Advanced**    | Side-by-side: Image + Editor             | Referencing original menu |
| **Traditional** | Category-based: Left panel + Right panel | Large menus               |
| **Focus**       | Full-width with file tabs                | Detailed editing          |

### Keyboard Shortcuts

| Category         | Shortcut       | Action               |
| ---------------- | -------------- | -------------------- |
| **Save**         | `Ctrl+S`       | Save changes         |
| **Undo**         | `Ctrl+Z`       | Undo last change     |
| **Redo**         | `Ctrl+Shift+Z` | Redo undone change   |
| **Search**       | `Ctrl+F`       | Focus search input   |
| **New Item**     | `Ctrl+N`       | Add new item         |
| **New Category** | `Ctrl+Shift+N` | Add new category     |
| **Help**         | `Shift+?`      | Show shortcuts modal |

---

## Validation Rules

### Before Publish/Continue

| Check             | Error Message                                      |
| ----------------- | -------------------------------------------------- |
| Item name missing | `"{file} → {item}: Name is required ({language})"` |
| Category missing  | `"{file} → {item}: Category is required"`          |
| Negative price    | `"{file} → {item}: Price cannot be negative"`      |

### User Experience

- Errors shown in modal with bulleted list
- Per-file, per-item context for each error
- **Blocks** publish/continue until fixed
- Clear call-to-action to fix issues

---

## Auto-Save Behavior

### Timing

```
User makes change
       ↓
Wait 15 seconds (debounce)
       ↓
If < 30 seconds since last save → Wait until 30s mark
       ↓
Save to Firestore
       ↓
Show "All changes saved ✓"
```

### Status Indicators

| Status          | Display                                          |
| --------------- | ------------------------------------------------ |
| No changes      | "All changes saved ✓"                            |
| Unsaved changes | "Unsaved changes" (yellow dot)                   |
| Saving          | "Saving..." (spinner)                            |
| Saved           | "All changes saved ✓" + tooltip "Saved at HH:MM" |

---

## Error Messages

| Scenario                   | Message                                                    |
| -------------------------- | ---------------------------------------------------------- |
| Validation failed          | `"Please fix these issues before publishing"` + error list |
| Save failed                | `"Failed to save changes. Please try again."`              |
| Delete category with items | `"Cannot delete. This category contains {n} items."`       |
| Reset confirmation         | `"Reset Changes? All unsaved changes will be lost."`       |

---

## Out of Scope

| Feature                 | Reason              | Alternative         |
| ----------------------- | ------------------- | ------------------- |
| Real-time collaboration | Complexity          | Single-user editing |
| Offline editing         | Storage constraints | Requires internet   |
| Custom fields           | Phase 2             | Use descriptions    |
| Bulk price updates      | Phase 2             | Individual editing  |

---

## Related Documents

| Document                 | Purpose                          |
| ------------------------ | -------------------------------- |
| `_impl.md`               | Technical implementation details |
| `_marketing.md`          | Sales and marketing collateral   |
| `../ai-data-extraction/` | What happens before editing      |
| `../Editor/`             | Detailed component documentation |

---

## Version History

| Version | Date     | Changes                             |
| ------- | -------- | ----------------------------------- |
| 1.0     | Nov 2025 | Initial implementation              |
| 1.1     | Nov 2025 | Added auto-save, validation         |
| 1.2     | Nov 2025 | Added undo/redo, keyboard shortcuts |
| 1.3     | Nov 2025 | Added drag-drop reordering          |

---

_Document Status: Historical data-editor source evidence - not current launch certification_

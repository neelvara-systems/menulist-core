# Data Editor

**Sub-feature of:** Projects (Menu Digitization)  
**Status:** ✅ Production Ready

---

## Overview

The Data Editor is the visual interface for reviewing and editing AI-extracted menu data. It provides auto-save, undo/redo, keyboard shortcuts, and validation to ensure a safe and efficient editing experience.

---

## Documentation

| Document        | Audience          | Purpose                                    |
| --------------- | ----------------- | ------------------------------------------ |
| `_spec.md`      | Product, Business | Requirements, user flows, validation rules |
| `_impl.md`      | Developers        | Architecture, auto-save, undo/redo systems |
| `_marketing.md` | Sales, Marketing  | Pitch, copy, objection handling            |

---

## Quick Reference

### Key Features

- **Auto-save:** 15s debounce, 30s min interval
- **Undo/Redo:** 10-level history, Ctrl+Z / Ctrl+Shift+Z
- **Validation:** Blocks publish on errors
- **Keyboard shortcuts:** 12+ shortcuts
- **View modes:** Advanced, Traditional, Focus

### Key Files

```
src/components/templates/main-app/projects/editorView/
├── Editor.tsx           # Main container (748 LOC)
├── EditorContent.tsx    # Category/item editing
├── views/               # AdvancedView, TraditionalView, FocusView
├── hooks/               # useEditorKeyboardShortcuts, useEditorLogic
├── Modals/              # 7 modal components
└── utils/               # editorOperations, itemFilters
```

### Keyboard Shortcuts

| Shortcut       | Action   |
| -------------- | -------- |
| `Ctrl+S`       | Save     |
| `Ctrl+Z`       | Undo     |
| `Ctrl+Shift+Z` | Redo     |
| `Ctrl+F`       | Search   |
| `Ctrl+N`       | New item |
| `Shift+?`      | Help     |

---

## Legacy Documentation

The following files have been **consolidated** into this folder:

| Legacy File                                            | Status                    |
| ------------------------------------------------------ | ------------------------- |
| `Assessments/ASSESSMENT-03-EDITOR.md`                  | → Consolidated            |
| `04-DATA-EDITOR.md`                                    | → Consolidated            |
| `development_done/3-IMPLEMENTATION-EDITOR-COMPLETE.md` | → Consolidated            |
| `Editor/` folder (8 files)                             | → Referenced in \_impl.md |

---

## Related Features

| Feature                | Relationship                |
| ---------------------- | --------------------------- |
| AI Data Extraction     | Provides data to edit       |
| AI Image Generation    | Generates images for items  |
| Description Generation | Generates item descriptions |
| B2C View               | Previews the final menu     |

---

_Last Updated: January 2026_

# 📝 Editor Documentation

**Location**: `src/components/templates/main-app/projects/editorView/`  
**Last Updated**: July 2, 2026
**Status**: Implemented source documentation; not current launch certification

**Launch Boundary:** This README indexes the current Projects editor documentation and source entrypoints. It is not current production-launch approval. Current release readiness belongs to the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, `npm run verify:menu-project-editor-boundary`, browser/mobile editor QA, publish/cache evidence for edited public truth, upload/image/editor regression smoke, and target-environment deploy evidence.

**Project editor boundary source gate:** `npm run verify:menu-project-editor-boundary` confirms this index still points at the current editor container, desktop save/publish path, project DAL cache invalidation path, mobile persistence path, project selector acknowledgements, and shared bulk-action wiring. It does not run browser QA, mobile device QA, provider smoke, live Firestore/Storage writes, Firebase deploys, Vercel deploys, a production build, or production-host behavior.

**August 28, 2026 RC hardening:** The keyboard-shortcuts guide must not render
replacement characters. Project filter selectors and the desktop Edit Item
category, preparation, promotion, nutrition, serving-size, allergen, dietary,
and spice controls must expose stable accessible names. These requirements are
locked by the editor and global accessibility source boundaries and were
retested through connected Chrome with all item changes discarded. The shared
Category, Item, and Option deletion confirmations must likewise expose their
visible title as the dialog name before a destructive action can be confirmed.
Manage Languages, Add Images, Featured section, and Menu Command Center must
also retain named dialog and selection controls. Featured section keeps its
footer reachable within the viewport, Command Center action cards support
Enter/Space with truthful disabled state, its confirmations expose their visible
title, and its impact accordions use Ant's current `items` API so previewing an
action does not emit a deprecated-child warning. These changes preserve the
existing project mutation, provider, credit, cache, and public-truth contracts.
The project setup language selector likewise exposes a named Add Language
combobox and named Enter/Space-operable removal controls while retaining the
existing at-least-one-language guard. The Menu preview dialog must expose its
purpose as the accessible dialog name while keeping Desktop, Tablet, and Mobile
as independently named pressed-state controls. The shared dialog bridge removes
Ant Design's generated title reference before applying an explicit label so
confirmation and preview names cannot be overridden by composite title content.
The Editor's validation, pre-publish quality, project-detail repair, and
processed-file deletion static dialogs all use the same explicit-label bridge.
The processed-file confirmation uses file-neutral copy because the editor also
accepts JSON and other non-image menu sources; cancellation remains local and
retains the source.
The menu-link import URL input exposes a stable purpose label while preserving
public-HTTP(S) validation, owner-permission gating, and job/entitlement guards.
Editor dirty-state and pre-write checks treat missing and empty item-attribute
arrays as the same menu truth, preventing an inverse add/delete action from
issuing a no-op project write while preserving real attribute removals.
The item-image and batch-image workflow derives a stable dialog name for every
step on desktop and mobile: initial choice, item setup, batch selection,
configuration, and result. Batch selection keeps `Select items for images` as
its visible title; this naming correction does not change upload, provider,
credit, Storage, Function, or project-mutation behavior.
The single-item selector keeps its compound identity value internal while
exposing the human-readable item and category as each option name. Photo
framing, image-type shortcuts and choices, and shared aspect-ratio controls use
native pressed-state semantics. Special and excluded-content instructions plus
the 44px native color inputs expose stable purpose labels; the generator keeps
its final provider, credit, upload, and persistence boundaries unchanged.

---

## 📋 Documentation Index

| #   | Document                                           | Description                                |
| --- | -------------------------------------------------- | ------------------------------------------ |
| 01  | [Views](./01-views.md)                             | Advanced, Traditional, Focus view modes    |
| 02  | [Image Preview & Zoom](./02-image-preview-zoom.md) | ZoomableImage, FileImagePreview, controls  |
| 03  | [Keyboard Shortcuts](./03-keyboard-shortcuts.md)   | All shortcuts, config, help modal          |
| 04  | [Search & Filters](./04-search-filters.md)         | Filter popover, search, item filtering     |
| 05  | [Batch Actions](./05-batch-actions.md)             | More Actions popover, bulk operations      |
| 06  | [Modals](./06-modals.md)                           | All modal components documented            |
| 07  | [Auto-Save](./07-auto-save.md)                     | Debounce, throttle, change detection       |
| 08  | [Hooks & Utils](./08-hooks-utils.md)               | useEditorLogic, useEditorKeyboardShortcuts |

---

## 🏗️ Architecture Overview

```
Editor.tsx (Main Container)
├── Header
│   ├── Search Input (Ctrl+F)
│   ├── EditorFiltersPopover
│   ├── View Switcher (Advanced/Traditional/Focus)
│   ├── EditorActionsPopover (More Actions)
│   └── Keyboard Shortcuts Button (Shift+?)
│
├── Views (Conditional Rendering)
│   ├── AdvancedView (Side-by-side: Image + Editor)
│   ├── TraditionalView (Category-based: Left + Right panels)
│   └── FocusView (Full-width with file tabs)
│
├── Modals (7 Total)
│   ├── LanguageSelectorModal (Ctrl+L)
│   ├── DescriptionGenerationModal (Ctrl+G)
│   ├── ImageUploadModal (Ctrl+U)
│   ├── BulkStatusMenuModal (Ctrl+B)
│   ├── ReorderMenuModal (Ctrl+R)
│   ├── EditItemModal
│   ├── EditCategoryModal
│   └── KeyboardShortcutsHelp (Shift+?)
│
└── Footer
    ├── Save Status (Saved/Saving/Unsaved)
    ├── Reset Button
    ├── Publish Button
    └── Continue Button
```

---

## 📁 File Structure

```
editorView/
├── Editor.tsx                    # Main container (36KB)
├── EditorContent.tsx             # Item/category editor (27KB)
├── EditorActionsPopover.tsx      # "More Actions" menu
├── EditorFiltersPopover.tsx      # Filter controls
├── editorShortcuts.config.ts     # Keyboard shortcuts config
├── KeyboardShortcutsHelp.tsx     # Shortcuts help modal
├── KeyboardShortcutDisplay.tsx   # Key display component
├── KeyboardKey.tsx               # Single key component
├── ZoomableImage.tsx             # Zoomable image viewer
├── AiDisclaimerAlert.tsx         # AI disclaimer
│
├── components/
│   └── FileImagePreview.tsx      # Image preview with controls
│
├── views/
│   ├── AdvancedView.tsx          # Side-by-side view
│   ├── TraditionalView.tsx       # Category-based view (54KB)
│   └── FocusView.tsx             # Full-width view
│
├── hooks/
│   ├── useEditorKeyboardShortcuts.ts  # Keyboard handling
│   └── useEditorLogic.ts              # Shared editor logic
│
├── utils/
│   ├── editorOperations.ts       # CRUD operations
│   └── itemFilters.ts            # Filtering utilities
│
├── Modals/
│   ├── LanguageSelectorModal.tsx
│   ├── DescriptionGenerationModal.tsx
│   ├── ImageUploadModal.tsx
│   ├── BulkStatusMenuModal.tsx
│   ├── ReorderMenuModal.tsx
│   ├── editItemModal.tsx
│   ├── editCategoryModal.tsx
│   └── uploadedImagesList.tsx
│
└── AiImageGenerator/             # AI image generation (14 files)
```

---

## 🎯 Quick Reference

### Keyboard Shortcuts

| Category       | Shortcut       | Action                      |
| -------------- | -------------- | --------------------------- |
| **Creation**   | `Ctrl+N`       | Add new item                |
|                | `Ctrl+Shift+N` | Add new category            |
| **Editing**    | `E`            | Edit selected item          |
|                | `Ctrl+S`       | Save changes                |
|                | `Ctrl+I`       | Toggle active/inactive      |
| **Navigation** | `Ctrl+F`       | Focus search                |
|                | `↑/↓`          | Navigate items              |
|                | `Escape`       | Close modal/clear selection |
|                | `Ctrl+\`       | Toggle view mode            |
| **Deletion**   | `Delete`       | Delete selected item        |
| **Batch**      | `Ctrl+L`       | Language modal              |
|                | `Ctrl+G`       | Description generator       |
|                | `Ctrl+U`       | Image upload                |
|                | `Ctrl+B`       | Bulk status                 |
|                | `Ctrl+R`       | Reorder menu                |
| **Help**       | `Shift+?`      | Show shortcuts              |

### Image Zoom Controls

| Action   | Method                       |
| -------- | ---------------------------- |
| Zoom In  | Scroll Up, `+`, Double-click |
| Zoom Out | Scroll Down, `-`             |
| Reset    | `0`, Click %, Reset button   |
| Pan      | Drag when zoomed             |

### Filter Options

| Filter      | Options              |
| ----------- | -------------------- |
| Category    | Dropdown selection   |
| Price Range | Min/Max inputs       |
| Images      | Has image / No image |
| Status      | Active / Inactive    |

---

## 🔗 Related Documentation

- [Projects Overview](../00-overview.md)
- [Data Editor](../data-editor/README.md)

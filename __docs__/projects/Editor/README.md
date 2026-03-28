# 📝 Editor Documentation

**Location**: `src/components/templates/main-app/projects/editorView/`  
**Last Updated**: Nov 27, 2025  
**Status**: ✅ Production Ready

---

## 📋 Documentation Index

| #   | Document                                           | Description                                |
| --- | -------------------------------------------------- | ------------------------------------------ |
| 01  | [Views](./01-VIEWS.md)                             | Advanced, Traditional, Focus view modes    |
| 02  | [Image Preview & Zoom](./02-IMAGE-PREVIEW-ZOOM.md) | ZoomableImage, FileImagePreview, controls  |
| 03  | [Keyboard Shortcuts](./03-KEYBOARD-SHORTCUTS.md)   | All shortcuts, config, help modal          |
| 04  | [Search & Filters](./04-SEARCH-FILTERS.md)         | Filter popover, search, item filtering     |
| 05  | [Batch Actions](./05-BATCH-ACTIONS.md)             | More Actions popover, bulk operations      |
| 06  | [Modals](./06-MODALS.md)                           | All modal components documented            |
| 07  | [Auto-Save](./07-AUTO-SAVE.md)                     | Debounce, throttle, change detection       |
| 08  | [Hooks & Utils](./08-HOOKS-UTILS.md)               | useEditorLogic, useEditorKeyboardShortcuts |

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
- [Data Editor](../04-DATA-EDITOR.md)
- [Complete Editor System](../features/FEATURE-COMPLETE-EDITOR-SYSTEM.md)

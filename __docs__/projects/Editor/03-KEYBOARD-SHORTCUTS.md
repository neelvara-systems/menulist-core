# ⌨️ Keyboard Shortcuts

**Files**: `editorShortcuts.config.ts`, `KeyboardShortcutsHelp.tsx`, `hooks/useEditorKeyboardShortcuts.ts`  
**Last Updated**: Nov 27, 2025

---

## 📋 Overview

The Editor provides **16 keyboard shortcuts** organized into 6 categories for efficient menu editing.

---

## 🎹 Complete Shortcut List

### Creation (2 shortcuts)

| Shortcut       | Action       | Description                      |
| -------------- | ------------ | -------------------------------- |
| `Ctrl+N`       | Add Item     | Add new item to current category |
| `Ctrl+Shift+N` | Add Category | Add new category                 |

### Editing (3 shortcuts)

| Shortcut | Action        | Description                        |
| -------- | ------------- | ---------------------------------- |
| `E`      | Edit Item     | Edit the currently selected item   |
| `Ctrl+S` | Save          | Save all changes                   |
| `Ctrl+I` | Toggle Active | Toggle item active/inactive status |

### Navigation (5 shortcuts)

| Shortcut | Action        | Description                              |
| -------- | ------------- | ---------------------------------------- |
| `Ctrl+F` | Focus Search  | Focus the search input box               |
| `↑`      | Previous Item | Select previous item in list             |
| `↓`      | Next Item     | Select next item in list                 |
| `Escape` | Close/Clear   | Close modal or clear selection           |
| `Ctrl+\` | Toggle View   | Switch between Advanced/Traditional view |

### Deletion (1 shortcut)

| Shortcut | Action      | Description                                  |
| -------- | ----------- | -------------------------------------------- |
| `Delete` | Delete Item | Delete the selected item (with confirmation) |

### Batch Actions (5 shortcuts)

| Shortcut | Action       | Description                     |
| -------- | ------------ | ------------------------------- |
| `Ctrl+L` | Languages    | Open language translation modal |
| `Ctrl+G` | Descriptions | Open AI description generator   |
| `Ctrl+U` | Images       | Open bulk image upload          |
| `Ctrl+B` | Bulk Status  | Open bulk active/inactive modal |
| `Ctrl+R` | Reorder      | Open reorder menu modal         |

### Help (1 shortcut)

| Shortcut  | Action    | Description                        |
| --------- | --------- | ---------------------------------- |
| `Shift+?` | Show Help | Open keyboard shortcuts help modal |

---

## ⚙️ Configuration

**File**: `editorShortcuts.config.ts`

### Structure

```typescript
export type EditorShortcutCategory =
  | "Creation"
  | "Editing"
  | "Navigation"
  | "Deletion"
  | "Batch Actions"
  | "Help";

export interface EditorShortcutConfig extends CategorizedShortcut {
  category: EditorShortcutCategory;
}

export const EDITOR_SHORTCUTS: Record<string, EditorShortcutConfig> = {
  ADD_ITEM: {
    key: "n",
    ctrlKey: true,
    description: "Add new item to current category",
    category: "Creation",
  },
  // ... more shortcuts
};
```

### Adding New Shortcuts

1. **Add to config:**

```typescript
// editorShortcuts.config.ts
NEW_FEATURE: {
    key: 'x',
    ctrlKey: true,
    description: 'Open new feature modal',
    category: 'Batch Actions'
}
```

2. **Register in hook:**

```typescript
// useEditorKeyboardShortcuts.ts
{
    ...EDITOR_SHORTCUTS.NEW_FEATURE,
    action: () => setIsNewFeatureModalOpen(true)
}
```

3. **Done!** - Automatically appears in help modal

---

## 🎯 Help Modal

**File**: `KeyboardShortcutsHelp.tsx`

### Features

- ✅ Auto-detects Mac vs Windows (Cmd vs Ctrl)
- ✅ Groups shortcuts by category
- ✅ Theme-aware styling (dark mode support)
- ✅ Includes usage guidance cards

### Opening

- Click keyboard icon button in header
- Press `Shift+?`

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ ⌨️ Keyboard Shortcuts                                   │
│ Work faster with these keyboard shortcuts               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│ CREATION                                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Add new item to current category      [⌘] [N]      │ │
│ └─────────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Add new category                    [⌘] [⇧] [N]    │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ EDITING                                                 │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Edit selected item                        [E]       │ │
│ └─────────────────────────────────────────────────────┘ │
│ ...                                                     │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 💡 How Selection Works                              │ │
│ │ 1. Use Arrow Up/Down to navigate through items     │ │
│ │ 2. The selected item will be highlighted           │ │
│ │ 3. Now you can use E to edit, Delete to remove...  │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ ✨ Example Workflow                                 │ │
│ │ "I want to edit the 3rd item in my menu:"          │ │
│ │ Press ↓ ↓ ↓ to navigate to item 3                  │ │
│ │ Press E to open edit modal                         │ │
│ │ Make your changes and press ⌘+S to save            │ │
│ │ Press Escape to close modal                        │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ 💡 Quick Tips                                       │ │
│ │ • Press Shift+? anytime to view these shortcuts    │ │
│ │ • Most shortcuts work in both views                │ │
│ │ • Use ⌘+F to quickly find items by searching       │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Guidance Cards

1. **How Selection Works** (Orange)

   - Step-by-step guide for item selection
   - Explains arrow key navigation

2. **Example Workflow** (Green)

   - Real-world scenario walkthrough
   - Shows complete keyboard-only workflow

3. **Quick Tips** (Blue)
   - Helpful reminders
   - Feature availability notes

---

## 🔧 Implementation Hook

**File**: `hooks/useEditorKeyboardShortcuts.ts`

### Purpose

Manages keyboard shortcuts and selection state for the editor.

### Interface

```typescript
interface UseEditorKeyboardShortcutsProps {
    enabled?: boolean;
    projectData: Project;
    setProjectData: React.Dispatch<React.SetStateAction<Project>>;
    isSaving: boolean;
    syncChanges: () => Promise<void>;
    searchInputRef: React.RefObject<any>;
    editorView: 'advanced' | 'traditional' | 'focus';
    setEditorView: (view: 'advanced' | 'traditional' | 'focus') => void;
    filteredItems?: NavigableItem[];
    // Modal setters
    setIsLanguageModalOpen: (open: boolean) => void;
    setIsDescModalOpen: (state: { active: boolean; sourceFile?: ProjectFileType }) => void;
    setIsImageModalOpen: (state: { active: boolean; item: ExtractedDataItem | null; from?: string }) => void;
    setIsBulkStatusModalOpen: (open: boolean) => void;
    setIsReorderModalOpen: (open: boolean) => void;
    setIsShortcutsHelpOpen: (open: boolean) => void;
}

interface UseEditorKeyboardShortcutsReturn {
    // Selection state
    selectedFileId: string | null;
    setSelectedFileId: (id: string | null) => void;
    selectedCategoryId: string | null;
    setSelectedCategoryId: (id: string | null) => void;
    selectedItemId: string | null;
    setSelectedItemId: (id: string | null) => void;
    // Modal state
    editCategoryModalState: EditCategoryModalState;
    setEditCategoryModalState: React.Dispatch<...>;
    editItemModalState: EditItemModalState;
    setEditItemModalState: React.Dispatch<...>;
    // Helper
    handleModalFileUpdate: (updatedFile: ProjectFileType) => void;
}
```

### Key Functions

#### Item Navigation

```typescript
const navigateItems = useCallback(
  (direction: "next" | "previous") => {
    if (filteredItems.length === 0) {
      message.info("No items to navigate");
      return;
    }

    const currentIndex = selectedItemId
      ? filteredItems.findIndex(({ item }) => item.id === selectedItemId)
      : -1;

    let newIndex: number;
    if (direction === "next") {
      newIndex = currentIndex < filteredItems.length - 1 ? currentIndex + 1 : 0;
    } else {
      newIndex = currentIndex > 0 ? currentIndex - 1 : filteredItems.length - 1;
    }

    const { item, file } = filteredItems[newIndex];
    setSelectedItemId(item.id);
    setSelectedCategoryId(item.category);
    setSelectedFileId(file.uid);

    // Scroll into view
    setTimeout(() => {
      const element = document.querySelector(`[data-item-id="${item.id}"]`);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 50);
  },
  [filteredItems, selectedItemId]
);
```

#### Toggle Active Status

```typescript
const toggleSelectedItemActive = useCallback(() => {
  const selected = getSelectedItemWithFile();
  if (!selected) {
    message.info("Select an item first (use ↑↓ arrows)");
    return;
  }

  const { item, file } = selected;
  const extractedData = removeObjRef(file.extractedData);
  extractedData.data.items = extractedData.data.items.map(
    (i: ExtractedDataItem) =>
      i.id === item.id ? { ...i, active: !i.active } : i
  );

  handleModalFileUpdate({ ...file, extractedData });
  message.success(`Item ${item.active ? "deactivated" : "activated"}`);
}, [getSelectedItemWithFile, handleModalFileUpdate]);
```

---

## 🖥️ Platform Detection

Automatically detects Mac vs Windows for correct key display:

```typescript
const isMac = useMemo(() => {
  if (typeof navigator === "undefined") return false;
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
}, []);

// Display: ⌘ on Mac, Ctrl on Windows
```

---

## 🎨 Key Display Components

### KeyboardShortcutDisplay

```typescript
<KeyboardShortcutDisplay
  keys={getShortcutDisplay(shortcut, isMac)}
  isMac={isMac}
/>
```

### KeyboardKey

```typescript
<KeyboardKey keyName="⌘" />
// Renders styled key cap
```

---

## 📊 Shortcut Categories Order

Categories are displayed in this order:

1. Creation
2. Editing
3. Navigation
4. Deletion
5. Batch Actions
6. Help

---

## 🔗 Related Files

- `Editor.tsx` - Registers shortcuts
- `hooks/useEditorKeyboardShortcuts.ts` - Implementation
- `KeyboardShortcutsHelp.tsx` - Help modal
- `KeyboardShortcutDisplay.tsx` - Key display
- `KeyboardKey.tsx` - Single key component

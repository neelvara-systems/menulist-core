# 🪟 Editor Modals

**Last Updated**: Nov 27, 2025

---

## 📋 Overview

The Editor has **8 modals** for various editing and batch operations.

| Modal                 | File                             | Size   | Shortcut  |
| --------------------- | -------------------------------- | ------ | --------- |
| Language Selector     | `LanguageSelectorModal.tsx`      | 8.8KB  | `Ctrl+L`  |
| Description Generator | `DescriptionGenerationModal.tsx` | 6.5KB  | `Ctrl+G`  |
| Image Upload          | `ImageUploadModal.tsx`           | 28.6KB | `Ctrl+U`  |
| Bulk Status           | `BulkStatusMenuModal.tsx`        | 24.5KB | `Ctrl+B`  |
| Reorder Menu          | `ReorderMenuModal.tsx`           | 20.4KB | `Ctrl+R`  |
| Edit Item             | `editItemModal.tsx`              | 24.3KB | `E`       |
| Edit Category         | `editCategoryModal.tsx`          | 8.3KB  | -         |
| Keyboard Shortcuts    | `KeyboardShortcutsHelp.tsx`      | 9.5KB  | `Shift+?` |

---

## 1️⃣ Language Selector Modal

**File**: `LanguageSelectorModal.tsx`  
**Shortcut**: `Ctrl+L`

### Purpose

Add/remove languages with AI auto-translation.

### Features

- ✅ Language selection grid
- ✅ AI auto-translation (Gemini)
- ✅ Translation progress indicator
- ✅ Multi-file support

### Flow

```
User selects new language (e.g., Spanish)
    ↓
Modal closes, loader starts
    ↓
For each file:
    - AI translates categories
    - AI translates items
    - AI translates attributes
    ↓
Success → Editor shows Spanish fields
```

### Props

```typescript
interface LanguageSelectorModalProps {
  open: boolean;
  onClose: () => void;
  selectedLanguages: string[];
  onLanguagesChange: (languages: string[]) => void;
}
```

---

## 2️⃣ Description Generation Modal

**File**: `DescriptionGenerationModal.tsx`  
**Shortcut**: `Ctrl+G`

### Purpose

AI-generated descriptions for menu items.

### Features

- ✅ Description length options (Short/Medium/Long)
- ✅ File selection
- ✅ Preview before applying
- ✅ Batch generation

### Options

| Length | Words      |
| ------ | ---------- |
| Short  | ~50 words  |
| Medium | ~100 words |
| Long   | ~150 words |

### Props

```typescript
interface DescriptionGenerationModalProps {
  open: boolean;
  onClose: () => void;
  projectData: Project;
  sourceFile?: ProjectFileType;
  onApply: (updatedProject: Project) => void;
}
```

---

## 3️⃣ Image Upload Modal

**File**: `ImageUploadModal.tsx`  
**Shortcut**: `Ctrl+U`

### Purpose

Bulk image upload and assignment to items.

### Features

- ✅ Drag & drop upload
- ✅ Multiple image selection
- ✅ Item assignment dropdown
- ✅ Image crop & resize
- ✅ Firebase Storage upload
- ✅ AI image generation (optional)

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ Add Images to Menu Items                                │
├─────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────┐ │
│ │                                                     │ │
│ │     Drag & drop images here or click to upload      │ │
│ │                                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Uploaded Images:                                        │
│ ┌────────┐ ┌────────┐ ┌────────┐                       │
│ │ img1   │ │ img2   │ │ img3   │                       │
│ │ [Crop] │ │ [Crop] │ │ [Crop] │                       │
│ │ [Del]  │ │ [Del]  │ │ [Del]  │                       │
│ └────────┘ └────────┘ └────────┘                       │
│                                                         │
│ Assign to: [▼ Select item                          ]    │
│                                                         │
│                              [Cancel]  [Upload Images]  │
└─────────────────────────────────────────────────────────┘
```

### Props

```typescript
interface ImageUploadModalProps {
  open: boolean;
  onClose: () => void;
  projectData: Project;
  selectedItem?: ExtractedDataItem;
  onUpload: (item: ExtractedDataItem, images: UserUploadedFileType[]) => void;
}
```

---

## 4️⃣ Bulk Status Modal

**File**: `BulkStatusMenuModal.tsx`  
**Shortcut**: `Ctrl+B`

### Purpose

Bulk activate/deactivate categories and items.

### Features

- ✅ Two-column checkbox interface
- ✅ Select all functionality
- ✅ Indeterminate checkbox state
- ✅ Current status display
- ✅ Multi-file support
- ✅ Real-time selection counter

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ Bulk Active/Inactive Status                             │
│                                                         │
│ Set to: (○) Active  (●) Inactive                        │
├─────────────────────────────────────────────────────────┤
│ Categories (40%)          │ Items (60%)                 │
│ ┌───────────────────────┐ │ ┌─────────────────────────┐ │
│ │ [☐] Select All        │ │ │ [☐] Select All          │ │
│ │                       │ │ │                         │ │
│ │ [☑] Appetizers Active │ │ │ [☑] Spring Rolls Active │ │
│ │ [☐] Main Course Active│ │ │ [☐] Dumplings    Active │ │
│ │ [☑] Desserts  Inactive│ │ │ [☑] Soup        Inactive│ │
│ └───────────────────────┘ │ └─────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ 2 categories, 3 items selected                          │
│                              [Cancel]  [Apply to 5 items]│
└─────────────────────────────────────────────────────────┘
```

### Props

```typescript
interface BulkStatusMenuModalProps {
  open: boolean;
  onClose: () => void;
  projectData: Project;
  onApply: (updatedProject: Project) => void;
}
```

---

## 5️⃣ Reorder Menu Modal

**File**: `ReorderMenuModal.tsx`  
**Shortcut**: `Ctrl+R`

### Purpose

Drag & drop reordering of categories and items.

### Features

- ✅ Two-column drag & drop
- ✅ Category reordering
- ✅ Item reordering within category
- ✅ Multi-file aggregation
- ✅ File name display
- ✅ Visual selection highlight

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ Reorder Menu                                            │
├─────────────────────────────────────────────────────────┤
│ Categories (40%)          │ Items (60%)                 │
│ ┌───────────────────────┐ │ ┌─────────────────────────┐ │
│ │ ≡ Appetizers          │ │ │ ≡ 1. Spring Rolls       │ │
│ │   menu-page-1.jpg     │ │ │ ≡ 2. Dumplings          │ │
│ │ ≡ Main Course ←───────│─│─│ ≡ 3. Soup               │ │
│ │   menu-page-1.jpg     │ │ │ ≡ 4. Salad              │ │
│ │ ≡ Desserts            │ │ │                         │ │
│ │   menu-page-2.jpg     │ │ │                         │ │
│ └───────────────────────┘ │ └─────────────────────────┘ │
│                                                         │
│                              [Cancel]  [Update order]   │
└─────────────────────────────────────────────────────────┘
```

### Props

```typescript
interface ReorderMenuModalProps {
  open: boolean;
  onClose: () => void;
  projectData: Project;
  onApply: (updatedProject: Project) => void;
}
```

---

## 6️⃣ Edit Item Modal

**File**: `editItemModal.tsx`  
**Shortcut**: `E` (when item selected)

### Purpose

Full item editing with all fields.

### Features

- ✅ Language tabs
- ✅ Name, description, price fields
- ✅ Attributes/variants management
- ✅ Images gallery
- ✅ Active/inactive toggle
- ✅ Category assignment
- ✅ Form validation

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ Edit Item                                               │
├─────────────────────────────────────────────────────────┤
│ [English] [Spanish] [French]                            │
│                                                         │
│ Name *                                                  │
│ [Spring Rolls                                      ]    │
│                                                         │
│ Description                                             │
│ [Crispy vegetable spring rolls served with sweet   ]    │
│ [chili sauce...                                    ]    │
│                                                         │
│ Price *                                                 │
│ [$ 8.99                                            ]    │
│                                                         │
│ Category                                                │
│ [▼ Appetizers                                      ]    │
│                                                         │
│ Variants                                                │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Small  $6.99  [Edit] [Delete]                       │ │
│ │ Large  $10.99 [Edit] [Delete]                       │ │
│ │ [+ Add Variant]                                     │ │
│ └─────────────────────────────────────────────────────┘ │
│                                                         │
│ Images                                                  │
│ ┌────────┐ ┌────────┐ [+ Add]                          │
│ │ img1   │ │ img2   │                                  │
│ └────────┘ └────────┘                                  │
│                                                         │
│ [☑] Active                                              │
│                                                         │
│                              [Cancel]  [Save Changes]   │
└─────────────────────────────────────────────────────────┘
```

### Props

```typescript
interface EditItemModalProps {
  open: boolean;
  onClose: () => void;
  item: ExtractedDataItem | null;
  file: ProjectFileType;
  categories: ExtractedDataCategory[];
  languages: string[];
  onSave: (updatedItem: ExtractedDataItem) => void;
}
```

---

## 7️⃣ Edit Category Modal

**File**: `editCategoryModal.tsx`

### Purpose

Edit category details.

### Features

- ✅ Category name (all languages)
- ✅ Active/inactive toggle
- ✅ Validation

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ Edit Category                                           │
├─────────────────────────────────────────────────────────┤
│ [English] [Spanish] [French]                            │
│                                                         │
│ Category Name *                                         │
│ [Appetizers                                        ]    │
│                                                         │
│ [☑] Active                                              │
│                                                         │
│                              [Cancel]  [Save Changes]   │
└─────────────────────────────────────────────────────────┘
```

### Props

```typescript
interface EditCategoryModalProps {
  open: boolean;
  onClose: () => void;
  category: ExtractedDataCategory | null;
  file: ProjectFileType;
  languages: string[];
  onSave: (updatedCategory: ExtractedDataCategory) => void;
}
```

---

## 8️⃣ Keyboard Shortcuts Help Modal

**File**: `KeyboardShortcutsHelp.tsx`  
**Shortcut**: `Shift+?`

### Purpose

Display all keyboard shortcuts with guidance.

### Features

- ✅ Categorized shortcuts
- ✅ Platform detection (Mac/Windows)
- ✅ Usage guidance cards
- ✅ Example workflows

See [03-keyboard-shortcuts.md](./03-keyboard-shortcuts.md) for details.

---

## 🔄 Modal State Management

All modals are controlled from `Editor.tsx`:

```typescript
// Modal states
const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
const [isDescModalOpen, setIsDescModalOpen] = useState<{
    active: boolean;
    sourceFile?: ProjectFileType;
}>({ active: false });
const [isImageModalOpen, setIsImageModalOpen] = useState<{
    active: boolean;
    item: ExtractedDataItem | null;
    from?: string;
}>({ active: false, item: null });
const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
const [isReorderModalOpen, setIsReorderModalOpen] = useState(false);
const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false);

// Edit modals from keyboard shortcuts hook
const {
    editCategoryModalState,
    setEditCategoryModalState,
    editItemModalState,
    setEditItemModalState,
} = useEditorKeyboardShortcuts({ ... });
```

---

## 🎨 Common Modal Patterns

### Width Standards

| Modal                 | Width |
| --------------------- | ----- |
| Language Selector     | 500px |
| Description Generator | 500px |
| Image Upload          | 700px |
| Bulk Status           | 900px |
| Reorder Menu          | 900px |
| Edit Item             | 600px |
| Edit Category         | 400px |
| Keyboard Shortcuts    | 600px |

### Footer Pattern

```typescript
<Flex gap={8} justify="flex-end">
  <Button onClick={onClose}>Cancel</Button>
  <Button type="primary" onClick={handleApply}>
    Apply Changes
  </Button>
</Flex>
```

### Closing Behavior

- `Escape` key closes modal
- Click outside closes modal (configurable)
- Cancel button closes modal
- Apply/Save closes modal after success

---

## 🔗 Related Files

- `Editor.tsx` - Modal state management
- `hooks/useEditorKeyboardShortcuts.ts` - Edit modal state

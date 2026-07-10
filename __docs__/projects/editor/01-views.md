# 👁️ Editor Views

**Files**: `views/AdvancedView.tsx`, `views/TraditionalView.tsx`, `views/FocusView.tsx`  
**Last Updated**: Nov 27, 2025

---

## 📋 Overview

The Editor provides **3 view modes** to accommodate different editing workflows:

| View            | Best For              | Layout                          |
| --------------- | --------------------- | ------------------------------- |
| **Advanced**    | Accuracy verification | Side-by-side (Image + Editor)   |
| **Traditional** | Large menu management | Two-column (Categories + Items) |
| **Focus**       | Single file editing   | Full-width with tabs            |

---

## 1️⃣ Advanced View (Default)

**File**: `views/AdvancedView.tsx` (4.5KB)

### Purpose

Side-by-side comparison of original menu image with extracted data for accuracy verification.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ ┌──────────────────┐ ┌────────────────────────────────┐ │
│ │                  │ │                                │ │
│ │   Menu Image     │ │      Editor Content            │ │
│ │   (Zoomable)     │ │   (Categories + Items)         │ │
│ │                  │ │                                │ │
│ │   [Zoom Controls]│ │                                │ │
│ │   [Actions]      │ │                                │ │
│ └──────────────────┘ └────────────────────────────────┘ │
│         300px min          Flexible width               │
└─────────────────────────────────────────────────────────┘
```

### Features

- ✅ Resizable Splitter (drag to resize panels)
- ✅ Zoomable image with pan controls
- ✅ File name display overlay
- ✅ Help button with controls guide
- ✅ View/Delete/Re-translate/Description buttons
- ✅ Multiple file cards (one per uploaded file)

### Props

```typescript
interface AdvancedViewProps {
  projectData: Project;
  fileProcessingId: string | null;
  splitterRefs: React.MutableRefObject<any>;
  searchTerm: string;
  filters: EditorFilters;
  setPreviewFile: (file: ProjectFileType | null) => void;
  confirmFileDeletion: (file: ProjectFileType) => void;
  onRetryTranslations: (file: ProjectFileType) => void;
  setIsDescModalOpen: (state: {
    active: boolean;
    sourceFile?: ProjectFileType;
  }) => void;
  setIsImageModalOpen: (state: {
    active: boolean;
    item?: ExtractedDataItem;
    from?: string;
  }) => void;
  setProjectData: React.Dispatch<React.SetStateAction<Project>>;
  onImageUpload: (
    selectedItem: ItemForDropdown,
    imagesToUpload: UserUploadedFileType[]
  ) => void;
  selectedItemId: string | null;
  setSelectedItemId: (id: string | null) => void;
}
```

### When to Use

- Verifying AI extraction accuracy
- Cross-referencing with original menu
- First-time menu setup

---

## 2️⃣ Traditional View

**File**: `views/TraditionalView.tsx` (54KB - largest component)

### Purpose

Category-focused editing similar to POS systems. Best for managing large menus.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ ┌──────────────────────┐ ┌────────────────────────────┐ │
│ │ Categories (40%)     │ │ Items (60%)                │ │
│ │                      │ │                            │ │
│ │ [+] Add Category     │ │ [+] Add Item               │ │
│ │ ☐ Hide Inactive      │ │ ☐ Hide Inactive            │ │
│ │                      │ │                            │ │
│ │ ▸ Appetizers (12)    │ │ #1 Spring Rolls    $8.99  │ │
│ │ ▸ Main Course (25)   │ │ #2 Dumplings       $6.99  │ │
│ │ ▸ Desserts (8)       │ │ #3 Soup            $5.99  │ │
│ │ ▸ Drinks (15)        │ │ ...                       │ │
│ └──────────────────────┘ └────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Features

- ✅ **Aggregates ALL files** (not per-file like Advanced)
- ✅ Click category → See its items
- ✅ Item count per category (filtered count when filters active)
- ✅ Hide inactive toggle (categories & items)
- ✅ Language switcher with completion stats
- ✅ Inline editing for all fields
- ✅ Quick add buttons
- ✅ Search & filter integration
- ✅ Keyboard navigation support

### Key Components

```typescript
// Category list item
<div onClick={() => setSelectedCategoryId(category.id)}>
    <LuFolderOpen />
    <Text>{category.name[activeLanguage]}</Text>
    <Tag>{filteredItemCount}</Tag>
    <Button icon={<LuPen />} /> {/* Edit */}
    <Button icon={<LuTrash2 />} /> {/* Delete */}
</div>

// Item card
<Card data-item-id={item.id}>
    <Image /> {/* Item images */}
    <Text>{item.name[activeLanguage]}</Text>
    <Tag>{item.price}</Tag>
    <Button icon={<LuPen />} /> {/* Edit */}
    <Button icon={<LuImagePlus />} /> {/* Add image */}
    <Button icon={<LuTrash2 />} /> {/* Delete */}
</Card>
```

### Props

```typescript
interface TraditionalViewProps {
  projectData: Project;
  searchTerm: string;
  filters: EditorFilters;
  setIsImageModalOpen: (state: {
    active: boolean;
    item?: ExtractedDataItem;
    from?: string;
  }) => void;
  setProjectData: React.Dispatch<React.SetStateAction<Project>>;
  onImageUpload: (...args: any[]) => void;
  setPreviewFile: (file: ProjectFileType | null) => void;
  selectedItemId?: string | null;
  setSelectedItemId?: (id: string | null) => void;
  keyboardSelectedCategoryId?: string | null;
}
```

### When to Use

- Managing large menus (50+ items)
- Non-technical users (familiar POS-like interface)
- Bulk category operations

---

## 3️⃣ Focus View

**File**: `views/FocusView.tsx` (6KB)

### Purpose

Full-width editing with file tabs for maximum editing space.

### Layout

```
┌─────────────────────────────────────────────────────────┐
│ [Tab: Menu Page 1] [Tab: Menu Page 2] [Tab: Menu Page 3]│
├─────────────────────────────────────────────────────────┤
│                                                         │
│              Full-Width Editor Content                  │
│                                                         │
│   Categories and Items displayed in collapsible         │
│   accordion style with maximum horizontal space         │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Features

- ✅ File tabs for multi-file projects
- ✅ Full-width editor content
- ✅ Maximum editing space
- ✅ Collapsible categories

### When to Use

- Single file projects
- Maximum editing space needed
- Focused editing sessions

---

## 🔄 View Switching

### UI Control

```typescript
<Segmented
  value={editorView}
  onChange={(value) =>
    setEditorView(value as "advanced" | "traditional" | "focus")
  }
  options={[
    { label: <LuLayoutGrid />, value: "advanced" },
    { label: <LuLayoutList />, value: "traditional" },
    // Focus mode planned for future
  ]}
/>
```

### Keyboard Shortcut

- `Ctrl+\` - Toggle between Advanced and Traditional views

### State Persistence

View preference is stored in component state (not persisted across sessions).

---

## 📊 Comparison Table

| Feature       | Advanced       | Traditional | Focus   |
| ------------- | -------------- | ----------- | ------- |
| Image visible | ✅ Always      | ❌ No       | ❌ No   |
| Multi-file    | Per-file cards | Aggregated  | Tabs    |
| Best for      | Verification   | Management  | Editing |
| Complexity    | Medium         | High        | Low     |
| File size     | 4.5KB          | 54KB        | 6KB     |

---

## 🎨 Styling

All views use Ant Design theme tokens for consistent styling:

```typescript
const { token } = theme.useToken();

// Selection highlight
background: isSelected ? token.colorPrimaryBg : 'transparent';
border: `2px solid ${isSelected ? token.colorPrimary : 'transparent'}`;

// Hover states
onMouseEnter={(e) => e.currentTarget.style.background = token.colorFillTertiary}
```

---

## 🔗 Related Files

- `Editor.tsx` - View switching logic
- `EditorContent.tsx` - Shared editor content component
- `hooks/useEditorLogic.ts` - Shared editing logic

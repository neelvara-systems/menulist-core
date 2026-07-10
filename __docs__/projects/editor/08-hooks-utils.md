# 🔧 Hooks & Utilities

**Files**: `hooks/useEditorLogic.ts`, `hooks/useEditorKeyboardShortcuts.ts`, `utils/editorOperations.ts`, `utils/itemFilters.ts`  
**Last Updated**: Nov 27, 2025

---

## 📋 Overview

The Editor uses custom hooks and utilities to share logic across views and components.

---

## 🪝 useEditorLogic Hook

**File**: `hooks/useEditorLogic.ts` (10.8KB)

### Purpose

Shared editing logic for EditorContent component.

### Features

- ✅ Item/category CRUD operations
- ✅ Value change handlers
- ✅ Attribute management
- ✅ Image management
- ✅ Active status toggle

### Interface

```typescript
interface UseEditorLogicProps {
  file: ProjectFileType;
  projectData: Project;
  setUpdatedFileData: (file: ProjectFileType) => void;
  setIsImageModalOpen: (state: {
    active: boolean;
    item?: ExtractedDataItem;
    from?: string;
  }) => void;
  onImageUpload: (...args: any[]) => void;
}

interface UseEditorLogicReturn {
  // State
  activeLanguage: string;
  setActiveLanguage: (lang: string) => void;

  // Handlers
  handleUpdateValue: (id: string, value: any) => void;
  handleAddItem: (categoryId: string) => void;
  handleDeleteItem: (itemId: string) => void;
  handleAddCategory: () => void;
  handleDeleteCategory: (categoryId: string) => void;
  handleToggleActive: (type: "item" | "category", id: string) => void;
  handleAddAttribute: (itemId: string) => void;
  handleDeleteAttribute: (itemId: string, attrIndex: number) => void;
  handleUpdateAttribute: (
    itemId: string,
    attrIndex: number,
    field: string,
    value: any
  ) => void;
  handleImageClick: (item: ExtractedDataItem) => void;
}
```

### Key Functions

#### handleUpdateValue

Parses ID and updates the correct field:

```typescript
const handleUpdateValue = (id: string, value: any) => {
  // ID format: "item-{categoryId}-{itemId}-{field}-{lang}"
  // or: "category-{categoryId}-{field}-{lang}"

  const parts = id.split("-");
  const type = parts[0]; // 'item' or 'category'

  if (type === "item") {
    const [, categoryId, itemId, field, lang] = parts;
    // Update item field
  } else if (type === "category") {
    const [, categoryId, field, lang] = parts;
    // Update category field
  }
};
```

#### handleAddItem

Creates new item with default values:

```typescript
const handleAddItem = (categoryId: string) => {
  const newItem: ExtractedDataItem = {
    id: getUID(),
    name: { [activeLanguage]: "New Item" },
    description: { [activeLanguage]: "" },
    price: 0,
    category: categoryId,
    active: true,
    images: [],
    attributes: [],
  };

  // Add to file's items array
};
```

---

## 🪝 useEditorKeyboardShortcuts Hook

**File**: `hooks/useEditorKeyboardShortcuts.ts` (15.5KB)

### Purpose

Manages keyboard shortcuts and selection state.

### Features

- ✅ Item/category/file selection
- ✅ Keyboard navigation
- ✅ Shortcut actions
- ✅ Modal state management

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
    // Modal setters...
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

### NavigableItem Type

```typescript
export interface NavigableItem {
  item: ExtractedDataItem;
  file: ProjectFileType;
}
```

### Key Functions

#### navigateItems

Navigate through filtered items:

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

#### getSelectedItemWithFile

Find selected item with its file:

```typescript
const getSelectedItemWithFile = useCallback(() => {
  if (!selectedItemId) return null;
  for (const file of projectData?.files || []) {
    const item = file.extractedData?.data?.items?.find(
      (i) => i.id === selectedItemId
    );
    if (item) return { item, file };
  }
  return null;
}, [projectData, selectedItemId]);
```

---

## 🛠️ editorOperations Utility

**File**: `utils/editorOperations.ts` (5.5KB)

### Purpose

Reusable CRUD operations with confirmation dialogs.

### Functions

#### confirmItemDelete

```typescript
export const confirmItemDelete = ({
  item,
  activeLanguage,
  onDelete,
}: {
  item: ExtractedDataItem;
  activeLanguage: string;
  onDelete: () => void;
}) => {
  Modal.confirm({
    title: "Delete Item",
    content: `Are you sure you want to delete "${item.name[activeLanguage]}"?`,
    okText: "Delete",
    okType: "danger",
    onOk: onDelete,
  });
};
```

#### confirmCategoryDelete

```typescript
export const confirmCategoryDelete = ({
  category,
  itemCount,
  activeLanguage,
  onDelete,
}: {
  category: ExtractedDataCategory;
  itemCount: number;
  activeLanguage: string;
  onDelete: () => void;
}) => {
  Modal.confirm({
    title: "Delete Category",
    content: `Delete "${category.name[activeLanguage]}" and its ${itemCount} items?`,
    okText: "Delete",
    okType: "danger",
    onOk: onDelete,
  });
};
```

#### createNewItem

```typescript
export const createNewItem = (
  categoryId: string,
  activeLanguage: string
): ExtractedDataItem => ({
  id: getUID(),
  name: { [activeLanguage]: "New Item" },
  description: { [activeLanguage]: "" },
  price: 0,
  category: categoryId,
  active: true,
  images: [],
  attributes: [],
});
```

#### createNewCategory

```typescript
export const createNewCategory = (
  activeLanguage: string
): ExtractedDataCategory => ({
  id: getUID(),
  name: { [activeLanguage]: "New Category" },
  active: true,
});
```

#### deleteItemById

```typescript
export const deleteItemById = (
  file: ProjectFileType,
  itemId: string
): ProjectFileType => {
  const extractedData = removeObjRef(file.extractedData);
  extractedData.data.items = extractedData.data.items.filter(
    (i: ExtractedDataItem) => i.id !== itemId
  );
  return { ...file, extractedData };
};
```

#### deleteCategory

```typescript
export const deleteCategory = (
  file: ProjectFileType,
  categoryId: string
): ProjectFileType => {
  const extractedData = removeObjRef(file.extractedData);
  // Remove category
  extractedData.data.categories = extractedData.data.categories.filter(
    (c: ExtractedDataCategory) => c.id !== categoryId
  );
  // Remove items in category
  extractedData.data.items = extractedData.data.items.filter(
    (i: ExtractedDataItem) => i.category !== categoryId
  );
  return { ...file, extractedData };
};
```

---

## 🔍 itemFilters Utility

**File**: `utils/itemFilters.ts` (3.7KB)

### Purpose

Single source of truth for item filtering logic.

### Interfaces

```typescript
export interface ItemWithFile {
  item: ExtractedDataItem;
  file: ProjectFileType;
}

export interface FilterItemsOptions {
  searchTerm?: string;
  filters?: EditorFilters;
  activeLanguage?: string;
  hideInactiveItems?: boolean;
  categoryId?: string;
}
```

### Functions

#### itemMatchesFilters

Core filtering function:

```typescript
export function itemMatchesFilters(
  item: ExtractedDataItem,
  options: FilterItemsOptions
): boolean {
  const {
    searchTerm,
    filters,
    activeLanguage = "en",
    hideInactiveItems,
    categoryId,
  } = options;

  // Category filter
  if (categoryId && item.category !== categoryId) return false;

  // Search term filter
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.toLowerCase().trim();
    const itemName = item.name?.[activeLanguage]?.toLowerCase() || "";
    const itemDesc = item.description?.[activeLanguage]?.toLowerCase() || "";
    if (!itemName.includes(term) && !itemDesc.includes(term)) return false;
  }

  // Price range filter
  if (filters?.priceRange) {
    const { min, max } = filters.priceRange;
    const price = parseFloat(
      String(item.price || "0").replace(/[^0-9.-]+/g, "")
    );
    if (min !== null && price < min) return false;
    if (max !== null && price > max) return false;
  }

  // Has image filter
  if (filters?.hasImage !== null && filters?.hasImage !== undefined) {
    const hasImages = Boolean(item.images && item.images.length > 0);
    if (hasImages !== filters.hasImage) return false;
  }

  // Active status filter
  if (filters?.activeStatus !== null && filters?.activeStatus !== undefined) {
    if (item.active !== filters.activeStatus) return false;
  }

  // Hide inactive toggle
  if (hideInactiveItems && item.active === false) return false;

  return true;
}
```

#### filterItemsWithFiles

```typescript
export function filterItemsWithFiles(
  items: ItemWithFile[],
  options: FilterItemsOptions
): ItemWithFile[] {
  return items.filter(({ item }) => itemMatchesFilters(item, options));
}
```

#### filterItems

```typescript
export function filterItems(
  items: ExtractedDataItem[],
  options: FilterItemsOptions
): ExtractedDataItem[] {
  return items.filter((item) => itemMatchesFilters(item, options));
}
```

#### hasActiveFilters

```typescript
export function hasActiveFilters(options: FilterItemsOptions): boolean {
  const { searchTerm, filters, hideInactiveItems } = options;

  return Boolean(
    hideInactiveItems ||
      (searchTerm && searchTerm.trim()) ||
      filters?.priceRange?.min !== null ||
      filters?.priceRange?.max !== null ||
      filters?.hasImage !== null ||
      filters?.activeStatus !== null
  );
}
```

---

## 📊 Usage Examples

### Using useEditorLogic

```typescript
// In EditorContent.tsx
const {
  activeLanguage,
  setActiveLanguage,
  handleUpdateValue,
  handleAddItem,
  handleDeleteItem,
  handleToggleActive,
} = useEditorLogic({
  file,
  projectData,
  setUpdatedFileData,
  setIsImageModalOpen,
  onImageUpload,
});
```

### Using useEditorKeyboardShortcuts

```typescript
// In Editor.tsx
const {
  selectedItemId,
  setSelectedItemId,
  selectedCategoryId,
  editItemModalState,
  setEditItemModalState,
  handleModalFileUpdate,
} = useEditorKeyboardShortcuts({
  enabled: true,
  projectData,
  setProjectData,
  isSaving,
  syncChanges,
  searchInputRef,
  editorView,
  setEditorView,
  filteredItems: filteredItemsForNavigation,
  setIsLanguageModalOpen,
  // ... more setters
});
```

### Using itemFilters

```typescript
// In TraditionalView.tsx
const filteredItems = useMemo(() => {
  return filterItemsWithFiles(allItemsWithFiles, {
    searchTerm,
    filters,
    activeLanguage,
    hideInactiveItems,
    categoryId: selectedCategoryId,
  });
}, [
  allItemsWithFiles,
  searchTerm,
  filters,
  activeLanguage,
  hideInactiveItems,
  selectedCategoryId,
]);
```

---

## 🔗 Related Files

- `Editor.tsx` - Uses both hooks
- `EditorContent.tsx` - Uses useEditorLogic
- `views/TraditionalView.tsx` - Uses itemFilters
- `EditorFiltersPopover.tsx` - Defines EditorFilters interface

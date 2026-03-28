# 🔍 Search & Filters

**Files**: `EditorFiltersPopover.tsx`, `utils/itemFilters.ts`  
**Last Updated**: Nov 27, 2025

---

## 📋 Overview

The Editor provides powerful search and filtering capabilities to help users find and manage menu items efficiently.

---

## 🔎 Search

### Location

Search input is in the Editor header, accessible via `Ctrl+F`.

### Behavior

- **Real-time filtering** as you type
- **Multi-field search** - searches in:
  - Item name
  - Item description
  - Category name (in TraditionalView)
- **Case-insensitive**
- **Respects active language**

### Implementation

```typescript
// In Editor.tsx
const [searchTerm, setSearchTerm] = useState("");

<Input
  ref={searchInputRef}
  placeholder="Search items..."
  prefix={<LuSearch />}
  value={searchTerm}
  onChange={(e) => setSearchTerm(e.target.value)}
  allowClear
/>;
```

### Keyboard Shortcut

- `Ctrl+F` - Focus search box
- `Escape` - Clear search and blur

---

## 🎛️ Filter Popover

**File**: `EditorFiltersPopover.tsx`

### Features

- ✅ Category filter (dropdown)
- ✅ Price range filter (min/max)
- ✅ Has image filter (Yes/No/All)
- ✅ Active status filter (Active/Inactive/All)
- ✅ Badge showing active filter count
- ✅ Clear all button
- ✅ Apply/Cancel workflow

### Layout

```
┌─────────────────────────────────────┐
│ Filters                             │
├─────────────────────────────────────┤
│ Category                            │
│ [▼ All categories              ]    │
├─────────────────────────────────────┤
│ Price Range                         │
│ [$ Min    ] to [$ Max    ]          │
├─────────────────────────────────────┤
│ Images                              │
│ [▼ All items                   ]    │
├─────────────────────────────────────┤
│ Status                              │
│ [▼ All statuses                ]    │
├─────────────────────────────────────┤
│ [Clear All]  [Apply Filters (3)]    │
└─────────────────────────────────────┘
```

### Filter Interface

```typescript
export interface EditorFilters {
  category: string | null;
  priceRange: {
    min: number | null;
    max: number | null;
  };
  hasImage: boolean | null;
  activeStatus: boolean | null;
}
```

### Props

```typescript
interface EditorFiltersPopoverProps {
  categories: { id: string; name: Record<string, string> }[];
  activeLanguage: string;
  filters: EditorFilters;
  onFiltersChange: (filters: EditorFilters) => void;
}
```

### Filter Options

#### Category Filter

```typescript
<Select
  placeholder="All categories"
  allowClear
  value={localFilters.category}
  onChange={(value) =>
    setLocalFilters({
      ...localFilters,
      category: value || null,
    })
  }
  options={categories.map((cat) => ({
    label: cat.name[activeLanguage],
    value: cat.id,
  }))}
/>
```

#### Price Range Filter

```typescript
<Flex gap={8} align="center">
  <InputNumber
    placeholder="Min"
    min={0}
    value={localFilters.priceRange.min}
    onChange={(value) =>
      setLocalFilters({
        ...localFilters,
        priceRange: { ...localFilters.priceRange, min: value },
      })
    }
    prefix="$"
  />
  <Text type="secondary">to</Text>
  <InputNumber
    placeholder="Max"
    min={0}
    value={localFilters.priceRange.max}
    onChange={(value) =>
      setLocalFilters({
        ...localFilters,
        priceRange: { ...localFilters.priceRange, max: value },
      })
    }
    prefix="$"
  />
</Flex>
```

#### Has Image Filter

```typescript
<Select
  placeholder="All items"
  allowClear
  options={[
    { label: "Has image", value: true },
    { label: "No image", value: false },
  ]}
/>
```

#### Active Status Filter

```typescript
<Select
  placeholder="All statuses"
  allowClear
  options={[
    { label: "Active", value: true },
    { label: "Inactive", value: false },
  ]}
/>
```

### Badge Count

Shows count of **applied** filters (not pending):

```typescript
const appliedFilterCount = [
  filters.category !== null,
  filters.priceRange.min !== null || filters.priceRange.max !== null,
  filters.hasImage !== null,
  filters.activeStatus !== null,
].filter(Boolean).length;

<Badge count={appliedFilterCount} offset={[-5, 5]}>
  <Button icon={<LuFilter />}>Filters</Button>
</Badge>;
```

---

## 🛠️ Filter Utilities

**File**: `utils/itemFilters.ts`

### Purpose

Single source of truth for item filtering logic used across all views.

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

#### `itemMatchesFilters`

Core function that checks if an item passes all filters:

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
  if (categoryId && item.category !== categoryId) {
    return false;
  }

  // Search term filter
  if (searchTerm && searchTerm.trim()) {
    const term = searchTerm.toLowerCase().trim();
    const itemName = item.name?.[activeLanguage]?.toLowerCase() || "";
    const itemDesc = item.description?.[activeLanguage]?.toLowerCase() || "";
    if (!itemName.includes(term) && !itemDesc.includes(term)) {
      return false;
    }
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

  // Hide inactive items toggle
  if (hideInactiveItems && item.active === false) {
    return false;
  }

  return true;
}
```

#### `filterItemsWithFiles`

Filters items that include file references:

```typescript
export function filterItemsWithFiles(
  items: ItemWithFile[],
  options: FilterItemsOptions
): ItemWithFile[] {
  return items.filter(({ item }) => itemMatchesFilters(item, options));
}
```

#### `filterItems`

Filters plain item arrays:

```typescript
export function filterItems(
  items: ExtractedDataItem[],
  options: FilterItemsOptions
): ExtractedDataItem[] {
  return items.filter((item) => itemMatchesFilters(item, options));
}
```

#### `hasActiveFilters`

Checks if any filters are currently active:

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

## 📊 Filter Results Display

When filters are active, shows count of matching items:

```typescript
{
  (searchTerm || hasActiveFilters) && (
    <Alert
      message={
        <Text>
          Showing <Text strong>{filteredItems.length}</Text> of{" "}
          <Text strong>{totalItems}</Text> items
          {filteredCategories.length < totalCategories && (
            <Text type="secondary">
              {" "}
              in {filteredCategories.length} categories
            </Text>
          )}
        </Text>
      }
      type="info"
      closable
    />
  );
}
```

---

## 🔄 Hide Inactive Toggle

Separate from filters, each view has a "Hide inactive" toggle:

```typescript
<Switch
    checked={hideInactiveItems}
    onChange={setHideInactiveItems}
/>
<Text>Hide inactive</Text>
```

This is passed to filter functions as `hideInactiveItems` option.

---

## 📱 Usage in Views

### TraditionalView

```typescript
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

### AdvancedView

```typescript
// Filters passed to EditorContent
<EditorContent
  searchTerm={searchTerm}
  filters={filters}
  // ...
/>
```

---

## 🎯 Best Practices

1. **Use shared utilities** - Always use `itemFilters.ts` functions
2. **Memoize filtered results** - Use `useMemo` to prevent recalculation
3. **Show filter status** - Display count of filtered items
4. **Provide clear all** - Easy way to reset all filters
5. **Badge count** - Show number of active filters

---

## 🔗 Related Files

- `Editor.tsx` - Search state management
- `EditorFiltersPopover.tsx` - Filter UI
- `utils/itemFilters.ts` - Filter logic
- `views/TraditionalView.tsx` - Filter usage
- `hooks/useEditorKeyboardShortcuts.ts` - Filtered navigation

# Editor Update Flow Documentation

## Overview

This document details how category/item CRUD operations work in the editor across all three views (Advanced, Traditional, Focus) for both:

1. **Master/Single Store Business** - Standard operation
2. **Multi-Chain Local Outlet** - When `masterProjectId` is present (linked store)

**Key Principle:** No extra Firebase fetch calls after initial project load. All edits operate on local state, with debounced autosave to Firestore.

---

## 1. Architecture Overview

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           INITIAL LOAD (ONE TIME)                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ProjectSelector → selectedProject (metadata)                              │
│                           ↓                                                 │
│   SWR Fetch → activeProject (full data) [1 Firestore read]                 │
│                           ↓                                                 │
│   Editor.tsx → projectData = removeObjRef(activeProject) [local copy]      │
│                           ↓                                                 │
│   If masterProjectId → resolveProjectForRender() [0-1 Firestore read]      │
│                           ↓                                                 │
│   Sets: itemStates, isMasterLinked (for UI badges)                         │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                      EDITING (ALL LOCAL - NO FETCHES)                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   User Action → Handler → setProjectData() → Local State Update            │
│                                    ↓                                        │
│                         hasChanges = true                                   │
│                                    ↓                                        │
│                    Debounced Autosave (5s delay, 30s min interval)         │
│                                    ↓                                        │
│                         syncChanges() → updateProject() [1 Firestore write]│
│                                    ↓                                        │
│                    setActiveProject() + setProjectData() [sync contexts]   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Files

| File                                   | Purpose                                          | Lines  |
| -------------------------------------- | ------------------------------------------------ | ------ |
| `editorView/Editor.tsx`                | Main state, autosave, multi-outlet resolution    | 1-1056 |
| `editorView/hooks/useEditorLogic.ts`   | Shared CRUD handlers for views                   | 1-388  |
| `editorView/utils/editorOperations.ts` | Pure functions: create/delete with ID generation | 1-249  |
| `editorView/editItemModal.tsx`         | Item edit/add modal with save handler            | 1-590  |
| `editorView/editCategoryModal.tsx`     | Category edit/add modal with save handler        | 1-413  |
| `editorView/views/AdvancedView.tsx`    | Advanced view (file-based)                       | 1-143  |
| `editorView/views/TraditionalView.tsx` | Traditional view (cross-file aggregation)        | 1-1246 |
| `editorView/views/FocusView.tsx`       | Focus view (tabbed interface)                    | 1-167  |

---

## 2. State Management

### Editor.tsx Core State

```typescript
// File: src/components/templates/main-app/projects/editorView/Editor.tsx
// Lines: 103-130

// Main project data - LOCAL COPY of activeProject
const [projectData, setProjectData] = useState<Project>(
  removeObjRef(activeProject), // Deep clone to avoid mutations
);

// Change tracking for autosave
const [hasChanges, setHasChanges] = useState(false);
const hasChangesRef = useRef(false);

// Multi-outlet state (only populated if masterProjectId exists)
const [itemStates, setItemStates] = useState<Record<string, InheritanceState>>(
  {},
);
const [isMasterLinked, setIsMasterLinked] = useState(false);
```

### Change Detection

```typescript
// File: src/components/templates/main-app/projects/editorView/Editor.tsx
// Lines: 168-172

useEffect(() => {
  const changesFound = !isSameObjects(activeProject, projectData);
  setHasChanges(changesFound);
  hasChangesRef.current = changesFound;
}, [activeProject, projectData]);
```

---

## 3. CRUD Operations

### 3.1 CREATE Operations

#### Create Category

**Flow:**

```
handleAddCategory() → createNewCategory() → setEditCategoryModalState()
                                                    ↓
                                         Modal opens with new category
                                                    ↓
                                         User clicks Save
                                                    ↓
                                         onSave() → setUpdatedFileData()
                                                    ↓
                                         setProjectData() updates files array
```

**Code Reference - ID Generation:**

```typescript
// File: src/components/templates/main-app/projects/editorView/utils/editorOperations.ts
// Lines: 28-55

export const createNewCategory = (
  file: ProjectFileType,
  languages: string[],
  masterProjectId?: string, // ← Multi-outlet check
): ExtractedDataCategory => {
  let categoryId: string;

  if (masterProjectId) {
    // Linked store: use local-only prefix (L_C_)
    categoryId = generateLocalCategoryId(); // e.g., "L_C_1705123456789_abc123"
  } else {
    // Standalone store: use file-based sequential ID
    const categories = file.extractedData?.data?.categories || [];
    const sequenceId =
      categories.length > 0
        ? Number(
            categories[categories.length - 1]?.id?.split(`${file.uid}c`)[1],
          ) + 1 || 1
        : 1;
    categoryId = `${file.uid}c${sequenceId}`; // e.g., "file123c1"
  }

  return {
    id: categoryId,
    name: Object.fromEntries(languages.map((lang) => [lang, ""])),
    active: true,
  };
};
```

#### Create Item

**Flow:**

```
handleAddItem(categoryId) → createNewItem() → setEditItemModalState()
                                                    ↓
                                         Modal opens with new item
                                                    ↓
                                         User clicks Save
                                                    ↓
                                         onSave() → setUpdatedFileData()
                                                    ↓
                                         setProjectData() updates files array
```

**Code Reference - ID Generation:**

```typescript
// File: src/components/templates/main-app/projects/editorView/utils/editorOperations.ts
// Lines: 64-95

export const createNewItem = (
  file: ProjectFileType,
  categoryId: string,
  languages: string[],
  masterProjectId?: string, // ← Multi-outlet check
): ExtractedDataItem => {
  let itemId: string;

  if (masterProjectId) {
    // Linked store: use local-only prefix (L_I_)
    itemId = generateLocalItemId(); // e.g., "L_I_1705123456789_xyz789"
  } else {
    // Standalone store: use file-based sequential ID
    const items = file.extractedData?.data?.items || [];
    const sequenceId =
      items.length > 0
        ? Number(items[items.length - 1]?.id?.split(`${file.uid}i`)[1]) + 1 || 1
        : 1;
    itemId = `${file.uid}i${sequenceId}`; // e.g., "file123i1"
  }

  return {
    id: itemId,
    description: Object.fromEntries(languages.map((lang) => [lang, ""])),
    name: Object.fromEntries(languages.map((lang) => [lang, ""])),
    category: categoryId,
    price: "",
    attributes: [],
    active: true,
    available: true,
  };
};
```

### 3.2 UPDATE Operations

#### Update Item (via Modal)

**Code Reference:**

```typescript
// File: src/components/templates/main-app/projects/editorView/editItemModal.tsx
// Lines: 130-175

const onSave = () => {
  if (!modalData.item || !itemData) return;

  // Deep clone to ensure immutability
  const extractedData = removeObjRef(fileData.extractedData);

  if (modalData.status === "add") {
    // Add new item immutably
    extractedData.data.items = [...(extractedData.data.items || []), itemData];
  } else {
    // Update existing item immutably
    extractedData.data.items = extractedData.data.items.map(
      (item: ExtractedDataItem) => (item.id === itemData.id ? itemData : item),
    );
  }

  setUpdatedFileData({ ...fileData, extractedData });
  onClose();
};
```

#### Inline Value Update

**Code Reference:**

```typescript
// File: src/components/templates/main-app/projects/editorView/hooks/useEditorLogic.ts
// Lines: 198-204

const onChangeValue = useCallback(
  (id: string, newValue: string) => {
    const updated = handleUpdateValue(fileRef.current, id, newValue);
    setUpdatedFileData(updated);
  },
  [setUpdatedFileData],
);
```

### 3.3 DELETE Operations

#### Delete Category

**Flow:**

```
confirmCategoryDeletion() → Modal.confirm() → handleDeleteCategory()
                                                    ↓
                                         deleteCategory() [pure function]
                                                    ↓
                                         Removes category + all its items
                                                    ↓
                                         setUpdatedFileData() → setProjectData()
```

**Code Reference:**

```typescript
// File: src/components/templates/main-app/projects/editorView/utils/editorOperations.ts
// Lines: 101-118

export const deleteCategory = (
  file: ProjectFileType,
  categoryId: string,
): any => {
  if (!file.extractedData?.data) {
    return file.extractedData;
  }
  const extractedData = removeObjRef(file.extractedData);

  // Remove category
  extractedData.data.categories =
    extractedData.data.categories?.filter(
      (cat: ExtractedDataCategory) => cat.id !== categoryId,
    ) || [];

  // Remove all items in that category
  extractedData.data.items =
    extractedData.data.items?.filter(
      (item: ExtractedDataItem) => item.category !== categoryId,
    ) || [];

  return extractedData;
};
```

#### Delete Item

**Code Reference:**

```typescript
// File: src/components/templates/main-app/projects/editorView/utils/editorOperations.ts
// Lines: 120-135

export const deleteItem = (
  file: ProjectFileType,
  categoryId: string,
  itemId: string,
): any => {
  if (!file.extractedData?.data) {
    return file.extractedData;
  }
  const extractedData = removeObjRef(file.extractedData);
  extractedData.data.items =
    extractedData.data.items?.filter(
      (item: ExtractedDataItem) =>
        !(item.category === categoryId && item.id === itemId),
    ) || [];
  return extractedData;
};
```

---

## 4. Autosave Mechanism

### Configuration

```typescript
// File: src/components/templates/main-app/projects/editorView/../constants.ts

export const AUTOSAVE_DEBOUNCE_MS = 5000; // 5 seconds after last change
export const AUTOSAVE_MIN_INTERVAL_MS = 30000; // Minimum 30 seconds between saves
```

### Implementation

```typescript
// File: src/components/templates/main-app/projects/editorView/Editor.tsx
// Lines: 415-445

useEffect(() => {
  if (!hasChanges) return;

  const now = Date.now();
  const last = lastAutoSaveRef.current;
  const timeSinceLast = last ? now - last : Number.POSITIVE_INFINITY;

  // Compute delay: max of debounce and min interval
  const baseDelay = AUTOSAVE_DEBOUNCE_MS;
  const minIntervalDelay =
    timeSinceLast >= AUTOSAVE_MIN_INTERVAL_MS
      ? 0
      : AUTOSAVE_MIN_INTERVAL_MS - timeSinceLast;

  const delay = Math.max(baseDelay, minIntervalDelay);

  const timeoutId = window.setTimeout(async () => {
    if (!hasChangesRef.current) return;
    await syncChanges();
    lastAutoSaveRef.current = Date.now();
  }, delay);

  return () => window.clearTimeout(timeoutId);
}, [projectData, hasChanges]);
```

### syncChanges Function

```typescript
// File: src/components/templates/main-app/projects/editorView/Editor.tsx
// Lines: 321-355

const syncChanges = useCallback(
  async (updatedData: Project = projectData) => {
    // Only sync when there are real changes
    if (!activeProject || isSameObjects(activeProject, updatedData)) {
      return;
    }

    setIsSaving(true);
    dispatch(startLoader("syncing changes"));
    try {
      const updatedProject = await updateProject({
        ...updatedData,
        projectId: selectedProject.projectId,
      });
      if (updatedProject) {
        setHasChanges(false);
        setProjectData(updatedProject);
        setActiveProject(updatedProject); // Sync context
        setLastSavedAt(Date.now());
      }
    } catch (error) {
      console.error("Syncing changes failed:", error);
    } finally {
      dispatch(stopLoader("syncing changes"));
      setIsSaving(false);
    }
  },
  [
    activeProject,
    dispatch,
    projectData,
    selectedProject.projectId,
    setActiveProject,
  ],
);
```

---

## 5. View-Specific Implementations

### 5.1 Advanced View

**File:** `src/components/templates/main-app/projects/editorView/views/AdvancedView.tsx`

- Uses `EditorContent` for each file
- File-based organization (one panel per file)
- Passes `setUpdatedFileData` to update specific file in `projectData.files[]`

```typescript
// Lines: 80-100
const setUpdatedFileData = useCallback(
  (updatedFile: ProjectFileType) => {
    setProjectData((prev) => ({
      ...prev,
      files: prev.files.map((f) =>
        f.uid === updatedFile.uid ? updatedFile : f,
      ),
    }));
  },
  [setProjectData],
);
```

### 5.2 Traditional View

**File:** `src/components/templates/main-app/projects/editorView/views/TraditionalView.tsx`

- Aggregates all categories/items across ALL files
- Uses `allCategoriesWithFiles` and `allItemsWithFiles` memos
- Each operation tracks which file the item belongs to

```typescript
// Lines: 234-257
const allCategoriesWithFiles = useMemo(() => {
  const categories: {
    category: ExtractedDataCategory;
    file: ProjectFileType;
  }[] = [];
  projectData?.files?.forEach((file) => {
    file.extractedData?.data?.categories?.forEach((category) => {
      categories.push({ category, file });
    });
  });
  return categories;
}, [projectData?.files]);
```

### 5.3 Focus View

**File:** `src/components/templates/main-app/projects/editorView/views/FocusView.tsx`

- Tabbed interface per file
- Uses same `EditorContent` component as Advanced View
- Single file focus at a time

---

## 6. Multi-Outlet Specific Behavior

### 6.1 ID Generation Decision Tree

```
Creating new item/category?
├── masterProjectId exists (linked store)?
│   └── YES → Use L_I_/L_C_ prefix (local-only)
│             generateLocalItemId() or generateLocalCategoryId()
│             These items are NEVER synced to master
│
└── NO (master or standalone store)
    └── Use file-based sequential ID
        `${file.uid}i${sequenceId}` or `${file.uid}c${sequenceId}`
```

### 6.2 Inheritance State Tracking

```typescript
// File: src/components/templates/main-app/projects/editorView/Editor.tsx
// Lines: 207-228

useEffect(() => {
  // Only resolve if: flag enabled + has projectId + is linked to master
  if (
    !FEATURE_FLAGS.ENABLE_MULTI_OUTLET ||
    !activeProject?.projectId ||
    !activeProject?.masterProjectId
  )
    return;

  const loadResolvedProject = async () => {
    try {
      const resolved = await resolveProjectForRender({
        storeProject: activeProject,
      });
      if (resolved._resolved) {
        setIsMasterLinked(resolved._resolved.isMasterLinked);
        setItemStates(resolved._resolved.itemStates || {});
      }
    } catch (error) {
      console.error("[Multi-outlet] Failed to load resolved project:", error);
    }
  };

  loadResolvedProject();
}, [activeProject]);
```

### 6.3 UI Badge Integration

The `itemStates` map is passed down to views for displaying inheritance badges:

```typescript
// itemStates[itemId] can be:
// - "inherited"  → Item comes from master, not overridden
// - "overridden" → Item comes from master, has local override
// - "local-only" → Item created locally (L_I_ prefix)
```

---

## 7. Data Flow Summary by Operation

### Create Item (Linked Store)

```
1. User clicks "Add Item" in category
2. handleAddItem(categoryId) called
3. createNewItem() generates L_I_ prefixed ID
4. Modal opens with new item data
5. User fills form, clicks Save
6. onSave() adds item to extractedData.data.items[]
7. setUpdatedFileData() updates file in projectData.files[]
8. setProjectData() triggers hasChanges = true
9. Autosave timer starts (5s debounce)
10. After 5s: syncChanges() → updateProject() [1 Firestore write]
11. Local states updated: setActiveProject() + setProjectData()

Total Firebase reads: 0
Total Firebase writes: 1 (debounced)
```

### Update Item (Any Store)

```
1. User edits item via modal or inline
2. onChangeValue() or onSave() called
3. Local state update via setUpdatedFileData()
4. setProjectData() triggers hasChanges = true
5. Autosave handles write after debounce

Total Firebase reads: 0
Total Firebase writes: 1 (debounced)
```

### Delete Category (Linked Store - Local Only)

```
1. User clicks delete on L_C_ category
2. confirmCategoryDeletion() shows modal
3. User confirms
4. deleteCategory() removes category + its items
5. setUpdatedFileData() → setProjectData()
6. Autosave writes to Firestore

Total Firebase reads: 0
Total Firebase writes: 1 (debounced)
```

---

## 8. Important Constraints

### No Extra Firebase Fetches

| Operation               | Firebase Reads         | Firebase Writes |
| ----------------------- | ---------------------- | --------------- |
| Initial project load    | 1 (SWR)                | 0               |
| Multi-outlet resolution | 0-1 (master if linked) | 0               |
| Create item/category    | 0                      | 1 (debounced)   |
| Update item/category    | 0                      | 1 (debounced)   |
| Delete item/category    | 0                      | 1 (debounced)   |
| Bulk operations         | 0                      | 1 (debounced)   |

### ID Generation is Local

- For linked stores: `generateLocalItemId()` / `generateLocalCategoryId()` use `crypto.randomUUID()` - no server call
- For standalone: Sequential ID based on existing items in local state - no server call

### Immutability Pattern

All operations use `removeObjRef()` (deep clone) before mutation:

```typescript
const extractedData = removeObjRef(fileData.extractedData);
// Now safe to mutate extractedData
```

---

## 9. File References Quick Lookup

| Purpose                     | File                             | Key Lines |
| --------------------------- | -------------------------------- | --------- |
| Main editor state           | `Editor.tsx`                     | 103-130   |
| Change detection            | `Editor.tsx`                     | 168-172   |
| Autosave effect             | `Editor.tsx`                     | 415-445   |
| syncChanges                 | `Editor.tsx`                     | 321-355   |
| Multi-outlet resolution     | `Editor.tsx`                     | 207-228   |
| useEditorLogic hook         | `hooks/useEditorLogic.ts`        | 43-388    |
| createNewCategory           | `utils/editorOperations.ts`      | 28-55     |
| createNewItem               | `utils/editorOperations.ts`      | 64-95     |
| deleteCategory              | `utils/editorOperations.ts`      | 101-118   |
| deleteItem                  | `utils/editorOperations.ts`      | 120-135   |
| Item modal save             | `editItemModal.tsx`              | 130-175   |
| Category modal save         | `editCategoryModal.tsx`          | 170-191   |
| TraditionalView aggregation | `views/TraditionalView.tsx`      | 234-257   |
| AdvancedView file update    | `views/AdvancedView.tsx`         | 80-100    |
| Local ID generators         | `src/types/multiOutlet.types.ts` | 85-96     |

---

## 10. Summary

| Aspect           | Master/Single Store | Linked Store (masterProjectId)      |
| ---------------- | ------------------- | ----------------------------------- |
| Initial load     | 1 read (SWR)        | 2 reads (SWR + master resolve)      |
| New item ID      | `{fileUid}i{seq}`   | `L_I_{timestamp}_{uuid}`            |
| New category ID  | `{fileUid}c{seq}`   | `L_C_{timestamp}_{uuid}`            |
| Edit operation   | Local state only    | Local state only                    |
| Delete operation | Local state only    | Local state only (local items only) |
| Autosave         | Debounced 5s        | Debounced 5s                        |
| UI badges        | None                | inherited/overridden/local-only     |
| Extra fetches    | None                | None after initial                  |

**Key Takeaway:** After the initial project load (+ optional master resolution for linked stores), ALL editing operations work purely on local React state with debounced writes to Firestore. No additional Firebase reads are performed during editing.

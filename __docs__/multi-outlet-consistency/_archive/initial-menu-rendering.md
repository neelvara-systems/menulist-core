# Initial Menu Rendering Flow

> **Document Purpose:** Explain exactly how menu data is fetched and rendered in both Dashboard (editor) and Customer-facing (public menu) contexts, with specific focus on multi-outlet resolution.

---

## Overview

There are **two main rendering contexts**:

| Context             | Entry Point                         | User             | Purpose                    |
| ------------------- | ----------------------------------- | ---------------- | -------------------------- |
| **Dashboard**       | `projects/index.tsx` → `Editor.tsx` | Restaurant staff | Edit menu, apply overrides |
| **Customer-facing** | `_client/[[...slug]]/page.tsx`      | End customer     | View published menu        |

---

## 1. Dashboard Flow (Editor)

### Step-by-Step Data Flow

```
┌─────────────────────┐
│  ProjectSelector    │  User clicks a project card
│  (L1-377)           │
└─────────┬───────────┘
          │ onClick → setSelectedProject(project)
          ▼
┌─────────────────────┐
│  index.tsx          │  State: selectedProject (ProjectMetadata)
│  (L60)              │
└─────────┬───────────┘
          │ selectedProject.projectId changes
          ▼
┌─────────────────────┐
│  SWR Fetcher        │  Fetches full project data
│  (L156-178)         │  getProjectData(selectedProject.projectId)
└─────────┬───────────┘
          │ Returns: activeProject (Project with files, items, etc.)
          ▼
┌─────────────────────┐
│  ProjectsDataContext│  Provides activeProject to child components
│  (L934-935)         │
└─────────┬───────────┘
          │ Context value passed down
          ▼
┌─────────────────────┐
│  Editor.tsx         │  Receives activeProject from context
│  (L100-101)         │
└─────────┬───────────┘
          │ useEffect triggers on activeProject change
          ▼
┌─────────────────────┐
│  Multi-Outlet       │  IF masterProjectId exists:
│  Resolution         │  - Fetch master project (1 Firestore read)
│  (L207-228)         │  - Merge master + store overrides
│                     │  - Set itemStates for UI badges
└─────────┴───────────┘
```

### Detailed Code References

#### Step 1: User Selects Project

**File:** `src/components/templates/main-app/projects/ProjectDetails/ProjectSelector.tsx`
**Lines:** 52-120

```typescript
// CatalogCard component - user clicks to select
<Flex ... onClick={onSelect}>
```

The `onSelect` prop calls `handleSelectProject` in parent component.

#### Step 2: Selected Project State Updated

**File:** `src/components/templates/main-app/projects/index.tsx`
**Lines:** 60-61

```typescript
const [selectedProject, setSelectedProject] = useState<ProjectMetadata | null>(
  null,
);
```

When user clicks a project card, `setSelectedProject(project)` is called with the **metadata only** (lightweight object without full file data).

#### Step 3: SWR Fetches Full Project Data

**File:** `src/components/templates/main-app/projects/index.tsx`
**Lines:** 156-178

```typescript
const { data: activeProject, mutate: mutateProject } = useSWR(
  projectDataCacheKey, // Key changes when selectedProject.projectId changes
  async () => {
    if (!selectedProject?.projectId) return null;
    const project = await getProjectData(selectedProject.projectId);
    // ... language defaults
    return project;
  },
  { dedupingInterval: REFRESH_INTERVALS.SWR_DEDUPE },
);
```

**Key insight:** `getProjectData()` fetches the **store's project data** from Firestore. This is the data that the store has saved, including any local overrides.

#### Step 4: Context Provides Data to Editor

**File:** `src/components/templates/main-app/projects/index.tsx`
**Lines:** 934-935

```typescript
<ProjectsDataProvider
    contextData={{
        activeProject,
        setActiveProject: (data) => mutateProject(data, { revalidate: false }),
        // ...
    }}>
```

#### Step 5: Editor Receives Data

**File:** `src/components/templates/main-app/projects/editorView/Editor.tsx`
**Lines:** 100-104

```typescript
const { activeProject, setActiveProject, setCurrentView } =
  useContext<ProjectsDataProviderType>(ProjectsDataContext);
const [projectData, setProjectData] = useState<Project>(
  removeObjRef(activeProject),
);
```

**Key insight:** `projectData` is local state copied from `activeProject`. All edits happen on `projectData` until saved.

#### Step 6: Multi-Outlet Resolution (If Linked to Master)

**File:** `src/components/templates/main-app/projects/editorView/Editor.tsx`
**Lines:** 207-228

```typescript
useEffect(() => {
  if (!FEATURE_FLAGS.ENABLE_MULTI_OUTLET || !activeProject?.projectId) return;

  const loadResolvedProject = async () => {
    try {
      // Pass existing project data to avoid redundant Firestore reads
      const resolved = await resolveProjectForRender({
        storeProject: activeProject, // ✅ Uses existing data, no re-fetch
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

**What `resolveProjectForRender` does:**

1. **If no masterProjectId:** Returns store project as-is with `isMasterLinked: false`
2. **If has masterProjectId:**
   - Fetches master project (1 Firestore read)
   - Merges master items with store overrides
   - Builds `itemStates` map showing inheritance status of each item
   - Returns resolved project with `_resolved` metadata

---

## 2. Multi-Outlet Resolution Logic

**File:** `src/lib/multiOutlet/resolveProject.ts`
**Lines:** 84-130

### Decision Tree

```
storeProject.masterProjectId exists?
├── NO → Return store project as-is
│        isMasterLinked: false
│        itemStates: {}
│        Firestore reads: 0
│
└── YES → Fetch master project
          Merge master + store data
          Build itemStates
          isMasterLinked: true
          Firestore reads: 1
```

### Merge Logic (Simplified)

```typescript
// For each master item:
const storeOverride = storeProject.overrides?.items?.[masterItem.id];
const resolvedItem = {
  ...masterItem,
  // Override fields take precedence
  price: storeOverride?.price ?? masterItem.price,
  available: storeOverride?.available ?? masterItem.available,
};

// Track inheritance state
itemStates[masterItem.id] = {
  source: storeOverride ? "overridden" : "inherited",
  hasOverride: !!storeOverride,
};

// Also include store's local-only items (L_I_ prefix)
const localItems = storeItems.filter((i) => i.id.startsWith("L_I_"));
```

---

## 3. Customer-Facing Flow (Public Menu)

### ✅ Implementation (COMPLETED)

**File:** `src/app/_client/[[...slug]]/page.tsx`

```
┌─────────────────────┐
│  HTTP Request       │  joespizza.menulist.ai/lunch-menu
│                     │
└─────────┬───────────┘
          │ Extract subdomain/custom domain
          ▼
┌─────────────────────┐
│  getTenantFromHeaders│  Get tenantId, storeId from domain
│  (L32-40)           │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  getProjectBySlugOr │  Find project by slug or default
│  Default (L101-179) │  → getProjectData(projectId)
│                     │  → resolveProjectForRender() if linked
└─────────┬───────────┘
          │ Returns resolved project data
          ▼
┌─────────────────────┐
│  ClientMenuRenderer │  Renders the menu
│  (L365-370)         │
└─────────────────────┘
```

### Code Reference

**File:** `src/app/_client/[[...slug]]/page.tsx`
**Lines:** 154-176

```typescript
// Fetch full project data
let projectData = await getProjectData(
  targetProject.projectId || targetProject.id,
);
if (!projectData) return null;

// Multi-outlet: Resolve linked store data by merging with master
// This ensures customers see the complete menu with inherited items + local overrides
if (FEATURE_FLAGS.ENABLE_MULTI_OUTLET && projectData.masterProjectId) {
  try {
    const resolved = await resolveProjectForRender({
      storeProject: projectData,
    });
    projectData = resolved;
  } catch (error) {
    console.error(
      "[Multi-outlet] Failed to resolve project for customer view:",
      error,
    );
    // Graceful degradation: show raw store data if resolution fails
  }
}
```

### ✅ All Scenarios Handled

| Scenario                           | Expected             | Status   |
| ---------------------------------- | -------------------- | -------- |
| Master store menu                  | Works as-is          | ✅ Works |
| Single-store (no master)           | Works as-is          | ✅ Works |
| Linked store (has masterProjectId) | Shows merged menu    | ✅ Works |
| Resolution fails                   | Graceful degradation | ✅ Works |

---

## 4. Data Flow Comparison

### Dashboard (Editor)

```
selectedProject (metadata) → SWR fetch → activeProject (full data)
                                              ↓
                            resolveProjectForRender(storeProject: activeProject)
                                              ↓
                            resolved._resolved.itemStates → UI badges
                                              ↓
                            projectData (local state) → render editor
```

**Firebase Reads:**

- 1 read: Store project data (via SWR)
- 0-1 read: Master project (only if linked)
- **Total: 1-2 reads**

### Customer-Facing (Implemented ✅)

```
domain → tenant lookup → getProjectBySlugOrDefault → projectData
                                                          ↓
                         resolveProjectForRender(storeProject: projectData)
                                                          ↓
                                                 resolved → render
```

**Firebase Reads:**

- 1 read: Store project data
- 0-1 read: Master project (only if linked)
- **Total: 1-2 reads**

---

## 5. Summary

| Aspect                   | Dashboard                    | Customer-Facing                |
| ------------------------ | ---------------------------- | ------------------------------ |
| Entry point              | `projects/index.tsx`         | `_client/[[...slug]]/page.tsx` |
| Initial fetch            | SWR + `getProjectData`       | `getProjectBySlugOrDefault`    |
| Multi-outlet resolution  | ✅ `resolveProjectForRender` | ✅ `resolveProjectForRender`   |
| Firestore reads (linked) | 2                            | 2                              |
| Status                   | ✅ Working                   | ✅ Working                     |

---

## 6. File References Quick Lookup

| Purpose                              | File                                 | Lines   |
| ------------------------------------ | ------------------------------------ | ------- |
| Project selector UI                  | `ProjectDetails/ProjectSelector.tsx` | 52-120  |
| Selected project state               | `projects/index.tsx`                 | 60-61   |
| SWR project fetch                    | `projects/index.tsx`                 | 156-178 |
| Context provider                     | `projects/index.tsx`                 | 934-935 |
| Editor receives data                 | `editorView/Editor.tsx`              | 100-104 |
| Multi-outlet resolution (Editor)     | `editorView/Editor.tsx`              | 207-228 |
| Resolver function                    | `lib/multiOutlet/resolveProject.ts`  | 84-130  |
| Customer-facing page                 | `_client/[[...slug]]/page.tsx`       | 101-179 |
| Customer-facing multi-outlet resolve | `_client/[[...slug]]/page.tsx`       | 161-176 |

---

## 7. Next Steps

1. ~~**Fix customer-facing page** to call `resolveProjectForRender()` for linked stores~~ ✅ DONE
2. **Add server-side caching** for master project data (optional, for high traffic)
3. **Test end-to-end** with linked store accessing public menu

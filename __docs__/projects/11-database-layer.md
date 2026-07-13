# Database Layer (Historical Reference)

**Status:** Retained migration-era reference; code snippets below are not current implementation contracts.  
**Current authority:** `src/database/projects/index.ts` and `__docs__/projects/project-management/`.  
**Last reviewed:** July 13, 2026.

The current DAL uses scoped `projects/{tId}/{sId}/{projectId}` documents plus `platformSummary/projects_{sId}`. Create, metadata, active, delete, restore, and duplicate lifecycle paths now use atomic batch/transaction boundaries; deterministic default retries cannot overwrite existing menu data; summary metadata merges are transaction-current; current and legacy project reads validate exact document scope; and generated project-image persistence updates only `projectImage`. Do not copy the older sequential `setDoc()` examples in this document into runtime code.

---

## Architecture

### **Collection Structure (NEW - Dec 2025)**

```
Firestore:
├── platformSummary/projects_{sId}              ← NEW: Summary document (1 read for listing)
│   └── {
│         lastUpdated: Timestamp,
│         projects: {
│           [projectId]: { name, description, active, isDefault }
│         }
│       }
│
└── projects/{tId}/{sId}/{projectId}            ← Full project data + lifecycle flags
    └── {
          projectId, files[], languages[], config,
          active, deleted, deletedAt,              ← Lifecycle flags for Cloud Functions
          createdOn, modifiedOn
        }
```

### **DEPRECATED (Do Not Use)**

```
❌ projectsMetadata/{tId}/{sId}/{projectId}     ← DEPRECATED: Use projectsSummary instead
```

### **Why Summary Document Pattern?**

| Approach                              | Reads to List 10 Projects | Cost |
| ------------------------------------- | ------------------------- | ---- |
| ❌ Old: `projectsMetadata` collection | 10 reads                  | High |
| ✅ New: `projectsSummary` document    | 1 read                    | Low  |

**Benefits**:

- **90% fewer reads** for project listing
- **Consistent pattern** with `storesSummary`
- **Faster dashboard load** (single document fetch)

### **Data Split Strategy**

| Data                                   | Location              | Purpose                   |
| -------------------------------------- | --------------------- | ------------------------- |
| `name, description, active, isDefault` | `projectsSummary`     | Listing/UI (1 read)       |
| `active, deleted, deletedAt`           | `projects` collection | Cloud Functions, recovery |
| `files[], config, languages[]`         | `projects` collection | Full project data         |

> **Note**: `active` is denormalized in both locations for different query needs.

---

## Standard DAL Pattern

### **1. Collection References**

```typescript
import { DB_COLLECTIONS } from "@constant/database";
import { collection, doc, serverTimestamp } from "@firebase/firestore";
import { firebaseClient } from "@lib/firebase/firebaseClient";
import getActiveSession from "@lib/auth/getActiveSession";

const DATA_COLLECTION = DB_COLLECTIONS.PROJECTS;
const PLATFORM_SUMMARY = DB_COLLECTIONS.PLATFORM_SUMMARY;

let session: any = null;

// Projects data collection ref
const getDataCollectionRef = async () => {
  session = Boolean(session) ? session : await getActiveSession();
  return collection(
    firebaseClient,
    `${DATA_COLLECTION}/${session.tId}/${session.sId}`,
  );
};

// Projects data document ref
const getDataDocRef = async (projectId: string) => {
  session = Boolean(session) ? session : await getActiveSession();
  return doc(
    firebaseClient,
    `${DATA_COLLECTION}/${session.tId}/${session.sId}`,
    projectId,
  );
};

// ═══════════════════════════════════════════════════════════════
// PROJECTS SUMMARY (Summary Document Pattern)
// ═══════════════════════════════════════════════════════════════

// Get projectsSummary document ref: platformSummary/projects_{sId}
const getProjectsSummaryDocRef = async () => {
  session = Boolean(session) ? session : await getActiveSession();
  return doc(firebaseClient, PLATFORM_SUMMARY, `projects_${session.sId}`);
};

// Sync project to summary (called on create/update)
const syncProjectToSummary = async (
  projectId: string,
  data: ProjectSummaryData,
) => {
  const summaryRef = await getProjectsSummaryDocRef();
  await setDoc(
    summaryRef,
    {
      lastUpdated: serverTimestamp(),
      [`projects.${projectId}`]: data,
    },
    { merge: true },
  );
};

// Remove project from summary (called on delete)
const removeProjectFromSummary = async (projectId: string) => {
  const summaryRef = await getProjectsSummaryDocRef();
  await setDoc(
    summaryRef,
    {
      lastUpdated: serverTimestamp(),
      [`projects.${projectId}`]: deleteField(),
    },
    { merge: true },
  );
};
```

**Key Patterns**:

- ✅ Always use `DB_COLLECTIONS` constants
- ✅ Session cached for performance
- ✅ Summary document: `platformSummary/projects_{sId}`
- ✅ Multi-tenant path for data: `projects/{tId}/{sId}`

---

## CRUD Operations

### **Create Project**

```typescript
export const addProject = async (data: Partial<ProjectMetadata>) => {
  return await apiCallComposer(
    async () => {
      // 1. Generate project ID
      let projectId = data.projectId;
      if (!projectId) {
        const sess = await getActiveSession();
        const timestamp = Date.now().toString(36);
        projectId = `${sess.tId}-${timestamp}-${sess.sId}`;
      }

      // 2. Create project data (main document with lifecycle flags)
      const projectData = await requestBodyComposer({
        projectId,
        files: [],
        active: true, // Lifecycle flag for Cloud Functions
        deleted: false, // Lifecycle flag for Cloud Functions
        config: {
          design: {
            home: { style: DEFAULTS.home.style },
            menu: { mood: DEFAULTS.menu.mood, layout: DEFAULTS.menu.layout },
          },
        },
      }, { isNew: true });

      // 3. Save to projects collection
      const dataRef = doc(await getDataCollectionRef(), projectId);
      await setDoc(dataRef, projectData);

      // 4. Sync to projectsSummary (1 write for efficient listing)
      const summaryData: ProjectSummaryData = {
        name: data.name || "Untitled",
        description: data.description,
        active: true,
        isDefault: data.isDefault,
      };
      await syncProjectToSummary(projectId, summaryData);

      return { projectId, projectData, summaryData };
    },
    data,
    "addProject",
  );
};
```

**Key Points**:

- Uses `requestBodyComposer` (auto-adds createdOn/modifiedOn)
- Wrapped in `apiCallComposer` (error handling, logging)
- **Creates project document** with lifecycle flags (`active`, `deleted`)
- **Syncs to projectsSummary** for efficient listing
- Generates unique project ID: `{tId}-{timestamp36}-{sId}`

### **Read Operations**

#### **List Projects (Summary Document - 1 Read)**

```typescript
export const getProjectsList = async () => {
  return await apiCallComposer(
    async () => {
      // Get all projects from summary (1 read)
      const summaryDoc = await getDoc(await getProjectsSummaryDocRef());
      const projectsMap = summaryDoc.exists()
        ? summaryDoc.data()?.projects || {}
        : {};

      // Convert to array and filter active projects
      const projects = Object.entries(projectsMap)
        .map(([projectId, data]) => ({
          projectId,
          ...(data as ProjectSummaryData),
        }))
        .filter((p) => p.active !== false);

      console.log(
        `✅ [getProjectsList] Found ${projects.length} active projects (1 read)`,
      );

      // Auto-create default project if none exist
      if (projects.length === 0) {
        session = Boolean(session) ? session : await getActiveSession();
        const projectId = `${session.tId}-default-${session.sId}`;
        const defaultProject: ProjectMetadata = {
          projectId,
          name: "Menu",
          description: "Your digital menu",
          isDefault: true,
        };
        await addProject(defaultProject);
        return {
          projects: [
            {
              projectId,
              name: defaultProject.name,
              active: true,
              isDefault: true,
            },
          ],
        };
      }

      return { projects };
    },
    null,
    "getProjectsList",
  );
};

// Legacy alias for backward compatibility
export const getMetadataProjectsList = getProjectsList;
```

**Features**:

- **Single document read** (vs N reads with old pattern)
- Filters inactive projects client-side
- Auto-creates default project
- Returns lightweight summary data only

#### **Get Full Project Data**

```typescript
export const getProjectData = async (projectId: string): Promise<Project> => {
  return await apiCallComposer(
    async () => {
      const docRef = await getDataDocRef(projectId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Project not found");
      }

      return docSnap.data() as Project;
    },
    { projectId },
    "getProjectData",
  );
};
```

#### **Get Complete Project (Summary + Data)**

```typescript
export const getProject = async (projectId: string) => {
  return await apiCallComposer(
    async () => {
      // Get summary data (for name, description, active, isDefault)
      const summaryDoc = await getDoc(await getProjectsSummaryDocRef());
      const summaryData = summaryDoc.exists()
        ? summaryDoc.data()?.projects?.[projectId]
        : null;

      // Get full project data
      const projectDoc = await getDoc(await getDataDocRef(projectId));

      if (projectDoc.exists()) {
        return {
          ...summaryData, // name, description, active, isDefault
          ...projectDoc.data(), // files, config, etc.
        };
      }
      return null;
    },
    projectId,
    "getProject",
  );
};
```

### **Update Operations**

#### **Update Project Metadata (Summary)**

```typescript
export const updateProjectMetadata = async (
  projectId: string,
  data: Partial<ProjectSummaryData>,
) => {
  return await apiCallComposer(
    async () => {
      // Update projectsSummary document
      await syncProjectToSummary(projectId, data as ProjectSummaryData);
      return { projectId, ...data };
    },
    { projectId, data },
    "updateProjectMetadata",
  );
};
```

> **Note**: This only updates summary fields (name, description, active, isDefault). For full project data, use `updateProject`.

#### **Update Project Data**

```typescript
export const updateProject = async (data: Partial<Project>) => {
  return await apiCallComposer(
    async () => {
      const updateData = await requestBodyComposer(data, { isNew: false });
      await setDoc(await getDataDocRef(data.projectId), updateData, {
        merge: true,
      });
      return updateData;
    },
    data,
    "updateProject",
  );
};
```

**Key Points**:

- Uses `{ merge: true }` to update fields without overwriting
- `requestBodyComposer` updates `modifiedOn` timestamp
- Wrapped in `apiCallComposer` for error handling

#### **Publish Project (Upload Base64 Files)**

```typescript
export const publishProject = async (data: Partial<Project>) => {
  return await apiCallComposer(
    async () => {
      const updatedData = await requestBodyComposer(data, { isNew: false });

      // Upload any base64 files to Storage
      if (data.files?.length) {
        for (let i = 0; i < data.files.length; i++) {
          if (updatedData.files[i].url.includes("base64")) {
            updatedData.files[i].url = await uploadProjectFile(
              {
                fileType: data.files[i].type,
                fileToUpdate: data.files[i].url,
              },
              "files",
              data.projectId,
              data.files[i].name,
            );
          }
        }
      }

      await setDoc(await getDataDocRef(data.projectId), updatedData, {
        merge: true,
      });
      return updatedData;
    },
    data,
    "publishProject",
  );
};
```

**Purpose**: Convert base64 URLs to permanent Storage URLs before publishing.

### **Delete Operation (Soft Delete)**

```typescript
export const deleteProject = async (projectId: string) => {
  return await apiCallComposer(
    async () => {
      // Mark project as deleted in projects collection
      const updateData = {
        deleted: true,
        deletedAt: Timestamp.now(),
        active: false,
      };
      await setDoc(await getDataDocRef(projectId), updateData, { merge: true });

      // Remove from projectsSummary (deleted projects don't appear in listing)
      await removeProjectFromSummary(projectId);

      return { projectId, ...updateData };
    },
    projectId,
    "deleteProject",
  );
};
```

**Key Changes (Dec 2025)**:

- Lifecycle flags (`deleted`, `active`) stored in **projects collection** (for Cloud Functions)
- Deleted projects **removed from projectsSummary** (not shown in listing)
- Data remains for recovery

**Why Soft Delete?**

- Data recovery possible
- Audit trail preserved
- No file cleanup needed immediately
- Can schedule hard delete later

---

### **Restore Deleted Project**

```typescript
export const restoreProject = async (projectId: string) => {
  return await apiCallComposer(
    async () => {
      // Get project data to restore summary info
      const projectDoc = await getDoc(await getDataDocRef(projectId));
      if (!projectDoc.exists()) {
        throw new Error("Project not found");
      }

      // Restore project flags in projects collection
      const updateData = { deleted: false, deletedAt: null, active: true };
      await setDoc(await getDataDocRef(projectId), updateData, { merge: true });

      // Re-add to projectsSummary
      const projectData = projectDoc.data();
      await syncProjectToSummary(projectId, {
        name: projectData.name || "Restored Project",
        description: projectData.description,
        active: true,
        isDefault: projectData.isDefault,
      });

      return { projectId, ...updateData };
    },
    projectId,
    "restoreProject",
  );
};
```

**Features**:

- Reverts soft delete by setting `deleted: false`
- Clears `deletedAt` timestamp
- Reactivates project (`active: true`)
- **Re-adds to projectsSummary** for listing
- All project data and files remain intact

---

### **Get Deleted Projects List**

```typescript
export const getDeletedProjectsList = async () => {
  return await apiCallComposer(
    async () => {
      // Query projects collection for deleted projects
      const dataRef = await getDataCollectionRef();
      const deletedQuery = query(
        dataRef,
        where("deleted", "==", true),
        orderBy("deletedAt", "desc"),
      );

      const snapshot = await getDocs(deletedQuery);
      const projects = snapshot.docs.map((doc) => ({
        projectId: doc.id,
        ...doc.data(),
      }));

      return { projects };
    },
    null,
    "getDeletedProjectsList",
  );
};
```

**Features**:

- Queries **projects collection** (not summary) for deleted flag
- Ordered by deletion date (most recent first)
- Returns project data including name for recovery UI

**Use Cases**:

- Admin "Recycle Bin" view
- Data recovery interface
- Audit and compliance reports

---

**Hard Delete Code** (commented out but available):

```typescript
/* Hard delete logic preserved for reference:
// Get project data to find uploaded files
const projectDoc = await getDoc(await getDataDocRef(projectId));
if (projectDoc.exists()) {
    const projectData = projectDoc.data() as Project;

    // Delete uploaded files from Storage
    const deletePromises: Promise<any>[] = [];
    if (projectData.files?.length) {
        projectData.files.forEach(file => {
            if (file.url && !file.url.includes('base64')) {
                deletePromises.push(deleteFileByUrl(file.url));
            }
        });
    }
    await Promise.all(deletePromises);
}

// Delete Firestore documents
await deleteDoc(await getMetadataDocRef(projectId));
await deleteDoc(await getDataDocRef(projectId));
*/
```

---

## File Upload Helper

```typescript
export const uploadFile = async (
  data: UserUploadedFileType,
  from: string = "files",
) => {
  let fileUrl: any = "";
  const docId = `${new Date().getTime()}-${data.uid}`;

  if (data.url && data.url.includes("base64")) {
    // Upload base64 to Firebase Storage
    fileUrl = await uploadBase64ToStorage({
      fileId: docId,
      url: data.url,
      path: `MenuListAi/project/${from}/${docId}`,
      type: data.type,
    });
    return fileUrl;
  }
  return "";
};
```

**Storage Paths**:

- Project files: `MenuListAi/project/files/{timestamp}-{uid}`
- Project assets: `MenuListAi/project/{type}/{timestamp}-{uid}`

---

## Helper Functions

### **Upload Project File (Internal)**

```typescript
export const uploadProjectFile = async (
  data: any,
  type = "",
  projectId: string,
  fileId: string,
) => {
  let newUrl: any = "";
  let fileType: any = data.fileType;
  let fileToUpdate: any = data.fileToUpdate;
  const docId = `${projectId}/${fileId}`;

  if (fileToUpdate && fileToUpdate.includes("base64")) {
    newUrl = await uploadBase64ToStorage({
      fileId: docId,
      url: fileToUpdate,
      path: `${DATA_COLLECTION}/${type}/${docId}`,
      type: fileType,
    });
  }
  return newUrl;
};
```

---

## Best Practices

### **1. Always Use apiCallComposer**

```typescript
// ✅ CORRECT
export const myFunction = async (data: any) => {
  return await apiCallComposer(
    async () => {
      // Your logic
    },
    data,
    "myFunction",
  );
};

// ❌ WRONG
export const myFunction = async (data: any) => {
  try {
    // Your logic
  } catch (error) {
    console.error(error);
  }
};
```

**Benefits**:

- Automatic error handling
- Consistent logging
- Redux integration
- Session management

### **2. Always Use requestBodyComposer for Writes**

```typescript
// ✅ CORRECT
const updateData = await requestBodyComposer({
  name: "New Name",
  active: true,
}, { isNew: false });
// Adds modifiedOn/modifiedBy without changing creation metadata.

// ❌ WRONG
const updateData = {
  name: "New Name",
  active: true,
  // Missing timestamps!
};
```

### **3. Always Use Collection Constants**

```typescript
// ✅ CORRECT
const DATA_COLLECTION = DB_COLLECTIONS.PROJECTS;
const PLATFORM_SUMMARY = DB_COLLECTIONS.PLATFORM_SUMMARY;

// ❌ WRONG
const DATA_COLLECTION = "projects";
```

### **4. Always Cache Session**

```typescript
// ✅ CORRECT
let session: any = null;

const getCollectionRef = async () => {
    session = Boolean(session) ? session : await getActiveSession();
    return collection(firebaseClient, `${COLLECTION}/${session.tId}/${session.sId}`);
}

// ❌ WRONG (fetches session every time)
const getCollectionRef = async () => {
    const session = await getActiveSession();
    return collection(...);
}
```

### **5. Always Use Multi-Tenant Paths**

```typescript
// ✅ CORRECT
`${COLLECTION}/${session.tId}/${session.sId}` // ❌ WRONG (no tenant isolation)
`${COLLECTION}`;
```

---

## Error Handling

### **Common Patterns**

```typescript
// Document not found
if (!docSnap.exists()) {
  throw new Error("Project not found");
}

// Invalid data
if (!data.projectId) {
  throw new Error("Project ID required");
}

// Permission denied (caught by apiCallComposer)
// Network errors (caught by apiCallComposer)
```

### **Error Response Format**

```typescript
// Success
{
    success: true,
    data: { /* result */ }
}

// Error (from apiCallComposer)
{
    success: false,
    error: "Error message"
}
```

---

## Query Patterns

### **List Active Projects (Use Summary)**

```typescript
// ✅ PREFERRED: Use projectsSummary (1 read)
const summaryDoc = await getDoc(await getProjectsSummaryDocRef());
const projects = summaryDoc.data()?.projects || {};
const activeProjects = Object.entries(projects).filter(
  ([_, data]) => data.active !== false,
);
```

### **Query Deleted Projects (Use Collection)**

```typescript
// Query projects collection for deleted flag
const q = query(
  await getDataCollectionRef(),
  where("deleted", "==", true),
  orderBy("deletedAt", "desc"),
);
```

### **Cloud Function Queries (Use Collection)**

```typescript
// Cloud Functions query projects collection directly
const q = query(
  await getDataCollectionRef(),
  where("deleted", "==", false),
  where("active", "==", true),
);
```

---

## Performance Optimization

### **1. Summary Document Pattern (NEW)**

```typescript
// ✅ FAST: List projects from summary (1 read, ~1KB)
const { projects } = await getProjectsList();

// Only when needed: Load full project data
const project = await getProjectData(projectId); // ~5MB
```

| Operation        | Old Pattern | New Pattern | Savings |
| ---------------- | ----------- | ----------- | ------- |
| List 10 projects | 10 reads    | 1 read      | 90%     |
| List 50 projects | 50 reads    | 1 read      | 98%     |

### **2. Use Merge Updates**

```typescript
// Updates only specified fields
await setDoc(docRef, { active: true }, { merge: true });

// Overwrites entire document
await setDoc(docRef, { active: true }); // ❌ Loses other fields!
```

### **3. Batch Writes**

```typescript
// For multiple updates (not yet implemented)
const batch = writeBatch(firebaseClient);
batch.update(docRef1, data1);
batch.update(docRef2, data2);
await batch.commit();
```

---

## Write Discipline Rule (Feb 2026)

> **Rule:** Every project document write MUST be justified and categorized.

### Allowed Write Paths

| Category               | Writer                                                      | Function/Pattern                                              | Justification                                                                                                                       |
| ---------------------- | ----------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| **DAL (primary)**      | `updateProject()`                                           | `setDoc(merge: true)` via `apiCallComposer`                   | Standard write path — handles timestamps, error logging, MOL change detection, master cache invalidation, operationalVersion signal |
| **DAL (publish)**      | `publishProject()`                                          | `setDoc(merge: true)` + Storage uploads                       | Theme publishing — converts base64 to Storage URLs before write                                                                     |
| **DAL (lifecycle)**    | `setProjectActive()`, `deleteProject()`, `restoreProject()` | `setDoc(merge: true)`                                         | Lifecycle toggles — minimal field writes                                                                                            |
| **Multi-outlet admin** | `multiOutlet/index.ts` functions                            | Direct `updateDoc` on specific fields                         | Structural operations (link, unlink, overrides) — field-level writes, no need for full project overhead                             |
| **Awareness**          | `useMasterUpdateAwareness.acknowledge()`                    | Direct `updateDoc` on `masterSnapshot` field                  | Snapshot write — not an operational change, must bypass change detection                                                            |
| **Extraction apply**   | `applyExtractionChanges()`                                  | Single atomic `updateDoc` with full `files` array + overrides | AI extraction results — read once, mutate in-memory, write once                                                                     |
| **Cloud Function**     | `saveFilesToProject()`                                      | `projectRef.set(merge: true)`                                 | Server-side after AI processing — first extraction auto-save                                                                        |
| **Maintenance**        | `removePresetFromAllCategories()`                           | `setDoc(merge: true)` per project                             | Settings cascade — rare admin operation                                                                                             |

### Rules for New Write Paths

1. **Default: use `updateProject()` DAL** — gets timestamps, error handling, MOL detection for free
2. **Direct `updateDoc` allowed ONLY if:**
   - Writing specific fields (not full project) AND
   - Full `updateProject()` overhead is unjustified (e.g., structural admin ops, snapshot writes)
3. **Never scatter new `updateDoc` calls** without documenting them here
4. **Extraction apply MUST remain single atomic write** — never regress to multi-write loop

---

## Security

### **1. Multi-Tenant Isolation**

All queries automatically scoped by:

- `tId` (tenant ID)
- `sId` (store ID)

```typescript
// Projects data scoped by tenant/store
`projects/${session.tId}/${session.sId}`;

// Summary document scoped by store
`platformSummary/projects_${session.sId}`;
```

`platformSummary/projects_{sId}` and `platformSummary/campaigns_{sId}` writes are allowed only when Firestore auth claims prove the user belongs to that store (`storeId` or `storeIds`) and has a tenant write role. This is required for mobile and desktop active-store/outlet context because `session.sId` may differ from the user's login store.

### **2. Soft Delete**

```typescript
// Deleted projects removed from summary (not shown in listing)
// But kept in projects collection for recovery
await removeProjectFromSummary(projectId);
```

### **3. Session Validation**

```typescript
// Session always checked by getActiveSession()
// Invalid sessions throw error before query
```

---

## Testing

### **Unit Test Pattern**

```typescript
describe("Projects DAL", () => {
  test("should create project", async () => {
    const data = {
      name: "Test Project",
      description: "Test",
    };

    const result = await addProject(data);

    expect(result.metadataData.name).toBe("Test Project");
    expect(result.metadataData.projectId).toBeDefined();
  });

  test("should list projects", async () => {
    const projects = await getMetadataProjectsList();
    expect(Array.isArray(projects)).toBe(true);
  });
});
```

---

## Migration Guide

### **Adding New Fields**

```typescript
// 1. Update type definition
interface Project {
  // ... existing fields
  newField?: string; // Add optional field
}

// 2. Update in requestBodyComposer call
const data = await requestBodyComposer({
  ...existingData,
  newField: "value",
}, { isNew: false });

// 3. Use merge to preserve existing data
await setDoc(docRef, data, { merge: true });
```

### **Backfill projectsSummary (One-Time Migration)**

```typescript
// Temporary function to migrate existing projects to summary pattern
export const backfillProjectsSummary = async () => {
  // Get all projects from projects collection
  const dataRef = await getDataCollectionRef();
  const snapshot = await getDocs(dataRef);

  // Build summary from projects data
  const summaryData: Record<string, ProjectSummaryData> = {};

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const projectId = data.projectId || docSnap.id;

    // Skip deleted projects
    if (data.deleted === true) continue;

    summaryData[projectId] = {
      name: data.name || "Untitled",
      description: data.description || "",
      active: data.active !== false,
      isDefault: data.isDefault || projectId.includes("-default-"),
    };
  }

  // Save to projectsSummary
  const summaryRef = await getProjectsSummaryDocRef();
  await setDoc(summaryRef, {
    lastUpdated: serverTimestamp(),
    projects: summaryData,
  });
};
```

> **Note**: Delete this function after migration is complete.

---

## Types Reference

```typescript
// Summary data stored in platformSummary/projects_{sId}
interface ProjectSummaryData {
  name: string;
  description?: string;
  active: boolean;
  isDefault?: boolean;
}

// Full project data stored in projects/{tId}/{sId}/{projectId}
interface Project {
  projectId: string;
  files: ProjectFileEntry[];
  languages: string[];
  config: ProjectConfig;
  active: boolean; // Lifecycle flag
  deleted: boolean; // Lifecycle flag
  deletedAt?: Timestamp;
  createdOn: Timestamp;
  modifiedOn: Timestamp;
}
```

---

**[← Back to Overview](./00-overview.md)** | **[Next: API Routes →](./12-api-routes.md)**

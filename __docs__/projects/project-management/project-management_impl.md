# Project Management — Implementation

**Feature:** Project CRUD Operations & Lifecycle  
**Status:** ✅ Production Ready  
**Last Updated:** January 2026

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│ TWO-COLLECTION PATTERN                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  projectsMetadata/{tId}/{sId}/{projectId}                       │
│       │                                                          │
│       └── Lightweight: name, thumbnail, active, deleted         │
│           Used for: List views, quick loading                   │
│                                                                  │
│  projectsData/{tId}/{sId}/{projectId}                           │
│       │                                                          │
│       └── Full data: files, languages, theme, settings          │
│           Used for: Editor, full project operations             │
│                                                                  │
│  Benefits:                                                       │
│   • Fast list loading (small documents)                         │
│   • Lazy loading of heavy data                                  │
│   • Efficient Firestore reads                                   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
src/database/projects/
└── index.ts                    # Project DAL (281 lines)

src/components/templates/main-app/projects/
├── index.tsx                   # Main projects page
├── projectsList/               # Project listing
└── editorView/                 # Project editing
```

---

## Database Operations

### Add Project

```typescript
export const addProject = async (projectData: Partial<Project>) => {
  return await apiCallComposer(
    async () => {
      const session = await getActiveSession();

      // Generate project ID
      const projectId = doc(collection(db, "temp")).id;

      // Prepare metadata
      const metadata = requestBodyComposer(
        {
          projectId,
          name: projectData.name,
          description: projectData.description || "",
          thumbnail: projectData.thumbnail || "",
          active: true,
          deleted: false,
        },
        session
      );

      // Prepare full data
      const data = requestBodyComposer(
        {
          projectId,
          files: projectData.files || [],
          languages: projectData.languages || [],
          themeConfig: projectData.themeConfig || {},
          menuSettings: projectData.menuSettings || {},
        },
        session
      );

      // Write both documents
      const batch = writeBatch(db);

      batch.set(
        doc(db, "projectsMetadata", session.tId, session.sId, projectId),
        metadata
      );

      batch.set(
        doc(db, "projectsData", session.tId, session.sId, projectId),
        data
      );

      await batch.commit();

      return { projectId };
    },
    {},
    "addProject"
  );
};
```

### Get Projects List

```typescript
export const getMetadataProjectsList = async (
  pageSize = 20,
  lastDoc?: DocumentSnapshot
) => {
  return await apiCallComposer(
    async () => {
      const session = await getActiveSession();

      let q = query(
        collection(db, "projectsMetadata", session.tId, session.sId),
        where("deleted", "==", false),
        orderBy("modifiedOn", "desc"),
        limit(pageSize)
      );

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);

      return {
        projects: snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })),
        lastDoc: snapshot.docs[snapshot.docs.length - 1],
        hasMore: snapshot.docs.length === pageSize,
      };
    },
    {},
    "getMetadataProjectsList"
  );
};
```

### Get Single Project

```typescript
export const getProjectData = async (projectId: string) => {
  return await apiCallComposer(
    async () => {
      const session = await getActiveSession();

      const docRef = doc(
        db,
        "projectsData",
        session.tId,
        session.sId,
        projectId
      );

      const snapshot = await getDoc(docRef);

      if (!snapshot.exists()) {
        throw new Error("Project not found");
      }

      return { id: snapshot.id, ...snapshot.data() };
    },
    {},
    "getProjectData"
  );
};
```

### Update Project

```typescript
export const updateProject = async (
  projectId: string,
  updates: Partial<Project>
) => {
  return await apiCallComposer(
    async () => {
      const session = await getActiveSession();

      const dataRef = doc(
        db,
        "projectsData",
        session.tId,
        session.sId,
        projectId
      );

      await updateDoc(dataRef, {
        ...updates,
        modifiedOn: serverTimestamp(),
      });

      // Update metadata if name/description changed
      if (updates.name || updates.description) {
        const metaRef = doc(
          db,
          "projectsMetadata",
          session.tId,
          session.sId,
          projectId
        );

        await updateDoc(metaRef, {
          ...(updates.name && { name: updates.name }),
          ...(updates.description && { description: updates.description }),
          modifiedOn: serverTimestamp(),
        });
      }

      return { success: true };
    },
    {},
    "updateProject"
  );
};
```

### Soft Delete

```typescript
export const deleteProject = async (projectId: string) => {
  return await apiCallComposer(
    async () => {
      const session = await getActiveSession();

      const metaRef = doc(
        db,
        "projectsMetadata",
        session.tId,
        session.sId,
        projectId
      );

      await updateDoc(metaRef, {
        deleted: true,
        deletedAt: Date.now(),
        modifiedOn: serverTimestamp(),
      });

      return { success: true };
    },
    {},
    "deleteProject"
  );
};
```

### Restore Project

```typescript
export const restoreProject = async (projectId: string) => {
  return await apiCallComposer(
    async () => {
      const session = await getActiveSession();

      const metaRef = doc(
        db,
        "projectsMetadata",
        session.tId,
        session.sId,
        projectId
      );

      await updateDoc(metaRef, {
        deleted: false,
        deletedAt: null,
        modifiedOn: serverTimestamp(),
      });

      return { success: true };
    },
    {},
    "restoreProject"
  );
};
```

### List Deleted Projects

```typescript
export const getDeletedProjectsList = async () => {
  return await apiCallComposer(
    async () => {
      const session = await getActiveSession();

      const q = query(
        collection(db, "projectsMetadata", session.tId, session.sId),
        where("deleted", "==", true),
        orderBy("deletedAt", "desc")
      );

      const snapshot = await getDocs(q);

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    },
    {},
    "getDeletedProjectsList"
  );
};
```

---

## Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }

    function belongsToTenant(tId) {
      return request.auth.token.tId == tId;
    }

    function isTenantAdmin(tId, sId) {
      return isAuthenticated()
             && request.auth.token.tId == tId
             && request.auth.token.sId == sId;
    }

    // Projects Metadata
    match /projectsMetadata/{tId}/{sId}/{projectId} {
      allow read: if isAuthenticated() && belongsToTenant(tId);
      allow write: if isTenantAdmin(tId, sId);
    }

    // Projects Data
    match /projectsData/{tId}/{sId}/{projectId} {
      allow read: if isAuthenticated() && belongsToTenant(tId);
      allow write: if isTenantAdmin(tId, sId);
    }
  }
}
```

---

## Validation Checklist

| Requirement        | Implementation            | Location          | Status |
| ------------------ | ------------------------- | ----------------- | ------ |
| Create project     | addProject()              | projects/index.ts | ✅     |
| List projects      | getMetadataProjectsList() | projects/index.ts | ✅     |
| Get single project | getProjectData()          | projects/index.ts | ✅     |
| Update project     | updateProject()           | projects/index.ts | ✅     |
| Soft delete        | deleteProject()           | projects/index.ts | ✅     |
| Restore            | restoreProject()          | projects/index.ts | ✅     |
| List deleted       | getDeletedProjectsList()  | projects/index.ts | ✅     |
| Tenant isolation   | Firestore rules           | firestore.rules   | ✅     |
| Confirmation modal | UI component              | projectsList      | ✅     |

---

## Related Documents

| Document                                             | Purpose               |
| ---------------------------------------------------- | --------------------- |
| `_spec.md`                                           | Product specification |
| `../Assessments/ASSESSMENT-12-PROJECT-MANAGEMENT.md` | Original assessment   |

---

## Recommendations & Future Improvements

### Code Quality Observations

| Finding                    | Current State                         | Recommendation           | Priority |
| -------------------------- | ------------------------------------- | ------------------------ | -------- |
| **Two-Collection Pattern** | Metadata + Data separation            | ✅ Efficient for listing | -        |
| **Summary Document**       | `projectsSummary` for 1-read listings | ✅ Cost-optimized        | -        |
| **Soft Delete**            | `deleted` + `deletedAt` flags         | ✅ Recoverable deletion  | -        |
| **Firestore Rules**        | Multi-tenant isolation                | ✅ Proper security       | -        |
| **Session Caching**        | `session` variable reused             | ✅ Reduces auth calls    | -        |

### Suggested Improvements

1. **Project Archiving**

   - **Current**: Only active/deleted states
   - **Suggested**: Add "archived" state for old but not deleted projects
   - **File**: `projects/index.ts`
   - **Priority**: P2

2. **Project Duplication with Options**

   - **Current**: Full project copy
   - **Suggested**: Options to include/exclude images, translations, theme
   - **File**: `duplicateProject()`
   - **Priority**: P2

3. **Trash Auto-Cleanup**

   - **Current**: Deleted projects stay in trash indefinitely
   - **Suggested**: Cloud Function to permanently delete after 30 days
   - **File**: New Cloud Function
   - **Priority**: P2

4. **Project Templates**

   - **Current**: Start from scratch or duplicate
   - **Suggested**: Pre-built templates (Coffee Shop, Pizza, Fine Dining)
   - **Priority**: P3

5. **Bulk Project Operations**
   - **Current**: One project at a time
   - **Suggested**: Multi-select for bulk delete, archive, export
   - **Priority**: P3

### Technical Debt

| Item                 | Description                                       | Effort |
| -------------------- | ------------------------------------------------- | ------ |
| Session variable     | Global `session` could cause issues in edge cases | Low    |
| Summary sync         | Ensure summary stays in sync on all operations    | Medium |
| Restore notification | No notification after successful restore          | Low    |

---

_Document Status: ✅ PRODUCTION READY_

# Project Management — Firebase Cost Tracking

**Feature:** Project CRUD (Create, Read, Update, Delete)  
**Status:** ✅ Production Ready  
**Last Updated:** May 23, 2026
**Priority:** HIGH — Every user creates/manages projects. Core CRUD operations.

---

## Summary

- **Collections Used:** `projects/{tId}/{sId}` (projectsData), `platformSummary` (projectsSummary)
- **Storage Buckets:** None (project management only — file uploads tracked in upload-file-processing)
- **Cloud Functions:** None
- **Estimated Monthly Cost:** **Very Low**
- **Access rule:** Client writes to `platformSummary/projects_{sId}` are tenant-admin writes scoped by the Firebase auth tenant plus the user's current `storeId` or `storeIds` claim. This covers desktop and mobile active-store/outlet context without broad platformSummary access.

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Indexed? | Notes |
|-----------|-----------|---------|-----------|-----------|----------|-------|
| List all projects | `platformSummary/projects_{sId}` | Dashboard/project list | Per dashboard visit | 1 | Direct doc | Summary document pattern — 1 read for all projects. File: `src/database/projects/index.ts:213` |
| Load single project | `projects/{tId}/{sId}/{projectId}` | User opens project | Per project open | 1 | Direct doc | Full project data load. |
| Multi-outlet delete guard | `tenants/{tId}` + `projects/{tId}/{sId}` | Delete project in multi-outlet tenant | Rare | 1 tenant doc + 1 query per tenant store | `masterProjectId` query | Uses tenant-scoped `storesList`; does not read global `platformSummary/storesSummary` from mobile/client flows. |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Fields | Notes |
|-----------|-----------|---------|-----------|-------------|--------|-------|
| Create new project | `projects/{tId}/{sId}/{projectId}` | User clicks "New Project" | Per creation | 1 | Full project doc | `addProject()` generates ID, creates with defaults. File: `src/database/projects/index.ts:303` |
| Create summary entry | `platformSummary/projects_{sId}` | With project creation | Per creation | 1 | name, active, isDefault | `syncProjectToSummary()`. File: `src/database/projects/index.ts:230` |
| Update project metadata | `platformSummary/projects_{sId}` | Name/default change | Per metadata edit | 1 | Merge update | `updateProjectMetadata()`. Reads current summary first. File: `src/database/projects/index.ts:357` |
| Soft delete project | `projects/{tId}/{sId}/{projectId}` | User deletes project | Rare | 1 | deleted: true, deletedAt | `deleteProject()` batches this with summary removal. |
| Remove from summary | `platformSummary/projects_{sId}` | With soft delete | Rare | 1 | deleteField() | `deleteProject()` removes the summary entry in the same batched commit. Standalone helper: `removeProjectFromSummary()`. |

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes |
|-----------|-----------|---------|-----------|-------------|-----------|-------|
| Soft delete only | `projects/{tId}/{sId}/{projectId}` | User deletes | Rare | 0 (field update) | Soft | `deleted: true`. Document stays in collection. |

---

## Cost Estimate (per 1000 project CRUD ops/month)

| Resource | Operations/month | Unit Cost | Monthly Cost |
|----------|-----------------|-----------|-------------|
| Firestore Reads (listing) | 5,000 | $0.06/100K | $0.00 |
| Firestore Writes (CRUD) | 2,000 | $0.18/100K | $0.00 |
| **Total** | | | **~$0.01/month** |

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `addProject` | `src/database/projects/index.ts:303` | Write (setDoc × 2) |
| `getProjectsSummary` | `src/database/projects/index.ts:213` | Read (getDoc) |
| `syncProjectToSummary` | `src/database/projects/index.ts:230` | Write (setDoc merge) |
| `updateProjectMetadata` | `src/database/projects/index.ts:357` | Read + Write |
| `removeProjectFromSummary` | `src/database/projects/index.ts:255` | Write (deleteField) |

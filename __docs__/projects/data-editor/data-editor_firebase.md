# Data Editor — Firebase Cost Tracking

**Feature:** Visual Menu Data Editor  
**Status:** ✅ Production Ready  
**Last Updated:** February 7, 2026  
**Priority:** HIGH — Core editing experience. Every save = Firestore write. Most frequently used feature.

---

## Summary

- **Collections Used:** `projects/{tId}/{sId}` (projectsData), `platformSummary` (projectsSummary), `menuChangeLog/{tId}/{sId}` (MOL tracking), `masterOperationalState` (multi-outlet signal)
- **Storage Buckets:** `MenuListAi/project/assets/{projectId}/{fileId}` (item images)
- **Cloud Functions:** None (client-side editing)
- **Estimated Monthly Cost:** **Medium** — Scales with edit frequency

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Indexed? | Notes |
|-----------|-----------|---------|-----------|-----------|----------|-------|
| Load project data | `projects/{tId}/{sId}/{projectId}` | Editor opens | Per editor session | 1 | Direct doc | Heavy document (~50KB). Full project with all files, items, categories. File: `src/database/projects/index.ts` |
| Load projects summary | `platformSummary/projects_{sId}` | Project listing | Per dashboard visit | 1 | Direct doc | Lightweight summary for fast listing. File: `src/database/projects/index.ts:213` |
| Pre-save read (MOL) | `projects/{tId}/{sId}/{projectId}` | Before save (if MOL enabled) | Per save | 1 | Direct doc | Reads current state for change detection. Only when `ENABLE_MENU_OBSERVATION` flag is true. File: `src/database/projects/index.ts:387` |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Fields | Notes |
|-----------|-----------|---------|-----------|-------------|--------|-------|
| Save project changes | `projects/{tId}/{sId}/{projectId}` | User clicks Save | Per save action | 1 | Merge update (changed fields only) | `updateProject()` with `requestBodyComposer` (auto timestamps). File: `src/database/projects/index.ts:382` |
| Sync summary | `platformSummary/projects_{sId}` | With project save | Per save | 1 | name, active, isDefault | `syncProjectToSummary()` lightweight update. File: `src/database/projects/index.ts:230` |
| Menu change log (MOL) | `menuChangeLog/{tId}/{sId}` | Price/availability/active changes | Per changed item (debounced 5s) | 1 per change type | Full change entry | Fire-and-forget, debounced. Only when `ENABLE_MENU_OBSERVATION`. File: `src/database/menuChangeLog/index.ts:121` |
| Master operational signal | `masterOperationalState/{projectId}` | Master project operational change | Per master save with item changes | 1 | operationalVersion (increment), lastUpdatedAt | Atomic increment. Only for master projects with `ENABLE_MULTI_OUTLET` + `ENABLE_MASTER_UPDATE_AWARENESS`. File: `src/database/projects/index.ts:451` |

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes |
|-----------|-----------|---------|-----------|-------------|-----------|-------|
| Soft delete project | `projects/{tId}/{sId}/{projectId}` | User deletes project | Rare | 0 (field update) | Soft (`deleted: true`) | Never hard deletes. Sets `deleted: true, deletedAt: timestamp`. |
| Remove from summary | `platformSummary/projects_{sId}` | With soft delete | Rare | 0 (field delete) | `deleteField()` | Removes project key from summary doc. File: `src/database/projects/index.ts:255` |

---

## Firebase Storage

| Operation | Path Pattern | Trigger | Size | Notes |
|-----------|-------------|---------|------|-------|
| Upload item image | `MenuListAi/project/assets/{projectId}/{fileId}` | User uploads/accepts image | 0.5-5MB | Via `uploadProjectFile()` or `uploadBase64ToStorage()`. |

---

## Cost Optimization Notes

### Current Optimizations
- **Merge updates**: Only changed fields written (not full document replacement)
- **Summary document pattern**: Project listing reads 1 doc instead of N project docs
- **MOL debouncing**: Change log writes debounced 5s per item per change type
- **Feature flag gating**: MOL and multi-outlet writes only when flags enabled

### Warnings: Expensive Patterns
- **Frequent saves**: Power users saving every few seconds = high write volume
- **MOL pre-read**: When MOL enabled, every save does an extra read for change detection
- **Large project documents**: ~50KB per project. Each save writes the full merged result.

---

## Cost Estimate (per 1000 active projects, 10 saves/project/month)

| Resource | Operations/month | Unit Cost | Monthly Cost |
|----------|-----------------|-----------|-------------|
| Firestore Reads (project load) | 10,000 | $0.06/100K | $0.01 |
| Firestore Reads (MOL pre-read) | 10,000 | $0.06/100K | $0.01 |
| Firestore Writes (project save) | 10,000 | $0.18/100K | $0.02 |
| Firestore Writes (summary sync) | 10,000 | $0.18/100K | $0.02 |
| Firestore Writes (MOL logs) | 5,000 (debounced) | $0.18/100K | $0.01 |
| Storage (images) | 1GB cumulative | $0.026/GB | $0.03 |
| **Total** | | | **~$0.10/month** |

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `updateProject` | `src/database/projects/index.ts:382` | Read + Write |
| `syncProjectToSummary` | `src/database/projects/index.ts:230` | Write |
| `removeProjectFromSummary` | `src/database/projects/index.ts:255` | Write (deleteField) |
| `getProjectsSummary` | `src/database/projects/index.ts:213` | Read |
| `logMenuChange` | `src/database/menuChangeLog/index.ts:121` | Write (debounced) |
| `uploadProjectFile` | `src/database/projects/index.ts:274` | Storage upload |
| `addProject` | `src/database/projects/index.ts:303` | Write (2 docs) |
| `updateProjectMetadata` | `src/database/projects/index.ts:357` | Read + Write |

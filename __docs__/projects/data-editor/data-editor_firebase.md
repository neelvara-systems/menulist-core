# Data Editor — Firebase Cost Tracking

**Feature:** Visual Menu Data Editor  
**Status:** Firebase cost evidence; not current launch certification
**Last Updated:** July 5, 2026
**Priority:** HIGH — Core editing experience. Every save = Firestore write. Most frequently used feature.

**Launch boundary:** This Firebase cost note documents expected read/write patterns. Current release approval requires the active [production-readiness audit](../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../production-readiness/external-certification-runbook.md) evidence, browser/mobile editor QA, publish/cache evidence for edited public truth, and deploy evidence for the target environment.

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
| Sync summary | `platformSummary/projects_{sId}` | Only when editor changes project metadata | Per metadata action | 1 | changed metadata fields | `updateProjectMetadata()` transactionally merges current summary truth; ordinary item/category saves do not rewrite summary metadata. |
| Menu change log (MOL) | `menuChangeLog/{tId}/{sId}` | Menu revisions and publishes | Per save/publish | 1 compact summary by default; detailed mode writes debounced per item/change type | Compact summary or detailed change entry | Completed summaries/publishes bypass replacement debouncing; detailed queue entries retain immutable queue-time scope and page exit performs a best-effort flush. Only when `ENABLE_MENU_OBSERVATION`. File: `src/database/menuChangeLog/index.ts` |
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
- **MOL selective debouncing**: Replaceable detailed item/category changes debounce for 5s per identity and change type. Completed revision summaries and publish operations write once per completed operation so rapid saves cannot erase one another.
- **Feature flag gating**: MOL and multi-outlet writes only when flags enabled
- **MOL no-session diagnostics update**: Enabled MOL calls without active session/scope now emit bounded diagnostics instead of disappearing. This adds no Firestore reads, writes, deletes, Storage operations, routes, Cloud Functions, rules, indexes, schema fields, owner settings, Firebase deployment, or Vercel deployment.
- **MOL tenant/store hardening**: Pending events retain their validated queue-time scope, batch calls resolve one session, rules require assigned-store read access and owner/manager write authority, payload scope must match the path, and canonical project events must reference an existing project.
- **Project-operation scope**: Update/publish capture one validated tenant/store session and reuse it for the project path, persistence metadata, MOL event, and publish snapshot. Linked-outlet and standalone publish success paths share the same post-publish observation handoff.
- **MOL reader bounds**: Browser readers use 100-document timestamp pages, a 500-result cap, and a 5,000-document scan budget. Nightly drift/extraction readers use 500-document timestamp pages with a 50,000-document per-store/run budget and in-memory filtering because the nested store ID is the collection ID and cannot use a single `menuChangeLog` composite index. Drift reads the nested `projects/{tId}/{sId}` collection and scans each store ledger once, not once per project.
- **MOL compact drift contract**: Default summaries carry at most 1,000 per-item price/availability contributions. Malformed entries are ignored by the Functions runtime boundary; if a valid revision exceeds the cap, overflow contributions use detailed events so metric input is not silently dropped.

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
| Firestore Writes (MOL logs) | 10,000 default summaries; detailed mode varies | $0.18/100K | $0.02 |
| Storage (images) | 1GB cumulative | $0.026/GB | $0.03 |
| **Total** | | | **~$0.10/month** |

---

## DAL Functions Used

| Function | File | Operation Type |
|----------|------|---------------|
| `updateProject` | `src/database/projects/index.ts:382` | Read + Write |
| `updateProjectMetadata` | `src/database/projects/index.ts` | Transactional summary metadata merge |
| `removeProjectFromSummary` | `src/database/projects/index.ts` | Deleted-project-only compatibility cleanup (transaction + deleteField) |
| `getProjectsSummary` | `src/database/projects/index.ts:213` | Read |
| `logMenuChange` | `src/database/menuChangeLog/index.ts` | Write (selectively debounced by event semantics) |
| `uploadProjectFile` | `src/database/projects/index.ts:274` | Storage upload |
| `addProject` | `src/database/projects/index.ts:303` | Write (2 docs) |
| `updateProjectMetadata` | `src/database/projects/index.ts:357` | Read + Write |

# Project Management

**Sub-feature of:** Projects / Menu Builder
**Status:** Production implementation exists; audited June 11, 2026
**Last Updated:** June 11, 2026

Project Management owns the menu/catalog project lifecycle for a store: create, list, edit metadata, save menu data, publish, duplicate, soft delete, restore, active/inactive state, default-project selection, and special-menu metadata.

Runtime behavior is source-of-truth. The active model is not the older `projectsMetadata` / `projectsData` split.

## Runtime Model

| Store | Purpose |
| --- | --- |
| `projects/{tId}/{sId}/{projectId}` | Full project document: files, extracted items/categories, settings, publish state, lifecycle flags, multi-outlet fields. |
| `platformSummary/projects_{sId}` | Lightweight per-store project summary map used for project lists, public route resolution, OBP/default menu links, and output surfaces. |

## Key Files

| File | Purpose |
| --- | --- |
| `src/database/projects/index.ts` | Project DAL and public cache invalidation hooks. |
| `src/components/templates/main-app/projects/index.tsx` | Desktop project management and menu builder shell. |
| `src/components/mobile/providers/MobileProjectsProvider.tsx` | Mobile project state provider. |
| `src/components/mobile/components/MobileProjectSelectorSheet.tsx` | Mobile project metadata, duplicate, deactivate, and delete actions. |
| `src/components/templates/main-app/useMenuList/index.tsx` | Read-only output hub; reads existing projects without creating defaults. |
| `src/components/templates/main-app/businessSettings/OBPLinkCard.tsx` | Read-only OBP/menu link card; reads existing projects without creating defaults. |

## DAL Reference

| Function | Runtime contract |
| --- | --- |
| `addProject()` | Creates a full project doc, writes summary entry, applies a stable slug, treats unknown deleted-slug reservation state as reserved, supports atomic default handoff, and invalidates public cache through `syncProjectToSummary()`. |
| `getProjectsList()` / `getProjectsListWithoutLoader()` | Reads summary and auto-creates a default project if none exist. Use only for editor/onboarding flows where default creation is intentional. |
| `getExistingProjectsListWithoutLoader()` | Reads summary without writes. Use for dashboard, output, print, share, analytics, and other read-only surfaces. |
| `getProjectData()` | Reads full project doc for editing/rendering. |
| `updateProjectMetadata()` | Updates summary fields, refuses rename/backfill slugs when recently deleted slug reservation state cannot be confirmed, supports atomic default handoff, and revalidates public cache. |
| `updateProject()` / `updateProjectWithoutLoader()` | Saves full project data, runs optional correctness hooks, and revalidates public cache. |
| `publishProject()` | Saves publish data, increments menu version, creates optional snapshots/events, and revalidates public cache. |
| `deleteProject()` | Soft-deletes full project doc, removes summary entry, stores a `deletedSummary` tombstone, promotes a fallback default when needed, and revalidates public cache. |
| `restoreProject()` | Restores lifecycle flags and rebuilds summary from `deletedSummary` when available. |
| `duplicateProject()` | Clones full project data and writes a new summary entry with a new slug, suffixing the slug when deleted-slug reservation state cannot be confirmed. |

## Related Documents

| Document | Purpose |
| --- | --- |
| `project-management_spec.md` | Product/runtime requirements. |
| `project-management_impl.md` | Implementation details. |
| `project-management_firebase.md` | Firestore reads/writes and cost notes. |
| `project-management_helpdoc.md` | Owner-facing help. |
| `../projects_mobile-support.md` | Mobile project-management coverage. |

# Project Management

**Sub-feature of:** Projects / Menu Builder
**Status:** Production implementation exists; audited July 16, 2026
**Last Updated:** July 16, 2026

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
| `src/lib/menu/projectSlugOwnership.ts` | Current/redirect slug ownership, recent-deletion reservation validation, and deterministic collision resolution. |
| `src/lib/menu/projectDocumentScope.ts` | Runtime project ID, tenant, and store identity validation for scoped and legacy reads. |
| `src/components/templates/main-app/projects/index.tsx` | Desktop project management and menu builder shell. |
| `src/components/mobile/providers/MobileProjectsProvider.tsx` | Mobile project state provider. |
| `src/components/mobile/components/MobileProjectSelectorSheet.tsx` | Mobile project metadata, duplicate, deactivate, and delete actions. |
| `src/components/templates/main-app/useMenuList/index.tsx` | Read-only output hub; reads existing projects without creating defaults. |
| `src/components/templates/main-app/businessSettings/OBPLinkCard.tsx` | Read-only OBP/menu link card; reads existing projects without creating defaults. |

## DAL Reference

| Function | Runtime contract |
| --- | --- |
| `addProject()` | Creates the project and summary atomically, reserves a unique stable slug through bounded exact current/redirect queries, and supports an idempotent deterministic default-menu recovery that never rewrites an existing menu document. |
| `getProjectsList()` / `getProjectsListWithoutLoader()` | Reads summary and auto-creates a default project if none exist. Use only for editor/onboarding flows where default creation is intentional. |
| `getExistingProjectsListWithoutLoader()` | Reads summary without writes. Use for dashboard, output, print, share, analytics, and other read-only surfaces. |
| `getProjectData()` | Reads the scoped full project, validates path and embedded identity, then uses the read-only legacy fallback only when it matches the same tenant/store/project scope. |
| `updateProjectMetadata()` | Transactionally merges summary fields, rejects missing/cross-store identities and unnormalized, active, redirect, reserved, or recently deleted slug conflicts, supports atomic default handoff, and revalidates public cache. |
| `updateProject()` / `updateProjectWithoutLoader()` | Saves full project data, runs optional correctness hooks, and revalidates public cache. |
| `publishProject()` | Rejects a stale desktop/mobile snapshot, saves publish data transactionally, increments menu version, creates optional snapshots/events, and revalidates public cache. Linked-outlet publish forwards the same modification-version precondition to the guarded server transaction. |
| `deleteProject()` | Transactionally soft-deletes the scoped project, stores a `deletedSummary` tombstone, removes the summary entry, promotes a current fallback default when needed, and revalidates both affected project contexts. |
| `restoreProject()` | Transactionally restores lifecycle flags and rebuilds summary from `deletedSummary` without creating a second default. |
| `duplicateProject()` | Transactionally clones a current regular project and its summary, strips special-menu/deletion metadata, and allocates a unique slug. |
| `setProjectActive()` | Transactionally changes project and summary active state after exact scope/existence and linked-outlet policy validation. |

## Related Documents

| Document | Purpose |
| --- | --- |
| `project-management_spec.md` | Product/runtime requirements. |
| `project-management_impl.md` | Implementation details. |
| `project-management_firebase.md` | Firestore reads/writes and cost notes. |
| `project-management_helpdoc.md` | Owner-facing help. |
| `../projects_mobile-support.md` | Mobile project-management coverage. |

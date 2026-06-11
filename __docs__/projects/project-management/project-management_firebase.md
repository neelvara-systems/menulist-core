# Project Management - Firebase Cost Tracking

**Feature:** Project CRUD and Menu Builder Lifecycle
**Status:** Production implementation exists; audited June 11, 2026
**Last Updated:** June 11, 2026

## Summary

- **Collections used:** `projects/{tId}/{sId}`, `platformSummary/projects_{sId}`
- **Storage used:** Firebase Storage for project/file/media uploads through shared media helpers.
- **Cloud Functions:** None for core CRUD. Optional extraction/scheduler features are documented separately.
- **Public cache:** Project and summary writes must invalidate `menu-store-{storeId}`, `store-{storeId}`, `client-stores`, screen content version, and Owner Business Assistant browser cache through `revalidatePublicClientCacheForProject()`.
- **Tenant isolation:** Client DAL resolves Firestore paths from the active authenticated session (`tId`, `sId`). Cross-store master reads are explicit and tenant-checked in multi-outlet flows.

## Reads

| Operation | Collection/path | Reads | Notes |
| --- | --- | ---: | --- |
| List projects for editor/onboarding | `platformSummary/projects_{sId}` | 1 | `getProjectsList*()` auto-creates a default project if empty. |
| List projects for read-only surfaces | `platformSummary/projects_{sId}` | 1 | `getExistingProjectsListWithoutLoader()` never writes. Used by dashboard selector, Use MenuList, OBP link card, Past Activity, GrowthOS, print/export surfaces. |
| Load one project | `projects/{tId}/{sId}/{projectId}` | 1 | Full menu/editor data. |
| Load project with summary | summary doc + project doc | 2 | Used when both metadata and full content are required. |
| Delete guard for linked outlets | project doc plus conditional linked-outlet checks | 1+ | Only when multi-outlet is enabled and caller cannot skip the guard from tenant context. |
| Restore project | project doc + summary doc | 2 | Prevents duplicate default projects and rebuilds summary from tombstone. |
| Time-slot preset cascade | all current store project docs | N | Only when a preset is edited/deleted; writes only projects with matching category slots. |

## Writes

| Operation | Writes | Public cache impact | Notes |
| --- | ---: | --- | --- |
| Create project | 1 project doc + 1 summary write | Yes | Summary sync triggers public cache revalidation. |
| Auto-create default project from editor/mobile provider | 1 project doc + 1 summary write | Yes | Intentional only in menu-management entry points. |
| Read-only project list | 0 | None | Must use `getExistingProjectsListWithoutLoader()`. |
| Update metadata | 1 summary write | Yes | Name/description/default/image/slug summary changes affect public routing and links. |
| Save project data | 1 project doc write | Yes | May add optional MOL/MCE/master-update writes when feature flags are enabled. |
| Publish project | 1 project doc write | Yes | Also increments `menuVersion`; optional snapshot/event writes are flag-gated. |
| Soft delete | 1 batched project write + 1 summary write | Yes | Project doc stores `deletedSummary` before summary removal for lossless restore. |
| Restore | 1 project write + 1 summary write | Yes | Does not restore `isDefault` if another active default already exists. |
| Duplicate | 1 project doc + 1 summary write | Yes | New slug, no default by default. |
| Active/inactive toggle | 1 project doc + 1 summary field write | Yes | Multi-outlet deactivation may read master policy first. |
| Time-slot preset edit/delete cascade | 0-N project writes | Yes per changed project | Keeps public category visibility aligned without extra public store reads. |

## Cost Findings From June 11, 2026 Audit

- Hidden default-project creation was removed from read-only owner surfaces. Dashboard selector, OBP link card, Use MenuList, Past Activity, and GrowthOS now use `getExistingProjectsListWithoutLoader()`.
- Editor and mobile project-management providers still use the auto-create helper intentionally so an empty store gets a usable first menu when the owner enters menu management.
- Delete/restore now preserves a summary tombstone in the soft-deleted project doc. This adds no extra write beyond the existing delete write and prevents lossy restore.
- Public cache invalidation is present on project data writes, summary writes, publish, duplicate, delete, restore, active toggle, special-menu changes, and time-slot cascades.

## Remaining Cost Risk

- Time-slot preset cascade scans all projects in the current store. That is acceptable for low-frequency settings edits and typical SMB project counts, but it should not be used from high-frequency UI events.
- Optional MOL, MCE, menu snapshots, and multi-outlet awareness add writes when their flags are enabled. Those are documented in their feature areas and should remain flag-gated.

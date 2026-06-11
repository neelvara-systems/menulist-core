# Project Management - Implementation

**Feature:** Project CRUD and Menu Builder Lifecycle
**Status:** Production implementation exists; audited June 11, 2026
**Last Updated:** June 11, 2026

## Architecture

Project Management uses a summary-first pattern:

1. Full menu truth lives in `projects/{tId}/{sId}/{projectId}`.
2. Lightweight list/public-routing truth lives in `platformSummary/projects_{sId}` under a `projects` map.
3. Owner editor flows read the summary first, then read the selected full project.
4. Public routes read the summary to resolve stable slugs/defaults, then read the selected full project.
5. Any owner write that can affect public output calls the public cache revalidation path.

The historical `projectsMetadata` / `projectsData` split is no longer the active implementation.

## Core Files

| File | Role |
| --- | --- |
| `src/database/projects/index.ts` | DAL for CRUD, publish, summary sync, cache revalidation, special menus, and preset cascades. |
| `src/components/templates/main-app/projects/index.tsx` | Desktop menu builder shell, project list, metadata modal, duplicate/delete actions. |
| `src/components/templates/main-app/projects/editorView/Editor.tsx` | Desktop editor save/publish path. |
| `src/components/mobile/providers/MobileProjectsProvider.tsx` | Mobile project list and selected-project cache. |
| `src/components/mobile/components/MobileProjectSelectorSheet.tsx` | Mobile project metadata, duplicate, active toggle, and delete actions. |
| `src/components/mobile/screens/MobileMenuScreen.tsx` | Mobile menu editing entry point. |

## Read Models

### Management Reads

`getProjectsList()` and `getProjectsListWithoutLoader()` read `platformSummary/projects_{sId}` and auto-create a default project when the store has no projects. This is intentional only for owner menu-management entry points.

Current intentional auto-create callers:

- `src/components/templates/main-app/projects/index.tsx`
- `src/components/mobile/providers/MobileProjectsProvider.tsx`

### Read-Only Reads

`getExistingProjectsListWithoutLoader()` reads the same summary doc but never writes. It must be used where an empty project list is a valid empty state.

Current audited read-only callers:

- Dashboard project selector
- Use MenuList output center
- OBP link card
- Past Activity
- GrowthOS project selector
- Menu Card Export / print/export surfaces
- Business Health project selector
- Transactions

## Write Flow

### Create

`addProject()` creates the full project doc, derives a permanent slug, writes the summary entry through `syncProjectToSummary()`, and optionally triggers multi-outlet propagation. Summary sync revalidates public cache.

### Metadata Update

`updateProjectMetadata()` updates summary-only fields such as name, description, default flag, image, slug, and special-menu display data. It preserves previous slugs for redirects and blocks reserved/recently deleted slug reuse.

### Full Project Save

`updateProject()` / `updateProjectWithoutLoader()` save full project data and then call `revalidatePublicClientCacheForProject()`. The path also runs optional feature-flagged hooks:

- Menu Observation Layer change logging
- Menu Correctness Engine metadata
- master-update awareness signal writes
- multi-outlet outlet-save API handoff for inherited outlet projects

### Publish

`publishProject()` writes publish data, increments `menuVersion`, stamps `lastPublishedAt`, revalidates public cache, and optionally creates snapshots/events when enabled.

### Delete And Restore

`deleteProject()` soft-deletes the project doc, stores `deletedSummary` on that doc, removes the project from `platformSummary/projects_{sId}`, promotes a fallback default if needed, and revalidates public cache.

`restoreProject()` restores lifecycle flags and rebuilds the summary from `deletedSummary` when available. If another active default already exists, the restored project is not restored as default. This prevents duplicate default public routing.

## Public Cache Contract

Project writes must call `revalidatePublicClientCacheForProject(projectId, context)`. That helper:

- derives the store ID from the project ID
- invalidates Owner Business Assistant browser cache
- posts to `/api/revalidate/menu` for public Vercel cache tags
- touches the digital screen content version

Server routes that write store-level truth use `revalidateMenuCache(storeId, { tId, projectId })`.

## Mobile Parity

Mobile project management uses the same DAL functions as desktop. Mobile-specific code is limited to shell state, project selection, touch UI, and optimistic cache updates.

The mobile provider intentionally auto-creates the first default project when the owner enters the menu-management shell. Mobile read-only output surfaces should use `getExistingProjectsListWithoutLoader()`.

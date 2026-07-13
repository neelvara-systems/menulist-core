# Project Management - Product Specification

**Feature:** Project CRUD and Menu Builder Lifecycle
**Parent Feature:** Projects / Menu Digitization
**Status:** Production implementation exists; audited June 11, 2026
**Last Updated:** June 11, 2026

## Product Role

Project Management lets a business owner maintain one or more public menu/catalog projects for a store. It must preserve public truth correctness: stable URLs, one clear default project, recoverable deletion, public cache freshness, and mobile parity.

It is not a generic document manager. Project actions exist only to keep the public business menu accurate and usable.

## Functional Requirements

| ID | Requirement | Status |
| --- | --- | --- |
| FR-01 | Atomically create a project and summary with localized name/description and a unique stable slug; deterministic-ID retries must repair missing summary state without overwriting an existing menu. | Implemented |
| FR-02 | List project summaries with one summary-doc read. | Implemented |
| FR-03 | Load a full project for editing/rendering. | Implemented |
| FR-04 | Transactionally update metadata without rewriting full menu data; reject missing/cross-store identities and current, redirect, reserved, malformed, or recently deleted slug conflicts. | Implemented |
| FR-05 | Save full menu data and invalidate public cache. | Implemented |
| FR-06 | Publish a project with monotonic menu versioning. | Implemented |
| FR-07 | Soft-delete projects and remove them from public/list summaries. | Implemented |
| FR-08 | Atomically restore soft-deleted project and summary state without losing fields or creating a second active default. | Implemented July 13, 2026 |
| FR-09 | Prevent duplicate default restore when another active default exists. | Implemented June 11, 2026 |
| FR-10 | Atomically duplicate a current regular project with a unique slug and non-default status while removing special-menu and deletion metadata. | Implemented |
| FR-11 | Toggle active/inactive state with summary sync. | Implemented |
| FR-12 | Preserve mobile parity for project CRUD actions. | Implemented through shared DAL |

## Non-Goals

- Real-time collaborative editing.
- Owner-facing version history controls.
- Feature-heavy project analytics inside the project manager.
- Default-project creation from read-only dashboard/output pages.

## Data Requirements

| Data | Source of truth |
| --- | --- |
| Full project/menu data | `projects/{tId}/{sId}/{projectId}` |
| List/public-routing metadata | `platformSummary/projects_{sId}` |
| Soft-delete restore metadata | `projects/{tId}/{sId}/{projectId}.deletedSummary` while deleted |
| Public cache identity | Store ID derived from project ID plus store-level cache tags |

## Empty-State Requirement

Menu-management entry points may create a default project automatically because the owner is intentionally entering the editor.

Read-only surfaces must not create projects. They should show a stable empty state or route the owner to create a menu.

Audited read-only surfaces include:

- dashboard project selector
- Use MenuList
- OBP link card
- Past Activity
- GrowthOS project selector
- print/export/project scope selectors

## Delete/Restore Requirements

When deleting a project:

- mark the full project doc `deleted: true` and `active: false`
- store the removed summary fields in `deletedSummary`
- remove the project from `platformSummary/projects_{sId}`
- if the deleted project was default, promote another non-special project when available
- invalidate public menu/OBP/screen cache

When restoring a project:

- mark the full project doc `deleted: false` and `active: true`
- rebuild the summary from `deletedSummary` when available
- clear `deletedSummary`
- do not restore `isDefault: true` if another active non-special default already exists
- invalidate public menu/OBP/screen cache through summary sync

## Public Truth Requirements

- Project slugs must remain stable public handles.
- Previous slugs must remain available for redirect resolution.
- A current slug or any retained redirect slug can belong to only one project in a store summary, including inactive projects.
- Project and summary creation, duplicate, restore, delete, and default handoff operations must not expose split durable state.
- Current and legacy project reads must validate the requested project ID plus tenant/store identity before returning runtime data; legacy fallback must never drift to a sibling store.
- `/menu` alias/default behavior depends on the public route resolver, but project summary state must keep the default project unambiguous.
- Any write affecting project summary, menu content, active state, publish state, special-menu status, or copied time-slot windows must invalidate public cache.

## Mobile Requirements

- Mobile owner project actions use the same DAL as desktop.
- Mobile actions must remain inside the `MobileShell` provider/state contract.
- Mobile destructive actions must be recoverable or guarded.
- No desktop-only project-management action is acceptable unless explicitly documented as platform-only.

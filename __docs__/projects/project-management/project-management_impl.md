# Project Management - Implementation

**Feature:** Project CRUD and Menu Builder Lifecycle
**Status:** Production implementation exists; audited June 11, 2026
**Last Updated:** June 29, 2026

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
| `src/components/templates/main-app/projects/ProjectDetails/ProjectEditModal.tsx` | Desktop project metadata and project-image edit modal. |
| `src/components/templates/main-app/projects/ProjectDetails/ProjectDuplicateModal.tsx` | Desktop project duplicate modal. |
| `src/components/templates/main-app/projects/utils/projectPageDiagnostics.ts` | Bounded diagnostics for desktop project create/update/delete/reset/duplicate, ProjectDetails modal, and load failures. |
| `src/components/templates/main-app/projects/editorView/Editor.tsx` | Desktop editor save/publish path. |
| `src/components/mobile/providers/MobileProjectsProvider.tsx` | Mobile project list and selected-project cache. |
| `src/components/mobile/components/MobileProjectSelectorSheet.tsx` | Mobile project metadata, duplicate, active toggle, and delete actions. |
| `src/components/mobile/utils/mobileProjectDiagnostics.ts` | Bounded diagnostics for mobile project-management failures. |
| `src/components/mobile/screens/MobileMenuScreen.tsx` | Mobile menu editing entry point. |

## Read Models

### Management Reads

`getProjectsList()` and `getProjectsListWithoutLoader()` read `platformSummary/projects_{sId}` and auto-create a default project when the store has no projects. This is intentional only for owner menu-management entry points. The auto-create branch must require `assertProjectUpdateSucceeded()` with `projects_list_default_project_create_rejected` before returning the default project in memory.

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

`addProject()` creates the full project doc, derives a permanent slug, writes the summary entry through `syncProjectToSummary()`, and optionally triggers multi-outlet propagation. Summary sync revalidates public cache. If creation promotes the new project as the default, the caller passes the previous default through the default-handoff option so the previous `isDefault` flag is cleared in the same summary write.

### Metadata Update

`updateProjectMetadata()` updates summary-only fields such as name, description, default flag, image, slug, and special-menu display data. It preserves previous slugs for redirects and blocks reserved/recently deleted slug reuse. Default switching uses the DAL default-handoff option, so desktop and mobile callers pass previous-default or replacement-default ids into the metadata write instead of issuing separate caller-level summary writes.

### Full Project Save

`updateProject()` / `updateProjectWithoutLoader()` save full project data and then call `revalidatePublicClientCacheForProject()`. The path also runs optional feature-flagged hooks:

- Menu Observation Layer change logging
- Menu Correctness Engine metadata
- master-update awareness signal writes
- multi-outlet outlet-save API handoff for inherited outlet projects

The save path keeps these optional hooks non-blocking, but failures must be observable. Previous-project load failures log `project_current_state_load_failed` with bounded project/master-project metadata. Master project client-cache invalidation failures log `project_master_cache_invalidation_failed` with the same bounded context. These diagnostics do not log raw project IDs, project payloads, menu content, owner text, or exception messages, and they do not change the owner save result.

### Publish

`publishProject()` writes publish data, increments `menuVersion`, stamps `lastPublishedAt`, revalidates public cache, and optionally creates snapshots/events when enabled.

### Delete And Restore

`deleteProject()` soft-deletes the project doc, stores `deletedSummary` on that doc, removes the project from `platformSummary/projects_{sId}`, promotes a fallback default if needed, and revalidates public cache.

`restoreProject()` restores lifecycle flags and rebuilds the summary from `deletedSummary` when available. If another active default already exists, the restored project is not restored as default. This prevents duplicate default public routing.

## Diagnostics Contract

`src/components/templates/main-app/projects/index.tsx`, `src/components/templates/main-app/projects/ProjectDetails/ProjectEditModal.tsx`, and `src/components/templates/main-app/projects/ProjectDetails/ProjectDuplicateModal.tsx` must use `src/components/templates/main-app/projects/utils/projectPageDiagnostics.ts` for desktop project action failures. The helper logs normalized failure codes for create/update, modal delete, reset, duplicate, selector delete, project-list load, project-detail load, project image preparation/generation, and duplicate-modal submit failures.

Diagnostics record only bounded project/store/file/language presence and length metadata, booleans, and counts such as language count, file count, localized field counts, and project-list count. The desktop project-management files must not direct-console raw project IDs, store IDs, tenant IDs, project names, localized owner payloads, image data, full Firestore documents, SWR error objects, or provider/browser exceptions.

`src/components/templates/main-app/projects/b2bView.tsx` uses the same helper for JSON edit failures. It logs only bounded project/file/edit metadata, not raw edited JSON or owner menu payloads. The B2C menu-page design utilities (`backgroundSettings.tsx`, `imageGalleryDrawer.tsx`, and `gradientUtils.ts`) must stay silent on normal gallery/background/color actions and return their existing fallback values without direct-console logging parser errors.

The desktop Projects upload flow can offer extracted business-detail suggestions after menu intake. Accepted fields must require `assertStoreUpdateSucceeded()` before local `storeDetails` business identity state changes. Rejected acknowledgements use `projects_page_upload_business_details_store_update_rejected` and route through `projects_page_upload_business_details_update_failed` with bounded project/store and suggestion-count metadata only.

The desktop Projects upload flow and mobile Menu screen can also apply extracted profile visual defaults to an existing project when the project has no accent color or AI image background color. These client-side project saves must require `assertProjectUpdateSucceeded()` before SWR/local/mobile project state changes. Rejected acknowledgements use `menu_upload_extracted_profile_defaults_project_update_rejected` on desktop and `mobile_menu_project_profile_defaults_project_update_rejected` on mobile, routed through the existing bounded extracted-profile default failure handlers.

Mobile Menu debounced background persistence must also require `assertProjectUpdateSucceeded()` before it clears pending snapshots, updates persisted refs, or replaces cached project data. Rejected acknowledgements use `mobile_menu_project_persist_project_update_rejected` and flow through `mobile_menu_project_persist_failed`, preserving the existing retry timer and owner retry copy.

Mobile Menu item-image modal saves must require `assertProjectUpdateSucceeded()` before local menu item image state, cached project state, or image-save success copy changes. Rejected acknowledgements use `mobile_menu_item_image_project_update_rejected` and route through `mobile_menu_item_image_project_update_failed` with bounded item/image-count context.

`src/components/mobile/components/MobileProjectSelectorSheet.tsx` must require `assertProjectUpdateSucceeded()` before mobile project selector mutations update local project cache, form baselines, selection state, or success copy. This covers create, duplicate, edit metadata/language saves, special-menu metadata saves, public-content translation repairs, active toggles, and reset writes. Rejected acknowledgements route through the existing bounded `mobile_project_selector_save_failed`, `mobile_project_public_content_translation_failed`, `mobile_project_selector_active_toggle_failed`, or `mobile_project_selector_reset_failed` handlers.

Desktop Projects create, duplicate, edit, and public-content translation repairs must also require `assertProjectUpdateSucceeded()` before selected project state, SWR project lists, localized draft baselines, or success copy changes. This covers create results, duplicate results, metadata, language/default-language, active/default handoff, public-content translation project writes, and translation metadata writes. Rejected acknowledgements route through the existing bounded `projects_page_project_save_failed`, `projects_page_project_duplicate_failed`, or `projects_page_public_content_translation_failed` handlers.

Desktop Projects reset must require `assertProjectUpdateSucceeded()` before revalidating the project cache, showing reset success copy, or closing the modal. Rejected acknowledgements use `projects_page_reset_project_update_rejected` through the existing bounded `projects_page_project_reset_failed` handler.

`src/components/templates/main-app/projects/editorView/Editor.tsx` must require `assertProjectUpdateSucceeded()` before menu editor save/sync updates `projectData`, `activeProject`, dirty state, last-saved state, POS sync handoff, or owner success nudges. The shared `persistEditorProject()` helper must assert its `updateProject()` result before returning to image, item, translation, and modal callbacks. The same editor path must require acknowledged project and metadata writes before project-detail translation repair updates editor state or success copy. Rejected acknowledgements use `menu_editor_sync_changes_project_update_rejected`, `menu_editor_persist_project_update_rejected`, `menu_editor_project_public_content_project_update_rejected`, and `menu_editor_project_public_content_metadata_update_rejected`, routed through bounded menu-editor diagnostics.

Editor-adjacent translation repairs that mirror translated project name, description, or special-menu display metadata into `projectsSummary` must follow the same acknowledgement rule before local saved state or success copy advances. This covers desktop `CommandCenterModal` plus mobile `BulkActionsSheet` and `ManageLanguagesSheet` metadata repair writes.

Editor helper direct-save fallbacks must follow the same acknowledgement rule. `uploadedImagesList.tsx`, `descriptionGeneration.shared.ts`, and `BatchImageGenerationResultView.tsx` require `assertProjectUpdateSucceeded()` before local active-project state, generated-description persistence, batch-image selected-image state, or success copy changes when they save through `updateProject()` without a parent `onProjectDataUpdate` / `persistProject` callback. Rejected acknowledgement codes are `menu_editor_item_image_delete_project_update_rejected`, `menu_editor_description_generation_project_update_rejected`, and `image_batch_result_upload_project_update_rejected`.

Design publish surfaces must require `assertProjectUpdateSucceeded()` before local published state, cached project state, success copy, or post-publish verification setup changes. `src/components/templates/main-app/projects/b2cView/index.tsx` uses `projects_b2c_publish_project_update_rejected`; `src/components/mobile/screens/MobileDesignEditorScreen.tsx` uses `mobile_design_publish_project_update_rejected`.

Generated project-image saves must require `assertProjectUpdateSucceeded()` before `generateAndSaveProjectImageIfMissing()` returns an image URL to desktop or mobile callers. Summary writes use `project_image_generation_summary_update_rejected`; metadata fallback writes use `project_image_generation_metadata_update_rejected`.

`src/components/templates/main-app/projects/b2cView/index.tsx` uses the same helper for desktop B2C publish failures and post-publish verification setup failures. Official Page `publicPresence` saves made from the B2C editor must require `assertStoreUpdateSucceeded()` before local store state, queued OBP photo cleanup, or publish success copy changes; rejected acknowledgements use `projects_b2c_official_page_store_update_rejected`, while failed publish attempts log `projects_b2c_publish_failed` with bounded project/store/change-count metadata and fixed owner copy. If the dynamic `verifyMenuPublish` handoff cannot be prepared after a successful publish, it logs `projects_b2c_publish_verification_setup_failed` with bounded project/store/store-slug/custom-domain/public-url metadata only. The handoff URL is built with `generateProjectUrl()` so the health check targets the actual public project/menu route instead of the tenant root. The existing `verifyMenuPublish` wrapper remains responsible for callable/provider failures and keeps publish success non-blocking.

`src/components/mobile/components/MobileProjectSelectorSheet.tsx` and `src/components/mobile/screens/MobileDesignEditorScreen.tsx` must use `src/components/mobile/utils/mobileProjectDiagnostics.ts` for mobile project-management failures. The helper logs normalized failure codes for project image preparation, project deletion, project-selector create/edit/duplicate saves, active toggles, resets, public-link copy failures, public-content translation repair, mobile design publish failures, post-publish verification setup failures, design public-link copy failures, and design native-share failures. Mobile Design post-publish verification uses `generateProjectUrl()` with subdomain/custom-domain and default-project semantics after the acknowledged publish result, logs `mobile_design_publish_verification_setup_failed` only when the handoff cannot be prepared, and leaves callable/provider failures to the shared `verifyMenuPublish` wrapper. Project-selector and design public-link copied feedback must wait for Clipboard API or acknowledged textarea fallback success, and failed copy diagnostics may add clipboard/fallback support booleans. Context is limited to bounded project/store/file/language/layout/mood/URL metadata, draft counts/lengths, image-draft or background-image presence, mode flags, booleans, counts, and normalized source error name/code/status. It must not direct-console raw project IDs, store IDs, tenant IDs, selected project payloads, owner-entered names/descriptions, public URLs, image data, full Firestore documents, generated public URLs, or provider/browser exceptions.

`src/components/templates/main-app/projects/b2cView/shareModal/index.tsx` and `MenuKitSection.tsx` use `src/lib/export/exportDiagnostics.ts` for desktop project share/export failures. The share modal logs bounded QR download, social handoff, direct-open, direct-copy, structured export, and PDF generation failures. The Menu Kit section logs bounded ZIP generation, single-asset generation, share-message copy, staff-script copy, and WhatsApp handoff failures. Share Modal social handoffs and Menu Kit WhatsApp quick-share opens must use `noopener,noreferrer`; copy success feedback must wait for Clipboard API or acknowledged textarea fallback success. Failed copy/open paths may log URL/message lengths plus clipboard/fallback support booleans only. The legacy `linkView.tsx` and `socialShareView.tsx` are dormant, but if reintroduced they must also use export diagnostics: link copy logs `project_share_legacy_link_copy_failed`, social-platform copy logs `project_share_legacy_social_copy_failed`, and blocked social handoffs log `project_share_legacy_social_open_failed`, all with bounded platform/share URL length metadata and copy support metadata only. These paths must not log raw public URLs, QR payloads, generated customer/staff messages, owner-entered project/store names, menu payloads, downloaded file bodies, or browser/provider exception text.

The B2B `ShareModal.tsx` external endpoint POST is intentionally owner-entered and external, so it must not use same-origin credentials. It must normalize the endpoint first, admit only public HTTPS URLs without embedded credentials or local/private hosts, strip fragments, then post to the normalized URL with `SHARE_ENDPOINT_REQUEST_POLICY`: no-store cache, `credentials: 'omit'`, manual redirect handling, and `referrerPolicy: 'no-referrer'`. Failed posts log `project_share_endpoint_post_failed` with bounded endpoint/project/category/item metadata only.

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

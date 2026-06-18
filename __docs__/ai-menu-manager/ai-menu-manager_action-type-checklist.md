# AI Menu Manager - Action Type Production Checklist

**Status:** Production checklist - initial registry implemented
**Audience:** Engineering / Product / QA
**Last Updated:** June 17, 2026
**Owner:** MenuList AMM action registry

---

## 1. Purpose

This document is the production checklist for AI Menu Manager action types.

AMM must stay a conversational entry point over existing MenuList operations. It can prepare work and speak naturally, but it can execute only through registered, previewable, approved action adapters.

This checklist answers four questions for every supported owner command:

1. Does MenuList already have a manual equivalent?
2. Which existing mutation path must AMM reuse?
3. What approval, mobile handling, and Firebase cost class applies?
4. Is the action ready for an AMM adapter, needs adapter glue, or must stay a manual-task card?

This file must be updated whenever AMM gains a new action adapter or when an existing manual MenuList flow changes.

Current implementation note: Mobile More/manual surfaces are recognized by a table-driven resolver and mapped to exact action-family cards, not the generic `system_manual_task_create` placeholder. Known flows include business profile, official page, social links, attributes, customer app, search/discovery, domain, business copy, SEO, analytics, locale, working hours, time slots, temporary status, locations, staff, roles, billing, transactions, Business Health, past activity, help, print/export, digital screens, POS sync, integrations, and blocked platform/reseller/Answerlattice/internal screens. Browser-local exports use dedicated actions such as `menu_share_copy_link`, `menu_qr_download`, `public_presence_link_share`, `public_presence_qr_download`, `feedback_link_share`, `feedback_qr_download`, `customer_app_install_link_share`, `digital_screen_link_share`, `pos_sync_setup_info_copy`, `pos_sync_technical_summary_copy`, and `pos_sync_sample_payload_download`. `system_manual_task_create` is reserved for true ad hoc owner tasks that do not map to a known MenuList action family.

---

## 2. Source Scan Completed

The first checklist pass was grounded in these current manual flows:

| Manual surface | Evidence | AMM relevance |
| --- | --- | --- |
| Editor item/category modals | `src/components/templates/main-app/projects/editorView/editItemModal.tsx:85`, `src/components/templates/main-app/projects/editorView/editCategoryModal.tsx:41` | Single item, category, price, metadata, translation, availability, and visibility actions. |
| Editor operation helpers | `src/components/templates/main-app/projects/editorView/utils/editorOperations.ts:28` | Create/delete item/category/attribute operations. |
| Editor save/persist path | `src/components/templates/main-app/projects/editorView/Editor.tsx:462`, `src/components/templates/main-app/projects/editorView/Editor.tsx:506` | AMM project mutations must end in existing project save behavior. |
| `updateProject()` invariant | `src/database/projects/index.ts:945`, `src/database/projects/index.ts:995`, `src/database/projects/index.ts:1000` | All customer-facing menu truth must pass through this DAL path. |
| Linked outlet save path | `src/database/projects/index.ts:973`, `src/app/api/projects/outlet-save/route.ts:329`, `src/app/api/projects/outlet-save/route.ts:433` | Outlet actions must preserve outlet policy checks and cache invalidation. |
| Publish path | `src/database/projects/index.ts:1315`, `src/database/projects/index.ts:1395`, `src/database/projects/index.ts:1408`, `src/database/projects/index.ts:1428` | Publish cards must reuse publish version, cache, MOL, and snapshot behavior. |
| Command Center bulk operations | `src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx:1`, `src/components/templates/main-app/projects/editorView/CommandCenterModal/utils/bulkOperations.ts:1` | Bulk price, availability, visibility, category move, text-case, and repair cards. |
| Description generation | `src/components/templates/main-app/projects/editorView/DescriptionGenerationModal.tsx:86` | AMM can wrap existing description-generation flow. |
| Item image upload/generation | `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx:319`, `src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx:121` | Generated image cards remain drafts until owner applies them. |
| Image generation outlet governance | `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx:231`, `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx:233`, `__docs__/projects/ai-image-generation/ai-image-generation_impl.md:101` | Outlet image-generation actions must keep local-only item filtering unless policy explicitly allows inherited image override. |
| Import/upload processing | `src/components/templates/main-app/projects/index.tsx:1644`, `src/components/templates/main-app/projects/index.tsx:1826`, `src/components/templates/main-app/projects/index.tsx:1912` | File/link import cards reuse existing Storage upload, intake identity, and job flow. |
| Import business identity acceptance | `src/components/templates/main-app/projects/index.tsx:1657`, `src/components/templates/main-app/projects/index.tsx:1693` | AMM must preserve the owner-reviewed store identity update before saving detected business details. |
| Import-created new menu | `src/components/templates/main-app/projects/index.tsx:1737`, `src/components/templates/main-app/projects/index.tsx:1772`, `src/components/templates/main-app/projects/index.tsx:1779` | Identity-mismatch import can create a new menu only through the existing project creation guard. |
| Upload queue cleanup | `src/components/templates/main-app/projects/index.tsx:2025`, `src/components/templates/main-app/projects/index.tsx:2040` | Local upload cleanup actions are browser-local draft cleanup, not persisted menu changes. |
| Extraction review | `src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewScreen.tsx:304`, `src/lib/extraction/applyChanges.ts:422`, `src/lib/extraction/applyChanges.ts:651` | Import review cards can approve/discard exact extracted changes. |
| Menu link import API | `src/app/api/menu-link-imports/route.ts:76`, `src/app/api/menu-link-imports/route.ts:112`, `src/app/api/menu-link-imports/route.ts:206` | Link imports already have safe mode, rate limit, artifact, and job creation. |
| Menu intake identity preflight | `src/app/api/menu-intake-identity/route.ts:31`, `src/app/api/menu-intake-identity/route.ts:77` | AMM file/link import should keep identity mismatch checks. |
| Menu design settings | `src/components/templates/main-app/projects/b2cView/menuPage/menuPageSettingsNew.tsx:75`, `src/components/templates/main-app/projects/b2cView/menuPage/menuPageSettingsNew.tsx:131` | Theme/layout/display actions map to existing `config.design.menu`. |
| Featured section settings | `src/components/templates/main-app/projects/editorView/DecisionBlocksSettingsModal.tsx:243`, `src/components/templates/main-app/projects/editorView/decisionBlocks.shared.ts:191` | Featured, Quick, and Value choices map to existing `menuSettings.decisionBlocks` and project save behavior. |
| Project lifecycle | `src/components/templates/main-app/projects/index.tsx:1083`, `src/components/templates/main-app/projects/index.tsx:1164`, `src/components/templates/main-app/projects/index.tsx:1216`, `src/components/templates/main-app/projects/index.tsx:1276` | Project create/update/delete/duplicate/reset/default actions need high approval. |
| Project image and active status | `src/components/templates/main-app/projects/index.tsx:1077`, `src/components/templates/main-app/projects/index.tsx:1117`, `src/components/templates/main-app/projects/index.tsx:1133`, `src/database/projects/index.ts:1145` | AMM project metadata cards must include cover image and activation changes, including linked-outlet deactivation guards. |
| Project metadata DAL | `src/database/projects/index.ts:804`, `src/database/projects/index.ts:864`, `src/database/projects/index.ts:1752`, `src/database/projects/index.ts:1953` | Metadata, delete, restore, duplicate use summary-doc rules and guards. |
| Special menu DAL | `src/hooks/useSpecialMenus.ts:1`, `src/database/projects/index.ts:2161`, `src/database/projects/index.ts:2234`, `src/database/projects/index.ts:2547` | Special menu actions are real AMM candidates and already mobile-supported. |
| Mobile special menu | `src/components/mobile/screens/MobileSpecialMenuScreen.tsx:3` | Special menu card behavior has a mobile equivalent. |
| Share/QR/export | `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:143`, `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:199`, `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:225`, `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:267` | AMM can prepare MenuList-owned share/export cards; raw external posting is unsupported. |
| Menu card export | `src/hooks/useMenuCardExportController.ts:109`, `src/hooks/useMenuCardExportController.ts:494` | Print/export cards can reuse browser-local export flow. |
| Menu card design advisor | `src/app/api/menu-card-export/design-advisor/route.ts:88`, `src/app/api/menu-card-export/design-advisor/route.ts:112`, `src/app/api/menu-card-export/design-advisor/route.ts:153` | Layout suggestion cards reuse existing AI accounting and plan gates. |
| Official Business Page settings | `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx:81`, `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx:578`, `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx:702` | Public presence actions are adjacent AMM actions and must save via store path. |
| Store update path | `src/database/stores/index.tsx:247`, `src/database/stores/index.tsx:360`, `src/database/stores/index.tsx:362`, `src/database/stores/index.tsx:375` | Store/OBP writes must keep summary sync, cache invalidation, and propagation. |
| Temporary status API | `src/app/api/store/temp-status/route.ts:43`, `src/app/api/store/temp-status/route.ts:94`, `src/app/api/store/temp-status/route.ts:110` | Temporary banners can be AMM cards through existing API only. |
| Outlet creation API | `src/app/api/outlets/create/route.ts:112`, `src/app/api/outlets/create/route.ts:123`, `src/app/api/outlets/create/route.ts:190`, `src/app/api/outlets/create/route.ts:404` | Outlet creation is high-risk, billing-aware, and existing-API only. |
| Outlet store customization modal | `src/components/templates/main-app/projects/editorView/StoreCustomizationModal.tsx:1`, `src/components/templates/main-app/projects/editorView/StoreCustomizationModal.tsx:152`, `src/components/templates/main-app/projects/editorView/StoreCustomizationModal.tsx:202`, `src/components/templates/main-app/projects/editorView/Editor.tsx:1530` | Outlet-local price, availability, visibility, bestseller, prep-time, promotion, and category overrides must preserve outlet policy. |
| Staff APIs | `src/app/api/staff/route.ts:11`, `src/lib/staffManagement/server.ts:735`, `src/lib/staffManagement/server.ts:979`, `src/lib/staffManagement/server.ts:1255`, `src/lib/staffManagement/server.ts:1471` | Staff/access cards are adjacent owner operations and must use guarded APIs. |
| MobileShell route map | `src/components/mobile/MobileShell.tsx:36`, `src/components/mobile/MobileShell.tsx:424`, `src/components/mobile/MobileShell.tsx:436`, `src/components/mobile/MobileShell.tsx:443`, `src/components/mobile/MobileShell.tsx:450`, `src/components/mobile/MobileShell.tsx:457`, `src/components/mobile/MobileShell.tsx:464` | Mobile AMM actions must stay inside shell state/callbacks and not route-bypass to desktop screens. |
| Mobile More operational screens | `src/components/mobile/screens/MobileMoreScreen.tsx:85`, `src/components/mobile/screens/MobileMoreScreen.tsx:478` | Store settings, feedback, domain, official page, customer app, digital screens, POS, integrations, and internal/account screens must be classified explicitly. |
| Mobile menu actions | `src/components/mobile/screens/MobileMenuScreen.tsx:1000`, `src/components/mobile/screens/MobileMenuScreen.tsx:1466`, `src/components/mobile/screens/MobileMenuScreen.tsx:2669`, `src/components/mobile/screens/MobileMenuScreen.tsx:2711`, `src/components/mobile/screens/MobileMenuScreen.tsx:2802`, `src/components/mobile/screens/MobileMenuScreen.tsx:2824` | Mobile menu editor already supports fast availability, visibility, import-cancel, price-review, preview, and print actions. |
| Mobile project selector | `src/components/mobile/screens/MobileProjectSelectorSheet.tsx:464`, `src/components/mobile/screens/MobileProjectSelectorSheet.tsx:560`, `src/components/mobile/screens/MobileProjectSelectorSheet.tsx:603`, `src/components/mobile/screens/MobileProjectSelectorSheet.tsx:832`, `src/components/mobile/screens/MobileProjectSelectorSheet.tsx:910`, `src/components/mobile/screens/MobileProjectSelectorSheet.tsx:953`, `src/components/mobile/screens/MobileProjectSelectorSheet.tsx:1002`, `src/components/mobile/screens/MobileProjectSelectorSheet.tsx:1039` | Mobile project lifecycle, translation, link, QR, active/default/delete/reset actions must map to the same project metadata paths. |
| Mobile store/profile settings | `src/components/mobile/screens/MobileBasicSettingsScreen.tsx:90`, `src/components/mobile/screens/MobileLocaleSettingsScreen.tsx:127`, `src/components/mobile/screens/MobileWorkingHoursEditScreen.tsx:80`, `src/components/mobile/screens/MobileTimeSlotsScreen.tsx:101`, `src/components/mobile/screens/MobileTimeSlotsScreen.tsx:212` | AMM needs explicit store profile, locale, hours, and time-slot preset action families. |
| Mobile public presence settings | `src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx:407`, `src/components/mobile/screens/MobileBusinessAttributesScreen.tsx:36`, `src/components/mobile/screens/MobileBusinessCopySetupScreen.tsx:82`, `src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx:411`, `src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx:442`, `src/components/mobile/screens/MobileDomainSettingsScreen.tsx:114` | Public presence, social, business copy, SEO, analytics, and domain actions must use existing store/API paths. |
| Mobile customer app, screens, feedback, POS, integrations | `src/components/mobile/screens/MobileCustomerAppScreen.tsx:131`, `src/components/mobile/screens/MobileDigitalScreensScreen.tsx:224`, `src/components/mobile/screens/MobileFeedbackScreen.tsx:56`, `src/components/mobile/screens/MobileFeedbackDetail.tsx:29`, `src/components/mobile/screens/MobilePosSyncScreen.tsx:86`, `src/components/mobile/screens/MobileIntegrationsScreen.tsx:89` | Mobile PWA, digital screen, feedback, POS, and integration-status actions are standalone AMM families or explicit manual/read-only cards. |
| Mobile share/export surface | `src/components/mobile/screens/MobileShareScreen.tsx:418`, `src/components/mobile/screens/MobileShareScreen.tsx:694`, `src/components/mobile/screens/MobileShareScreen.tsx:756`, `src/components/mobile/screens/MobileShareScreen.tsx:780`, `src/components/mobile/screens/MobileShareScreen.tsx:826`, `src/components/mobile/screens/MobileShareScreen.tsx:1218`, `src/components/mobile/screens/MobileShareScreen.tsx:1277`, `src/components/mobile/screens/MobileShareScreen.tsx:1584`, `src/components/mobile/screens/MobileShareScreen.tsx:1652` | AMM share/export cards should preserve browser-local/mobile-native behavior and avoid Firestore writes unless a durable proposal/receipt is required. |
| Compliance pages | `src/components/mobile/components/MobileCompliancePagesEditor.tsx:56`, `src/components/mobile/components/MobileCompliancePagesEditor.tsx:122`, `src/app/api/compliance/route.ts:36`, `src/app/api/compliance/route.ts:95` | Compliance status/override/reset cards must reuse the guarded compliance API; system text generation stays template-based. |
| Customer communication kit | `src/lib/communication/messageTemplates.ts:45`, `src/components/templates/main-app/useMenuList/CommunicationKit.tsx:56`, `src/components/mobile/components/CommunicationKit.tsx:58`, `src/components/mobile/components/CommunicationKit.tsx:127` | Copy-ready customer messages are C0 local cards; mobile native share remains browser/native-share only. |
| Sharable item card | `src/lib/menu/sharableItemCard.ts:185`, `src/lib/menu/sharableItemCard.ts:197`, `src/components/templates/main-app/projects/editorView/editItemModal.tsx:271`, `src/components/mobile/sheets/ItemEditSheet.tsx:296` | Item-card download/share cards reuse browser-local canvas export and native share fallback. |
| Menu kit, print templates, and physical surfaces | `src/lib/menu-kit/menuKitGenerator.ts:217`, `src/lib/menu-kit/menuKitGenerator.ts:234`, `src/lib/menu-kit/menuKitGenerator.ts:271`, `src/components/mobile/screens/MobileShareScreen.tsx:608`, `src/components/mobile/screens/MobileShareScreen.tsx:665`, `src/components/templates/main-app/today/components/TentCardSection/index.tsx:49`, `src/components/templates/main-app/today/components/StickerSection/index.tsx:33` | AMM should expose preview/download/share cards without adding Firestore writes. |
| Menu presence monitor | `src/database/stores/index.tsx:484`, `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx:182`, `src/components/mobile/components/PresenceMonitor.tsx:163`, `src/components/mobile/screens/MobilePresenceMonitorScreen.tsx:38` | Presence confirmation/unconfirmation cards reuse `updateMenuPresence()` and stay distinct from Business Health. |
| Reviews/reputation guard | `src/app/api/reviews/states/route.ts:24`, `src/app/api/reviews/suggest/route.ts:103`, `src/components/templates/main-app/reviews/ReputationGuard.tsx:31`, `src/components/templates/main-app/reviews/ReviewReplyTool.tsx:56`, `src/config/features.ts:1467` | Review cards are gated/disabled today; AMM must not pretend direct review posting exists. |
| POS desktop support actions | `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx:277`, `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx:300`, `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx:338`, `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx:343` | Copy secret, prepare instructions, copy technical summary, and sample download are additional existing manual actions. |
| New-item metadata and image editing APIs | `src/app/api/new-item-metadata/route.ts:39`, `src/app/api/new-item-metadata/route.ts:336`, `src/app/api/image-editing/route.ts:71`, `src/app/api/image-editing/route.ts:185` | AMM can wrap existing AI/accounted metadata and image-editing APIs only as draft/proposal cards. |

---

## 3. Registry Rules

Every AMM action type must pass this checklist before execution is enabled:

- It has a unique lowercase snake_case action type.
- It declares a manual equivalent or is marked as an AMM-internal control.
- It declares an execution mode.
- It declares an approval level.
- It declares a Firebase cost class.
- It declares a mobile handling rule.
- It declares exact source evidence.
- It builds a preview card before any mutation.
- It uses deterministic idempotency keys for proposal creation and execution.
- Client-executed mutation directives include `proposalId`, `executionId`, `actionType`, `scope`, base project marker, and `patchHash`.
- It writes no live menu, store, staff, or outlet truth outside existing MenuList DAL/API paths.
- It uses the selected store and selected project context shown in AMM; it cannot default a project-level command to every project.
- Image actions preserve existing multi-outlet media governance; outlet stores cannot generate or apply images to inherited/overridden items unless the current image override policy allows it.
- It must not advertise generic rollback unless the adapter stores enough before/after state and can safely apply the reverse operation.
- It returns a receipt or manual-task card after completion.

No adapter may execute only because the model is confident. The adapter, policy, and owner approval decide execution.

Mobile More bridge cards are not executable adapters. They are explicit handoffs to existing owner screens. Broad fixed-choice flows such as working hours, temporary status, time slots, customer app, digital screens, and feedback can use guided option cards, but each option only drafts the next owner message. Once sent, `feedback_link_share` and `feedback_qr_download` are dedicated `browser_local_export` cards with Copy link, Open link, and Download QR controls. The suggestion launcher may show the same two-layer structure before a message is sent: first action area, then exact option. The composer Work on picker may scope a message to loaded items, one category, menu design, digital menu, official page, digital screens, feedback, or store settings. These layers are local UI state and must not be upgraded to direct writes unless a new registered action type is added with source evidence, approval level, Firebase cost class, mobile handling, and DAL/API parity.

---

## 4. Naming Convention

Action types use lowercase snake_case with a domain prefix:

| Prefix | Meaning |
| --- | --- |
| `item_` | Menu item operations. |
| `category_` | Menu category operations. |
| `bulk_` | Multi-item/category actions, usually Command Center backed. |
| `menu_` | Menu-level settings, repair, publish, share, import, or export. |
| `image_` | Item, menu, OBP, or generated media actions. |
| `project_` | Menu project lifecycle and metadata. |
| `special_menu_` | Special menu schedule and lifecycle. |
| `outlet_` | Multi-outlet scope, override, save, or creation actions. |
| `public_presence_` | Store/Official Business Page actions. |
| `store_` | Business profile, locale, hours, and store-level operating settings. |
| `domain_` | Subdomain/custom-domain availability, connection, verification, and removal actions. |
| `customer_app_` | PWA/customer app settings, icon, and install-link actions. |
| `digital_screen_` | Customer-facing screen status, links, overrides, and slide actions. |
| `feedback_` | Guest feedback inbox, reply, status, link, and QR actions. |
| `seo_` | Store SEO metadata actions. |
| `analytics_` | Store analytics/tracking settings. |
| `pos_sync_` | POS sync settings, test, secret, and setup actions. |
| `integration_` | Read-only integration status cards and exact setup cards. No third-party posting. |
| `compliance_` | Compliance page status, custom override, and reset actions. |
| `communication_` | Customer communication message template generation/copy/share actions. |
| `presence_` | Menu presence monitor status and owner confirmation actions. |
| `review_` | Reviews/reputation guard and reply-assist actions, gated until the reviews feature is enabled. |
| `physical_surface_` | Table tent, counter sticker, and other physical surface exports. |
| `staff_` | Staff and owner access operations. |
| `rule_` | Owner-approved AMM rule actions. |
| `system_` | AMM internal receipts, clarifications, limits, and fallback cards. |

---

## 5. Execution Modes

| Mode | Meaning | Allowed for |
| --- | --- | --- |
| `client_project_mutation` | AMM returns an execution directive; client applies a project patch and calls existing `updateProject()`. | Item/category/bulk/design/editor-backed actions. |
| `client_project_metadata` | Client calls existing project metadata/lifecycle DAL. | Project create/update/default/delete/duplicate/restore. |
| `existing_client_dal` | Client calls an existing dedicated DAL/hook without a new API route. | Special menus, local export, some store actions. |
| `existing_api_job` | Adapter calls an existing protected API or job creator. | Extraction, link import, image generation, batch image generation. |
| `existing_server_api` | Adapter calls an existing guarded API route. | Temp status, outlet creation, outlet save, staff management. |
| `browser_local_export` | No Firebase mutation; browser prepares/downloads/share-sheet artifact. | PDF, QR, XLSX, JSON, menu card export. |
| `manual_task_card` | AMM prepares an exact existing-screen owner task, local export, or receipt without changing live truth. | Existing MenuList screen/task-only workflows, not unsupported third-party posting. |
| `read_only_card` | AMM answers using already-loaded or cached bounded context. | Clarification, unsupported action explanation, history receipt. |

---

## 6. Approval Levels

| Level | Meaning |
| --- | --- |
| `none` | Read-only or local preview only. |
| `confirm` | One visible change, easy to understand, reversible through normal editor save. |
| `bulk_confirm` | Multiple menu changes; owner must review count, scope, and examples. |
| `high_confirm` | Public-facing price, outlet-scoped, staff/access, or billing-adjacent action. |
| `destructive_confirm` | Delete/reset/remove/deactivate actions. Requires explicit entity name in card. |
| `external_confirm` | MenuList-owned download, export, share, import, or supported publish. Requires destination/surface disclosure. |

Product approval weight mapping:

| Product weight | Checklist level |
| --- | --- |
| Light | `none` or `confirm` |
| Normal | `confirm` |
| Heavy price/public-scope change | `high_confirm` |
| Heavy multi-record change | `bulk_confirm` |
| Heavy delete/reset/archive | `destructive_confirm` |
| Heavy MenuList export/publish/share | `external_confirm` |

Price rule: direct price changes must use `high_confirm`. The card must show old price, new price, selected store, selected project/outlet scope, public impact, and receipt expectation before approval.

---

## 7. Firebase Cost Classes

| Class | Cost posture |
| --- | --- |
| `C0 local` | Browser-local only. No Firestore/Storage write. |
| `C1 single project save` | One project write through `updateProject()`, plus existing cache/MOL side effects. |
| `C2 job/storage` | Storage upload/artifact plus bounded job/proposal docs. |
| `C3 summary/store write` | Project, store, PWA, feedback, screen, or other bounded MenuList owner-data write through an existing DAL, plus any existing summary/cache updates. |
| `C4 guarded server mutation` | Existing API with auth, permissions, rate limits, possible billing/Auth/provider side effects. |
| `C5 manual only` | AMM stores proposal/receipt only for exact existing-screen or owner-handoff work; no provider call or MenuList truth write. |

Cost rules:

- Prefer one approved project save over many per-field writes.
- Do not create per-message or per-token Firestore writes.
- Store heavy proposals, generated images, imports, and debug artifacts in Storage when they grow beyond compact card data.
- Use deterministic proposal/session IDs so retries do not duplicate docs.
- Load active inbox/proposals by bounded query; do not scan historical sessions.

---

## 8. Production Readiness States

| State | Meaning |
| --- | --- |
| `ready_adapter` | Manual flow and mutation path exist. AMM can add an adapter that reuses them. |
| `needs_adapter_glue` | Manual flow exists, but AMM needs a wrapper, card schema, or stricter policy before enablement. |
| `existing_api_only` | AMM may call only the existing protected API/job, never direct-write. |
| `manual_task_only` | AMM can prepare an exact existing-screen task/export/receipt, not execute protected or unsupported work. |
| `blocked` | Do not expose until a missing contract is created. |

---

## 9. Core Item Actions

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `item_create` | "Add masala tea for 30 rupees" | Editor add item helper. Evidence: `src/components/templates/main-app/projects/editorView/utils/editorOperations.ts:64` | `manual_task_card` until the create-item patch adapter is connected; then `client_project_mutation` through the editor helper path | `confirm` | Task card now; card approve/edit after adapter | Compact proposal/session write now; then `C1 single project save` | `needs_adapter_glue` |
| `item_update` | "Update paneer roll details" | Edit item modal save. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:554` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `item_name_update` | "Rename chai to masala chai" | Item field edit. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:351` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `item_description_update` | "Change this description" | Item field edit. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:351` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `item_category_update` | "Move samosa to snacks" | Item category selector. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:57` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `item_description_generate` | "Write description for masala tea" | Item metadata/description generation. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:496` | `existing_api_job` | `confirm` | Draft card | `C2 job/storage` | `needs_adapter_glue` |
| `item_description_refresh` | "Refresh generated descriptions" | Description generation modal. Evidence: `src/components/templates/main-app/projects/editorView/DescriptionGenerationModal.tsx:86` | `existing_api_job` | `bulk_confirm` | Summary card | `C2 job/storage` | `needs_adapter_glue` |
| `item_price_update` | "Make samosa 25" | Item price field edit. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:351` | `client_project_mutation` | `high_confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `item_attribute_create` | "Add half plate price" | Attribute add helper. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:425` | `manual_task_card` until add-attribute construction is connected | `high_confirm` when price-bearing, otherwise `confirm` | Task card | Compact proposal/session write | `needs_adapter_glue` |
| `item_attribute_update` | "Change large size to 180" | Attribute field edit. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:351` | `client_project_mutation` | `high_confirm` when price-bearing, otherwise `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `item_attribute_name_update` | "Rename large size to family pack" | Attribute name field edit. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:373` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `item_attribute_price_update` | "Make large size 180" | Attribute price field edit. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:387` | `client_project_mutation` | `high_confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `item_attribute_visibility_update` | "Deactivate small size" | Attribute active toggle. Evidence: `src/components/mobile/sheets/ItemEditSheet.tsx:821` | `client_project_mutation` | `confirm` | Fast card | `C1 single project save` | `ready_adapter` |
| `item_attribute_order_update` | "Move regular size above large" | Attribute order handling. Evidence: `src/components/mobile/sheets/ItemEditSheet.tsx:637` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `item_attribute_delete` | "Remove small size" | Attribute delete helper. Evidence: `src/components/templates/main-app/projects/editorView/utils/editorOperations.ts:212` | `manual_task_card` until destructive remove-card adapter is connected | `destructive_confirm` | Destructive task card | Compact proposal/session write | `needs_adapter_glue` |
| `item_visibility_update` | "Hide burger from menu" | Item active toggle. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:673` | `client_project_mutation` | `confirm` | Fast card | `C1 single project save` | `ready_adapter` |
| `item_availability_update` | "Mark biryani sold out" | Item available toggle. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:673` | `client_project_mutation` | `confirm` | Fast card | `C1 single project save` | `ready_adapter` |
| `item_availability_update` | "Make biryani available again" | Same availability adapter; sets `available: true`. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:673` | `client_project_mutation` | `confirm` | Fast card | `C1 single project save` | `ready_adapter` |
| `item_bestseller_update` | "Mark masala tea as bestseller" | Bestseller toggle. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:696` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `item_prep_time_update` | "Set pizza prep time to 20 minutes" | Prep-time controls. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:727` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `item_promotion_weight_update` | "Feature this item more" | OwnerBoost controls. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:727` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `item_metadata_update` | "Add spicy and vegetarian tags" | Metadata facts in item modal. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:784` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `item_metadata_generate` | "Create title, tags, and description for this new item" | New item metadata API. Evidence: `src/app/api/new-item-metadata/route.ts:39`, `src/app/api/new-item-metadata/route.ts:336` | `existing_api_job` then `client_project_mutation` | `confirm` | Draft card | `C2 job/storage` plus `C1 single project save` if applied | `needs_adapter_glue` |
| `item_translation_repair` | "Translate this item" | Retry item translation. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:402` | `existing_api_job` | `confirm` | Draft card | `C2 job/storage` | `needs_adapter_glue` |
| `item_image_update` | "Change masala tea photo" | Item image upload/apply flow. Evidence: `src/components/templates/main-app/projects/editorView/uploadedImagesList.tsx` | `manual_task_card` unless the request uses the generated-image draft/apply adapter | `confirm` | Image task card | `C5 manual only` | `manual_task_only` |
| `item_order_update` | "Move samosa above pakora" | Reorder menu modal. Evidence: `src/components/templates/main-app/projects/editorView/ReorderMenuModal.tsx:200` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `item_quality_review_update` | "Mark this price warning checked" | Price warning review marker. Evidence: `src/components/mobile/screens/MobileMenuScreen.tsx:995` | `client_project_mutation` | `confirm` | Fast card | `C1 single project save` | `ready_adapter` |
| `item_identity_reference` | "Show item id" | System identity reference only. Evidence: `src/components/templates/main-app/projects/types/extractedData.types.ts:70` | `read_only_card` | `none` | Read-only card | `C0 local` | `blocked` |
| `item_delete` | "Delete old combo" | Item delete helper. Evidence: `src/components/templates/main-app/projects/editorView/utils/editorOperations.ts:191` | `manual_task_card` until destructive remove-card adapter is connected | `destructive_confirm` | Destructive task card | Compact proposal/session write | `needs_adapter_glue` |

---

## 10. Category Actions

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `category_create` | "Add breakfast category" | Create category helper. Evidence: `src/components/templates/main-app/projects/editorView/utils/editorOperations.ts:28` | `manual_task_card` until category construction is connected | `confirm` | Task card | Compact proposal/session write | `needs_adapter_glue` |
| `category_update` | "Update snacks category" | Category modal save. Evidence: `src/components/templates/main-app/projects/editorView/editCategoryModal.tsx:219` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `category_name_update` | "Rename starters to snacks" | Category modal save. Evidence: `src/components/templates/main-app/projects/editorView/editCategoryModal.tsx:219` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `category_visibility_update` | "Deactivate desserts category" | Category active toggle. Evidence: `src/components/templates/main-app/projects/editorView/editCategoryModal.tsx:437`, `src/components/mobile/screens/MobileMenuScreen.tsx:3450` | `client_project_mutation` | `confirm` | Fast card | `C1 single project save` | `ready_adapter` |
| `category_icon_update` | "Set tea icon for beverages" | Category icon picker. Evidence: `src/components/templates/main-app/projects/editorView/editCategoryModal.tsx:448` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `category_image_update` | "Add image for beverages category" | Category image data field. Evidence: `src/components/templates/main-app/projects/types/extractedData.types.ts:35` | `manual_task_card` until category image UI/storage path is connected | `confirm` | Task card | `C5 manual only` | `manual_task_only` |
| `category_time_slot_update` | "Show breakfast only in morning" | Category time-slot controls. Evidence: `src/components/templates/main-app/projects/editorView/editCategoryModal.tsx:131` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `category_time_slot_preset_create` | "Create morning menu time slot" | Preset create in category modal. Evidence: `src/components/templates/main-app/projects/editorView/editCategoryModal.tsx:166` | `existing_client_dal` | `confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `category_translation_repair` | "Translate category names" | Category translation generation. Evidence: `src/components/templates/main-app/projects/editorView/editCategoryModal.tsx:276` | `existing_api_job` | `bulk_confirm` | Summary card | `C2 job/storage` | `needs_adapter_glue` |
| `category_order_update` | "Move desserts above drinks" | Reorder menu modal. Evidence: `src/components/templates/main-app/projects/editorView/ReorderMenuModal.tsx:190` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `category_identity_reference` | "Show category id" | System category identity reference only. Evidence: `src/components/templates/main-app/projects/types/extractedData.types.ts:30` | `read_only_card` | `none` | Read-only card | `C0 local` | `blocked` |
| `category_delete` | "Delete old lunch category" | Category delete helper. Evidence: `src/components/templates/main-app/projects/editorView/utils/editorOperations.ts:160` | `manual_task_card` until destructive remove-card adapter is connected | `destructive_confirm` | Destructive task card | Compact proposal/session write | `needs_adapter_glue` |

---

## 11. Item And Category Field Coverage

This coverage follows the live extracted data structures in `src/components/templates/main-app/projects/types/extractedData.types.ts`.
Adding a new item/category/attribute key requires adding a row here and a matching entry in `AI_MENU_MANAGER_*_FIELD_ACTION_COVERAGE`.

### Category Keys

| Data key | AMM action type | Handling |
| --- | --- | --- |
| `id` | `category_identity_reference` | System-protected read-only reference. AMM must not edit it. |
| `active` | `category_visibility_update` | Direct project patch after approval. Supports owner wording such as "deactivate desserts category". |
| `name` | `category_name_update` | Direct project patch after approval. |
| `extractionIdAliases` | `category_identity_reference` | System-protected import/re-extraction identity. AMM must not edit it. |
| `icon` | `category_icon_update` | Direct project patch after approval. |
| `images` | `category_image_update` | Manual task until a category image UI/storage path exists. |
| `timeSlots` | `category_time_slot_update` | Direct project patch after approval; preset creation stays on the existing store preset DAL. |
| `orderIndex` | `category_order_update` | Direct project patch after approval. |

### Attribute Keys

| Data key | AMM action type | Handling |
| --- | --- | --- |
| `id` | `item_identity_reference` | System-protected read-only reference. AMM must not edit it. |
| `name` | `item_attribute_name_update` | Direct nested attribute patch after approval. |
| `price` | `item_attribute_price_update` | Direct nested attribute patch after high-confirm approval. |
| `active` | `item_attribute_visibility_update` | Direct nested attribute patch after approval. |
| `orderIndex` | `item_attribute_order_update` | Direct nested attribute patch after approval. |

### Item Keys

| Data key | AMM action type | Handling |
| --- | --- | --- |
| `id` | `item_identity_reference` | System-protected read-only reference. AMM must not edit it. |
| `extractionIdAliases` | `item_identity_reference` | System-protected import/re-extraction identity. AMM must not edit it. |
| `attributes` | `item_attribute_update` | Nested attribute patch after approval; create/delete remain adapter-glue until construction/removal cards are connected. |
| `category` | `item_category_update` | Direct project patch after approval. |
| `name` | `item_name_update` | Direct project patch after approval. |
| `description` | `item_description_update` | Direct project patch after approval. |
| `descriptionSource` | `item_description_update` | System-set when description changes; not a standalone owner action. |
| `price` | `item_price_update` | Direct project patch after high-confirm approval. |
| `images` | `item_image_update`, `image_item_generate`, `image_item_apply_generated` | Existing image generation/apply flow or manual task; generated images stay draft until owner applies. |
| `tags` | `item_metadata_update` | Direct project patch after approval. |
| `active` | `item_visibility_update` | Direct project patch after approval. Supports owner wording such as "deactivate masala tea item". |
| `available` | `item_availability_update` | Direct project patch after approval. |
| `isBestSeller` | `item_bestseller_update` | Direct project patch after approval. |
| `decisionFacts` | `item_metadata_update` | Direct project patch after approval. |
| `allergens` | `item_metadata_update` | Direct project patch after approval. |
| `dietaryTags` | `item_metadata_update` | Direct project patch after approval. |
| `spiceLevel` | `item_metadata_update` | Direct project patch after approval. |
| `nutritionInfo` | `item_metadata_update` | Direct project patch after approval. |
| `skillLevel` | `item_metadata_update` | Direct project patch after approval. |
| `targetAudience` | `item_metadata_update` | Direct project patch after approval. |
| `materials` | `item_metadata_update` | Direct project patch after approval. |
| `warranty` | `item_metadata_update` | Direct project patch after approval. |
| `duration` | `item_prep_time_update` | Direct project patch after approval. |
| `ownerBoost` | `item_promotion_weight_update` | Direct project patch after approval. |
| `orderIndex` | `item_order_update` | Direct project patch after approval. |
| `qualityReview` | `item_quality_review_update` | Direct project patch only for the existing price-warning reviewed marker. |

---

## 12. Bulk And Repair Actions

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `bulk_price_update` | "Increase all drinks by 10 percent" | Command Center pricing. Evidence: `src/components/templates/main-app/projects/editorView/CommandCenterModal/utils/bulkOperations.ts:130` | `client_project_mutation` | `bulk_confirm` | Summary card | `C1 single project save` | `ready_adapter` |
| `bulk_availability_update` | "Mark all shakes unavailable" | Command Center availability. Evidence: `src/components/templates/main-app/projects/editorView/CommandCenterModal/utils/bulkOperations.ts:316` | `client_project_mutation` | `bulk_confirm` | Summary card | `C1 single project save` | `ready_adapter` |
| `bulk_visibility_update` | "Hide all lunch items" | Command Center show/hide. Evidence: `src/components/templates/main-app/projects/editorView/CommandCenterModal/utils/bulkOperations.ts:394` | `client_project_mutation` | `bulk_confirm` | Summary card | `C1 single project save` | `ready_adapter` |
| `bulk_category_move` | "Move all tea items to beverages" | Command Center move category. Evidence: `src/components/templates/main-app/projects/editorView/CommandCenterModal/utils/bulkOperations.ts:354` | `client_project_mutation` | `bulk_confirm` | Summary card | `C1 single project save` | `ready_adapter` |
| `bulk_text_case_update` | "Fix menu capitalization" | Command Center text case action. Evidence: `src/components/templates/main-app/projects/editorView/CommandCenterModal/actions/TextCaseAction.tsx:1` | `client_project_mutation` | `bulk_confirm` | Summary card | `C1 single project save` | `ready_adapter` |
| `menu_repair` | "Fix missing menu details" | Command Center repair flow. Evidence: `src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx:211` | `client_project_mutation` | `bulk_confirm` | Summary card | `C1 single project save` and possible `C2 job/storage` | `needs_adapter_glue` |
| `menu_repair_language` | "Fix missing translations" | Command Center repair language path. Evidence: `src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx:333` | `existing_api_job` | `bulk_confirm` | Summary card | `C2 job/storage` | `needs_adapter_glue` |
| `menu_repair_descriptions` | "Fill missing descriptions" | Command Center description repair. Evidence: `src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx:333` | `existing_api_job` | `bulk_confirm` | Summary card | `C2 job/storage` | `needs_adapter_glue` |
| `menu_repair_category_icons` | "Fix category icons" | Command Center category icon repair. Evidence: `src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx:333` | `client_project_mutation` | `bulk_confirm` | Summary card | `C1 single project save` | `ready_adapter` |
| `menu_missing_price_review` | "Find items without prices" | Command Center repair summary. Evidence: `src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx:211` | `read_only_card` | `none` | Summary card | `C0 local` | `ready_adapter` |
| `menu_price_outlier_mark_reviewed` | "Mark these price warnings checked" | Mobile price review marker. Evidence: `src/components/mobile/screens/MobileMenuScreen.tsx:1000` | `client_project_mutation` | `confirm` | Fast card | `C1 single project save` | `ready_adapter` |
| `menu_missing_photo_task` | "Find items without photos" | Command Center repair summary. Evidence: `src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx:211` | `manual_task_card` | `confirm` | Task card | `C5 manual only` | `ready_adapter` |

---

## 13. Import And Extraction Actions

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `menu_file_upload` | "Import this menu photo/PDF" | Upload validation and processing. Evidence: `src/components/templates/main-app/projects/index.tsx:2090`, `src/components/templates/main-app/projects/index.tsx:2119` | `existing_api_job` | `confirm` | Upload card | `C2 job/storage` | `needs_adapter_glue` |
| `menu_pdf_page_prepare` | "Use this PDF as menu" | PDF to image page preparation. Evidence: `src/components/templates/main-app/projects/index.tsx:2180` | `existing_api_job` | `confirm` | Upload card | `C2 job/storage` | `needs_adapter_glue` |
| `menu_intake_identity_check` | "Check if this menu belongs here" | Intake identity preflight. Evidence: `src/components/templates/main-app/projects/index.tsx:1710`, `src/app/api/menu-intake-identity/route.ts:31` | `existing_api_job` | `confirm` when mismatch | Upload card | `C2 job/storage` | `existing_api_only` |
| `menu_link_import` | "Import from this menu link" | Link import panel/API. Evidence: `src/components/templates/main-app/projects/index.tsx:1912`, `src/app/api/menu-link-imports/route.ts:76` | `existing_api_job` | `external_confirm` | Link card | `C2 job/storage` | `existing_api_only` |
| `menu_import_job_start` | "Start menu import" | Processing job creation. Evidence: `src/components/templates/main-app/projects/index.tsx:1826`, `src/app/api/menu-link-imports/route.ts:206` | `existing_api_job` | `confirm` | Job card | `C2 job/storage` | `existing_api_only` |
| `menu_import_job_cancel` | "Cancel this menu import" | Mobile import cancel action. Evidence: `src/components/mobile/screens/MobileMenuScreen.tsx:1466` | `existing_api_job` or existing local cancel path, depending on job state | `destructive_confirm` | Job card | `C2 job/storage` or `C0 local` | `needs_adapter_glue` |
| `menu_import_business_identity_accept` | "Save the detected business details" | Owner-reviewed business identity suggestions. Evidence: `src/components/templates/main-app/projects/index.tsx:1657`, `src/components/templates/main-app/projects/index.tsx:1693` | `existing_client_dal` via `updateStore()` | `high_confirm` | Review card | `C3 summary/store write` | `needs_adapter_glue` |
| `menu_import_create_new_project` | "Create a new menu for this upload" | Identity mismatch create-new-menu decision. Evidence: `src/components/templates/main-app/projects/index.tsx:1737`, `src/components/templates/main-app/projects/index.tsx:1772`, `src/components/templates/main-app/projects/index.tsx:1779` | `client_project_metadata` | `high_confirm` | Review card | `C3 summary/store write` | `ready_adapter` |
| `menu_import_review_apply` | "Apply these extracted changes" | Extraction review apply. Evidence: `src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewScreen.tsx:304`, `src/lib/extraction/applyChanges.ts:422` | `existing_client_dal` | `bulk_confirm` | Review card | `C3 summary/store write` | `ready_adapter` |
| `menu_import_review_discard` | "Discard extracted changes" | Extraction review discard. Evidence: `src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewScreen.tsx:331`, `src/lib/extraction/applyChanges.ts:723` | `existing_client_dal` | `destructive_confirm` | Review card | `C3 summary/store write` | `ready_adapter` |
| `menu_upload_file_remove` | "Remove this upload from the queue" | Local upload removal. Evidence: `src/components/templates/main-app/projects/index.tsx:2025` | `read_only_card` | `none` | Upload card | `C0 local` | `ready_adapter` |
| `menu_upload_unprocessed_clear` | "Clear unprocessed uploads" | Local upload queue cleanup. Evidence: `src/components/templates/main-app/projects/index.tsx:2040` | `read_only_card` | `confirm` | Upload card | `C0 local` | `ready_adapter` |
| `menu_import_retry_instruction` | "Retry failed import" | Retry requires re-upload for failed local files. Evidence: `src/components/templates/main-app/projects/index.tsx:2059` | `manual_task_card` | `none` | Task card | `C5 manual only` | `ready_adapter` |

---

## 14. Image And Media Actions

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `image_item_upload` | "Add this photo to masala tea" | Image upload modal. Evidence: `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx:452` | `existing_api_job` then `client_project_mutation` | `confirm` | Upload card | `C2 job/storage` | `needs_adapter_glue` |
| `image_item_generate` | "Generate image for masala tea" | AI image generator with outlet local-only filtering. Evidence: `src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx:121`, `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx:231` | `existing_api_job` | `confirm` to generate, `confirm` to apply | Image card | `C2 job/storage` | `needs_adapter_glue` |
| `image_item_regenerate` | "Try another image" | AI image retry. Evidence: `src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx:190` | `existing_api_job` | `confirm` | Image card | `C2 job/storage` | `needs_adapter_glue` |
| `image_item_edit` | "Remove background from this item photo" | Image editing API. Evidence: `src/app/api/image-editing/route.ts:71`, `src/app/api/image-editing/route.ts:185` | `existing_api_job` | `confirm` to edit, `confirm` to apply | Image card | `C2 job/storage` | `needs_adapter_glue` |
| `image_item_apply_generated` | "Use this generated image" | Upload selected generated image. Evidence: `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx:319` | `client_project_mutation` | `confirm` | Image card | `C1 single project save` plus Storage | `ready_adapter` |
| `image_batch_generation_start` | "Generate images for all items without photos" | Batch image generation with outlet local-only filtering. Evidence: `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx:231`, `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx:353` | `existing_api_job` | `bulk_confirm` | Summary card | `C2 job/storage` | `existing_api_only` |
| `image_batch_result_apply` | "Apply these generated photos" | Batch result apply path. Evidence: `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx:670` | `client_project_mutation` | `bulk_confirm` | Summary card | `C1 single project save` plus Storage | `needs_adapter_glue` |
| `image_preferences_update` | "Use this image style next time" | Image preference persistence. Evidence: `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx:319` | `existing_client_dal` | `confirm` | Card setting | `C3 summary/store write` | `needs_adapter_glue` |
| `image_obp_cover_upload` | "Set this as business cover" | OBP cover upload. Evidence: `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx:157` | `existing_client_dal` | `confirm` | Card approve/edit | `C2 job/storage` plus store save | `needs_adapter_glue` |
| `image_obp_cover_generate` | "Generate official page cover" | OBP cover generation. Evidence: `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx:219` | `existing_api_job` then store save | `confirm` | Image card | `C2 job/storage` | `needs_adapter_glue` |
| `image_obp_gallery_update` | "Add shop photos to official page" | OBP photo upload/move/remove. Evidence: `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx:275`, `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx:347`, `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx:377` | `existing_client_dal` | `confirm` | Card approve/edit | `C2 job/storage` plus store save | `needs_adapter_glue` |

---

## 15. Project And Public Content Actions

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `project_create` | "Create a new drinks menu" | Project create modal. Evidence: `src/components/templates/main-app/projects/index.tsx:1164`, `src/database/projects/index.ts:720` | `client_project_metadata` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `ready_adapter` |
| `project_metadata_update` | "Rename this menu" | Project metadata update. Evidence: `src/components/templates/main-app/projects/index.tsx:1083`, `src/database/projects/index.ts:804` | `client_project_metadata` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `ready_adapter` |
| `project_image_update` | "Change this menu cover image" | Project image resolve/save path. Evidence: `src/components/templates/main-app/projects/index.tsx:1077`, `src/components/templates/main-app/projects/index.tsx:1110` | `client_project_metadata` | `high_confirm` | Card approve/edit | `C2 job/storage` plus `C3 summary/store write` | `needs_adapter_glue` |
| `project_active_update` | "Turn this menu off/on" | Active status update with linked-outlet guard. Evidence: `src/components/templates/main-app/projects/index.tsx:1117`, `src/components/templates/main-app/projects/index.tsx:1133`, `src/database/projects/index.ts:1145` | `client_project_metadata` | `destructive_confirm` when deactivating, otherwise `high_confirm` | Card approve/edit | `C3 summary/store write` | `ready_adapter` |
| `project_set_default` | "Make dinner menu default" | Default project handling. Evidence: `src/components/templates/main-app/projects/index.tsx:1094`, `src/database/projects/index.ts:864` | `client_project_metadata` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `ready_adapter` |
| `project_duplicate` | "Copy this menu for catering" | Duplicate project flow. Evidence: `src/components/templates/main-app/projects/index.tsx:1276`, `src/database/projects/index.ts:1953` | `client_project_metadata` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `ready_adapter` |
| `project_delete` | "Delete old menu" | Delete project flow. Evidence: `src/components/templates/main-app/projects/index.tsx:1216`, `src/database/projects/index.ts:1752` | `client_project_metadata` | `destructive_confirm` | Card approve/edit | `C3 summary/store write` | `ready_adapter` |
| `project_restore` | "Restore deleted menu" | Restore DAL. Evidence: `src/database/projects/index.ts:1877` | `client_project_metadata` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `ready_adapter` |
| `project_reset_files` | "Clear this menu and start again" | Reset project files. Evidence: `src/components/templates/main-app/projects/index.tsx:1247` | `client_project_mutation` | `destructive_confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `project_language_update` | "Add Hindi to this menu" | Language selector/editor save. Evidence: `src/components/templates/main-app/projects/editorView/Editor.tsx:1425`, `src/components/templates/main-app/projects/index.tsx:1534` | `client_project_mutation` | `high_confirm` | Card approve/edit | `C1 single project save` | `needs_adapter_glue` |
| `project_public_content_translate` | "Translate menu title and note" | Public content translation. Evidence: `src/components/templates/main-app/projects/index.tsx:1454` | `existing_api_job` then metadata/project save | `bulk_confirm` | Summary card | `C2 job/storage` plus `C3 summary/store write` | `needs_adapter_glue` |
| `project_public_content_repair` | "Fix menu public text" | Editor public content repair. Evidence: `src/components/templates/main-app/projects/editorView/Editor.tsx:567` | `existing_api_job` then project save | `bulk_confirm` | Summary card | `C2 job/storage` plus `C3 summary/store write` | `needs_adapter_glue` |
| `project_ai_defaults_update` | "Use this writing style for menu descriptions" | AI defaults modal. Evidence: `src/components/templates/main-app/projects/editorView/Editor.tsx:1337` | `client_project_mutation` | `confirm` | Card setting | `C1 single project save` | `needs_adapter_glue` |
| `menu_reorder` | "Move drinks above snacks" | Reorder menu modal. Evidence: `src/components/templates/main-app/projects/editorView/Editor.tsx:1388` | `client_project_mutation` | `bulk_confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `decision_blocks_update` | "Promote cold coffee", "Show cold coffee in Featured section", "Show Featured section" | Featured section settings. Evidence: `src/components/templates/main-app/projects/editorView/DecisionBlocksSettingsModal.tsx:243`, `src/components/templates/main-app/projects/editorView/decisionBlocks.shared.ts:191` | `client_project_mutation` | `confirm` | Fast card | `C1 single project save` | `ready_adapter` |

---

## 16. Design And Menu Presentation Actions

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `menu_design_mood_update` | "Make menu look premium" | Menu mood setting. Evidence: `src/components/templates/main-app/projects/b2cView/menuPage/menuPageSettingsNew.tsx:75` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `menu_design_layout_update` | "Use grid layout" | Menu layout setting. Evidence: `src/components/templates/main-app/projects/b2cView/menuPage/menuPageSettingsNew.tsx:92` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `menu_design_preset_apply` | "Apply clean cafe style" | Design preset apply. Evidence: `src/components/templates/main-app/projects/b2cView/menuPage/menuPageSettingsNew.tsx:110` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `menu_design_color_update` | "Set theme color to Gold" | Menu theme color setting. Evidence: `src/components/templates/main-app/projects/b2cView/designSystem/BrandColorPicker.tsx:67`, `src/components/mobile/screens/MobileDesignEditorScreen.tsx:583` | `client_project_mutation` | `confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `menu_design_visibility_update` | "Hide prices from public menu" | Show images/prices/tabs/icons toggles. Evidence: `src/components/templates/main-app/projects/b2cView/menuPage/menuPageSettingsNew.tsx:131` | `client_project_mutation` | `high_confirm` | Card approve/edit | `C1 single project save` | `ready_adapter` |
| `menu_design_background_update` | "Use this background image" | Background image setting. Evidence: `src/components/templates/main-app/projects/b2cView/menuPage/menuPageSettingsNew.tsx:195` | `client_project_mutation` | `confirm` | Card approve/edit | `C2 job/storage` plus project save | `needs_adapter_glue` |
| `menu_special_note_update` | "Show today's note at top" | Special note setting. Evidence: `src/components/templates/main-app/projects/b2cView/menuPage/menuPageSettingsNew.tsx:211` | `client_project_mutation` | `confirm` | Fast card | `C1 single project save` | `ready_adapter` |
| `menu_temp_status_set` | "Show closed today until 8 PM" | Temp status API. Evidence: `src/app/api/store/temp-status/route.ts:43`, `src/app/api/store/temp-status/route.ts:94` | `existing_server_api` | `high_confirm` | Fast card | `C4 guarded server mutation` | `existing_api_only` |
| `menu_temp_status_clear` | "Remove closed banner" | Temp status clear API. Evidence: `src/app/api/store/temp-status/route.ts:103` | `existing_server_api` | `confirm` | Fast card | `C4 guarded server mutation` | `existing_api_only` |

---

## 17. Publish, Share, Export, And Print Actions

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `menu_publish` | "Publish this menu" | Publish DAL. Evidence: `src/database/projects/index.ts:1315` | `existing_client_dal` | `high_confirm` | Fast card | `C3 summary/store write` | `ready_adapter` |
| `menu_snapshot_create` | Side effect of publish | Publish snapshots. Evidence: `src/database/projects/index.ts:1428` | Side effect only | `none` | Receipt only | Existing publish cost | `ready_adapter` |
| `menu_qr_download` | "Download QR for menu" | Share modal QR. Evidence: `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:143` | `browser_local_export` | `external_confirm` | Download card | `C0 local` | `ready_adapter` |
| `menu_share_whatsapp` | "Share menu on WhatsApp" | Share modal social action. Evidence: `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:167` | `browser_local_export` | `external_confirm` | Share card | `C0 local` | `ready_adapter` |
| `menu_share_copy_link` | "Copy menu link" | Copy URL action. Evidence: `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:479` | `browser_local_export` | `none` | Share card | `C0 local` | `ready_adapter` |
| `public_presence_link_share` | "Copy official page link" | Mobile official page copy/open/share. Evidence: `src/components/mobile/screens/MobileShareScreen.tsx:1225` | `browser_local_export` | `none` | Share card | `C0 local` | `ready_adapter` |
| `public_presence_qr_download` | "Download official page QR" | Mobile official page QR. Evidence: `src/components/mobile/screens/MobileShareScreen.tsx:1218` | `browser_local_export` | `external_confirm` | Download card | `C0 local` | `ready_adapter` |
| `menu_pdf_download` | "Download menu PDF" | PDF generation from share modal. Evidence: `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:225` | `browser_local_export` | `external_confirm` | Download card | `C0 local` | `ready_adapter` |
| `menu_data_export_json` | "Export menu JSON" | Structured export. Evidence: `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:199` | `browser_local_export` | `external_confirm` | Download card | `C0 local` | `ready_adapter` |
| `menu_data_export_xlsx` | "Export menu Excel" | Structured export. Evidence: `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:199` | `browser_local_export` | `external_confirm` | Download card | `C0 local` | `ready_adapter` |
| `menu_data_post_external` | "Send menu data to this API" | No AMM posting adapter. Use supported JSON/XLSX export instead. Evidence: `src/components/templates/main-app/projects/ShareModal.tsx:25` | `read_only_card` | `none` | Unsupported card | `C0 local plus compact session doc` | `blocked` |
| `menu_kit_download` | "Download full menu kit" | Mobile full menu kit download. Evidence: `src/components/mobile/screens/MobileShareScreen.tsx:780` | `browser_local_export` | `external_confirm` | Download card | `C0 local` | `ready_adapter` |
| `menu_kit_asset_download` | "Download only the QR poster" | Mobile single asset download. Evidence: `src/components/mobile/screens/MobileShareScreen.tsx:799` | `browser_local_export` | `external_confirm` | Download card | `C0 local` | `ready_adapter` |
| `menu_kit_asset_share` | "Share the table tent file" | Mobile menu kit native share/fallback. Evidence: `src/components/mobile/screens/MobileShareScreen.tsx:810`, `src/lib/menu-kit/menuKitGenerator.ts:271` | `browser_local_export` | `external_confirm` | Share card | `C0 local` | `ready_adapter` |
| `item_share_card_download` | "Download a card for masala tea" | Sharable item card download. Evidence: `src/lib/menu/sharableItemCard.ts:185`, `src/components/templates/main-app/projects/editorView/editItemModal.tsx:284` | `browser_local_export` | `external_confirm` | Download card | `C0 local` | `ready_adapter` |
| `item_share_card_share` | "Share masala tea card" | Sharable item card native share/fallback. Evidence: `src/lib/menu/sharableItemCard.ts:197`, `src/components/mobile/sheets/ItemEditSheet.tsx:296` | `browser_local_export` | `external_confirm` | Share card | `C0 local` | `ready_adapter` |
| `print_asset_template_preview` | "Preview table tent styles" | Printable template preview. Evidence: `src/components/mobile/screens/MobileShareScreen.tsx:608`, `src/components/mobile/screens/MobileShareScreen.tsx:660` | `browser_local_export` | `none` | Preview card | `C0 local` | `ready_adapter` |
| `print_asset_template_download` | "Download table tent" | Mobile printable asset generation. Evidence: `src/components/mobile/screens/MobileShareScreen.tsx:665`, `src/components/mobile/screens/MobileShareScreen.tsx:1418` | `browser_local_export` | `external_confirm` | Download card | `C0 local` | `ready_adapter` |
| `physical_surface_tent_card_download` | "Download table tent for this item" | Today table tent download. Evidence: `src/components/templates/main-app/today/components/TentCardSection/index.tsx:49`, `src/lib/physical-surfaces/tentCardGenerator.ts:62` | `browser_local_export` | `external_confirm` | Download card | `C0 local` | `ready_adapter` |
| `physical_surface_sticker_download` | "Download counter sticker" | Today sticker download. Evidence: `src/components/templates/main-app/today/components/StickerSection/index.tsx:33`, `src/lib/physical-surfaces/stickerGenerator.ts:22` | `browser_local_export` | `external_confirm` | Download card | `C0 local` | `ready_adapter` |
| `menu_card_export_create` | "Create print menu" | Menu Card Export controller. Evidence: `src/hooks/useMenuCardExportController.ts:494` | `browser_local_export` | `external_confirm` | Download card | `C0 local` | `ready_adapter` |
| `menu_card_export_style_update` | "Use compact print style" | Menu Card Export settings. Evidence: `src/hooks/useMenuCardExportController.ts:370` | `browser_local_export` | `none` | Card approve/edit | `C0 local` | `ready_adapter` |
| `menu_card_design_suggest` | "Suggest best print layout" | Design advisor API. Evidence: `src/app/api/menu-card-export/design-advisor/route.ts:88`, `src/app/api/menu-card-export/design-advisor/route.ts:153` | `existing_server_api` | `confirm` | Summary card | `C2 job/storage` | `existing_api_only` |
| `menu_card_design_apply` | "Apply suggested print layout" | Apply design advice. Evidence: `src/hooks/useMenuCardExportController.ts:480` | `browser_local_export` | `confirm` | Summary card | `C0 local` | `ready_adapter` |

---

## 18. Special Menu Actions

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `special_menu_list` | "Show special menus" | Special menu hook list. Evidence: `src/hooks/useSpecialMenus.ts:91`, `src/database/projects/index.ts:2161` | `existing_client_dal` | `none` | Native mobile screen | `C3 summary/store write` read pattern | `ready_adapter` |
| `special_menu_create` | "Create Diwali menu from dinner menu" | Create special menu. Evidence: `src/hooks/useSpecialMenus.ts:127`, `src/database/projects/index.ts:2234` | `existing_client_dal` | `high_confirm` | Native mobile screen | `C3 summary/store write` | `ready_adapter` |
| `special_menu_update` | "Change special menu timing" | Update special menu. Evidence: `src/hooks/useSpecialMenus.ts:176`, `src/database/projects/index.ts:2362` | `existing_client_dal` | `high_confirm` | Native mobile screen | `C3 summary/store write` | `ready_adapter` |
| `special_menu_activate` | "Start special menu now" | Activate special menu. Evidence: `src/hooks/useSpecialMenus.ts:223`, `src/database/projects/index.ts:2547` | `existing_client_dal` | `high_confirm` | Native mobile screen | `C3 summary/store write` | `ready_adapter` |
| `special_menu_deactivate` | "End special menu now" | Deactivate special menu. Evidence: `src/database/projects/index.ts:2596` | `existing_client_dal` | `destructive_confirm` | Native mobile screen | `C3 summary/store write` | `ready_adapter` |
| `special_menu_cancel` | "Cancel scheduled special menu" | Cancel special menu. Evidence: `src/database/projects/index.ts:2646` | `existing_client_dal` | `destructive_confirm` | Native mobile screen | `C3 summary/store write` | `ready_adapter` |
| `special_menu_name_translate` | "Translate special menu name" | Create special menu translation. Evidence: `src/components/templates/main-app/projects/CreateSpecialMenuModal.tsx:109` | `existing_api_job` | `confirm` | Native mobile screen | `C2 job/storage` | `needs_adapter_glue` |

---

## 19. Multi-Outlet Actions

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `outlet_scope_select` | "Apply this to all outlets or only this store" | Existing multi-outlet project context and override policy. Evidence: `src/components/templates/main-app/projects/editorView/editItemModal.tsx:181`, `src/app/api/projects/outlet-save/route.ts:423` | `read_only_card` | `high_confirm` | Scope card | `C0 local` | `ready_adapter` |
| `outlet_override_update` | "Change outlet price only for Bandra" | Outlet save API policy. Evidence: `src/app/api/projects/outlet-save/route.ts:329`, `src/app/api/projects/outlet-save/route.ts:433` | `existing_server_api` | `high_confirm` | Scope card | `C4 guarded server mutation` | `existing_api_only` |
| `outlet_project_save` | "Save outlet-local menu change" | `updateProject()` outlet branch. Evidence: `src/database/projects/index.ts:973` | `existing_server_api` | `high_confirm` | Scope card | `C4 guarded server mutation` | `existing_api_only` |
| `outlet_store_customization_update` | "Change only this outlet's price/availability/bestseller settings" | Store Customization modal. Evidence: `src/components/templates/main-app/projects/editorView/StoreCustomizationModal.tsx:152`, `src/components/templates/main-app/projects/editorView/StoreCustomizationModal.tsx:202`, `src/components/templates/main-app/projects/editorView/Editor.tsx:1530` | `existing_server_api` through outlet save policy | `high_confirm` | Scope card | `C4 guarded server mutation` | `existing_api_only` |
| `outlet_theme_override_update` | "Change theme only for this outlet" | Outlet save policy checks. Evidence: `src/app/api/projects/outlet-save/route.ts:294`, `src/app/api/projects/outlet-save/route.ts:313` | `existing_server_api` | `high_confirm` | Scope card | `C4 guarded server mutation` | `existing_api_only` |
| `outlet_create` | "Add a new outlet" | Outlet creation API. Evidence: `src/app/api/outlets/create/route.ts:112`, `src/app/api/outlets/create/route.ts:190`, `src/app/api/outlets/create/route.ts:404` | `existing_server_api` | `high_confirm` | Task/card with billing state | `C4 guarded server mutation` | `existing_api_only` |
| `outlet_billing_capacity_required` | Outlet creation blocked by billing | Outlet creation API error. Evidence: `src/app/api/outlets/create/route.ts:201`, `src/app/api/outlets/create/route.ts:525` | `manual_task_card` | `none` | Task card | `C5 manual only` | `ready_adapter` |
| `outlet_delete_or_unlink` | "Delete linked outlet menu" | Current code blocks inherited project delete. Evidence: `src/database/projects/index.ts:1775` | `manual_task_card` | `destructive_confirm` | Task card | `C5 manual only` | `manual_task_only` |

---

## 20. Public Presence And Store Actions

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `public_presence_text_update` | "Update official page intro" | Official Page descriptor/known-for/note fields. Evidence: `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx:578`, `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx:659` | `existing_client_dal` via `updateStore()` | `confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `public_presence_action_toggle` | "Hide call button" | OBP action toggles. Evidence: `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx:148` | `existing_client_dal` via `updateStore()` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `public_presence_link_update` | "Add Google Maps link" | OBP links. Evidence: `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx:702` | `existing_client_dal` via `updateStore()` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `public_presence_google_review_update` | "Add Google review link and rating" | OBP Google review fields. Evidence: `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx:814`, `src/components/mobile/screens/MobileOfficialPageScreen.tsx:1271` | `existing_client_dal` via `updateStore()` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `public_presence_accent_update` | "Use green accent on official page" | OBP accent color. Evidence: `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx:731` | `existing_client_dal` via `updateStore()` | `confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `public_presence_social_links_update` | "Add Instagram link" | Mobile advanced social settings. Evidence: `src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx:407` | `existing_client_dal` via `updateStore()` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `public_presence_business_attributes_update` | "Mark this as pure veg" | Mobile business attributes screen. Evidence: `src/components/mobile/screens/MobileBusinessAttributesScreen.tsx:36` | `existing_client_dal` via `updateStore()` | `confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `public_presence_business_copy_generate` | "Write official page copy" | Mobile business copy generation. Evidence: `src/components/mobile/screens/MobileBusinessCopySetupScreen.tsx:82` | `existing_api_job` then `updateStore()` | `confirm` | Draft card | `C2 job/storage` plus `C3 summary/store write` | `needs_adapter_glue` |
| `public_presence_business_copy_translation_repair` | "Translate business copy" | Mobile business copy translation repair. Evidence: `src/components/mobile/screens/MobileBusinessCopySetupScreen.tsx:222` | `existing_api_job` then `updateStore()` | `confirm` | Draft card | `C2 job/storage` plus `C3 summary/store write` | `needs_adapter_glue` |
| `store_logo_update` | "Change business logo" | Store logo update/upload. Evidence: `src/database/stores/index.tsx:137`, `src/database/stores/index.tsx:247` | `existing_client_dal` | `high_confirm` | Card approve/edit | `C2 job/storage` plus `C3 summary/store write` | `needs_adapter_glue` |
| `store_business_profile_update` | "Update business profile details" | Mobile basic settings save. Evidence: `src/components/mobile/screens/MobileBasicSettingsScreen.tsx:90`, `src/components/mobile/screens/MobileBasicSettingsScreen.tsx:149` | `existing_client_dal` via `updateStore()` and existing tenant brand update | `high_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `store_locale_region_update` | "Change currency, language, or timezone" | Mobile locale settings save. Evidence: `src/components/mobile/screens/MobileLocaleSettingsScreen.tsx:127`, `src/components/mobile/screens/MobileLocaleSettingsScreen.tsx:150` | `existing_client_dal` via `updateStore()` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `store_working_hours_update` | "Set Sunday closed" | Store update summary fields. Evidence: `src/database/stores/index.tsx:306`, `src/database/stores/index.tsx:375` | `existing_client_dal` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `store_time_slot_preset_create` | "Create breakfast time slot" | Mobile time slot preset create. Evidence: `src/components/mobile/screens/MobileTimeSlotsScreen.tsx:101`, `src/database/stores/index.tsx:442` | `existing_client_dal` via `updateTimeSlotPresets()` | `confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `store_time_slot_preset_update` | "Change breakfast hours" | Mobile time slot preset update. Evidence: `src/components/mobile/screens/MobileTimeSlotsScreen.tsx:101`, `src/database/stores/index.tsx:442` | `existing_client_dal` via `updateTimeSlotPresets()` | `confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `store_time_slot_preset_delete` | "Delete old evening slot" | Mobile time slot preset delete. Evidence: `src/components/mobile/screens/MobileTimeSlotsScreen.tsx:212`, `src/database/stores/index.tsx:442` | `existing_client_dal` via `updateTimeSlotPresets()` and project category cleanup | `destructive_confirm` | Card approve/edit | `C3 summary/store write` plus possible `C1 single project save` | `needs_adapter_glue` |
| `store_address_contact_update` | "Update address and phone" | Store update summary fields. Evidence: `src/database/stores/index.tsx:306`, `src/database/stores/index.tsx:375` | `existing_client_dal` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `feedback_settings_update` | "Turn feedback on and set defaults" | Mobile advanced feedback settings. Evidence: `src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx:407`, `src/components/mobile/screens/MobileAdvancedSettingsScreen.tsx:526` | `existing_client_dal` via `updateStore()` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `seo_settings_update` | "Update SEO title and description" | Mobile SEO settings save. Evidence: `src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx:442`, `src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx:476` | `existing_client_dal` via `updateStore()` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `analytics_tracking_update` | "Add Google Analytics ID" | Mobile analytics settings save. Evidence: `src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx:411`, `src/components/mobile/screens/MobileSeoAnalyticsScreen.tsx:425` | `existing_client_dal` via `updateStore()` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `domain_subdomain_check` | "Check if this public link is available" | Mobile subdomain availability API. Evidence: `src/components/mobile/screens/MobileDomainSettingsScreen.tsx:114`, `src/components/mobile/screens/MobileDomainSettingsScreen.tsx:125` | `existing_server_api` | `none` | Status card | `C4 guarded server mutation` read/check pattern | `existing_api_only` |
| `domain_subdomain_update` | "Change public link" | Mobile subdomain update via store save. Evidence: `src/components/mobile/screens/MobileDomainSettingsScreen.tsx:136`, `src/components/mobile/screens/MobileDomainSettingsScreen.tsx:145` | `existing_client_dal` via `updateStore()` | `high_confirm` | Task/card | `C3 summary/store write` | `needs_adapter_glue` |
| `domain_custom_check` | "Check this custom domain" | Custom domain availability check. Evidence: `src/components/mobile/screens/MobileDomainSettingsScreen.tsx:178`, `src/database/stores/index.tsx:90` | `existing_client_dal` read/check path | `none` | Status card | `C3 summary/store write` read/check pattern | `needs_adapter_glue` |
| `domain_custom_connect` | "Connect my custom domain" | Mobile custom domain add API. Evidence: `src/components/mobile/screens/MobileDomainSettingsScreen.tsx:155`, `src/components/mobile/screens/MobileDomainSettingsScreen.tsx:159` | `existing_server_api` | `high_confirm` | Task/card | `C4 guarded server mutation` | `existing_api_only` |
| `domain_custom_verify` | "Verify my domain setup" | Mobile domain refresh/verify API. Evidence: `src/components/mobile/screens/MobileDomainSettingsScreen.tsx:93`, `src/components/mobile/screens/MobileDomainSettingsScreen.tsx:97` | `existing_server_api` | `none` | Status card | `C4 guarded server mutation` read/check pattern | `existing_api_only` |
| `domain_custom_remove` | "Remove this custom domain" | Mobile custom domain remove API. Evidence: `src/components/mobile/screens/MobileDomainSettingsScreen.tsx:194`, `src/components/mobile/screens/MobileDomainSettingsScreen.tsx:197` | `existing_server_api` | `destructive_confirm` | Task/card | `C4 guarded server mutation` | `existing_api_only` |

---

## 21. Feature-Doc Sweep Operational Actions

These action types were added after walking feature docs folder by folder and checking their related runtime files. They are not replacements for the core menu/editor actions above; they are additional manual flows where AMM can become an alternate entry point.

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `compliance_page_status` | "Show my privacy and terms pages" | Compliance GET preview/status API. Evidence: `src/components/mobile/components/MobileCompliancePagesEditor.tsx:56`, `src/app/api/compliance/route.ts:36` | `existing_server_api` | `none` | Status/review card | `C4 guarded server mutation` read/check pattern | `existing_api_only` |
| `compliance_page_override_save` | "Use this refund policy text" | Compliance override save. Evidence: `src/components/mobile/components/MobileCompliancePagesEditor.tsx:122`, `src/app/api/compliance/route.ts:95`, `src/database/compliance/index.ts:42` | `existing_server_api` | `high_confirm` | Card approve/edit | `C4 guarded server mutation` | `existing_api_only` |
| `compliance_page_override_reset` | "Reset terms to default" | Compliance override reset. Evidence: `src/components/mobile/components/MobileCompliancePagesEditor.tsx:147`, `src/app/api/compliance/route.ts:143`, `src/database/compliance/index.ts:66` | `existing_server_api` | `destructive_confirm` | Card approve/edit | `C4 guarded server mutation` | `existing_api_only` |
| `communication_template_generate` | "Write a WhatsApp message for customers" | Customer communication template generation. Evidence: `src/lib/communication/messageTemplates.ts:45`, `src/components/templates/main-app/useMenuList/CommunicationKit.tsx:56` | `browser_local_export` | `none` | Message card | `C0 local` | `ready_adapter` |
| `communication_template_copy` | "Copy a customer message" | Desktop/mobile message copy. Evidence: `src/components/templates/main-app/useMenuList/CommunicationKit.tsx:104`, `src/components/mobile/components/CommunicationKit.tsx:116` | `browser_local_export` | `none` | Copy card | `C0 local` | `ready_adapter` |
| `communication_template_share` | "Share today's menu message" | Mobile native share. Evidence: `src/components/mobile/components/CommunicationKit.tsx:127`, `src/components/mobile/components/CommunicationKit.tsx:161` | `browser_local_export` | `external_confirm` | Share card | `C0 local` | `ready_adapter` |
| `presence_surface_status` | "Where is my menu already placed?" | Presence monitor reads current store `menuPresence`. Evidence: `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx:144`, `src/components/mobile/components/PresenceMonitor.tsx:111` | `read_only_card` | `none` | Status card | `C0 local` with existing store context | `ready_adapter` |
| `presence_surface_confirm` | "I added the QR on my counter" | Presence confirmation. Evidence: `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx:182`, `src/components/mobile/components/PresenceMonitor.tsx:163`, `src/database/stores/index.tsx:484` | `existing_client_dal` | `confirm` | Fast card | `C3 summary/store write` | `needs_adapter_glue` |
| `presence_surface_unconfirm` | "Remove table tent from tracked places" | Presence remove confirmation. Evidence: `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx:200`, `src/components/mobile/components/PresenceMonitor.tsx:181`, `src/database/stores/index.tsx:484` | `existing_client_dal` | `destructive_confirm` | Fast card | `C3 summary/store write` | `needs_adapter_glue` |
| `review_risk_status` | "Any review I should be careful with?" | Reviews state API is built but disabled. Evidence: `src/app/api/reviews/states/route.ts:24`, `src/config/features.ts:1467` | `existing_server_api` | `none` | Status card | `C4 guarded server mutation` read/check pattern | `blocked` |
| `review_reply_suggest` | "Suggest a calm reply to this review" | Review reply suggestion API is built but disabled. Evidence: `src/app/api/reviews/suggest/route.ts:103`, `src/config/features.ts:1477` | `existing_server_api` | `confirm` | Draft card | `C2 job/storage` | `blocked` |
| `review_reply_copy` | "Copy the review reply" | Review reply tool copy flow. Evidence: `src/components/templates/main-app/reviews/ReviewReplyTool.tsx:56`, `src/components/templates/main-app/reviews/ReviewReplyTool.tsx:188` | `browser_local_export` | `none` | Copy card | `C0 local` | `blocked` |
| `review_reply_post_external` | "Post this reply to Google" | No AMM direct-posting route is available. Copy/reply draft work stays in the Feedback screen. | `read_only_card` | `none` | Unsupported card | `C0 local plus compact session doc` | `blocked` |

---

## 22. Mobile PWA Operational And Integration Actions

These actions come from owner mobile PWA screens that are not normal menu editing. AMM can support them as standalone operation cards only through their current DAL/API paths.

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `customer_app_settings_update` | "Change customer app colors and install settings" | Mobile customer app settings save. Evidence: `src/components/mobile/screens/MobileCustomerAppScreen.tsx:131`, `src/database/pwa/index.ts:75` | `existing_client_dal` via PWA DAL | `high_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `customer_app_icon_update` | "Use this app icon" | Mobile customer app icon upload/override. Evidence: `src/components/mobile/screens/MobileCustomerAppScreen.tsx:170`, `src/database/pwa/index.ts:115`, `src/database/pwa/index.ts:140` | `existing_client_dal` plus Storage | `confirm` | Image/card approve | `C2 job/storage` plus `C3 summary/store write` | `needs_adapter_glue` |
| `customer_app_install_link_share` | "Share customer app install link" | Mobile share customer app install link. Evidence: `src/components/mobile/screens/MobileCustomerAppScreen.tsx:281`, `src/components/mobile/screens/MobileShareScreen.tsx:1277` | `browser_local_export` | `external_confirm` | Share card | `C0 local` | `ready_adapter` |
| `digital_screen_status_card` | "Show screen status" | Mobile digital screen state load. Evidence: `src/components/mobile/screens/MobileDigitalScreensScreen.tsx:224`, `src/database/campaigns/index.ts:644`, `src/database/campaigns/index.ts:667` | `read_only_card` or `existing_client_dal` initialize-if-needed | `none` | Status card | `C3 summary/store write` read/init pattern | `needs_adapter_glue` |
| `digital_screen_link_share` | "Copy the TV screen link" | Mobile screen copy/open actions. Evidence: `src/components/mobile/screens/MobileDigitalScreensScreen.tsx:390`, `src/components/mobile/screens/MobileShareScreen.tsx:1584` | `browser_local_export` | `external_confirm` | Share card | `C0 local` | `ready_adapter` |
| `digital_screen_override_update` | "Override screen message today" | Mobile screen settings update. Evidence: `src/components/mobile/screens/MobileDigitalScreensScreen.tsx:260`, `src/database/campaigns/index.ts:706` | `existing_client_dal` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `digital_screen_slide_upload` | "Add this slide to customer screen" | Mobile screen slide upload. Evidence: `src/components/mobile/screens/MobileDigitalScreensScreen.tsx:305`, `src/database/campaigns/index.ts:919` | `existing_client_dal` plus Storage | `confirm` | Upload card | `C2 job/storage` plus `C3 summary/store write` | `needs_adapter_glue` |
| `digital_screen_slide_caption_update` | "Change screen slide caption" | Mobile screen caption update. Evidence: `src/database/campaigns/index.ts:831` | `existing_client_dal` | `confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `digital_screen_slide_delete` | "Remove this screen slide" | Mobile screen slide delete. Evidence: `src/components/mobile/screens/MobileDigitalScreensScreen.tsx:339`, `src/database/campaigns/index.ts:790` | `existing_client_dal` | `destructive_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `feedback_inbox_list` | "Show latest feedback" | Mobile feedback list. Evidence: `src/components/mobile/screens/MobileFeedbackScreen.tsx:56`, `src/database/guestFeedback/index.ts:113` | `read_only_card` with bounded query | `none` | Summary card | `C3 summary/store write` read pattern | `needs_adapter_glue` |
| `feedback_status_update` | "Mark this feedback resolved" | Mobile feedback detail status update. Evidence: `src/components/mobile/screens/MobileFeedbackDetail.tsx:29`, `src/database/guestFeedback/index.ts:217` | `existing_client_dal` | `confirm` | Fast card | `C3 summary/store write` | `needs_adapter_glue` |
| `feedback_reply_save` | "Save this reply to feedback" | Mobile feedback reply save. Evidence: `src/components/mobile/screens/MobileFeedbackDetail.tsx:40`, `src/database/guestFeedback/index.ts:246` | `existing_client_dal` | `confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `feedback_link_share` | "Share feedback link" | Mobile feedback link/share. Evidence: `src/components/mobile/screens/MobileFeedbackScreen.tsx:110`, `src/components/mobile/screens/MobileShareScreen.tsx:1305` | `browser_local_export` | `external_confirm` | Share card | `C0 local` | `ready_adapter` |
| `feedback_qr_download` | "Download feedback QR" | Mobile feedback QR/download. Evidence: `src/components/mobile/screens/MobileFeedbackScreen.tsx:302`, `src/components/mobile/screens/MobileShareScreen.tsx:826` | `browser_local_export` | `external_confirm` | Download card | `C0 local` | `ready_adapter` |
| `pos_sync_settings_update` | "Turn POS sync on" | Mobile POS sync settings save. Evidence: `src/components/mobile/screens/MobilePosSyncScreen.tsx:86`, `src/components/mobile/screens/MobilePosSyncScreen.tsx:133` | `existing_client_dal` via `updateStore()` | `high_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `pos_sync_secret_rotate` | "Regenerate POS secret" | Mobile POS secret regeneration. Evidence: `src/components/mobile/screens/MobilePosSyncScreen.tsx:178` | `existing_client_dal` via existing POS settings persist path | `destructive_confirm` | Card approve/edit | `C3 summary/store write` | `needs_adapter_glue` |
| `pos_sync_secret_copy` | "Copy POS secret" | POS secret copy. Evidence: `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx:277`, `src/components/mobile/screens/MobilePosSyncScreen.tsx:221` | `browser_local_export` | `external_confirm` | Copy card | `C0 local` | `ready_adapter` |
| `pos_sync_test` | "Test POS connection" | Mobile POS test API. Evidence: `src/components/mobile/screens/MobilePosSyncScreen.tsx:227`, `src/components/mobile/screens/MobilePosSyncScreen.tsx:233` | `existing_server_api` | `none` | Status card | `C4 guarded server mutation` read/test pattern | `existing_api_only` |
| `pos_sync_setup_info_copy` | "Copy POS setup details" | Mobile share POS setup info. Evidence: `src/components/mobile/screens/MobileShareScreen.tsx:866`, `src/components/mobile/screens/MobileShareScreen.tsx:1652` | `browser_local_export` | `external_confirm` | Share card | `C0 local` | `ready_adapter` |
| `pos_sync_instruction_email_draft` | "Prepare setup email for my POS provider" | Desktop send-instructions draft with daily count. Evidence: `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx:300`, `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx:321` | `existing_client_dal` plus external mail handoff | `external_confirm` | Task/card | `C3 summary/store write` plus `C5 manual only` | `needs_adapter_glue` |
| `pos_sync_technical_summary_copy` | "Copy the technical summary" | Desktop copy technical summary. Evidence: `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx:338`, `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx:736` | `browser_local_export` | `external_confirm` | Copy card | `C0 local` | `ready_adapter` |
| `pos_sync_sample_payload_download` | "Download POS sample payload" | Desktop sample payload download. Evidence: `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx:343`, `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx:729` | `browser_local_export` | `external_confirm` | Download card | `C0 local` | `ready_adapter` |
| `integration_status_review` | "Show integration status" | Mobile integrations status screen. Evidence: `src/components/mobile/screens/MobileIntegrationsScreen.tsx:89` | `read_only_card` | `none` | Status card | `C0 local` or bounded existing status read | `ready_adapter` |

### 22.1 Exact Existing Screen Handoffs

These action types are intentionally exact even when the current card is a handoff/read-only card. They prevent known MenuList owner flows from collapsing into `system_manual_task_create`.

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `menu_design_settings_open` | "Open menu design" | Existing Menu Design screen. Evidence: `src/components/mobile/components/MobileProjectSelectorSheet.tsx:1091` | `manual_task_card` | `none` | Task card | `C5 manual only` | `manual_task_only` |
| `locations_screen_open` | "Open locations" | Existing Locations screen. Evidence: `src/components/mobile/MobileShell.tsx:1` | `manual_task_card` | `none` | Task card | `C5 manual only` | `manual_task_only` |
| `staff_access_open` | "Open staff users" | Existing Staff screen. Evidence: `src/components/mobile/screens/MobileUsersScreen.tsx:1` | `manual_task_card` | `none` | Task card | `C5 manual only` | `manual_task_only` |
| `roles_permissions_open` | "Open roles and permissions" | Existing staff roles/permissions flow. Evidence: `src/app/api/staff/roles/route.ts:1` | `manual_task_card` | `none` | Task card | `C5 manual only` | `manual_task_only` |
| `billing_screen_open` | "Open billing" | Existing Billing screen. Evidence: `src/components/templates/main-app/billing/index.tsx:1` | `manual_task_card` | `none` | Task card | `C5 manual only` | `manual_task_only` |
| `transactions_screen_open` | "Open transactions" | Existing Transactions screen. Evidence: `src/components/templates/main-app/transactions/index.tsx:1` | `read_only_card` | `none` | Task card | `C5 manual only` | `manual_task_only` |
| `business_health_open` | "Open Business Health" | Existing Business Health screen. Evidence: `src/components/templates/main-app/ownerBusinessAssistant/BusinessHealthPage.tsx:1` | `read_only_card` | `none` | Task card | `C5 manual only` | `manual_task_only` |
| `past_activity_open` | "Show past activity" | Existing activity/history surface. Evidence: `src/components/templates/main-app/today/PastActivity/index.tsx:50` | `read_only_card` | `none` | Task card | `C5 manual only` | `manual_task_only` |
| `print_assets_open` | "Open print assets" | Existing Assets/share export flow. Evidence: `src/components/mobile/screens/MobileShareScreen.tsx:608` | `manual_task_card` | `none` | Task card | `C5 manual only` | `manual_task_only` |
| `print_menu_open` | "Open print menu" | Existing Print Menu flow. Evidence: `src/hooks/useMenuCardExportController.ts:494` | `manual_task_card` | `none` | Task card | `C5 manual only` | `manual_task_only` |
| `help_screen_open` | "Open help" | Existing Help screen. Evidence: `src/components/mobile/screens/MobileMoreScreen.tsx:492` | `read_only_card` | `none` | Task card | `C5 manual only` | `manual_task_only` |

## 23. Staff And Access Actions

Staff and access actions are not core menu edits. They are included because the owner may ask AMM to do existing owner tasks, but every staff action must use the guarded staff APIs.

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `staff_list` | "Show my staff" | Staff list API. Evidence: `src/app/api/staff/route.ts:11`, `src/lib/staffManagement/server.ts:696` | `existing_server_api` | `none` | Summary card | `C4 guarded server mutation` read pattern | `existing_api_only` |
| `staff_create` | "Add cashier staff" | Staff create API. Evidence: `src/app/api/staff/route.ts:12`, `src/lib/staffManagement/server.ts:735` | `existing_server_api` | `high_confirm` | Card approve/edit | `C4 guarded server mutation` | `existing_api_only` |
| `staff_update` | "Change staff role/store" | Staff update API. Evidence: `src/app/api/staff/route.ts:13`, `src/lib/staffManagement/server.ts:979` | `existing_server_api` | `high_confirm` | Card approve/edit | `C4 guarded server mutation` | `existing_api_only` |
| `staff_remove` | "Remove staff from store" | Staff delete API. Evidence: `src/app/api/staff/route.ts:14`, `src/lib/staffManagement/server.ts:1140` | `existing_server_api` | `destructive_confirm` | Card approve/edit | `C4 guarded server mutation` | `existing_api_only` |
| `staff_password_reset` | "Create new staff passcode" | Staff password reset API. Evidence: `src/app/api/staff/password-reset/route.ts:6`, `src/lib/staffManagement/server.ts:1255` | `existing_server_api` | `high_confirm` | Card approve/edit | `C4 guarded server mutation` | `existing_api_only` |
| `staff_force_signout` | "Sign out staff now" | Force signout API. Evidence: `src/app/api/staff/force-signout/route.ts:6`, `src/lib/staffManagement/server.ts:1369` | `existing_server_api` | `high_confirm` | Card approve/edit | `C4 guarded server mutation` | `existing_api_only` |
| `staff_role_save` | "Create manager role" | Role save API. Evidence: `src/app/api/staff/roles/route.ts:9`, `src/lib/staffManagement/server.ts:1471` | `existing_server_api` | `high_confirm` | Card approve/edit | `C4 guarded server mutation` | `existing_api_only` |
| `staff_role_delete` | "Turn off old role" | Role delete API. Evidence: `src/app/api/staff/roles/route.ts:11`, `src/lib/staffManagement/server.ts:1539` | `existing_server_api` | `destructive_confirm` | Card approve/edit | `C4 guarded server mutation` | `existing_api_only` |

---

## 24. AMM Internal Control Actions

| Action type | Owner command examples | Manual equivalent | Execution mode | Approval | Mobile | Cost | State |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `system_clarification_request` | "Which tea did you mean?" | AMM-only clarification card. | `read_only_card` | `none` | Conversation card | `C0 local` plus compact session doc | `ready_adapter` |
| `system_unsupported_action` | "Post this directly to Swiggy" | Destination-specific not-supported card; must not imply integration support, manual completion, or a generic manual-task placeholder for known external destinations. | `read_only_card` | `none` | Unsupported card | `C0 local` plus compact session doc | `ready_adapter` |
| `system_receipt_create` | "Done" response after action | AMM-only receipt. | `read_only_card` | `none` | Receipt card | Compact proposal/session write | `ready_adapter` |
| `system_manual_task_create` | "Ask staff to take photo" | Ad hoc manual task only. Known MenuList screen/action families must use their specific action type instead. | `manual_task_card` | `confirm` | Task card | Compact proposal/session write | `ready_adapter` |
| `system_rollback_offer` | "Undo last menu change" | Command Center local undo exists, durable AMM undo needs operation ledger. Evidence: `src/components/templates/main-app/projects/editorView/CommandCenterModal/index.tsx:101` | Adapter-specific undo only when before/after reverse patch exists; otherwise `manual_task_card` until operation ledger exists | `destructive_confirm` | Card approve/edit | `C5 manual only` or adapter-specific | `needs_adapter_glue` |
| `rule_suggestion` | "Remind me to mark lunch unavailable daily" | New AMM rule proposal, not existing manual automation. | `read_only_card` | `confirm` | Rule card | Compact rule doc only | `needs_adapter_glue` |
| `rule_create` | "Apply this rule automatically" | New AMM rule execution contract. | `existing_server_api` after rule registry exists | `high_confirm` | Rule card | Rule doc plus bounded execution ledger | `blocked` |
| `rule_pause` | "Pause that rule" | New AMM rule execution contract. | `existing_server_api` after rule registry exists | `confirm` | Rule card | Rule doc write | `blocked` |
| `rule_execute` | Rule fires and proposes/executes action | New AMM rule execution contract. | Adapter-specific | Adapter-specific | Receipt/card | Adapter-specific | `blocked` |

---

## 25. Explicitly Unsupported Direct Automation

These owner requests are not direct AMM actions in current MenuList. They resolve to unsupported cards:

| Request | AMM response type | Reason |
| --- | --- | --- |
| Post menu changes directly to third-party delivery platforms | `system_unsupported_action` | No current MenuList-owned posting adapter; do not show Mark done or imply support. |
| Post social content directly to Instagram/Facebook/Google | `system_unsupported_action` | Current MenuList share/export surfaces only copy MenuList-owned links/assets; they do not post to external platforms. |
| Mutate Google Business Profile directly | `system_unsupported_action` | No production direct-write integration contract in current MenuList flow. |
| Post Google review replies directly | `system_unsupported_action` | Review reply suggestion exists only behind disabled flags; no production direct-posting adapter is available. |
| Change billing plan, payment, invoices, or reseller/platform account state | `system_unsupported_action` or existing billing screen handoff | Billing/account surfaces are not AMM mutation targets. |
| Change owner account profile, password, session, or logout state | `system_unsupported_action` or account screen handoff | Account security flows must remain explicit user-driven UI/API actions. |
| Mutate internal platform, reseller, Answerlattice, or cross-product screens | `system_unsupported_action` | AMM is a MenuList owner menu/store agent, not an internal admin or sibling-product agent. |
| Ask live weather, news, sports, market, trivia, joke, poem, story, or generic chatbot questions | `system_unsupported_action` | AMM is not a generic assistant and must not perform external lookups for non-MenuList work. |
| Bypass outlet policy because owner asked in chat | `system_unsupported_action` | Outlet policy is enforced by existing API and cannot be bypassed. |
| Delete inherited outlet project directly | `manual_task_card` | Current DAL blocks inherited outlet project deletion. |
| Apply generated image without owner approval | `system_unsupported_action` | Generated images are drafts until approved. |
| Execute unregistered natural-language mutation | `system_unsupported_action` | Violates action registry boundary. |

---

## 26. Day-One Production Checklist For Each Adapter

Before an action type changes from `needs_adapter_glue` or `blocked` to executable, complete this checklist:

- [ ] Action type added to `AiMenuManagerActionType`.
- [ ] Adapter registered in `actionRegistry.ts`.
- [ ] Manual equivalent documented in adapter metadata.
- [ ] Source evidence added to this file.
- [ ] Approval policy implemented and tested.
- [ ] Proposal card schema implemented.
- [ ] Mobile card behavior defined.
- [ ] Firebase cost class documented.
- [ ] Idempotency key defined.
- [ ] Client execution directive integrity defined with patch hash where relevant.
- [ ] Execution mode uses existing DAL/API/job only.
- [ ] Selected store/project selector context verified.
- [ ] Cache invalidation path verified.
- [ ] Outlet scope/policy path verified where relevant.
- [ ] Image generation outlet local-only governance verified where relevant.
- [ ] Public menu/OBP impact shown before approval.
- [ ] Destructive actions require explicit entity name.
- [ ] Provider/API errors produce owner-readable receipts.
- [ ] Proposal completion writes compact receipt only.
- [ ] Test case added to `ai-menu-manager_test-cases.md`.
- [ ] Firebase cost note added to `ai-menu-manager_firebase.md` if cost class changes.
- [ ] README action catalog updated if this is a new family.
- [ ] Changelog updated if owner-visible scope changes.

---

## 27. Current Production Priority

This is the recommended adapter order because it reuses the safest existing paths first and covers the highest owner value:

1. `item_price_update`
2. `item_availability_update`
3. `item_visibility_update`
4. `category_visibility_update`
5. `decision_blocks_update`
6. `menu_special_note_update`
7. `menu_design_mood_update`
8. `menu_design_layout_update`
9. `menu_design_preset_apply`
10. `menu_design_color_update`
11. `menu_design_visibility_update`
12. `bulk_price_update`
13. `bulk_availability_update`
14. `image_item_generate`
15. `image_item_apply_generated`
16. `menu_file_upload`
17. `menu_link_import`
18. `menu_import_review_apply`
19. `special_menu_create`
20. `special_menu_activate`
21. `menu_publish`
22. `menu_qr_download`
23. `menu_card_export_create`
24. `public_presence_text_update`
25. `store_business_profile_update`
26. `store_locale_region_update`
27. `store_working_hours_update`
28. `feedback_link_share`
29. `customer_app_install_link_share`
30. `digital_screen_link_share`
31. `feedback_inbox_list`
32. `domain_subdomain_check`
33. `communication_template_copy`
34. `item_share_card_share`
35. `presence_surface_confirm`
36. `pos_sync_setup_info_copy`
37. `compliance_page_status`
38. `outlet_scope_select`
39. `staff_create`

This order is not a staged product promise. It is an engineering checklist order for implementing adapters without losing the registry, approval, and cost discipline.

---

## 28. Maintenance Rule

When a new MenuList manual flow is added, update this file in the same change if AMM could reasonably become an alternate entry point.

When an AMM adapter is added, update:

- this checklist.
- `ai-menu-manager_impl.md`.
- `ai-menu-manager_firebase.md`.
- `ai-menu-manager_mobile-support.md`.
- `ai-menu-manager_test-cases.md`.
- `README.md`.
- `__docs__/CHANGELOG.md` when owner-visible behavior changes.

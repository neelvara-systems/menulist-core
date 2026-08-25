# Mobile Operational Support — Mobile Support

**Created:** February 15, 2026  
**Last Updated:** August 25, 2026 (v22 - Billing recovery narrow-viewport routing)
**Status:** ✅ PWA END-TO-END — Full mobile-only operation supported  
**Feature Flag:** `ENABLE_MOBILE_UI`

---

## Feature Admission Test Results

| Gate          | Result  | Reasoning                                                                |
| ------------- | ------- | ------------------------------------------------------------------------ |
| **Frequency** | ✅ PASS | Menu availability, hours, feedback — multiple times daily during service |
| **Speed**     | ✅ PASS | All actions complete in <2 seconds (optimistic updates)                  |
| **Touch**     | ✅ PASS | All targets 44px+, thumb-friendly, no precision needed                   |
| **Value**     | ✅ PASS | Owner is ON the floor during service hours — needs phone-based control   |

**Decision:** ✅ FULL MOBILE SUPPORT — This IS the mobile feature.

---

## Mobile Screens Implemented

| Screen                         | Tab                 | DAL Functions Used                                                                | Desktop Counterpart                    |
| ------------------------------ | ------------------- | --------------------------------------------------------------------------------- | -------------------------------------- |
| `MobileHoursScreen`            | Today               | `getTodayCampaigns`, `completeCampaign`, `skipCampaign`, GrowthOS summary hook     | `TodayScreen`                          |
| `MobileMenuScreen`             | Menu                | `getProjectsList`, `getProjectData`, `updateProject`                              | `ProjectsPage`                         |
| `MobileProjectSelectorSheet`   | Menu / project switcher | `addProject`, `duplicateProject`, `deleteProject`, `setProjectActive`, `updateProjectWithoutLoader`, `updateProjectMetadata` | `ProjectSelector` + project modals |
| `MenuUploadSheet`              | Menu (sheet)        | `addProject`, `uploadFile`, `createMenuProcessingJob`                             | Upload flow in `ProjectsPage`          |
| `MobileShareScreen`            | Share               | `getProjectsList`, `generateProjectUrl`, `generateOBPUrl`, `getScreenState`       | `UseMenuList`                          |
| `MobileFeedbackDetail`         | (sub)               | `updateFeedbackStatus`                                                            | `FeedbackCard`                         |
| `MobileMoreScreen`             | More                | `signOutSession`                                                                  | `ProfileActionsModal`                  |
| `MobileFeedbackScreen`         | More > Feedback     | `getFeedbackList`, `getFeedbackCount`                                             | `FeedbackInbox`                        |
| `MobileBillingScreen`          | More > Billing      | `usePaymentHandler`, `getActiveSubscriptionForStore`, `getBillingHistoryForStore` | `BillingPage`                          |
| `MobileBasicSettingsScreen`    | More > Brand Settings | `updateStore`, `updateTenant`, `BUSINESS_TYPES`                                 | `BusinessSettings > BasicInfoTab` + `LocationInfoTab` |
| `MobileLocaleSettingsScreen`   | More > Locale       | `updateStore` (language, timezone, currency, date/time format, business day end)  | `BusinessSettings > LocaleSettingsTab` |
| `MobileWorkingHoursEditScreen` | More > Hours Edit   | `updateStore`                                                                     | `BusinessSettings > WorkingHoursTab`   |
| `MobileRolesScreen`            | More > Roles        | `updateStore` (roles array)                                                       | `UserPermissionsPage`                  |
| `MobileDigitalScreensScreen`   | More > Screens      | `getScreenState`, `initializeScreenState`, `updateScreenSettings`                 | `DigitalScreenSettings`                |
| `MobileLocationsScreen`        | More > Locations    | `updateOutletPolicy`, `/api/outlets/create`, `/api/outlets/rename`, `/api/auth/switch-store` | `LocationsPage`                        |
| `MobileDashboardScreen`        | More > Dashboard    | `useOwnerDashboard`, `getProjectsList`                                            | `OwnerDashboard`                       |
| `MobileUsersScreen`            | More > Staff        | `addPlatformUser`, `updatePlatformUser`                                           | `UsersListPage`                        |
| `MobileTransactionsScreen`     | More > Transactions | `getPaginatedAiOperations` with shared action/date filters                        | `TransactionPage`                      |
| `MobileHelpScreen`             | More > Help         | (external links + FAQ)                                                            | `HelpCenter`                           |
| `MobileAdvancedSettingsScreen` | More > Advanced     | `updateStore` (contact, social, feedback)                                         | `BusinessSettings` (3 tabs)            |
| `BulkActionsSheet`             | Menu (sheet)        | `getProjectData`, `updateProject`                                                 | `CommandCenterModal`                   |
| `SmartRecommendationsSheet`    | Menu (sheet)        | `applyDecisionBlockSettings`, `trackDecisionBlockChanges`                         | Featured section / Decision Blocks controls |
| `ManageLanguagesSheet`         | Menu (sheet)        | `translateFile`, `translateProjectPublicContent`, `repairLanguageProject`, `updateProjectMetadata` | Desktop language tools |
| `MobileDesignEditorScreen`     | More > Design       | `getProjectData`, `publishProject`                                                | `B2CView` (sidebar + preview)          |
| `ColorPickerSheet`             | Design (sheet)      | (local state → parent)                                                            | `BrandColorPicker`                     |
| `MobileSeoAnalyticsScreen`     | More > SEO          | `updateStore` (tagline, meta, analytics)                                          | `SeoTab` + `AnalyticsTab`              |
| `MobileTimeSlotsScreen`        | More > Time Slots   | `updateTimeSlotPresets`, `removePresetFromAllCategories`, `generatePresetId`      | `TimeSlotPresetsTab`                   |
| `MobileOfficialPageScreen`     | More > Official     | `updateStore`, `uploadOBPPhoto`                                                   | `OfficialPageTab`                      |
| `MobileBusinessAttributesScreen` | More > Attributes | `updateStore`                                                                     | `BusinessAttributesTab`                |
| `MobileDomainSettingsScreen`   | More > Domain       | `updateStore`, `/api/domain`, `/api/subdomain/check`                              | `DomainSettingsTab`                    |
| `MobileIntegrationsScreen`     | More > Integrations | read-only store GBP state                                                         | `IntegrationsTab`                      |
| `MobilePosSyncScreen`          | More > POS Sync     | `updateStore`, `/api/pos-sync/test`                                               | `PosSyncTab`                           |
| `MobileSpecialMenuScreen`      | More > Special Menus | `useSpecialMenus`, `getProjectDataWithoutLoader`, `updateProjectWithoutLoader`, `updateProjectMetadata` | `SpecialMenuCard` + `CreateSpecialMenuModal` |
| `MobilePresenceMonitorScreen`  | More > Presence     | `updateMenuPresence`                                                              | `UseMenuList > PresenceMonitor`        |

Billing and Help are entitlement-recovery surfaces. Direct `/billing` and
`/help-center/*` requests at mobile viewport widths must enter `MobileShell`
even when the browser uses a desktop user agent. This keeps responsive browser
testing, small-window use, and phone use on the same mobile recovery contract;
the desktop sidebar must never consume the narrow Billing viewport.
Billing support actions must navigate directly to `/help-center/ticket`, which
is permitted for recovery-only owners and maps to the existing mobile ticket
screen. They must not cross `/dashboard`, because the entitlement guard would
truthfully return that owner to Billing before Help could open.

Mobile Locations failure boundary: `MobileLocationsScreen` must convert rejected `/api/auth/switch-store` responses into fixed owner-facing switch failures and bounded `mobile_location_store_switch_failed` diagnostics. Outlet creation must log both rejected API responses and client/network exceptions through bounded `mobile_location_create_failed` diagnostics before showing fixed retry copy.

Mobile project selector boundary: `MobileProjectSelectorSheet` is the shared owner-mobile surface for switching, creating, editing, duplicating, resetting, deleting, sharing, and translating project records, including special-menu project metadata when the selected project is a special menu. Project-link copied feedback must wait for Clipboard API or acknowledged textarea fallback success. Failed image preparation, image generation, project delete, create/edit/duplicate save, active toggle, reset, link copy, and public-content translation repair must use `mobile_project_*` bounded diagnostics before showing fixed owner-facing copy. Translation repair failures must log `mobile_project_public_content_translation_failed`; mutation failures must log `mobile_project_selector_*` with bounded project/master, store/tenant, selected/reference language, language counts, draft counts/lengths, image-draft presence, project count, mode flags, special-menu flag, default/active booleans, and clipboard/fallback support metadata for copy failures only. Do not log raw project names, descriptions, special-menu names, public URLs, filenames, provider responses, project IDs, store IDs, tenant IDs, image data, full project payloads, or exception text.

Mobile Design boundary: `MobileDesignEditorScreen` writes customer-facing menu design config through `publishProject()` and prepares public preview, copy, native share, and QR actions from the active design context. Failed design publish, post-publish verification setup, background-image prepare, public-link copy, and native share actions must log `mobile_design_*` diagnostics before showing existing fixed owner-facing copy or preserving the current fire-and-forget verification behavior. Post-publish verification must build the same routed public project/menu URL as the owner-visible public link, support custom domains, preserve default-project URL semantics, and leave callable/provider failures to the shared `verifyMenuPublish` wrapper. Public-link copied feedback must wait for Clipboard API or acknowledged textarea fallback success. Context is limited to bounded project/master, store/tenant, menu URL presence-length metadata, layout/mood presence-length metadata, embedded state, brand/background image presence, project count, native-share support, copy/share labels and values as bounded metadata, clipboard/fallback support booleans for copy failures only, and normalized source error metadata. Do not log raw public URLs, project names, store names, file/image data, provider/browser exception text, project IDs, store IDs, tenant IDs, or full project payloads.

Mobile Feedback link boundary: `MobileFeedbackScreen` loads owner feedback and prepares the public feedback link, native share action, and feedback QR sheet for the selected mobile project. Failed inbox loads must log `mobile_feedback_load_failed`; failed feedback-link copy and native share actions must log `mobile_feedback_link_copy_failed` and `mobile_feedback_native_share_failed` before showing existing fixed owner-facing copy. Feedback-link copy must wait for Clipboard API or acknowledged textarea fallback success before showing copied feedback; rejected Clipboard API writes must fall through to the acknowledged fallback when it is available. Failed copy diagnostics may include only clipboard/fallback support booleans in addition to the bounded context. Context is limited to bounded store/tenant, selected-project, feedback-link, feedback-QR-link, feedback-enabled state, ready state, selected-project presence, special-menu flag, project count, native-share support, share-title/text lengths, and normalized source error metadata. Do not log raw feedback links, QR payloads, project names, store names, guest feedback content, guest contact details, project IDs, store IDs, tenant IDs, or browser exception text.

Smart Recommendations boundary: `SmartRecommendationsSheet` writes customer-facing Featured, Quick, and Value choice settings through the existing mobile Menu save callback and shared Decision Blocks helpers. Failed saves must log `mobile_smart_recommendations_save_failed` with bounded project/master, business type/category, active-language, enabled-block count, item/category count, toggle states, and pinned-presence metadata before showing fixed owner-facing copy. Do not log raw item names, category names, owner-selected item IDs, public menu content, project IDs, or exception text.

Manage Languages boundary: `ManageLanguagesSheet` updates project languages, translated menu content, project public copy, special-menu display copy, and primary-language metadata through existing translation helpers and the mobile Menu save callback. Failed remove, add, repair, repair-all, or make-primary actions must log `mobile_manage_languages_*` diagnostics with bounded project/master, store/tenant, source/target language presence-length metadata, file counts, language counts, issue counts, and repair counts before showing existing fixed owner-facing copy or capacity copy. Project metadata translation writes must require `assertProjectUpdateSucceeded()` before local saved state or success copy changes. Do not log raw menu text, translated strings, language names, item/category names, project names, provider payloads, project IDs, store IDs, tenant IDs, or exception text.

Bulk Actions boundary: `BulkActionsSheet` can repair translated project public copy while applying menu-wide fixes. Project metadata translation writes must require `assertProjectUpdateSucceeded()` before success copy or returned project state advances, with rejected acknowledgements routed through the existing bounded bulk-action failure path.

Mobile Feedback Detail boundary: `MobileFeedbackDetail` writes owner feedback status and reply resolution through `updateFeedbackStatus()`. Resolve/reply saves must require `assertFeedbackStatusUpdateSucceeded()` before success state advances. Failed resolve and reply saves must log `mobile_feedback_status_update_failed` and `mobile_feedback_reply_save_failed` through mobile owner diagnostics before showing fixed owner copy. Context is limited to bounded store/tenant and feedback ID metadata, previous/next status, rating/attention flags, reply presence, reply length, and normalized source error metadata. Do not log raw customer message, customer name, phone/email values, reply text, raw feedback IDs, store IDs, tenant IDs, or provider/browser exception text.

Mobile QR sheet boundary: `MobileQrCodeSheet` is the shared owner-mobile QR surface for Mobile Share, Mobile Feedback, Mobile Official Page, Mobile Design, and Mobile Project Selector flows. Failed QR generation, clipboard copy, and download setup must log `mobile_qr_sheet_generate_failed`, `mobile_qr_sheet_copy_failed`, and `mobile_qr_sheet_download_failed` through mobile owner diagnostics before showing fixed owner copy. QR URL copy must wait for Clipboard API or acknowledged textarea fallback success before showing copied feedback; rejected Clipboard API writes must fall through to the acknowledged fallback when it is available. Failed copy diagnostics may include only clipboard/fallback support booleans in addition to the bounded context. Context is limited to bounded diagnostic source, URL, filename, title, helper text, store-name, plan, logo/brand presence, generated-image presence/length, visibility, action, and normalized source error metadata. Do not log raw public URLs, QR payloads, data URLs, filenames, store names, owner copy, customer content, provider/browser exception text, or downloaded file bodies.

Mobile public link opener boundary: `openMobilePublicLink()` is the shared MobileShell-safe opener for owner public previews from Mobile Menu, Project Selector, Design Editor, Feedback, Official Page, Today Hours, and Share. It must keep the blank-context behavior that preserves shell state, use `noopener,noreferrer`, detect blocked opens, log `mobile_public_link_open_failed` with bounded source and public-link URL presence/length metadata only, and show fixed owner feedback. Do not log raw public URLs, screen/menu/OBP/feedback links, project names, store names, route hashes, browser exception text, project IDs, store IDs, or tenant IDs.

Mobile Share output boundary: `MobileShareScreen` prepares public links, screen links, menu PDFs, structured JSON/XLSX exports, Menu Kit assets, printable assets, feedback QR files, clipboard copy, native share actions, and starter-activation signals. Copy actions must wait for Clipboard API or acknowledged textarea fallback success before copied feedback or copy-driven starter activation signals. Failed non-QR output actions must log `mobile_share_*` diagnostics through mobile owner diagnostics before showing existing fixed owner-facing copy or falling back to the current silent screen-link state. Context is limited to bounded store/tenant, project, selected project, business type, public-link presence-length metadata, project count, printable asset/template/output identifiers, export type, starter-signal, and support booleans. Do not log raw URLs, print-shop messages, filenames, store names, project names, menu items, generated PDF/ZIP/image blobs, QR payloads, localStorage values, API/provider/browser exception text, or customer content.

Mobile Communication Kit boundary: `MobileCommunicationKit` generates customer message templates from the Mobile Share output context and adds copy, native share, and WhatsApp handoff actions. Failed copy/share/handoff actions must log `mobile_communication_kit_copy_failed`, `mobile_communication_kit_native_share_failed`, and `mobile_communication_kit_whatsapp_open_failed` through mobile owner diagnostics. Copy actions must wait for Clipboard API or acknowledged textarea fallback success before copied feedback; rejected Clipboard API writes must fall through to the acknowledged fallback when it is available. Failed copy diagnostics may include clipboard/fallback support booleans. Context is limited to the parent bounded Mobile Share context, template ID/title presence-length metadata, generated message lengths, native-share support, action, and normalized source error metadata. Do not log raw generated messages, WhatsApp URLs, phone numbers, addresses, store names, project names, public URLs, menu text, or browser exception text.

Mobile Presence Monitor boundary: `MobilePresenceMonitorScreen` and the embedded Share-tab presence card confirm or remove owner-confirmed external placements through `updateMenuPresence()` and copy the official business link with source attribution. Confirm/remove actions must require `assertMenuPresenceUpdateSucceeded()` before local presence state, success copy, or selected-surface state changes. Official-link copy must wait for Clipboard API or acknowledged textarea fallback success before copied feedback. Failed copy, confirm, and remove actions must log `mobile_presence_official_link_copy_failed`, `mobile_presence_confirm_failed`, and `mobile_presence_remove_failed` through mobile owner diagnostics before showing fixed owner-facing copy; failed copy diagnostics may include clipboard/fallback support booleans. Context is limited to bounded store/tenant, OBP-link, surface ID/key/label-key, active-count, published/feedback, starter-signal, action, clipboard/fallback support, and normalized source error metadata. Do not log raw official business links, store names, surface labels, owner-entered values, external platform content, provider/browser exception text, store IDs, or tenant IDs.

---

## Shell Architecture

```
AntdLayoutWrapper (src/components/antdComponent/layoutWrapper/index.tsx)
  └─ if isMobile && ENABLE_MOBILE_UI && !forceDesktop → MobileShell
     ├─ MobileNavigation (TabBar: Today, Menu, Share, More)
     ├─ MobileHoursScreen
     ├─ MobileMenuScreen
     │   ├─ MobileProjectSelectorSheet (bottom sheet)
     │   ├─ BulkActionsSheet (bottom sheet)
     │   ├─ SmartRecommendationsSheet (bottom sheet)
     │   └─ ManageLanguagesSheet (bottom sheet)
     ├─ MobileShareScreen
     └─ MobileMoreScreen
         ├─ MobileFeedbackScreen
         ├─ MobileBillingScreen
         ├─ MobileBasicSettingsScreen
         ├─ MobileLocaleSettingsScreen
         ├─ MobileWorkingHoursEditScreen
         ├─ MobileRolesScreen
         ├─ MobileDigitalScreensScreen
         ├─ MobileLocationsScreen
         ├─ MobileDashboardScreen
         ├─ MobileUsersScreen
         ├─ MobileTransactionsScreen
         ├─ MobileHelpScreen
         ├─ MobileAdvancedSettingsScreen
         ├─ MobileDesignEditorScreen
         │   └─ ColorPickerSheet (bottom sheet)
         ├─ MobileSeoAnalyticsScreen
         ├─ MobileTimeSlotsScreen
         ├─ MobileOfficialPageScreen
         ├─ MobileBusinessAttributesScreen
         ├─ MobileDomainSettingsScreen
         ├─ MobileIntegrationsScreen
         ├─ MobileSpecialMenuScreen
         └─ MobilePosSyncScreen
```

Route parity contract: handheld users remain in `MobileShell` for canonical owner desktop paths. Mobile shell route-map source gate: `npm run verify:mobile-shell-route-map`; Today/dashboard source gate: `npm run verify:owner-dashboard-today-boundary`. `/dashboard` and `/today` both enter the Today tab; `/today/history` enters Today history when Past Activity is enabled; `/projects` enters Menu; `/menu-manager` enters the Menu Manager tab when enabled; `/use-menulist`, `/qr-code`, and `/qrCode` enter Share; `/business-health`, `/feedback`, `/billing`, `/transactions`, `/locations`, `/users`, and `/users/permissions` enter More sub-screens; `/business-settings` enters the More hub; `/platform/*`, `/ops/*`, and `/reseller/*` enter platform, ops, or reseller More sub-screens for eligible roles.

Transactions parity note: `MobileTransactionsScreen` keeps the existing mobile More-tab placement, but now carries the desktop transaction essentials on phone: action filter, date-range filter, reset, refresh, infinite scroll, credits/tokens summary, and tap-through transaction details. It still uses the same `getPaginatedAiOperations` DAL as desktop; no mobile-only transaction data path exists.

Transactions scope-settlement note: rows and the selected detail are visible only when their captured user/tenant/store/product/session key matches the current signed session. Filter resets, manual continuation, session/store changes, and unmount cleanup invalidate older page responses before cursor, list, totals, loading, or detail state advances.

Transactions and domain detail boundary: mobile platform transaction details show the same accounting rows as desktop but must not render full AI operation JSON. `MobileDomainSettingsScreen` is the single active owner-mobile domain/subdomain surface from More > Domain. It must render Vercel DNS verification/configured records as copyable record rows, matching the desktop normalization pattern, instead of showing raw provider verification JSON or partial DNS config shapes. It must also preserve the current local custom-domain state when `/api/domain` rejects a remove request; only successful delete responses may clear `customDomain` and `domainVerified`. Rejected `/api/domain` status refreshes must not replace `domainStatus`, and rejected or malformed `/api/subdomain/check` responses must use fixed failure copy plus bounded diagnostics instead of invalid availability state. `/api/domain` and `/api/subdomain/check` browser requests use same-origin credentials, no-store cache policy, and manual redirect handling before route responses are trusted. `/api/domain` status and add-domain responses are parsed through bounded 32KB readers; malformed status/add bodies log `mobile_domain_settings_status_response_*` or `mobile_domain_settings_add_response_*` diagnostics before fixed owner feedback.

Working hours boundary: `MobileWorkingHoursEditScreen` writes public open/closed truth through the shared `updateStore()` path. Failed saves must log `mobile_working_hours_save_failed` with bounded store, tenant, changed-day count, closed-day count, and previous-hours presence metadata before restoring the previous working hours and showing fixed owner-facing copy.

Locale settings boundary: `MobileLocaleSettingsScreen` writes public language, timezone, currency, date/time format, and business-day-end settings through the shared `updateStore()` path. Failed saves must log `mobile_locale_settings_save_failed` with bounded store, tenant, default-language/timezone/currency presence and length, active-language counts, and changed-field booleans before restoring previous locale settings and showing fixed owner-facing copy.

SEO and analytics settings boundary: `MobileSeoAnalyticsScreen` writes public search metadata, canonical URL, localized SEO copy, owner analytics IDs, and analytics tracking preferences through the shared `updateStore()` path. The screen remounts by exact tenant/store/mode, shares one synchronous save guard across SEO and analytics, captures the admitted IDs and source leaves, and applies acknowledged state only when that same scope still owns those leaves. Delayed completions cannot replace another store or newer same-store SEO/analytics truth; obsolete mounts suppress baseline, toast, and loading settlement. The retired unused field-level writer and its unreachable diagnostic were removed. Failed full analytics saves log `mobile_analytics_settings_save_failed` with bounded external-ID presence/length, enabled-tracking counts, previous-analytics presence, and changed-field booleans. Failed full SEO saves log `mobile_seo_settings_save_failed` with bounded canonical URL, selected-language, managed-language, localized-draft, filled-language, keyword-language, previous-state, and changed-field metadata. External analytics/help guide opens must check blocked `_blank` windows and log `mobile_seo_analytics_external_link_open_failed` with bounded source/link presence-length metadata only. Do not log raw SEO copy, canonical URLs, analytics IDs, Search Console values, Pixel IDs, analytics/help URLs, provider messages, or exception text.

Time Slots boundary: `MobileTimeSlotsScreen` writes store-level time-slot presets through `updateTimeSlotPresets()` and cascades edits/deletes through project categories with `updatePresetInAllCategories()` / `removePresetFromAllCategories()`. Mobile and desktop share strict preset validation and public timed-category projection; overnight windows remain visible across midnight and weekday-restricted overnight windows belong to their starting day. The store write requires exact active-store scope. Project cascades page through current-store documents and transactionally write only the latest `files` value for matching projects, preserving concurrent edits. Failed saves must log `mobile_time_slot_preset_save_failed`; failed deletes must log `mobile_time_slot_preset_delete_failed`. Diagnostics must include only bounded store, tenant, preset ID/label/time presence-length metadata, preset counts, edit/delete cascade booleans, and source error shape. Do not log raw preset labels, category payloads, project payloads, provider messages, or exception text.

POS Sync boundary: `MobilePosSyncScreen` writes external sync settings and secret-rotation metadata through the shared `updateStore()` path. Failed settings saves must log `mobile_pos_sync_settings_save_failed` with bounded store, tenant, status presence/length, enabled-state booleans, webhook URL/secret presence-length metadata, pending-secret-rotation presence, and changed-field booleans before showing fixed owner-facing copy. Do not log raw webhook URLs, webhook secrets, provider responses, API response text, or exception text. Connection tests continue to log `mobile_pos_sync_test_failed` and display the fixed connection-issue message.

Special Menu boundary: `MobileSpecialMenuScreen` is the active owner-mobile surface for creating, editing, ending, and cancelling temporary public menus from More > Special Menus. Create/update/end/cancel failures stay on the shared `useSpecialMenus()` bounded diagnostics path. Failed AI translation repair for special-menu public names and project public content must log `mobile_special_menu_name_translation_failed` or `mobile_special_menu_project_public_content_translation_failed` with bounded store, tenant, project/base-project, language, managed-language count, and content-length metadata only before showing fixed owner-facing copy. Project public-content translation writes must require `assertProjectUpdateSucceeded()` before local draft baselines or success copy change. Do not log raw public menu names, descriptions, translation payloads, provider responses, project IDs, or exception text.

Business profile boundary: `MobileBasicSettingsScreen` is the active owner-mobile surface for brand name, business name/type, contact details, public address, map coordinates, GSTIN, and logo. The old standalone `MobilePublicInfoScreen` has been removed from active code and must not be reintroduced as a separate More route; keep public address and coordinate edits on the Brand Settings path so `updateStore()` cache invalidation stays aligned with desktop. The screen remounts by exact tenant/store, admits one save, and applies or restores browser context only while the same scope still owns the exact optimistic attempt. A store failure logs `mobile_basic_settings_save_failed`; a later tenant-name mirror failure logs `mobile_basic_settings_tenant_sync_failed`, preserves the acknowledged store result, shows truthful partial-success copy, and keeps the brand-name difference available for retry.

Business attributes boundary: `MobileBusinessAttributesScreen` writes public OBP attributes through the shared `updateStore()` path. Drafts remount by exact tenant/store and one synchronous guard admits a save. Global store context changes only after acknowledgement, only if tenant/store and the previous attribute leaves still match, and merges custom attributes into the current same-store `publicPresence` so unrelated sibling changes survive. Failed saves log `mobile_business_attributes_save_failed` and leave global context untouched.

Official Page boundary: `MobileOfficialPageScreen` is the active owner-mobile surface for OBP copy, cover media, generated cover, gallery photos, links, policy fields, action visibility, public OBP link copy, native share, preview, and QR. Failed saves must log `mobile_official_page_save_failed` with bounded store, tenant, localized-language count, photo count, delete-queue count, cover presence, and special-note presence metadata. Cover/photo prepare, upload, generated-cover, public-link copy, and native-share failures must use the bounded `mobile_official_page_*` diagnostics and fixed owner-facing copy. Link diagnostics record only bounded official-page URL, selected project, copy/share label/value, language, project-count, and native-share metadata. Do not log raw public URLs, file payloads, Storage URLs, provider/browser messages, project IDs, store IDs, tenant IDs, or exception text.

Advanced settings boundary: `MobileAdvancedSettingsScreen` is the active owner-mobile surface for social links and feedback collection defaults. Failed `updateStore()` saves must log `mobile_advanced_settings_save_failed` with bounded store, tenant, mode, update count, social-update presence, feedback-toggle presence, and feedback-defaults presence before showing fixed owner-facing copy. Social profile preview opens must check blocked `_blank` windows and log `mobile_advanced_settings_external_link_open_failed` with bounded platform/link presence-length metadata only. Do not log raw social URLs, provider messages, browser messages, or exception text.

Reverse parity note: mobile Menu actions must not become mobile-only capability. The desktop `CommandCenterModal` now carries the mobile Menu command-sheet gaps found in the reverse audit: Repair Menu, Fix Text Case, and the same shared repair/text-case utilities used by mobile. Desktop `EditorActionsPopover` also exposes Generation defaults from the editor context, matching the mobile Menu command sheet. Mobile item edit now carries the outlet bestseller marker, prep time, and item feature-level controls from desktop Store Customization, so phone users can update `isBestSeller`, `duration`, and `ownerBoost` without opening desktop. The mobile sheet intentionally presents owner boost as Show less / Normal / Show more and includes a collapsed customer-impact guide so non-technical owners understand that reordering changes normal menu position while feature level only guides Featured choices.

Mobile Menu diagnostic contract: `MobileMenuScreen` uses `src/components/mobile/utils/mobileMenuDiagnostics.ts` for project image auto-generation, business defaults, extracted profile defaults, background project persistence, item image upload, active-job restore, and comparison-engine failures. Extracted profile project defaults require `assertProjectUpdateSucceeded()` before local project state changes; rejected writes use `mobile_menu_project_profile_defaults_project_update_rejected` through `mobile_menu_project_profile_defaults_apply_failed`. Menu-derived `businessAttributes` defaults require `assertStoreUpdateSucceeded()` before local public attribute state changes; rejected writes use `mobile_menu_business_attributes_default_store_update_rejected` through `mobile_menu_business_attributes_default_apply_failed`. Diagnostics record normalized failure codes plus bounded project/store/job/item presence, length, count, mode, language, and source error metadata only. The screen must not direct-console raw project IDs, store IDs, job IDs, item IDs, image data, owner payloads, or provider/browser errors.

---

## Key Files

| Purpose          | Path                                                   |
| ---------------- | ------------------------------------------------------ |
| Mobile shell     | `src/components/mobile/MobileShell.tsx`                |
| Navigation       | `src/components/mobile/MobileNavigation.tsx`           |
| All screens      | `src/components/mobile/screens/*.tsx`                  |
| Bottom sheets    | `src/components/mobile/sheets/*.tsx`                   |
| Menu upload      | `src/components/mobile/sheets/MenuUploadSheet.tsx`     |
| Menu diagnostics | `src/components/mobile/utils/mobileMenuDiagnostics.ts` |
| Roles & perms    | `src/components/mobile/screens/MobileRolesScreen.tsx`  |
| Mobile types     | `src/components/mobile/types.ts`                       |
| Feature flag     | `src/config/features.ts` → `ENABLE_MOBILE_UI`          |
| Device detection | `src/hooks/useDeviceType.ts`                           |
| Layout switch    | `src/components/antdComponent/layoutWrapper/index.tsx` |

---

## Shared Infrastructure (Inherited from Desktop)

- **Auth:** NextAuth session — same `getActiveSession()` in all DAL functions
- **Localization:** `next-intl` — same locale, RTL, timezone from store settings
- **State:** Redux Toolkit — same `AppSettings`, theme, language preferences
- **Data:** Same Firestore DAL functions (`@database/*`) — zero separate mobile DAL
- **Icons:** `react-icons/lu` (Lucide) only — consistent with desktop

## Shared Logic Layer (Desktop ↔ Mobile Code Reuse)

**Principle:** Share business logic, constants, hooks, and types. NEVER share UI components (`antd` ≠ `antd-mobile`).

| Shared File                               | What it contains                                             | Used by (Desktop)                   | Used by (Mobile)        |
| ----------------------------------------- | ------------------------------------------------------------ | ----------------------------------- | ----------------------- |
| `src/config/outletPolicy.ts`              | `OUTLET_POLICY_CATEGORIES` — 15 policy toggle groupings      | `OutletPolicyEditor`                | `MobileLocationsScreen` |
| `src/utils/campaignUtils.ts`              | `getMealName()`, `getExportMethod()`, `getShortButtonText()` | `PrimaryCard`, `OperationalSection` | `MobileHoursScreen`     |
| `src/hooks/useTodayCampaigns.ts`          | SWR hook for today's campaigns (pure DAL, no UI deps)        | `TodayScreen`                       | `MobileHoursScreen`     |
| `src/data/rolesPermissionsInitialData.ts` | `PERMISSION_CATEGORIES_CONFIG`, `PERMISSION_LABELS`          | `UserPermissionsPage`               | `MobileRolesScreen`     |
| `src/hooks/usePaymentHandler.ts`          | Razorpay payment flow (plan upgrade, topup, cancel)          | `BillingPage`                       | `MobileBillingScreen`   |
| `src/hooks/useOwnerDashboard.ts`          | SWR dashboard data (overview, WTD, MTD, daily, weekly)       | `OwnerDashboard`                    | `MobileDashboardScreen` |

**Rule:** If a hook uses `antd` (e.g. `notification`, `message`), it CANNOT be shared. Mobile must implement its own version using `antd-mobile` `Toast`. Example: `useCampaignActions` uses `antd` `notification` → stays desktop-only; mobile inlines its own complete/skip with `Toast`.

---

## Data Format Compatibility (Verified Feb 15, 2026)

All mobile screens write data in **identical format** to desktop:

| Data                 | Mobile Format                            | Desktop Format                   | Match |
| -------------------- | ---------------------------------------- | -------------------------------- | ----- |
| Working hours keys   | `sun`, `mon`, `tue`...                   | `sun`, `mon`, `tue`...           | ✅    |
| Working hours values | `HH:mm-HH:mm` (24h)                      | `HH:mm-HH:mm` (24h)              | ✅    |
| Feedback field names | `customerEmail`, `customerPhone`         | `customerEmail`, `customerPhone` | ✅    |
| Feedback status      | `'new'` \| `'resolved'`                  | `'new'` \| `'resolved'`          | ✅    |
| Business types       | `BUSINESS_TYPES` from `@data/shared/businessTypes` | Same shared taxonomy             | ✅    |
| Project ID field     | `projectId`                              | `projectId`                      | ✅    |
| Share URLs           | `generateProjectUrl()`                   | `generateProjectUrl()`           | ✅    |
| Store address field  | `addressLine`                            | `addressLine` (type)             | ✅    |

---

## PWA End-to-End Support Status

- **Service worker:** `next-pwa` v5.6.0 configured
- **Manifest:** `public/manifest.json` with proper icons, orientation, start_url, and owner shortcuts for Today, Menu, Share & QR, and Feedback
- **Offline banner:** Implemented in `MobileShell.tsx`
- **Owner offline fallback:** After a successful online owner service-worker registration, `public/sw.js` can serve `/offline`; platform website visits preserve that owner worker, but a first-ever offline open before registration can still show the browser's native network error.
- **Desktop switch:** "Switch to Desktop" in More screen (sets `localStorage.forceDesktopMode`)
- **Return banner:** "Return to Mobile" shown when mobile user is in forced desktop mode
- **Owner PWA launch:** `public/manifest.json` starts at `/today`, and cached `/dashboard` launches also map to the Today tab in `MobileShell`.
- **Subscription gate:** MobileShell checks `hasValidSubscriptionAccess` — no-sub users see the upgrade prompt, **View Plans** admits only the `/billing` mobile recovery screen so pending checkout or plan selection remains reachable without granting product entitlement, and **Sign Out** remains available through the canonical Firebase/NextAuth/browser-state cleanup path so the owner can safely change accounts.
- **Menu upload:** `MenuUploadSheet` enables camera/gallery → optimize → upload → AI extraction from mobile
- **Add item persistence:** `AddItemSheet` saves to Firestore via optimistic update + background sync
- **More badge:** `getFeedbackCount` unread count shown on More tab

---

## End-to-End PWA User Journey

| Step                   | Component                                                                           | Status |
| ---------------------- | ----------------------------------------------------------------------------------- | ------ |
| 1. Login               | `LoginPage` (mobile-responsive SCSS)                                                | ✅     |
| 2. Subscription check  | `MobileShell` → `hasValidSubscriptionAccess`                                        | ✅     |
| 3. First menu upload   | `MenuUploadSheet` (camera/gallery)                                                  | ✅     |
| 4. View/search menu    | `MobileMenuScreen`                                                                  | ✅     |
| 5. Toggle availability | `MobileMenuScreen` (Switch)                                                         | ✅     |
| 6. Edit item           | `ItemEditSheet`                                                                     | ✅     |
| 7. Add item            | `AddItemSheet` → Firestore persist                                                  | ✅     |
| 8. Working hours       | `MobileHoursScreen` / `MobileWorkingHoursEditScreen`                                | ✅     |
| 9. Share links/screens | `MobileShareScreen`                                                                 | ✅     |
| 10. View feedback      | `MobileFeedbackScreen` / `MobileFeedbackDetail`                                     | ✅     |
| 11. Business settings  | `MobileBasicSettingsScreen`, `MobileLocaleSettingsScreen`, `MobileAdvancedSettingsScreen` | ✅     |
| 12. Billing            | `MobileBillingScreen`                                                              | ✅     |
| 13. Enhancement usage  | `MobileTransactionsScreen` → filters, infinite scroll, and transaction details      | ✅     |
| 14. Logout             | `MobileMoreScreen` (confirmation dialog)                                            | ✅     |
| 15. Delete item        | `ItemEditSheet` → confirmation → optimistic delete                                  | ✅     |
| 16. Manage staff roles | `MobileRolesScreen` → view/add/edit/delete roles + toggle permissions               | ✅     |

---

## B2C View — PWA Audit (Feb 16, 2026)

**Source:** `__docs__/projects/b2c-view/`  
**Route:** `src/app/(website)/menu/[projectId]/page.tsx`

The B2C View is the **customer-facing** digital menu page. It runs as a public Next.js page at `/{subdomain}.menulist.online/{slug}` — it is **NOT** inside the owner MobileShell.

| Aspect                 | Status          | Notes                                          |
| ---------------------- | --------------- | ---------------------------------------------- |
| Mobile-responsive      | ✅ Already      | Spec: "Mobile-first: 70%+ mobile users"        |
| Customer access        | ✅              | Via QR code or share link                      |
| Owner preview          | ✅              | Owner taps share link from `MobileShareScreen` |
| Theme customization    | ❌ Desktop-only | Design work: fails Touch + Speed gates         |
| Publish design changes | ❌ Desktop-only | Tied to B2C UI Editor (view 3)                 |
| SEO (generateMetadata) | ✅ N/A          | Server-side, no mobile UI needed               |
| Schema.org JSON-LD     | ✅ N/A          | Server-side, no mobile UI needed               |

**Decision:** No MobileShell changes needed. B2C is a separate public page already optimized for mobile customers. Theme/design customization is a setup-phase task that fails the 4-gate test.

---

## Editor Features — 4-Gate PWA Audit (Feb 16, 2026)

**Source:** `__docs__/projects/editor/`  
**Desktop path:** `src/components/templates/main-app/projects/editorView/`

The desktop Editor has 3 view modes (Advanced, Traditional, Focus), 8+ modals, keyboard shortcuts, auto-save, and AI features. Below is the 4-gate test for each feature:

### Features that PASS 4-gate → Mobile implemented

| Feature                     | Freq       | Speed | Touch | Value    | Mobile Component               |
| --------------------------- | ---------- | ----- | ----- | -------- | ------------------------------ |
| View/search items           | Daily      | <1s   | ✅    | On floor | `MobileMenuScreen` (SearchBar) |
| Toggle availability         | Daily      | <1s   | ✅    | On floor | `MobileMenuScreen` (Switch)    |
| Edit item (name/price/desc) | Daily      | <2s   | ✅    | On floor | `ItemEditSheet`                |
| Add new item                | Occasional | <2s   | ✅    | On floor | `AddItemSheet` → Firestore     |
| **Delete item**             | Occasional | <1s   | ✅    | On floor | `ItemEditSheet` (onDelete)     |
| Upload menu photo           | First use  | <5s   | ✅    | Away     | `MenuUploadSheet`              |

### Features that FAIL 4-gate → Desktop-only

| Feature                                   | Fails Gate         | Reasoning                                   |
| ----------------------------------------- | ------------------ | ------------------------------------------- |
| Advanced View (side-by-side image+editor) | Touch, Speed       | Requires precision, split panels            |
| Traditional View (2-column categories)    | Touch              | Multi-panel precision layout                |
| Focus View (file tabs)                    | Touch              | Multi-tab navigation                        |
| Keyboard shortcuts                        | Touch              | Desktop-only input method                   |
| Image zoom/preview                        | Touch              | Pinch/zoom precision                        |
| Batch status toggle (Ctrl+B)              | Frequency          | Rare bulk operation                         |
| Reorder items/categories (Ctrl+R)         | Touch              | Drag-and-drop precision                     |
| AI description generation (Ctrl+G)        | Frequency, Speed   | Setup/polish phase                          |
| AI image generation                       | Frequency, Speed   | Setup/polish phase                          |
| Language management (Ctrl+L)              | Frequency          | One-time setup                              |
| Per-item image upload (Ctrl+U)            | Frequency          | Setup/polish phase                          |
| Add/edit/delete category                  | Frequency          | Rare structure changes                      |
| B2C theme customization                   | Touch, Speed, Freq | Design work at desk                         |
| Publish design changes                    | Frequency          | Tied to design customization                |
| Auto-save (debounced)                     | N/A                | Mobile uses per-action save pattern instead |

### Key insight: Data changes are LIVE immediately

The desktop editor's auto-save writes to Firestore via `updateProject()`. The B2C View reads directly from project data. The editor footer shows: _"Visible to customers now · Live"_.

This means mobile edits (toggle availability, edit price, add/delete item) are **immediately live** to customers — no separate "publish" step needed for DATA changes. The "Publish" button only exists for DESIGN changes (theme/layout) in the B2C UI Editor.

---

## Menu Editor Constitution — PWA Audit (Feb 16, 2026)

**Source:** `__docs__/projects/menu-editor/`

This folder contains **design specifications and UX constitution docs** — not feature implementations. These are rules for how the B2C output should look (readability, pricing transparency, navigation ergonomics, etc.).

**Decision:** No code changes needed. These are design principles that apply to the public B2C View, which is already mobile-responsive. The constitution guides desktop editor and B2C renderer — not the owner mobile shell.

# AI Menu Manager - Feature Action Audit

**Status:** Living production audit
**Audience:** Engineering / Product / QA
**Last Updated:** June 27, 2026
**Purpose:** Feature-by-feature discovery ledger for AMM action types

---

## 1. Audit Rule

AMM action discovery must be feature-first, not brainstorm-first.

For every MenuList feature area:

1. Read the feature docs in `__docs__/[feature]/`.
2. Check the related runtime files named in those docs or found with `rg`.
3. Classify the feature as executable action, read-only/status card, manual-task card, unsupported direct automation, or excluded product/internal surface.
4. Add any valid action type to `ai-menu-manager_action-type-checklist.md`.
5. Sync Firebase, mobile, README, and QA docs when the action family changes cost, mobile behavior, or owner-visible scope.

External AI suggestions and archived docs are hints only. Current source files, feature flags, and existing DAL/API paths decide whether an action is real.

---

## 2. Current Sweep Result

This pass covered the current top-level `__docs__` folders and then deep-checked the action-bearing features against source.

Outcome:

- Core menu/editor/import/design/image/project/special-menu/outlet/store/mobile/staff actions were already represented in the action checklist.
- The mobile PWA sweep added customer app, digital screen, feedback, domain, SEO, analytics, POS, integration, and share/export action families.
- This feature-folder sweep added compliance pages, customer communication templates, sharable item cards, physical/print surface exports, menu presence monitor, review/reputation guard, POS support helpers, new item metadata, and image editing.
- Business Health / Owner Business Assistant remains separate from AMM. AMM may consume signals only through explicit registered adapters.
- Separate products, internal admin, billing/payment, auth/security, website, deployment, and docs/process folders are excluded from direct AMM mutation.

---

## 3. New Action Types Found In This Sweep

| Feature docs | Runtime evidence checked | Added / classified action types |
| --- | --- | --- |
| `compliance-pages` | `src/app/api/compliance/route.ts`, `src/database/compliance/server.ts`, `src/components/mobile/components/MobileCompliancePagesEditor.tsx` | `compliance_page_status`, `compliance_page_override_save`, `compliance_page_override_reset` |
| `customer-communication-kit` | `src/lib/communication/messageTemplates.ts:45`, `src/components/templates/main-app/useMenuList/CommunicationKit.tsx:56`, `src/components/mobile/components/CommunicationKit.tsx:58`, `src/components/mobile/components/CommunicationKit.tsx:127` | `communication_template_generate`, `communication_template_copy`, `communication_template_share` |
| `sharable-item-card-generation` | `src/lib/menu/sharableItemCard.ts:185`, `src/lib/menu/sharableItemCard.ts:197`, `src/components/templates/main-app/projects/editorView/editItemModal.tsx:271`, `src/components/mobile/sheets/ItemEditSheet.tsx:296` | `item_share_card_download`, `item_share_card_share` |
| `menu-kit`, `print-assets`, `print-menu-surfaces`, `printable-asset-templates`, `physical-surfaces` | `src/lib/menu-kit/menuKitGenerator.ts:217`, `src/lib/menu-kit/menuKitGenerator.ts:234`, `src/lib/menu-kit/menuKitGenerator.ts:271`, `src/components/mobile/screens/MobileShareScreen.tsx:608`, `src/components/mobile/screens/MobileShareScreen.tsx:665`, `src/components/templates/main-app/today/components/TentCardSection/index.tsx:49`, `src/components/templates/main-app/today/components/StickerSection/index.tsx:33` | `menu_kit_asset_share`, `print_asset_template_preview`, `physical_surface_tent_card_download`, `physical_surface_sticker_download` |
| `menu-presence-monitor` | `src/database/stores/index.tsx:484`, `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx:182`, `src/components/templates/main-app/useMenuList/PresenceMonitor.tsx:200`, `src/components/mobile/components/PresenceMonitor.tsx:163`, `src/components/mobile/components/PresenceMonitor.tsx:181` | `presence_surface_status`, `presence_surface_confirm`, `presence_surface_unconfirm` |
| `reviews-reputation`, `reputation-protection` | `src/app/api/reviews/states/route.ts:24`, `src/app/api/reviews/suggest/route.ts:103`, `src/components/templates/main-app/reviews/ReputationGuard.tsx:31`, `src/components/templates/main-app/reviews/ReviewReplyTool.tsx:56`, `src/config/features.ts:1467`, `src/config/features.ts:1477` | `review_risk_status`, `review_reply_suggest`, `review_reply_copy`, `review_reply_post_external`; all gated/blocked or manual until review flags and direct-post boundary are intentionally enabled |
| `pos-webhook-sync` | `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx:277`, `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx:300`, `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx:338`, `src/components/templates/main-app/businessSettings/tabs/PosSyncTab.tsx:343`, `src/components/mobile/screens/MobilePosSyncScreen.tsx:221` | `pos_sync_secret_copy`, `pos_sync_instruction_email_draft`, `pos_sync_technical_summary_copy`, `pos_sync_sample_payload_download` |
| `ai-enhancement-packs`, `business-type-data-model`, `media-image-system` | `src/app/api/new-item-metadata/route.ts:39`, `src/app/api/new-item-metadata/route.ts:336`, `src/app/api/image-editing/route.ts:71`, `src/app/api/image-editing/route.ts:185` | `item_metadata_generate`, `image_item_edit` |
| `official-business-page` | `src/components/templates/main-app/businessSettings/tabs/OfficialPageTab.tsx:814`, `src/components/mobile/screens/MobileOfficialPageScreen.tsx:1271` | `public_presence_google_review_update` |

---

## 4. Existing Action Families Reconfirmed

These feature folders were already covered by the action checklist before this sweep. The audit reconfirms they remain AMM action-bearing areas.

| Feature docs | AMM classification |
| --- | --- |
| `projects`, `menu-command-center`, `menu-correctness-engine`, `menu-quality-signals`, `pricing-integrity-system` | Item/category/bulk/repair/review cards. Mutations must end in existing project update paths. |
| `menu-extraction-pipeline`, `menu-intake-identity`, `menu-link-import`, `extracted-business-profile` | Import/upload/link/import-review/identity cards. Existing job and review flows only. |
| `media-image-system`, `ai-enhancement-packs` | Image generation, batch image generation, metadata, description, and image-edit draft cards through existing AI/accounting routes. |
| `special-menu-switching` | Special menu create/update/activate/deactivate/cancel through existing special-menu DAL/hook paths. |
| `multi-outlet-consistency`, `multi-chain-permissions` | Outlet scope, override, outlet save, and outlet creation cards. Existing outlet policy cannot be bypassed. |
| `official-business-page`, `stores-management`, `hours-holiday-accuracy`, `temp-status-layer`, `business-type-data-model` | Store/profile/public presence/hours/time-slot/temp-status cards through existing store/API paths. |
| `customer-app`, `digital-screens`, `mobile-operational-support` | Customer app, digital screen, mobile shell, and PWA operational cards through existing mobile DAL/API paths. |
| `menu-card-export`, `pdf-surface`, `print-assets`, `print-menu-surfaces`, `printable-asset-templates`, `menu-kit`, `physical-surfaces`, `use-menulist` | Browser-local download/share/export cards; no Firestore writes by default. |
| `pos-webhook-sync`, `platform-pull-api` | POS setup/test/status/export cards. AMM remains upstream broadcaster; no pull-from-POS or connector automation. |
| `roles-permissions`, `staff-prompt` | Staff/access cards through guarded staff APIs only. |
| `client-menu`, `client-menu-retrieval-foundation`, `public-menu-entry`, `url-routing-architecture`, `distribution-infrastructure` | Public link/QR/share/status cards where owner-facing; public routing internals are not AMM mutation targets. |

---

## 5. Read-Only Or Signal-Only Areas

These features may inform AMM context or produce read-only cards, but they are not direct AMM mutation systems unless a registered action adapter is added later.

| Feature docs | AMM treatment |
| --- | --- |
| `owner-business-assistant`, `business-health`, `menu-health-monitor`, `trust-health-signal`, `loyalty-health-signal`, `risk-decline-detection`, `menu-trust-signals`, `continuous-menu-intelligence`, `decision-intelligence` | Separate signal/read-model surfaces. AMM can reference signals only through explicit cards such as manual task, repair suggestion, or existing registered menu/store actions. |
| `ai-extraction-monitoring`, `ops-alerting-delivery`, `ops-control-room`, `incident-response`, `platform-cost-posture`, `cost-self-protection` | Platform/internal monitoring or cost surfaces. AMM can expose owner-safe receipts/status only if a first-party owner action exists. |
| `business-truth-graph`, `canonical-truth-infrastructure`, `customer-facing-infrastructure`, `discovery-infrastructure`, `presence-dominance`, `truth-accuracy-dominance`, `surface-os`, `infrastructure-compounding`, `control-layer-strategy`, `silent-correction-systems` | Doctrine/strategy layers. Use as architecture guardrails, not action types. |
| `lifecycle-messaging`, `owner-notifications`, `messaging-onboarding`, `messaging-onboarding-dashboard`, `onboarding`, `onboarding-centralization`, `auth-onboarding` | Notification/onboarding context. AMM can hand off or explain, but direct mutation needs a dedicated adapter. |
| `category-dominance`, `growth-engine`, `growth-execution-strategy`, `free-tools-strategy`, `social-content`, `sales`, `marketing` | Growth/marketing ideas. Direct third-party posting is not an AMM action; use supported MenuList-owned export/share cards only. |

---

## 6. Explicit Exclusions From AMM Direct Mutation

These folders are present in `__docs__`, but they are outside AMM's direct action boundary.

| Docs folder group | Reason |
| --- | --- |
| `answerlattice`, `campaigncue`, `growthos-addon`, `growthos-command-center`, `kitstamp`, `mycodex-audio-reader`, `mycodex-pwa-shell` | Separate products or sibling systems. AMM is MenuList owner menu/store operations only. |
| `internal-platform`, `internal-tracking`, `reseller-dashboard`, `platform-cost-posture`, `ops-control-room` | Internal/admin/platform surfaces. Owner AMM cannot mutate them. |
| `auth`, `phone-otp-auth`, `razorpay`, `ownership-transfer`, `legal`, `security`, `incident-response` | Security, account, billing, legal, or ownership workflows require explicit UI/API flows and are not conversational mutation targets. |
| `deployment`, `production-readiness`, `testing-and-audit-prompts`, `workflows-guide`, `patterns`, `terminology`, `strategy`, `research`, `audits`, `archive`, `postmortems`, `raw-data`, `kilocode`, `features`, `constitution` | Docs/process/history/source-of-truth folders, not owner runtime features. |
| `main-website`, `website-i18n`, `website-asset-operating-system` | Website/content/asset systems. AMM docs may inform future website copy, but owner AMM cannot mutate website/runtime assets. |

---

## 7. Cost Findings From Sweep

Most newly discovered actions should be cheap:

- `communication_*`, `item_share_card_*`, `menu_kit_asset_share`, `print_asset_template_preview`, `physical_surface_*`, `pos_sync_technical_summary_copy`, and `pos_sync_sample_payload_download` are `C0 local`.
- Compliance actions reuse one guarded API and the existing compliance override doc. No AMM mirror collection is allowed.
- Presence monitor confirm/unconfirm writes only `menuPresence.{surface}` through `updateMenuPresence()`.
- POS instruction draft may update the existing daily instruction count, but AMM must not store POS secrets in session/proposal docs.
- Reviews/reputation routes are disabled by feature flags today; AMM must not add polling or direct Google posting.
- New item metadata and image editing already have AI accounting routes; AMM cards are drafts until owner applies output through existing item/image paths.

---

## 8. Ongoing Feature-By-Feature Process

When future MenuList docs are added or changed:

1. Start with the changed `__docs__/[feature]` folder.
2. Read `README`, `_spec`, `_impl`, `_firebase`, `_mobile-support`, and `_test-cases` if present.
3. Search the named source files with `rg`; verify feature flags and actual APIs/DAL helpers exist.
4. Decide one of:
   - `ready_adapter`
   - `needs_adapter_glue`
   - `existing_api_only`
   - `manual_task_only`
   - `blocked`
   - `excluded`
5. Update `ai-menu-manager_action-type-checklist.md` first.
6. Sync `README.md`, `ai-menu-manager_firebase.md`, `ai-menu-manager_mobile-support.md`, and `ai-menu-manager_test-cases.md` only when the family/cost/mobile/test surface changes.

The checklist remains the executable registry planning document. This audit file is the discovery ledger.

---

## 9. Top-Level Folder Coverage Index

This index records how the current top-level `__docs__` folders were handled in this AMM audit. When a folder changes later, move it to the more specific bucket if the source check proves a new AMM action.

| Bucket | Folders |
| --- | --- |
| Action-bearing, deep-checked or already mapped | `ai-enhancement-packs`, `business-type-data-model`, `client-menu`, `client-menu-retrieval-foundation`, `compliance-pages`, `customer-app`, `customer-communication-kit`, `digital-screens`, `editor-ux-improvements`, `extracted-business-profile`, `gbp-sync`, `hours-holiday-accuracy`, `item-truth-export`, `media-image-system`, `menu-card-export`, `menu-command-center`, `menu-correctness-engine`, `menu-extraction-pipeline`, `menu-intake-identity`, `menu-kit`, `menu-link-import`, `menu-presence-monitor`, `menu-quality-signals`, `mobile-operational-support`, `multi-chain-permissions`, `multi-outlet-consistency`, `official-business-page`, `pdf-surface`, `physical-surfaces`, `platform-pull-api`, `pos-webhook-sync`, `pricing-integrity-system`, `print-assets`, `print-menu-surfaces`, `printable-asset-templates`, `projects`, `public-menu-entry`, `reputation-protection`, `reviews-reputation`, `roles-permissions`, `sharable-item-card-generation`, `special-menu-switching`, `staff-prompt`, `stores-management`, `temp-status-layer`, `url-routing-architecture`, `use-menulist` |
| Signal, doctrine, or read-only context | `ai-extraction-monitoring`, `ai-system-layer`, `behavior-engineering`, `business-truth-graph`, `canonical-truth-infrastructure`, `category-dominance`, `continuous-menu-intelligence`, `control-layer-strategy`, `cost-self-protection`, `customer-facing-infrastructure`, `decision-intelligence`, `discovery-infrastructure`, `distribution-infrastructure`, `growth-engine`, `growth-execution-strategy`, `infrastructure-compounding`, `intelligence-doctrine`, `lifecycle-messaging`, `loyalty-health-signal`, `menu-health-monitor`, `menu-trust-signals`, `ops-alerting-delivery`, `owner-business-assistant`, `owner-notifications`, `presence-dominance`, `risk-decline-detection`, `silent-correction-systems`, `smb-data-inventory`, `support-automation`, `surface-os`, `system-strengthening`, `trust-health-signal`, `truth-accuracy-dominance` |
| Excluded product, internal, account, billing, website, or docs/process folders | `agent-readiness-strategy`, `ai-menu-manager`, `answerlattice`, `archive`, `audits`, `auth`, `auth-onboarding`, `campaigncue`, `chatgpt-reviews`, `constitution`, `creative-editor-template-registry`, `deployment`, `features`, `free-tools-strategy`, `growthos-addon`, `growthos-command-center`, `incident-response`, `internal-platform`, `internal-tracking`, `kilocode`, `kitstamp`, `legal`, `main-website`, `marketing`, `messaging-onboarding`, `messaging-onboarding-dashboard`, `mycodex-audio-reader`, `mycodex-pwa-shell`, `onboarding`, `onboarding-centralization`, `ops-control-room`, `ownership-transfer`, `patterns`, `phone-otp-auth`, `platform-cost-posture`, `postmortems`, `production-readiness`, `raw-data`, `razorpay`, `research`, `reseller-dashboard`, `sales`, `security`, `shared-creative-editor`, `social-content`, `strategy`, `terminology`, `testing-and-audit-prompts`, `website-asset-operating-system`, `website-i18n`, `workflows-guide` |

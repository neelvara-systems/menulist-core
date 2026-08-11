# MenuList Feature Launch Inventory

**Status:** Active feature-to-video crosswalk
**Created:** August 10, 2026
**Product authority:** [`FEATURE_SWEEP_MASTER_INVENTORY.md`](../../../FEATURE_SWEEP_MASTER_INVENTORY.md)
**Public feature authority:** [`featureNavigation.ts`](../../../src/components/website/features/featureNavigation.ts)

## Decision Method

A dedicated feature launch video is admitted only when the capability:

- has an owner- or customer-facing outcome;
- can be shown accurately with current runtime or approved demo evidence;
- is understandable as one focused story;
- reinforces the approved-source product category;
- does not depend on a disabled flag, unverified integration, internal operation, or sibling product.

The public feature navigation provides the primary launch set. The master inventory is used to catch supporting capabilities, blocked surfaces, and implementation rows that should not become standalone marketing claims.

## Dedicated Feature Launch Authorities

| Public feature | Inventory rows represented | Video authority | Funnel job | Production state |
| --- | --- | --- | --- | --- |
| Menu import | `menu_import_extraction`, `public_menu_entry` | [Video 6](../videos_06-photo-pdf-to-customer-link-reel.md) | Remove setup fear | Existing script; current capture required |
| Menu content prep | `media_image_system`, `descriptions_translations` | [Menu Content Prep](./menu-content-prep-launch.md) | Show prepared descriptions, images, and languages with owner review | Script-ready; fresh runtime capture required |
| Menu quality validation | `pricing_integrity`, menu-quality/readiness signals | [Menu Quality Validation](./menu-quality-validation-launch.md) | Build trust before publish | Script-ready; fresh runtime capture required |
| Featured Choices | `design_presentation` plus current eligible-choice behavior | [Featured Choices](./featured-choices-launch.md) | Show customer decision support without sales claims | Script-ready; fresh runtime capture required |
| Official Business Page | `official_business_page`, `store_profile_settings`, `working_hours_slots` | [Video 10](../videos_10-official-business-page-reel.md) | Expand MenuList beyond a menu | Existing script; current page capture required |
| QR menu and links | `publish_share_export`, `customer_app_pwa` | [QR Menu And Links](./qr-menu-links-launch.md) | Show stable owner-placed access paths | Script-ready; proof assets exist |
| Print-ready kit | `menu_card_export`, `print_assets`, `communication_kit` | [Print-Ready Kit](./print-ready-kit-launch.md) | Connect the approved source to physical placement | Script-ready; proof assets exist |
| Owner phone dashboard | `mobile_owner_shell`, `owner_dashboard_today`, `menu_setup_activation` | [Owner Phone Dashboard](./owner-phone-dashboard-launch.md) | Remove laptop/setup anxiety | Script-ready; proof asset exists |
| Activity and analytics | `customer_owner_analytics` | [Activity And Analytics](./analytics-launch.md) | Show calm aggregate evidence after publish | Script-ready; proof asset exists |
| Business Health | `owner_business_health`, `menu_health_monitor` | [Business Health](./business-health-launch.md) | Show a quiet daily operating result | Script-ready; proof asset exists |
| Customer feedback loop | `guest_feedback` | [Customer Feedback Loop](./customer-feedback-loop-launch.md) | Show private issue correction | Script-ready; proof asset exists |
| Public discovery | `menu_presence_monitor`, relevant `public_website` discovery surfaces | [Public Discovery](./public-discovery-launch.md) | Explain readiness without ranking promises | Script-ready; proof asset exists |
| AI Menu Manager | `ai_menu_manager`, `website_ai_menu_manager_page` | [Video 9](../videos_09-ai-menu-manager-reel.md) | Demonstrate controlled assistance | Existing script; command/capture certification required |
| Multi-location | `multi_outlet` | [Video 11](../videos_11-multi-location-reel.md) | Show master consistency plus local control | Existing script; outlet capture and policy review required |

## Covered Inside Another Video

These are real MenuList capabilities, but a separate launch video would fragment the story or duplicate a stronger feature authority.

| Inventory row | Video treatment | Reason |
| --- | --- | --- |
| `public_menu_rendering` | Hero, demo, Featured Choices, QR, and Official Business Page proof | The customer menu is the recurring product result, not an isolated launch campaign |
| `menu_project_editor` | Product demo and owner phone dashboard | It is the operating surface behind several outcomes |
| `mobile_menu_bulk_controls` | Owner phone dashboard or onboarding clip | Useful workflow detail, not a standalone market category |
| `design_presentation` | Featured Choices and product demo | Customer presentation is broader than one isolated control |
| `special_menus` | Product demo or seasonal tutorial | Requires a real seasonal use case and current menu-state proof |
| `store_profile_settings` | Official Business Page | Business details belong around the official customer page story |
| `working_hours_slots` | Official Business Page and Business Health | Hours are a public-truth component, not a separate launch promise |
| `temporary_status` | AI Menu Manager, Business Health, or update tutorial | Best shown as a concrete change such as sold out or closed today |
| `customer_app_pwa` | QR menu and links | The saveable shortcut must not be framed as an app-store product |
| `digital_screens` | Product demo or one-link distribution proof | Needs current linked-screen evidence and must not imply every screen refreshes automatically |
| `public_truth_tools` | Separate tools content series | Browser-local tools are acquisition utilities, not the core paid product launch |
| `communication_kit` | Print-ready kit | Physical and share assets share one approved-source story |
| `menu_setup_activation` | Menu import and owner phone dashboard | Setup progress supports activation rather than a customer-facing product category |

## Tutorial Or Onboarding Only

| Inventory row | Treatment | Boundary |
| --- | --- | --- |
| `auth_onboarding` | Sign-in/setup tutorial | Do not market authentication as a product feature |
| `menu_project_editor` | Editor walkthrough | Use only after the owner asks how editing works |
| `mobile_menu_bulk_controls` | Task tutorial | Show one bounded action at a time |
| `media_image_system` | Content-prep tutorial after feature launch | Mention plan/credit and owner-review boundaries |
| `descriptions_translations` | Content-prep tutorial after feature launch | No unchecked public generation claim |
| `compliance_pages` | Help/onboarding content | Legal pages are trust infrastructure, not a launch hook |
| `staff_access_roles` | Account-management tutorial | Requires exact authority and role-state capture |
| `help_center` | Owner support tutorial | Do not position the sibling Answerlattice product as MenuList functionality |
| `billing_transactions` | Pricing/account help | Never use blocked billing state as launch proof |
| `public_api` | Developer documentation | Requires live-key/application evidence before promotion |

## No Standalone Marketing Video

| Inventory row | Decision | Reason |
| --- | --- | --- |
| `domain_routing_cache` | Exclude | Internal delivery and cache contract |
| `pos_sync` | Block | Live receiver/application proof remains pending; no vendor-sync promise |
| `reviews_reputation` | Block | Feature flags are disabled and direct external posting is unsupported |
| `owner_referral` | Block | Feature is disabled and requires a separately approved pilot |
| `platform_internal_ops` | Exclude | Internal operator surface |
| `reseller_dashboard` | Exclude | Internal/blocked for owner launch |
| `lifecycle_messaging` | Exclude | Internal notification infrastructure |
| `cost_protection_ops` | Exclude | Internal recovery and cost-control surface |
| `website_asset_os` | Exclude | Internal documentation/asset system |
| `answerlattice_product` | Exclude | Separate product |
| `campaigncue_product` | Exclude | Separate product |
| `growthos_kitstamp_mycodex` | Exclude | Separate or reserved product scope |

## Feature Launch Sequence

1. Menu import.
2. Owner phone dashboard.
3. QR menu and links.
4. Official Business Page.
5. Business Health.
6. Print-ready kit.
7. Customer feedback loop.
8. Activity and analytics.
9. Menu quality validation.
10. Menu content prep.
11. Featured Choices.
12. AI Menu Manager.
13. Public discovery.
14. Multi-location.

This order starts with setup relief and daily owner usability, then proves distribution, correctness, operation, and advanced capability. It does not imply every video publishes on consecutive days; the campaign calendar controls distribution timing.

## Revalidation Rule

Before any feature video enters production, recheck:

1. the feature row in the current master inventory;
2. the active feature flag and current runtime surface;
3. the public feature page and current English copy;
4. the exact screenshots or demo capture;
5. the claim and approval boundary;
6. the feature-specific conversion brief and campaign-ledger row.

If the inventory, runtime, and public copy disagree, runtime and current maintained product docs win. Stop production until the public script is reconciled.

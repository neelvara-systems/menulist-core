# MenuList Current Feature Inventory And Answerlattice Coverage

**Verified:** 2026-07-20 against `FEATURE_SWEEP_MASTER_INVENTORY.md`, `FEATURE_SWEEP_MASTER_REPORT.md`, current feature flags, maintained feature docs, and relevant runtime contracts.

## Purpose

This source prevents Answerlattice from confusing implemented source, deployed availability, account entitlement, disabled experiments, internal tooling, and sister products. It is a support-coverage map, not launch certification.

## Support Status Rule

- `direct`: Answer from reviewed help/canonical truth, while respecting current account/permission state.
- `conditional`: Explain where/how only after checking plan, flag, role, selected store/location, provider, or current deployment state.
- `escalate`: Give a safe next step and use authenticated support for account-specific resolution.
- `disabled`: State that the capability is not currently available; do not provide fake steps.
- `internal`: Do not expose as an owner feature or reveal operational details.
- `separate`: Keep the other product completely outside MenuList feature answers.

## Feature Inventory

| Feature ID | Current product boundary | Answerlattice treatment |
| --- | --- | --- |
| `public_website` | Canonical public website, resources, pricing, trust, legal, discovery, and reviewed website localization. | `direct` for stable public facts; `escalate` pricing/legal/account-specific questions; canonical host is `menulist.ai`. |
| `website_ai_menu_manager_page` | Public explanation of AI Menu Manager. | `direct` only within current registered-action, owner-approval, no-autonomous-publishing boundary. |
| `public_menu_rendering` | Customer menu/item/detail output from approved project/store truth. | `direct`; troubleshoot active store/menu, saved change, correct link, refresh, language, and escalation. |
| `official_business_page` | Public business identity, current status, actions, photos, and menu entry. | `direct/conditional`; owner-managed fields only; no external-provider verification claim. |
| `domain_routing_cache` | Stable slugs, domains, redirects, and public cache invalidation. | `direct` in owner language; never expose cache tags or promise instant third-party refresh. |
| `auth_onboarding` | Google, email/password, supported passcode/staff paths, tenant/store provisioning, and claim boundaries. | `direct` for ordinary access; `escalate` wrong claim, merge, last-owner, transfer, deletion, or disputed authority. |
| `mobile_owner_shell` | Today/Menu/Share/More owner flows inside MobileShell. | `direct`; do not route mobile users through desktop-only bypasses. |
| `customer_owner_analytics` | Bounded public customer signals and compact owner read models. | `direct` for metric meaning; no customer identity, exact GPS, payment, or legal-record claim. |
| `owner_dashboard_today` | Primary day-to-day owner status and action view. | `direct`; historical state is lazy and account dependent. |
| `owner_business_health` | Read-only Business Health, public readiness, analytics/feedback context, and grounded answers. | `direct`; it cannot prepare or execute menu changes. Direct mutation requests to Menu Manager. |
| `public_truth_tools` | Public local diagnostics, shareable self-reports, owner readiness, and gated monitor history. | `direct/conditional`; no fake external scan, ranking, citation, or provider-verification claim. |
| `ai_menu_manager` | Selected-menu answers and registered proposal/approval/receipt workflows on desktop and mobile. | `conditional`; deterministic/provider planning cannot mutate truth; approval and version checks remain mandatory. |
| `menu_project_editor` | Project/menu create, edit, save, publish, and active menu management. | `direct`; success requires acknowledged persistence; current project truth wins. |
| `mobile_menu_bulk_controls` | Mobile bulk visibility/text/price/category actions through shared menu contracts. | `direct/conditional`; preview/confirm and numeric-price rules apply. |
| `menu_import_extraction` | Authenticated photo/PDF/link acquisition, extraction jobs, review, and owner apply. | `direct/conditional`; no unsupported private/marketplace source bypass; provider/storage availability can block completion. |
| `public_menu_entry` | Discoverable Create Menu entry with sign-in-first acquisition, owner-bound extraction, preview, claim, and publish. | `direct`; never say upload/link processing happens before sign-in. |
| `menu_setup_activation` | Selected-project setup progress and bounded starter activation evidence. | `direct`; optional descriptions/images/languages do not keep a completed required setup card open. |
| `media_image_system` | Safe owner image preparation/storage plus gated generation/editing. | `conditional`; validate file, scope, size, owner acceptance, and credit behavior. |
| `descriptions_translations` | First descriptions, paid rewrites, menu/public-copy translations, repair, fallback, and owner persistence. | `conditional`; exact requested coverage must be valid before success; no provider output auto-publish. |
| `design_presentation` | Customer menu mood/layout/background and current price/availability rendering. | `direct/conditional`; design never overrides readability, pricing, or active truth. |
| `publish_share_export` | Publish, stable public link, QR, share, Menu Kit, and browser/download exports. | `direct`; saved/downloaded artifacts do not update themselves after export. |
| `menu_card_export` | Browser-local menu/share card generation plus gated design advice. | `direct/conditional`; downloadable output only; owner review required. |
| `print_assets` | Print assets, templates, and current-menu exports. | `direct`; recommend scan/content checks before printing. |
| `special_menus` | Scheduled special menu activation/switch-back using current store/project truth. | `conditional`; verify feature/account state and escalate overlaps or wrong active output. |
| `multi_outlet` | HQ/master inheritance, outlet policy/override, linked menus, capacity, and location identity. | `conditional`; use exact selected outlet, direct/inherited billing, and no automatic location merge. |
| `store_profile_settings` | Business identity, contact, address, public presence, language, timezone, attributes, SEO, and temporary status. | `direct/conditional`; public truth writes require current store scope; high-risk/provider fields need review. |
| `working_hours_slots` | Weekly hours, store-timezone open/closed status, Today quick edit, and category time slots. | `direct`; holiday calendar/date exceptions are not shipped. |
| `pricing_integrity` | Number/currency/range/text/multilingual and option price truth across owner/public/export surfaces. | `direct`; only true numeric prices enter arithmetic; no invented conversion or price. |
| `temporary_status` | Bounded owner-set temporary public status with expiry. | `direct`; it does not rewrite weekly hours or require cleanup scanning. |
| `customer_app_pwa` | Optional installable customer menu shortcut/PWA using current public truth. | `conditional`; it is not a native app-store product and does not promise stale offline menu access. |
| `digital_screens` | Current Menu Board/Highlights browser surfaces. | `direct/conditional`; check URL, network, active content, refresh, and account state. |
| `guest_feedback` | Customer feedback/QR/widget and scoped owner review. | `direct/conditional`; preserve private content and attachment boundaries. |
| `pos_sync` | Signed full-menu snapshot to one configured provider/developer URL after approved changes. | `conditional/high-risk`; no universal POS, exactly-once, real-time, or provider-application guarantee. |
| `reviews_reputation` | Reviews/Reputation and AI Reply Assist remain disabled. | `disabled`; no direct external review posting or AI reply promise. |
| `compliance_pages` | Optional public compliance output from reviewed business inputs. | `conditional/high-risk`; no legal certification or auto-generated legal advice. |
| `communication_kit` | Browser-local customer/staff messages and physical-surface handoffs. | `direct`; copy/share output only, not campaign automation. |
| `menu_presence_monitor` | Owner checklist/readiness for placed links/QR/screens/feedback and manual confirmations. | `direct/conditional`; checklist evidence is not external-provider verification or ranking proof. |
| `owner_referral` | Invitation/reward architecture exists behind disabled acquisition/settlement flags and pilot allowlist. | `disabled`; do not promise referral availability or credits unless an approved pilot is visibly active. |
| `staff_access_roles` | Staff creation, roles, permissions, reset, removal, and session effects. | `direct/conditional`; never reveal credentials or bypass role/store scope. |
| `billing_transactions` | Razorpay subscription/top-up/payment lifecycle, Transactions, paid-cycle entitlement, and content credits. | `conditional/high-risk`; exact account state and current policy control the answer; no money mutation during support testing. |
| `platform_internal_ops` | Platform/operator monitoring and mutation surfaces. | `internal`; never present as owner capability or expose operational/security data. |
| `reseller_dashboard` | Reseller-only account/capacity/billing administration. | `internal`; ordinary owners use Billing/support, not reseller routes. |
| `public_api` | API-key-gated business/menu pull with scoped rate/security controls. | `conditional/high-risk`; active account/key and exact integration scope required; not a generic public write API. |
| `menu_health_monitor` | Non-blocking publish verification/health evidence. | `internal/conditional`; do not invent health status unless current verified state is available. |
| `lifecycle_messaging` | Internal owner-notification operations and bounded delivery. | `internal`; do not promise a message was sent unless acknowledged. |
| `cost_protection_ops` | SAFE_MODE, internal alerts, schedulers, extraction/cost monitoring, and recovery. | `internal`; owner-facing copy may describe temporary unavailability, not internal cost/provider controls. |
| `help_center` | Answerlattice-backed MenuList Help Center, search, content, tickets, feedback, and mobile routing. | `direct/conditional`; use authenticated scope, bounded attachments, and escalation when approved truth is missing. |
| `website_asset_os` | Internal-only website asset architecture. | `internal`; no owner/public runtime or product data mutation. |
| `answerlattice_product` | Separate governed support-infrastructure product. | `separate`; MenuList may consume its Help Center/widget, but Answerlattice product features are not MenuList features. |
| `campaigncue_product` | Separate export/download-only campaign product boundary. | `separate`; never imply MenuList performs its campaign work. |
| `growthos_kitstamp_mycodex` | Separate sibling product families. | `separate`; exclude their routes, data, pricing, and claims from MenuList answers. |

## Cross-System Audits That Every Feature Inherits

| Boundary | Current support truth |
| --- | --- |
| Global locale, time, number, currency, date/time, and RTL | Owner UI uses the maintained locale registry; public fixed chrome follows store language where a reviewed pack exists; business content language stays separate; timezone drives business-time display. |
| Accessibility and interaction | Maintained surfaces preserve zoom, keyboard focus, reduced motion, accessible names, image alternatives, skip navigation, and mobile-sized owner controls. |
| Owner PWA, connectivity, and update lifecycle | Private owner pages are not treated as stale offline truth; preview does not register the owner worker; connectivity is advisory and update refresh is explicit. |
| Feature flags/config/environment safety | Source flags are not remote owner settings. A disabled flag or missing provider/configuration must fail closed. |
| Global failure and observability | Recovery copy must say retry/refresh/help/prepare details accurately; do not claim a diagnostic was sent unless confirmed; ordinary recovery must not delete all caches. |
| Account and tenant lifecycle | Provisioning is centralized; logout clears browser/session state after session end; staff last-store removal deactivates access; complete owner data requests are support-managed. |
| Ownership transfer and dormant lifecycle | Operational Owner role is not business transfer; staleness is advisory and cannot silently deactivate a subscription, account, or public menu. |
| SurfaceOS | Planning/reservation only; no MenuList owner/public runtime. |
| Firebase scale and cost | Cost optimizations preserve canonical identity and public truth; summaries, leases, and bounded queries do not change owner support semantics. |

## Explicitly Not Shipped Or Not Promised

- public MenuList MCP server;
- autonomous AI publishing or owner-approval bypass;
- AI-generated allergen publication;
- automatic holiday-calendar or date-exception management;
- automatic Google/Instagram/WhatsApp/delivery-platform posting;
- universal POS or ordering-provider integration;
- automatic location merging or collision resolution;
- ranking, Google Maps placement, AI citation, or answer-placement guarantee;
- generic consumer restaurant discovery engine;
- complete private owner dashboard offline mode;
- Reviews/Reputation direct posting or AI Reply Assist while flags are off;
- owner referral rewards outside an explicitly active approved pilot;
- SurfaceOS runtime;
- public/internal operator controls as owner features.

## Answer Rule

When availability is uncertain, Answerlattice should say where the owner can check and what the feature does, not assert that it is enabled. If the question depends on a live account, payment, provider, deployment, external location match, legal policy, or public correctness failure, route to authenticated support.

# CampaignCue Documentation Hub

**Status:** Manual/export-first runtime implemented; direct provider mutation and billing disabled
**Product:** CampaignCue.ai
**Product class:** Separate product in the shared MenuList/Answerlattice repo
**Primary source input:** ChatGPT conversation attachment, current repo product-boundary patterns, and live web validation notes from the planning pass

CampaignCue is a business-data-first campaign workspace for local businesses. It turns restaurant, salon, agency, and multi-location business data into campaign packs for WhatsApp, social, Google, video, and ads, with source references, trust checks, credits, approvals, and manual fallback.

CampaignCue is not a MenuList feature, not an Answerlattice feature, not GrowthOS, not KitStamp, and not a generic design tool. MenuList can be an optional read-only source connector for restaurant/menu facts. Salons and non-MenuList businesses must work without MenuList.

## Product Documents

| Document | Purpose |
| --- | --- |
| [campaigncue_naming-decision.md](./campaigncue_naming-decision.md) | Name choice, domain signal, and rejected-name notes. |
| [campaigncue_founder-research-addendum.md](./campaigncue_founder-research-addendum.md) | Current market/platform/policy research and founder product decisions. |
| [campaigncue_chatgpt-coverage-audit.md](./campaigncue_chatgpt-coverage-audit.md) | Cross-check map from ChatGPT conversation modules to CampaignCue docs. |
| [campaigncue-production-implementation-audit.md](./campaigncue-production-implementation-audit.md) | Running implementation audit, feature status, validation, and remaining risks. |
| [campaigncue-route-boundary.md](./campaigncue-route-boundary.md) | Route separation rule for public website files vs owner workspace files. |
| [campaigncue-product](./campaigncue-product/README.md) | Product-level doc set for identity, architecture, GTM, Firebase, mobile, and content. |

## Feature Doc Sets

Each feature folder follows the repo doc-set pattern: `README.md`, `_spec.md`, `_impl.md`, `_marketing.md`, `_website.md`, `_helpdoc.md`, `_firebase.md`, and `_mobile-support.md`.

| Feature | Scope |
| --- | --- |
| [business-brain](./business-brain/README.md) | Business profile, brand kit, restaurant/salon catalog, preferences, source confidence. |
| [source-integrations](./source-integrations/README.md) | Current runtime uses signed-in MenuList store-profile bootstrap plus owner source inputs; provider connectors remain setup/request posture only. |
| [opportunity-engine](./opportunity-engine/README.md) | Current runtime creates deterministic Business Brain/readiness cues; broader signal inputs remain provider/source architecture requirements. |
| [campaign-studio](./campaign-studio/README.md) | Goal-first campaign brief, pack generation, output selection, edits, duplicate/reuse behavior. |
| [creative-studio](./creative-studio/README.md) | Current runtime produces source-backed creative briefs and copy; rendered PNG/JPG template generation remains a disabled provider path. |
| [video-reel-studio](./video-reel-studio/README.md) | Current runtime produces reel briefs and shot lists; photo/clip-to-video rendering, subtitles, voiceover, and MP4 export remain disabled provider paths. |
| [ugc-script-studio](./ugc-script-studio/README.md) | Owner/staff/creator-brief scripts, hook banks, shot lists, testimonial guardrails. |
| [whatsapp-sales-studio](./whatsapp-sales-studio/README.md) | WhatsApp drafts, copy/share/manual mode, consent posture, and blocked direct-send rules. |
| [google-local-studio](./google-local-studio/README.md) | Google Business Profile-ready manual drafts, local captions, fallback posture, and no ranking claims. |
| [ads-studio](./ads-studio/README.md) | Meta/Google ad variants, click-to-WhatsApp creative, media-buyer handoff, performance-claim guardrails. |
| [calendar-scheduler](./calendar-scheduler/README.md) | Current runtime stores manual schedule tasks; weekly/30-day generated asset plans remain a guarded architecture path. |
| [asset-library](./asset-library/README.md) | Uploads, asset classification, consent/rights, source links, requests, reuse. |
| [creative-trust-center](./creative-trust-center/README.md) | Trust checks, blockers, warnings, source conflict resolution, fake-proof prevention. |
| [analytics-learning](./analytics-learning/README.md) | Usage, execution, performance, outcome-level reporting, recommendation learning. |
| [agency-workspace](./agency-workspace/README.md) | Clients, approvals, comments, weekly packs, reports, client-scoped operations. |
| [multi-location-center](./multi-location-center/README.md) | Business groups, locations, variants, local approval, partial export. |
| [permissions-billing](./permissions-billing/README.md) | Current runtime shows role/billing posture and blocks spend; credit estimate/reserve/capture/refund remains disabled until billing is configured. |
| [api-boundaries](./api-boundaries/README.md) | API contracts, request context, jobs, webhooks, idempotency, rate limits, service boundaries. |

## Product Boundary

| Boundary | Decision |
| --- | --- |
| MenuList | Optional source connector for official restaurant/menu truth; read-only by default. |
| Answerlattice | No shared support-knowledge runtime or answer infrastructure. |
| GrowthOS | Do not reuse identity; CampaignCue is the proposed public campaign workspace product. |
| KitStamp | No content-prep/canvas identity merge. CampaignCue may create campaign assets but remains campaign execution oriented. |
| Firebase | Separate project ids selected in deployment matrix: `campaigncue-qa` and `campaigncue`; CampaignCue config/rules/storage/index files now exist. |
| Website | Separate public site under `src/app/sites/campaigncue`, local `/__campaigncue`, preview `campaigncue.menulist.online`, production `campaigncue.ai`. |
| Owner workspace route | Owner app files live under `src/app/(campaigncue)/campaigncue`; `/__campaigncue/app` locally and `/app` on the CampaignCue product domain rewrite to `/campaigncue/app`. Do not place owner routes under `src/app/sites/campaigncue`. |

## Day-One Rule

Docs are written for a complete launch architecture. Individual capabilities may be flag-gated during implementation, but the product model, data model, permissions, trust, cost, mobile, agency, multi-location, and integration boundaries must exist from day one.

## Current Implementation Boundary

| Area | Current state |
| --- | --- |
| Product routing | Added to shared deployment and product-domain registries. |
| Public shell | Added under `src/app/sites/campaigncue`. |
| Owner workspace route | Added under `src/app/(campaigncue)/campaigncue/app`; `src/app/sites/campaigncue` remains public website only. |
| Product constants | CampaignCue-specific identity, database, channels, domains, routes, Firebase env/app names, errors, website metadata, workspace defaults, and navigation live under `src/constants/campaigncue/`; do not recreate a flat `src/constants/campaigncue.ts`. |
| Runtime modules | App shell, store-profile source context, deterministic generation, manual exports, trust gates, assets, schedule tasks, approval logging, and analytics summaries are enabled. |
| Firebase | Dedicated CampaignCue Admin client, Firestore rules, Storage rules, indexes, and deploy config added; deploy still requires external credentials. |
| MenuList relationship | No MenuList writes or direct data bridge runtime added. The current source snapshot uses signed-in store profile context only. |
| Disabled modules | Direct provider publishing, WhatsApp direct send, ad spend mutation, billing checkout, paid AI generation, and rendered video provider calls. |

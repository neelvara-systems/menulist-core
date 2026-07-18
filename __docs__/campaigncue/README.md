# CampaignCue Documentation Hub

**Status:** Export/download-first runtime implemented; direct provider mutation, social posting, and billing disabled
**Product:** CampaignCue.ai
**Product class:** Separate product in the shared MenuList/Answerlattice repo
**Primary source input:** ChatGPT conversation attachment, current repo product-boundary patterns, and live web validation notes from the planning pass

CampaignCue is a business-data-first campaign operating system for local businesses. It starts from a deterministic Campaign Decision Engine, combines approved facts with a short owner-entered operating pulse and commercial policy, shows the Daily Campaign Desk, recommends what to promote from rules and recipes rather than model guesses, prepares a structured Campaign Pack Output, rechecks truth before public-use actions, routes optional edits through the shared editor/Design Cue/CueLayers, and records owner-reported result receipts.

CampaignCue is not a MenuList feature, not an Answerlattice feature, not GrowthOS, not KitStamp, and not a generic design tool. MenuList can be an optional read-only source connector for restaurant/menu facts. Salons and non-MenuList businesses must work without MenuList.

The core loop is:

`Business Brain + Owner Pulse + Commercial Policy -> Campaign Decision Engine -> Daily Campaign Desk -> Campaign Pack Output -> Creative Studio -> Shared Creative Editor / Design Cue / CueLayers when needed -> Truth recheck -> Manual export -> Result receipt -> Next one-variable test`

## Product Documents

| Document | Purpose |
| --- | --- |
| [campaigncue_naming-decision.md](./campaigncue_naming-decision.md) | Name choice, domain signal, and rejected-name notes. |
| [campaigncue_founder-research-addendum.md](./campaigncue_founder-research-addendum.md) | Current market/platform/policy research and founder product decisions. |
| [campaigncue-next-expansion-list.md](./campaigncue-next-expansion-list.md) | Parked expansion candidates after the main gap-fix implementation pass. |
| [campaigncue-delivery-boundary.md](./campaigncue-delivery-boundary.md) | Active export/download runtime and separate future provider-posting boundary. |
| [campaigncue_chatgpt-coverage-audit.md](./campaigncue_chatgpt-coverage-audit.md) | Cross-check map from ChatGPT conversation modules to CampaignCue docs. |
| [campaigncue-production-implementation-audit.md](./campaigncue-production-implementation-audit.md) | Running implementation audit, feature status, validation, and remaining risks. |
| [campaigncue-route-boundary.md](./campaigncue-route-boundary.md) | Route separation rule for public website files vs owner workspace files. |
| [campaigncue-product](./campaigncue-product/README.md) | Product-level doc set for identity, architecture, GTM, Firebase, mobile, and content. |
| [../shared-creative-editor](../shared-creative-editor/README.md) | Shared product-neutral image editor used by CampaignCue through an adapter. |

## Feature Doc Sets

Each feature folder follows the repo doc-set pattern: `README.md`, `_spec.md`, `_impl.md`, `_marketing.md`, `_website.md`, `_helpdoc.md`, `_firebase.md`, and `_mobile-support.md`.

| Feature | Scope |
| --- | --- |
| [business-brain](./business-brain/README.md) | Business profile, brand kit, Brand Playbook, local-business type, catalog/service context, preferences, and source confidence. |
| [source-integrations](./source-integrations/README.md) | Current runtime uses signed-in MenuList store-profile bootstrap plus owner source inputs; social/provider connectors are future-disabled posture only. |
| [opportunity-engine](./opportunity-engine/README.md) | Current runtime creates deterministic Business Brain/readiness cues; broader signal inputs remain provider/source architecture requirements. |
| [campaign-decision-engine](./campaign-decision-engine/README.md) | Implemented deterministic recommendation authority. It ranks campaign recipes from Business Brain facts, readiness, timing, assets, trust risk, owner effort, repetition, and compact result memory without asking a model what to promote. |
| [daily-campaign-desk](./daily-campaign-desk/README.md) | Implemented owner-first starting screen that turns existing CampaignCue data into one recommended action, missing-input prompts, ready-pack controls, manual delivery tasks, asset reuse, print/photo tasks, and result memory without extra Firebase reads. |
| [campaign-operating-loop](./campaign-operating-loop/README.md) | Implemented Owner Pulse, commercial safety, pack freshness, result receipts, review/return-customer recipes, local presence, protected-language handoff, staff tasks, and one-variable learning on existing CampaignCue documents. |
| [campaign-pack-output-system](./campaign-pack-output-system/README.md) | Implemented canonical output layer that packages decision, missing inputs, channel copy, handoff fields, trust report, reuse notes, mini-page/QR brief, Campaign Proof Deck brief, result memory, and a structured ZIP download. |
| [ai-assistance-layer](./ai-assistance-layer/README.md) | Implemented deterministic assistant plan showing where AI can help with source intake, missing inputs, pack drafting, trust explanation, result interpretation, and photo coaching without model-owned decisions, provider calls, or extra Firebase reads. |
| [pattern-cue](./pattern-cue/README.md) | Implemented owner-submitted example workflow that turns one public link plus format notes into a compact structural observation and original reel/creator hooks without storing the raw transcript, monitoring accounts, or adding reads/collections. |
| [campaign-pack-template-registry](./campaign-pack-template-registry/README.md) | Planned category-aware pack-template registry for curated CampaignCue platform templates and owner-saved reusable packs, using shared business category truth and one default category catalog read. |
| [campaign-studio](./campaign-studio/README.md) | Goal-first campaign brief, pack generation, output selection, edits, duplicate/reuse behavior. |
| [creative-studio](./creative-studio/README.md) | Current runtime produces source-backed creative briefs and copy; CampaignCue can open the shared creative editor, use deterministic AI Tools and Design Cue for editable copy/checks, and export manual SVG/PNG assets while provider rendering remains disabled. |
| [design-cue](./design-cue/README.md) | Implemented deterministic conversation/comment assistant inside the editor. Known edits become validated `CreativeEditorDocument` patches; model help is routed through a guarded fail-closed API until provider/cost gates are enabled. |
| [video-reel-studio](./video-reel-studio/README.md) | Current runtime produces reel briefs and shot lists; photo/clip-to-video rendering, subtitles, voiceover, and MP4 export remain disabled provider paths. |
| [ugc-script-studio](./ugc-script-studio/README.md) | Owner/staff/creator-brief scripts, hook banks, shot lists, testimonial guardrails. |
| [whatsapp-sales-studio](./whatsapp-sales-studio/README.md) | WhatsApp drafts, download/export/manual mode, consent posture, and blocked direct-send rules. |
| [google-local-studio](./google-local-studio/README.md) | Google Business Profile-ready manual drafts, local captions, fallback posture, and no ranking claims. |
| [ads-studio](./ads-studio/README.md) | Meta/Google ad variants, click-to-WhatsApp creative, media-buyer handoff, performance-claim guardrails, and a disabled read-first Meta Ads MCP evidence posture. |
| [calendar-scheduler](./calendar-scheduler/README.md) | Current runtime stores manual schedule tasks; weekly/30-day generated asset plans remain a guarded architecture path. |
| [asset-library](./asset-library/README.md) | Uploads, asset classification, consent/rights, source links, requests, reuse. |
| [cue-layers](./cue-layers/README.md) | Safe upload spine implemented for owner-uploaded flat images: source package, locked original, shared-editor projection, autosave/version snapshots, fallback repair records, Storage-backed export registration, and Asset Library download handoff. Provider-driven OCR, segmentation, vectorization, generated-source intake, and high-confidence decomposition remain gated. |
| [creative-trust-center](./creative-trust-center/README.md) | Trust checks, blockers, warnings, source conflict resolution, fake-proof prevention. |
| [analytics-learning](./analytics-learning/README.md) | Observed actions, owner-reported result receipts, bounded metrics, confidence labels, and deterministic one-variable learning. Provider outcome imports remain disabled. |
| [agency-workspace](./agency-workspace/README.md) | Clients, approvals, comments, weekly packs, reports, client-scoped operations. |
| [multi-location-center](./multi-location-center/README.md) | Business groups, locations, variants, local approval, partial export. |
| [permissions-billing](./permissions-billing/README.md) | Current runtime shows role/billing posture and blocks spend; credit estimate/reserve/capture/refund remains disabled until billing is configured. |
| [api-boundaries](./api-boundaries/README.md) | API contracts, export actions, read-only future provider posture, idempotency, rate limits, and service boundaries. |

## Product Boundary

| Boundary | Decision |
| --- | --- |
| MenuList | Optional source connector for official restaurant/menu truth; read-only by default. |
| Answerlattice | No shared support-knowledge runtime or answer infrastructure. |
| GrowthOS | Do not reuse identity; CampaignCue is the proposed public campaign workspace product. |
| KitStamp | No content-prep/canvas identity merge. CampaignCue may create campaign assets but remains campaign execution oriented. |
| Firebase | Separate project ids selected in deployment matrix: `campaigncue-qa` and `campaigncue`; CampaignCue config/rules/storage/index files now exist. |
| Website | Separate public site under `src/app/sites/campaigncue`, local `/__campaigncue`, preview `campaigncue.menulist.online`, production `campaigncue.ai`. |
| Public feature pages | Dedicated pages live under `src/app/sites/campaigncue/features/[featureSlug]` and use `src/constants/campaigncue/websiteFeatures.ts`; they are static public education surfaces, not owner dashboard routes. |
| Owner workspace route | Owner app files live under `src/app/(campaigncue)/campaigncue`; `/__campaigncue/app` locally and `/app` on the CampaignCue product domain rewrite to `/campaigncue/app`. Do not place owner routes under `src/app/sites/campaigncue`. |
| Dashboard shell | CampaignCue uses the same MenuList authenticated app foundation, dark/light theme persistence, language/settings drawer, shared top header, shared sidebar shell, and profile menu. CampaignCue does not use MenuList store/subscription bootstrap just to render its chrome; CampaignCue APIs own workspace data access. |

## Day-One Rule

Docs are written for a complete launch architecture, but the active day-one product does not post to social media or connect social/provider accounts. Export/download is the active delivery model; provider posting remains a separate future layer documented in [campaigncue-delivery-boundary.md](./campaigncue-delivery-boundary.md).

## Current Implementation Boundary

| Area | Current state |
| --- | --- |
| Product routing | Added to shared deployment and product-domain registries. |
| Public shell | Added under `src/app/sites/campaigncue`. The June 27 Prism-style visual pass is CSS/client-only: mesh/grain atmosphere, glass surfaces, pointer-tracked hover highlights, and bento card rhythm. The June 29 compression pass adds an early category-switch comparison, keeps the hero to one primary CTA, and removes redundant rendered homepage catalog/path/workflow bands. It does not add Firestore reads, provider calls, posting, pricing, or owner-workspace behavior. |
| Public feature pages | Added for Daily Campaign Desk, Campaign Pack Studio, Creative Studio, CueLayers, Creative Trust Center, Brand Playbook and Proof Deck, and Reusable Pack Templates. Sitemap and homepage/footer links use product-scoped feature-page constants. |
| Owner workspace route | Added under `src/app/(campaigncue)/campaigncue/app`; `src/app/sites/campaigncue` remains public website only. |
| Owner dashboard shell | CampaignCue route group now mounts the same auth/localization/theme/settings foundation as MenuList and maps CampaignCue tabs into the shared dashboard sidebar/header components. |
| Product constants | CampaignCue-specific identity, database, channels, domains, routes, Firebase env/app names, errors, website metadata, workspace defaults, and navigation live under `src/constants/campaigncue/`; do not recreate a flat `src/constants/campaigncue.ts`. CampaignCue uses product code `CC` for stored product identity and product slug `campaigncue` for routes/domains/env namespaces. |
| Runtime modules | App shell, deterministic Campaign Decision Engine, Daily Campaign Desk, AI Assistance Plan, Owner Pulse, commercial safety, fourteen vertical/action recipes, source freshness receipts, structured Campaign Pack Output ZIPs, local presence passport, protected-language handoff, manual staff/schedule tasks, trust gates, asset rights metadata, approval logging, owner-reported result receipts, one-variable learning, launch-readiness checks, and analytics summaries are enabled. Manual handoff copy feedback waits for Clipboard API success or acknowledged textarea fallback success. |
| Source-to-channel pack | Output picker can turn the current source-backed campaign cue into a bounded multi-channel pack for WhatsApp, Google/local, social/print creative, manual task, and result memory. It does not force-select one individual source update, and it is not blog/podcast/video repurposing, autopilot distribution, direct posting, or posting-time automation. |
| Local creator test brief | Output picker and UGC handoff fields can prepare a creator-fit checklist, lightweight creator brief, 3-test plan, flat-fee boundary, disclosure/consent note, and result prompt. This is not creator recruiting, marketplace, contracts, payments, or guaranteed performance. |
| Pattern Cue | Examples tab stores one bounded current structural pattern on the existing workspace document and carries it into the next video/UGC brief. It does not treat inspiration as a business fact, copy source content, monitor accounts, or call a provider. |
| API security logs | Shared API guard and Design Cue validation security events use bounded route/session metadata and presence-length fields instead of raw `buildSecurityContext()` output. |
| Firebase | Dedicated CampaignCue Admin client, Firestore rules, Storage rules, indexes, and deploy config added; deploy still requires external credentials. |
| MenuList relationship | No MenuList writes or direct data bridge runtime added. The current source snapshot uses signed-in store profile context only. |
| Shared creative editor | CampaignCue consumes `src/modules/creative-editor/` through a product adapter. The editor is not CampaignCue-owned and can be reused by other products through separate adapters. |
| Design Cue | Implemented inside the shared editor AI Tools drawer for CampaignCue. Deterministic commands/comments are browser-local; the model-assist route is guarded and disabled. |
| CueLayers | Safe upload spine is implemented for owner-uploaded flat images: source-package snapshots, immutable Storage artifacts, flat-safe shared-editor projection, current-job direct replay pointer, autosave/version snapshots, fallback repair records, revision-pinned Storage-backed export registration, and scoped Asset Library download handoff. Provider-driven OCR, segmentation, vectorization, generated-source intake, and repair workers remain gated behind the documented capability model. |
| Disabled modules | Social account connections, direct provider publishing, WhatsApp direct send, ad spend mutation, billing checkout, paid AI generation, and rendered video provider calls. |

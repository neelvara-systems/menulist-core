# CampaignCue Next Expansion List

**Status:** Backlog register after the main gap-fix and delivery-boundary implementation passes.
**Rule:** Do not use this file to claim that an earlier accepted capability is complete. The local export/download runtime is the current source truth, while media upload/thumbnails, fuller video generation, audio depth, collaborative review, durable render lifecycle, and video-result reuse remain original-decision parity gaps recorded in [Video Reel Studio validation](./video-reel-studio/video-reel-studio_validation.md). Provider integration and social/ad mutation remain separate rejected or separately gated scope.

## Implemented From Market Gap Pass

Daily Campaign Desk and Campaign Operating Loop are no longer parked expansions. They are implemented under [daily-campaign-desk](./daily-campaign-desk/README.md) and [campaign-operating-loop](./campaign-operating-loop/README.md): deterministic recommendations, Owner Pulse, commercial gates, fourteen SMB action recipes, Missing Input Inbox, freshness-aware packs, manual delivery/staff tasks, local presence, protected-language handoff, CueLayers reuse, and owner-reported result receipts. They add no new overview read path or collection.

Now implemented and not future scope:

- deterministic Campaign Decision Engine and auditable `CampaignCueDecision`
- first-class pack review derived from existing overview data
- compact `campaign.pack` metadata with selected `recipeId` and `decision`
- structured `handoffFields` and manual delivery cards
- canonical `CampaignCueOutputPack` and browser-local Campaign Pack ZIP download
- local visibility tab and `cue_local_visibility_refresh` opportunity
- compact `campaign.resultMemory` and repeat/adjust opportunities
- Owner Pulse and commercial policy inside the existing default Business Brain/source snapshot batch
- pack source-hash/expiry receipt with one conditional current-snapshot read before public-use actions
- honest review-request and owner-managed return-customer recipes without review manipulation, contact import, or direct send
- Local Presence Passport and protected local-language handoff without provider connection or automatic translation
- staff assignee/task metadata on the existing schedule document
- bounded result receipt metrics and deterministic one-variable learning on the existing campaign document
- bounded Pattern Cue with one current workspace-level example, raw-note non-persistence, original hook options, reel/UGC projection, and pattern-hash recheck without a new collection or overview read
- in-house Video Reel Studio with compact `videoProjects`, bounded variants/scenes/history/receipts, deterministic trust, version-bound approval, local Canvas/MediaRecorder rendering, owner image/audio input, three aspect ratios, and manual MP4/WebM download with zero provider calls

## Expansion Candidates

| Priority | Expansion | Why it matters | Activation gate |
| --- | --- | --- | --- |
| 1 | Provider adapters behind capability checks | Direct WhatsApp/Google work remains separate. Meta Ads MCP is validated only as a read-first reporting, activity-log, signal-health, and troubleshooting candidate; ad mutation stays blocked. | Dedicated server adapter, explicit owner/account selection, verified scopes/tool allowlist, runtime validation, tenant isolation, compact lazy summary, provider health, and manual export fallback. |
| 2 | Credit ledger and billing checkout | Paid generation, render, provider send, and ad workflows need visible cost before action. | Billing provider, reserve/capture/refund ledger, owner confirmation, and spend caps. |
| 3 | Media upload and thumbnail pipeline | Asset metadata is live; real uploads need signed upload, thumbnails, moderation, retention, and rights proof. | Storage deploy, upload UI, size/type guard, retention policy, and preview generation. |
| 4 | Rendered image templates | Restaurants and salons will want ready-to-post images, but template rendering must stay source-checked. | Asset rights checks, template registry, render cost estimate, and export fallback. |
| 5 | Hosted mini-page and QR route | The output pack now includes a mini-page/QR brief; public hosting needs its own approval, tracking, cache, and abuse controls. | Public route contract, noindex/index decision, QR/link tracking policy, owner approval, cache invalidation, and Firebase cost plan. |
| 6 | Durable cloud/server video rendering | Local in-house composition is live; server-rendered files or durable cloud re-download would add material infrastructure and media-retention risk. | Explicit separate approval, secure large-file upload/render worker, Storage retention, signed access, queue/retry caps, monitoring, and zero ambiguity with the current local renderer. |
| 7 | Google Business Profile connected publish | Manual Google drafts are live; connected publish can reduce work only for eligible locations. | OAuth, location capability detection, quota handling, post-type restrictions, and rollback-safe logs. |
| 8 | WhatsApp template/contact consent system | Manual WhatsApp copy is live; direct send requires consent, templates, preferences, pricing, and opt-out. | Contact minimization, opt-in proof, template status, pricing display, and user preference webhooks. |
| 9 | Agency client portal | Approval requests are live; agencies need client comments, reviewed variants, and client-visible history. | Client-scoped auth, comments, audit trail, no cross-client leakage, and notification controls. |
| 10 | Multi-location campaign variants | Location records and variant cues are live; larger groups need branch-specific approval and rollup reports. | Location roles, local source facts, partial approval, and provider/location capability mapping. |
| 11 | Imported outcome metrics | Compact manual results are live; imported clicks, replies, calls, bookings, and GBP metrics can improve learning. | Provider connections, confidence labels, summary writes, and no raw event scans. |
| 12 | Persistent multi-pack library | The current desk focuses on the latest pack review; owners and agencies may later need saved seasonal packs, variants, and reuse history. | Bounded list UX, explicit retention, archived-pack state, and no default realtime listener. |
| 13 | Vertical decision recipe expansion | The deterministic engine is live; deeper vertical recipes can improve recommendations without changing the authority model. | Recipe tests, owner-copy review, trust checks, bounded input requirements, and no model-owned decision path. |

Meta Ads MCP does not authorize provider work by itself. Revalidate the current Meta tool inventory, scopes, app-review requirements, pricing/quotas, and production terms before implementation. If read and write tools cannot be separated reliably, do not activate the connector.

## Non-Expansion Guardrail

Do not expand CampaignCue into a generic design editor, generic social scheduler, email/SMS blast platform, AI-avatar UGC factory, or ad autopilot. Those categories are crowded, expensive, and policy-heavy. CampaignCue should keep the wedge: source-backed local campaign packs with trust checks, export/download delivery, approvals, and confidence-labeled learning.

Pattern Cue does not change this boundary. Recurring creator-account monitoring, scraping, viral alerts, copied scripts, synthetic-customer output, and creator-marketplace operations remain rejected.

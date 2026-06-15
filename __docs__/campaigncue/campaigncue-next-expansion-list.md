# CampaignCue Next Expansion List

**Status:** Parking lot after the main gap-fix and delivery-boundary implementation passes.
**Rule:** Do not treat this file as active scope. Use it when CampaignCue's current export/download-first runtime, source facts, trust checks, structured packs, outcome capture, agency/location safety, and launch setup are stable.

## Implemented From Market Gap Pass

Daily Campaign Desk is no longer a parked expansion. It is implemented under [daily-campaign-desk](./daily-campaign-desk/README.md) as the owner-first first screen: deterministic Campaign Decision Engine recommendation, why-this evidence, Missing Input Inbox, ready-pack controls, twelve SMB recipes, first-class campaign pack review, structured manual delivery cards, local visibility cues, multi-format output list, print/photo tasks, asset reuse/CueLayers entry, and structured one-tap result memory. It adds no new overview read path.

Now implemented and not future scope:

- deterministic Campaign Decision Engine and auditable `CampaignCueDecision`
- first-class pack review derived from existing overview data
- compact `campaign.pack` metadata with selected `recipeId` and `decision`
- structured `handoffFields` and manual delivery cards
- canonical `CampaignCueOutputPack` and browser-local Campaign Pack ZIP download
- local visibility tab and `cue_local_visibility_refresh` opportunity
- compact `campaign.resultMemory` and repeat/adjust opportunities

## Expansion Candidates

| Priority | Expansion | Why it matters | Activation gate |
| --- | --- | --- | --- |
| 1 | Provider adapters behind capability checks | Direct WhatsApp, Google, Meta, and ad workflows can save owner time only after credentials, consent, quotas, and retry controls exist. | Dedicated adapter contracts, idempotency, provider health, and export fallback. |
| 2 | Credit ledger and billing checkout | Paid generation, render, provider send, and ad workflows need visible cost before action. | Billing provider, reserve/capture/refund ledger, owner confirmation, and spend caps. |
| 3 | Media upload and thumbnail pipeline | Asset metadata is live; real uploads need signed upload, thumbnails, moderation, retention, and rights proof. | Storage deploy, upload UI, size/type guard, retention policy, and preview generation. |
| 4 | Rendered image templates | Restaurants and salons will want ready-to-post images, but template rendering must stay source-checked. | Asset rights checks, template registry, render cost estimate, and export fallback. |
| 5 | Hosted mini-page and QR route | The output pack now includes a mini-page/QR brief; public hosting needs its own approval, tracking, cache, and abuse controls. | Public route contract, noindex/index decision, QR/link tracking policy, owner approval, cache invalidation, and Firebase cost plan. |
| 6 | Short-video render pipeline | Reel briefs are live; rendered MP4s require provider cost, likeness, subtitle, and storage controls. | Credit reservation, provider queue, consent policy, retry cap, and manual shoot fallback. |
| 7 | Google Business Profile connected publish | Manual Google drafts are live; connected publish can reduce work only for eligible locations. | OAuth, location capability detection, quota handling, post-type restrictions, and rollback-safe logs. |
| 8 | WhatsApp template/contact consent system | Manual WhatsApp copy is live; direct send requires consent, templates, preferences, pricing, and opt-out. | Contact minimization, opt-in proof, template status, pricing display, and user preference webhooks. |
| 9 | Agency client portal | Approval requests are live; agencies need client comments, reviewed variants, and client-visible history. | Client-scoped auth, comments, audit trail, no cross-client leakage, and notification controls. |
| 10 | Multi-location campaign variants | Location records and variant cues are live; larger groups need branch-specific approval and rollup reports. | Location roles, local source facts, partial approval, and provider/location capability mapping. |
| 11 | Imported outcome metrics | Compact manual results are live; imported clicks, replies, calls, bookings, and GBP metrics can improve learning. | Provider connections, confidence labels, summary writes, and no raw event scans. |
| 12 | Persistent multi-pack library | The current desk focuses on the latest pack review; owners and agencies may later need saved seasonal packs, variants, and reuse history. | Bounded list UX, explicit retention, archived-pack state, and no default realtime listener. |
| 13 | Vertical decision recipe expansion | The deterministic engine is live; deeper vertical recipes can improve recommendations without changing the authority model. | Recipe tests, owner-copy review, trust checks, bounded input requirements, and no model-owned decision path. |

## Non-Expansion Guardrail

Do not expand CampaignCue into a generic design editor, generic social scheduler, email/SMS blast platform, AI-avatar UGC factory, or ad autopilot. Those categories are crowded, expensive, and policy-heavy. CampaignCue should keep the wedge: source-backed local campaign packs with trust checks, export/download delivery, approvals, and confidence-labeled learning.

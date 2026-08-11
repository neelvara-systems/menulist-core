# CampaignCue Next Expansion List

**Status:** Backlog register after the main gap-fix and delivery-boundary implementation passes.
**Rule:** Do not use this file to claim that an earlier accepted capability is complete. The local export/download runtime is the current source truth, while media upload/thumbnails, fuller video generation, audio depth, collaborative review, durable render lifecycle, and video-result reuse remain original-decision parity gaps recorded in [Video Reel Studio validation](./video-reel-studio/video-reel-studio_validation.md). Provider integration and social/ad mutation remain separate rejected or separately gated scope.

## Implemented From Market Gap Pass

Daily Campaign Desk and Campaign Operating Loop are no longer parked expansions. They are implemented under [daily-campaign-desk](./daily-campaign-desk/README.md), [campaign-operating-loop](./campaign-operating-loop/README.md), and [vertical-campaign-playbooks](./vertical-campaign-playbooks/README.md): deterministic recommendations, Owner Pulse, commercial gates, twenty bounded SMB action recipes, Missing Input Inbox, freshness-aware packs, manual delivery/staff tasks, local presence, protected-language handoff, CueLayers reuse, and owner-reported result receipts. They add no new overview read path or collection.

[Campaign Inbox](./campaign-inbox/README.md) is also implemented. It provides a deterministic, review-first owner update surface on the existing sources route and source documents. It adds no collection, Storage object, listener, provider call, or default overview read.

[Campaign Memory 2.0](./campaign-memory/README.md) is implemented on the existing `analyticsSummaries/dashboard` document. It turns recipe-approved owner result receipts into bounded recipe/channel evidence with explicit confidence and adds no collection, listener, provider call, background job, overview read, or raw-event scan.

[Winning Pack Refresh](./winning-pack-refresh/README.md) is implemented on the existing safe-reuse create path. It rejects retired recipes, shows whether the recipe is recommended now, rebuilds from current truth, preserves bounded root/generation provenance, and adds no collection, Storage object, listener, provider call, or overview read.

[Vertical Campaign Playbooks](./vertical-campaign-playbooks/README.md) are implemented as a bundled registry over twenty bounded recipes. The registry adds catering, membership, back-in-stock, seasonal-maintenance, trial-session, and clinic-availability actions without adding Firebase operations or model-owned decisions.

[Hosted Offer Page and QR](./hosted-offer-page/README.md) is implemented as one explicit owner-published, noindex, expiring destination per Campaign Pack. It rechecks truth and approval, uses one cached public document, creates no visit writes, and generates the QR locally.

[Photo and Clip Missions](./photo-clip-missions/README.md) are implemented on the existing Asset Library and private upload path. Recipe tasks open camera/gallery capture, rights are explicit, durable visual readiness requires immutable Storage identity, and mission state adds no collection, listener, or completion write.

[Read-Only Result Evidence](./read-only-result-evidence/README.md) is implemented as an owner-copied compact report snapshot on the existing campaign document. It adds no provider connection, collection, Storage object, analytics-summary write, Campaign Memory input, or default read. Provider API import remains separately gated.

[Durable Cloud Export Archive](./durable-cloud-export-archive/README.md) is implemented as one current Campaign Pack ZIP pointer, one deterministic existing Asset Library record, and two rotating private Storage object names per campaign. Upload/download URLs are short-lived and runtime-only. CampaignCue Firebase deployment, exact bucket CORS, signed-URL IAM, authenticated QA, and physical-device evidence remain release gates.

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
- Campaign Inbox with local parsing, protected Business Details routing, an eight-candidate bound, one idempotent batch transaction, one snapshot update, and one aggregate event
- secure Photo/Clip Missions with one shared uploader, per-type size limits, bounded previews, explicit rights, and durable visual-readiness checks
- Campaign Memory 2.0 with recipe-bound outcomes, bounded owner-reported evidence, confidence labels, transactional summary updates, and no raw event scan
- Winning Pack Refresh with current-fit review, owner-entered seasonal context, current-truth reconstruction, template provenance, and bounded refresh ancestry
- Vertical Campaign Playbooks with twenty bounded recipes, protected evidence, and vertical claim boundaries
- Hosted Offer Page and QR with explicit publish/unpublish, current-truth gates, noindex expiry, cached reads, and browser-local QR generation
- owner-copied read-only result evidence with bounded metrics, date/scope labels, duplicate fingerprinting, metadata-only audit, and no attribution claim
- bounded current Campaign Pack cloud copy with browser hashes, Storage-validated CRC32C, owner-bound lease, generation preconditions, and generation-pinned re-download

## Committed Sequential Expansion Program

These workstreams are implemented one at a time. A later row is not complete merely because its contract appears here.

| Priority | Workstream | Current state | Governing boundary |
| --- | --- | --- | --- |
| 1 | Campaign Inbox | Implemented and locally verified; authenticated visual QA pending local account/session. | Review-first, no raw-draft persistence, no provider call. |
| 2 | Secure media capture and Photo/Clip Missions | Implemented and locally verified; authenticated real-device/QA evidence pending. | Owner-controlled media only, explicit rights, bounded upload and retention. |
| 3 | Campaign Memory 2.0 | Implemented and locally verified; authenticated owner-result QA pending. | Compact summary, recipe-bound confidence-labelled owner outcomes, no raw event scan. |
| 4 | Winning Pack Refresh | Implemented and locally verified; authenticated owner refresh QA pending. | Revalidate current facts and trust before reuse; never clone stale truth. |
| 5 | Vertical Campaign Playbooks | Implemented and locally verified; authenticated owner recommendation QA pending. | Deterministic recipes, bounded required inputs, no model-owned decision. |
| 6 | Hosted Offer Page and QR | Implemented and locally verified; authenticated publish/public-page QA pending configured CampaignCue runtime. | Owner approval, abuse controls, cache/expiry policy, no direct posting. |
| 7 | Campaign Experiment Coach | Implemented and locally verified; authenticated owner action QA pending. | One-variable owner-approved tests; no performance prediction. |
| 8 | Local Visibility Action Center | Implemented and locally verified; authenticated owner/mobile QA pending. | Evidence-backed manual actions from existing overview truth; no scraping, provider mutation, added collection, or added Firebase operation. |
| 9 | Approval and Comment Inbox | Implemented and locally verified; authenticated multi-role QA pending. | Current campaign thread, client/location/output scope, compact audit evidence, no cross-tenant access, comment collection, or overview read. |
| 10 | Multi-location Pack Variants | Implemented and locally verified; authenticated multi-role and branch freshness QA pending. | Existing location, campaign, trust, approval, export, and result records; combined global/branch freshness; no variant collection. |
| 11 | Optional read-only result connectors | Owner-copied report evidence implemented and locally verified; provider OAuth/API import remains disabled pending external account and operational evidence. | Read-only scopes, compact latest snapshot, no attribution, Campaign Memory isolation, and owner-result fallback. |
| 12 | Durable cloud export archive | Implemented and locally verified; Firebase deployment, CORS/IAM, authenticated QA, and device evidence pending. | One current pointer, one deterministic asset record, two rotating object names, explicit 25 MB cap, and signed access only at runtime. |

## Expansion Candidates

| Priority | Expansion | Why it matters | Activation gate |
| --- | --- | --- | --- |
| 1 | Provider adapters behind capability checks | Direct WhatsApp/Google work remains separate. Meta Ads MCP is validated only as a read-first reporting, activity-log, signal-health, and troubleshooting candidate; ad mutation stays blocked. | Dedicated server adapter, explicit owner/account selection, verified scopes/tool allowlist, runtime validation, tenant isolation, compact lazy summary, provider health, and manual export fallback. |
| 2 | Credit ledger and billing checkout | Paid generation, render, provider send, and ad workflows need visible cost before action. | Billing provider, reserve/capture/refund ledger, owner confirmation, and spend caps. |
| 3 | Advanced media lifecycle | Private source/preview upload is live. Checksum deduplication, automatic moderation, archive/delete UX, and measured extra thumbnail sizes remain intentionally absent. | Owner evidence, explicit retention/deletion contract, bounded processing cost, and no duplicate media pipeline. |
| 4 | Rendered image templates | Restaurants and salons will want ready-to-post images, but template rendering must stay source-checked. | Asset rights checks, template registry, render cost estimate, and export fallback. |
| 5 | Hosted mini-page and QR route | Implemented as the Hosted Offer Page with explicit owner publishing, no tracking, noindex expiry, and cached reads. | Revisit only if owner evidence justifies richer page fields; do not turn it into a generic page builder. |
| 6 | Durable cloud/server video rendering | Local in-house composition is live; server-rendered files or durable cloud re-download would add material infrastructure and media-retention risk. | Explicit separate approval, secure large-file upload/render worker, Storage retention, signed access, queue/retry caps, monitoring, and zero ambiguity with the current local renderer. |
| 7 | Google Business Profile connected publish | Manual Google drafts are live; connected publish can reduce work only for eligible locations. | OAuth, location capability detection, quota handling, post-type restrictions, and rollback-safe logs. |
| 8 | WhatsApp template/contact consent system | Manual WhatsApp copy is live; direct send requires consent, templates, preferences, pricing, and opt-out. | Contact minimization, opt-in proof, template status, pricing display, and user preference webhooks. |
| 9 | Agency client portal | Approval requests are live; agencies need client comments, reviewed variants, and client-visible history. | Client-scoped auth, comments, audit trail, no cross-client leakage, and notification controls. |
| 10 | Multi-location campaign variants | Implemented for bounded batches of up to eight branches with branch-specific truth, trust, approval, export, result memory, and local-manager scope. | Revisit only after evidence supports richer group rollups or provider/location capability mapping; do not add a parallel variant collection. |
| 11 | Imported outcome metrics | Compact manual results and owner-copied directional report evidence are live; authenticated provider import is not. | Provider-approved connection, server-only credentials, read allowlist, bounded quota/window, response validation, explicit confidence, owner confirmation, and no automatic attribution or raw event scan. |
| 12 | Persistent multi-pack library | The current desk focuses on the latest pack review; owners and agencies may later need saved seasonal packs, variants, and reuse history. | Bounded list UX, explicit retention, archived-pack state, and no default realtime listener. |
| 13 | Vertical decision recipe expansion | The deterministic engine is live; deeper vertical recipes can improve recommendations without changing the authority model. | Recipe tests, owner-copy review, trust checks, bounded input requirements, and no model-owned decision path. |

Meta Ads MCP does not authorize provider work by itself. Revalidate the current Meta tool inventory, scopes, app-review requirements, pricing/quotas, and production terms before implementation. If read and write tools cannot be separated reliably, do not activate the connector.

## Non-Expansion Guardrail

Do not expand CampaignCue into a generic design editor, generic social scheduler, email/SMS blast platform, AI-avatar UGC factory, or ad autopilot. Those categories are crowded, expensive, and policy-heavy. CampaignCue should keep the wedge: source-backed local campaign packs with trust checks, export/download delivery, approvals, and confidence-labeled learning.

Pattern Cue does not change this boundary. Recurring creator-account monitoring, scraping, viral alerts, copied scripts, synthetic-customer output, and creator-marketplace operations remain rejected.

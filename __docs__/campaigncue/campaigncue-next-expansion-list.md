# CampaignCue Next Expansion List

**Status:** Parking lot after the main gap-fix and delivery-boundary implementation passes.
**Rule:** Do not treat this file as active scope. Use it when CampaignCue's current export/download-first runtime, source facts, trust checks, structured packs, outcome capture, agency/location safety, and launch setup are stable.

## Expansion Candidates

| Priority | Expansion | Why it matters | Activation gate |
| --- | --- | --- | --- |
| 1 | Provider adapters behind capability checks | Direct WhatsApp, Google, Meta, and ad workflows can save owner time only after credentials, consent, quotas, and retry controls exist. | Dedicated adapter contracts, idempotency, provider health, and export fallback. |
| 2 | Credit ledger and billing checkout | Paid generation, render, provider send, and ad workflows need visible cost before action. | Billing provider, reserve/capture/refund ledger, owner confirmation, and spend caps. |
| 3 | Media upload and thumbnail pipeline | Asset metadata is live; real uploads need signed upload, thumbnails, moderation, retention, and rights proof. | Storage deploy, upload UI, size/type guard, retention policy, and preview generation. |
| 4 | Rendered image templates | Restaurants and salons will want ready-to-post images, but template rendering must stay source-checked. | Asset rights checks, template registry, render cost estimate, and export fallback. |
| 5 | Short-video render pipeline | Reel briefs are live; rendered MP4s require provider cost, likeness, subtitle, and storage controls. | Credit reservation, provider queue, consent policy, retry cap, and manual shoot fallback. |
| 6 | Google Business Profile connected publish | Manual Google drafts are live; connected publish can reduce work only for eligible locations. | OAuth, location capability detection, quota handling, post-type restrictions, and rollback-safe logs. |
| 7 | WhatsApp template/contact consent system | Manual WhatsApp copy is live; direct send requires consent, templates, preferences, pricing, and opt-out. | Contact minimization, opt-in proof, template status, pricing display, and user preference webhooks. |
| 8 | Agency client portal | Approval requests are live; agencies need client comments, reviewed variants, and client-visible history. | Client-scoped auth, comments, audit trail, no cross-client leakage, and notification controls. |
| 9 | Multi-location campaign variants | Location records and variant cues are live; larger groups need branch-specific approval and rollup reports. | Location roles, local source facts, partial approval, and provider/location capability mapping. |
| 10 | Imported outcome metrics | Manual results are live; imported clicks, replies, calls, bookings, and GBP metrics can improve learning. | Provider connections, confidence labels, summary writes, and no raw event scans. |

## Non-Expansion Guardrail

Do not expand CampaignCue into a generic design editor, generic social scheduler, email/SMS blast platform, AI-avatar UGC factory, or ad autopilot. Those categories are crowded, expensive, and policy-heavy. CampaignCue should keep the wedge: source-backed local campaign packs with trust checks, export/download delivery, approvals, and confidence-labeled learning.

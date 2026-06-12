# CampaignCue Product — Spec

## Executive Summary

CampaignCue is a separate product for local-business campaign execution. It turns real restaurant, salon, agency, and multi-location business data into ready-to-use campaign packs, then checks those packs for source accuracy, claims, consent, rights, billing, and publish readiness.

The product exists because SMB owners usually do not know what to post, what to promote, what format to choose, or how to keep offers accurate. CampaignCue starts from the business facts and gives a practical campaign cue.

## Current Runtime Boundary

The implemented runtime is export/download-first. It creates source-backed campaign packs, trust reports, schedule/manual-task records, approval requests, asset metadata, location records, read-only future provider posture, and dashboard summaries. Social account connection, direct provider publishing, WhatsApp direct send, paid generation, rendered video, billing checkout, provider metric import, and MenuList write-back remain disabled until a separate future provider layer is explicitly built.

## Scope

| In scope | Out of scope |
| --- | --- |
| Business profile and brand kit | Generic blank-canvas design tool |
| Restaurant and salon catalogs | MenuList menu editing |
| Campaign cues and packs | Answerlattice support answers |
| Static creatives, scripts, videos | Fake testimonials or fake review cards |
| WhatsApp, Google, ads, calendar outputs | Ranking, sales, ROI guarantees |
| Agency and multi-location workflows | Cross-client or cross-outlet data access |
| Credits, jobs, trust checks, export fallback | Hidden generation cost |

## Target Users

| User | Need |
| --- | --- |
| Restaurant owner | Promote real menu items, offers, public menu links, and local specials. |
| Salon owner | Fill booking slots, promote services, use safe before/after and claim wording. |
| Agency operator | Produce weekly packs, collect approvals, deliver reports across clients. |
| Multi-location manager | Create one master campaign with location-safe variants. |
| Staff/outlet user | Upload assets, record clips, approve local facts, mark manual posts done. |

## Product Loop

1. Add business data or source links.
2. CampaignCue shows what is worth promoting.
3. User creates a campaign pack.
4. Outputs are generated and grouped by channel.
5. Creative Trust Center checks facts, claims, source freshness, consent, and rights.
6. User exports, copies, schedules a manual task, hands off, or sends for approval.
7. Analytics records what was used and prepares the next cue.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Separate product identity | CampaignCue has its own docs, route/domain plan, flags, Firebase project-id boundary, and billing model. |
| Source-aware generation | Every generated output stores source references when source data was used. |
| MenuList connector | Read-only by default, scoped by workspace/store/tenant, source snapshots required. |
| Trust checks | Export, handoff, and manual-use actions are blocked when critical issues exist. |
| Export/download delivery | Download/export remains the active delivery path without social account connections. |
| Credit visibility | Every paid generation shows estimate before reservation. |
| Mobile owner workflows | Download WhatsApp-ready text, approve, upload asset, fix simple trust issue, and mark posted must work on mobile. |

## Competitive Validation

Generic creative tools already cover broad social creation. Canva, Adobe Express, Buffer, Hootsuite, Later, Meta Business Suite, Predis, and Creatify all cover parts of social creation, scheduling, captioning, ad generation, video, or UGC-style creative.

CampaignCue should not compete on raw generation volume or generic scheduling. It competes on local-business source truth, campaign cues, source snapshots, trust checks, WhatsApp/Google/local channel fit, owner approval, agency/multi-location boundaries, cost visibility, export/download delivery, and outcome learning.

| Market surface | Existing strength | CampaignCue wedge |
| --- | --- | --- |
| Canva/Adobe Express | Broad design, templates, captions, scheduling, image/video tools. | Campaigns start from source-backed restaurant/salon facts and trust checks. |
| Buffer/Hootsuite/Later/Meta Business Suite | Scheduling, captions, planning, inbox/reporting, platform-native publishing. | Calendar is campaign-state aware with manual tasks, approvals, trust, and source context. |
| Predis/Creatify/ad generators | Ad variants, video ads, URL-to-video, UGC-style creative, batch generation. | Practical local campaign packs with source, consent, rights, and channel guardrails. |
| Google/WhatsApp/Meta direct tools | Native account actions and platform-owned insights. | Multi-channel campaign pack, export/download delivery, and cross-channel learning. |
| Agencies/manual service | Human context and local judgment. | Repeatable source-backed workflow, approval logs, reports, and client/location isolation. |

See [campaigncue_founder-research-addendum.md](../campaigncue_founder-research-addendum.md) for current source links and product decisions.

## Research-Backed Product Bets

| Bet | Product implication |
| --- | --- |
| Source-backed cue generation is the wedge. | Business Brain, Source Integrations, Opportunity Engine, and Trust Center are core, not support modules. |
| Export/download is the first-class delivery path. | Every channel output must be useful without direct publishing credentials. |
| WhatsApp is consent-led. | Message generation, download/share, template/direct-send, opt-out, and pricing posture must be separate. |
| Google Local is useful but constrained. | Prepare manual Google-ready posts/offers/events/media; connected publish belongs in a separate future provider layer. |
| Ads need policy preflight before platform mutation. | Ads Studio must focus on safe handoff, spend approval, and destination checks. |
| UGC risk is high. | Scripts and creator briefs are safer than fake customer videos or synthetic testimonials. |
| Analytics must be confidence-labeled. | Reports distinguish observed, imported, manual, and estimated metrics. |
| Contact marketing needs dedicated compliance. | Email/SMS blasts are not default CampaignCue channels without separate consent and opt-out architecture. |

## Open Questions

| Question | Needed before implementation |
| --- | --- |
| Firebase deployment | Separate project ids, rules, indexes, storage rules, and deploy config now exist; actual Firebase project creation, deploy credentials, App Check, and deploy execution remain external setup. |
| Billing provider | Reuse shared product-aware billing adapter or create separate checkout surface. Billing is disabled in the current runtime. |
| Domain | `campaigncue.ai` is the production host target; DNS/domain purchase and Vercel mapping remain external setup. |
| Brand | Final visual identity, logo, and color system. |
| MenuList auth bridge | Whether MenuList users enter via product account switch or OAuth-like connector. |
| Product-domain auth | `campaigncue.ai/app` needs final sign-in routing/mapping before public launch. |

## Foundation Decisions

| Decision | Value |
| --- | --- |
| Product id | `campaigncue` |
| Local route | `/__campaigncue` |
| Internal route | `/sites/campaigncue` |
| Preview host | `campaigncue.menulist.online` |
| Production host | `campaigncue.ai` and `www.campaigncue.ai` |
| QA Firebase project id | `campaigncue-qa` |
| Production Firebase project id | `campaigncue` |
| Active flag | `ENABLE_CAMPAIGNCUE_PUBLIC_SITE` |
| Enabled runtime flags | App shell, source integrations, deterministic generation, analytics |
| Disabled runtime flags | Publishing, billing |

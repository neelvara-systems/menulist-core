# CampaignCue Product — Spec

## Executive Summary

CampaignCue is a separate product for local-business campaign execution. It turns real local-business data into a deterministic Campaign Decision Engine, daily campaign desk, ready-to-use campaign packs, safe optional editor changes, manual delivery cards, local visibility cues, and result memory, then checks those packs for source accuracy, claims, consent, rights, billing, and publish readiness.

The product exists because SMB owners usually do not know what to post, what to promote, what format to choose, or how to keep offers accurate. CampaignCue starts from the business facts and gives a practical campaign cue. It does not ask a model what the business should promote; the active recommendation authority is facts, recipes, timing, readiness, risk gates, owner effort, and compact result memory.

## Current Runtime Boundary

The implemented runtime is export/download-first. It creates source-backed campaign packs, first-class pack reviews, Campaign Proof Deck briefs, structured manual delivery cards, trust reports, local visibility cues, schedule/manual-task records, approval requests, asset metadata, location records, read-only future provider posture, compact result memory, and dashboard summaries. Social account connection, direct provider publishing, WhatsApp direct send, paid generation, rendered video, billing checkout, provider metric import, and MenuList write-back remain disabled until a separate future provider layer is explicitly built.

## Scope

| In scope | Out of scope |
| --- | --- |
| Business profile, brand kit, and Brand Playbook | Generic blank-canvas design tool |
| Restaurant, salon, retail, service, fitness, clinic, and generic local-business recipes | MenuList menu editing |
| Campaign cues and packs | Answerlattice support answers |
| Static creative briefs, proof decks, scripts, and video/UGC briefs | Fake testimonials or fake review cards |
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
2. Campaign Decision Engine ranks campaign recipes from facts, readiness, timing, trust risk, owner effort, repetition, and compact result memory.
3. Daily Campaign Desk shows what is worth promoting, why it is recommended, what is missing, and what pack will be prepared.
4. User creates or opens a campaign pack.
5. Outputs are generated and grouped by channel, with a Campaign Proof Deck brief when review/handoff needs a visual proof sheet.
6. Creative Trust Center checks facts, claims, source freshness, consent, and rights.
7. User reviews manual delivery cards for WhatsApp, Google/local, social creative, ad handoff, video/script, calendar, print, or staff use.
8. User exports, copies, follows manual delivery steps, schedules a manual task, hands off, or sends for approval.
9. Owner records what happened with a quick result option or note, and CampaignCue prepares the next cue from compact result memory.

## Requirements

| Requirement | Acceptance |
| --- | --- |
| Separate product identity | CampaignCue has its own docs, route/domain plan, flags, Firebase project-id boundary, and billing model. |
| Source-aware generation | Every generated output stores source references when source data was used. |
| Brand Playbook source | Saved audience, feel, references, visual motifs, focus, typography, and avoid list guide creative briefs, editor context, proof deck, template tags, and trust review. |
| MenuList connector | Read-only by default, scoped by workspace/store/tenant, source snapshots required. |
| Trust checks | Export, handoff, and manual-use actions are blocked when critical issues exist. |
| Export/download delivery | Download/export remains the active delivery path without social account connections. |
| Credit visibility | Every paid generation shows estimate before reservation. |
| Mobile owner workflows | Download WhatsApp-ready text, approve, upload asset, fix simple trust issue, and mark posted must work on mobile. |
| Local visibility | CampaignCue can prepare a Google/local visibility pack and checklist without connecting or posting to Google. |
| Result learning | CampaignCue stores compact useful/not-useful signals on the campaign so repeat/adjust recommendations do not require raw event scans. |
| Deterministic decision engine | Recommendation cards store an auditable decision object with recipe, confidence, score, facts used, missing inputs, explanations, recommended outputs, and trust preflight. AI can assist copy/editing later but does not decide the campaign. |

## Competitive Validation

Generic creative tools already cover broad social creation. Canva, Adobe Express, Buffer, Hootsuite, Later, Meta Business Suite, Predis, and Creatify all cover parts of social creation, scheduling, captioning, ad generation, video, or UGC-style creative.

CampaignCue should not compete on raw generation volume or generic scheduling. It competes on local-business source truth, campaign cues, source snapshots, trust checks, WhatsApp/Google/local channel fit, owner approval, agency/multi-location boundaries, cost visibility, export/download delivery, and outcome learning.

| Market surface | Existing strength | CampaignCue wedge |
| --- | --- | --- |
| Canva/Adobe Express | Broad design, templates, captions, scheduling, image/video tools. | Campaigns start from source-backed local-business facts, Daily Campaign Desk recommendations, trust checks, and manual delivery/result memory. |
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
| Product code | `CC` |
| Product slug | `campaigncue` |
| Local route | `/__campaigncue` |
| Internal route | `/sites/campaigncue` |
| Preview host | `campaigncue.menulist.online` |
| Production host | `campaigncue.ai` and `www.campaigncue.ai` |
| QA Firebase project id | `campaigncue-qa` |
| Production Firebase project id | `campaigncue` |
| Active flag | `ENABLE_CAMPAIGNCUE_PUBLIC_SITE` |
| Enabled runtime flags | App shell, source integrations, deterministic generation, analytics |
| Disabled runtime flags | Publishing, billing |

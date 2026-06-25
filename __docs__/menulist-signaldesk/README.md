# MenuList SignalDesk - Documentation Hub

**Project:** MenuList SignalDesk
**Status:** Internal workflow, internal team access management, connector settings, FHRS/FHIS UK source provider, Apify source broker, owned email sequencer queue, market pod planner, weekly strategist memo, provider evaluation shell, gated provider/source/AI/channel runtime, Content Distribution Rail runtime, Trust Partner Rail runtime, and solo-founder Operating Layer runtime implemented for internal testing; paid campaigns, paid external adapters, provider send, auto-publish, and Firebase deploy skipped
**Created:** June 23, 2026
**Last Updated:** June 25, 2026
**Owner:** Danny and MenuList marketing/growth team
**Audience:** Internal only

---

## What This Is

MenuList SignalDesk is the private growth control room for MenuList acquisition and distribution.

It should let Danny and the growth team observe, monitor, and approve while the system researches, dedupes, scores, prepares evidence, drafts controlled messages, routes replies, suppresses risk, and measures whether the prospect became a real MenuList outcome.

It is not a public product, not a MenuList owner/customer feature, not a generic CRM, and not an autonomous outbound machine.

## Source Inputs

| Source | Why it matters |
| --- | --- |
| [AI Lead Generation Automation transcript](../growth-engine/_archive/ai-lead-generation-automation-chatgpt-conversation-2026-06-23.md) | Original 164-message ChatGPT conversation. |
| [Private Internal Tool Review](../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md) | Corrected interpretation: private from-scratch internal tool for Danny and MenuList growth team. |
| [ChatGPT Review](../growth-engine/growth-engine_chatgpt-review-2026-06-23.md) | Full message map and source spec inventory. |
| [End-to-End Growth Research](../menulist-marketing-distribution/menulist-marketing-distribution_end-to-end-growth-research-2026-06-23.md) | Marketing, SEO, WhatsApp, email, source-policy, and Growth Engine alignment. |
| [Growth Engine legacy docs](../growth-engine/README.md) | Older planning material used only as source context, not as the final SignalDesk boundary. |

## Current Decision

Build SignalDesk as:

```txt
private MenuList growth control room
-> target registry and import
-> dedupe and source provenance
-> AI fit/current-list-gap/contactability scoring
-> evidence packets and decision snapshots
-> controlled templates and safe drafts
-> human approval
-> email/export first
-> inbox and reply classification
-> attribution to MenuList outcomes
-> demand signals from MenuList links, QR, shares, and claim attempts
-> founder observes, monitors, approves, pauses, or redirects
-> content source assets become approval-gated distribution drafts and queued calendar items
```

Do not start with:

- cold WhatsApp API automation
- cold Instagram/Messenger automation
- Google Maps scraping as system truth
- generic lead blasting
- campaign optimizer
- public website, public help docs, or public launch assets for SignalDesk

## Document Map

| Document | Purpose |
| --- | --- |
| [Feature Map](./menulist-signaldesk_feature-map.md) | Maps the 38 ChatGPT specs into SignalDesk feature modules and doc-generation order. |
| [Owner Control Model](./menulist-signaldesk_owner-control-model.md) | Defines the core POV: system runs MenuList distribution work while founder observes, monitors, approves, pauses, and redirects. |
| [Web Research Addendum](./menulist-signaldesk_web-research-addendum-2026-06-23.md) | Current external-source findings and adopted gates for sender health, Meta channels, Places providers, TCPA caution, and AI risk management. |
| [Solo Founder Investment Plan](./menulist-signaldesk_solo-founder-investment-plan-2026-06-23.md) | Web-researched plan for paid AI models, Apollo/Hunter/verification/search/crawl/sender providers, budgets, model routing, and solo-founder operating leverage. |
| [Market Practice Cross-Check](./menulist-signaldesk_market-practice-cross-check-2026-06-23.md) | Current cross-check of Clay/Apollo/waterfall enrichment/no-code/sequencer/deliverability market patterns and adopted SignalDesk plan changes. |
| [Architecture Readiness](./menulist-signaldesk_architecture-readiness.md) | Pre-implementation decision record for Firebase optimization, product separation, and code splitting. |
| [Implementation Validation](./menulist-signaldesk_validation.md) | Current runtime implementation evidence, checks run, and remaining blockers. |
| [ChatGPT Share Brief](./menulist-signaldesk_chatgpt-share-brief.md) | Single paste-ready context document for external AI review without losing SignalDesk's internal-only boundaries. |
| [ChatGPT Feedback Review](./menulist-signaldesk_chatgpt-feedback-review-2026-06-24.md) | Validates ChatGPT's response and adopts the solo-founder operating-layer backlog without widening send/provider/public scope. |
| [Growth Playbook Review](./menulist-signaldesk_growth-playbook-review-2026-06-24.md) | Validates AI-startup and founder-distribution lessons against MenuList, adopts the activation-proof loop, records first-pod defaults, and rejects unsafe automations. |
| [Founder Distribution Research](./menulist-signaldesk_founder-distribution-research-2026-06-24.md) | Cross-checks founder/community workflows, fast-growth startup patterns, restaurant/SMB signals, and platform safety policies to define what MenuList should automate next. |
| [MenuList Activation Concierge](../menulist-activation-concierge/README.md) | Separate MenuList-side doc set for upload, preview, publish, two-surface activation, proof eligibility, and the SignalDesk outcome-observer boundary. |
| [SignalDesk Foundation](./signaldesk-foundation/README.md) | First per-feature doc set for access, roles, audit, and kill switches. |
| [Target Registry](./signaldesk-target-registry/README.md) | Target, source candidate, contact identity, and import workflow doc set. |
| [Source Policy](./signaldesk-source-policy/README.md) | Source rights, provenance, retention, and allowed-use doc set. |
| [AI Intelligence](./signaldesk-ai-intelligence/README.md) | Fit, current-list gap, contactability, and eval doc set. |
| [Evidence Packets](./signaldesk-evidence-packets/README.md) | Evidence, rejected facts, confidence, and decision snapshot doc set. |
| [Draft Control](./signaldesk-draft-control/README.md) | Templates, approved variables, safe drafts, and message guardrails doc set. |
| [Approval Queue](./signaldesk-approval-queue/README.md) | Human review, approval states, and audit doc set. |
| [Email Rail](./signaldesk-email-rail/README.md) | Email/export, sender readiness, unsubscribe, bounce, and complaint doc set. |
| [Owned Email Sequencer](./signaldesk-email-rail/signaldesk-email-rail_owned-sequencer.md) | Self-owned low-volume sequencer queue and Smartlead fallback boundary. |
| [Connector Settings](./menulist-signaldesk_connector-settings.md) | Internal email, Meta channel, and Smartlead fallback metadata without storing raw secrets. |
| [FHRS/FHIS Source Provider](./menulist-signaldesk_fhrs-fhis-source-provider.md) | Official UK food-business establishment seed for source/evidence use only; no contact permission or public rating feature. |
| [Apify Source Broker](./menulist-signaldesk_apify-source-broker.md) | Gated Apify source discovery/evidence connector with env-controlled Actor ID, provider budget, and no raw payload storage. |
| [Inbox](./signaldesk-inbox/README.md) | Unified inbox, reply classifier, suppression, and operator work-item doc set. |
| [Outcome Bridge](./signaldesk-outcome-bridge/README.md) | Route tokens, MenuList outcomes, and attribution doc set. |
| [Demand Signals](./signaldesk-demand-signals/README.md) | QR/link/share/claim/referral demand signal doc set. |
| [Control Room](./signaldesk-control-room/README.md) | Channel health, cost, incidents, kill switches, and summaries doc set. |
| [Content Distribution Rail](./signaldesk-content-distribution-rail/README.md) | Owned proof assets, platform-ready drafts, approvals, calendar queue, and manual performance capture. |
| [Trust Partner Rail](./signaldesk-trust-partner-rail/README.md) | Partner/creator trust-channel testing, lean briefs, deal tracking, deliverables, and renewal decisions. |
| [Operating Layer](./signaldesk-operating-layer/README.md) | Daily Growth Mission, experiment cards, offer CTA OS, reply playbooks, source quality learning, and 7-day trial controls. |
| [Specification](./menulist-signaldesk_spec.md) | Business/product requirements for the internal project. |
| [Implementation Plan](./menulist-signaldesk_impl.md) | Technical blueprint, architecture, module order, and reserved file layout. |
| [Firebase Cost Plan](./menulist-signaldesk_firebase.md) | Separate Firebase posture, collections, cost controls, and dashboard read strategy. |
| [Compliance Policy](./menulist-signaldesk_compliance.md) | Source, channel, consent, suppression, privacy, and no-blast rules. |
| [Owner Control Runbook](./menulist-signaldesk_operator-runbook.md) | Daily/weekly observe, monitor, approve, pause, and redirect workflow for the founder and growth team. |
| [Mobile Support](./menulist-signaldesk_mobile-support.md) | Mobile admission decision: emergency controls and read-only summaries only. |
| [Test Cases](./menulist-signaldesk_test-cases.md) | Product, security, compliance, cost, AI, channel, and attribution test matrix. |
| [Action Register](./menulist-signaldesk_action-register.md) | Live tracker for documentation and implementation preparation. |
| [Decision Log](./menulist-signaldesk_decision-log.md) | Durable decisions, assumptions, and boundaries. |
| [_archive/](./_archive/) | Historical notes, superseded docs, and raw review artifacts. |

## Internal Doc Set Rule

The normal MenuList feature doc set includes public website and help documentation. SignalDesk is internal-only, so this folder intentionally uses a private-tool doc set:

| Standard doc | SignalDesk replacement |
| --- | --- |
| `_website.md` | Not created. No public SignalDesk page is allowed. |
| `_helpdoc.md` | Replaced by the internal owner-control runbook. |
| `_marketing.md` | Not created for public sales. Internal positioning lives in `_spec.md` and the owner-control docs. |
| `_firebase.md` | Kept. Cost and retention are critical. |
| `_mobile-support.md` | Kept. Emergency controls only. |
| `_test-cases.md` | Kept. Safety/compliance test coverage is required. |
| `_compliance.md` | Added. Internal outreach/source policy needs its own doc. |

## Feature Modules

The project should be documented and built in this order:

| Order | Module | Status |
| ---: | --- | --- |
| 1 | Foundation, access, roles, audit | Initial feature doc set created |
| 2 | Target registry and import | Initial feature doc set created |
| 3 | Dedupe and source provenance | Initial feature doc set created |
| 4 | AI fit and current-list intelligence | Initial feature doc set created |
| 5 | Evidence packet and decision snapshot | Initial feature doc set created |
| 6 | Templates, safe drafts, and guardrails | Initial feature doc set created |
| 7 | Human approval queue | Initial feature doc set created |
| 8 | Email/export rail | Initial feature doc set created |
| 9 | Inbox and reply classification | Initial feature doc set created |
| 10 | MenuList outcome bridge and attribution | Initial feature doc set created |
| 11 | Demand signals and QR/link flywheel | Initial feature doc set created |
| 12 | Channel health, cost, and safety dashboard | Initial feature doc set created |
| 13 | Content distribution rail | Runtime implemented for internal testing; auto-publish remains blocked |
| 14 | Trust partner and creator rail | Runtime implemented for internal testing; real deals remain budget and owner approval gated |
| 15 | Solo-founder operating layer | Runtime implemented for internal testing; provider send, paid campaigns, public pages, and auto-publish remain blocked |
| 16 | Growth playbook operating doctrine | Review doc created; adopt activation-proof loop and first-pod defaults before adding more automation |
| 17 | Founder distribution research doctrine | Research doc created; prioritize Activation Concierge, proof assets, demand listening, and objection learning over send/provider expansion |

Reserved or owner-gated modules:

- assisted WhatsApp, Instagram, and Messenger routing: implemented as gated handoff/provider-send plumbing
- Apify source broker: implemented as gated discovery/evidence connector, not a scrape-and-send path
- trust partner rail: internal partner profile, niche test, deal, brief, deliverable, metrics, renewal, and pause-scope runtime implemented; real partner spend remains budget and owner approval gated
- content distribution rail: internal owned-proof source, asset, draft, approval, calendar, and performance runtime implemented; auto-publish remains out of scope
- Meta paid intent
- campaign experiments
- local cluster expansion
- AI optimizer
- solo-founder operating layer: Daily Growth Mission, Offer and CTA OS, Reply-to-Conversion Assistant, Experiment Cards, and Source Quality Learning are implemented as private runtime records and `/signaldesk/mission`; self-serve owner route, referral loop, and public MenuList marketing surfaces remain separate MenuList-side work

## Architecture Summary

```txt
Approved sources
  -> Source run/import
  -> Candidate target
  -> Dedupe/provenance
  -> AI scoring + evidence packet
  -> Approval packet
  -> Founder/growth review only when needed
  -> Approved channel action
  -> Inbox/reply classification
  -> MenuList outcome bridge
  -> Attribution and summaries
  -> Learning/demand signals
  -> Content distribution drafts and calendar queue
  -> Trust partner tests and renewal decisions
```

## Naming

| Concept | Value |
| --- | --- |
| Human name | MenuList SignalDesk |
| Folder | `__docs__/menulist-signaldesk/` |
| Runtime slug | `signaldesk` |
| Product code | `SD` via `PRODUCT_IDS.SIGNALDESK` |
| Runtime location | Product-isolated module inside this monorepo first; extraction-ready boundaries |
| Reserved repo/package shorthand | `menulist-signaldesk` |
| Public name | None. Internal only. |
| Environment variable prefix | `MENULIST_SIGNALDESK_*`, not shorthand. |

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 0.1 | 2026-06-23 | Created initial internal project doc set and feature map. |
| 0.2 | 2026-06-23 | Completed first-pass feature-by-feature doc sets for all 12 SignalDesk build modules. |
| 0.3 | 2026-06-23 | Added pre-implementation architecture readiness decision for Firebase optimization and product-isolated code splitting. |
| 0.4 | 2026-06-23 | Implemented the protected SignalDesk foundation shell, summary API, kill-switch API, dedicated Firebase config/rules/indexes/storage rules, and functions skeleton. |
| 0.5 | 2026-06-23 | Implemented the first-build internal workflow: source policy, manual import, dedupe/provenance, rules-based scoring, evidence packets, drafts, approvals, email export, manual inbox replies, outcomes, demand signals, workspace reads, and audit. |
| 0.6 | 2026-06-23 | Cross-check hardened Firebase config gating, validation logging, source-policy contact use, evidence/draft gates, export readiness, public-surface isolation, and validation evidence. |
| 0.7 | 2026-06-23 | Implemented gated source-provider runs, real Gemini AI assist, signed provider webhooks, assisted WhatsApp/Instagram/Messenger handoff, and provider-send plumbing while keeping paid campaigns and Firebase deploy skipped. |
| 0.8 | 2026-06-23 | Added owner-control doctrine: SignalDesk should market and distribute MenuList with the founder mainly observing, monitoring, approving, pausing, or redirecting. |
| 0.9 | 2026-06-23 | Added web-research-backed gates for sender readiness, Meta messaging windows, Places source retention, TCPA caution, AI risk monitoring, and owner approval packets. |
| 1.0 | 2026-06-23 | Added solo-founder investment plan for paid AI/provider strategy, Apollo usage boundaries, model routing, enrichment broker, budget tiers, and next build slices. |
| 1.1 | 2026-06-23 | Added market-practice cross-check and updated the plan with enrichment waterfalls, audience/signal segments, prior-outcome spend guards, sequencer handoff evaluation, sender-domain risk, evidence-bound personalization, run timelines, and self-service proof CTAs. |
| 1.2 | 2026-06-23 | Completed owner-operator page/workflow audit and hardened source-use policy controls, provider-policy selection, scoped pauses, inbox channel capture, webhook suppression identity, provider approvals, and long-text UI resilience. |
| 1.3 | 2026-06-23 | Implemented the self-owned `owned-email` sequencer queue before Smartlead integration, with sender-domain readiness, owned step ledger, campaign pause, provider-send gate, and Channels UI controls. |
| 1.4 | 2026-06-23 | Added SignalDesk Settings for email SMTP, Meta WhatsApp, Meta Instagram, Meta Messenger, and Smartlead fallback connector metadata with env-derived readiness and no raw secret storage. |
| 1.5 | 2026-06-23 | Implemented the Apify Source Broker with env-controlled Actor execution, connector readiness, provider/budget approval, source-policy enforcement, normalized target imports, webhook event logging, and no raw payload storage. |
| 1.6 | 2026-06-23 | Completed a from-scratch docs/code parity cross-check, fixed the Settings workspace API allowlist, removed duplicate action-register IDs, and refreshed the feature map to match the implemented gated runtime. |
| 1.7 | 2026-06-24 | Added repeatable `verify:signaldesk` runtime parity audit for solo-owner operation, private routing, provider-send gating, Firebase separation, and public-surface isolation. |
| 1.8 | 2026-06-24 | Added Trust Partner Rail planning docs from the X article review, with B2B trust-channel adaptation, disclosure gates, flat-fee deal tracking, and runtime flag disabled. |
| 1.9 | 2026-06-24 | Implemented rules-based market pod recommendations, weekly strategist memos, channel-window/source-retention records, provider evaluation shell, Partners read route, and verifier/rules coverage while keeping paid adapters skipped. |
| 2.0 | 2026-06-24 | Implemented Content Distribution Rail runtime for owned proof assets, channel draft generation, owner approval, calendar queue, performance capture, content pause scope, rules/indexes, verifier coverage, and dedicated docs; no auto-publish added. |
| 2.1 | 2026-06-24 | Added a paste-ready ChatGPT Share Brief for external AI review of SignalDesk while preserving internal-only scope, skipped items, and current runtime truth. |
| 2.2 | 2026-06-24 | Reviewed ChatGPT's feedback and adopted the solo-founder operating-layer backlog while keeping provider send, paid campaigns, public SignalDesk pages, and auto-publish blocked. |
| 2.3 | 2026-06-24 | Implemented the solo-founder Operating Layer runtime with `/signaldesk/mission`, Daily Growth Mission records, experiment cards, offer CTAs, reply playbooks, source quality snapshots, rules/indexes, verifier coverage, and dedicated docs. |
| 2.4 | 2026-06-24 | Added growth-playbook review: adopt activation-proof loop, record recommended first pod/CTA/proof defaults, keep unsafe channel automations rejected, and keep Activation Concierge as MenuList-side work. |
| 2.5 | 2026-06-24 | Added founder-distribution deep research across startup growth cases, founder communities, restaurant/SMB signals, and platform policies; confirmed Activation Concierge and proof automation as the next MenuList-side build before more outbound automation. |
| 2.6 | 2026-06-24 | Created the separate MenuList Activation Concierge doc set and preserved SignalDesk as outcome observer only, with no MenuList truth writes or send/provider expansion. |
| 2.7 | 2026-06-25 | Added SignalDesk-only internal team access management in Settings: founder admins can add/update/deactivate members by login email, assign SignalDesk roles, preserve private auth gating, and audit membership changes. |
| 2.8 | 2026-06-25 | Added the FHRS/FHIS UK source provider as an official establishment seed for source/evidence use only, with source policy, provider account, provider budget, retention, verifier, and E2E coverage; no contact permission, public rating feature, or send enablement added. |

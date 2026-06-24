# MenuList SignalDesk - Feature Map

**Status:** Runtime-aligned feature inventory
**Created:** June 23, 2026
**Source:** 164-message ChatGPT transcript plus corrected private internal-tool review.

## Purpose

The ChatGPT conversation contains 38 specs. SignalDesk should not implement those specs one by one in transcript order. The corrected review explicitly says the transcript is useful architecture inventory, but build order must be pruned and should start with the acquisition spine.

Source evidence:

- Correct private-tool boundary: `../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:15`
- Do not build as autonomous outbound machine: `../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:19`
- Correct build spine: `../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:207`
- Spec 1-38 re-ranking: `../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:239`
- Original spec inventory: `../growth-engine/growth-engine_chatgpt-review-2026-06-23.md:448`

## Feature Doc Generation Policy

Each module below uses a focused internal doc set under this folder:

```txt
__docs__/menulist-signaldesk/[module-slug]/
├── README.md
├── [module-slug]_spec.md
├── [module-slug]_impl.md
├── [module-slug]_firebase.md
├── [module-slug]_compliance.md
├── [module-slug]_mobile-support.md
└── [module-slug]_test-cases.md
```

No module gets `_website.md` or public `_helpdoc.md` unless the project boundary changes.

## Module Map

| Priority | Module | Source specs | Decision | Doc-set status |
| --- | --- | --- | --- | --- |
| P0 | Foundation, access, roles, audit | Spec 1, 26, 28, 30 | First build. Required because the tool handles PII, send decisions, source policy, and audit trails. | Runtime implemented; doc set created |
| P0 | North-star metrics and activation definitions | Spec 2, 22, 32, 33, 35 | Measure MenuList outcomes, not sends. North star is activated businesses with current list live on two surfaces. | Implemented through outcome summaries, demand signals, control-room metrics, and self-service CTAs |
| P0 | Target registry and import | Spec 3, 4 | Manual import plus gated source-provider import. Must split target, source candidate, contact, channel identity, conversation, outcome. | Runtime implemented; doc set created |
| P0 | Dedupe and source provenance | Spec 3, 4, 23, 29 | Prevent duplicate outreach and bad evidence. Every field needs source, allowed use, retention, and expiry. | Runtime implemented; doc set created |
| P0 | AI fit and current-list intelligence | Spec 5, 36 | First useful AI layer: current-list gap, category fit, contactability, source confidence. AI never owns compliance. | Runtime implemented with rules scoring and gated Gemini assist; doc set created |
| P0 | Evidence packet and decision snapshot | Spec 5, 27, 29, 30 | Every action needs evidence, rejected facts, confidence, prompt/rule versions, and next action. | Runtime implemented; doc set created |
| P0 | Templates, safe drafts, and guardrails | Spec 10, 11, 12 | AI drafts inside approved copy rails. No invented facts, no unsupported claims, no policy bypass. | Runtime implemented; doc set created |
| P0 | Human approval queue | Spec 13, 23, 26 | Required before any send or risky action. Keeps the system human-controlled. | Runtime implemented; doc set created |
| P0 | Email/export rail | Spec 13, 19, 23, 24 | First controllable outbound rail. Requires sender domain, unsubscribe, suppression, bounce/complaint handling. Provider send remains gated. | Export and owned sequencer queue implemented; real send gated |
| P0 | Unified inbox and reply classifier | Spec 14, 15, 16, 17 | Needed once replies arrive. Classify interested, DNC, unsubscribe, wrong contact, pricing, objection, human review. | Runtime implemented for manual and signed provider webhook intake; doc set created |
| P0 | MenuList outcome bridge and attribution | Spec 9, 22, 32, 35 | Rename onboarding router to outcome/link bridge. SignalDesk must not own MenuList onboarding or truth. | Runtime implemented as manual outcome capture and summaries; doc set created |
| P0 | Demand signal capture | Spec 32, 33, 34, 35 | Warmer than cold outreach. Use MenuList-controlled surfaces, links, QR, shares, and claim attempts. | Runtime implemented as bounded internal capture; doc set created |
| P0 | Channel health, cost, safety dashboard | Spec 23, 24, 27, 29 | Keeps growth from becoming expensive or reputation-damaging noise. Summary docs only. | Runtime implemented; doc set created |
| P1 | Assisted WhatsApp | Spec 6, 7, 8, 13, 23 | Use owner-initiated, consented, ad-click, or founder-led contexts. No cold WhatsApp. | Gated handoff plumbing implemented; direct provider send remains disabled |
| P1 | Instagram/Messenger response routing | Spec 6, 7, 8, 14, 15, 37 | Inbox/response channel first, not mass cold-DM automation. | Gated webhook and handoff plumbing implemented; cold DM automation remains blocked |
| P1 | Meta paid intent | Spec 37 | Requires production CTA/tracking and proof assets. Click-to-message is warm demand. | Gated |
| P1 | Follow-up and retargeting | Spec 18, 19 | Recommend-only until data proves timing and suppression rules. | Owned email sequencer queue implemented; automated provider send remains gated |
| P1 | Content distribution rail | Distribution.ai review plus demand-signal/outcome specs | Repurpose approved MenuList proof into channel-ready drafts, queue a calendar, and capture performance without auto-publishing. | Runtime implemented for internal testing; auto-publish remains blocked |
| P1 | Trust partner rail | External X article, demand-signal and outcome specs | Test restaurant-owner trust channels with 3-5 partner/creator attempts, lean briefs, flat-fee deals, deliverable tracking, and renewal/cut decisions. | Runtime implemented for internal testing; real spend remains budget/owner gated |
| P1 | Daily Growth Mission | ChatGPT feedback review, owner-control doctrine | Convert dashboards into a ranked daily owner decision queue with at most five actions. | Runtime implemented through Operating Layer docs and `/signaldesk/mission` |
| P1 | Offer and CTA OS | ChatGPT feedback review, self-service CTA model | Define what SignalDesk asks a restaurant owner to do and match offers to segment, proof, and objection state. | Runtime implemented through Operating Layer `signaldeskOfferCtas` |
| P1 | Reply-to-Conversion Assistant | ChatGPT feedback review, inbox module | Turn reply classifications into approved playbooks with route/CTA attachment and suppression-safe edge-case approval. | Runtime implemented as approved reply playbooks; replies remain manual/approval controlled |
| P1 | Experiment cards | ChatGPT feedback review, campaign-builder gate | Controlled test cards with hypothesis, pod, source, CTA, proof, stop rule, result, and repeat/narrow/stop decision. | Runtime implemented through Operating Layer experiment cards |
| P1 | Source quality learning | ChatGPT feedback review, source-policy and outcome specs | Score sources by activation quality, not raw lead volume. | Runtime implemented through Operating Layer source quality snapshots |
| P1 | Campaign builder and experiments | Spec 20, 21 | Requires one working channel and one working pod. Avoid early campaign complexity. | Gated |
| P2 | Local cluster expansion | Spec 38 | Requires one proven locality/category. | Reserved |
| P2 | AI campaign optimizer | Spec 25 | Needs historical data, evals, channel health, and attribution. | Reserved |

## ChatGPT Feedback Adoption - June 24, 2026

The external feedback after the share brief is adopted as an operating-layer roadmap, not as proof that SignalDesk is production-ready.

| Feedback theme | Decision | Notes |
| --- | --- | --- |
| Operate one narrow pod before expanding | Adopt | Run a 7-day operating trial before adding send automation or more source connectors. |
| Daily Growth Mission | Adopt | Next UI/runtime should compress work into a small owner decision queue. |
| Market Pod Decision Engine | Adopt as upgrade | Current market pod recommender exists; next version should rank pod choices and stop rules. |
| Offer and CTA OS | Adopt | Current self-service CTA records need a fuller offer/segment/proof fit model. |
| Self-Serve Proof Funnel Bridge | Adopt with MenuList boundary | SignalDesk routes and tracks; MenuList owns claim/upload/preview/approval/publish truth. |
| Reply-to-Conversion Assistant | Adopt | Current inbox classification needs approved conversion playbooks. |
| Public MenuList marketing surfaces | Partial | Valid for MenuList website/acquisition docs, but still no public SignalDesk pages. |
| Owned sender system | Partial | Sender readiness exists; actual send still blocked until caps, unsubscribe, bounce, complaint, and suppression sync are complete. |
| Partner self-serve kit | Defer | First prove internal Trust Partner Rail and attribution before any partner-facing portal. |
| More providers and automation | Reject for now | No additional adapters, provider send, auto-publish, or paid campaigns until one pod proves activation. |

## Growth Playbook Review - June 24, 2026

The AI-startup and founder-distribution review is adopted as operating doctrine, not as a request for more SignalDesk runtime features.

| Review theme | Decision | Notes |
| --- | --- | --- |
| Lovable/Bolt/Gamma-style speed | Adopt the artifact loop only | MenuList should copy fast first value and shareable proof, not generic viral launch behavior. |
| Activation-proof loop | Adopt | Menu problem found -> current menu preview -> owner approval -> live on two surfaces -> proof asset -> next pod/target/partner. |
| First pod hypothesis | Recommended default, not final | Bengaluru, Indiranagar + Koramangala, cafes/dessert shops/QSR/cloud-kitchen-facing storefronts, founder email/manual export first. |
| First CTA hypothesis | Recommended default, not final | One current official menu link for QR, WhatsApp, Google/Profile, Instagram, and repeat customers, reviewed before publishing. |
| Activation Concierge | Adopt as MenuList-side backlog | SignalDesk can route and observe; MenuList owns upload, parse, preview, approval, publish, QR, WhatsApp copy, Google/Profile checklist, and two-surface activation truth. |
| Demand Listener | Adopt only under policy | Source-policy-gated listening and manual reply drafts are valid; no Reddit/X/LinkedIn auto-replies or scraping. |
| Proof Asset Generator | Adopt after proof exists | Use approved MenuList proof assets in Content Distribution Rail; no auto-publish. |
| Trust partner motion | Adopt narrowly | Test restaurant consultants, menu/food photographers, local agency operators, and POS/payment freelancers before any broad influencer motion. |
| Channel automation | Reject for now | Cold WhatsApp, cold Meta DMs, Reddit auto-replies, X bulk replies, LinkedIn automation, provider send, and paid campaign automation remain blocked. |

## Build Slice 1

The first build slice should prove:

```txt
Can the team identify the right business target,
explain the MenuList-specific opportunity,
draft a safe message,
send or manually route it,
capture the reply,
and measure whether it became a real MenuList outcome?
```

Included in build slice 1:

1. Team auth, roles, and audit.
2. Target registry and CSV/manual import.
3. Dedupe and source provenance.
4. AI fit/current-list gap/contactability scoring.
5. Evidence packet and decision snapshot.
6. Safe template and draft assistant.
7. Human approval queue.
8. Email/export rail.
9. Reply capture/manual inbox.
10. Basic attribution to MenuList outcomes.

Still excluded from the implemented slice:

- cold WhatsApp API send
- Instagram/Messenger cold automation
- campaign optimizer
- external paid-provider adapters except gated Google Places and Apify source discovery
- paid Meta webhooks
- local cluster planner
- public pages

## Feature Documentation Backlog

| Order | Folder slug | Doc set to create next |
| ---: | --- | --- |
| 1 | `signaldesk-foundation` | Runtime implemented; doc set created for access, roles, audit, kill switches, and admin-only boundary. |
| 2 | `signaldesk-target-registry` | Runtime implemented; doc set created for target/source/contact/conversation/outcome objects. |
| 3 | `signaldesk-source-policy` | Runtime implemented; doc set created for source rights, field storage, expiry, and source run rules. |
| 4 | `signaldesk-ai-intelligence` | Runtime implemented; doc set created for fit/gap/contactability scoring, prompt contracts, and evals. |
| 5 | `signaldesk-evidence-packets` | Runtime implemented; doc set created for evidence, rejected facts, confidence, and decision snapshots. |
| 6 | `signaldesk-draft-control` | Runtime implemented; doc set created for templates, approved variables, message safety, and AI drafts. |
| 7 | `signaldesk-approval-queue` | Runtime implemented; doc set created for human review, approval states, and audit events. |
| 8 | `signaldesk-email-rail` | Export and owned queue runtime implemented; doc set created for sender domain, unsubscribe, bounce, complaint, and send/export handling. |
| 9 | `signaldesk-inbox` | Runtime implemented; doc set created for conversation model, reply classifier, suppression, and operator states. |
| 10 | `signaldesk-outcome-bridge` | Runtime implemented; doc set created for MenuList route tokens, outcomes, attribution, and boundary enforcement. |
| 11 | `signaldesk-demand-signals` | Runtime implemented; doc set created for QR/link/share/claim/referral demand signal capture. |
| 12 | `signaldesk-control-room` | Runtime implemented; doc set created for channel health, cost summaries, incidents, and safety dashboard. |
| 13 | `signaldesk-content-distribution-rail` | Runtime implemented for owned proof sources, content assets, channel drafts, owner review, queued calendar items, and compact performance records. |
| 14 | `signaldesk-trust-partner-rail` | Runtime implemented for partner/creator trust-channel tests, lean briefs, deliverables, disclosure gates, compact metrics, and renewal decisions. |
| 15 | `signaldesk-operating-layer` | Runtime implemented for Daily Growth Mission, offer CTAs, reply playbooks, experiment cards, and source quality snapshots. |
| 16 | `signaldesk-self-serve-proof-funnel-bridge` | Adopted cross-product design backlog; SignalDesk routes/tracks, MenuList owns activation truth. |
| 17 | `signaldesk-objection-pricing-intelligence` | Deferred until real replies create useful objection frequency and conversion data. |
| 18 | `menulist-activation-concierge` | Adopted MenuList-side activation-support backlog for upload, parse, preview, owner approval, publish, QR, WhatsApp, Google/Profile, staff-share, and two-surface checklist outputs. |
| 19 | `signaldesk-demand-listener` | Adopted only as a future source-policy-gated opportunity digest; no auto-replies, scraping, or bulk social activity. |
| 20 | `signaldesk-proof-asset-generator` | Adopted only after approved MenuList proof exists; output feeds approval-gated content drafts. |

## Open Documentation Questions

| Question | Default |
| --- | --- |
| Separate repo or same repo? | Implemented in this monorepo as a product-isolated module; keep extraction-ready boundaries. |
| Firebase project IDs | Proposed in Firebase doc; not reserved or created. |
| First market pod | Founder must choose city, vertical, contact path, and sender identity. |
| First outbound channel | Email/export first. WhatsApp assisted remains gated. |
| Public docs | None. Internal project only. |

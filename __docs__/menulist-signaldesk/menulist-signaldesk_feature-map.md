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

Each module below should later receive a focused internal doc set under this folder:

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
| P1 | Meta paid intent | Spec 37 | Use after production CTA/tracking and proof assets exist. Click-to-message is warm demand. | Later |
| P1 | Follow-up and retargeting | Spec 18, 19 | Recommend-only until data proves timing and suppression rules. | Owned email sequencer queue implemented; automated provider send remains gated |
| P1 | Campaign builder and experiments | Spec 20, 21 | Do after one channel and one pod work. Avoid early campaign complexity. | Later |
| P2 | Local cluster expansion | Spec 38 | Useful once one locality/category proves. | Later |
| P2 | AI campaign optimizer | Spec 25 | Needs historical data, evals, channel health, and attribution. | Later |

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

## Open Documentation Questions

| Question | Default |
| --- | --- |
| Separate repo or same repo later? | Implemented in this monorepo as a product-isolated module; keep extraction-ready boundaries. |
| Firebase project IDs | Proposed in Firebase doc; not reserved or created. |
| First market pod | Founder must choose city, vertical, contact path, and sender identity. |
| First outbound channel | Email/export first. WhatsApp assisted later. |
| Public docs | None. Internal project only. |

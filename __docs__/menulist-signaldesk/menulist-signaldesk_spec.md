# MenuList SignalDesk - Specification

**Status:** Initial planning spec
**Created:** June 23, 2026
**Audience:** Founder, growth team, future implementers
**Scope:** Private internal growth control room for MenuList marketing and acquisition.

## Executive Summary

MenuList SignalDesk is an internal system for Danny and the MenuList marketing/growth team.

The corrected founder point of view is simple: the system should help market and distribute MenuList while the founder mainly observes, monitors, approves, pauses, or redirects. SignalDesk should not make Danny manually run a CRM-style outreach desk.

Its job is to help the team:

1. collect candidate businesses from approved sources;
2. dedupe and preserve source provenance;
3. detect whether MenuList has a specific current-list opportunity;
4. prepare evidence and safe message drafts;
5. route through approved channels with human control;
6. capture replies in one place;
7. attribute outcomes back to MenuList activation.

The system must stay private. The corrected review explicitly says this is a private, from-scratch internal tool, not a public product or MenuList owner/customer feature (`../growth-engine/growth-engine_private-internal-tool-review-2026-06-23.md:6`).

## Product Definition

SignalDesk is:

```txt
private growth control room
with AI scoring + evidence + safe drafting + reply intelligence + attribution
and a MenuList-native demand-signal flywheel
where founder work is observe, monitor, approve, pause, or redirect
```

SignalDesk is not:

- public SaaS
- lead marketplace
- CRM clone
- SDR bot
- scraped-number WhatsApp sender
- Instagram cold-DM bot
- MenuList owner feature
- MenuList customer feature
- public website or public launch surface

## Goals

| Goal | Success signal |
| --- | --- |
| Find better targets | Target has source confidence, category fit, and current-list opportunity. |
| Reduce founder/operator work | System prepares evidence packets, next actions, approvals, and summaries without forcing manual research across many tabs. |
| Keep outreach safe | Every send/export has source, channel eligibility, suppression, and approval. |
| Learn from outcomes | Upload, preview, approval, publish, two-surface activation, paid plan, partner lead, and multi-location review are attributed. |
| Build the MenuList flywheel | QR/menu-link/share/claim signals feed future targeting. |

## North Star

```txt
Activated businesses with a current list live on at least two customer surfaces within seven days.
```

This comes from the MenuList growth research memo (`../menulist-marketing-distribution/menulist-marketing-distribution_end-to-end-growth-research-2026-06-23.md:111`).

Do not use these as north-star metrics:

- leads scraped
- messages sent
- AI drafts generated
- inbox volume
- open rate alone
- reply rate alone
- Product Hunt votes

## Users

| User | Job |
| --- | --- |
| Founder/admin | Observe system health, monitor risk and outcomes, approve source/channel/budget/scale decisions, pause or redirect when needed. |
| Growth manager | Select market pods, review system-prepared evidence, approve target cohorts, measure outcomes. |
| Operator | Handle exceptions, approved handoffs, and reply clean-up when the system cannot safely close the loop. |
| Compliance/reviewer role | Review source rights, consent, suppression, template safety, and complaint events. |
| System workers | Normalize, score, draft, classify, summarize, and attribute within policy gates. |

## Scope

### In Scope

- internal team auth and role model
- audit logs
- manual import and CSV upload
- target registry
- source provenance and source policy
- dedupe
- contact and channel identity registry
- AI fit/current-list-gap/contactability scoring
- evidence packets
- decision snapshots
- template library
- AI draft assistant with guardrails
- human approval queue
- email/export rail
- suppression ledger
- reply inbox
- reply classifier
- MenuList outcome bridge
- attribution and summary dashboards
- demand signals from MenuList-controlled surfaces
- cost and channel health dashboards
- emergency kill switches

### Out Of Scope For First Build

- WhatsApp API automation
- Instagram/Messenger send automation
- automated Google Maps scraping runs
- Foursquare prospect outreach
- Meta paid webhooks
- campaign optimizer
- autonomous next-best-action execution
- public SignalDesk website
- public help center
- public launch
- direct MenuList truth writes

## Core Flows

### Flow 1 - Target Intake

1. System or approved operator action imports or creates targets from approved source policy.
2. System validates source policy.
3. Dedupe checks existing businesses, contacts, and source identities.
4. Target receives source provenance, retention, and contactability state.
5. Target enters review, enrich, hold, reject, or ready state.

### Flow 2 - AI Opportunity Review

1. AI worker checks category, current-list gap, channel fit, and MenuList-specific opportunity.
2. AI returns typed scores, not freeform decisions.
3. Evidence packet records source facts and rejected facts.
4. Human reviewer only approves, holds, rejects, or redirects when the system asks for a decision.

### Flow 3 - Safe Draft And Approval

1. System selects the approved offer angle and template from policy.
2. AI drafts only within approved variables.
3. Guardrail checker blocks unsupported claims.
4. Human approves final outbound action.
5. Send/export happens only after suppression and channel eligibility checks.

### Flow 4 - Reply And Attribution

1. Reply or operator note enters inbox.
2. Classifier tags interested, not interested, DNC, wrong contact, pricing, objection, or human review.
3. Interested target receives tracked MenuList route.
4. Outcomes update when upload, preview, approval, publish, or activation happens.
5. Summary docs update dashboards.

### Flow 5 - Demand Signal Flywheel

1. MenuList public surfaces produce permitted demand signals.
2. SignalDesk records compact signal summary.
3. Signals improve target prioritization and local cluster decisions.
4. No customer scan alone creates a prospect unless contact or explicit action exists.

## Requirements

| ID | Requirement | Priority |
| --- | --- | --- |
| SD-R001 | System must be internal-only and admin/growth-team accessible. | P0 |
| SD-R002 | Every target must have source provenance before action. | P0 |
| SD-R003 | Every contact/action must pass suppression and eligibility checks. | P0 |
| SD-R004 | AI may recommend and draft, but may not send, bypass policy, or decide legality. | P0 |
| SD-R005 | Every message/export must have human approval in first build. | P0 |
| SD-R006 | Dashboards must read summary docs, not raw event/message collections. | P0 |
| SD-R007 | Source-provider data must not become MenuList truth. | P0 |
| SD-R008 | WhatsApp API sends are blocked until dedicated governance exists. | P0 |
| SD-R009 | Outcome bridge must record MenuList activation without owning MenuList onboarding. | P0 |
| SD-R010 | Mobile must be emergency/read-only only. | P0 |
| SD-R011 | Founder experience must be observe, monitor, approve, pause, or redirect; manual operator work is exception handling, not the core product motion. | P0 |

## Policy Decisions

| Area | Decision |
| --- | --- |
| Email | First controlled outbound rail after sender-domain readiness. |
| WhatsApp | Owner-initiated, consented, ad-click, or founder-led only; no cold blasts. |
| Instagram/Messenger | Inbox/response channels first; no cold DM automation. |
| Google Maps | Do not store scraped Maps output as prospect truth. |
| GBP APIs | Not for lead generation. |
| Foursquare | Not for prospect outreach under PAYG terms unless separate permission exists. |
| AI | Worker, not authority. Typed outputs only. |

## First Build Slice

The first build should prove one loop:

```txt
target -> evidence -> draft -> approve -> send/export -> reply -> MenuList outcome
```

It should not attempt the full 38-spec machine.

## Open Questions

| Question | Needed before |
| --- | --- |
| Runtime repo location | Code scaffolding |
| Firebase project IDs | Firebase setup |
| First sender identity and domain | Email rail implementation |
| Physical address policy | Email sends |
| First market pod | Real lead collection |
| First approved source list | Import testing |
| Production WhatsApp account | Assisted WhatsApp docs/implementation |

## Acceptance Criteria

- A target cannot be acted on without source provenance.
- A suppressed contact cannot be messaged or exported.
- AI cannot create final-send authority.
- Every send/export is auditable.
- Every reply can be linked to a target/conversation.
- Every real outcome can be attributed to source/channel/template.
- Dashboards remain summary-based.
- Mobile cannot send, approve, reveal raw PII, or configure providers.

# MenuList SignalDesk - Specification

**Status:** Implemented internal runtime contract with owner-gated external execution
**Created:** June 23, 2026
**Last Updated:** July 11, 2026
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
- revenue accounts linked to existing targets
- deterministic commercial opportunity qualification and pipeline state
- immutable standard commercial offer versions
- bounded operating envelopes that reference existing policies
- interested-reply qualification through the existing guarded revenue rule
- founder-only market-pod approval separate from system recommendation/research
- activation watches automatically refreshed from deterministic earliest/latest/terminal SignalDesk outcome-summary reads
- read-time seven-day stall state without a new scheduler
- compact revenue, founder-attention, and daily-spend summaries

### Out Of Scope For First Build

- WhatsApp API automation
- Instagram/Messenger send automation
- automated Google Maps scraping runs
- Foursquare prospect outreach
- Meta paid webhooks
- campaign optimizer
- autonomous next-best-action execution
- exception-only execution, autonomous commercial terms, or unapproved discounts
- calendar, proposal, signature, checkout, or payment provider execution
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

### Flow 6 - Bounded Revenue Lifecycle

1. Authorized qualification or an interested reply links an existing target to one revenue account.
2. Suppression, contactability, source-policy, reply, segment, and score state determine whether one commercial opportunity may open.
3. The opportunity references an immutable approved offer version and keeps separate commercial stage/status fields.
4. An operating envelope references existing policies, caps, sender/template readiness, time window, stop rules, and approval mode.
5. Runtime remains shadow or approval-only; requested `exception-only` mode is held.
6. Target outcomes automatically refresh activation watches from SignalDesk summaries while MenuList remains authoritative for activation and customer truth; only two-surface activation creates a commercial win.
7. An elapsed seven-day watch reads as stalled and enters the founder decision brief without a scheduler or MenuList truth query.
8. Research/recommendation may propose a market pod but cannot activate it; the founder records approve/hold/reject before any envelope may use it.

### Flow 7 - AI Shadow Review And Learning

1. Every provider-backed AI assist run stores its task, provider, model route, model-eval ID, target, confidence, prompt version, rejected-fact state, and cost.
2. The run remains `unreviewed` until a founder-admin records `accepted`, `edited`, `rejected`, or `held` plus bounded review notes and attention minutes.
3. A changed review transactionally removes the previous decision contribution before adding the new one, so aggregate rates and attention totals cannot drift.
4. `signaldeskModelEvals` stores cumulative run counts, confidence/rejected-fact counts, founder review counts, decision rates, and shadow-review attention.
5. Shadow review updates the existing revenue founder-attention summary only when that summary already exists; it does not create or change an opportunity, offer, envelope, message, outcome, or MenuList truth.
6. The action is founder-only, desktop-only, audited, timeline-recorded, and never enables provider send or a higher autonomy mode.

### Flow 8 - AI Volume Mode

1. A founder selects up to five existing targets, up to three supported tasks, an instruction, and a maximum estimated AI cost.
2. A founder-scoped idempotency key prevents a retried request from buying the same model work twice.
3. Each target/task pair passes the existing target, source-policy, model-route, provider, budget, and AI-worker pause gates.
4. The fast Gemini route generates typed JSON and a separate critic route returns `pass`, `revise`, or `hold`.
5. Risky or low-confidence pairs may escalate only to the task route's approved Gemini model; unavailable provider families remain review-required.
6. Successful child runs remain individually reviewable while one parent run summarizes completed/failed pairs, model calls, estimated cost, child IDs, stable failure codes, audit, and timeline.
7. Volume Mode prepares internal recommendations only. It cannot send, publish, infer consent, approve commercial terms, move pipeline, or write MenuList truth.

### Flow 9 - Prepared Action And Manual Contact Confirmation

1. Export or assisted handoff prepares an approved message but does not claim the business was contacted.
2. After completing a policy-approved external action, a desktop operator records the target, source-policy snapshot, allowed route, timestamp, bounded result, and optional internal note.
3. The server rechecks current source rights, suppression, target eligibility, route eligibility, relevant kill switches, and a fresh, unconsumed prepared email export where the route is `email-export`.
4. One idempotent confirmation updates the existing target and conversation summaries, appends an audit event, and creates a target run-timeline record.
5. `wrong-contact` immediately creates suppression; no result triggers send, follow-up, provider work, or MenuList truth writes.
6. Approval rejection requires a bounded rejection reason. `other` also requires a note, and the reason projects to evidence review, identity enrichment, hold, or rejection without creating CRM tasks.

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
| SD-R012 | One target must resolve idempotently to one revenue account and at most one automatically created open opportunity. | P0 |
| SD-R013 | Commercial offer terms must be immutable within a version; changed terms require a new version. | P0 |
| SD-R014 | Operating envelopes must reference existing controls and cannot activate provider send or silently graduate autonomy. | P0 |
| SD-R015 | Activation watches may read SignalDesk outcome summaries but must not write MenuList truth. | P0 |
| SD-R016 | Revenue actions must remain server-only and mobile-blocked, with audit, timeline, cost, and compact summary updates. | P0 |
| SD-R017 | Revenue pipeline values must carry one explicit offer-derived currency; mixed-currency minor units cannot be aggregated. | P0 |
| SD-R018 | Founder-approved operating envelopes require an explicitly founder-approved active market pod, transactionally current referenced controls, and a new version for scope/term changes. | P0 |
| SD-R019 | Two-surface activation must close the linked opportunity and remove it from open forecast exactly once. | P0 |
| SD-R020 | Provider-backed AI runs must support founder-only `accepted`, `edited`, `rejected`, or `held` shadow review with bounded reason and attention minutes. | P0 |
| SD-R021 | Model-eval pass, rejected-fact, acceptance, edit, rejection, and hold rates must be derived from cumulative counters rather than overwritten by the latest sample. | P0 |
| SD-R022 | Re-reviewing one AI run must transactionally reverse its previous aggregate decision and attention contribution before applying the replacement. | P0 |
| SD-R023 | AI shadow review must remain desktop-only, internal, audited, summary-backed, and unable to send, publish, spend, change commercial truth, or write MenuList truth. | P0 |
| SD-R024 | AI Volume Mode must be feature-flagged, founder-only, desktop-only, and limited to five targets and three tasks per request. | P0 |
| SD-R025 | Every volume child must run typed generation plus an independent typed critic before it becomes reviewable. | P0 |
| SD-R026 | Stronger-model escalation must be critic/risk triggered and limited to an active executable same-provider route. | P0 |
| SD-R027 | Volume batches must fail before provider work when their worst-case estimated cost exceeds the founder maximum. | P0 |
| SD-R028 | Paid volume requests must be idempotent across transport retries. | P0 |
| SD-R029 | Partial failure must preserve successful child runs and store stable failure codes without raw provider errors. | P0 |
| SD-R030 | AI Volume Mode cannot grant source, consent, suppression, send, publish, commercial, spend, autonomy, or MenuList truth authority. | P0 |
| SD-R031 | AI Volume Mode must use batch rate limiting, aggregate provider-budget preflight, and one expiring global lock so overlapping paid batches cannot consume the same budget snapshot. | P0 |
| SD-R032 | Expired running AI volume parents must reconcile bounded child evidence into completed, partial, or blocked terminal state without another provider call or releasing a newer batch lock. | P0 |
| SD-R033 | Desktop must preserve and reuse the bounded AI volume retry payload until terminal state so recovery remains reachable after a request failure or page reload. | P0 |
| SD-R034 | Persisted allowed routes must be revalidated against current source rights and target suppression before display or action. | P0 |
| SD-R035 | Draft, approval, export, handoff, send, and follow-up paths must recheck every source use they depend on; contact permission alone is insufficient when evidence or personalization rights have expired or been revoked. | P0 |
| SD-R036 | Duplicate identities inside one import request must resolve to one target before the batch commits. | P0 |
| SD-R037 | Customer-proof assets must bind the exact granted proof scopes, and those scopes must be rechecked before every derived draft. | P0 |
| SD-R038 | An outcome idempotency key must bind one normalized request fingerprint; reuse with different outcome facts must fail without side effects. | P0 |
| SD-R039 | Owner-qualified intent and verified activation must be projected durably onto the target so bounded history reads cannot erase activation or downgrade a converted target. | P0 |
| SD-R040 | The seven-day activation clock must start at owner-qualified intent, not at discovery or an arbitrary later outcome. | P0 |
| SD-R041 | Provider webhook event reservation and side effects must commit atomically under a provider-scoped, path-safe identifier, and any supplied target ID must resolve to an existing SignalDesk target. | P0 |
| SD-R042 | The primary desktop shell must expose only Today, Opportunities, Conversations, Activations, and Controls; advanced protected tools remain reachable from Controls. | P0 |
| SD-R043 | Mobile must be able to activate an emergency pause with confirmation and audit, but cannot clear a pause or perform approval, export, send, provider, configuration, PII, schedule, spend, or policy mutations. | P0 |
| SD-R044 | A normal SignalDesk member may read only their own membership document from the client; cross-member membership reads and lists are platform-admin only. | P0 |
| SD-R045 | The SignalDesk app shell must use a product-light NextAuth session provider and must not import the MenuList store/tenant session bootstrap into its client bundle. | P0 |
| SD-R046 | Fresh internal users must authenticate through a noindex SignalDesk-local credentials gateway that validates callback paths, then pass the normal active-member/platform-admin access check; it must not perform MenuList store onboarding or Firebase-claims bootstrap. | P0 |
| SD-R047 | Export preparation and completed manual contact must remain separate states; only provider success or an idempotent, policy-gated manual confirmation may mark a target contacted. | P0 |
| SD-R048 | Approval rejection must store a bounded reason and project a deterministic recovery or terminal action; `other` requires a bounded note. | P0 |
| SD-R049 | Limited contactability does not authorize a form, phone, social, or messaging action. Manual completion is restricted to a fresh prepared email export or a permissioned-referral partner introduction. | P0 |

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

## Activation Opportunity Contract

SignalDesk treats an `ActivationOpportunity` as the operating object. A business can be useful for research without being contactable.

Hard gates run before any action is shown:

1. canonical target and source provenance exist;
2. the source-rights record is complete, current, and permits the requested field/use;
3. suppression is clear;
4. an allowed route exists;
5. evidence is sufficient for the proposed action;
6. there is a plausible owner-reviewed path to two distinct customer surfaces.

The UI keeps evidence, truth-gap, reachability, activation feasibility, surface leverage, and learning value separate. It does not use a composite score as action authority.

## Outcome Integrity Contract

A `two_surface_activation` is valid only when it has:

- an owner-qualified timestamp;
- an owner-review timestamp;
- two distinct surface identifiers;
- an evidence reference;
- an idempotency key;
- `owner-reviewed-manual` or `menulist-signed` integrity.

Legacy or incomplete summaries remain visible but cannot activate a watch, close an opportunity, or count as verified activation.

The idempotency key is bound to the normalized target, outcome, timestamps, surfaces, evidence, and integrity fingerprint. Reusing the key with different facts is a conflict, not a duplicate success.

Customer proof requires a separate, revocable proof-permission record. Every asset stores the exact public scopes it uses, and draft generation rechecks that the grant is still active and still contains every scope. Activation does not imply public proof permission.

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
- Mobile can activate an audited emergency pause but cannot clear it, send, approve, export, reveal raw PII, configure/run providers, schedule, spend, or mutate policy.
- Normal members cannot list or read another SignalDesk member's membership record from Firestore clients.
- Later outcomes cannot erase a prior verified activation or downgrade a converted target.
- SignalDesk hydration cannot depend on MenuList store, tenant, subscription, or Firebase-claims bootstrap state.
- An authenticated account without active SignalDesk membership remains unauthorized even when credentials are valid.

# MenuList SignalDesk - Owner Control Runbook

**Status:** Active internal runbook
**Created:** June 23, 2026
**Audience:** Founder, growth manager, operator, reviewer.

## Operating Principle

SignalDesk should make MenuList marketing and distribution more specific, safer, and more measurable while keeping founder work at the control layer.

The owner posture is:

```txt
observe -> monitor -> approve -> pause or redirect
```

It should not make the team send more low-quality messages or force the founder into daily manual CRM work.

## Daily Workflow

### 0. Open Daily Growth Mission

Start with the ranked daily mission before entering detail views.

The mission should contain no more than five actions:

- approve a prepared target cohort, draft, proof asset, or partner step;
- hold work that lacks source, proof, sender, or suppression clarity;
- pause a source, channel, template, or partner test;
- redirect the current pod, CTA, proof asset, or source;
- manually publish or manually send an approved item when the channel is ready.

If the mission is noisy, do not widen execution. Fix grouping, blocked reasons, or source quality first.

### 1. Observe Control Room

Review:

- kill switches;
- sender/channel health;
- suppression spikes;
- complaint/bounce alerts;
- AI eval failures;
- cost summary;
- stale queues.

If a critical alert exists, pause the affected channel or source before doing normal work.

### 2. Monitor System-Prepared Work

The system should prepare:

- source-run summaries;
- target dedupe/provenance state;
- fit, current-list-gap, contactability, and risk scores;
- evidence packets;
- draft candidates;
- approval packets;
- inbox classifications;
- suppression updates;
- outcome attribution.

The founder or growth manager should review exceptions, not every raw row.

Do not contact a target from source data alone.

### 3. Approve Only Gate Decisions

Approve or reject:

- source policies;
- market pods;
- target cohorts;
- risky evidence packets;
- outbound drafts;
- assisted channel handoffs;
- sender/channel readiness;
- budget or scale decisions.

Before approval:

- message matches approved template;
- no invented claim;
- no unsupported Google/WhatsApp/Instagram/platform claim;
- source facts are permitted;
- suppression is clear;
- channel is eligible;
- sender identity is correct;
- unsubscribe or stop path exists where required.

### 4. Handoff Or Export

First build default:

- export approved messages or send low-volume email only after readiness;
- no WhatsApp API sends;
- no Instagram/Messenger automation.

Every send/export must create:

- audit event;
- decision snapshot;
- source/channel attribution;
- next review date or follow-up rule.

### 5. Watch Inbox Exceptions

The system should classify replies first. Humans handle:

- interested replies;
- unclear intent;
- policy questions;
- complaints;
- wrong-contact cases;
- pricing objections;
- source-origin questions.

DNC/unsubscribe/wrong-contact/complaint cases must be suppressed immediately.

### 6. Monitor Outcomes

Record or ingest:

- current list received;
- preview prepared;
- owner approved;
- public link published;
- QR downloaded;
- WhatsApp link copied;
- Google/Profile placement marked done;
- paid plan;
- partner lead;
- multi-location review.

## Weekly Workflow

1. Review source quality.
2. Review top objections.
3. Review cost per activated business.
4. Review channel health.
5. Review templates blocked by safety.
6. Review demand signals by city/category.
7. Decide whether to continue, pause, or change the market pod.

The weekly decision should be one of:

- continue current pod;
- narrow the pod;
- change source policy;
- change template;
- pause a channel;
- hold provider send;
- stop the experiment.

## First 7-Day Operating Trial

Before scaling, run one pod only:

| Day | Operator work | Founder decision |
| --- | --- | --- |
| 1 | Prepare one city/category/contact-path/source-list/CTA/sender proposal. | Approve or change the pod. |
| 2 | Import 25-50 targets from the approved source. | Confirm source policy and source-list quality. |
| 3 | Review scoring, dedupe, evidence, and contactability exceptions. | Hold or approve only the clean target group. |
| 4 | Prepare drafts from approved evidence only. | Approve, hold, or reject a small number. |
| 5 | Export or manually send through the controlled email rail only if checks pass. | Confirm final suppression and sender readiness. |
| 6 | Classify replies and attach next route/CTA. | Approve edge-case replies only. |
| 7 | Review outcomes and source quality. | Repeat, narrow, change CTA/source/proof, or stop. |

The trial should measure founder workload as well as outcomes. A pod that creates many manual exceptions is not ready to scale even if the reply count looks promising.

## Target States

| State | Meaning | Allowed actions |
| --- | --- | --- |
| `new` | Imported or manually created | Review, dedupe |
| `review` | Needs human review | Enrich, hold, reject |
| `ready` | Has evidence and eligible channel | Draft |
| `drafted` | Draft exists | Edit, approve, reject |
| `approved` | Human approved action | Export/send after final checks |
| `contacted` | Message sent/exported | Wait, reply, follow-up if eligible |
| `replied` | Reply exists | Classify, route, suppress |
| `converted` | MenuList outcome exists | Attribute, learn |
| `held` | Needs more evidence or policy review | No send |
| `rejected` | Not fit or not allowed | No send |
| `suppressed` | DNC/unsubscribe/complaint/etc. | No send/export |

## Stop Rules

Stop a source, channel, campaign, or template if:

- complaint rate rises;
- unsubscribe rate rises;
- hard bounces spike;
- source policy is unclear;
- source provider terms change;
- AI output fails eval;
- messages repeatedly require heavy edits;
- conversion does not reach MenuList outcome;
- cost per activated business exceeds budget;
- any platform account health warning appears.

## Operator Copy Rules

Use:

- "current menu"
- "current service list"
- "official customer link"
- "review before publishing"
- "one link for QR, WhatsApp, Google, and repeat customers"

Avoid:

- "AI-powered"
- "automatic Google update"
- "official WhatsApp partner"
- "we found customers are leaving"
- "guaranteed sales"
- "guaranteed ranking"
- "I scraped your business"
- "we already built your site"

## Escalation

Escalate to founder/admin when:

- source policy is unclear;
- channel eligibility is unclear;
- complaint or legal threat arrives;
- provider account warning appears;
- a target asks how data was obtained;
- an operator wants to use a new source;
- a channel automation request appears;
- a campaign would exceed budget or send caps.

## Do Not Do

- Do not create public SignalDesk pages.
- Do not reveal raw source/provider data in outbound messages.
- Do not contact suppressed identities.
- Do not use WhatsApp for cold outbound.
- Do not automate Instagram/Messenger cold DMs.
- Do not treat AI suggestions as approval.
- Do not change MenuList public truth from SignalDesk.

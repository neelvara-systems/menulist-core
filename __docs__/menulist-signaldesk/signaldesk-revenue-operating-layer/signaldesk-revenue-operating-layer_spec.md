# SignalDesk Revenue Operating Layer - Specification

**Status:** Runtime implemented and locally verified
**Created:** July 10, 2026
**Last verified:** July 21, 2026
**Scope:** Private commercial lifecycle and autonomy-envelope records built on existing SignalDesk rails.

## Goal

Give each business one commercial identity, one bounded opportunity history, one current next action, and one activation watch while preserving existing source, compliance, approval, audit, cost, and MenuList product boundaries.

## Core Objects

| Object | Purpose |
| --- | --- |
| Revenue Account | Organization/location-aware commercial identity linked to one or more existing SignalDesk targets. |
| Commercial Opportunity | Qualified sale state with stage, value, currency, probability, next action, SLA, founder attention, and structured win/loss reason. |
| Commercial Offer | Versioned standard price/package/eligibility/discount authority and founder-approval rules. |
| Operating Envelope | Versioned aggregate referencing existing policies and defining volume, cost, time, approval mode, and stop conditions. |
| Activation Watch | Read-only commercial view derived from SignalDesk outcome summaries; MenuList remains authoritative. |
| Revenue Control Summary | Compact counts and value/attention totals for the default revenue screen. |

## State Dimensions

Revenue Account keeps separate dimensions:

- `lifecycleStage`: prospect, engaged, opportunity, customer, nurture, lost;
- `engagementState`: none, contactable, contacted, replied, waiting-for-customer, opted-out;
- `complianceState`: eligible, review-required, blocked, suppressed;
- `automationState`: manual, shadow, approval-only, paused;
- `activationState`: not-started, routed, in-progress, stalled, activated.

Commercial opportunity keeps its own stage and status. MenuList account/customer health is not copied into SignalDesk.

## Qualification Rule

A commercial opportunity may be created only when all are true:

1. target suppression state is clear;
2. contactability is not blocked;
3. source policy exists;
4. target has replied/interested or has a qualifying score/segment;
5. qualification is initiated by an authorized SignalDesk action.

An interested reply is an authorized qualification trigger. It may create or reuse the revenue account and eligible opportunity after the reply, target, source-policy, contactability, and suppression writes are durable. Other reply classes do not silently advance commercial state.

Targets that fail the rule may receive a revenue account in nurture/held state, but no open opportunity.

Target `converted` is not commercial win authority because legacy target state may also represent a single published surface. Only a recorded `two_surface_activation` outcome may create or move the commercial opportunity to won and the revenue account to customer lifecycle. A published-only target remains an open opportunity with a published activation watch.

## Operating Envelope Rule

An envelope must reference existing SignalDesk controls rather than duplicate them. A founder-reviewed, explicitly approved active market pod is required:

- market pod;
- source policies;
- commercial offer;
- approved channel;
- template/CTA/reply playbook references;
- sender domain when email is used;
- budget policy;
- daily and total volume caps;
- maximum cost;
- start and expiry;
- approval mode;
- stop conditions and fallback action;
- approving owner and version.

The complete approval-mode enum is stored for architecture stability:

```txt
manual
recommendation-only
prepare-and-approve-each
approve-batch
approve-sample
exception-only
```

Runtime execution remains `shadow` or `approval-only`. `exception-only` may be recorded as a requested mode but must remain held until operating proof, provider-send readiness, and an explicit future enablement decision exist.

`draft`, `held`, `expired`, and requested `exception-only` envelopes always resolve to held execution. A paused envelope preserves its original approval identity and timestamp. Scope or cap changes require a new envelope version.

Only `founder-admin` may store an envelope with `status: approved`. Immediately before writing, the Firestore transaction rereads the current pod, source policies, offer, optional budget, sender identity, and templates and rejects any control that changed or expired after the initial validation.

Research and recommendation workers may update fit evidence, confidence, and `recommendation`, but they must keep unreviewed pods held, attach zero approved pod budget, and preserve any founder-controlled scope/decision. Only the founder-only market-pod review action may record `approved`, `held`, or `rejected` and change pod execution status.

## Activation Boundary

Activation Watch may read only SignalDesk-owned outcome summaries/events. It may show route-created, upload-started, preview-prepared, published, activated, or stalled. Two-surface activation closes the linked commercial opportunity as won and removes its value from open and weighted pipeline summaries. It must not query or write broad MenuList store/project trees.

The bounded derivation uses the latest 30 valid target outcome summaries for current non-terminal context, the target's canonical owner-qualified timestamp for the seven-day deadline, and a separate bounded terminal-activation lookup. This prevents truncated history from losing two-surface activation or moving the deadline.

Recording a target-scoped outcome automatically attempts the same transactional activation-watch derivation used by the explicit recheck action. The outcome remains durable if the derived refresh needs recovery, and the bounded failure is logged without target contact data. Revenue workspace and Daily Growth Mission reads surface an elapsed seven-day deadline as stalled even when no maintenance scheduler has persisted a new status.

If the target outcome predates revenue-account creation, the outcome reports activation sync as not applicable. Later authorized qualification reconciles the existing outcome summaries automatically, so event order cannot strand activation state.

## First Trial Default

The maintained seed is a held, zero-budget recommendation for Bengaluru, Indiranagar and Koramangala, covering cafes, dessert shops, QSRs, and customer-facing cloud kitchens. It is created when absent; the exact old unapproved held Mumbai seed is migrated once; every other existing pod is preserved so rerunning defaults cannot overwrite founder control. Seeding does not approve or activate the pod, offer, source list, sender, spend, or outreach.

## Currency Rule

Opportunity currency is derived from its referenced commercial offer. A valued opportunity requires an offer. The materialized revenue summary preserves one pipeline currency and rejects mixed-currency aggregation rather than adding incomparable minor-unit values.

## Requirements

| ID | Requirement |
| --- | --- |
| SD-REV-001 | Revenue records use product-local collections and `pId: SD`. |
| SD-REV-002 | Every revenue account links to at least one existing target. |
| SD-REV-003 | Commercial opportunities are created only through deterministic qualification. |
| SD-REV-004 | Commercial offers are versioned and record permitted discount authority. |
| SD-REV-005 | Operating envelopes reference existing control records and cannot enable provider send. |
| SD-REV-006 | Exception-only requested mode remains held. |
| SD-REV-007 | Activation watches are derived from SignalDesk outcomes only. |
| SD-REV-008 | Default UI reads compact revenue collections and one summary document. |
| SD-REV-009 | Every state-changing mutation writes audit, run timeline, and cost-accounting updates; an exact successful retry writes nothing. |
| SD-REV-010 | Mobile remains dashboard-only; the Revenue workspace and all revenue mutations are server-blocked on mobile. |
| SD-REV-011 | Founder attention minutes are stored and summarized. |
| SD-REV-012 | No action mutates MenuList store, menu, project, billing, publish, or customer truth. |
| SD-REV-013 | Active and weighted pipeline values use one explicit currency. |
| SD-REV-014 | An approved envelope requires an active market pod and cannot attach provider/model/trust-partner budget records as revenue budget authority. |
| SD-REV-015 | Offer and envelope IDs are deterministic from name/version; changed immutable terms require a new version. |
| SD-REV-016 | Revenue summary deltas and idempotent account/opportunity creation use Firestore transactions. |
| SD-REV-017 | Expired envelopes are presented as held even before a maintenance writer persists expiry state. |
| SD-REV-018 | Interested replies automatically create or reuse eligible revenue state; other reply classes do not advance it. |
| SD-REV-019 | Target-scoped outcomes automatically refresh activation state when a revenue account exists. |
| SD-REV-020 | Seven-day activation deadlines read as stalled without requiring a new scheduler. |
| SD-REV-021 | Daily Growth Mission summarizes open pipeline, activation stalls, founder attention, and estimated spend. |
| SD-REV-022 | The recommended Bengaluru seed remains held and carries zero approved budget. |
| SD-REV-023 | Rerunning defaults cannot overwrite an existing founder-controlled market pod. |
| SD-REV-024 | The exact unapproved legacy Mumbai seed migrates to the held zero-budget Bengaluru recommendation. |
| SD-REV-025 | Qualification reconciles eligible outcomes that were recorded before the revenue account existed. |
| SD-REV-026 | Published-only target state cannot create a won opportunity or customer lifecycle. |
| SD-REV-027 | Market-pod recommendations and research remain held until an explicit founder-only review decision. |
| SD-REV-028 | Operating envelopes require stored founder market-pod approval evidence, not only `status: active`. |
| SD-REV-029 | Activation derivation uses deterministic latest, earliest, and terminal target-outcome reads. |
| SD-REV-030 | Operating-envelope approval is founder-only and transactionally revalidates every referenced control before write. |
| SD-REV-031 | The page, workspace API, and direct workspace loader all enforce the Revenue feature flag. |
| SD-REV-032 | Budget-policy configuration detail is returned only to roles with `signaldesk.configure`. |
| SD-REV-033 | Manual opportunity updates cannot set `won`; verified two-surface activation is the only win authority. |
| SD-REV-034 | Current target, source-policy, contactability, and suppression authority is revalidated before opportunity mutation. |
| SD-REV-035 | Losing current qualification authority demotes an open opportunity to nurture and removes it from forecast. |
| SD-REV-036 | Offer and envelope arrays reject duplicate terms or references. |
| SD-REV-037 | Every stored and candidate revenue document passes the strict product-local workspace projector. |
| SD-REV-038 | A pre-qualification verified activation may create one zero-value offerless win with an explicit activation-authority reason. |

## Acceptance Criteria

- A qualified target can create one idempotent revenue account and commercial opportunity.
- Exact retries preserve timestamps and do not repeat audit, timeline, cost, approval, or summary effects.
- A published-only target remains open; only two-surface activation closes it as won.
- A suppressed or blocked target cannot create an open opportunity.
- An existing open opportunity is demoted when current source/contact authority becomes blocked or suppressed.
- A standard commercial offer can be versioned without changing the existing Offer/CTA record.
- An operating envelope cannot become executable through its own input.
- A draft, held, expired, or exception-only envelope cannot present approval-only execution.
- Mixed-currency pipeline aggregation is rejected.
- Two-surface activation closes the linked opportunity and removes it from forecast exactly once.
- An activation watch reflects recorded SignalDesk outcomes and marks stalled state deterministically.
- A long outcome history cannot hide terminal activation or reset the seven-day start.
- A system recommendation cannot activate a market pod or attach pod spend; founder review is explicit and audited.
- An interested reply creates or reuses eligible revenue state, and its later outcome updates activation without a manual refresh dependency.
- A daily founder brief prioritizes stalled activation and overdue opportunity work before scale work.
- The Revenue workspace reads summaries and bounded lists only.
- Firestore client writes remain denied.
- The local emulator workflow covers qualification, offer, envelope, opportunity update, activation watch, and no MenuList truth writes.

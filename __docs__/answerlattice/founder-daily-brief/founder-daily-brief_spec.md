# Founder Daily Brief Spec

> **Product role:** The owner decision surface described externally as an "Owner Action Center"
> **Implementation posture:** Improve the existing Daily Brief; do not create a second feature

## Goal

Reduce the daily mental load for solo founders by showing only the smallest useful set of support-truth decisions that require attention now.

The feature succeeds when the owner can open Answerlattice for less than a minute and leave knowing either:

- nothing needs a decision; or
- which one to four evidence-backed conditions should be handled first.

## Owner Problem

Answerlattice already collects launch proof, answer drift, answer coverage, explicit outcomes, Support Board work, friction evidence, Knowledge Intake state, and release impact. A founder should not inspect every management screen to decide whether something important is wrong.

The owner needs direct answers to:

1. Is a current support-truth condition at risk?
2. Is qualified human support work waiting?
3. Are users repeatedly failing to get an approved answer?
4. What is the highest-value repair?
5. Can everything else safely wait?

## Product Promise

Daily Brief converts existing governed summaries into a short, read-only decision list. It explains:

- what happened;
- why the condition qualifies;
- what evidence supports it;
- which existing workflow owns the resolution;
- whether optional AI-assisted work has a credit cost.

It does not become a notification feed, analytics dashboard, task manager, or independent source of truth.

## External Proposal Decision

The external Owner Action Center proposal is accepted as a product outcome and rejected as a new architecture.

Disagreements:

| External proposal | Answerlattice decision |
| --- | --- |
| Create an owner-action collection and compact action-center summary | Reject. Reuse the six compact source summaries and existing source lifecycle. |
| Add snooze, dismiss, accepted risk, handled today, and manual action state | Reject. These create task-management state and can hide unresolved truth. |
| Add ticket SLA and customer-waiting orchestration | Reject here. Answerlattice is not a helpdesk and the current packet does not prove exact waiting/SLA state. |
| Rank with a 100-point formula | Reject. Use explicit deterministic precedence and reason codes. |
| Add a detail drawer with extra reads | Do not admit without founder evidence. Current cards explain the condition and route to the owning screen. |
| Show five cards | Keep the current limit of four. |
| Rename navigation to Today | Keep `Daily Brief`; `Today` is too ambiguous outside this context. |

See [Founder Daily Brief Validation](./founder-daily-brief_validation.md) for the complete proposal matrix.

## Operating-Home Rule

Daily Brief is the default management home only after `activation.launchProof.ready === true`.

Before launch:

- Activation remains the management home;
- direct Daily Brief access may show one consolidated launch blocker;
- Daily Brief never duplicates the complete activation checklist.

After launch:

- Daily Brief is the normal management home for users with Support Control access;
- the brief orchestrates existing source workflows;
- launch readiness remains owned by Activation.

## Action Qualification

An item may enter the ranked action list only when all conditions are true:

1. A current unresolved condition is proven by an admitted compact summary.
2. The condition affects support truth, launch safety, or a qualified human fallback.
3. The owner can take one concrete action in an existing Answerlattice workflow.
4. The card explains why it is shown now.
5. The owning source has a factual resolution condition.
6. The condition is important enough to displace the quiet state.

The following do not qualify:

- a generic trend;
- an unconnected draft or proposal;
- ordinary intake backlog;
- a release reminder with no affected answer;
- a cost reminder;
- low-confidence AI inference;
- unsupported ticket SLA claims;
- an internal platform issue the owner cannot fix.

## Action Families

| Family | Qualification | Owning source and resolution |
| --- | --- | --- |
| Launch blocker | Launch proof exists and is not ready. | Activation clears it when factual launch proof becomes ready. |
| Answer correctness risk | Active drift exists or current outcome evidence proves answers need review. | Governance or Answer Tests clears the source condition. |
| Qualified answer gap | Upstream Support Board or mutation logic has already qualified repeated missing-answer work. | Approved answer/proposal workflow clears or changes the source work. |
| High-priority support work | Existing Support Board summary reports qualified high-priority work. | Support Board source status/priority owns resolution. |
| Measured friction | Friction snapshot is `HIGH` or the top entity has escalation evidence. | Friction review routes the owner to supporting questions, signals, and repair paths. |
| Coverage repair | Low coverage is paired with uncovered entities, canonical misses, or qualified repair work. | Governance and Answer Tests own the repair. |
| Source-health uncertainty | Required summaries are missing, invalid, stale, or future-dated. | The source workflow or next scheduled summary restores current evidence. |

Generic Knowledge Intake review, release recording, and billing/cost guidance remain available as destination workflows or commands, but do not consume ranked action slots without a qualifying condition.

## Deterministic Priority

Priority order:

1. Incomplete launch proof before activation.
2. Active drifted-answer risk.
3. Qualified high-priority Support Board work.
4. Qualified Needs Answer work.
5. Explicit failed-resolution or same-session recontact evidence.
6. High-friction entity evidence.
7. Low coverage paired with repair evidence.

Hard rules:

- aggregate uncovered-entity count alone is not `critical`;
- low-confidence inference is never `critical`;
- generic draft, intake, release, or cost reminders never outrank unresolved conditions;
- permission filtering occurs before the final four-action cap;
- one action is primary and at most three are secondary;
- action ordering remains stable for one loaded response.

## Card Contract

Every action card contains:

- text priority, not color alone;
- outcome-based title;
- one-sentence evidence summary;
- why the action is shown;
- admitted source label;
- one primary action;
- AI and Firebase cost boundary where relevant.

The card links to the existing source workflow. It does not carry a manual `Complete` control.

## Quiet State

A complete, current, healthy packet must return zero ranked actions.

Approved copy:

> **Nothing needs your decision right now**
> No current answer risk, qualified support gap, or launch blocker is visible in the latest summaries.

The system must not create release, credit, or maintenance reminders merely to keep the page active.

If source evidence is incomplete or stale, the brief must not show a healthy quiet state. It must identify the missing or stale source and allow a bounded retry.

## Source-Derived Resolution

Daily Brief stores no condition state and no owner disposition.

An item disappears only after its owning source summary no longer proves the condition:

- drift review is resolved through Governance;
- Needs Answer work changes in Support Board;
- launch proof becomes ready in Activation;
- friction or outcome evidence changes in its summary;
- source health becomes current.

There is no generic Mark complete, snooze, dismissal, accepted-risk, or handled-today state in Daily Brief.

## Requirements

1. Render `Today's plan` inside the existing Support Assistant route.
2. Return zero to four qualified actions.
3. Derive the headline and attention count from qualified actions.
4. Keep one primary action and no more than three secondary actions.
5. Use existing summary documents only.
6. Project bounded fields such as `topFailingEntities`, `highPriorityCards`, `frictionLevel`, and `topFrictionEntities` only after strict parsing.
7. Filter every action and destination against current permissions.
8. Link only to existing Answerlattice routes.
9. Keep `I shipped a change`, Refresh, and cost guidance outside the ranked queue.
10. Add no assistant write, action document, collection, scheduler, listener, or model call.
11. Add no raw ticket, conversation, signal, or search-history read.
12. Preserve the existing deterministic Support Assistant question flow.
13. Show factual launch verification from Activation.
14. Keep unavailable metrics unavailable instead of converting them to zero.
15. Treat a complete but empty packet as insufficient evidence until real support activity exists.
16. Fail closed on unknown, malformed, oversized, redirected, or invalid browser responses.

## Access

The route requires `canManageSupport`.

Entry permission does not imply access to every destination. The server removes actions, evidence, launch controls, and optional handoffs whose routes require permissions the caller does not hold.

## Non-Goals

- second Owner Action Center route;
- New assistant task queue, assistant-owned action queue, or action collection;
- generic task management;
- ticket SLA, assignment, or routing expansion;
- live chat automation;
- persistent action interaction state;
- action-detail event warehouse;
- AI-generated daily narrative;
- composite health or priority score;
- automatic answer publication;
- automatic ticket closure;
- LLM deciding priority, truth, or resolution.

## Feature Flags

- `ENABLE_ANSWERLATTICE_FOUNDER_DAILY_BRIEF`
- `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT_ACTIONS`

The optional action flag controls existing Support Board prefill only. It does not create action-center persistence or permit autonomous writes.

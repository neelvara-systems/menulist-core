# Founder Daily Brief Validation

> **Reviewed input:** External "Feature 1 - Owner Action Center" proposal
> **Reviewed:** 2026-07-28
> **Decision:** Improve the existing Founder Daily Brief; do not create a second feature or action store
> **Implementation state:** Documentation decision complete; the code changes identified below are pending the separate code-level pass

## Executive Verdict

The external proposal correctly defines the owner outcome:

> Open Answerlattice, see the few decisions that require attention, handle the most important one, and leave knowing the rest can wait.

It is wrong to describe this as a new feature. The current repository already provides the operating home and most of the required control plane:

- the Answerlattice base route sends launch-ready owners to Daily Brief;
- Daily Brief is first in Support Control navigation;
- the brief reads six compact, exact-workspace summaries;
- the server ranks at most four actions;
- actions are permission-filtered and link to their owning workflow;
- the browser rejects malformed, oversized, redirected, or invalid responses;
- the brief makes no model call and performs no write;
- incomplete, stale, invalid, and future-dated evidence cannot produce a false healthy state.

The useful part of the proposal is stricter action qualification. A Daily Brief item must represent a current, evidence-backed condition that the owner can resolve in an existing Answerlattice workflow. Generic reminders and ordinary backlogs do not qualify.

## Codebase Truth

| Proposal claim | Current source truth | Decision |
| --- | --- | --- |
| Build a default post-activation home | `src/app/(answerlattice)/answerlattice/page.tsx` already redirects a launch-ready owner to `ANSWERLATTICE_ROUTES.SUPPORT_ASSISTANT`. | Already implemented. Keep Activation as the pre-launch home. |
| Put the feature above setup, support, and governance | Daily Brief is first in Support Control and links into those owning areas. | Already implemented as orchestration, not authority. |
| Show no more than five actions | `DAILY_ACTION_LIMIT` is four. | Keep four. A smaller list is better for the solo-founder ICP. |
| Use deterministic prioritization | `buildFounderDailyBrief()` uses fixed rank values and no model. | Keep deterministic precedence; reject an opaque 100-point score. |
| Use one compact summary read | Current runtime uses six exact point reads in one `getAll()` call and a 60-second zero-read process cache. | Keep the six-source packet. Do not add a seventh action-center document merely to reduce six point reads to one. |
| Create an `OwnerAction` collection | No action collection exists. Existing source records own lifecycle. | Reject. It would duplicate source state and add writes, reconciliation, retention, rules, and failure modes. |
| Add snooze, dismiss, accepted-risk, handled-today, and seen states | The current brief is read-only and stores no assistant state. | Reject for this feature. Resolve work at its source; do not turn Daily Brief into task management. |
| Show customer-waiting SLA actions | The compact packet does not contain exact ticket waiting/SLA evidence. Answerlattice doctrine prohibits helpdesk workflow expansion. | Do not claim or build SLA orchestration here. Use existing escalations and qualified Support Board work. |
| Show answer correctness risk | Drift and uncovered-answer counts already create a Governance action. | Improve qualification and wording; aggregate uncovered count alone must not be labeled critical. |
| Show repeated knowledge gaps | Upstream nightly and Support Board systems already qualify and deduplicate recurring misses into governed work. | Consume `needsAnswerCards`; do not repeat raw miss thresholds in Daily Brief. |
| Show release-related review | Drift, release checks, Answer Tests, and Support Board own release impact. | Surface only qualified impact. Remove the generic release reminder from the action queue; retain `I shipped a change` as an explicit owner command. |
| Show widget/runtime failures | Activation proves setup before launch; no ongoing widget-health summary is present in the six-source packet. | Do not invent live widget health. Show source-health uncertainty and link to existing installation verification. |
| Show generic intake review | Current brief surfaces every positive intake review count. | Tighten. Intake is an action only when it blocks launch or is linked upstream to a current support-truth problem. |
| Show a quiet state | The brief currently appends release-safety and cost-guard cards when space remains. | Real gap. Healthy state must return no action cards and say nothing needs the owner's decision. |
| Merge duplicate evidence | Upstream Support Board and mutation-proposal systems already use deterministic source identities. Daily Brief uses stable category IDs. | Reuse upstream deduplication. Do not create a second fingerprint lifecycle. |
| Open a detail drawer and lazily load evidence | Current cards show bounded reason/source evidence and route to the owning screen. | Keep route-based detail. Add a drawer only if real founder testing proves route handoff loses necessary context. |
| Source-derived completion | Current brief has no completion state; refreshed summaries naturally remove cleared conditions. | Accept. Never add a generic Mark complete action. |

## Accepted Owner Contract

An item qualifies for Daily Brief only when all conditions are true:

1. The compact source packet proves a current unresolved condition.
2. The condition affects support truth, launch safety, or a qualified human fallback.
3. The owner can take one concrete action in an existing Answerlattice workflow.
4. The card can explain the evidence and why the condition is shown now.
5. The owning source has a factual condition that clears the item.
6. The item is important enough to displace the quiet state.

The following are not Daily Brief actions:

- a draft with no customer, launch, release, or correctness evidence;
- ordinary article, intake, or proposal backlog;
- a percentage movement with no concrete repair;
- a generic reminder to check releases or credits;
- an AI inference without admitted source evidence;
- a platform problem the client cannot fix;
- a ticket SLA claim not present in the compact packet.

## Deterministic Priority Decision

The code-level target uses explicit precedence, not a composite score:

1. Incomplete launch proof, only before launch or on direct access.
2. Active drifted-answer risk.
3. Qualified high-priority Support Board work.
4. Qualified Needs Answer work.
5. Explicit failed-resolution or same-session recontact evidence.
6. High-friction entity evidence when the snapshot is `HIGH` or contains escalations.
7. Low canonical coverage only when paired with misses, uncovered entities, or qualified repair work.

Rules:

- No count-only uncovered entity card may be `critical`.
- No low-confidence inference may be `critical`.
- Generic intake, release, and cost reminders never consume an action slot.
- Permission filtering happens before the final four-action cap.
- The headline and attention count are derived from qualified actions, not from unrelated raw counters.

## Data and Firebase Decision

No new collection, document family, query, listener, write, index, scheduler, or AI operation is admitted.

The code-level hardening must continue to use:

- `platformSummary/coverage_{tId}_{sId}`;
- `platformSummary/trustMetrics_{tId}_{sId}`;
- `platformSummary/supportBoardSummary_{tId}_{sId}`;
- `platformSummary/frictionSnapshot_{tId}_{sId}`;
- `platformSummary/knowledgeIntakeSummary_{tId}_{sId}`;
- `platformSummary/activation_{tId}_{sId}`.

Useful existing fields that are not fully projected today include:

- `trustMetrics.topFailingEntities`;
- `supportBoardSummary.highPriorityCards`;
- `frictionSnapshot.frictionLevel`;
- `frictionSnapshot.topFrictionEntities`.

Projecting these fields is CPU-only after the same six reads. It does not justify `platformSummary/ownerActionCenter_*` or `answerlattice_ownerActions`.

## Code-Level Gap List

The separate implementation pass should:

1. Remove generic `release-safety` and `cost-guard` cards from the ranked action queue.
2. Return an empty action list for a complete, current, healthy packet.
3. Add a plain quiet-state headline and summary.
4. Include `highPriorityCards` in the admitted metrics contract.
5. Use `topFailingEntities[0]` and `frictionLevel` only as bounded evidence, never as autonomous root-cause truth.
6. Tighten friction qualification to high measured friction or actual escalation evidence.
7. Stop surfacing generic Knowledge Intake backlog unless launch or an upstream qualified problem requires review.
8. Derive the displayed attention count from qualified actions.
9. Keep `I shipped a change`, Refresh, and cost guidance outside the action queue.
10. Expand contract tests for quiet state, noncritical count-only gaps, high-priority Support Board work, and stale evidence.

## Rejected Scope

- new `ownerActions` collection;
- independent action condition and disposition state machines;
- manual completion;
- snooze, dismissal, accepted-risk, and handled-today persistence;
- real-time listeners;
- raw ticket, conversation, signal, or search-history scans on page load;
- SLA ownership, ticket assignment, or helpdesk routing;
- live platform-incident monitoring without a verified source;
- an LLM-authored morning summary;
- an overall health score or 100-point action score;
- automatic canonical publication or ticket closure;
- a second Owner Action Center route or navigation item.

## Final Feature Decision

Feature 1 remains **Founder Daily Brief** in code and documentation. "Owner Action Center" is an external description of its job, not a new product object.

The documentation target is approved. Code work is bounded to qualification, quiet-state, evidence projection, and contract hardening inside the existing six-summary runtime.

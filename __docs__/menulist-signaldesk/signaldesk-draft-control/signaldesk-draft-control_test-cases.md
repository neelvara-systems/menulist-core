# SignalDesk Draft Control - Test Cases

**Status:** Implemented test matrix
**Created:** June 23, 2026
**Last Updated:** July 15, 2026

## Template Tests

| Test | Expected |
| --- | --- |
| Template has unapproved variable | Cannot approve. |
| Template missing unsubscribe slot for email | Cannot approve for email. |
| Template uses banned claim | Cannot approve. |
| Paused template used for draft | Blocked. |

## Draft Tests

| Test | Expected |
| --- | --- |
| Draft without evidence packet | Blocked. |
| Draft cites rejected fact | Blocked. |
| Draft includes blocked source field | Blocked. |
| Draft says guaranteed ranking | Blocked. |
| Draft claims official WhatsApp partnership | Blocked. |
| Draft passes guardrails | Moves to approval queue, not send. |
| Source rights expire or are revoked before settlement | Transaction rejects before draft, approval, queue, audit, or cost effects. |
| Selected evidence/template/CTA becomes inactive before settlement | Transaction rejects instead of persisting stale rendered truth. |
| Target is suppressed or receives prior contact/outcome before settlement | Transaction rejects instead of opening another approval. |
| Two identical draft requests race | Both return the same draft, approval, and packet IDs; only one record of each is written. |
| Exact draft retry after creation | Returns durable existing truth without another backlog, human-review, audit, timeline, or cost increment. |
| Rendered message or governing evidence/policy/CTA/sender input changes | Creates a distinct content-addressed review unit. |
| Source rights expire after draft but before approval | Approval remains pending; no target/export or queue-decrement effect. |
| Draft is missing or linked to another approval/target | Approval fails closed. |
| Approval packet disagrees with draft evidence or target | Approval fails closed. |
| Target is suppressed or receives prior contact before approval | Approval fails closed on transaction-current target state. |
| A newer draft/approval supersedes an older pending unit | Older unit cannot be approved; current unit remains authoritative. |
| Two actual provider sends race for one approval/channel | One owns the durable claim and calls the provider; the other replays completion or becomes review-required. |
| Provider result is ambiguous | Claim becomes unresolved and automatic retry cannot call the provider again. |
| Final persistence acknowledgement is lost | Durable completed claim/export is returned when present; otherwise the claim becomes unresolved. |
| Two owned-email sequence sends race for one handoff step | One owns the durable claim and calls the provider; the other replays completion or becomes review-required. |
| Owned-email provider outcome is ambiguous | Sequence claim becomes unresolved and automatic retry cannot call the provider again. |
| Sender/provider/pause/policy/approval truth changes after handoff creation | Send-time transaction rejects before SMTP execution. |
| Two identical sequencer handoff requests race | Both return one deterministic handoff; only one step, timeline, audit, queue transition, and cost effect is written. |
| Existing blocked handoff is retried with unchanged authority | Returns existing blocked truth without repeated effects. |
| Existing handoff is retried with a different sender | Rejects as an idempotency conflict instead of silently replacing or returning mismatched truth. |
| Two identical assisted channel handoffs race | Both converge on one deterministic export with one conversation/lifecycle/audit/cost effect. |
| Assisted handoff is retried after durable preparation | Returns the same export ID and redacts recipient data without repeated effects. |
| Policy, pause, suppression, prior-contact, sender, or channel-window truth changes before assisted handoff settlement | Transaction retries against current authority and rejects stale preparation. |
| Two identical channel-window updates race | One actor/key transaction writes window, channel health, timeline, audit, and cost truth; the other returns durable replay. |
| Target-scoped channel window names a nonexistent target | Admission rejects before window or channel-health writes. |
| Approval-packet refresh has neither or both owner selectors | API and server reject the request. |
| Approval-packet refresh races a terminal decision | Transaction retries and projects the terminal current approval state. |
| Two identical packet refreshes race | Both return the existing packet ID with no duplicate packet, audit, timeline, or cost truth. |

## AI Tests

| Test | Expected |
| --- | --- |
| AI returns freeform unsupported claim | Blocked. |
| AI omits template version | Blocked. |
| AI uses source field not allowed outbound | Blocked. |

## Mobile Tests

| Test | Expected |
| --- | --- |
| Mobile edits draft | Not available. |
| Mobile approves draft | Not available. |
| Mobile sends draft | Not available. |

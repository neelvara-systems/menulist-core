# SignalDesk Control Room - Compliance Policy

**Status:** Initial policy
**Created:** June 23, 2026

## Principle

The control room exists to stop unsafe growth behavior early. Safety controls must be stronger than growth throughput.

## Incident Types

| Incident | Trigger examples |
| --- | --- |
| `complaint_spike` | Complaint rate crosses threshold. |
| `unsubscribe_spike` | Opt-out rate crosses threshold. |
| `bounce_spike` | Bounce/invalid rate crosses threshold. |
| `source_policy_failure` | Source run violates allowed field or expiry policy. |
| `ai_quality_failure` | Eval failures or overrides spike. |
| `cost_overrun` | Daily cost exceeds planned threshold. |
| `privacy_review` | Payload or operator action needs privacy review. |

## Kill Switch Policy

- Admin role is required.
- Reason is required.
- Audit event is required.
- Scope must be explicit.
- Expiry or review date should be set when practical.
- Clearing a switch requires resolution note.

## Dashboard Safety Rules

- Do not display raw PII in summary cards.
- Do not rank operators by send volume.
- Do not hide suppression or complaint signals behind aggregate success metrics.
- Show stale data as stale.
- Show paused state clearly before operators approve actions.

## Cost Governance

Cost incidents should distinguish:

- AI calls,
- Firestore reads,
- Firestore writes,
- provider sends/events,
- unexpected raw event reads,
- dashboard query regressions.

## Admin Accountability

Every incident action, switch change, threshold override, and manual resolution must be recorded with actor, timestamp, scope, and reason.

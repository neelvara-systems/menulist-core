# SignalDesk Approval Queue - Firebase Cost Plan

**Status:** Initial planning doc
**Created:** June 23, 2026
**Cost impact now:** None.

## Collections

| Collection | Purpose | Normal reads |
| --- | --- | --- |
| `signaldeskApprovalQueue` | Approval list rows and state | Paginated queue |
| `signaldeskApprovalDetails` | Full approval context | Approval detail |
| `signaldeskApprovalEvents` | Review/audit history | Approval detail/audit |

## Read / Write Model

| Flow | Reads | Writes | Notes |
| --- | ---: | ---: | --- |
| Queue list | 1 query | 0 | Paginated summary. |
| Approval detail | 4-10 | 0 | Related target/draft/evidence. |
| Approve | 5-12 | 4-8 | Recheck guards, update approval, write event/audit/snapshot. |
| Reject | 2-5 | 3-6 | Update approval, event, audit. |
| Expiry job | Bounded query | Updates | Cap per run. |

## Indexes

- `signaldeskApprovalQueue`: `status + updatedAt`
- `signaldeskApprovalQueue`: `type + status + updatedAt`
- `signaldeskApprovalQueue`: `targetId + updatedAt`
- `signaldeskApprovalEvents`: `approvalId + createdAt`

## Cost Controls

- Queue reads summaries only.
- Detail reads related docs on demand.
- No real-time listener on all approvals.
- Expiry job bounded.

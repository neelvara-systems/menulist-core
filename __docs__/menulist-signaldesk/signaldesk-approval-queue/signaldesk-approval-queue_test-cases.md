# SignalDesk Approval Queue - Test Cases

**Status:** Initial test matrix
**Created:** June 23, 2026

## Approval Tests

| Test | Expected |
| --- | --- |
| Approve without permission | Blocked. |
| Approve while target suppressed | Blocked. |
| Approve with expired evidence | Blocked. |
| Approve with paused source policy | Blocked. |
| Approve with active kill switch | Blocked. |
| Approve valid draft | Approval, audit, and decision snapshot written. |

## Invalidation Tests

| Test | Expected |
| --- | --- |
| Draft changes after approval | Approval expires. |
| Suppression arrives after approval | Approval expires/blocks action. |
| Evidence expires after approval | Approval expires. |

## Mobile Tests

| Test | Expected |
| --- | --- |
| Mobile approves draft | Not available. |
| Mobile rejects draft | Not available. |
| Mobile sees queue count | Allowed. |

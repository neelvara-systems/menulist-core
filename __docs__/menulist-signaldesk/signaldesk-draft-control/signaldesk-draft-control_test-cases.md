# SignalDesk Draft Control - Test Cases

**Status:** Initial test matrix
**Created:** June 23, 2026

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

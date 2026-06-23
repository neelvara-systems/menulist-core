# SignalDesk Email Rail - Test Cases

**Status:** Initial test matrix
**Created:** June 23, 2026

## Send / Export Tests

| Test | Expected |
| --- | --- |
| Export without approved draft | Blocked. |
| Export suppressed contact | Blocked. |
| Provider send without sender domain ready | Blocked. |
| Provider send without unsubscribe | Blocked. |
| Provider send exceeds daily cap | Blocked or queued. |
| Draft changed after approval | Approval expired, send blocked. |

## Webhook Tests

| Test | Expected |
| --- | --- |
| Hard bounce received | Contact suppressed or held. |
| Complaint received | Contact suppressed and incident/review created. |
| Unsubscribe received | Suppression event created. |
| Webhook signature invalid | Event rejected. |

## Cost Tests

| Test | Expected |
| --- | --- |
| Dashboard reads raw email events | Fails. |
| Provider payload stored raw in Firestore | Fails. |
| Daily summary updates | Dashboard reads summaries. |

## Mobile Tests

| Test | Expected |
| --- | --- |
| Mobile sends email | Not available. |
| Mobile exports email | Not available. |
| Mobile pauses email channel | Allowed with audit. |

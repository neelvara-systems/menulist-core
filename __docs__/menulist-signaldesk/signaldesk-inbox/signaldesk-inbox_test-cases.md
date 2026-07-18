# SignalDesk Inbox - Test Cases

**Status:** Initial test matrix
**Created:** June 23, 2026
**Last Updated:** July 15, 2026

## Functional Tests

| ID | Test | Expected |
| --- | --- | --- |
| INB-T001 | Inbound interested reply arrives | Conversation summary updates and work item is created. |
| INB-T002 | Unsubscribe reply arrives | Suppression is written before follow-up eligibility changes. |
| INB-T003 | Wrong-contact reply arrives | Contact identity is suppressed and target is flagged for review. |
| INB-T004 | Complaint reply arrives | Suppression and control-room incident are created. |
| INB-T005 | Operator overrides classifier | Override reason and audit event are stored. |
| INB-T006 | Two identical reply captures race | One actor/key claim owns one message, classification, conversation transition, incident/pause, backlog, audit, and cost effect; the other returns durable replay. |
| INB-T007 | Same reply key is reused with changed target/channel/message | Rejected as an idempotency conflict with no new effects. |
| INB-T008 | Reply arrives after target is converted | Reply and safety truth are retained without downgrading the target from converted. |

## Cost Tests

| ID | Test | Expected |
| --- | --- | --- |
| INB-T010 | Load inbox list | Reads summaries only. |
| INB-T011 | Open conversation detail | Reads paginated messages only for that conversation. |
| INB-T012 | Filter by human review | Uses indexed summary query. |

## Compliance Tests

| ID | Test | Expected |
| --- | --- | --- |
| INB-T020 | Attempt follow-up after DNC | Blocked. |
| INB-T021 | Reopen suppressed conversation as operator | Blocked unless admin. |
| INB-T022 | Classifier marks complaint low confidence | Human review and incident path still trigger. |

## Mobile Tests

| ID | Test | Expected |
| --- | --- | --- |
| INB-T030 | Mobile inbox summary | Counts render without message body fetch. |
| INB-T031 | Mobile emergency suppression | Requires admin confirmation and audit event. |
| INB-T032 | Mobile send attempt | Not available. |

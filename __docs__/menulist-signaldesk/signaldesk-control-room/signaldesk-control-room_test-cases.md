# SignalDesk Control Room - Test Cases

**Status:** Initial test matrix
**Created:** June 23, 2026

## Functional Tests

| ID | Test | Expected |
| --- | --- | --- |
| CTRL-T001 | Dashboard loads | Reads control-room summaries, not raw event streams. |
| CTRL-T002 | Admin activates global pause | Kill switch is active and audited. |
| CTRL-T003 | Non-admin activates kill switch | Blocked. |
| CTRL-T004 | Complaint threshold is crossed | Incident is created and affected channel pauses when configured. |
| CTRL-T005 | Stale summary exists | Dashboard shows stale state, not healthy state. |

## Cost Tests

| ID | Test | Expected |
| --- | --- | --- |
| CTRL-T010 | Daily AI cost exceeds threshold | Cost incident is created. |
| CTRL-T011 | Dashboard regression reads raw events | Test fails. |
| CTRL-T012 | Incident list grows large | Pagination is required. |

## Safety Tests

| ID | Test | Expected |
| --- | --- | --- |
| CTRL-T020 | Sending while global pause active | Blocked. |
| CTRL-T021 | Source import while source pause active | Blocked. |
| CTRL-T022 | AI scoring while AI pause active | Blocked. |
| CTRL-T023 | Clear kill switch without reason | Blocked. |

## Mobile Tests

| ID | Test | Expected |
| --- | --- | --- |
| CTRL-T030 | Mobile system status | Shows state and active pauses. |
| CTRL-T031 | Mobile emergency global pause | Admin confirmation, reason, and audit event required. |
| CTRL-T032 | Mobile threshold edit | Not available. |

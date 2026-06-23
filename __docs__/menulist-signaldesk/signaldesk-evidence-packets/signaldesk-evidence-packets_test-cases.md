# SignalDesk Evidence Packets - Test Cases

**Status:** Initial test matrix
**Created:** June 23, 2026

## Evidence Creation Tests

| Test | Expected |
| --- | --- |
| Evidence cites blocked source field | Blocked. |
| Evidence has no source policy ref | Blocked. |
| Evidence confidence is low | Target held or human review. |
| Evidence includes invented menu/pricing | Blocked. |
| Evidence expires | New draft/send blocked until refresh. |

## Decision Snapshot Tests

| Test | Expected |
| --- | --- |
| Draft created without decision snapshot | Fails. |
| Send/export without send decision snapshot | Fails. |
| Decision snapshot lacks evidence refs | Blocked. |
| Decision snapshot modified after write | Fails; append replacement only. |

## Compliance Tests

| Test | Expected |
| --- | --- |
| Outbound uses rejected fact | Blocked. |
| Outbound uses fact not allowed for outbound | Blocked. |
| Target disputes evidence | Target paused and review item created. |

## Mobile Tests

| Test | Expected |
| --- | --- |
| Mobile approves evidence | Not available. |
| Mobile views raw evidence with PII | Not available. |
| Mobile shows evidence queue count | Allowed. |

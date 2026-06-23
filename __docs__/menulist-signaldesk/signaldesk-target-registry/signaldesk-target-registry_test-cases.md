# SignalDesk Target Registry - Test Cases

**Status:** Initial test matrix
**Created:** June 23, 2026

## Import Tests

| Test | Expected |
| --- | --- |
| Import row missing source policy | Row held or import blocked. |
| Import row has duplicate business key | Existing target linked or row held. |
| Import row has suppressed email/phone hash | Target marked suppressed/held. |
| Import exceeds row cap | Import blocked. |
| Import includes raw restricted fields | Fields dropped or row held by policy. |

## Target State Tests

| Test | Expected |
| --- | --- |
| Target without source moves to `ready` | Fails. |
| Suppressed target moves to `drafted` | Fails. |
| Duplicate unresolved target moves to `ready` | Fails. |
| Target rejected | No send/export available. |
| State change succeeds | Target summary, target detail, state event, and audit update. |

## Contact Tests

| Test | Expected |
| --- | --- |
| List page displays raw email | Fails. |
| List page displays raw phone | Fails. |
| Unauthorized contact reveal | Blocked. |
| Authorized contact reveal without reason | Blocked. |
| Authorized contact reveal with reason | Allowed and audited. |

## Cost Tests

| Test | Expected |
| --- | --- |
| Target list reads detail collection | Fails. |
| Import scans all targets for every row | Fails; must use compact dedupe keys/indexes. |
| Target detail reads all messages | Fails; inbox owns messages. |

## Mobile Tests

| Test | Expected |
| --- | --- |
| Mobile creates target | Not available. |
| Mobile reveals contact | Not available. |
| Mobile changes state | Not available. |
| Mobile shows target counts | Allowed. |

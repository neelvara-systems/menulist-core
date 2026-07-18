# SignalDesk Source Policy - Test Cases

**Status:** Policy matrix plus implemented Patch R1 retention emulator coverage
**Created:** June 23, 2026

## Policy Tests

| Test | Expected |
| --- | --- |
| Source run starts without policy | Blocked. |
| Source policy status is draft | Run blocked. |
| Source policy status is paused | Run blocked. |
| Source policy has no retention | Approval blocked. |
| Source policy has empty allowed/blocked field decision | Approval blocked. |
| Policy changes after run | New version created; old run keeps old version. |

## Field Use Tests

| Test | Expected |
| --- | --- |
| Blocked field enters target summary | Fails. |
| Blocked field enters AI prompt | Fails. |
| Field not allowed for outbound appears in message | Blocked. |
| Source with `mayUseForOutreach=false` starts send/export | Blocked. |

## Provider Tests

| Test | Expected |
| --- | --- |
| Google/Places-like source used for prospect truth | Fails. |
| GBP API used for lead generation | Fails. |
| FHRS/FHIS source used as contact permission | Fails; source/evidence may be allowed, but outreach contact use needs a separate approved contact source. |
| Foursquare PAYG source used to contact business | Fails. |
| Apify-like source used without policy | Fails. |
| Apify Source Broker used with provider policy, owner approval, env Actor, and budget cap | Runs as candidate discovery/evidence only; contact fields are stripped unless policy allows contact use. |

## Mobile Tests

| Test | Expected |
| --- | --- |
| Mobile approves policy | Not available. |
| Mobile starts source run | Not available. |
| Mobile pauses source provider | Allowed with audit. |

## Patch R1 Retention Lifecycle Tests

Focused emulator coverage lives in `scripts/verification/test-signaldesk-source-data-lifecycle.ts`.

| Test | Expected |
| --- | --- |
| Expired policy with dependent target | Policy becomes inactive and target is held/scrub-pending before any dependent value is removed. |
| Reconciliation resumes after zero/partial step budget | Stored phase/cursor resumes and exact counters are written once. |
| Due provider retention | Provider ID/URL is replaced by a hash tombstone in the same transaction that holds the target. |
| Explicit provider negative | Only status `blocked`/`expired` with lifecycle state `scrub_ready` enters the negative pipeline. |
| Active and already-revoked outcome route tokens | Active token is revoked by the lifecycle; an existing revocation remains intact; both retained target display names are scrubbed. |
| Unsent draft, approval, handoff, step, and export | Personalized content is removed and delivery is rejected/stopped/blocked. |
| Sent or inbound communication | Content survives and receives `legalRetentionReviewRequired`; it is not silently deleted. |
| Suppression, outcome, idempotency, and audit truth | Survives unchanged. |
| Foreign-product dependency with same target ID | Counted as foreign and never mutated. |
| Malformed SignalDesk dependency followed by clean target | Malformed target is failed/retried; later clean target completes without starvation. |
| Fixed poison document after retry delay | Failed target rearms and completes from stored progress. |
| Stale failure writer after a fresh target observation | Authority hash mismatch prevents the stale failure from clobbering fresh state. |
| Same-policy renewal without re-import | Completed/held target stays tombstoned; source fields are not revived. |
| Authority cap exceeded | Overflow flag is true and only the bounded page is processed. |
| Concurrent scheduler invocations | Each independently leased task runs once; overlap and same-hour repeats skip safely. |

The existing `scripts/verification/test-signaldesk-proof-permission-lifecycle.ts` suite also covers the refactored multi-task scheduler so the proof lifecycle remains isolated and idempotent.

Validation evidence on July 15, 2026:

- SignalDesk Functions TypeScript build: passed.
- Source-data lifecycle Firestore emulator suite: passed on isolated local ports.
- Existing proof-permission lifecycle Firestore emulator suite: passed on isolated local ports.

The source-data emulator suite is intentionally demo-project-only and refuses to run unless `FIRESTORE_EMULATOR_HOST` is present. Firebase deployment remains blocked until root writers and action guards implement the integration contract in the implementation document.

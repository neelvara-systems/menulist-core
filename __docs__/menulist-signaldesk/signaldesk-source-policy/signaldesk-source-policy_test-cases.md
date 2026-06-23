# SignalDesk Source Policy - Test Cases

**Status:** Initial test matrix
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
| Foursquare PAYG source used to contact business | Fails. |
| Apify-like source used without policy | Fails. |
| Apify Source Broker used with provider policy, owner approval, env Actor, and budget cap | Runs as candidate discovery/evidence only; contact fields are stripped unless policy allows contact use. |

## Mobile Tests

| Test | Expected |
| --- | --- |
| Mobile approves policy | Not available. |
| Mobile starts source run | Not available. |
| Mobile pauses source provider | Allowed with audit. |

# SignalDesk Foundation - Test Cases

**Status:** Runtime regression matrix
**Created:** June 23, 2026
**Runtime reconciled:** July 15, 2026

## Access Tests

| Test | Expected |
| --- | --- |
| Unauthenticated user opens `/signaldesk` | Blocked. |
| MenuList owner account opens `/signaldesk` | Blocked unless explicitly internal team member. |
| Read-only analyst opens dashboard | Allowed. |
| Read-only analyst reveals contact | Blocked. |
| Operator edits role policy | Blocked. |
| Founder admin edits role policy | Allowed and audited. |
| Founder admin adds partner by login email | Allowed and audited. |
| Founder admin changes partner role | Allowed and audited. |
| Founder admin deactivates partner | Allowed and audited. |
| Founder admin deactivates own active access | Blocked. |
| Mobile edits team access | Blocked. |

## Audit Tests

| Test | Expected |
| --- | --- |
| Contact reveal succeeds | Audit event written. |
| Kill switch activates | Kill switch update and audit event written. |
| Policy changes | Audit event written. |
| Send/export action lacks audit path | Fails. |
| Audit page requests all records without pagination | Fails. |

## Kill Switch Tests

| Test | Expected |
| --- | --- |
| Global outbound switch active | All send/export actions blocked. |
| Email switch active | Email send/export blocked, other safe actions unaffected. |
| AI worker switch active | Worker does not run. |
| Source-provider switch active | Source run blocked. |
| Unauthorized user deactivates switch | Blocked. |
| All eleven governed scopes are active | Overview returns eleven strict rows and `activeKillSwitchCount` is eleven. |
| Exact or concurrent pause request retries | One canonical switch, one audit, and one idempotency claim are written; changed facts under the key conflict. |
| Opposite transitions race | Firestore serializes both complete transitions; final state is one valid transition and neither writes derived channel health. |
| Active pause is left unattended | It remains active until an authorized explicit clear; no expiry field silently resumes work. |
| Automatic complaint/webhook pause exists | Overview derives it from the deterministic scope document without relying on a stale control-summary count. |
| Wrong-product, mismatched-ID, invalid-status, or malformed-timestamp switch exists | Row is excluded from overview and cannot be overwritten by the protected setter. |
| Provider channel health is healthy before pause/clear | It remains healthy; pause state is reported separately. |
| Pre-contract control, queue, or daily-cost summary lacks the new identity fields | Its valid counts/costs survive the read and the exact canonical document is migrated once to `pId = SD` plus its document identity; a missing historical queue timestamp is materialized. |
| More than ten open incidents exist | `openIncidentCount` remains exact and the bounded list does not change the count. |
| More than fifty valid open incidents exist | List returns at most fifty; exact count remains larger than the list. |
| Foreign or malformed open incident exists | It is not projected as valid SignalDesk incident truth. |
| A 501st matching open-incident row exists, including a malformed tail row | Overview fails with `SIGNALDESK_INCIDENT_STRICT_COUNT_LIMIT_EXCEEDED`; it never approximates the count from unvalidated rows. |

## Mobile Tests

| Test | Expected |
| --- | --- |
| Mobile activates global pause | Allowed with confirmation and audit. |
| Mobile repeatedly attempts a forbidden clear/configuration | Write limiter runs before any blocked-action audit write. |
| Mobile reveals contact | Not available. |
| Mobile sends/export | Not available. |
| Mobile edits roles | Not available. |

## Public Exposure Tests

| Test | Expected |
| --- | --- |
| Public route exists for SignalDesk | Fails. |
| SignalDesk URL appears in public sitemap | Fails. |
| Public visitor can inspect target data | Fails. |
| Public visitor can inspect source data | Fails. |

# SignalDesk Foundation - Test Cases

**Status:** Runtime regression matrix
**Created:** June 23, 2026
**Runtime reconciled:** July 21, 2026

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
| Founder session still says `PLATFORM` after current platform role is removed | Blocked on the next request. |
| Active SignalDesk member's current MenuList user becomes blocked, deleted, deactivated, auth-disabled, or session-revoked | Blocked on the next request. |
| Two membership rows match the same user ID or canonical email | Access fails closed. |
| Human team mutation submits `system-worker` | Rejected before write. |
| Existing email-only member changes submitted email while deactivating self | Blocked using persisted identity. |
| Two concurrent creates claim the same canonical email with different user IDs | Exactly one succeeds; the other conflicts; one membership exists. |
| Explicit update names a missing team-member ID | Rejected; no replacement row is created. |
| Mobile edits team access | Blocked. |
| Distributed limiter provider is unavailable | Protected overview, workspace, action and kill-switch routes return bounded `503 RATE_LIMIT_UNAVAILABLE` before membership/permission reads or audit writes. |
| Actor exceeds an established route/action quota | The route returns bounded `429 RATE_LIMITED` with retry metadata before membership/permission reads or audit writes. |

## Audit Tests

| Test | Expected |
| --- | --- |
| Contact reveal succeeds | Audit event written. |
| Kill switch activates | Kill switch update and audit event written. |
| Policy changes | Audit event written. |
| Send/export action lacks audit path | Fails. |
| Audit page requests all records without pagination | Fails. |
| Audit page contains more than fifty valid events | First response returns fifty; explicit Load older requests the next page. |
| Several audit events share the cursor timestamp | Document-ID tie-breaker returns every event exactly once across pages. |
| Foreign-product or malformed audit row appears at the page head | Row is omitted, bounded diagnostics are emitted, and valid rows fill the page within the scan ceiling. |
| Cursor is partial, malformed, oversized, or supplied to a non-audit section | Request is rejected before workspace data access. |
| Audit caller detail contains target/message/contact/operator text | Durable row stores only event classification and bounded entity identity. |
| Contact reveal request is replayed after prepared handoff exists | Replay returns no raw recipient and writes no second reveal audit. |

## Kill Switch Tests

| Test | Expected |
| --- | --- |
| Global outbound switch active | All send/export actions blocked. |
| Email switch active | Email send/export blocked, other safe actions unaffected. |
| AI worker switch active | Worker does not run. |
| Source-provider switch active | Source run blocked. |
| Unauthorized user deactivates switch | Blocked. |
| All eleven governed scopes are active | Overview returns eleven strict rows and `activeKillSwitchCount` is eleven. |
| Kill-switch transition is audited | Audit stores only the stable activate/deactivate event classification; operator reason remains on the switch state. |
| Inactive scope is reactivated | Prior deactivation actor/time are cleared from the active state. |
| Mobile submits a scoped pause or any clear | Route rejects it; only confirmed `global-outbound` activation is admitted. |
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
| `menulist.ai` requests `/signaldesk` or `/signaldesk/signin` | Returns noindexed `404`. |
| `menulist.ai` requests `/api/signaldesk/overview` | Returns noindexed `404` before SignalDesk auth/API handling. |
| Dedicated SignalDesk host requests `/` or `/signaldesk` | Rewrites/renders the protected SignalDesk shell. |
| Localhost requests `/signaldesk` | Retains the path-based development flow. |
| `menulist.digital` requests approved `/sd` alias | Retains the SignalDesk alias rewrite and product headers. |

## Firebase Project Isolation Tests

| Test | Expected |
| --- | --- |
| App-server mode/project/credentials are absent or conflicting | Initialization fails before Firebase access. |
| Functions runtime resolves `menulist-signaldesk-qa` or `menulist-signaldesk` | Allowed. |
| Functions emulator resolves `demo-signaldesk*` | Allowed. |
| Functions runtime resolves MenuList, Answerlattice, CampaignCue, or another project | Rejected before Admin initialization. |
| `FIREBASE_CONFIG`, `GCLOUD_PROJECT`, and `GOOGLE_CLOUD_PROJECT` disagree | Rejected as conflicting project authority. |
| Existing default Admin app project differs from resolved SignalDesk project | Rejected; the app is not reused. |

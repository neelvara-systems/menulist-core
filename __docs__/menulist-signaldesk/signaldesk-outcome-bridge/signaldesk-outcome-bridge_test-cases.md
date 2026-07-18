# SignalDesk Outcome Bridge - Test Cases

**Status:** Runtime regression matrix; local emulator verified
**Created:** June 23, 2026
**Runtime reconciled:** July 15, 2026

## Functional Tests

| ID | Test | Expected |
| --- | --- | --- |
| OUT-T001 | Create route token for approved action | Token is scoped, expiring, and linked to target/action. |
| OUT-T002 | Record current-list outcome through token | Outcome event and attribution touch are created. |
| OUT-T003 | Duplicate outcome event arrives | Summary count is not inflated. |
| OUT-T004 | Expired or revoked token is used for a new event | Event is rejected without outcome writes. |
| OUT-T005 | Manual outcome is entered | Evidence note and operator audit are required. |
| OUT-T006 | Exact signed event retries after token revocation | Retry remains a duplicate and does not inflate summaries. |
| OUT-T007 | Same event key carries changed facts | Request fails with an idempotency conflict. |
| OUT-T008 | Signed activation is accepted | Outcome retains route provenance and one deterministic direct attribution touch is written. |
| OUT-T009 | Payload contains an unknown field | Strict boundary validation rejects the payload. |
| OUT-T013 | Target suppression changes before route-token settlement | Transaction retries against current target authority and creates no active route token. |
| OUT-T014 | Two identical non-activation outcomes race | One operation claim owns one event, summary increment, target/attribution projection, audit, control, and cost effect; the other returns durable replay. |
| OUT-T015 | Manual outcome omits its operation key | Request is rejected before persistence. |
| OUT-T016 | Two identical route-token requests race | One token/claim is created; one call owns the write and one returns the exact same opaque token as a duplicate. |
| OUT-T017 | Same actor/key retries route creation with changed channel/action/CTA/template | Request fails with a route-token idempotency conflict. |
| OUT-T018 | Another actor reuses the same route operation key | Actor-bound claim identity is different and cannot replay the first actor's token. |
| OUT-T019 | Exact route creation retries after target lifecycle becomes pending | Original token is returned as a duplicate; a new operation key is rejected. |
| OUT-T022 | Exact accepted outcome retries after target cleanup and route revocation | Existing claim/event returns `duplicate`; no summary, touch, target, route, audit, control, or cost effect repeats. |
| OUT-T023 | New outcome targets pending, failed, completed, or expired source truth | Request is rejected before writes. |
| OUT-T024 | Target policy/run lineage or current evidence is missing/stale | Route and outcome admission fail closed. |
| OUT-T025 | Demand outcome supplies an invented or cross-target demand ID | Request is rejected before writes. |
| OUT-T026 | Manual and demand outcomes share target/type/channel/day | Two source-scoped summaries remain independent. |
| OUT-T027 | Persisted summary points to a missing or mismatched latest event | Summary is excluded and a bounded diagnostic is emitted. |
| OUT-T028 | More than one page of malformed recent summaries precedes valid truth | Bounded pagination reaches and returns the older valid coupled summary. |
| OUT-T029 | Summary is serialized to a workspace/API client | Internal `latestOutcomeEventId` linkage is absent from the DTO. |
| OUT-T033 | Thirty-one malformed activation summaries sort ahead of an older valid coupled activation | Qualification remains customer/won and activation-watch refresh remains activated using bounded transaction-current fill-through. |
| OUT-T034 | Outcome settlement crosses UTC midnight | Event timestamp and source-scoped summary day/ID derive from one transaction-attempt instant and stay coupled. |
| OUT-T035 | Source-data lifecycle tombstones a revoked route after an outcome was accepted | Exact completed metadata parses strictly and the accepted signed retry returns `duplicate`; partial metadata or an active retained route is rejected. |
| OUT-T036 | Retained conversation receives post-retention inbound or rights/complaint communication | Scheduler tombstone and later legal-review merge both parse; internal lifecycle/legal fields do not enter the client DTO. |

## Boundary Tests

| ID | Test | Expected |
| --- | --- | --- |
| OUT-T010 | Attempt to write MenuList store truth | Blocked by bridge policy. |
| OUT-T011 | Attempt to publish MenuList output from SignalDesk | Blocked. |
| OUT-T012 | Signed payload target disagrees with its route token | Fails validation before outcome persistence. |
| OUT-B013 | Route/event/summary/claim/touch contains a foreign product or unexpected field | Strict parser rejects the persisted authority row. |
| OUT-B014 | Manual action omits target or evidence | Strict action schema rejects the request before workflow execution. |

## Cost Tests

| ID | Test | Expected |
| --- | --- | --- |
| OUT-T020 | Dashboard load | Reads summaries only. |
| OUT-T021 | Target outcome detail | Reads bounded target event stream. |

## Mobile Tests

| ID | Test | Expected |
| --- | --- | --- |
| OUT-T030 | Mobile outcome summary | Read-only summary renders. |
| OUT-T031 | Mobile route token creation | Not available. |
| OUT-T032 | Desktop manual outcome form lacks target/evidence | Submit remains disabled; both values are projected explicitly when enabled. |

## Focused Local Commands

```bash
npx ts-node --compiler-options '{"module":"CommonJS","target":"ES2022"}' -r tsconfig-paths/register scripts/verification/test-signaldesk-outcome-contracts.ts
GCLOUD_PROJECT=demo-signaldesk-outcome-route firebase emulators:exec --only firestore --project demo-signaldesk-outcome-route --config firebase-signaldesk-outcome-route.test.json "node scripts/verification/test-signaldesk-outcome-route-emulator.js"
node scripts/verification/verify-signaldesk-runtime.js
```

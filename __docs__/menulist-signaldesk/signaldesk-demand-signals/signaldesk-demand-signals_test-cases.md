# SignalDesk Demand Signals - Test Cases

**Status:** Current regression matrix
**Created:** June 23, 2026
**Runtime reconciled:** July 28, 2026

## Runtime Tests

| ID | Test | Expected |
| --- | --- | --- |
| DEM-T001 | Two identical captures race | One six-write owner and one durable replay. |
| DEM-T002 | Same actor/key changes type, surface, or target | Idempotency conflict; no second event/count. |
| DEM-T003 | Target-scoped request supplies spoofed name | Strict current target supplies canonical name. |
| DEM-T004 | Target is absent, foreign product, or malformed | Reject before event/summary/claim writes. |
| DEM-T005 | General request supplies target name without target ID | Reject before Firestore work. |
| DEM-T006 | Deterministic summary is foreign, malformed, or mismatched | Entire transaction fails; no partial event. |
| DEM-T007 | Exact retry occurs on a later UTC day | Replay derives and validates the original event-day summary. |
| DEM-T008 | Replay claim exists but event/summary is missing or malformed | Fail closed instead of acknowledging duplicate. |
| DEM-T009 | Suppressed target produces compact demand | Signal is retained; suppression remains unchanged and no outreach starts. |
| DEM-T010 | Demand feature flag is off | Operator and downstream demand writes are blocked/skipped. |
| DEM-T011 | Persisted timestamp has a throwing getter, Proxy trap, throwing method, non-finite value, or out-of-range date | The exact event, summary, or claim contract error is returned; no arbitrary exception escapes and no write proceeds. |
| DEM-T012 | A previously validated timestamp later becomes invalid | Replay-day derivation fails with `DEMAND_SIGNAL_EVENT_INVALID`; it never acknowledges the retry or addresses a different summary. |

## Surface Tests

| ID | Test | Expected |
| --- | --- | --- |
| DEM-T020 | Desktop operator lacks `target.review` | Capture control disabled; API denies independently. |
| DEM-T021 | Mobile requests Attribution or capture | Workspace/action rejected; dashboard overview remains read-only. |
| DEM-T022 | Workspace reads summaries | Strict bounded projection; malformed rows excluded; raw events not returned. |
| DEM-T023 | Content/trust owner metrics add demand | General summary uses null target identity and exact cost includes summary/control writes. |

## Focused Commands

```bash
npm run test:signaldesk:demand-signals-boundary
npm run test:signaldesk:demand-signal-contracts
npm run test:signaldesk:workspace-contracts
npm run test:signaldesk:workspace-client-contracts
npm run verify:signaldesk
```

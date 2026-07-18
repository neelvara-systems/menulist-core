# Platform Cost Posture Test Cases

## API

- Platform user can call `/api/platform/cost-posture` and receives data.
- Non-platform user cannot call the route.
- `days=0` returns `400`.
- `days=91` returns `400`.
- Omitted `days` defaults to 30.
- Disabled `ENABLE_PLATFORM_COST_POSTURE` returns `404`.

## Data

- Empty collections produce zero totals and source coverage marked empty.
- SAFE_MODE active changes posture to action required unless setup-required billing export blocks final accuracy.
- Cost/usage alerts appear in recent alerts when present.
- Extraction operations with `realCostPaise` are summed.
- Extraction operations without `realCostPaise` contribute zero provider cost; `totalCharge` remains an owner-charge fallback only.
- Business Health answer events sum provider calls, internal cost, owner charge, and observed Firestore reads.
- Missing, malformed, stale, and future timestamps do not enter a selected-period total.
- Negative, non-finite, coercible-string, unsafe, and overflow-producing metrics do not corrupt totals.
- An explicit extraction `providerCallCount` is used when present; otherwise one operation row is the documented proxy.
- A response whose `periodDays` differs from the request is rejected.
- Malformed SAFE_MODE or row timestamps, reversed period boundaries, negative totals, and fractional counters are rejected by the browser DAL.
- Changing lookback while a request is in flight aborts the older request; an older response cannot overwrite the current selection.
- Failed current refresh clears stale posture data.

## UI

- `/platform/cost-posture` renders for platform users.
- The refresh button reloads the API.
- Source rows link to their detailed platform screens.
- Guardrail rows show setup/action links.
- The billing export guardrail never presents known signals as a whole Firebase bill.

## Navigation

- `/ops` shows a Cost Posture button.
- Platform settings shows a Cost Posture tab for platform users.
- Owner users do not see the Platform settings Cost Posture tab.

## Firebase Cost

- No writes occur.
- No collection group scan across `menulistAiOperations/{tId}/{sId}` occurs.
- No scheduler is created.
- Reaching a source limit warns that totals can be partial without issuing a probe read.

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
- Extraction operations without `realCostPaise` fall back to `totalCharge`.
- Business Health answer events sum provider calls, internal cost, owner charge, and observed Firestore reads.

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

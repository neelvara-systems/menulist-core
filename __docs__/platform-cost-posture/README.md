# Platform Cost Posture

Internal platform view for cost posture across MenuList operational surfaces.

This feature exists because Firebase and AI cost needs one platform-owned place to see current signals, gaps, and next actions. It is not an owner dashboard feature, and it is not a replacement for Cloud Billing export. Until Cloud Billing export to BigQuery is enabled, the screen shows known internal cost signals only.

## Current Scope

- Route: `/platform/cost-posture`
- Audience: current persisted MenuList platform users only; a signed role claim alone is insufficient
- Data access: server-side Admin SDK through `/api/platform/cost-posture`
- Refresh model: manual fetch-on-open and manual refresh
- Write behavior: read-only
- Public/owner exposure: none

Source gate: `npm run verify:platform-cost-posture-boundary` locks platform-only API admission, bounded Admin SDK source reads, strict period/cost aggregation, the 256KB browser response guard, fixed failure copy, stale-request cancellation, desktop navigation, the platform-only mobile wrapper, timestamp parser diagnostics, and docs parity. The verifier includes pure aggregation and browser-contract regression tests. It does not run Firestore reads/writes, provider calls, browser smoke, Firebase deploy, or Vercel deploy.

The API applies a fail-closed DATA_READ limit and re-reads the exact current platform user before any cost/config/alert source read. Limiter provider outage returns 503; role/lifecycle/identity/revocation drift returns 403.

## Signals Included

- SAFE_MODE and alert state from `ops_config/system`
- Recent cost and usage alerts from `systemAlerts`
- Menu extraction cost samples from `MENULIST_AI_OPERATIONS`
- Business Health answer cost samples from `ownerBusinessAssistantAnswerEvents`
- Billing-export readiness from the production launch prerequisite docs

Only rows with a valid timestamp inside the requested start/end window contribute to totals. Provider cost uses `realCostPaise` only; legacy `totalCharge` can supply owner charge but must never be relabeled as provider cost. Invalid, negative, non-finite, coercible-string, and overflowing numeric fields are omitted from the affected metric.

## Existing Platform Screens

- `/ops` remains the control room and links to this posture screen.
- `/ops/extraction` remains the detailed extraction monitor.
- `/platform/owner-business-assistant` remains the detailed Business Health monitor.
- `/transactions` remains the AI operation history surface.
- `/platform/answerlattice-intake` remains the Answerlattice intake monitor.

## Non-Goals

- No owner-facing cost analytics.
- No Firestore `ops_daily_cost` or app-side billing mirror.
- No scheduler for cost baselines.
- No claimed whole Firebase bill forecast before Cloud Billing export exists.

## Related Docs

- `__docs__/platform-cost-posture/platform-cost-posture_spec.md`
- `__docs__/platform-cost-posture/platform-cost-posture_impl.md`
- `__docs__/platform-cost-posture/platform-cost-posture_firebase.md`
- `__docs__/cost-self-protection/README.md`
- `__docs__/production-readiness/launch-prerequisites.md`
- `__docs__/ops-control-room/README.md`

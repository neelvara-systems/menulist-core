# Platform Cost Posture

Internal platform view for cost posture across MenuList operational surfaces.

This feature exists because Firebase and AI cost needs one platform-owned place to see current signals, gaps, and next actions. It is not an owner dashboard feature, and it is not a replacement for Cloud Billing export. Until Cloud Billing export to BigQuery is enabled, the screen shows known internal cost signals only.

## Current Scope

- Route: `/platform/cost-posture`
- Audience: platform users only
- Data access: server-side Admin SDK through `/api/platform/cost-posture`
- Refresh model: manual fetch-on-open and manual refresh
- Write behavior: read-only
- Public/owner exposure: none

Source gate: `npm run verify:platform-cost-posture-boundary` locks platform-only API admission, bounded Admin SDK source reads, the 256KB browser response guard, fixed failure copy, desktop navigation, the platform-only mobile wrapper, and docs parity. The verifier does not run Firestore reads/writes, provider calls, browser smoke, Firebase deploy, or Vercel deploy.

## Signals Included

- SAFE_MODE and alert state from `ops_config/system`
- Recent cost and usage alerts from `systemAlerts`
- Menu extraction cost samples from `MENULIST_AI_OPERATIONS`
- Business Health answer cost samples from `ownerBusinessAssistantAnswerEvents`
- Billing-export readiness from the production launch prerequisite docs

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

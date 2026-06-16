# Platform Cost Posture Implementation

## Files

- `src/app/(main)/platform/cost-posture/page.tsx`
- `src/app/api/platform/cost-posture/route.ts`
- `src/components/templates/main-app/platform/costPosture/index.tsx`
- `src/database/ops/costPosture.ts`
- `src/lib/ops/costPostureTypes.ts`
- `src/config/features.ts`

## API

`GET /api/platform/cost-posture?days=30`

The route is platform-auth protected and force dynamic. It uses Admin SDK reads so the browser never receives direct Firestore read permissions for cross-platform cost posture.

Validated query:

- `days`: integer, minimum 1, maximum 90, default 30

Read limits:

- `ops_config/system`: 1 document
- `systemAlerts`: latest 30 alerts
- `MENULIST_AI_OPERATIONS`: latest 300 extraction operations
- `ownerBusinessAssistantAnswerEvents`: latest 200 answer events

## Response Shape

The response returns:

- `generatedAt`
- `periodDays`
- `periodStart`
- `status`
- `billingExport`
- `safeMode`
- `totals`
- `signals`
- `alerts`
- `guardrails`
- `sourceCoverage`

## UI

The screen uses Ant Design platform dashboard patterns:

- compact status header
- summary statistics
- source table
- guardrail table
- recent cost/usage alerts
- source coverage cards

No charts are required for v1. The detail screens remain the canonical workflow surfaces.

## Integration

- `/ops` links to `/platform/cost-posture`.
- Platform settings adds a Cost Posture tab.
- The feature is controlled by `FEATURE_FLAGS.ENABLE_PLATFORM_COST_POSTURE`.

## Failure Behavior

- Invalid query returns `400`.
- Non-platform access is denied by `withPlatformAuth`.
- Disabled flag returns `404`.
- Route errors are logged through the secure logger and return a generic `500`.
- UI errors show a platform-only alert/message and do not retry automatically.

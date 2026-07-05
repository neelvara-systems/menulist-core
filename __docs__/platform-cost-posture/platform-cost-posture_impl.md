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

Unexpected route, source-read, and `ops_config/system` read failures use `platform_cost_posture_route_failed`, `platform_cost_posture_source_read_failed`, and `platform_cost_posture_system_config_read_failed` runtime diagnostics. Context is limited to bounded request path, user ID presence/length, source collection/order-field presence/length, read limits, query days, and source error name/code/status.

Timestamp parser diagnostics use `platform_cost_posture_timestamp_parse_failed` when a timestamp-like value throws during conversion. The API keeps the existing fallback by omitting that timestamp from the read model, logs only bounded value-shape metadata, caps repeated shape reports, and does not log raw timestamp values or source documents.

The browser DAL parses route responses through `readPlatformCostPostureResponseJson()` with a 256KB cap. Malformed or oversized route JSON logs `platform_cost_posture_response_parse_failed` with days, response status, response OK flag, and response cap only. Non-OK responses log `platform_cost_posture_response_rejected`; invalid successful read-model envelopes log `platform_cost_posture_response_invalid`. All paths throw the fixed local `Failed to load platform cost posture` error.

Source gate: `npm run verify:platform-cost-posture-boundary` locks the feature flag, platform auth, query validation, DATA_READ rate limit, fixed read limits, hashed alert row IDs, SAFE_MODE reason summary, timestamp parser diagnostics, same-origin manual-redirect browser fetch policy, response-shape guard, desktop/mobile navigation, and docs parity. It does not run Firestore reads/writes, provider calls, browser smoke, Firebase deploy, or Vercel deploy.

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

The browser guard requires the response envelope to include `data`, then validates the generated period/status fields, billing-export status, SAFE_MODE fields, totals, and each `signals`, `alerts`, `guardrails`, and `sourceCoverage` row before the platform UI uses it.

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

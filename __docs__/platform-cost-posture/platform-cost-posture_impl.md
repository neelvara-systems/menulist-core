# Platform Cost Posture Implementation

## Files

- `src/app/(main)/platform/cost-posture/page.tsx`
- `src/app/api/platform/cost-posture/route.ts`
- `src/components/templates/main-app/platform/costPosture/index.tsx`
- `src/database/ops/costPosture.ts`
- `src/lib/ops/costPostureAggregation.ts`
- `src/lib/ops/costPostureTypes.ts`
- `src/config/features.ts`

## API

`GET /api/platform/cost-posture?days=30`

The route is platform-auth protected and force dynamic. It uses Admin SDK reads so the browser never receives direct Firestore read permissions for cross-platform cost posture.

Unexpected route, source-read, and `ops_config/system` read failures use `platform_cost_posture_route_failed`, `platform_cost_posture_source_read_failed`, and `platform_cost_posture_system_config_read_failed` runtime diagnostics. Context is limited to bounded request path, user ID presence/length, source collection/order-field presence/length, read limits, query days, and source error name/code/status.

Timestamp parser diagnostics use `platform_cost_posture_timestamp_parse_failed` when a timestamp-like value throws during conversion. The API omits undated, malformed, stale, and future-dated rows from selected-period totals, logs only bounded value-shape metadata, caps repeated shape reports, and does not log raw timestamp values or source documents. One `generatedAt` value defines both the inclusive period end and the derived period start.

The pure `costPostureAggregation.ts` boundary accepts only non-negative finite cost values and non-negative safe-integer counters. It prevents aggregate overflow, preserves the distinction between `realCostPaise` and owner charge, and uses `totalCharge` only as the legacy owner-charge fallback. Extraction rows without an explicit `providerCallCount` use one operation row as a documented provider-call proxy.

The browser DAL parses route responses through `readPlatformCostPostureResponseJson()` with a 256KB cap. Malformed or oversized route JSON logs `platform_cost_posture_response_parse_failed` with days, response status, response OK flag, and response cap only. Non-OK responses log `platform_cost_posture_response_rejected`; invalid successful read-model envelopes, malformed ISO timestamps, negative/unsafe counters, reversed period boundaries, or a response for a different requested lookback log `platform_cost_posture_response_invalid`. All paths throw the fixed local `Failed to load platform cost posture` error. Changing the lookback or refreshing aborts the previous browser request, and a failed current request clears stale data instead of showing it under the new selector value.

Source gate: `npm run verify:platform-cost-posture-boundary` locks the feature flag, signed platform admission, fail-closed DATA_READ rate limit, exact current persisted platform-user reauthorization, query validation, fixed read limits, strict period/cost aggregation, hashed alert row IDs, SAFE_MODE reason summary, timestamp parser diagnostics, same-origin manual-redirect browser fetch policy, abortable stale-request handling, response-shape guard, desktop/mobile navigation, and docs parity. It runs `test:platform-cost-posture-aggregation` and `test:platform-cost-posture-client`; it does not run Firestore reads/writes, provider calls, browser smoke, Firebase deploy, or Vercel deploy.

Validated query:

- `days`: integer, minimum 1, maximum 90, default 30

Read limits:

- `ops_config/system`: 1 document
- `systemAlerts`: latest 30 alerts
- `MENULIST_AI_OPERATIONS`: latest 300 extraction operations
- `ownerBusinessAssistantAnswerEvents`: latest 200 answer events

When a source returns exactly its hard limit, coverage explicitly says the selected-period totals may be partial. No extra read is made to determine whether another row exists.

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

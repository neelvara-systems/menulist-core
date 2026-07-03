# Platform Cost Posture Firebase Notes

## Collections Read

- `ops_config/system`
- `systemAlerts`
- `MENULIST_AI_OPERATIONS`
- `ownerBusinessAssistantAnswerEvents`

## Collections Written

None.

## Rules and Indexes

No Firestore rules or index changes are required. The posture API reads with Admin SDK behind platform auth.

## Cost Model

The screen is manual refresh and bounded:

- 1 config document read
- up to 30 alert reads
- up to 300 extraction operation reads
- up to 200 Business Health answer event reads

Expected use is low-frequency platform-only inspection. This is acceptable for an internal control surface and avoids adding a new hot-path monitoring model.

The API cheap-fails through the shared `DATA_READ` rate-limit profile before Admin SDK reads, and stores only HMAC-hashed platform user key material in the limiter key.

Route and DAL diagnostics are cost-neutral. Source-read, system-config, rate-limit, top-level route, browser response-parse, rejected-response, and invalid-envelope diagnostics now use stable `platform_cost_posture_*` runtime codes with bounded collection/path/user/status/cap metadata only. Browser response parsing is capped at 256KB and validates the returned read-model shape before the UI uses it. This adds no Firestore reads/writes, Storage operations, provider calls, Cloud Functions, cache tags, rules, indexes, or deploy requirement.

Source gate: `npm run verify:platform-cost-posture-boundary` locks the read-only Firebase posture: bounded Admin SDK reads, no Firestore writes, no client Firestore access, no Storage operations, provider calls, Cloud Functions, cache tags, rules, indexes, or deploy requirement.

## Billing Export Boundary

Whole-bill Firebase forecasting requires Cloud Billing export to BigQuery. Until that export exists, the feature must not claim that the known signal total equals the actual Firebase invoice.

Rejected model:

- `ops_daily_cost`
- `ops_baselines`
- app-written billing summary collections
- Firestore-driven bill forecasting scheduler

Accepted long-term model:

- Cloud Billing export for actual GCP/Firebase bill data
- existing AI/provider operation logs for application-level cost attribution
- bounded platform-only read adapters for internal posture screens

## Deployment

No Firebase deploy is required for this feature unless a future change modifies Firestore rules, indexes, Storage rules, or Firebase Cloud Function logic.

# Campaign Studio — Implementation Plan

## Services

`CampaignService` owns campaign brief, selected entities, output set, status, and pack metadata. `GenerationService`, `TrustService`, and `CreditService` are called through server-side workflows.

## APIs

Current runtime:

- `GET /api/campaigncue/campaigns`
- `POST /api/campaigncue/campaigns`
- `POST /api/campaigncue/campaigns/[campaignId]/actions`

Campaign creation currently generates deterministic manual/export-first outputs in the request path. No paid generation job, credit reservation, or provider call is triggered. Mutation calls support idempotency keys.

## Generation Flow

1. Validate auth, tenant/store workspace scope, input schema, and rate limit.
2. Resolve Business Brain and source snapshot.
3. Generate deterministic manual/export outputs.
4. Store campaign and output references.
5. Store deterministic trust report.
6. Record campaign event and update dashboard summary.

Paid/provider generation remains disabled until credit reservation and provider adapter controls are configured.

## Acceptance

Campaign creation works from Home cue, Create button, calendar, asset, agency client, and multi-location master flow.

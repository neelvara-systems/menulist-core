# Campaign Studio — Implementation Plan

## Services

`CampaignService` owns campaign brief, selected entities, output set, status, and pack metadata. `GenerationService`, `TrustService`, and `CreditService` are called through server-side workflows.

## APIs

Current runtime:

- `GET /api/campaigncue/campaigns`
- `POST /api/campaigncue/campaigns`
- `POST /api/campaigncue/campaigns/[campaignId]/actions`

Campaign creation currently generates deterministic export/download-first outputs in the request path. Outputs include text plus structured fields for headline, CTA, destination, format, consent note, policy note, approval note, UTM hint, and manual handoff steps. Owners can download a single output or the full campaign pack. No paid generation job, credit reservation, social posting, social account connection, or provider call is triggered. Mutation calls support idempotency keys.

## Generation Flow

1. Validate auth, tenant/store workspace scope, input schema, and rate limit.
2. Resolve Business Brain, source snapshot, bounded source inputs, assets, schedules, locations, and analytics summary.
3. Generate deterministic structured export/download outputs.
4. Store campaign and output references.
5. Store deterministic trust report with vertical and channel checks.
6. Record campaign event and update dashboard summary.

Paid/provider generation and direct posting remain disabled until a separate provider layer with credit reservation, credentials, consent, quota, idempotency, and fallback controls is configured.

## Acceptance

Campaign creation works from Home cue, Create button, calendar, asset, agency client, and multi-location master flow.

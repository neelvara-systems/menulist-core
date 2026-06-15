# Campaign Studio — Implementation Plan

## Services

`CampaignService` owns campaign brief, selected entities, output set, status, and pack metadata. `GenerationService`, `TrustService`, and `CreditService` are called through server-side workflows.

## APIs

Current runtime:

- `GET /api/campaigncue/campaigns`
- `POST /api/campaigncue/campaigns`
- `POST /api/campaigncue/campaigns/[campaignId]/actions`

Campaign creation currently generates deterministic export/download-first outputs in the request path. Outputs include text plus structured fields for headline, CTA, destination, format, consent note, policy note, approval note, UTM hint, manual handoff steps, owner use case, output formats, print formats, photo tasks, and review checklist. Owners can download a single output or the structured Campaign Pack ZIP. The Campaign Pack ZIP includes Daily Campaign Desk context plus `CampaignCueOutputPack` files so owners can reuse one pack for channels, manual delivery, print, photo tasks, asset reuse, mini-page/QR brief, and result memory. No paid generation job, credit reservation, social posting, social account connection, hosted mini-page publishing, or provider call is triggered. Mutation calls support idempotency keys.

## Generation Flow

1. Validate auth, tenant/store workspace scope, input schema, and rate limit.
2. Resolve Business Brain, source snapshot, bounded source inputs, assets, schedules, locations, and analytics summary.
3. Recompute Campaign Decision Engine output and reject non-ready decisions with `CAMPAIGNCUE_DECISION_GATE` before campaign/trust/event/analytics writes.
4. Generate deterministic structured export/download outputs.
5. Store campaign and output references.
6. Store deterministic trust report with vertical and channel checks.
7. Record campaign event and update dashboard summary.

Paid/provider generation and direct posting remain disabled until a separate provider layer with credit reservation, credentials, consent, quota, idempotency, and fallback controls is configured.

## Acceptance

Campaign creation works from Home cue, Create button, calendar, asset, agency client, and multi-location master flow.

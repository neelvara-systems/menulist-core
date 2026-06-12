# CampaignCue Delivery Boundary

**Status:** Active product contract.
**Decision:** CampaignCue day-one delivery is export/download only. Direct posting, direct sending, social account connection, ad account mutation, provider upload, and platform publishing are not active owner workflows.

## Active Runtime: Export And Download

The current product prepares source-backed campaign packs and lets the owner:

- download a single output,
- download the full campaign pack,
- schedule a manual task,
- request approval,
- mark a pack used,
- record a manual result.

These actions are accepted by `CampaignCueCampaignActionSchema` and are the only active campaign-action API contract.

## Separate Future Layer: Provider Posting

Provider posting is a separate future product layer. It is represented only as disabled posture/readiness information in the active runtime.

Future provider work must not reuse the export/download action path silently. It needs its own explicit contract for:

- provider credentials and token storage,
- opt-in, opt-out, and suppression handling,
- provider quotas and retries,
- idempotent provider jobs,
- owner spend approval,
- provider result imports,
- manual export fallback.

## Day-One Non-Goals

- No direct WhatsApp send.
- No Google Business Profile publish.
- No Meta, Instagram, or Facebook posting.
- No Google Ads or Meta Ads mutation.
- No video render/upload provider.
- No owner-facing social account connection request.
- No provider-connection write from the owner UI.

## Repo Contract

- `src/constants/campaigncue/delivery.ts` is the source of truth for active export actions and disabled provider actions.
- `/api/campaigncue/campaigns/[campaignId]/actions` accepts export/download/manual-use actions only.
- Clipboard copy is not an active API action. Owners download generated text or full packs and then paste/post manually outside CampaignCue.
- `/api/campaigncue/integrations` is read-only in the active runtime and only reports future-disabled provider posture.
- The workspace overview returns `deliveryPolicy` so owner screens can display the active mode without reading provider connection records.
- `providerConnections` remains a reserved future data shape, but the active overview returns an empty list and does not read the collection.

## Firebase Cost Posture

This boundary removes provider setup writes and avoids a provider-connection read on workspace load. Direct provider work must not be added without a new Firebase cost note, idempotency design, rate limits, and explicit owner approval controls.

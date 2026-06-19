# CampaignCue Delivery Boundary

**Status:** Active product contract.
**Decision:** CampaignCue day-one delivery is export/download only. Direct posting, direct sending, social account connection, ad account mutation, provider upload, and platform publishing are not active owner workflows.

## Active Runtime: Export And Download

The current product prepares source-backed campaign packs and lets the owner:

- download a single output,
- download the full campaign pack ZIP,
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

## June 19, 2026 Provider Preconditions

Current platform research confirms that direct provider work is not a small follow-up to export/download. Each provider needs its own approval, policy, cost, and retry model.

| Provider surface | Preconditions before activation |
| --- | --- |
| Google Business Profile posts | OAuth scopes, location ownership, post type mapping, media source URL handling, offer/event date validation, idempotent post jobs, quota and API-access proof, owner approval, and manual export fallback. |
| Google Business Profile performance import | Approved GBP API access, non-zero quota, metric confidence labels, and no sales/ROI claims unless the provider metric directly supports the statement. |
| WhatsApp direct send | Recipient opt-in proof, message-category selection, approved templates for outbound messages outside the 24-hour window, opt-out/suppression handling, category-aware delivered-message cost preview, human escalation path, and quality-tier monitoring. |
| Meta/Instagram/Facebook posting or ads | Account authorization, policy preflight, media rights proof, owner spend approval for ads, idempotent mutate jobs, and manual pack fallback. |

If these preconditions are missing, CampaignCue must continue to produce download/export/manual handoff outputs only.

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
- `CampaignCueOutputPack` is response-derived state. The browser-local ZIP includes channel text/brief files, a readable summary, and a JSON contract; it does not persist ZIPs to Storage.
- Mini-page and QR output is brief-only in the active runtime. Hosted public pages need a separate route, approval, tracking, and Firebase cost contract.

## Firebase Cost Posture

This boundary removes provider setup writes and avoids a provider-connection read on workspace load. Direct provider work must not be added without a new Firebase cost note, idempotency design, rate limits, and explicit owner approval controls.

# Source Integrations — Implementation Plan

## Services

| Service | Responsibility |
| --- | --- |
| SourceConnectionService | Connection lifecycle, scopes, health, disconnect. |
| SourceSnapshotService | Snapshot hash, freshness, retention, campaign references. |
| MenuListBridgeService | Read-only store/menu/public-link sync. |
| UploadIngestionService | Signed URL upload, extract, classify, review queue. |
| ProviderAdapterService | Google, WhatsApp, Meta, booking, POS adapters. |

## APIs

Current runtime:

- `GET /api/campaigncue/workspace` reads the signed-in MenuList store profile as a source, then creates/reads a CampaignCue source snapshot from the derived Business Brain.
- `GET /api/campaigncue/sources` reads bounded owner source input records.
- `POST /api/campaigncue/sources` accepts either one detailed source input or a strict `confirm_inbox` batch with at most eight reviewed candidates.
- Campaign Inbox parsing and selection stay browser-local; the confirmed batch uses deterministic IDs, one current-snapshot merge, and one aggregate event.
- `POST /api/campaigncue/sources` saves manual notes, menu links, booking links, offers, events, optional expiry, and upload metadata; the server derives source facts and refreshes `sourceSnapshots/current`.
- The same protected POST accepts `inspiration_pattern`. It validates one public HTTPS link plus notes, discards raw notes after deterministic analysis, stores one current compact pattern on the existing workspace document, and refreshes source trace without creating a new collection or read path. Inspiration never becomes a business fact.
- `GET /api/campaigncue/integrations` returns read-only future provider posture.
- `CAMPAIGNCUE_META_ADS_MCP_POSTURE` records the disabled read-first Meta capability order and mutation blocklist; it does not initialize an MCP client.
- `POST /api/campaigncue/campaigns/[campaignId]/actions` accepts a bounded `record_result_evidence` action for totals the owner manually copies from a visible provider report. This is campaign evidence intake, not a source connection, OAuth import, background sync, or provider attribution path.

Direct provider integrations, social account connection, setup-request writes, OAuth token storage, Meta MCP calls, authenticated provider metric imports, webhooks, MenuList write-back, and background sync are not enabled. The owner-copied report snapshot does not change this boundary. MenuList source access is read-only and scoped by the signed-in tenant/store session. Provider posture is returned as manual-only/future-disabled from the workspace overview. The owner workspace shows saved facts from Business details and Inputs so owners can see what CampaignCue is allowed to use.

## Validation

- Resolve `workspaceId` before every action.
- Validate provider state/signature/callback token.
- Store credentials server-side only.
- Use idempotency for sync and webhook jobs.
- Keep MenuList data scoped to authorized tenant/store mapping.

## Acceptance

MenuList restaurant, uploaded restaurant, and manual salon all reach Business Brain-ready state without sharing source ownership.

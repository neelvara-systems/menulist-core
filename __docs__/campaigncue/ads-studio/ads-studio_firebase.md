# Ads Studio - Firebase Notes

## Active Runtime

- Ads Studio adds no Firestore collection, overview read, listener, Storage object, Cloud Function, provider call, or scheduler.
- Ad handoff output lives in the existing campaign document and response-derived Campaign Pack ZIP.
- Policy posture uses the existing campaign trust gate/report path.
- Results remain the existing bounded owner-reported `campaign.resultMemory` receipt.
- `/api/campaigncue/integrations` reads only the workspace guard and returns static disabled provider posture; it does not read `providerConnections`.

## Future Read-First Snapshot

Do not create provider documents until the Meta connector is approved and executable.

If activated, the preferred Firebase shape is one lazy-loaded compact summary document per workspace and provider, for example:

`campaigncueWorkspaces/{workspaceId}/providerMetricSummaries/meta_ads`

The document must be bounded by contract:

- one schema/version and provider timestamp,
- one hashed/non-secret account reference,
- at most three account summaries,
- at most twenty campaign/ad-set summaries total,
- at most twenty recent activity summaries,
- compact signal-health findings,
- date range, timezone, currency, attribution label, and confidence,
- no raw event stream, audience list, customer identifier, prompt, access token, or full provider payload.

The document is not part of the default CampaignCue overview. It is read only when the owner opens the Ads/Results evidence surface or explicitly refreshes it.

## Cost Guardrails

- Do not poll ad performance continuously.
- Prefer owner-triggered refresh; a bounded schedule requires a separate cost and lease review.
- Cache the compact response server-side for a short provider-appropriate TTL to suppress repeated refreshes.
- Use one summary write after a successful normalized import, not one write per campaign, ad set, activity row, or metric.
- Do not write when the normalized summary hash is unchanged.
- Do not add the summary read to Daily Desk or workspace overview merely because the connector exists.
- Use provider webhooks only where they materially reduce polling and have an explicit replay/deduplication contract.
- Usage and spend records must be distinct from generation credits.

## Security

- Ad account connections are sensitive.
- Provider authorization and refresh tokens must remain server-side and outside Firestore.
- Workspace and ad-account identity must be verified before every fetch.
- MCP tool names and response payloads are untrusted external input and require runtime validation.
- Spend-changing actions remain disabled and would require elevated role, explicit amount/currency approval, idempotency, and reconciliation.
- Logs must not include access tokens, customer lists, or full ad payloads.

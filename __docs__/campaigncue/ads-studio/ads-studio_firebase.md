# Ads Studio - Firebase Notes

## Collections

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/adPacks` | Ad copy, creative refs, audience, budget, and destination. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/adPolicyReports` | Policy risk checks and acknowledgements. |
| `campaigncueWorkspaces/{workspaceId}/adProviderConnections` | Ad account mapping metadata. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/adPublishJobs` | API publish or draft creation attempts. |
| `campaigncueWorkspaces/{workspaceId}/adPerformanceSnapshots` | Imported spend/result metrics. |

## Cost Guardrails

- Do not poll ad performance continuously.
- Import metrics on bounded schedules or owner-triggered refresh.
- Store metric snapshots by campaign/date, not raw event streams.
- Use provider webhooks only where available and necessary.
- Usage and spend records must be distinct from generation credits.

## Security

- Ad account connections are sensitive.
- Spend-changing actions require elevated workspace role.
- Provider tokens must not be stored in plain Firestore documents.
- Logs must not include access tokens, customer lists, or full ad payloads.


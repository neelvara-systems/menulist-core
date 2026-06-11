# Google Local Studio - Firebase Notes

## Collections

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/googleConnections` | Account and location mapping metadata. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/googleLocalDrafts` | Draft post content and media refs. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}/googlePublishJobs` | Publish attempts and status. |
| `campaigncueWorkspaces/{workspaceId}/googleInsightsSnapshots` | Imported post/location performance snapshots. |

## Cost Guardrails

- Store only required Google account/location metadata.
- Avoid frequent automatic insight imports; use bounded schedules and backoff.
- Cache capability checks per location for a short TTL.
- Store post metrics as snapshots, not unbounded event streams.
- Do not attach large media blobs to Firestore documents.

## Security

- OAuth tokens must not be stored in plain Firestore documents.
- Workspace role checks required before publish or insight import.
- Google callbacks and refresh flows must validate workspace mapping.
- Logs must not include access tokens or raw OAuth payloads.


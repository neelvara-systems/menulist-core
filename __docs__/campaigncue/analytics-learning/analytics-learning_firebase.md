# Analytics Learning - Firebase Notes

## Collections

Current runtime:

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/events/{eventId}` | Observed campaign and asset actions. |
| `campaigncueWorkspaces/{workspaceId}/analyticsSummaries/dashboard` | Precomputed dashboard metrics. |

Logical expansion:

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/campaignEvents` | Raw observed and manual campaign events. |
| `campaigncueWorkspaces/{workspaceId}/metricSnapshots` | Imported provider metric snapshots. |
| `campaigncueWorkspaces/{workspaceId}/campaignSummaries` | Precomputed result summaries. |
| `campaigncueWorkspaces/{workspaceId}/learningSignals` | Next-cue signals. |
| `campaigncueWorkspaces/{workspaceId}/clientReports` | Agency/client report snapshots. |

## Cost Guardrails

- Summaries must be precomputed for dashboard/report reads.
- The current analytics endpoint reads one workspace document and one precomputed dashboard summary document; it must not load the full workspace overview or scan raw events.
- Raw events should be paginated and retention-aware.
- Metrics imports must use bounded schedules and provider quotas.
- Avoid real-time listeners for large metric sets.
- Manual result edits should update summary docs in batch.

## Security

- Campaign metrics are workspace-private.
- Agency users can access only assigned client workspaces.
- Reports shared externally must use explicit share records and expiry controls.

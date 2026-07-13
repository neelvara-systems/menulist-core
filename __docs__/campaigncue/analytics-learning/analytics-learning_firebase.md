# Analytics Learning - Firebase Notes

## Collections

Current runtime:

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/events/{eventId}` | Observed campaign and asset actions. |
| `campaigncueWorkspaces/{workspaceId}/analyticsSummaries/dashboard` | Precomputed dashboard metrics. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}` | Compact result counters plus the latest bounded owner-reported receipt and one-variable experiment. |

Not active and not required for owner-reported learning:

| Collection | Purpose |
| --- | --- |
| `campaignEvents` | Do not duplicate the existing bounded `events` path. |
| `metricSnapshots` | Add only with an approved provider-import contract, quotas, confidence labels, and retention. |
| `campaignSummaries` | Do not add while bounded campaign documents plus dashboard summary answer current owner views. |
| `learningSignals` | Keep the next one-variable suggestion derived from campaign/result state until independent lifecycle needs are proven. |
| `clientReports` | Add only with a separate agency share/retention contract. |

## Cost Guardrails

- Summaries must be precomputed for dashboard/report reads.
- The current analytics endpoint reads one workspace document and one precomputed dashboard summary document; it must not load the full workspace overview or scan raw events.
- Raw events should be paginated and retention-aware.
- Metrics imports must use bounded schedules and provider quotas.
- Avoid real-time listeners for large metric sets.
- Manual result edits should update summary docs in batch.
- `not_used` remains a result receipt but does not set campaign status to used or store a use time.
- Manual receipt events use `owner_reported` confidence; provider attribution is never inferred.
- No result receipt, learning signal, or experiment collection is added.

## Security

- Campaign metrics are workspace-private.
- Agency users can access only assigned client workspaces.
- Reports shared externally must use explicit share records and expiry controls.

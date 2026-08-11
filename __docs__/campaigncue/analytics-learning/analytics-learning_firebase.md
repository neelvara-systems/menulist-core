# Analytics Learning - Firebase Notes

## Collections

Current runtime:

| Collection | Purpose |
| --- | --- |
| `campaigncueWorkspaces/{workspaceId}/events/{eventId}` | Observed campaign and asset actions. |
| `campaigncueWorkspaces/{workspaceId}/analyticsSummaries/dashboard` | Precomputed dashboard metrics. |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}` | Compact result counters, latest bounded owner-reported receipt, one-variable experiment, and optional latest owner-copied directional report snapshot. |

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
- Recording a result adds one dashboard-summary read inside the existing transaction, then writes the campaign, minimized event, summary, and idempotency completion atomically. It adds no extra summary write because outcome recording already updated that document.
- Recipe signals are capped at 16 and channel signals are capped by the channel registry.
- The dashboard summary stores no raw owner note or per-event list.
- `not_used` remains a result receipt but does not set campaign status to used or store a use time.
- Manual receipt events use `owner_reported` confidence; provider attribution is never inferred.
- Owner-copied report evidence uses the existing campaign/action/event/idempotency envelope, skips the dashboard-summary write, and stores no raw report or metric values in the audit event.
- No result receipt, learning signal, or experiment collection is added.

## Security

- Campaign metrics are workspace-private.
- Agency users can access only assigned client workspaces.
- Reports shared externally must use explicit share records and expiry controls.

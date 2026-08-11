# Winning Pack Refresh - Firebase And Cost

## Storage

No new collection or Storage path is added. The new campaign uses the existing paths:

```text
campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}
campaigncueWorkspaces/{workspaceId}/trustReports/{trustReportId}
campaigncueWorkspaces/{workspaceId}/events/{eventId}
campaigncueWorkspaces/{workspaceId}/analyticsSummaries/dashboard
campaigncueWorkspaces/{workspaceId}/idempotencyKeys/{idempotencyKey}
```

## Cost

| Operation | Added reads | Added writes | Provider calls |
| --- | ---: | ---: | ---: |
| Candidate display | 0 | 0 | 0 |
| Refresh create | 0 beyond existing campaign creation | 0 beyond existing campaign creation | 0 |

Candidate selection uses the already-loaded bounded campaigns, current recipe, current Business Brain, and dashboard summary. Root/generation fields avoid following a campaign ancestry chain.

## Security

The existing guarded create route performs auth, workspace/store scope, rate limiting, Zod validation, idempotency, and server-side source-campaign lookup. The browser cannot supply trusted root/generation provenance.

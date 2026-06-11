# Campaign Studio — Firebase Cost Tracking

## Collections

Current runtime:

| Collection | Reads | Writes | Guard |
| --- | --- | --- | --- |
| `campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}` | Bounded direct campaign list and workspace overview | Deterministic manual/export-first campaign pack and action state | No realtime listeners; action writes are scoped and rate-limited. |
| `campaigncueWorkspaces/{workspaceId}/trustReports/{trustReportId}` | Trust tab and campaign output gates | Deterministic trust report on campaign creation | Reuse stored report until output changes. |
| `campaigncueWorkspaces/{workspaceId}/events/{eventId}` | Internal audit and summary maintenance | Campaign creation/action events | Meaningful actions only. |

Logical expansion:

| Collection | Reads | Writes | Guard |
| --- | --- | --- | --- |
| `campaigncueCampaigns` | List/detail | Create/update/duplicate/status | Paginate lists. |
| `campaigncueCampaignOutputs` | Review/export screens | Output references and status | Store payloads compactly. |
| `campaigncueJobs` | Generation status | Job create/progress/result | Poll with backoff. |
| `campaigncueCreditTransactions` | Estimate/reserve/capture/refund | Credit lifecycle | Server-only capture/refund. |

## Cost Rules

- Never generate 30-day assets without plan approval.
- Use partial success to avoid wasted regeneration.
- Avoid raw source reload on campaign detail if snapshot reference exists.

## Current Pass

Current runtime creates deterministic manual/export-first campaign packs:

- Owner campaign creation atomically claims one idempotency key, then writes one campaign doc, one trust report doc, one event doc, one atomic dashboard summary increment, and one idempotency completion.
- Campaign action reads the target campaign once, atomically claims one idempotency key, writes one event and a scoped campaign update, then writes one idempotency completion; schedule and approval actions add one schedule/approval doc.
- Blocked direct publish/direct send/manual-fallback actions complete the idempotency key with the replayable error response after writing the fallback event and summary increment.
- Campaign action responses are assembled from the known campaign document and mutation payload after commit, so the server does not pay for a second campaign read and the client does not reload the full workspace overview after every action.
- No paid AI generation, credit reservation, provider job, or polling listener is active.

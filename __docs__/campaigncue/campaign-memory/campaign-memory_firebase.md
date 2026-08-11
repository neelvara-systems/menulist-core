# Campaign Memory 2.0 - Firebase And Cost Contract

## Storage Shape

No collection is added. Memory is embedded in:

```text
campaigncueWorkspaces/{workspaceId}/analyticsSummaries/dashboard.campaignMemory
```

Existing campaign and event paths remain:

```text
campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}.resultMemory
campaigncueWorkspaces/{workspaceId}/events/{eventId}
campaigncueWorkspaces/{workspaceId}/idempotencyKeys/{idempotencyKey}
```

## Operation Budget

| Operation | Added reads | Added writes | Provider calls |
| --- | ---: | ---: | ---: |
| Workspace overview | 0 | 0 | 0 |
| Analytics summary load | 0 | 0 | 0 |
| Record one outcome | 1 summary read | 0 | 0 |
| Decision recomputation | 0 | 0 | 0 |

The outcome flow already writes the dashboard summary. Reading it in the same transaction prevents lost aggregate updates and preserves older bounded memory. A raw event scan would cost more and is prohibited.

## Document Bounds

- Schema version is explicit.
- Recipe signals are capped at 16.
- Channel signals are capped by the CampaignCue channel registry.
- Only counters, IDs, confidence, and timestamps are stored.
- No raw note, provider payload, customer record, or per-event list is embedded.
- Stable deterministic ordering prevents document churn.

## Concurrency And Idempotency

- The existing request hash and idempotency claim protect exactly-once logical outcome recording.
- The transaction reads the current summary before calculating the next aggregate.
- Firestore retries re-evaluate from current summary state.
- Same key with changed campaign or result payload fails closed.
- A rejected result ID writes neither campaign memory nor an outcome event.

## Security

The summary stays workspace-private under existing CampaignCue rules. No client Firestore write path is opened. The authenticated server route enforces tenant/store/workspace scope before the transaction.

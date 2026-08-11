# Campaign Experiment Coach - Firebase And Cost

## Reused Records

```text
campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}.pack.experiment
campaigncueWorkspaces/{workspaceId}/campaigns/{campaignId}.resultMemory.lastReceipt
campaigncueWorkspaces/{workspaceId}/events/{eventId}
campaigncueWorkspaces/{workspaceId}/idempotencyKeys/{idempotencyKey}
```

No experiment collection, result-receipt collection, Storage object, listener, Cloud Function, scheduler, or provider call is added.

## Cost

| Operation | Firestore reads | Firestore writes | Storage | Provider calls |
| --- | --- | --- | ---: | ---: |
| Render suggestion | 0 additional; derived from overview data already in memory | 0 | 0 | 0 |
| Accept test | Existing workspace/idempotency checks plus one transactional campaign read and one current-workspace read | Campaign, event, idempotency result | 0 | 0 |
| Record result | Existing result-memory transaction with one current-workspace recheck | Existing campaign, event, compact summary, idempotency result | 0 | 0 |

The current-workspace read closes role, location, and agency-approval revocation races immediately before mutation. Accepting a test deliberately skips the dashboard-summary write because no dashboard counter changes. Campaign history remains bounded by the existing overview list. The builder does not scan raw events.

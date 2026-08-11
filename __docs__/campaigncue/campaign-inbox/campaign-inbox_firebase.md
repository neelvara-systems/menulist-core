# Campaign Inbox - Firebase And Cost Contract

## Storage Shape

Campaign Inbox adds no collection and no Storage object.

It reuses:

```text
campaigncueWorkspaces/{workspaceId}/sourceInputs/{sourceInputId}
campaigncueWorkspaces/{workspaceId}/sourceSnapshots/current
campaigncueWorkspaces/{workspaceId}/events/{eventId}
campaigncueWorkspaces/{workspaceId}/idempotencyKeys/{idempotencyKey}
```

Canonical contact/location changes continue through the existing Business Brain write path.

## Operation Budget

For `N` selected source candidates, where `1 <= N <= 8`:

| Stage | Reads | Writes |
| --- | ---: | ---: |
| Workspace/bootstrap guard before mutation | Existing bounded path | Existing bounded path |
| Idempotency claim | workspace + idempotency | 1 idempotency claim |
| Confirmation transaction | workspace + Business Brain + current snapshot + idempotency | `N` source inputs + 1 snapshot + 1 event + 1 idempotency completion |
| Browser parse/review | 0 | 0 |
| Overview refresh | 0 by default | 0 |

Compared with `N` individual source saves, the batch avoids `N - 1` API round trips, snapshot rewrites, event writes, idempotency claims, and repeated transaction reads.

## Cost Rules

- Do not add a draft collection.
- Do not persist parser output before owner confirmation.
- Do not add a listener; merge the mutation response into the already-loaded overview.
- Do not write one event per candidate; one event carries bounded counts and source-type names.
- Do not scan source inputs to rebuild the current snapshot; update the single current snapshot transactionally.
- Bound current source facts and refs so the document cannot grow past its runtime schema.
- Idempotency documents remain under the existing 90-day retention contract.
- Model calls remain disabled until CampaignCue-specific capacity and billing gates exist.

## Security Rules

No Firestore rule expansion is required. Client writes remain denied. The authenticated Next route owns mutation after tenant/workspace checks and runtime validation.

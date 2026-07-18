# External Menu Sync — Firebase and Cost Contract

> **Status:** Implemented in source
> **Last code-truth review:** July 16, 2026

## Data model

| Path | Purpose | Client access |
| --- | --- | --- |
| `stores/{storeId}` | Non-secret config, connection status, menu/secret versions, counters | Existing tenant/store rules; clients cannot add/change/delete legacy `posSync.webhookSecret` |
| `posSyncSecrets/{tenantId}_{storeId}` | Canonical HMAC secret and version | Deny all; Admin SDK only |
| `stores/{storeId}/posDeliveryLogs/{deliveryId}` | Bounded delivery result | Store-scoped read; server write |
| `menuChangeLog/{tenantId}/{storeId}` | Secret rotation audit event | Existing feature rules |

No Storage bucket, Firestore index, Cloud Function, scheduler, or delivery queue is added.

## Store fields

Active non-secret fields include:

- `enabled`, `webhookUrl`, `status`;
- `menuVersion`, `lastCompletedMenuVersion`;
- `secretVersion`;
- `lastSentAt`, `lastStatus`, `lastError`, `consecutiveFailures`;
- provider-instruction draft counters;
- latest secret-rotation actor/time metadata.

`webhookSecret` is optional in TypeScript only for migration. New browser writes are rejected.

## Operation counts

Counts below exclude the rate-limit provider and optional platform monitoring.

### Open desktop External Menu Sync

- Store details: already loaded by the owner shell.
- Secret GET: 2 server reads (`store`, `posSyncSecrets`).
- Legacy migration only: up to 2 writes (`posSyncSecrets`, `store`).
- Delivery history when enabled: up to 20 client document reads.

### Open mobile External Menu Sync

- Store details: inherited from `MobileShell`.
- Secret GET: 2 server reads.
- Legacy migration only: up to 2 writes.
- No delivery-log query in the mobile screen.

### Ensure or rotate secret

- 2 transaction reads (`store`, `posSyncSecrets`).
- 2 transaction writes (`posSyncSecrets`, `store`).
- Rotation also appends one non-blocking MOL audit write from the owner surface.

### Connection test

Typical post-migration path:

- 1 canonical store read;
- 2 transaction reads (`store`, `posSyncSecrets`);
- 1 status transaction read;
- 1 status write;
- 1 outbound HTTPS request.

Legacy migration adds secret/store writes inside the connection transaction. Invalid URL/DNS exits before the secret transaction and uses one guarded status transaction write.

### Live delivery

Typical post-migration path:

- 1 canonical store read;
- 3 claim transaction reads (`store`, `project`, `posSyncSecrets`);
- 1 store version write;
- 1 outbound HTTPS request;
- 1 completion transaction store read;
- 1 delivery-log write;
- 1 store status write;
- up to 100 bounded retention reads;
- 0–80 batched deletes to converge to the newest 20 rows.

The retention scan is the dominant Firestore cost. It is bounded and normally reads around the retained set; 100 is a backlog-repair ceiling, not a steady-state expectation.

### Settings and handoffs

- Toggle or URL save: one existing store write.
- Provider email draft preparation: one store counter write, maximum three per local calendar day; no SMTP call.
- Secret copy, reveal, technical-summary copy, sample download: zero Firebase operations.

## Cost controls

- Delivery exits in the browser for stores without a registered enabled connection.
- One timer per tenant/store/project collapses rapid saves.
- One attempt prevents provider retry spend.
- Payload is not stored in logs; only bytes and hash.
- Log history is capped.
- Secret documents use deterministic IDs and need no query/index.
- No secret is copied into a queue or delivery log.
- No extra store read is added to the project DAL; it uses already-loaded integration context.

## Failure/cost trade-offs

The browser debounce is intentionally low-cost but not durable. A closed tab can lose an attempt. The product must not advertise guaranteed delivery. A durable event queue would add project-write triggers, queue documents, scheduler/worker invocations, leases, retries, and provider traffic; that cost is not justified without provider usage evidence or a contractual delivery guarantee.

## Rules

`firestore.rules` enforces:

- `posSyncSecrets` deny all clients, including platform sessions;
- client store creates cannot include `posSync.webhookSecret`;
- client store updates must preserve an existing legacy secret exactly and cannot add, change, or delete it;
- Admin SDK performs migration/deletion after protected route authorization.

The preservation exception prevents an unrelated owner store update from breaking before coordinated migration. It does not authorize new client secret writes.

## Deployment dependency

Rules and app must be released in the documented order. The rules change is not safe to deploy ahead of the compatible secret API/UI because the prior deployed UI writes the legacy field. No rules deploy was performed as part of a source-only pass without the corresponding app release authorization.

## Verification

```bash
npm run test:pos-sync-secret:rules
npm run verify:pos-sync-boundary
```

The rules emulator proves:

- unauthenticated, owner, staff, and platform clients cannot read/write server secret docs;
- an owner can change non-secret POS config while a legacy secret is preserved;
- an owner cannot add, replace, or delete the legacy secret;
- an owner can save POS config containing only a non-secret version marker.

No focused gate calls a real provider or writes a production Firebase project.

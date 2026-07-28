# External Menu Sync — Firebase and Cost Contract

> **Status:** Implemented in source
> **Last code-truth review:** July 25, 2026

## Data model

| Path | Purpose | Client access |
| --- | --- | --- |
| `stores/{storeId}` | Non-secret config, connection status, menu/secret versions, counters | Existing tenant/store rules; clients cannot add/change/delete legacy `posSync.webhookSecret` |
| `posSyncSecrets/{tenantId}_{storeId}` | Canonical HMAC secret and version | Deny all; Admin SDK only |
| `stores/{storeId}/posDeliveryLogs/{deliveryId}` | Bounded delivery result | Exact parent-tenant plus store-membership read (or platform admin); all client writes denied |
| `menuChangeLog/{tenantId}/{storeId}` | Secret rotation audit event | Existing feature rules |

No Storage bucket, Firestore index, Cloud Function, scheduler, or delivery queue is added.

Admin readers do not trust the deterministic path alone: the persisted row must
agree on MenuList product, tenant, store, positive version, and bounded secret.
Contradictory rows fail closed. Identity-less legacy server rows may be used
only as compatibility input and are exact-rewritten to the canonical shape;
rotation and migration do not merge-retain unknown secret-document fields.

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
- Secret GET: 3 transaction reads (`store`, `tenant`, `posSyncSecrets`).
- Legacy migration only: up to 2 writes (`posSyncSecrets`, `store`).
- Delivery history when enabled: up to 20 client document reads.

### Open mobile External Menu Sync

- Store details: inherited from `MobileShell`.
- Secret GET: 3 transaction reads.
- Legacy migration only: up to 2 writes.
- No delivery-log query in the mobile screen.

### Ensure or rotate secret

- 3 transaction reads (`store`, `tenant`, `posSyncSecrets`).
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
- Secret reveal/migration/ensure/rotation revalidates current tenant and store lifecycle plus current persisted integration permission in the same transaction.
- No secret is copied into a queue or delivery log.
- No extra store read is added to the project DAL; it uses already-loaded integration context.

## Failure/cost trade-offs

The browser debounce is intentionally low-cost but not durable. A closed tab can lose an attempt. The product must not advertise guaranteed delivery. A durable event queue would add project-write triggers, queue documents, scheduler/worker invocations, leases, retries, and provider traffic; that cost is not justified without provider usage evidence or a contractual delivery guarantee.

## Rules

`firestore.rules` enforces:

- `posSyncSecrets` deny all clients, including platform sessions;
- delivery-log reads require the parent store to exist plus matching tenant and store claims (platform admin may read); unauthenticated, wrong-tenant and wrong-store reads fail;
- delivery-log create/update/delete is denied to every client, including platform sessions; the protected Admin delivery route is the only writer;
- client store creates cannot include `posSync.webhookSecret`;
- client store updates must preserve an existing legacy secret exactly and cannot add, change, or delete it;
- Admin SDK performs migration/deletion after protected route authorization.

The preservation exception prevents an unrelated owner store update from breaking before coordinated migration. It does not authorize new client secret writes.

## Deployment dependency and current status

Rules and app must be released in the documented order. The legacy secret boundary is not safe to deploy ahead of a compatible secret API/UI because the prior UI writes the legacy field. The July 21 delivery-history rule is backward-compatible with that boundary and was attempted as a scoped MenuList QA rules-only deploy after emulator validation. Firebase CLI stopped before upload with `Failed to authenticate, have you run firebase login?`; QA therefore retains the prior rules until an authorized login and rerun. No Vercel deploy was authorized or performed.

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
- owner/staff/platform reads of the exact delivery log succeed where intended;
- the desktop `orderBy(sentAt desc) + limit(20)` query succeeds for an authorized store member;
- wrong-tenant, wrong-store and unauthenticated delivery-log reads fail;
- owner, staff and platform delivery-log creates/updates fail.

No focused gate calls a real provider or writes a production Firebase project.

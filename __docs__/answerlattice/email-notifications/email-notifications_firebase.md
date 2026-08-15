# Answerlattice Email Notifications Firebase Contract

> **Last verified:** July 19, 2026

## Direct ticket notification storage

| Collection | Purpose | Client access |
|---|---|---|
| `answerlattice_notificationLogs` | Deterministic delivery claim, outcome, rate-limit evidence, and retention metadata for direct Answerlattice ticket events | No client writes; platform-admin operational read |

The deterministic document ID is a bounded event prefix plus a SHA-256 digest of `eventType:referenceId`. Raw values are still stored in the Admin-owned document for diagnostics and rate limiting.

## Direct event cost

| Stage | Reads | Writes |
|---|---:|---:|
| Current access-control resolution | Depends on access helper/session path | 0 |
| Exact `supportTickets/{ticketId}` projection read | 1 | 0 |
| Transactional delivery claim | 1 | 1 |
| Recipient-day `sent` query | Up to 21 matching documents | 0 |
| Claim-bound finalization | 1 | 1 |

Duplicate or in-flight requests stop after the claim transaction. A rate-limited request still finalizes its owned claim as `skipped`.

The ticket notification authority hardening intentionally adds the exact scoped ticket read before SMTP. That read prevents the browser from acting as recipient or content authority.

## Required index

`answerlattice_notificationLogs` requires the collection index used by the recipient-day query:

```json
{
  "collectionGroup": "answerlattice_notificationLogs",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "recipientEmail", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "ASCENDING" }
  ]
}
```

## Retention and deletion

Direct Answerlattice notification logs receive the central Answerlattice retention fields through `getAnswerlatticeRetentionFields('notificationLogs', ...)`. Cleanup follows the shared Answerlattice retention scheduler and must not delete active `sending` evidence before its lease and retention policy permit it.

## Activation test storage

The protected notification test, exact Answerlattice billing lifecycle events, support-credit low/exhausted state, and first widget-runtime verification are registered in the owner-notification pipeline when the migration flags are enabled. Their event, delivery, and rate-limit documents therefore follow the owner-notification collections and retention contracts rather than the direct ticket `answerlattice_notificationLogs` path. Each processing attempt reads the Answerlattice workspace once and reuses that context for every selected channel.

## Security

- The generic browser send route performs scoped authorization before the Admin ticket read.
- Clients cannot create or mutate notification log rows.
- Firestore rules do not authorize SMTP effects; only server code can claim and send.
- Logs must not store SMTP credentials, raw provider exceptions, or arbitrary browser-supplied HTML.

## Cost boundary

No extra Firestore read is justified merely to report email status in the ticket UI. The ticket remains authoritative; notification logs are operational evidence. Exact monthly cost depends on access-control reads, event volume, duplicate rate, and retained recipient-day rows, so fixed currency projections are deliberately omitted.

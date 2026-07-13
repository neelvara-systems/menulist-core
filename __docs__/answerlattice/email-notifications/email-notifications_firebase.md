# Answerlattice Email Notifications — Firebase Cost

> **Version:** 1.1.0
> **Last Updated:** 2026-06-28
> **Audience:** Developers / Ops

---

## New Collection

| Collection | Purpose | Scoping |
|------------|---------|---------|
| `answerlattice_notificationLogs` | Append-only log of Answerlattice notification send attempts | Answerlattice Firebase project, platform-admin read only |
| `notificationLogs` | Legacy/non-Answerlattice notification attempts | Default Firebase project |

## Reads/Writes Per Notification

Malformed or oversized generic send-route requests are rejected by the 16KB bounded JSON body before schema validation, idempotency reads, recipient rate-limit reads, SMTP work, or notification-log writes.

June 29 sender limiter-key hardening is Firebase-cost neutral. `/api/notifications/send` keeps the 120/hour authenticated-user throttle and existing request ordering, but hashes the sender key segment before storage in Upstash. This resets existing sender buckets once and changes no Firestore reads/writes/deletes, SMTP calls, notification log schema, Answerlattice collection targets, rules, indexes, Cloud Function logic, or owner/customer UI.

Unexpected send-route diagnostics add no Firestore reads/writes. They log stable `notification_send_route_failed` metadata only, with bounded user/payload context and source error name/code/status.

| Operation | Collection | Count | Purpose |
|-----------|-----------|-------|---------|
| TRANSACTION READ | `answerlattice_notificationLogs` | 1 | Claim deterministic event/reference; sent or unexpired in-flight rows fail closed. |
| READ | `answerlattice_notificationLogs` | 1 | Rate limit check (20/day per recipient) |
| TRANSACTION WRITE | `answerlattice_notificationLogs` | 1 claim + 1 finalization | Lease the external effect before SMTP, then finalize only the matching claim as `sent`, `failed`, or `skipped`. |

The ticket notification authority hardening adds one exact scoped `supportTickets/{ticketId}` Admin read after current `canManageSupport` admission. The browser no longer supplies recipient/template/reference/product/dedupe state. Claim rows may temporarily use `status: sending`, `claimId`, `claimExpiresAt`, and `modifiedAt`; they remain private Admin-written operational state and require no client rule or query-index change. Concurrent exact retries serialize to one active claim. A crashed pre-finalization sender is recoverable after the 15-minute lease; deterministic SMTP Message-ID reduces duplicate-provider ambiguity if delivery succeeds immediately before a finalization outage.

**Retired pre-hardening estimate:** the former check/query/final-write path was documented as 2 reads + 1 write and no longer describes runtime truth.
**Current ticket-send total:** current Answerlattice access reads plus one exact ticket read; one claim transaction read/write; one recipient-day rate query; and one claim-bound finalization transaction read/write. Duplicate/in-flight attempts stop after the claim transaction read. Notification tests use unique references and follow the same claim/rate/finalize contract. Cost is higher than the retired check-then-write path but prevents an authenticated email relay and concurrent duplicate SMTP effects.

## Monthly Cost Projections

Assumption for INR estimates: ₹85/USD placeholder.

| Notifications/Month | Reads | Writes | Monthly Cost |
|---------------------|-------|--------|-------------|
| 100 | 100-200 | 100 | ~₹1 |
| 1,000 | 1,000-2,000 | 1,000 | ~₹11 |
| 10,000 | 10,000-20,000 | 10,000 | ~₹107 |

## SMTP Cost

**$0.00** — Uses existing SMTP infrastructure (nodemailer + SMTP_HOST env vars). No paid email API (SendGrid, Resend, etc.) needed.

## Indexes Required

Add to `firestore-answerlattice.indexes.json`:

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

Idempotency uses a deterministic document ID from `eventType + referenceId`, so it no longer needs the older composite query on `eventType/referenceId/status/createdAt`.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-06-29 | 1.1.3 | Hashed `/api/notifications/send` authenticated sender rate-limit key segment; no cost or behavior change. |
| 2026-06-28 | 1.1.2 | Bounded `/api/notifications/send` catch-path diagnostics with `notification_send_route_failed`; no cost or behavior change. |
| 2026-06-27 | 1.1.1 | Added request-body cost note for 16KB notification send admission before reads/writes. |
| 2026-05-22 | 1.1.0 | Answerlattice notification logs moved to `answerlattice_notificationLogs`, idempotency changed to deterministic doc reads, test/status paths skip dedupe reads, and INR cost estimates added. |
| 2026-03-07 | 1.0.0 | Initial cost analysis |

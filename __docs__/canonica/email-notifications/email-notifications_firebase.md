# Canonica Email Notifications — Firebase Cost

> **Version:** 1.1.0
> **Last Updated:** 2026-05-22
> **Audience:** Developers / Ops

---

## New Collection

| Collection | Purpose | Scoping |
|------------|---------|---------|
| `canonica_notificationLogs` | Append-only log of Canonica notification send attempts | Canonica Firebase project, platform-admin read only |
| `notificationLogs` | Legacy/non-Canonica notification attempts | Default Firebase project |

## Reads/Writes Per Notification

| Operation | Collection | Count | Purpose |
|-----------|-----------|-------|---------|
| READ | `canonica_notificationLogs` | 0-1 | Idempotency check by deterministic event/reference document. Skipped when caller passes `skipDedup`. |
| READ | `canonica_notificationLogs` | 1 | Rate limit check (20/day per recipient) |
| WRITE | `canonica_notificationLogs` | 1 | Log send result (`sent`, `failed`, or `skipped`) |

**Total per normal ticket notification:** 2 reads + 1 write.
**Total per status/test notification:** 1 read + 1 write because those calls skip the unnecessary dedupe read.

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

Add to `firestore-canonica.indexes.json`:

```json
{
  "collectionGroup": "canonica_notificationLogs",
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
| 2026-05-22 | 1.1.0 | Canonica notification logs moved to `canonica_notificationLogs`, idempotency changed to deterministic doc reads, test/status paths skip dedupe reads, and INR cost estimates added. |
| 2026-03-07 | 1.0.0 | Initial cost analysis |

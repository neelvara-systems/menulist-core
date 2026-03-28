# Canonica Email Notifications — Firebase Cost

> **Version:** 1.0.0
> **Last Updated:** 2026-03-07
> **Audience:** Developers / Ops

---

## New Collection

| Collection | Purpose | Scoping |
|------------|---------|---------|
| `notificationLogs` | Append-only log of all notification send attempts | Global (by recipientEmail + eventType) |

## Reads/Writes Per Notification

| Operation | Collection | Count | Purpose |
|-----------|-----------|-------|---------|
| READ | `notificationLogs` | 1 | Idempotency check (dedup within 24h) |
| READ | `notificationLogs` | 1 | Rate limit check (20/day per recipient) |
| WRITE | `notificationLogs` | 1 | Log send result (sent/failed) |

**Total per notification: 2 reads + 1 write = $0.000126**

## Monthly Cost Projections

| Notifications/Month | Reads | Writes | Monthly Cost |
|---------------------|-------|--------|-------------|
| 100 | 200 | 100 | ~$0.01 |
| 1,000 | 2,000 | 1,000 | ~$0.13 |
| 10,000 | 20,000 | 10,000 | ~$1.26 |

## SMTP Cost

**$0.00** — Uses existing SMTP infrastructure (nodemailer + SMTP_HOST env vars). No paid email API (SendGrid, Resend, etc.) needed.

## Indexes Required

Add to `firestore.indexes.json`:

```json
{
  "collectionGroup": "notificationLogs",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "eventType", "order": "ASCENDING" },
    { "fieldPath": "referenceId", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "notificationLogs",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "recipientEmail", "order": "ASCENDING" },
    { "fieldPath": "status", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-07 | 1.0.0 | Initial cost analysis |

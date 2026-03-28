# Lifecycle Messaging — Firebase Cost Tracking

**Feature:** Lifecycle Messaging System  
**Last Updated:** Feb 20, 2026

---

## Collections Touched

| Collection      | Operations                     | Trigger                                |
| --------------- | ------------------------------ | -------------------------------------- |
| `messageLogs`   | Write (1 per message sent)     | Every messaging event                  |
| `messageLogs`   | Read (1 per idempotency check) | Before sending, check duplicate        |
| `stores`        | Read (1 per message)           | Get notification settings + store info |
| `subscriptions` | Read (1 per renewal check)     | Master scheduler renewal reminder task |

---

## Detailed Operations

### Reads

| Collection      | Trigger                          | Frequency                  | Docs Read       | Indexed?                                 |
| --------------- | -------------------------------- | -------------------------- | --------------- | ---------------------------------------- |
| `messageLogs`   | Idempotency check before send    | Per event (~3/store/month) | 1               | Yes: `storeId + eventType + referenceId` |
| `stores`        | Get recipient email + store name | Per event (~3/store/month) | 1               | Already indexed                          |
| `subscriptions` | Renewal reminder scan            | Daily (scheduler)          | All active subs | Yes: `status + renewsOn`                 |

### Writes

| Collection    | Trigger                  | Frequency                  | Fields    | Merge/Set     |
| ------------- | ------------------------ | -------------------------- | --------- | ------------- |
| `messageLogs` | After every send attempt | Per event (~3/store/month) | 10 fields | Set (new doc) |

### Deletes

None. Message logs are never deleted.

---

## DAL Function → Firebase Operation Map

| Function                     | File                                         | Operations                                                     |
| ---------------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| `sendLifecycleMessage()`     | `functions/src/messaging/messagingEngine.ts` | 1 read (idempotency) + 1 read (store) + 1 write (log)          |
| `sendLifecycleMessage()`     | `src/lib/messaging/index.ts`                 | 1 read (idempotency) + 1 read (rate limit) + 1 write (log)     |
| `sendInternalNotification()` | `src/lib/messaging/index.ts`                 | 1 read (feature flag) + 1 write (systemAlerts via createAlert) |
| `checkRenewalReminders()`    | `functions/src/messaging/messagingEngine.ts` | N reads (subscriptions) + N×3 ops per reminder                 |
| `checkSuspensionWarnings()`  | `functions/src/messaging/messagingEngine.ts` | N reads (subscriptions) + N×3 ops per warning                  |
| `retryFailedMessages()`      | `functions/src/messaging/messagingEngine.ts` | 1 read (failed msgs, limit 20) + N writes (retryCount update)  |
| `getDailyMessageDigest()`    | `functions/src/messaging/messagingEngine.ts` | 2 count queries (sent + failed from last 24h)                  |

---

## Cost Estimate

### At 50 Active Stores

| Operation                   | Count/Month | Cost              |
| --------------------------- | ----------- | ----------------- |
| Reads (idempotency + store) | ~300        | ₹0.02             |
| Writes (message logs)       | ~150        | ₹0.03             |
| SMTP emails (Gmail)         | ~150        | Free (Gmail SMTP) |
| **Total**                   |             | **~₹0.05/month**  |

### At 500 Active Stores

| Operation           | Count/Month | Cost                                        |
| ------------------- | ----------- | ------------------------------------------- |
| Reads               | ~3,000      | ₹0.20                                       |
| Writes              | ~1,500      | ₹0.30                                       |
| SMTP emails (Gmail) | ~1,500      | Free (Gmail: 500/day personal, 2000/day WS) |
| **Total**           |             | **~₹0.50/month**                            |

---

## Indexes Required

```
// firestore.indexes.json
{
  "collectionGroup": "messageLogs",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "storeId", "order": "ASCENDING" },
    { "fieldPath": "eventType", "order": "ASCENDING" },
    { "fieldPath": "referenceId", "order": "ASCENDING" }
  ]
}
```

---

## Expensive Patterns to Avoid

- ❌ Reading all message logs for analytics → use Firebase Console queries
- ❌ Real-time listener on messageLogs → no dashboard needed
- ❌ Storing full HTML in message logs → store only metadata
- ❌ Per-message delivery status polling → log once, done

---

## Decision: Why nodemailer (Free SMTP) Instead of Resend

| Factor            | nodemailer + SMTP                    | Resend                                 |
| ----------------- | ------------------------------------ | -------------------------------------- |
| **Cost**          | ₹0 (Gmail SMTP is free)              | Free tier 100/day, then $20/month      |
| **Dependency**    | npm package, any SMTP server         | Paid API, vendor lock-in               |
| **Setup**         | Gmail App Password (5 min)           | Account creation + domain verification |
| **Limits**        | 500/day personal, 2000/day Workspace | 100/day free, unlimited paid           |
| **At 50 stores**  | ~5 emails/day (well within limits)   | ~5 emails/day (within free tier)       |
| **At 500 stores** | ~50 emails/day (within WS limits)    | ~50 emails/day (need paid plan)        |

**Verdict:** nodemailer + Gmail SMTP is free at any realistic scale for MenuList. No paid API needed.

---

_Last updated: Feb 20, 2026_

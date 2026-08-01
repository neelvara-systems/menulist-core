# Lifecycle Messaging — Firebase Cost Tracking

**Feature:** Lifecycle Messaging System  
**Last Updated:** Feb 20, 2026

---

## July 10, 2026 Transaction And Tenant Cost Boundary

The migrated owner-notification path now creates `ownerNotificationEvents/{eventId}` through a transaction (one direct read and one conditional create) and claims `processingAttempt` through a transaction (one direct read and one status write) before recipient or provider work. This does not add a collection or composite index. MenuList store rate-limit keys now include tenant identity; Answerlattice workspace and MenuList store reads fail closed when their stored tenant does not match the event.

Retry and digest queries no longer read arbitrary bounded status snapshots and filter them in memory. Retry uses the `ownerNotificationEvents(status ASC, updatedAt ASC)` index for a bounded 24-hour window. Digest uses `ownerNotificationDeliveries(status ASC, createdAt ASC)` aggregate counts, so totals remain correct above 200 deliveries. Deterministic delivery rows preserve first creation time and record the current attempt and last-attempt time.

Both legacy lifecycle engines retain the historical duplicate query for old random-ID rows and add one deterministic `messageLogs/{sha256}` transaction claim before SMTP. A successful or failed provider outcome updates that same claimed row instead of appending a random document. If the claim read/write fails, the send is skipped. This adds at most one direct read and one conditional write per legacy delivery attempt and prevents concurrent same-reference sends. `sending` is intentionally not auto-retried because provider acceptance may already have occurred.

The renewal and suspension scans are bounded to five pages of 100 subscriptions and use the deployed-source composite query contracts `status + renewsOn` and `status + pastDueSinceAt`. The index and Functions changes require scoped Firebase deployment before live effect; source verification does not certify deploy state or provider delivery.

July 10 deploy evidence: the Node 22 MenuList QA index attempt read the updated indexes and rules, then failed at the Firestore Rules API test endpoint with HTTP 403 caller permission. The Functions attempt targeted `verifyMenuPublish`, `computeDecisionBlocksScores`, `triggerDecisionBlocksScoring`, and `triggerStoreNightlyScheduler`; predeploy lint/build passed and Cloud Resource Manager lookup then failed with HTTP 403 caller permission. No index or Function was uploaded.

The latest rerun after the owner-notification retry/digest correction produced the same results: updated indexes were not uploaded because the Rules API test request returned HTTP 403, and updated Functions were not uploaded because Cloud Resource Manager returned HTTP 403 after predeploy lint/build passed.

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

June 29 Functions lifecycle messaging diagnostic hardening caps source error names, codes, and status values before idempotency, store lookup, message-log write, owner-notification fallback, renewal/suspension reminder, retry, and digest failure logs. This changes no Firestore read/write count, SMTP send behavior, retry behavior, scheduler cadence, collection shape, index, Storage operation, Firebase Auth operation, Cloud Function invocation path, cache invalidation, owner setting, public route, or rules behavior.

July 5 Functions fail-closed update: failed idempotency and rate-limit checks add zero SMTP sends and zero `messageLogs` writes. The failed safety query itself remains the only attempted read in that path, and the engine logs a bounded failure code before skipping the legacy email send. Failed feature-flag reads also skip sending, and retry-send exceptions still perform the existing retried-marker write after recording bounded diagnostics.

July 5 legacy lifecycle event/status diagnostic update: Cloud Functions lifecycle diagnostics now log event type and message status as presence/length/type metadata instead of raw string values. This changes diagnostics only and does not add Firestore reads/writes, change `messageLogs.eventType`, change `messageLogs.status`, alter idempotency queries, alter retry/digest queries, change SMTP sends, add indexes, change rules, or add Storage operations. A scoped Functions deploy is required for live effect.

July 5 owner-notification migration diagnostics update: failed queue-first lifecycle flag reads add no Firestore writes, no provider calls, and no owner-notification event documents because delivery is skipped before event creation. Unknown incoming trigger types also skip before event creation. Stored unknown-trigger rows keep the existing single skipped-event merge with the stable `unknown_trigger` code. The change adds bounded Cloud Functions diagnostics only and requires a scoped Functions deploy for live effect.

July 5 SMTP port fail-closed update: missing or invalid `SMTP_PORT` adds zero SMTP sends and zero `messageLogs` writes in the Functions provider and root app senders. The Functions provider returns `SMTP_NOT_CONFIGURED` before creating a nodemailer transporter, while the app-side senders return the existing local not-configured result before creating a transporter. The lifecycle engine logs the failed delivery using the existing bounded message-log path when message logging is reachable. No Firestore read/write shape, index, rules, scheduler cadence, Storage operation, or provider call count changes for valid SMTP configuration.

July 5 app-side notification safety update: failed duplicate or rate-limit safety reads in `src/lib/messaging/index.ts` and `src/lib/notifications/index.ts` add zero SMTP sends. The failed safety query itself remains the only attempted read in that path, bounded diagnostics are logged, and the send is skipped through the same duplicate/rate-limited control flow. No collection shape, index, rule, Storage operation, Cloud Function deploy requirement, owner setting, public route, or provider call count changes for normal duplicate checks, normal rate-limit checks, or valid sends.

July 5 staleness delivery diagnostics update: failed `MENU_STALE` lifecycle delivery after a staleness detection row is written now logs bounded diagnostics and keeps the existing cooldown fallback. This adds no Firestore reads or writes beyond the already-written staleness detection row, no new index, no Storage operation, no rule change, and no cache invalidation path.

July 29 credential-free URL projection changes template rendering only. It adds
no Firestore read/write/delete, index, Storage operation or cache behavior.
The affected Functions entry points are `menulistMaintenanceScheduler` and
`verifyMenuPublish`. Their narrow `menulist-qa` deployment was attempted after
build/lint validation but is blocked locally because Firebase CLI
authentication is unavailable.

July 5 template output update: lifecycle template output hardening adds zero Firestore reads/writes/deletes, zero Storage operations, zero provider calls, no new index, no rule change, and no cache invalidation path. It changes only the rendered email/manual-message content boundary: metadata is escaped before HTML output, email links must parse as `http:`/`https:`, and publish-health failure codes render fixed owner copy instead of arbitrary `failureReason` strings. The app-side mirror requires the normal Next.js release path when released; the Functions mirror requires a scoped Firebase Functions deploy before live effect.

July 5 template output deploy note: the scoped `menulist-qa` deploy target list was `verifyMenuPublish`, `computeDecisionBlocksScores`, `triggerDecisionBlocksScoring`, and `triggerStoreNightlyScheduler`; the exact command is recorded in `__docs__/audits/menulist-production-readiness-audit.md`. The attempt completed predeploy lint/build and then failed before upload with Cloud Resource Manager HTTP 403 caller permission for `menulist-qa`. Live Functions effect remains blocked until an account with project access can deploy the changed Functions bundle.

July 13 publish-verification completion update: awaiting the two existing lifecycle delivery promises adds no Firestore read/write, message log, provider request, index, rule, Storage operation, or cache invalidation beyond the work those promises already perform. It changes only invocation ordering so `verifyMenuPublish` remains alive until the best-effort lifecycle side effect settles. Live effect requires redeploying `functions:verifyMenuPublish`.

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

## Subscription scan identity boundary (July 22, 2026)

The existing product/status/time ordered scans remain bounded and indexed. Each returned row is exact-projected before store reads, message-log checks or SMTP work. Restart 430 adds no query/index/rule or message write; it prevents ambiguous subscription scope from triggering downstream reads and sends. The affected Functions target still requires QA deployment.

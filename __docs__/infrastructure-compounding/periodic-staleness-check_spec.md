# Periodic Staleness Check — Spec + Implementation

**Feature:** 10.4  
**Priority:** P1 — Authority Phase  
**Status:** 📋 DOCUMENTATION PHASE  
**Depends On:** 10.3 (Store Truth Confidence Score)  
**Feeds Into:** Nothing (end of chain)

---

## 1. What Is This?

A nightly check that identifies stores whose menu data hasn't been confirmed or updated in 90+ days, then sends a gentle lifecycle message: **"Your menu information is still live. Everything still correct?"**

This keeps data fresh without dashboards, notifications, or nagging. One calm message every 90 days. Infrastructure-grade freshness guarantee.

---

## 2. Why Does This Matter?

**Current state:** If an owner uploads their menu and never touches it again, MenuList has no way to know if the data is still accurate. After 6 months, prices may have changed, items may be discontinued, hours may be different. MenuList continues serving potentially stale data as "canonical truth."

**Problem for upstream positioning:** If Google Maps shows a menu that's 6 months old and wrong, MenuList loses its canonical authority. The whole value proposition of "always correct" breaks down.

**Solution:** Periodic gentle reconfirmation. Not nagging — just a calm "still correct?" check. If the owner confirms (even by doing nothing for another 90 days), we know the data is at least acknowledged. If the owner updates, the data gets fresher. Either way, we have a freshness signal.

---

## 3. Existing Infrastructure

### Lifecycle Messaging Engine
- **`functions/src/messaging/messagingEngine.ts`** — Already handles:
  - Renewal reminders (3 days before renewal)
  - Suspension warnings (7+ days past due)
  - Message retry (failed messages retried once)
  - Daily digest (aggregates for founder)
- **Message templates:** Structured with `type`, `subject`, `body`, `metadata`
- **Delivery:** Email via existing email infrastructure
- **Idempotency:** `messageLogs` collection prevents duplicate sends
- **Feature flags:** Already integrated with `FUNCTION_FLAGS`

### Store Truth Confidence (10.3)
- **`platformSummary/storeTruthConfidence`** — Contains per-store:
  - `staleFlag: boolean` — true if `daysSincePublish > 90`
  - `daysSincePublish: number`
  - `score: number` — composite confidence score
  - `lastPublishedAt: Timestamp`

### Nightly Scheduler
- Already runs lifecycle messaging tasks (renewal + suspension)
- Task results tracked in `schedulerRunLogs`
- Non-blocking pattern established

### Message Logs (Idempotency)
- **`messageLogs/{logId}`** — Prevents duplicate messages
- Already used by renewal reminders and suspension warnings
- Schema includes: `type`, `recipientId`, `sentAt`, `status`

---

## 4. Implementation Plan

### 4.1 Approach: Add New Message Type to Existing Engine

No new systems. Just a new message type (`staleness_check`) in the existing lifecycle messaging engine, triggered by data from 10.3.

### 4.2 Message Design

**Subject:** "Your menu is still live — everything still correct?"

**Body (doctrine-compliant — calm, no urgency, no metrics):**

```
Hi {ownerName},

Your {businessName} menu on MenuList is live and being shown to customers.

If anything has changed — prices, hours, items — you can update it anytime at {dashboardLink}.

If everything is still correct, no action needed.

— MenuList
```

**Design rules (per Doc 01, Doc 02, Doc 10):**
- No urgency language ("Your menu may be outdated!")
- No metrics ("Your menu hasn't been updated in 93 days")
- No comparison ("Other businesses update more frequently")
- No nagging (one message per 90-day window, max)
- Simple confirmation path (link to dashboard, or ignore)
- Calm, infrastructure-grade tone

### 4.3 Staleness Criteria

A store is "stale" when ALL of these are true:

1. `daysSincePublish >= 90` (from 10.3 `storeTruthConfidence`)
2. Store has an active subscription (don't message free/cancelled stores)
3. No staleness message sent in the last 90 days (idempotency via `messageLogs`)
4. Store is not in `phase3_dormant` authority maturation (dormant owners won't respond)

### 4.4 Implementation

#### New function in messaging engine

```typescript
// functions/src/messaging/stalenessCheck.ts

export async function checkStalenessAndNotify(): Promise<{
    checked: number;
    staleFound: number;
    messagesSent: number;
    skippedRecent: number;
    skippedDormant: number;
    errors: number;
}> {
    const db = admin.firestore();
    const result = { checked: 0, staleFound: 0, messagesSent: 0, 
                     skippedRecent: 0, skippedDormant: 0, errors: 0 };
    
    // 1. Read storeTruthConfidence (1 read — already computed by 10.3)
    const truthDoc = await db.collection('platformSummary')
        .doc('storeTruthConfidence').get();
    if (!truthDoc.exists) return result;
    
    const stores = truthDoc.data()?.stores || {};
    
    // 2. For each stale store
    for (const [sId, storeData] of Object.entries(stores)) {
        result.checked++;
        
        if (!storeData.staleFlag) continue;
        result.staleFound++;
        
        // 3. Check idempotency: was staleness message sent in last 90 days?
        const recentMessage = await db.collection('messageLogs')
            .where('type', '==', 'staleness_check')
            .where('recipientStoreId', '==', sId)
            .where('sentAt', '>=', Timestamp.fromDate(daysAgo(90)))
            .limit(1).get();
        
        if (!recentMessage.empty) {
            result.skippedRecent++;
            continue;
        }
        
        // 4. Check authority maturation (skip dormant)
        if (storeData.maturationPhase === 'phase3_dormant') {
            result.skippedDormant++;
            continue;
        }
        
        // 5. Get store owner email
        const storeDoc = await db.collection('stores').doc(sId).get();
        const storeInfo = storeDoc.data();
        if (!storeInfo?.email) continue;
        
        // 6. Send message via existing messaging infrastructure
        try {
            await sendStalenessMessage({
                recipientEmail: storeInfo.email,
                ownerName: storeInfo.ownerName || storeInfo.businessName,
                businessName: storeInfo.businessName,
                sId,
                tId: storeData.tId,
                daysSincePublish: storeData.daysSincePublish,
            });
            result.messagesSent++;
        } catch (err) {
            result.errors++;
        }
    }
    
    return result;
}
```

#### Message sending function

```typescript
async function sendStalenessMessage(params: {
    recipientEmail: string;
    ownerName: string;
    businessName: string;
    sId: string;
    tId: string;
    daysSincePublish: number;
}): Promise<void> {
    // Use existing email infrastructure (same as renewal reminders)
    // Log to messageLogs for idempotency
    
    const messageLog = {
        type: 'staleness_check',
        recipientStoreId: params.sId,
        recipientEmail: params.recipientEmail,
        sentAt: Timestamp.now(),
        status: 'sent',
        metadata: {
            daysSincePublish: params.daysSincePublish,
            businessName: params.businessName,
        },
    };
    
    // Send email
    await sendEmail({
        to: params.recipientEmail,
        subject: 'Your menu is still live — everything still correct?',
        template: 'staleness_check',
        data: {
            ownerName: params.ownerName,
            businessName: params.businessName,
            dashboardLink: `https://menulist.ai/dashboard`,
        },
    });
    
    // Log for idempotency
    await db.collection('messageLogs').add(messageLog);
}
```

### 4.5 Integration with Nightly Scheduler

In `decisionBlocksScoring.ts`, add AFTER Store Truth Confidence (10.3):

```typescript
// Periodic Staleness Check (Infrastructure Compounding 10.4)
if (FUNCTION_FLAGS.ENABLE_STALENESS_CHECK) {
    try {
        const taskStart = Date.now();
        logger.info('=== Starting Periodic Staleness Check ===');
        const { checkStalenessAndNotify } = await import('./messaging/stalenessCheck');
        const stalenessResult = await checkStalenessAndNotify();
        logger.info(`Staleness Check: ${stalenessResult.checked} checked, ${stalenessResult.staleFound} stale, ${stalenessResult.messagesSent} messages sent`);
        if (stalenessResult.skippedRecent > 0) {
            logger.info(`  Skipped (recent message): ${stalenessResult.skippedRecent}`);
        }
        if (stalenessResult.skippedDormant > 0) {
            logger.info(`  Skipped (dormant): ${stalenessResult.skippedDormant}`);
        }
        taskResults.push({ 
            name: 'staleness_check', 
            status: 'success', 
            durationMs: Date.now() - taskStart, 
            details: stalenessResult 
        });
    } catch (stalenessError: any) {
        logger.error('Staleness Check failed:', stalenessError.message);
        taskResults.push({ name: 'staleness_check', status: 'failed', error: stalenessError.message });
    }
}
```

---

## 5. Feature Flags

```typescript
// functions/src/constants/features.ts
ENABLE_STALENESS_CHECK: true,       // Master toggle
STALENESS_THRESHOLD_DAYS: 90,       // Days before considered stale
STALENESS_COOLDOWN_DAYS: 90,        // Days between staleness messages

// src/config/features.ts
// No client-side flag needed — purely server-side
```

---

## 6. Data Flow

```
Nightly Scheduler (2:30 AM UTC)
    ↓
[10.3 Store Truth Confidence runs first — computes staleFlag per store]
    ↓
checkStalenessAndNotify()
    ↓
Read platformSummary/storeTruthConfidence (1 read)
    ↓
For each store with staleFlag=true:
  Check messageLogs for recent staleness_check (1 read per stale store)
  Skip if message sent <90 days ago
  Skip if phase3_dormant
    ↓
  Read store doc for owner email (1 read per stale store needing message)
    ↓
  Send email via existing infrastructure
  Log to messageLogs (1 write per message)
    ↓
Owner receives calm "still correct?" email
    ↓
Owner either:
  a) Logs in and updates → freshness score improves → no longer stale
  b) Ignores → another check in 90 days
  c) Unsubscribes → no more messages (standard email unsubscribe)
```

---

## 7. What This Does NOT Do

- ❌ No push notifications (email only)
- ❌ No in-app banners or alerts
- ❌ No urgency language or fear tactics
- ❌ No metrics shown to owner ("93 days since update")
- ❌ No blocking of service (stale menus still served)
- ❌ No penalty for not responding
- ❌ No multiple follow-ups (one message per 90-day window)
- ❌ No automated actions based on staleness (no auto-unpublish)

---

## 8. Success Criteria

1. Stale stores (>90 days since publish) receive one calm email
2. No duplicate messages (idempotency via `messageLogs`)
3. Dormant owners (phase3) are skipped (won't respond anyway)
4. 10-20% of stale store owners log in and update after receiving message
5. Zero complaints about nagging or urgency
6. Total Firebase cost: <$0.01/month at 100 stores
7. Message tone passes Doc 02 Language Governance review

---

## 9. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Owners perceive message as nagging | Calm tone, no metrics, no urgency. Doc 02 compliant. Max 1 per 90 days |
| Email deliverability issues | Uses same infrastructure as renewal reminders (already proven) |
| Too many stale stores overwhelm email | Max 50 messages per night (throttle). Process over multiple nights if needed |
| Owner updates but data is still wrong | Not this feature's problem — 10.1/10.2 handle extraction quality |
| False positive staleness | Only flag if >90 days AND no publish. If owner publishes (even without changes), timer resets |

---

## 10. Files to Create/Modify

| File | Action | Change |
|------|--------|--------|
| `functions/src/messaging/stalenessCheck.ts` | CREATE | Staleness check + message sending |
| `functions/src/decisionBlocksScoring.ts` | MODIFY | Add staleness check task to scheduler |
| `functions/src/constants/features.ts` | MODIFY | Add `ENABLE_STALENESS_CHECK` + threshold flags |
| Email template (existing infrastructure) | CREATE | `staleness_check` email template |

**New files:** 2 (`stalenessCheck.ts`, email template)  
**Modified files:** 2  
**New Firestore collections:** 0  
**New Firestore documents:** 0 (uses existing `messageLogs`)

---

**Author:** Cascade (Lead Architect)  
**Created:** February 24, 2026

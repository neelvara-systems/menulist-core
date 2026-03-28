# 🧪 Step 3: Analytics Aggregation Testing

**Duration:** 20 minutes  
**Prerequisite:** Steps 1 & 2 completed successfully  
**Next Step:** STEP_4_AI_INTELLIGENCE.md

---

## 🎯 **WHAT WE'RE TESTING**

How raw chat sessions get aggregated into analytics:
1. ✅ Manual aggregation (backfill tool)
2. ✅ Daily Cloud Function aggregation
3. ✅ Analytics data structure
4. ✅ Store-level isolation (tId + sId)
5. ✅ Metrics accuracy

---

## 📊 **DATABASE COLLECTIONS INVOLVED**

### **Input:** `chatSessions` (from Step 1 & 2)
### **Output:** `chatAnalytics`

**Document ID Format:** `{tId}_{sId}_{YYYY-MM-DD}`  
**Example:** `5_12_2025-10-29`

**Expected Structure:**
```json
{
  "id": "5_12_2025-10-29",
  "tId": "5",
  "sId": "12",
  "date": "2025-10-29",
  "totalChats": 3,
  "totalMessages": 12,
  "satisfiedUsers": 2,
  "totalFeedback": 2,
  "positiveFeedback": 2,
  "negativeFeedback": 0,
  "qnaModeCount": 2,
  "assistantModeCount": 1,
  "avgMessagesPerChat": 4,
  "topQuestions": [
    {
      "question": "How do I reset my password?",
      "count": 1,
      "category": "account"
    }
  ],
  "createdOn": Timestamp,
  "modifiedOn": Timestamp
}
```

---

## 🗂️ **FILES INVOLVED**

### **Frontend (Manual Backfill UI):**
1. **Component:** `src/components/templates/platform/chatManagement/AnalyticsBackfill.tsx`
   - UI for manual aggregation
   - Date range selector (1-7 days)
   - Owner-only access

### **Backend (Aggregation Logic):**
1. **API Route:** `src/app/api/analytics/trigger-manual/route.ts`
   - Validates user role
   - Calls Cloud Function

2. **Cloud Function:** `functions/src/aggregateDailyChatStats.ts`
   - Main aggregation logic
   - Processes one day at a time
   - Scheduled to run daily at 1 AM UTC

3. **Manual Trigger:** `functions/src/triggerAggregationManual.ts`
   - Callable function for backfill
   - Processes multiple days sequentially

### **Database Layer:**
1. **DAL:** `src/database/chatAnalytics/index.ts`
   - `getDailyAnalytics()` - Fetch analytics for a date
   - `getConversationsPaginated()` - Used by admin UI

---

## 🧪 **TEST PROCEDURE**

### **Test 3.1: Manual Backfill (1 Day)** ⭐ START HERE

**Prerequisites:**
- At least 2 chat sessions from Step 1
- Sessions created TODAY
- Logged in as PLATFORM_OWNER or admin

**Steps:**
1. Navigate to: `/platform/chat-management` (admin dashboard)
2. Find "Analytics Backfill" section or button
3. Select **1 day** backfill
4. Click "Run Aggregation"
5. Wait for completion

**Expected Behavior:**
- ✅ Loading indicator shows
- ✅ Success notification after ~5-10 seconds
- ✅ Summary shows: "Processed X sessions for 1 day"
- ✅ No errors in console

**Console Logs to Watch:**
```typescript
console.log('Triggering aggregation...', { days: 1 })
console.log('Aggregation complete:', { success: true, processed: X })
```

**Database Check:**
1. Open Firestore → `chatAnalytics` collection
2. Find document with ID: `{tId}_{sId}_{today's date}`
   - Example: `5_12_2025-10-29`

**Verify Document Structure:**
```json
{
  "id": "5_12_2025-10-29",
  "tId": "5",
  "sId": "12",
  "date": "2025-10-29",
  "totalChats": 2, // Should match your session count
  "totalMessages": 8, // Sum of all messages from today
  "satisfiedUsers": 1, // Sessions with positive feedback
  "totalFeedback": 1, // Total feedback submitted
  "positiveFeedback": 1,
  "negativeFeedback": 0,
  "qnaModeCount": 1,
  "assistantModeCount": 1,
  "avgMessagesPerChat": 4.0,
  "topQuestions": [...],
  "createdOn": Timestamp,
  "modifiedOn": Timestamp
}
```

**Manual Validation:**
Count your sessions manually and compare:
- Sessions created today: ___
- Total messages: ___
- Positive feedback: ___
- QnA mode sessions: ___
- Assistant mode sessions: ___

**Report:**
```markdown
### Test 3.1 Results:
- ✅/❌ Backfill completed
- Expected sessions: [your count]
- Actual in analytics: [from chatAnalytics doc]
- ✅/❌ Counts match
- 📊 Analytics doc ID: [paste]
```

---

### **Test 3.2: Verify Store-Level Isolation**

**Critical Security Test!**

**Steps:**
1. Check the `chatAnalytics` document ID
2. Verify format: `{tId}_{sId}_{date}`

**Expected:**
- ✅ Document ID includes BOTH `tId` AND `sId`
- ✅ Not just `{tId}_{date}` (would be tenant-level, WRONG!)

**Why This Matters:**
- One tenant can have multiple stores
- Analytics must be isolated per store
- Prevents data mixing

**Database Query Test:**
```javascript
// Firestore Console → Run Query
db.collection('chatAnalytics')
  .where('tId', '==', 'YOUR_TID')
  .where('sId', '==', 'YOUR_SID')
  .get()
  .then(snapshot => {
    console.log('Analytics docs for your store:', snapshot.size);
    snapshot.forEach(doc => console.log('Doc ID:', doc.id));
  });
```

**Verify:**
- [ ] All analytics docs have `tId` field
- [ ] All analytics docs have `sId` field
- [ ] Document IDs follow format: `{tId}_{sId}_{date}`
- [ ] No documents with just `{tId}_{date}` format

**Report:**
```markdown
### Test 3.2 Results:
- ✅/❌ Document ID format correct
- ✅/❌ Both tId and sId present
- Sample doc ID: [paste]
```

---

### **Test 3.3: Metrics Accuracy Check**

**Manual Calculation Test:**

From Step 1, count:
1. Total chat sessions created today: **___**
2. Total messages (user + AI) today: **___**
3. Sessions with positive feedback: **___**
4. Sessions with negative feedback: **___**
5. QnA mode sessions: **___**
6. Assistant mode sessions: **___**

**Compare with Analytics Document:**
```json
{
  "totalChats": ___, // Should match #1
  "totalMessages": ___, // Should match #2
  "satisfiedUsers": ___, // Should match #3
  "positiveFeedback": ___, // Count of 👍
  "negativeFeedback": ___, // Count of 👎
  "qnaModeCount": ___, // Should match #5
  "assistantModeCount": ___ // Should match #6
}
```

**Formula Check:**
```javascript
avgMessagesPerChat = totalMessages / totalChats
// Example: 8 messages / 2 chats = 4.0
```

**Verify:**
- [ ] `totalChats` matches actual count
- [ ] `totalMessages` matches actual count
- [ ] `satisfiedUsers` correct (sessions with 👍 feedback)
- [ ] `avgMessagesPerChat` calculation correct
- [ ] Mode counts (qnaModeCount + assistantModeCount) = totalChats

**Report:**
```markdown
### Test 3.3 Results:
- Manual count: [X sessions, Y messages]
- Analytics count: [A sessions, B messages]
- ✅/❌ Counts match
- ✅/❌ Calculations correct
```

---

### **Test 3.4: Multi-Day Backfill (3 Days)**

**Purpose:** Test backfill for historical data

**Prerequisites:**
- Create chat sessions on different dates (if possible)
- Or use today's data and backfill 3 days (will create docs for today - 2, today - 1, today)

**Steps:**
1. Go to Analytics Backfill UI
2. Select **3 days** backfill
3. Click "Run Aggregation"
4. Wait for completion

**Expected Behavior:**
- ✅ Processing takes longer (~15-30 seconds)
- ✅ Success message: "Processed X sessions for 3 days"
- ✅ Multiple analytics documents created

**Database Check:**
- Firestore → `chatAnalytics` collection
- Should see 3 documents (one per day):
  - `{tId}_{sId}_{today}`
  - `{tId}_{sId}_{today-1}`
  - `{tId}_{sId}_{today-2}`

**Verify:**
- [ ] 3 documents created
- [ ] Each has correct date field
- [ ] Documents for days with no chats have `totalChats: 0`
- [ ] No duplicate documents

**Report:**
```markdown
### Test 3.4 Results:
- Days backfilled: 3
- Documents created: [count]
- ✅/❌ One doc per day
- Doc IDs: [list all 3]
```

---

### **Test 3.5: Idempotency Test (Run Twice)**

**Purpose:** Verify running aggregation twice doesn't duplicate data

**Steps:**
1. Note the `totalChats` value from Test 3.1
2. Run **1 day backfill** AGAIN
3. Check the same analytics document

**Expected Behavior:**
- ✅ `totalChats` remains the same (not doubled!)
- ✅ `modifiedOn` timestamp updated
- ✅ No duplicate data

**Why This Matters:**
- Aggregation should be idempotent
- Safe to re-run without corrupting data
- Important for Cloud Function retries

**Verify:**
```json
// Before 2nd run:
{
  "totalChats": 2,
  "modifiedOn": "2025-10-29 10:00:00"
}

// After 2nd run:
{
  "totalChats": 2, // ✅ SAME (not 4!)
  "modifiedOn": "2025-10-29 10:15:00" // ✅ UPDATED
}
```

**Code Logic:**
```typescript
// functions/src/aggregateDailyChatStats.ts
// Should REPLACE document, not INCREMENT
await setDoc(analyticsRef, analyticsData, { merge: true });
// merge: true updates fields, doesn't duplicate
```

**Report:**
```markdown
### Test 3.5 Results:
- totalChats before: [X]
- totalChats after 2nd run: [X] (should be same)
- ✅/❌ Idempotency verified
```

---

### **Test 3.6: Cloud Function Scheduled Run (Optional)**

**Purpose:** Verify automatic daily aggregation

**Note:** This test requires waiting for the actual scheduled time or manually triggering the Cloud Function.

**Scheduled Time:** Daily at 1:00 AM UTC

**Manual Trigger (if deployed):**
```bash
# Firebase Console → Functions → aggregateDailyChatStats
# Click "Test function" or use gcloud CLI:
gcloud functions call aggregateDailyChatStats
```

**Or wait until tomorrow and check:**
1. Firestore → `chatAnalytics`
2. Look for new document: `{tId}_{sId}_{yesterday's date}`

**Verify:**
- [ ] Cloud Function runs automatically
- [ ] New analytics document created daily
- [ ] No manual intervention needed

**Report:**
```markdown
### Test 3.6 Results:
- ✅/❌ Scheduled function runs
- ⏭️ Skipped (testing manually only)
```

---

## 🐛 **COMMON ISSUES & FIXES**

### **Issue: "Unauthorized" error**
**Cause:** User not PLATFORM_OWNER or admin  
**Check:**
- Session role in Redux store
- API route role validation
```typescript
if (session.role !== 'PLATFORM_OWNER') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

### **Issue: Analytics document has 0 for all metrics**
**Cause:** Aggregation query not finding sessions  
**Check:**
- Date range in query
- `tId` and `sId` filters in Cloud Function
```typescript
.where('tId', '==', tId)
.where('sId', '==', sId) // ← Must be present!
.where('createdOn', '>=', startOfDay)
```

### **Issue: Multiple documents for same day**
**Cause:** Document ID not deterministic  
**Fix:** Ensure ID format is always `{tId}_{sId}_{YYYY-MM-DD}`

### **Issue: Metrics doubled after 2nd run**
**Cause:** Not idempotent (incrementing instead of replacing)  
**Fix:** Use `setDoc()` with `merge: true`, not `FieldValue.increment()`

### **Issue: Cloud Function timeout**
**Cause:** Processing too many sessions  
**Fix:** Increase timeout in function config:
```typescript
export const aggregateDailyChatStats = onSchedule({
  timeoutSeconds: 300, // 5 minutes
  memory: '512MiB'
})
```

---

## ✅ **VERIFICATION CHECKLIST**

Before moving to Step 4, confirm:

**Functionality:**
- [ ] Manual backfill works (1 day)
- [ ] Multi-day backfill works (3 days)
- [ ] Idempotency verified (no duplication)
- [ ] No errors in console

**Data Structure:**
- [ ] Document ID format: `{tId}_{sId}_{YYYY-MM-DD}`
- [ ] All analytics docs have `tId` AND `sId`
- [ ] All required metrics fields present

**Accuracy:**
- [ ] `totalChats` matches actual count
- [ ] `totalMessages` matches actual count
- [ ] Feedback counts correct
- [ ] Mode counts correct

**Security:**
- [ ] Store-level isolation verified
- [ ] Owner-only access enforced
- [ ] No cross-tenant data

---

## 📊 **FINAL REPORT FORMAT**

```markdown
# Step 3 Complete Report

## ✅ Passing Tests:
- Test 3.1: Manual backfill (1 day) ✅
- Test 3.2: Store isolation ✅
- Test 3.3: Metrics accuracy ✅
- Test 3.4: Multi-day backfill ✅
- Test 3.5: Idempotency ✅
- Test 3.6: Scheduled run ✅/⏭️

## ❌ Failing Tests:
- None (or list with details)

## 📊 Analytics State:
- Documents created: [count]
- Sample doc ID: [paste]
- totalChats: [X]
- totalMessages: [Y]

## 🐛 Issues Found:
- None (or list with error messages)

## 📸 Screenshots:
- Analytics document: [screenshot]
- Backfill UI: [screenshot if issues]

## ✅ Ready for Step 4: YES/NO
```

---

## 🎯 **NEXT STEP**

Once analytics aggregation is verified, move to:  
**`STEP_4_AI_INTELLIGENCE.md`**

We'll test AI-powered insights generation (Weekly Narrative, Feedback Intelligence, KB Quality).

---

**Questions?** Report back with your analytics data and I'll verify! 🚀

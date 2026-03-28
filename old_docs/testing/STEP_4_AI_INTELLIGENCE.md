# 🧪 Step 4: AI Intelligence Generation Testing

**Duration:** 25 minutes  
**Prerequisite:** Steps 1, 2, 3 completed successfully  
**Next Step:** STEP_5_ADMIN_UI.md

---

## 🎯 **WHAT WE'RE TESTING**

AI-powered insights generation using Gemini 2.5 Flash:
1. ✅ Master Scheduler orchestration
2. ✅ Weekly Narrative generation
3. ✅ Feedback Intelligence analysis
4. ✅ KB Quality scoring
5. ✅ Manual regeneration

---

## 📊 **DATABASE COLLECTIONS INVOLVED**

### **Input:** `chatAnalytics` (from Step 3)
### **Output:** `insights/{tId}/stores/{sId}/ai/*`

**Collections Created:**
```
insights/
  └── {tId}/
      └── stores/
          └── {sId}/
              └── ai/
                  ├── weekly (Weekly Narrative)
                  ├── feedback (Feedback Intelligence)
                  └── kbQuality (KB Quality Analysis)
```

---

## 🗂️ **FILES INVOLVED**

### **Cloud Functions (Backend):**
1. **Master Scheduler:** `functions/src/schedulers/masterScheduler.ts`
   - Orchestrates all AI tasks
   - Runs daily at 2 AM UTC
   - Weekly narrative on Sundays only

2. **Weekly Narrative:** `functions/src/analytics/weeklyNarrative.ts`
   - Queries last 7 days from `chatAnalytics`
   - Calls Gemini AI
   - Writes to `insights/{tId}/stores/{sId}/ai/weekly`

3. **Feedback Intelligence:** `functions/src/analytics/feedbackIntelligence.ts`
   - Analyzes negative feedback patterns
   - Identifies themes
   - Writes to `insights/{tId}/stores/{sId}/ai/feedback`

4. **KB Quality:** `functions/src/analytics/kbQuality.ts`
   - Scores KB articles
   - Identifies articles needing updates
   - Writes to `insights/{tId}/stores/{sId}/ai/kbQuality`

### **Gemini AI Services:**
1. `functions/src/services/gemini/weeklyNarrative.ts`
2. `functions/src/services/gemini/feedbackIntelligence.ts`
3. `functions/src/services/gemini/kbQuality.ts`

### **Frontend (Manual Trigger):**
1. **API Route:** `src/app/api/analytics/weekly-narrative/regenerate/route.ts`
2. **UI Component:** `src/components/templates/platform/chatManagement/WeeklyDigest.tsx`

---

## 🧪 **TEST PROCEDURE**

### **Test 4.1: Manual Weekly Narrative Generation** ⭐ START HERE

**Prerequisites:**
- At least 7 days of analytics data (from Step 3)
- If testing today, run 7-day backfill first
- Logged in as PLATFORM_OWNER

**Steps:**
1. Navigate to: `/platform/chat-management`
2. Go to **"Weekly Digest"** tab
3. Click **"Regenerate"** button
4. Wait 10-15 seconds

**Expected Behavior:**
- ✅ Loading spinner shows
- ✅ Success notification: "Regenerating weekly digest..."
- ✅ Page refreshes after 3 seconds
- ✅ AI-generated narrative displays

**Console Logs:**
```typescript
console.log('Triggering manual regeneration...')
console.log('Calling Cloud Function: triggerSchedulerManually')
```

**Database Check:**
1. Firestore → Navigate to path:
   ```
   insights/{tId}/stores/{sId}/ai/weekly
   ```

2. **Expected Document Structure:**
```json
{
  "tId": "5",
  "sId": "12",
  "weekStart": "2025-10-23",
  "weekEnd": "2025-10-29",
  "narrative": "Over the past week, your chat support handled 15 conversations with an average satisfaction rate of 85%. Customer engagement increased by 12% compared to last week...",
  "highlights": [
    "85% customer satisfaction rate (up from 78%)",
    "Average response time: 2.3 seconds",
    "Most asked topic: Password resets (40% of queries)"
  ],
  "recommendations": [
    "Consider creating a dedicated FAQ for password resets",
    "Monitor response quality on billing-related questions",
    "Increase KB coverage for account management topics"
  ],
  "keyMetrics": {
    "volumeChange": 12.5,
    "satisfactionChange": 7.0,
    "topCategory": "account_management"
  },
  "generatedAt": Timestamp,
  "promptVersion": "v1.0"
}
```

**Verify:**
- [ ] `narrative` field is a string (2-3 paragraphs)
- [ ] `highlights` array has 3-5 items
- [ ] `recommendations` array has 3-5 items
- [ ] `keyMetrics` object present
- [ ] `tId` and `sId` match your store
- [ ] `weekStart` and `weekEnd` cover last 7 days
- [ ] `generatedAt` is recent timestamp

**Report:**
```markdown
### Test 4.1 Results:
- ✅/❌ Weekly narrative generated
- Generation time: [X seconds]
- Narrative length: [X words]
- Highlights count: [X]
- Recommendations count: [X]
- ✅/❌ Data structure correct
```

---

### **Test 4.2: Verify AI Content Quality**

**Purpose:** Ensure Gemini AI generates meaningful, relevant content

**Read the Generated Content:**

**Narrative should include:**
- ✅ Specific metrics (numbers, percentages)
- ✅ Week-over-week comparisons
- ✅ Business insights (not just data recap)
- ✅ Executive summary tone (2-3 paragraphs)

**Bad Example (generic):**
```
"Your chat had some activity this week. There were conversations. Some were good, some were bad."
```

**Good Example (specific):**
```
"Over the past week, your AI chat assistant handled 24 customer conversations with an 87% satisfaction rate, up from 79% the previous week. The most common inquiry was password resets (38%), followed by billing questions (22%). Response quality improved, with average thumbs-up feedback increasing by 8 percentage points."
```

**Highlights should be:**
- ✅ Bullet-point format
- ✅ Specific and actionable
- ✅ Include numbers/percentages
- ✅ Mix of positive and concerning items

**Recommendations should be:**
- ✅ Actionable next steps
- ✅ Based on data trends
- ✅ Business-focused (not technical)
- ✅ Prioritized (most important first)

**Verify:**
- [ ] Content is specific (uses actual data)
- [ ] Tone is professional/executive
- [ ] No hallucinations (made-up data)
- [ ] Recommendations are actionable

**Report:**
```markdown
### Test 4.2 Results:
- ✅/❌ Content quality acceptable
- ✅/❌ Uses real data from analytics
- ✅/❌ Professional tone
- Sample narrative snippet: [paste first paragraph]
```

---

### **Test 4.3: Weekly Narrative - Store Isolation**

**Purpose:** Verify narratives are generated PER STORE (not per tenant)

**If you have multiple stores:**
1. Run regeneration for Store 1
2. Check `insights/{tId}/stores/{sId-1}/ai/weekly`
3. Run regeneration for Store 2
4. Check `insights/{tId}/stores/{sId-2}/ai/weekly`

**Verify:**
- [ ] Each store has separate narrative document
- [ ] Paths include BOTH `tId` AND `sId`
- [ ] Narratives reference store-specific data
- [ ] No cross-store data mixing

**If single store:**
- [ ] Verify path includes both `tId` and `sId`
- [ ] Document ID matches `sId`

**Report:**
```markdown
### Test 4.3 Results:
- Stores tested: [1 or 2+]
- ✅/❌ Each store has separate document
- Path format: insights/{tId}/stores/{sId}/ai/weekly
- ✅/❌ Store isolation verified
```

---

### **Test 4.4: Feedback Intelligence (Optional)**

**Purpose:** Test negative feedback analysis

**Prerequisites:**
- Some chat sessions with NEGATIVE feedback (👎)
- At least 3-5 negative feedback instances

**Manual Trigger:**
Since there's no UI button for this, we'll check if the Cloud Function ran automatically or trigger manually.

**Option A: Wait for Scheduled Run**
- Master Scheduler runs daily at 2 AM UTC
- Check next day for feedback document

**Option B: Manual Cloud Function Trigger**
```bash
# Firebase Console → Functions → processFeedbackIntelligenceForAllStores
# Or via gcloud:
gcloud functions call processFeedbackIntelligenceForAllStores
```

**Expected Document Path:**
```
insights/{tId}/stores/{sId}/ai/feedback
```

**Expected Structure:**
```json
{
  "tId": "5",
  "sId": "12",
  "date": "2025-10-29",
  "themes": [
    {
      "theme": "Response accuracy",
      "count": 3,
      "severity": "medium",
      "examples": ["Answer was not accurate", "Didn't solve my problem"]
    },
    {
      "theme": "Response length",
      "count": 2,
      "severity": "low",
      "examples": ["Too long", "Too much detail"]
    }
  ],
  "summary": "Analysis of 5 negative feedback instances revealed two main themes: response accuracy (60%) and response length (40%). Most concerns relate to technical question answers.",
  "topIssues": [
    "Technical questions not answered accurately",
    "Responses too detailed for simple questions"
  ],
  "recommendations": [
    "Improve KB coverage for technical topics",
    "Train AI to adjust response length based on question complexity"
  ],
  "totalFeedbackAnalyzed": 5,
  "generatedAt": Timestamp,
  "promptVersion": "v1.0"
}
```

**Verify:**
- [ ] `themes` array groups similar feedback
- [ ] `summary` provides overview
- [ ] `topIssues` lists main problems
- [ ] `recommendations` are actionable

**Report:**
```markdown
### Test 4.4 Results:
- ✅/❌/⏭️ Feedback intelligence generated
- Negative feedback count: [X]
- Themes identified: [X]
- ⏭️ Skipped (not enough negative feedback)
```

---

### **Test 4.5: Master Scheduler Orchestration (Optional)**

**Purpose:** Verify all AI tasks run in correct order

**Scheduled Time:** Daily at 2:00 AM UTC

**Expected Execution Order:**
```
2:00 AM → Daily Aggregation Coordination
2:01 AM → Feedback Intelligence (daily)
2:05 AM → KB Quality Analysis (daily)
2:10 AM → Weekly Narrative (Sundays only)
```

**How to Test:**

**Option A: Wait for scheduled run**
- Note the current time
- Check Firestore next day after 2 AM UTC
- Verify all documents updated

**Option B: Check Cloud Function logs**
```bash
# Firebase Console → Functions → masterScheduler → Logs
# Look for execution logs
```

**Expected Logs:**
```
[2025-10-29 02:00:00] Master Scheduler started
[2025-10-29 02:01:00] Starting Feedback Intelligence...
[2025-10-29 02:05:00] Starting KB Quality Analysis...
[2025-10-29 02:10:00] Starting Weekly Narrative... (Sundays only)
[2025-10-29 02:15:00] Master Scheduler complete
```

**Verify:**
- [ ] All tasks execute in order
- [ ] No task failures
- [ ] Locking mechanism prevents duplicate runs
- [ ] Weekly narrative only on Sundays

**Report:**
```markdown
### Test 4.5 Results:
- ✅/❌/⏭️ Scheduler runs correctly
- ⏭️ Skipped (testing manually only)
- Next scheduled run: [date/time]
```

---

## 🐛 **COMMON ISSUES & FIXES**

### **Issue: "Function timeout" error**
**Cause:** Gemini API slow or too much data  
**Fix:** Increase timeout in function config:
```typescript
export const masterScheduler = onSchedule({
  timeoutSeconds: 540, // 9 minutes
  memory: '512MiB'
})
```

### **Issue: Empty narrative or generic content**
**Cause:** Not enough data in analytics  
**Fix:**
- Ensure 7+ days of analytics data
- Run 7-day backfill first
- Verify `chatAnalytics` has data

### **Issue: Narrative doesn't update after regeneration**
**Cause:** Frontend caching  
**Fix:**
- Hard refresh (Cmd+Shift+R / Ctrl+Shift+R)
- Clear browser cache
- Check `generatedAt` timestamp in Firestore

### **Issue: "Unauthorized" when clicking Regenerate**
**Cause:** Not owner/admin  
**Fix:**
```typescript
// src/app/api/analytics/weekly-narrative/regenerate/route.ts
if (session.role !== 'PLATFORM_OWNER') {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
}
```

### **Issue: Missing `insights` collection**
**Cause:** Cloud Functions haven't run yet  
**Fix:**
- Manually trigger via Regenerate button
- Or wait for scheduled run

---

## ✅ **VERIFICATION CHECKLIST**

Before moving to Step 5, confirm:

**Weekly Narrative:**
- [ ] Document exists in `insights/{tId}/stores/{sId}/ai/weekly`
- [ ] Narrative is meaningful and specific
- [ ] Highlights and recommendations present
- [ ] keyMetrics calculated correctly
- [ ] Manual regeneration works

**Store Isolation:**
- [ ] Path includes both `tId` and `sId`
- [ ] Each store has separate document
- [ ] No cross-store data

**AI Quality:**
- [ ] Content is professional
- [ ] Uses actual data (not hallucinated)
- [ ] Recommendations are actionable
- [ ] No generic/template responses

**Optional Tests:**
- [ ] Feedback intelligence generated (or skipped)
- [ ] Scheduler orchestration verified (or skipped)

---

## 📊 **FINAL REPORT FORMAT**

```markdown
# Step 4 Complete Report

## ✅ Passing Tests:
- Test 4.1: Weekly narrative generation ✅
- Test 4.2: AI content quality ✅
- Test 4.3: Store isolation ✅
- Test 4.4: Feedback intelligence ✅/⏭️
- Test 4.5: Master scheduler ✅/⏭️

## ❌ Failing Tests:
- None (or list with details)

## 📊 AI Insights State:
- Weekly narrative exists: ✅
- Narrative word count: [X]
- Highlights: [X items]
- Recommendations: [X items]
- Generation time: [X seconds]

## 🐛 Issues Found:
- None (or list with error messages)

## 📸 Screenshots:
- Firestore insights path: [screenshot]
- Generated narrative: [screenshot]

## ✅ Ready for Step 5: YES/NO
```

---

## 🎯 **NEXT STEP**

Once AI intelligence generation is verified, move to:  
**`STEP_5_ADMIN_UI.md`**

We'll test the admin UI components that display all this data!

---

**Questions?** Report back with your AI insights data and I'll verify! 🚀

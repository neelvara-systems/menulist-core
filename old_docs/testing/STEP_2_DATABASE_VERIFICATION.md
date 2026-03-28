# 🧪 Step 2: Database Verification

**Duration:** 10 minutes  
**Prerequisite:** Step 1 completed successfully  
**Next Step:** STEP_3_ANALYTICS_AGGREGATION.md

---

## 🎯 **WHAT WE'RE VERIFYING**

Deep dive into Firestore data structure:
1. ✅ Session document structure
2. ✅ Messages array structure
3. ✅ Feedback data structure
4. ✅ Multi-tenancy fields (tId, sId, uId)
5. ✅ Timestamps (createdOn, modifiedOn)
6. ✅ Data consistency

---

## 📊 **FIRESTORE COLLECTION: chatSessions**

### **Document Structure Verification**

**Path:** `chatSessions/{sessionId}`

Open Firebase Console and locate one of your test sessions from Step 1.

---

## 🔍 **VERIFICATION CHECKLIST**

### **Check 2.1: Root Level Fields**

**Required Fields:**
```json
{
  "id": "string (auto-generated)",
  "tId": "string (tenant ID)",
  "sId": "string (store ID)",
  "uId": "string (user ID)",
  "title": "string (first 50 chars of first message)",
  "mode": "string ('qna' or 'assistant')",
  "messages": "array (see below)",
  "createdOn": "Timestamp",
  "modifiedOn": "Timestamp"
}
```

**Optional Fields:**
```json
{
  "internalNote": "string or null (admin-only notes)"
}
```

**Verify:**
- [ ] All required fields present
- [ ] `tId` matches your tenant ID
- [ ] `sId` matches your store ID
- [ ] `uId` matches logged-in user ID
- [ ] `mode` is either "qna" or "assistant"
- [ ] `createdOn` is a valid Firestore Timestamp
- [ ] `modifiedOn` is a valid Firestore Timestamp
- [ ] `modifiedOn` >= `createdOn`

**Report:**
```markdown
### Check 2.1 Results:
- tId: [your value]
- sId: [your value]
- uId: [your value]
- mode: [qna/assistant]
- ✅/❌ All required fields present
```

---

### **Check 2.2: Messages Array Structure**

**Expected Structure for User Message:**
```json
{
  "id": "msg_1729833600000",
  "role": "user",
  "content": "User's question text",
  "createdOn": Timestamp,
  "image": {
    "url": "https://firebasestorage.../path",
    "name": "filename.jpg"
  } // or null if no image
}
```

**Expected Structure for AI Message:**
```json
{
  "id": "msg_1729833605000",
  "role": "assistant",
  "craftedAnswer": "AI's response text",
  "references": [
    {
      "id": "kb_article_id",
      "title": "Article Title",
      "url": "/help/article-url",
      "content": "Excerpt..."
    }
  ],
  "suggestedQuestions": [
    "Question 1?",
    "Question 2?",
    "Question 3?"
  ],
  "createdOn": Timestamp,
  "feedback": null, // or feedback object if submitted
  "generationMetadata": {
    "isRetry": false,
    "retryCount": 0
  }
}
```

**Verify Each Message:**
- [ ] `id` format: `msg_[timestamp]`
- [ ] `role` is either "user" or "assistant"
- [ ] User messages have `content` field
- [ ] AI messages have `craftedAnswer` field
- [ ] All messages have `createdOn` Timestamp
- [ ] Messages are in chronological order (oldest first)

**Report:**
```markdown
### Check 2.2 Results:
- Total messages: [count]
- User messages: [count]
- AI messages: [count]
- ✅/❌ All messages properly structured
- ✅/❌ Chronological order correct
```

---

### **Check 2.3: Feedback Structure (if submitted)**

**Expected Structure:**
```json
{
  "feedback": {
    "isGood": true, // or false
    "reasonsToImprove": [ // only if isGood = false (array of objects)
      {
        "value": "not_factually_correct",
        "label": "Answer is incorrect or inaccurate"
      },
      {
        "value": "answer_took_too_long",
        "label": "Response was too slow"
      }
    ],
    "comments": "Optional user comment text",
    "submittedAt": Timestamp // When feedback was submitted
  }
}
```

**Verify:**
- [ ] `feedback` is an object (not array)
- [ ] `isGood` is boolean (true/false)
- [ ] If `isGood = false`, `reasonsToImprove` array exists
- [ ] `submittedAt` is a valid Timestamp
- [ ] Feedback is attached to correct message (AI message, not user message)

**Report:**
```markdown
### Check 2.3 Results:
- Feedback submitted: ✅/❌
- isGood: [true/false]
- Reasons count: [X] (if negative)
- Comment present: ✅/❌
- ✅/❌ Properly structured
```

---

### **Check 2.4: Multi-Tenancy Isolation**

**Critical Security Check!**

Open Firestore Console and run these queries:

**Query 1: All sessions for your tenant/store**
```
Collection: chatSessions
Where: tId == [your-tId]
Where: sId == [your-sId]
```

**Expected:** Only YOUR sessions show up

**Query 2: Attempt to access different tenant (if multi-tenant setup)**
```
Collection: chatSessions
Where: tId == [different-tId]
```

**Expected:** No results (or different tenant's data, proving isolation)

**Verify:**
- [ ] All your sessions have correct `tId`
- [ ] All your sessions have correct `sId`
- [ ] No sessions from other tenants visible in your user view (frontend check)
- [ ] Database rules prevent cross-tenant access

**Report:**
```markdown
### Check 2.4 Results:
- Total sessions in your tenant/store: [count]
- ✅/❌ All have correct tId/sId
- ✅/❌ Cross-tenant isolation verified
```

---

### **Check 2.5: Timestamp Consistency**

**What to Check:**

For each session document:
```typescript
createdOn <= modifiedOn ✅ Must be true
```

For each message in `messages` array:
```typescript
messages[0].createdOn <= messages[1].createdOn ✅ Chronological order
```

**Verify:**
- [ ] Session `createdOn` matches first message `createdOn`
- [ ] Session `modifiedOn` updated when new message added
- [ ] Messages in chronological order
- [ ] All timestamps are server timestamps (not client timestamps)

**Report:**
```markdown
### Check 2.5 Results:
- Session created: [date/time]
- Session modified: [date/time]
- First message created: [date/time]
- Last message created: [date/time]
- ✅/❌ Chronological consistency verified
```

---

### **Check 2.6: Image Storage Path (if uploaded)**

**Expected Path Structure:**
```
chatSessions/chatimages/{tId}/{sId}/{timestamp}-{filename}
```

**Example:**
```
chatSessions/chatimages/5/12/1729833600000-screenshot.png
```

**Verify in Firebase Storage:**
1. Go to Firebase Console → Storage
2. Navigate to: `chatSessions/chatimages/`
3. Confirm tenant/store folders exist
4. Confirm image file inside

**Verify in Firestore:**
1. Find user message with image
2. Check `image.url` field
3. Confirm URL matches storage path

**Security Check:**
- [ ] Image path includes `tId` and `sId` (multi-tenancy)
- [ ] Image URL is accessible (not 403 error)
- [ ] Image displays in chat UI

**Report:**
```markdown
### Check 2.6 Results:
- Image uploaded: ✅/❌/⏭️ (skipped)
- Storage path: [paste path]
- ✅/❌ Path includes tId/sId
- ✅/❌ Image accessible
```

---

## 🐛 **COMMON DATABASE ISSUES**

### **Issue: Missing tId or sId**
**Symptom:** Document has no `tId` or `sId` field  
**Cause:** DAL not properly composing request body  
**Check:**
```typescript
// chatSessions/index.ts
const composedData = await requestBodyComposer(sessionData);
// Should add tId, sId, uId, createdOn, modifiedOn
```

### **Issue: Timestamps are null or undefined**
**Symptom:** `createdOn` or `modifiedOn` is null  
**Cause:** Not using `serverTimestamp()`  
**Check:**
```typescript
import { serverTimestamp } from 'firebase/firestore';
// Should use serverTimestamp(), not new Date()
```

### **Issue: Messages not in array**
**Symptom:** `messages` field is not an array  
**Cause:** Wrong data structure passed  
**Fix:** Ensure `messages: []` is initialized

### **Issue: Feedback not saving**
**Symptom:** Feedback object missing after submission  
**Cause:** `updateMessageFeedback()` not working  
**Check:**
```typescript
// chatSessions/index.ts → updateMessageFeedback()
// Should find message by ID and merge feedback
```

---

## 📊 **DATA QUALITY CHECKLIST**

Before moving to Step 3, verify:

**Structure:**
- [ ] All sessions have required fields
- [ ] All messages properly structured
- [ ] Feedback objects correct (if any)

**Multi-Tenancy:**
- [ ] All documents have `tId` and `sId`
- [ ] No cross-tenant data leaks
- [ ] User isolation working

**Consistency:**
- [ ] Timestamps in chronological order
- [ ] `modifiedOn` >= `createdOn`
- [ ] Messages in chronological order

**Completeness:**
- [ ] No missing required fields
- [ ] Image URLs valid (if uploaded)
- [ ] KB references present in AI messages

---

## 🔧 **MANUAL DATABASE QUERIES**

### **Query 1: Count Sessions**
```javascript
// Firebase Console → Firestore → Run Query
db.collection('chatSessions')
  .where('tId', '==', 'YOUR_TID')
  .where('sId', '==', 'YOUR_SID')
  .get()
  .then(snapshot => console.log('Total sessions:', snapshot.size));
```

### **Query 2: Find Sessions with Feedback**
```javascript
db.collection('chatSessions')
  .where('tId', '==', 'YOUR_TID')
  .where('sId', '==', 'YOUR_SID')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      const hasFeedback = doc.data().messages.some(m => m.feedback);
      if (hasFeedback) console.log('Session with feedback:', doc.id);
    });
  });
```

### **Query 3: Check Image Uploads**
```javascript
db.collection('chatSessions')
  .where('tId', '==', 'YOUR_TID')
  .get()
  .then(snapshot => {
    snapshot.forEach(doc => {
      const hasImage = doc.data().messages.some(m => m.image);
      if (hasImage) console.log('Session with image:', doc.id);
    });
  });
```

---

## ✅ **FINAL VERIFICATION**

### **Database Snapshot**

Take a screenshot or export one session document and verify it matches this template:

```json
{
  "id": "abc123def456",
  "tId": "5",
  "sId": "12",
  "uId": "user_xyz",
  "title": "How do I reset my password?",
  "mode": "assistant",
  "messages": [
    {
      "id": "msg_1729833600000",
      "role": "user",
      "content": "How do I reset my password?",
      "createdOn": { "_seconds": 1729833600, "_nanoseconds": 0 },
      "image": null
    },
    {
      "id": "msg_1729833605000",
      "role": "assistant",
      "craftedAnswer": "To reset your password...",
      "references": [...],
      "suggestedQuestions": [...],
      "createdOn": { "_seconds": 1729833605, "_nanoseconds": 0 },
      "feedback": {
        "isGood": true,
        "submittedAt": { "_seconds": 1729833650, "_nanoseconds": 0 }
      }
    }
  ],
  "createdOn": { "_seconds": 1729833600, "_nanoseconds": 0 },
  "modifiedOn": { "_seconds": 1729833650, "_nanoseconds": 0 },
  "internalNote": null
}
```

---

## 📊 **FINAL REPORT FORMAT**

```markdown
# Step 2 Complete Report

## ✅ Passing Checks:
- Check 2.1: Root fields ✅
- Check 2.2: Messages array ✅
- Check 2.3: Feedback structure ✅
- Check 2.4: Multi-tenancy isolation ✅
- Check 2.5: Timestamp consistency ✅
- Check 2.6: Image storage path ✅

## ❌ Failing Checks:
- None (or list with details)

## 📊 Database State:
- Total sessions: [count]
- Sessions with feedback: [count]
- Sessions with images: [count]

## 🐛 Issues Found:
- None (or list with field names and errors)

## 📸 Database Screenshot:
[Attach one full session document export]

## ✅ Ready for Step 3: YES/NO
```

---

## 🎯 **NEXT STEP**

Once all verifications pass, move to:  
**`STEP_3_ANALYTICS_AGGREGATION.md`**

We'll test how chat data gets aggregated into analytics.

---

**Questions?** Report back with your database state and I'll help verify! 🚀

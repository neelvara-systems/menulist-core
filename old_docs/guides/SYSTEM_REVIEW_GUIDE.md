# 🔍 **COMPLETE SYSTEM REVIEW GUIDE**

**Purpose:** Step-by-step guide to review your Admin Intelligence Layer + Help Chat System  
**Date:** October 28, 2025  
**Estimated Time:** 4-6 hours (multiple sessions recommended)

---

## 👤 **Who Should Use This Guide:**

- **Developers** doing final code review before production deployment
- **QA Teams** before release testing and validation
- **Product Managers** validating UX integration and feature completeness
- **Tech Leads** checking system health and architecture alignment
- **Founders/CTOs** ensuring production readiness and cost optimization

---

## 📚 **Review Order & Strategy**

We'll review **bottom-up** (foundation → UI) to catch errors early:

```
Layer 1: Constants & Configuration (30 min)
Layer 2: Database/DAL (1.5 hours)
Layer 3: Backend APIs (1.5 hours)
Layer 4: Business Logic (1 hour)
Layer 5: UI Components (1.5 hours)
Layer 6: Integration Testing (1 hour)
Layer 7: Security & Privacy (45 min) ⭐ NEW
```

**Review Symbols:**
- ✅ VERIFIED - Correct
- ⚠️ REVIEW - Needs attention
- ❌ FIX - Issue found

---

## 🎯 **LAYER 1: Constants & Configuration** (30 min)

### **File 1: Database Collections**
**Path:** `src/constants/database.ts`

**Quick Check:**
```typescript
// Verify these critical collections exist:
✓ CHAT_SESSIONS (line 28)
✓ CHAT_ANALYTICS (line 29)
✓ AI_SEARCH_HISTORY (line 27)
✓ QUERY_EMBEDDINGS (line 30)
```

**Checklist:**
- [ ] All names match Firestore console exactly
- [ ] No typos (common: `chatSesions`)
- [ ] Consistent camelCase naming
- [ ] New collections added during implementation present

---

### **File 2: Analytics Metrics** ⭐ NEW
**Path:** `src/constants/analyticsMetrics.ts` (420 lines)

**Critical Thresholds to Verify:**

| Threshold | Value | Check |
|-----------|-------|-------|
| ERROR_RATE_HIGH | 10 | Reasonable for your traffic? |
| SATISFACTION_LOW | 60% | Matches quality bar? |
| RESPONSE_TIME_SLOW | 5000ms | Gemini takes 2-4s, so 5s good? |
| KB_ARTICLES_MIN | 5 | Do you have ≥5 articles? |

**Checklist:**
- [ ] Every threshold has WHY comment
- [ ] Tuning guide present
- [ ] `as const` on all exports
- [ ] TypeScript compiles: `cd functions && npm run build`

---

### **File 3: Feature Flags**
**Path:** `src/config/features.ts`

**Current Settings:**
- [ ] `ENABLE_STREAMING_RESPONSES: false` - Correct?
- [ ] `ENABLE_RATE_LIMITING: true` - MUST be true for production

---

### 💰 **Cost Control Checklist - Layer 1**

**Configuration Cost Impact:**
- [ ] Feature flags minimize expensive operations (e.g., streaming disabled if not needed)
- [ ] Constants define reasonable limits (e.g., `MAX_RESULTS_PER_QUERY`)
- [ ] Thresholds prevent excessive API calls (e.g., rate limiting properly configured)
- [ ] No debug logging in production constants

**Quick Audit:**
```bash
# Check for hardcoded high limits
grep -r "limit.*1000\|limit.*5000" src/constants/
```

---

## 💾 **LAYER 2: Database/DAL** (1.5 hours)

### **Universal DAL Pattern Check**

Run this for EVERY DAL file:

**Files to Check:**
1. `src/database/chatSessions/index.ts` (644 lines)
2. `src/database/chatAnalytics/index.ts` (619 lines)
3. `src/database/feedback/index.ts`
4. `src/database/aiSearchHistory/index.ts`
5. `src/database/users/index.ts`

**Pattern Checklist (apply to each):**

```typescript
// ✅ STEP 1: Import DB_COLLECTIONS
import { DB_COLLECTIONS } from '@constant/database';

// ✅ STEP 2: Use constant (NOT hardcoded)
const COLLECTION = DB_COLLECTIONS.CHAT_SESSIONS; // ❌ NOT: 'chatSessions'

// ✅ STEP 3: Create async helpers
const getCollectionRef = async () => {
    return collection(firebaseClient, COLLECTION);
};

// ✅ STEP 4: Use await in queries
const q = query(
    await getCollectionRef(),  // ❌ NOT: getCollectionRef()
    where('tId', '==', session.tId),
    where('sId', '==', session.sId)  // For store-scoped queries
);

// ✅ STEP 5: Wrap in apiCallComposer
return await apiCallComposer(async () => { ... }, data, 'functionName');

// ✅ STEP 6: Use requestBodyComposer for writes
const submitData = await requestBodyComposer(data);
```

**Quick Command:**
```bash
# Search for BAD pattern (hardcoded collections):
grep -r "collection(firebaseClient, '" src/database/
# Should return ZERO results ✅

# Search for GOOD pattern:
grep -r "DB_COLLECTIONS\." src/database/
# Should return MANY results ✅
```

---

### **Critical: Store Isolation Check**

**File:** `src/database/chatAnalytics/index.ts`

**Lines 80-86:** Verify BOTH filters present:
```typescript
where('tId', '==', session.tId),  // ✅ Tenant
where('sId', '==', session.sId'), // ✅ Store - CRITICAL!
```

**Why Critical?**
- ❌ Missing sId: Data from ALL stores mixed together
- ✅ With sId: Each store has isolated analytics

**Test:** Run analytics query. Should only return data for ONE store, not all tenant stores.

---

### 💰 **Cost Control Checklist - Layer 2**

**Firestore Read/Write Optimization:**
- [ ] Every `getDocs()` call has `.limit()` clause
- [ ] Using `doc()` for single record fetches (not `getDocs().limit(1)`)
- [ ] No unnecessary `.onSnapshot()` listeners
- [ ] Batch writes used where applicable (vs individual `setDoc()` calls)
- [ ] Composite indexes exist for complex queries

**Quick Audit:**
```bash
# Find getDocs without limit
grep -n "getDocs(" src/database/ | grep -v "limit("

# Find potential batch optimization opportunities
grep -n "setDoc(" src/database/ | wc -l
```

**Expected Reads Per Operation:**
- Single conversation view: ~1 read (using `doc()`)
- Analytics dashboard: ~30-90 reads (daily aggregates for 30-90 days)
- Backfill 30 days: ~3,000-15,000 reads (one-time operation)

---

## 🔌 **LAYER 3: Backend APIs** (1.5 hours)

### **File 1: Search API (Non-Streaming)**
**Path:** `src/app/api/helpCenter/search-kb/route.ts`

**Critical Checks:**

**1. Rate Limiting:**
```typescript
// ✅ MUST be BEFORE expensive Gemini call
const rateLimit = await checkRateLimit({ ... });
if (!rateLimit.allowed) {
    return NextResponse.json({ error: '...' }, { status: 429 });
}
// Then call Gemini ✅
```
- [ ] Rate limit check exists
- [ ] Check is BEFORE Gemini call (not after!)
- [ ] Returns 429 status
- [ ] Includes retry-after header

**2. Input Validation:**
- [ ] Uses Zod schema from `chatSchemas.ts`
- [ ] Validates query, mode, context, imageUrl
- [ ] XSS prevention present

**3. Error Handling:**
- [ ] Try-catch block
- [ ] User-friendly error messages
- [ ] Proper HTTP status codes

**Test:**
```bash
# Manual API test:
curl -X POST http://localhost:3000/api/helpCenter/search-kb \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "mode": "qna"}'
# Should return 200 with proper structure ✅
```

---

### **File 2: Search API (Streaming)**
**Path:** `src/app/api/helpCenter/search-kb-stream/route.ts`

**SSE Format Check:**
- [ ] Headers: `text/event-stream`, `no-cache`, `keep-alive`
- [ ] Rate limit check INSIDE async function
- [ ] Events: `status`, `answer_start`, `answer_delta`, `answer_complete`, `error`
- [ ] Double newline after each event: `\n\n`
- [ ] Writer closed on completion AND error

**Test:**
```bash
# Test streaming:
curl -N -X POST http://localhost:3000/api/helpCenter/search-kb-stream \
  -H "Content-Type: application/json" \
  -d '{"query": "test", "mode": "qna"}'
# Should stream events in real-time ✅
```

---

### **File 3: Analytics Trigger API**
**Path:** `src/app/api/analytics/trigger-manual/route.ts`

**Checklist:**
- [ ] Checks user role (PLATFORM_OWNER or admin)
- [ ] Validates `daysToBackfill` (1-7 range)
- [ ] Prevents duplicate runs
- [ ] Processes stores sequentially
- [ ] Returns summary of successes/failures

---

### **File 4: Weekly Narrative Regeneration API** ⭐ NEW
**Path:** `src/app/api/analytics/weekly-narrative/regenerate/route.ts`

**Purpose:** Manually trigger weekly digest regeneration

**Critical Checks:**
- [ ] Session authentication present
- [ ] Owner/admin role validation
- [ ] Calls `httpsCallable(functions, 'triggerSchedulerManually')`
- [ ] Returns success/error response
- [ ] Graceful error handling

**Expected Flow:**
```typescript
1. Validate session → 401 if unauthorized
2. Call Cloud Function trigger
3. Return { success: true, message: '...' }
4. Frontend waits 3 seconds then refreshes
```

**Test:**
```bash
# Manual test (requires authentication):
curl -X POST http://localhost:3000/api/analytics/weekly-narrative/regenerate \
  -H "Cookie: [your-session-cookie]"
# Should return 200 with success message ✅
```

---

### **File 5: Monitoring (Cloud Functions)**
**Path:** `functions/src/monitoring/`

**Files to Review:**
1. `alerts.ts` - Uses ALERT_THRESHOLDS constants ✅
2. `healthCheck.ts` - Uses ALERT_THRESHOLDS constants ✅
3. `errorTracking.ts` - Uses ERROR_DEDUPLICATION constants ✅

**Verify Constants Usage:**
```typescript
// ✅ GOOD:
if (errorCount > ALERT_THRESHOLDS.ERROR_RATE_HIGH) { ... }

// ❌ BAD:
if (errorCount > 10) { ... }
```

**Quick Check:**
```bash
cd functions
npm run build
# Should compile with NO errors ✅
```

---

### **File 6: AI Intelligence Cloud Functions** ⭐ NEW
**Path:** `functions/src/analytics/` & `functions/src/schedulers/`

**Master Scheduler** (`masterScheduler.ts`):
- [ ] Runs daily at 2 AM UTC
- [ ] Orchestrates all AI tasks (weekly narrative, feedback, KB quality)
- [ ] Locking mechanism prevents duplicate runs
- [ ] Memory: 512MB, timeout: 540s
- [ ] Telemetry logging enabled

**Weekly Narrative Generator** (`weeklyNarrative.ts`):
- [ ] `generateWeeklyNarrativeForStore(tId, sId)` - Generates for one store
- [ ] `processWeeklyNarrativeForAllStores()` - Batch processes all stores
- [ ] Queries last 7 days from `chatAnalytics`
- [ ] Compares to previous week (WoW changes)
- [ ] Calls Gemini AI service
- [ ] Writes to: `insights/{tId}/stores/{sId}/ai/weekly`
- [ ] Includes store-level isolation (`tId` AND `sId`)

**Feedback Intelligence** (`feedbackIntelligence.ts`):
- [ ] Analyzes negative feedback patterns
- [ ] Identifies themes and top issues
- [ ] Calls Gemini AI for analysis
- [ ] Writes to: `insights/{tId}/stores/{sId}/ai/feedback`
- [ ] Daily execution via masterScheduler

**KB Quality Analyzer** (`kbQuality.ts`):
- [ ] Fetches published KB articles
- [ ] Scores article quality via Gemini
- [ ] Identifies articles needing updates
- [ ] Writes to: `insights/{tId}/stores/{sId}/ai/kbQuality`
- [ ] Daily execution via masterScheduler

**Gemini AI Services** (`functions/src/services/gemini/`):
- [ ] `weeklyNarrative.ts` - Prompt engineering for weekly summaries
- [ ] `feedbackIntelligence.ts` - Feedback analysis prompts
- [ ] `kbQuality.ts` - Article quality scoring prompts
- [ ] All use Gemini 2.5 Flash
- [ ] Prompt versioning tracked

**Critical Checks:**
- [ ] All functions process at STORE level (not tenant level)
- [ ] Store isolation: Both `tId` AND `sId` in all queries
- [ ] Idempotent operations (safe to re-run)
- [ ] Error handling with proper logging
- [ ] masterScheduler exports `triggerSchedulerManually` for manual triggers

**Test:**
```bash
# Deploy functions
cd functions
npm run deploy

# Check Firebase Console → Functions
# Verify masterScheduler is scheduled daily at 2 AM UTC ✅
```

---

### 💰 **Cost Control Checklist - Layer 3**

**API & Cloud Function Optimization:**
- [ ] Rate limiting enforced on ALL expensive endpoints (Gemini, vector search)
- [ ] Gemini API calls only after validation and rate limit checks
- [ ] No redundant API calls (e.g., calling Gemini twice for same query)
- [ ] Cloud Functions use minimum memory allocation (256MB default, not 1GB)
- [ ] Cold start optimization (lightweight imports, lazy loading)

**Quick Audit:**
```bash
# Find Gemini calls without rate limiting
grep -B5 "genAIClient\|vertexAI" src/app/api/ | grep -L "checkRateLimit"

# Check Cloud Function memory allocation
grep -n "memory:" functions/src/index.ts
```

**Cost Trace Logging:**
```typescript
// Add to each expensive operation:
console.log(`[COST] Gemini API call - Query length: ${query.length}, Context: ${contextLength}`);
```

---

## ⚙️ **LAYER 4: Business Logic** (1 hour)

### **File 1: Request Queue**
**Path:** `src/components/templates/main-app/helpChat/hooks/useRequestQueue.ts`

**Race Condition Prevention:**
```typescript
// ✅ Uses refs (not state) for immediate values
const queueRef = useRef<QueueItem[]>([]);
const processingRef = useRef(false);

// ✅ Processes sequentially (not parallel)
while (queueRef.current.length > 0) {
    const item = queueRef.current[0];
    await item.execute(); // Sequential!
    queueRef.current.shift();
}
```

**Checklist:**
- [ ] Uses refs (not state)
- [ ] Checks `processingRef` before starting
- [ ] Processes sequentially (await in loop)
- [ ] Try-catch continues on error
- [ ] Sets processingRef to false after loop

**Test:**
```typescript
// Send 10 rapid requests
for (let i = 0; i < 10; i++) {
  enqueue({ id: `req-${i}`, execute: async () => {...} });
}
// Should process in order: 0, 1, 2, ..., 9 ✅
```

---

### **File 2: Chat Handlers**
**Path:** `src/components/templates/main-app/helpChat/hooks/useChatHandlers.ts` (669 lines)

**Critical Sections:**

**1. Refs for State (Lines 51-64):**
- [ ] activeSessionRef, chatSessionsRef, currentModeRef present
- [ ] Updated in useEffect
- [ ] Prevents stale closure issues

**2. onSendMessage (Lines 161-330):**
- [ ] Checks `isProcessing()` first
- [ ] Wrapped in `enqueue()` call
- [ ] Uploads image BEFORE creating message
- [ ] Creates user message with unique ID
- [ ] Calls API (streaming or non-streaming based on flag)
- [ ] Persists to Firestore
- [ ] Handles mode transition (QnA → Assistant)

**3. onRetry (Lines 333-416):**
- [ ] Tracks retry metadata (attempt, reason, previousMessageId)
- [ ] Adds `generationMetadata` to message
- [ ] Removes replaced message for regenerate

**4. Feedback (Lines 459-543):**
- [ ] Submits to BOTH aiSearchHistory and chatSessions
- [ ] Updates local state immediately
- [ ] Persists to Firestore

---

### **File 3: Streaming Client**
**Path:** `src/components/templates/main-app/helpChat/apiStream.ts`

**SSE Parsing:**
```typescript
const lines = chunk.split('\n\n'); // ✅ Double newline
for (const line of lines) {
    const eventMatch = line.match(/event: (.+)\n/);
    const dataMatch = line.match(/data: (.+)/);
    // Parse and handle events
}
```

**Checklist:**
- [ ] Splits by `\n\n` (double newline)
- [ ] Parses SSE format correctly
- [ ] Calls appropriate callbacks
- [ ] Releases reader lock in `finally`

---

### 💰 **Cost Control Checklist - Layer 4**

**Business Logic Efficiency:**
- [ ] Request queue prevents duplicate API calls
- [ ] Retry logic has maximum attempt limit (avoid infinite retries)
- [ ] Debouncing/throttling on user input where applicable
- [ ] No polling loops (use listeners or webhooks instead)
- [ ] Cleanup functions cancel pending requests on unmount

**Quick Audit:**
```bash
# Find potential polling loops
grep -n "setInterval\|setTimeout" src/components/templates/
```

---

## 🎨 **LAYER 5: UI Components** (1.5 hours)

### **File 1: Main Container**
**Path:** `src/components/templates/main-app/helpChat/index.tsx`

**State Management:**
- [ ] activeSessionId: `null` (new) | `undefined` (no selection) | `string` (existing)
- [ ] currentMode: 'qna' | 'assistant'
- [ ] Proper hooks usage

**QnA Actions Condition (Lines 175-181):**
```typescript
showQnAActions={
    currentMode === 'qna' &&
    activeSession?.messages.length === 2 &&  // Exactly first Q&A
    activeSession?.messages[activeSession.messages.length - 1]?.role === 'assistant' &&
    chatState.status !== 'loading' &&
    chatState.status !== 'typing'
}
```
- [ ] Checks mode is 'qna'
- [ ] Checks exactly 2 messages
- [ ] Last message is assistant response
- [ ] Not currently loading or typing

**Accessibility:**
- [ ] `aria-label` on modal
- [ ] `aria-describedby` with description
- [ ] Keyboard navigation works
- [ ] Screen reader friendly

---

### **File 2-10: Help Chat Components**

**Quick Checklist for Each:**
1. `ChatHistory.tsx` - Sidebar with sessions list
2. `ChatPanel.tsx` - Main chat interface
3. `ChatInput.tsx` - Input with QnA actions
4. `MessageList.tsx` - Message rendering
5. `MessageBubble.tsx` - Individual message display
6. `FeedbackModal.tsx` - Feedback collection

**Universal Component Checks:**
- [ ] Props properly typed
- [ ] Loading states handled
- [ ] Error states handled
- [ ] Accessibility (keyboard, screen readers)
- [ ] No console errors in browser
- [ ] Responsive design works

---

### **Chat Management Dashboard Components** ⭐ NEW

### **File 11: Chat Management Main Template**
**Path:** `src/components/templates/platform/chatManagement/index.tsx`

**Tab-Based Navigation:**
- [ ] Three tabs: Conversations, ROI Calculator, Weekly Digest
- [ ] Ant Design Tabs component used
- [ ] Route: `/platform/chat-management`
- [ ] Icons present for each tab
- [ ] Tab switching works smoothly

**Access Control:**
- [ ] Owner/Admin only access
- [ ] Role check at route level

---

### **File 12: Conversations List**
**Path:** `src/components/templates/platform/chatManagement/ConversationsList.tsx` (374 lines)

**SWR Caching:**
- [ ] Uses SWR for data fetching
- [ ] Automatic cache deduplication
- [ ] Refresh intervals configured

**Pagination:**
- [ ] 20 conversations per page
- [ ] "Load More" or page navigation
- [ ] hasNextPage indicator

**Filters:**
- [ ] Mode filter (All, QnA, Assistant)
- [ ] Feedback filter (All, Positive, Negative, None)
- [ ] Date range picker
- [ ] Filters apply correctly

**Search:**
- [ ] Search by conversation title/content
- [ ] Debounced search input
- [ ] Clear search functionality

**Table Display:**
- [ ] Conversation title with message count
- [ ] User ID column
- [ ] Mode badge (QnA/Assistant with icons)
- [ ] Feedback indicators (thumbs up/down counts)
- [ ] Created date (relative time)
- [ ] "View Details" button

**Export:**
- [ ] CSV export functionality
- [ ] Includes all conversation metadata
- [ ] Downloads properly

**Data Source:**
- [ ] Calls `getConversationsPaginated()` from `@database/chatAnalytics`
- [ ] Filters by `tId` AND `sId`
- [ ] Error handling present

---

### **File 13: Conversation Drawer**
**Path:** `src/components/templates/platform/chatManagement/ConversationDrawer.tsx` (424 lines)

**Conversation Thread:**
- [ ] All messages displayed with timestamps
- [ ] User/AI message distinction (color-coded borders)
- [ ] Role indicators (avatar icons)
- [ ] Regeneration badges for retry messages
- [ ] KB references count displayed
- [ ] Suggested questions shown
- [ ] User-uploaded images rendered

**Feedback Display:**
- [ ] Positive/negative indicators
- [ ] User comments shown
- [ ] "Reasons to improve" tags
- [ ] Feedback timestamps

**Internal Notes:**
- [ ] Rich text area for admin notes
- [ ] Character counter (max 1000)
- [ ] Save button with loading state
- [ ] Not visible to end users

**Metadata:**
- [ ] Mode (QnA/Assistant)
- [ ] Total message count
- [ ] Created/Modified dates
- [ ] Overall satisfaction percentage

**Export Transcript:**
- [ ] Download as Markdown
- [ ] Includes all messages, feedback, internal notes
- [ ] Properly formatted

**Data Operations:**
- [ ] Calls `getChatSessionById()` from `@database/chatSessions`
- [ ] Updates via `updateSessionInternalNote()`
- [ ] Error handling for save operations

---

### **File 14: ROI Calculator**
**Path:** `src/components/templates/platform/chatManagement/ROICalculator.tsx` (611 lines)

**Business Metrics:**
- [ ] Total hours saved calculated
- [ ] Monthly hours saved
- [ ] Total cost savings
- [ ] Monthly cost savings
- [ ] Conversations handled by AI
- [ ] Automation rate (%)
- [ ] Satisfied customers count
- [ ] Estimated revenue protected

**Cost Analysis:**
- [ ] Platform subscription cost input
- [ ] Net savings calculation
- [ ] ROI percentage display
- [ ] Payback period (months)

**Customizable Inputs:**
- [ ] Support agent hourly rate (editable)
- [ ] Average ticket value (editable)
- [ ] Automation rate assumptions
- [ ] Platform cost (editable)

**Visual Components:**
- [ ] Statistic cards (Ant Design)
- [ ] Trend indicators (up/down arrows)
- [ ] Framer Motion animations
- [ ] Responsive layout

**Export & Share:**
- [ ] Download functionality (PDF/CSV)
- [ ] Share button present
- [ ] Proper data formatting

**Data Source:**
- [ ] Aggregated from `chatAnalytics`
- [ ] Real-time calculations
- [ ] Error handling present

---

### **File 15: Weekly Digest**
**Path:** `src/components/templates/platform/chatManagement/WeeklyDigest.tsx` (352 lines)

**AI-Generated Content:**
- [ ] Executive summary (2-3 paragraphs)
- [ ] Key highlights (3-5 bullet points)
- [ ] Actionable recommendations (3-5 items)

**Sentiment Analysis:**
- [ ] Overall sentiment indicator
- [ ] Visual sentiment badge (Positive/Neutral/Concerning)

**Key Metrics Cards:**
- [ ] Volume change (% vs previous week)
- [ ] Satisfaction change (% vs previous week)
- [ ] Top conversation category

**Manual Regeneration:**
- [ ] "Regenerate" button present
- [ ] Loading state with spinner
- [ ] Success/error notifications
- [ ] 3-second delay before refresh

**Export:**
- [ ] Download as text file
- [ ] Formatted for sharing

**Animations:**
- [ ] Framer Motion transitions
- [ ] Card hover effects
- [ ] Smooth loading states

**Data Source:**
- [ ] Reads directly from Firestore: `insights/{tId}/stores/{sId}/ai/weekly`
- [ ] No API calls (direct Firestore read)
- [ ] Error handling for missing data

**Manual Trigger:**
- [ ] Calls `/api/analytics/weekly-narrative/regenerate`
- [ ] Owner-only access
- [ ] Proper error messages

---

### 💰 **Cost Control Checklist - Layer 5**

**UI Performance & Efficiency:**
- [ ] SWR caching prevents duplicate data fetches on component re-renders
- [ ] Images optimized (compressed, lazy-loaded where applicable)
- [ ] No unnecessary re-renders (use React.memo where needed)
- [ ] Long lists use virtualization (react-window or similar)
- [ ] Analytics dashboard uses incremental loading (not all data at once)

**Quick Audit:**
```bash
# Check for missing React.memo on expensive components
grep -L "React.memo\|memo(" src/components/analytics/*.tsx
```

---

## 🔄 **LAYER 6: Integration Testing** (1 hour)

### **Test Scenario 1: New QnA Chat**

**Steps:**
1. Open help chat
2. Click "New Chat"
3. Type question
4. Send message

**Verify:**
- [ ] Message appears immediately
- [ ] Loading indicator shows
- [ ] AI response streams/types
- [ ] Suggested questions appear
- [ ] After first Q&A, input hides
- [ ] Two buttons appear: "Ask Follow-up", "New Question"
- [ ] Session saved to Firestore
- [ ] Session appears in sidebar

---

### **Test Scenario 2: QnA → Assistant Transition**

**Steps:**
1. Complete first QnA (see scenario 1)
2. Click "Ask a Follow-up"

**Verify:**
- [ ] Mode badge changes to "Assistant"
- [ ] Input reappears
- [ ] Mode persisted to Firestore (check DB)
- [ ] Next message uses conversation context
- [ ] AI references previous conversation

---

### **Test Scenario 3: Regenerate**

**Steps:**
1. Send message
2. Wait for response
3. Click regenerate icon

**Verify:**
- [ ] Previous message removed
- [ ] New response generated
- [ ] `generationMetadata.isRetry === true`
- [ ] `generationMetadata.attempt === 2`
- [ ] `generationMetadata.retryReason === 'regenerate'`

---

### **Test Scenario 4: Rate Limiting**

**Steps:**
1. Send 30 messages rapidly (use script)
2. Try 31st message

**Verify:**
- [ ] 31st message blocked
- [ ] Error: "Too many requests. Wait X seconds"
- [ ] Can send again after cooldown
- [ ] No data corruption

---

### **Test Scenario 5: Feedback**

**Steps:**
1. Send message, get response
2. Click thumbs up

**Verify:**
- [ ] Feedback saved to `aiSearchHistory`
- [ ] Feedback saved to `chatSessions` message
- [ ] UI shows selected state
- [ ] Success message appears
- [ ] Can see feedback when reopening chat

---

### **Test Scenario 6: Store Isolation**

**Steps:**
1. Switch to different store
2. View analytics
3. View chat history

**Verify:**
- [ ] Analytics shows ONLY current store data
- [ ] Chat history shows ONLY current store chats
- [ ] No data leakage from other stores

---

### **Test Scenario 7: Race Conditions**

**Steps:**
1. Send message
2. Immediately send another (rapid-fire)

**Verify:**
- [ ] Second shows warning: "Wait for previous..."
- [ ] Second doesn't send until first completes
- [ ] Both messages in correct order
- [ ] No messages lost
- [ ] Correct session for both

---

### 💰 **Cost Control Checklist - Layer 6**

**Integration Testing Cost Awareness:**
- [ ] Test scenarios use test data (not production data that costs reads)
- [ ] Rate limiting tests use small limits (don't trigger 1000s of requests)
- [ ] Cleanup test data after scenarios
- [ ] Monitor Firebase console during tests for unexpected read spikes
- [ ] Document expected read/write counts per test scenario

**Expected Test Costs:**
- New QnA Chat: ~2-3 reads, ~2 writes
- QnA → Assistant: ~1 read, ~1 write
- Regenerate: ~1 read, ~1 write
- Rate Limiting: ~30 reads (by design)
- Feedback: ~2 reads, ~2 writes

---

## 🔒 **LAYER 7: Security & Privacy** (45 min) ⭐ NEW

### **Authentication & Authorization**

**API Routes Check:**
```bash
# Verify ALL API routes have auth
grep -L "getActiveSession\|auth" src/app/api/**/*.ts
# Should return ZERO results ✅
```

**Checklist:**
- [ ] Every API route calls `getActiveSession()`
- [ ] Session validation before any operations
- [ ] Owner-only routes check `role === ECOMSAI_PLATFORM_USER_ROLE`
- [ ] No API keys or secrets in frontend code

---

### **Firestore Security Rules**

**File:** `firestore.rules`

**Critical Checks:**
- [ ] No wildcard read rules (`.read` should have conditions)
- [ ] Store isolation enforced: `request.auth.token.sId == resource.data.sId`
- [ ] Tenant isolation enforced: `request.auth.token.tId == resource.data.tId`
- [ ] Owner-only collections protected
- [ ] Analytics trigger requires admin/owner role

**Test Security Rules:**
```bash
# Use Firebase Emulator
firebase emulators:start --only firestore
# Run security rules tests
npm run test:security
```

---

### **Data Privacy**

**PII Logging Check:**
```bash
# Find potential PII in logs
grep -rn "console.log.*email\|console.log.*phone\|console.log.*address" src/
# Should return ZERO results ✅
```

**Checklist:**
- [ ] No email addresses logged
- [ ] No phone numbers logged
- [ ] No user addresses logged
- [ ] Only user IDs logged (not names)
- [ ] Sensitive data masked in error logs

---

### **GDPR Compliance**

**Data Deletion Workflow:**
- [ ] User data deletion function exists
- [ ] Deletes from all collections (chatSessions, aiSearchHistory, feedback)
- [ ] Deletes user analytics data
- [ ] Orphaned data cleanup scheduled
- [ ] Deletion confirmed in UI

**Data Export:**
- [ ] User can export their data (CSV/JSON)
- [ ] Export includes all user-generated content
- [ ] Export excludes other users' data
- [ ] Export function tested

---

### **Input Sanitization**

**XSS Prevention Check:**
```bash
# Verify Zod validation on all user inputs
grep -L "z\.object\|zodSchema" src/app/api/**/*.ts
```

**Checklist:**
- [ ] All text inputs validated with Zod
- [ ] HTML escaped in display
- [ ] ReactMarkdown uses rehype-sanitize
- [ ] No dangerouslySetInnerHTML without sanitization
- [ ] File uploads validated (type, size)

---

### **Secrets Management**

**Environment Variables:**
```bash
# Check for hardcoded secrets
grep -rn "sk-.*\|AIza.*\|token.*=.*['\"]" src/
# Should return ZERO results ✅
```

**Checklist:**
- [ ] All API keys in `.env.local` (not committed)
- [ ] Gemini API key in environment variable
- [ ] Firebase config uses environment variables
- [ ] No secrets in client-side code
- [ ] `.env.local` in `.gitignore`

---

## ✅ **FINAL VERIFICATION CHECKLIST**

### **Code Quality**

- [ ] No TypeScript errors: `npm run build`
- [ ] No ESLint errors: `npm run lint`
- [ ] No console.logs in production code
- [ ] No hardcoded collection names
- [ ] All constants used from files

### **Performance**

- [ ] SWR caching works (check Network tab)
- [ ] Images lazy load
- [ ] No unnecessary re-renders
- [ ] Firestore reads optimized (<10 per page load)

### **Security**

- [ ] Rate limiting enabled
- [ ] Input validation on all APIs
- [ ] XSS prevention in place
- [ ] Store isolation working
- [ ] Tenant isolation working

### **UX**

- [ ] Loading states clear
- [ ] Error messages helpful
- [ ] Keyboard navigation works
- [ ] Mobile responsive
- [ ] Accessibility tested

### **Data Integrity**

- [ ] Messages save correctly
- [ ] Feedback persists
- [ ] Sessions don't mix
- [ ] Store data isolated
- [ ] Analytics accurate

---

## 📊 **Review Progress Tracker**

Use this to track your review progress:

```
Layer 1: Constants & Configuration
  ✓ database.ts
  ✓ analyticsMetrics.ts
  ✓ features.ts

Layer 2: Database/DAL
  ☐ chatSessions/index.ts
  ☐ chatAnalytics/index.ts
  ☐ feedback/index.ts
  ☐ aiSearchHistory/index.ts
  ☐ users/index.ts

Layer 3: Backend APIs
  ☐ search-kb/route.ts
  ☐ search-kb-stream/route.ts
  ☐ trigger-manual/route.ts
  ☐ monitoring/alerts.ts
  ☐ monitoring/healthCheck.ts
  ☐ monitoring/errorTracking.ts

Layer 4: Business Logic
  ☐ useRequestQueue.ts
  ☐ useChatHandlers.ts
  ☐ apiStream.ts

Layer 5: UI Components
  ☐ index.tsx (main container)
  ☐ ChatHistory.tsx
  ☐ ChatPanel.tsx
  ☐ ChatInput.tsx
  ☐ MessageList.tsx
  ☐ MessageBubble.tsx

Layer 6: Integration Tests
  ☐ New QnA Chat
  ☐ QnA → Assistant Transition
  ☐ Regenerate
  ☐ Rate Limiting
  ☐ Feedback
  ☐ Store Isolation
  ☐ Race Conditions

Final Verification
  ☐ Code Quality
  ☐ Performance
  ☐ Security
  ☐ UX
  ☐ Data Integrity
```

---

## 📝 **Review Session Log Template**

Use this template to log your findings:

```markdown
## Review Session [Date]

### Layer Reviewed: [1-6]
### Files Reviewed: [List]
### Time Spent: [Hours]

### Issues Found:
1. ❌ [File:Line] - [Description] - [Severity: High/Med/Low]
2. ⚠️ [File:Line] - [Description] - [Severity: High/Med/Low]

### Positive Findings:
1. ✅ [What worked well]

### Next Session Plan:
- [ ] Fix issues found today
- [ ] Continue to Layer [X]
```

---

## 🎯 **Quick Reference: Common Issues**

| Issue | Where to Look | How to Fix |
|-------|---------------|------------|
| Missing store isolation | chatAnalytics queries | Add `where('sId', '==', session.sId)` |
| Hardcoded collection | DAL files | Use `DB_COLLECTIONS.XXX` |
| No rate limiting | API routes | Add `checkRateLimit()` before expensive ops |
| Race conditions | Message sending | Verify `useRequestQueue` used |
| Stale closures | Handlers | Use refs instead of state |
| Missing `await` | DAL queries | Add `await getCollectionRef()` |
| Not wrapped in composer | DAL functions | Wrap in `apiCallComposer` |
| No error handling | API/handlers | Add try-catch blocks |

---

**Status:** 🟢 Ready to Start Review  
**Next Step:** Begin with Layer 1 - Constants & Configuration  
**Estimated Completion:** 4-6 hours total (break into multiple sessions)

**Remember:** Take breaks every hour. Don't rush. Quality over speed! 🚀

---

## 💰 **FIRESTORE COST AUDIT LOG** ⭐ NEW

**Purpose:** Track actual Firebase costs after implementing optimizations

**Instructions:**
1. Complete the system review using this guide
2. Run your app in production/staging for 1 day
3. Check Firebase Console → Usage tab
4. Fill in this table with actual read/write counts
5. Use this to identify expensive operations

### **Cost Tracking Template**

| Operation | Collection | Reads | Writes | Frequency | Daily Cost | Optimization Action |
|-----------|------------|-------|--------|-----------|------------|-------------------|
| Load Insights Dashboard | `chatAnalytics` | 90 | 0 | 100x/day | ~$0.027 | ✅ SWR cached - optimal |
| View Single Conversation | `chatSessions` | 1 | 0 | 500x/day | ~$0.015 | ✅ Uses `doc()` - optimal |
| Send Chat Message | `chatSessions` | 1 | 2 | 200x/day | ~$0.015 | ✅ Minimal reads |
| Daily Analytics Aggregation | `chatSessions` | 3000 | 1 | 1x/day | ~$0.90 | ✅ Batch operation - acceptable |
| Backfill 30 Days | `chatSessions` | 15000 | 30 | 1x/month | ~$4.50 | ✅ One-time - acceptable |
| Load Conversations List | `chatSessions` | 20 | 0 | 50x/day | ~$0.03 | ⚠️ Consider pagination |
| --- | --- | --- | --- | --- | --- | --- |
| **TOTAL DAILY** | --- | **~4,000** | **~400** | --- | **~$1.50/day** | **$45/month** |

### **Cost Baseline Targets**

| Tier | Daily Reads | Daily Writes | Daily Cost | Monthly Cost |
|------|-------------|--------------|------------|--------------|
| **Startup** | <10,000 | <1,000 | <$3.00 | <$90 |
| **Growth** | <50,000 | <5,000 | <$15.00 | <$450 |
| **Scale** | <200,000 | <20,000 | <$60.00 | <$1,800 |

### **High-Cost Operations to Monitor**

**🔴 RED FLAGS (>1,000 reads per operation):**
- Backfill without date limits
- Analytics dashboard without caching
- Full conversation history load (all messages)

**🟡 WATCH (100-1,000 reads per operation):**
- Analytics dashboard with long date ranges
- Searching across all conversations
- Loading chat history without pagination

**🟢 OPTIMAL (<100 reads per operation):**
- Single conversation view
- Paginated lists with `.limit()`
- SWR-cached dashboard views

### **Optimization Checklist**

**After filling the table above, review:**
- [ ] Any operation >1,000 reads? → Add pagination or caching
- [ ] Any operation >500 reads? → Add SWR caching
- [ ] Daily cost >$3? → Review highest-cost operations
- [ ] Monthly projection >$90? → Implement aggressive caching
- [ ] Any redundant reads? → Deduplicate with SWR

### **Example Audit Entry**

```markdown
## Cost Audit - January 15, 2025

**Environment:** Production
**Duration:** 24 hours
**Active Users:** ~50

| Operation | Reads | Writes | Notes |
|-----------|-------|--------|-------|
| Insights Dashboard | 4,500 | 0 | 50 users × 90 reads = Issue! |
| Chat Messages | 200 | 400 | Normal |
| Daily Aggregation | 3,000 | 1 | Scheduled job |

**Finding:** Insights Dashboard not using SWR cache!
**Action:** Implemented SWR → Reduced to 90 reads (50 users × 1-2 reads)
**Savings:** ~4,410 reads/day = ~132k reads/month = ~$40/month saved
```

---

**Last Updated:** October 29, 2025  
**Contributors:** Development Team  
**Version:** 2.0 (Enhanced with AI Feedback)

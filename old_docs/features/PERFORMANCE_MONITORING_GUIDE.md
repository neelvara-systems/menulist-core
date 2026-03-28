# Performance Monitoring Guide: Streaming vs Non-Streaming

## Overview

This system tracks performance metrics to compare **streaming** vs **non-streaming** approaches for the RAG chatbot. All data is logged to a dedicated performance log file for analysis.

---

## Log File Location

**File:** `logs/kb-search-performance.log`

This file contains **ONLY** essential performance metrics for decision-making. All unnecessary logs have been removed.

---

## Metrics Tracked

### **Non-Streaming Mode** (Current Default)

**Log Types:**
1. `NON_STREAMING_CACHE_HIT` - Cached response returned
2. `NON_STREAMING_COMPLETE` - New search completed
3. `NON_STREAMING_ERROR` - Error occurred

**Logged Data:**
```json
{
  "query": "user's question",
  "mode": "non-streaming",
  "cached": true/false,
  "hasImage": true/false,
  "assistantMode": true/false,
  "totalMs": 1234,
  "cacheLookupMs": 45,
  "embeddingGenerationMs": 230,
  "vectorSearchMs": 340,
  "answerGenerationMs": 619,
  "answerLength": 450
}
```

### **Streaming Mode** (When Enabled)

**Log Types:**
1. `STREAMING_CACHE_HIT` - Cached response returned
2. `STREAMING_COMPLETE` - New search completed with streaming
3. `STREAMING_ERROR` - Error occurred

**Logged Data:**
```json
{
  "query": "user's question",
  "mode": "streaming",
  "cached": true/false,
  "hasImage": true/false,
  "assistantMode": true/false,
  "totalMs": 3456,
  "answerLength": 450,
  "streamingEnabled": true
}
```

---

## Performance Comparison

### **Cached Responses** (Same Query Asked Before)

| Mode | Expected Time | Notes |
|------|---------------|-------|
| **Non-Streaming** | ~100-200ms | Instant JSON return |
| **Streaming** | ~100-200ms | Instant JSON return |

**Winner:** 🤝 **TIE** - Both return cached data instantly as JSON

---

### **Non-Cached Responses** (New Questions)

| Mode | Expected Time | User Experience |
|------|---------------|-----------------|
| **Non-Streaming** | ~2-4s | Loading → Typing animation |
| **Streaming** | ~2-4s | Real-time text streaming |

**Key Difference:**
- **Non-Streaming:** User waits for complete response, then sees typing animation
- **Streaming:** User sees text appear live as AI generates it (like ChatGPT)

---

## How to Read the Logs

### **Example: Compare Two Searches**

```log
2025-01-22T14:23:45.123Z - Type: NON_STREAMING_COMPLETE - Data: {"query":"How do I create a menu?","mode":"non-streaming","cached":false,"totalMs":3241,"embeddingGenerationMs":892,"vectorSearchMs":456,"answerGenerationMs":1893}

2025-01-22T14:25:12.456Z - Type: STREAMING_COMPLETE - Data: {"query":"How do I create a menu?","mode":"streaming","cached":false,"totalMs":3198,"answerLength":487,"streamingEnabled":true}
```

**Analysis:**
- Both took ~3.2 seconds total
- Non-streaming shows breakdown (embedding, vector search, generation)
- Streaming shows total time only (real-time delivery)

---

## Testing Scenarios

### **Scenario 1: Fresh Database (All Caches Empty)**

**Setup:**
1. Delete all data from `aiSearchHistory`, `chatSessions`, `queryEmbeddings`
2. Toggle `ENABLE_STREAMING_RESPONSES` in `src/config/features.ts`

**Test Questions:**
```
1. "How do I create a menu?"
2. "What are the pricing plans?"
3. "How do I add images to my menu?"
```

**What to Log:**
- First-time search performance
- Embedding generation time
- Vector search time
- Answer generation time

---

### **Scenario 2: Cached Responses**

**Setup:**
1. Ask the same questions from Scenario 1 again
2. Toggle between streaming modes

**Expected Results:**
- Both modes: ~100-200ms (instant return)
- Cached queries skip embedding + vector search
- Only database lookup time matters

---

### **Scenario 3: Image-Based Searches**

**Setup:**
1. Upload an image with a question
2. Test both modes

**What to Track:**
- Image processing time (not logged separately anymore)
- Total time comparison
- `hasImage: true` flag in logs

---

## Decision Criteria

### **When to Use Streaming**

✅ **Benefits:**
- Real-time user feedback (like ChatGPT)
- Feels faster even if total time is same
- Modern UX

❌ **Trade-offs:**
- Slightly more complex frontend code
- SSE connection overhead
- Cannot show progress breakdown

### **When to Use Non-Streaming**

✅ **Benefits:**
- Simpler implementation
- Detailed performance breakdown in logs
- Easier to debug

❌ **Trade-offs:**
- User waits with loading spinner
- Typing animation after response completes
- Less "live" feeling

---

## Quick Analysis Commands

### **View All Performance Logs**
```bash
cat logs/kb-search-performance.log
```

### **Filter Cache Hits**
```bash
grep "CACHE_HIT" logs/kb-search-performance.log
```

### **Filter Streaming vs Non-Streaming**
```bash
# Streaming logs
grep "STREAMING_" logs/kb-search-performance.log

# Non-streaming logs
grep "NON_STREAMING_" logs/kb-search-performance.log
```

### **Get Average Total Time**
```bash
# For non-streaming
grep "NON_STREAMING_COMPLETE" logs/kb-search-performance.log | grep -o '"totalMs":[0-9]*' | cut -d':' -f2 | awk '{ sum += $1; n++ } END { if (n > 0) print "Average: " sum/n "ms"; }'

# For streaming
grep "STREAMING_COMPLETE" logs/kb-search-performance.log | grep -o '"totalMs":[0-9]*' | cut -d':' -f2 | awk '{ sum += $1; n++ } END { if (n > 0) print "Average: " sum/n "ms"; }'
```

---

## Removed Logs

The following logs were removed to keep the system clean:

❌ **Removed from Non-Streaming:**
- `IMAGE_SEARCH_STARTED`
- `IMAGE_FETCHED_SUCCESSFULLY`
- `IMAGE_QUERY_GENERATED`
- `SEARCH_OPERATION_STARTED`
- `SEARCH_CACHE_HIT` / `SEARCH_CACHE_MISS`
- `EMBEDDING_CACHE_HIT` / `EMBEDDING_CACHE_MISS`
- `EMBEDDING_GENERATED_AND_CACHED`
- `EMBEDDING_READY_FOR_SEARCH`
- `SEARCH_SNAPSHOT_RECEIVED`
- `SEARCH_DOCUMENTS_FOUND`
- `SIMILARITY_THRESHOLD_SEARCH_DOCUMENTS_MATCHED`
- `SEARCH_GEMINI_PAYLOAD`
- `ASSISTANT_MODE_WITH_CONTEXT`
- `SEARCH_FINAL_ANSWER`
- `FINAL_SEARCH_RESPONSE`
- `PERFORMANCE_METRICS`

❌ **Removed from Streaming:**
- `CACHE_HIT_INSTANT_RETURN`
- `STREAMING_SEARCH_COMPLETE`

✅ **Kept (Essential Only):**
- `NON_STREAMING_CACHE_HIT` / `STREAMING_CACHE_HIT`
- `NON_STREAMING_COMPLETE` / `STREAMING_COMPLETE`
- `NON_STREAMING_ERROR` / `STREAMING_ERROR`
- `WARNING_IMAGE_PROCESSING_FALLBACK` (safety)

---

## Toggle Streaming On/Off

**File:** `src/config/features.ts`

```typescript
export const FEATURE_FLAGS = {
    ENABLE_STREAMING_RESPONSES: false, // Change to true for streaming
}
```

After changing:
1. Restart dev server
2. Test same queries
3. Compare logs in `kb-search-performance.log`

---

## Recommendation

**Start Testing:**
1. ✅ Delete all cached data (fresh start)
2. ✅ Test with `ENABLE_STREAMING_RESPONSES: false` (5-10 queries)
3. ✅ Test with `ENABLE_STREAMING_RESPONSES: true` (same 5-10 queries)
4. ✅ Analyze logs to compare:
   - Total time
   - Cache hit rates
   - User experience feedback
5. ✅ Make decision based on real data + UX feedback

**Key Metrics:**
- **Performance:** Is there a significant time difference?
- **UX:** Does streaming "feel" faster even if total time is same?
- **Reliability:** Do both modes handle errors gracefully?

# Chat Search Architecture

## Overview
This document explains the hybrid search implementation for the Chat Management page.

## Search Implementation: Hybrid Approach

### Why Hybrid? (Server + Client)

**Firestore Limitations:**
- ❌ No native case-insensitive search
- ❌ No partial text matching (only prefix with `>=` and `<=`)
- ❌ No full-text search on nested arrays
- ❌ Would need expensive composite indexes for every search term

**Our Solution:**
✅ **Server-side filtering**: Fast queries on indexed fields
✅ **Client-side filtering**: Complex searches on nested data

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                      User Types Query                           │
│                     "john password reset"                        │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Frontend (ConversationsList.tsx)               │
│  • User types in search input                                   │
│  • SWR cache key includes searchQuery → triggers refetch        │
│  • Passes searchQuery to getConversationsPaginated()            │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│             Backend (getConversationsPaginated)                 │
│  1. Fetch 20 docs from Firestore (with pagination)              │
│     • WHERE tId = session.tId                                   │
│     • WHERE sId = session.sId                                   │
│     • WHERE mode = 'qna' (if filtered)                          │
│     • ORDER BY modifiedOn DESC                                  │
│     • LIMIT 21 (for pagination check)                           │
│                                                                  │
│  2. SERVER-SIDE FILTER (on fetched data):                       │
│     ✅ title.toLowerCase().includes(query)                      │
│     ✅ userName.toLowerCase().includes(query)                   │
│                                                                  │
│  3. Return filtered sessions to client                          │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              Frontend (filteredSessions useMemo)                │
│  CLIENT-SIDE FILTER (on received data):                         │
│  ✅ Search in message.content                                   │
│  ✅ Search in message.craftedAnswer                             │
│                                                                  │
│  • Only processes data already fetched (20 sessions)            │
│  • No additional database queries                               │
└──────────────────────┬──────────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Display Results                              │
│  • Show matching conversations                                  │
│  • Highlight search terms                                       │
│  • Infinite scroll for more results                             │
└─────────────────────────────────────────────────────────────────┘
```

---

## What Gets Searched Where

| Field | Search Location | Why? |
|-------|----------------|------|
| **`title`** | 🔵 **Server-side** | Top-level field, indexed, fast |
| **`userName`** | 🔵 **Server-side** | Top-level field, indexed, fast |
| **`messages[].content`** | 🟢 **Client-side** | Nested array, expensive to query |
| **`messages[].craftedAnswer`** | 🟢 **Client-side** | Nested array, expensive to query |

---

## Code Flow

### 1. Frontend: Search Input
```typescript
// ConversationsList.tsx L283-289
<Input
    placeholder="Search conversations..."
    prefix={<LuSearch />}
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    allowClear
/>
```

### 2. Frontend: Debounce Search Query (500ms delay)
```typescript
// ConversationsList.tsx L26-27
// Debounce search query to avoid hitting database on every keystroke (500ms delay)
const debouncedSearchQuery = useDebounceValue(searchQuery, 500);
```
**How it works:**
- User types "john" → Input updates instantly (responsive UI)
- Hook waits 500ms after last keystroke
- Only then triggers database query with "john"
- If user keeps typing, timer resets (prevents unnecessary queries)

### 3. Frontend: Trigger Refetch (Using Debounced Value)
```typescript
// ConversationsList.tsx L49-51
const cacheKey = loggedInSession?.sId
    ? `conversations-${loggedInSession.tId}-${loggedInSession.sId}-${modeFilter}-${feedbackFilter}-${dateRange?.[0]?.valueOf()}-${dateRange?.[1]?.valueOf()}-${debouncedSearchQuery}`
    : null;
```

### 4. Backend: Server-Side Filtering
```typescript
// chatAnalytics/index.ts L489-501
if (filters?.searchQuery) {
    const searchLower = filters.searchQuery.toLowerCase();
    sessions = sessions.filter(session => {
        // Search in title
        if (session.title?.toLowerCase().includes(searchLower)) return true;
        // Search in userName
        if (session.userName?.toLowerCase().includes(searchLower)) return true;
        // Note: Message content search happens client-side
        return false;
    });
}
```

### 5. Frontend: Client-Side Filtering
```typescript
// ConversationsList.tsx L199-213
const filteredSessions = useMemo(() => {
    return sessions.filter(session => {
        if (!searchQuery) return true;
        const searchLower = searchQuery.toLowerCase();

        // Server-side already filtered by title and userName
        // Here we only search in message content
        return session.messages.some(msg => {
            const content = msg.content || msg.craftedAnswer || '';
            return content.toLowerCase().includes(searchLower);
        });
    });
}, [sessions, searchQuery]);
```

---

## Performance Characteristics

### ✅ Optimized Aspects
1. **Debouncing (500ms)**: Only triggers database query after user stops typing
2. **Pagination**: Only fetches 20 conversations at a time
3. **Server-side pre-filtering**: Reduces data transfer by filtering title/userName before sending
4. **Memoization**: Client-side filter uses `useMemo` to prevent unnecessary recalculations
5. **SWR caching**: Cached results for 60 seconds (dedupingInterval)

### ⚠️ Limitations
1. **Firestore reads**: Still reads 20+ docs per search (cost: ~$0.036 per 1000 searches)
2. **Message content**: Must download full messages to search content
3. **Case-sensitive at DB level**: Can't leverage Firestore indexes for case-insensitive search

---

## Alternative Solutions (Not Implemented)

### Option 1: Full-Text Search Service
**Pros:**
- ✅ True database-level full-text search
- ✅ Fast, relevance-ranked results
- ✅ Supports fuzzy matching, typos

**Cons:**
- ❌ Extra cost ($1-10/month for Algolia/Typesense)
- ❌ Data synchronization complexity
- ❌ Additional service to maintain

**Services:**
- Algolia
- Elasticsearch
- Typesense
- Meilisearch

### Option 2: Firebase Extensions
**Extension:** `firestore-algolia-search`

**Pros:**
- ✅ Auto-syncs Firestore → Algolia
- ✅ Pre-built solution

**Cons:**
- ❌ Vendor lock-in
- ❌ Additional cost

---

## Future Improvements

### If Search Becomes Slow (>1000 conversations)
1. ✅ ~~**Add debouncing**~~ - **IMPLEMENTED** (500ms delay)
2. **Implement virtual scrolling**: Only render visible conversations
3. **Add search result limits**: Show top 50 matches
4. **Consider Algolia**: If search performance becomes critical

### If Cost Becomes Issue
1. **Increase pagination**: Fetch 50-100 at a time (reduces re-fetches)
2. **Add local caching**: Cache search results in localStorage
3. **Add search analytics**: Track most common queries, pre-cache them

---

## Conclusion

**Current approach is optimal for:**
- ✅ Small to medium datasets (<5000 conversations)
- ✅ Budget-conscious implementation
- ✅ Simple search requirements (contains match)

**Consider alternatives when:**
- ❌ Search becomes slow (>2 seconds)
- ❌ Users complain about missing results
- ❌ Need fuzzy matching or typo tolerance

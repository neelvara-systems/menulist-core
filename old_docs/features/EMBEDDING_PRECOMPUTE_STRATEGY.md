# Embedding Pre-compute Strategy

## Problem
Embedding generation takes 1.7-5.3 seconds (~30-50% of total search time).

## Current Solution
✅ Cache embeddings after first query (`getCachedEmbedding()`)

## Proposed Enhancement: Pre-compute Common Queries

### Strategy
1. **Identify frequently asked questions** from search history
2. **Pre-compute embeddings** during low-traffic periods (e.g., 2-6 AM)
3. **Store in `queryEmbeddings` collection** (already exists)

### Implementation Plan

#### Step 1: Analyze Search History
```typescript
// Run weekly to find top 100 queries
async function getTopQueries() {
  const snapshot = await firestoreAdmin
    .collection('aiSearchHistory')
    .orderBy('createdOn', 'desc')
    .limit(1000)
    .get();
  
  const queryCounts = new Map();
  snapshot.docs.forEach(doc => {
    const query = normalizeQuery(doc.data().query);
    queryCounts.set(query, (queryCounts.get(query) || 0) + 1);
  });
  
  return Array.from(queryCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 100)
    .map(([query]) => query);
}
```

#### Step 2: Pre-compute Embeddings
```typescript
// Cloud Function: runs daily at 3 AM
async function precomputeEmbeddings() {
  const topQueries = await getTopQueries();
  
  for (const query of topQueries) {
    const cacheKey = normalizeQuery(query);
    const exists = await getCachedEmbedding(cacheKey);
    
    if (!exists) {
      const vector = await callGeminiEmbedding(query);
      await saveCachedEmbedding(cacheKey, query, vector);
      console.log(`Pre-computed: ${query}`);
    }
  }
}
```

#### Step 3: Monitor Cache Hit Rate
```typescript
// Add to performance logs
data: {
  embeddingCacheHit: !!cachedEmbedding,  // NEW
  embeddingGenerationMs: perfMetrics.embeddingGeneration
}
```

### Expected Impact
- **First-time queries:** Still 1.7-5.3s (no change)
- **Common queries:** **0ms embedding time** (instant cache hit)
- **Cache hit rate:** 60-80% for typical users

### Cost/Benefit
- **Cost:** ~100 Gemini API calls/day (negligible)
- **Benefit:** 30-50% faster responses for majority of queries

### Status
⏳ **Proposed** - Not implemented yet

---

**Next Steps:**
1. Monitor embedding cache hit rate (add to logs)
2. If < 50%, implement pre-compute strategy
3. If > 70%, current caching is sufficient

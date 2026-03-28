# AI System Layer — Firebase Cost Tracking

**Feature:** Centralized AI Infrastructure for MenuList  
**Status:** 📝 DOCUMENTED — Implementation pending  
**Last Updated:** March 12, 2026

---

## Summary

- **New Collection:** `aiUsageLog` (lightweight, append-only usage tracking)
- **Modified Collection:** None (existing collections unchanged)
- **Cloud Functions Impact:** Gateway adds ~20-50ms overhead per AI call
- **Estimated Additional Cost:** ~$0.50/month per 1000 tenants (usage log storage only)

---

## Firestore Operations

### Reads

| Operation | Collection | Trigger | Frequency | Docs Read | Notes |
|-----------|-----------|---------|-----------|-----------|-------|
| Global rate limit check | Upstash Redis | Every AI call | Per AI request | 0 Firestore | Uses existing Upstash, not Firestore |
| Feature flag check | In-memory | Every AI call | Per AI request | 0 | Feature flags are in-memory constants |

### Writes

| Operation | Collection | Trigger | Frequency | Docs Written | Fields | Notes |
|-----------|-----------|---------|-----------|-------------|--------|-------|
| Log AI usage | `aiUsageLog` | After each AI call | Per AI request | 1 | taskType, model, tokens, cost, duration | Lightweight append-only. Fire-and-forget (never blocks AI response). |

### Deletes

| Operation | Collection | Trigger | Frequency | Notes |
|-----------|-----------|---------|-----------|-------|
| TTL cleanup | `aiUsageLog` | Nightly scheduler | Daily | Delete docs older than 90 days. Piggybacked on existing nightly scheduler. |

---

## Cost Estimate

### Per 1000 tenants/month (assuming ~5000 AI calls/month total)

| Resource | Operations/month | Unit Cost | Monthly Cost |
|----------|-----------------|-----------|-------------|
| Firestore Writes (usage log) | 5,000 | $0.18/100K | $0.01 |
| Firestore Storage (usage log docs, ~500 bytes each) | 2.5 MB | $0.18/GB | $0.00 |
| Firestore Deletes (90-day cleanup) | ~1,700/month | $0.02/100K | $0.00 |
| Upstash Redis (global rate limit) | 5,000 × 4 commands | Existing plan | $0.00 |
| **Total additional cost** | | | **~$0.01/month** |

> **Note:** The AI System Layer itself adds negligible cost. The AI calls themselves (Gemini API) are the dominant cost — those are tracked, not increased, by this layer.

---

## Existing AI Cost Tracking (Reference)

### Current: `MENULIST_AI_OPERATIONS` collection

Used by menu extraction only. Heavy documents (~5KB each) with full transaction details.

| Field | Stored |
|-------|--------|
| Full request/response | ✅ Yes |
| Token usage | ✅ Yes |
| Cost calculation | ✅ Yes |
| File details | ✅ Yes |
| Generation config | ✅ Yes |

### New: `aiUsageLog` collection

Used by ALL AI features. Lightweight documents (~500 bytes each).

| Field | Stored |
|-------|--------|
| Task type + feature name | ✅ Yes |
| Token usage | ✅ Yes |
| Cost calculation | ✅ Yes |
| Duration | ✅ Yes |
| Tenant context (optional) | ✅ Yes |
| Full request/response | ❌ No (too heavy) |

**Relationship:** `MENULIST_AI_OPERATIONS` continues for extraction (detailed audit trail). `aiUsageLog` provides cross-feature cost visibility.

---

## Indexes Required

```json
{
  "collectionGroup": "aiUsageLog",
  "fields": [
    { "fieldPath": "taskType", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
},
{
  "collectionGroup": "aiUsageLog",
  "fields": [
    { "fieldPath": "tenantId", "order": "ASCENDING" },
    { "fieldPath": "createdAt", "order": "DESCENDING" }
  ]
}
```

---

## Security Rules

```
match /aiUsageLog/{docId} {
  // Only Cloud Functions (admin SDK) can write
  // Platform admins can read for monitoring
  allow read: if request.auth != null && 
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.platformRole == 'PLATFORM';
  allow write: if false; // Admin SDK only
}
```

---

## DAL Functions

| Function | Location | Operation |
|----------|----------|-----------|
| `logAIUsage()` | `functions/src/ai/costTracker.ts` | Write (fire-and-forget) |
| `getAIUsageSummary()` | `functions/src/ai/costTracker.ts` | Read (aggregation query) |
| `cleanupOldUsageLogs()` | `functions/src/ai/costTracker.ts` | Delete (TTL cleanup) |

---

_Document Status: 📝 DOCUMENTED — Implementation pending_

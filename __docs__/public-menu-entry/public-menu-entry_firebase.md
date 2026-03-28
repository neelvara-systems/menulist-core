# Public Menu Entry — Firebase Cost Tracking

**Version:** 1.0
**Status:** 📝 DRAFT
**Last Updated:** March 10, 2026

---

## 1. Collections

| Collection | Type | Purpose |
|-----------|------|---------|
| `publicMenuDrafts` | NEW | Temporary drafts from anonymous uploads (24h TTL) |
| `projects/{tId}/{sId}/{projectId}` | EXISTING | Final project after claim (no new fields) |
| `stores` | EXISTING | Store created on claim (no new fields) |
| `tenants` | EXISTING | Tenant created on claim for new users (no new fields) |

---

## 2. Operations Per User Journey

### 2.1 Upload + Extraction (Anonymous)

| Operation | Collection | Type | Count | Trigger |
|-----------|-----------|------|-------|---------|
| Create draft doc | `publicMenuDrafts` | WRITE | 1 | POST /api/public/create-menu |
| Upload image | Firebase Storage | WRITE | 1 | Same API route |
| Read draft | `publicMenuDrafts` | READ | 1 | Cloud Function reads draft |
| Update draft (extraction result) | `publicMenuDrafts` | WRITE | 1 | CF writes extraction result |
| **Subtotal** | | | **2R + 2W + 1 Storage** | |

### 2.2 Preview (Anonymous, Polling)

| Operation | Collection | Type | Count | Trigger |
|-----------|-----------|------|-------|---------|
| Read draft (by token) | `publicMenuDrafts` | READ | 1-5 | Polling until extraction complete |
| **Subtotal** | | | **1-5R** | |

### 2.3 Claim + Publish (Authenticated)

| Operation | Collection | Type | Count | Trigger |
|-----------|-----------|------|-------|---------|
| Read draft (by token) | `publicMenuDrafts` | READ | 1 | Claim API |
| Create tenant (if new user) | `tenants` | WRITE | 0-1 | New user only |
| Create store | `stores` | WRITE | 1 | Claim API |
| Create project metadata | `projects` (metadata) | WRITE | 1 | Claim API |
| Create project data | `projects` (data) | WRITE | 1 | Claim API |
| Update draft (claimed) | `publicMenuDrafts` | WRITE | 1 | Mark as claimed |
| Sync storesSummary | `platformSummary` | WRITE | 1 | Existing pattern |
| Sync projectsSummary | `platformSummary` | WRITE | 1 | Existing pattern |
| Delete temp Storage image | Firebase Storage | DELETE | 1 | Cleanup after copy |
| **Subtotal** | | | **1R + 5-6W + 1 Storage DELETE** | |

### 2.4 Total Per Successful Conversion

| Phase | Reads | Writes | Storage |
|-------|-------|--------|---------|
| Upload + Extract | 2 | 2 | 1 upload |
| Preview (avg 3 polls) | 3 | 0 | 0 |
| Claim + Publish | 1 | 6 | 1 delete |
| **TOTAL** | **6** | **8** | **1 upload + 1 delete** |

### 2.5 Total Per Abandoned Draft (No Conversion)

| Phase | Reads | Writes | Storage |
|-------|-------|--------|---------|
| Upload + Extract | 2 | 2 | 1 upload |
| Preview (avg 3 polls) | 3 | 0 | 0 |
| Nightly cleanup | 1 | 0 | 1 delete |
| Nightly delete doc | 0 | 1 (delete) | 0 |
| **TOTAL** | **6** | **3** | **1 upload + 1 delete** |

---

## 3. Cost Estimates

### 3.1 Firestore Pricing (Pay-as-you-go)

| Operation | Price |
|-----------|-------|
| Read | $0.06 / 100K |
| Write | $0.18 / 100K |
| Delete | $0.02 / 100K |
| Storage | $0.18 / GB / month |

### 3.2 Gemini API Pricing

| Model | Input | Output |
|-------|-------|--------|
| Gemini 2.5 Flash | $0.15 / 1M tokens | $0.60 / 1M tokens |
| Image input | ~258 tokens per image | — |

**Estimated cost per extraction:** ~₹0.50–₹1.00 (depending on menu complexity)

### 3.3 Firebase Storage

| Item | Size | Cost |
|------|------|------|
| Temp image (24h) | ~1-3 MB | Negligible (deleted within 24h) |

### 3.4 Monthly Cost Projections

| Scenario | Uploads/day | Conversions/day | Firestore Cost | Gemini Cost | Total |
|----------|-------------|-----------------|----------------|-------------|-------|
| Low (early) | 10 | 3 | ~₹0.50 | ~₹10 | ~₹10.50/mo |
| Medium | 50 | 15 | ~₹2.50 | ~₹50 | ~₹52.50/mo |
| High | 200 | 60 | ~₹10 | ~₹200 | ~₹210/mo |
| Max (rate-limited) | 500 | 150 | ~₹25 | ~₹500 | ~₹525/mo |

**Rate limit of 3/IP/day naturally caps cost.** Even at max throughput, monthly cost stays under ₹600.

---

## 4. Indexes Required

```json
// firestore.indexes.json additions
{
    "collectionGroup": "publicMenuDrafts",
    "queryScope": "COLLECTION",
    "fields": [
        { "fieldPath": "token", "order": "ASCENDING" }
    ]
},
{
    "collectionGroup": "publicMenuDrafts",
    "queryScope": "COLLECTION",
    "fields": [
        { "fieldPath": "claimed", "order": "ASCENDING" },
        { "fieldPath": "expiresAt", "order": "ASCENDING" }
    ]
}
```

---

## 5. Security Rules

```
// firestore.rules addition
match /publicMenuDrafts/{docId} {
    // Only server (admin SDK) can read/write
    // No client-side access — all operations go through API routes
    allow read, write: if false;
}
```

All operations on `publicMenuDrafts` happen via API routes (server-side) or Cloud Functions (admin SDK). No client-side Firestore access needed.

---

## 6. Storage Rules

```
// storage.rules addition
match /publicMenuDrafts/{draftId}/{fileName} {
    // Only server can write/delete
    // Public read for preview image display
    allow read: if true;
    allow write, delete: if false;  // Server-side only via admin SDK
}
```

---

## 7. Cost Safety Guardrails

1. **Rate limit:** 3 uploads per IP per 24h — caps daily Gemini calls
2. **Feature flag:** `ENABLE_PUBLIC_MENU_ENTRY` — instant kill switch
3. **TTL cleanup:** 24h auto-delete prevents storage accumulation
4. **Batch cleanup limit:** Max 100 expired drafts per nightly run
5. **Max image size:** 10MB — prevents storage abuse

---

**Document Signature:** MenuList Firebase Cost Tracking
**Audience:** DevOps / Cost Management

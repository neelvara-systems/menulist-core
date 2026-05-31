# Public Menu Entry — Firebase Cost Tracking

**Version:** 1.0
**Status:** ✅ IMPLEMENTED — Production-audited
**Last Updated:** May 20, 2026

---

## 1. Collections

| Collection | Type | Purpose |
|-----------|------|---------|
| `publicMenuDrafts` | NEW | Temporary drafts from public upload/link-before-auth previews (24h TTL) |
| `projects/{tId}/{sId}/{projectId}` | EXISTING | Final project after claim |
| `stores` | EXISTING | Store created on claim; starter activation and distribution signal fields live here |
| `tenants` | EXISTING | Tenant created on claim for new users; starter activation deadline mirrored for new tenants |

---

## 2. Operations Per User Journey

### 2.1 Upload/Link + Extraction (Public, IP Rate-Limited)

| Operation | Collection | Type | Count | Trigger |
|-----------|-----------|------|-------|---------|
| Create draft doc | `publicMenuDrafts` | WRITE | 1 | POST /api/public/create-menu |
| Upload image or link artifact | Firebase Storage | WRITE | 1 | Same API route |
| Read source artifact | Storage + `publicMenuDrafts` | READ | 1 | Public API route downloads temp source for extraction |
| Update draft (extraction result) | `publicMenuDrafts` | WRITE | 1 | Public API route writes extraction result |
| **Subtotal** | | | **2R + 2W + 1 Storage** | |

For public menu links, the route performs one bounded outbound source acquisition before the Storage write. Unsafe protocols, private IPs, unsafe redirects, unsupported content types, login/CAPTCHA-dependent sources, and low-confidence non-menu pages are rejected before draft creation. The public source shares the same 3-per-IP-per-day `PUBLIC_MENU_ENTRY` limiter as image upload and is additionally gated by `ENABLE_MENU_LINK_IMPORT`.

### 2.2 Preview (Token-Based Polling)

| Operation | Collection | Type | Count | Trigger |
|-----------|-----------|------|-------|---------|
| Read draft (by token) | `publicMenuDrafts` | READ | 1-5 | Polling until extraction complete |
| **Subtotal** | | | **1-5R** | |

### 2.3 Claim + Publish (Authenticated)

| Operation | Collection | Type | Count | Trigger |
|-----------|-----------|------|-------|---------|
| Read draft (by token) | `publicMenuDrafts` | READ | 1 | Claim API transaction |
| Create tenant (if new user) | `tenants` | WRITE | 0-1 | New user only |
| Create store | `stores` | WRITE | 1 | Claim API |
| Create project metadata | `projects` (metadata) | WRITE | 1 | Claim API |
| Create project data | `projects` (data) | WRITE | 1 | Claim API |
| Update draft (claimed) | `publicMenuDrafts` | WRITE | 1 | Mark as claimed |
| Sync storesSummary | `platformSummary` | WRITE | 1 | Nested `stores.{storeId}` map for scheduler-readable store metadata |
| Sync projectsSummary | `platformSummary` | WRITE | 1 | Existing pattern |
| Revalidate public cache | Next.js cache tags | INVALIDATE | 3 tags | `menu-store-{storeId}`, `store-{storeId}`, `client-stores` |
| **Subtotal** | | | **1R + 5-6W + 3 cache tags** | |

### 2.3.1 Payment Webhook Entitlement Sync

When Razorpay confirms a subscription, the webhook updates the same public URL from starter state to paid continuity state.

| Operation | Collection | Type | Count | Trigger |
|-----------|-----------|------|-------|---------|
| Update subscription status/entitlement | `subscriptions/{subscriptionId}` | WRITE | 1 | Signed Razorpay webhook |
| Update store plan entitlement | `stores/{storeId}` | WRITE | 1 | `safeSyncStorePlanEntitlementFromSubscription()` |
| Update storesSummary plan entitlement | `platformSummary/storesSummary` | WRITE | 1 | Nested `stores.{storeId}.activePlanType` mirror |
| Record webhook audit | `payment_transactions` | WRITE | 1 | Webhook audit trail |
| Revalidate public cache | Next.js cache tags | INVALIDATE | 3 tags | `menu-store-{storeId}`, `store-{storeId}`, `client-stores` |

The nested `stores.{storeId}` map is required because Cloud Functions and scheduler entitlement checks read `storesSummary.data().stores[storeId]` directly.

### 2.4 Total Per Successful Conversion

| Phase | Reads | Writes | Storage |
|-------|-------|--------|---------|
| Upload + Extract | 2 | 2 | 1 upload |
| Preview (avg 3 polls) | 3 | 0 | 0 |
| Claim + Publish | 1 | 6 | 1 delete |
| **TOTAL** | **6** | **8** | **1 upload** |

### 2.5 Total Per Abandoned Draft (No Conversion)

| Phase | Reads | Writes | Storage |
|-------|-------|--------|---------|
| Upload + Extract | 2 | 2 | 1 upload |
| Preview (avg 3 polls) | 3 | 0 | 0 |
| Nightly cleanup | 1 | 0 | 1 delete |
| Nightly delete doc | 0 | 1 (delete) | 0 |
| **TOTAL** | **6** | **3** | **1 upload + 1 delete** |

### 2.6 Starter Distribution Activation Signals

After claim/publish, the public URL and QR are real starter activation surfaces. Distribution actions are recorded on the existing store document, not in a new collection.

| Operation | Collection | Type | Count | Trigger |
|-----------|-----------|------|-------|---------|
| Record starter signal | `stores/{storeId}` | WRITE | 0-1 per unique signal per browser session | Copy public/menu link, start WhatsApp share, complete native share, download QR, download Menu Kit |
| Confirm external placement | `stores/{storeId}` | WRITE | 1 | Owner marks Google Business, Instagram Bio, or WhatsApp Profile as added |

Fields:

```ts
starterActivationSignals: {
  actions: {
    [signal: string]: string; // ISO timestamp
  };
  lastSignalAt: string;
}
```

Presence confirmations still use `menuPresence`. For starter stores, Presence Monitor writes the matching `starterActivationSignals.actions.*` value in the same Firestore update, so there is no second write for Google/Instagram/WhatsApp confirmations.

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

**Estimated cost per extraction:** ~₹0.50–₹1.00 for typical image/text sources, with variance for longer text/PDF link artifacts depending on menu complexity.

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

**Rate limit of 3/IP/day naturally caps cost.** Even at max throughput, monthly cost stays under ₹600 before external AI quota variance.

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

All operations on `publicMenuDrafts` happen via server-side API routes or the consolidated maintenance scheduler through the Admin SDK. No client-side Firestore access is allowed.

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

1. **SAFE_MODE:** Blocks public AI extraction during maintenance or incidents.
2. **Rate limit:** 3 uploads per IP per 24h — caps daily Gemini calls.
3. **Claim rate limit:** Authenticated publish attempts are rate-limited through the payment-onboarding bucket.
4. **Feature flag:** `ENABLE_PUBLIC_MENU_ENTRY` — instant kill switch.
5. **TTL cleanup:** 24h auto-delete prevents storage accumulation.
6. **Batch cleanup limit:** Max 100 expired drafts per daily scheduler run.
7. **Max image size:** 10MB — prevents storage abuse.
8. **Public link safety:** Permission confirmation plus SSRF-safe acquisition blocks unsafe hosts, private IPs, unsupported protocols, and unbounded crawling before AI work.

---

**Document Signature:** MenuList Firebase Cost Tracking
**Audience:** DevOps / Cost Management

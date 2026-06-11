# Public Menu Entry — Firebase Cost Tracking

**Version:** 1.0
**Status:** ✅ IMPLEMENTED — Production-audited
**Last Updated:** June 11, 2026

---

## 1. Collections

| Collection | Type | Purpose |
|-----------|------|---------|
| `publicMenuDrafts` | NEW | Temporary owner-bound drafts from authenticated upload/link previews (24h TTL) |
| `projects/{tId}/{sId}/{projectId}` | EXISTING | Final project after claim |
| `stores` | EXISTING | Store created on claim; starter activation and distribution signal fields live here |
| `tenants` | EXISTING | Tenant created on claim for new users; starter activation deadline mirrored for new tenants |

---

## 2. Operations Per User Journey

### 2.1 Upload/Link + Extraction (Authenticated, User Rate-Limited)

| Operation | Collection | Type | Count | Trigger |
|-----------|-----------|------|-------|---------|
| Check reusable active/same-source owner draft | `publicMenuDrafts` | READ | 0-2 queries, capped at 20 docs/query | POST /api/public/create-menu |
| Create draft doc | `publicMenuDrafts` | WRITE | 1 | POST /api/public/create-menu |
| Upload image or link artifact | Firebase Storage | WRITE | 1 | Same API route |
| Create extraction job | `menuImageProcessingJobs` | WRITE | 1 | Same API route |
| Update draft with job id | `publicMenuDrafts` | WRITE | 1 | Same API route |
| Worker reads source artifact | Storage + `publicMenuDrafts` | READ | 1 | Shared extraction worker |
| Worker updates draft (extraction result) | `publicMenuDrafts` | WRITE | 1 | Shared extraction worker |
| **Subtotal (new source)** | | | **2-3R + 3W + 1 job write + 1 Storage** | |
| **Subtotal (reused source)** | | | **1-2R + 0W + 0 Storage + 0 AI job** | |

For public menu links, the route performs one bounded outbound source acquisition only after auth, active-draft reuse, same-input dedupe, and the `PUBLIC_MENU_ENTRY_AUTH` user limit. Unsafe protocols, private IPs, unsafe redirects, unsupported content types, login/CAPTCHA-dependent sources, and low-confidence non-menu pages are rejected before draft creation. Link input is additionally gated by `ENABLE_MENU_LINK_IMPORT`.

### 2.2 Preview (Authenticated Owner Polling)

| Operation | Collection | Type | Count | Trigger |
|-----------|-----------|------|-------|---------|
| Read owner-bound draft (by token) | `publicMenuDrafts` | READ | 1 per poll, client capped at 30 polls | GET /api/public/create-menu |
| Rate-limit status polling | Upstash rate limiter | READ/WRITE | 90 requests / 5 min per user+draft | GET /api/public/create-menu |
| **Subtotal** | | | **1-30 Firestore reads in the normal polling window; 429 after backend limit** | |

The normal preview client polls with `statusOnly=1` while the extraction is pending or processing, so each poll returns status and detected business metadata without the full `extractedData` payload. When the draft is completed, the client performs one full read to load the final extracted menu for claim/review. Firestore read count is unchanged; response size and browser JSON work are reduced during polling.

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

The project metadata and `projectsSummary` writes include the resolved `businessType` and `businessCategory`. Low-confidence unknown types resolve to canonical `Other` while preserving the best known category when the draft has one. This mirrors the already-created store truth without adding extra reads, writes, collections, indexes, or Storage operations.

Unpaid starter OBP placeholders are render-time only. They are computed from the already-loaded store document and missing publicPresence/social/service/payment fields, add no extra reads or writes, and never persist fake MenuList-owned links, service modes, payment methods, or placeholder attributes. Compact starter layout and deterministic menu placeholder thumbnails are CSS/React render behavior only.

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

Because the same payment entitlement sync revalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`, the public OBP cache is purged when the store becomes paid. The paid render path then hides all starter placeholders and shows only real owner-configured links/data.

### 2.4 Total Per Successful Conversion

| Phase | Reads | Writes | Storage |
|-------|-------|--------|---------|
| Upload + Extract (new source) | 2-3 | 4 | 1 upload |
| Preview (avg 3 polls) | 3 | 0 | 0 |
| Claim + Publish | 1 | 6 | 0 |
| **TOTAL** | **6-7** | **10** | **1 upload** |

### 2.5 Total Per Abandoned Draft (No Conversion)

| Phase | Reads | Writes | Storage |
|-------|-------|--------|---------|
| Upload + Extract (new source) | 2-3 | 4 | 1 upload |
| Preview (avg 3 polls) | 3 | 0 | 0 |
| Nightly cleanup | 1 | 0 | 1 delete |
| Nightly delete doc | 0 | 1 (delete) | 0 |
| **TOTAL** | **6-7** | **5** | **1 upload + 1 delete** |

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

**Authenticated rate limit of 5/user/day plus draft reuse caps cost.** Repeated refreshes or re-submits of an active/completed source return the existing draft before creating a new Storage artifact or AI job. Actual max throughput therefore depends on verified owner volume, not anonymous IP churn.

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
2. **Rate limit:** 5 new sources per signed-in owner per 24h — caps daily extraction calls without punishing shared networks.
3. **Claim rate limit:** Authenticated publish attempts are rate-limited through the payment-onboarding bucket.
4. **Feature flag:** `ENABLE_PUBLIC_MENU_ENTRY` — instant kill switch.
5. **TTL cleanup:** 24h auto-delete prevents storage accumulation.
6. **Batch cleanup limit:** Max 100 expired drafts per daily scheduler run.
7. **Max image size:** 10MB — prevents storage abuse.
8. **Draft reuse/dedupe:** Active pending/processing drafts and same-source completed drafts return the existing preview before new Storage or AI work.
9. **Public link safety:** Permission confirmation plus SSRF-safe acquisition blocks unsafe hosts, private IPs, unsupported protocols, and unbounded crawling before AI work.

---

## 8. Physical Claim Print Pilot Notes

The current `/create-menu` route can receive print-driven traffic with UTM parameters at no additional Firestore cost beyond the existing Public Menu Entry journey.

Example interim pilot URL:

```text
/create-menu?utm_source=print&utm_medium=postcard&utm_campaign=pilot
```

Offer/no-offer print variants can add `utm_content=offer` or `utm_content=no_offer`. Public menu and OBP analytics persist this as a bounded `viewsByContent.{variant}` counter on existing view writes, so there is no additional write operation.

Unsupported in the current implementation:

- `go.menulist.ai` short-link resolver.
- Server-side scan log writes before `/create-menu`.
- Merchant/audit prebinding.
- HMAC-signed physical claim links.
- Staff PIN validation.

If those are implemented later, this Firebase doc must be updated first with:

- Resolver read/write counts.
- Scan-log retention and cleanup.
- Privacy posture for IP/user-agent storage, preferring hashed or bounded security context over raw PII storage.
- Rate-limit and replay-protection costs.
- Claim conversion cache invalidation impact.

---

**Document Signature:** MenuList Firebase Cost Tracking
**Audience:** DevOps / Cost Management

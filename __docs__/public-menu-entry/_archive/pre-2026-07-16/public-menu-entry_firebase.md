# Public Menu Entry — Firebase Cost Tracking

**Version:** 1.0
**Status:** Source/cost audited — not current target, launch, or deploy certification
**Last Updated:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document is source-gated Public Menu Entry evidence only. The `/create-menu` page is public, but source submission, acquisition, extraction, preview polling, claim, and publish require a signed-in owner. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:public-business-truth`, `npm run verify:auth-security-failure-matrix`, signed-in desktop/mobile browser QA, physical-device camera/link/preview/claim QA, Gemini extraction provider smoke, Razorpay sandbox evidence where conversion is in scope, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

---

## 1. Collections

| Collection | Type | Purpose |
|-----------|------|---------|
| `publicMenuDrafts` | NEW | Temporary owner-bound drafts from authenticated upload/link previews (24h TTL) |
| `projects/{tId}/{sId}/{projectId}` | EXISTING | Final project after claim |
| `stores` | EXISTING | Store created on claim; starter activation and distribution signal fields live here |
| `tenants` | EXISTING | Tenant created on claim for new users; starter activation deadline mirrored for new tenants |

**June 29, 2026 browser handoff note; June 30 copy rejection fallback; July 5 URL normalization and starter-signal diagnostics:** `/create-menu/success` Copy Link and WhatsApp actions are browser-local. Raw `menuUrl` and `officialPageUrl` query-string values are normalized to absolute HTTPS URLs without credentials before render/copy/share; invalid values are treated as absent and log only bounded `public_create_menu_success_url_invalid` URL kind/reason/shape metadata. Failed handoffs log only menu/official-page URL presence-length metadata plus generated message/WhatsApp URL lengths, and starter activation signals are recorded only after copy/open succeeds. June 30 hardening made Copy Link support checks explicit and falls through from rejected Clipboard API writes to acknowledged textarea fallback before failure: the success page now records clipboard/fallback availability as booleans and only advances copied state after Clipboard API acknowledgement or an acknowledged textarea fallback. July 5 hardening keeps starter activation telemetry non-blocking while logging bounded `public_create_menu_success_starter_signal_claim_read_failed` / `public_create_menu_success_starter_signal_write_failed` diagnostics when session-storage claim context or the existing signal write attempt fails. This adds no successful-path Firestore reads/writes/deletes, Storage operations, Cloud Function calls, provider calls, cache invalidations, rules, indexes, schema changes, or deploy requirements.

---

## 2. Operations Per User Journey

### 2.1 Upload/Link + Extraction (Authenticated, User Rate-Limited)

| Operation | Collection | Type | Count | Trigger |
|-----------|-----------|------|-------|---------|
| Check reusable active/same-source owner draft | `publicMenuDrafts` | READ | 0-2 queries, capped at 20 docs/query | POST /api/public/create-menu |
| Upload image or link artifact | Firebase Storage | WRITE | 1 | Same API route |
| Atomically create draft + deterministic extraction job | `publicMenuDrafts` + `menuImageProcessingJobs` | WRITE | 2 in one create-only batch | Same API route |
| Worker verifies authoritative draft/job/owner/source binding | `publicMenuDrafts` | READ | 1 | Before provider work |
| Worker reads source artifact | Storage | READ | 1 | Shared extraction worker |
| Worker updates job + draft lifecycle/result | `menuImageProcessingJobs` + `publicMenuDrafts` | WRITE | Existing bounded worker lifecycle | Shared extraction worker |
| **Subtotal (new source)** | | | **route: 1-2 reusable queries + 2 atomic Firestore writes + 1 Storage write; worker: 1 binding read + existing lifecycle** | |
| **Subtotal (reused source)** | | | **1-2R + 0W + 0 Storage + 0 AI job** | |

For public menu links, the route rejects JSON bodies above 8KB before link validation, active-draft reuse, same-input dedupe, the `PUBLIC_MENU_ENTRY_AUTH` user limit, outbound source acquisition, Storage writes, or extraction job creation. Unsafe protocols, private IPs, unsafe redirects, unsupported content types, login/CAPTCHA-dependent sources, and low-confidence non-menu pages are rejected before draft creation. Link input is additionally gated by `ENABLE_MENU_LINK_IMPORT`.

June 29 authenticated limiter-key hardening is Firebase-cost neutral. `POST /api/public/create-menu` still uses the 5-per-owner-per-day `PUBLIC_MENU_ENTRY_AUTH` cap, and `POST /api/public/create-menu/claim` still uses the payment-onboarding publish bucket, but both routes hash the owner id segment with `hashPublicRateLimitValue()` before the key reaches Upstash. This resets existing rate-limit buckets once and changes no Firestore reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, schema fields, or claim/publish behavior.

July 10 atomic create/collision hardening replaces the sequential draft → job → draft-job-id writes with one create-only Firestore batch containing `publicMenuDrafts/{ownerContentUuid}` and `menuImageProcessingJobs/public_{ownerContentUuid}`. The successful route uses two Firestore writes instead of the previous three and cannot leave an orphan draft/job state. A concurrent loser performs one exact draft read and returns the matching winner; if that proof read fails, it preserves the deterministic shared Storage path and logs `public_menu_entry_collision_lookup_failed` rather than risking winner corruption. Confirmed non-collision failures still attempt the Storage delete and log bounded `public_menu_entry_storage_cleanup_failed` on failure.

The owner/content UUID and Storage download token are deterministic. Image identity uses the validated content hash; link identity uses the acquired artifact content hash. Active-draft reuse remains the first cheap path, while atomic create is the concurrency backstop.

June 29 browser response-parse hardening is Firebase-cost neutral. `src/app/(website)/create-menu/CreateMenuClient.tsx` caps upload/link POST response parsing at 8KB, logs `public_create_menu_response_parse_failed` / `public_create_menu_response_invalid`, and redirects only after a non-empty `draftId` is present. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, source-acquisition calls, route calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

June 29 preview response-parse hardening is Firebase-cost neutral. `src/app/(website)/create-menu/PreviewClient.tsx` caps preview status/full response parsing at 4MB, caps claim acknowledgement parsing at 32KB, logs `public_create_menu_preview_response_parse_failed` / `public_create_menu_preview_response_invalid` and `public_create_menu_preview_claim_response_parse_failed` / `public_create_menu_preview_claim_response_invalid`, and redirects after claim only when the required success URLs are present. July 1 status-handling hardening keeps the status-only poll and full-result fetch on the same `401` sign-in, `410` expired, `404` missing, and fixed load-failure branches. This adds no Firestore reads/writes/deletes, Storage operations, provider calls, route calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 2 upload validation and mobile camera hardening is Firebase-cost neutral. `POST /api/public/create-menu` now runs server-side magic-byte validation for JPEG, PNG, and WebP uploads before draft creation, Storage writes, or extraction job creation, and `/create-menu` adds the rear-camera capture hint to the existing image input. This rejects spoofed or unverifiable files earlier and adds no Firestore reads/writes/deletes, Storage operations, provider calls, route calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

July 6 Public create-menu claim target document-ID boundary hardening is Firebase-cost neutral. `POST /api/public/create-menu/claim` now validates existing-account and newly-created tenant/store IDs with the shared Firestore document-ID guard and exact positive numeric MenuList ID guard before `stores/{storeId}`, `tenants/{tenantId}`, `platformSummary/projects_{storeId}`, or `projects/{tId}/{sId}/{projectId}` refs are built. This changes no valid reads/writes/deletes, Storage operations, provider calls, cache invalidations, rules, indexes, schema fields, Cloud Function logic, Firebase deploy requirement, Vercel deploy action, or valid claim/publish behavior.

### 2.2 Preview (Authenticated Owner Polling)

| Operation | Collection | Type | Count | Trigger |
|-----------|-----------|------|-------|---------|
| Read owner-bound draft (by token) | `publicMenuDrafts` | READ | 1 per poll, client capped at 30 polls | GET /api/public/create-menu |
| Rate-limit status polling | Upstash rate limiter | READ/WRITE | 90 requests / 5 min per hashed user+draft key | GET /api/public/create-menu |
| **Subtotal** | | | **1-30 Firestore reads in the normal polling window; 429 after backend limit** | |

The normal preview client polls with `statusOnly=1` while the extraction is pending or processing, so each poll returns status and detected business metadata without the full `extractedData` payload. When the draft is completed, the client performs one full read to load the final extracted menu for claim/review. Firestore read count is unchanged; response size and browser JSON work are reduced during polling.

Preview polling rate-limit keys use `hashPublicRateLimitValue()` for both the owner identity segment and draft token segment before reaching the provider. The June 29 hardening resets existing polling buckets once, but does not change the 90 requests / 5 minute cap or any Firestore read behavior.

Failed draft polling returns one fixed owner-safe retry message and never serializes raw worker/provider/parser error text from `publicMenuDrafts` or `menuImageProcessingJobs`. This is a response-shaping and diagnostic-boundary rule only; it adds no reads, writes, Storage operations, indexes, or cache invalidations.

### 2.3 Claim + Publish (Authenticated)

| Operation | Collection | Type | Count | Trigger |
|-----------|-----------|------|-------|---------|
| Read draft (by token) | `publicMenuDrafts` | READ | 1 | Claim API transaction |
| Read tenant/store counters | `platformSummary` | READ | 0-2 | New user only, shared tenant/store creation helper |
| Verify existing store + tenant eligibility | `stores`, `tenants` | READ | 0-2 | Existing account only, before public truth writes |
| Read existing projects summary | `platformSummary/projects_{storeId}` | READ | 0-1 | Existing account only, to demote any current default project |
| Create tenant (if new user) | `tenants` | WRITE | 0-1 | New user only |
| Create store or update missing store defaults | `stores` | WRITE | 0-1 | Claim API |
| Create project metadata | `projects` (metadata) | WRITE | 1 | Claim API |
| Create project data | `projects` (data) | WRITE | 1 | Claim API |
| Update draft (claimed) | `publicMenuDrafts` | WRITE | 1 | Mark as claimed |
| Sync storesSummary | `platformSummary` | WRITE | 1 | Nested `stores.{storeId}` map for scheduler-readable store metadata |
| Sync projectsSummary | `platformSummary` | WRITE | 1 | Existing pattern |
| Revalidate public cache | Next.js cache tags | INVALIDATE | 4 tags | `menu-store-{storeId}`, `store-{storeId}`, `client-stores`, `screen-data` |
| **Subtotal** | | | **3-4R + 4-6W + 4 cache tags** | |

The project metadata and `projectsSummary` writes include the resolved `businessType` and `businessCategory`. Low-confidence unknown types resolve to canonical `Other` while preserving the best known category when the draft has one. This mirrors the already-created store truth without adding extra reads, writes, collections, indexes, or Storage operations.

The claim transaction re-normalizes the persisted extracted DTO and validates the source envelope against the configured Storage bucket, exact draft prefix, allowed MIME types, download token, and size cap before project writes. The first successful claim stores `convertedTenantId`, `convertedStoreId`, `convertedProjectId`, `convertedProjectSlug`, `convertedSubdomain`, and `convertedWasNewAccount` as the complete retry receipt. A lost-response retry by the same draft owner costs one transaction read and zero project/tenant/store/draft writes, returns the receipt idempotently, and re-runs the independent cache/screen/context invalidations. Incomplete legacy claimed drafts continue to return 409.

Existing-account claims now fail closed before project/store/summary writes unless the transaction can read the session store and tenant, confirm the store belongs to that tenant, and confirm neither document is inactive, deleted, or platform-blocked. This adds up to two reads on existing-account claims only. It adds no new writes, collections, indexes, Storage operations, Cloud Function logic changes, Firebase deploy requirement, or Vercel deploy action.

Claim route diagnostics are bounded only. Successful claim, cache-revalidation failure, and unexpected claim failure logs record draft/user/tenant/store/project presence and length metadata plus account-state booleans and source error metadata only. Raw draft IDs, user IDs, tenant IDs, store IDs, project IDs, cache errors, and route exceptions must not be passed to `secureLog()` or `secureError()`. This does not add reads, writes, indexes, cache invalidations, or owner-facing settings.

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
| Upload + Extract (new source) | 2-3 plus worker binding/lifecycle reads | 2 route writes plus worker lifecycle | 1 upload |
| Preview (avg 3 polls) | 3 | 0 | 0 |
| Claim + Publish | 3-4 | 4-6 | 0 |
| **TOTAL** | **8-10** | **8-10** | **1 upload** |

### 2.5 Total Per Abandoned Draft (No Conversion)

| Phase | Reads | Writes | Storage |
|-------|-------|--------|---------|
| Upload + Extract (new source) | 2-3 plus worker binding/lifecycle reads | 2 route writes plus worker lifecycle | 1 upload |
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
// firestore.indexes.json active composite
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

`firestore.rules` has no allow match for `publicMenuDrafts`, so unmatched client reads/writes are denied. All operations happen through authenticated server-side API routes, the shared Functions worker, or the consolidated maintenance scheduler using the Admin SDK. No client-side Firestore access is allowed.

---

## 6. Storage Rules

`storage.rules` has no allow match for `publicMenuDrafts`, so direct client rule-based reads/writes/deletes are denied by the final catch-all. The Admin SDK owns writes/deletes. Authenticated preview and later public project rendering use the scoped Firebase download-token URL stored by the server.

---

## 7. Cost Safety Guardrails

1. **SAFE_MODE:** Blocks public AI extraction during maintenance or incidents.
2. **Rate limit:** 5 new sources per signed-in owner per 24h — caps daily extraction calls without punishing shared networks.
3. **Claim rate limit:** Authenticated publish attempts are rate-limited through the payment-onboarding bucket with a hashed owner key segment.
4. **Feature flag:** `ENABLE_PUBLIC_MENU_ENTRY` — instant kill switch.
5. **TTL cleanup:** 24h auto-delete prevents storage accumulation.
6. **Batch cleanup limit:** Max 100 expired drafts per daily scheduler run.
7. **Max image size:** 10MB image limit plus pre-parse `content-length` and bounded form-data body caps — prevents large multipart bodies, including no-length/chunked requests, from reaching file buffering or Storage writes.
8. **Link body size:** 8KB bounded JSON cap prevents oversized link-import requests from reaching draft reads, source acquisition, Storage writes, or extraction job creation.
9. **Claim body size:** 8KB bounded JSON cap prevents oversized claim requests from reaching draft reads or project/store writes.
10. **Draft reuse/dedupe:** Active pending/processing drafts and same-source completed drafts return the existing preview before new Storage or AI work.
11. **Public link safety:** Permission confirmation plus SSRF-safe acquisition blocks unsafe hosts, private IPs, unsupported protocols, and unbounded crawling before AI work.
12. **Atomic identity:** Deterministic owner/content draft and job IDs plus create-only batch operations prevent concurrent duplicates and orphan states.
13. **Worker binding:** Job/draft/owner/source/project/expiry fields must agree before provider work or any draft status update.
14. **Allowlisted DTO and source envelope:** Provider and legacy data are normalized again before preview/claim; arbitrary fields, orphan relationships, external URLs, wrong buckets/paths, disallowed MIME types, and malformed TTLs fail closed.
15. **Retry-safe cleanup:** Scheduler rejects cross-draft paths and leaves the draft intact when Storage deletion fails so the next run can retry.

---

## 8. Physical Claim Print Pilot Notes

The current `/create-menu` route accepts allowlisted attribution combinations. An attributed new draft adds one temporary idempotency-marker update on the existing 24-hour draft and one merge to `platformSummary/founderMonitorGrowth`; claim adds the same two-write pattern once. Unattributed traffic adds no growth write, and no permanent growth-event collection is created.

Example interim pilot URL:

```text
/create-menu?utm_source=physical_partner&utm_medium=partner_handoff&utm_campaign=bengaluru_pilot_2026
```

The first founder-led cohort uses `/create-menu?utm_source=founder_pilot&utm_medium=manual_handoff&utm_campaign=bengaluru_pilot_2026`. Arbitrary sources, per-customer identifiers, and `utm_content` are not persisted by this growth contract.

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

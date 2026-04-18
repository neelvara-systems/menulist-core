# Customer App — Firebase Cost Tracking

**Feature Name:** Customer App (Installable Customer-Facing Menu)  
**Document Type:** Firebase Cost Tracking  
**Status:** 📋 Ready for Implementation  
**Last Updated:** April 18, 2026  
**Audience:** Engineering, Founder, Cost Auditors

---

## Summary

- **Collections Used:** `stores` (adds fields), `analytics` (existing — reuses via `projectId='customerApp'`). **No new collections.**
- **Storage Buckets:** `pwa-icons/{storeId}/{size}.png`
- **Cloud Functions:** None new. Existing `aggregateCustomerAnalytics` automatically rolls up `customerApp` daily docs.
- **Estimated Monthly Cost:** Low (~$0.05 per 1000 active installs, dominated by icon egress; analytics events share existing menu-analytics cost envelope)
- **Analytics policy:** Customer App is a surface — surfaces get lifecycle analytics. Uses existing `trackEvent()` infrastructure, existing debounce/rate-limit, existing session system. Install events are deduped per-device via `localStorage` before firing (see `fireInstalledEventOnce` in `customer-app_impl.md`).

---

## Firestore Operations

### Reads

| Operation                | Collection | Trigger               | Frequency   | Docs Read         | Indexed? | Notes                                                        |
| ------------------------ | ---------- | --------------------- | ----------- | ----------------- | -------- | ------------------------------------------------------------ |
| Manifest generation      | stores     | Page load             | Per visit   | 1                 | Yes      | `unstable_cache` 60s TTL (shared with existing menu lookups) |
| Icon existence check     | —          | Icon request          | Per install | 0                 | N/A      | CDN/Storage check, no Firestore                              |
| Settings fetch           | stores     | Owner opens settings  | Rare        | 1                 | Yes      | Part of store doc                                            |
| Analytics dashboard read | analytics  | Owner opens dashboard | Rare        | 1-90 (date range) | Yes      | Doc ID pattern `{tId}_{sId}_customerApp_*`                   |

**Total reads per customer visit:** 0 net-new (manifest reuses the same cached store lookup used by the menu page)

### Writes

| Operation                       | Collection | Trigger                   | Frequency                 | Docs Written                   | Fields                                                                | Notes                                            |
| ------------------------------- | ---------- | ------------------------- | ------------------------- | ------------------------------ | --------------------------------------------------------------------- | ------------------------------------------------ |
| Settings update                 | stores     | Owner saves               | Rare                      | 1                              | `pwaSettings`, `branding.pwa*`                                        | Merge update                                     |
| Icon override upload            | stores     | Owner uploads             | Rare                      | 1                              | `branding.pwaIconOverrideUrl`, `branding.pwaIconMode`                 | Merge update                                     |
| Icon regeneration trigger       | —          | Logo change               | Very rare                 | 0                              | —                                                                     | API call, no Firestore write                     |
| `CUSTOMER_APP_PROMPT_SHOWN`     | analytics  | Install prompt render     | Per prompt (debounced)    | 1 (increment)                  | `totalPromptShown`, hourly breakdown                                  | Daily doc `{tId}_{sId}_customerApp_daily_{date}` |
| `CUSTOMER_APP_PROMPT_DISMISSED` | analytics  | Dismiss tap               | Per dismiss               | 1 (increment)                  | `totalPromptDismissed`                                                | Same daily doc                                   |
| `CUSTOMER_APP_INSTALL_STARTED`  | analytics  | Install CTA tap           | Per tap                   | 1 (increment)                  | `totalInstallStarted`                                                 | Same daily doc                                   |
| `CUSTOMER_APP_INSTALLED`        | analytics  | `appinstalled` event      | Once per device per store | 1 (increment)                  | `totalInstalled`, `uniqueInstallSessions`, device/location breakdowns | Deduped via `localStorage`                       |
| `CUSTOMER_APP_OPENED`           | analytics  | Standalone-mode page load | Per open (debounced)      | 1 (increment)                  | `totalAppOpens`, hourly, device, location                             | Fires only in `display-mode: standalone`         |
| `CUSTOMER_APP_SHORTCUT_*`       | analytics  | Shortcut launch           | Per launch                | 1 (increment)                  | `shortcutClicks.{menu,call,directions}`                               | Detected via `?source=shortcut-*` URL param      |
| Nightly aggregation             | analytics  | Cloud Function            | 1/day/store               | 1-3 (summary, weekly, monthly) | All metric fields                                                     | Reuses existing `aggregateCustomerAnalytics`     |

**Per-visit writes (installed user):** 1-2 (app open + optional shortcut event, both debounced).
**Per-install writes (first-time):** 3-4 (prompt shown, install started, installed, first open).

### Deletes

| Operation             | Collection | Trigger                | Frequency | Docs Deleted     | Soft/Hard | Notes                                             |
| --------------------- | ---------- | ---------------------- | --------- | ---------------- | --------- | ------------------------------------------------- |
| Icon override removal | stores     | Owner clears           | Rare      | 0 (field update) | N/A       | Sets `pwaIconOverrideUrl: null`                   |
| Daily analytics TTL   | analytics  | Nightly Cloud Function | Daily     | Varies           | Hard      | 90-day retention inherited from existing function |

---

## Firebase Storage

### Operations

| Operation   | Path Pattern                     | Trigger     | Size    | Notes             |
| ----------- | -------------------------------- | ----------- | ------- | ----------------- |
| Icon upload | `pwa-icons/{storeId}/192.png`    | Generation  | 5-15KB  | PNG, processed    |
| Icon upload | `pwa-icons/{storeId}/512.png`    | Generation  | 20-50KB | PNG, processed    |
| Icon upload | `pwa-icons/{storeId}/180.png`    | Generation  | 5-15KB  | Apple touch icon  |
| Icon read   | `pwa-icons/{storeId}/{size}.png` | App install | —       | CDN cached        |
| Icon delete | `pwa-icons/{storeId}/*`          | Logo change | —       | Cleanup old icons |

### Storage Estimates

| Store                   | Icons             | Size per Store |
| ----------------------- | ----------------- | -------------- |
| With generated icon     | 3 (192, 512, 180) | ~50KB          |
| With custom override    | 3 (192, 512, 180) | ~50-100KB      |
| Total for 1000 stores   | 3000 files        | ~50MB          |
| Total for 10,000 stores | 30,000 files      | ~500MB         |

**Monthly Storage Cost:**

- 500MB @ $0.026/GB = ~$0.01/month

---

## Cloud Functions

### New Cloud Functions

**None.** Icon generation is handled via API route (`/api/app-icons/generate`).

### Existing Cloud Function — Code Changes Required

| Function                     | Change Type | File                                          | Why                                                                                                                                                                                 |
| ---------------------------- | ----------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aggregateCustomerAnalytics` | **Modify**  | `functions/src/aggregateCustomerAnalytics.ts` | `DailyMetrics` interface, `aggregateDailyDocs()`, and `updateSummaryDocument()` only know menu fields. Customer App fields are silently dropped from all rollups without additions. |

The function already **discovers** `customerApp` daily docs (regex `/^(\d+)_(\d+)_([^_]+)_daily_/` matches `customerApp` automatically). The gap is in **field aggregation**:

| Function                   | Current Behavior                                     | Required Change                                                                                                                      |
| -------------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `DailyMetrics` (interface) | Only menu fields (`totalViews`, `totalClicks`, etc.) | Add 10 optional Customer App fields (`totalPromptShown`, `totalInstalled`, `totalAppOpens`, `shortcutClicks`, etc.)                  |
| `aggregateDailyDocs()`     | Sums menu fields only; map merge for menu breakdowns | Add Customer App numeric sums + `mergeMapField` calls for `shortcutClicks`, `installsByDevice`, `installsByLocation`                 |
| `updateSummaryDocument()`  | Increments lifetime menu totals only                 | Add `lifetimeTotalInstalled`, `lifetimeUniqueInstalls`, `lifetimeTotalAppOpens`, `shortcutClicks.*`, `installsByDevice.*` increments |

**Effect of missing these changes:** Daily docs write correctly (client-side). Weekly rollup (`_weekly_*`) and monthly rollup (`_monthly_*`) documents will be **missing all Customer App fields** — owner dashboard card would show zeros for 7-day and 30-day views. Lifetime summary also incomplete.

**Schedule:** Nightly 3:00 AM UTC. Customer App projects processed in the same scheduler run as all other projects — no separate schedule needed.

**Deployment:** `firebase deploy --only functions:aggregateCustomerAnalytics`

**Zero impact on existing projects:** All new fields are optional. Menu analytics projects (`obp`, menu slugs) are unaffected.

If we add background icon processing later:

| Function           | Trigger                              | Frequency       | Duration | Memory | Notes                  |
| ------------------ | ------------------------------------ | --------------- | -------- | ------ | ---------------------- |
| `generatePWAIcons` | Firestore onWrite (branding.logoUrl) | Per logo change | 5-15s    | 256MB  | Sharp image processing |

---

## Security Rules Impact

### Firestore Rules (Additions)

```javascript
// Add to existing stores rules
match /stores/{storeId} {
  // Existing rules...

  // PWA settings: owners only, specific fields
  allow update: if isOwner(storeId)
    && request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['pwaSettings', 'branding']);
}

// Analytics collection already has rules for customer-menu events.
// customerApp events use the same rules — no new rules needed.
// Doc ID pattern: {tId}_{sId}_customerApp_*
```

### Storage Rules

```javascript
match /pwa-icons/{storeId}/{size} {
  // Public read for icon serving
  allow read: if true;

  // Write only by owner or system
  allow write: if isOwner(storeId) || request.auth.token.role == 'system';

  // Delete by owner only
  allow delete: if isOwner(storeId);
}
```

---

## Cost Optimization

### Current Optimizations

1. **Manifest caching:** `unstable_cache` 60s TTL (reuses existing `getStoreBySubdomain` cache)
   - Reduces Firestore reads by ~90% for repeat visits
   - Cost: 1 read per unique visitor per minute — shared with menu page

2. **Icon edge caching:** 1-day CDN cache
   - Icons served from edge, not Firestore
   - Cost: Near zero for reads

3. **Pre-generation:** Icons created on logo change, not per request
   - On-demand generation only as fallback
   - Cost: One-time write per logo change

4. **Analytics debounce + rate limit (inherited):** `shouldDebounce` (1s window) and `shouldRateLimit` (30 events/min/session) from `src/lib/analytics/unified.ts` apply automatically to all `CUSTOMER_APP_*` events
   - Prevents rapid-fire event storms
   - Cost: Significant reduction on spammy sessions

5. **Per-device install dedupe:** `fireInstalledEventOnce` caps one `CUSTOMER_APP_INSTALLED` write per device per store (via `localStorage` key)
   - Reinstalls do not double-count
   - Cost: Roughly 1:1 with unique install count

6. **Session-only identity:** No user/device identification collected
   - Privacy-safe by design
   - No compliance cost

### Potential Future Optimizations

| Optimization          | Impact              | Implementation                        |
| --------------------- | ------------------- | ------------------------------------- |
| Manifest edge caching | 95% read reduction  | Move to edge function with 5min cache |
| Icon generation queue | Batch processing    | Use Cloud Tasks for bulk updates      |
| Analytics sampling    | 50% write reduction | Log 10% of installs for large stores  |

### Warnings: Expensive Patterns to Avoid

| Pattern                                        | Why Expensive                     | Alternative                                          |
| ---------------------------------------------- | --------------------------------- | ---------------------------------------------------- |
| Real-time install tracking                     | Per-event writes                  | Daily aggregation                                    |
| Icon generation per request                    | CPU + Storage per install         | Pre-generate on logo change                          |
| Unbounded manifest cache                       | Stale data risk                   | 5-minute TTL max                                     |
| Large manifest documents                       | Bandwidth cost                    | Keep minimal fields                                  |
| Cross-tenant icon queries                      | Security risk + cost              | Strict path validation                               |
| Per-event writes without debounce              | Write storm on spammy sessions    | Inherited `shouldDebounce` / `shouldRateLimit`       |
| Install event without per-device dedupe        | Reinstalls inflate install counts | `fireInstalledEventOnce` via `localStorage`          |
| `CUSTOMER_APP_OPENED` firing on every page nav | Write storm                       | Fire once per session on mount, not per route change |

---

## Cost Estimate

### Per 1000 Active Stores (100 installs each = 100K total installs/month, ~10 opens/install/month = 1M opens)

| Resource                                        | Operations/Month                  | Unit Cost  | Monthly Cost     |
| ----------------------------------------------- | --------------------------------- | ---------- | ---------------- |
| Firestore Reads                                 | 50,000 (cached, shared with menu) | $0.06/100K | $0.03            |
| Analytics Writes (prompt/install/open/shortcut) | ~1.3M (debounced)                 | $0.18/100K | $2.34            |
| Settings Writes                                 | ~100                              | $0.18/100K | ~$0              |
| Storage (icons)                                 | 50MB                              | $0.026/GB  | $0.001           |
| Egress (icon serving)                           | 5GB                               | $0.12/GB   | $0.60            |
| **Total**                                       |                                   |            | **~$2.97/month** |

### Per 10,000 Active Stores (100 installs each = 1M total installs/month, 10M opens)

| Resource              | Operations/Month | Unit Cost  | Monthly Cost      |
| --------------------- | ---------------- | ---------- | ----------------- |
| Firestore Reads       | 500,000 (cached) | $0.06/100K | $0.30             |
| Analytics Writes      | ~13M (debounced) | $0.18/100K | $23.40            |
| Settings Writes       | ~1,000           | $0.18/100K | ~$0               |
| Storage (icons)       | 500MB            | $0.026/GB  | $0.01             |
| Egress (icon serving) | 50GB             | $0.12/GB   | $6.00             |
| **Total**             |                  |            | **~$29.71/month** |

**Scaling note:** Analytics cost scales linearly with app opens. If this becomes significant, the existing `shouldBlockMenuView` pattern in `src/lib/analytics/unified.ts` can be extended to `CUSTOMER_APP_OPENED` with a session-based cooldown (e.g., 30s), reducing cost by ~80%.

---

## DAL Functions Used

| Function                 | File                                     | Notes                                                       | Operation Type    |
| ------------------------ | ---------------------------------------- | ----------------------------------------------------------- | ----------------- |
| `getStoreBySubdomain`    | `src/lib/firestore/clientStoreLookup.ts` | Existing, cached 60s                                        | Read (1 doc)      |
| `getStoreByCustomDomain` | `src/lib/firestore/clientStoreLookup.ts` | Existing, cached 60s                                        | Read (1 doc)      |
| `trackAnalyticsEvent`    | `src/database/analytics.ts`              | Existing, used via `trackEvent()`                           | Write (increment) |
| `getAnalyticsData`       | `src/database/analytics.ts`              | Existing, used for dashboard with `projectId='customerApp'` | Read (N docs)     |
| `updatePWASettings`      | `src/database/pwa/index.ts`              | NEW                                                         | Write (merge)     |
| `updatePWAIconOverride`  | `src/database/pwa/index.ts`              | NEW                                                         | Write (merge)     |

---

## API Routes & Their Firebase Impact

| Route                                  | Method | Firebase Ops      | Rate Limited? | Notes                               |
| -------------------------------------- | ------ | ----------------- | ------------- | ----------------------------------- |
| `{tenant-origin}/manifest.webmanifest` | GET    | 1R (shared cache) | No            | Served at tenant origin, cached 60s |
| `/api/app-icons/{id}/{size}`           | GET    | 0 (Storage)       | Yes (100/min) | CDN cached                          |
| `/api/app-icons/generate`              | POST   | 1R + 3W (Storage) | Yes (5/min)   | Owner only                          |

**No dedicated analytics endpoints needed.** Analytics events flow through the existing client-side `trackEvent()` which writes directly to Firestore via `trackAnalyticsEvent` — same path used for menu views. Dashboard reads use existing `useAnalyticsData` hook with `projectId='customerApp'`.

---

## Indexes Required

**No new indexes required.**

This feature uses:

- Existing store lookups by subdomain (existing index on `stores.subdomain`)
- Direct document reads by storeId (document key, no index needed)
- Existing `analytics` collection queries (existing patterns, no new query shapes introduced)

---

## Related Documents

| Document                         | Purpose                     |
| -------------------------------- | --------------------------- |
| `customer-app_spec.md`           | Product requirements        |
| `customer-app_impl.md`           | Technical implementation    |
| `customer-app_marketing.md`      | Sales/marketing strategy    |
| `customer-app_website.md`        | Public website content      |
| `customer-app_helpdoc.md`        | Customer help documentation |
| `customer-app_mobile-support.md` | Mobile assessment           |

---

_Document Status: 📋 READY FOR IMPLEMENTATION_  
_Last Updated: April 18, 2026_

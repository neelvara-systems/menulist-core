# Official Business Page (OBP) — Firebase Cost Tracking

**Date:** May 1, 2026
**Audience:** Founder, developers, cost auditors

---

## Summary

- **Collections Used:** `stores` (existing), `analytics` (existing — OBP uses virtual `projectId='obp'`)
- **Storage Buckets:** None (logo already in storage, referenced by URL)
- **Cloud Functions:** Shared nightly scheduler `computeDecisionBlocksScores` runs the OBP rollup helper
- **Estimated Monthly Cost:** Negligible (~₹2-5/month per 1000 active stores including analytics)

---

## Firestore Operations

### Reads

| Operation                     | Collection                      | Trigger                      | Frequency              | Docs Read | Indexed? | Notes                                                              |
| ----------------------------- | ------------------------------- | ---------------------------- | ---------------------- | --------- | -------- | ------------------------------------------------------------------ |
| Load OBP page                 | `stores`                        | Customer visits OBP URL      | Per visit (cached 60s) | 1         | Yes      | Uses `where("subdomain", "==", ...)` — same as menu page           |
| Check published menu exists   | `projects/{tId}/{sId}/metadata` | OBP render                   | Per visit (cached 60s) | 1         | Yes      | `where("deleted","==",false), where("active","==",true), limit(1)` |
| Load OBP settings (dashboard) | `stores`                        | Owner opens Business Profile | On demand              | 0         | —        | Already loaded as part of store data in Redux                      |
| Load OBP metrics (dashboard)  | `analytics`                     | Owner opens Dashboard        | On demand (scheduler-window cached) | 1 dashboard summary + 1 today doc | Yes | Settled views read `{tId}_{sId}_obp_dashboard_summary`. `Today so far` reads the current store-local daily doc with 10 min TTL. |

**Key optimization:** Both reads are wrapped in `unstable_cache` with 60s TTL and per-store tags. At 60s cache, 1000 page views/hour = ~60 actual Firestore reads/hour (not 1000).

### Writes

| Operation              | Collection  | Trigger                                  | Frequency                   | Docs Written | Fields       | Notes                                                                                                                         |
| ---------------------- | ----------- | ---------------------------------------- | --------------------------- | ------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------- | -------- | -------------------------- |
| Save OBP settings      | `stores`    | Owner updates Business Profile           | Rare (once then occasional) | 1            | merge update | Uses existing `updateStore()` DAL — `requestBodyComposer` adds timestamps                                                     |
| Track OBP page view    | `analytics` | Customer visits OBP URL                  | Per visit (rate-limited)    | 1            | merge update | Daily doc: `{tId}_{sId}_obp_daily_{date}`. Uses `increment()` for atomic counters and includes `tId`, `sId`, `projectId`, `grain`, `surface`, `localDate`, `storeTimeZone` metadata in the same write. Rate-limited: 30s cooldown, 30 events/min. |
| Track OBP action click | `analytics` | Customer clicks Call/WhatsApp/Directions/Reserve/Order | Per click (debounced) | 1 | merge update | Same daily doc. Tracks `obpActionClicks.{call,whatsapp,directions,reserve,order}`. 1s debounce. |
| Track OBP menu click | `analytics` | Customer clicks View Menu from OBP | Per click (debounced) | 1 | merge update | Same daily doc. Tracks `totalOBPMenuClicks` and `obpMenuClicksBySurface.{brand|outlet}`. |
| Track OBP link click | `analytics` | Customer clicks Google review, Instagram, Facebook, or website from OBP | Per click (debounced) | 1 | merge update | Same daily doc. Tracks `totalOBPLinkClicks` and `obpLinkClicks.{google_review,instagram,facebook,website}`. |
| Track OBP share action | `analytics` | Owner shares official business link from settings | Per click (debounced) | 1 | merge update | Same daily doc. Tracks `totalOBPShares` and `obpShares.{whatsapp,copy_link,copy_message}`. |
| Track OBP language adoption | `analytics` | Customer switches language on a multi-language OBP and stays after the dwell window | Per accepted switch | 1 | merge update | Same daily doc. Tracks `obpLanguageAdoptions.{language}`. Single-language OBPs do not track language usage. Quick taps before dwell are ignored. |

**Key point:** OBP settings are saved as part of the existing store document update. OBP analytics use the same `analytics` collection as digital menu with virtual `projectId='obp'`. Rate limiting prevents abuse.

**Language usage:** Multi-language OBP page views attach `obpViewsByLanguage`, `obpSessionsByLanguage`, and `obpLanguageNames` to the existing page-view write. Language switch links stay URL-based for SEO/AEO, preserve source/UTM attribution parameters, and de-dupe accepted adoption counters by store-local analytics day.

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes                                                                  |
| --------- | ---------- | ------- | --------- | ------------ | --------- | ---------------------------------------------------------------------- |
| None      | —          | —       | —         | —            | —         | OBP has no deletable data. Store deactivation hides OBP automatically. |

---

## Firebase Storage

| Operation | Path Pattern | Trigger | Size | Notes                                                                          |
| --------- | ------------ | ------- | ---- | ------------------------------------------------------------------------------ |
| None new  | —            | —       | —    | Logo already stored. OBP references existing `store.logo` URL. No new uploads. |

---

## Cloud Functions

| Function                            | Trigger                         | Reads                                                                      | Writes                                       | Notes                                                                                                                                                                                                                                           |
| ----------------------------------- | ------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aggregateOBPAnalyticsForStoreDate` (via `computeDecisionBlocksScores`) | Shared timezone-aware nightly store flow | Steady state: existing OBP dashboard-summary cache + settled daily doc. Rebuild fallback: OBP daily-doc range query when cache coverage is missing. | Weekly/monthly/summary/dashboard-summary docs only when data exists | OBP is settled first for the store-local date. Menu/customer-app analytics run only after OBP succeeds for that same date. Weekly, previous-week, MTD, yesterday, and dashboard-summary calculations reuse the compact cache in normal operation. The next run checks the previously settled local date for late passive writes and applies positive deltas. Writes `_obp_weekly_{week}`, `_obp_monthly_{month}`, `_obp_overall_summary`, and `_obp_dashboard_summary`. Flag: `ENABLE_OBP_ANALYTICS`. |

**Settlement state:** The shared scheduler stores per-store status in `platformSummary/nightlyState_{tId}_{sId}` and a per-date lock in `platformSummary/nightlyLock_{tId}_{sId}_{YYYY-MM-DD}`. This prevents duplicate runs and allows missed store-local dates to be caught up safely.

**Date semantics:** OBP daily analytics docs now use the **store's local calendar date** and local hour buckets. The owner dashboard `Today so far`, `Yesterday`, WTD, and MTD views read the same store-local day keys.

**Observability:** OBP settlement logs actionable Sentry/Firebase warnings only for cache rebuild fallback and late-event correction. Store-level OBP aggregation failures include `tId`, `sId`, and timezone context. Normal OBP page views and successful counter writes are not logged.

### Brand Propagation (Client-Side)

| Operation                  | Collection | Trigger                                               | Docs Written | Notes                                                                                                                                                                                             |
| -------------------------- | ---------- | ----------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Propagate brand to outlets | `stores`   | Master store saves brand fields via Business Settings | 1 per outlet | Updates `logo`, `phoneNumber`, `currencyCode`, `currencySymbol`, `country`, `timeZone`, `defaultLanguage` on each outlet. Skipped if `outletPolicy.allowBrandingOverride === true`. Non-blocking. |

---

## Security Rules Impact

- OBP is a **public page** — no auth required (same as digital menu)
- Reads use server-side `firebaseClient` (not client SDK with security rules)
- No new Firestore security rules needed
- Store data is already readable by the server for menu rendering

---

## Cost Optimization Notes

### Current Optimizations

- **`unstable_cache` with 60s TTL:** Reduces actual Firestore reads by ~98% under load
- **Per-store cache tags:** `store-{storeId}` enables instant invalidation only for changed stores
- **No new collections:** Zero additional Firestore index costs
- **One write per tracked event:** OBP analytics use the same daily analytics doc as menu analytics with atomic increments. No separate summary write happens on the customer request path.
- **Language usage piggybacks on existing writes:** OBP language page-open counters ride on the existing OBP view write. Only dwell-accepted language switches create an additional write.
- **One owner read-model read:** Settled OBP dashboard data is precomputed nightly into `_obp_dashboard_summary`, avoiding 7-30 daily reads per owner dashboard visit.
- **One OBP nightly daily-range read:** OBP settlement fetches the required daily window once and reuses it in memory for weekly, monthly, lifetime, and dashboard-summary outputs.
- **Server component:** No client-side Firestore SDK loaded
- **Idempotent nightly summary:** Lifetime summary counters only advance when the settlement date is newer than `lastProcessedDate`.

### Potential Future Optimizations

- Increase cache TTL to 120s or 300s if OBP data changes infrequently
- Use ISR (Incremental Static Regeneration) for even better caching
- Pre-render popular OBP pages at build time

### Warnings

- None. This feature has the lowest Firebase cost profile of any customer-facing surface.

---

## Cost Estimate (per 1000 active stores/month)

Assumptions:

- Each store's OBP gets ~100 views/day = 3000/month
- 60s cache means ~50 actual reads/day per store = 1500/month per store
- Store settings update: ~2 writes/month per store

| Resource                     | Operations/month               | Unit Cost       | Monthly Cost (₹) |
| ---------------------------- | ------------------------------ | --------------- | ---------------- |
| Firestore Reads (OBP page)   | 1,500,000 (1000 stores × 1500) | ₹5/100K reads   | ₹75              |
| Firestore Reads (menu check) | 1,500,000                      | ₹5/100K reads   | ₹75              |
| Firestore Writes (settings)  | 2,000 (1000 × 2)               | ₹15/100K writes | ₹0.30            |
| Storage                      | 0 (uses existing)              | —               | ₹0               |
| Cloud Functions              | 0                              | —               | ₹0               |
| **Total**                    |                                |                 | **~₹150/month**  |

**Context:** ₹150/month for 1000 stores = ₹0.15 per store per month. Negligible.

**Free tier coverage:** Firebase free tier includes 50K reads/day = 1.5M/month. At low-to-moderate traffic, OBP may fit entirely within free tier.

---

## DAL Functions Used

| Function                   | File                                              | Operation Type |
| -------------------------- | ------------------------------------------------- | -------------- |
| `getStoreBySubdomain()`    | `src/app/_client/[[...slug]]/page.tsx` (existing) | Read (cached)  |
| `getStoreByCustomDomain()` | `src/app/_client/[[...slug]]/page.tsx` (existing) | Read (cached)  |
| `getStoreById()`           | `src/database/stores/index.ts` (existing)         | Read (cached)  |
| `updateStore()`            | `src/database/stores/index.ts` (existing)         | Write (merge)  |

**No new DAL functions needed.** OBP reuses 100% existing data access functions.

---

## API Routes & Their Firebase Impact

| Route                        | Method    | Firebase Ops  | Rate Limited? | Notes                                       |
| ---------------------------- | --------- | ------------- | ------------- | ------------------------------------------- |
| `_client/[[...slug]]/` (OBP) | GET (SSR) | 1-2R (cached) | CDN cache     | Public page, no API route                   |
| No new API routes            | —         | —             | —             | OBP is server-rendered, no client API calls |

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** May 1, 2026

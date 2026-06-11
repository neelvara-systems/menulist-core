# Official Business Page (OBP) — Firebase Cost Tracking

**Date:** June 11, 2026
**Audience:** Founder, developers, cost auditors

---

## Summary

- **Collections Used:** `stores` (existing), `analytics` (existing — OBP uses virtual `projectId='obp'`)
- **Storage Buckets:** Firebase Storage for optional OBP cover and gallery photos through the shared media system
- **Cloud Functions:** Shared nightly scheduler `computeDecisionBlocksScores` runs the OBP rollup helper. First menu extraction also applies missing OBP business attribute defaults when evidence is high-confidence.
- **Estimated Monthly Cost:** Negligible (~₹150/month per 1000 active stores under the traffic assumptions below). Extraction-derived attribute defaults add only a bounded one-read/optional-one-write path per applicable extraction.

---

## Firestore Operations

### Reads

| Operation                     | Collection                      | Trigger                      | Frequency              | Docs Read | Indexed? | Notes                                                              |
| ----------------------------- | ------------------------------- | ---------------------------- | ---------------------- | --------- | -------- | ------------------------------------------------------------------ |
| Load OBP page                 | `stores`                        | Customer visits OBP URL      | Per visit (cached 60s) | 1 store query + optional tenant-block doc on cache miss | Yes | Uses shared `src/lib/firestore/clientStoreLookup.ts` helpers for subdomain, verified custom domain, and outlet slug lookup. |
| Check published menu exists   | `projects/{tId}/{sId}/metadata` | OBP render                   | Per visit (cached 60s) | 1         | Yes      | `where("deleted","==",false), where("active","==",true), limit(1)` |
| Load OBP settings (dashboard) | `stores`                        | Owner opens Business Profile | On demand              | 0         | —        | Already loaded as part of store data in Redux                      |
| Load OBP metrics (dashboard)  | `analytics`                     | Owner opens Dashboard / opens a settled analytics tab | Today: 10 min TTL. Settled: scheduler-window cached | Today: 1 doc. Settled: 1 dashboard summary doc when requested | Yes | The `Today` tab reads the current store-local OBP daily doc when the dashboard opens. `Overview`, `Daily`, `Weekly`, `Monthly`, and `Overall` read `{tId}_{sId}_obp_dashboard_summary` only after the owner opens a settled tab, then cache on the device until the next store-local settlement cycle. |

**Key optimization:** Both reads are wrapped in `unstable_cache` with 60s TTL and per-store tags. At 60s cache, 1000 page views/hour = ~60 actual Firestore reads/hour (not 1000).

### Writes

| Operation              | Collection  | Trigger                                  | Frequency                   | Docs Written | Fields       | Notes                                                                                                                         |
| ---------------------- | ----------- | ---------------------------------------- | --------------------------- | ------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Save OBP settings      | `stores`    | Owner updates Business Profile           | Rare (once then occasional) | 1            | merge update | Uses existing `updateStore()` DAL — `requestBodyComposer` adds timestamps. Custom attribute icon values are saved inside `publicPresence.customAttributes[]` in the same store write. |
| Track OBP page view    | `analytics` | Customer visits OBP URL                  | Per visit (rate-limited)    | 1            | merge update | Daily doc: `{tId}_{sId}_obp_daily_{date}`. Uses `increment()` for atomic counters and includes `tId`, `sId`, `projectId`, `grain`, `surface`, `localDate`, `storeTimeZone` metadata in the same write. Rate-limited: 30s cooldown, 30 events/min. |
| Track OBP action click | `analytics` | Customer clicks Call/WhatsApp/Directions/Reserve/Order | Per click (debounced) | 1 | merge update | Same daily doc. Tracks `obpActionClicks.{call,whatsapp,directions,reserve,order}`. 1s debounce. |
| Track OBP menu click | `analytics` | Customer clicks View Menu from OBP | Per click (debounced) | 1 | merge update | Same daily doc. Tracks `totalOBPMenuClicks` and `obpMenuClicksBySurface.{brand|outlet}`. |
| Track OBP link click | `analytics` | Customer clicks Google review, Instagram, Facebook, or website from OBP | Per click (debounced) | 1 | merge update | Same daily doc. Tracks `totalOBPLinkClicks` and `obpLinkClicks.{google_review,instagram,facebook,website}`. |
| Track OBP share action | `analytics` | Owner shares official business link from settings | Per click (debounced) | 1 | merge update | Same daily doc. Tracks `totalOBPShares` and `obpShares.{whatsapp,copy_link,copy_message}`. |
| Track OBP language adoption | `analytics` | Customer switches language on a multi-language OBP and stays after the dwell window | Per accepted switch | 1 | merge update | Same daily doc. Tracks `obpLanguageAdoptions.{language}`. Single-language OBPs do not track language usage. Quick taps before dwell are ignored. |
| Apply extraction-derived business attribute defaults | `stores` | First extraction auto-save or owner-approved re-extraction | Once per applicable extraction | 0-1 | merge update | Only fills missing `businessAttributes` keys. Existing owner-set `true`/`false` values are never overwritten. First extraction runs in Cloud Functions; re-extraction approval runs through desktop/mobile client paths. |
| Connect custom domain | `stores` | Owner connects or removes custom domain | Rare | 1 | `customDomain`, `domainVerified`, domain timestamps | `/api/domain` owns the Firestore write and revalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`. Desktop UI updates local state only after API success to avoid duplicate writes. |

**Key point:** OBP settings are saved as part of the existing store document update. OBP analytics use the same `analytics` collection as digital menu with virtual `projectId='obp'`. Rate limiting prevents abuse.

**Starter placeholders:** Unpaid starter OBP placeholders are computed from the already-loaded store document and missing publicPresence/social/service/payment fields. They add no Firestore read, write, listener, index, Cloud Function, or Storage operation, and they do not persist fake links, service modes, payment methods, or attributes. Compact starter layout and deterministic menu placeholder thumbnails are CSS/React render behavior only. Payment entitlement sync already revalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`, so paid pages render without placeholders after the cache purge.

**Premium attribution removal:** OBP footer branding uses the already-loaded `stores/{storeId}.activePlanType` field through the shared MenuList branding policy. This adds no subscription lookup, Firestore read, write, listener, Cloud Function, rule, index, or Storage operation. Missing/non-Premium plan data keeps attribution visible.

**Custom attribute icons:** Desktop and mobile settings use the shared category icon/emoji picker for owner-defined custom attributes. This changes only the value stored in `publicPresence.customAttributes[].icon`; it adds no reads, writes, listeners, indexes, Storage operations, or Cloud Functions beyond the existing OBP settings save.

**Language usage:** Multi-language OBP page views attach `obpViewsByLanguage`, `obpSessionsByLanguage`, and `obpLanguageNames` to the existing page-view write. Language switch links stay URL-based for SEO/AEO, preserve `entry_source` plus intentional `utm_source`, `utm_medium`, and `utm_campaign` parameters, and de-dupe accepted adoption counters by store-local analytics day. Legacy `src` / `source` query parameters are not preserved or consumed by analytics.

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes                                                                  |
| --------- | ---------- | ------- | --------- | ------------ | --------- | ---------------------------------------------------------------------- |
| Delete replaced OBP cover/gallery object | Firebase Storage | Owner saves after removing or replacing cover/gallery image | Rare | 1 object per replaced URL | Hard | Store update succeeds first; failed object cleanup is logged and does not roll back the saved publicPresence field. |

---

## Firebase Storage

| Operation | Path Pattern | Trigger | Size | Notes                                                                          |
| --------- | ------------ | ------- | ---- | ------------------------------------------------------------------------------ |
| Upload business cover | `media/businessCover/{tId}/{sId}/official-page-cover/{mediaId}_hero.webp` | Owner uploads, adjusts, or generates OBP cover | 1 prepared image | Saved URL stored in `stores/{storeId}.publicPresence.businessCover`. |
| Upload business photo | `media/galleryImage/{tId}/{sId}/gallery-{index}/{mediaId}_full.webp` | Owner uploads or adjusts OBP gallery photo | 1 prepared image | Saved URL stored in `stores/{storeId}.publicPresence.photos[]`. |

---

## Cloud Functions

| Function                            | Trigger                         | Reads                                                                      | Writes                                       | Notes                                                                                                                                                                                                                                           |
| ----------------------------------- | ------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `aggregateOBPAnalyticsForStoreDate` (via `computeDecisionBlocksScores`) | Shared timezone-aware nightly store flow | Steady state: existing OBP dashboard-summary cache + settled daily doc. Rebuild fallback: OBP daily-doc range query when cache coverage is missing. | Weekly/monthly/summary/dashboard-summary docs only when data exists | OBP is settled first for the store-local date. Menu/customer-app analytics run only after OBP succeeds for that same date. Weekly, previous-week, MTD, yesterday, and dashboard-summary calculations reuse the compact cache in normal operation. The next run checks the previously settled local date for late passive writes and applies positive deltas. Writes `_obp_weekly_{week}`, `_obp_monthly_{month}`, `_obp_overall_summary`, and `_obp_dashboard_summary`. Flag: `ENABLE_OBP_ANALYTICS`. |
| `processMenuImagesJobLogic` | First menu extraction job | Existing extraction/project reads plus 1 `stores/{storeId}` read only when defaults are evaluated | 1 project write; optional 1 store write | Auto-saves first extraction output, then applies missing OBP business attribute defaults from high-confidence `businessAttributeSuggestions` and deterministic dietary tags. Uses the existing `/api/revalidate/menu` endpoint for `menu-store-{storeId}`, `store-{storeId}`, and `client-stores` tags when `NEXT_PUBLIC_APP_URL` and `REVALIDATION_SECRET` are configured in the Functions environment. |

**Settlement state:** The shared scheduler stores per-store status in `platformSummary/nightlyState_{tId}_{sId}` and a per-date lock in `platformSummary/nightlyLock_{tId}_{sId}_{YYYY-MM-DD}`. This prevents duplicate runs and allows missed store-local dates to be caught up safely.

**Date semantics:** OBP daily analytics docs now use the **store's local calendar date** and local hour buckets. The owner dashboard `Today`, `Daily`, WTD, MTD, and `Overall` views read the same store-local day keys/read-model cycle.

**Observability:** OBP settlement logs actionable Sentry/Firebase warnings only for cache rebuild fallback and late-event correction. Store-level OBP aggregation failures include `tId`, `sId`, and timezone context. Normal OBP page views and successful counter writes are not logged.

### Master Identity Propagation (Client-Side DAL)

| Operation                  | Collection | Trigger                                               | Docs Written | Notes                                                                                                                                                                                             |
| -------------------------- | ---------- | ----------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Propagate master identity/classification to outlets | `stores`, `platformSummary/storesSummary` | Master store saves propagated fields via `updateStore()` | 1 store write per outlet; 1 summary merge per outlet when summary fields changed | Updates `logo`, `phoneNumber`, `currencyCode`, `currencySymbol`, `country`, `timeZone`, `defaultLanguage`, `businessType`, and `businessCategory` on each outlet. Summary merge includes `businessType`, `businessCategory`, `logo`, `timeZone`, and `modifiedOn` when present. Skipped if `outletPolicy.canOverrideBrandIdentity === true` or legacy `allowBrandingOverride === true`. |

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
- **Prepared media uploads:** OBP cover/gallery images are resized and compressed before Storage upload, avoiding raw phone-photo payloads on public pages
- **One write per tracked event:** OBP analytics use the same daily analytics doc as menu analytics with atomic increments. No separate summary write happens on the customer request path.
- **Language usage piggybacks on existing writes:** OBP language page-open counters ride on the existing OBP view write. Only dwell-accepted language switches create an additional write.
- **One owner read-model read:** Settled OBP dashboard data is precomputed nightly into `_obp_dashboard_summary`, avoiding 7-30 daily reads per owner dashboard visit.
- **One OBP nightly daily-range read:** OBP settlement fetches the required daily window once and reuses it in memory for weekly, monthly, lifetime, and dashboard-summary outputs.
- **Server component:** No client-side Firestore SDK loaded
- **Idempotent nightly summary:** Lifetime summary counters only advance when the settlement date is newer than `lastProcessedDate`.
- **Extraction defaults are bounded:** Attribute defaulting reads the store once and writes only when at least one missing attribute can be safely filled.

### Potential Future Optimizations

- Increase cache TTL to 120s or 300s if OBP data changes infrequently
- Use ISR (Incremental Static Regeneration) for even better caching
- Pre-render popular OBP pages at build time

### Warnings

- Cloud Functions cache revalidation depends on `REVALIDATION_SECRET` plus `NEXT_PUBLIC_APP_URL`. These are deployment environment values, not owner-facing feature flags. `REVALIDATION_SECRET` authorizes the server-to-server purge request, and `NEXT_PUBLIC_APP_URL` tells Firebase Functions which Next.js runtime owns `/api/revalidate/menu`. If either value is missing, first-extraction project/store changes still persist, but public pages may wait for normal cache expiry instead of instant tag revalidation.

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
| Storage                      | Optional cover/gallery media   | Depends on owner uploads | Low; prepared images target media budgets |
| Cloud Functions              | 0                              | —               | ₹0               |
| **Total**                    |                                |                 | **~₹150/month**  |

**Context:** ₹150/month for 1000 stores = ₹0.15 per store per month. Negligible.

**Free tier coverage:** Firebase free tier includes 50K reads/day = 1.5M/month. At low-to-moderate traffic, OBP may fit entirely within free tier.

---

## DAL Functions Used

| Function                   | File                                              | Operation Type |
| -------------------------- | ------------------------------------------------- | -------------- |
| `getStoreBySubdomain()`    | `src/lib/firestore/clientStoreLookup.ts` | Read (cached)  |
| `getStoreByCustomDomain()` | `src/lib/firestore/clientStoreLookup.ts` | Read (cached)  |
| `getStoreByOutletSlug()`   | `src/lib/firestore/clientStoreLookup.ts` | Read (cached, multi-outlet only) |
| `updateStore()`            | `src/database/stores/index.tsx`          | Write (merge + public cache revalidation) |
| `revalidateMenuCache()`    | `src/lib/actions/revalidateMenuCache.ts` | Server cache invalidation |

OBP business settings reuse existing store updates. `uploadOBPCover()` and `uploadOBPPhoto()` are Storage helpers only; both feed URLs into the existing `updateStore()` path. Custom-domain routing fields are the exception: `/api/domain` owns those server-side writes because it must coordinate with Vercel before updating Firestore.

---

## API Routes & Their Firebase Impact

| Route                        | Method    | Firebase Ops  | Rate Limited? | Notes                                       |
| ---------------------------- | --------- | ------------- | ------------- | ------------------------------------------- |
| `client/[[...slug]]/` (OBP) | GET (SSR) | 1-2R (cached) | CDN cache     | Public page, no API route                   |
| `POST /api/domain`           | POST      | 1 store write + Vercel call | Auth + permission guarded | Adds custom domain routing fields and revalidates public store tags |
| `GET /api/domain`            | GET       | 1 store read, 0-1 store write + Vercel call | Auth + permission guarded | Writes `domainVerified` only when verification flips true |
| `DELETE /api/domain`         | DELETE    | 1 store read + 1 store write + Vercel call | Auth + permission guarded | Removes local custom-domain routing fields even if Vercel cleanup fails |

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** May 10, 2026

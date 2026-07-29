# Official Business Page (OBP) — Firebase Cost Tracking

**Date:** July 17, 2026
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
| Resolve single vs multi-outlet root | `stores` | Root OBP render | Per root render (cached 60s) | At most `MAX_OUTLETS_PER_TENANT + 1` rows | Yes | Canonical active-store query; blocked rows are removed after the bounded read. |
| Load multi-outlet selector | `stores` | Multi-outlet brand root | Per brand render (cached 60s) | At most `MAX_OUTLETS_PER_TENANT + 1` rows | Yes | Canonical active-store query; only safe outlet slugs are rendered. |
| Load OBP settings (dashboard) | `stores`                        | Owner opens Business Profile | On demand              | 0         | —        | Already loaded as part of store data in Redux                      |
| Load OBP metrics (dashboard)  | `analytics`                     | Owner opens Dashboard / opens a settled analytics tab | Today: 10 min TTL. Settled: scheduler-window cached | Today: 1 doc. Settled: 1 dashboard summary doc when requested | Yes | The `Today` tab reads the current store-local OBP daily doc when the dashboard opens. `Overview`, `Daily`, `Weekly`, `Monthly`, and `Overall` read `{tId}_{sId}_obp_dashboard_summary` only after the owner opens a settled tab, then cache on the device until the next store-local settlement cycle. |

**Key optimization:** Both reads are wrapped in `unstable_cache` with 60s TTL and per-store tags. At 60s cache, 1000 page views/hour = ~60 actual Firestore reads/hour (not 1000).

**Public client store lookup scope document ID boundary:** The shared public store resolver validates direct store-ID lookups and legacy tenant-block fallback tenant IDs with the shared Firestore document ID guard plus an exact positive numeric check before `stores/{storeId}` or `tenants/{tenantId}` refs. Malformed direct store IDs return no public store. Malformed tenant IDs on a returned store fail closed as blocked output before public OBP/menu/customer-app rendering.

### Writes

| Operation              | Collection  | Trigger                                  | Frequency                   | Docs Written | Fields       | Notes                                                                                                                         |
| ---------------------- | ----------- | ---------------------------------------- | --------------------------- | ------------ | ------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| Save OBP settings      | `stores`    | Owner updates Business Profile           | Rare (once then occasional) | 1            | merge update | Uses existing `updateStore()` DAL — `requestBodyComposer` adds timestamps. Custom attribute icon values and Google-link updated state are saved inside `publicPresence` in the same store write. Desktop Google-link saved state is shown only after `assertStoreUpdateSucceeded()` acknowledgement. |
| Save extracted business details | `stores` | Owner accepts business-detail suggestions after menu intake | Rare | 1 | merge update | Uses existing `updateStore()` DAL and requires `assertStoreUpdateSucceeded()` before desktop local business identity state changes. |
| Save OBP fields from B2C editor | `stores` | Owner publishes B2C editor changes that include Official Page edits | Rare | 1 | merge update | Uses existing `updateStore()` DAL and requires acknowledgement before local store state, queued photo cleanup, or publish success copy changes. |
| Save public subdomain | `stores` | Owner saves Domain Settings public link | Rare | 1 | `subdomain` | Uses existing `updateStore()` DAL and requires `assertStoreUpdateSucceeded()` before desktop local public-link state changes. Post-publish subdomain rename remains blocked by the store DAL guard. |
| Track OBP page view    | `analytics` | Customer visits OBP URL                  | Per visit (rate-limited)    | 1            | merge update | Daily doc: `{tId}_{sId}_obp_daily_{date}`. Uses `increment()` for atomic counters and includes `tId`, `sId`, `projectId`, `grain`, `surface`, `localDate`, `storeTimeZone` metadata in the same write. Rate-limited: 30s cooldown, 30 events/min. |
| Track OBP action click | `analytics` | Customer clicks Call/WhatsApp/Directions/Reserve/Order | Per click (debounced) | 1 | merge update | Same daily doc. Tracks `obpActionClicks.{call,whatsapp,directions,reserve,order}` plus `obpActionClicksByOpenHoursState.{open|closed|unknown}` on the same write. 1s debounce. |
| Track OBP menu click | `analytics` | Customer clicks View Menu from OBP | Per click (debounced) | 1 | merge update | Same daily doc. Tracks `totalOBPMenuClicks`, `obpMenuClicksBySurface.{brand|outlet}`, and `obpMenuClicksByOpenHoursState.{open|closed|unknown}` on the same write. |
| Track OBP link click | `analytics` | Customer clicks Google review, Instagram, Facebook, or website from OBP | Per click (debounced) | 1 | merge update | Same daily doc. Tracks `totalOBPLinkClicks`, `obpLinkClicks.{google_review,instagram,facebook,website}`, and `obpLinkClicksByOpenHoursState.{open|closed|unknown}` on the same write. |
| Track OBP share action | `analytics` | Owner shares official business link from settings | Per click (debounced) | 1 | merge update | Same daily doc. Tracks `totalOBPShares` and `obpShares.{whatsapp,copy_link,copy_message}`. |
| Track OBP language adoption | `analytics` | Customer switches language on a multi-language OBP and stays after the dwell window | Per accepted switch | 1 | merge update | Same daily doc. Tracks `obpLanguageAdoptions.{language}`. Single-language OBPs do not track language usage. Quick taps before dwell are ignored. |
| Apply extraction-derived business attribute defaults | `stores` | First extraction auto-save or owner-approved re-extraction | Once per applicable extraction | 1 | 0-1 transactional update | Only fills allowed missing `businessAttributes` keys against transaction-current store truth. Existing owner-set `true`/`false` values and unrelated keys are never overwritten. First extraction runs in one Admin transaction; re-extraction approval runs through one scoped client transaction, requires `assertStoreUpdateSucceeded()`, and installs the acknowledged merged map before local public attribute state changes. |
| Connect custom domain | `stores` | Owner connects or removes custom domain | Rare | 1 | `customDomain`, `domainVerified`, domain timestamps | `/api/domain` owns the Firestore write and revalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`. It validates session tenant/store IDs with the shared Firestore document-ID guard before permission checks, limiter keys, store refs, Vercel-flow diagnostics, and cache invalidation. Desktop and mobile UI call the route with same-origin credentials, no-store cache policy, and manual redirect handling, then update local domain state only after the existing route response shape is acknowledged. |

**Key point:** OBP settings are saved as part of the existing store document update. OBP analytics use the same `analytics` collection as digital menu with virtual `projectId='obp'`. Rate limiting prevents abuse.

**Diagnostic boundary:** Desktop OBP link-card, Google listing guide, Owner Dashboard Google listing, Business Settings Google-link mark-done, Business Settings embedded Presence Monitor, Domain Settings public-link save/copy/open and DNS-record copy, Custom Domain active-domain open/copy and DNS-record copy, and Owner Dashboard behavior-nudge failure diagnostics are cost-neutral secure logs. Failed copy/open/QR/default-project lookup, failed best-effort share tracking, blocked Google Business or verified-domain opens, rejected Google-link/subdomain store acknowledgements, failed OBPLinkCard copy/copy-message handoffs, failed Google-listing/behavior-nudge official-link copy handoffs with clipboard/fallback support booleans, failed Google profile handoff-kit copy with owner-text presence booleans and kit line count, failed Domain Settings public-link/DNS copy handoffs with clipboard/fallback support booleans, failed custom-domain clipboard handoffs with clipboard/fallback support booleans, failed embedded screen-link loading, and failed local dismiss-state diagnostics record bounded presence-length metadata only. OBPLinkCard copy/copy-message success feedback, `copy_link`/`copy_message` OBP share analytics, Google-listing copied feedback, Google profile handoff-kit copied feedback, behavior-nudge copied feedback, Domain Settings public-link/DNS copied feedback, and Custom Domain active-domain/DNS copied feedback remain after acknowledged Clipboard API or textarea fallback success. They add no Firestore reads/writes beyond existing successful OBP share analytics writes and the existing Google listing or subdomain `updateStore()` writes, no Storage operations, no Cloud Functions, no API routes, no cache invalidations, no rules, and no indexes.

**OBP dashboard read boundary:** Settled owner views read `_obp_dashboard_summary` once. The DAL validates exact numeric tenant/store scope before constructing the ref, then requires matching embedded tenant/store/project/kind/date identity and finite nonnegative period/lifetime/compact-row counters before browser cache admission. `Today` separately validates the exact daily document identity and value contract. Settled and Today localStorage values use a tenant/store-scoped envelope and re-enter separate runtime cache normalizers on initial/fetcher hits; invalid or legacy raw entries are evicted, and valid serialized timestamps are rehydrated. Invalid persisted data fails visibly and is not cached; the retired daily-range overview/overall helpers are not part of the active hook path.

**Customer quick answers:** The public OBP quick-answer block is render-only. It uses the already-loaded store/menu render facts for today hours, address, menu availability, WhatsApp availability, and directions availability. It adds no Firestore reads/writes/deletes, Storage operations, Cloud Functions, API routes, schema fields, analytics writes, rules, indexes, or deploy requirement.

**Secondary menu-card tracking diagnostics:** OBP secondary project cards still attempt the same OBP menu-click and project-switch analytics writes before navigation. If either existing write rejects, the combined tracking promise now reaches `trackBeforeNavigate()` so the shared bounded `public_link_navigation_tracking_failed` diagnostic can run. This adds no Firestore reads/writes beyond the already-attempted analytics writes, no new analytics fields, no Storage operations, no Cloud Functions, no API routes, no rules, no indexes, and no deploy requirement.

**Starter placeholders:** Unpaid starter OBP placeholders are computed from the already-loaded store document and missing publicPresence/social/service/payment fields. They add no Firestore read, write, listener, index, Cloud Function, or Storage operation, and they do not persist fake links, service modes, payment methods, or attributes. Compact starter layout and deterministic menu placeholder thumbnails are CSS/React render behavior only. Payment entitlement sync already revalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores`, so paid pages render without placeholders after the cache purge.

**Premium attribution removal:** OBP footer branding uses the already-loaded `stores/{storeId}.activePlanType` field through the shared MenuList branding policy. This adds no subscription lookup, Firestore read, write, listener, Cloud Function, rule, index, or Storage operation. Missing/non-Premium plan data keeps attribution visible.

**Custom attribute icons:** Desktop and mobile settings use the shared category icon/emoji picker for owner-defined custom attributes. This changes only the value stored in `publicPresence.customAttributes[].icon`; it adds no reads, writes, listeners, indexes, Storage operations, or Cloud Functions beyond the existing OBP settings save.

**Language usage:** Multi-language OBP page views attach `obpViewsByLanguage`, `obpSessionsByLanguage`, and `obpLanguageNames` to the existing page-view write. Language switch links stay URL-based for SEO/AEO, preserve `entry_source` plus intentional `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` parameters, and de-dupe accepted adoption counters by store-local analytics day. Legacy `src` / `source` query parameters are not preserved or consumed by analytics. UTM campaign counters remain on the same OBP page-view write and each UTM value is normalized through the analytics map-key guard before it becomes a Firestore map-key suffix.

**OBP aggregation map-key guard:** Late-correction rollups in `functions/src/analytics/obpAnalyticsAggregation.ts` normalize recovered daily/dashboard map keys before writing `lifetime.*` summary field paths. This protects legacy/raw map keys without changing live OBP analytics writes, read counts, write counts, collections, indexes, rules, Storage operations, API routes, or owner-facing settings.

**Language switch attribution diagnostics:** Failed language-link attribution preservation logs bounded `obp_language_switcher_attribution_preserve_failed` diagnostics only. The language URL fallback still renders, and this adds no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.

**Menu CTA entry-source diagnostics:** Failed outer OBP menu CTA attribution fallback logs bounded `obp_menu_cta_entry_source_fallback_failed` diagnostics only. The menu CTA still uses the shared `withAnalyticsSource(url, 'obp')` helper on valid paths and still falls back to `entry_source=obp` when that helper unexpectedly fails. This adds no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.

**OBP hours status fallback diagnostics:** Invalid timezone fallback and malformed time-range suppression in `src/lib/obp/hoursStatus.ts` use the shared browser/runtime hours diagnostics only. This adds no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.

**Theme preference diagnostics:** Public OBP light/dark preference is browser-local only. Invalid values are removed, and failed localStorage read/remove/write paths log bounded `obp_theme_storage_*_failed` diagnostics once per operation. This adds no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.

**OBP server fallback diagnostics:** Public OBP menu-summary, menu-resolution timeout, and tenant-store-count fallback failures now log bounded `public_obp_menu_info_lookup_failed`, `public_obp_menu_info_resolution_failed`, and `public_obp_store_count_lookup_failed` diagnostics. These logs reuse the already-attempted public render reads and add no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.

**Resolved surface fallback diagnostics:** Invalid timezone/day-key, Google Maps embed URL, and modified-on freshness timestamp fallbacks now log bounded `public_obp_today_day_key_timezone_failed`, `public_obp_google_maps_embed_url_parse_failed`, and `public_obp_freshness_timestamp_parse_failed` diagnostics. This adds no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.

**Public update-label boundary:** The OBP may render generic `modifiedOn` only as `Updated today` or `Updated {date}`. It cannot describe that timestamp as owner verification of every business fact. This is a read-only presentation correction over the existing cached store read; it adds no Firestore read, write, delete, Storage operation, Function, rule, index, provider call, or cache invalidation.

**Public canonical URL diagnostics:** Malformed stored OBP canonical URLs still fall back to the current generated public URL, but the parse failure now logs bounded `public_menu_resolution_canonical_url_parse_failed` diagnostics with tenant/store/slug/canonical-url presence-length metadata only. This adds no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.

**Open-hours action timing:** OBP action/menu/link clicks attach `open`, `closed`, or `unknown` state to the same existing click write. `unknown` is used when hours are not shown or cannot be resolved. This supports the dashboard's "actions while closed" insight without heartbeat/session-duration tracking or an additional public write path.

**Public link safety is render-time and cost-neutral:** OBP action links, social links, Google review links, Schema.org `sameAs`/ReserveAction/OrderAction targets, customer app manifest shortcuts, and PWA directions/reservation/order handoffs normalize stored owner URLs before public output. Invalid, non-HTTPS, wrong-host, credentialed, or oversized values are hidden from public `href`, manifest, redirect, and JSON-LD output instead of being rewritten to Firestore. This adds no reads, writes, deletes, Storage operations, Cloud Functions, rules, indexes, cache invalidations, or deploy requirement. Source gate: `npm run verify:official-business-page-boundary`.

**Public link parse diagnostics:** Malformed public-link URL parse failures log bounded `obp_public_link_url_parse_failed` diagnostics only. The helper still returns `null` and hides the unsafe public link. This adds no Firestore read/write/delete, analytics write, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.

### Deletes

| Operation | Collection | Trigger | Frequency | Docs Deleted | Soft/Hard | Notes                                                                  |
| --------- | ---------- | ------- | --------- | ------------ | --------- | ---------------------------------------------------------------------- |
| Delete replaced OBP cover/gallery object | Firebase Storage | Owner saves after removing or replacing cover/gallery image | Rare | 1 object per unreferenced replaced URL | Hard | Store update succeeds first. Delete candidates are deduplicated and filtered against the final saved `businessCover` and `photos[]`; a still-referenced prepared-media URL is never deleted. Failed object cleanup is logged and does not roll back the saved `publicPresence` field. |

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
| `aggregateOBPAnalyticsForStoreDate` (via `computeDecisionBlocksScores`) | Shared timezone-aware nightly store flow | Steady state: validated OBP dashboard-summary cache + exact settled daily doc. Rebuild fallback: one bounded ID-range query whose returned rows must match document and embedded scope/date/type identity. | Weekly/monthly/summary/dashboard-summary docs only when data exists | OBP is settled first for the store-local date. Menu/customer-app analytics run only after OBP succeeds for that same date. Late correction moves lifetime delta and compact baseline in one transaction. Lifetime settlement validates summary state and uses a bounded 120-date receipt map so concurrent/out-of-order retained dates contribute once; a dashboard write transaction refuses to regress a newer settled date. Writes `_obp_weekly_{week}`, `_obp_monthly_{month}`, `_obp_overall_summary`, and `_obp_dashboard_summary`. Flag: `ENABLE_OBP_ANALYTICS`. |
| `processMenuImagesJobLogic` | First menu extraction job | Existing extraction/project reads plus 1 `stores/{storeId}` read only when defaults are evaluated | 1 project write; optional 1 store write | Auto-saves first extraction output, then applies missing OBP business attribute defaults from high-confidence `businessAttributeSuggestions` and deterministic dietary tags. Uses the existing `/api/revalidate/menu` endpoint for `menu-store-{storeId}`, `store-{storeId}`, and `client-stores` tags when `NEXT_PUBLIC_APP_URL` and `REVALIDATION_SECRET` are configured in the Functions environment. |

The optional Functions store read/write is one Admin transaction so defaults are evaluated against transaction-current store truth. Existing explicit booleans and unrelated attributes are preserved. Existing-owner desktop/mobile review uses one client transaction read plus at most one store write for the same byte-mirrored merge rule; a no-op still costs the one current-store read and performs no write/cache invalidation. This replaces the prior split read/write or direct stale-map write without adding a collection, index, rule, or document.

June 30 B2C publish acknowledgement hardening is cost-neutral. Desktop B2C and Mobile Design publish still use the existing `publishProject()` write, but now require `assertProjectUpdateSucceeded()` before local published state, cached project state, success copy, or post-publish verification setup changes. Desktop B2C Official Page store saves still use the existing `updateStore()` write and `assertStoreUpdateSucceeded()` before local store state/photo cleanup. This adds no Firestore reads/writes/deletes, Storage operations beyond existing background/OBP media uploads and cleanup, Cloud Function logic changes, provider calls, routes, rules, indexes, schema fields, owner settings, Firebase deploy requirement, or Vercel deploy action.

**Settlement state:** The shared scheduler stores per-store status in `platformSummary/nightlyState_{tId}_{sId}` and a per-date lock in `platformSummary/nightlyLock_{tId}_{sId}_{YYYY-MM-DD}`. This prevents duplicate runs and allows missed store-local dates to be caught up safely.

**Date semantics:** OBP daily analytics docs now use the **store's local calendar date** and local hour buckets. The owner dashboard `Today`, `Daily`, WTD, MTD, and `Overall` views read the same store-local day keys/read-model cycle.

**Observability:** OBP settlement logs actionable Sentry/Firebase warnings only for cache rebuild fallback and late-event correction. Store-level OBP aggregation failures include `tId`, `sId`, and timezone context. Normal OBP page views and successful counter writes are not logged.

### Master Identity Propagation (Client-Side DAL)

| Operation                  | Collection | Trigger                                               | Docs Written | Notes                                                                                                                                                                                             |
| -------------------------- | ---------- | ----------------------------------------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Propagate master identity/classification to outlets | `stores`, `platformSummary/storesSummary` | Master store saves propagated fields via authenticated `/api/outlets/brand-propagation` | 1 atomic batch: master + eligible outlet writes + at most 1 summary merge | Runtime-validates the nine governed fields, tenant/master/permission scope and a bounded outlet set. Summary merge includes master/outlet `businessType`, `businessCategory`, `logo`, `timeZone`, and `modifiedOn`. Cache/screen/context invalidation follows commit. Skipped for outlets when `canOverrideBrandIdentity` or legacy `allowBrandingOverride` is true. |

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
- **No new collections:** OBP remains on the existing `stores` document.
- **Large owner-content maps are not query indexes:** `publicPresence`, `businessCopyMeta`, `businessAttributes`, and `workingHours` are read only after an exact store/routing lookup. Their automatic single-field indexes are disabled, so gallery arrays, localized copy, attributes, metadata, and hours do not create unused index fanout on each owner save.
- **Prepared media uploads:** OBP cover/gallery images are resized and compressed before Storage upload, avoiding raw phone-photo payloads on public pages
- **One write per tracked event:** OBP analytics use the same daily analytics doc as menu analytics with atomic increments. No separate summary write happens on the customer request path.
- **Language usage piggybacks on existing writes:** OBP language page-open counters ride on the existing OBP view write. Only dwell-accepted language switches create an additional write.
- **Open-hours timing piggybacks on existing writes:** OBP action/menu/link click counters include open/closed/unknown timing maps in the same click write. No polling, heartbeat, or extra timing event is added.
- **One owner read-model read:** Settled OBP dashboard data is precomputed nightly into `_obp_dashboard_summary`, avoiding 7-30 daily reads per owner dashboard visit.
- **One OBP rebuild range read:** steady state reuses the validated compact dashboard cache plus the settled daily document. A daily-range read occurs only for first build, a cache gap, or invalid/incomplete compact coverage.
- **Server component:** No client-side Firestore SDK loaded
- **Idempotent nightly summary:** Lifetime summary updates run in a Firestore transaction. A bounded 120-date receipt map allows retained dates to settle once even when calls complete out of order; legacy `lastProcessedDate` remains the initial migration guard and never regresses.
- **Extraction defaults are bounded:** Attribute defaulting reads the store once and writes only when at least one missing attribute can be safely filled.

### Future Threshold

Do not increase the cache window or pre-render tenant pages speculatively. If a future feature needs to filter or order by one of the exempt owner-content fields, add only the exact required index and its bounded query verifier; do not restore broad indexing for the whole nested map.

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

OBP business settings reuse existing store updates. `updateStore()` persists recognized nested store maps as changed-leaf `FieldPath` updates, uses an explicit deletion sentinel for removed leaves, and merges summary-affecting patches with the transaction-current store before writing `storesSummary`. Literal dynamic map keys remain one `FieldPath` segment. This prevents stale sibling replacement without adding a Firestore read on direct writes; summary-affecting writes retain their existing transaction read/write count. `uploadOBPCover()` and `uploadOBPPhoto()` are Storage helpers only; both feed URLs into the existing `updateStore()` path. Mobile Official Page saves require `assertStoreUpdateSucceeded()` before photo cleanup, saved baselines, or success copy; photo retention uses the fully merged next public-presence model rather than a partial persistence patch. This adds no reads, writes, routes, indexes, rules, Cloud Functions, or cache invalidation paths. Mobile Official Page save/media/link/share failures log bounded `mobile_official_page_*` diagnostics without adding reads, writes, routes, indexes, rules, Cloud Functions, or cache invalidation paths. Public-link copy is browser-local: copied feedback waits for Clipboard API success or acknowledged textarea fallback success, and failed copy diagnostics add only clipboard/fallback support booleans. Custom-domain routing fields are the exception: `/api/domain` owns those server-side writes because it must coordinate with Vercel before updating Firestore.

Failed best-effort cleanup deletes in `deleteOBPPhotos()` are diagnostics-only. Every immediate upload and replaced/removed URL is a cleanup candidate until acknowledged store truth retains it. Every caller supplies final saved cover/gallery references, so duplicate or re-added URLs are filtered before deletion; reset/navigation can remove abandoned uploads. The helper returns failed URLs for bounded retry instead of forgetting them. Failures use `storage_obp_photo_batch_delete_failed` with bounded delete counts and URL length metadata, and they do not roll back the saved store update.

Save/unmount ordering is explicit. Mobile navigation or a tenant/store switch skips draft cleanup while the acknowledged store write is unresolved; otherwise cleanup could remove a newly uploaded object before Firestore commits its URL. Successful saves settle cleanup against the complete next `publicPresence`; failed obsolete saves filter their staged candidates against the previous committed presence. A desktop or mobile upload that finishes after its editor unmounts issues one best-effort delete for that now-unreferenced result. These guards change no successful Firestore read/write count, collection, index, rule, Function, or cache invalidation. The obsolete-upload path adds at most one Storage delete for an object that would otherwise be abandoned.

Coordinate and owner public-link admission are pure validation and add no Firebase operation. Desktop and MobileShell write canonical `addressLine`, `postalCode`, and a valid paired `geo` value through the existing store update. Public Call/WhatsApp admission and Maps coordinate range checks are render-only. Tenant outlet discovery is explicitly bounded to `MAX_OUTLETS_PER_TENANT + 1` rows per cached query; no index, collection, listener, rule, Function, or scheduler is added.

---

## API Routes & Their Firebase Impact

| Route                        | Method    | Firebase Ops  | Rate Limited? | Notes                                       |
| ---------------------------- | --------- | ------------- | ------------- | ------------------------------------------- |
| `client/[[...slug]]/` (OBP) | GET (SSR) | 1-2R (cached) | CDN cache     | Public page, no API route                   |
| `POST /api/domain`           | POST      | 1 store write + Vercel call | Auth + session document-ID + permission guarded | Adds custom domain routing fields and revalidates public store tags |
| `GET /api/domain`            | GET       | 1 store read, 0-1 store write + Vercel call | Auth + session document-ID + permission guarded | Writes `domainVerified` only when verification flips true |
| `DELETE /api/domain`         | DELETE    | 1 store read + 1 store write + Vercel call | Auth + session document-ID + permission guarded | Removes local custom-domain routing fields even if Vercel cleanup fails |

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** July 17, 2026

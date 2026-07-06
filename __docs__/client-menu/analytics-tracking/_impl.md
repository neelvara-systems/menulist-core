# Customer-Facing Analytics Tracking — Implementation

**Sub-Feature of:** Client Menu  
**Document Type:** Technical Implementation  
**Status:** ✅ Implemented  
**Last Updated:** June 3, 2026

---

## File Structure

```
src/lib/analytics/
└── unified.ts                        # Core tracking logic
└── trackBeforeNavigate.ts            # Non-blocking final-action navigation tracking

src/database/analytics/
└── index.ts                          # Firestore DAL

src/database/ownerDashboard/
└── index.ts                          # Owner dashboard read adapter

src/lib/analytics/
└── ownerDashboardDetails.ts           # Shared desktop/mobile owner detail sections

src/components/templates/website/clientWebsite/
├── AnalyticsContext.tsx              # React context for tracking
├── UnifiedAnalyticsTracking.tsx      # Wrapper component
├── GoogleAnalytics.tsx               # GA4 integration
├── FacebookPixel.tsx                 # Meta Pixel
├── EnhancedEcommerce.tsx             # E-commerce tracking
└── GoogleSearchConsole.tsx           # Site verification

functions/src/
├── aggregateCustomerAnalytics.ts     # Menu + Customer App nightly settlement
├── analytics/obpAnalyticsAggregation.ts # OBP nightly settlement
└── decisionBlocksScoring.ts          # Unified timezone-aware scheduler
```

Scheduler-hour timezone diagnostics (July 5, 2026): `src/lib/utils/schedulerHour.ts` and `functions/src/utils/schedulerHour.ts` keep the UTC settlement-hour fallback when a configured timezone is malformed, but that degraded path now logs bounded diagnostics. App code emits `scheduler_hour_timezone_validation_failed`; Functions emits `SCHEDULER_HOUR_TIMEZONE_VALIDATION_FAILED`. Both paths cap repeated failure shapes and log only timezone presence-length metadata, target local hour, Intl availability, fixed `use_utc_settlement_hour` fallback policy, and normalized source error metadata.

## Owner Dashboard Parity

- Desktop and mobile owner analytics use the same tab labels and the same menu-detail section builder: `Menu Signals`, `Visitor Sources`, `Campaign Tracking`, `Top Items`, `Categories`, `Customer Actions`, `Search Demand`, `Unavailable Interest`, `Languages`, `Filters`, and `Smart Picks`.
- Legacy Google Analytics dashboard cards (`MenuPerformance`, `QuickStats`, `LocationInsights`, `TrendAnalysis`) use bounded analytics diagnostics for failed GA fetches. They must not direct-console raw property IDs, date ranges, response payloads, provider errors, or browser exceptions. `src/services/analytics/index.ts` calls legacy analytics routes with same-origin credentials, no-store cache policy, and manual redirect handling, caps response JSON at 1MB, validates report-like response rows, normalizes `/api/analytics/reports` to the returned `report` object expected by the dashboard cards, and logs malformed/invalid responses through bounded analytics diagnostics. The authenticated Google Analytics report routes authorize the requested configured property, require numeric GA Data API property IDs, normalize legacy saved dashboard preferences like `7days` to `7daysAgo`, accept only `today`, `yesterday`, `NdaysAgo`, or valid non-future `YYYY-MM-DD` dates, and reject reversed or wider-than-366-day ranges before provider calls. Google Analytics configured-store scope boundary: the configured-property helper validates session tenant/store IDs through `normalizeGoogleAnalyticsScopeDocumentId()` before `stores/{storeId}` authorization reads; malformed, reserved, path-shaped, whitespace-mutated, decimal, zero, negative, unsafe, or nonnumeric scope IDs return the existing not-onboarded response before Firestore or provider work. `QuickStats` and `TrendAnalysis` read revenue from the route's `totalRevenue` metric index, while unavailable order counts remain `0`. `LocationInsights` also guards zero-total reports so percentages render as `0%` instead of `NaN%`. `DateRangeSelector` keeps visible range changes fail-open, but its `analytics.dashboardPreferences.dateRange` store write requires `assertStoreUpdateSucceeded()` and logs `dashboard_google_date_range_preference_save_failed` through bounded analytics diagnostics when persistence fails.
- The shared builder lives in `src/lib/analytics/ownerDashboardDetails.ts`; desktop renders it with `MenuAnalyticsDetailsCard`, while mobile renders the same rows with `MobileMenuAnalyticsDetailsCard`.
- `Today`, `Yesterday`, `This Week`, `This Month`, and `Overall` all use the same section builder. `Overview` renders the same builder for WTD and MTD data.
- The owner dashboard read adapter normalizes older/lazy period documents so top items, categories, source quality, UTM traffic, search demand, unavailable demand, actions, filters, languages, and Smart Picks stay available when the raw maps exist.
- WTD/MTD fallback aggregation ranks top items from `clicksByItem` item taps, matching the nightly dashboard summary path.

---

## Data Flow

```
Customer interaction (click, view, etc.)
    ↓
AnalyticsContext.trackMenuView() / trackItemView() / menuPageNew search + unavailable handlers / MenuFooter and PDP recovery final action handlers
    ↓
unified.ts → trackEvent()
    ↓
Rate limit check (30 events/min)
    ↓ PASS
Debounce check (1 second window)
    ↓ PASS
Menu view cooldown check (30 seconds)
    ↓ PASS
trackFirebaseEvent()
    └── Adds anonymous session milestones/category/filter interest to the same accepted write when applicable
    ↓
database/analytics → trackAnalyticsEvent()
    ↓
Local analytics queue (`localStorage` persisted, 15s / 20-event flush)
    ↓
Firestore: analytics/{tId}_{sId}_{projectId}_daily_{storeLocalDate}
    └── Includes query metadata: tId, sId, projectId, grain, surface, localDate, storeTimeZone
```

---

## Key Functions

### Track Event (with protections)

```typescript
// src/lib/analytics/unified.ts

const RATE_LIMIT = {
  MAX_EVENTS_PER_MINUTE: 30,
  DEBOUNCE_MS: 1000,
  MENU_VIEW_COOLDOWN_MS: 30000,
};

export async function trackEvent(eventType: string, data: TrackingData) {
  // 1. Rate limit check
  if (!checkRateLimit(eventType)) {
    logger.warn("Rate limit exceeded", { eventType });
    return;
  }

  // 2. Debounce check
  if (isDebounced(eventType, data.projectId)) {
    return;
  }

  // 3. Menu view cooldown
  if (eventType === "MENU_VIEW" && isMenuViewCooldown(data.projectId)) {
    return;
  }

  // 4. Track event
  await trackFirebaseEvent(eventType, data);
}
```

### Search Tracking (cost-safe)

```typescript
useEffect(() => {
  if (!trackMenuViews) return;
  if (search.length < 2) return;
  if (hasTrackedSearchTermInSession(storeId, projectId, search)) return;

  const timer = window.setTimeout(() => {
    markSearchTermTrackedInSession(storeId, projectId, search);
    trackSearch(search, filteredItems.length, { tenantId, storeId, projectId });
  }, 900);

  return () => window.clearTimeout(timer);
}, [search, filteredItems.length]);
```

- Fires once per unique search term per session
- Never writes on each keystroke
- Zero-result searches are preserved because they are decision-grade
- Failed search de-dupe `sessionStorage` availability/read/write paths log bounded `analytics_search_dedup_*` diagnostics with presence-length metadata only
- If storage is unavailable, full, blocked, or malformed, search remains non-blocking and no fallback Firestore write or separate search document is created

### Unavailable Item Demand

```typescript
if (item.available === false) {
  trackUnavailableItemAttempt(item.id, itemName, item.category, {
    tenantId,
    storeId,
    projectId,
  });
  return;
}
```

- Fires only on explicit taps
- Captures missed demand without passive-noise cost
- Reuses the existing daily analytics doc
- Opens the PDP in recovery mode without firing an additional `ITEM_VIEW`
- Reuses the same final action links already defined in `publicPresence`

### Menu Action Conversion

```typescript
const handleMenuAction = (menuAction: 'call' | 'whatsapp' | 'directions' | 'reserve' | 'order') => {
  trackMenuAction(menuAction, {
    tenantId,
    storeId,
    projectId,
  });
};
```

- Fires only on final outbound action clicks
- Reuses existing `publicPresence` action URLs and visibility toggles
- Avoids tracking hover, scroll, and intermediate UI states
- The same tracking path is reused in the footer and unavailable-item PDP recovery actions; zero-result search now stays retrieval-only and does not duplicate footer CTAs
- Writes immediately instead of waiting for the passive-event queue, because these are owner-facing conversion signals.
- Public menu and OBP final-action links use `trackBeforeNavigate.ts` to wait up to 800ms for tracking on same-tab navigation while preserving modifier-click and `_blank` browser behavior. Failed tracking calls log `public_link_navigation_tracking_failed` with fixed reason labels and bounded href/target presence-length metadata only; navigation still proceeds.
- Shared source-attribution diagnostics: `withAnalyticsSource()` still returns the same valid attributed URL when parsing succeeds and still uses the manual encoded `entry_source` fallback when parsing fails. Failed URL parsing logs `analytics_source_attribution_url_parse_failed` with source URL and entry-source presence-length metadata, URL shape booleans, and a capped per-shape reporting guard only. It creates no analytics Firestore write, event stream, Storage operation, Cloud Function, API route, cache invalidation, rule, index, or deploy requirement.

### Session Milestones and Category Interest

```typescript
// src/lib/analytics/unified.ts
MENU_VIEW -> menuSessions
ITEM_VIEW -> viewsByCategory + categoryNames + engaged/intent after 2 distinct items
ITEM_CLICK -> clicksByCategory + categoryNames + engaged/intent
SEARCH / UNAVAILABLE_ITEM_ATTEMPT / DECISION_BLOCK_CLICK -> engagedSessions + intentSessions
MENU_ACTION_CLICK -> engagedSessions + intentSessions + actionSessions
```

- Milestone state lives in `sessionStorage`, keyed by tenant/store/project/local date/session id.
- Milestones are attached to existing Firestore counter writes; there is no raw event table and no extra event document.
- If storage is unavailable, full, blocked, or malformed, normal menu/item/search/action counters still write, but milestone/source/filter/search de-duplication or attribution persistence is skipped.
- Session ID storage diagnostics: failed anonymous session-id `sessionStorage` get/refresh/clear paths log bounded `analytics_session_get_failed`, `analytics_session_refresh_failed`, and `analytics_session_clear_failed` diagnostics with storage-key and session-value presence-length metadata only. If session lookup fails, the existing fresh anonymous session-id fallback remains browser-local and creates no fallback Firestore write.
- Failed milestone/source/filter/search `sessionStorage` read/write/remove paths log bounded `analytics_session_milestones_*`, `analytics_session_source_*`, `analytics_active_filter_*`, and `analytics_search_dedup_*` diagnostics with storage-key and payload presence-length metadata plus small counts/booleans only.
- OBP language-adoption de-dupe is scoped by tenant/store/store-local date in `OBPAnalytics`; failed storage read/write paths log bounded `obp_analytics_language_storage` diagnostics and create no fallback Firestore write.
- Category interest only comes from existing item view/click events. MenuList does not track category scroll/open events.
- Public PDP tracking resolves the stable category id/name from the project file categories before sending analytics metadata.
- Entry source is stored in sessionStorage and attached to existing `MENU_VIEW` / `MENU_ACTION_CLICK` writes as `viewsByEntrySource`, `menuSessionsBySource`, `actionSessionsBySource`, and `menuActionClicksBySource`. This supports action-rate-by-source without a new source event stream.
- Paid Gemini wording for owner analytics is off unless Cloud Functions has `ENABLE_OWNER_ANALYTICS_AI_SUMMARIES=true` and the store summary has `activePlanType` set to `pro` or `premium`. Missing plan data fails closed.
- Non-Pro dashboards keep factual metrics, source quality, and confidence. The Pro action-list / summary layer writes `analyticsAiEntitlement` so desktop and mobile can show a locked state instead of silently hiding the card.
- Owner analytics wording uses `gemini-2.5-flash-lite`, not the global extraction model, because this flow only rewrites deterministic summaries/actions.
- When analytics AI is enabled, daily / weekly / monthly summaries are generated as in-memory payloads and saved inside the existing `{tId}_{sId}_{projectId}_dashboard_summary` write. They are not written as separate daily / summary / monthly documents.
- Pro menu intelligence also joins the existing analytics counters with compact fields from the already-loaded project catalog during nightly settlement. It creates deterministic action candidates for unavailable demand, best-seller validation, category order, hidden demand, variant clarity, metadata demand, timed categories, and price signals before Gemini rewrites wording.
- Item `attributes` are variants/options in the catalog. They are not tracked as clicks today because the public PDP renders them as static option rows.

### Dashboard Surfacing

- Owner dashboard reads settled metrics from nightly dashboard read-model docs, not by rebuilding every card from daily docs on each visit.
- `aggregateCustomerAnalytics.ts` rolls search demand, unavailable-item demand, active filter context, menu CTA clicks, and Customer App metrics into summary / weekly / monthly rollups, then writes `{tId}_{sId}_{projectId}_dashboard_summary`.
- `analytics/dashboardSummaryAggregation.ts` writes menu and Customer App owner-dashboard read models. `analytics/obpAnalyticsAggregation.ts` writes the OBP dashboard read model.
- Owner action mark-done session scope boundary: `POST /api/analytics/owner-action/mark-done` validates authenticated session `tenantId` and `storeId` through the shared Firestore document-ID boundary before rate limiting, bounded body parsing, dashboard-summary reads, or receipt writes. Malformed path-shaped or reserved session scope returns the existing `Not onboarded` response and emits bounded presence/length analytics diagnostics only.
- Owner action mark-done project/receipt ID boundary: the same route validates request `projectId` through the shared Firestore document-ID boundary before composing the dashboard summary document ID, then rechecks the composed analytics document ID before Firestore access. New receipt IDs stay server-derived 32-character lowercase hex hashes, and old receipt map keys are filtered to that same shape before the route uses them in dotted receipt-delete update paths.
- Settled `Top Items` use item-tap counters (`clicksByItem`). Smart Picks / recommendation clicks remain separate recommendation-performance counters.
- The menu, OBP, and Customer App dashboard read models update incrementally in steady state: existing compact daily rows are reused, the settled day is added when present, and wide daily-range rebuilds happen only for first deploy/cache gaps.
- Weekly/monthly rollups also prefer the same dashboard read-model cache. Daily-doc range reads are fallback only when the compact cache does not cover the required window.
- The next nightly pass checks the previously settled local date for late passive writes and applies only positive deltas to lifetime summaries and cached daily rows.
- The menu dashboard read model includes compact rolling daily rows for the deeper analytics screen. This keeps recent trend, device, location, and customer-intent cards to one read-model read instead of a daily-range query.
- The same nightly writer stores `{tId}_{sId}_{projectId}_intelligence_7d` for Decision Blocks and Menu Intelligence. The scheduler reads this compact input doc instead of rebuilding the same 7-day analytics window from daily docs; missing/stale snapshots settle as empty for that run and are counted in scheduler ops details.
- Nightly settlement is driven by `computeDecisionBlocksScores`, which runs after each store's configured business-day cutoff plus the settlement buffer.
- The scheduler uses `platformSummary/projects_{sId}` as the active project index, then fetches full project docs only for active projects that need Decision Blocks / Menu Intelligence.
- OBP analytics settle first for the store/date. If OBP settlement fails, menu/customer-app settlement for that same store/date does not run.
- Store/date analytics settlement runs before Decision Blocks / Menu Intelligence. If settlement fails, the intelligence pass for that store does not continue on stale analytics.
- `platformSummary/nightlyState_{tId}_{sId}` stores the last settled local date and the current phase. `platformSummary/nightlyLock_{tId}_{sId}_{YYYY-MM-DD}` prevents duplicate processing.
- The completed nightly state also stores a compact store-level analytics index with active project ids, customer analytics project ids, enabled surfaces, and dashboard summary doc ids. This keeps future guard/discovery flows pointed at one store-level state doc instead of rediscovering analytics surfaces.
- If a night is missed, the next local nightly run catches up pending store-local dates in order, capped per run for Firebase cost safety.
- Summary lifetime counters are idempotent: a date already recorded as aggregated is skipped instead of incremented again.
- Settled owner dashboard views end on the latest settled business date. They are intentionally not mixed with the current partial business day or the just-ended day before scheduler settlement.
- The Dashboard has six explicit display tabs on desktop and mobile: `Today`, `Overview`, `Yesterday`, `This Week`, `This Month`, and `Overall`.
- Every dashboard tab renders its own Menu card/section and matching Official Business Page card/section so owners do not have to mentally combine separate surfaces.
- Desktop Dashboard is analytics-only like mobile. Operational cards such as menu quality repair, temporary status, official-link setup, Google listing setup, and review reply tools are not mounted inside Dashboard; they belong to their own owner workflow surfaces.
- The default `Today` tab reads only the current day Menu and OBP daily docs directly through the owner-dashboard DAL.
- The live card uses SWR plus local cache with a short TTL only for that slice, so Firebase cost stays bounded.
- Settled / past analytics stay gated until the owner opens `Overview`, `Yesterday`, `This Week`, `This Month`, or `Overall`. Menu and OBP settled reads then use SWR/localStorage with the store-local scheduler cycle key. The cache survives midnight and business-day cutoff changes, then invalidates after the next expected local scheduler completion window.
- The existing overview / daily / weekly / monthly / overall historical flow is served from the read-model doc. Legacy daily-doc rebuilds are not used on the owner display path.
- The deep analytics dashboard uses the same read-model doc via SWR/local cache:
  - recent settled ranges are served from `{tId}_{sId}_{projectId}_dashboard_summary`
  - ranges including today read the same dashboard summary plus today's daily doc with a 10-minute TTL
  - older/custom ranges outside the compact rolling daily cache are not rebuilt from daily docs on the client; owners see available precomputed ranges only
- Desktop and mobile owner dashboards surface:
  - total searches
  - no-result searches
  - unavailable-item taps
  - final CTA clicks and action breakdown
  - top search terms
  - anonymous engaged-session rate
  - anonymous action rate
  - top category interest
  - top customer filters
  - action rate by source
  - owner confidence status
  - Today Action List cards from the settled read model
- Desktop and mobile owner dashboards also surface:
  - `Today so far` menu visits
  - `Today so far` searches
  - `Today so far` no-result searches
  - `Today so far` unavailable interest
  - `Today so far` final customer actions
  - `Today so far` engaged-session rate
  - `Today so far` action rate
- Desktop and mobile analytics parity rule:
  - both layouts use `useOwnerDashboard` and `useOBPDashboard` for the owner analytics data flow
  - both layouts use the same shared project selection resolver and per-store selected-catalog storage before falling back to the default catalog
  - both layouts render explicit Menu and OBP empty states for every period instead of hiding one surface when only the other has data
  - dashboard labels for top items, categories, languages, filters, sources, and actions come from the analytics read model; mobile must not silently enrich dashboard rows from a separate project-data read
  - blank GA4, Search Console, and Meta Pixel fields are valid on both desktop and mobile because empty IDs disable external scripts
- AI owner summaries now also reference:
  - top search demand
  - no-result search friction
  - unavailable demand
  - strongest final customer action

### Write to Firestore

```typescript
// src/database/analytics/index.ts

export async function trackAnalyticsEvent(
  updateData: Record<string, any>,
  tenantId: number,
  storeId: number,
  projectId: string,
  storeTimeZone?: string
) {
  const date = getAnalyticsDateKey(new Date(), storeTimeZone);
  if (typeof window !== 'undefined') {
    // Public customer analytics bypasses direct Firestore writes. Anonymous
    // menu users flush the coalesced queue through /api/public/analytics/track,
    // where the server validates the target and writes with Admin SDK.
    enqueueAnalyticsWrite(updateData, tenantId, storeId, projectId, date, storeTimeZone);
    return true;
  }

  await writeAnalyticsEventNow(updateData, tenantId, storeId, projectId, date, storeTimeZone);
}
```

### Diagnostics and Failure Logging

- `src/lib/analytics/analyticsDiagnostics.ts` is the shared diagnostic layer for client analytics helpers, the analytics write queue, `POST /api/public/analytics/track`, owner analytics API routes, Google Analytics report routes, ROI metrics, and the Google Analytics server helper.
- `src/lib/analytics/unified.ts`, `device.ts`, `geo.ts`, and `session.ts` log only normalized failure codes plus bounded identifier presence/length metadata.
- `src/lib/analytics/geo.ts` keeps browser geolocation permission denial quiet as an expected privacy outcome, but logs non-permission geolocation failures such as timeout or position unavailable through `analytics_geolocation_position_failed` before returning the same timezone fallback. The diagnostic records only fallback policy/support metadata and normalized source error name/code/status metadata.
- Location lookup diagnostics: if the broader opt-in location helper unexpectedly fails while resolving the browser position or timezone fallback, it logs `analytics_location_lookup_failed` with geolocation/Intl availability, timezone presence/length metadata, the fixed `unknown` fallback policy, and normalized source error metadata only before returning `unknown`.
- Shared analytics timezone diagnostics: `src/lib/analytics/timeZoneDiagnostics.ts` logs `analytics_timezone_validation_failed` when malformed configured timezones force `dateKey.ts` or `businessDay.ts` to use the existing UTC fallback. The diagnostic records only timezone/source presence-length metadata, fallback policy, window availability, and normalized source error metadata. Raw timezone values, tenant IDs, store IDs, project IDs, analytics document IDs, customer routes, dashboard date ranges, and exception text are not logged.
- Entry-source inference diagnostics: `src/lib/analytics/unified.ts` logs `analytics_entry_source_inference_failed` when browser query/referrer parsing fails and the source-quality helper has to use the existing `direct` fallback. The diagnostic records only query/referrer presence-length metadata, browser API booleans, and normalized source error metadata. Raw query strings, referrer URLs, UTM values, tenant IDs, store IDs, project IDs, customer routes, source labels, and exception text are not logged.
- Customer menu UTM map-key boundary: `src/lib/analytics/unified.ts` keeps intentional campaign parameters (`utm_source`, `utm_medium`, `utm_campaign`, and `utm_content`) on the existing menu-view and OBP-view writes, but every accepted UTM value passes through `normalizeAnalyticsMapKey()` before it becomes a `viewsBySource`, `viewsByMedium`, `viewsByCampaign`, or `viewsByContent` Firestore map-key suffix. Malformed or empty normalized values are skipped for that counter. This prevents public URL query text from creating raw dynamic Firestore field paths while preserving campaign attribution for valid link-level UTM values. No separate write path, owner setting, API route, Cloud Function, rule, index, or deploy requirement is added.
- OBP aggregation map-key boundary: `functions/src/analytics/obpAnalyticsAggregation.ts` normalizes recovered daily and cached dashboard map keys before late-correction rollups build dotted Firestore update paths for lifetime OBP maps. Legacy dotted/raw map keys are folded into the same lowercase `[a-z0-9_-]` key shape used by live analytics writes, duplicate normalized keys are summed, and empty normalized keys are skipped. This changes late-correction aggregation only; live customer-page writes keep the same write count.
- `src/database/analytics/index.ts` uses the same bounded diagnostics for queue flush, browser-local queue persistence, persisted queue recovery, missing identity, enqueue, and summary update failures. Queue persistence failures log only phase, queue counts, serialized-payload presence/length, and normalized source error metadata; raw queued analytics payloads are not logged.
- Public analytics route failures log `public_analytics_track_failed` with tenant/store/project presence and length metadata, update-field count, date-request presence, and source error name/code/status metadata only. They must not pass raw route exceptions or raw tenant/store/project IDs to `secureError()`.
- Public analytics target validation must reject inactive, deleted, platform-blocked, or tenant-blocked stores before preference filtering or Admin SDK writes. The target validator reads the tenant document on 300-second cache misses only; this keeps blocked tenants from refreshing anonymous analytics while preserving the existing coalesced daily-doc write model.
- Public analytics tenant/store document ID boundary: `POST /api/public/analytics/track` normalizes `tenantId` and `storeId` through `normalizePublicAnalyticsNumericDocumentId()` after bounded body/schema validation and before cached target reads or daily analytics writes. Malformed, reserved, whitespace-mutated, path-shaped, decimal, zero, negative, unsafe, nonnumeric, or scientific-notation tenant/store IDs fail with the existing validation error before `stores/{storeId}`, `tenants/{tenantId}`, `platformSummary/projects_{storeId}`, or `analytics/{tenantId}_{storeId}_{projectId}_daily_{date}` refs are built.
- Public analytics shared write helper boundary: `writePublicAnalyticsEventAdmin()` repeats tenant/store, project, and date-key normalization before constructing `analytics/{docId}` or stored `tId`/`sId`/`projectId` fields. This is defense in depth for future callers of the exported helper; the current public route still performs its own body, target, preference, and date-window validation before calling the helper.
- Public analytics project ID boundary: `POST /api/public/analytics/track` validates `projectId` with the analytics character rule plus the shared Firestore document-ID boundary before target validation or daily analytics writes. Reserved first-party surfaces `obp` and `customerApp` remain valid; malformed, path-shaped, or reserved Firestore document IDs fail during request validation before daily doc IDs are built.
- Owner analytics API route failures log stable codes such as `analytics_realtime_api_failed`, `analytics_menu_api_failed`, `analytics_locations_api_failed`, `analytics_realtime_detail_api_failed`, and `analytics_roi_metrics_api_failed` with bounded route/query/session metadata and source error name/code/status metadata only. They must not import or call `secureError()` directly.
- Diagnostics must not log raw tenant IDs, store IDs, project IDs, session IDs, queue keys, user agents, raw GA property IDs, date-range values, geolocation exceptions, GA4 exceptions, or provider exception messages.
- `npm run verify:menulist-api-tenant-safety` locks this no-direct-console/no-raw-logger contract for the analytics tracking path.

### Document Key Patterns

```typescript
// Daily: {tId}_{sId}_{projectId}_daily_{YYYY-MM-DD}
const dailyDocId = `${tId}_${sId}_${projectId}_daily_${date}`;

// Summary: {tId}_{sId}_{projectId}_overall_summary
const summaryDocId = `${tId}_${sId}_${projectId}_overall_summary`;

// Owner dashboard read model: {tId}_{sId}_{projectId}_dashboard_summary
const dashboardSummaryDocId = `${tId}_${sId}_${projectId}_dashboard_summary`;

// Weekly: {tId}_{sId}_{projectId}_weekly_{YYYY-Www}
const weeklyDocId = `${tId}_${sId}_${projectId}_weekly_${weekStr}`;

// Monthly: {tId}_{sId}_{projectId}_monthly_{YYYY-MM}
const monthlyDocId = `${tId}_${sId}_${projectId}_monthly_${monthStr}`;
```

---

## Analytics Context

```typescript
// src/components/.../AnalyticsContext.tsx

interface AnalyticsContextValue {
  trackMenuView: (
    storeId: number,
    storeName: string,
    opts: TrackingOptions
  ) => void;
  trackItemView: (itemData: ItemViewData) => void;
  trackItemClick: (itemData: ItemClickData) => void;
  trackDecisionBlockClick: (blockType: string, itemId: string) => void;
  trackSearch: (searchTerm: string) => void;
}

// Usage in components:
const { trackItemClick } = useAnalytics();
trackItemClick({ itemId, itemName, categoryId, projectId });
```

---

## Third-Party Integration

Google Analytics and Meta Pixel are loaded only when the owner saves a valid matching ID in Analytics Settings. Customer menu third-party analytics ID boundary: `GoogleAnalytics.tsx` accepts only GA4 measurement IDs matching `G-[A-Z0-9]+`, and `FacebookPixel.tsx` accepts only numeric Meta Pixel IDs between 5 and 32 digits before interpolating them into script URLs or inline bootstrap scripts. Malformed saved values behave like absent IDs and load no third-party script. These scripts are external owner-owned integrations; MenuList internal attribution uses `entry_source`, while `utm_source`, `utm_medium`, `utm_campaign`, and `utm_content` remain intentional campaign parameters that third-party tools may read from the public URL. No separate UTM toggle is implemented because UTM is controlled by the campaign link, and external script loading is controlled by whether a valid GA4 / Meta Pixel ID is present.

### Google Analytics 4

```typescript
// src/components/.../GoogleAnalytics.tsx

export default function GoogleAnalytics({ storeDetails }: Props) {
  const gaId = getSafeGoogleAnalyticsId(storeDetails?.googleAnalyticsId);
  if (!gaId) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} />
      <Script id="ga-init">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
```

### Facebook Pixel

```typescript
// src/components/.../FacebookPixel.tsx

export default function FacebookPixel({ storeDetails }: Props) {
  const pixelId = getSafeMetaPixelId(storeDetails?.facebookPixelId);
  if (!pixelId) return null;

  return (
    <Script id="fb-pixel">
      {`
        !function(f,b,e,v,n,t,s){...}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${pixelId}');
        fbq('track', 'PageView');
      `}
    </Script>
  );
}
```

---

## Cloud Function: Nightly Aggregation

**Trigger:** `functions/src/decisionBlocksScoring.ts`
**Schedule Model:** hourly scheduler with per-store timezone + business-day cutoff filtering
**Aggregation Helpers:** `functions/src/aggregateCustomerAnalytics.ts` and `functions/src/analytics/obpAnalyticsAggregation.ts`

### Nightly Flow

```
STEP 1: Pick stores whose local time has reached the business-day settlement window
  └── Shared nightly scheduler filters by store timezone + businessDayEndTime
  └── schedulerHour remains fallback only when timezone is missing
  └── Reads platformSummary/projects_{sId} for active project IDs

STEP 2: Acquire store/date settlement lock
  └── Uses platformSummary/nightlyLock_{tId}_{sId}_{YYYY-MM-DD}
  └── Reads platformSummary/nightlyState_{tId}_{sId} for catch-up

STEP 3: Run OBP aggregation first for the store-local date
  └── Creates / updates OBP weekly, monthly, and summary docs
  └── If this fails, the store's menu analytics step is treated as failed too

STEP 4: Update Menu / Customer App Overall Summary
  └── Queries daily docs by tId + sId + grain + localDate
  └── Increments lifetime totals only if this date has not already been aggregated

STEP 5: Weekly Rollup (IF MONDAY)
  └── Reads last 7 daily docs → Creates weekly_{YYYY-Www}
  └── Generates Weekly AI Summary (5 bullets, confident tone)

STEP 6: Monthly Rollup (IF 1st OF MONTH)
  └── Reads all daily docs from previous month → Creates monthly_{YYYY-MM}
  └── Generates Monthly AI Summary (3 bullets, calm tone)

STEP 7: Daily AI Summary
  └── Generates Daily AI Summary (2 bullets, descriptive only)

STEP 8: TTL Cleanup (MONTHLY)
  └── Deletes daily docs older than 90 days

STEP 9: Mark settlement completed
  └── Updates lastSettledLocalDate and releases the lock
```

### Store-Local Business-Day Buckets

- Event writes now resolve the analytics document date from the **store timezone** and `businessDayEndTime`.
- Food/late-service stores default to `03:00`, calendar-day stores default to `00:00`, and owners can override the field in Language & Region settings.
- The same field is mirrored into `platformSummary/storesSummary` so Cloud Functions do not need per-store reads just to know the settlement cutoff.
- Hourly maps such as `hourlyViews`, `hourlySearches`, `hourlyMenuActionClicks`, and `hourlyClicksByItem` also use the **store-local hour**.
- Dashboard reads (`Today so far`, `Yesterday`, WTD, MTD, historical weeks) now resolve dates in the same store-local business-day calendar instead of UTC.
- Decision Blocks and Menu Intelligence read their 7-day analytics window from the same store-local day keys, so recommendation scoring and owner reporting use the same day boundaries.
- If a configured timezone is malformed, the same UTC fallback remains in place so analytics never blocks public/customer or owner dashboard flows, and `analytics_timezone_validation_failed` records the degraded path with bounded metadata only.

### Additive Fields Only

The April 2026 expansion keeps the nightly flow unchanged by storing everything as additive fields on the same daily document:

- `totalSearches`
- `searchTerms.*`
- `zeroResultSearches`
- `zeroResultSearchTerms.*`
- `totalUnavailableItemTaps`
- `unavailableItemTapsByItem.*`

This means:

- no new collection
- no extra fan-out write
- no new standalone scheduler
- no change to document key patterns

### AI Summary Tones

| Period  | Bullets | Tone             | Purpose                          |
| ------- | ------- | ---------------- | -------------------------------- |
| Daily   | 2 max   | Descriptive only | No conclusions, no advice        |
| Weekly  | 5 max   | Confident        | Actionable insights for the week |
| Monthly | 3 max   | Calm, reassuring | Subscription justification       |

### Implementation

```typescript
// functions/src/decisionBlocksScoring.ts

const analyticsRunAt = new Date();

for (const store of storesForThisHour) {
  const activeProjectIds = await loadActiveProjectsFromProjectsSummary(store.sId);
  const settlementDates = await getPendingSettlementDates(store.tId, store.sId, analyticsRunAt, store.timeZone);

  for (const settlementDate of settlementDates) {
    const lock = await acquireNightlyDateLock(store.tId, store.sId, settlementDate);
    if (!lock) continue;

    await aggregateOBPAnalyticsForStoreDate(db, store.tId, store.sId, settlementDate);

    const result = await aggregateCustomerAnalyticsForStoreDate(
      db,
      store.tId,
      store.sId,
      settlementDate,
      [...activeProjectIds, "customerApp"]
    );

    if (result.errors.length > 0) {
      throw new Error("Customer analytics aggregation had project errors");
    }
  }
}
```

---

## Validation Checklist

| Item                                     | Status |
| ---------------------------------------- | ------ |
| projectId passed through component chain | ✅     |
| Document key includes projectId          | ✅     |
| Rate limiting implemented                | ✅     |
| Debouncing implemented                   | ✅     |
| Menu view cooldown implemented           | ✅     |
| Summary updated nightly (not real-time)  | ✅     |
| Weekly rollup on Mondays                 | ✅     |
| Monthly rollup on 1st                    | ✅     |
| Monthly TTL cleanup (90 days)            | ✅     |
| GA4 integration                          | ✅     |
| Facebook Pixel integration               | ✅     |

---

## Testing

### Manual Test: Track Event

1. Open menu at `{subdomain}.menulist.ai`
2. Open browser DevTools → Network
3. Filter for Firestore writes
4. Scroll, click items, use filters
5. Verify writes to `analytics/{tId}_{sId}_{projectId}_daily_{date}`

### Manual Test: Rate Limiting

1. Open menu
2. Rapidly click items (>30 in 1 minute)
3. Check console for "Rate limit exceeded" warning
4. Verify no additional writes after limit

### Manual Test: Cloud Function

```bash
# Check function logs
firebase functions:log --only computeDecisionBlocksScores

# Manual trigger
firebase functions:shell
> computeDecisionBlocksScores()
```

---

## Troubleshooting

| Issue                     | Cause                 | Solution                         |
| ------------------------- | --------------------- | -------------------------------- |
| No analytics in Firestore | projectId missing     | Check prop chain                 |
| Events not tracking       | Rate limited          | Wait 1 minute                    |
| GA4 not working           | Missing ID            | Add `googleAnalyticsId` to store |
| Diagnostics missing       | Verifier failed       | Run `npm run verify:menulist-api-tenant-safety` |
| Summary not updating      | Nightly scheduler failed | Check `computeDecisionBlocksScores` logs |
| Old docs not deleted      | TTL cleanup failed    | Manual cleanup                   |

---

_Document Status: ✅ IMPLEMENTED_

# Customer-Facing Analytics Tracking — Implementation

**Sub-Feature of:** Client Menu  
**Document Type:** Technical Implementation  
**Status:** ✅ Implemented  
**Last Updated:** May 1, 2026

---

## File Structure

```
src/lib/analytics/
└── unified.ts                        # Core tracking logic

src/database/analytics/
└── index.ts                          # Firestore DAL

src/database/ownerDashboard/
└── index.ts                          # Owner dashboard read adapter

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
    ↓
database/analytics → trackAnalyticsEvent()
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
- The same tracking path is reused in the footer, zero-result recovery state, and unavailable-item PDP recovery actions
- Writes immediately instead of waiting for the passive-event queue, because these are owner-facing conversion signals.

### Dashboard Surfacing

- Owner dashboard reads settled metrics from nightly dashboard read-model docs, not by rebuilding every card from daily docs on each visit.
- `aggregateCustomerAnalytics.ts` rolls search demand, unavailable-item demand, menu CTA clicks, and Customer App metrics into summary / weekly / monthly rollups, then writes `{tId}_{sId}_{projectId}_dashboard_summary`.
- `analytics/dashboardSummaryAggregation.ts` writes menu and Customer App owner-dashboard read models. `analytics/obpAnalyticsAggregation.ts` writes the OBP dashboard read model.
- The menu, OBP, and Customer App dashboard read models update incrementally in steady state: existing compact daily rows are reused, the settled day is added when present, and wide daily-range rebuilds happen only for first deploy/cache gaps.
- The menu dashboard read model includes compact rolling daily rows for the deeper analytics screen. This keeps recent trend, device, location, and customer-intent cards to one read-model read instead of a daily-range query.
- The same nightly writer stores `{tId}_{sId}_{projectId}_intelligence_7d` for Decision Blocks and Menu Intelligence. The scheduler reads this compact input doc instead of rebuilding the same 7-day analytics window from daily docs; missing/stale snapshots settle as empty for that run.
- Nightly settlement is driven by `computeDecisionBlocksScores`, which runs at each store's local 2:30 AM window.
- The scheduler uses `platformSummary/projects_{sId}` as the active project index, then fetches full project docs only for active projects that need Decision Blocks / Menu Intelligence.
- OBP analytics settle first for the store/date. If OBP settlement fails, menu/customer-app settlement for that same store/date does not run.
- Store/date analytics settlement runs before Decision Blocks / Menu Intelligence. If settlement fails, the intelligence pass for that store does not continue on stale analytics.
- `platformSummary/nightlyState_{tId}_{sId}` stores the last settled local date and the current phase. `platformSummary/nightlyLock_{tId}_{sId}_{YYYY-MM-DD}` prevents duplicate processing.
- The completed nightly state also stores a compact store-level analytics index with active project ids, customer analytics project ids, enabled surfaces, and dashboard summary doc ids. This keeps future guard/discovery flows pointed at one store-level state doc instead of rediscovering analytics surfaces.
- If a night is missed, the next local nightly run catches up pending store-local dates in order, capped per run for Firebase cost safety.
- Summary lifetime counters are idempotent: a date already recorded as aggregated is skipped instead of incremented again.
- Settled owner dashboard views still end on yesterday. They are intentionally not mixed with the current partial day.
- A separate `Today so far` card reads the current day daily doc directly through the owner-dashboard DAL.
- The live card uses SWR plus local cache with a short TTL only for that slice, so Firebase cost stays bounded.
- Settled dashboard SWR/localStorage cache uses the store-local scheduler cycle key. It survives midnight and invalidates after the next expected local scheduler completion window.
- The existing overview / daily / weekly / monthly historical flow is served from the read-model doc. Legacy daily-doc rebuilds are not used on the owner display path.
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
- Desktop and mobile owner dashboards also surface:
  - `Today so far` menu visits
  - `Today so far` searches
  - `Today so far` no-result searches
  - `Today so far` unavailable interest
  - `Today so far` final customer actions
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
  if (isFinalConversionAction(updateData)) {
    await writeAnalyticsEventNow(updateData, tenantId, storeId, projectId, date, storeTimeZone);
  } else {
    enqueueAnalyticsWrite(updateData, tenantId, storeId, projectId, date, storeTimeZone);
  }
}
```

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

### Google Analytics 4

```typescript
// src/components/.../GoogleAnalytics.tsx

export default function GoogleAnalytics({ storeDetails }: Props) {
  const gaId = storeDetails?.googleAnalyticsId;
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
  const pixelId = storeDetails?.facebookPixelId;
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
**Schedule Model:** hourly scheduler with per-store timezone filtering
**Aggregation Helpers:** `functions/src/aggregateCustomerAnalytics.ts` and `functions/src/analytics/obpAnalyticsAggregation.ts`

### Nightly Flow

```
STEP 1: Pick stores whose local time has reached the nightly analytics hour
  └── Shared nightly scheduler filters by store timezone / schedulerHour
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

### Store-Local Day Buckets

- Event writes now resolve the analytics document date from the **store timezone**.
- Hourly maps such as `hourlyViews`, `hourlySearches`, `hourlyMenuActionClicks`, and `hourlyClicksByItem` also use the **store-local hour**.
- Dashboard reads (`Today so far`, `Yesterday`, WTD, MTD, historical weeks) now resolve dates in the same store-local calendar instead of UTC.
- Decision Blocks and Menu Intelligence read their 7-day analytics window from the same store-local day keys, so recommendation scoring and owner reporting use the same day boundaries.

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
| Summary not updating      | Nightly scheduler failed | Check `computeDecisionBlocksScores` logs |
| Old docs not deleted      | TTL cleanup failed    | Manual cleanup                   |

---

_Document Status: ✅ IMPLEMENTED_

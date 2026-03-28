# Customer-Facing Analytics Tracking — Implementation

**Sub-Feature of:** Client Menu  
**Document Type:** Technical Implementation  
**Status:** ✅ Implemented  
**Last Updated:** January 12, 2026

---

## File Structure

```
src/lib/analytics/
└── unified.ts                        # Core tracking logic

src/database/analytics/
└── index.ts                          # Firestore DAL

src/components/templates/website/clientWebsite/
├── AnalyticsContext.tsx              # React context for tracking
├── UnifiedAnalyticsTracking.tsx      # Wrapper component
├── GoogleAnalytics.tsx               # GA4 integration
├── FacebookPixel.tsx                 # Meta Pixel
├── EnhancedEcommerce.tsx             # E-commerce tracking
└── GoogleSearchConsole.tsx           # Site verification

functions/src/
└── aggregateCustomerAnalytics.ts     # Nightly aggregation
```

---

## Data Flow

```
Customer interaction (click, view, etc.)
    ↓
AnalyticsContext.trackMenuView() / trackItemView()
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
Firestore: analytics/{tId}_{sId}_{projectId}_daily_{date}
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

### Write to Firestore

```typescript
// src/database/analytics/index.ts

export async function trackAnalyticsEvent(
  updateData: Record<string, any>,
  tenantId: number,
  storeId: number,
  projectId: string
) {
  const date = new Date().toISOString().split("T")[0];
  const docId = `${tenantId}_${storeId}_${projectId}_daily_${date}`;
  const docRef = doc(firebaseClient, DB_COLLECTIONS.ANALYTICS, docId);

  await setDoc(
    docRef,
    {
      ...updateData,
      lastUpdated: serverTimestamp(),
    },
    { merge: true }
  );
}
```

### Document Key Patterns

```typescript
// Daily: {tId}_{sId}_{projectId}_daily_{YYYY-MM-DD}
const dailyDocId = `${tId}_${sId}_${projectId}_daily_${date}`;

// Summary: {tId}_{sId}_{projectId}_overall_summary
const summaryDocId = `${tId}_${sId}_${projectId}_overall_summary`;

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

**Schedule:** `0 3 * * *` (3:00 AM UTC daily)  
**File:** `functions/src/aggregateCustomerAnalytics.ts`

### Nightly Flow

```
STEP 1: Update Overall Summary (ALWAYS)
  └── Reads yesterday's daily → Increments lifetime totals

STEP 2: Weekly Rollup (IF MONDAY)
  └── Reads last 7 daily docs → Creates weekly_{YYYY-Www}
  └── Generates Weekly AI Summary (5 bullets, confident tone)

STEP 3: Monthly Rollup (IF 1st OF MONTH)
  └── Reads all daily docs from previous month → Creates monthly_{YYYY-MM}
  └── Generates Monthly AI Summary (3 bullets, calm tone)

STEP 4: Daily AI Summary (ALWAYS)
  └── Generates Daily AI Summary (2 bullets, descriptive only)

STEP 5: TTL Cleanup (ALWAYS)
  └── Deletes daily docs older than 90 days
```

### AI Summary Tones

| Period  | Bullets | Tone             | Purpose                          |
| ------- | ------- | ---------------- | -------------------------------- |
| Daily   | 2 max   | Descriptive only | No conclusions, no advice        |
| Weekly  | 5 max   | Confident        | Actionable insights for the week |
| Monthly | 3 max   | Calm, reassuring | Subscription justification       |

### Implementation

```typescript
// functions/src/aggregateCustomerAnalytics.ts

export const aggregateCustomerAnalytics = functions.pubsub
  .schedule("0 3 * * *") // 3:00 AM UTC daily
  .timeZone("UTC")
  .onRun(async (context) => {
    // 1. Get all active stores
    const stores = await getActiveStores();

    for (const store of stores) {
      const projects = await getActiveProjects(store.tenantId, store.storeId);

      for (const project of projects) {
        // 2. Update summary from yesterday's data
        await updateSummary(store.tenantId, store.storeId, project.projectId);

        // 3. Weekly rollup (Mondays only)
        if (isMonday()) {
          await createWeeklyRollup(
            store.tenantId,
            store.storeId,
            project.projectId
          );
        }

        // 4. Monthly rollup (1st of month only)
        if (isFirstOfMonth()) {
          await createMonthlyRollup(
            store.tenantId,
            store.storeId,
            project.projectId
          );
        }

        // 5. TTL cleanup (delete docs > 90 days)
        await cleanupOldDocs(store.tenantId, store.storeId, project.projectId);
      }
    }
  });
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
| TTL cleanup (90 days)                    | ✅     |
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
firebase functions:log --only aggregateCustomerAnalytics

# Manual trigger
firebase functions:shell
> aggregateCustomerAnalytics()
```

---

## Troubleshooting

| Issue                     | Cause                 | Solution                         |
| ------------------------- | --------------------- | -------------------------------- |
| No analytics in Firestore | projectId missing     | Check prop chain                 |
| Events not tracking       | Rate limited          | Wait 1 minute                    |
| GA4 not working           | Missing ID            | Add `googleAnalyticsId` to store |
| Summary not updating      | Cloud function failed | Check function logs              |
| Old docs not deleted      | TTL cleanup failed    | Manual cleanup                   |

---

_Document Status: ✅ IMPLEMENTED_

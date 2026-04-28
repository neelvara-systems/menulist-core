# Customer-Facing Analytics Tracking — Specification

**Sub-Feature of:** Client Menu  
**Document Type:** Product Specification  
**Status:** ✅ Implemented  
**Last Updated:** April 29, 2026

---

## Executive Summary

Customer-Facing Analytics tracks all customer interactions on the public menu to power the Continuous Menu Intelligence (CMI) system and Decision Blocks recommendations.

### What It Is

- **Passive behavior tracking** on customer-facing menus
- **Project-wise data collection** for per-menu intelligence
- **Cost-optimized writes** with rate limiting and debouncing
- **Third-party integrations** (GA4, Facebook Pixel)

### What It Is NOT

- ❌ A customer-visible analytics dashboard
- ❌ Personal data collection
- ❌ Real-time reporting (aggregated nightly)

---

## Goals

1. **Feed Decision Intelligence** — Provide data for CMI and Decision Blocks
2. **Enable Owner Insights** — Track menu performance
3. **Integrate Third-Party** — Support GA4, Facebook Pixel
4. **Optimize Costs** — Minimize Firebase writes

---

## Events Tracked

| Event                      | Trigger          | Purpose                              |
| -------------------------- | ---------------- | ------------------------------------ |
| `MENU_VIEW`                | Page load        | Track menu visits                    |
| `ITEM_VIEW`                | Item modal open  | Track item interest                  |
| `ITEM_CLICK`               | Item action      | Track engagement                     |
| `DECISION_BLOCK_CLICK`     | Block item click | Measure recommendation effectiveness |
| `DECISION_BLOCKS_RENDERED` | Blocks displayed | Track impression                     |
| `SEARCH`                   | Unique search term per session | Track real demand without per-keystroke cost |
| `UNAVAILABLE_ITEM_ATTEMPT` | Tap on unavailable item | Track missed demand / stock friction |
| `MENU_ACTION_CLICK`        | Final CTA click from menu footer or recovery UI | Track action intent without passive telemetry cost |

### Explicitly Not Tracked

- ❌ Scroll depth
- ❌ Per-keystroke search input
- ❌ Hover / passive exposure metrics
- ❌ High-frequency continuous behavior that would create write-heavy noise

---

## Data Structure

### Daily Document

**Path:** `analytics/{tId}_{sId}_{projectId}_daily_{YYYY-MM-DD}`

```typescript
{
  // Core metrics
  totalViews: number;
  totalClicks: number;
  totalSessions: number;

  // Device breakdown
  viewsByDevice: { mobile: n, tablet: n, desktop: n };

  // Location breakdown
  viewsByLocation: { "IN_Maharashtra": n, ... };

  // Item breakdown
  clicksByItem: { "item_id": n };
  viewsByItem: { "item_id": n };
  hourlyClicksByItem: { "item_id": { "12": 5, "13": 8 } };

  // Hourly (UTC)
  hourlyViews: { "00": n, ... "23": n };
  hourlyClicks: { ... };

  // Decision Blocks
  totalRecommendationClicks: number;
  recommendationClicks: { popular: n, quickPick: n, bestValue: n };
  recommendationClicksByItem: { "item_id": n };

  // Search demand
  totalSearches: number;
  searchTerms: { "chicken biryani": n };
  zeroResultSearches: number;
  zeroResultSearchTerms: { "ramen": n };

  // Missed demand
  totalUnavailableItemTaps: number;
  unavailableItemTapsByItem: { "item_id": n };

  // Final menu actions
  totalMenuActionClicks: number;
  menuActionClicks: { "call": n, "whatsapp": n, "directions": n, "reserve": n, "order": n };

  // UTM
  viewsBySource: { "google": n, "direct": n };
  viewsByMedium: { "cpc": n };

  lastUpdated: Timestamp;
}
```

### Summary Document

**Path:** `analytics/{tId}_{sId}_{projectId}_overall_summary`

```typescript
{
  lifetimeTotalViews: number;
  lifetimeTotalClicks: number;
  lifetimeTotalSearches: number;
  lifetimeZeroResultSearches: number;
  lifetimeTotalUnavailableItemTaps: number;
  lifetimeTotalMenuActionClicks: number;
  menuActionClicks: { "call": n, "whatsapp": n, "directions": n, "reserve": n, "order": n };
  searchTerms: { "chicken biryani": n };
  unavailableItemTapsByItem: { "item_id": n };
  lifetimeTotalSessions: number;
  topItems: Array<{ menuItemId; name; totalClicks }>;
  last7Days: {
    totalViews, totalClicks;
  }
  last30Days: {
    totalViews, totalClicks;
  }
  lastUpdated: Timestamp;
}
```

---

## Cost Optimization

### Rate Limiting

| Protection         | Value      | Purpose              |
| ------------------ | ---------- | -------------------- |
| Max events/min     | 30         | Prevent abuse        |
| Debounce window    | 1 second   | Block rapid-fire     |
| Menu view cooldown | 30 seconds | Prevent refresh spam |
| Search dedupe      | 1 unique term / session | Prevent per-keystroke writes |

### Write Optimization

| Before            | After         | Savings |
| ----------------- | ------------- | ------- |
| 2 writes/event    | 1 write/event | 50%     |
| Real-time summary | Nightly batch | 99%     |
| Unlimited events  | Rate limited  | ~70%    |
| Scroll telemetry  | Rejected      | Avoids noisy per-scroll writes |

### Estimated Monthly Cost (100 projects)

```
Writes: ~₹160/month
Reads: ~₹15/month
Storage: ~₹8/month
Total: ~₹183/month
```

---

## Third-Party Integrations

| Service            | Component               | Events                |
| ------------------ | ----------------------- | --------------------- |
| Google Analytics 4 | `GoogleAnalytics.tsx`   | page_view, view_item  |
| Facebook Pixel     | `FacebookPixel.tsx`     | PageView, ViewContent |
| Enhanced Ecommerce | `EnhancedEcommerce.tsx` | Product tracking      |

---

## Nightly Aggregation

**Cloud Function:** `aggregateCustomerAnalytics`  
**Schedule:** Daily at 3:00 AM UTC

### Tasks

| Task           | When         | Description                              |
| -------------- | ------------ | ---------------------------------------- |
| Summary Update | Daily        | Update `overall_summary` from daily data |
| Weekly Rollup  | Mondays      | Create `weekly_{YYYY-Www}` document      |
| Monthly Rollup | 1st of month | Create `monthly_{YYYY-MM}` document      |
| TTL Cleanup    | Daily        | Delete daily docs older than 90 days     |

### Owner Dashboard Reporting

- The owner dashboard reads these signals from the same summary / weekly / monthly / daily documents.
- Search demand, unavailable-item demand, and final menu CTA clicks are visible in dashboard views after nightly aggregation.
- AI summaries also surface the top search term, strongest final action, and unavailable-demand signals from the same rolled-up documents.
- No separate analytics collection or scheduler path is introduced for these metrics.

### Customer Recovery UX

- Zero-result search states may offer category shortcuts and existing final contact/order actions.
- Unavailable-item taps may open a recovery PDP with the same final actions.
- These recovery surfaces reuse existing data and event types only; they do not add passive telemetry or new Firebase write classes.

---

## Session Management

- **Storage:** `sessionStorage` (tab-scoped)
- **Timeout:** 30 minutes inactivity
- **Keys:** `menulist_session_id`, `menulist_session_timestamp`

---

## Related Documents

| Document                                      | Purpose            |
| --------------------------------------------- | ------------------ |
| `continuous-menu-intelligence/`               | CMI system         |
| `decision-intelligence/`                      | Decision Blocks    |
| `functions/src/aggregateCustomerAnalytics.ts` | Nightly aggregator |

---

_Document Status: ✅ IMPLEMENTED_

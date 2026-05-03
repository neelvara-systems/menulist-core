# Customer-Facing Analytics Tracking — Specification

**Sub-Feature of:** Client Menu  
**Document Type:** Product Specification  
**Status:** ✅ Implemented  
**Last Updated:** May 1, 2026

---

## Executive Summary

Customer-Facing Analytics tracks all customer interactions on the public menu to power the Continuous Menu Intelligence (CMI) system and Decision Blocks recommendations.

### What It Is

- **Passive behavior tracking** on customer-facing menus
- **Project-wise data collection** for per-menu intelligence
- **Cost-optimized writes** with rate limiting and debouncing
- **Store-local daily settlement** with idempotent nightly rollups
- **Third-party integrations** (GA4, Facebook Pixel)

### What It Is NOT

- ❌ A customer-visible analytics dashboard
- ❌ Personal data collection
- ❌ Real-time reporting (aggregated nightly)
- ❌ Raw-event lake / API ingestion pipeline

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
| Active filter context      | Attached to later item/search/action writes only | Show owner-visible customer filter intent without a separate Firebase write |
| `UNAVAILABLE_ITEM_ATTEMPT` | Tap on unavailable item | Track missed demand / stock friction |
| `MENU_ACTION_CLICK`        | Final CTA click from menu footer or recovery UI | Track action intent without passive telemetry cost |

Passive/engagement events may be coalesced on the client for a short flush window before writing to Firestore. Final action/conversion events are not delayed.

### Session Milestones

Session milestones are added to existing daily-doc writes. They do not create a separate Firestore event stream.

| Counter | Trigger | Purpose |
| ------- | ------- | ------- |
| `menuSessions` | First accepted menu view per session/project/local date | Session denominator for owner-facing rates |
| `engagedSessions` | First session that views 2 distinct items, searches, taps unavailable item, taps a Decision Block, or clicks a final menu action | Measures real menu interest |
| `intentSessions` | First session with search, 2 distinct item views, unavailable-item tap, Decision Block tap, or final action | Measures buying intent without claiming conversion |
| `actionSessions` | First final menu action per session | Measures sessions that moved to call/WhatsApp/directions/reserve/order |

Milestone state is stored in `sessionStorage` by tenant/store/project/local date/session id. If browser storage is unavailable, normal counters still write, but milestone de-duplication is skipped to avoid unsafe persistence assumptions.

### Source Quality and Owner Action Plan

Entry source is attached to existing menu view and final action writes. It does not create a separate event stream.

| Counter | Trigger | Purpose |
| ------- | ------- | ------- |
| `viewsByEntrySource` | Accepted `MENU_VIEW` | Shows where menu traffic started |
| `menuSessionsBySource` | First menu session by source | Denominator for action-rate-by-source |
| `actionSessionsBySource` | First final action session by source | Shows which source creates real customer action |
| `menuActionClicksBySource` | Final menu action click by source | Shows total CTA taps by source |
| `menuViewsByLanguage` | Accepted menu view with active language | Shows which language customers opened |
| `menuSessionsByLanguage` | First active menu language per session | Shows language usage without counting every toggle |
| `languageAdoptions` | Switched language stayed active after dwell window | Shows useful language switches, not accidental taps |
| `obpViewsByLanguage` | Accepted OBP view with active language | Shows which business-page language customers opened |
| `obpSessionsByLanguage` | First active OBP language per session | Shows OBP language usage without counting every toggle |
| `obpLanguageAdoptions` | Switched OBP language stayed active after dwell window | Shows useful OBP language switches |

The nightly scheduler precomputes `sourceQuality` and `ownerConfidence` into the dashboard read model for all owners. The Pro analytics assistant layer adds `ownerActionPlan` plus daily / weekly / monthly wording summaries.

OBP language usage is shown only for multi-language OBPs. Language switch links remain URL-based for SEO/AEO, preserve `entry_source` plus intentional `utm_source`, `utm_medium`, and `utm_campaign` parameters, and only count adoption after the switched language page remains active for the dwell window.

Pro menu intelligence joins existing analytics counters with compact owner-authored menu catalog fields during nightly settlement. It produces deterministic owner action candidates for unavailable demand, best-seller validation, category order, hidden demand, variant clarity, metadata demand, timed categories, and price signals.

Paid Gemini wording is gated by both the Cloud Functions env flag `ENABLE_OWNER_ANALYTICS_AI_SUMMARIES=true` and `platformSummary/storesSummary.stores.{sId}.activePlanType`. Only `pro` and `premium` are eligible. Missing plan data fails closed and writes an `analyticsAiEntitlement` lock state into the dashboard read model. When enabled, owner analytics wording uses the analytics-specific `gemini-2.5-flash-lite` model because the underlying metrics and action choices are deterministic.

### Explicitly Not Tracked

- ❌ Scroll depth
- ❌ Per-keystroke search input
- ❌ Hover / passive exposure metrics
- ❌ Option/variant row clicks while item attributes are display-only
- ❌ High-frequency continuous behavior that would create write-heavy noise
- ❌ Generic ecommerce/auth/share/location/ops counters in Firestore unless they become owner-visible dashboard metrics

---

## Data Structure

### Daily Document

**Path:** `analytics/{tId}_{sId}_{projectId}_daily_{YYYY-MM-DD}`

```typescript
{
  // Core metrics
  tId: string;
  sId: string;
  projectId: string;
  grain: "daily";
  surface: "menu" | "obp" | "customerApp";
  localDate: string; // Store-local YYYY-MM-DD
  storeTimeZone: string;
  totalViews: number;
  totalClicks: number;
  totalSessions: number;
  menuSessions: number;
  engagedSessions: number;
  intentSessions: number;
  actionSessions: number;

  // Device breakdown
  viewsByDevice: { mobile: n, tablet: n, desktop: n };

  // Location breakdown
  viewsByLocation: { "IN_Maharashtra": n, ... };

  // Item breakdown
  clicksByItem: { "item_id": n };
  viewsByItem: { "item_id": n };
  clicksByCategory: { "category_id": n };
  viewsByCategory: { "category_id": n };
  categoryNames: { "category_id": "Starters" };
  viewsByEntrySource: { qr: n, whatsapp: n, obp: n, direct: n };
  menuSessionsBySource: { qr: n, whatsapp: n, obp: n, direct: n };
  actionSessionsBySource: { qr: n, whatsapp: n, obp: n, direct: n };
  menuActionClicksBySource: { qr: n, whatsapp: n, obp: n, direct: n };
  hourlyClicksByItem: { "item_id": { "12": 5, "13": 8 } };

  // Hourly (store-local)
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
  viewsBySource: { "google": n }; // Only when utm_source is intentionally present
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
  lifetimeMenuSessions: number;
  lifetimeEngagedSessions: number;
  lifetimeIntentSessions: number;
  lifetimeActionSessions: number;
  lifetimeTotalSearches: number;
  lifetimeZeroResultSearches: number;
  lifetimeTotalUnavailableItemTaps: number;
  lifetimeTotalMenuActionClicks: number;
  menuActionClicks: { "call": n, "whatsapp": n, "directions": n, "reserve": n, "order": n };
  searchTerms: { "chicken biryani": n };
  unavailableItemTapsByItem: { "item_id": n };
  viewsByCategory: { "category_id": n };
  clicksByCategory: { "category_id": n };
  categoryNames: { "category_id": "Starters" };
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
| Passive flush delay | 15 seconds | Coalesce low-priority counters |
| Passive flush max | 20 queued events | Bound local queue size before flush |

### Write Optimization

| Before            | After         | Savings |
| ----------------- | ------------- | ------- |
| 2 writes/event    | 1 write/event | 50%     |
| Real-time summary | Nightly batch | 99%     |
| Unlimited events  | Rate limited  | ~70%    |
| Scroll telemetry  | Rejected      | Avoids noisy per-scroll writes |
| Session milestones | Existing writes | Adds decision rates without extra event docs |
| Category interest | Existing item events | Adds category-level demand without scroll/open tracking |

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

Google Analytics and Meta Pixel are owner-provided external scripts. MenuList loads them only when the owner saves the corresponding ID in Analytics Settings. These third-party tools may read intentional campaign parameters (`utm_source`, `utm_medium`, `utm_campaign`) from the public URL, but MenuList internal source attribution uses `entry_source`. Normal MenuList share links do not need a UTM toggle; removing the saved GA4 / Meta Pixel ID stops that external script from loading.

---

## Nightly Aggregation

**Cloud Function Path:** `computeDecisionBlocksScores` triggers the shared nightly store flow, which runs customer menu analytics and OBP analytics together.
**Schedule Model:** Timezone-aware per store with owner-configurable business-day cutoff. The scheduler runs hourly and settles analytics when a store reaches `businessDayEndTime + settlement buffer`.

### Tasks

| Task           | When         | Description                              |
| -------------- | ------------ | ---------------------------------------- |
| Summary Update | Daily        | Update `overall_summary` from daily data |
| Weekly Rollup  | Mondays      | Create `weekly_{YYYY-Www}` document      |
| Monthly Rollup | 1st of month | Create `monthly_{YYYY-MM}` document      |
| TTL Cleanup    | Monthly      | Delete daily docs older than 90 days     |
| Settlement Lock | Daily per store-local date | Prevent duplicate processing of the same store/date |

### Date Semantics

- Daily analytics documents now use the **store's local business-day date**, not the server's UTC date.
- `businessDayEndTime` (`HH:mm`) lives on `stores/{sId}` and `platformSummary/storesSummary.stores.{sId}` so public writes, owner reads, and the scheduler use the same date key without extra store reads.
- Default food/late-service businesses use `03:00`; calendar-day businesses use `00:00`. Owners can override this from Language & Region settings.
- Hourly analytics buckets also use the **store's local hour**.
- This applies to menu analytics, OBP analytics, and Customer App analytics so all owner-facing reporting settles against the same business day.
- If a store is in `Asia/Kolkata` with `businessDayEndTime: 03:00`, an event at local `12:15 AM` is still written to the previous business day; an event after `03:00 AM` is written to the new business day.
- Nightly aggregation records `lastSettledLocalDate` per store and catches up missed dates in order on the next local nightly run.
- Lifetime summary counters are idempotent. If a date is already aggregated, reruns skip the lifetime increment instead of double-counting.

### Owner Dashboard Reporting

- The owner dashboard reads these signals from the same summary / weekly / monthly / daily documents.
- The default owner dashboard remains settled and bounded by the latest completed nightly settlement for `Yesterday`, `Last 7 Days`, and month-to-date confirmation views.
- Between `businessDayEndTime` and the settlement window, the settled tabs continue to show the previous settled business date; the just-ended business day appears after the scheduler completes.
- A separate `Today so far` card may read the current day daily document directly for partial live activity.
- The recommended owner flow is: load `Today so far` first, then load settled historical analytics only when the owner asks for them.
- That live card must stay cost-safe: no realtime listener, no polling, no new rollup, no new collection.
- Search demand, unavailable-item demand, and final menu CTA clicks are visible in dashboard views after nightly aggregation.
- Attribute filter intent is visible as `Top filters` only when a customer selected a public filter chip and then performed a meaningful existing action such as item view, search, unavailable tap, recommendation tap, or final CTA.
- Catalog variants/options are not tracked as clicks unless they become real selectable customer controls. Current menu intelligence uses catalog fields plus existing item/category analytics only.
- Dashboard read models carry `engagedSessionRate`, `intentRate`, and `actionRate` precomputed by the scheduler/DAL from `menuSessions`.
- Dashboard read models also carry `sourceQuality`, `ownerConfidence`, and `ownerActionPlan` so Dashboard and Today screens render owner guidance without client-side daily-doc aggregation.
- Owner-facing wording uses `Action Rate`, not conversion rate, because MenuList only observes final CTA clicks unless a future integration confirms booking/order/payment completion.
- AI summaries also surface the top search term, strongest final action, and unavailable-demand signals from the same rolled-up documents.
- No separate analytics collection or standalone scheduler path is introduced for these metrics.
- Menu analytics and OBP analytics now settle in the same store-scoped nightly pass. If the OBP step fails for a store, that store's menu analytics rollup is treated as failed for the same run.

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

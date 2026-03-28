# Trust Health Signal — Implementation Plan

**Status:** ✅ IMPLEMENTED (flags OFF — awaiting real traffic)  
**Author:** Cascade (Lead Architect)  
**Date:** February 19, 2026  
**Audience:** Developers  
**Pillar:** 4 of 6

---

## Architecture Overview

```
Data Flow:
  Existing Analytics (OBP views, menu views, action clicks)
    ↓ (already tracked via unified analytics)
  Nightly Cloud Function (trustHealthComputation)
    ↓ (reads daily analytics docs, computes weekly aggregates)
  Store Document (trust health field)
    ↓ (simple field on store doc: trustHealthState)
  Dashboard Component (TrustHealthCard)
    ↓ (reads from store data already in session/SWR)
  Owner sees: "Customer Trust: Strong"
```

## Database Schema

### No New Collections

Trust health state stored as a field on existing store document:

```typescript
// Addition to StoreDataType
interface StoreDataType {
  // ... existing fields
  healthSignals?: {
    trust?: {
      state: "strong" | "stable" | "weak";
      computedAt: Timestamp;
      dataPoints: number; // weeks of data used
      visible: boolean; // meets visibility threshold
    };
    loyalty?: {
      /* same shape - Pillar 5 */
    };
    risk?: {
      /* same shape - Pillar 6 */
    };
  };
}
```

### Why Single Field on Store Doc

- Zero new collections = zero additional Firestore cost
- Read is free (store doc already loaded in session)
- Write is 1 per store per week (nightly computation)
- Follows existing pattern (OBP analytics summary)

---

## Cloud Function: Trust Health Computation

### Scheduler

- **Frequency:** Weekly (Sunday 3 AM UTC, after existing nightly aggregation)
- **Runtime:** Added to existing `masterScheduler.ts`
- **Memory:** 256MiB (lightweight aggregation)
- **Timeout:** 120s

### Logic

```typescript
// functions/src/analytics/trustHealthComputation.ts

async function computeTrustHealth(
  db: Firestore,
  tId: number,
  sId: number,
): Promise<TrustHealthState> {
  // 1. Get last 8 weeks of daily analytics
  const dailyDocs = await getDailyAnalytics(db, tId, sId, 56); // 56 days

  // 2. Check visibility threshold
  const recentWeeks = groupByWeek(dailyDocs);
  const weeksWithSufficientTraffic = recentWeeks.filter(
    (w) => w.uniqueVisitors >= 50,
  );
  if (weeksWithSufficientTraffic.length < 4) {
    return { state: "stable", visible: false, dataPoints: 0 };
  }

  // 3. Compute trend signals (last 4 weeks)
  const volumeTrend = computeVolumeTrend(recentWeeks);
  const directRatio = computeDirectVisitRatio(recentWeeks);
  const engagementDepth = computeEngagementDepth(recentWeeks);
  const consistency = computeConsistency(recentWeeks);

  // 4. Weighted score
  const score =
    volumeTrend * 0.3 +
    directRatio * 0.25 +
    engagementDepth * 0.25 +
    consistency * 0.2;

  // 5. Map to state
  const state = score >= 0.65 ? "strong" : score >= 0.4 ? "stable" : "weak";

  return {
    state,
    visible: true,
    dataPoints: weeksWithSufficientTraffic.length,
    computedAt: Timestamp.now(),
  };
}
```

### Trend Computation Details

| Signal           | Method                                           | Score Range               |
| ---------------- | ------------------------------------------------ | ------------------------- |
| Volume Trend     | Compare last 2 weeks avg vs previous 2 weeks avg | 0-1 (1 = growing)         |
| Direct Ratio     | Direct visits / total visits (week avg)          | 0-1 (1 = all direct)      |
| Engagement Depth | Avg actions per visit (menu opens, clicks)       | 0-1 (normalized)          |
| Consistency      | Coefficient of variation of daily visitors       | 0-1 (1 = very consistent) |

---

## File Structure

| File                                                                               | Purpose                               | LOC  | Status      |
| ---------------------------------------------------------------------------------- | ------------------------------------- | ---- | ----------- |
| `functions/src/analytics/healthSignalsComputation.ts`                              | Weekly trust+loyalty+risk computation | ~290 | ✅ NEW      |
| `functions/src/schedulers/masterScheduler.ts`                                      | Added Task 5 (Sunday weekly)          | ~40  | ✅ MODIFIED |
| `src/components/templates/main-app/dashboard/OwnerDashboard/HealthSignalCards.tsx` | Desktop cards (Trust+Loyalty+Risk)    | ~170 | ✅ NEW      |
| `src/components/mobile/screens/MobileDashboardScreen.tsx`                          | Mobile health signal display          | ~60  | ✅ MODIFIED |
| `src/types/platform/store.ts`                                                      | `healthSignals` on StoreDataType      | ~30  | ✅ MODIFIED |

**Total new code:** ~590 lines across 2 new files + 3 modified files

---

## Frontend: TrustHealthCard

```typescript
// Simplified display component
function TrustHealthCard({ store }: { store: StoreDataType }) {
  const trust = store.healthSignals?.trust;

  if (!trust?.visible) return null; // Hide if insufficient data

  const stateColors = {
    strong: '#52c41a',
    stable: '#1890ff',
    weak: '#faad14'
  };

  return (
    <Card size="small">
      <Text type="secondary">Customer Trust</Text>
      <Title level={4} style={{ color: stateColors[trust.state] }}>
        {capitalize(trust.state)}
      </Title>
      <Text type="secondary" style={{ fontSize: 12 }}>
        Based on visitor trends
      </Text>
    </Card>
  );
}
```

---

## Security Checklist

- [x] No individual visitor data stored
- [x] Aggregate computations only
- [x] Trust state not exposed on public pages
- [x] Tenant-isolated computation
- [x] Feature flag gated

---

## Testing Guide

1. Set `ENABLE_TRUST_HEALTH_SIGNAL: true`
2. Populate 4+ weeks of daily analytics data (test seed)
3. Run trust health computation manually
4. Verify state appears on dashboard
5. Verify hides when insufficient data
6. Verify mobile display

---

**Last Updated:** February 19, 2026

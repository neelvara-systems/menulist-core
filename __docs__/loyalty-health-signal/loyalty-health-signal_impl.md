# Loyalty Health Signal — Implementation Plan

**Status:** ✅ IMPLEMENTED (flags OFF — awaiting real traffic)  
**Author:** Cascade (Lead Architect)  
**Date:** February 19, 2026  
**Audience:** Developers  
**Pillar:** 5 of 6

---

## Architecture Overview

Shares infrastructure with Trust Health Signal (Pillar 4). Same Cloud Function, same store document field, same computation schedule.

```
Existing Analytics → Weekly Computation → store.healthSignals.loyalty → Dashboard Card
```

## Database Schema

Uses same `healthSignals` object on store document as Trust Signal:

```typescript
healthSignals?: {
  trust?: { state, computedAt, dataPoints, visible };
  loyalty?: {
    state: 'strong' | 'stable' | 'weak';
    computedAt: Timestamp;
    dataPoints: number;
    visible: boolean;
  };
  risk?: { /* Pillar 6 */ };
};
```

## Cloud Function

Added to same `trustHealthComputation.ts` (renamed to `healthSignalsComputation.ts`):

```typescript
async function computeLoyaltyHealth(
  db: Firestore,
  tId: number,
  sId: number,
): Promise<LoyaltyHealthState> {
  const dailyDocs = await getDailyAnalytics(db, tId, sId, 56);
  const recentWeeks = groupByWeek(dailyDocs);

  // Visibility threshold
  if (qualifyingWeeks(recentWeeks) < 4) {
    return { state: "stable", visible: false, dataPoints: 0 };
  }

  // Return ratio: totalViews / uniqueVisitors (higher = more returning)
  const returnRatio = computeReturnRatio(recentWeeks);
  // Frequency: average visits per unique visitor per week
  const frequency = computeVisitFrequency(recentWeeks);
  // Trend: is return ratio improving or declining
  const loyaltyTrend = computeLoyaltyTrend(recentWeeks);

  const score = returnRatio * 0.4 + frequency * 0.3 + loyaltyTrend * 0.3;
  const state = score >= 0.6 ? "strong" : score >= 0.35 ? "stable" : "weak";

  return {
    state,
    visible: true,
    dataPoints: qualifyingWeeks(recentWeeks),
    computedAt: Timestamp.now(),
  };
}
```

## File Structure

No additional files beyond what Pillar 4 creates. Loyalty computation is added to same health signals function:

| File                                                  | Change                                    |
| ----------------------------------------------------- | ----------------------------------------- |
| `functions/src/analytics/healthSignalsComputation.ts` | Add `computeLoyaltyHealth()` (~100 lines) |
| `src/components/.../LoyaltyHealthCard.tsx`            | Dashboard display (~50 lines)             |

**Total additional code:** ~150 lines

## Frontend: LoyaltyHealthCard

Same pattern as TrustHealthCard:

```typescript
function LoyaltyHealthCard({ store }: { store: StoreDataType }) {
  const loyalty = store.healthSignals?.loyalty;
  if (!loyalty?.visible) return null;
  return (
    <Card size="small">
      <Text type="secondary">Customer Loyalty</Text>
      <Title level={4}>{capitalize(loyalty.state)}</Title>
      <Text type="secondary" style={{ fontSize: 12 }}>Based on return patterns</Text>
    </Card>
  );
}
```

---

## Firebase Cost

**Incremental cost: ~₹2/month for 100 stores**

Shares reads with trust signal computation (same daily analytics docs). Only adds 1 additional write field per store per week (part of same `healthSignals` update).

---

**Last Updated:** February 19, 2026

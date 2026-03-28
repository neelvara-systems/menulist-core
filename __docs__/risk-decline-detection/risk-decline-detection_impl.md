# Risk / Decline Detection — Implementation Plan

**Status:** ✅ IMPLEMENTED (flags OFF — requires Pillars 4+5 active with traffic)  
**Author:** Cascade (Lead Architect)  
**Date:** February 19, 2026  
**Audience:** Developers  
**Pillar:** 6 of 6

---

## Architecture Overview

```
store.healthSignals.trust.state   ─┐
store.healthSignals.loyalty.state  ─┼─→ Risk Engine → store.healthSignals.risk.state
Engagement trend (weekly)          ─┘
```

## Database Schema

Same `healthSignals` object on store doc:

```typescript
healthSignals?: {
  trust?: { state, computedAt, dataPoints, visible };
  loyalty?: { state, computedAt, dataPoints, visible };
  risk?: {
    state: 'stable' | 'watch' | 'at_risk';
    computedAt: Timestamp;
    visible: boolean;
    consecutiveWeakWeeks: number; // track duration
  };
};
```

## Cloud Function

Added to `healthSignalsComputation.ts` — runs AFTER trust and loyalty computation:

```typescript
function computeRiskState(
  trust: TrustHealthState,
  loyalty: LoyaltyHealthState,
  engagementTrend: number, // -1 to 1
  previousRisk: RiskState | undefined,
): RiskState {
  // Prerequisites
  if (!trust.visible || !loyalty.visible) {
    return { state: "stable", visible: false, consecutiveWeakWeeks: 0 };
  }

  const trustWeak = trust.state === "weak";
  const loyaltyWeak = loyalty.state === "weak";
  const engagementDeclining = engagementTrend < -0.2;

  // Count consecutive weak weeks
  const prevWeakWeeks = previousRisk?.consecutiveWeakWeeks || 0;
  const anyWeak = trustWeak || loyaltyWeak || engagementDeclining;
  const consecutiveWeakWeeks = anyWeak ? prevWeakWeeks + 1 : 0;

  // Determine state
  let state: "stable" | "watch" | "at_risk" = "stable";

  if (trustWeak && loyaltyWeak) state = "at_risk";
  else if (consecutiveWeakWeeks >= 3) state = "at_risk";
  else if (trustWeak || loyaltyWeak) state = "watch";
  else if (engagementDeclining) state = "watch";

  return {
    state,
    visible: true,
    consecutiveWeakWeeks,
    computedAt: Timestamp.now(),
  };
}
```

## File Structure

| File                                                  | Change                               |
| ----------------------------------------------------- | ------------------------------------ |
| `functions/src/analytics/healthSignalsComputation.ts` | Add `computeRiskState()` (~80 lines) |
| `src/components/.../BusinessHealthCard.tsx`           | Dashboard display (~60 lines)        |

**Total additional code:** ~140 lines

## Frontend: BusinessHealthCard

```typescript
function BusinessHealthCard({ store }: { store: StoreDataType }) {
  const risk = store.healthSignals?.risk;
  if (!risk?.visible) return null;

  const stateConfig = {
    stable: { color: '#52c41a', label: 'Stable' },
    watch: { color: '#faad14', label: 'Watch' },
    at_risk: { color: '#ff4d4f', label: 'At Risk' }
  };

  const config = stateConfig[risk.state];

  return (
    <Card size="small">
      <Text type="secondary">Business Health</Text>
      <Title level={4} style={{ color: config.color }}>{config.label}</Title>
      <Text type="secondary" style={{ fontSize: 12 }}>Based on overall trends</Text>
    </Card>
  );
}
```

---

## Firebase Cost

**Incremental cost: ~₹1/month for 100 stores**

Uses trust + loyalty states already computed. Only adds risk state derivation (pure logic, no additional reads) and one field write.

---

## Testing Guide

1. Enable all health signal flags
2. Seed test data with declining patterns over 4+ weeks
3. Run health signals computation
4. Verify risk state transitions correctly:
   - Both strong → Stable
   - One weak → Watch
   - Both weak → At Risk
   - 3+ consecutive weak weeks → At Risk
5. Verify mobile display

---

**Last Updated:** February 19, 2026

# Trust Health Signal (Pillar 4)

> **"Do customers still trust this business?"**

**Created:** February 19, 2026  
**Pillar:** 4 of 6 — Customer-Facing Infrastructure  
**Status:** Dormant implementation skeleton; all flags OFF and no scheduler/UI consumer wired
**Parent:** [`__docs__/customer-facing-infrastructure/`](../customer-facing-infrastructure/README.md)

---

## Quick Navigation

| Document                                                  | Audience     | Purpose                              |
| --------------------------------------------------------- | ------------ | ------------------------------------ |
| [Spec](./trust-health-signal_spec.md)                     | CEO, PM      | Business requirements, signal design |
| [Impl](./trust-health-signal_impl.md)                     | Developers   | Technical architecture, computation  |
| [Marketing](./trust-health-signal_marketing.md)           | Sales        | Pitch deck, messaging                |
| [Website](./trust-health-signal_website.md)               | Public       | Landing page content                 |
| [Help Doc](./trust-health-signal_helpdoc.md)              | Customers    | How trust signal works               |
| [Firebase](./trust-health-signal_firebase.md)             | Cost Control | Computation cost estimates           |
| [Mobile Support](./trust-health-signal_mobile-support.md) | Internal     | Mobile display assessment            |

---

## One-Liner

A single calm signal that tells business owners whether customer trust is holding steady or weakening — without charts, percentages, or dashboards.

## Problem Solved

Every business owner constantly wonders: "Do customers still trust us?" They rely on gut feeling, daily sales, and random comments — none reliable. MenuList can give a calm, behavior-based trust signal derived from aggregate visitor patterns on public pages.

## Current Runtime Truth — July 17, 2026

- `ENABLE_TRUST_HEALTH_SIGNAL`, `ENABLE_LOYALTY_HEALTH_SIGNAL`, and `ENABLE_RISK_DECLINE_DETECTION` exist and are `false`.
- `functions/src/analytics/healthSignalsComputation.ts` is retained and regression-tested as dormant logic, but no exported Cloud Function or consolidated scheduler task calls it.
- `HealthSignalCards.tsx` exists but is not mounted by the owner dashboard, and there is no mobile health-signal consumer.
- Current runtime performs zero health-signal reads/writes. Activation requires exact unique/direct aggregate counters, a bounded scheduler task with lease/cost evidence, desktop/mobile wiring, emulator coverage, and an explicit flag decision.
- The retained processor now rejects with `HEALTH_SIGNALS_DORMANT_UNVALIDATED_COUNTERS` before any store scan. Summed daily unique counts are not weekly distinct visitors, and view ratios do not prove trust or returning customers. Activation requires validated weekly distinct and returning-customer counters rather than relabeling the current proxies.

## Target Architecture (Not Active Runtime)

```
Aggregate Visitor Data (existing analytics infrastructure)
  ↓
Weekly Computation (Cloud Function, nightly scheduler)
  ├── Visitor volume trend (week-over-week)
  ├── Direct visit ratio (returning vs new)
  ├── Engagement stability (time, interaction patterns)
  └── Cross-reference with reputation data (if available)
  ↓
Trust State Engine
  ├── Strong   → Patterns stable or improving
  ├── Stable   → Normal variance
  └── Weak     → Declining trends detected
  ↓
Owner Dashboard (single word only)
  └── "Customer Trust: Strong" / "Stable" / "Weak"
```

## Feature Flag

```typescript
ENABLE_TRUST_HEALTH_SIGNAL: false; // Present and intentionally dormant
```

## Key Design Principle

**Signal, not analytics.** Owner sees ONE WORD. No charts. No percentages. No dashboards. This is infrastructure awareness, not a data product.

## Prerequisites Before Implementation

1. **Real traffic** — Minimum 50+ unique visitors/week for 4+ consecutive weeks
2. **Baseline formation** — 4-6 weeks of stable data before first signal
3. **Aggregate analytics** — Must use privacy-safe aggregate patterns (no individual tracking)
4. **India DPDPA compliance** — Review privacy requirements for even aggregate tracking

## Success Test

> **Owner sees "Customer Trust: Weak" and takes it seriously.**
> If they ignore it → signal not credible → pillar failed.

---

**Last Updated:** July 17, 2026

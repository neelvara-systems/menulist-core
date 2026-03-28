# Loyalty Health Signal (Pillar 5)

> **"Are customers still returning?"**

**Created:** February 19, 2026  
**Pillar:** 5 of 6 — Customer-Facing Infrastructure  
**Status:** ✅ IMPLEMENTED (flags OFF — awaiting real traffic)  
**Parent:** [`__docs__/customer-facing-infrastructure/`](../customer-facing-infrastructure/README.md)

---

## Quick Navigation

| Document                                                    | Audience     | Purpose                              |
| ----------------------------------------------------------- | ------------ | ------------------------------------ |
| [Spec](./loyalty-health-signal_spec.md)                     | CEO, PM      | Business requirements, signal design |
| [Impl](./loyalty-health-signal_impl.md)                     | Developers   | Technical architecture, computation  |
| [Marketing](./loyalty-health-signal_marketing.md)           | Sales        | Pitch deck, messaging                |
| [Website](./loyalty-health-signal_website.md)               | Public       | Landing page content                 |
| [Help Doc](./loyalty-health-signal_helpdoc.md)              | Customers    | How loyalty signal works             |
| [Firebase](./loyalty-health-signal_firebase.md)             | Cost Control | Computation cost estimates           |
| [Mobile Support](./loyalty-health-signal_mobile-support.md) | Internal     | Mobile display assessment            |

---

## One-Liner

A single calm signal that tells business owners whether customers are coming back consistently — without CRM, loyalty programs, or analytics dashboards.

## Problem Solved

77.4% of restaurant guests never return (Bloom Intelligence 2025). Owners don't know their return rate. They rely on recognizing faces and gut feeling. MenuList can detect returning visit patterns from aggregate analytics and give a simple loyalty health signal.

## Architecture Overview

```
Aggregate Visitor Analytics (existing infrastructure)
  ↓
Weekly Computation (Cloud Function, shared with trust signal)
  ├── Return visit ratio (aggregate returning vs new visitors)
  ├── Visit frequency stability (consistency of repeat patterns)
  └── Loyalty trend (improving, stable, or declining)
  ↓
Loyalty State Engine
  ├── Strong   → Healthy return patterns
  ├── Stable   → Normal return behavior
  └── Weak     → Return visits declining
  ↓
Owner Dashboard (single word only)
  └── "Customer Loyalty: Strong" / "Stable" / "Weak"
```

## Feature Flag

```typescript
ENABLE_LOYALTY_HEALTH_SIGNAL: false; // To be added to features.ts
```

## Relationship to Trust Signal (Pillar 4)

Trust = belief (do they trust this place?)  
Loyalty = behavior (do they come back?)

Same computation infrastructure, different input signals. Computed in same Cloud Function batch.

## Success Test

> **Owner should feel: "MenuList helps me know if people still love coming here."**
> Not: "MenuList shows retention analytics."

---

**Last Updated:** February 19, 2026

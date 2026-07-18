# Risk / Decline Detection (Pillar 6)

> **"Is my business silently getting weaker?"**

**Created:** February 19, 2026  
**Pillar:** 6 of 6 — Customer-Facing Infrastructure  
**Status:** Dormant implementation skeleton; flag OFF and prerequisite signals inactive
**Parent:** [`__docs__/customer-facing-infrastructure/`](../customer-facing-infrastructure/README.md)

---

## Quick Navigation

| Document                                                     | Audience     | Purpose                              |
| ------------------------------------------------------------ | ------------ | ------------------------------------ |
| [Spec](./risk-decline-detection_spec.md)                     | CEO, PM      | Business requirements, signal design |
| [Impl](./risk-decline-detection_impl.md)                     | Developers   | Technical architecture, computation  |
| [Marketing](./risk-decline-detection_marketing.md)           | Sales        | Pitch deck, messaging                |
| [Website](./risk-decline-detection_website.md)               | Public       | Landing page content                 |
| [Help Doc](./risk-decline-detection_helpdoc.md)              | Customers    | How risk detection works             |
| [Firebase](./risk-decline-detection_firebase.md)             | Cost Control | Computation cost estimates           |
| [Mobile Support](./risk-decline-detection_mobile-support.md) | Internal     | Mobile display assessment            |

---

## One-Liner

An early warning signal that combines trust, loyalty, and engagement trends to detect if a business is silently declining — before revenue drops.

## Problem Solved

Businesses rarely collapse suddenly. They decline slowly over 3-6 months: repeat visits drop, engagement weakens, trust erodes. Owners notice too late — after revenue has already fallen. MenuList can detect the pattern earlier by combining signals from Pillars 4 and 5 with engagement data.

## Current Runtime Truth — July 17, 2026

The risk helper is retained but not exported or scheduled, its desktop component is unmounted, no mobile consumer exists, and `ENABLE_RISK_DECLINE_DETECTION` is intentionally `false`. Trust and loyalty are also dormant, so no current risk read/write pipeline exists. The diagram below is a target design only.

Risk cannot become owner-facing truth while trust or loyalty is derived from an unvalidated visitor proxy. The shared processor now rejects before store discovery; activation must prove both prerequisite inputs, freshness, retry idempotency, and the owner-safe meaning of every state.

## Target Architecture (Not Active Runtime)

```
Trust Signal (Pillar 4) + Loyalty Signal (Pillar 5) + Engagement Trends
  ↓
Risk Engine (combined weighted signal)
  ├── Stable    → All signals healthy
  ├── Watch     → One or more signals weakening
  └── At Risk   → Multiple signals declining together
  ↓
Owner Dashboard
  └── "Business Health: Stable" / "Watch" / "At Risk"
```

## Feature Flag

```typescript
ENABLE_RISK_DECLINE_DETECTION: false; // Present and intentionally dormant
```

## Dependency Chain

This pillar REQUIRES Pillars 4 and 5 to be active first. It is a meta-signal combining their outputs.

| Dependency                        | Status        |
| --------------------------------- | ------------- |
| Trust Health Signal (Pillar 4)    | 🆕 Documented |
| Loyalty Health Signal (Pillar 5)  | 🆕 Documented |
| Existing analytics infrastructure | ✅ Built      |

## Success Test

> **Owner believes: "If my business starts weakening, MenuList will know before I do."**
> That's when this becomes irreplaceable.

---

**Last Updated:** July 17, 2026

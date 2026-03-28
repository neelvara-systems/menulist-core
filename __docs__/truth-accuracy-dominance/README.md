# Truth & Accuracy Dominance (Pillar 2)

> **MenuList becomes the most trusted source of business info.**

**Created:** February 19, 2026  
**Pillar:** 2 of 6 — Customer-Facing Infrastructure  
**Status:** ✅ STRUCTURALLY COMPLETE — Reliability discipline ongoing  
**Parent:** [`__docs__/customer-facing-infrastructure/`](../customer-facing-infrastructure/README.md)

---

## Quick Navigation

| Document | Audience | Purpose |
|----------|----------|---------|
| [Spec](./truth-accuracy-dominance_spec.md) | CEO, PM | Business requirements, truth guarantees |
| [Firebase](./truth-accuracy-dominance_firebase.md) | Cost Control | Zero additional cost |
| [Mobile Support](./truth-accuracy-dominance_mobile-support.md) | Internal | Mobile accuracy checks |

---

## One-Liner

Customers trust MenuList info more than Google, Instagram, or PDFs — because it's always correct.

## Problem Solved

Customers face wrong menus, wrong prices, wrong hours. 73% only trust info from the last 30 days. MenuList ensures what customers see is always accurate — menu, prices, hours, availability — within 60 seconds of any change.

## Architecture Overview

```
ALREADY BUILT — Truth Stack:
  ├── Menu Correctness Engine (MCE)     ← 17 validation rules, publish-gate
  ├── Versioned Publishing              ← Atomic, no half-states
  ├── 60s Propagation                   ← unstable_cache TTL across all surfaces
  ├── Hours Status Display              ← Open/Closed badge, real-time
  ├── Per-Item Availability             ← Available/Unavailable toggles
  ├── Zero-Blank Guarantee              ← MCE blocks empty menus
  └── Multi-Surface Sync               ← OBP, digital menu, screens, QR all in sync
```

## Key Existing Files

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/mce/correctnessResolver.ts` | 17 validation rules | ✅ Built |
| `src/lib/mce/index.ts` | MCE entry point | ✅ Built |
| `src/config/features.ts` | `ENABLE_MCE: false` | ✅ Built |
| `src/components/.../Editor.tsx` | Publish-Gate | ✅ Built |
| `src/lib/obp/hoursStatus.ts` | Open/closed calculator | ✅ Built |

## Feature Flags

```typescript
ENABLE_MCE: false           // Menu Correctness Engine
ENABLE_HOURS_STATUS_DISPLAY: true  // Hours badge
```

## Success Test

> **Ask owner: "Do you ever worry customers are seeing wrong info?"**
> If answer: "No, MenuList handles it." → Pillar won.

## Dependencies

All built. This pillar is about **maintenance discipline**, not new engineering.

---

**Last Updated:** February 19, 2026

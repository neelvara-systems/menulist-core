# Truth & Accuracy Dominance (Pillar 2)

> **MenuList becomes the most trusted source of business info.**

**Created:** February 19, 2026  
**Pillar:** 2 of 6 — Customer-Facing Infrastructure  
**Status:** Source-gated pillar reference; not current launch certification
**Parent:** [`__docs__/customer-facing-infrastructure/`](../customer-facing-infrastructure/README.md)

---

## Quick Navigation

| Document | Audience | Purpose |
|----------|----------|---------|
| [Spec](./truth-accuracy-dominance_spec.md) | CEO, PM | Business requirements and source boundaries |
| [Firebase](./truth-accuracy-dominance_firebase.md) | Cost Control | Firebase cost and operation boundary |
| [Mobile Support](./truth-accuracy-dominance_mobile-support.md) | Internal | Mobile source-boundary checks |

---

## One-Liner

Customers use MenuList as the current approved source for supported menu, hours, availability, and business-info surfaces.

## Problem Solved

Customers face wrong menus, wrong prices, and wrong hours across public channels. MenuList keeps supported customer-facing surfaces tied to saved and verified project/store data after each surface's normal refresh, publish, cache, download, or provider flow completes.

Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:public-business-truth`, public menu/OBP/Digital Screens browser and device QA, provider evidence where relevant, target deploy evidence, and production-host smoke.

## Architecture Overview

```
CURRENT SOURCE-BOUNDARY STACK:
  ├── Menu Correctness Engine (MCE)     ← Active validation and publish gate
  ├── Versioned Publishing              ← Saved source data plus publish metadata
  ├── Public Cache Window               ← Menu/OBP cache tags and 60-second public cache window
  ├── Hours Status Display              ← Store-hours source and timezone calculation
  ├── Per-Item Availability             ← Available/unavailable source fields
  ├── Show-Less Fallbacks               ← Prefer hidden or fallback output over wrong output
  └── Surface-Specific Refresh          ← Public menu/OBP, screens, PDFs, POS/provider targets need target evidence
```

## Key Existing Files

| File | Purpose | Status |
|------|---------|--------|
| `src/lib/mce/correctnessResolver.ts` | 17 validation rules | ✅ Built |
| `src/lib/mce/index.ts` | MCE entry point | ✅ Built |
| `src/config/features.ts` | `ENABLE_MCE: true` | Active source flag |
| `src/components/.../Editor.tsx` | Publish-Gate | ✅ Built |
| `src/lib/obp/hoursStatus.ts` | Open/closed calculator | ✅ Built |

## Feature Flags

```typescript
ENABLE_MCE: true            // Menu Correctness Engine
ENABLE_HOURS_STATUS_DISPLAY: true  // Hours badge
```

## Success Test

> **Ask owner: "Does the MenuList customer link match the current approved menu and business info after the normal refresh path completes?"**
> If answer: "Yes, MenuList is the source I trust." -> Pillar is working.

## Dependencies

This pillar reference does not approve new runtime behavior by itself. It depends on the current source gates, active public-output QA, deployment evidence, and provider/artifact evidence for each target surface.

---

**Last Updated:** July 4, 2026

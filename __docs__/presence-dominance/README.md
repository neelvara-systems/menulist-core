# Presence Dominance (Pillar 1)

> **MenuList becomes the single official link of the business everywhere.**

**Created:** February 19, 2026  
**Pillar:** 1 of 6 — Customer-Facing Infrastructure  
**Status:** ✅ ENGINEERING DONE + BEHAVIORAL ADOPTION IMPLEMENTED
**Parent:** [`__docs__/customer-facing-infrastructure/`](../customer-facing-infrastructure/README.md)

---

## Quick Navigation

| Document                                                 | Audience     | Purpose                                         |
| -------------------------------------------------------- | ------------ | ----------------------------------------------- |
| [Spec](./presence-dominance_spec.md)                     | CEO, PM      | Business requirements, behavioral adoption plan |
| [Impl](./presence-dominance_impl.md)                     | Developers   | Technical components, nudge system design       |
| [Marketing](./presence-dominance_marketing.md)           | Sales        | Pitch deck, messaging                           |
| [Website](./presence-dominance_website.md)               | Public       | Landing page content                            |
| [Help Doc](./presence-dominance_helpdoc.md)              | Customers    | How to share your official link                 |
| [Firebase](./presence-dominance_firebase.md)             | Cost Control | Zero additional cost (uses existing OBP)        |
| [Mobile Support](./presence-dominance_mobile-support.md) | Internal     | Mobile share flow assessment                    |

---

## One-Liner

Make MenuList the instinctive first link every business owner shares — for everything.

## Problem Solved

Businesses send fragmented links (PDF, Google Maps, Instagram, WhatsApp photos, random images) when customers ask for info. No single canonical link exists. MenuList already built the page (OBP) — now we must make owners **use** it everywhere.

## Architecture Overview

```
ALREADY BUILT:
  OBP page (joespizza.menulist.ai/)     ← ✅ COMPLETE
  QR infrastructure (tent cards, stickers) ← ✅ COMPLETE
  Copy link button (dashboard)            ← ✅ COMPLETE
  Schema.org enrichment                   ← ✅ COMPLETE
  CDN caching (s-maxage=60)              ← ✅ COMPLETE

IMPLEMENTED: Behavioral Adoption Layer:
  Existing dashboard official-source card ← ✅ GUIDANCE EMBEDDED
  OBPLinkCard nudge micro-copy            ← ✅ DONE
  ShareModal behavior-guiding copy        ← ✅ DONE (desktop)
  MobileShareScreen behavior-guiding copy ← ✅ DONE (mobile)
  Post-publish adoption tips              ← ✅ DONE (msg-preview)
  WhatsApp menu-link message              ← ✅ DONE (desktop + mobile)
  Full docs: __docs__/behavior-engineering/
```

## Key Existing Files

| File                                     | Purpose              | Status   |
| ---------------------------------------- | -------------------- | -------- |
| `src/config/features.ts`                 | `ENABLE_OBP: false`  | ✅ Built |
| `src/app/_client/obp/OBPContent.tsx`     | OBP server component | ✅ Built |
| `src/components/.../OBPLinkCard.tsx`     | Dashboard link card  | ✅ Built |
| `src/app/_client/obp/OBPAnalytics.tsx`   | Page view tracking   | ✅ Built |
| Physical surfaces (tent cards, stickers) | QR generation        | ✅ Built |

## Feature Flags

```typescript
ENABLE_OBP: false; // Master toggle — existing
// No new flags needed. Behavioral adoption is UX design, not feature flags.
```

## Success Test

> **If MenuList disappears, owner says: "My main business link is gone."**
> If they say "I'll just send PDF instead" → pillar failed.

## Dependencies

| Dependency                   | Status              |
| ---------------------------- | ------------------- |
| OBP (Official Business Page) | ✅ COMPLETE         |
| URL Routing Architecture     | ✅ COMPLETE         |
| Physical Surfaces (QR)       | ✅ COMPLETE         |
| Mobile UI (share flow)       | ✅ BUILT (flag off) |

---

**Last Updated:** July 17, 2026

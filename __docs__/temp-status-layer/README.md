# Temporary Status Layer

> **"Closed today" / "Special menu only" / "Opening late" — real-time status banners with auto-expiry.**

**Created:** February 19, 2026  
**Source:** ChatGPT Strategic Planning Session — Part 9  
**Status:** ✅ IMPLEMENTED (February 19, 2026)  
**Parent:** [`__docs__/customer-facing-infrastructure/`](../customer-facing-infrastructure/README.md)

---

## Quick Navigation

| Document                                                | Audience     | Purpose                |
| ------------------------------------------------------- | ------------ | ---------------------- |
| [Spec](./temp-status-layer_spec.md)                     | CEO, PM      | Business requirements  |
| [Impl](./temp-status-layer_impl.md)                     | Developers   | Technical architecture |
| [Marketing](./temp-status-layer_marketing.md)           | Sales        | Pitch deck, messaging  |
| [Website](./temp-status-layer_website.md)               | Public       | Landing page content   |
| [Help Doc](./temp-status-layer_helpdoc.md)              | Customers    | How to use temp status |
| [Firebase](./temp-status-layer_firebase.md)             | Cost Control | Storage + expiry cost  |
| [Mobile Support](./temp-status-layer_mobile-support.md) | Internal     | Mobile status toggle   |

---

## One-Liner

Quick temporary banners on the official page — "Closed for private event", "Opening late today" — with automatic expiry.

## Problem Solved

Hours status badge + availability toggles cover 70% of real-time scenarios. The remaining 30%:

- "Closed for private event today"
- "Opening late today"
- "Special menu only (festival)"
- "Temporarily closed for renovation"

These are infrequent but create customer anger when not communicated.

## Architecture Overview

```
Store Document
  └── tempStatus?: {
        type: 'closed_today' | 'opening_late' | 'special_menu' | 'custom';
        message?: string;        // Custom message (max 100 chars)
        expiresAt: Timestamp;    // Auto-remove after this time
        createdAt: Timestamp;
      }
  ↓
OBP + Digital Menu (banner display)
  └── Yellow/orange banner above content when active
  ↓
Auto-expiry (client-side check OR nightly cleanup)
  └── Remove expired statuses
```

## Feature Flag

```typescript
ENABLE_TEMP_STATUS: false; // In src/config/features.ts (added Feb 19, 2026)
```

## Key Files

| File                                                                    | Purpose                             |
| ----------------------------------------------------------------------- | ----------------------------------- |
| `src/types/platform/store.ts`                                           | `tempStatus` field on StoreDataType |
| `src/app/api/store/temp-status/route.ts`                                | API route (set/clear)               |
| `src/components/atoms/TempStatusBanner/index.tsx`                       | Banner for OBP + menu               |
| `src/components/templates/main-app/businessSettings/TempStatusCard.tsx` | Desktop card                        |
| `src/components/mobile/screens/MobileTempStatusScreen.tsx`              | Mobile screen                       |
| `src/app/_client/obp/OBPContent.tsx`                                    | OBP page integration                |
| `src/app/_client/[[...slug]]/page.tsx`                                  | Digital menu integration            |

---

**Last Updated:** February 19, 2026

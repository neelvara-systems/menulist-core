# Temporary Status Layer

> **"Closed today" / "Special menu only" / "Opening late" — real-time status banners with auto-expiry.**

**Created:** February 19, 2026
**Source:** ChatGPT Strategic Planning Session — Part 9
**Status:** ✅ IMPLEMENTED (February 19, 2026)
**Last Source Gate Update:** July 6, 2026
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

## Source Gate

Current source/docs parity is guarded by `npm run verify:temporary-status-boundary`:

```bash
npm run verify:temporary-status-boundary
```

The gate checks the authenticated set/clear route, strict session document-ID admission for tenant/store/actor IDs, hashed write limiter, 4KB body cap, bounded 8KB browser response parser, desktop and mobile optimistic rollback, Mobile Today shortcuts, OBP/menu/feedback/public API expiry guards, public pull API hides expired temporary status values, public cache invalidation, Digital Screens invalidation, Owner Business Assistant cache invalidation, and this doc set.

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
        type: 'closed_today' | 'opening_late' | 'closing_early' | 'kitchen_closed' | 'special_menu' | 'custom';
        message?: string;        // Custom message (max 100 chars)
        expiresAt: string;       // ISO string; public surfaces hide expired statuses
        createdAt: string;
      }
  ↓
OBP + Digital Menu (banner display)
  └── Yellow/orange banner above content when active
  ↓
Auto-expiry (client-side check OR nightly cleanup)
  └── Remove expired statuses
```

## Cache Behavior

Status writes affect customer-facing output, so the API invalidates all public menu tags for the store:

- `menu-store-{storeId}`
- `store-{storeId}`
- `client-stores`
- `screen-data`

Mobile "Mark Closed for Today" uses this temporary status path. Recurring weekday hours remain a separate working-hours edit.

The route also touches the Digital Screens content version with `storeTempStatus` and invalidates the Owner Business Assistant packet cache for the store. Public pages and the public pull API hide expired temporary status values instead of showing stale customer-facing notices.

## Feature Flag

```typescript
ENABLE_TEMP_STATUS: true; // In src/config/features.ts
```

## Key Files

| File                                                                    | Purpose                             |
| ----------------------------------------------------------------------- | ----------------------------------- |
| `src/types/platform/store.ts`                                           | `tempStatus` field on StoreDataType |
| `src/app/api/store/temp-status/route.ts`                                | API route (set/clear)               |
| `src/lib/auth/browserRequestPolicy.ts`                                  | Shared authenticated browser request boundary |
| `src/lib/tempStatus/clientResponse.ts`                                  | Bounded browser response parser     |
| `src/components/atoms/TempStatusBanner/index.tsx`                       | Banner for OBP + menu               |
| `src/components/templates/main-app/businessSettings/TempStatusCard.tsx` | Desktop card                        |
| `src/components/mobile/screens/MobileTempStatusScreen.tsx`              | Mobile screen                       |
| `src/app/client/obp/OBPResolvedSurface.tsx`                             | OBP page integration                |
| `src/app/client/[[...slug]]/page.tsx`                                   | Digital menu integration            |
| `src/app/api/public/v1/business/route.ts`                               | Public pull API active status field |

---

**Last Updated:** July 2, 2026 — source gate, active flag, OBP banner, public API expiry guard, Digital Screens cache, and Owner Business Assistant cache invalidation documented

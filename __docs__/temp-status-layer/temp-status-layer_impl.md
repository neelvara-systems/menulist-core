# Temporary Status Layer — Implementation Plan

**Status:** ✅ IMPLEMENTED
**Author:** Cascade (Lead Architect)
**Date:** February 19, 2026
**Audience:** Developers
**Feature Flag:** `ENABLE_TEMP_STATUS`
**Last Source Gate Update:** July 2, 2026

---

## Source Gate

This implementation doc is source-gated by `npm run verify:temporary-status-boundary`.

Current source contract:

- `POST /api/store/temp-status` is dynamic, authenticated with `withAuth()`, feature-gated by `ENABLE_TEMP_STATUS`, scoped to the session tenant/store, and requires `MANAGE_STORE` or `MANAGE_PUBLIC_PRESENCE`.
- The route uses the `DATA_WRITE` limiter with hashed owner/store key segments, reads at most 4KB of JSON, validates with Zod, rejects past expiries, writes only the existing store document `tempStatus` field, and returns fixed owner-safe failure copy.
- Successful set/clear writes revalidate `menu-store-{storeId}`, `store-{storeId}`, `client-stores`, and `screen-data`, touch the Digital Screens content version with `storeTempStatus`, and invalidate the Owner Business Assistant packet cache.
- Desktop Business Settings, Mobile Temporary Status, and Mobile Today/Hours shortcuts call the route through `AUTH_BROWSER_REQUEST_POLICY`, parse responses with the shared 8KB bounded parser, and roll back optimistic local state unless `{ success: true }` is confirmed.
- Public output renders through `TempStatusBanner` on OBP, digital menu, and feedback surfaces; the banner hides expired statuses. The public pull API hides expired temporary status values by returning `tempStatus: null`.

Historical blueprint sections below remain useful context, but the source gate above is the current launch boundary.

## Architecture Overview

```
Owner sets temp status (Dashboard / Mobile)
  ↓
API Route: POST /api/store/temp-status
  ├── withAuth() + session-scoped store permission
  ├── Zod validation (type, message, expiresAt)
  └── updateDoc() on store document (tempStatus field)
  ↓
Store Document (tempStatus field)
  ↓
Client Pages (OBP + Digital Menu)
  ├── Server-side: Read tempStatus from store data (already loaded)
  ├── Check expiry: if expiresAt < now → hide banner
  └── Display: Yellow/orange banner above content
  ↓
Auto-expiry:
  ├── Client-side: Banner hides when expiresAt passes (real-time check)
  └── Nightly cleanup CF (optional): Clear expired tempStatus fields
```

---

## Database Schema

### No New Collections

Single field addition to existing store document:

```typescript
// Addition to StoreDataType (src/types/platform/store.ts)
tempStatus?: {
  type: 'closed_today' | 'opening_late' | 'closing_early' | 'kitchen_closed' | 'special_menu' | 'custom';
  message?: string;        // Custom message (max 100 chars), optional for predefined types
  expiresAt: string;       // ISO 8601 string (Firestore-safe, timezone-aware)
  createdAt: string;       // ISO 8601 string
  createdBy?: string;      // userId who set the status
};
```

**Why ISO strings instead of Timestamps:** Store doc is read by both server components (firebase-admin) and client components (firebase/firestore). ISO strings are universally serializable.

---

## API Contract

### POST /api/store/temp-status

**Purpose:** Set or clear temporary status on a store.
**Feature gate:** `ENABLE_TEMP_STATUS` is checked in the route before permission, rate-limit, body parsing, or writes.
**Rate limit:** Existing `DATA_WRITE` limiter keyed by hashed owner/store segments.
**Browser request policy:** desktop Business Settings, mobile Temporary Status, and mobile Today/Hours shortcuts call this route through the shared `AUTH_BROWSER_REQUEST_POLICY` from `src/lib/auth/browserRequestPolicy.ts`. That keeps requests uncached, same-origin, and manual-redirect before shared bounded response parsing.

```typescript
// Request body
const TempStatusSchema = z.object({
  action: z.enum(['set', 'clear']),
  // Required when action === 'set'
  type: z.enum(['closed_today', 'opening_late', 'closing_early', 'kitchen_closed', 'special_menu', 'custom']).optional(),
  message: z.string().max(100).optional(),
  expiresAt: z.string().datetime().optional(), // ISO 8601
});

// Response
{ success: true }
// or
{ error: string, status: 400 | 403 | 500 }
```

**Browser response boundary:** Desktop Business Settings, mobile Temporary Status, and mobile Today/Hours shortcuts route responses through `src/lib/tempStatus/clientResponse.ts`. The helper caps JSON at 8KB, logs `temp_status_response_parse_failed` for malformed/oversized responses, logs `temp_status_response_invalid` for invalid successful envelopes, and only lets optimistic UI state remain after `{ success: true }`.

**Security:**

- `withAuth()` plus `MANAGE_STORE` or `MANAGE_PUBLIC_PRESENCE` — Only authorized store users can set status
- Tenant/store identity comes from the authenticated session, not from request body fields
- 4KB bounded JSON body before Zod validation
- Zod validation before any DB operation
- Rate limit: `DATA_WRITE` (50 req/min)
- Unexpected update failures log `store_temp_status_update_failed` through bounded runtime diagnostics only
- Browser callers use no-store, same-origin credentials, and manual redirect handling, then cap response JSON at 8KB and require `{ success: true }` before keeping optimistic desktop/mobile state

---

## File Structure

| File                                                                    | Purpose                                | LOC  | Status      |
| ----------------------------------------------------------------------- | -------------------------------------- | ---- | ----------- |
| `src/types/platform/store.ts`                                           | Add `tempStatus` type to StoreDataType | ~15  | ✅ MODIFIED |
| `src/app/api/store/temp-status/route.ts`                                | API route to set/clear temp status     | ~105 | ✅ NEW      |
| `src/lib/tempStatus/clientResponse.ts`                                  | Bounded browser response parser        | ~105 | ✅ NEW      |
| `src/components/atoms/TempStatusBanner/index.tsx`                       | Banner component for OBP + menu        | ~50  | ✅ NEW      |
| `src/components/atoms/TempStatusBanner/tempStatusBanner.module.scss`    | Banner styles                          | ~30  | ✅ NEW      |
| `src/app/client/obp/OBPResolvedSurface.tsx`                             | Add TempStatusBanner above identity    | ~5   | ✅ MODIFIED |
| `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx` | Add TempStatusBanner above menu        | ~5   | ✅ MODIFIED |
| `src/app/feedback/[projectId]/page.tsx`                                 | Add TempStatusBanner above feedback    | ~5   | ✅ MODIFIED |
| `src/app/api/public/v1/business/route.ts`                               | Return active tempStatus only          | ~15  | ✅ MODIFIED |
| `src/components/templates/main-app/businessSettings/TempStatusCard.tsx` | Desktop dashboard card                 | ~215 | ✅ NEW      |
| `src/components/mobile/screens/MobileTempStatusScreen.tsx`              | Mobile status toggle screen            | ~260 | ✅ NEW      |
| `src/components/mobile/screens/MobileMoreScreen.tsx`                    | Add temp status nav item + routing     | ~15  | ✅ MODIFIED |

**Total new code:** ~660 lines across 4 new files + 4 modified files

---

## Implementation Details

### Phase 1: Type + API

1. Add `tempStatus` type to `StoreDataType`
2. Create API route with full security (withAuth, verifyTenantAccess, Zod, rate limit)
3. Revalidate customer-facing cache tags after every set/clear: `menu-store-{storeId}`, `store-{storeId}`, `client-stores`, and `screen-data`
4. Touch Digital Screens content version and invalidate the Owner Business Assistant packet cache

### Phase 2: Customer-Facing Banner

1. Create `TempStatusBanner` atom component
2. Add to OBP page (server component — read from store data)
3. Add client-side expiry check (hide when expired)
4. Keep the public pull API on the same expiry boundary so expired statuses return `null`

### Phase 3: Owner Controls (Desktop)

1. Create `TempStatusCard` for Business Settings
2. Status type selector (4 options)
3. Custom message input (when type=custom)
4. Expiry picker (DatePicker)
5. Set/Clear buttons

### Phase 4: Owner Controls (Mobile)

1. Create `MobileTempStatusScreen`
2. Use temporary status for one-day close actions. Regular weekday hour edits remain explicit working-hours updates and are labeled as recurring schedule edits.
2. ActionSheet for type selection
3. DatePicker for expiry
4. Wire into MobileMoreScreen navigation
5. Optimistic update pattern with shared bounded response validation before state is kept

---

## Security Checklist

- [x] API route uses `withAuth()`
- [x] Tenant access verified with `verifyTenantAccess()`
- [x] Input validated with Zod schema
- [x] Rate limiting configured (DATA_WRITE)
- [x] No new Firestore collections (field on existing doc)
- [x] No sensitive data in logs
- [x] Feature flag gated (`ENABLE_TEMP_STATUS`)
- [x] Browser response parser caps JSON at 8KB and validates `{ success: true }`

---

## Firebase Cost

**Zero additional reads.** Store document is already loaded on every OBP/menu page visit. `tempStatus` is just another field on that document.

| Operation                | Frequency         | Cost       |
| ------------------------ | ----------------- | ---------- |
| Write tempStatus (set)   | ~2/week per store | Negligible |
| Write tempStatus (clear) | ~2/week per store | Negligible |
| Read (part of store doc) | 0 extra reads     | ₹0         |

Cache revalidation has no Firestore cost. It only clears public Next.js cache tags so OBP and menu pages pick up the status change promptly.
Digital Screens content-version touch and Owner Business Assistant cache invalidation are also cache/metadata invalidations, not extra store reads.

---

## Testing Guide

1. Enable `ENABLE_TEMP_STATUS: true` in features.ts
2. Open Business Settings → Temp Status card should appear
3. Set "Closed Today" with 24hr expiry
4. Visit OBP page → yellow banner should show "Closed today"
5. Clear status → banner should disappear
6. Set status with past expiry → banner should NOT show (expired)
7. Test mobile: MobileMoreScreen → "Temporary Status" → set/clear
8. Test custom message: type "custom", message "Private event tonight"
9. Verify feature flag: set `ENABLE_TEMP_STATUS: false` → no card, no banner

---

**Last Updated:** July 2, 2026

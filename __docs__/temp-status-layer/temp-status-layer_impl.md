# Temporary Status Layer — Implementation Plan

**Status:** ✅ IMPLEMENTED  
**Author:** Cascade (Lead Architect)  
**Date:** February 19, 2026  
**Audience:** Developers  
**Feature Flag:** `ENABLE_TEMP_STATUS`

---

## Architecture Overview

```
Owner sets temp status (Dashboard / Mobile)
  ↓
API Route: POST /api/store/temp-status
  ├── withAuth() + verifyTenantAccess()
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

```typescript
// Request body
const TempStatusSchema = z.object({
  tenantId: z.number().positive(),
  storeId: z.number().positive(),
  action: z.enum(['set', 'clear']),
  // Required when action === 'set'
  type: z.enum(['closed_today', 'opening_late', 'special_menu', 'custom']).optional(),
  message: z.string().max(100).optional(),
  expiresAt: z.string().datetime().optional(), // ISO 8601
});

// Response
{ success: true }
// or
{ error: string, status: 400 | 403 | 500 }
```

**Security:**

- `withAuth({ requiredRole: 'OWNER' })` — Only owners/managers can set status
- `verifyTenantAccess()` — Tenant isolation
- Zod validation before any DB operation
- Rate limit: `DATA_WRITE` (50 req/min)

---

## File Structure

| File                                                                    | Purpose                                | LOC  | Status      |
| ----------------------------------------------------------------------- | -------------------------------------- | ---- | ----------- |
| `src/types/platform/store.ts`                                           | Add `tempStatus` type to StoreDataType | ~15  | ✅ MODIFIED |
| `src/app/api/store/temp-status/route.ts`                                | API route to set/clear temp status     | ~105 | ✅ NEW      |
| `src/components/atoms/TempStatusBanner/index.tsx`                       | Banner component for OBP + menu        | ~50  | ✅ NEW      |
| `src/components/atoms/TempStatusBanner/tempStatusBanner.module.scss`    | Banner styles                          | ~30  | ✅ NEW      |
| `src/app/_client/obp/OBPContent.tsx`                                    | Add TempStatusBanner above identity    | ~5   | ✅ MODIFIED |
| `src/app/_client/[[...slug]]/page.tsx`                                  | Add TempStatusBanner above menu        | ~5   | ✅ MODIFIED |
| `src/components/templates/main-app/businessSettings/TempStatusCard.tsx` | Desktop dashboard card                 | ~215 | ✅ NEW      |
| `src/components/mobile/screens/MobileTempStatusScreen.tsx`              | Mobile status toggle screen            | ~260 | ✅ NEW      |
| `src/components/mobile/screens/MobileMoreScreen.tsx`                    | Add temp status nav item + routing     | ~15  | ✅ MODIFIED |

**Total new code:** ~660 lines across 4 new files + 4 modified files

---

## Implementation Details

### Phase 1: Type + API

1. Add `tempStatus` type to `StoreDataType`
2. Create API route with full security (withAuth, verifyTenantAccess, Zod, rate limit)

### Phase 2: Customer-Facing Banner

1. Create `TempStatusBanner` atom component
2. Add to OBP page (server component — read from store data)
3. Add client-side expiry check (hide when expired)

### Phase 3: Owner Controls (Desktop)

1. Create `TempStatusCard` for Business Settings
2. Status type selector (4 options)
3. Custom message input (when type=custom)
4. Expiry picker (DatePicker)
5. Set/Clear buttons

### Phase 4: Owner Controls (Mobile)

1. Create `MobileTempStatusScreen`
2. ActionSheet for type selection
3. DatePicker for expiry
4. Wire into MobileMoreScreen navigation
5. Optimistic update pattern

---

## Security Checklist

- [x] API route uses `withAuth()`
- [x] Tenant access verified with `verifyTenantAccess()`
- [x] Input validated with Zod schema
- [x] Rate limiting configured (DATA_WRITE)
- [x] No new Firestore collections (field on existing doc)
- [x] No sensitive data in logs
- [x] Feature flag gated (`ENABLE_TEMP_STATUS`)

---

## Firebase Cost

**Zero additional reads.** Store document is already loaded on every OBP/menu page visit. `tempStatus` is just another field on that document.

| Operation                | Frequency         | Cost       |
| ------------------------ | ----------------- | ---------- |
| Write tempStatus (set)   | ~2/week per store | Negligible |
| Write tempStatus (clear) | ~2/week per store | Negligible |
| Read (part of store doc) | 0 extra reads     | ₹0         |

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

**Last Updated:** February 19, 2026

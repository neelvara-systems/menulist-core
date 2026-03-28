# ADR: Email Uniqueness Strategy

**Status:** IMPLEMENTED  
**Date:** 2026-02-22  
**Author:** Cascade (Session 10 — decision, Session 11 — implementation)

## Context

MenuList is a multi-tenant SaaS platform where:

- **Owners** create businesses (tenants) and stores during onboarding
- **Staff** are added by owners to help manage stores
- **Users** log in via Google OAuth or email/password credentials

The question: Should staff/user email be unique **globally** or **per-tenant**?

## Decision

**Email is globally unique across the entire platform.**

## Rationale

### 1. Firebase Auth Constraint (Hard)

Firebase Authentication enforces global email uniqueness at the infrastructure level. You **cannot** create two Firebase Auth accounts with the same email. This is not configurable.

### 2. Google OAuth Constraint (Hard)

Google OAuth returns one email per Google account. When a user signs in with Google, `getUserByEmail()` queries the global `users` collection. This **must** return exactly one user.

### 3. Single Dashboard (Architecture)

There is ONE dashboard at `menulist.ai`. Brand subdomains (`abc.menulist.ai`) are for the **public-facing digital menu**, not the dashboard. When a user logs in, their tenant/store context is determined from their user document — not from the URL.

### 4. Industry Standard

Every major SaaS platform (Shopify, Square, Toast, Clover) uses globally unique email. A person logs in once and can switch between businesses/stores they're associated with.

## Rules

| Rule | Description                                                                                 |
| ---- | ------------------------------------------------------------------------------------------- |
| R1   | Email is globally unique — one user doc per email in Firestore                              |
| R2   | One user can belong to ONE tenant (tenantId on user doc)                                    |
| R3   | One user can belong to MULTIPLE stores within that tenant (stores[] array)                  |
| R4   | Firebase Auth creation is required for login — server-side via Admin SDK                    |
| R5   | Adding existing staff to another store (same tenant) = update stores[], not create new user |
| R6   | Adding email that exists at a DIFFERENT tenant = reject with clear error                    |

## Staff Addition Flow (After Fix)

```
Owner clicks "Add Staff" →
  1. POST /api/auth/create-staff { email, name, storeId, tenantId }
  2. Server checks Firestore: does email exist?
     a. YES, same tenant → add store to their stores[] array → return { mode: 'existing' }
     b. YES, different tenant → reject 409 "Email belongs to another business"
     c. NO → create Firebase Auth user + Firestore user doc → return { mode: 'new' }
  3. UI updates user list based on response mode
```

## Login Flow (Unchanged)

```
User enters email + password →
  1. getUserByEmail(email) → get user doc (global lookup)
  2. Firebase Auth signInWithEmailAndPassword → verify password
  3. Session created with user.tenantId, user.storeId, user.stores[]
  4. User lands in dashboard with their tenant/store context
```

## What This Means for Future

- **Per-tenant dashboards** (`abc.menulist.in/dashboard`): NOT planned. Would require massive arch changes.
- **Cross-tenant staff** (same person, two different restaurants): NOT supported in V1. Staff belongs to one tenant. If needed later, extend `stores[]` to include `tenantId` per store and add tenant-switching UI.

## Files Affected

| File                                                                   | Change                                                       |
| ---------------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/app/api/auth/create-staff/route.ts`                               | Full rewrite: handle existing users, same-tenant multi-store |
| `src/database/users/index.ts`                                          | Add email uniqueness guard to `addPlatformUser()`            |
| `src/components/mobile/screens/MobileUsersScreen.tsx`                  | Must use create-staff API (was bypassing it)                 |
| `src/components/templates/main-app/users/usersList/userForm/index.tsx` | Handle 'existing user added to store' response               |

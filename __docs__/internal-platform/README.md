# Internal Platform Documentation

> **Audience:** MenuList.ai Internal Team Only  
> **Status:** ✅ Active  
> **Last Updated:** January 26, 2026

---

## Purpose

This folder contains documentation for **internal platform features** that are used by the MenuList.ai team, NOT by customers. These features are for:

- Platform administration
- Support operations
- System maintenance
- Internal tooling

---

## Platform Roles (Internal)

### Overview

Internal platform roles are **separate from customer RBAC**. They are set directly in the database. The MenuList `/platform/*` shell and legacy `/ops/*` aliases currently require the full `PLATFORM` role before internal pages render.

### Role Definitions

| Role | Constant | Purpose |
|------|----------|---------|
| **PLATFORM** | `ECOMSAI_PLATFORM_USER_ROLE` | Full system access - founders, core team |
| **PLATFORM_SUPPORT** | `ECOMSAI_PLATFORM_SUPPORT_USER_ROLE` | Support operations - customer issues |
| **CRAFT_BUILDER_MAINTAINER** | `CRAFT_BUILDER_MAINTAINER_USER_ROLE` | Template builders - design team |

### Location

```typescript
// src/constants/user.ts
export const ECOMSAI_PLATFORM_USER_ROLE = "PLATFORM"
export const ECOMSAI_PLATFORM_USER_ID = 0
export const ECOMSAI_PLATFORM_TENANT_ID = 0
export const ECOMSAI_PLATFORM_STORE_ID = 0
export const ECOMSAI_PLATFORM_USER_NAME = "ECOMSAI"

export const ECOMSAI_PLATFORM_SUPPORT_USER_ROLE = "PLATFORM_SUPPORT"
export const CRAFT_BUILDER_MAINTAINER_USER_ROLE = "CRAFT_BUILDER_MAINTAINER"
```

### How It Works

1. **Database-Managed**: Platform roles are set directly in Firestore `users` collection
2. **No UI Assignment**: These are NOT assignable through the dashboard UI
3. **Full Access**: `PLATFORM` role = god mode, access to everything
4. **Screen Access**: `src/app/(main)/platform/layout.tsx` blocks `/platform/*` and `src/app/(main)/ops/layout.tsx` blocks legacy `/ops/*` aliases unless `platformRole === PLATFORM`. The desktop Platform navigation is hidden from non-platform sessions.

### Setting a Platform Role

```typescript
// Direct Firestore update (admin only)
await updateDoc(doc(db, 'users', userId), {
  platformRole: 'PLATFORM'  // or 'PLATFORM_SUPPORT' or 'CRAFT_BUILDER_MAINTAINER'
});
```

### Platform Screens

| Route | Purpose | Required Role |
|-------|---------|---------------|
| `/platform/founder-monitor` | Founder operating scoreboard for trusted live stores, MRR, onboarding, Store Truth, distribution, and support risk | PLATFORM |
| `/platform/stores` | All stores management | PLATFORM |
| `/platform/tenants` | All tenants management | PLATFORM |
| `/platform/users` | All users management | PLATFORM |
| `/platform/analytics` | Platform-wide analytics | PLATFORM |
| `/platform/support-tickets` | Platform support tickets | PLATFORM |

`PLATFORM_SUPPORT` and `CRAFT_BUILDER_MAINTAINER` remain reserved internal role constants. They do not grant broad `/platform/*` shell access unless a dedicated route or product shell explicitly implements that access.

---

## Difference: Platform Roles vs Customer RBAC

| Aspect | Platform Roles | Customer RBAC |
|--------|---------------|---------------|
| **Who uses** | MenuList.ai team | Store owners & staff |
| **Set via** | Direct database | Dashboard UI |
| **Scope** | Entire platform | Single store |
| **Location** | `user.platformRole` | `user.stores[].role` |
| **Permissions** | Binary (full access) | Granular (21 permissions) |

---

## When to Update This Document

- When adding a new internal platform role
- When adding new platform screens
- When changing platform role permissions
- When onboarding new team members

---

## Related Files

| File | Purpose |
|------|---------|
| `src/constants/user.ts` | Platform role constants |
| `src/app/(main)/platform/*` | Platform admin screens |
| `src/middleware.ts` | Route protection logic |

---

**INTERNAL USE ONLY - Do not share with customers**

# Stores Management — Documentation Hub

> **Feature:** Manual Store Creation + Multi-Chain Support  
> **Status:** ✅ Implemented  
> **Last Updated:** June 11, 2026
> **Version:** 2.1

> **Scope:** Platform admin store CRUD and multi-chain store creation. For outlet-specific onboarding flow, see [Store Onboarding](../multi-outlet-consistency/store-onboarding/). For permissions, see [Roles & Permissions](../roles-permissions/).

---

## Quick Navigation

| Audience       | Document                                 | Purpose                            |
| -------------- | ---------------------------------------- | ---------------------------------- |
| **CEO / PM**   | [\_spec.md](./stores-management_spec.md) | User journey, business rules       |
| **Developers** | [\_impl.md](./stores-management_impl.md) | Technical flow, code paths, DB ops |

---

## Executive Summary

### Current State

- **Internal admin tool** for platform operators to manually create tenants and stores
- Access restricted to users with `ECOMSAI_PLATFORM_USER_ROLE`
- Entry points: desktop Platform settings plus mobile More → Platform for Entity Blocks, Tenants, Stores, and Users management
- Platform administrators can block tenants, stores, or users through Entity Blocks without changing `active` or `deleted` lifecycle fields. Block actions write `blocked` plus `blockDetails` audit metadata on the affected entity; tenant and store blocks are also enforced on public menu/OBP lookup paths.

### Multi-Chain State ✅ (Implemented)

Multi-chain business owners can add their own outlet stores via the Add Outlet modal. See [Store Onboarding](../multi-outlet-consistency/store-onboarding/) for the full flow.

---

## Flow Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         STORES MANAGEMENT FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ENTRY POINT 1: Tenants Dashboard                                           │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                           │
│  /platform/tenants or /platform → Tenants Tab → TenantDetailsModal          │
│                                    ↓                                        │
│                            "Add Store" Button                               │
│                                    ↓                                        │
│                            StoreDetailsModal                                │
│                                    ↓                                        │
│                            BusinessSettings Form                            │
│                                                                             │
│  ENTRY POINT 2: Stores Dashboard                                            │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                            │
│  /platform/stores or /platform → Stores Tab → "Add Store" Button            │
│                                    ↓                                        │
│                            StoreDetailsModal                                │
│                                    ↓                                        │
│                            BusinessSettings Form                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Files

| Purpose                    | File Path                                                          |
| -------------------------- | ------------------------------------------------------------------ |
| **Platform Settings**      | `src/components/templates/platform/settings/index.tsx`             |
| **Entity Blocks**          | `src/components/templates/platform/settings/EntityBlockSettings.tsx` |
| **Tenants Dashboard**      | `src/components/templates/platform/tenants/index.tsx`              |
| **Tenant Details Modal**   | `src/components/templates/platform/tenants/tenantDetailsModal.tsx` |
| **Stores Dashboard**       | `src/components/templates/platform/stores/index.tsx`               |
| **Store Details Modal**    | `src/components/templates/platform/stores/storeDetailsModal.tsx`   |
| **Business Settings Form** | `src/components/templates/main-app/businessSettings/index.tsx`     |
| **Stores DAL**             | `src/database/stores/index.tsx`                                    |
| **Tenants DAL**            | `src/database/tenants/index.tsx`                                   |
| **Entity Block DAL**       | `src/database/platformEntityBlocks/index.ts`                       |
| **Platform Summary DAL**   | `src/database/platformSummary/index.ts`                            |

---

## Database Operations

| Operation            | Function                    | Collections Updated                                                  |
| -------------------- | --------------------------- | -------------------------------------------------------------------- |
| Create Store         | `addStore()`                | `stores`, `platformSummary/default`, `platformSummary/storesSummary` |
| Update Store         | `updateStore()`             | `stores`, `platformSummary/storesSummary` when summary fields change |
| Manage custom domain | `POST/GET/DELETE /api/domain` | `stores`; public cache tags `menu-store-{storeId}`, `store-{storeId}`, `client-stores` |
| Manage time-slot presets | `updateTimeSlotPresets()`, `updatePresetInAllCategories()`, `removePresetFromAllCategories()` | `stores`; changed `projects/{tId}/{sId}` docs only when assigned category windows need edit/delete cleanup |
| Block/unblock Entity | `POST /api/platform/entity-blocks` via `updatePlatformEntityBlockState()` | `tenants`, `stores`, or `users`; store blocks sync public summary/cache, and tenant blocks update `platformSummary/storesSummary.stores.{storeId}.tenantBlocked` before revalidating affected stores |
| Link Store to Tenant | `updateTenantsStoreslist()` | `tenants`                                                            |
| Get Next Store ID    | `getPlatformSummary()`      | Read `platformSummary/default`                                       |

---

## Implementation Status

| Feature                                                | Status  |
| ------------------------------------------------------ | ------- |
| Default roles (Owner, Manager, Staff) created on store | ✅ Done |
| Owner role assigned to creator                         | ✅ Done |
| Store mapping added to user                            | ✅ Done |
| Permission check utility                               | ✅ Done |
| Default roles on outlet creation                       | ✅ Done |
| Multi-chain outlet creation via owner flow             | ✅ Done |
| Platform summary sync on store create/update           | ✅ Done |
| Dedicated tenant/store/user block control with audit details | ✅ Done |
| Custom-domain add/verify/remove full public cache invalidation | ✅ Done |
| Time-slot preset edit/delete cascades to assigned category windows | ✅ Done |

---

## Multi-Chain Flow (Franchise/Outlet Management)

Based on industry research (Square, Lightspeed, GoFrugal):

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    MULTI-CHAIN OUTLET MANAGEMENT                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  MASTER OWNER (Franchise HQ)                                                │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                │
│  - Has OWNER role on all stores                                             │
│  - Can add new outlet stores                                                │
│  - Controls menu catalog, branding, pricing                                 │
│  - Views consolidated reports across all locations                          │
│                                                                             │
│  ADD OUTLET FLOW:                                                           │
│  ┌─────────────┐    ┌──────────────┐    ┌──────────────┐                   │
│  │ Master Owner│───▶│ Add Store    │───▶│ New Store    │                   │
│  │ Dashboard   │    │ (with roles) │    │ Created      │                   │
│  └─────────────┘    └──────────────┘    └──────────────┘                   │
│                            │                    │                           │
│                            ▼                    ▼                           │
│                     ┌──────────────┐    ┌──────────────┐                   │
│                     │ Default Roles│    │ Owner Mapping│                   │
│                     │ Created      │    │ Added to User│                   │
│                     └──────────────┘    └──────────────┘                   │
│                                                                             │
│  OUTLET MANAGER (Local Store)                                               │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━                                                │
│  - Has MANAGER role on their store only                                     │
│  - Can manage local operations, staff                                       │
│  - Cannot access billing or other stores                                    │
│  - Views reports for their location only                                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Functions for Multi-Chain

| Function           | File                                   | Purpose                          |
| ------------------ | -------------------------------------- | -------------------------------- |
| `addStore()`       | `src/database/stores/index.tsx`        | Creates store with default roles |
| `addStoreToUser()` | `src/database/users/index.ts`          | Adds store mapping to owner      |
| `hasPermission()`  | `src/lib/permissions/hasPermission.ts` | Checks user permissions          |

---

## Related Documentation

| Topic                        | Folder                                                             | Relationship                               |
| ---------------------------- | ------------------------------------------------------------------ | ------------------------------------------ |
| **Auth & Onboarding**        | [auth-onboarding/](../auth-onboarding/)                            | Automatic store creation during signup     |
| **Roles & Permissions**      | [roles-permissions/](../roles-permissions/)                        | Default roles created on store add         |
| **Multi-Outlet Consistency** | [multi-outlet-consistency/](../multi-outlet-consistency/)          | Master/outlet linking, project replication |
| **Store Onboarding**         | [store-onboarding/](../multi-outlet-consistency/store-onboarding/) | Owner-facing outlet creation flow          |
| **Multi-Chain Permissions**  | [multi-chain-permissions/](../multi-chain-permissions/)            | OutletPolicy chain-level restrictions      |

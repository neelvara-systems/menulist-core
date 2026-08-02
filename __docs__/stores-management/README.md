# Stores Management — Documentation Hub

> **Feature:** Manual Store Creation + Multi-Chain Support  
> **Status:** ✅ Implemented  
> **Last Updated:** July 1, 2026
> **Version:** 2.2

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
- Access restricted to users with `MENULIST_PLATFORM_USER_ROLE`
- Entry points: desktop Platform settings plus mobile More → Platform for Entity Blocks, Tenants, Stores, and Users management
- Platform administrators can block tenants, stores, or users through Entity Blocks without changing `active` or `deleted` lifecycle fields. Block actions write `blocked` plus `blockDetails` audit metadata on the affected entity; public menu/OBP lookup rejects the store mirror and independently reads the canonical tenant on a cold cache fill, so a missing/stale denormalized `tenantBlocked` value cannot bypass tenant state. User blocks commit Firestore-authoritative access and a durable Auth-sync revision before Firebase Auth disable/token-revoke work, then acknowledge only after bounded reconciliation of the current revision. Browser acknowledgements are capped and must echo the requested entity ID plus blocked state before desktop or mobile local state shows success.
- Platform tenant create/update actions in `TenantDetailsModal` require tenant DAL acknowledgement before the drawer closes. DAL fallback values keep the drawer open, log `platform_tenant_save_failed`, and show fixed failure copy.

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
| Create Store         | `addStore()`                | Reserves a global ID, then transactionally writes `stores`, `platformSummary/storesSummary`, and current `tenants.storesList`; public cache refresh follows commit |
| Update Store         | `updateStore()`             | Summary-relevant changes transactionally update `stores`, `platformSummary/storesSummary`, and current `tenants.storesList` for name changes; public cache refresh follows commit |
| Manage custom-domain routing | `POST/GET/DELETE /api/domain` | Canonical `tenants`/`stores`, deterministic `platformSummary/customDomainClaim_{domain}` state machine, Vercel project domain API, and public cache tags `menu-store-{storeId}`, `store-{storeId}`, `client-stores`. Same-store/cross-store overlap and duplicate legacy ownership fail closed. |
| Manage time-slot presets | `updateTimeSlotPresets()`, `updatePresetInAllCategories()`, `removePresetFromAllCategories()` | `stores`; changed `projects/{tId}/{sId}` docs only when assigned category windows need edit/delete cleanup. Presets are active-store scoped and runtime-normalized. Overnight windows are supported. Cascades use paged discovery plus transaction-current, files-only project writes so concurrent menu edits are preserved. Store writes and project cascades require acknowledgements before local success state. Failed desktop save/delete diagnostics use bounded Business Settings logging only. |
| Block/unblock Entity | `POST /api/platform/entity-blocks` via `updatePlatformEntityBlockState()` | `tenants`, `stores`, or `users`; platform-only route rejects bodies above 64KB before entity reads. Store blocks transactionally update the canonical store and summary row. Tenant blocks transactionally re-read exact tenant/store ownership, cap scope at 200 stores, and commit tenant state, existing-store `tenantBlocked` mirrors, and `platformSummary/storesSummary` together before bounded public/screen/context refresh. Browser requests use no-store cache, same-origin credentials, manual redirects, 64KB response caps, and `success` / entity-id / blocked-state validation. |
| Mirror Store Identity to Tenant | Internal `addStore()` / `updateStore()` transaction | Current `tenants.storesList` entry derived from the canonical store snapshot; no whole-list browser replacement API |
| Get counter snapshot | `getPlatformSummary()`      | Directly reconciles canonical `platformSummary/summary`, legacy read-only `default`, and strict `storesSummary` floors; allocation itself uses a retrying reservation transaction |

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

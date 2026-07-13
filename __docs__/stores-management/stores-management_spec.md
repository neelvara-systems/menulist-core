# Stores Management — Business Specification

> **Audience:** CEO, PM, Product Team  
> **Last Updated:** February 13, 2026  
> **Version:** 1.1

---

## What Is This Feature?

**One-liner:** Internal admin tool for platform operators to manually create and manage tenant stores.

**Problem Solved:** Platform admins need to:

1. Create new tenants (business entities)
2. Add stores under existing tenants
3. Configure store settings (business info, location, hours, etc.)
4. View and manage all stores across the platform

**Current Scope:** Internal use only (platform admins with `ECOMSAI_PLATFORM_USER_ROLE`)

---

## User Journey

### Journey 1: Add Store via Tenants Dashboard

```
Platform Admin logs in
    ↓
Navigate to /platform → Tenants Tab
    ↓
Click on a tenant row → TenantDetailsModal opens
    ↓
Click "Add Store" button
    ↓
StoreDetailsModal opens with BusinessSettings form
    ↓
Fill in store details (10 sections available)
    ↓
Click "Update" → Store created
    ↓
Store appears in tenant's storesList
```

### Journey 2: Add Store via Stores Dashboard

```
Platform Admin logs in
    ↓
Navigate to /platform → Stores Tab
    ↓
Select tenant from "Filter by Tenant" dropdown
    ↓
Click "Add Store" button
    ↓
StoreDetailsModal opens with BusinessSettings form
    ↓
Fill in store details
    ↓
Click "Update" → Store created
    ↓
Store appears in stores list table
```

### Journey 3: Edit Existing Store

```
Platform Admin logs in
    ↓
Navigate to /platform → Stores Tab OR Tenants Tab
    ↓
Click on store row (Stores Tab) OR store button (Tenant Modal)
    ↓
StoreDetailsModal opens with existing data
    ↓
Modify desired fields
    ↓
Click "Update" → Changes saved
```

---

## Store Information Sections

The BusinessSettings form has **10 configurable sections**:

| #   | Section                  | Purpose                | Key Fields                                          |
| --- | ------------------------ | ---------------------- | --------------------------------------------------- |
| 1   | **Basic Information**    | Core business identity | Name, Business Type, Description, Tags              |
| 2   | **Location Information** | Physical address       | Address, City, State, Country, Pincode, Coordinates |
| 3   | **Locale Settings**      | Regional preferences   | Timezone, Currency, Date/Time Format                |
| 4   | **Contact Person**       | Primary contact        | Name, Phone, Email                                  |
| 5   | **Working Hours**        | Operating schedule     | Mon-Sun open/close times                            |
| 6   | **Time Slot Presets**    | Booking/delivery slots | Customizable time windows                           |
| 7   | **Social Media**         | Online presence        | Facebook, Instagram, Twitter, etc.                  |
| 8   | **SEO Settings**         | Search optimization    | Meta title, description, keywords                   |
| 9   | **Analytics**            | Tracking setup         | Google Analytics ID, tracking configs               |
| 10  | **Integrations**         | External services      | Google My Business, etc.                            |

---

## Business Rules

### Store Creation Rules

| Rule                    | Description                                                                  |
| ----------------------- | ---------------------------------------------------------------------------- |
| **Sequential IDs**      | Store IDs are auto-generated sequentially (platformSummary.stores.count + 1) |
| **Tenant Required**     | Every store must belong to a tenant                                          |
| **Name Required**       | Store name is mandatory                                                      |
| **Auto-Generated Keys** | `storeKey` is auto-generated from name (lowercase, underscores)              |
| **Tenant Sync**         | Store is automatically added to tenant's `storesList`                        |
| **Summary Sync**        | Store is synced to `platformSummary/storesSummary` for Cloud Functions       |

### Default Values

| Field                     | Default Value |
| ------------------------- | ------------- |
| `currencyCode`            | "INR"         |
| `currencySymbol`          | "₹"           |
| `country`                 | "India"       |
| `rolesPermissionStrategy` | "DEFAULT"     |
| `active`                  | true          |
| `verified`                | false         |
| `deleted`                 | false         |
| `blocked`                 | false         |

### Time Slot Presets

When creating a store, **default time slot presets** are automatically assigned based on `businessType`:

- Restaurant → Lunch, Dinner slots
- Retail → Morning, Afternoon, Evening slots
- Service → Hourly appointment slots

When an owner edits an existing preset, MenuList updates assigned category time windows in the current store's projects so the public menu follows the saved preset. When a preset is deleted, assigned category windows using that preset are removed from changed projects. Both paths revalidate public menu/OBP cache for affected projects.

---

## Data Model Overview

### Tenant-Store Relationship

```
Tenant (tenantId: 1)
├── storesList: [
│   { storeId: 1, name: "Main Store" },
│   { storeId: 2, name: "Branch Store" }
│]

Store (storeId: 1)
├── tenantId: 1
├── name: "Main Store"
├── businessType: "restaurant"
├── ... (all settings)
```

### Collections Updated

| Operation    | Collections                                                                     |
| ------------ | ------------------------------------------------------------------------------- |
| Create Store | `stores`, `tenants`, canonical `platformSummary/summary`, legacy counter floor, `platformSummary/storesSummary` |
| Update Store | `stores`, `tenants` (if name changed), `platformSummary/storesSummary`          |

---

## Access Control

### Current State

| Role                         | Access           |
| ---------------------------- | ---------------- |
| `ECOMSAI_PLATFORM_USER_ROLE` | Full CRUD access |
| Regular users                | No access        |

### Multi-Chain State ✅ (Implemented)

| Role              | Access                                                |
| ----------------- | ----------------------------------------------------- |
| Platform Admin    | All tenants, all stores                               |
| Multi-Chain Owner | Own tenant, all their stores (via `canManageOutlets`) |
| Store Manager     | Assigned stores only (via `canSwitchStores`)          |

---

## Gap Analysis

### Resolved Gaps ✅

| Previous Gap                              | Resolution                                          | Date     |
| ----------------------------------------- | --------------------------------------------------- | -------- |
| No default roles on manual store creation | `createDefaultRoles()` called in `addStore()`       | Jan 2026 |
| No owner role assignment                  | Owner role assigned to creating user                | Jan 2026 |
| `rolesPermissionStrategy` undefined       | Removed (single role per store, no strategy needed) | Jan 2026 |
| No default roles on outlet creation       | `createDefaultRoles()` called in outlet create API  | Feb 2026 |

**See:** [Roles & Permissions Documentation](../roles-permissions/)

---

## Implementation Status

### Phase 1: Multi-Chain Support ✅ IMPLEMENTED

- Multi-chain business owners can add outlet stores via `/api/outlets/create`
- Default roles auto-created on every store creation
- Owner role assigned to creator
- Master/outlet linking with project replication
- See: [Multi-Outlet Consistency](../multi-outlet-consistency/) and [Store Onboarding](../multi-outlet-consistency/store-onboarding/)

### Future: Store Templates (P1)

- Pre-configured store templates by industry
- Clone store settings from existing store
- Bulk store import (CSV)

### Future: Store Hierarchy (P2)

- Parent-child store relationships
- Headquarters → Regional → Outlet structure
- Cascading settings inheritance

---

## Success Metrics

| Metric               | Target                                |
| -------------------- | ------------------------------------- |
| Store creation time  | < 2 minutes                           |
| Form completion rate | > 80% fields filled                   |
| Error rate           | < 1% failed creations                 |
| Admin satisfaction   | No support tickets for store creation |

---

## Related Documentation

- [Auth & Onboarding](../auth-onboarding/) - Automatic store creation during signup
- [Roles & Permissions](../roles-permissions/) - Role assignment gaps
- [Multi-Outlet Consistency](../multi-outlet-consistency/) - Linked outlet stores

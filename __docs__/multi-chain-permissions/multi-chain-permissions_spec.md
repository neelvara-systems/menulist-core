# Multi-Chain Permissions — Product Specification

> **Feature:** #4B — Multi-Chain Permissions  
> **Status:** ✅ Implemented  
> **Last Updated:** February 12, 2026  
> **ICP:** Premium SMB Groups (2–10 stores)

---

## Executive Summary

**What:** Two-layer permission system controlling what outlet stores can do (chain policy) and what each staff member can do within their store (role-based permissions).

**Why:** Restaurant chains need HQ to control brand consistency, AI spending, and operational boundaries without micromanaging every outlet. Staff need appropriate access levels based on their responsibility.

**Promise:** HQ sets the guardrails once. Outlets work freely within them. Staff get exactly the access they need — nothing more, nothing less. No approval workflows, no cognitive load.

---

## Layer 1: Staff-Level Permissions (RolePermissions)

### 3-Tier Role Hierarchy

Industry-standard pattern (Square POS, Toast, Lightspeed) with simple boolean permission flags.

| Role        | Use Case                                       | Permission Count  |
| ----------- | ---------------------------------------------- | :---------------: |
| **Owner**   | Business owner, franchise owner, primary admin | 23/23 (all true)  |
| **Manager** | Store manager, shift supervisor, outlet head   | 14/23 (selective) |
| **Staff**   | Cashier, waiter, kitchen staff                 | 1/23 (chat only)  |

### Complete Permission Matrix (23 Flags)

#### Billing & Subscription (2)

| Permission              | Owner | Manager | Staff | Description                          |
| ----------------------- | :---: | :-----: | :---: | ------------------------------------ |
| `canAccessBilling`      |  ✅   |   ❌    |  ❌   | View billing, invoices, subscription |
| `canManageSubscription` |  ✅   |   ❌    |  ❌   | Upgrade, downgrade, cancel plan      |

#### User Management (2)

| Permission       | Owner | Manager | Staff | Description                 |
| ---------------- | :---: | :-----: | :---: | --------------------------- |
| `canManageUsers` |  ✅   |   ✅    |  ❌   | Add, edit, remove users     |
| `canAssignRoles` |  ✅   |   ❌    |  ❌   | Assign or change user roles |

#### Store Management (2)

| Permission       | Owner | Manager | Staff | Description                         |
| ---------------- | :---: | :-----: | :---: | ----------------------------------- |
| `canManageStore` |  ✅   |   ✅    |  ❌   | Edit store settings, hours, info    |
| `canAddStores`   |  ✅   |   ❌    |  ❌   | Add new outlet stores (multi-chain) |

#### Multi-Outlet (2)

| Permission         | Owner | Manager | Staff | Description                                    |
| ------------------ | :---: | :-----: | :---: | ---------------------------------------------- |
| `canManageOutlets` |  ✅   |   ❌    |  ❌   | Create/deactivate outlets, Chain Control Panel |
| `canSwitchStores`  |  ✅   |   ✅    |  ❌   | Switch between stores as master user           |

#### Menu Management (2)

| Permission       | Owner | Manager | Staff | Description                 |
| ---------------- | :---: | :-----: | :---: | --------------------------- |
| `canManageMenu`  |  ✅   |   ✅    |  ❌   | Edit menu items, categories |
| `canPublishMenu` |  ✅   |   ✅    |  ❌   | Publish menu changes live   |

#### AI Features — Credit-Consuming (3)

| Permission                | Owner | Manager | Staff | Description              |
| ------------------------- | :---: | :-----: | :---: | ------------------------ |
| `canUseMenuExtraction`    |  ✅   |   ❌    |  ❌   | Run AI menu extraction   |
| `canGenerateDescriptions` |  ✅   |   ✅    |  ❌   | Generate AI descriptions |
| `canGenerateImages`       |  ✅   |   ❌    |  ❌   | Generate AI images       |

#### Branding — Multi-Outlet Override Control (3)

| Permission                 | Owner | Manager | Staff | Description            |
| -------------------------- | :---: | :-----: | :---: | ---------------------- |
| `canOverrideTheme`         |  ✅   |   ❌    |  ❌   | Override colors, fonts |
| `canOverrideBrandIdentity` |  ✅   |   ❌    |  ❌   | Override logo, brand   |
| `canOverrideLayout`        |  ✅   |   ❌    |  ❌   | Override UI layout     |

#### Content Control — Multi-Outlet (3)

| Permission              | Owner | Manager | Staff | Description                 |
| ----------------------- | :---: | :-----: | :---: | --------------------------- |
| `canAddLocalCategories` |  ✅   |   ✅    |  ❌   | Add local-only categories   |
| `canAddLocalItems`      |  ✅   |   ✅    |  ❌   | Add local-only menu items   |
| `canOverridePrices`     |  ✅   |   ✅    |  ❌   | Override master menu prices |

#### Analytics & Reports (2)

| Permission         | Owner | Manager | Staff | Description              |
| ------------------ | :---: | :-----: | :---: | ------------------------ |
| `canViewAnalytics` |  ✅   |   ✅    |  ❌   | View reports, dashboards |
| `canExportData`    |  ✅   |   ❌    |  ❌   | Export data, reports     |

#### Customer Interactions (2)

| Permission            | Owner | Manager | Staff | Description                    |
| --------------------- | :---: | :-----: | :---: | ------------------------------ |
| `canManageChat`       |  ✅   |   ✅    |  ✅   | View/respond to customer chats |
| `canViewCustomerData` |  ✅   |   ✅    |  ❌   | View customer information      |

### Key Design Decisions

- **Single role per store** — Each user has exactly ONE role per store (no multi-role complexity)
- **Simple IDs** — Roles are `owner`, `manager`, `staff` (no storeId suffix needed)
- **Custom roles supported** — Custom role IDs use `custom-{timestamp}` format
- **No permission strategies** — Single role per store eliminates conflict resolution

---

## Layer 2: Chain-Level Permissions (OutletPolicy)

### What Is OutletPolicy?

A set of 15 boolean flags stored on the **master store only** that control what ALL outlet stores can do. Think of it as the "franchise policy" — HQ decides the guardrails.

### Where It Lives

```
stores/{masterStoreId}.outletPolicy: OutletPolicy
```

Only the master store has this field. Outlet stores inherit the policy through `applyOutletPolicy()` at session time.

### Complete OutletPolicy Matrix (15 Flags)

#### Override Control (4)

| Policy Flag            | Default | What It Controls                        |
| ---------------------- | :-----: | --------------------------------------- |
| `priceOverride`        | `true`  | Outlets can set their own prices        |
| `availabilityOverride` | `true`  | Outlets can toggle item availability ⚠️ |
| `descriptionOverride`  | `false` | Outlets can edit item descriptions      |
| `imageOverride`        | `false` | Outlets can replace item images         |

> ⚠️ **Customer Impact Warning:** If `availabilityOverride` is set to `false`, outlets **cannot mark items as sold out**. Customers may attempt to order items that are physically unavailable. Recommendation: keep this `true` (the default) unless HQ has a centralized way to manage outlet-level availability.

#### Local Content (4)

| Policy Flag              | Default | What It Controls                           |
| ------------------------ | :-----: | ------------------------------------------ |
| `allowLocalItems`        | `true`  | Outlets can add their own menu items       |
| `allowLocalCategories`   | `true`  | Outlets can create local-only categories   |
| `allowLocalProjects`     | `false` | Outlets can create entirely local projects |
| `allowProjectDeactivate` | `true`  | Outlets can deactivate inherited projects  |

#### AI Features (3)

| Policy Flag               | Default | What It Controls                     |
| ------------------------- | :-----: | ------------------------------------ |
| `canUseMenuExtraction`    | `false` | Outlets can run AI menu extraction   |
| `canGenerateDescriptions` | `true`  | Outlets can generate AI descriptions |
| `canGenerateImages`       | `false` | Outlets can generate AI images       |

#### Branding (3)

| Policy Flag                | Default | What It Controls                     |
| -------------------------- | :-----: | ------------------------------------ |
| `canOverrideTheme`         | `false` | Outlets can customize colors/fonts   |
| `canOverrideBrandIdentity` | `false` | Outlets can change logo/brand images |
| `canOverrideLayout`        | `false` | Outlets can modify UI layout         |

#### Language (1)

| Policy Flag       | Default | What It Controls                                      |
| ----------------- | :-----: | ----------------------------------------------------- |
| `canAddLanguages` | `true`  | Outlets can add languages from master's language list |

### Default Philosophy: Conservative

AI features and branding are **off by default** (protect costs and brand). Override control and local content are **on by default** (operational necessity for outlets).

---

## How The Two Layers Interact

### Intersection Model

```
Effective Permission = Role Permission AND Outlet Policy Gate
```

**Example:** Manager at Outlet B tries to generate AI images:

1. **Role check:** Manager has `canGenerateImages: false` → **BLOCKED** (role alone blocks it)
2. Even if master enabled `canGenerateImages: true` in OutletPolicy, the role still blocks it

**Example:** Owner at Outlet B tries to generate AI images:

1. **Role check:** Owner has `canGenerateImages: true` → **PASS**
2. **Policy check:** Master set `canGenerateImages: false` in OutletPolicy → **BLOCKED**

### Master Store Users

Master store users are **NEVER restricted** by OutletPolicy. The policy only applies to outlet stores.

### Always-Forced Restrictions for Outlet Users

Regardless of role, outlet users **always** lose these permissions:

- `canManageOutlets` → Only master can manage outlets
- `canAddStores` → Only master can add stores
- `canAccessBilling` → Only master handles billing
- `canManageSubscription` → Only master manages subscription

---

## Enforcement Points

| Layer          | Method                                                          | Priority |
| -------------- | --------------------------------------------------------------- | -------- |
| **UI**         | `userPermissions` context from `sessionProvider` hides features | Primary  |
| **API Routes** | Server-side permission checks in route handlers                 | Primary  |
| **Firestore**  | Not yet implemented (API is primary gatekeeper)                 | Future   |

### UI Enforcement Pattern

Features are **hidden, not disabled** — following the doctrine of "Silence Is a Feature" (Law 2). If a user doesn't have permission, the feature simply doesn't appear. No "permission denied" messages.

---

## Doctrine Alignment

| Doctrine Rule               | How We Comply                                            |
| --------------------------- | -------------------------------------------------------- |
| Law 2: Silence Is a Feature | Hidden features, no "denied" messages                    |
| Law 6: No Cognitive Load    | 3 intuitive roles, boolean toggles (no complex matrices) |
| No Approval Workflows       | Instant enforcement — no `canPublishChanges` gates       |
| Trust > Engagement          | HQ sets policy once, outlets work freely within it       |

---

## Success Metrics

| Metric                        | Target                                        |
| ----------------------------- | --------------------------------------------- |
| HQ setup time for permissions | < 5 minutes (toggle switches in UI)           |
| Staff permission confusion    | Zero — only 3 roles to understand             |
| Brand drift incidents         | Zero — branding locked by default             |
| AI cost overruns              | Zero — AI features off by default for outlets |

---

## Out of Scope (Design Decisions)

| Decision                       | Status   | Reason                                             |
| ------------------------------ | -------- | -------------------------------------------------- |
| More than 3 default roles      | Rejected | Law 6: No Cognitive Load (custom roles available)  |
| Per-staff permission overrides | Rejected | Over-engineering for 2–10 store chains             |
| Approval workflows             | Rejected | Doctrine forbids (spec says "no approval flows")   |
| Per-outlet policy overrides    | Rejected | Single policy for all outlets (simplicity)         |
| Unlink from master             | Rejected | Business decision: outlets cannot unlink (forever) |
| Change master store            | Rejected | Business decision: master is permanent             |

---

## Version History

| Version | Date         | Changes                                                              |
| ------- | ------------ | -------------------------------------------------------------------- |
| 2.0     | Feb 12, 2026 | Complete rewrite: 23 RolePermissions + 15 OutletPolicy from codebase |
| 1.0     | Jan 26, 2026 | Initial spec: 7 StorePermissions + 2 StaffRoles (superseded)         |

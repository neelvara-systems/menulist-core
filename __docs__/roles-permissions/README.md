# Roles & Permissions — Documentation Hub

> **Feature:** Role-Based Access Control (RBAC)  
> **Status:** ✅ Implemented  
> **Last Updated:** February 13, 2026  
> **Version:** 2.1

> **Scope:** Staff-level permissions (Layer 1). For chain-level outlet restrictions (Layer 2: OutletPolicy), see [Multi-Chain Permissions](../multi-chain-permissions/).

---

## Quick Navigation

| Audience       | Document                                                 | Purpose                          |
| -------------- | -------------------------------------------------------- | -------------------------------- |
| **CEO / PM**   | [\_spec.md](./roles-permissions_spec.md)                 | Role definitions, user stories   |
| **Developers** | [\_impl.md](./roles-permissions_impl.md)                 | Technical blueprint, code paths  |
| **Developers** | [adding-new-permissions.md](./adding-new-permissions.md) | Guide for adding new permissions |

---

## Executive Summary

### What Works

- UI for creating/editing roles with feature-flag permissions
- Single role per store (simplified from multi-role)
- Simple role IDs: `owner`, `manager`, `staff` (no storeId suffix)
- Centralized permission constants (`src/constants/permissions.ts`)
- Firebase claims include role

### Implementation ✅ (Feature-Flag Style)

**Permissions are simple true/false toggles - no READ/WRITE/CREATE complexity.**

```
Permission Structure:
┌─────────────────────────────────────────────────────────────────┐
│  FEATURE-FLAG STYLE PERMISSIONS                                  │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                                  │
│                                                                  │
│  permissions: {                                                  │
│    canAccessBilling: true,        // 💰 Billing                  │
│    canManageUsers: true,          // 👥 Users                    │
│    canManageStore: true,          // 🏪 Store                    │
│    canManageMenu: true,           // 🍽️ Menu                     │
│    canUseMenuExtraction: true,    // 🤖 AI Features              │
│    canOverrideTheme: true,        // 🎨 Branding                 │
│    canAddLocalCategories: true,   // 🏗️ Content                  │
│    canViewAnalytics: true,        // 📊 Analytics                │
│    canManageChat: true,           // 💬 Customer                 │
│    ...                                                           │
│  }                                                               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Default Roles (3 - Industry Standard)

| Role        | Description                    | Key Permissions               |
| ----------- | ------------------------------ | ----------------------------- |
| **Owner**   | Full access to everything      | All 23 permissions enabled    |
| **Manager** | Operations & staff, no billing | 14 permissions, no AI/billing |
| **Staff**   | Day-to-day operations only     | Only `canManageChat`          |

---

## Industry Standard (SaaS RBAC)

Based on research from EnterpriseReady, Auth0, and common POS systems:

### Standard Role Hierarchy

```
OWNER (Super Admin)
  ↓
MANAGER (Admin)
  ↓
STAFF (User)
```

### Common Permission Groups

| Group             | Typical Permissions                |
| ----------------- | ---------------------------------- |
| **Billing**       | View invoices, manage subscription |
| **Users**         | Invite users, assign roles         |
| **Menu/Products** | Create, edit, delete items         |
| **Orders**        | View, process, refund              |
| **Analytics**     | View reports, export data          |
| **Settings**      | Store settings, integrations       |

---

## Key Files

| Purpose                     | File Path                                                                     |
| --------------------------- | ----------------------------------------------------------------------------- |
| **Permission Constants** ✨ | `src/constants/permissions.ts`                                                |
| **Default Roles** ✨        | `src/data/defaultRoles.ts`                                                    |
| **Permission Utility** ✨   | `src/lib/permissions/hasPermission.ts`                                        |
| **Role Types**              | `src/types/platform/roles.ts`                                                 |
| **User Types**              | `src/types/platform/user.ts`                                                  |
| **Store Types**             | `src/types/platform/store.ts`                                                 |
| **Permissions UI**          | `src/components/templates/main-app/users/permissions/index.tsx`               |
| **Role Form**               | `src/components/templates/main-app/users/permissions/roleDetailsModal.tsx`    |
| **User Role Mapping**       | `src/components/templates/main-app/users/usersList/userForm/rolesMapping.tsx` |
| **Default Data**            | `src/data/rolesPermissionsInitialData.ts`                                     |
| **Set Claims API**          | `src/app/api/auth/set-claims/route.ts`                                        |
| **Onboarding API**          | `src/app/api/onboarding/create-subscription/route.ts`                         |
| **Stores DAL**              | `src/database/stores/index.tsx`                                               |
| **Users DAL**               | `src/database/users/index.ts`                                                 |

---

## Implementation Status

| Priority | Task                                    | Status  |
| -------- | --------------------------------------- | ------- |
| **P0**   | Create default roles during onboarding  | ✅ Done |
| **P0**   | Create default roles on manual store    | ✅ Done |
| **P0**   | Create default roles on outlet creation | ✅ Done |
| **P0**   | Add store mapping to user               | ✅ Done |
| **P1**   | hasPermission() utility                 | ✅ Done |
| **P1**   | Multi-outlet permissions (2 new flags)  | ✅ Done |
| **P1**   | Outlet policy enforcement               | ✅ Done |
| **P1**   | UI permission checks via context        | ✅ Done |

---

## Related Documentation

| Topic                        | Folder                                                    | Relationship                                     |
| ---------------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| **Multi-Chain Permissions**  | [multi-chain-permissions/](../multi-chain-permissions/)   | Layer 2: OutletPolicy (chain-level restrictions) |
| **Multi-Outlet Consistency** | [multi-outlet-consistency/](../multi-outlet-consistency/) | Uses permissions for outlet management           |
| **Auth & Onboarding**        | [auth-onboarding/](../auth-onboarding/)                   | How first user gets OWNER role                   |
| **Stores Management**        | [stores-management/](../stores-management/)               | Manual store creation flow                       |

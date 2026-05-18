# Roles & Permissions — Documentation Hub

> **Feature:** Role-Based Access Control (RBAC)  
> **Status:** ✅ Staff CRUD + permissions wired end-to-end
> **Last Updated:** May 18, 2026
> **Version:** 3.0

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

- Server-side staff list/create/update/remove flow via `src/app/api/staff/route.ts`
- Owner-triggered staff password reset/passcode flow via `src/app/api/staff/password-reset/route.ts`
- Staff can be created with email, Staff ID, and phone login aliases on one account; owner reset creates a temporary passcode
- Server-side role create/update/deactivate flow via `src/app/api/staff/roles/route.ts`
- Desktop and mobile staff management use the same API contract
- UI for creating/editing roles with feature-flag permissions
- Single role per store (simplified from multi-role)
- Simple role IDs: `owner`, `manager`, `staff` (no storeId suffix)
- Centralized permission constants (`src/constants/permissions.ts`)
- Staff operations enforce `canManageUsers`; role/store assignment enforces `canAssignRoles`

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
| **Staff API**               | `src/app/api/staff/route.ts`                                                  |
| **Staff Password Reset/Passcode API** | `src/app/api/staff/password-reset/route.ts`                                   |
| **Role API**                | `src/app/api/staff/roles/route.ts`                                            |
| **Staff Server Contract**   | `src/lib/staffManagement/server.ts`                                           |
| **Staff Client Helpers**    | `src/lib/staffManagement/client.ts`                                           |
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
| **P0**   | Staff list/create/update/remove API     | ✅ Done |
| **P0**   | Desktop staff CRUD wired to API         | ✅ Done |
| **P0**   | Mobile staff CRUD wired to API          | ✅ Done |
| **P0**   | Role editor wired to API                | ✅ Done |

## Production Rules

- Staff users are never hard-deleted from Firebase Auth or Firestore. Removing the last store mapping deactivates and soft-deletes the user document.
- A user can belong to one tenant and multiple stores inside that tenant.
- Store role IDs are validated against the target store before staff creation or update.
- The `owner` role is locked from role-editor changes so owners cannot remove the last full-access role definition.
- A staff member with the last active owner mapping for a store cannot be deactivated, removed, or demoted until another active owner exists.
- `platformRole` remains separate from store-scoped `role`; `active` / `isVerified` are lifecycle fields, not authorization.

---

## Related Documentation

| Topic                        | Folder                                                    | Relationship                                     |
| ---------------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| **Multi-Chain Permissions**  | [multi-chain-permissions/](../multi-chain-permissions/)   | Layer 2: OutletPolicy (chain-level restrictions) |
| **Multi-Outlet Consistency** | [multi-outlet-consistency/](../multi-outlet-consistency/) | Uses permissions for outlet management           |
| **Auth & Onboarding**        | [auth-onboarding/](../auth-onboarding/)                   | How first user gets OWNER role                   |
| **Stores Management**        | [stores-management/](../stores-management/)               | Manual store creation flow                       |

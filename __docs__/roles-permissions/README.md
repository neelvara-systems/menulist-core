# Roles & Permissions — Documentation Hub

> **Feature:** Role-Based Access Control (RBAC)  
> **Status:** Local source flow verified; hosted release evidence pending
> **Last Updated:** July 16, 2026
> **Version:** 3.0

> **Scope:** Staff-level permissions (Layer 1). For chain-level outlet restrictions (Layer 2: OutletPolicy), see [Multi-Chain Permissions](../multi-chain-permissions/).

---

## Quick Navigation

| Audience       | Document                                                 | Purpose                          |
| -------------- | -------------------------------------------------------- | -------------------------------- |
| **CEO / PM**   | [\_spec.md](./roles-permissions_spec.md)                 | Role definitions, user stories   |
| **Developers** | [\_impl.md](./roles-permissions_impl.md)                 | Technical blueprint, code paths  |
| **Developers** | [\_firebase.md](./roles-permissions_firebase.md)         | Firebase reads/writes/cost       |
| **QA / Release** | [\_verification.md](./roles-permissions_verification.md) | Final review and production audit |
| **Mobile**     | [\_mobile-support.md](./roles-permissions_mobile-support.md) | Mobile parity contract         |
| **Owners**     | [\_helpdoc.md](./roles-permissions_helpdoc.md)          | Owner and staff operating guide  |
| **Marketing**  | [\_marketing.md](./roles-permissions_marketing.md)      | Approved and prohibited claims   |
| **Website**    | [\_website.md](./roles-permissions_website.md)          | Current public content contract   |
| **Developers** | [adding-new-permissions.md](./adding-new-permissions.md) | Guide for adding new permissions |

---

## Executive Summary

### What Works

- Server-side staff list/create/update/remove flow via `src/app/api/staff/route.ts`
- Owner-triggered staff password reset/passcode flow via `src/app/api/staff/password-reset/route.ts`
- Owner-triggered live session revocation flow via `src/app/api/staff/force-signout/route.ts` and `src/app/api/auth/access-status/route.ts`
- Staff can be created with email, Staff ID, and phone login aliases on one account; owner reset creates a temporary passcode
- One-time Staff ID/passcode details can be copied, shared with the browser share sheet, or opened in WhatsApp Web with the staff phone number when saved
- Server-side role create/update/deactivate flow via `src/app/api/staff/roles/route.ts`
- Desktop and mobile staff management use the same API contract
- UI for creating/editing roles with 29 feature-flag permissions
- Desktop route guard and mobile tab/screen filtering use the same permission contract
- Analytics, domain/subdomain, and POS owner APIs have explicit permission checks
- Single role per store (simplified from multi-role)
- Simple role IDs: `owner`, `manager`, `staff` (no storeId suffix)
- Centralized permission constants (`src/constants/permissions.ts`)
- Staff operations enforce `canManageUsers`; role/store assignment enforces `canAssignRoles`
- A Manager with `canManageUsers` can manage ordinary staff but cannot reset, sign out, deactivate, remove, or edit an Owner account; Owner-target changes also require `canAssignRoles`
- Staff mutation responses and role payloads are bounded and shape-checked before desktop/mobile state advances
- Rejected staff transactions do not revoke Firebase tokens: authoritative session-revocation fields commit first, then Firebase refresh-token revocation runs as a post-commit side effect
- Platform verification marks a placeholder verified only after a newly created Firebase Auth UID is transactionally bound to the same Firestore user; an unrelated pre-existing Auth email is rejected
- Session access checks reject deleted or inactive user, tenant, and store truth in addition to block/revocation state

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
| **Owner**   | Full access to everything      | All 29 permissions enabled    |
| **Manager** | Operations & staff, no billing | Store operations, menu, sharing, feedback, screens, analytics |
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
| **Default Roles** ✨        | `src/data/shared/defaultRoles.ts`                                             |
| **Functions Default-Role Mirror** | `functions/src/sharedData/defaultRoles.ts`                               |
| **Permission Utility** ✨   | `src/lib/permissions/hasPermission.ts`                                        |
| **Route Permission Contract** ✨ | `src/lib/permissions/permissionRequirements.ts`                          |
| **API Permission Guard** ✨  | `src/lib/permissions/server.ts`                                               |
| **Role Types**              | `src/types/platform/roles.ts`                                                 |
| **User Types**              | `src/types/platform/user.ts`                                                  |
| **Store Types**             | `src/types/platform/store.ts`                                                 |
| **Permissions UI**          | `src/components/templates/main-app/users/permissions/index.tsx`               |
| **Role Form**               | `src/components/templates/main-app/users/permissions/roleDetailsModal.tsx`    |
| **User Role Mapping**       | `src/components/templates/main-app/users/usersList/userForm/rolesMapping.tsx` |
| **Staff API**               | `src/app/api/staff/route.ts`                                                  |
| **Staff Password Reset/Passcode API** | `src/app/api/staff/password-reset/route.ts`                                   |
| **Staff Force Sign-Out API** | `src/app/api/staff/force-signout/route.ts`                                   |
| **Session Access Check API** | `src/app/api/auth/access-status/route.ts`                                    |
| **Self-Service Password API** | `src/app/api/auth/change-password/route.ts`                                  |
| **Role API**                | `src/app/api/staff/roles/route.ts`                                            |
| **Staff Server Contract**   | `src/lib/staffManagement/server.ts`                                           |
| **Staff Client Helpers**    | `src/lib/staffManagement/client.ts`                                           |
| **Staff Login Share Helpers** | `src/lib/staffManagement/shareLoginDetails.ts`                               |
| **Desktop Login Details UI** | `src/components/templates/main-app/users/StaffLoginDetailsContent.tsx`        |
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
| **P0**   | Permission taxonomy updated to live product surfaces | ✅ Done |
| **P0**   | Desktop/mobile route and screen gates   | ✅ Done |
| **P0**   | Analytics/domain/POS API permission checks | ✅ Done |
| **P0**   | Staff login detail copy/share/WhatsApp actions | ✅ Done |
| **P0**   | Staff/owner self-service password change route hardened | ✅ Done |

## Production Rules

- Staff users are never hard-deleted from Firebase Auth or Firestore. Removing the last store mapping deactivates and soft-deletes the user document, revokes active sessions, and disables the Firebase Auth account so the credentials cannot be used.
- Reactivating staff access by adding the staff member back to a store or toggling them active re-enables the Firebase Auth account, but old sessions remain revoked; staff must log in again.
- Owners can use **Sign out staff** without deactivating the account. This writes `sessionRevokedAt` / `authTokensRevokedAt`, revokes Firebase refresh tokens, and the dashboard session monitor logs the staff member out on the next access check.
- Owner passcode reset also revokes existing sessions so a staff member using the old passcode cannot keep an already-open dashboard session.
- Staff mutation transactions write the authoritative revocation marker before Firebase Auth refresh-token revocation. A rejected last-owner, stale, or conflicting transaction therefore has no token side effect.
- Managers can create and manage ordinary Staff accounts, but cannot mutate an account that has an Owner mapping. Owner rows remain visible but read-only unless the actor can assign roles.
- MenuList platform user blocking uses the same access model: direct user blocks disable Firebase Auth and revoke sessions; tenant/store blocks are enforced by fresh session access checks and protected API guards.
- A user can belong to one tenant and multiple stores inside that tenant.
- If a staff member leaves business A and joins business B, business A removes/deactivates the old tenant account. Business B creates a new staff account, preferably Staff ID + passcode for non-technical staff. Reusing the same personal email across tenants remains blocked until a platform-managed transfer flow exists, preserving tenant isolation and audit history.
- Store role IDs are validated against the target store before staff creation or update, and staff/role target stores must be same-tenant, active, not soft-deleted, and not platform-blocked.
- Old stores missing the default `owner`, `manager`, or `staff` roles are repaired transactionally when staff management loads or creates staff. Concurrent owner role edits are preserved. Existing default roles are normalized with missing permission keys; custom roles keep missing permissions denied until an owner turns them on.
- The `owner` role is locked from role-editor changes so owners cannot remove the last full-access role definition.
- A staff member with the last active owner mapping for a store cannot be deactivated, removed, or demoted until another active owner exists.
- `platformRole` remains separate from store-scoped `role`; `active` / `isVerified` are lifecycle fields, not authorization.
- An unverified placeholder becomes verified only after Firebase Auth creation and the same-user UID binding commit. `EMAIL_EXISTS` and incomplete pre-existing bindings fail closed; MenuList never adopts an unrelated Auth account by email.
- `/api/auth/access-status` invalidates sessions when the authoritative tenant or store is inactive/deleted, not only when the user or entity is blocked.

---

## Related Documentation

| Topic                        | Folder                                                    | Relationship                                     |
| ---------------------------- | --------------------------------------------------------- | ------------------------------------------------ |
| **Multi-Chain Permissions**  | [multi-chain-permissions/](../multi-chain-permissions/)   | Layer 2: OutletPolicy (chain-level restrictions) |
| **Multi-Outlet Consistency** | [multi-outlet-consistency/](../multi-outlet-consistency/) | Uses permissions for outlet management           |
| **Auth & Onboarding**        | [auth-onboarding/](../auth-onboarding/)                   | How first user gets OWNER role                   |
| **Stores Management**        | [stores-management/](../stores-management/)               | Manual store creation flow                       |

# Multi-Chain Permissions — Documentation Hub

> **Feature:** #4B — Multi-Chain Permissions  
> **Status:** ✅ Implemented  
> **Last Updated:** February 13, 2026  
> **Version:** 2.1

> **Scope:** This folder documents the **two-layer permission model** (roles + outlet policy) and their interaction. For Layer 1 details (staff-level RBAC, default roles, `hasPermission()` utility), see [Roles & Permissions](../roles-permissions/). This folder focuses on Layer 2 (OutletPolicy) and the intersection model.

---

## Quick Navigation

| Audience               | Document                                                 | Purpose                                 |
| ---------------------- | -------------------------------------------------------- | --------------------------------------- |
| **CEO / PM / Clients** | [\_spec.md](./multi-chain-permissions_spec.md)           | Business requirements, permission model |
| **Developers**         | [\_impl.md](./multi-chain-permissions_impl.md)           | Technical blueprint, types, enforcement |
| **Sales / Marketing**  | [\_marketing.md](./multi-chain-permissions_marketing.md) | Pitch deck, messaging                   |
| **Firebase Costs**     | [\_firebase.md](./multi-chain-permissions_firebase.md)   | All Firestore reads/writes              |
| **Website Copy**       | [\_website.md](./multi-chain-permissions_website.md)     | Landing page content                    |
| **Help Article**       | [\_helpdoc.md](./multi-chain-permissions_helpdoc.md)     | Customer help documentation             |

---

## What Is This Feature?

**One-liner:** Two-layer permission system — HQ controls what outlets can do, roles control what staff can do.

**Problem Solved:** When a restaurant chain (2–10 stores) uses MenuList, HQ needs to control:

1. What features each outlet store can access (AI tools, theme changes, pricing)
2. What each staff member can do within their assigned store

Without this, outlets could drain AI credits, break brand consistency, or staff could make unauthorized changes.

**Solution:**

- **Layer 1 — Staff Roles:** 3 predefined roles (Owner / Manager / Staff) with 23 boolean permission flags
- **Layer 2 — Outlet Policy:** 15 chain-wide flags set by HQ master store, restricting what ANY outlet user can do
- **Intersection Model:** `effectivePermission = rolePermission AND outletPolicyGate`

---

## Architecture Overview

```
User tries action (e.g., "Generate AI Image")
                    │
                    ▼
┌───────────────────────────────────────────────┐
│  LAYER 1: ROLE CHECK (RolePermissions)        │
│  Does the user's role allow this action?      │
│  Owner → all true                             │
│  Manager → selective (no billing, no AI $$$)  │
│  Staff → minimal (chat only)                  │
└───────────────────────────────────────────────┘
                    │
                    ▼
┌───────────────────────────────────────────────┐
│  LAYER 2: OUTLET POLICY CHECK (OutletPolicy)  │
│  Does the master store allow this for outlets? │
│  Only applied on non-master (outlet) stores   │
│  Master users keep full role permissions      │
└───────────────────────────────────────────────┘
                    │
                    ▼
          ALLOWED ✅  or  BLOCKED ❌
          (Both layers must pass)
```

---

## Permission Categories

### Staff-Level (RolePermissions) — 23 Flags in 9 Categories

> Full permission matrix with all 23 flags documented in [Roles & Permissions Spec](../roles-permissions/roles-permissions_spec.md).

| Category               | Flags | Owner | Manager | Staff |
| ---------------------- | ----- | :---: | :-----: | :---: |
| Billing & Subscription | 2     |  ✅   |   ❌    |  ❌   |
| User Management        | 2     |  ✅   | Partial |  ❌   |
| Store Management       | 2     |  ✅   | Partial |  ❌   |
| Multi-Outlet           | 2     |  ✅   | Partial |  ❌   |
| Menu Management        | 2     |  ✅   |   ✅    |  ❌   |
| AI Features (Credits)  | 3     |  ✅   | Partial |  ❌   |
| Branding               | 3     |  ✅   |   ❌    |  ❌   |
| Content Control        | 3     |  ✅   |   ✅    |  ❌   |
| Analytics & Customer   | 4     |  ✅   | Partial |  Min  |

### Chain-Level (OutletPolicy) — 15 Flags

| Category         | Flags | Purpose                                           |
| ---------------- | ----- | ------------------------------------------------- |
| Override Control | 4     | Price, availability, description, image overrides |
| Local Content    | 3     | Local items, categories, projects                 |
| Structural       | 1     | Project deactivation                              |
| AI Features      | 3     | Menu extraction, descriptions, images             |
| Branding         | 3     | Theme, brand identity, layout                     |
| Language         | 1     | Add languages                                     |

---

## Key Files in Codebase

| Purpose                    | File Path                                           |
| -------------------------- | --------------------------------------------------- |
| **RolePermissions type**   | `src/types/platform/roles.ts`                       |
| **OutletPolicy type**      | `src/types/multiOutlet.types.ts` (lines 145–182)    |
| **Permission constants**   | `src/constants/permissions.ts`                      |
| **Default roles**          | `src/data/defaultRoles.ts`                          |
| **Permission labels (UI)** | `src/data/rolesPermissionsInitialData.ts`           |
| **applyOutletPolicy()**    | `src/lib/permissions/applyOutletPolicy.ts`          |
| **Session integration**    | `src/providers/sessionProvider.tsx` (lines 154–180) |
| **Feature flags**          | `src/config/features.ts`                            |

---

## Enforcement

| Layer               | How                                                      |
| ------------------- | -------------------------------------------------------- |
| **UI (Primary)**    | `userPermissions` from `sessionProvider` → hide features |
| **API (Primary)**   | Server-side checks in route handlers                     |
| **Firestore Rules** | Not yet implemented (API is primary gatekeeper)          |

---

## Feature Flags

| Flag                         | Default | Purpose                             |
| ---------------------------- | ------- | ----------------------------------- |
| `ENABLE_MULTI_OUTLET`        | `false` | Master gate for all multi-outlet    |
| `ENABLE_CHAIN_CONTROL_PANEL` | `false` | Gate Locations page + policy editor |

---

## Related Documentation

| Topic                        | Folder                                                                                      |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| **Multi-Outlet Consistency** | [multi-outlet-consistency/](../multi-outlet-consistency/)                                   |
| **Roles & Permissions**      | [roles-permissions/](../roles-permissions/)                                                 |
| **Store Onboarding**         | [multi-outlet-consistency/store-onboarding/](../multi-outlet-consistency/store-onboarding/) |
| **Core Doctrine**            | [constitution/](../constitution/)                                                           |

---

## Archive

Historical v1 docs (planned architecture that diverged from implementation) preserved in [`_archive/`](./_archive/).

| File                                        | Purpose                                           |
| ------------------------------------------- | ------------------------------------------------- |
| `multi-chain-permissions_spec_v1.md`        | Original spec (2 roles, 7 flags — superseded)     |
| `multi-chain-permissions_impl_v1.md`        | Original impl (StaffRole/checkAccess — not built) |
| `README_v1.md`                              | Original README                                   |
| `chatgpt-conversation-review.md`            | ChatGPT review session                            |
| `multi-chain-permissions_feedback-audit.md` | Feedback audit                                    |

---

## Version History

| Version | Date         | Changes                                                              |
| ------- | ------------ | -------------------------------------------------------------------- |
| 2.0     | Feb 12, 2026 | Complete rewrite from codebase. 23 RolePermissions + 15 OutletPolicy |
| 1.0     | Jan 26, 2026 | Initial spec (7 StorePermissions + 2 StaffRoles)                     |

---

**Document maintained by:** Cascade (Codebase Authority)  
**Source of truth:** This documentation reflects the actual codebase implementation.

# Store Onboarding — Documentation Hub

> **Feature:** #4C — Store Onboarding (Master + Local Outlet)  
> **Parent:** #4 — Multi-Outlet Brand Consistency  
> **Status:** ✅ Implemented  
> **Last Updated:** February 12, 2026

---

## Quick Navigation

| Audience               | Document                                                              | Purpose                                              |
| ---------------------- | --------------------------------------------------------------------- | ---------------------------------------------------- |
| **CEO / PM**           | [store-onboarding_spec.md](./store-onboarding_spec.md)                | Gap analysis, flow mapping, business requirements    |
| **Developers**         | [store-onboarding_impl.md](./store-onboarding_impl.md)               | Internal creation flow (PATH 2), API routes, DB ops  |
| **Developers**         | [store-onboarding-billing_impl.md](./store-onboarding-billing_impl.md) | Razorpay billing flow (PATH 1), quantity model       |

---

## What Is This Sub-Feature?

**One-liner:** Add outlet stores from the master dashboard with billing-first orchestration.

**Two-Path Execution Model:**

```
HQ clicks "Add Outlet"
    │
    ├── PATH 1: Billing (store-onboarding-billing_impl.md)
    │   ├── Validate subscription active
    │   ├── Razorpay quantity increment
    │   └── If billing fails → abort (no orphaned stores)
    │
    └── PATH 2: Internal Creation (store-onboarding_impl.md)
        ├── Atomic lock acquisition (Firestore transaction)
        ├── Create store doc, roles, time slots
        ├── Replicate master projects → outlet
        ├── Update tenant storesList
        └── Release lock
```

---

## Key Files in Codebase

| Purpose                  | File Path                                       |
| ------------------------ | ----------------------------------------------- |
| **Create Outlet API**    | `src/app/api/outlets/create/route.ts`           |
| **Deactivate Outlet API**| `src/app/api/outlets/deactivate/route.ts`       |
| **Switch Store API**     | `src/app/api/auth/switch-store/route.ts`        |
| **Chain Control Panel**  | `src/app/(main)/locations/page.tsx`             |
| **Add Outlet Modal**     | `src/components/organisms/AddOutletModal/`      |
| **Store Switcher**       | `src/components/molecules/StoreSwitcher/`       |
| **Outlet Context Banner**| `src/components/atoms/OutletContextBanner/`     |
| **Project Propagation**  | `src/database/multiOutlet/propagation.ts`       |
| **Feature Flags**        | `src/config/features.ts` (lines 694–722)        |

---

## Feature Flags

| Flag                              | Default | Purpose                                      |
| --------------------------------- | ------- | -------------------------------------------- |
| `ENABLE_OUTLET_CREATION`          | `false` | Gate outlet creation API + UI                |
| `ENABLE_OUTLET_BILLING`           | `false` | Gate Razorpay quantity operations            |
| `ENABLE_OUTLET_DEACTIVATE`        | `false` | Gate outlet deactivation                     |
| `ENABLE_CHAIN_CONTROL_PANEL`      | `false` | Gate Locations page visibility               |
| `ENABLE_BILLING_REMOVAL_IMMEDIATE`| `true`  | Reduce Razorpay quantity on deactivation     |
| `MAX_OUTLETS_PER_TENANT`          | `30`    | Hard limit on outlet count                   |
| `ENABLE_PROJECT_PROPAGATION`      | `false` | Auto-create outlet projects on master create |

---

## Archived Docs

| File | Original Purpose | Why Archived |
| ---- | ---------------- | ------------ |
| `_archive/store-onboarding-architecture-audit.md` | One-time architecture audit before implementation | Findings applied, issues fixed |

---

**Parent Documentation:** [Multi-Outlet Consistency](../README.md)

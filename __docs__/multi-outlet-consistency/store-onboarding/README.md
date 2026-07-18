# Store Onboarding — Documentation Hub

> **Feature:** #4C — Store Onboarding (Master + Local Outlet)  
> **Parent:** #4 — Multi-Outlet Brand Consistency  
> **Status:** Implemented source evidence; not current launch certification
> **Last Updated:** July 16, 2026

> **Code-truth boundary:** Outlet creation is billing/capacity-first and then commits store, tenant list, user access, public summaries, slug claim, and inherited project shells atomically. Current authority and capacity are rechecked in the creation transaction. Deactivation commits store/tenant/summary state first, then attempts a Razorpay-managed quantity reduction; a failed or unsupported reduction is returned as pending owner follow-up and can be retried by calling deactivation again. Manual/offline quantity is prepaid capacity and is not automatically reduced.

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
| **Feature Flags**        | `src/config/features.ts`                        |

---

## Feature Flags

| Flag                              | Default | Purpose                                      |
| --------------------------------- | ------- | -------------------------------------------- |
| `ENABLE_OUTLET_CREATION`          | `true`  | Gate outlet creation API + UI                |
| `ENABLE_OUTLET_BILLING`           | `true`  | Gate billing/capacity checks                 |
| `ENABLE_OUTLET_DEACTIVATE`        | `true`  | Gate outlet deactivation                     |
| `ENABLE_CHAIN_CONTROL_PANEL`      | `true`  | Gate Locations owner surfaces                |
| `ENABLE_BILLING_REMOVAL_IMMEDIATE`| `true`  | Reduce Razorpay quantity on deactivation     |
| `MAX_OUTLETS_PER_TENANT`          | `30`    | Hard limit on outlet count                   |
| `ENABLE_PROJECT_PROPAGATION`      | `true`  | Auto-create outlet projects on master create |

---

## Archived Docs

| File | Original Purpose | Why Archived |
| ---- | ---------------- | ------------ |
| `_archive/store-onboarding-architecture-audit.md` | One-time architecture audit before implementation | Findings applied, issues fixed |
| `_archive/store-onboarding_impl-historical-through-2026-07-14.md` | Outlet-creation design blueprint | Replaced by a concise code-truth implementation contract |
| `_archive/store-onboarding-billing_impl-historical-through-2026-07-14.md` | Billing design blueprint | Replaced by current Razorpay, UPI replacement, manual-capacity, compensation, and deactivation behavior |

---

**Parent Documentation:** [Multi-Outlet Consistency](../README.md)

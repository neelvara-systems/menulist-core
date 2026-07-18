# Multi-Outlet Brand Consistency — Documentation Hub

> **Feature:** #4 — Multi-Store Menu Consistency  
> **Status:** Implemented source evidence; not current launch certification
> **Last Updated:** July 16, 2026
> **Version:** 4.4

> **Scope:** Master/outlet store linking, project replication, override fields, AI extraction integration, and store onboarding. For permissions, see [Roles & Permissions](../roles-permissions/) (Layer 1) and [Multi-Chain Permissions](../multi-chain-permissions/) (Layer 2). For platform admin store CRUD, see [Stores Management](../stores-management/).
>
> **Launch Boundary:** This documentation hub records implemented Multi-Outlet source evidence, not current production-launch approval. Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, `npm run verify:multi-location-boundary`, desktop/mobile Locations browser QA, linked outlet save QA, Razorpay sandbox evidence where billing is involved, Firebase deploy evidence where rules/functions change, and target-environment smoke.

> **July 16, 2026 code-truth checkpoint:** The source flags listed below are enabled. Outlet create, policy, rename, deactivate, linked-menu save, and brand propagation recheck current store/tenant authority in their write transactions. Outlet creation caps inherited master-project replication at 200 projects, deactivation can retry an unfinished Razorpay quantity reduction, and desktop/mobile Locations surface billing follow-up when deactivation commits but provider reduction remains pending. Public linked-menu resolution rejects cross-tenant, same-store, deleted, or inactive master references. These are local source guarantees; hosted browser, Razorpay sandbox, and deployment evidence remain external gates.

---

## Quick Navigation

### Core Docs (Feature #4)

| Audience               | Document                                                          | Purpose                                       |
| ---------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| **CEO / PM / Clients** | [\_spec.md](./multi-outlet-consistency_spec.md)                   | Business requirements, user flows, scope      |
| **Developers**         | [\_impl.md](./multi-outlet-consistency_impl.md)                   | Technical blueprint, DB schema, API contracts |
| **Sales / Marketing**  | [\_marketing.md](./multi-outlet-consistency_marketing.md)         | Pitch deck, landing page copy, messaging      |
| **QA / Testing**       | [\_test-cases.md](./multi-outlet-consistency_test-cases.md)       | 124 test cases, QA matrix, edge cases         |
| **AI Integration**     | [\_ai-extraction.md](./multi-outlet-consistency_ai-extraction.md) | How AI extraction works with multi-outlet     |
| **Verification**       | [\_verification.md](./multi-outlet-consistency_verification.md)   | Implementation verification, bugs found/fixed |
| **Firebase Costs**     | [\_firebase.md](./multi-outlet-consistency_firebase.md)           | All Firestore reads/writes/deletes            |
| **Mobile Support**     | [\_mobile-support.md](./multi-outlet-consistency_mobile-support.md) | Mobile owner flow and data parity             |
| **Website Copy**       | [\_website.md](./multi-outlet-consistency_website.md)             | Landing page content                          |
| **Help Article**       | [\_helpdoc.md](./multi-outlet-consistency_helpdoc.md)             | Customer help documentation                   |

### Sub-Features

| Sub-Feature                       | Folder / File                                                          | Purpose                                        |
| --------------------------------- | ---------------------------------------------------------------------- | ---------------------------------------------- |
| **#4.1 Master Updates Awareness** | [master-updates-awareness_impl.md](./master-updates-awareness_impl.md) | Operational awareness when master menu changes |
| **#4C Store Onboarding**          | [store-onboarding/](./store-onboarding/)                               | Outlet creation, billing, Chain Control Panel  |

### Related Docs (Other Folders)

| Topic                 | Folder                                                     | What's There                                      |
| --------------------- | ---------------------------------------------------------- | ------------------------------------------------- |
| **Permissions**       | [roles-permissions/](../roles-permissions/)             | `canManageOutlets`, `canSwitchStores`, RBAC model |
| **Chain Permissions** | [multi-chain-permissions/](../multi-chain-permissions/) | `OutletPolicy`, chain-level permission gates      |
| **Stores Management** | [stores-management/](../stores-management/)             | Store CRUD, multi-store data model                |
| **Razorpay Billing**  | [razorpay/](../razorpay/)                               | Subscription flow, quantity-based pricing         |

---

## What Is This Feature?

**One-liner:** Run every store from one master menu.

**Problem Solved:** Premium restaurant groups with 2–10 stores face constant drift — item names differ, prices change silently, items disappear at certain locations. HQ cannot trust what guests are seeing.

**Solution:** HQ updates menu once → linked stores inherit the saved changes through the outlet sync/cache path → brand-critical fields stay consistent by default.

---

## Document Purpose Guide

### For Business Stakeholders (CEO, PM, Clients)

📖 **Start here:** [multi-outlet-consistency_spec.md](./multi-outlet-consistency_spec.md)

Contains:

- Executive summary (what and why)
- User stories and flows (business language)
- Scope (in-scope vs out-of-scope)
- Success metrics
- Target customers (ICP)

### For Developers (Implementation Reference)

📖 **Start here:** [multi-outlet-consistency_impl.md](./multi-outlet-consistency_impl.md)

Contains:

- Database schema (Firestore structure)
- API contracts and DAL functions
- File inventory with exact paths
- Security checklist
- Implementation patterns

### For Sales & Marketing Teams

📖 **Start here:** [multi-outlet-consistency_marketing.md](./multi-outlet-consistency_marketing.md)

Contains:

- Elevator pitch (30-second hook)
- Pitch deck outline (7 slides)
- Landing page copy hooks
- Sales talking points
- Approved language (what to say, what to avoid)

### For QA & Testing

📖 **Start here:** [multi-outlet-consistency_test-cases.md](./multi-outlet-consistency_test-cases.md)

Contains:

- 124 test scenarios with status
- QA test matrix (T1-T40)
- Chain extraction scenarios (42-69)
- Edge cases and resolution rules
- Implementation coverage summary

### For AI Extraction Integration

📖 **Start here:** [multi-outlet-consistency_ai-extraction.md](./multi-outlet-consistency_ai-extraction.md)

Contains:

- How AI extraction works with multi-outlet
- First extraction vs re-extraction flows
- Comparison engine logic
- Preview and apply workflows
- Job lifecycle and blocking behavior

---

## Architecture Overview (60-Second Summary)

```
┌─────────────────────────────────────────────────────────────┐
│                      TENANT (Restaurant Group)              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────────┐                                       │
│   │  MASTER STORE   │  ← HQ updates menu here               │
│   │  (HQ Project)   │                                       │
│   └────────┬────────┘                                       │
│            │                                                │
│            │ masterProjectId (reference, not copy)          │
│            ▼                                                │
│   ┌────────────────────────────────────────────────────┐   │
│   │              OUTLET STORES (1 to N)                 │   │
│   ├──────────────┬──────────────┬──────────────────────┤   │
│   │  Outlet A    │   Outlet B   │      Outlet C        │   │
│   │  (inherits)  │  (inherits)  │     (inherits)       │   │
│   │  +overrides  │  +overrides  │    +local items      │   │
│   └──────────────┴──────────────┴──────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Key Concepts:**

- **Master Project:** Single source of truth for menu items
- **Outlet Project:** Inherits from master, can add local overrides
- **Override:** Outlet-specific price, availability, or active state
- **Local-Only Item/Category:** Outlet-only records use `L_I_` and `L_C_` prefixes
- **Inheritance:** Real-time resolution at read-time (no sync needed)

---

## Key Files in Codebase

### Core (Feature #4)

| Purpose                | File Path                                                           |
| ---------------------- | ------------------------------------------------------------------- |
| **Resolver**           | `src/lib/multiOutlet/resolveProject.ts`                             |
| **DAL Functions**      | `src/database/multiOutlet/index.ts`                                 |
| **Propagation**        | `src/database/multiOutlet/propagation.ts`                           |
| **Types**              | `src/components/templates/main-app/projects/types/project.types.ts` |
| **Multi-Outlet Types** | `src/types/multiOutlet.types.ts`                                    |
| **Feature Flags**      | `src/config/features.ts`                                            |
| **UI Badge**           | `src/components/atoms/InheritanceBadge/index.tsx`                   |
| **AI Extraction**      | `src/lib/extraction/comparisonEngine.ts`                            |
| **Job Listener**       | `src/hooks/useMenuProcessingJob.ts`                                 |
| **Master Job Status**  | `src/hooks/useMasterJobStatus.ts`                                   |
| **Session Store Context** | `src/providers/sessionProvider.tsx`                              |

### Store Onboarding (Feature #4C)

| Purpose                   | File Path                                   |
| ------------------------- | ------------------------------------------- |
| **Create Outlet API**     | `src/app/api/outlets/create/route.ts`       |
| **Deactivate Outlet API** | `src/app/api/outlets/deactivate/route.ts`   |
| **Switch Store API**      | `src/app/api/auth/switch-store/route.ts`    |
| **Chain Control Panel**   | `src/app/(main)/locations/page.tsx`         |
| **Add Outlet Modal**      | `src/components/organisms/AddOutletModal/`  |
| **Store Switcher**        | `src/components/molecules/StoreSwitcher/`   |
| **Outlet Context Banner** | `src/components/atoms/OutletContextBanner/` |

### Permissions

| Purpose                       | File Path                                  |
| ----------------------------- | ------------------------------------------ |
| **Outlet Policy Enforcement** | `src/lib/permissions/applyOutletPolicy.ts` |
| **Permission Constants**      | `src/constants/permissions.ts`             |
| **Role Permissions Type**     | `src/types/platform/roles.ts`              |
| **Default Roles**             | `src/data/defaultRoles.ts`                 |
| **Session Integration**       | `src/providers/sessionProvider.tsx`        |

---

## Feature Flags

| Flag                               | Default | Scope                                        |
| ---------------------------------- | ------- | -------------------------------------------- |
| `ENABLE_MULTI_OUTLET`              | `true`  | Master gate for all multi-outlet features    |
| `ENABLE_OUTLET_CREATION`           | `true`  | Gate outlet creation API + UI                |
| `ENABLE_OUTLET_BILLING`            | `true`  | Gate quantity/capacity checks                |
| `ENABLE_OUTLET_PRORATION_DISPLAY`  | `true`  | Show eligible Razorpay proration estimate    |
| `ENABLE_OUTLET_DEACTIVATE`         | `true`  | Gate outlet deactivation                     |
| `ENABLE_CHAIN_CONTROL_PANEL`       | `true`  | Gate Locations owner surfaces                |
| `ENABLE_PROJECT_PROPAGATION`       | `true`  | Auto-create outlet projects on master create |
| `ENABLE_MASTER_UPDATE_AWARENESS`   | `true`  | Non-blocking operational awareness           |
| `ENABLE_BILLING_REMOVAL_IMMEDIATE` | `true`  | Reduce Razorpay quantity on deactivation     |
| `MAX_OUTLETS_PER_TENANT`           | `30`    | Hard limit on outlet count per tenant        |

All values above are current source defaults in `src/config/features.ts`; deployment readiness is tracked separately by the launch boundary.

---

## Archive

Historical audit and review files are preserved in [`_archive/`](./_archive/) for reference.

| File                                             | Purpose                                        |
| ------------------------------------------------ | ---------------------------------------------- |
| `cascade-full-session-jan24-2026.md`             | Development session log                        |
| `chatgpt-conversation-critical-review.md`        | Initial ChatGPT proposal review                |
| `multi-outlet-consistency_doc-feedback-audit.md` | Documentation feedback audit                   |
| `multi-outlet-consistency_feedback-audit.md`     | Code feedback audit                            |
| `multi-outlet-consistency_roadmap.md`            | Feature roadmap and rejected suggestions       |
| `multi-outlet-consistency_validation.md`         | Implementation validation report               |
| `ai-extraction-workflow-explained.md`            | Detailed extraction workflow                   |
| `editor-update-flow.md`                          | Editor update flow details                     |
| `image-processing-flow.md`                       | Image processing flow details                  |
| `initial-menu-rendering.md`                      | Menu rendering flow details                    |
| `store-onboarding-architecture-audit.md`         | One-time architecture audit (findings applied) |
| `master-updates-awareness_verification.md`       | Feature #4.1 verification (merged into main)   |
| `store-onboarding-chatgpt-review-2.md`           | ChatGPT review session 2                       |
| `store-onboarding-chatgpt-review-3.md`           | ChatGPT review session 3                       |
| `store-onboarding_impl-historical-through-2026-07-14.md` | Historical outlet-creation design blueprint |
| `store-onboarding-billing_impl-historical-through-2026-07-14.md` | Historical billing design blueprint |

---

## Quick Reference: Core Functions

| Function                         | Purpose                          | File                   |
| -------------------------------- | -------------------------------- | ---------------------- |
| `resolveProjectForRender()`      | Merge master + outlet data       | `resolveProject.ts`    |
| `setProjectAsMaster()`           | Mark project as master           | `multiOutlet/index.ts` |
| `linkStoreToMaster()`            | Link outlet to master            | `multiOutlet/index.ts` |
| `applyItemOverride()`            | Set outlet price/availability    | `multiOutlet/index.ts` |
| `removeItemOverride()` / `removeCategoryOverride()` | Reset one inherited value with a field-level delete that preserves concurrent sibling overrides | `multiOutlet/index.ts` |
| `propagateNewProjectToOutlets()` | Auto-create outlet projects      | `propagation.ts`       |
| `runComparisonEngine()`          | Compare extracted vs existing    | `comparisonEngine.ts`  |
| `applyExtractionChanges()`       | Save approved changes            | `applyChanges.ts`      |
| `applyOutletPolicy()`            | Enforce master policy on outlets | `applyOutletPolicy.ts` |

---

## Version History

| Version | Date         | Changes                                                           |
| ------- | ------------ | ----------------------------------------------------------------- |
| 4.0     | Feb 12, 2026 | Store onboarding subfolder, permissions layer, doc reorganization |
| 3.1     | Feb 12, 2026 | Feature #4C store onboarding, billing, Chain Control Panel        |
| 3.0     | Jan 25, 2026 | Added chain extraction scenarios (42-69), reorganized docs        |
| 2.0     | Jan 22, 2026 | Added AI extraction integration, test cases                       |
| 1.0     | Jan 20, 2026 | Initial spec, impl, marketing docs                                |

---

**Document maintained by:** Cascade (Codebase Authority)  
**Source of truth:** This documentation reflects the actual codebase implementation.

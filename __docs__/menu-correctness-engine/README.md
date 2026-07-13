# Menu Correctness Engine (MCE)

**Menu data is validated at save time before supported publishing flows continue.**

---

## What This Is

The Menu Correctness Engine is a validation layer that runs on every menu save, checking whether project data is complete, valid, and safe before supported customer-facing publishing flows continue. MCE validates — it does not duplicate, route, or store separate copies of data.

Supported surfaces read from the same Firestore project document through their existing refresh, download, device, or provider paths. MCE adds the missing piece: **deterministic validation at save-time** and verification metadata (`_mce` field) stamped on the existing document.

| Surface                | How MCE Protects It                               |
| ---------------------- | ------------------------------------------------- |
| 🌐 **QR/Web Menu**     | Validated project data served via Firestore       |
| 📺 **Digital Screens** | Same validated data via server-only `getMenuItemsForScreenServer()` |
| 📄 **PDF Menu**        | Generated on-demand from validated project data   |
| 🤖 **Staff Prompt**    | Same Firestore project document (live read)       |
| 🔗 **POS Webhook**     | Same project data via webhook sync                |

---

## Quick Navigation

| You Are…               | Read This                              |
| ---------------------- | -------------------------------------- |
| CEO / PM               | `menu-correctness-engine_spec.md`      |
| Developer              | `menu-correctness-engine_impl.md`      |
| Sales / Marketing      | `menu-correctness-engine_marketing.md` |
| Website Content Writer | `menu-correctness-engine_website.md`   |
| Support Team           | `menu-correctness-engine_helpdoc.md`   |
| Firebase / Cost Audit  | `menu-correctness-engine_firebase.md`  |

---

## Problem Solved

**Without MCE:** A price change in the editor may reach Firestore but with invalid data (missing name, broken category reference, negative price). Each surface independently reads this data without any validation gate. The owner doesn't know if the menu state is complete and correct.

**With MCE:** Every audited project edit passes through CSR validation before the write. Invalid data is flagged immediately. Verification metadata is stamped on the project document. Supported surfaces continue reading from the same document through their own refresh, download, device, or provider paths.

---

## Architecture Overview

```
Owner Edits Menu (Dashboard Editor)
    │
    ▼
┌─────────────────────────────────┐
│  Correctness State Resolver     │  ← Validates completeness & safety
│  (CSR) — client-side, < 100ms  │
└─────────┬───────────────────────┘
          │
          ▼
┌─────────────────────────────────┐
│  Stamp _mce metadata on         │  ← Part of same setDoc() call
│  existing project document      │
└─────────┬───────────────────────┘
          │
    ┌─────┼─────┬──────┬──────┐
    ▼     ▼     ▼      ▼      ▼
   QR   Screen  PDF  Staff   POS
   Web   TV    Export Prompt  Webhook
  (all read from same project document — unchanged)
```

**No separate snapshot collection. No routing layer. No background Cloud Functions in v1.**

---

## Key Files (Codebase — Implemented)

| File                                 | Purpose                           |
| ------------------------------------ | --------------------------------- |
| `src/lib/mce/correctnessResolver.ts` | CSR — validation logic            |
| `src/lib/mce/types.ts`               | All MCE types                     |
| `src/lib/mce/utils.ts`               | Centralized `sanitizeForClient()` |
| `src/lib/mce/index.ts`               | MCE entry point — `mceValidate()` |
| `src/config/features.ts`             | Feature flag: `ENABLE_MCE`        |

---

## Feature Flag

| Flag         | Default | Purpose                        |
| ------------ | ------- | ------------------------------ |
| `ENABLE_MCE` | `true` | Enable Menu Correctness Engine |

The current runtime has MCE enabled in `src/config/features.ts`. All audited `updateProject()` saves pass through CSR validation and `_mce` metadata is stamped on the project document as part of the same write. If the flag is disabled in a future rollback, the existing direct-write flow continues without stamping `_mce`.

---

## Key Concepts

- **Correctness State Resolver (CSR):** Client-side validation engine that checks menu data against deterministic rules on every save. Zero Firebase cost.
- **`_mce` Verification Metadata:** Field added to existing project document (`verified`, `verifiedAt`, `warnings`). Part of the same `setDoc` call — zero extra writes.
- **Centralized Sanitization:** `sanitizeForClient()` extracted from `_client/[[...slug]]/page.tsx` into shared `src/lib/mce/utils.ts` for all surface data paths.

---

## The 5 Correctness Laws

Every save must pass all 5 laws before project data is marked as verified.

| Law | Name                       | Core Rule                                                              |
| --- | -------------------------- | ---------------------------------------------------------------------- |
| 1   | **Price Integrity**        | One correct, valid price per item per outlet. No conflicts, no empties |
| 2   | **Availability Integrity** | Disabled items are removed from saved project data; supported surfaces refresh through their own paths |
| 3   | **Hours Data Consistency** | Hours data consistent in the saved source that supported surfaces read |
| 4   | **Data Completeness**      | All fields present and valid. No empty names, no broken references     |
| 5   | **Structural Integrity**   | Master→outlet inheritance stable; local overrides preserved            |

---

## Authority Model

MCE follows 6 authority rules (see `_spec.md` §5 for details):

1. Controls validation, not editor — owner can edit freely
2. Validate on every save — silent, fast (< 100ms client-side)
3. Never block the save — raw data write always succeeds
4. Silent authority, zero notifications
5. Per-outlet independence — each outlet validates independently
6. Multi-outlet protection — `resolveProjectForRender()` output validated

---

## Hardening Review (From Stress Tests)

During stress testing, we evaluated 10 hardening requirements. **8 of 10 are already handled by existing codebase features.** Only 2 are new CSR validation rules.

| ID   | Requirement                        | Status          |
| ---- | ---------------------------------- | --------------- |
| H-2  | Override preservation validation   | ✅ New CSR rule |
| H-9  | Structural completeness validation | ✅ New CSR rule |
| H-1  | Per-outlet data isolation          | Already handled |
| H-3  | Per-outlet sync independence       | Already handled |
| H-4  | New outlet safe activation         | Already handled |
| H-5  | Rapid edit consolidation           | Already handled |
| H-6  | Screen/device localStorage cache   | Already exists  |
| H-7  | Offline screen non-blocking        | Already handled |
| H-8  | Dynamic PDF generation             | Already handled |
| H-10 | Staff view = customer view         | Already true    |

---

## Related Features

| Feature                  | Relationship                                     |
| ------------------------ | ------------------------------------------------ |
| Pricing Integrity System | PIS price validation rules become CSR rules      |
| Multi-Outlet Consistency | MCE validates `resolveProjectForRender()` output |
| POS Webhook Sync         | POS reads same validated project data            |
| Digital Screens          | Screens read same validated project data         |

---

## Firebase Cost Impact

**$0.00/month additional.** CSR runs client-side. `_mce` metadata is part of existing `setDoc` call. No new collections, no new reads, no new writes. See `_firebase.md` for details.

---

_Last Updated: June 11, 2026_

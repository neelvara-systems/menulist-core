# Pricing Integrity System

**Consistent prices across all menu surfaces**

---

## What This Is

Pricing Integrity ensures that when an owner changes a price, it automatically propagates to all surfaces:

| Surface                | Sync Method                    |
| ---------------------- | ------------------------------ |
| 🌐 **QR/Web Menu**     | Live Firestore (already works) |
| 📄 **PDF Menu**        | Staleness tracking + footer    |
| 📺 **Digital Screens** | Version polling                |
| 🤖 **Staff Prompt**    | Live Firestore (already works) |

---

## Documentation

| File            | Purpose                                         |
| --------------- | ----------------------------------------------- |
| `spec.md`       | Product specification (non-tech, for CEO/teams) |
| `impl.md`       | Implementation details (dev-only)               |
| `marketing.md`  | Marketing & sales collateral                    |
| `validation.md` | Implementation validation report                |

---

## Key Architecture

```
Price Change (Dashboard)
    │
    ├─► Firestore Update (instant)
    │       └─► QR/Web + Staff Prompt see new price immediately
    │
    ├─► PDF Status → STALE
    │       └─► Next download generates fresh PDF with "Updated on" footer
    │
    ├─► Screen Version Bump
    │       └─► Digital screens poll and refresh
    │
    └─► MOL Event Logged (audit trail)
```

---

## Key Files (Codebase)

| File                                   | Purpose                        |
| -------------------------------------- | ------------------------------ |
| `src/lib/pricing/integrityEngine.ts`   | Core orchestrator              |
| `src/lib/pricing/formatMenuPrice.ts`   | Shared public/owner price display formatter |
| `src/lib/pricing/molLogger.ts`         | Audit logging (MOL)            |
| `src/lib/pricing/pdfQueue.ts`          | Background regen (flagged OFF) |
| `src/lib/validation/pricing.schema.ts` | Zod validation schemas         |
| `src/types/mol.types.ts`               | MOL event types                |
| `src/types/jobs.types.ts`              | Job queue types                |
| `src/lib/export/menuPdfGenerator.ts`   | PDF generation + footer        |

---

## Feature Flags

| Flag                          | Default | Purpose                            |
| ----------------------------- | ------- | ---------------------------------- |
| `ENABLE_BACKGROUND_PDF_REGEN` | `false` | Enable background PDF regeneration |

Enable only if users report slowness with on-demand PDF generation.

---

## Extending This Feature

1. **Add new surface:** Update `integrityEngine.ts` to track staleness
2. **Add new MOL event type:** Update `mol.types.ts` + `molLogger.ts`
3. **Change validation rules:** Update `pricing.schema.ts`

---

_Last Updated: June 11, 2026_

# System Strengthening — Infrastructure Hardening

**Phase:** System Strengthening  
**Created:** January 4, 2026 (strategic plan) → February 7, 2026 (codebase audit)  
**Auditor:** Cascade (Lead Architect)  
**Scope:** Full codebase — Database layer, API routes, Hooks, Components, Middleware  
**Governing Rule:** 3-Year Architecture Freeze (Law 1)  
**Purpose:** Harden MenuListAi for 3+ year untouched operation. If you need to understand _what was found and why changes were made_, this folder is the single source of truth.

---

## Quick Navigation

### Active Documents (Current)

| Document                                                           | Audience   | Purpose                                                                       |
| ------------------------------------------------------------------ | ---------- | ----------------------------------------------------------------------------- |
| **[system-strengthening_impl.md](./system-strengthening_impl.md)** | Developers | Codebase audit findings + implementation plan with exact file:line references |

### Archive (Historical Reference)

All historical audit documents that led to the current implementation plan. These are preserved for context — _what was analyzed, when, and by whom_.

| Document                                                                                                        | Date        | What It Contains                                                          |
| --------------------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------- |
| **[\_archive/original-README-jan4.md](./_archive/original-README-jan4.md)**                                     | Jan 4, 2026 | Original strategic strengthening plan (ChatGPT-based, 17 items)           |
| **[\_archive/baseline.md](./_archive/baseline.md)**                                                             | Jan 4, 2026 | Current system state inventory at time of first audit                     |
| **[\_archive/alignment.md](./_archive/alignment.md)**                                                           | Jan 4, 2026 | Gap analysis vs ChatGPT recommendations                                   |
| **[\_archive/improvements-spec.md](./_archive/improvements-spec.md)**                                           | Jan 4, 2026 | Detailed technical specifications for 17 improvement items                |
| **[\_archive/improvements-checklist.md](./_archive/improvements-checklist.md)**                                 | Jan 4, 2026 | Actionable implementation tasks from Jan 4 plan                           |
| **[\_archive/metrics.md](./_archive/metrics.md)**                                                               | Jan 4, 2026 | Success measurement plan                                                  |
| **[\_archive/SYSTEM-INFRASTRUCTURE-AUDIT.md](./_archive/SYSTEM-INFRASTRUCTURE-AUDIT.md)**                       | Feb 5, 2026 | Full system infrastructure audit (all surfaces, costs, failure scenarios) |
| **[\_archive/CUSTOMER-FACING-INFRA-AUDIT.md](./_archive/CUSTOMER-FACING-INFRA-AUDIT.md)**                       | Feb 7, 2026 | Deep codebase trace of every customer-facing surface                      |
| **[\_archive/WRITE-DISCIPLINE-AUDIT.md](./_archive/WRITE-DISCIPLINE-AUDIT.md)**                                 | Feb 7, 2026 | All 25 write paths to project docs, discipline analysis                   |
| **[\_archive/CHATGPT-CUSTOMER-INFRA-CRITICAL-REVIEW.md](./_archive/CHATGPT-CUSTOMER-INFRA-CRITICAL-REVIEW.md)** | Feb 7, 2026 | ChatGPT customer infra review with Cascade cross-check (9 tasks)          |

---

## Timeline

| Date        | Event                                              | Output                                                                 |
| ----------- | -------------------------------------------------- | ---------------------------------------------------------------------- |
| Jan 4, 2026 | Strategic hardening plan (ChatGPT conversation)    | `_archive/baseline.md`, `improvements_spec.md`, etc. (17 items)        |
| Feb 5, 2026 | Full infrastructure audit (section-by-section)     | `_archive/SYSTEM-INFRASTRUCTURE-AUDIT.md`                              |
| Feb 7, 2026 | Customer infra deep audit + write discipline audit | `_archive/CUSTOMER-FACING-INFRA-AUDIT.md`, `WRITE-DISCIPLINE-AUDIT.md` |
| Feb 7, 2026 | ChatGPT infra review cross-check (Cascade)         | `_archive/CHATGPT-CUSTOMER-INFRA-CRITICAL-REVIEW.md`                   |
| Feb 7, 2026 | **Codebase-level audit — CURRENT PLAN**            | **`system-strengthening_impl.md`** (11 findings, 4 phases)             |

---

## Current Status (July 2, 2026)

The Feb 7 audit findings are now closed or explicitly accepted with source gates. The maintained local proof is:

```bash
npm run verify:system-strengthening
```

| Finding | Current Status | Source-Gated Boundary |
| ------- | -------------- | --------------------- |
| SS-1 | Closed | Active analytics HTTP routes use `withAuth`; GA read routes also require analytics permission, property scoping, rate limiting, and bounded failure logging. |
| SS-2 | Closed | The 10 DAL files from the original finding no longer keep module-level session caches and fetch through `getActiveSession()`. |
| SS-3 | Closed | The batch image worker is admitted by Firebase project header plus `BATCH_IMAGE_GENERATION_WORKER_SECRET`, bounded JSON, schema validation, job scope checks, and AI accounting. |
| SS-4 | Closed | `/api/screen/seen` uses declared body rejection, hashed IP and token rate limits, bounded JSON, direct store eligibility checks, and one daily write. |
| SS-5 | Closed | The original AI route group is guarded by auth or worker-secret admission, SAFE_MODE, rate limits, bounded bodies where applicable, validation, permissions, capacity checks, and accounting. |
| SS-6 | Accepted | Chat message feedback stays on the bounded session message array to preserve reopen behavior and original message shape in one document. |
| SS-7 | Closed | Browser subscription reads do not mutate billing docs; server-owned expiry paths perform authoritative expiry writes and entitlement sync. |
| SS-8 | Closed | Preset deletion cascade stages modified project writes in Firestore batches and revalidates public cache after commit. |
| SS-9 | Closed | `src/app/api` and `src/database` contain no `console.log`, `console.warn`, or `console.error` calls. |

The historical Feb 7 implementation plan remains below as the original audit record.

---

## Folder Naming Note

This folder was consolidated from `system_strengthening/` (underscore, Jan 4) + `system-strengthening/` (hyphen, Feb 7). The canonical folder uses **kebab-case** per naming convention. Old files are in `_archive/`.

---

**Version History:**

| Version | Date        | Changes                                                         |
| ------- | ----------- | --------------------------------------------------------------- |
| 1.0     | Jan 4, 2026 | Initial strategic plan (17 items from ChatGPT)                  |
| 2.0     | Feb 7, 2026 | Codebase-level audit (11 findings), consolidated all audit docs |

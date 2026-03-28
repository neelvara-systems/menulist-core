# Canonical Truth Infrastructure

> MenuList's core identity: the single, authoritative source for public business information.

## Quick Navigation

| Document | Audience | Purpose |
|----------|----------|---------|
| [Spec](canonical-truth-infrastructure_spec.md) | CEO/PM | Business requirements, why this matters |
| [Impl](canonical-truth-infrastructure_impl.md) | Developers | Technical blueprint, schemas, file paths |
| [Firebase](canonical-truth-infrastructure_firebase.md) | Cost Control | Every read/write with cost estimates |
| [Phase 0 Verification](canonical-truth-infrastructure_phase0-verification.md) | Developers | Codebase audit results |

## What Is This?

Canonical Truth Infrastructure is the foundational layer that makes MenuList **infrastructure, not a tool**. It encompasses:

1. **Schema & Data Integrity** — Strict validation at every gate (import, save, publish)
2. **Event Ledger** — Append-only change tracking (MOL) for data gravity
3. **Versioning** — Global version ID per publish, monotonic, immutable
4. **Menu Snapshots** — Point-in-time menu state on every publish
5. **Reliability Metrics** — Completeness scores, truth metrics per store

## Architecture Overview

```
Owner edits menu → MCE validates → updateProject() → MOL logs changes
                                                    ↓
Owner clicks publish → publishProject() → version++ → snapshot saved → surfaces updated
                                                    ↓
                                        All surfaces read same version
```

## Key Files

| File | Purpose |
|------|---------|
| `src/database/projects/index.ts` | Publish pipeline, MCE + MOL integration |
| `src/database/menuChangeLog/index.ts` | Append-only event ledger DAL |
| `src/lib/mce/` | Menu Correctness Engine (validation) |
| `src/types/menuObservation.ts` | MOL types (change log, drift metrics) |
| `src/config/features.ts` | Feature flags (ENABLE_MCE, ENABLE_MENU_OBSERVATION) |
| `src/constants/database.ts` | Collection names |

## Feature Flags

| Flag | Purpose | Default |
|------|---------|---------|
| `ENABLE_MCE` | Menu Correctness Engine validation | `true` |
| `ENABLE_MENU_OBSERVATION` | Menu change tracking (MOL) | `true` |
| `ENABLE_MENU_SNAPSHOTS` | Publish-time menu snapshots | `true` |

## Version History

| Date | Change | By |
|------|--------|-----|
| 2025-02-24 | Initial creation — Phase 0 verification + Phase 1 implementation | Cascade |

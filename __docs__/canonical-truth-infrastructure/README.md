# Canonical Truth Infrastructure

> MenuList's core identity: the single, authoritative source for public business information.

## Quick Navigation

| Document | Audience | Purpose |
|----------|----------|---------|
| [Firebase](canonical-truth-infrastructure_firebase.md) | Cost Control | Every read/write with cost estimates |
| [Phase 0 Verification](canonical-truth-infrastructure_phase0-verification.md) | Developers | Codebase audit results |

## What Is This?

Canonical Truth Infrastructure is the foundational layer that makes MenuList **infrastructure, not a tool**. It encompasses:

1. **Schema & Data Integrity** — Strict validation at every gate (import, save, publish)
2. **Event Ledger** — Append-only change tracking (MOL) for data gravity
3. **Versioning** — Global version ID per publish, monotonic, immutable
4. **Menu Snapshots** — Best-effort, short-term point-in-time menu state on publish
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

## Current runtime boundaries

- MOL defaults to one compact revision summary only when menu item truth changes; detailed per-item mode is an explicit debugging/learning switch.
- A publish queues one PUBLISH event and at most one snapshot. Observation failure never rolls back the authoritative project publish.
- Linked outlet publish observation uses the resolved master-plus-outlet menu and reuses the master read already required for publish admission.
- Snapshot payloads above the 900 KiB preflight boundary are skipped rather than sent to Firestore as guaranteed oversize failures.
- Snapshot documents carry `expiresAt` at 90 days. Because the current path uses dynamic store-named subcollections, native collection-group TTL cannot target the snapshot documents. The existing leased maintenance scheduler rotates a bounded daily page across all known stores, including inactive stores, and deletes expired rows in capped per-store batches.

## Version History

| Date | Change | By |
|------|--------|-----|
| 2025-02-24 | Initial creation — Phase 0 verification + Phase 1 implementation | Cascade |
| 2026-07-16 | Resolved outlet snapshots, size preflight, summary-mode and TTL truth documented | Codex |

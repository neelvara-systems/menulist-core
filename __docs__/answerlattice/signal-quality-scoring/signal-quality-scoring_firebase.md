# Signal-Quality Scoring - Firebase Operations

> **Last Updated:** 2026-07-20

## Current Cost

The reserved scoring flag adds zero reads, writes, deletes, Storage operations, provider calls, listeners, or scheduler work.

The evidence-transparency hardening adds one optional scalar field, `signalSummary.escalationCount`, to newly created signal-cluster proposal documents. It uses the count already held in memory by the existing nightly query and adds no read or write operation.

Retiring nightly confidence adjustment removes one bounded canonical-answer query per processed tenant and removes its possible cache-version write plus canonical-answer batch update. The retained skipped-task diagnostic adds no Firestore operation.

## Existing Data

- `answerlattice_signalEvents` retains bounded evidence under the existing 365-day TTL.
- `answerlattice_mutationProposals` retains the human review record and bounded evidence summary.
- Existing proposal documents without `escalationCount` remain valid and display zero escalations.
- Existing canonical answers previously stamped by `system:confidence_auto_adjust` require controlled verification. No automatic migration or tenant-data rewrite is part of this change.

No collection, index, TTL policy, rule permission, Storage path, or scheduler was added. Existing Functions logic was narrowed.

The scoped QA deployment for `answerlatticeNightly` and `triggerAnswerlatticeNightly` was attempted on 2026-07-20 and stopped before upload because Firebase CLI authentication is unavailable. Local source is verified; remote runtime remains unchanged.

## Future Boundary

Do not persist per-signal quality rows or historical score snapshots. A future calibrated rank should be derived from existing bounded evidence unless measured query cost justifies one compact summary.

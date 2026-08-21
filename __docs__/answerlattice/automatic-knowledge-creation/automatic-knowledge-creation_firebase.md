# Automatic Knowledge Creation - Firebase

> **Status:** Implemented; dedicated and shared rule emulators verified on 2026-07-18

## Collections

| Collection | Role | Browser write policy |
|---|---|---|
| `answerlattice_signalEvents` | Append-only support-friction evidence | Scoped create only; no update/delete |
| `answerlattice_mutationProposals` | Pending governed changes and draft state | Scoped pending create only; decisions server owned |
| `answerlattice_canonicalAnswers` | Approved answer truth | Server owned |
| `answerlattice_auditLogs` | Governance lineage | Non-reserved client notes/creation audits; reserved actions server owned |
| `answerlattice_platformSummary` | Scheduler state and summaries | Server owned where applicable |

## Signal Identity

Persistent signals include:

- `dedupKey`;
- `identityFingerprint` (`sigfp_*`);
- deterministic `sig_*` document ID derived from tenant, store, and dedup key.

Rules require exact positive integer `tId` and `sId`, require a fingerprint when a dedup key is present, and reject an orphan fingerprint. Application/Admin code verifies the stored fingerprint before treating a replay as successful. Process-local duplicate suppression is also tenant/workspace scoped and never replaces the persistent identity check.

## Bounds and Cost Controls

- Signal mutation reads `signalEventsPerWindow + 1` and fails closed above the configured bound.
- Every Functions signal window constrains `pId: AL` before tenant/workspace, time/type/entity ordering, and its cap. Unresolved-signal entity-index reads are product-partitioned as well.
- Draft generation scans 50 pending proposals and commits at most 10 successful drafts per tenant run.
- Mutation impact reads at most 201 rows per 14-day side and fails closed above 200.
- Queries and writes use existing Answerlattice collections; this feature adds no collection.
- Actual provider and Firestore cost must be measured from operation ledgers and billing exports. Static currency estimates are not a product contract.

## Write Authority

Answerlattice Next.js provider paths use the same product-owned credential boundary as the dedicated Functions runtime; they must not fall back to MenuList provider credentials.

- Browser signal create: validated by `isValidAnswerlatticeSignalCreate` and support-control/feedback scope rules.
- Browser proposal create: validated as `pending_review` and bound to an existing in-scope entity.
- Browser canonical create/update: denied.
- Browser proposal update/delete: denied.
- Governance decisions and ticket-evidence merge audits: Firebase Admin only.

## Retention

Signal events receive an `expiresAt` value from the shared Answerlattice retention policy. Retention and deletion behavior must remain aligned with `src/data/shared/answerlatticeRetention.ts`, its Functions mirror, and the data inventory.

## Deployment Targets

After rule or Functions changes pass local gates, attempt the smallest QA targets:

```bash
firebase deploy --only firestore:rules --project neelvara-answerlattice-qa --config firebase-answerlattice.json
firebase deploy --only functions:answerlatticeNightly --project neelvara-answerlattice-qa --config firebase-answerlattice.json
```

Because the shared fallback rules are also maintained, deploy their QA target only when the shared file changed and access is available. Production/Vercel deployment is separate and requires explicit authorization.

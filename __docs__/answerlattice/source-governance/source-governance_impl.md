# Source Governance Implementation Plan

> Status: Implemented behind a controlled rollout flag
> Date: 2026-07-26

## Current-State Analysis

| Area | Current state | Change |
| --- | --- | --- |
| Source storage | `answerlattice_knowledgeSources` stores content, provenance, tags, contexts, entities, and metadata | Add one optional typed `governance` object |
| Mutations | Source create is server-owned | Add server-owned governance update |
| Permissions | Knowledge Intake uses `MANAGE_KNOWLEDGE` plus active license | Reuse unchanged |
| Rules | Source browser writes are denied | No rule change |
| Audit | `answerlattice_auditLogs` is append-only | Add `knowledge_source_governance_updated` event |
| UI | Source excerpts appear on review cards | Add governance summary, source list, and edit modal |
| Canonical approval | Requires linked evidence but not reviewed evidence | Block canonical acceptance until every linked source is approved and reciprocally conflict-free |

## Data Contract

The additive source field is:

```ts
governance?: {
    authority: AnswerlatticeSourceAuthority;
    owner?: string | null;
    approvalStatus: AnswerlatticeSourceApprovalStatus;
    accessScope: AnswerlatticeSourceAccessScope;
    citationEligibility: AnswerlatticeSourceCitationEligibility;
    effectiveDate?: string | null;
    reviewDate?: string | null;
    applicability: {
        products: string[];
        plans: string[];
        roles: string[];
        regions: string[];
        versions: string[];
    };
    conflictSourceIds: string[];
    notes?: string | null;
    reviewedBy: string;
    reviewedOn: Timestamp;
}
```

Missing governance is projected as unreviewed in UI logic. Existing documents remain valid.

## API

`PATCH /api/answerlattice/knowledge-intake/jobs/{jobId}/sources/{sourceId}/governance`

- Auth: `withAuth()`
- Permission: `MANAGE_KNOWLEDGE`
- License: active
- Rate: 30 requests per 60 seconds per workspace
- Body: strict Zod object, maximum 24 KiB
- Idempotency: required UUID `requestId`; deterministic audit ID and payload fingerprint
- Response: exact serialized `source` plus 1-11 unique, normalized governance
  patches for every affected reciprocal source; the target patch must match the
  returned target source
- Client retry: retain one request ID for an unchanged failed payload, reject
  stale response settlement, clear it only after the matching success, and cap
  in-memory pending attempts at 20
- Cache: `private, no-store`

## Transaction

1. Read the target source and idempotency audit.
2. Validate source scope and requested job.
3. If the idempotency audit exists with the same fingerprint, return the current
   source plus current governance for the zero to ten reciprocal peers recorded
   by the committed audit; do not write again.
4. Read the bounded union of previous and requested conflict sources, at most ten.
5. Validate each peer has the same scope and job, is not the target, and is already reviewed before linking.
6. Add or remove the target ID from each peer's conflict list; reject a peer that would exceed five conflicts.
7. Update the target and only changed reciprocal peers.
8. Create one append-only audit event with compact previous/new governance and reciprocal-link summaries.
9. Return the target plus compact governance patches for all inspected peers so the client reconciles without rereading the bundle.

## Exact Files

### Create

- `src/app/api/answerlattice/knowledge-intake/jobs/[jobId]/sources/[sourceId]/governance/route.ts`
- `scripts/verification/test-answerlattice-source-governance.ts`
- `__docs__/answerlattice/source-governance/source-governance_validation.md`

### Modify

- `src/types/answerlattice/index.ts`
- `src/lib/answerlattice/knowledgeIntakeContracts.ts`
- `src/lib/answerlattice/knowledgeIntake.ts`
- `src/lib/answerlattice/knowledgeIntakeApi.ts`
- `src/hooks/answerlattice/useKnowledgeIntake.ts`
- `src/components/templates/answerlattice/knowledgeIntake/AnswerlatticeKnowledgeIntake.tsx`
- `src/config/features.ts`
- `package.json`
- `scripts/verification/test-answerlattice-knowledge-intake-contracts.ts`
- `__docs__/answerlattice/knowledge-intake-command-center/README.md`
- `__docs__/answerlattice/knowledge-intake-command-center/knowledge-intake-command-center_test-cases.md`
- `__docs__/answerlattice/system-inventory/README.md`
- `__docs__/answerlattice/pre-onboarding-input-kit/README.md`
- `__docs__/answerlattice/data-inventory/answerlattice-data-inventory_data-map.md`
- `__docs__/changelog.md`
- files in `__docs__/answerlattice/source-governance/`

No Firestore rules, indexes, Storage rules, Functions, public website runtime, or retrieval runtime files will change.

## Implementation Checklist

- [x] Add enums, interfaces, and bounded constraints.
- [x] Extend source parser with optional strict governance schema.
- [x] Add normalization and transactional update function.
- [x] Add authenticated, rate-limited route.
- [x] Add exact hook response validation and mutation method.
- [x] Add source governance list and edit modal.
- [x] Show governance state with review evidence.
- [x] Block canonical acceptance on unreviewed/conflicted evidence.
- [x] Maintain reciprocal conflict links and reconcile every affected source card.
- [x] Add focused contract and behavior verifier.
- [x] Update Knowledge Intake tests and feature inventory.
- [x] Run focused tests, TypeScript, lint, rule tests, and final diff review.

## Validation Commands

```bash
npm run test:answerlattice-source-governance
npm run test:answerlattice-knowledge-intake-contracts
npm run test:answerlattice-knowledge-intake:rules
npm run test:answerlattice-knowledge-intake:shared-rules
npx tsc --noEmit --incremental false
npm run lint
```

## Rollback

Disable `ENABLE_ANSWERLATTICE_SOURCE_GOVERNANCE`. Existing additive source fields remain inert and readable. No migration rollback or document rewrite is required.

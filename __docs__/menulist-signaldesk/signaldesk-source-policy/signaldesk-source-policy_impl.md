# SignalDesk Source Policy - Implementation Plan

**Status:** Source-policy guards are implemented; retention Patch R1 is implemented locally and held from deployment pending root-writer integration
**Created:** June 23, 2026
**Runtime:** `src/lib/signaldesk/workflowServer.ts` enforces active source policies, provider source policies, evidence/contact allowed use, provider budgets, and source-provider pause before imports and provider runs.

## Future File Layout

```txt
packages/signaldesk-core/src/source-policy/
packages/signaldesk-core/src/source-runs/
packages/signaldesk-core/src/source-retention/
packages/signaldesk-connectors/src/manual/
packages/signaldesk-connectors/src/first-party/
apps/internal-web/src/app/signaldesk/policies/sources/
apps/internal-web/src/app/signaldesk/imports/
```

## Source Policy Contract

```ts
type SignalDeskSourceProvider =
  | "manual"
  | "menulist-first-party"
  | "referral"
  | "meta-paid-intent"
  | "public-website"
  | "google-places-like"
  | "foursquare"
  | "apify"
  | "other";
```

```ts
type SignalDeskSourcePolicy = {
  sourcePolicyId: string;
  provider: SignalDeskSourceProvider;
  status: "draft" | "approved" | "paused" | "blocked";
  allowedUse: "candidate-discovery" | "enrichment" | "verification-only" | "owned-signal" | "blocked";
  allowedFields: string[];
  blockedFields: string[];
  mayUseForOutreach: boolean;
  mayUseInEvidencePacket: boolean;
  mayUseInOutboundCopy: boolean;
  rawPayloadRetentionDays: number;
  maxRowsPerRun?: number;
  maxCostUsdPerRun?: number;
  sourceTermsUrl?: string;
  approvalNote?: string;
  approvedBy?: string;
  approvedAt?: string;
  updatedAt: string;
};
```

## Guard Points

Source Policy must be checked before:

1. import;
2. target creation;
3. evidence packet creation;
4. AI prompt assembly;
5. draft generation;
6. export/send;
7. retention/deletion job.

## Source Run Contract

```ts
type SignalDeskSourceRun = {
  sourceRunId: string;
  sourcePolicyId: string;
  provider: SignalDeskSourceProvider;
  status: "draft" | "running" | "completed" | "paused" | "failed" | "blocked";
  requestedRows?: number;
  importedRows?: number;
  createdTargets?: number;
  heldRows?: number;
  rejectedRows?: number;
  estimatedCostUsd?: number;
  actualCostUsd?: number;
  startedBy: string;
  startedAt: string;
  completedAt?: string;
};
```

## Implementation Rules

- Policy status `draft`, `paused`, or `blocked` prevents source run.
- `mayUseForOutreach: false` prevents draft/send/export from using the source as outreach basis.
- Blocked fields are dropped before AI prompt assembly.
- Raw payloads are stored only if policy permits.
- Source policy versions should be immutable for completed runs.

## Retention Lifecycle Runtime (Patch R1)

The active retention implementation is product-scoped to SignalDesk:

- `functions-signaldesk/src/schedulers/sourceDataLifecycle.ts`
- `functions-signaldesk/src/schedulers/signaldeskMaintenanceScheduler.ts`
- `functions-signaldesk/src/constants/database.ts`
- `functions-signaldesk/src/constants/features.ts`
- `firestore-signaldesk.indexes.json`

The earlier future-layout and illustrative type sections in this document are planning context, not active persistence contracts. Runtime code, `src/types/signaldesk/index.ts`, and `src/lib/signaldesk/targetContracts.ts` remain authoritative.

### Execution model

`signaldeskMaintenanceScheduler` remains the only hourly scheduled function. It now owns two independently leased tasks:

1. `proof_permission_lifecycle`
2. `source_data_lifecycle`

Each task has its own lease document, hourly completion bucket, result record, and failure code. A held or completed lease for one task does not suppress the other task. Source-data work is bounded by authority, target, dependency-page, and reconciliation-step limits. Overflow is reported explicitly and pending progress resumes from stored document cursors.

### Retention ordering

Retention is target anchored and fail closed:

1. Expired or blocked policy authority is materialized as `inactive`.
2. Matching target summaries are atomically changed to `held`, `hold`, `blocked`, and a deterministic pending lifecycle token before dependent records are touched.
3. A due provider-retention row, or an explicitly negative `scrub_ready` row, is scrubbed in the same transaction that holds its target.
4. Target detail and dependent collections are processed through resumable phases. The first dependent capability phase revokes active MenuList outcome route tokens before source/contact/evidence/outbound payload phases continue.
5. Completion stores exact counters and deterministic audit/timeline evidence.

Malformed SignalDesk data is isolated to its policy, provider row, or target. The authority is quarantined, a high-severity incident is written, and exponential retry metadata is stored. Foreign-product documents sharing a target ID are counted but never mutated. Stale failure writers must match the current authority hash and therefore cannot overwrite a newer import or lifecycle version.

### Scrub and preservation boundary

The lifecycle revokes active MenuList outcome route tokens and replaces their retained target display name, then removes raw contact values, permission evidence refs, provider record IDs/URLs, source candidate facts, enrichment values, research/provider facts, evidence payloads, approval-packet message payloads, and all unsent draft/sequence/export personalization. Hash-only tombstones preserve collision, suppression, and replay safety.

The lifecycle does not delete or rewrite suppression, outcome, idempotency, audit, or timeline truth. Sent drafts, sent handoffs/steps/exports, conversation summaries, and inbound/outbound messages are preserved and marked `legalRetentionReviewRequired`. Their final retention period is a separate legal decision; Patch R1 does not silently destroy communication records.

## Required Root Writer and Renewal Contract

Patch R1 is not deployable until all root writers and action guards implement this contract:

| Surface | Required write/guard behavior |
| --- | --- |
| Source-policy create/update | Persist strict `pId`, document identity, approved/created/review/expiry timestamps, and bounded retention days. Renewal changes policy authority only; it must not alter target lifecycle state or repopulate scrubbed fields. |
| Target import | Persist `sourceDataLifecycleState: "active"`, `sourceDataObservedAt`, `sourceDataExpiresAt` equal to the policy expiry, `sourcePolicyId`, and `sourceRunId`. A previously completed tombstone may return to `active` only through a newly verified import with a new observation and run lineage. |
| Recreated source-linked records | Any verified re-import that repopulates target detail, contacts, provider rows, candidates, enrichment, research, evidence, or unsent personalization must either create new lineage IDs or explicitly reset that document's lifecycle state/token. Never merge new raw fields into a completed tombstone. |
| Provider-retention import | Persist `retentionExpiresAt` equal to policy expiry and `refreshDueAt` no later than policy expiry. Normal successful import/refresh clears prior lifecycle failure/tombstone fields and records a new verified observation. |
| Negative provider result | Persist status `blocked` or `expired` plus `sourceDataLifecycleState: "scrub_ready"`. Do not label a negative result `refreshed`; the lifecycle consumes only the explicit `scrub_ready` state. |
| Draft/approval/export/send actions | Reject targets in `pending`, `failed`, or `completed` source-data lifecycle state and reject provider rows in `scrub_ready`, `failed`, or `completed` lifecycle state. Existing policy/status/suppression checks remain mandatory. |
| Route-token issuance and outcome ingestion | Reject non-active source-data lifecycle targets transactionally. Retention revokes any already-issued active route token, and public outcome ingestion must parse the token plus current target authority before accepting a new event. Idempotent replay of an already-recorded event remains safe. |
| Same-policy renewal | Never revive a held/completed target, contact value, provider identity, source fact, evidence packet, or personalization. Only verified re-import with fresh lineage may do so. |

### Deployment gate

Do not deploy the new Functions logic or indexes until the root import, provider refresh, manual-negative, and action-guard paths satisfy the table above and the focused emulator suite passes against the integrated worktree. This is an integration blocker, not a license to weaken the lifecycle parser or add compatibility defaults.

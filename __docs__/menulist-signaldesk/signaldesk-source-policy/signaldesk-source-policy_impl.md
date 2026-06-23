# SignalDesk Source Policy - Implementation Plan

**Status:** Runtime implemented in the product-scoped SignalDesk workflow service
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

## No Runtime Change

Planning doc only.

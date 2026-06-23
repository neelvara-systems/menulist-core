# SignalDesk Evidence Packets - Implementation Plan

**Status:** Initial technical blueprint
**Created:** June 23, 2026
**Runtime:** Not created.

## Future File Layout

```txt
packages/signaldesk-core/src/evidence/
packages/signaldesk-core/src/decision-snapshots/
packages/signaldesk-core/src/evidence-expiry/
apps/internal-web/src/app/signaldesk/targets/[targetId]/evidence/
```

## Evidence Packet Contract

```ts
type SignalDeskEvidencePacket = {
  evidencePacketId: string;
  targetId: string;
  sourcePolicyIds: string[];
  status: "draft" | "active" | "expired" | "blocked" | "takedown";
  sourceFacts: {
    factId: string;
    label: string;
    valueSummary: string;
    sourceCandidateId: string;
    allowedForDraft: boolean;
    allowedForOutbound: boolean;
  }[];
  rejectedFacts: {
    label: string;
    reason: "blocked-source" | "low-confidence" | "stale" | "unsupported" | "conflicting";
  }[];
  confidence: "high" | "medium" | "low";
  currentListGap?: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
};
```

## Decision Snapshot Contract

```ts
type SignalDeskDecisionSnapshot = {
  snapshotId: string;
  targetId: string;
  evidencePacketId?: string;
  decisionType: "score" | "hold" | "reject" | "draft" | "approve" | "send" | "route" | "attribute";
  decision: "allow" | "block" | "hold" | "review";
  reasons: string[];
  evidenceRefs: string[];
  rejectedFacts: string[];
  confidence: "high" | "medium" | "low";
  actorType: "human" | "system" | "ai-worker";
  actorId?: string;
  ruleVersion: string;
  aiWorkerVersion?: string;
  createdAt: string;
};
```

## Guard Points

Evidence is checked before:

- draft generation;
- human approval;
- send/export;
- outcome routing;
- attribution scoring.

## Validation

- Evidence packet source facts must come from allowed source fields.
- Draft control can only use facts with `allowedForDraft`.
- Email/export can only use facts with `allowedForOutbound`.
- Expired evidence creates review work item.

## No Runtime Change

Planning doc only.

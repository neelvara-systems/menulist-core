# SignalDesk Target Registry - Implementation Plan

**Status:** Initial technical blueprint
**Created:** June 23, 2026
**Runtime:** Not created.

## Future File Layout

```txt
packages/signaldesk-core/src/targets/
packages/signaldesk-core/src/contacts/
packages/signaldesk-core/src/channel-identities/
packages/signaldesk-core/src/imports/
packages/signaldesk-core/src/dedupe/
apps/internal-web/src/app/signaldesk/targets/
apps/internal-web/src/app/signaldesk/imports/
```

## Type Contracts

```ts
type SignalDeskTargetStatus =
  | "new"
  | "review"
  | "held"
  | "ready"
  | "drafted"
  | "approved"
  | "contacted"
  | "replied"
  | "converted"
  | "rejected"
  | "suppressed";
```

```ts
type SignalDeskTargetSummary = {
  targetId: string;
  displayName: string;
  category?: string;
  city?: string;
  country?: string;
  status: SignalDeskTargetStatus;
  segment: "a" | "b" | "c" | "hold" | "reject";
  primaryOpportunity?: "missing-current-list" | "stale-menu" | "instagram-only" | "pdf-only" | "no-link" | "unknown";
  maskedEmail?: string;
  maskedPhone?: string;
  sourceConfidence: "high" | "medium" | "low" | "blocked";
  contactability: "ready" | "limited" | "missing" | "blocked";
  suppressionStatus: "clear" | "suppressed" | "wrong-contact" | "complaint";
  nextAction?: "review" | "enrich" | "draft" | "approve" | "send" | "hold" | "reject";
  updatedAt: string;
};
```

## State Transition Rules

| From | To | Guard |
| --- | --- | --- |
| `new` | `review` | Source candidate exists. |
| `review` | `ready` | Not suppressed, not duplicate, source policy permits review. |
| `review` | `held` | Missing evidence, unclear source, duplicate risk, policy question. |
| `review` | `rejected` | Not fit, blocked source, irrelevant category. |
| `ready` | `drafted` | Evidence packet exists. |
| any | `suppressed` | Suppression event exists. |

Later modules own `approved`, `contacted`, `replied`, and `converted` transitions.

## Screens

| Screen | Purpose |
| --- | --- |
| `/signaldesk/targets` | Paginated target summary list. |
| `/signaldesk/targets/[targetId]` | Target detail, source refs, contact refs, state history. |
| `/signaldesk/imports` | Import history and validation errors. |

## API Contracts

| Contract | Required guards |
| --- | --- |
| Create target | Internal auth, role permission, source ref, schema validation, audit. |
| Import targets | Internal auth, source policy, row validation, budget/cap, audit. |
| Update target state | Internal auth, role permission, transition guard, audit. |
| Reveal contact | Internal auth, reveal permission, reason, audit. |
| Merge/hold duplicate | Internal auth, reviewer permission, evidence refs, audit. |

## Validation

- Import validation should produce row-level errors.
- Duplicate checks should use normalized website, domain, phone hash, email hash, and business/name/location keys.
- Contact values should be stored normalized and displayed masked.
- Target list should never query detail collections.

## No Runtime Change

This is a planning doc only.

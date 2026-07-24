# SignalDesk Approval Queue - Test Cases

**Status:** Executable boundary coverage
**Last Updated:** July 21, 2026

## Focused Command

```bash
npm run test:signaldesk:approval-queue-boundary
```

## Covered Runtime Cases

| Case | Expected |
| --- | --- |
| Rejection without enum reason | Rejected before transaction. |
| `other` rejection without note | Rejected before transaction. |
| Structured rejection | Approval/draft/packet/target transition and counters commit atomically. |
| Conflicting concurrent approve/reject | Exactly one terminal decision commits. |
| Exact same-actor terminal retry | Stored result returned; no second counter, audit, or cost effect. |
| Changed retry status/reason | `Approval is not pending`. |
| Missing draft | Approval blocked. |
| Suppressed or held target | Approval blocked. |
| Changed template or superseded approval | Stale authority blocked. |
| Unsupported draft claim | Approval remains pending and block audit is written. |
| Expired/revoked source, contact, CTA, or sender | Approval/export fails closed. |
| Wrong channel handoff | Rejected. |
| Exact packet refresh | One deterministic packet identity. |
| Changed packet authority | Fingerprint mismatch blocks approval until refreshed. |

## Source Gates

`npm run verify:signaldesk` locks the permission map, typed route payload,
pending-first read, exact terminal replay, strict desktop readiness predicate,
mobile read-only contract, current documents, and focused command. Root
TypeScript, scoped ESLint, workspace/client contracts, source lifecycle, docs
links, and diff checks remain required before closure.

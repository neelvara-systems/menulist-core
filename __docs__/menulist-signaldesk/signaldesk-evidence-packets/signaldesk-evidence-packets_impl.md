# SignalDesk Evidence Packets - Implementation

**Status:** Implemented and locally verified
**Last Updated:** July 21, 2026

## Runtime Map

| Boundary | Current source |
| --- | --- |
| Protected action | `src/app/api/signaldesk/actions/route.ts` action `create-evidence` |
| Server transaction | `createSignalDeskEvidenceServer()` in `src/lib/signaldesk/workflowServer.ts` |
| Target/source parsing | `src/lib/signaldesk/targetContracts.ts`, `sourcePolicyContracts.ts`, and `outcomeContracts.ts` |
| Workspace projection | `src/lib/signaldesk/workspaceContracts.ts` |
| Desktop controls | `src/components/signaldesk/SignalDeskWorkspace.tsx` |
| Database constants/DAL | `src/constants/signaldesk/database.ts` and `src/database/signaldesk/index.ts` |
| Retention | `functions-signaldesk/src/schedulers/sourceDataLifecycle.ts` |

## Create Transaction

The transaction reads the current target, current source policy, and deterministic
summary ID. On a new identity it writes:

1. private evidence detail;
2. owner-safe evidence summary;
3. target next-action projection;
4. bounded audit event;
5. current daily-cost summary.

The audit reason contains only confidence classification. Exact replay strictly
validates the stored summary against current target authority and returns it
without duplicate effects.

## Diagnostic Rules

`current-menu-presence-v1` derives only from current target summary fields:

- web link, PDF, social-only, missing, or unknown observed format;
- current-list and website presence;
- source policy/run/URL references;
- stale-menu contradiction requiring review;
- owner control and mobile access fixed to `unverified`;
- two-surface feasibility fixed to `blocked` for suppression/blocked confidence,
  otherwise `review-required`.

The packet explicitly rejects unsupported owner-control, mobile-access, customer
loss, sales, ranking, and platform-partnership claims.

## Read Model

Only summaries enter the workspace. The AI and Templates sections read bounded
recent summary lists through the strict projector. Malformed and foreign-product
rows are omitted with aggregate diagnostics. Full details remain server-side and
are not exposed by an owner API or mobile screen.

## Retention Recovery

The hourly consolidated scheduler keeps the normal target-first dependency
reconciliation. It also scans a bounded page of active evidence details whose own
`sourceDataExpiresAt` is due. One transaction scrubs the detail and matching
summary, records a deterministic audit, and leaves a refreshed target active.
Repeated runs are no-ops.

## Deliberate Non-Features

- no evidence editor or manual fact approval state;
- no screenshot/blob bundle or Storage upload;
- no separate expiry-job collection or scheduler;
- no AI/provider work during packet creation;
- no autonomous contact, export, send, or publication;
- no MenuList public or owner-truth mutation.

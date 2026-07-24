# SignalDesk Approval Queue - Implementation

**Status:** Implemented and locally verified
**Last Updated:** July 21, 2026

## Runtime Map

| Concern | Source |
| --- | --- |
| Action schemas and permission mapping | `src/app/api/signaldesk/actions/route.ts` |
| Packet creation and terminal review | `src/lib/signaldesk/workflowServer.ts` |
| Strict response projection | `src/lib/signaldesk/workspaceContracts.ts` |
| Desktop/observe-only mobile UI | `src/components/signaldesk/SignalDeskWorkspace.tsx` |
| Client permissions and actions | `src/database/signaldesk/index.ts` |
| Source retention | `functions-signaldesk/src/schedulers/sourceDataLifecycle.ts` |
| Focused emulator | `scripts/verification/e2e-signaldesk-local.js` |

## Queue Read

The approvals section performs two bounded reads in parallel:

1. up to 30 pending items through the built-in `status` index;
2. the 30 most recently updated items for terminal context.

Pending items are projected strictly, ordered locally by high/normal/low
priority, due time, and ID, then deduplicated ahead of recent history. This
keeps actionable work reachable without an unbounded listener or new index.

## Packet Refresh

`createSignalDeskApprovalPacketServer` accepts exactly one approval or target,
re-reads the current related truth in a transaction, and deterministically uses
`packet_{approvalId}` or `packet_{targetId}`. An exact packet replay writes
nothing. Changed authority updates the same packet and audit/timeline evidence.

## Terminal Review

1. Validate structured decision input and server permission.
2. Read and strictly project the approval.
3. Replay only the same actor and exact stored request fingerprint, or reject any conflict.
4. For a pending approval, read draft, target, detail, packet, and template.
5. For approval, additionally re-read policy, conversation, evidence, CTA,
   sender, contact identity, and source run.
6. Recompute packet authority and require the stored action fingerprint to match.
7. Atomically update approval, draft, target, packet, audit, queue summary, and
   daily cost.

Rejection still validates the queue/draft/target packet unit but does not grant
or exercise downstream authority.

## Compatibility

No migration is required. Existing terminal approvals without `reviewedBy` or
the internal review request fingerprint
remain readable, but cannot use exact replay and correctly return
`Approval is not pending`. Existing pending items continue through the current
authority checks. No new dependency, provider, collection, index, or route was
added.

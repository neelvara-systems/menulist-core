# SignalDesk Approval Queue - Implementation Plan

**Status:** Initial technical blueprint
**Created:** June 23, 2026
**Runtime:** Not created.

## Future File Layout

```txt
packages/signaldesk-core/src/approvals/
packages/signaldesk-core/src/work-items/
apps/internal-web/src/app/signaldesk/approvals/
apps/internal-web/src/app/signaldesk/targets/[targetId]/approvals/
```

## Approval Item Contract

```ts
type SignalDeskApprovalItem = {
  approvalId: string;
  type: "draft" | "source" | "channel" | "evidence" | "route" | "incident";
  status: "pending" | "needs-changes" | "approved" | "rejected" | "expired" | "blocked";
  targetId?: string;
  draftId?: string;
  evidencePacketId?: string;
  sourcePolicyId?: string;
  channel?: "email" | "whatsapp" | "instagram" | "messenger" | "export";
  requestedBy: string;
  reviewerId?: string;
  reviewerRole?: string;
  reason?: string;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
};
```

## Guard Checks On Approval

1. Role permission.
2. Target state still valid.
3. Suppression still clear.
4. Evidence still active.
5. Source/channel policy still approved.
6. Kill switch inactive.
7. Draft guardrails still pass.

## Screens

| Screen | Purpose |
| --- | --- |
| `/signaldesk/approvals` | Queue by priority/status/type. |
| `/signaldesk/approvals/[approvalId]` | Review context and decision. |
| Target detail approvals tab | Target-scoped history. |

## No Runtime Change

Planning doc only.

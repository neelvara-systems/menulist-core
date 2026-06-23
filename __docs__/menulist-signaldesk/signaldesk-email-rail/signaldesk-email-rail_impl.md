# SignalDesk Email Rail - Implementation Plan

**Status:** Export rail plus owned sequencer queue implemented; provider send gated
**Created:** June 23, 2026
**Runtime:** SignalDesk app/API workflow service contains the current export, handoff, owned queue, and gated send implementation.

## Runtime File Layout

```txt
src/lib/signaldesk/workflowServer.ts
src/lib/signaldesk/providerAdapters.ts
src/app/api/signaldesk/actions/route.ts
src/components/signaldesk/SignalDeskWorkspace.tsx
src/constants/signaldesk/database.ts
src/types/signaldesk/index.ts
firestore-signaldesk.rules
firestore-signaldesk.indexes.json
```

## Sender Domain Contract

```ts
type SignalDeskSenderDomain = {
  senderDomainId: string;
  domain: string;
  status: "draft" | "verifying" | "ready" | "paused" | "blocked";
  spfStatus: "missing" | "pending" | "pass" | "fail";
  dkimStatus: "missing" | "pending" | "pass" | "fail";
  dmarcStatus: "missing" | "pending" | "pass" | "fail";
  unsubscribeStatus: "missing" | "ready";
  bounceWebhookStatus: "missing" | "ready" | "failing";
  complaintWebhookStatus: "missing" | "ready" | "failing";
  dailyCap: number;
  updatedAt: string;
};
```

## Email Action Contract

```ts
type SignalDeskEmailAction = {
  emailActionId: string;
  targetId: string;
  draftId: string;
  approvalId: string;
  senderDomainId?: string;
  mode: "export" | "provider-send";
  status: "queued" | "exported" | "sent" | "blocked" | "failed";
  suppressionCheckedAt: string;
  unsubscribeIncluded: boolean;
  attributionRef: string;
  createdAt: string;
};
```

## Owned Sequencer Contract

```ts
type SignalDeskOwnedEmailSequence = {
  sequencerHandoffId: string;
  provider: "owned-email";
  approvalId: string;
  targetId: string;
  senderDomainId: string;
  status: "blocked" | "queued" | "sent" | "failed";
  currentStep: number;
  stepCount: number;
  nextSendAt?: string;
};
```

```ts
type SignalDeskOwnedEmailStep = {
  sequenceStepId: string;
  sequencerHandoffId: string;
  stepNumber: number;
  status: "ready" | "sent" | "blocked" | "failed";
  subject: string;
  bodyPreview: string;
  scheduledAt: string;
};
```

## Send/Export Guard Sequence

1. Approved draft exists.
2. Draft unchanged since approval.
3. Suppression clear.
4. Evidence still active.
5. Email channel not paused.
6. Sender domain ready if provider send.
7. Unsubscribe exists.
8. Daily cap not exceeded.
9. Audit and decision snapshot written.

## Implemented First Build

The current first build includes:

- export-only email action;
- assisted email/channel handoff;
- `owned-email` sequencer queue for one approved email step;
- sender-domain ready/hold controls;
- queue and step summaries on the Channels screen;
- `send-owned-sequence-step` API action behind provider-send and email readiness gates.

Actual SMTP send remains disabled while `ENABLE_MENULIST_SIGNALDESK_PROVIDER_SEND` is false.

## Future Upgrade Criteria

Only add multi-step automation, mailbox rotation, or Smartlead API sync after:

- sender domain is ready;
- unsubscribe endpoint exists;
- bounce/complaint webhook exists;
- low-volume manual pilot validates copy quality;
- reply and suppression handling is stable;
- sender health summaries stay within acceptable thresholds.

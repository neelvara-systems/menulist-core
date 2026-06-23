# SignalDesk Draft Control - Implementation Plan

**Status:** Initial technical blueprint
**Created:** June 23, 2026
**Runtime:** Not created.

## Future File Layout

```txt
packages/signaldesk-core/src/templates/
packages/signaldesk-core/src/drafts/
packages/signaldesk-core/src/message-guardrails/
packages/signaldesk-ai/src/workers/draft-message/
apps/internal-web/src/app/signaldesk/templates/
apps/internal-web/src/app/signaldesk/targets/[targetId]/drafts/
```

## Template Contract

```ts
type SignalDeskTemplate = {
  templateId: string;
  channel: "email" | "export" | "whatsapp-assisted" | "instagram-reply";
  status: "draft" | "approved" | "paused" | "archived";
  version: number;
  name: string;
  body: string;
  approvedVariables: string[];
  requiredEvidenceTypes: string[];
  bannedClaimPolicyId: string;
  createdAt: string;
  updatedAt: string;
};
```

## Draft Contract

```ts
type SignalDeskDraft = {
  draftId: string;
  targetId: string;
  templateId: string;
  templateVersion: number;
  evidencePacketId: string;
  channel: "email" | "export" | "whatsapp-assisted" | "instagram-reply";
  status: "draft" | "blocked" | "needs-review" | "ready-for-approval" | "approved" | "rejected";
  body: string;
  guardrailResult: {
    passed: boolean;
    blockedClaims: string[];
    blockedVariables: string[];
    blockedFacts: string[];
  };
  createdBy: "human" | "ai-worker";
  createdAt: string;
  updatedAt: string;
};
```

## Guardrail Checks

1. Template approved.
2. Evidence packet active.
3. Source facts allowed for outbound.
4. Variables approved.
5. Banned claims absent.
6. Suppression not active.
7. Channel policy exists.

## Build Order

1. Template registry.
2. Draft generator with no-send output.
3. Guardrail checker.
4. Draft editor.
5. Approval handoff.

## No Runtime Change

Planning doc only.

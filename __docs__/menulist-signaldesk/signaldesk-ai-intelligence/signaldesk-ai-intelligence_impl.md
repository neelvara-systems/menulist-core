# SignalDesk AI Intelligence - Implementation Plan

**Status:** Initial technical blueprint
**Created:** June 23, 2026
**Runtime:** Not created.

## Future File Layout

```txt
packages/signaldesk-ai/src/workers/fit-score/
packages/signaldesk-ai/src/workers/current-list-gap/
packages/signaldesk-ai/src/workers/contactability/
packages/signaldesk-ai/src/workers/risk/
packages/signaldesk-ai/src/evals/
packages/signaldesk-core/src/ai-worker-runs/
apps/internal-web/src/app/signaldesk/targets/[targetId]/intelligence/
```

## Worker Output Contract

```ts
type SignalDeskAiScore = {
  score: number; // 0-100
  confidence: "high" | "medium" | "low";
  reasons: string[];
  evidenceRefs: string[];
  rejectedFacts: string[];
  blockedActions: string[];
};
```

```ts
type SignalDeskAiIntelligenceResult = {
  targetId: string;
  evidenceHash: string;
  workerVersion: string;
  fit: SignalDeskAiScore;
  currentListGap: SignalDeskAiScore;
  contactability: SignalDeskAiScore;
  channelFit: {
    email?: SignalDeskAiScore;
    whatsapp?: SignalDeskAiScore;
    instagram?: SignalDeskAiScore;
    messenger?: SignalDeskAiScore;
  };
  risk: SignalDeskAiScore;
  recommendedHumanAction: "review" | "hold" | "reject" | "prepare-evidence" | "draft";
  createdAt: string;
};
```

## Input Rules

AI input may include:

- target summary;
- allowed source facts;
- evidence packet summaries;
- source policy state;
- suppression status;
- allowed channel identities in masked or minimized form;
- MenuList outcome history.

AI input must not include:

- blocked source fields;
- raw provider payloads;
- raw secrets;
- unrelated contact history;
- full conversation history unless classifier needs it and policy allows;
- suppressed raw contact values.

## Execution Rules

1. Build evidence hash.
2. Check cache.
3. Check worker enabled and budget.
4. Assemble policy-filtered prompt payload.
5. Run model.
6. Validate schema.
7. Store compact result.
8. Write decision snapshot or review item if low confidence.

## Evaluation

Every worker needs a seed eval set for:

- good fit;
- bad fit;
- missing current-list evidence;
- ambiguous source;
- blocked outreach;
- invented fact attempt;
- low-confidence case.

## No Runtime Change

Planning doc only.

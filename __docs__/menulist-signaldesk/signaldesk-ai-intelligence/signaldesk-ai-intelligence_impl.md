# SignalDesk AI Intelligence - Implementation Plan

**Status:** Runtime implemented inside the product-local SignalDesk module
**Created:** June 23, 2026
**Runtime:** Rules-based scoring, gated Gemini assist, decision snapshots, model routes/evals, and founder shadow review are implemented in the existing SignalDesk app/API/workflow service.
**Last Updated:** July 11, 2026

## Runtime File Layout

```txt
src/config/features.ts
src/constants/signaldesk/integrations.ts
src/types/signaldesk/index.ts
src/lib/signaldesk/aiProvider.ts
src/lib/signaldesk/workflowServer.ts
src/app/api/signaldesk/actions/route.ts
src/database/signaldesk/index.ts
src/components/signaldesk/SignalDeskWorkspace.tsx
scripts/verification/verify-signaldesk-runtime.js
scripts/verification/e2e-signaldesk-local.js
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

## AI Volume Mode

`run-ai-volume-batch` accepts:

- one to five unique target IDs;
- one to three unique tasks from `score`, `evidence`, `draft`, and `reply-classification`;
- a founder maximum estimated cost;
- a founder-scoped idempotency key whose hash determines the parent run ID;
- an optional bounded instruction.

The server requires the feature flag, founder-admin role, `signaldesk.configure`, no AI-worker kill switch, active Gemini provider/budget records, and active task plus critic model routes.

For every target/task pair:

1. source policy and target state are checked through the existing AI assist path;
2. the fast/default model produces typed JSON;
3. the critic model independently returns `pass`, `revise`, or `hold` plus confidence, reasons, rejected facts, and an optional revised result;
4. low confidence, a non-pass critic verdict, or rejected facts may invoke the task route's stronger model only when its provider is the already executable Gemini adapter;
5. the child run stores generation, critic, escalation, model calls, cost estimate, prompt versions, and parent volume-run ID;
6. the existing model-eval cumulative window receives one final child sample;
7. the parent batch is updated to `completed`, `partial`, or `blocked` with stable failure codes.

The bounded synchronous batch is intentionally capped at five targets and three tasks. Larger work is split into explicit founder-triggered batches so serverless time, provider limits, and partial failure remain visible. It is not a hidden scheduler.

The protected action route declares a finite 300-second execution window and uses the shared batch-operation rate limit for the worst-case 45-call batch. The API schema and server action independently enforce idempotency-key, target, task, and cost bounds. Aggregate projected cost is checked against current provider daily/monthly budget, and a six-minute recoverable global lock gives the route a one-minute shutdown margin while preventing overlapping paid batches from consuming the same budget snapshot. Any final rejected fact forces low confidence even if a provider reports higher confidence.

The idempotency document identity is the deterministic parent itself. Its request fingerprint covers the normalized founder, target order, task order, optional instruction, and cost ceiling. Exact retries and matching legacy parents return the same run; changed input fails before model execution. A unique worker claim on new parents makes acknowledgement-loss recovery safe: only the worker whose transaction actually committed may continue into paid child execution.

Standalone AI Assist uses the same safety direction without the volume parent: a deterministic `signaldeskIdempotencyKeys` record is transactionally created before the model call and binds actor, target, task, instruction, multi-pass mode, and volume identity. Completed exact retries read the deterministic worker row. The final worker, model-eval, decision-snapshot, AI-operation, provider-spend, timeline, audit, daily-cost, and claim-completion writes share one claim-owned transaction.

Provider, critic, escalation, or unconfirmed final-transaction failure settles the exact owner as `unresolved` with a stable code and one audit event. Exact retry is review-required. If the final transaction committed before its acknowledgement was lost, the completed claim and deterministic worker prove success and no model call repeats.

The standalone claim transaction also reads current Gemini account/policy spend and reserves the initial call estimate. A live AI Volume lock blocks standalone admission. Conversely, AI Volume repeats its complete projected-cost check inside the same transaction that acquires the global lock. Volume children prove that lock belongs to their parent and do not reserve the already bounded envelope individually; their actual call cost is recorded at finalization.

Finalization reads the optional provider-budget policy again. It always increments the provider account, but increments the policy only when the document exists; account-only configuration therefore cannot create a partial policy lacking status, caps, provider, or scope.

An idempotent retry of an expired `running` parent performs no provider call. It reads at most twenty existing worker rows for the parent ID, keeps at most fifteen `ai_assist_*` children, reconstructs completed count, model calls, and estimated cost, then transactionally records:

- `completed` when all requested children already exist;
- `partial` plus `ai_volume_run_interrupted` when some children exist;
- `blocked` plus `ai_volume_run_interrupted` when no children exist.

Recovery writes one audit event and one final run timeline. Normal completion and recovery release the global lock only when `activeVolumeRunId` still matches that parent, so an old process cannot release a newer batch's lease.

The desktop stores the bounded retry payload in browser-local storage before calling the protected action. A failed or still-running request keeps the same key and disables scope edits; `Retry Batch` reuses the exact stored payload. Terminal results clear it automatically, while `Clear Retry` lets the founder discard a payload when validation or configuration failed before any parent was created. No contact value, provider secret, model output, or business evidence is stored in this browser-local record.

### Default Model Cascade

| Work | Default | Escalation |
| --- | --- | --- |
| Score, evidence, draft, reply classification | `gemini-2.5-flash-lite` | `gemini-2.5-flash` |
| Quality critic | `gemini-2.5-flash-lite` | No independent escalation; task escalation resolves the exception. |

OpenAI and Anthropic remain policy records only. Their routes do not execute through the Gemini adapter.

### Shadow Review

Provider-backed AI runs may be reviewed only by a founder-admin on desktop:

```txt
unreviewed -> accepted | edited | rejected | held
```

The review stores a bounded reason and founder-attention minutes on the existing worker run. One transaction reverses any prior review contribution, applies the replacement, recomputes cumulative model-eval rates, updates existing revenue founder attention by the minute delta when present, and writes audit/timeline/cost records.

Provider quality counters use an exact `cumulative-v1` measurement window. Since earlier rate fields only described the latest run, the first new provider result stores those non-reconstructable legacy sample/rate values separately instead of blending them into the new cumulative evidence.

Rules-only `target_score` runs are not eligible. Review never executes the recommendation, sends a message, changes an opportunity, or writes MenuList truth.

## Runtime Boundary

No new AI collection, public route, scheduler, source authority, send authority, or MenuList write path is introduced. AI Volume Mode expands internal reasoning volume; the deterministic action API and existing policies retain authority.

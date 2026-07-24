# SignalDesk AI Intelligence - Implementation

**Status:** Local source complete
**Last Updated:** July 21, 2026

## Runtime Map

| Boundary | Source |
| --- | --- |
| API schemas, auth, permission, rate limit, mobile class | `src/app/api/signaldesk/actions/route.ts` |
| Rules score, assist, volume, recovery, review, workspace reads | `src/lib/signaldesk/workflowServer.ts` |
| Gemini prompt, JSON parsing, strict outputs | `src/lib/signaldesk/aiProvider.ts` |
| Persisted workspace projection | `src/lib/signaldesk/workspaceContracts.ts` |
| Desktop run/retry/review UI | `src/components/signaldesk/SignalDeskWorkspace.tsx` |
| Client request/response parser | `src/database/signaldesk/index.ts` |
| Detail retention and backfill | `functions-signaldesk/src/schedulers/sourceDataLifecycle.ts` |
| Composite indexes | `firestore-signaldesk.indexes.json` |
| Runtime and emulator verification | `scripts/verification/verify-signaldesk-runtime.js`, `scripts/verification/e2e-signaldesk-local.js` |

## Rules Score Flow

1. Require no active `ai-worker` kill switch.
2. Transactionally read strict target authority and source policy.
3. Require evidence-use permission and valid retained lineage.
4. Derive a content-addressed score ID from target/source facts and `rules-v1`.
5. Return the existing score when the exact identity already exists.
6. Otherwise create the score, decision snapshot, zero-cost AI ledger row, target summary update, audit event, and daily cost update in one transaction.

This is the only score cache. There is no separate cache collection and no `lastUsedAt` write on replay.

## Provider Assist Flow

1. Require the AI provider feature flag and no AI-worker kill switch.
2. Read and strictly parse the active target, source policy, and latest evidence.
3. Derive the expected evidence identity and source-authority fingerprint.
4. Resolve an active Gemini model route and current provider/budget authority.
5. Transactionally claim an actor-bound idempotency row and reserve the estimated cost.
6. Call Gemini with untrusted-data instructions, JSON MIME type, safety settings, a 4,096-token output ceiling, and task-specific temperature.
7. Strictly parse and validate output. Multi-pass calls then run the critic and optional same-provider escalation.
8. Re-read target, policy, evidence, claim, provider, budget, and volume-lock authority in the final transaction.
9. Settle exact spend and persist the worker run, decision snapshot, operation ledger, model-eval mutation, timeline, audit, daily cost, and completed claim atomically.

Provider or settlement ambiguity marks the owned claim unresolved with stable evidence. It does not silently retry a paid call.

## Volume Flow

The route preflights the complete maximum call count and cost, then transactionally acquires a six-minute global volume lease. It runs target/task pairs sequentially through the same assist function with `multiPass: true` and the parent ID. Each child proves the lock still belongs to that parent.

The parent records requested/completed/failed pairs, child IDs, model-call count, estimated cost, stable failure codes, completion status, audit, and timeline. The desktop stores only the bounded request payload and idempotency key in local storage until a terminal response.

An expired `running` parent is recovered by querying at most twenty same-parent child rows. Recovery performs no provider call and finalizes as:

- `completed` when all children exist;
- `partial` when some exist;
- `blocked` when none exist.

## Shadow Review

Only a desktop founder-admin with `signaldesk.configure` may review provider-backed assist runs. A non-accepted decision requires a reason. The transaction replaces the run's prior contribution in cumulative model-eval counts and founder-attention totals. Repeating the exact same decision, normalized reason, and minute count returns the existing run/eval without audit, timeline, cost, or summary writes.

Review changes evaluation evidence only. It does not execute the recommendation.

## Workspace Reads

The AI section performs three parallel, bounded, server-only queries:

- latest 30 `ai_assist_*` provider runs;
- latest 30 `ai_volume_batch` parents;
- latest 30 `target_score` rule results.

Each query requires `pId: SD`, filters by `workerType`, orders by `createdAt desc`, and projects through the strict workspace schema. One composite index supports all three. This avoids the former mixed-list starvation where 30 volume children could hide scores or review runs.

## Retention

New score and assist documents receive a 90-day AI-detail expiry. The consolidated SignalDesk maintenance scheduler backfills legacy rows and scrubs source-derived detail fields when due. It preserves compact identity, provider/model, cost, confidence, review, lifecycle, and audit evidence. The global volume lock is marked not applicable.

## Deliberate Non-Changes

No new collection, queue, scheduler, provider adapter, public API, mobile editor, or outbound capability was added. Provider sending remains disabled independently of AI inference.

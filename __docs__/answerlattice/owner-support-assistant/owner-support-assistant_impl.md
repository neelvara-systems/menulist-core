# Owner Support Assistant - Implementation Plan

> **Status:** READ-ONLY RUNTIME LIVE - deferred target architecture retained below
> **Created:** 2026-06-07
> **Implementation posture:** Preserve the current bounded runtime. Treat all absent action, AI, feedback, analytics-summary, and scheduler paths as deferred until separately implemented and verified.

---

## Answerlattice Owner Support Assistant Read-Only Runtime

Current source truth:

| Surface | Runtime state |
| --- | --- |
| App flag | `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT: true`. |
| Route/navigation | `/answerlattice/support-assistant`, management-only, `MANAGE_SUPPORT`, feature-gated. |
| Brief API | Authenticated, rate-limited before permission reads, five compact summary reads, private/no-store. |
| Query API | Authenticated, exact session scope, 20 requests/minute per hashed user/workspace key before permission reads, 4 KiB body cap, Zod validation, private/no-store. |
| Answer engine | Deterministic ten-intent classifier over the same five summary documents: attention, answer risk, friction, readiness, intake, release, install, reply, cost, and unsupported. No AI provider or bounded-detail path. |
| Daily Founder Brief | Optional `dailyBrief` payload ranks the smallest useful support actions for today from the same five summaries. |
| Persistence | None. No transcript, feedback, operation, action, analytics, or assistant summary write. |
| Owner actions | Route links only. No action preview/execute, ticket reply/status change, draft, card, note, or publish path. |
| Client | Bounded 128 KiB JSON responses, no-store/same-origin/manual-redirect requests, responsive layout, 44px action targets. |

The remaining sections preserve the reviewed target architecture. A file, route, write, or provider behavior described there is not live unless the current-runtime table above says it is.

Owner Support Assistant should be implemented as a thin Answerlattice owner/staff command layer over existing governed systems.

It must not own a separate support memory, message store, plan store, or analytics warehouse. Its durable outputs belong in the systems that already own that kind of truth:

- Support plans and follow-up work -> Support Board.
- FAQ, KB, and product-surface drafts -> Knowledge Intake review items.
- Canonical answer changes -> mutation proposals and Governance.
- AI cost/accounting -> `answerlattice_aiOperations`.
- Assistant health and adoption -> compact `platformSummary` read model.
- Dashboard analytics and owner period questions -> existing daily aggregates plus compact `platformSummary` owner analytics read model.
- Executed ticket/review actions -> existing target records, target histories, and audit logs.

---

## Reuse Map

| Existing system | Reuse |
| --- | --- |
| `src/components/answerlattice/AnswerlatticeDashboardLayout.tsx` | Route shell, access state, responsive dashboard layout. |
| `src/lib/answerlattice/sessionScope.ts` | `resolveAnswerlatticeSessionScope()`, `getAnswerlatticeScopedSession()`, and `canUseAnswerlatticeManagement()`; tenant/store scope is accepted only as exact positive numeric Firestore document IDs. |
| `src/config/features.ts` | App-side flag `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT`, currently `true`. |
| `functions-answerlattice/src/constants/features.ts` | Function-side mirror only when the compact assistant summary task is wired. |
| `src/constants/answerlattice/routes.ts` | Live `/answerlattice/support-assistant` route constant. |
| `src/constants/answerlattice/navigations.ts` | Live Support Control nav item behind flag and `MANAGE_SUPPORT`. |
| `src/database/answerlattice/supportBoard.ts` | Read bounded board cards/summaries and save explicit assistant plans as Support Board cards/notes. |
| `src/database/answerlattice/canonicalAnswers.ts` | Read active/entity-bound answers only for explicit answer review intents. |
| `src/database/answerlattice/mutationProposals.ts` | Read pending proposals and create answer-change drafts through existing review flow. |
| `src/lib/answerlattice/knowledgeIntake.ts` | Reuse repeated-reply/product-note intake paths for FAQ, KB, and surface review drafts. |
| `src/database/answerlattice/signalEvents.ts` | Use capped recent/count queries only for explicit friction/repeated-issue intents. |
| `src/database/tickets/index.ts` | Reuse existing ticket message/status write helpers for owner-confirmed ticket actions. |
| `src/database/answerlattice/auditLogs.ts` | Append assistant execution audit entries when target history alone is not enough. |
| `src/constants/answerlattice/permissions.ts` | Reuse existing permission keys for action capability checks. |
| `src/database/answerlattice/productSurfaces.ts` | Reuse `contextContent_{tId}_{sId}` and bounded surface reads. |
| `src/database/answerlattice/coverageKPI.ts` | Reuse `platformSummary/coverage_{tId}_{sId}`. |
| `src/database/answerlattice/trustMetrics.ts` | Reuse `platformSummary/trustMetrics_{tId}_{sId}`. |
| `src/database/answerlattice/frictionStats.ts` | Reuse friction snapshot and weekly insight summary docs. |
| `src/lib/ai/accounting.ts` and `src/lib/ai/operationLog.ts` | Record and account for LLM-backed assistant operations. |
| `src/database/chatAnalytics/index.ts` | Reuse existing daily aggregate stats for support questions, feedback, top questions, and gaps. |
| `src/lib/analytics/dateKey.ts` / `src/lib/analytics/businessDay.ts` | Reuse date-key and support-day concepts when adapting Answerlattice period calculations. |
| `functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts` | Keep all scheduled assistant summary work inside the existing master scheduler. |
| `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` | Add assistant summary sync as a bounded tenant task if aggregate read model is implemented. |

---

## Deferred Target Changes

The consolidated live implementation is in `src/lib/answerlattice/ownerSupportAssistant.ts`, the two `brief`/`query` API routes, the route page, and `AnswerlatticeOwnerSupportAssistant.tsx`. The inventory below is a target decomposition; absent files and endpoints are deferred.

| File | Purpose |
| --- | --- |
| `src/app/(answerlattice)/answerlattice/support-assistant/page.tsx` | Server route wrapper for dashboard layout and feature-flag state. |
| `src/components/templates/answerlattice/ownerSupportAssistant/AnswerlatticeOwnerSupportAssistant.tsx` | Main client UI: brief, question input, answer cards, evidence, actions, and recent assistant health. |
| `src/components/templates/answerlattice/ownerSupportAssistant/AssistantAnswerCard.tsx` | Structured answer rendering. |
| `src/components/templates/answerlattice/ownerSupportAssistant/AssistantEvidenceList.tsx` | Evidence/source cards with links and limits. |
| `src/components/templates/answerlattice/ownerSupportAssistant/AssistantActionBar.tsx` | Safe action controls only. |
| `src/hooks/answerlattice/useOwnerSupportAssistant.ts` | Client state, brief load, query submission, feedback submission, per-session cache, and optimistic save states. |
| `src/lib/answerlattice/ownerSupportAssistant/intents.ts` | Deterministic intent classifier and unsupported action detection. |
| `src/lib/answerlattice/ownerSupportAssistant/context.ts` | Summary-first context fetchers and bounded detail fetchers. |
| `src/lib/answerlattice/ownerSupportAssistant/answers.ts` | Deterministic answer builders and status selection. |
| `src/lib/answerlattice/ownerSupportAssistant/actions.ts` | Mapping from suggested action to existing route/DAL/API action. |
| `src/lib/answerlattice/ownerSupportAssistant/actionRegistry.ts` | Typed action capability registry with product, target, permission, risk, and write-owner metadata. |
| `src/lib/answerlattice/ownerSupportAssistant/actionPreview.ts` | Deterministic preview builders for supported actions. |
| `src/lib/answerlattice/ownerSupportAssistant/actionExecutor.ts` | Server-owned execution adapters over existing write paths. |
| `src/lib/answerlattice/ownerSupportAssistant/ai.ts` | Prompt builder and LLM wrapper over typed context packets only. |
| `src/lib/answerlattice/ownerSupportAssistant/summary.ts` | Compact assistant health summary builder for API/function reuse. |
| `src/lib/answerlattice/ownerSupportAssistant/ownerAnalytics.ts` | Standard period resolver and compact owner analytics packet builder. |
| `src/types/answerlattice/ownerSupportAssistant.ts` | Additive assistant-specific types. |
| `src/app/api/answerlattice/owner-analytics/summary/route.ts` | Protected summary-only dashboard analytics endpoint. |
| `src/app/api/answerlattice/support-assistant/brief/route.ts` | Protected, summary-only brief endpoint. |
| `src/app/api/answerlattice/support-assistant/query/route.ts` | Protected, rate-limited query endpoint. |
| `src/app/api/answerlattice/support-assistant/actions/preview/route.ts` | Protected action preview endpoint; no writes. |
| `src/app/api/answerlattice/support-assistant/actions/execute/route.ts` | Protected action execution endpoint; requires confirmation and idempotency. |
| `src/app/api/answerlattice/support-assistant/feedback/route.ts` | Protected aggregate feedback endpoint; no transcript store. |
| `functions-answerlattice/src/answerlattice/ownerSupportAssistantSummary.ts` | Bounded compact summary task, called by existing nightly only. |

No separate messages/sessions/plans/feedback/attribution collection is added.

---

## Additive Existing-System Changes

These changes are intentionally small and reuse existing storage:

| Existing system | Additive change | Reason |
| --- | --- | --- |
| Support Board source types | Add `ASSISTANT: 'assistant'` to `ANSWERLATTICE_SUPPORT_BOARD_SOURCE_TYPE`. | Saved assistant plans become first-class Support Board work without a new plan collection. |
| Support Board cards | Add nullable `assistantContext` metadata: `answerId`, `intent`, `contextHash`, `evidenceRefs`, `createdFrom`. | Makes plan attribution and aggregate summary possible without storing transcripts. |
| Mutation proposals | Add nullable `assistantContext` metadata when an assistant answer prepares a canonical change. | Lets Governance know the draft came from assistant evidence, while preserving human approval. |
| Knowledge sources/review items | Use existing `repeated_reply` or `product_note` source types with `metadata.assistantContext`. | Avoids a new source collection while preserving source provenance. |
| Ticket write adapters | Add action adapters that call the selected existing ticket status/message write paths. | Supports ticket status and replies without a parallel ticket system. |
| Audit log metadata | Add assistant action context to `answerlattice_auditLogs` when executed actions need searchable history. | Avoids a new assistant action/audit collection. |
| AI action constants | Add `ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT` only if LLM calls need distinct cost/accounting classification. | Keeps assistant AI cost separate from intake, FAQ generation, and translation. |
| `platformSummary` | Add `ownerSupportAssistantSummary_{tId}_{sId}` compact doc. | Supports health cards and adoption metrics without high-volume event storage. |
| `platformSummary` | Add `ownerSupportAnalyticsSummary_{tId}_{sId}` compact doc. | Supports dashboard support analytics and assistant period questions without a new analytics collection. |

---

## Feature Flags

Current app flag:

```ts
ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT: true
```

Add function flag only when `ownerSupportAssistantSummary.ts` is wired:

```ts
ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT_SUMMARY: false
```

Rules:

- The current app runtime is enabled in source.
- Route navigation, client rendering, brief endpoint, and query endpoint check the app flag.
- Deferred action, feedback, owner-analytics, and summary-task paths are absent; no function-side mirror is active.
- API endpoints return before Firestore reads when disabled.
- Feature flags control availability only; they do not define product maturity levels.

---

## Route and Navigation

Route constant:

```ts
SUPPORT_ASSISTANT: `${ANSWERLATTICE_BASE_PATH}/support-assistant`
```

Navigation placement:

- Group: Support Control
- Label: Support Assistant
- Position: after Support Board and before Weekly Digest
- Permission: `MANAGE_SUPPORT` for action-taking access, with read-only brief access allowed only if current Answerlattice permission rules add an explicit view permission.

Do not add this route under an old product namespace, `/help-center/*`, or MenuList mobile shell routing.

---

## API Contract

### `GET /api/answerlattice/support-assistant/brief`

Purpose: one protected summary packet for route load.

After feature, rate-limit, and `MANAGE_SUPPORT` admission, it reads exactly these five documents in one `getAll()` call:

- `platformSummary/coverage_{tId}_{sId}`
- `platformSummary/trustMetrics_{tId}_{sId}`
- `platformSummary/supportBoardSummary_{tId}_{sId}`
- `platformSummary/frictionSnapshot_{tId}_{sId}`
- `platformSummary/knowledgeIntakeSummary_{tId}_{sId}`

Response:

```ts
{
  brief: {
    status: 'healthy' | 'needs_review' | 'at_risk' | 'insufficient_data';
    headline: string;
    attentionCount: number;
    metrics: Record<string, number | null>;
    promptChips: string[];
    updatedAt: string | null;
    readModel: { firestoreReads: 0 | 5; source: 'summary_only'; cacheHit: boolean };
  };
}
```

### `POST /api/answerlattice/support-assistant/query`

Request:

```ts
{
  question: string;
}
```

Response:

```ts
{
  answer: {
    id: string;
    status: 'healthy' | 'needs_review' | 'at_risk' | 'insufficient_data' | 'unsupported';
    intent: 'attention' | 'answer_risk' | 'friction' | 'readiness' | 'intake' | 'unsupported';
    directAnswer: string;
    evidence: Array<{ label: string; value: string; href: string; source: string }>;
    nextActions: Array<{ label: string; href: string }>;
    limits: string[];
    readModel: { firestoreReads: 0 | 5; source: 'summary_only'; cacheHit: boolean };
  };
}
```

Server sequence:

1. `withAuth()`.
2. Feature flag check.
3. Resolve Answerlattice scoped session from server-side session, not request body; malformed tenant/store scope fails before assistant context reads.
4. Apply the hashed workspace/user rate limit before the Firestore-backed permission check.
5. Require `MANAGE_SUPPORT`.
6. Read at most 4 KiB and Zod-validate a strict 3-500 character question.
7. Classify one of the six supported intents.
8. Read or reuse the five-document compact summary packet.
9. Build a deterministic answer with evidence and governed route links.
10. Return a private `no-store` response.

The live endpoint does not fetch bounded detail, call an LLM, record an AI operation, or write assistant state.

### Deferred: `POST /api/answerlattice/support-assistant/actions/preview`

Request:

```ts
{
  capability: string;
  target: {
    type: 'support_ticket' | 'support_board_card' | 'mutation_proposal' | 'knowledge_intake_source' | 'route';
    id?: string;
  };
  input: Record<string, unknown>;
  answerId?: string;
  contextHash: string;
}
```

Response:

```ts
{
  previewId: string;
  capability: string;
  targetLabel: string;
  proposedChange: Record<string, unknown>;
  risk: 'low' | 'medium' | 'high';
  confirmationRequired: true;
  readModel: {
    firestoreReads: number;
    costClass: 'summary_only' | 'bounded_detail';
  };
  auditSummary: string;
  limits: string[];
}
```

Rules:

1. No writes.
2. Server resolves `tId/sId` from session.
3. Capability must exist in `actionRegistry.ts`.
4. Permission must match the capability.
5. Target read must be scoped and capped.
6. Preview must include the exact target and proposed change.

### Deferred: `POST /api/answerlattice/support-assistant/actions/execute`

Request:

```ts
{
  previewId: string;
  capability: string;
  target: {
    type: string;
    id?: string;
  };
  confirmed: true;
  idempotencyKey: string;
}
```

Response:

```ts
{
  status: 'executed' | 'unsupported' | 'blocked' | 'failed';
  targetType: string;
  targetId?: string;
  auditLogId?: string | null;
  nextHref?: string;
  message: string;
}
```

Rules:

1. Rebuild or verify the preview server-side.
2. Reject when `confirmed !== true`.
3. Reject missing or reused idempotency keys.
4. Execute through existing target write path only.
5. Preserve target history, notification, and resolution-signal behavior.
6. Append `answerlattice_auditLogs` when assistant execution needs explicit audit history.
7. Merge compact assistant counters without creating an action event document.

### Deferred: `GET /api/answerlattice/owner-analytics/summary`

Purpose: one protected support analytics packet for dashboard cards and assistant period questions.

Reads:

- `platformSummary/ownerSupportAnalyticsSummary_{tId}_{sId}`
- bounded daily aggregate fallback only when the summary is missing or the requested custom range is inside the documented cap

Response:

```ts
{
  summary: AnswerlatticeOwnerSupportAnalyticsSummary;
  periods: Record<string, AnswerlatticeOwnerAnalyticsPeriod>;
  dashboardCards: AnswerlatticeOwnerAnalyticsCard[];
  readModel: {
    firestoreReads: number;
    source: 'summary' | 'bounded_daily_aggregate';
    maxDailyDocsRead: number;
  };
}
```

This endpoint does not read raw `chatSessions`, raw `aiSearchHistory`, raw `supportTickets`, raw `answerlattice_signalEvents`, KB articles, or audit logs on default load.

### Deferred: `POST /api/answerlattice/support-assistant/feedback`

Purpose: owner feedback on assistant usefulness without a feedback collection.

Allowed writes:

- merge aggregate counters into `platformSummary/ownerSupportAssistantSummary_{tId}_{sId}`
- when `operationId` points to an existing assistant AI operation for the same `tId/sId`, merge a small `assistantFeedback` object into that operation doc

Forbidden writes:

- full query text
- full answer transcript
- raw evidence payload
- cross-tenant operation patch

---

## Context Packet Strategy

The context layer exposes small typed packets, not raw database rows.

| Packet | Source | Default cost |
| --- | --- | --- |
| `assistantBrief` | Compact `platformSummary` docs | Summary reads only. |
| `supportBoardDigest` | `supportBoardSummary_{tId}_{sId}` plus bounded cards when explicit | Summary first, capped list on detail. |
| `governanceDigest` | Coverage, trust, pending proposals, canonical answer counts where already summarized | Summary first. |
| `surfaceDigest` | `contextContent_{tId}_{sId}` and bounded product surfaces | Summary first. |
| `signalDigest` | Friction/signal summaries, capped signal counts only when explicit | No broad event scan. |
| `recordContext` | One clicked record from Support Board or Governance | Single-record or capped related reads. |
| `assistantHealth` | `ownerSupportAssistantSummary_{tId}_{sId}` | One compact doc. |
| `ownerAnalytics` | `ownerSupportAnalyticsSummary_{tId}_{sId}` and existing daily aggregate docs | Standard periods from summary; custom ranges from capped daily aggregates only. |

If a packet cannot be built cheaply, the answer returns `insufficient_data` and links to the source screen instead of scanning.

---

## Action Behavior

The assistant endpoint does not own new mutation semantics.

| Owner action | Implementation path |
| --- | --- |
| Save plan | `createAnswerlatticeSupportBoardCard()` or `addAnswerlatticeSupportBoardNote()` with `sourceType: 'assistant'` and `assistantContext`. |
| Preview ticket status | Action preview endpoint reads one scoped ticket and returns target/status/risk; 0 writes. |
| Execute ticket status | Action executor calls the selected existing ticket status/update path, preserves history and resolution signals, and writes audit metadata when needed. |
| Draft ticket reply | LLM or deterministic draft over bounded ticket context; preview only until owner confirms. |
| Send ticket reply | Action executor calls `addTicketMessage()` with owner-reviewed text and existing notification behavior. |
| Review unanswered questions | Use Support Board `NEEDS_ANSWER`, signal/friction summaries, Knowledge Intake, and mutation proposal routes. |
| Prepare FAQ from repeated Q/A | Existing Knowledge Intake `repeated_reply` source path. |
| Prepare KB/article/surface draft | Existing Knowledge Intake `product_note` source path with `metadata.assistantContext`, only when owner asks for that output. |
| Prepare canonical answer update | Existing mutation proposal path or Knowledge Intake canonical proposal publish path; entity requirement remains mandatory. |
| Open review | Existing route to Governance, FAQ, KB, Knowledge Intake, or Support Board. |
| Copy summary | Client-only clipboard action. |
| Feedback on assistant answer | Aggregate-only feedback endpoint; no transcript store. |
| Ask about today, week, or month stats | Owner analytics summary endpoint; no raw source scan. |

Action executor constraints:

- No raw Firestore write when an existing DAL/API helper owns the mutation.
- No cross-product write from Answerlattice adapters.
- No execution from prompt text alone.
- No background worker for action completion.
- No action history collection.

---

## LLM Contract

LLM use is assistive, not authoritative.

Allowed:

- Rephrase deterministic answer into owner-readable language.
- Rank already-fetched evidence.
- Draft a Support Board note.
- Draft review text for Knowledge Intake or mutation proposals.
- Draft a ticket reply for owner review.

Forbidden:

- Fetching data through model tools.
- Sending raw unrestricted tickets, full private documents, widget keys, auth tokens, payment data, secrets, or unbounded chat transcripts.
- Letting the model approve, publish, close, reply, or modify production records.
- Persisting model conversations as product state.
- Letting LLM decide canonical answer selection, drift class, mutation type, or approval status.
- Letting LLM choose the action adapter or bypass confirmation.

LLM-backed requests use existing AI accounting and operation logs.

---

## Function Logic

Do not add a new scheduled Cloud Function.

If assistant aggregate health is implemented, add:

```ts
syncOwnerSupportAssistantSummary(tId, sId)
```

and call it from `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` through the existing `answerlatticeMasterScheduler` path.

If dashboard support analytics is implemented, add:

```ts
syncOwnerSupportAnalyticsSummary(tId, sId)
```

and call it from the same existing nightly flow. It builds standard period snapshots from existing daily aggregates and compact summaries.

Function task contract:

- feature-flagged
- tenant-scoped
- reads compact summaries first
- reads existing daily aggregates with strict caps for standard period rollups
- reads recent assistant AI operation subcollection with a cap
- reads recent Support Board assistant cards with a cap
- reads only changed metadata needed for aggregate counters
- writes `platformSummary/ownerSupportAssistantSummary_{tId}_{sId}` and `platformSummary/ownerSupportAnalyticsSummary_{tId}_{sId}` only when their `summaryHash` changes
- records run details inside the existing scheduler run log
- never sends raw prompts or full answers to a provider

---

## Analytics Contract

Do not create `answerlattice_supportAssistantEvents`.

Measure outcomes through:

- `answerlattice_aiOperations/{tId}/{sId}` for LLM-backed request cost and model health
- Support Board cards/notes with `assistantContext`
- mutation proposals with `assistantContext`
- Knowledge Intake sources/review items with `metadata.assistantContext`
- compact `platformSummary/ownerSupportAssistantSummary_{tId}_{sId}` aggregate counters
- compact `platformSummary/ownerSupportAnalyticsSummary_{tId}_{sId}` period counters

Metrics:

- assistant questions answered by cost class
- owner support analytics period views and standard period answer requests
- unsupported requests
- saved Support Board plans
- review drafts prepared
- assistant-assisted proposals approved after human review
- assistant-assisted drafts published after human review
- owner-confirmed ticket status updates and replies executed through existing ticket paths
- change in coverage/trust/support-board summary after assistant-assisted review

---

## Implementation Order

1. Add feature flags, route constant, nav item, and types.
2. Add additive metadata/source-type changes to existing Support Board and Answerlattice types.
3. Build summary-first context fetchers and deterministic intent classifier.
4. Build brief/query/feedback APIs with auth, permission, validation, rate limit, and no-store responses.
5. Build action registry plus preview/execute endpoints with idempotency and audit reuse.
6. Build route UI with structured answer cards, evidence, prompt chips, and safe actions.
7. Wire save and execute actions into existing Ticket, Support Board, Knowledge Intake, and Governance flows.
8. Add LLM assistive wording/draft path behind the feature flag and AI accounting.
9. Add compact assistant and owner analytics summary tasks inside the existing Answerlattice nightly scheduler when the dashboard cards need persisted aggregates.
10. Verify docs, types, security, Firebase cost ceilings, desktop/mobile layout, and product-boundary naming.

---

## Verification Commands

Before code completion:

```bash
npx tsc --noEmit --incremental false
```

Targeted checks after implementation:

```bash
rg -n "\\bC[a]nonica\\b|\\bC[A]NONICA\\b|/[c]anonica\\b|/api/[c]anonica\\b|ENABLE_C[A]NONICA|Support C[o]pilot|support_[c]opilot" src __docs__/answerlattice/owner-support-assistant
rg -n "ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT|support-assistant|ownerSupportAssistant" src __docs__/answerlattice/owner-support-assistant
```

Docs-only updates do not require TypeScript validation.

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-07 | Added implementation plan for typed action registry, preview/execute endpoints, ticket status/reply adapters, audit reuse, and cross-product boundary. |
| 2026-06-07 | Reworked implementation plan into complete frozen architecture with storage ownership, API surface, function summary contract, and no separate assistant collections. |
| 2026-06-07 | Added implementation plan with summary-first context packets, existing-governance writes, and assistive AI formatting. |

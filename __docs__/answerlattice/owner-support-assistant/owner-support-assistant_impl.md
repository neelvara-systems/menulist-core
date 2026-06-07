# Owner Support Assistant - Implementation Plan

> **Status:** PLANNED
> **Created:** 2026-06-07
> **Implementation posture:** Build the complete frozen architecture behind flags. Build order is for engineering safety only; it is not a product maturity plan.

---

## Implementation Verdict

Owner Support Assistant should be implemented as a thin Answerlattice owner/staff command layer over existing governed systems.

It must not own a separate support memory, message store, plan store, or analytics warehouse. Its durable outputs belong in the systems that already own that kind of truth:

- Support plans and follow-up work -> Support Board.
- FAQ, KB, and product-surface drafts -> Knowledge Intake review items.
- Canonical answer changes -> mutation proposals and Governance.
- AI cost/accounting -> `answerlattice_aiOperations`.
- Assistant health and adoption -> compact `platformSummary` read model.

---

## Reuse Map

| Existing system | Reuse |
| --- | --- |
| `src/components/answerlattice/AnswerlatticeDashboardLayout.tsx` | Route shell, access state, responsive dashboard layout. |
| `src/lib/answerlattice/sessionScope.ts` | `resolveAnswerlatticeSessionScope()`, `getAnswerlatticeScopedSession()`, and `canUseAnswerlatticeManagement()`. |
| `src/config/features.ts` | App-side flag `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT`, default `false`. |
| `functions-answerlattice/src/constants/features.ts` | Function-side mirror only when the compact assistant summary task is wired. |
| `src/constants/answerlattice/routes.ts` | Add `/answerlattice/support-assistant` route constant. |
| `src/constants/answerlattice/navigations.ts` | Add Support Control nav item behind flag and permission. |
| `src/database/answerlattice/supportBoard.ts` | Read bounded board cards/summaries and save explicit assistant plans as Support Board cards/notes. |
| `src/database/answerlattice/canonicalAnswers.ts` | Read active/entity-bound answers only for explicit answer review intents. |
| `src/database/answerlattice/mutationProposals.ts` | Read pending proposals and create answer-change drafts through existing review flow. |
| `src/lib/answerlattice/knowledgeIntake.ts` | Reuse repeated-reply/product-note intake paths for FAQ, KB, and surface review drafts. |
| `src/database/answerlattice/signalEvents.ts` | Use capped recent/count queries only for explicit friction/repeated-issue intents. |
| `src/database/answerlattice/productSurfaces.ts` | Reuse `contextContent_{tId}_{sId}` and bounded surface reads. |
| `src/database/answerlattice/coverageKPI.ts` | Reuse `platformSummary/coverage_{tId}_{sId}`. |
| `src/database/answerlattice/trustMetrics.ts` | Reuse `platformSummary/trustMetrics_{tId}_{sId}`. |
| `src/database/answerlattice/frictionStats.ts` | Reuse friction snapshot and weekly insight summary docs. |
| `src/lib/ai/accounting.ts` and `src/lib/ai/operationLog.ts` | Record and account for LLM-backed assistant operations. |
| `functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts` | Keep all scheduled assistant summary work inside the existing master scheduler. |
| `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` | Add assistant summary sync as a bounded tenant task if aggregate read model is implemented. |

---

## Planned Code Changes

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
| `src/lib/answerlattice/ownerSupportAssistant/ai.ts` | Prompt builder and LLM wrapper over typed context packets only. |
| `src/lib/answerlattice/ownerSupportAssistant/summary.ts` | Compact assistant health summary builder for API/function reuse. |
| `src/types/answerlattice/ownerSupportAssistant.ts` | Additive assistant-specific types. |
| `src/app/api/answerlattice/support-assistant/brief/route.ts` | Protected, summary-only brief endpoint. |
| `src/app/api/answerlattice/support-assistant/query/route.ts` | Protected, rate-limited query endpoint. |
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
| AI action constants | Add `ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT` only if LLM calls need distinct cost/accounting classification. | Keeps assistant AI cost separate from intake, FAQ generation, and translation. |
| `platformSummary` | Add `ownerSupportAssistantSummary_{tId}_{sId}` compact doc. | Supports health cards and adoption metrics without high-volume event storage. |

---

## Feature Flags

Add app flag:

```ts
ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT: false
```

Add function flag only when `ownerSupportAssistantSummary.ts` is wired:

```ts
ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT_SUMMARY: false
```

Rules:

- Default `false`.
- Route, nav item, brief endpoint, query endpoint, feedback endpoint, and summary task all check the relevant flag.
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

Reads:

- store/workspace context only when needed for permission/license state
- `platformSummary/ownerSupportAssistantSummary_{tId}_{sId}`
- `platformSummary/supportBoardSummary_{tId}_{sId}`
- `platformSummary/coverage_{tId}_{sId}`
- `platformSummary/trustMetrics_{tId}_{sId}`
- `platformSummary/contextContent_{tId}_{sId}`
- `platformSummary/knowledgeIntakeSummary_{tId}_{sId}`
- friction summary docs when enabled

Response:

```ts
{
  brief: OwnerSupportAssistantBrief;
  promptChips: OwnerSupportAssistantPrompt[];
  limits: string[];
  readModel: {
    firestoreReads: number;
    sourceDocs: string[];
    costClass: 'summary_only';
  };
}
```

### `POST /api/answerlattice/support-assistant/query`

Request:

```ts
{
  question: string;
  context?: {
    source?: 'assistant_page' | 'dashboard_card' | 'support_board' | 'governance' | 'weekly_digest';
    recordId?: string;
    recordType?: string;
  };
  mode?: 'deterministic' | 'ai_assisted';
}
```

Response:

```ts
{
  answerId: string;
  operationId?: string | null;
  status: 'healthy' | 'needs_review' | 'at_risk' | 'insufficient_data' | 'partial' | 'unsupported';
  intent: string;
  directAnswer: string;
  evidence: Array<{
    label: string;
    sourceType: string;
    sourceId?: string;
    href?: string;
    freshness?: string;
    confidence?: 'high' | 'medium' | 'low';
  }>;
  priority?: {
    level: 'low' | 'medium' | 'high';
    reason: string;
  };
  nextActions: Array<{
    type: 'open_route' | 'create_support_board_card' | 'add_support_board_note' | 'prepare_review_draft' | 'copy_summary';
    label: string;
    href?: string;
    payload?: unknown;
  }>;
  limits: string[];
  costClass: 'summary_only' | 'bounded_detail' | 'ai_assisted';
  contextHash: string;
}
```

Server sequence:

1. `withAuth()`.
2. Feature flag check.
3. Resolve Answerlattice scoped session from server-side session, not request body.
4. Permission check.
5. Zod validate request.
6. Apply workspace/user rate limit before context expansion.
7. Classify intent and unsupported actions.
8. Fetch compact context packet.
9. Fetch bounded detail only when the intent requires it.
10. Build deterministic answer.
11. Use LLM only as assistive wording/draft layer over typed context packets.
12. Record AI operation only for LLM-backed requests.
13. Return private `no-store` response.

### `POST /api/answerlattice/support-assistant/feedback`

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

If a packet cannot be built cheaply, the answer returns `insufficient_data` and links to the source screen instead of scanning.

---

## Action Behavior

The assistant endpoint does not own new mutation semantics.

| Owner action | Implementation path |
| --- | --- |
| Save plan | `createAnswerlatticeSupportBoardCard()` or `addAnswerlatticeSupportBoardNote()` with `sourceType: 'assistant'` and `assistantContext`. |
| Prepare FAQ from repeated Q/A | Existing Knowledge Intake `repeated_reply` source path. |
| Prepare KB/article/surface draft | Existing Knowledge Intake `product_note` source path with `metadata.assistantContext`, only when owner asks for that output. |
| Prepare canonical answer update | Existing mutation proposal path or Knowledge Intake canonical proposal publish path; entity requirement remains mandatory. |
| Open review | Existing route to Governance, FAQ, KB, Knowledge Intake, or Support Board. |
| Copy summary | Client-only clipboard action. |
| Feedback on assistant answer | Aggregate-only feedback endpoint; no transcript store. |

---

## LLM Contract

LLM use is assistive, not authoritative.

Allowed:

- Rephrase deterministic answer into owner-readable language.
- Rank already-fetched evidence.
- Draft a Support Board note.
- Draft review text for Knowledge Intake or mutation proposals.

Forbidden:

- Fetching data through model tools.
- Sending raw unrestricted tickets, full private documents, widget keys, auth tokens, payment data, secrets, or unbounded chat transcripts.
- Letting the model approve, publish, close, or modify production records.
- Persisting model conversations as product state.
- Letting LLM decide canonical answer selection, drift class, mutation type, or approval status.

LLM-backed requests use existing AI accounting and operation logs.

---

## Function Logic

Do not add a new scheduled Cloud Function.

If assistant aggregate health is implemented, add:

```ts
syncOwnerSupportAssistantSummary(tId, sId)
```

and call it from `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` through the existing `answerlatticeMasterScheduler` path.

Function task contract:

- feature-flagged
- tenant-scoped
- reads compact summaries first
- reads recent assistant AI operation subcollection with a cap
- reads recent Support Board assistant cards with a cap
- reads only changed metadata needed for aggregate counters
- writes `platformSummary/ownerSupportAssistantSummary_{tId}_{sId}` only when `summaryHash` changes
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

Metrics:

- assistant questions answered by cost class
- unsupported requests
- saved Support Board plans
- review drafts prepared
- assistant-assisted proposals approved after human review
- assistant-assisted drafts published after human review
- change in coverage/trust/support-board summary after assistant-assisted review

---

## Implementation Order

1. Add feature flags, route constant, nav item, and types.
2. Add additive metadata/source-type changes to existing Support Board and Answerlattice types.
3. Build summary-first context fetchers and deterministic intent classifier.
4. Build brief/query/feedback APIs with auth, permission, validation, rate limit, and no-store responses.
5. Build route UI with structured answer cards, evidence, prompt chips, and safe actions.
6. Wire save actions into existing Support Board, Knowledge Intake, and Governance flows.
7. Add LLM assistive wording/draft path behind the feature flag and AI accounting.
8. Add compact assistant summary task inside the existing Answerlattice nightly scheduler if the health card needs persisted aggregates.
9. Verify docs, types, security, Firebase cost ceilings, desktop/mobile layout, and product-boundary naming.

---

## Verification Commands

Before code completion:

```bash
npx tsc --noEmit --incremental false
```

Targeted checks after implementation:

```bash
rg -n "CANONI[C]A|canoni[c]a|support[C]opilot|support_[c]opilot|/[c]anonica" src __docs__/answerlattice/owner-support-assistant
rg -n "ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT|support-assistant|ownerSupportAssistant" src __docs__/answerlattice/owner-support-assistant
```

Docs-only updates do not require TypeScript validation.

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-07 | Reworked implementation plan into complete frozen architecture with storage ownership, API surface, function summary contract, and no separate assistant collections. |
| 2026-06-07 | Added implementation plan with summary-first context packets, existing-governance writes, and assistive AI formatting. |

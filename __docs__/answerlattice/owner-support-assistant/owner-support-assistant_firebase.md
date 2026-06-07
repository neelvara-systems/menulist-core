# Owner Support Assistant - Firebase Cost and Operations

> **Status:** PLANNED
> **Created:** 2026-06-07
> **Priority:** Firebase cost is the first design constraint.

---

## Cost Verdict

Owner Support Assistant is a low-cost, owner-triggered read and routing layer over existing Answerlattice summaries and governed records.

The frozen storage decision:

- no new Firestore collection
- no Firebase Storage path
- no realtime listener
- no standalone scheduled Cloud Function
- no public endpoint
- no high-volume event collection
- no transcript/session/message collection
- no background AI loop

The only new durable assistant-owned record is a compact document inside the existing `platformSummary` collection:

```text
platformSummary/ownerSupportAssistantSummary_{tId}_{sId}
```

That is a read model, not a transcript store.

---

## Storage Ownership Matrix

| Data | Storage | Write trigger | Notes |
| --- | --- | --- | --- |
| Route brief | Existing compact summary docs plus `ownerSupportAssistantSummary_{tId}_{sId}` | Existing scheduler/API summary writers | No raw scans on route load. |
| Owner question | Browser/API request only | None for deterministic answers | Do not store full question by default. |
| Deterministic answer | Response only | None | Answer is reproducible from context packet and evidence refs. |
| LLM-backed answer | `answerlattice_aiOperations/{tId}/{sId}/{operationId}` | Successful provider call | Store action, model, token/cost metadata, context hash, and redacted client response only. |
| Saved plan | `answerlattice_supportBoardCards` | Owner clicks save plan | Add `sourceType: 'assistant'` and `assistantContext`; no plan collection. |
| Plan note | Existing Support Board card note array | Owner clicks save note | Uses existing note caps. |
| FAQ draft | Existing Knowledge Intake `repeated_reply` path when Q/A pair exists | Owner requests draft | Existing review/publish gates apply. |
| KB/article/surface draft | Existing Knowledge Intake `product_note` path | Owner explicitly requests that output | Existing review/publish gates apply. |
| Canonical answer update | `answerlattice_mutationProposals` or Knowledge Intake canonical proposal path | Owner requests prepared update | Entity requirement and Governance approval remain mandatory. |
| Assistant feedback | `platformSummary/ownerSupportAssistantSummary_{tId}_{sId}` and AI operation metadata when an operation exists | Owner clicks feedback | Aggregate counters only; no feedback collection. |
| Assistant adoption/health | `platformSummary/ownerSupportAssistantSummary_{tId}_{sId}` | Existing nightly summary task or aggregate feedback endpoint | Hash-skip unchanged writes. |

Rejected collections:

- `answerlattice_ownerAssistantSessions`
- `answerlattice_ownerAssistantMessages`
- `answerlattice_ownerAssistantEvents`
- `answerlattice_ownerAssistantPlans`
- `answerlattice_ownerAssistantFeedback`
- `answerlattice_ownerAssistantAttributions`

---

## Page Load Cost

Initial route load uses `GET /api/answerlattice/support-assistant/brief`.

Target reads:

| Source | Expected reads |
| --- | --- |
| Store/workspace context for permission/license state | existing route/API cost |
| `platformSummary/ownerSupportAssistantSummary_{tId}_{sId}` | 1 read |
| `platformSummary/supportBoardSummary_{tId}_{sId}` | 1 read |
| `platformSummary/coverage_{tId}_{sId}` | 1 read |
| `platformSummary/trustMetrics_{tId}_{sId}` | 1 read |
| `platformSummary/contextContent_{tId}_{sId}` | 1 read |
| `platformSummary/knowledgeIntakeSummary_{tId}_{sId}` | 1 read |
| `platformSummary/frictionSnapshot_{tId}_{sId}` / `friction_{tId}_{sId}` when enabled | 0-2 reads |

Budget target:

- no realtime listener
- no full collection query
- no vector search
- no AI call
- no write
- no list over raw support events

If a summary doc is missing, the UI shows `insufficient_data` for that source and links to the owner workflow that creates or repairs the source.

---

## Query Cost Classes

| Cost class | Trigger | Allowed operations |
| --- | --- | --- |
| `summary_only` | Health brief, unsupported action, broad "what needs review" query. | Reuse brief packet. |
| `bounded_detail` | Owner asks about a topic, record, or product area. | Capped reads from existing scoped DAL/API functions. |
| `ai_assisted` | Owner requests wording, plan summary, or draft explanation after context packet exists. | Same bounded context plus one rate-limited LLM call and one AI operation log write. |

The endpoint classifies intent before expensive work.

---

## Bounded Detail Reads

| Detail source | Cap rule |
| --- | --- |
| Support Board cards | Reuse bounded list query; assistant cap stays at or below existing board caps. |
| Support Board item | Single card read/update path. |
| Pending mutation proposals | Reuse pending proposal list; assistant asks for only fields needed for evidence. |
| Canonical answers | Use entity-specific or active answer queries only when the owner query identifies a topic/entity. |
| Signal events/counts | Use existing capped recent/count queries only for explicit friction/repeated-issue intents. |
| Product surfaces | Use summary first; bounded list only for surface-specific questions. |
| KB/FAQ/article records | Use existing review/search paths; do not load all articles. |
| AI operations | Query only `answerlattice_aiOperations/{tId}/{sId}` for assistant source with a recent cap. |

Any query that cannot be bounded returns `insufficient_data` with a safe route link.

---

## Write Costs

| Action | Write path | Cost behavior |
| --- | --- | --- |
| Ask deterministic question | None | 0 writes. |
| Ask LLM-backed question | Existing AI operation log | 1 operation log write plus billing/credit writes if billable. |
| Save plan | Existing Support Board card/note | Existing Support Board write cost. |
| Prepare FAQ or KB draft | Existing Knowledge Intake source/review item writes | Existing Knowledge Intake cost and caps. |
| Prepare canonical proposal | Existing mutation proposal or Knowledge Intake canonical proposal write | Existing Governance cost and approval flow. |
| Open review route | None | 0 writes. |
| Copy summary | None | 0 writes. |
| Submit assistant feedback | Existing `platformSummary` aggregate doc and AI operation metadata patch when an operation exists | 1-2 bounded writes, no raw text. |
| Nightly assistant summary | Existing `platformSummary` aggregate doc | 1 write only when summary hash changes. |

Do not write one document per assistant message.

---

## Compact Summary Doc

Doc id:

```text
platformSummary/ownerSupportAssistantSummary_{tId}_{sId}
```

Shape:

```ts
{
  schemaVersion: 1;
  pId: 'AL';
  tId: number;
  sId: number;
  lastUpdated: Timestamp;
  summaryHash: string;
  statusCounts: Record<'healthy' | 'needs_review' | 'at_risk' | 'insufficient_data' | 'partial' | 'unsupported', number>;
  costClassCounts: Record<'summary_only' | 'bounded_detail' | 'ai_assisted', number>;
  unsupportedRequestCount: number;
  assistantPlansSaved: number;
  assistantDraftsPrepared: number;
  assistantDraftsApproved: number;
  assistantDraftsPublished: number;
  aiOperations: {
    recentCount: number;
    totalTokens: number;
    totalUnits: number;
    lastOperationAt: Timestamp | null;
    errorCount: number;
  };
  sourceCounts: {
    supportBoardCards: number;
    mutationProposals: number;
    intakeReviewItems: number;
  };
  lastSync: {
    source: 'answerlattice_nightly' | 'assistant_feedback_api';
    windows: Record<string, number>;
    caps: Record<string, number>;
  };
}
```

No field stores full questions, full answers, raw prompts, raw evidence payloads, secrets, or full ticket bodies.

---

## AI Cost Controls

LLM-backed requests must:

1. Require feature flag.
2. Require authenticated Answerlattice management access.
3. Apply rate limit before context expansion and provider call.
4. Use bounded typed context packets.
5. Exclude secrets, raw widget keys, unrestricted ticket bodies, payment data, and auth/session data.
6. Use existing AI accounting and operation logging.
7. Return deterministic fallback when provider calls fail, SAFE_MODE is active, credits are unavailable, or context is insufficient.
8. Use a distinct AI action only if product/accounting needs assistant-specific cost reporting.

LLM is never the database query layer and never the governance authority.

---

## Function Logic

No new scheduled Cloud Function.

Assistant aggregate health belongs inside the existing Answerlattice scheduler:

- Export stays `answerlatticeNightly`.
- Master scheduler stays `answerlatticeMasterScheduler`.
- New helper, if implemented, is `functions-answerlattice/src/answerlattice/ownerSupportAssistantSummary.ts`.
- `answerlatticeNightly.ts` calls the helper as a tenant task when `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT_SUMMARY` is enabled.

Task read caps:

| Source | Cap |
| --- | --- |
| Compact summary docs | direct doc reads only |
| Assistant AI operation subcollection | recent capped query |
| Support Board assistant cards | recent capped query |
| Mutation proposals with assistant context | recent capped query only if indexed and needed |
| Intake review items with assistant context | recent capped query only if indexed and needed |

Task write:

- write `ownerSupportAssistantSummary_{tId}_{sId}` only when `summaryHash` changes
- include run details in existing scheduler run log

---

## Indexes and Rules

No new collection rules are required because storage stays in existing collections.

Implementation must reassess indexes/rules if it adds:

- `sourceType == 'assistant'` Support Board query
- assistant-context filtered mutation proposal query
- assistant-context filtered intake review item query
- AI operation source query on `answerlattice_aiOperations/{tId}/{sId}`

If a new index is required, document it here and deploy the smallest Answerlattice Firebase target after validation.

---

## Analytics Contract

The ChatGPT proposal included many event names. The cost-first decision is aggregate-first:

- no dedicated assistant event collection
- no raw prompt transcript warehouse
- AI operations only for LLM-backed operations
- Support Board / Knowledge Intake / Governance records for outcome proof
- `ownerSupportAssistantSummary_{tId}_{sId}` for compact health and adoption counters

This still measures the important chain:

```text
assistant answer -> owner safe action -> governed review artifact -> human approval/publish -> support health changes
```

---

## Deployment Impact

Docs-only planning has no Firebase deployment.

Implementation deploy rules:

- Firestore rules/index changes require the matching Answerlattice Firebase target deploy.
- Firebase function logic changes require the matching `functions-answerlattice` deploy.
- Next.js/Vercel deploy remains opt-in and must not be run unless explicitly requested in the current session.

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-07 | Reworked Firebase contract into a complete storage ownership model with compact summary doc, no assistant collections, and existing scheduler integration. |
| 2026-06-07 | Added cost-first Firebase contract for docs-first Owner Support Assistant planning. |

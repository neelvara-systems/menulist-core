# Owner Support Assistant - Firebase Cost and Operations

> **Status:** LIVE READ-ONLY COST CONTRACT - deferred write/summary design retained below
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
- no dedicated analytics collection
- no generic action queue
- no assistant action collection
- no high-volume event collection
- no transcript/session/message collection
- no background AI loop

The live runtime creates no durable assistant-owned record. The deferred target architecture permits a compact document inside the existing `platformSummary` collection:

```text
platformSummary/ownerSupportAssistantSummary_{tId}_{sId}
```

Deferred dashboard analytics permits a second compact document inside the same existing collection:

```text
platformSummary/ownerSupportAnalyticsSummary_{tId}_{sId}
```

Neither deferred document is written or read by the current runtime. If implemented later, they remain read models, not transcript or event stores.

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
| Ticket status action | Existing support ticket document plus audit metadata when needed | Owner confirms preview | Existing ticket status/history behavior remains source of truth. |
| Ticket reply action | Existing support ticket message array | Owner confirms reviewed reply | Existing message cap and notification path remain in force. |
| Unanswered-question action | Support Board, Knowledge Intake, or mutation proposal target | Owner confirms review action | No assistant-owned unanswered queue. |
| Assistant feedback | `platformSummary/ownerSupportAssistantSummary_{tId}_{sId}` and AI operation metadata when an operation exists | Owner clicks feedback | Aggregate counters only; no feedback collection. |
| Assistant adoption/health | `platformSummary/ownerSupportAssistantSummary_{tId}_{sId}` | Existing nightly summary task or aggregate feedback endpoint | Hash-skip unchanged writes. |
| Owner dashboard analytics | `platformSummary/ownerSupportAnalyticsSummary_{tId}_{sId}` | Existing nightly summary task | Standard period stats for dashboard and assistant questions. |
| Historical support analytics | Existing `chatAnalytics` daily aggregate docs and `answerlattice_frictionDailyStats` | Existing analytics/friction aggregation paths | Reuse; do not create an owner analytics collection. |

Rejected collections:

- `answerlattice_ownerAssistantSessions`
- `answerlattice_ownerAssistantMessages`
- `answerlattice_ownerAssistantEvents`
- `answerlattice_ownerAssistantPlans`
- `answerlattice_ownerAssistantFeedback`
- `answerlattice_ownerAssistantAttributions`
- `answerlattice_ownerAnalytics`
- `answerlattice_ownerAnalyticsEvents`
- `answerlattice_ownerAssistantActions`
- `answerlattice_ownerAssistantActionQueue`
- `answerlattice_ownerAssistantActionJobs`

---

## Page Load Cost

The live page reads exactly `coverage`, `trustMetrics`, `supportBoardSummary`, `frictionSnapshot`, `knowledgeIntakeSummary`, and `activation`: six reads on a cold packet and zero reads on a tenant/store cache hit within 60 seconds. The activation snapshot supplies factual launch verification; Daily Founder Brief is computed from that already-loaded packet and adds no write, listener, scheduler, provider call, or support-credit debit. The broader target budget below is deferred.

Strict source parsing, 48-hour stale classification, five-minute future-timestamp tolerance, status derivation, and caller-permission filtering are CPU-only. They do not create a repair read or write and cannot silently refresh source evidence.

Initial route load uses `GET /api/answerlattice/support-assistant/brief`.

Target reads:

| Source | Expected reads |
| --- | --- |
| Store/workspace context for permission/license state | existing route/API cost |
| `platformSummary/ownerSupportAssistantSummary_{tId}_{sId}` | 1 read |
| `platformSummary/ownerSupportAnalyticsSummary_{tId}_{sId}` | 1 read |
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
| `analytics_summary` | Today, this week, last week, this month, last month. | Reuse owner analytics summary packet. |
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
| Owner analytics custom range | Read existing daily aggregate docs only, capped by maximum range. |
| Ticket action preview | Read one scoped ticket only. |
| Action capability preview | Reuse current context packet or one target read; no broad search. |

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
| Preview action | None | 0 writes. |
| Execute ticket status | Existing ticket update path plus audit/summary metadata when needed | No action queue write. |
| Execute ticket reply | Existing ticket message write plus existing notification side effect | No duplicate message collection. |
| Execute unsupported or cross-product action | None | Return `unsupported`. |
| Open review route | None | 0 writes. |
| Copy summary | None | 0 writes. |
| Submit assistant feedback | Existing `platformSummary` aggregate doc and AI operation metadata patch when an operation exists | 1-2 bounded writes, no raw text. |
| Nightly assistant summary | Existing `platformSummary` aggregate doc | 1 write only when summary hash changes. |
| Nightly owner analytics summary | Existing `platformSummary` aggregate doc | 1 write only when summary hash changes. |

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
  assistantActionsPreviewed: number;
  assistantActionsExecuted: number;
  assistantActionsBlocked: number;
  assistantTicketRepliesSent: number;
  assistantTicketStatusUpdates: number;
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

## Owner Analytics Summary Doc

Doc id:

```text
platformSummary/ownerSupportAnalyticsSummary_{tId}_{sId}
```

Purpose:

- dashboard Support Analytics cards
- assistant answers for today/week/month stats
- standard period comparisons without daily-range reads on every question

Data sources:

- existing `chatAnalytics` daily aggregate docs
- existing `answerlattice_frictionDailyStats`
- existing compact coverage/trust/friction/support board/knowledge intake summaries
- existing capped AI operation aggregates when needed

The doc stores standard periods only:

- `today`
- `yesterday`
- `this_week`
- `last_week`
- `rolling_7d`
- `this_month`
- `last_month`
- `rolling_30d`

No new dedicated Firebase collection is allowed for these stats.

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
9. Never allow a model response to execute a mutation without a typed action adapter and owner confirmation.

LLM is never the database query layer and never the governance authority.

---

## Function Logic

No new scheduled Cloud Function.

Assistant aggregate health belongs inside the existing Answerlattice scheduler:

- Export stays `answerlatticeNightly`.
- Master scheduler stays `answerlatticeMasterScheduler`.
- New helper, if implemented, is `functions-answerlattice/src/answerlattice/ownerSupportAssistantSummary.ts`.
- Owner analytics helper, if implemented, is `functions-answerlattice/src/answerlattice/ownerSupportAnalyticsSummary.ts`.
- `answerlatticeNightly.ts` calls the helper as a tenant task when `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT_SUMMARY` is enabled.

Task read caps:

| Source | Cap |
| --- | --- |
| Compact summary docs | direct doc reads only |
| Assistant AI operation subcollection | recent capped query |
| Existing daily support analytics aggregates | standard period cap |
| Support Board assistant cards | recent capped query |
| Mutation proposals with assistant context | recent capped query only if indexed and needed |
| Intake review items with assistant context | recent capped query only if indexed and needed |
| Action audit logs | recent capped query only if the summary needs assistant action counters |

Task write:

- write `ownerSupportAssistantSummary_{tId}_{sId}` only when `summaryHash` changes
- write `ownerSupportAnalyticsSummary_{tId}_{sId}` only when `summaryHash` changes
- include run details in existing scheduler run log

---

## Indexes and Rules

No new collection rules are required because storage stays in existing collections.

Implementation must reassess indexes/rules if it adds:

- `sourceType == 'assistant'` Support Board query
- assistant-context filtered mutation proposal query
- assistant-context filtered intake review item query
- AI operation source query on `answerlattice_aiOperations/{tId}/{sId}`
- owner analytics daily aggregate range query beyond the documented cap
- assistant action audit query by action/type/source

If a new index is required, document it here and deploy the smallest Answerlattice Firebase target after validation.

---

## Analytics Contract

The ChatGPT proposal included many event names. The cost-first decision is aggregate-first:

- no dedicated assistant event collection
- no raw prompt transcript warehouse
- AI operations only for LLM-backed operations
- Support Board / Knowledge Intake / Governance records for outcome proof
- support ticket status/message target records for ticket action proof
- `answerlattice_auditLogs` for assistant execution attribution when target history is not enough
- `ownerSupportAssistantSummary_{tId}_{sId}` for compact health and adoption counters
- `ownerSupportAnalyticsSummary_{tId}_{sId}` for dashboard cards and standard period answers

This still measures the important chain:

```text
assistant answer -> owner safe action -> governed review artifact -> human approval/publish -> support health changes
assistant answer -> owner-confirmed ticket action -> target ticket history/audit -> support health changes
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
| 2026-06-07 | Added Firebase action-support contract: no action queue, no action collection, ticket actions use existing target writes plus audit metadata. |
| 2026-06-07 | Added owner analytics read-model decision: no dedicated analytics collection; use existing daily aggregates plus compact `platformSummary` period summaries. |
| 2026-06-07 | Reworked Firebase contract into a complete storage ownership model with compact summary doc, no assistant collections, and existing scheduler integration. |
| 2026-06-07 | Added cost-first Firebase contract for docs-first Owner Support Assistant planning. |

# Owner Support Assistant - Owner Analytics Read Model

> **Status:** DEFERRED TARGET CONTRACT - no owner analytics summary runtime exists
> **Created:** 2026-06-07
> **Purpose:** Final dashboard and assistant analytics architecture for owner questions such as today, this week, last week, this month, and last month.

---

## Final Decision

Do not add a new dedicated Firebase collection for owner analytics.

Use this storage strategy:

1. Existing source records remain the source of truth.
2. Existing daily aggregate collections remain the historical analytics source.
3. A compact `platformSummary` owner analytics document serves dashboard cards and assistant answers.
4. Standard owner periods are precomputed or assembled from compact daily aggregates.
5. Custom ranges are bounded and return `insufficient_data` instead of scanning raw collections.

Planned hot read model:

```text
platformSummary/ownerSupportAnalyticsSummary_{tId}_{sId}
```

This is not an analytics event store. It is a compact dashboard and assistant read model.

---

## Why No New Collection

| Reason | Decision |
| --- | --- |
| Answerlattice already has `chatAnalytics` daily aggregate docs | Reuse for daily question, feedback, and gap counts. |
| Answerlattice already has `answerlattice_frictionDailyStats` | Reuse for support-friction period totals and top entities. |
| Answerlattice already uses `platformSummary` for hot dashboard reads | Add one compact owner analytics summary there. |
| Raw sessions/search/tickets/signals grow without bound | Do not read them for dashboard cards or assistant date questions. |
| Owner questions need small answers, not BI tables | Precompute standard period summaries and provide capped detail links. |
| Firebase cost is the first constraint | One summary read beats daily or raw-detail reads on every route load. |

New analytics collection is rejected unless Answerlattice starts ingesting an external product/business metric stream that cannot fit existing governed sources. That would be a separate architecture review, not part of this assistant/dashboard plan.

---

## Supported Analytics Scope

Owner Support Assistant can answer support-business questions that Answerlattice actually owns:

| Area | Supported examples |
| --- | --- |
| Support usage | Questions asked, widget/help activity, messages, top questions. |
| Answer quality | Canonical hit/miss, confidence, negative feedback, regenerations, unresolved questions. |
| Support workload | Tickets, feedback, Support Board cards, open review work, drafts prepared. |
| Knowledge health | Coverage, trust, canonical answer count, entity/surface gaps, intake review state. |
| Product friction | Top friction entities, emerging topics, escalation and low-confidence trends. |
| Governance movement | Mutation proposals opened, approved, published, drift/review items. |

Unsupported unless imported as approved Answerlattice source data:

- revenue
- invoices
- signup conversion
- subscription churn
- product usage outside support interactions
- sales pipeline
- marketing campaign spend
- customer account health from external CRMs

When an owner asks for unsupported business metrics, the assistant must answer `insufficient_data` or `unsupported` and state which source is not connected.

---

## Standard Period Contract

The dashboard and assistant must understand these period keys:

| Period key | Meaning |
| --- | --- |
| `today` | Current tenant/store support day so far. |
| `yesterday` | Latest settled support day. |
| `this_week` | Current support week to date. |
| `last_week` | Previous complete support week. |
| `rolling_7d` | Last 7 settled support days. |
| `this_month` | Current support month to date. |
| `last_month` | Previous complete support month. |
| `rolling_30d` | Last 30 settled support days. |

Date math must use the Answerlattice workspace timezone and support-day end time from existing scheduler settings. Do not use browser-local midnight as the authority.

---

## Planned Summary Shape

Document:

```text
platformSummary/ownerSupportAnalyticsSummary_{tId}_{sId}
```

Shape:

```ts
{
  schemaVersion: 1,
  pId: 'AL',
  tId: number,
  sId: number,
  lastUpdated: Timestamp,
  summaryHash: string,
  timeZone: string,
  supportDayEndTime: string,
  latestSettledDate: string | null,
  currentDate: string,
  periods: {
    today: AnswerlatticeOwnerAnalyticsPeriod,
    yesterday: AnswerlatticeOwnerAnalyticsPeriod,
    this_week: AnswerlatticeOwnerAnalyticsPeriod,
    last_week: AnswerlatticeOwnerAnalyticsPeriod,
    rolling_7d: AnswerlatticeOwnerAnalyticsPeriod,
    this_month: AnswerlatticeOwnerAnalyticsPeriod,
    last_month: AnswerlatticeOwnerAnalyticsPeriod,
    rolling_30d: AnswerlatticeOwnerAnalyticsPeriod,
  },
  dashboardCards: Array<{
    key: string,
    label: string,
    value: number | string,
    periodKey: string,
    status: 'healthy' | 'needs_review' | 'at_risk' | 'insufficient_data' | 'partial',
    route: string | null,
  }>,
  topQuestions: Array<{ label: string, count: number, periodKey: string }>,
  topGaps: Array<{ label: string, count: number, route: string | null }>,
  limits: string[],
}
```

Period shape:

```ts
type AnswerlatticeOwnerAnalyticsPeriod = {
  startDate: string,
  endDate: string,
  settled: boolean,
  source: 'summary' | 'daily_aggregate' | 'missing',
  costClass: 'summary_only' | 'bounded_daily_range',
  supportUsage: {
    questions: number,
    messages: number,
    widgetQuestions: number,
    positiveFeedback: number,
    negativeFeedback: number,
    satisfactionRate: number | null,
  },
  answerQuality: {
    canonicalHits: number,
    canonicalMisses: number,
    coverageRate: number | null,
    lowConfidence: number,
    regenerations: number,
  },
  supportWorkload: {
    tickets: number,
    openSupportBoardCards: number,
    highPriorityCards: number,
    draftsPrepared: number,
    proposalsPending: number,
  },
  friction: {
    totalSignals: number,
    escalations: number,
    topEntities: Array<{ entityId: string, label: string, count: number }>,
  },
}
```

Hot docs must not store raw conversations, raw prompts, raw answers, raw ticket bodies, secrets, widget keys, or unrestricted customer payloads.

---

## Existing Data Reuse

| Need | Existing source |
| --- | --- |
| Daily support question counts | `chatAnalytics/{tId}_{sId}_{YYYY-MM-DD}` style daily aggregate docs. |
| Top questions and knowledge gaps | Existing `chatAnalytics.topQuestions` and `chatAnalytics.knowledgeGaps`, redacted/truncated before hot summary display. |
| Widget/help recent activity | Existing `aiSearchHistory` only through capped APIs or daily aggregates. |
| Canonical coverage | `platformSummary/coverage_{tId}_{sId}` and daily aggregates when available. |
| Trust and answer health | `platformSummary/trustMetrics_{tId}_{sId}`. |
| Product friction by entity | `answerlattice_frictionDailyStats` and `platformSummary/frictionSnapshot_{tId}_{sId}`. |
| Support Board workload | `platformSummary/supportBoardSummary_{tId}_{sId}` and bounded Support Board queries only on detail. |
| Knowledge Intake workload | `platformSummary/knowledgeIntakeSummary_{tId}_{sId}`. |
| Scheduler freshness | `platformSummary/answerlatticeNightlyState_{tId}_{sId}`. |
| AI cost and assistant use | `answerlattice_aiOperations/{tId}/{sId}` capped recent query or aggregate counters. |

---

## Dashboard Contract

Add a Support Analytics area on the Answerlattice dashboard.

The default dashboard load reads:

- `activation_{tId}_{sId}`
- `ownerSupportAnalyticsSummary_{tId}_{sId}`
- existing compact summaries already used by dashboard cards

It must not read:

- raw `chatSessions`
- raw `aiSearchHistory`
- raw `supportTickets`
- raw `answerlattice_signalEvents`
- raw KB/article collections
- raw audit logs

Dashboard tabs or filters:

| View | Data rule |
| --- | --- |
| Today | Read current-day aggregate from the summary. If unavailable, show latest settled data and a clear stale note. |
| This week | Use `periods.this_week`. |
| Last week | Use `periods.last_week`. |
| This month | Use `periods.this_month`. |
| Last month | Use `periods.last_month`. |
| Detail drilldown | Link to existing Support Board, Governance, Feedback, Conversations, or Knowledge Intake screens with capped list reads. |

No dashboard card should trigger an LLM call on load.

---

## Assistant Query Contract

The assistant should answer analytics questions through the same owner analytics read model.

Examples:

| Owner question | Data path |
| --- | --- |
| "What are today's stats?" | `ownerSupportAnalyticsSummary.periods.today`. |
| "How did support do this week?" | `periods.this_week` plus top cards. |
| "Compare this week with last week" | `periods.this_week` and `periods.last_week`. |
| "What happened last month?" | `periods.last_month`. |
| "Which questions repeated this month?" | `periods.this_month` plus topQuestions/topGaps. |
| "How much revenue did support save?" | Unsupported unless a reviewed ROI source is available. |

Custom date ranges:

- Allowed only up to the documented daily aggregate cap.
- Use existing daily aggregate docs, not raw source collections.
- Return `insufficient_data` if the range is missing aggregate coverage.
- Return a source note when the answer uses settled data instead of live current-day data.

---

## Write And Function Logic

Do not add a standalone scheduled Cloud Function.

Add owner analytics summary building to existing Answerlattice scheduled work if needed:

```text
functions-answerlattice/src/answerlattice/ownerSupportAnalyticsSummary.ts
```

The helper must be called from the existing `answerlatticeNightly` flow and follow the existing scheduler task pattern:

- tenant/store scoped
- bounded daily aggregate reads
- bounded friction daily reads
- direct compact summary doc reads
- standard period rollups
- hash-skip unchanged summary writes
- scheduler run log details

Current-day support stats should come from an existing daily aggregate doc when present. The dashboard and assistant must not scan today's raw sessions by default.

---

## Cost Contract

| Operation | Cost rule |
| --- | --- |
| Dashboard analytics card load | One owner analytics summary doc plus already-needed dashboard summaries. |
| Today stats question | Summary read only. If current-day aggregate is missing, no raw scan by default. |
| This week/last week/month question | Summary read only for standard periods. |
| Custom range question | Bounded daily aggregate reads only, capped by doc. |
| Drilldown | Existing route with existing capped list/pagination. |
| LLM wording | Uses already-built analytics packet and existing AI accounting. |
| Summary refresh | Existing Answerlattice scheduler only, hash-skip writes. |

This keeps the route scalable when many owners open the dashboard or ask standard period questions.

---

## Final Architecture Lock

Owner analytics is a shared dashboard and assistant read model, not a new analytics subsystem.

If implementation proves that Answerlattice needs external product usage, revenue, CRM, or subscription analytics beyond support knowledge and support interactions, that must be designed as a separate governed integration source with its own source ownership, consent, retention, Firebase cost, and support relevance review.

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-07 | Added final owner analytics read-model decision for dashboard cards and assistant period questions without a new dedicated Firebase collection. |

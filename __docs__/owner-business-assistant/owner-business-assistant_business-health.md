# Owner Business Assistant Business Health Track

**Owner-Facing Name:** Business Health
**Internal Slug:** owner-business-assistant
**Product:** MenuList
**Status:** Implemented behind feature flags
**Last Updated:** June 8, 2026

---

## Decision

Business Health is the read-only intelligence track.

It must ship as part of the day-one implementation, independently from Action Support. If Action Support is disabled, Business Health must still work.

Business Health includes:

- Dashboard card.
- Dashboard analytics strip.
- Full `/business-health` page.
- MobileShell screen.
- Cache-first context packet.
- Current business status.
- Standard analytics period answers.
- AI answers to typed owner questions from compact facts.
- Freshness/source disclosure.
- Calm refusals when data is missing.

Business Health excludes:

- Draft creation.
- Confirmed writes.
- Public-truth publishing.
- Media upload or generation.
- Any assistant-owned mutation.

## Flags

Business Health has its own kill switch:

```ts
ENABLE_OWNER_BUSINESS_HEALTH: true,
ENABLE_OWNER_BUSINESS_HEALTH_DASHBOARD_CARD: true,
ENABLE_OWNER_BUSINESS_HEALTH_PAGE: true,
ENABLE_OWNER_BUSINESS_HEALTH_ANALYTICS_INDEX: true,
ENABLE_OWNER_BUSINESS_HEALTH_TODAY_OVERLAY: true,
ENABLE_OWNER_BUSINESS_HEALTH_SUGGESTED_QUESTIONS: true,
ENABLE_OWNER_BUSINESS_HEALTH_FREE_TEXT: true,
ENABLE_OWNER_BUSINESS_HEALTH_AI_ANSWERS: false,
ENABLE_OWNER_BUSINESS_HEALTH_CONTEXT_PACKET_CACHE: true,
ENABLE_OWNER_BUSINESS_HEALTH_UPSTASH_CONTEXT_CACHE: false,
ENABLE_OWNER_BUSINESS_HEALTH_THREADS: true,
```

`ENABLE_OWNER_BUSINESS_ACTION_SUPPORT` must not be required for any Business Health read path.

## Read Models

Business Health uses existing `platformSummary`.

```text
platformSummary/ownerBusinessHealthCurrent_{tId}_{sId}
platformSummary/ownerBusinessAnalyticsIndex_{tId}_{sId}
platformSummary/ownerBusinessHealthSnapshot_{tId}_{sId}_{localDate}
```

No dedicated analytics collection is allowed.

## Analytics Period Contract

Supported standard periods:

- Today.
- Yesterday.
- This week.
- Last week.
- This month.
- Last month.
- Last 7 days.
- Last 30 days.
- Overall.

Runtime answer code must read from the context-packet cache first. On cache miss it may read:

- One current doc.
- One analytics index doc.
- One current-day daily analytics doc for partial "today" overlay.

Runtime answer code must not aggregate daily date ranges.

If a specific requested period is not present in the analytics index, the answer must refuse that period instead of falling back to a different period. For example, a "today" question may not answer with this-week data when the today overlay is disabled or missing. Scheduler-generated suggested questions should hide "today" when the today period is unavailable.

## AI Answer Contract

Typed owner questions use AI over `OwnerBusinessAssistantContextPacket`.

The model receives:

- Owner question.
- Cached health facts.
- Cached analytics period facts.
- Optional today overlay.
- Allowed actions.
- Answer rules.

The model must not receive raw Firebase collections.

Non-analytics questions follow the same packet rule. Store profile, public menu/project facts, public availability, screen status, feedback/review signals, and operational checks are answerable only when the context packet contains cached owner-safe facts. The read-only Health path must not perform live full-document reads or collection scans to satisfy those questions.

The answer route must validate structured model output before rendering it.

## Dashboard Contract

The owner dashboard should show:

1. Business Health status card.
2. Latest check time.
3. No action needed / needs review state.
4. Compact analytics strip for Today, This week, This month.
5. Entry to the full Business Health page.

Business Health may show action suggestions only as labels when Action Support is disabled. It must not call `/action`, create drafts, or expose confirmation UI unless Action Support is enabled.

## APIs

```text
GET  /api/owner-business-assistant/current
GET  /api/owner-business-assistant/analytics
POST /api/owner-business-assistant/answer
GET  /api/owner-business-assistant/thread/[threadId]
POST /api/owner-business-assistant/feedback
```

The answer route can return `actions: []` when Action Support is disabled.

## Cost Contract

| Flow | Reads | Writes |
| --- | ---: | ---: |
| Dashboard card | 0 on cache hit; 1 current read on miss | 0 |
| Dashboard analytics strip | 0 on cache hit; 1 analytics-index read, optional 1 today doc on miss | 0 |
| Business Health page | 0 on cache hit; 1 current read + 1 analytics-index read on miss | 0 |
| Suggested/typed question | 0 Firestore reads on context-packet cache hit | 0 by default; optional answer-event write under usage logging flag |
| AI answer cache miss | Current/index reads + provider accounting only if provider is used | Provider accounting/cache write only when provider is used; answer-event write only when usage logging flag is enabled |
| Optional owner thread history | 1 thread doc read with embedded `messages[]` | 1 merged thread doc write per exchange only under thread flag |

No listener is required for Business Health.

## Failure Behavior

If Business Health fails:

- Show "Latest check is not ready yet" or "Latest check is delayed."
- Do not fall back to raw collection scans.
- Do not enable Action Support as a workaround.

If Action Support fails:

- Business Health stays available.
- Hide action buttons or show "Open the related screen manually."

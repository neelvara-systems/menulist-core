# Predictive Support — ChatGPT Conversation Review

> **Version:** 1.0.0
> **Reviewed:** 2026-03-10
> **Source:** ChatGPT conversation (System 12, Capabilities 63-68)
> **Overall Accuracy:** ~55%

---

## §1 — Review Methodology

1. Read full ChatGPT conversation about Predictive Support (6 capabilities)
2. Audited entire Canonica codebase for existing relevant infrastructure
3. Researched industry patterns (Intercom, Zendesk, Userpilot, Chameleon)
4. Cross-checked every ChatGPT claim against codebase reality
5. Classified each claim as: ACCEPTED / MODIFIED / REJECTED

---

## §2 — Claim-by-Claim Assessment

### Capability 63 — Page Entry Detection

| # | ChatGPT Claim | Verdict | Reason |
|---|--------------|---------|--------|
| 1 | Need client SDK with `canon.page()`, `canon.feature()`, `canon.workflow()` | **MODIFIED** | CanonicaContextPayload ALREADY has page/feature/workflow fields. Only need to extend widget to send on page entry (not just on search). |
| 2 | Events must use stable page IDs, not URLs | **ACCEPTED** | Correct. CanonicaContextPayload already uses identifiers, not URLs. |
| 3 | Event payload must be <500 bytes | **ACCEPTED** | Correct constraint. |
| 4 | Need Edge Collector (Cloud Run) + Pub/Sub + Message Queue | **REJECTED** | Massive over-engineering. Canonica doesn't have 100K users with 20 events/session. A simple API call per page entry is sufficient. Stateless evaluation means the API route IS the "trigger worker." |
| 5 | Never store page events to Firestore | **MODIFIED** | Correct principle (don't store raw events). But we DO log suggestion interactions to existing signalEvents (not raw page events). |
| 6 | Deduplication: userId + pageId + 5s window | **MODIFIED** | Handled by cooldown system (Upstash Redis TTL). No need for separate dedup. |
| 7 | Latency budget ~75ms total pipeline | **ACCEPTED** | Achievable with our simpler architecture (~30ms estimated). |
| 8 | 2M events/day → $3K/month if Firestore | **MODIFIED** | Correct concern but irrelevant — we don't write page events to Firestore. Only suggestion interactions (~1% of page events). |

### Capability 64 — Context Trigger Engine

| # | ChatGPT Claim | Verdict | Reason |
|---|--------------|---------|--------|
| 1 | Rule-based triggers, deterministic, stateless | **ACCEPTED** | 100% correct. Core principle. |
| 2 | Trigger schema: triggerId, priority, conditions, action, cooldown, active | **ACCEPTED** | Adopted with additions (source, effectiveness, frictionSource). |
| 3 | Only allow: pageId, featureId, workflowId, role, plan, eventType as conditions | **ACCEPTED** | Adopted. Maps to CanonicaContextPayload fields. |
| 4 | Index triggers by pageId for fast lookup | **MODIFIED** | We use platformSummary doc (single read) instead of per-page index. At 200 triggers max, in-memory filtering is fast enough. |
| 5 | Workers cache trigger rules in memory, refresh every 60s | **MODIFIED** | No separate workers. API route loads platformSummary doc per request (cached by Firestore SDK). Nightly batch rebuilds. |
| 6 | Highest priority wins for conflict resolution | **ACCEPTED** | Adopted. |
| 7 | Cooldown in Redis or memory cache | **ACCEPTED** | Using Upstash Redis (already deployed). |
| 8 | Max 10 triggers per page | **MODIFIED** | We use 200 max per tenant (not per page). Per-page limit is unnecessary with priority sorting. |
| 9 | Firestore only stores trigger_rules — estimated <$5/month | **ACCEPTED** | Achieved. |
| 10 | 3 action types only: HELP_CARD, WORKFLOW_GUIDE, LINK_ARTICLE | **ACCEPTED** | Adopted exactly. |

### Capability 65 — Historical Failure Patterns

| # | ChatGPT Claim | Verdict | Reason |
|---|--------------|---------|--------|
| 1 | Need frictionPatterns collection with entityType, topic, signalCount, confidence | **REJECTED** | This ALREADY EXISTS as CanonicaFrictionSnapshot (topFrictionEntities + emergingTopics) computed nightly by frictionAggregation.ts. No new collection needed. |
| 2 | Pattern detection from tickets, chat conversations, search queries | **MODIFIED** | Already done by signalMutation.ts (entity-based clustering) and frictionAggregation.ts. |
| 3 | Daily pattern detection job | **MODIFIED** | Already runs nightly in canonicaNightly.ts. |
| 4 | 30-day signal retention | **MODIFIED** | Canonica uses 12-month TTL on signals. 14-day rolling window for clustering. |
| 5 | Pattern → trigger integration (auto-suggest) | **ACCEPTED** | This is the genuinely new part. Friction entities → suggested trigger rules. |
| 6 | Topic extraction via lightweight NLP | **REJECTED** | Canonica uses entity-based classification, not topic extraction. Entity binding > NLP. |
| 7 | supportSignals collection | **REJECTED** | Already exists as canonica_signalEvents. |

### Capability 66 — Proactive Issue Suggestions

| # | ChatGPT Claim | Verdict | Reason |
|---|--------------|---------|--------|
| 1 | Need helpSuggestions collection | **REJECTED** | Suggestions are DERIVED from trigger rule + canonical answer. No storage needed. |
| 2 | Suggestions from: trigger_rules → friction_patterns → manual_help | **MODIFIED** | Simpler: trigger rules already encode the priority. No separate resolution chain. |
| 3 | Suggestion ranking: score = priority + confidenceScore | **MODIFIED** | Simpler: priority field on trigger. Highest wins. |
| 4 | Deduplication of suggestions | **ACCEPTED** | Handled by: one trigger match per page visit. |
| 5 | Payload <1KB | **ACCEPTED** | Correct constraint. |
| 6 | Cooldown per user per suggestion, 24h default | **ACCEPTED** | Adopted. Configurable per trigger. |
| 7 | POST /predictive/suggestions endpoint | **MODIFIED** | Route: POST /api/canonica/predictive-help (consistent naming). |

### Capability 67 — Pre-Emptive Help UI

| # | ChatGPT Claim | Verdict | Reason |
|---|--------------|---------|--------|
| 1 | Three UI patterns: context card, inline tooltip, workflow helper | **ACCEPTED** | Good constraint. Adopted. |
| 2 | Non-blocking, contextual, dismissible | **ACCEPTED** | Core UX principles. |
| 3 | Bottom-right placement, 320-360px | **ACCEPTED** | Reasonable defaults for widget. |
| 4 | Display once per context, cooldown server-side | **ACCEPTED** | Matches our cooldown design. |
| 5 | UI state in localStorage | **ACCEPTED** | Correct — dismissed state client-side. |
| 6 | PredictiveHelpProvider → SuggestionFetcher → HelpRenderer component hierarchy | **MODIFIED** | Widget already has a component hierarchy. Proactive help renders within existing widget architecture. |
| 7 | Zero Firestore writes from UI | **MODIFIED** | Almost zero — we do log suggestion_shown/clicked/dismissed to signalEvents (fire-and-forget). |

### Capability 68 — Prediction Learning Loop

| # | ChatGPT Claim | Verdict | Reason |
|---|--------------|---------|--------|
| 1 | Three signals: suggestion_shown, suggestion_clicked, suggestion_dismissed | **ACCEPTED** | Adopted exactly. |
| 2 | Effectiveness = (clicks - dismissals) / impressions | **ACCEPTED** | Adopted. |
| 3 | Daily learning job | **MODIFIED** | Nightly batch (already runs daily). |
| 4 | Boost/reduce/deactivate triggers based on effectiveness | **ACCEPTED** | Adopted with guardrails (min 100 impressions, -0.3 threshold). |
| 5 | suggestionSignals collection, 14-30 day retention | **REJECTED** | Uses existing canonica_signalEvents with new signal types. 12-month TTL. |
| 6 | 20K views/day → $10-15/month | **MODIFIED** | Our approach: only log interactions (shown/clicked/dismissed), not raw page events. Cost much lower. |
| 7 | Assisted mode (recommend changes) vs auto mode | **MODIFIED** | Auto-disable only (score < -0.3 after 100+ impressions). Auto-boost rejected — manual priority management by founder. |

---

## §3 — What ChatGPT Got Right (Adopted)

1. ✅ Rule-based triggers, not ML — deterministic, fast, cheap
2. ✅ Three UI patterns only — context card, tooltip, workflow helper
3. ✅ Non-blocking, dismissible, cooldown-protected
4. ✅ Priority-based conflict resolution
5. ✅ Three interaction signals (shown/clicked/dismissed)
6. ✅ Effectiveness scoring formula
7. ✅ Firebase cost near zero as a goal
8. ✅ Stable page IDs, not URLs

---

## §4 — What ChatGPT Got Wrong (Rejected)

1. ❌ **Pub/Sub + Cloud Run edge collector** — Over-engineered. Simple API call sufficient.
2. ❌ **4 new collections** (triggerRules, frictionPatterns, helpSuggestions, suggestionSignals) — Only 1 needed. Rest already exists or is unnecessary.
3. ❌ **Separate event streaming infrastructure** — Context payload already sent with API calls.
4. ❌ **Topic extraction via NLP** — Canonica uses entity-based classification.
5. ❌ **helpSuggestions as stored entities** — Suggestions are derived at runtime.
6. ❌ **Auto-boost triggers** — Too aggressive. Manual priority + auto-disable only.
7. ❌ **2M events/day scenario** — Irrelevant for Canonica's B2B SaaS scale.
8. ❌ **Separate frictionPatterns collection** — Already exists as CanonicaFrictionSnapshot in platformSummary.

---

## §5 — What ChatGPT Missed (Canonica-Specific)

1. CanonicaContextPayload already provides page/feature/workflow context
2. CanonicaFrictionSnapshot already computes friction patterns nightly
3. Upstash Redis already deployed for rate limiting (reusable for cooldowns)
4. platformSummary pattern already proven for cached read-hot documents
5. Signal events collection already handles append-only friction signals
6. Entity-bound canonical answers provide accurate, governed content (vs free-text)
7. Knowledge graph can expand trigger coverage via entity relations
8. Guided workflows (answerType: 'procedure') provide step-by-step help for workflow_guide type

---

## §6 — Overall Assessment

**ChatGPT accuracy: ~55%**

| Category | Score | Notes |
|----------|-------|-------|
| Core concept | 90% | Predictive/proactive support is the right idea |
| Architecture | 20% | Pub/Sub + Cloud Run is wrong for Canonica's scale |
| Data model | 30% | 4 collections → 1 needed. Others already exist |
| UI/UX patterns | 85% | Three patterns + non-blocking + dismissible = correct |
| Cost analysis | 40% | Right concern, wrong solution |
| Learning loop | 70% | Concept correct, implementation over-engineered |
| Trigger engine | 75% | Good rule model. Wrong deployment (workers vs API route) |
| **Overall** | **~55%** | Good concepts, wrong implementation for Canonica |

**The primary value of the ChatGPT conversation:** Structured thinking about the 6 capabilities and clear separation of concerns. The capability decomposition (63-68) is useful as a design framework.

**The primary error:** Designing for 100K-user scale with event streaming when Canonica needs a lightweight rule evaluation API that leverages existing infrastructure.

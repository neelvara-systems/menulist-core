# Owner Support Assistant - Feature Documentation

> **Status:** SUMMARY-ONLY RUNTIME LIVE - optional Support Board prefill disabled by default; direct action, AI, feedback, and owner-analytics expansion deferred
> **Created:** 2026-06-07
> **Audience:** Product, Engineering, Firebase/Ops, Support
> **Feature Flag:** `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT` (`true` in `src/config/features.ts`)
> **Doctrine fit:** Helps owners decide what needs review without becoming a chatbot, helpdesk agent, or automatic publishing surface.

---

## What Is This

Owner Support Assistant is a private Answerlattice owner/staff review surface that answers a fixed set of operational support questions from six existing compact summaries.

## Answerlattice Owner Support Assistant Read-Only Runtime

The live runtime is intentionally smaller than the frozen target architecture:

- `/answerlattice/support-assistant` is visible only when the app flag is enabled and the current management user has `MANAGE_SUPPORT`.
- The Support Control navigation presents the route as `Daily Brief` and lists it first because the live runtime opens with today's read-only plan before follow-up questions.
- `GET /api/answerlattice/support-assistant/brief` reads six compact `platformSummary` documents through one bounded `getAll()` call, with same-workspace single-flight loading and a 60-second, 300-entry in-process cache.
- `POST /api/answerlattice/support-assistant/query` accepts one 3-500 character question, rate-limits before the Firestore-backed permission check, and classifies only attention, answer-risk, friction, readiness, intake, release, install, reply, cost, or unsupported intents.
- Each source is strictly parsed and reported as available, missing, invalid, or stale. Scheduled evidence older than 48 hours is stale; implausible future timestamps are invalid.
- Evidence, next actions, Daily Brief actions, launch verification, product-change controls, and prepared-card capability are filtered by the caller's current route permissions.
- The brief response can include `dailyBrief`, a read-only Daily Founder Brief that ranks the smallest useful actions for today from the same six compact summaries.
- Responses are deterministic, private/no-store, source-linked, and summary-only. There is no Gemini/provider call, transcript, assistant collection, write, listener, scheduler, or raw conversation/ticket read.
- The default UI opens governed review routes. `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT_ACTIONS` is independently disabled by default; when intentionally enabled, selected launch/release items can prefill the existing Support Board create form without writing a card.
- The UI cannot execute direct ticket/reply/governance mutations, submit assistant feedback, auto-create drafts/cards/notes, or answer owner period-analytics questions.

Direct action adapters, AI-assisted wording, feedback aggregate, owner analytics summary, bounded-detail, and nightly-summary documents remain deferred design contracts. The only implemented action preparation is the disabled-by-default, query-parameter-bounded Support Board form prefill; it has no action API and writes nothing until the owner uses the existing Create card flow.

The live runtime helps an owner ask:

- What needs review today?
- What should I fix first?
- What should I check before a release?
- Is widget setup safe?
- How do I keep AI costs bounded?
- Which answers are at risk?
- Why are users still asking this?
- What governed review screen should I open next?

The answer returns evidence and a safe route to the relevant governed workflow. It does not preview or execute owner actions, publish, approve, close, reply, change widget settings, or mutate canonical support truth.

---

## Strategy Decision

The long-term strategy is **review assistant over chat bot**.

| Decision | Contract |
| --- | --- |
| Product name | Navigation may say Daily Brief. Implementation/docs may say Owner Support Assistant / Support Assistant. Do not ship old product naming or a generic bot identity. |
| Route | Live owner route: `/answerlattice/support-assistant`. |
| Data model | Use compact `platformSummary` read models, existing daily aggregates, and existing governed records. Do not create assistant transcript, session, message, plan, feedback, attribution, analytics, or event collections. |
| AI posture | Deterministic context packets first. LLM formatting is assistive, rate-limited, logged, credit-aware, and never authoritative. |
| Action model | Typed action adapters may preview and execute owner-confirmed actions through existing write paths. No generic action queue or assistant action collection. |
| Cost posture | No realtime listener, no broad collection scan, no new scheduler, no dedicated analytics collection, and no background AI loop. |
| Mobile posture | Responsive Answerlattice dashboard route. It is not a MenuList mobile PWA shell feature. |

---

## Runtime Contract

| Area | Contract |
| --- | --- |
| Owner surface | Dedicated `/answerlattice/support-assistant` route behind the app flag and `MANAGE_SUPPORT`. |
| Access | Authenticated Answerlattice owner/admin/manager/staff access through the existing Answerlattice session scope and permission model. |
| Read model | Exactly six compact summaries: coverage, trust metrics, Support Board, friction snapshot, Knowledge Intake summary, and Activation proof. |
| Owner analytics | No dedicated owner-analytics summary is used by the live runtime. |
| Detail fetches | None. Questions remain summary-only. |
| Answer shape | Verdict, status, evidence, priority, suggested next action, source links, and optional Daily Founder Brief actions. |
| Status values | `healthy`, `needs_review`, `at_risk`, `insufficient_data`, `unsupported`. |
| Safe actions | Default: open governed review routes only. Flagged: prefill the existing Support Board create form for selected launch/release review items; no write on open. Deferred: typed preview/execute adapters for explicitly confirmed mutations. |
| Blocked actions | Direct approval, direct publishing, silent ticket closure/reply, widget setting changes, billing/account changes, secret display, cross-product mutations without a product adapter, and unsupported source claims. |
| Persistence | None. No transcript, answer record, assistant summary, feedback, or AI operation is written. |

---

## What This Is Not

- Not a public widget or customer-facing chat.
- Not a generic chatbot.
- Not an autonomous support agent.
- Not a helpdesk inbox, SLA queue, or ticket assignment layer.
- Not an approval bypass for canonical answers, FAQs, KB articles, or release notes.
- Not an unrestricted action executor for anything about the business.
- Not a new analytics warehouse.
- Not a new Firebase scheduler or background summarizer.

---

## Reuse First

The feature must reuse:

- Answerlattice dashboard shell and responsive layout.
- `getAnswerlatticeScopedSession()` and `canUseAnswerlatticeManagement()`.
- Existing summary-doc guardrails from `cost-read-model-guardrails`.
- Support Board cards, notes, status history, and summary docs.
- Existing support ticket status/message write paths where ticket actions are enabled.
- Existing Answerlattice audit logs for executed assistant action history when target records need explicit assistant attribution.
- Canonical answer, mutation proposal, signal event, product surface, coverage KPI, and trust metric DAL paths.
- Existing AI operation accounting for any LLM-backed request.
- Existing rate-limit, validation, audit, and secure logging patterns.

---

## Document Index

| Document | Purpose |
| --- | --- |
| `owner-support-assistant_spec.md` | Product behavior, non-goals, surfaces, and acceptance criteria. |
| `owner-support-assistant_architecture.md` | End-to-end storage, data flow, function logic, reuse, and ChatGPT alignment decisions. |
| `owner-support-assistant_owner-analytics.md` | Dashboard analytics and period-question read model for today, week, and month owner stats. |
| `owner-support-assistant_action-support.md` | Owner-confirmed action architecture for ticket status, replies, unanswered questions, and product-boundary-safe actions. |
| `owner-support-assistant_cases-and-actions.md` | Supported owner cases, prompts, actions, permissions, and unsupported boundaries. |
| `owner-support-assistant_impl.md` | Implementation plan, route/API/DAL reuse, and build sequence. |
| `owner-support-assistant_firebase.md` | Firestore, API, AI, analytics, scheduler, and cost contract. |
| `owner-support-assistant_mobile-support.md` | Mobile admission review and responsive dashboard behavior. |
| `owner-support-assistant_marketing.md` | Positioning and copy boundaries. |
| `owner-support-assistant_website.md` | Public website/content impact and inactive launch copy boundaries. |
| `owner-support-assistant_helpdoc.md` | Owner-facing usage guidance. |
| `owner-support-assistant_test-cases.md` | Verification cases before implementation and release. |
| `owner-support-assistant_freeze-review.md` | Final docs freeze cross-check against codebase truth and implementation guardrails. |
| `_archive/chatgpt-review.md` | Validation of the pasted ChatGPT conversation against repo truth. |

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-07 | Marked Owner Support Assistant docs frozen after final codebase-truth cross-check across storage, routes, permissions, tickets, Support Board, analytics, actions, and Firebase cost. |
| 2026-06-07 | Added cases/actions catalogue for handled prompts, supported actions, permission gates, and unsupported boundaries. |
| 2026-06-07 | Added action-support decision: owner-confirmed typed adapters over existing write paths, no generic action collection, no cross-product mutation from Answerlattice. |
| 2026-06-07 | Added owner analytics decision: dashboard and assistant period stats reuse existing daily aggregates plus compact `platformSummary` read models, with no dedicated analytics collection. |
| 2026-06-07 | Hardened into a frozen architecture: existing-system reuse, compact `platformSummary` assistant summary, no new assistant-owned collections, and no standalone scheduler. |
| 2026-06-07 | Added docs-first strategy for Owner Support Assistant after validating the ChatGPT proposal against Answerlattice doctrine, existing systems, and Firebase cost guardrails. |
| 2026-07-19 | Source-hardened the live six-summary runtime with strict source health, capability projection, route-permission filtering, and fail-closed browser response contracts. |

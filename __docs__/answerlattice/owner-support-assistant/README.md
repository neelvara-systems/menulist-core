# Owner Support Assistant - Feature Documentation

> **Status:** DOCS FROZEN - strategy validated against Answerlattice doctrine and current repo truth
> **Created:** 2026-06-07
> **Audience:** Product, Engineering, Firebase/Ops, Support
> **Feature Flag:** `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT` (planned, default `false`)
> **Doctrine fit:** Helps owners decide what needs review without becoming a chatbot, helpdesk agent, or automatic publishing surface.

---

## What Is This

Owner Support Assistant is a private Answerlattice owner/staff command surface that answers operational support questions from existing governed read models and bounded detail fetches.

It helps an owner ask:

- What needs review today?
- Which answers are at risk?
- Why are users still asking this?
- What action should I take next?
- Can you prepare the ticket reply or status change for my review?

The answer must return evidence, priority, and a safe next action. It can support owner-confirmed actions only through typed adapters over existing governed workflows. It must not silently publish, approve, close, reply, change widget settings, or mutate canonical support truth.

---

## Strategy Decision

The long-term strategy is **review assistant over chat bot**.

| Decision | Contract |
| --- | --- |
| Product name | Use Owner Support Assistant / Support Assistant. Do not ship old product naming or a generic bot identity. |
| Route | Planned owner route: `/answerlattice/support-assistant`. |
| Data model | Use compact `platformSummary` read models, existing daily aggregates, and existing governed records. Do not create assistant transcript, session, message, plan, feedback, attribution, analytics, or event collections. |
| AI posture | Deterministic context packets first. LLM formatting is assistive, rate-limited, logged, credit-aware, and never authoritative. |
| Action model | Typed action adapters may preview and execute owner-confirmed actions through existing write paths. No generic action queue or assistant action collection. |
| Cost posture | No realtime listener, no broad collection scan, no new scheduler, no dedicated analytics collection, and no background AI loop. |
| Mobile posture | Responsive Answerlattice dashboard route. It is not a MenuList mobile PWA shell feature. |

---

## Runtime Contract

| Area | Contract |
| --- | --- |
| Owner surface | Dedicated `/answerlattice/support-assistant` route plus contextual entry points from Dashboard, Support Board, Governance, and Weekly Digest, all behind the same flag and permissions. |
| Access | Authenticated Answerlattice owner/admin/manager/staff access through the existing Answerlattice session scope and permission model. |
| Read model | Starts from compact summaries: activation, context content, coverage, trust metrics, support board summary, friction summaries, and weekly digest summaries where available. |
| Owner analytics | Standard period questions and dashboard cards use `platformSummary/ownerSupportAnalyticsSummary_{tId}_{sId}` plus existing daily aggregate sources. |
| Detail fetches | Only run after an explicit owner query or action. Detail lists are capped and tenant/store scoped. |
| Answer shape | Verdict, status, evidence, priority, suggested next action, and source links. |
| Status values | `healthy`, `needs_review`, `at_risk`, `insufficient_data`, `partial`, `unsupported`. |
| Safe actions | Open review screen, create Support Board card/note, prepare draft, update ticket status, or send ticket reply only through typed adapters and explicit confirmation. |
| Blocked actions | Direct approval, direct publishing, silent ticket closure/reply, widget setting changes, billing/account changes, secret display, cross-product mutations without a product adapter, and unsupported source claims. |
| Persistence | No assistant transcript. Persist only explicit owner-created governed artifacts, aggregate assistant summary counters, or server-side AI operation logs. |

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

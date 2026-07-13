# Owner Support Assistant - Cases and Actions Catalogue

> **Status:** MIXED - summary questions live; mutations and expanded cases deferred
> **Created:** 2026-06-07
> **Purpose:** Define exactly which owner questions, review cases, and confirmed actions the assistant can handle.

---

## Final Rule

Owner Support Assistant handles support-governance questions and owner-confirmed actions only when they fit an existing Answerlattice workflow.

Every handled case must resolve to one of these outcomes:

- `answered_summary`
- `answered_with_bounded_detail`
- `preview_ready`
- `executed_after_confirmation`
- `opened_existing_workflow`
- `insufficient_data`
- `unsupported`
- `blocked_by_permission`

The assistant must not treat "anything about the business" as permission to mutate any record. A case is supported only when a registered capability, permission, source data, and existing product-owned write path exist.

---

## Case Matrix

| Case | Example owner ask | Source data | Cost class | Assistant output | Allowed action |
| --- | --- | --- | --- | --- | --- |
| Daily support health | "What needs review today?" | Compact summaries: Support Board, coverage, trust, friction, Knowledge Intake, owner analytics. | `summary_only` | Ranked brief with evidence and freshness. | Open review route or create Support Board card when owner confirms. |
| Period support stats | "What are today's stats?" / "How was last week?" | `ownerSupportAnalyticsSummary_{tId}_{sId}` and existing daily aggregates when needed. | `analytics_summary` | Period cards, comparison, missing-source note. | Open dashboard analytics card. |
| At-risk answers | "Which answers are at risk?" | Trust metrics, drift summaries, mutation proposals, signal summaries. | `summary_only` or `bounded_detail` | Risk list with source links. | Open Governance or prepare proposal preview. |
| Coverage gaps | "What product area is missing answers?" | Coverage summary, product surface summary, Knowledge Intake summary. | `summary_only` | Missing or weak areas with priority. | Open Knowledge Intake or create Support Board card. |
| Repeated issue explanation | "Why are users still asking about billing?" | Canonical answer summary, signal/friction summaries, bounded tickets/signals when explicit. | `bounded_detail` | Cause explanation with evidence and limits. | Create Support Board card, repeated reply source, or canonical proposal preview. |
| Unanswered-question review | "Show unanswered questions from last week." | Support Board `NEEDS_ANSWER`, signal/fallback summaries, owner analytics. | `analytics_summary` or `bounded_detail` | Review list grouped by topic/source. | Open Support Board, add note, create repeated reply source, or prepare proposal. |
| Support Board prioritization | "Which Support Board item should we handle first?" | Support Board summary and bounded cards. | `bounded_detail` | Priority ranking and reason. | Move card, add note, or create card through existing path. |
| Support Board plan | "Create a plan for these items." | Selected cards or bounded board context. | `ai_assisted` when wording is requested | Plan draft with owner-readable tasks. | Save as Support Board note/card after confirmation. |
| Ticket summary | "Summarize this ticket." | One scoped ticket record. | `bounded_detail` | Ticket summary, status, key customer issue, limits. | Open ticket or prepare status/reply preview. |
| Ticket status change | "Mark this ticket resolved." | One scoped ticket record and status list. | `bounded_detail` | Preview target ticket, current status, new status, notification and signal impact. | Execute through ticket status adapter after confirmation. |
| Ticket reply | "Reply to this ticket." | One scoped ticket record and bounded recent message context. | `ai_assisted` when drafting text | Reply draft with edit/review requirement. | Send through existing ticket message path after confirmation. |
| Repeated reply import | "Turn this repeated question and reply into a draft." | Owner-supplied reusable question and answer. | `bounded_detail` or `ai_assisted` | Review-ready repeated reply source preview. | Create Knowledge Intake `repeated_reply` source. |
| Canonical answer update | "Prepare an answer update for this topic." | Entity, canonical answer, signals, and proposal context. | `bounded_detail` or `ai_assisted` | Draft proposal, entity requirement, evidence list. | Create mutation proposal or Knowledge Intake canonical proposal preview. |
| FAQ or KB draft | "Prepare a help article for this gap." | Explicit owner intent plus source evidence. | `ai_assisted` | Draft source packet for review. | Create Knowledge Intake `product_note` source. |
| Feedback review | "What feedback needs action?" | Feedback review surface, friction summaries, Support Board summary. | `summary_only` or `bounded_detail` | Feedback themes with severity. | Open Feedback Review or create Support Board card. |
| Widget/account/billing/team request | "Change widget keys" / "Update billing" | Permission and route metadata only. | `summary_only` | Refusal or safe route if user has permission. | Open existing settings route only. |
| Cross-product business action | "Change my MenuList menu item price." | None inside Answerlattice assistant. | `summary_only` | `unsupported` with product-boundary reason. | No Answerlattice mutation. |

---

## Action Capability Catalogue

| Capability | Case families | Permission | Writes | Confirmation |
| --- | --- | --- | --- | --- |
| `answer_support_health` | Daily support health, at-risk answers, coverage gaps. | `canViewReadiness` or stronger route permission. | None. | No. |
| `answer_owner_stats` | Period support stats. | `canViewReadiness`. | None. | No. |
| `explain_topic_or_gap` | Repeated issue, unanswered-question review, feedback review. | `canManageSupport` or `canManageKnowledge` by source. | None. | No. |
| `open_review_route` | All source-backed cases. | Matching route permission. | None. | No. |
| `copy_summary` | All answer cases. | Same as current answer. | None. | No. |
| `create_support_board_card` | Coverage gaps, repeated issue, feedback review, unanswered-question review. | `canManageSupport`. | Existing Support Board card write. | Yes. |
| `add_support_board_note` | Support Board plan, repeated issue, ticket summary. | `canManageSupport`. | Existing Support Board note transaction. | Yes. |
| `update_support_board_card_status` | Support Board prioritization. | `canManageSupport`. | Existing Support Board status update. | Yes. |
| `preview_ticket_status` | Ticket status change. | `canManageSupport`. | None. | No. |
| `execute_ticket_status` | Ticket status change. | `canManageSupport`. | Existing ticket status/update path plus audit metadata when needed. | Yes. |
| `draft_ticket_reply` | Ticket reply. | `canManageSupport`. | AI operation log only when LLM drafting runs. | No send. |
| `send_ticket_reply` | Ticket reply. | `canManageSupport`. | Existing ticket message path plus existing notification side effect. | Yes. |
| `create_repeated_reply_source` | Repeated reply import, unanswered-question review. | `canManageKnowledge`. | Existing Knowledge Intake source/review items. | Yes. |
| `create_canonical_proposal` | Canonical answer update, repeated issue. | `canManageGovernance`. | Existing mutation proposal path. | Yes. |
| `create_product_note_source` | FAQ or KB draft. | `canManageKnowledge`. | Existing Knowledge Intake `product_note` path. | Yes. |

---

## Permission Matrix

| Permission | Cases unlocked | Actions unlocked |
| --- | --- | --- |
| `canViewReadiness` | Health brief, period stats, dashboard analytics. | Open readiness/dashboard routes, copy summary. |
| `canManageSupport` | Support Board, tickets, conversations, feedback, unanswered-question review. | Create/update Support Board records, preview/execute ticket status, draft/send ticket reply. |
| `canManageKnowledge` | Knowledge Intake, FAQ, KB, repeated reply, product-note drafts. | Create repeated reply source, create product-note source, open FAQ/KB review. |
| `canManageGovernance` | Canonical answer review, mutation proposals, drift review. | Create canonical proposal preview, open Governance review. |
| `canManageWidget` | Widget settings route only. | Open widget settings route. No assistant mutation. |
| `canManageBilling` | Billing route only. | Open billing route. No assistant mutation. |
| `canManageTeam` | Team route only. | Open team route. No assistant mutation. |

If permission is missing, return `blocked_by_permission` with a safe explanation and no target details beyond what the user is already allowed to see.

---

## Supported Prompt Examples

| Owner prompt | Expected handling |
| --- | --- |
| "What needs review today?" | Summary-only support health answer. |
| "What are today's support stats?" | Owner analytics summary period answer. |
| "Compare this week with last week." | Standard period comparison from owner analytics summary. |
| "Which answer is causing tickets?" | Risk/gap answer from summaries, with bounded detail when topic is explicit. |
| "Why are users still asking about billing?" | Bounded repeated-issue explanation with evidence and limits. |
| "Show unanswered questions from last week." | Review list from Support Board/signals/analytics within caps. |
| "Create a support board plan for these three items." | Draft plan and save preview. |
| "Summarize ticket ABC123." | One scoped ticket summary. |
| "Mark ticket ABC123 resolved." | Ticket status preview, then execute only after confirmation. |
| "Reply to ticket ABC123 saying we fixed it." | Reply draft, owner edit/review, then send only after confirmation. |
| "Turn this repeated question and answer into FAQ draft." | Knowledge Intake `repeated_reply` source preview. |
| "Prepare an answer update for the billing limit topic." | Canonical proposal preview when entity/evidence are present. |

---

## Unsupported Or Blocked Prompt Examples

| Owner prompt | Response |
| --- | --- |
| "Approve all pending answers." | `unsupported`; route to Governance review. |
| "Publish this article now." | `unsupported`; route to KB/FAQ review. |
| "Close every open ticket." | `unsupported`; bulk ticket execution is not a registered capability. |
| "Send replies to all unanswered tickets." | `unsupported`; bulk customer messaging is not allowed. |
| "Show all raw ticket messages." | `unsupported` or bounded summary only, depending on target and permission. |
| "Change widget API keys." | Route to widget settings when permitted; no assistant mutation. |
| "Change billing plan." | Route to billing when permitted; no assistant mutation. |
| "Add a team member." | Route to team settings when permitted; no assistant mutation. |
| "Change my MenuList menu price." | `unsupported` from Answerlattice assistant; product-owned adapter required. |
| "Tell me the secret key." | `unsupported`; secrets are never exposed. |

---

## Ambiguity Rules

| Situation | Assistant behavior |
| --- | --- |
| Missing target ticket/card/entity | Ask the owner to select a target or open the relevant route. No mutation. |
| Vague topic | Answer from summaries first; request a topic/entity before bounded detail reads. |
| Multiple possible records | Return a capped selection list with source links. No mutation. |
| Unsupported business metric | Return `unsupported` or `insufficient_data` unless a reviewed Answerlattice source exists. |
| High-risk action wording | Show stronger preview text and require explicit confirmation. |
| AI draft requested without source evidence | Refuse to invent content and route to source intake. |

---

## Data And Cost Rules Per Case

| Case type | Default reads | Writes |
| --- | --- | --- |
| Summary answer | Compact summary docs only. | None. |
| Period stats | `ownerSupportAnalyticsSummary_{tId}_{sId}`. | None. |
| Bounded detail answer | Current context packet plus capped source reads. | None. |
| AI draft | Bounded context plus one rate-limited AI operation. | AI operation log only before owner save/send. |
| Action preview | Existing context packet or one target read. | None. |
| Confirmed action | Existing target write path plus audit/summary metadata when needed. | No assistant action document. |
| Unsupported action | Classification only. | None. |

No case creates an assistant transcript, assistant action queue, assistant event collection, or raw unanswered-question collection.

---

## Output Shape By Case

| Case type | Required fields |
| --- | --- |
| Answer-only | Status, direct answer, evidence, limits, cost class. |
| Analytics | Period, metric values, comparison, freshness, source docs, missing-source note. |
| Review recommendation | Priority, reason, evidence, target route, confidence. |
| Action preview | Target, proposed change, risk, permission, cost, audit summary, confirmation requirement. |
| Executed action | Status, target id, audit ref when present, next route, owner-readable result. |
| Unsupported | Reason, safe route when one exists, no mutation. |

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-07 | Added supported cases and actions catalogue for Owner Support Assistant. |

# Owner Support Assistant - Product Specification

> **Status:** TARGET CONTRACT - read-only summary runtime live; expansion deferred
> **Created:** 2026-06-07
> **Feature Flag:** `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT` (live, `true`)
> **Primary Route:** `/answerlattice/support-assistant` (live in source)

---

The current runtime implements the dedicated management route, five-summary brief, deterministic summary-only query, governed route links, and responsive read-only client. Everything below involving bounded detail, AI wording, owner analytics, feedback, draft/card/note creation, or mutation preview/execute is retained only as deferred design material and is not a shipped claim.

## Problem

Answerlattice already has governed answer infrastructure: canonical answers, Support Board, Knowledge Intake, product surfaces, trust metrics, coverage summaries, friction signals, and weekly digest summaries.

Owners still need a low-effort way to ask operational questions across those systems without opening every dashboard section, reading raw tables, or guessing which review queue matters first.

The solution must not become a generic chat product. It must keep Answerlattice's doctrine intact: canonical answers first, human approval for authority changes, summary-first reads, and no autonomous publishing.

---

## Goals

- Let owners ask support-operations questions in plain language.
- Return evidence-backed answers with priority and safe next action.
- Reuse existing summaries and governed records before any new storage.
- Keep every answer tenant/store scoped.
- Keep Firebase reads bounded and owner-triggered.
- Keep LLM usage assistive, logged, rate-limited, credit-aware, and downstream of deterministic context packets.
- Route mutations through existing Governance, Support Board, FAQ, Knowledge Intake, and article review paths.
- Support owner-confirmed ticket and review actions through typed adapters over existing write paths.
- Make the surface usable on desktop and mobile dashboard layouts.

---

## Non-Goals

- No public customer assistant.
- No generic bot avatar or open-ended social chat UI.
- No automatic canonical answer approval.
- No automatic FAQ, KB article, changelog, or release-note publishing.
- No silent ticket closure or customer reply sending.
- No unrestricted business action execution from natural language.
- No new helpdesk connector.
- No new SLA/agent assignment system.
- No assistant transcript, session, message, plan, feedback, attribution, analytics, or event collection.
- No high-volume click/event analytics collection.
- No standalone scheduled Cloud Function.
- No billing, team role, secret, or widget-key mutation from assistant answers.

---

## Primary Users

| User | Need |
| --- | --- |
| Founder/owner | Know which support knowledge needs attention without becoming an operations analyst. |
| Support manager | Triage repeated questions, weak answers, and Support Board items from one place. |
| Staff member | Understand what can be reviewed or escalated within their permissions. |
| Platform operator | Verify tenant support health without cross-tenant leakage or expensive scans. |

---

## User Stories

1. As an owner, I want to ask what needs review today, so I can handle the highest-risk support gap first.
2. As an owner, I want to ask why a topic is still causing tickets, so I can see evidence before editing knowledge.
3. As a support manager, I want the assistant to prepare a Support Board plan, so the team can track work without creating a separate workflow.
4. As a support manager, I want the assistant to prepare a ticket status change or customer reply for confirmation, so routine support work can happen through the existing ticket workflow.
5. As a staff member, I want unsupported actions to be blocked clearly, so I do not think the system approved or published something it cannot publish.
6. As a platform operator, I want every assistant answer to be scoped and cost bounded, so tenant data and Firebase spend remain controlled.

---

## Assistant Modes

| Mode | Behavior | Persistence |
| --- | --- | --- |
| Current brief | Shows support health from compact summaries. | None beyond existing summary docs. |
| Owner question | Classifies the question, fetches the smallest relevant context packet, and returns an answer card. | None unless the owner saves an action. |
| Contextual explain | Opens from Support Board, Governance, Weekly Digest, or Dashboard with prefilled context. | None unless the owner saves an action. |
| Draft action | Prepares owner-reviewed drafts or Support Board plans through existing paths. | Existing governed artifacts only. |
| Confirmed action | Executes a typed action adapter after preview and explicit confirmation. | Existing target record, target history, audit log, and aggregate counters only. |

---

## Storage Requirements

| Data | Storage contract |
| --- | --- |
| Initial brief | Read compact `platformSummary/*_{tId}_{sId}` docs and existing dashboard summaries only. |
| Assistant summary | Store bounded aggregate counters in `platformSummary/ownerSupportAssistantSummary_{tId}_{sId}`. |
| Saved plan | Use existing `answerlattice_supportBoardCards` cards or notes with assistant metadata. |
| Answer update draft | Use existing `answerlattice_mutationProposals` or Knowledge Intake canonical proposal path. |
| Repeated Q&A draft | Use existing Knowledge Intake `repeated_reply` source type when the owner supplies a reusable question and answer. |
| Article/surface draft | Use existing Knowledge Intake `product_note` source type only when the owner explicitly asks for KB article or surface review output. |
| AI call | Use existing `answerlattice_aiOperations/{tId}/{sId}` operation logging and accounting. |
| Feedback | Aggregate counters only, plus operation metadata when an LLM operation exists. |
| Owner support analytics | Use `platformSummary/ownerSupportAnalyticsSummary_{tId}_{sId}` plus existing daily aggregate sources. |
| Executed action | Use the target record and existing audit log when assistant attribution is needed. |

The assistant must not own a separate source-of-truth data model. Existing Answerlattice records remain the authority.

---

## Supported Intents

The complete prompt/case/action catalogue lives in `owner-support-assistant_cases-and-actions.md`. This section lists the canonical intent families only.

| Intent | Example | Required response |
| --- | --- | --- |
| Health brief | "What needs review today?" | Ranked status from summaries, not raw scans. |
| At-risk answers | "Which answers are at risk?" | Evidence from trust, drift, proposal, and signal summaries. |
| Repeated issue | "Why are users still asking about refunds?" | Relevant canonical answers, surfaced gaps, tickets/signals if available, and suggested next review action. |
| Coverage gap | "What product area is missing answers?" | Coverage/trust/product-surface evidence and next review screen. |
| Support Board plan | "Create a plan for these support board items." | Draft plan that can be saved as existing Support Board card/note. |
| Ticket status action | "Mark this ticket resolved." | Preview target status change, require confirmation, then execute through existing ticket path. |
| Ticket reply action | "Reply to this ticket." | Draft/edit reply, require confirmation, then send through existing ticket message path. |
| Unanswered question review | "Show unanswered questions from last week." | Evidence from Support Board/signals/analytics, then route to Support Board, Knowledge Intake, or Governance. |
| Draft proposal | "Prepare an answer update." | Draft only, routed into Knowledge Intake/Governance review. |
| Unsupported mutation | "Approve all answers" | Refusal with reason and link to proper review screen. |
| Owner stats | "What are today's stats?" | Standard-period support analytics from the owner analytics summary, with source and freshness note. |
| Unsupported business metric | "How much revenue did we save today?" | `unsupported` or `insufficient_data` unless a reviewed Answerlattice source exists for that metric. |

---

## Answer Card Contract

Every answer must include:

| Field | Requirement |
| --- | --- |
| Status | One of `healthy`, `needs_review`, `at_risk`, `insufficient_data`, `partial`, `unsupported`. |
| Direct answer | Short owner-readable answer. |
| Evidence | Source cards with collection/source type, record label, freshness, and route link where safe. |
| Priority | Plain priority reason based on severity, user impact, freshness, and confidence. |
| Next action | One safe action. More actions can appear only when they are clearly distinct. |
| Limits | Any missing source or reason for insufficient data. |
| Cost class | Internal metadata: `summary_only`, `bounded_detail`, or `ai_assisted`. |

The UI must favor structured answer cards over chat bubbles.

---

## Safe Action Contract

Allowed actions:

- Open Support Board item.
- Create or update Support Board card/note through existing Support Board path.
- Open canonical answer review.
- Open mutation proposal review.
- Open FAQ or KB review.
- Prepare a draft for review.
- Preview and execute supported ticket status changes after confirmation.
- Draft and send a ticket reply only after owner review and confirmation.
- Copy the answer summary.
- Save a plan to an existing governed workflow.

Blocked actions:

- Approve or publish canonical answers directly.
- Publish FAQ, KB article, changelog, release note, or widget change directly.
- Close or reply to customer tickets silently.
- Modify widget keys, allowed origins, billing, team roles, or secrets.
- Mutate MenuList or any other product-owned state from an Answerlattice action adapter.
- Execute an action without a registered capability, permission check, idempotency key, and target write path.
- Claim source coverage that is not present.

---

## Acceptance Criteria

1. The route is hidden and unavailable unless `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT` is enabled.
2. The route uses the Answerlattice dashboard layout and existing access checks.
3. A disabled flag returns a calm unavailable state and performs no assistant reads.
4. A cold brief reads exactly five compact summaries and never opens a realtime listener.
5. The summary packet is cached for 60 seconds and the process cache is capped at 300 workspaces.
6. Owner questions are classified into attention, answer risk, friction, readiness, intake, or unsupported.
7. Query handling validates input with Zod and applies a workspace/user rate limit before the Firestore-backed permission check.
8. Answers are deterministic and make no LLM/provider call.
9. Questions perform no detail, raw ticket, conversation, signal-event, or search-history reads.
10. The UI displays evidence, limits, and governed route links.
11. Unsupported mutation requests are refused; no preview or execute endpoint exists.
12. No assistant transcript, session, message, plan, feedback, attribution, operation, analytics, or event record is created.
13. No assistant summary, owner analytics summary, scheduler task, or standalone Cloud Function is created.
14. Mobile viewport behavior works inside the responsive Answerlattice dashboard layout with 44px actions.

The action, AI, owner-analytics, feedback, and bounded-detail criteria described elsewhere in this doc set are deferred design gates, not acceptance criteria for the live read-only runtime.

---

## Freeze Readiness Gates

| Gate | Requirement |
| --- | --- |
| Docs | Full doc set, ChatGPT review archive, cost model, and test cases complete. |
| Deterministic contract | Summary brief, intent classification, unsupported responses, and evidence card rendering work without LLM. |
| Cost proof | Page load and each intent have documented read ceilings. |
| AI proof | LLM route is rate-limited, logged, credit-aware, and fails back to deterministic output. |
| Governance proof | Approval/publishing requests route to existing review paths only. |
| Action proof | Ticket, Support Board, Knowledge Intake, and Governance actions execute only through typed adapters and existing write paths. |
| Mobile proof | 375px and tablet dashboard layouts are usable without overflow or tiny actions. |

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-07 | Linked supported intent families to the dedicated cases/actions catalogue. |
| 2026-06-07 | Added owner-confirmed action support requirements for ticket status, replies, unanswered-question review, and cross-product boundaries. |
| 2026-06-07 | Added planned product specification from validated ChatGPT proposal and Answerlattice repo audit. |

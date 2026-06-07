# Owner Support Assistant - Product Specification

> **Status:** PLANNED
> **Created:** 2026-06-07
> **Feature Flag:** `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT` (planned, default `false`)
> **Primary Route:** `/answerlattice/support-assistant` (planned)

---

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
- Make the surface usable on desktop and mobile dashboard layouts.

---

## Non-Goals

- No public customer assistant.
- No generic bot avatar or open-ended social chat UI.
- No automatic canonical answer approval.
- No automatic FAQ, KB article, changelog, or release-note publishing.
- No automatic ticket closure or customer reply sending.
- No new helpdesk connector.
- No new SLA/agent assignment system.
- No assistant transcript, session, message, plan, feedback, attribution, or event collection.
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
4. As a staff member, I want unsupported actions to be blocked clearly, so I do not think the system approved or published something it cannot publish.
5. As a platform operator, I want every assistant answer to be scoped and cost bounded, so tenant data and Firebase spend remain controlled.

---

## Assistant Modes

| Mode | Behavior | Persistence |
| --- | --- | --- |
| Current brief | Shows support health from compact summaries. | None beyond existing summary docs. |
| Owner question | Classifies the question, fetches the smallest relevant context packet, and returns an answer card. | None unless the owner saves an action. |
| Contextual explain | Opens from Support Board, Governance, Weekly Digest, or Dashboard with prefilled context. | None unless the owner saves an action. |
| Draft action | Prepares owner-reviewed drafts or Support Board plans through existing paths. | Existing governed artifacts only. |

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

The assistant must not own a separate source-of-truth data model. Existing Answerlattice records remain the authority.

---

## Supported Intents

| Intent | Example | Required response |
| --- | --- | --- |
| Health brief | "What needs review today?" | Ranked status from summaries, not raw scans. |
| At-risk answers | "Which answers are at risk?" | Evidence from trust, drift, proposal, and signal summaries. |
| Repeated issue | "Why are users still asking about refunds?" | Relevant canonical answers, surfaced gaps, tickets/signals if available, and suggested next review action. |
| Coverage gap | "What product area is missing answers?" | Coverage/trust/product-surface evidence and next review screen. |
| Support Board plan | "Create a plan for these support board items." | Draft plan that can be saved as existing Support Board card/note. |
| Draft proposal | "Prepare an answer update." | Draft only, routed into Knowledge Intake/Governance review. |
| Unsupported mutation | "Approve all answers" | Refusal with reason and link to proper review screen. |

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
- Copy the answer summary.
- Save a plan to an existing governed workflow.

Blocked actions:

- Approve or publish canonical answers directly.
- Publish FAQ, KB article, changelog, release note, or widget change directly.
- Close or reply to customer tickets directly.
- Modify widget keys, allowed origins, billing, team roles, or secrets.
- Claim source coverage that is not present.

---

## Acceptance Criteria

1. The route is hidden and unavailable unless `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT` is enabled.
2. The route uses the Answerlattice dashboard layout and existing access checks.
3. A disabled flag returns a calm unavailable state and performs no assistant reads.
4. The first route load reads only compact summaries and never opens realtime listeners.
5. Owner questions are classified into known intents or marked unsupported.
6. Query handling validates input with Zod and applies workspace/user rate limits before expensive work.
7. Deterministic answers work without an LLM for summary-only and unsupported intents.
8. LLM-backed answers are assistive, credit-aware, recorded in `answerlattice_aiOperations`, and never receive secrets or raw unrestricted data.
9. Detail fetches are explicit, capped, and tenant/store scoped.
10. The UI displays evidence and limits for every answer.
11. Unsupported mutation requests are refused and routed to the proper review screen.
12. No assistant chat transcript, session, message, plan, feedback, attribution, or event collection is created.
13. No high-volume analytics collection is created.
14. No standalone Cloud Function scheduler is created.
15. Mobile viewport behavior works inside the responsive Answerlattice dashboard layout.

---

## Freeze Readiness Gates

| Gate | Requirement |
| --- | --- |
| Docs | Full doc set, ChatGPT review archive, cost model, and test cases complete. |
| Deterministic contract | Summary brief, intent classification, unsupported responses, and evidence card rendering work without LLM. |
| Cost proof | Page load and each intent have documented read ceilings. |
| AI proof | LLM route is rate-limited, logged, credit-aware, and fails back to deterministic output. |
| Governance proof | Approval/publishing requests route to existing review paths only. |
| Mobile proof | 375px and tablet dashboard layouts are usable without overflow or tiny actions. |

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-07 | Added planned product specification from validated ChatGPT proposal and Answerlattice repo audit. |

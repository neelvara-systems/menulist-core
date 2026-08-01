# Owner Support Assistant - Test Cases

> **Status:** LIVE READ-ONLY SOURCE TESTS PLUS DEFERRED EXPANSION CASES
> **Created:** 2026-06-07
> **Scope:** Verification checklist for runtime implementation

---

## Documentation Checks

| Case | Expected result |
| --- | --- |
| Doc set exists | README, architecture, owner analytics, action support, cases/actions, spec, impl, firebase, mobile, marketing, website, helpdoc, test cases, freeze review, and ChatGPT review archive exist. |
| Product naming check | Main docs use Answerlattice Owner Support Assistant / Support Assistant, not old runtime naming. |
| Cost check | Firebase doc rejects transcript/event collections and defines summary-first read budgets. |
| Governance check | Spec and impl block direct approve/publish/close/widget/billing mutations. |
| Website check | Public copy says read-only, summary-only, no transcript, no mutation, and no raw ticket/conversation read. |
| Owner analytics check | Owner stats plan uses existing daily aggregates plus `platformSummary`, not a dedicated analytics collection. |
| Action support check | Action docs require typed adapters, preview, confirmation, existing write paths, audit reuse, and no action collection. |
| Cases/actions check | Cases/actions doc lists handled prompts, supported actions, permission gates, and blocked prompts without promising unrestricted business actions. |
| Freeze check | Freeze review records codebase-truth evidence, final storage decisions, implementation guardrails, and runtime reopen triggers. |

---

## Feature Flag Tests

| Case | Expected result |
| --- | --- |
| Flag disabled, nav | Support Assistant nav item is hidden. |
| Flag disabled, route | Direct route shows unavailable or redirects without assistant reads. |
| Flag disabled, API | Query endpoint returns disabled response before Firestore reads. |
| Flag enabled | Route, nav, and API become available to permitted Answerlattice users. |
| Action flag disabled | No Prepare review card action is shown; governed route links remain available. |
| Action flag enabled | Only eligible launch/release actions can open the existing Support Board form with bounded prefill values; opening the form performs no write. |

---

## Auth and Permission Tests

| Case | Expected result |
| --- | --- |
| No session | Route/API redirects or returns auth error. |
| MenuList-only session | Answerlattice management access is denied. |
| Answerlattice staff with allowed role | Route opens within allowed permission scope. |
| Cross-tenant payload | Server ignores client-supplied tenant/store ids and uses scoped session. |
| Platform role | Platform access follows existing Answerlattice management permission rules. |

---

## Query Tests

| Case | Expected result |
| --- | --- |
| Empty question | Zod validation error, no context expansion. |
| Oversized question | Validation error, no summary read or provider call. |
| "What needs review today?" | Summary-only answer with evidence and safe next action. |
| "Which answers are at risk?" | Uses trust/coverage summaries and links to Governance. |
| "Where are users getting stuck?" | Uses the seven-day friction snapshot and links to governed review. |
| "Is support ready for more users?" | Uses coverage/resolution summaries and links to Dashboard. |
| "What knowledge is waiting for review?" | Uses Knowledge Intake summary and links to Knowledge Intake. |
| "Approve all answers" | `unsupported`; no write and no action-preview path. |
| "Reply to this ticket" | Read-only reply guidance from compact summaries and governed ticket/answer links; no ticket or conversation detail read and no write. |
| Topic-specific question outside the ten intents | `unsupported`; no detail read or provider call. |
| Missing summary docs | `insufficient_data` answer and source workflow link. |
| Invalid or stale summary doc | Source health identifies the affected summary and the answer is marked partial through limits. |
| Role cannot open an evidence route | Evidence and next action for that route are removed before the response reaches the browser. |
| Repeated query within 60 seconds | Reuses the in-process packet and reports zero Firestore reads for the warm request. |
| Concurrent cold requests for one workspace | Share one six-document packet load; joiners add zero Firestore reads and exact-promise cleanup preserves newer work. |

---

## Cost Tests

| Case | Expected result |
| --- | --- |
| Cold initial load | Exactly six compact summary reads, no list scan, listener, provider call, or write. |
| Warm summary query | Reuses the 60-second in-process packet and performs zero Firestore reads. |
| Unsupported query | Uses the same summary packet only and performs no detail fetch or provider call. |
| Any query | Creates no transcript, feedback, assistant summary, AI operation, action, or analytics record. A flagged form prefill still performs no write. |
| Concurrent workspaces | Cache key includes exact tenant and store scope; one workspace cannot reuse another packet. |
| Cache growth | Process cache remains capped at 300 workspace packets. |
| Browser response contract | Unknown or oversized brief/query responses fail closed with fixed local copy. |

---

## UI Tests

| Case | Expected result |
| --- | --- |
| Desktop load | Brief, question input, answer area, and evidence render without overlap. |
| Desktop long evidence | Evidence remains scannable and links to source routes. |
| 375px phone | No horizontal overflow; actions are at least 44px high. |
| Phone long question | Input does not cover answer. |
| Phone unsupported answer | Refusal and next review route are readable and tappable. |
| Slow network | Loading state does not duplicate submissions. |

---

## Security Tests

| Case | Expected result |
| --- | --- |
| Secret-like data in question | Raw question is not written to Firestore or an assistant transcript. |
| Widget key request | Assistant refuses to show or mutate keys. |
| Billing/team role request | Assistant returns unsupported and performs no mutation. |
| Raw ticket dump request | Assistant returns unsupported and never reads raw ticket records. |
| Action-like question | No action preview or execute endpoint is called; only summary evidence/routes can be returned. |
| Cross-product mutation | Answerlattice assistant returns unsupported and performs no cross-product read or write. |
| Sensitive logs | Server logs do not include raw tokens, secrets, or full private payloads. |

## Deferred Expansion Tests

Action preview/execute, ticket reply/status, idempotency, AI wording, feedback, owner analytics, and bounded-detail cases remain documented in the deferred architecture files. They are not current-runtime tests and must not be used as release evidence until those capabilities exist.

---

## Required Commands After Implementation

```bash
npx tsc --noEmit --incremental false
rg -n "\\bC[a]nonica\\b|\\bC[A]NONICA\\b|/[c]anonica\\b|/api/[c]anonica\\b|ENABLE_C[A]NONICA|Support C[o]pilot|support_[c]opilot" src __docs__/answerlattice/owner-support-assistant
rg -n "ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT|support-assistant|ownerSupportAssistant" src __docs__/answerlattice/owner-support-assistant
```

The live runtime requires the Answerlattice verifier and root TypeScript validation.

---

## Version History

| Date | Change |
| --- | --- |
| 2026-07-19 | Added ten-intent, strict response, stale/invalid source, and permission-filtered evidence cases. |
| 2026-06-07 | Added cases/actions catalogue verification to docs, query, and cost tests. |
| 2026-06-07 | Added action-support tests for preview, execute, ticket reply/status actions, idempotency, and cross-product boundary. |
| 2026-06-07 | Added planned test matrix for runtime implementation. |

# Owner Support Assistant - Test Cases

> **Status:** DOCS FROZEN
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
| Website check | Website doc does not claim live public capability before implementation. |
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
| Oversized question | Validation error or trimmed bounded request, no provider call. |
| "What needs review today?" | Summary-only answer with evidence and safe next action. |
| "Approve all answers" | `unsupported` answer with link to Governance review. |
| "Publish this article" | `unsupported` answer with proper review route, no publish write. |
| "Reply to this ticket" | Draft/preview only until owner confirms; no write from query endpoint. |
| "Mark this ticket resolved" | Action preview shows target and risk; no write until execute endpoint confirmation. |
| "Change my MenuList menu item price" | `unsupported` from Answerlattice unless a product-owned bridge exists. |
| "Turn this repeated reply into a FAQ draft" | Creates only a preview until owner confirms Knowledge Intake `repeated_reply` creation. |
| "Show unanswered questions from last week" | Uses Support Board, owner analytics, and bounded signal/friction sources only. |
| Topic-specific question | Bounded detail reads only after intent classification. |
| Missing summary docs | `insufficient_data` answer and source workflow link. |
| Provider failure | Deterministic fallback or clear partial answer. |

---

## Cost Tests

| Case | Expected result |
| --- | --- |
| Initial load | Summary reads only, no list scan, no listener, no AI call, no write. |
| Summary-only query | Reuses cached/session summary packet when possible. |
| Detail query | Uses capped DAL reads with documented limits. |
| Unsupported query | Performs no expensive detail fetch and no AI call. |
| LLM mode disabled | Deterministic answer returns without AI operation log. |
| LLM mode enabled | Rate limit applies, AI accounting runs, operation log is written. |
| Save plan | Uses existing Support Board write path only. |
| Prepare draft | Uses existing review/mutation path only. |
| Action preview | Reads current target only and performs 0 writes. |
| Action execute | Uses existing target write path plus audit/summary metadata; no action queue document. |
| Today stats | Uses owner analytics summary; no raw session/search/ticket scan by default. |
| Week/month stats | Uses standard period summaries. |
| Custom analytics range | Reads only capped daily aggregate docs and returns `insufficient_data` when outside cap. |

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
| Action confirmation | Duplicate taps do not duplicate status changes or replies because idempotency applies. |

---

## Security Tests

| Case | Expected result |
| --- | --- |
| Secret-like data in prompt | Prompt is not logged raw and is not sent as a privileged instruction. |
| Widget key request | Assistant refuses to show or mutate keys. |
| Billing/team role request | Assistant refuses and links to proper owner settings if allowed. |
| Raw ticket dump request | Assistant refuses or summarizes only bounded safe context. |
| Execute without confirmation | Mutation is rejected. |
| Execute with reused idempotency key | Duplicate mutation is rejected or returns the existing result without duplicating writes. |
| Cross-product mutation | Answerlattice endpoint refuses unless product-owned bridge verification passes. |
| Sensitive logs | Server logs do not include raw tokens, secrets, or full private payloads. |

---

## Required Commands After Implementation

```bash
npx tsc --noEmit --incremental false
rg -n "\\bC[a]nonica\\b|\\bC[A]NONICA\\b|/[c]anonica\\b|/api/[c]anonica\\b|ENABLE_C[A]NONICA|Support C[o]pilot|support_[c]opilot" src __docs__/answerlattice/owner-support-assistant
rg -n "ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT|support-assistant|ownerSupportAssistant" src __docs__/answerlattice/owner-support-assistant
```

Docs-only planning does not require TypeScript validation.

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-07 | Added cases/actions catalogue verification to docs, query, and cost tests. |
| 2026-06-07 | Added action-support tests for preview, execute, ticket reply/status actions, idempotency, and cross-product boundary. |
| 2026-06-07 | Added planned test matrix for runtime implementation. |

# Owner Support Assistant - Test Cases

> **Status:** PLANNED
> **Created:** 2026-06-07
> **Scope:** Verification checklist for runtime implementation

---

## Documentation Checks

| Case | Expected result |
| --- | --- |
| Doc set exists | README, architecture, spec, impl, firebase, mobile, marketing, website, helpdoc, test cases, and ChatGPT review archive exist. |
| Product naming check | Main docs use Answerlattice Owner Support Assistant / Support Assistant, not old runtime naming. |
| Cost check | Firebase doc rejects transcript/event collections and defines summary-first read budgets. |
| Governance check | Spec and impl block direct approve/publish/close/widget/billing mutations. |
| Website check | Website doc does not claim live public capability before implementation. |

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
| Secret-like data in prompt | Prompt is not logged raw and is not sent as a privileged instruction. |
| Widget key request | Assistant refuses to show or mutate keys. |
| Billing/team role request | Assistant refuses and links to proper owner settings if allowed. |
| Raw ticket dump request | Assistant refuses or summarizes only bounded safe context. |
| Sensitive logs | Server logs do not include raw tokens, secrets, or full private payloads. |

---

## Required Commands After Implementation

```bash
npx tsc --noEmit --incremental false
rg -n "CANONI[C]A|canoni[c]a|support[C]opilot|support_[c]opilot|/[c]anonica" src __docs__/answerlattice/owner-support-assistant
rg -n "ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT|support-assistant|ownerSupportAssistant" src __docs__/answerlattice/owner-support-assistant
```

Docs-only planning does not require TypeScript validation.

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-07 | Added planned test matrix for runtime implementation. |

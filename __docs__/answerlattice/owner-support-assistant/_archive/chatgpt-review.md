# Owner Support Assistant - ChatGPT Conversation Review

> **Status:** REVIEWED
> **Created:** 2026-06-07
> **Source:** `/Users/danny/.codex/attachments/6160e608-50a8-49c3-8504-d8e63a0fced3/pasted-text.txt`
> **Purpose:** Validate the pasted ChatGPT proposal against Answerlattice doctrine, repo truth, and Firebase cost priorities.

---

## Final Verdict

The conversation contains useful product direction, but it cannot be implemented literally.

Accepted direction:

- The surface should be a review/command layer, not a generic chat bot.
- Answers should show evidence, priority, and next action.
- Unsupported approval/publishing requests must be blocked.
- Contextual entry points from Dashboard, Support Board, Governance, and Weekly Digest are useful.
- Backend context contracts should come before any LLM work.
- Analytics should measure useful outcomes, not message volume.

Changed direction:

- Rename from Support Copilot to Owner Support Assistant / Support Assistant.
- Replace Canonica paths/constants with Answerlattice paths/constants.
- Default the feature flag off until route, cost, security, and mobile proof pass.
- Reuse existing summaries and governed records instead of adding assistant transcript/session/event collections.
- Treat LLM as assistive formatter over typed context packets, not the core data layer.

Rejected direction:

- Generic bot identity.
- `/canonica/*` route namespace.
- `ENABLE_CANONICA_SUPPORT_COPILOT`.
- Auto-approval, auto-publishing, ticket closure, or direct widget/billing/team mutations.
- High-volume assistant event warehouse.
- Standalone scheduler for assistant summaries.

---

## Proposal Validation Table

| ChatGPT proposal | Verdict | Repo-fit decision |
| --- | --- | --- |
| Name the feature Support Copilot | Modify | Use Owner Support Assistant / Support Assistant. Support Copilot stays an internal rejected proposal name. |
| Use global drawer, dedicated page, contextual cards, proactive dashboard cards | Partial | Dedicated route is canonical. Contextual/dashboard entry points can use the same flagged brief packet. Always-on global drawer is rejected for noise and read pressure. |
| Use Ask -> Evidence -> Priority -> Action | Accept | This becomes the answer card contract. |
| Show evidence/source links/data window | Accept | Required for every answer; return limits when evidence is missing. |
| Statuses: healthy, needs review, at risk, insufficient data, partial, unsupported | Accept | Adopt as normalized status values. |
| Refuse "Approve all answers" and "Publish this article" | Accept | Required unsupported-action guard. |
| Analytics events for every interaction | Modify | Do not create an assistant event collection. Use aggregate counters, AI operations for LLM calls, and governed artifacts for outcome proof. |
| Create sessions/plans/feedback/briefs/attributions collections | Reject | Persist only explicit governed records through existing collections and compact summary counters. |
| Build backend deterministic fetchers before UI and LLM | Accept | Implementation sequence starts with typed context packets and deterministic answers. |
| Feature flag `ENABLE_CANONICA_SUPPORT_COPILOT = true` | Reject | Planned flag is `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT`, default `false`. |
| Route `/canonica/copilot` | Reject | Planned route is `/answerlattice/support-assistant`. |
| APIs under `/api/canonica/support-copilot/*` | Reject | Planned endpoint is `/api/answerlattice/support-assistant/query`. |
| LLM after structured answers | Accept | LLM is assistive and downstream of context packets. |
| Owner-friendly mobile layout | Accept | Implement through Answerlattice responsive dashboard shell, not MenuList MobileShell. |

---

## Existing System Reuse Evidence

| Need | Existing repo source to reuse |
| --- | --- |
| Answerlattice route namespace | `src/constants/answerlattice/routes.ts` |
| Answerlattice navigation groups | `src/constants/answerlattice/navigations.ts` |
| Dashboard shell/access/mobile responsive layout | `src/components/answerlattice/AnswerlatticeDashboardLayout.tsx` |
| Scoped session and permissions | `src/lib/answerlattice/sessionScope.ts` |
| Feature flags | `src/config/features.ts` |
| Collection constants | `src/constants/answerlattice/database.ts` |
| Support Board reads/writes | `src/database/answerlattice/supportBoard.ts` |
| Canonical answers | `src/database/answerlattice/canonicalAnswers.ts` |
| Mutation proposals and approval workflow | `src/database/answerlattice/mutationProposals.ts` |
| Signals/friction | `src/database/answerlattice/signalEvents.ts` |
| Product surfaces/context summaries | `src/database/answerlattice/productSurfaces.ts` |
| Coverage KPI | `src/database/answerlattice/coverageKPI.ts` |
| Trust metrics | `src/database/answerlattice/trustMetrics.ts` |
| Request composition | `src/lib/answerlattice/documentComposer.ts` |
| AI cost logging | `src/lib/ai/accounting.ts`, `src/lib/ai/operationLog.ts` |
| Rate limits | `src/lib/rateLimit/` |

---

## Cross-Check Against Conversation Themes

| Theme from conversation | Covered in docs |
| --- | --- |
| It should not feel like a chatbot | README, spec, marketing. |
| Dedicated page and contextual entry points | README, spec, architecture, implementation. |
| Evidence-first UI | README, spec, implementation, test cases. |
| Priority and next action | README, spec, helpdoc, test cases. |
| Unsupported actions | Spec, implementation, helpdoc, test cases. |
| Analytics should avoid vanity metrics | Architecture, implementation, and Firebase docs. |
| Backend contracts first | Implementation sequence. |
| LLM last | Implementation and Firebase docs. |
| Mobile owner use | Mobile support doc and test cases. |
| Feature flag/type/API plan | Implementation doc with Answerlattice-correct names. |
| Firebase cost as priority | Firebase doc and acceptance criteria. |
| Existing system reuse | README, architecture, implementation, archive evidence table. |
| Route/API naming | README and implementation docs. |
| Public website impact | Website doc says no public copy until implementation. |

---

## Items Rejected Or Limited

| Item | Reason |
| --- | --- |
| Always-on global drawer | Higher UX and performance risk; dedicated route remains canonical. |
| Proactive cards everywhere | Can create noise and extra reads. Contextual entry points must reuse the same brief packet. |
| Dedicated assistant analytics collection | Cost and retention risk. |
| Assistant transcript history | Creates privacy, retention, and cost load without becoming the authority. |
| Standalone scheduler | Existing Answerlattice nightly scheduler is the right home for compact summaries. |
| Public website update | Runtime capability is not implemented yet. |
| Native helpdesk actions | Outside Answerlattice doctrine and support assistant scope. |

---

## Final Strategy

Build Owner Support Assistant as a cost-bounded Answerlattice owner review surface:

1. Summary-first brief.
2. Deterministic intent and unsupported-action guard.
3. Evidence-backed answer cards.
4. Safe next actions through existing governed workflows.
5. Assistive LLM wording after deterministic proof.
6. No assistant-owned transcript, session, message, plan, feedback, attribution, or event collections.

---

## Version History

| Date | Change |
| --- | --- |
| 2026-06-07 | Reviewed pasted ChatGPT conversation and mapped accepted, modified, rejected, and limited items into the doc set. |

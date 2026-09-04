# Founder Daily Brief Implementation

> **Current runtime:** Live, summary-only, read-only
> **Implemented hardening:** Strict qualification, true quiet state, and bounded owner-context handoffs
> **Code status:** Implemented and locally verified; hosted QA evidence remains a release gate

## File Plan

| Area | File |
| --- | --- |
| Feature flag | `src/config/features.ts` |
| Route constants | Existing Support Assistant route; no new route |
| Server logic | `src/lib/answerlattice/ownerSupportAssistant.ts` |
| API | Existing `/api/answerlattice/support-assistant/brief` response |
| UI | `src/components/templates/answerlattice/ownerSupportAssistant/AnswerlatticeOwnerSupportAssistant.tsx` |
| Navigation | Direct item in the Run Support sidebar section; Support Board and Ticket Inbox remain beside it, while infrequent tools remain under `All tools` |
| Dashboard entry | Dashboard and Activation top actions link to the existing Support Assistant route |
| Verifier | `scripts/verification/verify-answerlattice-runtime-truth.js` |
| Docs | `__docs__/answerlattice/founder-daily-brief/` |

No `ownerActionCenter` route, component tree, collection, summary document, or scheduler task is admitted.

## Current Data Flow

1. Support Assistant UI calls `/api/answerlattice/support-assistant/brief`.
2. API checks `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT`.
3. API checks `canManageSupport`.
4. Server loads the existing summary packet:
   - `platformSummary/coverage_{tId}_{sId}`
   - `platformSummary/trustMetrics_{tId}_{sId}`
   - `platformSummary/supportBoardSummary_{tId}_{sId}`
   - `platformSummary/frictionSnapshot_{tId}_{sId}`
   - `platformSummary/knowledgeIntakeSummary_{tId}_{sId}`
   - `platformSummary/activation_{tId}_{sId}`
5. Server builds existing metrics and the factual launch-verification projection.
6. Server builds ranked Founder Daily Brief actions when `ENABLE_ANSWERLATTICE_FOUNDER_DAILY_BRIEF` is enabled.
7. UI renders the first action as the primary decision, up to three secondary actions, launch verification, and explicit outcome/recontact evidence before the question box.
8. The friction action uses `topFrictionEntities[0]` from the already-admitted friction snapshot when present, names that product area, and links to the existing Friction governance tab.
9. Navigation labels the route as `Daily Brief` so the owner starts support control from the daily plan instead of a generic assistant label.
10. Server filters every action, evidence link, and prepared-card capability against the caller's current permission map.
11. Browser validates the complete brief shape, source health, action enums, route allowlist, capabilities, and read-model counters before rendering.

## Implemented Parity Closure

| Area | Current verified behavior |
| --- | --- |
| Healthy state | A complete current packet with no qualifying condition returns zero action cards and plain quiet-state copy. |
| Attention count | The displayed count is derived from the permission-filtered ranked action list. |
| Uncovered entities | Count-only uncovered coverage is not promoted to critical risk. |
| Support Board evidence | Existing `highPriorityCards` is admitted without a new query; resolved high-priority cards are removed upstream. |
| Trust evidence | Bounded `topFailingEntities[0]` may support wording but never establishes autonomous root cause. |
| Friction | An action requires `HIGH` evidence level or actual escalation evidence and preserves the selected entity in the handoff. |
| Coverage | Low coverage is admitted only with repair evidence and routes to Canonical Answers, not the test suite. |
| Knowledge Intake | Generic review backlog does not consume an action slot. |
| Release | `I shipped a change` remains a command; generic release reminders do not consume the ranked queue. |
| Cost | Cost guidance remains supporting text and does not consume an action slot. |
| Resolution | A cleared source condition disappears on the next admitted refresh without Daily Brief persistence. |

## Implemented Files

The hardening remains bounded to existing feature files plus one shared,
validation-only owner-context helper:

| File | Implemented change |
| --- | --- |
| `src/lib/answerlattice/ownerSupportAssistantContracts.ts` | Strictly admits `highPriorityCards` and bounded top-entity evidence while preserving the six-read response contract. |
| `src/lib/answerlattice/ownerSupportAssistant.ts` | Qualifies actions, returns a true quiet state, and routes friction/coverage work to the owning screen. |
| `src/lib/answerlattice/ownerDecisionNavigation.ts` | Validates and encodes bounded entity, answer, and release context without tenant/workspace data. |
| `src/components/templates/answerlattice/ownerSupportAssistant/AnswerlatticeOwnerSupportAssistant.tsx` | Renders the zero-action quiet state without a drawer, listener, or local task lifecycle. |
| `scripts/verification/verify-answerlattice-founder-daily-brief.js` | Locks qualification, quiet state, owner-context routing, and no-new-cost boundaries. |
| `scripts/verification/test-answerlattice-owner-support-assistant-contracts.ts` | Covers route-context validation, permissions, qualification, quiet state, and stale sources. |

The Daily Brief wiring itself needs no Functions, Firestore rules, indexes,
Storage rules, or Firebase deployment. The earlier Support Board summary
correction changed Functions source and still requires authenticated QA
deployment; its failed authentication evidence is documented in the Firebase
note.

## Placement Rules

- Run Support lists Daily Brief, Support Board, and Ticket Inbox as direct links. Conversations, Feedback, Weekly Digest, integrations, content operations, and Known Issues remain permission-filtered and available through All tools.
- Support-only users route to `Daily Brief` first when `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT` is enabled, then fall back to Support Board or Ticket Inbox only when the assistant is disabled.
- Dashboard and Launch Support Setup show a `Today's Brief` action that navigates to the existing route without loading any additional data.
- The Answerlattice base route enters Daily Brief only when the compact activation snapshot says launch proof is ready; all other states fail safely to Activation.
- `I shipped a change` opens the existing changelog create form through `?create=1`. The query is consumed once and cleared; release/drift behavior remains owned by the existing changelog save path.
- The public product page describes one daily support brief card. It does not present a separate generic Support Assistant card.

## Target Qualification and Ranking

Priority order:

1. Incomplete launch proof before activation.
2. Drifted approved answers.
3. High-priority Support Board work.
4. Needs-answer Support Board work.
5. Explicit failed-resolution or same-session recontact evidence.
6. High friction or actual escalation evidence.
7. Low coverage paired with repair evidence.

The server returns a maximum of four actions. Generic intake, release, maintenance, and cost reminders are excluded. The server must permission-filter candidates before applying the final cap.

Candidate IDs remain deterministic and stable for their source family. Upstream Support Board, mutation, drift, release, and friction systems own detailed deduplication. Daily Brief must not create another fingerprint store.

## Quiet-State Algorithm

1. Parse all six summary documents and source health.
2. Reject unavailable or malformed evidence.
3. Build only qualifying action candidates.
4. Permission-filter candidates.
5. Sort by explicit precedence.
6. Cap at four.
7. If the resulting list is empty and source health is complete, return the healthy quiet-state copy.
8. If the resulting list is empty and source health is incomplete, return evidence uncertainty rather than a green state.

`I shipped a change`, Refresh, and cost guidance remain commands or supporting text, not candidate actions.

## AI Boundary

The brief may mention AI-prepared work when existing systems have prepared drafts or tests, but it does not call an AI model. Existing systems remain responsible for OCR/transcription, draft generation, and answer tests.

## Failure Behavior

- Missing summaries produce an `insufficient_data` status and launch verification actions.
- Missing, invalid, stale, and future-dated source states remain explicit in `summaryHealth`; unavailable metrics remain `null`.
- Scheduled summaries older than 48 hours are stale. Timestamps more than five minutes in the future are invalid.
- A complete but empty six-source packet remains `insufficient_data`; document presence is not treated as useful evidence.
- Actions and evidence for routes outside the caller's permissions are removed server-side.
- Cache hit reports zero reads.
- Disabled daily brief omits the `dailyBrief` payload but leaves Support Assistant usable.
- Unknown, oversized, malformed, redirected, or failed browser responses produce fixed local retry states and never render raw server errors.
- API errors return generic private no-store errors.
- A complete and current packet with no qualifying conditions returns zero actions.
- Low-volume or informational evidence cannot be promoted to an action merely to avoid an empty page.
- A source condition that clears is absent after the next admitted refresh; Daily Brief stores no separate completion state.

## Product Boundary

Founder Daily Brief strengthens Answerlattice's governance layer by routing the owner toward approved answers, drift review, intake review, and mutation work. It does not expand into generic project management.

It also does not expand Answerlattice into ticket SLA ownership, task assignments, arbitrary owner tasks, platform incident management, or persistent action disposition.

# Founder Daily Brief Implementation

> **Current runtime:** Live, summary-only, read-only
> **Documented hardening:** Strict qualification and true quiet state
> **Code status:** Pending the separate Feature 1 implementation pass

## File Plan

| Area | File |
| --- | --- |
| Feature flag | `src/config/features.ts` |
| Route constants | Existing Support Assistant route; no new route |
| Server logic | `src/lib/answerlattice/ownerSupportAssistant.ts` |
| API | Existing `/api/answerlattice/support-assistant/brief` response |
| UI | `src/components/templates/answerlattice/ownerSupportAssistant/AnswerlatticeOwnerSupportAssistant.tsx` |
| Navigation | Support Control sidebar label: `Daily Brief`, first item before Support Board/Tickets |
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

## Current-to-Target Gap

| Area | Current behavior | Required code-level behavior |
| --- | --- | --- |
| Healthy state | Adds generic release-safety and cost-guard cards while action slots remain. | Return an empty action list and a plain quiet state. |
| Attention count | Adds selected raw counts and can disagree with the ranked action list. | Derive from qualified candidate actions. |
| Uncovered entities | Any uncovered entity makes answer risk `critical`. | Count-only uncovered coverage cannot be critical. |
| Support Board evidence | Reads `highPriorityCards` but does not project it into metrics/actions. | Admit bounded high-priority work without a new query. |
| Trust evidence | Trust summary contains bounded `topFailingEntities`, but Daily Brief uses aggregate counts only. | Use the top entry as evidence where admitted; do not infer root cause. |
| Friction | Any signal can create an action. | Require `HIGH` friction or actual escalation evidence. |
| Knowledge Intake | Any positive review count creates an action. | Surface only when launch or an upstream qualified support-truth problem requires it. |
| Release | Generic reminder is always eligible. | Keep `I shipped a change` as a command; rank release work only through actual drift/impact evidence. |
| Cost | Generic cost card is always eligible. | Keep cost note and bounded cost question; do not consume an action slot. |
| Resolution | Refresh naturally reflects source changes; no explicit contract. | Preserve source-derived clearing and add regression coverage. |

## Code-Level File Plan

The implementation pass is bounded to existing files:

| File | Required change |
| --- | --- |
| `src/lib/answerlattice/ownerSupportAssistantContracts.ts` | Add strict admission for `highPriorityCards` and any bounded top-entity fields projected into the response. Preserve the six-read source contract and existing route validation. |
| `src/lib/answerlattice/ownerSupportAssistant.ts` | Build candidate actions only from qualifying conditions; remove generic release/cost cards; derive attention count and quiet state from the qualified candidates. |
| `src/components/templates/answerlattice/ownerSupportAssistant/AnswerlatticeOwnerSupportAssistant.tsx` | Render the zero-action quiet state without adding a drawer, listener, or local task lifecycle. Keep commands outside the ranked list. |
| `scripts/verification/verify-answerlattice-founder-daily-brief.js` | Lock the quiet-state, no-new-collection, no-new-read, and source-derived-resolution boundaries. |
| `scripts/verification/test-answerlattice-owner-support-assistant-contracts.ts` | Add high-priority, qualification, permission, quiet-state, and stale-source cases. |

No Functions, Firestore rules, indexes, Storage rules, or Firebase deployment should be required unless the code pass discovers that a currently written summary field is malformed or absent. The current evidence does not justify those changes.

## Placement Rules

- Support Control navigation lists `Daily Brief` first, before Support Board, Ticket Inbox, Conversations, Feedback, Weekly Digest, and knowledge-management screens.
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

# Founder Daily Brief Implementation

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

## Data Flow

1. Support Assistant UI calls `/api/answerlattice/support-assistant/brief`.
2. API checks `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT`.
3. API checks `canManageSupport`.
4. Server loads the existing summary packet:
   - `platformSummary/coverage_{tId}_{sId}`
   - `platformSummary/trustMetrics_{tId}_{sId}`
   - `platformSummary/supportBoardSummary_{tId}_{sId}`
   - `platformSummary/frictionSnapshot_{tId}_{sId}`
   - `platformSummary/knowledgeIntakeSummary_{tId}_{sId}`
5. Server builds existing metrics.
6. Server builds ranked Founder Daily Brief actions when `ENABLE_ANSWERLATTICE_FOUNDER_DAILY_BRIEF` is enabled.
7. UI renders today's plan cards before the question box.
8. Navigation labels the route as `Daily Brief` so the owner starts support control from the daily plan instead of a generic assistant label.

## Placement Rules

- Support Control navigation lists `Daily Brief` first, before Support Board, Ticket Inbox, Conversations, Feedback, Weekly Digest, and knowledge-management screens.
- Support-only users route to `Daily Brief` first when `ENABLE_ANSWERLATTICE_OWNER_SUPPORT_ASSISTANT` is enabled, then fall back to Support Board or Ticket Inbox only when the assistant is disabled.
- Dashboard and Launch Support Setup show a `Today's Brief` action that navigates to the existing route without loading any additional data.
- The public product page describes one daily support brief card. It does not present a separate generic Support Assistant card.

## Ranking Rules

Priority order:

1. Critical entities or drifted approved answers.
2. Needs-answer Support Board cards.
3. Knowledge Intake review items.
4. Escalations or repeated support signals.
5. Low canonical coverage.
6. Insufficient data / launch verification.
7. Stable state / release test reminder.
8. Cost guard.

The server returns a maximum of six actions.

## AI Boundary

The brief may mention AI-prepared work when existing systems have prepared drafts or tests, but it does not call an AI model. Existing systems remain responsible for OCR/transcription, draft generation, and answer tests.

## Failure Behavior

- Missing summaries produce an `insufficient_data` status and launch verification actions.
- Cache hit reports zero reads.
- Disabled daily brief omits the `dailyBrief` payload but leaves Support Assistant usable.
- API errors return generic private no-store errors.

## Product Boundary

Founder Daily Brief strengthens Answerlattice's governance layer by routing the owner toward approved answers, drift review, intake review, and mutation work. It does not expand into generic project management.

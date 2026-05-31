# Answerlattice Support Board

> Status: Implemented
> Last updated: 2026-05-27
> Product area: Support Control
> Route: `/answerlattice/support-board`

## What This Is

Support Board is Answerlattice's private owner/staff workboard for support gaps.

It is not a generic notes app or project-management board. Cards are scoped to support work created by Answerlattice's loop:

- unresolved tickets
- missed or low-confidence support signals
- negative feedback
- stale-answer review work
- canonical-answer proposal follow-up
- product-surface gaps
- manual owner/staff support notes

The owner-facing promise is:

Every missed support question becomes visible work, every card can hold private notes, and every resolved card can improve approved support knowledge.

## Current Implementation

| Capability | Status | Evidence |
| --- | --- | --- |
| Support Board route | Implemented | `src/app/(answerlattice)/answerlattice/support-board/page.tsx` |
| Support Control sidebar item | Implemented | `src/constants/answerlattice/navigations.ts` |
| Feature flag | Implemented | `ENABLE_ANSWERLATTICE_SUPPORT_BOARD` in `src/config/features.ts` |
| Source sync flag | Implemented, off by default | `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SOURCE_SYNC` hides ticket/signal sync CTAs |
| Nightly sync flag | Implemented, off by default | `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SYNC` controls scheduled board preparation |
| Nightly summary read flag | Implemented, off by default | `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_NIGHTLY_SUMMARY` skips summary reads unless scheduler prep is enabled |
| Private board collection | Implemented | `answerlattice_supportBoardCards` |
| Tenant/store isolation | Implemented | Firestore rules require Answerlattice support-control permission |
| Manual cards | Implemented | `AnswerlatticeSupportBoard.tsx` |
| Bounded ticket sync | Implemented, gated | `useSupportBoard.ts` reads recent unresolved tickets and creates cards only when source sync is enabled |
| Bounded signal sync | Implemented, gated | `useSupportBoard.ts` reads recent actionable signals and creates cards only when source sync is enabled |
| Nightly signal-quality sync | Implemented, gated | `functions-answerlattice/src/answerlattice/supportBoardSync.ts` creates deduped cards for repeated misses, negative feedback, drift, and release impact only when enabled |
| Compact board summary | Implemented, gated | `platformSummary/supportBoardSummary_{tId}_{sId}` is written by nightly sync only when enabled |
| Private internal notes | Implemented | Embedded capped notes on board cards |
| Status history | Implemented | Top-level `status` plus capped `statuses[]` activity history |
| Answer proposal action | Implemented | Creates pending mutation proposal when card has a related entity |
| Auto-publish | Not allowed | Drafts/proposals still require human approval |

## Document Index

| Document | Purpose |
| --- | --- |
| `support-board_spec.md` | Product requirements and workflow |
| `support-board_impl.md` | Implementation map and code paths |
| `support-board_firebase.md` | Firestore model, rules, indexes, cost |
| `support-board_helpdoc.md` | Owner-facing help copy |
| `support-board_website.md` | Public-site claim guidance |
| `support-board_mobile-support.md` | Responsive/mobile assessment |
| `support-board_test-cases.md` | Validation checklist |

## Future Plan

This feature list is the Answerlattice support-work roadmap. Items must stay inside support knowledge infrastructure and must not turn Answerlattice into Trello, Notion, Jira, or a full helpdesk replacement.

| Priority | Feature | Decision |
| --- | --- | --- |
| P0 | Owner Support Board / Kanban | Implemented as Support Board |
| P0 | Private owner/staff notes on support objects | Implemented inside Support Board cards; direct per-object notes can be added later only when needed |
| P0 | Needs Answer queue | Implemented as board status |
| P0 | Ticket-to-answer conversion | Implemented as board card to governed mutation proposal when entity-bound |
| P0 | Status activity history | Implemented as capped `statuses[]` history |
| P1 | Weekly Support Review screen | Future: extend Weekly Digest with board summary |
| P1 | Release Impact Checklist | Future: connect releases to board cards and drift review |
| P1 | Saved replies from canonical answers | Future: ticket reply helper, no auto-send |
| P1 | Assignee + internal status | Partially implemented; assignee and board status exist |
| P1 | Support surface health view | Future: summary from surfaces, tickets, signals, and board cards |
| P2 | Customer issue timeline | Later |
| P2 | Lightweight SLA reminders | Later; avoid full helpdesk scope |
| P2 | Slack/email/Linear/GitHub integrations | Later; workflow integrations exist separately |
| P3 | Full project-management Kanban | Avoid |

## Product Boundary

Support Board cards and notes are internal only. They must never render in public help center, hosted help, widget responses, public API responses, or customer-facing docs.

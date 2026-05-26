# Canonica Support Board

> Status: Implemented
> Last updated: 2026-05-26
> Product area: Support Control
> Route: `/canonica/support-board`

## What This Is

Support Board is Canonica's private owner/staff workboard for support gaps.

It is not a generic notes app or project-management board. Cards are scoped to support work created by Canonica's loop:

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
| Support Board route | Implemented | `src/app/(canonica)/canonica/support-board/page.tsx` |
| Support Control sidebar item | Implemented | `src/constants/canonica/navigations.ts` |
| Feature flag | Implemented | `ENABLE_CANONICA_SUPPORT_BOARD` in `src/config/features.ts` |
| Private board collection | Implemented | `canonica_supportBoardCards` |
| Tenant/store isolation | Implemented | Firestore rules require Canonica support-control permission |
| Manual cards | Implemented | `CanonicaSupportBoard.tsx` |
| Bounded ticket sync | Implemented | `useSupportBoard.ts` reads recent unresolved tickets and creates cards |
| Bounded signal sync | Implemented | `useSupportBoard.ts` reads recent actionable signals and creates cards |
| Private internal notes | Implemented | Embedded capped notes on board cards |
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

This feature list is the Canonica support-work roadmap. Items must stay inside support knowledge infrastructure and must not turn Canonica into Trello, Notion, Jira, or a full helpdesk replacement.

| Priority | Feature | Decision |
| --- | --- | --- |
| P0 | Owner Support Board / Kanban | Implemented as Support Board |
| P0 | Private owner/staff notes on support objects | Implemented inside Support Board cards; direct per-object notes can be added later only when needed |
| P0 | Needs Answer queue | Implemented as board status |
| P0 | Ticket-to-answer conversion | Implemented as board card to governed mutation proposal when entity-bound |
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

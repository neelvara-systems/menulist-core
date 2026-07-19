# Answerlattice Support Board

> Status: Implemented and locally hardened
> Last updated: 2026-07-19
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
| Card ID boundary | Implemented | Answerlattice App Support Board Card ID Boundary validates card document IDs before update, status transaction, or note document refs are built |
| Bounded ticket sync | Implemented, gated | `useSupportBoard.ts` reads recent unresolved tickets and creates cards only when source sync is enabled |
| Bounded signal sync | Implemented, gated | `useSupportBoard.ts` reads recent actionable signals and creates cards only when source sync is enabled |
| Source customer display and redaction | Implemented | Ticket, feedback, and signal source cards preserve bounded requester/source metadata when present; authorized staff can irreversibly clear the copied identity/location fields while retaining the source card and source ID |
| Deterministic source-card identity | Implemented | Non-manual cards use a tenant/workspace/source hash and transaction so retries and concurrent syncs do not create duplicate cards |
| Nightly signal-quality sync | Implemented, gated | `functions-answerlattice/src/answerlattice/supportBoardSync.ts` creates deduped cards for repeated misses, negative feedback, drift, and release impact only when enabled |
| Compact board summary | Implemented | `answerlatticeSupportBoardSummaryOnWrite` maintains exact core counts after manual create/status/priority changes; disabled-by-default nightly sync optionally adds bounded status/source/surface breakdowns |
| Nightly diagnostics | Implemented | Support Board nightly success/failure logs use fixed codes, scope booleans, and source error name/code/status only |
| Nightly derived-card source-text boundary | Implemented | Support Board nightly derived-card source-text duplication boundary: recurring-miss and signal-cluster cards store source example counts and context only, not raw query/subject/reason/message text |
| Nightly entity ID boundary | Implemented | Answerlattice Functions signal-source entity ID boundary: nightly sync normalizes stored signal/search/drift entity IDs before entity document reads or derived-card grouping, skipping malformed values |
| App related entity ID boundary | Implemented | Answerlattice App Support Board Related Entity ID Boundary normalizes card `relatedEntityId` writes, ticket/signal source-card links, card proposal eligibility, and mutation proposal `relatedEntityIds` through the shared resolved-entity helper |
| Private internal notes | Implemented | Embedded capped notes on board cards |
| Status history | Implemented | Top-level `status` plus capped `statuses[]` activity history |
| Direct-write protection | Implemented | Dedicated and shared rules enforce allowed create/update fields, prepend-only notes/history, status/resolution coupling, one-way source redaction, governance-only proposal links, tenant isolation, and denied deletes |
| Answer proposal action | Implemented | Creates pending mutation proposal when card has a related entity |
| Auto-publish | Not allowed | Drafts/proposals still require human approval |

Answerlattice Functions signal-source entity ID boundary: nightly sync normalizes stored entity IDs from search-history misses, signal events, and drifted-answer scopes through the Functions entity ID boundary before entity document reads, derived-card grouping, release-impact matching, or related-entity assignment. Malformed or unresolved entity IDs are skipped so scheduler work continues without creating path-shaped entity refs.

Answerlattice App Support Board Card ID Boundary: app-side Support Board card detail updates, status moves, and note writes validate card document IDs through `src/lib/answerlattice/supportBoardCardIdBoundary.ts` before building Firestore refs. Malformed, reserved, empty, or path-shaped IDs fail through the existing fixed action copy before document access.

Answerlattice App Support Board Related Entity ID Boundary: app-side Support Board card create/update, ticket/signal source sync, card badges, proposal eligibility, and mutation proposal creation use the shared resolved-entity helper before treating `relatedEntityId` as a real entity. Malformed or unresolved IDs are skipped so Support Board cards do not persist placeholder entity links or create governance proposals from them.

## Document Index

| Document | Purpose |
| --- | --- |
| `support-board_spec.md` | Product requirements and workflow |
| `support-board_impl.md` | Implementation map and code paths |
| `support-board_firebase.md` | Firestore model, rules, indexes, cost |
| `support-board_marketing.md` | Commercial claims and evidence boundary |
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
| P1 | Founder review summary | Core counts are available to Founder Daily Brief; richer Weekly Digest use requires verification in that feature audit |
| P1 | Release Impact Checklist | Implemented only inside the disabled-by-default nightly preparation path |
| P1 | Saved replies from canonical answers | Future: ticket reply helper, no auto-send |
| P1 | Assignee + internal status | Partially implemented; assignee and board status exist |
| P1 | Support surface health view | Future: summary from surfaces, tickets, signals, and board cards |
| P2 | Customer issue timeline | Later |
| P2 | Lightweight SLA reminders | Later; avoid full helpdesk scope |
| P2 | Slack/email/Linear/GitHub integrations | Later; workflow integrations exist separately |
| P3 | Full project-management Kanban | Avoid |

## Product Boundary

Support Board cards and notes are internal only. They must never render in public help center, hosted help, widget responses, public API responses, or customer-facing docs.

Nightly sync diagnostics are operational only. They must not emit raw tenant/store IDs, source IDs, support text, provider/runtime exception text, or customer/requester metadata.

The board list is capped at the newest 120 cards and has no cursor pagination. UI column counts therefore describe the loaded board window; compact summary core counts describe the complete exact workspace scope. Source scans are also bounded and expose saturation/freshness state rather than claiming exhaustive coverage.

Cards are durable and client deletion remains denied. Copied customer/source details can be removed from an individual card, but full workspace erasure and deletion of the original source record belong to their owning retention workflows and are not claimed by this feature.

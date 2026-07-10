# Business Health Track

**Feature:** Owner Business Assistant / Business Health
**Status:** Read-only AI diagnostic runtime
**Last Updated:** July 9, 2026

## Purpose

Business Health gives the owner a compact AI health check for current store and selected-menu health. It can answer supported questions from existing summaries, but it does not perform actions.

Public positioning may call Business Health an AI health check or AI diagnostic layer. That wording does not change the runtime boundary: Business Health checks and explains; AI Menu Manager owns approved menu operations.

## Owner Business Health boundary source gate

`npm run verify:owner-business-health-boundary` verifies this read-only AI diagnostic runtime against the current route, API, desktop, mobile, and ledger source boundary. Business Health must not update menu/store/outlet/staff/public truth, create action drafts, render approval sheets, or bypass Menu Manager operation ownership.

## Active Capability

- Current health summary
- Priority checks
- Analytics period summaries
- Selected project/menu context
- Multi-location summary
- Source/freshness notes
- Feedback summaries
- Official customer source fix list derived from existing MenuList truth
- Suggested questions
- Grounded typed answers
- Safe handoff wording to AI Menu Manager or existing owner screens

## Explicit Non-Capability

Business Health must not:

- call an action route
- build action options
- store action drafts
- render confirmation sheets
- update menu/store/outlet/staff/public truth
- treat official customer source fix-list rows as action drafts
- publish to external platforms
- generate or apply images
- create rules or automation

AI Menu Manager owns these workflows.

## Read Path

1. Scheduler builds compact summary docs.
2. API routes load bounded docs for the selected store/project context.
3. Context packet builder creates a compact packet.
4. Browser/server cache returns valid packets before new Firebase reads.
5. UI renders read-only health, analytics, checks, questions, and answers.

## Answer Path

Typed answers use:

- validated request schema
- selected store/project context
- domain capability matrix
- compact context packet
- deterministic fallback when provider answering is disabled or unavailable
- source/freshness disclosure where available

Answers may return read-only artifacts only.

## Failure Behavior

If the read model is stale or missing, Business Health should show a calm stale/not-ready state. It should not enable owner actions as a workaround.

If provider-backed answering is unavailable, deterministic answer/fallback copy should remain available for supported facts.

If the owner asks to change something, Business Health should direct them to AI Menu Manager or explain that the operation must be handled there.

# Owner Business Assistant Spec

**Owner-Facing Name:** Business Health
**Internal Slug:** `owner-business-assistant`
**Product:** MenuList
**Status:** Implemented as read-only health and grounded answer surface
**Last Updated:** June 17, 2026

## Product Boundary

Business Health tells an owner what MenuList knows about the business. It does not perform owner actions.

The feature can:

- Show store health status, priority checks, source/freshness notes, analytics summaries, feedback patterns, and suggested questions.
- Answer supported owner questions from compact, server-validated context packets.
- Preserve selected store and selected project context for analytics and answers.
- Explain unsupported domains safely without inventing data.
- Point the owner to Menu Manager when the owner wants MenuList to do work.

The feature must not:

- Execute menu, store, outlet, staff, billing, publish, image, theme, external-platform, or public-truth mutations.
- Create action options, draft records, approval cards, action sheets, or action audit records.
- Become Business Health plus hidden operations.
- Read Business Health state as the source of truth for Menu Manager.
- Scan raw operational collections at answer time.

Owner-initiated operations belong to AI Menu Manager / Menu Manager:

owner intent -> proposal card -> approval when needed -> existing MenuList operation -> receipt.

## Owner Value

The owner should be able to open Business Health and understand:

- Whether the menu state looks stable.
- Which checks need attention.
- Which menu or store the facts apply to.
- Which analytics period is being discussed.
- What MenuList cannot answer yet.
- When a separate operation should be handled by Menu Manager.

The surface should reduce owner effort. It should not create new decisions, expose internal model details, or make owners manage action automation.

## Supported Domains

Supported read-only domains:

- business health summary
- analytics period summaries
- menu/project fact summaries from existing projections
- store profile and public-link summaries
- QR/share/screen visibility summaries where existing read models expose them
- feedback and review-like summaries where supported data exists
- multi-location summary
- source coverage, freshness, and unsupported-data disclosure

Unsupported or summary-only domains:

- billing and transactions beyond already exposed safe summaries
- users/staff management
- POS and third-party integrations unless current read-only data exists
- external web, weather, competitors, local events, and direct social/delivery platform publishing

Unsupported domains must produce owner-readable refusal or limitation copy. They must not trigger action execution.

## Core Requirements

1. **Read model first:** dashboard, mobile, and answer paths use compact read models or cache packets.
2. **No chat-time scans:** no broad Firestore scans of projects, analytics, feedback, or logs during ordinary answers.
3. **Scoped answers:** store and project context must be respected. Selected menu questions stay selected-menu scoped.
4. **Grounded artifacts:** answers return validated text and read-only artifacts only.
5. **Safe provider use:** provider-backed answering stays behind feature flags, SAFE_MODE, rate limits, request validation, AI accounting, and generic errors.
6. **Compact history:** optional owner threads are bounded and not token-streamed into Firestore.
7. **Mobile parity:** mobile opens inside `MobileShell` and stays read-only.
8. **No second truth:** Business Health never creates a second menu graph, analytics source, or action state.
9. **Action boundary:** Business Health may tell the owner that Menu Manager can prepare an update, but the operation must happen in Menu Manager.

## Owner-Facing Copy Rules

Use calm operational language:

- "No action needed"
- "Menu state is stable"
- "Check this"
- "Latest settled data"
- "Menu Manager can prepare that update"
- "I do not have verified data for that yet"

Avoid:

- "AI magic"
- model names, tokens, confidence percentages, raw prompts, or algorithm details
- claims that Business Health has completed an operation
- external-publishing claims without a supported adapter in Menu Manager

## Acceptance Criteria

- Opening Business Health performs bounded, cache-first reads.
- Asking a supported question returns a grounded answer with source/freshness context.
- Asking an unsupported question returns a safe limitation and optional read-only alternative.
- Priority checks do not render Open/Reviewed/Dismiss/action controls.
- There is no Business Health action API route, action registry, action hook, or action sheet.
- Business Health does not write live menu/store/outlet/staff/public truth.
- Mobile Business Health stays inside `MobileShell`.
- Platform monitoring reports answer quality, unsupported gaps, feedback, and cost without action usage metrics.

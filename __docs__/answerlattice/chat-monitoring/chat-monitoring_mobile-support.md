# Chat Monitoring - Mobile Support

> **Version:** 1.1.0
> **Last Updated:** 2026-07-12
> **Audience:** Mobile team, Product, Platform Ops

---

## Mobile Decision

Chat Monitoring is available from the MenuList mobile More tab for `PLATFORM` users under:

- More -> Answerlattice -> Chat Management
- More -> Answerlattice -> Chat Insights
- More -> Answerlattice -> Chat Backfill
- More -> Answerlattice -> Chat Weekly Digest
- More -> Answerlattice -> Chat ROI Calculator

These routes are operational product screens, not overview cards. They render the same Answerlattice/platform templates as desktop inside `MobilePlatformInternalScreen`, with mobile shell constraints for card width, tables, drawers, modals, forms, and segmented controls.

## Product Boundary

MenuList is only the first independent client integration for Answerlattice. The chat monitoring screens remain Answerlattice/platform operator workflows and must not hard-code MenuList-only product assumptions beyond the host route that exposes them in the MenuList More tab.

Runtime note: these screens resolve the signed-in Answerlattice product account and use the dedicated Answerlattice Firebase clients. Daily summaries and source-backed feedback/weekly projections run in `functions-answerlattice/`; no MenuList scheduler worker supplies this data.

## Mobile Scope

Mobile support is required for emergency and lightweight operator use:

- open and review conversation queues;
- inspect chat analytics and freshness;
- run a manual chat analytics backfill for a selected store;
- review weekly digest output;
- calculate or export ROI from chat analytics.

Desktop remains the best environment for long filtering sessions, exports, and rich internal notes, but mobile must remain readable, navigable, and action-capable.

## Backfill Mobile Contract

Chat Backfill must use the platform store summary selector. Operators select the target store from `platformSummary/storesSummary`; the screen then calls the same `backfillAggregates` callable used by desktop. It must not silently use the logged-in user's default store for a platform recovery action.

Firebase cost rules:

- store summary options are cached in `PlatformGlobalDataProvider`;
- no realtime listener is used for store selection;
- backfill only runs after explicit confirmation;
- the screen calls `backfillChatAnalytics` through the dedicated Answerlattice Functions client, never the legacy MenuList callable;
- the callable uses a scoped cooldown/lease, remains source-hash idempotent, and skips unchanged or empty days.

## UX Requirements

- Back from any chat screen returns to More -> Answerlattice, not More -> Platform.
- The desktop-tools icon may open the full desktop route for dense workflows.
- Tables may scroll horizontally inside their own container, but the mobile page must not overflow horizontally.
- Drawers and modals must use viewport width on narrow screens.
- Destructive or expensive actions require confirmation.
- Empty, loading, and error states must be explicit.

## Test Cases

1. Open More -> Answerlattice and confirm the Chat section contains all five chat routes.
2. Open Chat Management and confirm the conversation list renders inside the mobile shell.
3. Open Chat Insights and confirm analytics cards and freshness state render without horizontal page overflow.
4. Open Chat Backfill, select a store, set days, and confirm the action opens the backfill confirmation.
5. Confirm Chat Backfill refuses to run without a selected store.
6. Open Chat Weekly Digest and confirm empty/loading/digest states are usable on mobile.
7. Open Chat ROI Calculator and confirm inputs/actions remain reachable on mobile.
8. Confirm Back from each route returns to More -> Answerlattice.

## Version History

| Date | Version | Change |
| ---- | ------- | ------ |
| 2026-05-19 | 1.1.0 | Updated stale desktop-only decision; Answerlattice chat operator screens are now mobile-accessible through the MenuList More tab and use the real product templates. |
| 2026-03-02 | 1.0.0 | Initial assessment marked chat monitoring as desktop-only. |

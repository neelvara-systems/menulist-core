# Decision Intelligence (Decision Blocks) — Mobile Support

**Last Updated:** May 7, 2026
**Decision:** ✅ CUSTOMER-FACING + OWNER CONTROL SHEET

---

## Feature Admission Test

Decision Blocks are customer-facing recommendation cards displayed on the QR menu. Owner controls are intentionally small enough for mobile because owners may need to hide a block or pin an item from their phone.

| Gate | Decision | Reason |
| ---- | -------- | ------ |
| Frequency | Pass | Pins/toggles are occasional but operationally useful during promotions, sellouts, or seasonal menus. |
| Speed | Pass | The sheet supports quick toggle/pin changes and saves through the shared project DAL. |
| Touch | Pass | Mobile uses native sheet controls, switches, selects, and a sticky bottom Save action. |
| Value | Pass | Owners can correct what customers see without opening desktop. |

---

## How It Works

Decision Blocks (Popular Right Now, Quick Pick, Best Value) are:
- Computed server-side via Cloud Functions (`decisionBlocksScoring.ts`)
- Rendered on the customer-facing menu page (B2C View)
- Already mobile-responsive (part of client-menu mobile-first design)

## Owner Interaction

Owner interaction is optional. Decision Blocks work automatically, but owners can:

- Enable or disable each available block type.
- Pin a specific item to Popular, Quick Pick, or Best Value.
- Clear a pinned item and return the block to automatic selection.

Desktop UI: `DecisionBlocksSettingsModal.tsx`.

Mobile UI: `SmartRecommendationsSheet.tsx`.

Both surfaces write the same `project.menuSettings.decisionBlocks` shape through shared helpers in `decisionBlocks.shared.ts`. When owners edit menu items on mobile (availability, price), runtime filtering and the next scoring run adjust automatically.

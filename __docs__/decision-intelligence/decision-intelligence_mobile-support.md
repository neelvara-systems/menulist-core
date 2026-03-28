# Decision Intelligence (Decision Blocks) — Mobile Support

**Last Updated:** February 16, 2026
**Decision:** ✅ CUSTOMER-FACING — Renders on customer menu, not an owner-operational feature

---

## Feature Admission Test

Not applicable — Decision Blocks are CUSTOMER-facing smart recommendation cards displayed on the QR menu. They are not managed by the owner in the dashboard.

---

## How It Works

Decision Blocks (Popular Right Now, Quick Pick, Best Value) are:
- Computed server-side via Cloud Functions (`decisionBlocksScoring.ts`)
- Rendered on the customer-facing menu page (B2C View)
- Already mobile-responsive (part of client-menu mobile-first design)

## Owner Interaction

None required. Decision Blocks are automatic — they use menu data + analytics to surface recommendations. No owner dashboard UI exists for managing them. When owners edit menu items on mobile (availability, price), the scoring adjusts automatically.

# Continuous Menu Intelligence — Mobile Support

**Last verified:** July 16, 2026
**Decision:** No CMI mobile UI.

## Assessment

CMI is a private scheduler-owned read model. It has no direct mobile admission because owners do not need to inspect, explain, or control private confidence and priority metadata.

## Current mobile boundary

- No CMI route, tab, sheet, card, score, notification, or toggle.
- Mobile menu truth continues to come from the shared project/menu DAL.
- CMI never hides, shows, or reorders a mobile menu item.
- Expired or disabled CMI reads fail neutral in the DAL.
- Mobile Featured section controls belong to Decision Intelligence and write only `project.menuSettings.decisionBlocks` through the shared project mutation boundary.

Any future mobile use of CMI requires its own owner-value, privacy, cost, store-timezone, and public-truth review.

Historical mobile note is retained at `_archive/pre-2026-07-16/continuous-menu-intelligence_mobile-support.md`.

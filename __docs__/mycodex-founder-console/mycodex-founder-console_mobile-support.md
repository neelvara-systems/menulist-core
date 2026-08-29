# MyCodex Founder Console Mobile and Laptop Support

## Admission test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass | Operational health and requests may need daily review. |
| Speed | Pass | Home, refresh, and common drill-downs are one-tap actions. |
| Touch | Pass | Navigation and controls meet the 44px minimum; dense tools use contained horizontal scrolling or mobile variants. |
| Value | Pass | The founder needs incident and customer visibility away from a desk. |

## Phone contract

- Safe-area-aware header and bottom navigation.
- The header exposes a 44px light/dark toggle whose preference also governs embedded operational tools and the document reader.
- Today, Products, Systems, Documents, and Settings are reachable without a sidebar.
- Single-column information hierarchy.
- Ops Control Room, Scheduler Monitor, and Extraction Monitor use dedicated mobile components.
- Destructive actions retain explicit confirmation and product/target wording.
- Wide tables scroll inside their surface; the page itself does not create accidental horizontal overflow.

## Laptop contract

- Persistent left navigation with product grouping.
- The left navigation exposes a keyboard-accessible light/dark toggle without moving the platform-owner identity or sign-out controls.
- Full-width platform components and keyboard-visible focus.
- Current section and screen are always identifiable.
- Advanced tools are reachable without crowding the daily home.
- Data-heavy screens retain their native tables, filters, drawers, exports, and pagination.

## Tablet and narrow laptop

- Navigation collapses before content becomes unusable.
- Cards reflow without forced equal heights.
- Drawers and modals remain inside the viewport.
- No hover-only operation is required.

## PWA and offline

- The MyCodex manifest launches `/__mycodex/operations`, stays inside the
  `/__mycodex/` scope, and allows portrait and landscape use.
- The offline recovery shell is cached; private documentation and operational
  data require a live authenticated connection and are never cached by the PWA.
- Operational controls are disabled offline and never queued.
- Returning from background reuses the current shell but requires the existing APIs to confirm live state before mutations.

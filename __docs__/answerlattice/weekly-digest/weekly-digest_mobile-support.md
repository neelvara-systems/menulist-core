# Weekly Digest Mobile Support

## Admission

Weekly Digest is an Answerlattice dashboard surface, not a MenuList mobile-shell feature. It uses the responsive Answerlattice shell and the same route permission as desktop.

## Required Behavior

- Header controls wrap or stack on narrow screens.
- Refresh, prepare, export, and route actions maintain at least 44px height.
- Metric cards become a single-column stack.
- Long repeated questions wrap with `overflow-wrap` behavior.
- Source-completeness warnings remain fully readable.
- Recommendations and highlights do not rely on hover.
- Bottom padding respects the mobile navigation safe area.
- Loading, missing, partial, stale, and error states do not cause horizontal overflow.

## Mobile Risk Boundary

The digest does not expose raw support records, perform direct mutation, or add mobile-only data access. Review buttons open only routes admitted by the current permission map.

## Verification

Authenticated hosted-device and small-viewport browser proof remains external evidence. Local source verification covers responsive constraints, strict data admission, and touch-target sizing.


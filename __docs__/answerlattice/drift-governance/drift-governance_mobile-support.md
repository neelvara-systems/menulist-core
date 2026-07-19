# Drift Governance Mobile Support

## Admission assessment

Drift review is a valid responsive management workflow because a founder may need to inspect and clear a small urgent queue away from desktop. Bulk evidence comparison and large-scale answer editing remain more efficient on desktop.

## Current behavior

- The header and evaluation action wrap on narrow screens.
- Drifted answers render as a list instead of forcing a wide table.
- Review actions use at least 44px height.
- The review modal uses viewport-constrained width.
- Scope tags wrap instead of overflowing.
- Revalidation remains disabled until the explicit review checkbox is selected.

## Mobile boundary

No separate mobile DAL, query, listener, or write path exists. Responsive UI uses the same server-owned governance actions and exact workspace scope as desktop.

## Verification still required

Authenticated hosted narrow-width smoke must verify loading, failure, evaluation, detail review, checkbox admission, revalidation, and long drift-reason wrapping.

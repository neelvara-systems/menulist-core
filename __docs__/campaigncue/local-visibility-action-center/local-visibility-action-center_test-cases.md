# Local Visibility Action Center - Test Cases

## Deterministic Logic

1. Missing identity and destination sort before ready items.
2. Expired source input becomes `needs_review` at the supplied clock.
3. A trust-clear, current Google pack is ready.
4. A stale, unknown, blocked, or missing Google pack is not ready.
5. A ready video cannot satisfy approved-image readiness.
6. Rights-confirmed durable image/logo metadata can satisfy image readiness.
7. Multiple branches expose missing locality without cross-location inference.
8. Evidence, steps, references, and unlocks remain bounded.
9. Equal-priority actions have deterministic id ordering.

## Boundary Checks

- source contains no `fetch`, Firebase import, provider SDK, or `Date.now`
- UI states that external profiles are not inspected or updated
- no action claims ranking, reach, or external completion
- visibility pack creation still requires explicit owner action

## Regression Command

`npm run test:campaigncue-local-visibility`

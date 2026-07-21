# Autonomous Browser and Account-Changing Actions - Test Cases

> **Last Updated:** 2026-07-20

## Required Current Boundary

1. Procedure actions remain instructional labels.
2. Procedure schemas contain no executable action ID, arguments, code, callback, selector, or confirmation authority.
3. Host guidance never calls the selected target's `.click()`.
4. Host guidance contains no `eval` or `Function` constructor.
5. The SDK exposes no action registration or execution method.
6. The highlight uses `pointer-events: none`.
7. The only host movement is bounded `scrollIntoView`.
8. Expected events carry only a fixed semantic event name.
9. Event-gated steps advance only after the exact matching client-reported event for the active session and step.
10. Guidance messages from another origin or window source are ignored.
11. A completed guide is recorded as client-reported workflow evidence, not independent backend-state proof.
12. No action API, queue, provider tool, rule, index, secret, or public claim exists.
13. Account-changing actions and autonomous browser control remain prohibited.

## Future Separate Feature Tests

If a narrow reversible action is separately approved, test authentication, exact tenant/user/action scope, role/permission, state eligibility, confirmation, expiry, replay, concurrency, idempotency, result verification, timeout, cancellation, rollback, immutable audit, redaction, deletion, cross-tenant denial, and human recovery.

## Commands

- `npm run verify:answerlattice-autonomous-action-boundary`
- `npm run test:answerlattice-guided-resolution`

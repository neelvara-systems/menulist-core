# SignalDesk Source Policy Mobile Support

**Status:** Dashboard-only; policy mutation intentionally blocked
**Last verified:** July 21, 2026

## Decision

Source-policy administration fails the mobile admission test. It is infrequent, high-risk, dense, and requires careful review of terms, fields, contact authority, retention, and downstream effects.

## Mobile Behavior

- SignalDesk detects mobile/coarse-pointer clients and presents the read-only control posture.
- `create-source-policy`, `renew-source-policy`, provider runs, imports, source configuration, and scoped policy/kill-switch mutations are rejected by the server mobile-action class.
- Mobile may view bounded policy and control summaries when the role has section permission.
- Mobile may activate the separately governed `global-outbound` emergency pause with explicit mobile confirmation.
- Mobile cannot clear that pause or activate/clear source-provider-specific pauses.
- No raw provider payload or hidden contact data is exposed.

## Desktop Requirement

Use an authorized desktop session to create/renew policies, approve providers/budgets, run sources, or change source controls. The desktop UI and API still enforce the same permission, schema, policy, and idempotency rules.

## Verification

The runtime verifier locks `renew-source-policy` and `create-source-policy` to the `mutate_policy` mobile class. Existing mobile access/action boundary tests cover the read-only posture and emergency-pause exception.

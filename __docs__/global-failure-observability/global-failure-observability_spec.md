# Global Failure And Observability Specification

## Requirements

1. A render failure must show a stable fallback and must not recursively render
   the same failed subtree.
2. Retry and hard refresh are different actions and must be labeled honestly.
3. Normal recovery must not clear Cache Storage, local owner state, or PWA
   assets. Cache reset remains a separately justified diagnostic action.
4. UI must not claim a report was sent, queued, or actively investigated
   without an acknowledged monitoring event.
5. Error messages, stacks, secrets, emails, bearer credentials, raw routes,
   and arbitrary rejection payloads must not enter retained logs or monitoring
   context.
6. Public/generic 5xx responses use fixed copy. Typed domain errors may expose
   reviewed fixed messages and retry/credit metadata.
7. Empty, unavailable, and stale-last-known states remain distinct.
8. Monitoring failure must never block the owner/customer recovery screen.

## Non-goals

- No new monitoring vendor.
- No owner-facing diagnostics settings.
- No automatic mutation replay or data recovery claim.
- No claim that source logging proves alert delivery or production uptime.

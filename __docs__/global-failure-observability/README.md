# Global Failure And Observability

This boundary defines how MenuList and adjacent maintained products fail,
recover, log, and communicate unavailable state.

## Current contract

- Root, route, public-menu, layout, and Help Chat render failures have bounded
  error boundaries.
- Recovery actions say what they do: retry, refresh, open Help, prepare support
  details, or send a confirmed monitoring event.
- Ordinary crash recovery does not delete browser caches or claim saved truth
  was lost.
- Server/client monitoring removes default PII and sanitizes messages, routes,
  identifiers, context, and replay content.
- Generic API failures return fixed owner/customer-safe copy. Raw exception
  messages are allowed only from reviewed typed public-domain errors.
- A failed refresh preserves last-known truth where safe instead of rendering a
  confirmed empty/healthy state.

See the [specification](./global-failure-observability_spec.md),
[implementation](./global-failure-observability_impl.md), and
[verification](./global-failure-observability_verification.md).

# Global Failure And Observability Implementation

## Render boundaries

- `src/app/global-error.tsx` handles root crashes without depending on the
  normal layout.
- `src/app/error.tsx` handles owner/app route failures.
- `src/app/(global-pages)/error.tsx` exposes distinct Try Again, Refresh Page,
  and Help actions. It no longer deletes Cache Storage.
- `src/app/client/error.tsx` stays lightweight for customer-menu failures.
- `src/providers/layoutProvider.tsx` renders a standalone fallback rather than
  retrying the same failed child tree inside its fallback.

Each boundary logs a stable code plus bounded metadata, not raw message/stack.

## Diagnostic acknowledgement

`ErrorReportButton` calls the sanitized logger. A Sentry event ID produces
`Report sent`. Without an event ID it says automatic reporting is unavailable
and offers explicitly copied support details. It never labels console-only
logging as a sent report.

## Retained browser diagnostics

`clientConsoleBuffer.ts` and `localLogsTracker.ts` cap retained entries and
string sizes. Both redact structured and bare emails, secret assignments, and
bearer credentials. Global browser errors and unhandled rejections retain only
event type, reason type/presence, and sanitized error metadata.

## Monitoring

`instrumentation-client.ts`, `sentry.server.config.ts`, and
`sentry.edge.config.ts` use `sanitizeMonitoringEvent()`. Default PII is
disabled. Client replay masks all text and inputs and blocks media. Monitoring
is inactive without the matching configured DSN.

## Last-known truth

The Answerlattice ticket cache preserves its last-known list when a forced
refresh fails. Existing failure feedback still appears; a transient read
failure no longer becomes a confirmed empty inbox.

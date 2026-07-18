# Global Failure And Observability Website Boundary

Public website and customer routes should show fixed, calm failure copy and a
clear retry path. They must not expose stack traces, digests, environment
variables, Firebase/provider details, tenant/store identifiers, or monitoring
configuration.

No new website page is required. Legal/privacy copy must remain consistent with
the actual Sentry/replay configuration and consent boundary.

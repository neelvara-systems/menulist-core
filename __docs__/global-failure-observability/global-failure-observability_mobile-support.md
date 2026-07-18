# Global Failure And Observability Mobile Support

Mobile owner flows inherit route error boundaries, sanitized monitoring, and
the same fixed API error envelopes as desktop.

- Recovery controls wrap and remain at least 44 pixels.
- Offline/slow connectivity remains distinct from an application crash.
- Mobile failure states must not navigate outside `MobileShell` merely to show
  an error.
- A failed read must not silently replace last-known content with an empty
  success state.
- Internal error codes and monitoring details stay out of Toast copy.

No mobile-only logger, Firebase read, or settings toggle is added.

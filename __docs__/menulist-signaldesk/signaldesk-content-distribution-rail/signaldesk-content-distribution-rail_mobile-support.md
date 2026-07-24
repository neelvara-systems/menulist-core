# SignalDesk Content Distribution Rail - Mobile Support

**Status:** Desktop-only workflow; mobile mutation intentionally blocked
**Date:** June 24, 2026
**Last Updated:** July 22, 2026

## Decision

No dedicated mobile Content Distribution workspace is admitted in the current runtime.

Reason:

- Content source and asset creation are copy-heavy.
- Draft review needs context and proof checking.
- Scheduling and performance entry are internal growth-operator tasks.

## Current Contract

- The mobile workspace API supports the bounded SignalDesk dashboard only; it does not return Content Rail collections.
- All content source, proof, asset, draft, schedule, and performance mutations are blocked from mobile clients.
- The existing dashboard emergency-control contract may activate a global safety pause when authorized; it does not add a Content workspace or editing flow.
- Desktop route and action permissions remain authoritative. No mobile auto-publish, review shortcut, or separate data loader exists.
- Today may display the read-only journey on mobile, but setup-link copy and activation-proof preparation remain disabled with all other mobile SignalDesk mutations/navigation shortcuts.

Any future mobile content workflow needs a fresh admission review and must reuse the same server authority. It is not a pending promise in the current feature.

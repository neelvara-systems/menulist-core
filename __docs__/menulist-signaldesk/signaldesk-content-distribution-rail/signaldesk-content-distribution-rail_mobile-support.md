# SignalDesk Content Distribution Rail - Mobile Support

**Status:** Desktop-first internal tool
**Date:** June 24, 2026

## Decision

No dedicated mobile workflow is required for the first runtime pass.

Reason:

- Content source and asset creation are copy-heavy.
- Draft review needs context and proof checking.
- Scheduling and performance entry are internal growth-operator tasks.

## Mobile Allowance

Future mobile support may expose:

- Read-only draft/calendar state.
- Emergency `content-distribution` pause.
- Approve/reject buttons for already-reviewed drafts.

Do not add mobile auto-publish or broad editing controls without a separate mobile admission review.

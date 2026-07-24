# SignalDesk Draft Control - Mobile Support

**Status:** Implemented observe-only posture
**Last Updated:** July 21, 2026

## Decision

Mobile may inspect current SignalDesk workspace truth but may not create or
advance drafts. Dense evidence, exact copy, source rights, sender readiness, and
approval context require desktop review.

## Current Behavior

- The shared responsive workspace marks mobile/coarse-pointer use as observe-only.
- Draft, evidence, score, approval, export, send, template seed, and configuration actions are disabled.
- The protected action API independently rejects mobile mutation attempts.
- Draft and queue summaries can still be observed when the user's role may read that section.
- Emergency pause behavior belongs to the Foundation/Kill Switch feature and does not grant draft mutation.

## Acceptance

- No mobile gesture or direct action call can create a draft.
- Desktop admission mirrors current policy/evidence/template/sender/CTA readiness,
  but the server remains authoritative.
- Mobile does not expose contact identities or private authority bindings.
- No separate mobile data loader, route, or Firebase query is introduced.

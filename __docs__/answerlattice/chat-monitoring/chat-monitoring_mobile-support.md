# Conversation Monitoring Mobile Support

The existing responsive Answerlattice shell is the mobile implementation. Conversation review is useful for urgent triage, but dense analytics and bulk operations remain desktop-preferred.

## Requirements

- List cards and filters remain readable without horizontal page overflow.
- Conversation detail uses viewport-width drawers and wraps long questions, answers, tags, and IDs.
- Primary status, priority, note, and close actions use at least 44 px touch targets.
- Internal notes keep editor controls reachable above the mobile keyboard.
- Images never force content wider than the viewport.
- Batch actions require a clear selected-count state and confirmation where destructive.

No separate mobile collection, listener, or data-loading path is permitted. Mobile uses the same scoped DAL, rule, and message-cap contracts as desktop.

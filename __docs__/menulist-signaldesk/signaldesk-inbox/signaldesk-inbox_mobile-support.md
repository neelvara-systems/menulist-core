# SignalDesk Inbox - Mobile Support

**Status:** Initial mobile assessment
**Created:** June 23, 2026

## Decision

Mobile support is limited to read-only triage and emergency suppression review. Operators should not draft, send, or override complex classifications from mobile.

## Allowed Mobile Views

| View | Allowed actions |
| --- | --- |
| Inbox summary | See counts by interested, human review, complaint, unsubscribe, and overdue. |
| Conversation snapshot | Read latest message, classification, and next required action. |
| Emergency suppression | Admin can confirm suppression when a clear opt-out or complaint is visible. |

## Blocked Mobile Actions

- Compose or send replies.
- Approve follow-up.
- Run classifier evals.
- Bulk close conversations.
- Reopen suppressed targets.
- Edit templates or source policy.

## UX Requirements

- Large touch targets for emergency controls.
- Confirmation before suppression changes.
- No dense CRM-style timeline on mobile.
- No full message history by default.
- Clear labels: `Interested`, `Needs review`, `Do not contact`, `Complaint`.

## Mobile Acceptance

Mobile is acceptable when a growth admin can quickly see whether inbox safety is healthy and can stop outreach in clear emergency cases.

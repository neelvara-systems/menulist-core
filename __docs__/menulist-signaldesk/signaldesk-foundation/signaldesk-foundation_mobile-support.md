# SignalDesk Foundation - Mobile Support Assessment

**Status:** Runtime-backed assessment
**Created:** June 23, 2026
**Last Updated:** July 21, 2026
**Mobile relevance decision:** Partial

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Partial pass | Founder may need emergency status/pause while away. |
| Speed | Pass for emergency pause | Pause can be under 5 seconds. |
| Touch | Pass for emergency pause | Large buttons work. |
| Value | Pass for emergency pause | Useful away from desk during risk. |

## Mobile Allowed

- view foundation/control summary;
- view active kill switches;
- activate global outbound pause;
- acknowledge incident.

## Mobile Blocked

- edit roles;
- reveal contact;
- export or send;
- approve drafts;
- configure policies;
- activate a scoped/channel pause;
- deactivate high-severity kill switch without desktop review;
- view audit detail with raw metadata.

## Acceptance Criteria

- Mobile can activate global outbound pause with confirmation.
- Mobile cannot activate hidden scoped pauses through a crafted API request.
- Mobile writes audit event for pause.
- Mobile cannot reveal PII.
- Mobile cannot send/export.
- Mobile cannot edit team roles.
- Mobile uses the same fresh current-user and exact-membership admission as desktop/API access.
- A blocked, revoked, deactivated, deleted, or ambiguous member loses mobile summary/pause access on the next protected request.

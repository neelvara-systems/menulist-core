# SignalDesk Trust Partner Rail - Mobile Support

**Status:** Runtime implemented for internal testing; mobile remains review/pause only
**Created:** June 24, 2026

## Mobile Relevance Decision

**PARTIAL.**

Trust Partner Rail is mostly a desktop workflow. Mobile should support emergency review and pause actions only.

## Feature Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Partial pass | Founder may need to check partner deliverable status while away. |
| Speed | Partial pass | Pause/hold can be under five seconds; profile review and brief approval cannot. |
| Touch | Partial pass | Pause/hold works with large touch targets; scoring and brief editing are desktop work. |
| Value | Partial pass | Useful for emergency hold on risky partner content. |

## Mobile Allowed

- view partner/niche status summary;
- activate trust-partner scoped pause if implemented;
- mark a deal or deliverable as hold;
- view next due deliverables;
- view renewal recommendation summary.

## Mobile Not Allowed

- create partner profiles;
- approve paid deal terms;
- edit briefs;
- approve disclosure wording;
- enter metrics;
- approve renewal.

## UX Requirements

- Use existing SignalDesk mobile emergency-control model if a mobile surface is ever added.
- Touch targets must be at least 44px.
- Copy must be owner-readable and non-technical.
- Mobile must inherit auth, permissions, language, timezone, and app settings.
- Icons must use `react-icons/lu` only.

## Data Boundary

Mobile should read compact summaries only:

- partner name;
- status;
- due date;
- hold/pause state;
- recommendation;
- one-line risk reason.

No raw briefs, payment notes, contracts, or social payloads on mobile by default.

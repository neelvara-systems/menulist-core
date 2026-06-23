# SignalDesk Source Policy - Mobile Support Assessment

**Status:** Initial assessment
**Created:** June 23, 2026
**Mobile relevance decision:** No for editing; read-only status only.

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Fail | Source policy changes are rare and high-risk. |
| Speed | Fail | Requires careful review of terms, fields, and retention. |
| Touch | Fail | Dense policy forms are not mobile-safe. |
| Value | Partial | Founder may need to see if a source is paused. |

## Mobile Allowed

- view source policy status summary;
- view active source-provider pause;
- activate source-provider kill switch.

## Mobile Blocked

- create source policy;
- approve source policy;
- edit allowed fields;
- edit outreach eligibility;
- start source run;
- view raw source payload;
- change retention.

## Acceptance Criteria

- Mobile cannot approve a source.
- Mobile cannot start a source run.
- Mobile can pause a source provider.

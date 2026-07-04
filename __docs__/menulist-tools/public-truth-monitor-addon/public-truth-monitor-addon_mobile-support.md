# Public Truth Monitor Add-On - Mobile Support

**Last Updated:** July 4, 2026
**Status:** Runtime implemented

---

## Mobile Admission

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Pass for summary view | Owners may check monthly status from phone |
| Speed | Partial | Viewing status is quick; managing exports/settings is not |
| Touch | Pass for read-only cards | Summary rows and fix buttons can be large enough |
| Value | Pass for alerts/fix list | Owners may need to review urgent public gaps away from desk |

## Decision

Mobile V2 shows a compact Public truth history card inside Business Health in `MobileShell`.

Do not build mobile:

- entitlement settings
- report export designer
- agency report builder
- multi-location comparison table
- scheduler controls

Those belong on desktop/partner surfaces unless a later mobile gate says otherwise.

## Implemented Placement

- compact summary inside Business Health
- large Run check and Download actions
- no separate mobile route
- no separate mobile DAL

Keep:

- action buttons mapped to existing `MobileShell` targets when fix navigation is added
- do not open desktop owner routes through `window.location`
- do not create a separate mobile DAL

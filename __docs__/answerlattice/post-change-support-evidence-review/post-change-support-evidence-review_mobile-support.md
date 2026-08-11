# Post-Change Support Evidence Review Mobile Support

## Decision

**Partial: responsive parity, no separate mobile route or workflow.**

An owner can load, select, and inspect one comparison from the existing responsive Governance screen. A new MobileShell destination, mobile DAL, or mobile-only read path is not justified.

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Fails for dedicated placement | Founders review a completed change occasionally, not several times per day |
| Speed | Conditional | Low-volume comparisons are quick; the bounded server query may take longer than a compact summary read |
| Touch | Passes | One select and one action work with thumb input |
| Away-from-desk value | Conditional | A quick evidence check is useful, but release diagnosis is usually a desktop task |

Because frequency and speed do not justify a dedicated mobile feature, responsive parity is sufficient.

## Responsive Contract

- Controls stack below the `md` breakpoint.
- Select and buttons have a minimum 44 px height.
- Before/after evidence uses a one-column descriptions layout on narrow screens.
- Dates, labels, and limitations wrap without horizontal scrolling.
- Loading and error messages do not resize or overlap controls.
- No chart, graph canvas, pan, zoom, nested cards, or dense matrix.
- Authentication, permission, workspace scope, response validation, and Firebase cost are identical on desktop and mobile.

## Test Viewports

- 390 x 844 phone
- 768 x 1024 tablet
- 1280 x 800 desktop

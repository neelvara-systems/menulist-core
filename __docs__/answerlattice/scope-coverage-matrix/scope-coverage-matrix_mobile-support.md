# Scope Coverage Matrix Mobile Support

## Decision

**Partial: responsive parity, no separate mobile route or workflow.**

The owner can inspect coverage, edit a row, and run one check from the existing responsive Answer Tests screen. A new MobileShell screen, mobile DAL, or mobile-only data path is not justified.

## Admission Test

| Gate | Result | Reason |
| --- | --- | --- |
| Frequency | Fails for dedicated placement | Most founders review scope around setup and releases, not several times per day |
| Speed | Passes | The compact projection loads with the existing screen and one added compact read |
| Touch | Passes with list layout | One row can be reviewed or tested with 44 px actions |
| Away-from-desk value | Conditional | Useful for a quick check, but broad test maintenance is better on desktop |

Because the frequency gate fails, no new mobile navigation destination is added.

## Responsive Contract

- Desktop table becomes a stacked List below the `md` breakpoint.
- Every item shows all four context values; omitted values read `Not specified`.
- Text wraps and never overlaps status or actions.
- Actions are at least 44 px high/wide.
- No nested cards, canvas, pan, zoom, or horizontal graph.
- Editing reuses the current responsive Answer Test modal.
- Authentication, permission, workspace scope, response validation, and cost are identical on desktop and mobile.

## Test Viewports

- 390 x 844 phone
- 768 x 1024 tablet
- 1280 x 800 desktop

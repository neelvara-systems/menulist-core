# Hours Check - Mobile Support

**Status:** Mobile web supported through the public website route
**Last Updated:** July 4, 2026

---

## Mobile Relevance Decision

**Decision:** PARTIAL

V0 is a public website tool and must work on mobile browsers. It is not an owner PWA screen and does not mount inside `MobileShell`.

---

## Feature Admission Test

| Gate | Result | Notes |
| --- | --- | --- |
| Frequency | Partial | Owners may run it during setup, holidays, or seasonal changes, not daily |
| Speed | Partial | Short sources are quick, but entering full hours can take more than 5 seconds |
| Touch | Pass | Inputs, select controls, checkbox, and report actions work with thumb interaction |
| Value | Pass | Owners often manage hours from phone, especially around holidays or closures |

Result: public mobile web support is required. Owner-PWA V1 is implemented through existing MenuList store/project truth inside the shared Business Health/Public Truth owner card.

---

## V0 Mobile Requirements

- Form controls must remain readable at 390px width.
- Buttons must remain tappable.
- Report rows must not create horizontal overflow.
- Copy/download and optional follow-up must stay below the report.
- No separate mobile DAL or mobile API is needed.

---

## Boundary

| Behavior | V0 state |
| --- | --- |
| Google/maps inspection | Not implemented |
| Holiday calendar lookup | Not implemented |
| Report storage | Not implemented |
| Dedicated owner PWA card | Not implemented; shared Business Health module is implemented |
| Separate MobileShell route | Not implemented; shared Business Health route is used |

V1 owner check reuses existing MenuList truth and mobile shell patterns.

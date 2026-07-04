# Menu Readability Check - Mobile Support

**Status:** Implemented - V0 public route
**Last Updated:** July 4, 2026
**Audience:** Mobile and frontend maintainers

---

## Mobile Admission

V0 is mobile-relevant and approved for the public website because many SMB owners keep menu/service text in WhatsApp, notes, screenshots transcribed by staff, or social captions on their phone.

---

## V0 Mobile Behavior

| Requirement | Decision |
| --- | --- |
| Public mobile route | Supported through responsive website route |
| Owner mobile app surface | Not implemented in V0 |
| Touch targets | Must use existing website button/input styles with mobile breakpoints |
| File upload | Not implemented |
| Camera/OCR integration | Not implemented |
| Storage | None |

---

## Feature Admission Test

| Gate | Result | Notes |
| --- | --- | --- |
| Frequency | Pass | Owners may use it during setup, menu cleanup, or agency onboarding |
| Speed | Pass | Pasting text and selecting facts can complete quickly |
| Touch | Pass | Form fields and checkboxes are thumb-friendly with existing responsive styles |
| Value | Pass | Owners often hold source material on mobile |

---

## V1 Owner Mobile Direction

V1 owner readability appears inside existing mobile owner surfaces:

- Menu screen readiness
- Business Health screen
- Public Discovery or OBP readiness section

The mobile implementation must stay inside `MobileShell` and reuse existing owner context. Do not route owners out to desktop pages for basic readiness checks.

---

## Future Upload/OCR Direction

Upload, PDF parsing, image OCR, and AI cleanup are not part of V0.

If later approved:

- use an approved setup/manual-review or paid flow
- do not store files without consent and retention rules
- keep a pasted text fallback
- update the Firebase doc and verifier

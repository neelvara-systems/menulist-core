# QR Link Health Check - Mobile Support

**Status:** Implemented - V0 public route
**Last Updated:** July 1, 2026
**Audience:** Mobile and frontend maintainers

---

## Mobile Admission

V0 is mobile-relevant and approved for the public website because owners often scan QR codes from a phone and copy the opened link.

---

## V0 Mobile Behavior

| Requirement | Decision |
| --- | --- |
| Public mobile route | Supported through responsive website route |
| Owner mobile app surface | Not implemented in V0 |
| Touch targets | Must use existing website button/input styles with mobile breakpoints |
| QR image upload | Not implemented |
| Camera/scan integration | Not implemented |
| Storage | None |

---

## Mobile Copy Boundary

The mobile page should tell owners to scan the QR using their phone camera and paste the URL. It should not imply that MenuList camera-scans or decodes the QR in V0.

---

## Future V1 Owner Mobile Direction

If V1 owner QR/share readiness is added, it should appear inside existing mobile owner surfaces:

- Share tab
- Business Health screen
- Public Discovery or OBP readiness section

The mobile implementation must stay inside `MobileShell` and reuse existing owner context. Do not route owners out to desktop pages for basic QR/share readiness.

---

## Future Camera/QR Decode Direction

Camera scanning or QR image decoding is not part of V0.

If later approved:

- decode locally in the browser or app
- do not store images by default
- ask permission clearly
- keep a manual paste fallback
- update the Firebase doc and verifier

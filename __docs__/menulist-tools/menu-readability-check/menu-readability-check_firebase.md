# Menu Readability Check - Firebase Cost Tracking

**Status:** Implemented - V0 public browser-local checker
**Last Updated:** July 4, 2026
**Audience:** Founder, developers, cost auditors

---

## Summary

The implemented V0 report runs in the browser. It checks owner-pasted text locally and produces a deterministic report.

July 1 acknowledgement note: the optional follow-up still reuses `/api/public/contact`, but the browser now requires the route's source/status/help-topic acknowledgement before submitted state. This changes no report-time Firebase usage and adds no new write path.

| Resource | Current operations | Current cost |
| --- | --- | --- |
| Firestore reads | 0 during check/report | 0 |
| Firestore writes | 0 during check/report; 1 existing `landingPageEnquiries` write per accepted public follow-up request through `/api/public/contact` | Low, proportional to consented follow-up submits |
| Firestore deletes | 0 | 0 |
| Storage operations | 0 | 0 |
| Cloud Functions | 0 | 0 |
| External fetches | 0 | 0 |
| AI/provider calls | 0 | 0 |

No new API route, Firestore collection, Storage operation, Cloud Function, or AI/provider call is used by V0. The optional follow-up form reuses the existing public contact API and its existing Firestore write path.

---

## V0 Cost Boundary

V0 does not:

- upload files
- store uploaded files
- parse PDFs
- run OCR
- open or fetch public URLs
- crawl websites
- inspect external profiles
- call AI/search providers
- save report history

---

## Public Lead Storage

If the public tool captures contact details:

- require explicit consent
- use the existing `/api/public/contact` route
- cap the payload through the existing route contract
- do not store the report as a separate Menu Readability document
- do not store unverified external facts as MenuList truth

---

## V1 Cost Direction

Owner-side menu/service readability should reuse existing MenuList owner context and project/menu DAL.

Expected posture:

| Operation | Target |
| --- | --- |
| Reads | Existing store/project/menu context where available |
| Writes | 0 by default |
| History | V2 only |
| Storage | 0 |
| Provider calls | 0 |

---

## V2 Cost Direction

Recurring clarity reports, multi-location consistency, and agency exports require:

- paid entitlement
- capped report history
- owner-approved project/location set
- explicit retention rule
- cost notes before implementation

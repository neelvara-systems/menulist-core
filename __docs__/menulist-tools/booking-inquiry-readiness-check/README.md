# Booking Inquiry Readiness Check

> **Status:** V0 source-gated evidence; not current launch certification
> **Last Updated:** July 2, 2026
> **Local Source Gate:** `npm run verify:booking-inquiry-readiness-check`

---

## Purpose

Booking Inquiry Readiness Check is a public MenuList tool for checking whether a customer can clearly order, book, reserve, call, message, request a quote, or visit from the current public business source.

Runtime route: `/tools/booking-inquiry-readiness-check`

It is not a booking-provider integration, calendar checker, inbox reader, payment check, external source crawler, AI/search check, or platform updater.

## Version Ladder

| Version | Shape | Boundary |
| --- | --- | --- |
| V0 | Public browser-local self-report | No external fetch, no provider login, no calendar/payment check, no message sending, no report storage |
| V1 | Owner Business Health/Public Discovery module | Uses MenuList Official Business Page actions, contact, hours, location, and customer link truth |
| V2 | Paid recurring action-readiness add-on | Requires entitlement, scheduled checks, saved history, multi-location/agency reports, and cost controls |

## Source Files

| File | Role |
| --- | --- |
| `src/app/(website)/tools/booking-inquiry-readiness-check/page.tsx` | Website route and structured data |
| `src/components/website/bookingInquiryReadinessCheck/BookingInquiryReadinessCheckPage.tsx` | Browser-local form, report, copy/download, and consented contact handoff |
| `src/lib/public-truth-tools/bookingInquiryReadinessReport.ts` | Deterministic report builder |
| `src/lib/public-truth-tools/bookingInquiryReadinessTypes.ts` | Report and boundary types |
| `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts` | V1 owner readiness module |

## Hard Boundaries

- Action links, public URLs, phone numbers, WhatsApp links, email links, and customer links are format-checked only.
- Booking providers, calendars, inboxes, payment systems, and external pages are not opened or inspected.
- No message is sent.
- No report document is stored.
- Optional follow-up uses the existing bounded `/api/public/contact` route after explicit consent.

## Documentation

- [Spec](./booking-inquiry-readiness-check_spec.md)
- [Implementation](./booking-inquiry-readiness-check_impl.md)
- [Marketing](./booking-inquiry-readiness-check_marketing.md)
- [Website](./booking-inquiry-readiness-check_website.md)
- [Help Doc](./booking-inquiry-readiness-check_helpdoc.md)
- [Firebase](./booking-inquiry-readiness-check_firebase.md)
- [Mobile Support](./booking-inquiry-readiness-check_mobile-support.md)
- [Test Cases](./booking-inquiry-readiness-check_test-cases.md)
- [Validation](./booking-inquiry-readiness-check_validation.md)

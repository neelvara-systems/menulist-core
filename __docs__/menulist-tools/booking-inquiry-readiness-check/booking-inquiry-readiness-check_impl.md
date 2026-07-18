# Booking Inquiry Readiness Check - Implementation

**Status:** Implemented V0 route and V1 owner module; release still depends on current production-readiness gates
**Last Updated:** July 16, 2026
**Local Source Gate:** `npm run verify:booking-inquiry-readiness-check`

---

## Runtime Shape

Public route: `/tools/booking-inquiry-readiness-check`

Implementation files:

- `src/app/(website)/tools/booking-inquiry-readiness-check/page.tsx`
- `src/components/website/bookingInquiryReadinessCheck/BookingInquiryReadinessCheckPage.tsx`
- `src/lib/public-truth-tools/bookingInquiryReadinessReport.ts`
- `src/lib/public-truth-tools/bookingInquiryReadinessTypes.ts`
- `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts`

## Feature Flags

- `ENABLE_PUBLIC_TRUTH_TOOLS: true`
- `ENABLE_PUBLIC_TRUTH_BOOKING_INQUIRY_READINESS_CHECK: true`
- External adapters remain disabled unless separately approved.

## V0 Contract

V0 is browser-local and deterministic.

Report item type includes:

```ts
evidenceText: string
```

The report builder returns boundary flags:

- `externalUrlFetched: false`
- `bookingProviderChecked: false`
- `calendarChecked: false`
- `paymentChecked: false`
- `messageSent: false`
- `externalPlatformUpdated: false`
- `aiOrSearchChecked: false`
- `rankingPromise: false`

Do not add provider login, booking-provider checks, calendar checks, payment checks, message sending, external source crawling, AI/search provider calls, file upload, or report storage in V0.

`isValidActionDestination(...)` uses the shared `phoneValidation.ts` boundary before attempting public-URL validation. It accepts a public HTTPS URL, valid raw/formatted phone, valid `tel:`, valid `mailto:`, or `whatsapp://send?phone=...`. It rejects arbitrary letters in phone values and unknown WhatsApp scheme hosts/actions without producing a false valid preview.

## V1 Owner Module

The logged-in owner module is `booking_inquiry_readiness` inside `buildOwnerPublicTruthReadinessReport`.

It checks current MenuList truth only:

- Official Business Page action settings
- contact
- hours
- location
- customer link

It routes to existing fix targets:

- business profile actions
- working hours
- business location
- search discovery/customer link

Mobile maps to existing `MobileShell` targets and does not create a standalone mobile route.

## Contact Handoff

The optional handoff posts to the existing `/api/public/contact` route after explicit consent.

Request policy:

- `cache: 'no-store'`
- `credentials: 'same-origin'`
- `redirect: 'manual'`
- Turnstile when enabled
- accepted response must pass `isAcceptedMenulistPublicContactResponse(result, 'general')`

## No New Persistence

V0 adds no collection, no report route, no Storage object, no Cloud Function, no scheduler, and no provider call.

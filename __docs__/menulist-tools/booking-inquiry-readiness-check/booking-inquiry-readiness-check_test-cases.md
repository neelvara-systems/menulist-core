# Booking Inquiry Readiness Check - Test Cases

**Status:** Source-gated acceptance cases
**Last Updated:** July 16, 2026

---

## V0 Report Cases

| Case | Expected |
| --- | --- |
| Action text, valid destination, response, hours, fallback, confirmation, location, and customer link present | `ready` |
| Missing action destination | `missing_basics` |
| Action destination entered but malformed | `unclear` |
| Missing response or hours context | `unclear` |
| Missing current customer link | `unclear` or `missing_basics` depending other basics |
| External booking inspection row | Always `not_checked` |
| `tel:not-a-phone`, `mailto:not-an-email`, `whatsapp://evil?...`, or phone text containing letters | Destination is `unclear`, never `present` |
| Valid formatted phone, `tel:+...`, `mailto:owner@example.com`, or `whatsapp://send?phone=...` | Destination is `present` without opening the provider |
| Action says “book a slot during opening hours” with no response/confirmation selection or statement | Hours may be present; response and confirmation remain unclear |
| Primary action says “call to book” without an alternative/help cue or location statement | Fallback contact and location remain unclear |

## Boundary Cases

- No booking-provider calls.
- No calendar checks.
- No payment checks.
- No message sends.
- No external URL fetch.
- No report storage.
- No AI/search checks.
- No ranking, citation, conversion, or booking-completion promises.

## Handoff Cases

- Contact handoff requires valid name, work email, consent, and Turnstile token when enabled.
- Contact handoff posts only to `/api/public/contact`.
- Accepted acknowledgement must pass `isAcceptedMenulistPublicContactResponse(result, 'general')`.

## Source Gate

Run:

```bash
npm run verify:booking-inquiry-readiness-check
npm run verify:public-truth-tools
npm run test:public-truth-tools-runtime
```

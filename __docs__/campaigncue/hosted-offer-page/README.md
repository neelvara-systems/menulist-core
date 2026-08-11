# Hosted Offer Page And QR

**Status:** Implemented and locally verified; authenticated publish/browser evidence remains environment-dependent
**Owner surface:** Campaign Pack Output and public `/offer/{slug}` route
**Authority:** Current approved Campaign Pack, source-freshness receipt, Trust Center gate, and explicit owner publish action

Hosted Offer Page gives an owner one small mobile destination for a current campaign. It contains checked campaign copy, one approved customer action, locality when available, terms when present, and an owner-downloadable QR code. It is not a website builder and it does not publish to social or ad platforms.

## Documents

- [Specification](./hosted-offer-page_spec.md)
- [Implementation](./hosted-offer-page_impl.md)
- [Firebase and cost](./hosted-offer-page_firebase.md)
- [Mobile support](./hosted-offer-page_mobile-support.md)
- [Test cases](./hosted-offer-page_test-cases.md)
- [Owner help](./hosted-offer-page_helpdoc.md)
- [Marketing boundary](./hosted-offer-page_marketing.md)
- [Website boundary](./hosted-offer-page_website.md)
- [Validation](./hosted-offer-page_validation.md)

## Invariants

1. Publishing is explicit and owner-controlled.
2. Blocked, stale, expired, unapproved agency, or incomplete packs cannot publish.
3. Only bounded public-safe fields are copied into the public record.
4. One campaign owns at most one public record and one stable slug.
5. Public reads use server validation and a bounded cache; Firestore client reads stay denied.
6. Public visits create no Firestore analytics event or tracking cookie.
7. Pages expire, remain `noindex`, and can be unpublished.

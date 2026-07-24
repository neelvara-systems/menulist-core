# Maps Place Check - Documentation Hub

> **Feature:** MenuList Maps Place Check
> **Status:** Guarded backend and owner-confirmation contract complete; provider and collision-policy activation gates pending
> **Last Updated:** July 22, 2026

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./maps-place-check_spec.md) | Product boundary and owner value |
| Developers | [Implementation](./maps-place-check_impl.md) | Callable Function contract and parsing rules |
| Sales | [Marketing](./maps-place-check_marketing.md) | Internal positioning only |
| Website | [Website](./maps-place-check_website.md) | Public-copy decision |
| Help | [Help Doc](./maps-place-check_helpdoc.md) | Owner/admin help language |
| Firebase | [Firebase](./maps-place-check_firebase.md) | Reads, writes, provider calls, and cost posture |
| Mobile | [Mobile Support](./maps-place-check_mobile-support.md) | Mobile admission result |
| QA | [Test Cases](./maps-place-check_test-cases.md) | Acceptance and refusal matrix |
| Validation | [Validation](./maps-place-check_validation.md) | Implementation and verification evidence |

## What Is This?

Maps Place Check is an owner/admin-only MenuList verification tool that asks Gemini with Google Maps grounding to identify likely public place facts for a store.

It is not a CampaignCue feature, not a public chatbot, not a Google Business Profile writer, and not an automatic truth overwrite system.

## Product Boundary

This feature supports the MenuList Control Layer by comparing owner-provided store identity against Google Maps-grounded place evidence. The first runtime returns evidence for owner/admin review only:

- likely place title
- Google Maps URI
- Google Maps place ID when available
- proposed address/hours/service hints from the grounded answer
- source links that must be shown by any UI that displays generated content

The provider check itself never changes canonical MenuList truth. The existing
desktop, mobile, and embedded Official Page Google Maps-link save now mirrors an
internal owner-confirmed location binding in the same store write. A grounded
Place-ID candidate can be stored only through the separate explicit-confirmation
DAL path, and that binding can be replaced or removed without changing menu,
hours, address, availability, or other provider bindings.

## Runtime Summary

```txt
Authenticated owner/admin callable
  -> validates tenant/store access
  -> checks SAFE_MODE and rate limit
  -> calls existing genAIClient with googleMaps tool
  -> returns source-backed evidence
  -> writes nothing

Existing owner Google Maps-link save
  -> validates the public Google Maps URL
  -> writes the public directions link
  -> mirrors one internal owner-confirmed provider binding in the same store write

Explicit grounded-candidate confirmation
  -> accepts the Place ID and Maps URI only from one grounding source
  -> requires the same disabled feature flag as the provider check
  -> checks the current tenant, active owner store, deletion, and block state
  -> writes only the internal Google Maps binding
  -> remains excluded from public output and Platform Pull
```

Provider smoke alone does not release confirmation UI. The current embedded
binding has no server-authoritative cross-store provider-ID uniqueness claim, so
an approved fail-closed and reversible collision policy is also required before
activation. Removal remains available while disabled.

## Related Docs

- [Public Truth Tools](../public-truth-tools/README.md)
- [Control Layer strategy](../../control-layer-strategy/README.md)
- [Product universe SSOT](../../strategy/product-universe-ssot.md)

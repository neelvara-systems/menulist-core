# Maps Place Check - Documentation Hub

> **Feature:** MenuList Maps Place Check
> **Status:** Backend prototype, owner/admin only
> **Last Updated:** July 3, 2026

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

No canonical MenuList store field is changed by the prototype.

## Runtime Summary

```txt
Authenticated owner/admin callable
  -> validates tenant/store access
  -> checks SAFE_MODE and rate limit
  -> calls existing genAIClient with googleMaps tool
  -> returns source-backed evidence
  -> writes nothing
```

## Related Docs

- [Public Truth Tools](../public-truth-tools/README.md)
- [Control Layer strategy](../../control-layer-strategy/README.md)
- [Product universe SSOT](../../strategy/product-universe-ssot.md)

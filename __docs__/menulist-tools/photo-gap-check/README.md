# Photo Gap Check - Documentation Hub

> **Tool:** MenuList Photo / Visual Identity Gap Check
> **Status:** Implemented - V0 public browser-local checker
> **Last Updated:** July 1, 2026
> **Route:** `/tools/photo-gap-check`

---

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./photo-gap-check_spec.md) | Owner job, V0/V1/V2 ladder, scope and non-goals |
| Developers | [Implementation](./photo-gap-check_impl.md) | Runtime files, deterministic checks, boundaries |
| Sales | [Marketing](./photo-gap-check_marketing.md) | Internal positioning for SMB owner conversations |
| Website | [Website](./photo-gap-check_website.md) | Public page copy and SEO notes |
| Help | [Help Doc](./photo-gap-check_helpdoc.md) | Owner-facing help article draft |
| Firebase | [Firebase](./photo-gap-check_firebase.md) | Cost and storage boundary |
| Mobile | [Mobile Support](./photo-gap-check_mobile-support.md) | Mobile admission result |
| QA | [Test Cases](./photo-gap-check_test-cases.md) | Acceptance and regression matrix |
| Validation | [Validation](./photo-gap-check_validation.md) | Implementation parity record |

---

## Product Job

Help an SMB owner answer:

> Can customers recognize and trust this business from the visuals on its current public source?

The tool checks owner-selected visual facts. It does not upload images, analyze image quality, inspect Google, inspect Instagram, or fetch websites.

---

## Version Ladder

| Version | Product shape | Status |
| --- | --- | --- |
| V0 | Public free tool at `/tools/photo-gap-check` | Implemented |
| V1 | Logged-in MenuList owner check inside OBP readiness, Business Health, Public Discovery, or setup flow | Not implemented |
| V2 | Paid recurring visual coverage report with history, multi-location reports, and agency exports | Not implemented |

---

## V0 Boundary

V0 is browser-local and uses:

- owner-selected business type and visual facts
- optional current customer link text
- deterministic self-report checks
- explicit `evidenceText` on every report row
- copy/download report actions
- optional consented follow-up through the existing `/api/public/contact` route

V0 does not:

- upload files
- store images
- analyze image quality
- inspect Google, Instagram, websites, or social profiles
- fetch the current customer link
- call AI/search providers
- write a report
- mutate external platforms
- promise ranking, citations, visits, bookings, orders, or revenue

---

## Why This Helps SMB Owners

Customers need basic visual proof before they trust an unfamiliar business. A logo, cover image, storefront/team/work photo, and product/service photos are simple to understand and easy to fix inside MenuList.

The MenuList fix path is clear:

```txt
Select visible photo facts -> see gaps -> complete one current customer link
```

---

## Related Tool Family

Parent family: [Public Truth Tools](../public-truth-tools/README.md)

Current V0 tools:

- [Public Truth Check](../public-truth-check/README.md)
- [QR Link Health Check](../qr-link-health-check/README.md)
- [Menu Readability Check](../menu-readability-check/README.md)
- [WhatsApp Action Link Check](../whatsapp-action-link-check/README.md)
- [Hours Check](../hours-check/README.md)
- [Photo Gap Check](./README.md)

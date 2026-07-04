# Hours Check - Documentation Hub

> **Tool:** MenuList Hours & Holiday Hours Check
> **Status:** Implemented - V0 public browser-local checker
> **Last Updated:** July 4, 2026
> **Route:** `/tools/hours-check`

---

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./hours-check_spec.md) | Owner job, V0/V1/V2 ladder, scope and non-goals |
| Developers | [Implementation](./hours-check_impl.md) | Runtime files, deterministic checks, boundaries |
| Sales | [Marketing](./hours-check_marketing.md) | Internal positioning for SMB owner conversations |
| Website | [Website](./hours-check_website.md) | Public page copy and SEO notes |
| Help | [Help Doc](./hours-check_helpdoc.md) | Owner-facing help article draft |
| Firebase | [Firebase](./hours-check_firebase.md) | Cost and storage boundary |
| Mobile | [Mobile Support](./hours-check_mobile-support.md) | Mobile admission result |
| QA | [Test Cases](./hours-check_test-cases.md) | Acceptance and regression matrix |
| Validation | [Validation](./hours-check_validation.md) | Implementation parity record |

---

## Product Job

Help an SMB owner answer:

> Can customers clearly understand when this business is open now, on normal days, and on special days?

The tool checks owner-entered hours facts. It does not inspect Google, maps, websites, social profiles, holiday calendars, or AI/search answers.

---

## Version Ladder

| Version | Product shape | Status |
| --- | --- | --- |
| V0 | Public free tool at `/tools/hours-check` | Implemented |
| V1 | Logged-in MenuList owner check inside Business Health, Public Discovery, OBP readiness, or Share/QR readiness | Not implemented |
| V2 | Paid recurring hours monitor with history, multi-location reports, and agency exports | Not implemented |

---

## V0 Boundary

V0 is browser-local and uses:

- owner-entered business name, city, timezone, regular hours, closed days, special-hours status, special-hours note, customer link, and fallback contact checkbox
- deterministic text/URL checks
- explicit `evidenceText` on every report row
- copy/download report actions
- optional consented follow-up through the existing `/api/public/contact` route

V0 does not:

- fetch external URLs
- inspect Google, maps, websites, or social profiles
- call a holiday calendar API
- call AI/search providers
- write a report
- mutate external platforms
- promise ranking, citations, visits, orders, bookings, or revenue

---

## Why This Helps SMB Owners

Hours are one of the simplest public business facts, but they break trust quickly when they are unclear. Restaurants, salons, clinics, repair shops, local services, and retail counters all lose customer confidence when normal hours, closed days, holiday timing, or fallback contact paths are missing.

The MenuList fix path is clear:

```txt
Enter visible hours -> see gaps -> publish one current customer link
```

---

## Related Tool Family

Parent family: [Public Truth Tools](../public-truth-tools/README.md)

Current V0 tools:

- [Public Truth Check](../public-truth-check/README.md)
- [QR Link Health Check](../qr-link-health-check/README.md)
- [Menu Readability Check](../menu-readability-check/README.md)
- [WhatsApp Action Link Check](../whatsapp-action-link-check/README.md)
- [Hours Check](./README.md)

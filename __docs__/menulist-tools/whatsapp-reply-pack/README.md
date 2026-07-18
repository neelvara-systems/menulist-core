# WhatsApp Reply Pack - Documentation Hub

> **Tool:** WhatsApp Reply Pack
> **Family:** MenuList Public Truth Tools
> **Route:** `/tools/whatsapp-reply-pack`
> **Status:** Implemented V0 public browser-local tool and V1 owner readiness module
> **Last Updated:** July 16, 2026

---

## Purpose

WhatsApp Reply Pack turns owner-entered business facts into reusable WhatsApp replies for greetings, hours, menu or service questions, prices, orders, bookings, delivery or pickup, fallback replies, and the current customer link.

The tool exists because many small businesses answer the same customer questions from memory in WhatsApp. MenuList should not send messages or become a WhatsApp automation platform. It should help the owner prepare clearer replies and route the public truth back to one current customer link.

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./whatsapp-reply-pack_spec.md) | Product job, V0/V1/V2 scope, and boundaries |
| Developers | [Implementation](./whatsapp-reply-pack_impl.md) | File map, report contract, and source gate |
| Sales | [Marketing](./whatsapp-reply-pack_marketing.md) | Internal positioning and qualification language |
| Website | [Website](./whatsapp-reply-pack_website.md) | Public copy constraints and route language |
| Help | [Help Doc](./whatsapp-reply-pack_helpdoc.md) | Owner-facing help article |
| Firebase | [Firebase](./whatsapp-reply-pack_firebase.md) | Cost, storage, and consent posture |
| Mobile | [Mobile Support](./whatsapp-reply-pack_mobile-support.md) | Mobile admission review |
| QA | [Test Cases](./whatsapp-reply-pack_test-cases.md) | Acceptance and refusal tests |
| Validation | [Validation](./whatsapp-reply-pack_validation.md) | Current implementation evidence |

## Version Ladder

| Lane | Shape | Status |
| --- | --- | --- |
| V0 | Public free browser-local reply pack | Implemented |
| V1 | Logged-in owner readiness from current MenuList store/project truth | Implemented inside Business Health |
| V2 | Paid recurring/multi-location/agency reply governance | Documented only |

## Boundary

V0 uses owner-entered fields only. It does not send a WhatsApp message, call WhatsApp APIs, verify a phone number, open WhatsApp, fetch customer links, update external platforms, store reports, call AI/search providers, or promise ranking/citations.

The local phone shape permits digits and normal separators only and requires a likely international country code. A `wa.me` preview is generated only after that validation; text containing enough digits plus arbitrary letters is not normalized into a customer link.

The only network write is the optional consented follow-up through the existing `/api/public/contact` route.

## Source Gate

```bash
npm run verify:whatsapp-reply-pack
```

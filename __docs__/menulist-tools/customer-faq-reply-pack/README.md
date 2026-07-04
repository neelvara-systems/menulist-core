# Customer FAQ Reply Pack - Documentation Hub

> **Feature:** MenuList Customer FAQ Reply Pack
> **Route:** `/tools/customer-faq-reply-pack`
> **Status:** Implemented V0 public browser-local tool
> **Last Updated:** July 4, 2026

---

## Purpose

Customer FAQ Reply Pack turns owner-entered repeated customer questions and business facts into reusable FAQ and auto-reply text.

The tool exists because SMB owners answer the same questions by hand across WhatsApp, phone calls, staff replies, website pages, and social inboxes. MenuList should not become a chatbot, inbox, broadcast sender, or automation platform. It should help the owner prepare clear answers and route the fix path back to one current customer link.

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./customer-faq-reply-pack_spec.md) | Product job, V0/V1/V2 scope, and boundaries |
| Developers | [Implementation](./customer-faq-reply-pack_impl.md) | File map, report contract, and verification plan |
| Sales | [Marketing](./customer-faq-reply-pack_marketing.md) | Internal positioning and talk track |
| Website | [Website](./customer-faq-reply-pack_website.md) | Public copy constraints and route language |
| Help | [Help Doc](./customer-faq-reply-pack_helpdoc.md) | User-facing help article |
| Firebase | [Firebase](./customer-faq-reply-pack_firebase.md) | Cost, storage, and consent posture |
| Mobile | [Mobile Support](./customer-faq-reply-pack_mobile-support.md) | Mobile admission review |
| QA | [Test Cases](./customer-faq-reply-pack_test-cases.md) | Acceptance and refusal tests |
| Validation | [Validation](./customer-faq-reply-pack_validation.md) | Current implementation evidence |

## Version Ladder

| Lane | Shape | Status |
| --- | --- | --- |
| V0 | Public free browser-local FAQ/reply pack | Implemented |
| V1 | Logged-in owner FAQ/reply pack from current MenuList store/project truth | Documented only |
| V2 | Paid recurring/multi-location/agency FAQ consistency reporting | Documented only |

## Boundary

V0 uses owner-entered fields only. It does not read customer conversations, create a chatbot, configure automation, send messages, fetch links, store reports, generate AI answers, inspect AI/search systems, or update external platforms.

The only network write is the optional consented follow-up through the existing `/api/public/contact` route.

## Source Gate

```bash
npm run verify:customer-faq-reply-pack
```

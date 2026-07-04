# Business Facts Copy Pack - Documentation Hub

> **Feature:** MenuList Business Facts Copy Pack
> **Route:** `/tools/business-facts-copy-pack`
> **Status:** Implemented V0 public browser-local tool and V1 owner readiness module
> **Last Updated:** July 4, 2026

---

## Purpose

Business Facts Copy Pack turns owner-entered business facts into reusable customer-facing copy blocks for public profiles, social bios, website snippets, staff replies, and one current customer link handoff.

The tool exists because SMB owners repeatedly rewrite the same facts across Google, WhatsApp, Instagram, Facebook, old websites, staff messages, posters, and customer replies. MenuList should not become a profile manager or social scheduler. It should make the facts clear, then route the owner toward one current customer source.

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./business-facts-copy-pack_spec.md) | Product job, V0/V1/V2 scope, and boundaries |
| Developers | [Implementation](./business-facts-copy-pack_impl.md) | File map, report contract, and verification plan |
| Sales | [Marketing](./business-facts-copy-pack_marketing.md) | Internal positioning and talk track |
| Website | [Website](./business-facts-copy-pack_website.md) | Public copy constraints and route language |
| Help | [Help Doc](./business-facts-copy-pack_helpdoc.md) | User-facing help article |
| Firebase | [Firebase](./business-facts-copy-pack_firebase.md) | Cost, storage, and consent posture |
| Mobile | [Mobile Support](./business-facts-copy-pack_mobile-support.md) | Mobile admission review |
| QA | [Test Cases](./business-facts-copy-pack_test-cases.md) | Acceptance and refusal tests |
| Validation | [Validation](./business-facts-copy-pack_validation.md) | Current implementation evidence |

## Version Ladder

| Lane | Shape | Status |
| --- | --- | --- |
| V0 | Public free browser-local copy pack | Implemented |
| V1 | Logged-in owner readiness from current MenuList store/project truth | Implemented inside Business Health |
| V2 | Paid recurring/multi-location/agency fact-copy governance | Documented only |

## Boundary

V0 uses owner-entered fields only. It does not fetch, inspect, verify, update, or write to Google, WhatsApp, Instagram, Facebook, websites, directories, AI/search systems, or MenuList owner truth.

The only network write is the optional consented follow-up through the existing `/api/public/contact` route.

## Source Gate

```bash
npm run verify:business-facts-copy-pack
```

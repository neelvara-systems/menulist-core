# Public Truth Tools - Documentation Hub

> **Feature family:** MenuList Public Truth Tools
> **Status:** Active family - thirteen public tools, a public shareable report layer, and twelve owner readiness modules with exact fix targets implemented
> **Last Updated:** July 3, 2026
> **Version:** 2.3

---

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./public-truth-tools_spec.md) | Product boundary, packaging, and tool-family rules |
| Developers | [Implementation](./public-truth-tools_impl.md) | Future module registry, contracts, and integration plan |
| Sales | [Marketing](./public-truth-tools_marketing.md) | Internal positioning and packaging language |
| Website | [Website](./public-truth-tools_website.md) | Public copy guidance for the tool family |
| Help | [Help Doc](./public-truth-tools_helpdoc.md) | Owner-facing help article draft |
| Firebase | [Firebase](./public-truth-tools_firebase.md) | Cost model and data boundaries |
| Mobile | [Mobile Support](./public-truth-tools_mobile-support.md) | Mobile admission and owner-PWA posture |
| QA | [Test Cases](./public-truth-tools_test-cases.md) | Acceptance matrix for the family |

---

## What Is This?

**One-liner:** Public Truth Tools is the reusable MenuList layer for small diagnostic tools that show whether an SMB's public facts are clear enough for customers, search, and agents to read.

**Problem Solved:** MenuList will keep discovering small, useful checks: menu readability, hours clarity, QR link health, service-list clarity, profile photo gaps, and AI/search readability. If each becomes a one-off feature, the owner app and website will bloat.

**Solution:** Treat these as a controlled family of MenuList-owned checks. Internally they can behave like modules/plugins. Publicly they are simple tools and reports that feed the core MenuList truth layer.

---

## Product Boundary

Public Truth Tools are:

- MenuList-owned
- truth-first
- read-first
- diagnostic by default
- useful for acquisition and owner retention
- allowed to graduate into paid add-ons when recurring monitoring has proven value

Public Truth Tools are not:

- a separate SaaS product
- CrowdReply-style engagement placement
- a posting network
- a review/reputation manipulation tool
- an MCP-first product
- a rankings or AI-citation promise

---

## Growth Ladder

Public Truth Tools can grow as a MenuList module/add-on family, but each tool must fit one of these lanes.

| Lane | Product shape | Example | Monetization rule | Runtime rule |
| --- | --- | --- | --- | --- |
| V0 | Public free tool / lead magnet | Public Truth Check route where an owner enters a business URL/menu link/Google profile reference and visible facts | Free acquisition and education | No fake scan claims; external URLs are references unless an approved adapter exists |
| V1 | Logged-in MenuList owner check | Business Health/Public Discovery status from actual store/project truth | Included owner value | Implemented inside desktop/mobile Business Health as twelve read-only readiness modules with exact fix targets; reuse existing MenuList truth, DAL, cache, and mobile shell patterns |
| V2 | Paid add-on behavior | Recurring checks, saved history, monthly report, multi-location scan, partner/agency reports | Paid only when recurrence/history create value | Requires entitlement, capped history, source policy, audit logs, and cost controls |

This lets the list keep growing without creating a new SaaS product or adding owner dashboard noise.

---

## Family Map

```txt
MenuList Core
  -> canonical menu, hours, business identity, QR, OBP, public API

Public Truth Tools
  -> small checks that expose gaps and route fixes back to MenuList truth

Growth Kits
  -> paid owner add-on that turns current truth into usable handoffs

Growth Engine
  -> internal acquisition/distribution infrastructure, not owner-facing
```

---

## Implemented Tools

The public index is documented separately:

- [Tools Hub](../tools-hub/README.md) at `/tools`
- [Shareable Tool Reports](../shareable-tool-reports/README.md) at `/tools/reports`

The first concrete tools are documented separately:

- [Public Truth Check](../public-truth-check/README.md)
- [QR Link Health Check](../qr-link-health-check/README.md)
- [Menu Readability Check](../menu-readability-check/README.md)
- [Customer Question Coverage Check](../customer-question-coverage-check/README.md)
- [Booking Inquiry Readiness Check](../booking-inquiry-readiness-check/README.md)
- [Price Availability Gap Check](../price-availability-gap-check/README.md)
- [Menu PDF Cleanup Check](../menu-pdf-cleanup-check/README.md)
- [Google Profile Basics Checklist](../google-profile-basics-checklist/README.md)
- [One Customer Link Preview](../customer-link-preview/README.md)
- [Social Bio Link Consistency Check](../social-bio-link-check/README.md)
- [WhatsApp Action Link Check](../whatsapp-action-link-check/README.md)
- [Hours Check](../hours-check/README.md)
- [Photo Gap Check](../photo-gap-check/README.md)

They validate the family pattern:

```txt
Input -> fact check -> gap report -> MenuList fix path
```

Implemented public routes:

- `/tools`
- `/tools/reports`
- `/tools/public-truth-check`
- `/tools/qr-link-health-check`
- `/tools/menu-readability-check`
- `/tools/customer-question-coverage-check`
- `/tools/booking-inquiry-readiness-check`
- `/tools/price-availability-gap-check`
- `/tools/menu-pdf-cleanup-check`
- `/tools/google-profile-basics-checklist`
- `/tools/customer-link-preview`
- `/tools/social-bio-link-check`
- `/tools/whatsapp-action-link-check`
- `/tools/hours-check`
- `/tools/photo-gap-check`
- browser-local `self_report` mode only
- no external fetch
- no report-time Firebase writes
- optional consented follow-up through existing `/api/public/contact`
- shareable report follow-up enquiries carry bounded `shareable_tool_report` metadata for operational triage
- shareable report links use hash-fragment payloads and no report storage
- no AI/search provider calls
- no ranking or citation promise

Implemented logged-in owner modules:

- Public truth basics
- QR link health
- Menu or service clarity
- WhatsApp action link
- Hours readiness
- Photo and visual identity
- Customer question coverage
- Booking and inquiry readiness
- Price and availability clarity
- PDF cleanup readiness
- Google profile handoff
- Menu freshness

Each owner module has one direct fix target. Desktop uses focused links into Business Settings, Projects, or QR tools. Mobile maps the same module contract to `MobileShell` tabs and More sub-screens.

Provider-backed owner/admin prototype:

- [Maps Place Check](../maps-place-check/README.md) is a separate backend-only callable behind `ENABLE_PUBLIC_TRUTH_MAPS_PLACE_CHECK`. It uses Google Maps grounding through the Functions GenAI gateway and returns evidence for owner/admin review only. It is not part of the public zero-cost V0 tools and does not write canonical truth.

---

## Ranked Tool Candidates

| Rank | Tool | Primary user | Core job | Product boundary |
| --- | --- | --- | --- | --- |
| 1 | Public Truth Check | Prospect, owner, agency | Show whether public business facts are clear | V0 public route and V1 Business Health owner readiness modules implemented; no external posting |
| 2 | QR Link Health Check | Physical-location SMB | Verify QR targets resolve to the current customer link | V0 public route implemented with pasted URL only; no QR image decoding or broad crawl |
| 3 | Menu / Service Readability Check | Food/service SMB | Check whether menu, service, price, and action content is understandable | V0 public route implemented with pasted text only; no uploaded-file storage |
| 4 | Customer Question Coverage Check | Owner/prospect | Check whether current public source answers common customer questions | V0 public route implemented with pasted source/questions only; V1 owner module checks MenuList truth |
| 5 | Booking Inquiry Readiness Check | Owner/prospect | Check whether customers can clearly order, book, reserve, call, message, request a quote, or visit | V0 public route implemented with action-path format/readiness only; V1 owner module checks MenuList action, contact, hours, location, and customer link |
| 6 | Price & Availability Gap Check | Food/service/retail SMB | Check whether prices, variants, unavailable items, and quote paths are clear | V0 public route implemented with pasted source text only; V1 owner module checks MenuList project prices, variant prices, and availability flags |
| 7 | Menu PDF Cleanup Check | PDF-heavy SMB | Check whether old PDFs should be replaced with one current customer link | V0 public route implemented with owner-entered PDF reference/facts only; V1 owner module checks MenuList source and link readiness |
| 8 | Google Profile Basics Checklist | Owner/agency | Check whether owner-maintained Google Business Profile basics are ready for customers | V0 public route implemented with owner-selected facts only; V1 maps to existing Google profile handoff module |
| 9 | WhatsApp Action Link Check | Mobile-first SMB | Check whether customers can tap once to message, order, book, or call | V0 public route implemented with format/action readiness only; no message sending |
| 10 | Hours & Holiday Hours Check | Owner | Check regular and special hours clarity | V0 public route implemented with owner-entered hours only; MenuList store hours in V1 |
| 11 | Photo / Visual Identity Gap Check | Owner | Show missing public visual proof slots | V0 public route implemented with owner-selected photo facts only; OBP photo contract in V1 |
| 12 | One Customer Link Preview | Prospect/owner | Show what customers see when they open the business link | V0 public route implemented with owner-entered facts only; V1 maps to existing MenuList public page and Business Health readiness surfaces |
| 13 | Social Bio Link Consistency Check | Prospect/owner/agency | Check whether social bios, public profiles, website links, QR codes, and print materials point to one current customer link | V0 public route implemented with owner-selected placement facts only; V1 maps to existing Share, Public Discovery, and Business Health readiness surfaces |
| P1 | Booking / Order / Reservation Readiness | Owner | Check whether customer next actions are clear | Check action paths, not provider integrations |
| P2 | Multi-location Consistency Check | Multi-outlet owner | Compare shared and outlet-level public facts | Owner-authenticated paid/add-on candidate |
| P2 | Public Truth Monitor | Serious owner, agency | Scheduled checks, history, monthly report | Paid only because recurrence/history create value |
| P2 | AI/Search Readability Sampling | Internal, agency, paid advanced tier | Sample whether a MenuList-owned source is easy to summarize | No ranking or citation claim |

---

## Key Existing Anchors

| Existing source | Why it matters |
| --- | --- |
| `src/lib/seo/publicTruthIndexing.ts` | Current public truth eligibility gate |
| `src/app/client/[[...slug]]/page.tsx` | Public menu/catalog rendering and JSON-LD source |
| `src/app/client/obp/schema.ts` | Official Business Page schema source |
| `public/llms.txt` | Current agent-readable boundary |
| `src/app/api/public/v1/business/route.ts` | Existing read-only public business API |
| `src/app/api/public/v1/menu/route.ts` | Existing read-only public menu API |
| `__docs__/growthos-addon/README.md` | Add-on precedent inside MenuList |
| `__docs__/growth-engine/README.md` | Separate internal acquisition boundary |

---

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 2.5 | July 3, 2026 | Added structured report-follow-up metadata and an operations playbook for shareable report leads |
| 2.4 | July 3, 2026 | Added consented follow-up capture to Shareable Tool Reports through the existing public contact path |
| 2.3 | July 3, 2026 | Extended Shareable Tool Reports to all current public tools through the shared payload builder and Copy public report link action |
| 2.2 | July 3, 2026 | Added Shareable Tool Reports at `/tools/reports` with hash-fragment report payloads, no report storage, and Social Bio Link Consistency Check as the first source-tool integration |
| 2.1 | July 3, 2026 | Added Social Bio Link Consistency Check as a browser-local V0 public tool mapped to existing Share, Public Discovery, and Business Health readiness surfaces |
| 2.0 | July 3, 2026 | Added `/tools` as the static MenuList Tools hub that groups current public checks by owner job without adding report execution, storage, crawler, provider call, or contact handoff behavior |
| 1.9 | July 3, 2026 | Added One Customer Link Preview as a browser-local V0 public tool mapped to existing MenuList public page and Business Health readiness surfaces |
| 1.8 | July 2, 2026 | Added Google Profile Basics Checklist as a browser-local V0 public tool mapped to the existing Google profile handoff owner module |
| 1.7 | July 2, 2026 | Added Menu PDF Cleanup Check as a browser-local V0 public tool and V1 Business Health readiness module |
| 1.6 | July 2, 2026 | Added Price Availability Gap Check as a browser-local V0 public tool and V1 Business Health readiness module |
| 1.5 | July 2, 2026 | Added Booking Inquiry Readiness Check as a browser-local V0 public tool and V1 Business Health readiness module |
| 1.4 | July 2, 2026 | Added Customer Question Coverage Check as a browser-local V0 public tool and V1 Business Health readiness module |
| 1.3 | July 2, 2026 | Added Maps Place Check as a flag-off owner/admin provider-backed prototype, separate from zero-cost V0 public tools |
| 1.2 | July 1, 2026 | Added exact desktop and mobile fix targets for the eight owner readiness modules |
| 1.1 | July 1, 2026 | Added owner-only Google profile handoff and menu freshness readiness modules, keeping Google/external scanning out of scope |
| 1.0 | July 1, 2026 | Expanded V1 owner-side Business Health readiness to six modules covering public basics, QR, menu/service clarity, WhatsApp, hours, and photos |
| 0.9 | July 1, 2026 | Implemented Photo Gap Check V0 as the fifth follow-on public tool |
| 0.8 | July 1, 2026 | Implemented Hours Check V0 as the fourth follow-on public tool |
| 0.7 | July 1, 2026 | Implemented WhatsApp Action Link Check V0 as the third follow-on public tool |
| 0.6 | July 1, 2026 | Implemented Menu Readability Check V0 as the second follow-on public tool |
| 0.5 | July 1, 2026 | Implemented QR Link Health Check V0 as the first follow-on public tool |
| 0.4 | July 1, 2026 | Reordered the tool portfolio around QR, menu/service readability, WhatsApp action links, hours, and visual identity, with paid value reserved for recurrence/history/reporting |
| 0.3 | June 30, 2026 | Added V1 Public Truth Check owner card inside desktop/mobile Business Health using actual MenuList store/project truth |
| 0.2 | June 30, 2026 | Public Truth Check implemented as the first Public Truth Tools route |
| 0.1 | June 30, 2026 | Initial docs for reusable Public Truth Tools family and add-on/plugin flow |

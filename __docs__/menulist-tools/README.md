# MenuList Tools - Documentation Hub

> **Scope:** MenuList-owned public, owner, and paid add-on tools
> **Status:** Active documentation namespace
> **Last Updated:** July 4, 2026

---

## Purpose

This folder is the documentation home for MenuList tools.

Use this namespace for tools that are:

- MenuList-owned
- truth-first or setup-first
- public, owner-side, internal, or paid add-on modules
- designed to route gaps back into MenuList's canonical business truth layer

Do not create new top-level tool folders such as `__docs__/[tool-name]/` when the work is part of MenuList's tool/add-on family. Add them here instead:

```txt
__docs__/menulist-tools/[tool-or-tool-family]/
```

---

## Tool Ladder

Every MenuList tool should be assigned to one lane before implementation.

| Lane | Product shape | Default placement | Rule |
| --- | --- | --- | --- |
| V0 | Public free tool / lead magnet | Website route and doc set under this folder | Free, lightweight, no fake scan claims, no default storage unless a consented existing contact/setup flow is reused |
| V1 | Logged-in MenuList owner check | Existing owner surfaces such as Business Health, Public Discovery, OBP readiness, Share, or QR | Reuse current MenuList truth and DAL/cache paths |
| V2 | Paid add-on behavior | Entitled owner/partner module under this folder | Paid only when recurrence, history, multi-location reporting, or agency reporting creates real value |

The public route can live under `/tools/...`, but the docs live here so the growing tool list stays organized.

---

## Current Tool Docs

| Folder | Role | Status |
| --- | --- | --- |
| [tools-hub](./tools-hub/README.md) | Public website index for current MenuList Tools routes | Implemented static V0 index |
| [shareable-tool-reports](./shareable-tool-reports/README.md) | Public report-link layer for MenuList Tools output | Implemented V0 viewer, all source-tool integrations, and structured follow-up metadata |
| [public-truth-tools](./public-truth-tools/README.md) | Reusable tool/add-on family for public business truth checks | Active family |
| [public-truth-monitor-addon](./public-truth-monitor-addon/README.md) | Paid V2 add-on for saved public truth history and owner/partner reports | Runtime implemented for entitlement-gated saved history; scheduler and external adapters remain off |
| [print-share-tools](./print-share-tools/README.md) | Public browser-local asset makers for QR posters, WhatsApp Status images, holiday-hours posters, customer link cards, and feedback QR cards | Implemented V0 with V1 owner readiness coverage |
| [public-truth-check](./public-truth-check/README.md) | First public and owner tool for checking whether visible business facts are clear | Implemented V0 and V1 |
| [business-facts-copy-pack](./business-facts-copy-pack/README.md) | Public tool for turning owner-entered business facts into reusable profile, WhatsApp, social, website, staff, and customer-link copy | Implemented V0 and V1 |
| [whatsapp-reply-pack](./whatsapp-reply-pack/README.md) | Public tool for turning owner-entered business facts into reusable WhatsApp customer replies | Implemented V0 and V1 |
| [customer-faq-reply-pack](./customer-faq-reply-pack/README.md) | Public tool for turning repeated customer questions and owner-entered facts into reusable FAQ answers | Implemented V0 and V1 |
| [qr-link-health-check](./qr-link-health-check/README.md) | Public tool for checking QR target readiness | Implemented V0 and V1 |
| [menu-readability-check](./menu-readability-check/README.md) | Public tool for checking pasted menu/service text clarity | Implemented V0 and V1 |
| [customer-question-coverage-check](./customer-question-coverage-check/README.md) | Public tool and owner module for checking whether common customer questions are answered | Implemented V0 and V1 |
| [booking-inquiry-readiness-check](./booking-inquiry-readiness-check/README.md) | Public tool and owner module for checking whether customers can clearly act | Implemented V0 and V1 |
| [price-availability-gap-check](./price-availability-gap-check/README.md) | Public tool and owner module for checking whether prices, variants, availability, and quote paths are clear | Implemented V0 and V1 |
| [menu-pdf-cleanup-check](./menu-pdf-cleanup-check/README.md) | Public tool and owner module for checking whether old PDFs should be replaced with one current customer link | Implemented V0 and V1 |
| [google-profile-basics-checklist](./google-profile-basics-checklist/README.md) | Public tool that maps to the existing owner Google profile handoff module | Implemented V0 and V1 |
| [customer-link-preview](./customer-link-preview/README.md) | Public tool for previewing whether one customer-facing link has the basics customers need | Implemented V0 and V1 |
| [social-bio-link-check](./social-bio-link-check/README.md) | Public tool for checking whether social bios, profiles, website links, QR codes, and print materials point to one current customer link | Implemented V0 and V1 |
| [whatsapp-action-link-check](./whatsapp-action-link-check/README.md) | Public tool for checking WhatsApp one-tap action readiness | Implemented V0 and V1 |
| [hours-check](./hours-check/README.md) | Public tool for checking regular, closed-day, and holiday-hours clarity | Implemented V0 and V1 |
| [photo-gap-check](./photo-gap-check/README.md) | Public tool for checking basic visual proof and photo coverage | Implemented V0 and V1 |
| [tool-intake-template](./tool-intake-template.md) | Admission checklist for future MenuList tools | Active template |

---

## Validated Build Order

Do not build a broad toolbox. Build a small acquisition layer around public business truth.

Immediate order:

| Rank | Tool | Why it is next |
| --- | --- | --- |
| 1 | Public Truth Check | Implemented umbrella entry point for one-current-source education |
| 2 | Business Facts Copy Pack | Output-first tool that turns entered facts into reusable copy before signup |
| 3 | QR Link Health Check | Strongest physical-world failure case; routes directly to current customer link |
| 4 | Menu / Service Readability Check | Best source-import and setup conversion path |
| 5 | Customer Question Coverage Check | Converts repeated customer questions into a one-current-link setup path |
| 6 | Customer FAQ Reply Pack | Output-first FAQ utility that turns repeated questions into reusable answers without creating a chatbot |
| 7 | Booking / Inquiry Readiness Check | Converts unclear order, booking, quote, visit, and contact paths into one customer-link setup path |
| 8 | Price & Availability Gap Check | Converts unclear prices, variants, sold-out state, and quote paths into one current customer source |
| 9 | Menu PDF Cleanup Check | Converts stale PDF/menu links into one current customer-link setup path |
| 10 | Google Profile Basics Checklist | Converts Google profile setup gaps into one current customer-link handoff |
| 11 | WhatsApp Action Link Check | Strong mobile-first SMB behavior, especially for India and service businesses |
| 12 | WhatsApp Reply Pack | Output-first WhatsApp utility that turns entered facts into reusable replies without sending messages |
| 13 | Hours & Holiday Hours Check | Implemented simple trust gap with a clear owner fix path |
| 14 | Photo / Visual Identity Gap Check | Implemented easy owner-understood gap that routes to Official Business Page completion |
| 15 | One Customer Link Preview | First P1 follow-on; shows why one current customer-facing link is the fix path |
| 16 | Social Bio Link Consistency Check | Checks whether public profile and social placements point customers to the same current link |

Public asset cluster:

| Tool | Why it belongs |
| --- | --- |
| QR Poster Maker | Gives the owner an immediate printable asset around one current customer link |
| WhatsApp Menu Status Maker | Fits mobile-first SMB sharing without sending messages or automating WhatsApp |
| Holiday Hours Poster Maker | Turns a recurring trust problem into a simple printable/shareable asset |
| Customer Link Card Maker | Helps staff, counters, packages, and reception points point to one current link |
| Feedback QR Card Maker | Supports ethical feedback collection without generating or pressuring reviews |

Current public index:

- `/tools` is the MenuList Tools hub and groups the implemented public checks by owner job.
- `/tools/reports` is the public shareable report viewer for MenuList Tool report links.
- `/tools/qr-poster-maker`, `/tools/whatsapp-menu-status-maker`, `/tools/holiday-hours-poster-maker`, `/tools/customer-link-card-maker`, and `/tools/feedback-qr-card-maker` are public, browser-local Print & Share asset makers.
- `/tools` is not a report runner, plugin marketplace, paid add-on, crawler, or SEO audit.
- Individual tool routes keep their own V0/V1/V2 contracts and evidence text.

Paid add-ons should wait until recurrence, history, multi-location reporting, agency export, or owner-approved repair creates real value. A better one-time check is not enough to make a paid add-on.

---

## Placement Rules

- Keep MenuList tools in `__docs__/menulist-tools/`.
- Keep non-tool MenuList features in their normal feature docs folder.
- Keep Answerlattice tools under `__docs__/answerlattice/`.
- Keep CampaignCue tools under `__docs__/campaigncue/`.
- Do not turn this folder into a generic SEO, AI visibility, reputation, or external engagement product area.
- If a tool becomes a paid add-on, keep its docs here and document entitlement, cost, retention, source policy, and audit behavior before implementation.

---

## Existing Strategy Guardrail

This namespace does not override the older free-tools strategy guardrail: public tools should act as entry pipelines into MenuList truth, not random calculators or SEO utilities.

For Public Truth Check, the approved V0 is intentionally narrow: it checks owner-entered visible facts and routes the owner toward one current customer source. It does not crawl external sources, inspect Google, or promise ranking. The optional follow-up form stores only a consented public contact enquiry through the existing bounded contact route. V1 is now a logged-in Business Health card that checks current MenuList store/project truth without report writes or external scans.

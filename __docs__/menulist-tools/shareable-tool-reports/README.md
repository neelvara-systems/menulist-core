# Shareable Tool Reports - Documentation Hub

> **Feature:** Shareable public report layer for MenuList Tools
> **Status:** Implemented V0 for public report viewing, all current public MenuList Tools, setup job lists, structured consented report follow-up capture, and internal Report Leads triage
> **Last Updated:** July 4, 2026
> **Version:** 0.6

---

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./shareable-tool-reports_spec.md) | Product boundary and funnel role |
| Developers | [Implementation](./shareable-tool-reports_impl.md) | Payload, route, integration, and verifier contract |
| Sales | [Marketing](./shareable-tool-reports_marketing.md) | Internal positioning language |
| Website | [Website](./shareable-tool-reports_website.md) | Public copy rules |
| Help | [Help Doc](./shareable-tool-reports_helpdoc.md) | Owner/prospect help language |
| Firebase | [Firebase](./shareable-tool-reports_firebase.md) | Cost and storage boundary |
| Mobile | [Mobile Support](./shareable-tool-reports_mobile-support.md) | Mobile behavior and limits |
| Operations | [Follow-Up Playbook](./shareable-tool-reports_follow-up-playbook.md) | How to handle report follow-up leads |
| QA | [Test Cases](./shareable-tool-reports_test-cases.md) | Acceptance matrix |
| Validation | [Validation](./shareable-tool-reports_validation.md) | Source gates and current verification scope |

---

## What This Adds

Shareable Tool Reports turns a completed public MenuList Tool check into a public report link.

The V0 implementation is intentionally light:

- public route: `/tools/reports`
- no login
- no report database
- no Firestore read/write for the report
- no external fetch
- no AI/provider call
- report payload is carried in the URL hash fragment
- all current public MenuList Tools can copy a public report link
- each report carries a bounded setup job list derived from its visible gaps
- optional report follow-up form reuses the existing consented `/api/public/contact` path and stores bounded `sourceContext` metadata on that existing enquiry
- internal platform route: `/ops/report-leads` for manual triage of consented report leads

The URL hash fragment is not sent to the server during normal HTTP requests. This keeps the first public report layer useful for sharing while avoiding a new report-storage system.

If a visitor submits the follow-up form, MenuList stores one existing public contact enquiry with a bounded report summary and structured report metadata after consent and security checks. That is lead capture, not report storage.

Report Leads at `/ops/report-leads` reads those existing enquiries for platform-admin triage. It is not public, not an owner surface, and not a report history system.

---

## Product Rule

The report is an acquisition asset, not a hidden scan result.

Every report must show:

- what was checked
- what was not checked
- explicit evidence text
- one honest number
- clear check rows
- a bounded setup job list
- one MenuList next action
- no ranking, citation, traffic, or external-update promise

This matches the microtool funnel:

```txt
free tool -> shareable report -> MenuList fix path
                    report gaps -> setup job list
                         -> optional consented follow-up
```

---

## Current Integration

| Tool | Public route | Shareable report status |
| --- | --- | --- |
| Public Truth Check | `/tools/public-truth-check` | Implemented: Copy public report link |
| QR Link Health Check | `/tools/qr-link-health-check` | Implemented: Copy public report link |
| Menu Readability Check | `/tools/menu-readability-check` | Implemented: Copy public report link |
| Customer Question Coverage Check | `/tools/customer-question-coverage-check` | Implemented: Copy public report link |
| Customer FAQ Reply Pack | `/tools/customer-faq-reply-pack` | Implemented: Copy public report link |
| Booking Inquiry Readiness Check | `/tools/booking-inquiry-readiness-check` | Implemented: Copy public report link |
| Price Availability Gap Check | `/tools/price-availability-gap-check` | Implemented: Copy public report link |
| Menu PDF Cleanup Check | `/tools/menu-pdf-cleanup-check` | Implemented: Copy public report link |
| Google Profile Basics Checklist | `/tools/google-profile-basics-checklist` | Implemented: Copy public report link |
| Business Facts Copy Pack | `/tools/business-facts-copy-pack` | Implemented: Copy public report link |
| One Customer Link Preview | `/tools/customer-link-preview` | Implemented: Copy public report link |
| Social Bio Link Consistency Check | `/tools/social-bio-link-check` | Implemented: Copy public report link |
| WhatsApp Action Link Check | `/tools/whatsapp-action-link-check` | Implemented: Copy public report link |
| WhatsApp Reply Pack | `/tools/whatsapp-reply-pack` | Implemented: Copy public report link |
| Hours Check | `/tools/hours-check` | Implemented: Copy public report link |
| Photo Gap Check | `/tools/photo-gap-check` | Implemented: Copy public report link |

Future tools must adopt the shared payload contract when their report cards are created. Do not add a report API route or report collection just to share a V0 report.

---

## Version History

| Version | Date | Changes |
| --- | --- | --- |
| 0.6 | July 4, 2026 | Added bounded setup job lists to shareable report payloads, public viewer output, consented source metadata, and Report Leads triage |
| 0.5 | July 3, 2026 | Added internal Report Leads monitor at `/ops/report-leads` for bounded platform-admin triage of consented report follow-ups |
| 0.4 | July 3, 2026 | Added structured `sourceContext` metadata to report follow-up enquiries plus the operations follow-up playbook |
| 0.3 | July 3, 2026 | Added optional consented report follow-up capture on `/tools/reports` through existing `/api/public/contact` |
| 0.2 | July 3, 2026 | Extended Copy public report link to all current public MenuList Tools through the shared payload builder |
| 0.1 | July 3, 2026 | Added hash-fragment public report viewer at `/tools/reports`, shared payload encoder/decoder, Social Bio report-link action, discovery entries, docs, and verifier |

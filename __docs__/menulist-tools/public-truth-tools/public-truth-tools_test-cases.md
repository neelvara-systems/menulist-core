# Public Truth Tools - Test Cases

**Status:** Active family tests - Public Truth Check V0/V1, QR Link Health Check V0, Menu Readability Check V0/V1, Customer Question Coverage Check V0/V1, Booking Inquiry Readiness Check V0/V1, Price Availability Gap Check V0/V1, Menu PDF Cleanup Check V0/V1, Google Profile Basics Checklist V0/V1, One Customer Link Preview V0, Social Bio Link Consistency Check V0, Shareable Tool Reports V0, WhatsApp Action Link Check V0, Hours Check V0, and Photo Gap Check V0 implemented
**Last Updated:** July 3, 2026
**Audience:** QA, developers

---

## Framework Acceptance Matrix

| ID | Scenario | Expected result |
| --- | --- | --- |
| TH-001 | Visit `/tools` with hub flags on | Tools Hub renders current public checks grouped by owner job and does not run a report |
| PTT-001 | Tool added without registry entry | Verification fails |
| PTT-002 | Tool has registry entry but no docs | Verification fails |
| PTT-003 | Public copy promises ranking or AI citation | Verification fails |
| PTT-004 | Tool attempts external posting | Blocked by product boundary |
| PTT-005 | Tool writes external-source data to MenuList truth without owner approval | Blocked |
| PTT-006 | Owner mobile card opens desktop route | Verification fails |
| PTT-007 | Tool uses model/provider call without cost class | Verification fails |
| PTT-008 | Public API route lacks rate limit or body cap | Verification fails |
| PTT-009 | Report uses confidence percentage as owner-facing primary output | Review fails |
| PTT-010 | Tool routes missing fact to existing MenuList fix flow | Pass |
| PTT-011 | One-time public check is packaged as paid add-on without recurrence/history/reporting | Review fails |
| PTT-012 | New public tool omits explicit evidence text | Verification fails |
| PTT-013 | WhatsApp tool sends messages or mutates external platform state | Blocked by product boundary |
| PTT-014 | QR Link Health Check claims it decoded an image or opened the target page in V0 | Verification fails |
| PTT-015 | Menu Readability Check claims it uploaded a file, read a PDF, opened a link, or rewrote content in V0 | Verification fails |
| PTT-015A | Customer Question Coverage Check claims it opened links, read chats, called AI/search providers, or generated chatbot answers in V0 | Verification fails |
| PTT-015B | Booking Inquiry Readiness Check claims it opened links, checked booking providers, inspected calendars/payments, sent messages, or called AI/search providers in V0 | Verification fails |
| PTT-015C | Price Availability Gap Check claims it opened links, verified prices externally, checked live inventory, inspected POS/order providers, or called AI/search providers in V0 | Verification fails |
| PTT-015D | Menu PDF Cleanup Check claims it uploaded/parsed/OCRed PDFs, opened links, fetched URLs, decoded QR images, or called AI/search providers in V0 | Verification fails |
| PTT-015E | Google Profile Basics Checklist claims it opened Google, inspected Google Search/Maps/Profile, updated Google, checked rankings/reviews, or called AI/search providers in V0 | Verification fails |
| PTT-015F | One Customer Link Preview claims it opened links, fetched customer pages, inspected websites/profiles, stored reports, checked rankings, or called AI/search providers in V0 | Verification fails |
| PTT-015G | Social Bio Link Consistency Check claims it opened social profiles, fetched profiles, inspected Google/websites/QR destinations, stored reports, updated platforms, checked rankings, or called AI/search providers in V0 | Verification fails |
| PTT-015H | Shareable Tool Reports adds a report API route, stores report documents, accepts unsafe next-action links, omits evidence text, or sends hash payloads to a server | Verification fails |
| PTT-016 | WhatsApp Action Link Check claims it sent a message, verified a number, opened a link, or contacted WhatsApp in V0 | Verification fails |
| PTT-017 | Hours Check claims it inspected Google, maps, websites, holiday calendars, or AI/search answers in V0 | Verification fails |
| PTT-018 | Photo Gap Check claims it uploaded images, analyzed images, inspected Google/Instagram, or fetched a photo source in V0 | Verification fails |
| PTT-019 | V1 owner readiness omits any implemented V0 tool family module | Verification fails |
| PTT-020 | V1 owner readiness row has no exact desktop or mobile fix target | Verification fails |

---

## Product Boundary Tests

| Test | Pass condition |
| --- | --- |
| Add-on boundary | Paid behavior is recurring report/value, not one-time public check |
| Build-order boundary | Current public tools follow Public Truth, QR, menu/service readability, customer question coverage, booking/inquiry readiness, price/availability, PDF cleanup, Google profile basics, WhatsApp action, hours, photo, One Customer Link Preview, and Social Bio Link Consistency Check unless docs record a new decision |
| GrowthOS boundary | Public Truth Tools do not generate promotional copy |
| Growth Engine boundary | Public Truth Tools do not become internal lead/outreach automation |
| Answerlattice boundary | Public Truth Tools do not reuse support-answer MCP claims |
| Public API boundary | Tools read existing public APIs only when scoped and authorized |

---

## Source Policy Tests

| Source | Allowed? | Expected behavior |
| --- | --- | --- |
| Owner-entered business facts | Yes | Check and report |
| MenuList store/project truth | Yes | Owner-authenticated check |
| Uploaded menu/service file | Conditional | Not allowed in Public Truth Check V0; future setup/manual-review flows must use an existing safe upload path with retention and cleanup rules |
| Uploaded menu/service file for Menu Readability Check | No in V0 | Owner pastes text only; upload/parsing requires approved setup/manual-review flow |
| Uploaded QR image | No in QR Link Health Check V0 | Owner scans with camera and pastes the opened URL; image decoding requires separate approval |
| Booking provider/calendar/payment inspection | No in Booking Inquiry Readiness Check V0 | Owner-entered action text, destination, and customer link are checked locally only |
| POS, ordering-provider, or live-inventory inspection | No in Price Availability Gap Check V0 | Owner-entered text and selected facts are checked locally only |
| Old PDF source self-report | Yes in Menu PDF Cleanup Check V0 | Owner-entered PDF reference/location/facts only; no upload, parsing, OCR, URL fetch, or storage |
| Google profile self-report | Yes in Google Profile Basics Checklist V0 | Owner-selected profile facts only; no Google Search/Maps/Profile inspection, update, ranking check, or review inspection |
| Customer link preview self-report | Yes in One Customer Link Preview V0 | Owner-entered link/facts only; no link open, website crawl, profile inspection, ranking check, AI/search provider call, or report storage |
| Social bio link self-report | Yes in Social Bio Link Consistency Check V0 | Owner-selected placement facts only; no social profile open/fetch, website crawl, Google profile inspection, QR destination check, ranking check, AI/search provider call, or report storage |
| WhatsApp message send/test | No in WhatsApp Action Link Check V0 | Owner-entered number/link/message fields are checked locally only |
| Google/maps/holiday hours inspection | No in Hours Check V0 | Owner-entered hours facts are checked locally only |
| Image upload/analysis | No in Photo Gap Check V0 | Owner-selected photo facts are checked locally only |
| Owner-pasted public text | Yes | Check text only |
| Arbitrary public URL | Conditional | Store reference only unless adapter approved |
| Login-only page | No | Reject or mark not checked |
| Private social group | No | Reject or mark not checked |
| External source as canonical truth | No | Requires owner confirmation first |

---

## UI Tests

- Report fits mobile and desktop without horizontal overflow.
- Every missing item has at most one primary action.
- Empty states do not explain internal scoring.
- Loading state does not claim external checks completed before they do.
- Errors are generic and calm.
- Public reports do not show raw internal IDs.

---

## Cost Tests

- Static tools produce zero Firestore operations.
- Owner-authenticated tools reuse loaded context where possible.
- Saved summaries are capped per store.
- AI/provider calls are disabled unless a cost class and SAFE_MODE path exist.
- Public checks are rate-limited before expensive work.

## Verification Command

```bash
npm run verify:public-truth-tools
```

The family command runs the implemented Tools Hub, Public Truth Check, QR Link Health Check, Menu Readability Check, Customer Question Coverage Check, Booking Inquiry Readiness Check, Price Availability Gap Check, Menu PDF Cleanup Check, Google Profile Basics Checklist, One Customer Link Preview, Social Bio Link Consistency Check, WhatsApp Action Link Check, Hours Check, and Photo Gap Check verifiers.

Shareable Tool Reports is also included in the aggregate verifier and can be run directly:

```bash
npm run verify:shareable-tool-reports
```

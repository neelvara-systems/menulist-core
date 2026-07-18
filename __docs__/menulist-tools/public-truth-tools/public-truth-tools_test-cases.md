# Public Truth Tools - Test Cases

**Status:** Active family tests - sixteen public tools, five public asset makers, shareable reports, eighteen V1 owner readiness modules, and V2 paid add-on runtime gate covered
**Last Updated:** July 16, 2026
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
| PTT-014A | Business Facts Copy Pack claims it inspected, opened, or updated Google, WhatsApp, Instagram, Facebook, websites, or directories in V0 | Verification fails |
| PTT-014B | WhatsApp Reply Pack claims it sent a message, verified a number, opened WhatsApp, called WhatsApp APIs, fetched links, stored reports, or generated AI rewrites in V0 | Verification fails |
| PTT-014C | Customer FAQ Reply Pack claims it read customer conversations, created a chatbot, configured automation, sent messages, fetched links, stored reports, or generated AI answers in V0 | Verification fails |
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
| PTT-021 | V1 owner readiness gaps do not derive a bounded desktop/mobile fix list from existing module rows | Verification fails |
| PTT-022 | V2 paid add-on runtime is changed without entitlement, capped history, source policy, audit, and cost controls | Verification fails |
| PTT-023 | Public V0 report treats `http://localhost`, private IPs, raw IPs, `.local`, credentialed URLs, or explicit `http://` as ready public customer links | Verification fails |
| PTT-024 | Public V0 report uses generic URL-format evidence instead of naming the public HTTPS URL boundary | Verification fails |
| PTT-025 | Public V0 URL parser drops capped `public_truth_tool_url_parse_failed` diagnostics, source labels, or the raw-URL exclusion boundary for malformed owner-entered links | Verification fails |
| PTT-026 | V1 owner readiness menu URL generation drops capped `public_truth_owner_menu_url_generation_failed` diagnostics, bounded shape metadata, or the raw-domain/project exclusion boundary | Verification fails |
| PTT-027 | Public URL uses trailing-dot localhost, raw IPv6, IPv4-mapped IPv6, or an empty hostname label | It is not counted as a public customer link and no network request occurs |
| PTT-028 | Phone/action input contains arbitrary letters, an invalid `tel:`/`mailto:` value, or an unrecognized `whatsapp://` host | It is missing/unclear; no preview or message action is treated as ready |
| PTT-029 | Public Truth Check URL path contains words such as `hours`, `price`, `contact`, or a city while pasted source text is empty | URL text does not prove those facts |
| PTT-030 | Shareable hash has mismatched summary counts, injected setup jobs, missing report limits, or an origin-escaping next action | Decoder rejects the payload or derives safe rows/jobs and falls back to `/create-menu` |
| PTT-031 | Report Lead Ops indexed report-lead query reaches its cap | API and UI disclose that older matching leads may exist; unrelated contact enquiries are not read |
| PTT-032 | Two entitled monitor refreshes overlap | Transaction merges each refresh against current saved history; capped history is not silently overwritten |
| PTT-033 | Public Truth Tools runtime boundary script is removed or fails | Aggregate verifier fails |

---

## Product Boundary Tests

| Test | Pass condition |
| --- | --- |
| Add-on boundary | Paid behavior is recurring report/value, not one-time public check |
| Build-order boundary | Current public tools follow Public Truth, Business Facts Copy Pack, WhatsApp Reply Pack, Customer FAQ Reply Pack, QR, menu/service readability, customer question coverage, booking/inquiry readiness, price/availability, PDF cleanup, Google profile basics, WhatsApp action, hours, photo, One Customer Link Preview, and Social Bio Link Consistency Check unless docs record a new decision |
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
| Business facts copy self-report | Yes in Business Facts Copy Pack V0 | Owner-entered facts only; copy blocks are deterministic; no external profile inspection, platform update, AI rewrite, ranking check, or report storage |
| WhatsApp reply self-report | Yes in WhatsApp Reply Pack V0 | Owner-entered facts only; reply blocks are deterministic; no WhatsApp API call, message send, number verification, external fetch, AI rewrite, ranking check, or report storage |
| Customer FAQ reply self-report | Yes in Customer FAQ Reply Pack V0 | Owner-entered questions and facts only; FAQ answer blocks are deterministic; no conversation-log reading, chatbot creation, automation configuration, message sending, external fetch, AI answer, ranking check, or report storage |
| WhatsApp message send/test | No in WhatsApp Action Link Check V0 | Owner-entered number/link/message fields are checked locally only |
| Google/maps/holiday hours inspection | No in Hours Check V0 | Owner-entered hours facts are checked locally only |
| Image upload/analysis | No in Photo Gap Check V0 | Owner-selected photo facts are checked locally only |
| Owner-pasted public text | Yes | Check text only |
| Arbitrary public URL | Conditional | Count only after the shared public HTTPS URL boundary; store reference only unless adapter approved |
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

The family command runs the implemented Tools Hub, Public Truth Check, Business Facts Copy Pack, WhatsApp Reply Pack, Customer FAQ Reply Pack, QR Link Health Check, Menu Readability Check, Customer Question Coverage Check, Booking Inquiry Readiness Check, Price Availability Gap Check, Menu PDF Cleanup Check, Google Profile Basics Checklist, One Customer Link Preview, Social Bio Link Consistency Check, WhatsApp Action Link Check, Hours Check, Photo Gap Check, Print & Share Tools, Shareable Reports, Report Leads, Public Truth Monitor, and the executable cross-tool runtime boundary tests.

Shareable Tool Reports is also included in the aggregate verifier and can be run directly:

```bash
npm run verify:shareable-tool-reports
```

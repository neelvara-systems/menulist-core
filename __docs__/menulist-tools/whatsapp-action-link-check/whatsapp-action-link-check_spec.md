# WhatsApp Action Link Check - Product Spec

**Status:** Implemented - V0 public browser-local checker
**Last Updated:** July 16, 2026
**Audience:** CEO / PM / product reviewers

---

## 1. Product Job

Help an SMB owner answer:

> Can a customer tap once to message, order, book, or ask a question through WhatsApp without confusion?

The tool checks the action path around WhatsApp, not the WhatsApp account itself.

---

## 2. User

Primary V0 users:

- restaurant owner using WhatsApp for orders
- salon/clinic/shop owner using WhatsApp for bookings or questions
- agency/freelancer setting up public links for SMB clients
- mobile-first business that already uses WhatsApp but lacks one current customer link

---

## 3. V0 Input

V0 collects owner-entered facts only:

| Field | Purpose |
| --- | --- |
| Business name | Report label |
| City or area | Report context |
| WhatsApp number | Format readiness only |
| Existing WhatsApp link | Optional wa.me/api.whatsapp.com format reference |
| Current customer link | Optional menu/service/public link reference |
| Message intent | Ask, order, book, quote, support, or other |
| Suggested message | Customer's first message text |
| Menu/service link attached | Owner self-report |
| Business hours expectation set | Owner self-report |
| Fallback action shown | Owner self-report |

V0 does not fetch, inspect, verify, store, or send through these sources.

---

## 4. V0 Report Rows

| Row | Result source | Evidence rule |
| --- | --- | --- |
| WhatsApp number | Entered number/link | Checks local format only |
| Click-to-chat format | Entered link or number | Checks wa.me/api.whatsapp.com/phone shape only |
| Message intent | Intent selection and message text | Checks whether the customer action is clear |
| Suggested message | Message text | Checks length and action words only |
| Menu or service link | Entered URL and owner selection | Checks URL format only; does not open the link |
| Hours expectation | Owner selection or message hint | Checks whether reply/timing expectation is visible |
| Fallback action | Owner selection | Checks whether call/booking/public-link fallback is indicated |
| Message delivery | Boundary row | Always `not_checked` in V0 |

Every row includes `evidenceText` explaining what was actually checked.

The untouched form starts with `Other` so it cannot fabricate a message-intent selection. Invalid phone-only input cites phone-shape evidence and gives digits-plus-country-code guidance; it must not claim that a WhatsApp link was checked when no link was entered.

---

## 5. Status Rules

| Status | Meaning |
| --- | --- |
| Ready | Number/link format, message intent, message, menu/service link, hours expectation, and fallback action are present |
| Missing basics | No WhatsApp number/link, or no usable click-to-chat format |
| Unclear | Basic WhatsApp action exists but supporting facts are missing or ambiguous |
| Not checked | Reserved for future adapter-only states |
| Manual review needed | Reserved for future setup/manual-review flows |

V0 should prefer `unclear` over false certainty when owner-entered facts are incomplete.

---

## 6. Out Of Scope

V0 must not:

- send a WhatsApp message
- open a WhatsApp link
- verify the WhatsApp number or account
- fetch the current customer link
- inspect Google, Instagram, Facebook, WhatsApp Business, or any third-party profile
- store the report
- generate an AI rewrite
- create a report API route
- promise ranking, citations, conversion, orders, or delivery

---

## 7. V1 Owner Check

V1 should live inside existing owner surfaces such as Business Health, Public Discovery, Official Business Page readiness, or Share/QR readiness.

V1 can use actual MenuList truth:

- store/project WhatsApp action
- current customer link
- call/booking/order buttons
- public page CTA visibility
- hours/temp-status readiness
- menu/service link readiness

V1 should not create a separate WhatsApp dashboard.

---

## 8. V2 Paid Add-On

Paid behavior is justified only when it adds:

- recurring checks
- saved history
- monthly owner/agency reports
- multi-location action-link consistency
- partner setup reports
- owner-approved repair workflow

A better one-time check is not enough for paid packaging.

---

## 9. Language Rules

Use calm wording:

- "WhatsApp action path is ready"
- "Message text is unclear"
- "Current customer link is missing"
- "WhatsApp was not contacted"

Avoid anxiety or unsupported claims:

- "Your WhatsApp is broken"
- "You are losing orders"
- "We verified WhatsApp"
- "AI visibility opportunity"
- "Ranking improvement"

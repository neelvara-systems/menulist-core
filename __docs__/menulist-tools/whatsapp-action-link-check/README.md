# WhatsApp Action Link Check - Documentation Hub

> **Tool:** WhatsApp Action Link Check
> **Family:** MenuList Public Truth Tools
> **Status:** Implemented - V0 public browser-local checker and V1 owner readiness module
> **Last Updated:** July 5, 2026
> **Version:** 0.1

---

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./whatsapp-action-link-check_spec.md) | Product boundary, user job, and V0/V1/V2 ladder |
| Developers | [Implementation](./whatsapp-action-link-check_impl.md) | Runtime contract, file map, and implementation rules |
| Sales | [Marketing](./whatsapp-action-link-check_marketing.md) | Internal positioning and qualification language |
| Website | [Website](./whatsapp-action-link-check_website.md) | Public page copy and route intent |
| Help | [Help Doc](./whatsapp-action-link-check_helpdoc.md) | Owner-facing support article |
| Firebase | [Firebase](./whatsapp-action-link-check_firebase.md) | Cost, storage, and consent posture |
| Mobile | [Mobile Support](./whatsapp-action-link-check_mobile-support.md) | Mobile admission and responsive behavior |
| QA | [Test Cases](./whatsapp-action-link-check_test-cases.md) | Acceptance and boundary matrix |
| Validation | [Validation](./whatsapp-action-link-check_validation.md) | Implementation evidence and verification log |

---

## What Is This?

WhatsApp Action Link Check is a public V0 MenuList tool that checks whether a customer can tap once to message, order, book, or ask a question through WhatsApp.

The tool is intentionally narrow:

- owner enters the WhatsApp number or link they use
- owner enters the current public menu/service/customer link, if they have one
- owner writes the suggested first customer message
- report shows whether the action path is ready, unclear, missing, or not checked
- next action routes into MenuList's one current customer link path

It does not send a WhatsApp message, verify a WhatsApp account, fetch the linked page, mutate WhatsApp Business, or promise delivery/conversion.

Malformed WhatsApp link parser failures are observable without changing the V0 boundary. The report still treats malformed links as invalid local evidence, and `whatsapp_action_link_url_parse_failed` diagnostics log only value/candidate length, protocol/WhatsApp-shape booleans, and fixed `treat_as_invalid_whatsapp_link` fallback policy. Raw WhatsApp links, phone numbers, suggested messages, customer links, report rows, and exception text are not logged.

---

## Version Ladder

| Version | Product shape | Runtime rule |
| --- | --- | --- |
| V0 | Public free lead magnet at `/tools/whatsapp-action-link-check` | Browser-local deterministic check, optional consented contact handoff |
| V1 | Logged-in MenuList owner check | Implemented inside Business Health using MenuList public page action links, WhatsApp number, CTA settings, and current customer link |
| V2 | Paid add-on behavior | Recurring action-link checks, multi-location governance, agency reports, and WhatsApp-ready handoff packs |

V0 exists to reveal one public action gap and route the owner toward MenuList. Paid value should wait for recurrence, history, multi-location reporting, partner reporting, or owner-approved setup help.

---

## Implemented V0 Route

```txt
/tools/whatsapp-action-link-check
```

Implemented behavior:

- browser-local `self_report` input mode
- deterministic phone/link/message/link-readiness checks
- explicit evidence text on each report row
- copy/download report actions in the browser
- optional consented follow-up through existing `/api/public/contact`
- feature-flag gate through `src/config/features.ts`
- localized copy through `Website.WhatsAppActionLinkCheckPage`

Not implemented in V0:

- WhatsApp API integration
- message sending
- WhatsApp account verification
- external URL fetch
- AI rewrite
- report API route
- report storage
- recurring checks
- multi-location history

---

## Public Promise

Use this plain-language promise:

> Check whether customers have a clear WhatsApp action path before they open your menu, service list, or business page.

Avoid these claims:

- "We verified your WhatsApp account"
- "We sent a test message"
- "We checked your WhatsApp Business profile"
- "We scanned your website"
- "This improves ranking or AI visibility"
- "This guarantees more orders"

---

## Relationship To MenuList

The conversion path is:

```txt
WhatsApp action check
  -> gap report
  -> create or fix one current customer link
  -> add the WhatsApp action to MenuList public truth
```

This keeps WhatsApp as a customer action surface, not the source of truth. MenuList remains the current customer source behind the action.

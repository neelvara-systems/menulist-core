# Booking Inquiry Readiness Check - Specification

**Status:** V0 source-gated evidence; not current launch certification
**Last Updated:** July 2, 2026
**Local Source Gate:** `npm run verify:booking-inquiry-readiness-check`

---

## Product Boundary

Booking Inquiry Readiness Check helps an SMB owner see whether customers have a clear next action from the public source they currently see.

The customer action can be order, book, reserve, call, WhatsApp, visit, request quote, message, or other.

V0 does not open links, inspect booking providers, inspect calendars, check payments, send messages, call AI providers, scan search results, or update external platforms. It also does not promise ranking, citation, AI visibility, conversion, or booking completion.

## Report Contract

Every row includes `evidenceText` so the owner can see what the tool actually checked.

Each report row records:

- check id
- status
- owner-facing label
- `evidenceText`
- required flag
- boundary flags showing what was not checked

## Inputs

V0 accepts:

- business name
- city or area
- source type
- primary customer action
- action text customers see
- action link, phone number, WhatsApp link, email, or customer page
- current public customer link
- owner-selected clarity facts

The public URL and action destination are only format-checked locally.

## Outputs

- overall status
- action-readiness rows
- explicit evidence text
- copy/download report actions
- one MenuList next action
- optional consented contact handoff

## Checks

| Check | Purpose |
| --- | --- |
| Primary action | Customer can tell what to do next |
| Action destination | There is a clear link, number, email, WhatsApp link, or customer page |
| Response expectation | Customer knows what happens after they act |
| Hours context | Customer knows when the action is available |
| Fallback contact | Customer has another way to ask |
| Confirmation expectation | Customer knows if the action is final or needs confirmation |
| Location or service area | Customer understands where to visit or whether they are served |
| Current customer link | There is one current public link customers can use |
| External booking inspection | Explicit V0 boundary row |

## Non-Goals

- No provider login.
- No booking-provider, calendar, inbox, or payment inspection.
- No message sending.
- No external crawling.
- No AI/search provider calls.
- No external platform updates.
- No report storage.
- No ranking, citation, conversion, or booking-completion promise.

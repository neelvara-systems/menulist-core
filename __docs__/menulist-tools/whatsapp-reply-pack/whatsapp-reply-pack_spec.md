# WhatsApp Reply Pack - Specification

**Status:** Implemented V0 public browser-local tool  
**Last Updated:** July 16, 2026

---

## Product Job

Help an SMB owner create reusable WhatsApp replies from the facts they already know, then point the owner toward one current customer link when replies depend on current menu, service, price, hours, delivery, pickup, booking, or order details.

## V0 Scope

V0 accepts owner-entered:

- business name
- city or area
- WhatsApp number
- current customer link
- offer summary
- regular hours or response expectation
- payment notes
- delivery, pickup, booking, order, visit, or quote context

It returns:

- overall status
- reply blocks
- check rows
- explicit evidence text
- local `wa.me` preview text as a non-clicking reference when number shape is usable
- copy/download/shareable report actions
- optional consented follow-up through `/api/public/contact`

Every row includes `evidenceText`.
No AI rewrite is generated.

## V0 must not:

- send a WhatsApp message
- call the WhatsApp Business API
- verify a WhatsApp number
- open WhatsApp or a `wa.me` link
- fetch, crawl, or inspect the current customer link
- update WhatsApp, Google, Instagram, Facebook, websites, directories, or MenuList owner truth
- generate AI rewrites
- store report documents
- promise ranking, citation, AI visibility, delivery, orders, bookings, or conversion

## V1 Scope

V1 may use authenticated MenuList store/project truth to prefill reply facts or show owner-side readiness. It must reuse existing owner context, DAL/cache patterns, and MobileShell targets rather than adding a protected API route only to re-read data already loaded by the owner surface.

## V2 Scope

V2 may become a paid add-on only when recurrence, multi-location governance, saved history, staff handoff, agency export, or owner-approved setup work creates value beyond a one-time reply pack.

## Admission Rule

The tool remains in MenuList Public Truth Tools. It is not a chatbot, WhatsApp sender, support inbox, campaign tool, scheduler, CRM, or external profile updater.

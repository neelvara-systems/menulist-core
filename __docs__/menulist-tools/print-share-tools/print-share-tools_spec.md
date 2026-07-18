# Print & Share Tools - Product Spec

**Last Updated:** July 16, 2026

---

## Decision

Build a small public Print & Share Assets cluster inside MenuList Tools.

These tools are public-use tools, not restricted to MenuList users. They should feel like useful work, not a dashboard preview.

---

## SMB Owner Job

An SMB owner wants to put a current customer link in front of customers quickly:

- on a counter
- near a cashier
- on a table
- in a WhatsApp Status
- in a package insert
- on a holiday-hours notice
- on a feedback card

The owner should enter basic fields, generate an asset, and leave with something usable even if they never signs in.

---

## Tool Set

| Tool | Public route | Primary output |
| --- | --- | --- |
| QR Poster Maker | `/tools/qr-poster-maker` | printable QR poster |
| WhatsApp Menu Status Maker | `/tools/whatsapp-menu-status-maker` | story/status image |
| Holiday Hours Poster Maker | `/tools/holiday-hours-poster-maker` | special-hours poster |
| Customer Link Card Maker | `/tools/customer-link-card-maker` | counter card or small share card |
| Feedback QR Card Maker | `/tools/feedback-qr-card-maker` | ethical feedback QR card |

---

## V0 Contract

V0 must:

- run on public website routes
- use browser-local generation
- accept owner-entered fields only
- accept only a public HTTPS customer link for generated QR targets
- render a visible asset preview
- offer PNG, PDF, print, text report, and shareable report link
- show evidence text for what was checked
- state what was not checked
- route the fix path to creating one current MenuList customer link

V0 must not:

- require login
- upload files
- store generated files
- store reports
- save creative templates
- open or fetch external URLs
- inspect Google, WhatsApp, review pages, social profiles, search results, or AI answers
- send messages or mutate external platforms

The local customer-link check must reject explicit `http://`, localhost, `.local`, private IP, raw IP, and credentialed URLs. When a link fails that public HTTPS check, the report marks the customer link missing and the generated QR target falls back instead of encoding the invalid owner-entered URL.
- claim ranking, citation, traffic, or profile update outcomes

---

## V1 Contract

The owner-side V1 version can later use actual MenuList truth inside existing owner surfaces:

- Share / QR readiness
- Official Business Page readiness
- Business Health
- Public Discovery
- mobile owner shell share actions

V1 reuses existing MenuList truth and DAL/cache patterns through the shared Business Health/Public Truth owner card. It does not create a new dashboard.

---

## V2 Contract

Paid value starts only when work becomes recurring or operational:

- saved asset history
- seasonal packs
- multi-location asset consistency
- agency report exports
- partner setup packs
- managed public source repair

A better one-time asset maker is not enough for V2.

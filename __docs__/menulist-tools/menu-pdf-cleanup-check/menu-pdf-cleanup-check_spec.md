# Menu PDF Cleanup Check - Specification

**Status:** Implemented V0 public tool and V1 owner readiness module
**Last Updated:** July 4, 2026
**Route:** `/tools/menu-pdf-cleanup-check`
**Local Source Gate:** `npm run verify:menu-pdf-cleanup-check`

## Owner Job

An SMB owner wants to know:

> Is my old PDF still usable for customers, or should I replace it with one current customer link?

This is common for restaurants, salons, clinics, repair shops, catalog businesses, rentals, tutors, and service providers. PDFs often remain on websites, Google profiles, WhatsApp threads, Instagram bios, QR prints, counter cards, flyers, or old messages after prices and availability have changed.

## Product Fit

Menu PDF Cleanup Check belongs inside MenuList Tools because it reveals a public truth/setup gap and routes the owner toward one current MenuList customer source.

It should stay framed as public source cleanup, not PDF processing.

## V0 Public Free Tool

V0 accepts:

- business name
- city or area
- PDF type
- where customers see the PDF
- owner-entered PDF reference, link, filename, QR label, or note
- self-reported last updated window
- owner-selected readability/clarity facts
- optional current customer link

V0 returns:

- overall status
- 3-9 check rows
- explicit evidence text
- one next action
- copy/download report
- optional consented follow-up through the existing contact route

Every row includes `evidenceText` that says what was checked.

V0 does not upload files, parse PDFs, run OCR, open links, fetch external URLs, call AI providers, scan search results, or update external platforms.

## V1 Logged-In Owner Check

V1 uses actual MenuList store/project truth:

- selected/default project exists
- selected/default project has items/content
- public customer link readiness
- current MenuList menu/source readiness

It appears as an owner readiness module:

> PDF cleanup readiness

The module stays inside existing Business Health / Public Discovery surfaces and links to the menu editor or customer-link setup. It does not create a new dashboard.

## V2 Paid Add-On Lane

V2 is justified only when recurrence, history, reporting, or multi-location operations create real value:

- monthly PDF cleanup report
- saved history
- multi-location old-PDF replacement report
- agency/client export
- owner-approved managed repair

V2 must not become automatic PDF crawling, OCR, external deletion, external platform mutation, or unbounded file storage without a separate approved integration spec.

## Check Rows

| Check | V0 Evidence Source |
| --- | --- |
| PDF source present | Owner-entered PDF reference, location, or PDF type only |
| PDF source current | Owner self-reported last-updated window only |
| Mobile readability | Owner-selected visible fact only |
| Text copyability | Owner-selected visible fact only |
| Items and prices clear | Owner-selected visible fact only |
| Action path | Owner-selected visible fact only |
| QR or print dependency | Owner-selected visible fact only |
| Current customer link | Local URL-format check only |
| External PDF inspection | Always not checked in V0 |

## Non-Goals

- no file upload in V0
- no PDF parsing
- no OCR
- no URL fetch
- no external PDF verification
- no QR image decoding
- no old PDF deletion
- no external platform mutation
- no AI/search call
- no report storage in V0

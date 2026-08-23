# Print Menu Surfaces Spec

**Status:** Implemented
**Last Updated:** June 25, 2026

## Executive Summary

SMB owners need physical menu objects customers can scan at tables, counters, and entrances without hiring a designer. Print Menu Surfaces provides those scan-first files from existing MenuList business identity and menu links.

This feature is separate from full menu PDF export and separate from social image downloads. The output is meant to be printed, laminated, folded, placed in acrylic holders, or handed to a print shop.

## Goals

- Make tabletop menu access look professional and easy to scan.
- Keep QR reliability stronger than decoration.
- Reuse the existing business name, logo, brand color, live menu URL, short URL, business type, and Multi-location attribution rule.
- Keep desktop and mobile downloads visually identical.
- Add no Firebase cost.

## Non-Goals

- No owner-facing design editor.
- No QR color picker.
- No seasonal templates.
- No stock food imagery.
- No separate item/menu database.
- No server-rendered image/PDF storage.

## Current Surface Set

| Surface | Purpose | Format |
| --- | --- | --- |
| Table Tent | Customer opens the live menu from a table. | A5 landscape PDF, folds to two A6 portrait faces. |
| Single Table / Counter Card | Customer scans from acrylic holders, counter stands, wall clips, or single-sided table stands. | A6 portrait PDF. |
| Counter Sticker | Customer scans near payment/pickup. | 8x8 cm PNG, owned by Menu Kit but follows shared tokens. |
| Entrance Poster | Customer checks menu before entering. | A4 PDF, owned by Menu Kit but follows shared tokens. |

The table tent and single table/counter card are owned by Print Menu Surfaces. Counter and entrance outputs remain compatible consumers until their layouts need deeper physical-surface ownership.

## Customer-Facing Rules

- The QR must be the main object on table-facing surfaces.
- QR modules stay near-black on white.
- QR quiet zone must be preserved with a generated four-module margin.
- Use brand color for CTA and framing, not for QR modules.
- Use the old-card visual structure owners already recognized: brand top band, floating white card, centered QR, scan line, short link, and footer attribution.
- The instruction must be short: scan code, view menu.
- Store name must fit within the card; long names are truncated.
- MenuList attribution is visible unless the already-loaded plan is Multi-location (`menulist_multi_location`).
- Business logo/initials stay outside the QR pattern. Do not add a center-logo QR overlay until scan-regression coverage exists.
- Approved trust language is factual: current menu, service list, catalog, live page, short link, and powered-by attribution. Do not use "official", "verified", "secure", "no spam", WhatsApp badge, or WhatsApp opt-in copy on normal MenuList page QR surfaces.
- Normal menu/page QR scans should go straight to the live page. A preview interstitial is a separate WhatsApp/consent feature, not part of Print Menu Surfaces.

## Owner Flow

1. Owner opens Use MenuList or Share on desktop/mobile.
2. Owner downloads the table tent, single table/counter card, or complete Menu Kit.
3. File is generated locally in the browser.
4. Owner prints on card stock or sends the file to a printer.
5. Customers scan the QR and open the current live menu.

## Acceptance Criteria

- Table tent is portrait on each standing face, not a poster-style landscape face.
- Single table/counter card is a normal upright A6 portrait PDF and does not rotate any face.
- QR is black/near-black and at least 59 mm on the A6 face.
- QR renderers use a four-module quiet zone.
- Output includes short URL fallback.
- Menu Kit still bundles the table tent and single table/counter card.
- Mobile and desktop use the same generator.
- Disabling future print-surface UI must not require backend changes.

# Branded QR Action Templates Test Cases

**Status:** Editor-backed alignment layer
**Last Updated:** June 26, 2026

## Docs Alignment Tests

- Printable Asset Templates references branded QR action templates as a scan-safe template layer.
- Print Assets keeps normal QR files direct to the live page.
- Menu Kit stays focused on current MenuList deployment surfaces.
- QR WhatsApp Experiments owns measured WhatsApp campaign behavior.
- Changelog records editor-backed alignment.

## Creative Editor Tests

- QR drawer shows guided action presets for Menu, Feedback, Order, Offer, Book, and Loyalty.
- Adding an action card creates editable frame, headline, helper, destination hint, QR panel, and QR layers.
- Action-card QR uses `errorCorrectionLevel: "H"`, `margin: 4`, and `lightColor: "#ffffff"`.
- Plain QR insertion still works for simple QR-only use cases.
- QR drawer and selected-QR inspector do not expose raw QR background color controls.
- Legacy non-white QR layers can be repaired with Reset white scan panel.
- Project style changes do not recolor QR light modules away from white.
- Campaign starters that include QR preserve the same scan-safe QR defaults.

## Runtime Safety Tests For Future Work

- Template has exactly one primary action.
- QR source layer uses a four-module quiet zone.
- QR modules are high contrast.
- Brand/logo artwork stays outside the QR pattern.
- Short link or destination hint is visible where space allows.
- Owner cannot unlock or replace the protected QR destination accidentally.
- Mobile uses the same renderer as desktop.

## Rejection Tests

- Artistic QR treatment is rejected without scan-regression coverage.
- Low contrast QR treatment is rejected.
- Logo overlay inside finder patterns is rejected.
- Standard Assets download does not create scan/click ledgers.
- WhatsApp consent copy does not appear on normal menu QR outputs.

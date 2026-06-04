# Use MenuList — Mobile Support

> **Version:** 1.2
> **Last Updated:** June 3, 2026

## Feature Admission Test

| Gate | Result | Reason |
|------|--------|--------|
| Frequency | PASS | Owners copy menu links daily from their phone |
| Speed | PASS | Copy link < 3 seconds, download < 10 seconds |
| Touch | PASS | Large buttons, single-tap actions |
| Value | PASS | Owners are IN the restaurant when they need this |

**Verdict:** PASS — Mobile is the PRIMARY surface for this feature.

## Mobile Architecture

- Desktop: full `UseMenuList` page with asset generation, guides, and broader distribution tooling
- Mobile: dedicated `MobileShareScreen.tsx` is the phone-side output center for the same owner distribution jobs
- Shared logic: same DAL/data sources for project links, OBP links, feedback links, screen state, selected project data, PDF fallback bridge, structured export, Menu Kit generation, and Menu Card Export route entry

## Mobile UX Requirements

1. Quick Actions buttons: min 48px height, full-width on mobile
2. Copy confirmation toast visible at bottom
3. Cards stack vertically on < 768px
4. Download triggers native file save dialog
5. Preview modals scale to viewport
6. No horizontal scrolling

## Current Mobile Contract

Mobile covers the owner output actions that previously required desktop:
- copy/open main menu link
- copy/open direct project link
- copy/open feedback link
- show/download Store Menu QR, Business Profile QR, Project Menu QR, and outlet-scoped Store Menu QRs for master owners
- open Menu Card Export / Print Menu for full PDF or print-shop packet creation
- download the selected menu PDF through the Menu Card Export renderer bridge when the routed Print Menu feature is not the active path
- export the selected menu data as XLSX or JSON
- download the complete Menu Kit ZIP
- download/share Menu Kit print and social assets: table tent, single table card, counter sticker, entrance poster, Instagram story, WhatsApp status, Google Maps image
- download feedback QR when feedback is enabled
- copy/open Menu Board and Highlights digital screen links, with setup handoff when screens are not configured
- menu presence monitor
- customer communication kit
- copy POS provider setup details and jump to POS settings when permitted
- setup, printing, and sharing guide sheets
- project switching for multi-project stores

Desktop and mobile are now parity for practical owner distribution actions. Desktop may still present some actions with a wider layout or modal preview, but owners should not need a laptop to deploy links, QRs, screen URLs, print files, exports, POS setup details, or staff guides.

## Branded Output Parity

Mobile Share does not use a mobile-only QR or print renderer. Store Menu QR, Business Profile QR, Project Menu QR, outlet QRs, feedback QR, Menu Kit assets, Print Menu Surfaces assets, and Print Menu output all reuse the same store logo/color context, the same brand-gradient framing with near-black scan-safe QR panel treatment, and the same Premium-only MenuList attribution removal rule as desktop. This prevents mobile downloads from looking like plain black-and-white copies while desktop output looks premium.

The tabletop table tent and single table/counter card are owned by Print Menu Surfaces and consumed through the same `generateMenuKit()` path on desktop Use MenuList and mobile Share. Mobile must not create separate print-surface renderers or navigate out of the PWA shell to download them.

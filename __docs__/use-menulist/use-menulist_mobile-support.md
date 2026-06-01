# Use MenuList — Mobile Support

> **Version:** 1.2
> **Last Updated:** May 22, 2026

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
- Shared logic: same DAL/data sources for project links, OBP links, feedback links, screen state, selected project data, legacy PDF fallback, structured export, Menu Kit generation, and Menu Card Export route entry

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
- download the selected menu PDF only while the legacy fallback remains available
- export the selected menu data as XLSX or JSON
- download the complete Menu Kit ZIP
- download/share Menu Kit print and social assets: table tent, counter sticker, entrance poster, Instagram story, WhatsApp status, Google Maps image
- download feedback QR when feedback is enabled
- copy/open Menu Board and Highlights digital screen links, with setup handoff when screens are not configured
- menu presence monitor
- customer communication kit
- copy POS provider setup details and jump to POS settings when permitted
- setup, printing, and sharing guide sheets
- project switching for multi-project stores

Desktop and mobile are now parity for practical owner distribution actions. Desktop may still present some actions with a wider layout or modal preview, but owners should not need a laptop to deploy links, QRs, screen URLs, print files, exports, POS setup details, or staff guides.

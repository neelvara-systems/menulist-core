# Use MenuList — Mobile Support

> **Version:** 1.1
> **Last Updated:** May 21, 2026

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
- Mobile: dedicated `MobileShareScreen.tsx` optimized for fast in-service actions, mobile PDF download, and Menu Kit asset downloads
- Shared logic: same DAL/data sources for project links, OBP links, feedback links, selected project data, PDF generation, and Menu Kit generation

## Mobile UX Requirements

1. Quick Actions buttons: min 48px height, full-width on mobile
2. Copy confirmation toast visible at bottom
3. Cards stack vertically on < 768px
4. Download triggers native file save dialog
5. Preview modals scale to viewport
6. No horizontal scrolling

## Current Mobile Contract

Mobile prioritizes the highest-frequency sharing and in-service print actions:
- copy/open main menu link
- copy/open direct project link
- copy/open feedback link
- download the selected menu PDF
- download the complete Menu Kit ZIP
- download/share Menu Kit print and social assets: table tent, counter sticker, entrance poster, Instagram story, WhatsApp status, Google Maps image
- download feedback QR when feedback is enabled
- digital screen links
- menu presence monitor
- customer communication kit
- project switching for multi-project stores

Desktop remains the richer distribution workspace for full guides, screen setup details, and broader output-center context.

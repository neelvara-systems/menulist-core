# Use MenuList — Mobile Support

> **Version:** 1.6
> **Last Updated:** June 29, 2026

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
- Mobile Share copied feedback and copy-driven starter activation signals must wait for Clipboard API or acknowledged textarea fallback success.
- Shared logic: same DAL/data sources for project links, OBP links, feedback links, screen state, selected project data, PDF fallback bridge, structured export, Menu Kit generation, and Menu Card Export route entry
- Mobile output actions should not create project truth. Default project creation remains limited to the mobile menu-management provider/shell when the owner enters menu editing.

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
- copy/open direct project link, with copied feedback only after Clipboard API or acknowledged textarea fallback success
- copy/open feedback link
- show/download Store Menu QR, Business Profile QR, Project Menu QR, and outlet-scoped Store Menu QRs for master owners
- open Menu Card Export / Print Menu for full PDF or print-shop packet creation
- download the selected menu PDF through the Menu Card Export renderer bridge when the routed Print Menu feature is not the active path
- export the selected menu data as XLSX or JSON
- download the complete Menu Kit ZIP
- open Print Assets inside the mobile PWA shell
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

## Diagnostics Boundary

Desktop share cards for Business Profile, Project Menu, and Customer App install links must log failed copy, copy-message, WhatsApp handoff, and direct-open actions through `share_link_card_copy_failed`, `share_link_card_copy_message_failed`, `share_link_card_whatsapp_open_failed`, and `share_link_card_open_failed` with bounded card/caller/link/message-length metadata only. Copied feedback must wait for Clipboard API or acknowledged textarea fallback success; failed copy diagnostics may include clipboard/fallback support booleans. WhatsApp and direct opens must use `noopener,noreferrer`; failed WhatsApp opens may log generated URL length but not raw public links or message bodies.

Shared mobile QR actions use `MobileQrCodeSheet`. Failed QR generation, clipboard copy, and download setup must log `mobile_qr_sheet_generate_failed`, `mobile_qr_sheet_copy_failed`, and `mobile_qr_sheet_download_failed` through mobile owner diagnostics before showing fixed owner copy. Diagnostics may record bounded source, URL, filename, title, helper text, store-name, plan, logo/brand, generated-image, visibility, action, and source error metadata only. Do not log raw public URLs, QR payloads, data URLs, filenames, store names, owner copy, downloaded file bodies, or provider/browser exception text.

The mobile customer communication kit uses generated customer message templates for copy, native share, and WhatsApp handoff actions. Failed actions must log `mobile_communication_kit_copy_failed`, `mobile_communication_kit_native_share_failed`, and `mobile_communication_kit_whatsapp_open_failed` with bounded Mobile Share context, template metadata, message lengths, generated WhatsApp URL length, action, native-share support, and source error metadata only. Desktop Communication Kit copy and WhatsApp handoff failures must log `use_menulist_communication_kit_copy_failed` and `use_menulist_communication_kit_whatsapp_open_failed` with bounded Use MenuList context, generated-message lengths, and generated WhatsApp URL length only. Desktop and mobile copied feedback must wait for Clipboard API or acknowledged textarea fallback success; rejected Clipboard API writes must fall through to the acknowledged fallback when it is available. Failed copy diagnostics may include clipboard/fallback support booleans. Desktop and mobile WhatsApp opens must use `noopener,noreferrer`. Do not log raw generated messages, WhatsApp URLs, phone numbers, addresses, store names, project names, public URLs, menu text, or browser exception text.

The mobile Presence Monitor confirms or removes owner-confirmed Google Business, Instagram Bio, and WhatsApp Profile placements through `updateMenuPresence()`, copies the official business link with source attribution, and opens external guide links with `noopener,noreferrer`. Official-link copied feedback must wait for Clipboard API or acknowledged textarea fallback success. Failed copy, external-open, confirm, and remove actions must log `mobile_presence_official_link_copy_failed`, `mobile_presence_external_open_failed`, `mobile_presence_confirm_failed`, and `mobile_presence_remove_failed` with bounded store/tenant, OBP-link, external URL, surface, active-count, published/feedback, starter-signal, action, clipboard/fallback support, and source error metadata only. Do not log raw official business links, external platform URLs, store names, surface labels, owner-entered values, external platform content, store IDs, tenant IDs, or browser/Firestore exception text.

Desktop parity note: desktop Use MenuList must log failed Digital Screen link reads through `use_menulist_screen_links_load_failed` with bounded context only. Mobile already logs the matching Mobile Share screen-link failure through `mobile_share_screen_links_load_failed`.

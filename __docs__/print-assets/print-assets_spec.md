# Print Assets Spec

**Status:** Implemented
**Last Updated:** June 21, 2026

## Problem

SMB owners need physical assets customers can see, scan, or carry from the shop: table cards, counter QR, entrance posters, feedback QR, paper menus, campaign flyers, gift certificates, front/back business cards, ID cards, invitations, postcards, product tags, and offer posters. These assets are operationally important, but they were scattered inside Use MenuList and mobile Share or were missing from the first Assets catalog.

## Goal

Create one focused owner workspace for printables while keeping Use MenuList as the broad deployment overview.

## Route

- Desktop primary route: `/assets`
- Desktop compatibility route: `/use-menulist/print-assets`
- Mobile: `/assets` and `/use-menulist/print-assets` both map into `MobileShell` as the `printAssets` More sub-screen.

## Included Assets

| Asset | Purpose |
| --- | --- |
| Table Tent | Folded tabletop QR card. |
| Single Table Card | Upright A6 table/counter card. |
| Counter Sticker | Billing/pickup counter QR. |
| Entrance Poster | Door/window/host stand QR. |
| Feedback QR | Private feedback scan point when enabled. |
| Flyer | A5 handout or delivery insert for offers, launches, and events. |
| Gift Certificate | Voucher-style file for gift, credit, or prepaid offer use. |
| Business Card | Front and back business card in one print-ready output file. |
| ID Card | Portrait owner, staff, or service identity card. |
| Invitation | A6 card for events, openings, workshops, or specials. |
| Postcard | A6 landscape mailer for thanks, reminders, offers, or local drops. |
| Product Tag | Small retail, bakery, pickup, or counter item tag. |
| Campaign Poster | A4 offer poster for windows, counters, and local campaigns. |
| Print Menu PDF | Full printable menu workflow. |
| Complete Menu Kit | ZIP bundle with print/social/placement files. |

## Included Owner Support

| Support | Purpose |
| --- | --- |
| Print readiness | Shows whether live link, logo, brand color, business name length, and feedback QR state are ready before printing. |
| Image-first output preview | Opens a clean image preview of the selected template without browser PDF controls; PDF/image downloads remain separate actions. |
| Print-shop handoff | Copies plain file specs that can be sent with the ZIP to a local printer. |
| Reprint guidance | Explains when reprinting is needed and when live QR updates avoid reprinting. |

## Product Rules

- No blank design editor or open-ended creative workspace.
- No low-level owner-facing QR controls.
- Supported single print assets may open a governed editor document for practical desktop copy/layout fixes.
- Reuse existing logo, brand color, menu URL, project selection, and plan-aware MenuList attribution.
- Desktop and mobile outputs must come from the same generator path.
- Generated artifacts stay client-side unless a separate print-shop fulfillment feature is approved.
- Explicitly saved editor templates may use the Creative Editor Template Registry; this is separate from generated file storage and does not run on preview/download.
- Do not add quantity estimation in this feature. It adds planning friction and can be handled by the owner/printer without product logic.

## Acceptance Criteria

- Owner can open Assets from Use MenuList.
- Owner can open Assets from mobile More.
- Mobile Share can open the focused Assets screen without route reload.
- Multiple projects use the same project selector behavior as Use MenuList/mobile Share.
- Menu Kit asset indices are centralized in `src/lib/print-assets/printAssetCatalog.ts`.
- Readiness, print-shop handoff, and reprint guidance come from shared print-assets helpers on desktop and mobile.
- Table/card/sticker/poster/flyer/gift/business-card/ID-card/invitation/postcard/tag previews render by semantic asset key and do not build the full ZIP.
- Firebase cost remains zero for generated printable assets. Saved owner templates are optional explicit saves with bounded registry metadata and Storage JSON cost.

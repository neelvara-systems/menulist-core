# Print & Share Tools - Documentation Hub

> **Feature:** MenuList Print & Share Tools
> **Route Family:** `/tools/*-maker`
> **Status:** Implemented public V0 asset makers with V1 owner readiness coverage
> **Last Updated:** July 16, 2026

---

## Purpose

Print & Share Tools are public, browser-local MenuList tools that turn one public HTTPS customer link into simple assets an SMB owner can use immediately.

They exist because owners often need the work product before they understand the dashboard: a QR poster, WhatsApp Status image, holiday-hours poster, counter card, or feedback QR card. Each tool keeps the same MenuList funnel:

```txt
free public tool -> useful asset and shareable report -> one current customer link -> paid work only when recurrence, setup, multi-location, or agency reporting is real
```

These tools are not restricted to MenuList users. They do not require login.

---

## Public Routes

| Tool | Route | Owner job |
| --- | --- | --- |
| QR Poster Maker | `/tools/qr-poster-maker` | Make a printable QR poster for one current customer link |
| WhatsApp Menu Status Maker | `/tools/whatsapp-menu-status-maker` | Make a story/status image that points customers to the current link |
| Holiday Hours Poster Maker | `/tools/holiday-hours-poster-maker` | Make a special-hours poster with the current link visible |
| Customer Link Card Maker | `/tools/customer-link-card-maker` | Make a counter card or business-card style QR asset |
| Feedback QR Card Maker | `/tools/feedback-qr-card-maker` | Make an ethical feedback QR card from an owner-provided link |

---

## Boundary

V0 stays narrow:

- public route
- browser-local asset rendering
- owner-entered fields only
- no login
- no file upload
- no saved template
- no report storage
- no Firestore read/write
- no Storage operation
- no Cloud Function
- no AI/provider call
- no external URL fetch
- no Google, WhatsApp, review, search, or social inspection
- no external platform update

Customer-link readiness is a local format check only: the QR target must be a public HTTPS customer link. Print & Share uses the same shared parser as the sixteen truth tools. Explicit `http://`, localhost including trailing-dot forms, `.local`, private/raw IPv4, raw IPv6 including IPv4-mapped IPv6, empty hostname labels, and credentialed URLs are treated as missing basics, and the generated QR falls back away from that invalid target.

The output can be downloaded as PNG/PDF, printed, copied as a text report, downloaded as a text report, or shared through the existing public shareable-report hash link. The generated public report URL is visible in a readonly field so the owner can open or manually copy it even when browser clipboard permissions are blocked.

V1 owner readiness is covered by the `print_share_assets` module inside the existing Business Health/Public Truth owner card. It checks only MenuList customer-link, identity, and customer action readiness before owners print or share QR posters, status images, counter cards, or feedback cards. It does not inspect printed materials, QR scans, social posts, or external pages.

---

## Shared Implementation

Core files:

- `src/lib/public-asset-tools/printShareToolConfig.ts`
- `src/lib/public-asset-tools/printShareToolTypes.ts`
- `src/lib/public-asset-tools/printShareToolReport.ts`
- `src/lib/public-asset-tools/printShareToolRender.ts`
- `src/components/website/printShareTools/PrintShareToolPage.tsx`

The implementation uses the existing creative-editor template contract to create a `CreativeEditorDocument`, but it does not expose the full editor and does not write into the owner template registry.

---

## Source Gate

```bash
npm run verify:print-share-tools
npm run verify:tools-hub
npm run verify:shareable-tool-reports
npm run verify:public-truth-tools
```

# Menu PDF Cleanup Check - Implementation

**Status:** Implemented
**Last Updated:** July 4, 2026
**Local Source Gate:** `npm run verify:menu-pdf-cleanup-check`

## Runtime Boundary

Public route: `/tools/menu-pdf-cleanup-check`

Files:

- `src/app/(website)/tools/menu-pdf-cleanup-check/page.tsx`
- `src/components/website/menuPdfCleanupCheck/MenuPdfCleanupCheckPage.tsx`
- `src/lib/public-truth-tools/menuPdfCleanupTypes.ts`
- `src/lib/public-truth-tools/menuPdfCleanupReport.ts`
- `src/lib/public-truth-tools/ownerPublicTruthReadiness.ts`
- `scripts/verification/verify-menu-pdf-cleanup-check.js`

Feature flags:

- `ENABLE_PUBLIC_TRUTH_TOOLS: true`
- `ENABLE_PUBLIC_TRUTH_MENU_PDF_CLEANUP_CHECK: true`

## Report Contract

Each check item uses:

```ts
evidenceText: string
```

The UI must render `check.evidenceText` directly so the report cannot imply upload, parsing, OCR, crawling, external inspection, AI analysis, or hidden confidence scoring.

## Deterministic V0 Checks

The builder in `menuPdfCleanupReport.ts` uses owner-entered values only:

- PDF type
- PDF location
- owner-entered reference/link/filename/note
- self-reported last-updated window
- selected readability/clarity facts
- optional current customer link string

The customer-link check is format-only. The link is not opened or fetched.

Do not add file upload, PDF parsing, OCR, external URL fetches, QR image decoding, external source crawling, AI/search provider calls, or report storage in V0.

## Boundaries

The report boundaries must stay false:

- `pdfUploaded: false`
- `pdfParsed: false`
- `ocrUsed: false`
- `externalUrlFetched: false`
- `fileStored: false`
- `reportStored: false`
- `externalPlatformUpdated: false`
- `aiOrSearchChecked: false`
- `rankingPromise: false`

## Owner V1 Module

Owner readiness is computed in `ownerPublicTruthReadiness.ts`.

Module:

- id: `menu_pdf_cleanup`
- title: `PDF cleanup readiness`
- mobile fix target: `menu_tab` or `domain_settings`
- source: selected/default MenuList project and public customer-link readiness only

Evidence must state:

> Checked selected/default MenuList menu content and customer link readiness only. External PDFs, file uploads, QR scans, print materials, Google, websites, social links, OCR, and AI/search were not checked.

## Optional Contact Handoff

The public page may submit a consented follow-up to `/api/public/contact`. This is not report storage. It is the existing public contact enquiry path.

The component must use:

- `cache: 'no-store'`
- `credentials: 'same-origin'`
- `redirect: 'manual'`
- bounded response parsing through `readMenulistPublicContactResponseJson`
- shaped acknowledgement guard through `isAcceptedMenulistPublicContactResponse(result, 'general')`
- Turnstile when configured

## Verification

`npm run verify:menu-pdf-cleanup-check` must check:

- route exists and is feature-flagged
- docs exist under `__docs__/menulist-tools/menu-pdf-cleanup-check/`
- locale keys exist
- discovery, sitemap, `llms.txt`, and `llms-full.txt` include the route
- no report API route exists
- report and type boundaries are false
- no upload/PDF parsing/OCR/fetch/provider/storage behavior appears in V0 files
- owner module exists with explicit external-PDF exclusion evidence

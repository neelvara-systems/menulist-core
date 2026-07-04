# Menu PDF Cleanup Check - Test Cases

**Last Updated:** July 4, 2026

## Route and Flag Tests

| Case | Expected |
| --- | --- |
| Visit `/tools/menu-pdf-cleanup-check` with flags enabled | Page renders |
| Disable `ENABLE_PUBLIC_TRUTH_TOOLS` | Route returns not found |
| Disable `ENABLE_PUBLIC_TRUTH_MENU_PDF_CLEANUP_CHECK` | Route returns not found |
| Route metadata | Title, description, canonical, and structured data use `/tools/menu-pdf-cleanup-check` |

## V0 Report Tests

| Case | Expected |
| --- | --- |
| No PDF reference, unknown location, unknown PDF type | `missing_basics` |
| Recent PDF, mobile readable, clear prices, clear action, valid current link | Ready or near-ready report |
| Older-than-3-months PDF | Currentness row is unclear |
| Not mobile readable | Mobile readability row is unclear |
| Missing price clarity | Items/prices row is missing |
| Missing action path | Action path row is missing |
| QR or print still points to PDF | QR/print dependency row is unclear |
| Invalid customer link | Current customer link is unclear |
| External inspection row | Always not checked |

## Boundary Tests

| Case | Expected |
| --- | --- |
| No report API route | `src/app/api/menu-pdf-cleanup-check/report/route.ts` does not exist |
| No upload | V0 files do not use file input, FileReader, Storage, or uploadBytes |
| No PDF parsing | V0 files do not use PDF.js, pdf-parse, OCR, or parser calls |
| No external URL fetch | V0 files do not fetch owner-entered links |
| No AI/search calls | V0 files do not call OpenAI, Gemini, search, or AI provider routes |
| Evidence text | UI renders `check.evidenceText` |

## Owner V1 Tests

| Case | Expected |
| --- | --- |
| No menu source | PDF cleanup module needs attention |
| Menu source but no customer link | Module needs attention |
| Project data not loaded | Module status is check |
| Menu content and customer link present | Module is ready |
| Evidence | States external PDFs, uploads, QR scans, print materials, Google, websites, social links, OCR, and AI/search were not checked |

## Source Gate

```bash
npm run verify:menu-pdf-cleanup-check
npm run verify:public-truth-tools
```

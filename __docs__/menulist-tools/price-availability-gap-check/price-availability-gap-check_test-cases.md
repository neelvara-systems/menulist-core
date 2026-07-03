# Price Availability Gap Check - Test Cases

## Route and Flag Tests

| Case | Expected |
| --- | --- |
| Visit `/tools/price-availability-gap-check` with flags enabled | Page renders |
| Disable `ENABLE_PUBLIC_TRUTH_TOOLS` | Route returns not found |
| Disable `ENABLE_PUBLIC_TRUTH_PRICE_AVAILABILITY_GAP_CHECK` | Route returns not found |
| Route metadata | Title, description, canonical, and structured data use `/tools/price-availability-gap-check` |

## V0 Report Tests

| Case | Expected |
| --- | --- |
| Empty source text | `missing_basics` |
| Pasted menu with prices and current URL | Price clarity and current link present |
| Quote-based service with contact path | Price clarity is present through quote/contact path |
| Variant words without variant prices | Variant/package price row is unclear |
| Unavailable/sold-out wording | Unavailable-items row is present |
| Invalid public URL | Current customer link is unclear |
| No public URL | Current customer link is missing |
| External inspection row | Always not checked |

## Boundary Tests

| Case | Expected |
| --- | --- |
| No report API route | `src/app/api/price-availability-gap-check/report/route.ts` does not exist |
| No external URL fetch | V0 files do not fetch owner-entered URL |
| No POS checks | V0 files do not contain POS or inventory calls |
| No ordering-provider checks | V0 files do not inspect ordering providers |
| No upload | V0 files do not use file input, FileReader, Storage, or uploadBytes |
| No AI/search calls | V0 files do not call OpenAI, Gemini, search, or AI provider routes |
| Evidence text | UI renders `check.evidenceText` |

## Owner V1 Tests

| Case | Expected |
| --- | --- |
| No menu source | Price and availability module needs attention |
| Project data not loaded | Module status is check |
| Items without prices | Module needs attention |
| Some items or variants missing prices | Module status is check |
| Prices and explicit availability flags present | Module is ready |
| Evidence | States POS, live inventory, ordering providers, external menus, and AI/search were not checked |

## Source Gate

```bash
npm run verify:price-availability-gap-check
npm run verify:public-truth-tools
```

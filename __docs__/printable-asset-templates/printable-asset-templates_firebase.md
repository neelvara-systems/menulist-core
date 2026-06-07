# Printable Asset Templates - Firebase Cost Analysis

## Summary

Normal Printable Asset Templates generation has **zero new Firestore reads, zero Firestore writes, zero Storage uploads, and zero Cloud Function invocations**.

The feature reuses already-loaded owner/store/project/menu data and generates files in the browser with Canvas, jsPDF, QR rendering, pdfjs-dist PDF page rendering, and JSZip.

There are **No new Cloud Functions** and **No new Firestore indexes** for this feature.

## Operation Ledger

| Operation | Firestore Reads | Firestore Writes | Storage | Functions | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Open `/assets` after dashboard data is loaded | 0 new | 0 | 0 | 0 | Reuses existing owner/project/store context. |
| Select asset type | 0 | 0 | 0 | 0 | Local UI state only. |
| Open template actions | 0 | 0 | 0 | 0 | Local UI state only. |
| Preview asset | 0 | 0 | 0 | 0 | Temporary browser blob URL only; modal/sheet preview is generated client-side. |
| Download single PDF/image | 0 | 0 | 0 | 0 | Local generation and browser download; alternate format conversion stays in-browser. |
| Download Menu Kit ZIP | 0 | 0 | 0 | 0 | Local JSZip generation. |
| Mobile preview/download | 0 | 0 | 0 | 0 | Same generator as desktop. |
| Premium branding check | 0 new | 0 | 0 | 0 | Uses existing active plan context. |

## Data Sources

| Data | Existing Source |
| --- | --- |
| Store name/logo/color | Existing store context and brand token resolver. |
| Project/menu URL | Existing Use MenuList/Share data. |
| Menu content and currency for Print Menu | Existing Print Menu / Menu Card Export source. |
| Feedback URL | Existing feedback setup state. |
| Plan type | Existing active subscription/session context. |

## Explicit Cost Rejections

| Rejected Pattern | Reason |
| --- | --- |
| Saving generated PDFs to Firebase Storage | Adds storage cost and cleanup lifecycle. |
| Persisting default template per project in Firestore | Adds writes for a preference that is not essential. |
| Creating a Cloud Function render service | Browser generation is already sufficient. |
| Writing preview history | Owner value is low and cost is avoidable. |
| Analytics Firestore event per download | Use existing free/non-Firestore analytics path if needed. |

## Optional Paid Style Suggestion

If an explicit paid style suggestion is enabled, it must follow the existing AI accounting pattern:

- Owner clicks a clear action.
- Plan is checked before provider call.
- Rate limit and safe mode run before provider call.
- One operation is accounted only after a valid provider response.
- Starter is blocked before provider call.

This optional path is not required for the governed template catalog.

## Monthly Cost Estimate

| Scenario | Firebase Cost |
| --- | --- |
| 1,000 owners open Assets and download 5 files each | $0 incremental Firebase cost. |
| 1,000 owners preview supported templates for each asset | $0 incremental Firebase cost. |
| 1,000 owners download Menu Kit ZIP | $0 incremental Firebase cost. |

Runtime CPU/memory cost is on the owner browser. Large Menu Kit ZIP downloads should show progress and avoid parallel generation loops beyond the existing safe generator behavior.

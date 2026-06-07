# Printable Asset Templates - Firebase Cost Analysis

## Summary

Normal Printable Asset Templates generation has **zero Firestore writes, zero Storage uploads, and zero Cloud Function invocations**. Non-menu printable assets use the already-loaded project summary/store context. Print Menu needs the full project/menu document once per selected project when it is not already cached.

The feature reuses already-loaded owner/store/project/menu data where available and generates files in the browser with Canvas, jsPDF, QR rendering, the existing browser-compatible PDF.js preview loader, and JSZip.

There are **No new Cloud Functions** and **No new Firestore indexes** for this feature.

## Operation Ledger

| Operation | Firestore Reads | Firestore Writes | Storage | Functions | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Open `/assets` after dashboard data is loaded | Existing project summary read | 0 | 0 | 0 | Reads the summary document without creating a default project. |
| Select asset type | 0 | 0 | 0 | 0 | Local UI state only. |
| Open template actions | 0 | 0 | 0 | 0 | Local UI state only. |
| Preview non-menu asset | 0 | 0 | 0 | 0 | Temporary browser blob URL only; modal/sheet preview is generated client-side. |
| Preview Print Menu | 0-1 | 0 | 0 | 0 | Reuses cached full project data when available; otherwise reads the selected project once and caches it for subsequent preview/download actions. |
| Download single PDF/image | 0-1 | 0 | 0 | 0 | Same cached selected-project behavior for Print Menu; other assets stay at 0 reads. |
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
| 1,000 owners open Assets and download 5 non-menu files each | Project summary reads only; $0 incremental generated-file storage/function cost. |
| 1,000 owners preview Print Menu for one project | Up to 1,000 selected-project reads, then cached for repeated template previews/downloads in that session. |
| 1,000 owners download Menu Kit ZIP | $0 incremental generated-file storage/function cost. |

Runtime CPU/memory cost is on the owner browser. Large Menu Kit ZIP downloads should show progress and avoid parallel generation loops beyond the existing safe generator behavior.

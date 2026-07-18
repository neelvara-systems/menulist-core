# Printable Asset Templates - Firebase Cost Analysis

## Summary

Normal Printable Asset Templates generation has **zero Firestore writes, zero Storage uploads, and zero Cloud Function invocations**. Non-menu printable assets, including flyers, gift certificates, front/back business cards, ID cards, invitations, postcards, product tags, and campaign posters, use the already-loaded project summary/store context. Print Menu needs the full project/menu document once per selected project when it is not already cached.

The optional **Saved designs** flow uses the Creative Editor Template Registry only after an explicit owner save. It does not create saved documents during preview, download, or editor open. On page load, registry-backed templates use one platform metadata read from `platformAssetTemplates/{businessCategory}` plus one store metadata read from `storeAssetTemplates/{tenantId}/{storeId}/default`; generated template families remain a fallback when either catalog is unavailable. Generic platform templates are mirrored transactionally into each business-category catalog at platform-admin save/update/delete time, so owners still read only their resolved business-category catalog.

The feature reuses already-loaded owner/store/project/menu data where available and generates files in the browser with Canvas, jsPDF, QR rendering, the existing browser-compatible PDF.js preview loader, JSZip, and the shared Creative Editor document renderer. Desktop customization keeps the edited document in browser memory and downloads directly; it does not create an artifact record.

There are **No new Cloud Functions** and **No new Firestore indexes** for this feature.

The June 25 QR quiet-zone hardening is renderer-only. It changes generated QR margins and verification checks, but it does not add scan logging, WhatsApp-open logging, preview-page logging, Storage uploads, Firestore writes, or Cloud Functions.

Branded QR Action Templates are also renderer/catalog behavior only. Action labels, CTA framing, business identity, and short-link treatment reuse existing template metadata and live store/project context. They do not add a new collection, scan ledger, Storage path, route, or Cloud Function.

## Operation Ledger

| Operation | Firestore Reads | Firestore Writes | Storage | Functions | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Open `/assets` after dashboard data is loaded | Existing project summary read | 0 | 0 | 0 | Reads the summary document without creating a default project. |
| Select asset type | 0 | 0 | 0 | 0 | Local UI state only. |
| Filter or choose action intent | 0 | 0 | 0 | 0 | Uses in-memory template metadata such as menu, order, feedback, booking, offer, or reorder. |
| Open template actions | 0 | 0 | 0 | 0 | Local UI state only. |
| Preview non-menu asset | 0 | 0 | 0 | 0 | Temporary browser blob URL only; modal/sheet preview is generated client-side for QR/display and campaign assets. |
| Customize non-menu asset in editor | 0 | 0 | 0 | 0 | The Creative Editor document is generated from current input and kept in browser memory until download/close. |
| List platform templates | 1 | 0 | 0 | 0 | Business-category catalog only; the doc holds all asset types and the route filters by `productId`, `sourceSurface`, and `assetTypeId`. |
| List Saved designs | 1 | 0 | 0 | 0 | One bounded store `default` index doc from the registry; no payload or preview blob read. |
| Save as template | 1 | 1 | 1 immutable document upload + optional immutable preview upload | 0 | Transactionally reads/writes the current index; explicit owner action only. A failed acknowledgement may add one probe read. |
| Open saved template | 1 | 0 | 1 document download | 0 | Reads index + Storage payload, then rehydrates current QR/source values. |
| Delete saved template | 1 | 1 | Up to 2 deletes | 0 | Reads index once, rewrites `data` without the template, deletes Storage document/preview. |
| Platform admin saves category template | 1 | 1 | 1 document upload + optional preview upload | 0 | One category metadata doc is updated; platform-only low-frequency operation. |
| Platform admin saves generic template | 8 | 8 | 1 document upload + optional preview upload | 0 | Generic metadata is copied into `generic` plus seven business-category catalogs to preserve one owner read. |
| Platform admin changes category template metadata/status | 1 | 1 | 0 | 0 | Platform-only curation action; no editor document upload. |
| Platform admin changes generic template metadata/status | 8 | 8 | 0 | 0 | Updates every copied generic summary so category catalogs do not drift. |
| Platform admin deletes generic template | Up to 8 | Up to 8 | Up to 2 deletes | 0 | Removes every copied summary and deletes the shared Storage payload once. |
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
| Saving edited printable designs as project artifacts | The registry stores owner templates only after explicit save; generated artifacts and downloads are still not saved as project artifacts. |
| Creating a Cloud Function render service | Browser generation is already sufficient. |
| Writing preview history | Owner value is low and cost is avoidable. |
| Analytics Firestore event per download | Use existing free/non-Firestore analytics path if needed. |
| Separate branded QR template collection | Existing platform/store template metadata is sufficient. |
| Per-scan events for standard branded action templates | Measurement belongs to QR WhatsApp Experiments or another governed campaign feature, not normal Assets downloads. |

Saved editor templates pass the current editor preview to the registry only on explicit **Save as template**. Preview, download, and editor-open flows remain browser-local and do not write thumbnails or artifacts.

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
| 1,000 owners open Assets and download 5 non-menu files each | Project summary reads only; $0 incremental generated-file storage/function cost, regardless of whether files are table assets or extended campaign assets. |
| 1,000 owners preview Print Menu for one project | Up to 1,000 selected-project reads, then cached for repeated template previews/downloads in that session. |
| 1,000 owners download Menu Kit ZIP | $0 incremental generated-file storage/function cost. |

Runtime CPU/memory cost is on the owner browser. Large Menu Kit ZIP downloads should show progress and avoid parallel generation loops beyond the existing safe generator behavior.

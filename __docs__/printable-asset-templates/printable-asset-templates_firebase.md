# Printable Asset Templates - Firebase Cost Analysis

> **Last Updated:** September 4, 2026

## Summary

Normal Printable Asset Templates generation has **zero Firestore writes, zero Storage uploads, and zero Cloud Function invocations**. An explicit business/menu theme change writes one nested field on the already-loaded store document. An explicit inline business-profile save reuses the existing canonical store write and adds the existing tenant write only when the shared brand name changes; selecting a new logo reuses the existing business-logo Storage pipeline. Normal opening, preview, one-click download, and ZIP generation add no reads or writes. Non-menu printable assets use the already-loaded project summary/store context, except Staff Name Badge: opening that asset with staff-management permission reuses the existing guarded staff-list request once when the provider cache is empty. Print Menu needs the full project/menu document once per selected project when it is not already cached.

An unsubscribed desktop visit performs zero Printable Asset Templates project,
template, or full-menu reads. The route waits for subscription state and renders
the shared plan state before the first project-summary call.

The optional **Saved designs** flow uses the Creative Editor Template Registry only after an explicit owner save. It does not create saved documents during preview, download, or editor open. On page load, registry-backed templates use one platform metadata read from `platformAssetTemplates/{businessCategory}` plus one store metadata read from `storeAssetTemplates/{tenantId}/{storeId}/default`; generated template families remain a fallback when either catalog is unavailable. Generic platform templates are mirrored transactionally into each business-category catalog at platform-admin save/update/delete time, so owners still read only their resolved business-category catalog.

The feature reuses already-loaded owner/store/project/menu data where available and generates files in the browser with Canvas, jsPDF, QR rendering, the existing browser-compatible PDF.js preview loader, JSZip, and the shared Creative Editor document renderer. Gift Certificate and Event Invitation personalization drafts are also browser-local: bounded values enter the same preview/download/customize input, reset when the selected project changes, and are never persisted. Desktop customization keeps the edited document in browser memory and downloads directly; it does not create an artifact record.

The hardened delivery flow remains local-only. Current drafts are previewed again before output, multi-file images are zipped in browser memory, mobile native sharing receives the generated Blob, and dirty/retry/operation-lock state stays in React/ref state. These changes add no Firestore read/write, Storage upload, API route, Function, provider call, or generated-file retention.

Dashboard, catalog, and theme-comparison thumbnails now use that same browser renderer instead of a synthetic UI approximation. The canonical PNG is reduced to a maximum 1200 px long edge for screen display only; downloadable output keeps its full print dimensions. Previews render only near the viewport, unload when off-screen, share a bounded 12-result in-memory result cache, and allow at most two concurrent render jobs. Repeated previews reuse already-loaded store/project context; only Print Menu retains its existing selected-project `0-1` read boundary. Blob URLs and hashed preview keys stay in the current browser session and are never uploaded or persisted.

Theme visibility is also local. The catalog uses the business type/category already present in store/project context, so admitting 34 common families, five food-category families, and eight exact-type families adds no read, listener, index, or Function. The Salon/Makeup Studio and Spa/Spa Resort recommendation sets reuse that already-loaded context and add no new persisted field. An ineligible restricted-theme save is rejected before `updateStore()`. A historical restricted preference that becomes ineligible remains dormant in the existing field and is skipped at resolution time, avoiding a cleanup write. All 34 common themes remain universally eligible. An unknown legacy type without an explicit canonical category receives the same common catalog instead of inheriting a guessed category.

There are **No new Cloud Functions** and **No new Firestore indexes** for this feature.

The June 25 QR quiet-zone hardening is renderer-only. It changes generated QR margins and verification checks, but it does not add scan logging, WhatsApp-open logging, preview-page logging, Storage uploads, Firestore writes, or Cloud Functions.

Branded QR Action Templates are also renderer/catalog behavior only. Action labels, CTA framing, business identity, and short-link treatment reuse existing template metadata and live store/project context. They do not add a new collection, scan ledger, Storage path, route, or Cloud Function.

## Operation Ledger

| Operation | Firestore Reads | Firestore Writes | Storage | Functions | Notes |
| --- | ---: | ---: | ---: | ---: | --- |
| Open `/assets` after dashboard data is loaded | Existing project summary read | 0 | 0 | 0 | Reads the summary document without creating a default project. |
| Select asset type | 0 | 0 | 0 | 0 | Local UI state only. |
| Select Staff Name Badge | Existing guarded staff-list query when cache is empty | 0 | 0 | 0 | Runs only for a user with staff-management access; desktop and mobile share the existing `/api/staff` DAL response and provider cache. No badge-specific collection or write is added. |
| Prepare Gift Certificate | 0 | 0 | 0 | 0 | Optional recipient, sender, message, value, validity, and certificate-number text stays in local component state and the admitted renderer input. Blank fields remain writable after printing. |
| Prepare Event Invitation | 0 | 0 | 0 | 0 | Optional occasion, date, time, and location text stays in local component state and the admitted renderer input. Blank fields remain writable after printing; no invitation collection, persisted document field, upload, or Function is added. |
| Open Campaign Poster from Today | Existing campaign detail read | 0 | 0 | 0 | Reuses the current campaign, selected project/store context, parent-theme preference, and public project URL. No poster or artifact record is created. |
| Download Today Campaign Poster | 0 additional | Existing campaign completion write | 0 | 0 | Uses the existing Today completion DAL only after the image/PDF download succeeds; opening or closing the preview performs no write. |
| Filter or choose action intent | 0 | 0 | 0 | 0 | Uses in-memory template metadata such as menu, order, feedback, booking, offer, or reorder. |
| Open template actions | 0 | 0 | 0 | 0 | Local UI state only. |
| Save business profile inline | 0 new | 1 store write, plus 1 tenant write only when brand name changed | Existing logo upload only when replaced | 0 | Uses canonical Business Settings DAL; no asset-specific profile or generated output is stored. |
| Save Business theme | 0 new | 1 | 0 | 0 | Changed-leaf update to `printableAssetStylePreferences.businessThemeId`; store context is already loaded. |
| Save Menu theme | 0 new | 1 | 0 | 0 | Sparse project-keyed update under `projectThemeOverrides`; no project document or summary write. |
| Clear Menu theme | 0 new | 1 | 0 | 0 | Deletes only the selected project theme override. |
| Legacy style normalization | 0 new | 0 | 0 | 0 | Old `businessDefaults`/`projectOverrides` are folded into a canonical parent theme in memory and never drive separate asset output. |
| Preview non-menu asset | 0 | 0 | 0 | 0 | Temporary browser blob URL only; modal/sheet preview is generated client-side for QR/display and campaign assets. |
| Browse asset/theme preview cards | 0 additional | 0 | 0 | 0 | Near-viewport client rendering reuses current context and a bounded memory cache; no preview artifact or history is persisted. Print Menu keeps the separate cached-project read boundary below. |
| Customize non-menu asset in editor | 0 | 0 | 0 | 0 | The Creative Editor document is generated from current input and kept in browser memory until download/close. |
| List platform templates | 1 | 0 | 0 | 0 | Business-category catalog only; the doc holds all asset types and the route filters by `productId`, `sourceSurface`, and `assetTypeId`. |
| List Saved designs | 1 | 0 | 0 | 0 | One bounded store `default` index doc from the registry; no payload or preview blob read. |
| Save as template | 1 | 1 | 1 immutable document upload + optional immutable preview upload | 0 | Transactionally reads/writes the current index; explicit owner action only. A failed acknowledgement may add one probe read. Overlapping attempts for the same new-template intent share one reserved ID and do not start a second DAL mutation. |
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
| Mobile preview/download | 0 additional | 0 | 0 | 0 | Same generator as desktop; Staff Name Badge reuses the cached staff-list response loaded on asset selection. |
| Premium branding check | 0 new | 0 | 0 | 0 | Uses existing active plan context. |

## Data Sources

| Data | Existing Source |
| --- | --- |
| Store name/logo/color | Existing store context and brand token resolver. |
| Project/menu URL | Existing Use MenuList/Share data. |
| Menu content and currency for Print Menu | Existing Print Menu / Menu Card Export source. |
| Feedback URL | Existing feedback setup state. |
| Gift Certificate and Event Invitation personalization | Browser-local bounded draft values only; no Firebase source. |
| Plan type | Existing active subscription/session context. |

## Explicit Cost Rejections

| Rejected Pattern | Reason |
| --- | --- |
| Saving generated PDFs to Firebase Storage | Adds storage cost and cleanup lifecycle. |
| Copying a complete default map into every project document | Causes redundant project reads/writes, linked-outlet side effects, cache invalidation, and configuration drift. Sparse overrides stay in the existing store settings document. |
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
- Official is blocked before provider call.

This optional path is not required for the governed template catalog.

## Monthly Cost Estimate

| Scenario | Firebase Cost |
| --- | --- |
| 1,000 owners open Assets and download 5 non-menu files each | Project summary reads only; $0 incremental generated-file storage/function cost, regardless of whether files are table assets or extended campaign assets. |
| 1,000 owners preview Print Menu for one project | Up to 1,000 selected-project reads, then cached for repeated template previews/downloads in that session. |
| 1,000 owners download Menu Kit ZIP | $0 incremental generated-file storage/function cost. |

Runtime CPU/memory cost is on the owner browser. Large Menu Kit ZIP downloads should show progress and avoid parallel generation loops beyond the existing safe generator behavior.
Raster-backed PDF compression and ZIP generation remain entirely browser-local.
They add zero Firestore reads/writes, Storage transfers, Cloud Function calls,
provider requests, cache entries, or server-side file retention.

An unavailable Storage request previously allowed an owner to close, reopen,
and retry into two Saved design identities: two Firestore index transactions
and four Storage uploads for one intent. The in-flight reservation and busy
editor boundary now converge the same recovery sequence to one Firestore index
record/version and its expected document plus optional preview objects. A
repeated in-flight activation adds no DAL call. Deterministic cleanup must leave
zero disposable index records and zero disposable Storage objects.

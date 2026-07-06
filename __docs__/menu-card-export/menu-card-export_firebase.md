# Menu Card Export — Firebase Cost And Operations

**Status:** Implemented client-first export / Pro-Premium AI advisor metered separately
**Last Updated:** July 1, 2026
**Pricing references reviewed:** June 1, 2026

---

## Summary

The current implementation preserves the PDF Surface cost model for exports: Menu Card Export renders preview, preflight, PDF, print-shop packet ZIP, freshness, and export history in the browser. It does **not** add export Firestore writes, Storage uploads, export-storage API routes, Firestore rules, Storage rules, Cloud Functions, or indexes.

PDF document properties, generated-date/source-reference filenames, and print-shop source summaries are also generated in the browser. They add no Firestore reads/writes and no Storage operations.

Visible MenuList attribution in exported PDFs is browser-rendered from `src/lib/menu-kit/platformAttribution.ts`. It adds the MenuList logo mark, name, and `menulist.ai` domain to the footer for non-Premium stores without a network fetch, Firestore read/write, Storage upload, Cloud Function, rule, or index. `src/lib/platform/menuListBranding.ts` hides that visible attribution only when the already-loaded store context has `activePlanType === "premium"`; no subscription lookup is added.

Brand color and logo reuse comes from the already-loaded platform store context used by the owner app and OBP. When `Include logo` is on, the final renderer may download the existing logo image once to embed it into the PDF; this is cached in memory for repeat exports in the same route session and does not create an export artifact, Storage upload, Firestore document, rule, index, or Cloud Function.

Font-size selection, currency formatting, INR/rupee PDF-safe fallback, and price-column measurement are CPU-only renderer work. They add no Firestore read/write, Storage operation, Cloud Function, rule, or index.

Physical output styling is also renderer-only: warm page backgrounds, borders, title plaques/header cards, category labels, and dotted leaders are drawn by `jsPDF` in the browser. No background images, template assets, Storage reads, Firestore documents, Cloud Functions, rules, or indexes are added.

Business-type-aware output is cost-neutral. The print source reuses `store.businessType` and `store.businessCategory` from the already-loaded store context, resolves catalog/offering kind through the existing shared taxonomy, and chooses menu/service/catalog labels and visual tone in the browser. It does not add a store reread, export record, Storage upload, Cloud Function, rule, or index.

Auto print design is also cost-neutral. It runs in the browser after the print source is built, using item count, category count, description coverage, variant presence, business profile, and selected preset to choose the initial style, density, and safe toggles. It does not call the Pro/Premium AI advisor, consume AI capacity, write Firestore, upload Storage, invoke Cloud Functions, or require rules/index changes.

The optional layout suggestion is separate from export generation. It uses `/api/menu-card-export/design-advisor`, is available only to Pro/Premium subscriptions, caps request bodies at 128KB, checks route permission, rate limit, plan, and AI capacity before provider work, logs one AI operation, and consumes one enhancement unit only after a valid JSON recommendation is returned.

July 1 AI advisor permission hardening adds the existing store permission read before Pro/Premium subscription lookup, capacity check, provider call, AI operation write, or credit consumption. Rejected users do not reach the subscription read or AI cost path. This adds no writes, deletes, rules, indexes, Cloud Functions, Firebase deploy requirement, or Vercel deploy action.

AI advisor session-scope admission is cost-neutral. `/api/menu-card-export/design-advisor` now validates authenticated tenant/store scope as exact positive numeric Firestore document IDs before tenant access, bounded request parsing, route permission checks, Pro/Premium subscription lookup, AI capacity check, provider call, recommendation normalization, AI operation write, or credit consumption. Malformed, whitespace-mutated, leading-zero, zero, negative, unsafe, nonnumeric, reserved, empty, or path-shaped session scope fails before Firestore reads or provider work. This changes malformed session-scope admission only and adds no Firestore reads/writes/deletes for valid requests, Storage operations, provider calls beyond existing valid suggestions, cache invalidations, rules, indexes, Cloud Function logic, Firebase deploy requirement, or Vercel deploy action.

July 5 AI advisor provider-response parse diagnostics are Firebase-cost neutral. Empty, malformed non-object, or malformed object-fragment provider JSON now logs capped `menu_card_design_advisor_provider_response_parse_failed` diagnostics with fixed `return_layout_suggestion_failed` policy and response-shape metadata only. The route still returns the existing owner-safe suggestion failure, consumes no credits, writes no AI operation row, and does not add Firestore reads/writes/deletes, Storage operations, extra provider calls, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

June 30 AI advisor prompt-boundary hardening is Firebase-cost neutral. The route still uses the same auth, tenant access, 128KB body cap, Zod request schema, Pro/Premium plan gate, AI capacity check, Gemini call, recommendation normalization, AI operation write, and credit consumption order. The prompt builder now strips control/template characters, normalizes whitespace, caps prompt strings, caps warning/category scans, and serializes only sanitized `sourceSummary`, `preflightWarnings`, and `sourceHash` values. This adds no Firestore reads/writes/deletes, Storage operations, provider calls beyond existing valid suggestions, cache invalidations, rules, indexes, schema changes, Cloud Function logic changes, owner-facing settings, Firebase deploy requirement, or Vercel deploy action.

June 29 browser response-parser hardening is Firebase-cost neutral. The design-advisor client now caps plan-gate and recommendation response JSON at 16KB and logs malformed or oversized route responses through bounded AI service diagnostics. It adds no Firestore reads/writes/deletes, Storage operations, provider calls, AI accounting writes, credit consumption, rules, indexes, Cloud Functions, Firebase deploy requirement, or Vercel deploy action. Existing Pro/Premium plan gating, capacity handling, recommendation application, and owner-facing failure copy remain unchanged.

Legacy `generateMenuPdf()` direct-download paths are cost-neutral compatibility bridges. They now call the same Menu Card Export print source and browser renderer with existing store/project context. This changes visual output only; it adds no export Firestore write, Storage upload, Cloud Function, rule, index, or server artifact.

Real-data runtime QA on June 1, 2026 generated PDFs and print-shop packet ZIPs from an active multi-project account with no export collection, export-storage API route, Storage object, rule change, index change, or Cloud Function path.

Cost control rule:

> Preview never writes. Final export downloads from the browser by default. Export history is local to the device.

> Starter/no-subscription users are blocked from layout suggestion before any provider call.

Official Firebase pricing pages state that Firestore billing is based on document reads, writes, deletes, index entries, storage, and bandwidth; prices vary by location and currency. Cloud Storage for Firebase charges depend on bucket type, storage, bandwidth, and operations. Check the current Google Cloud SKU table before implementation.

Sources:

- https://firebase.google.com/docs/firestore/pricing
- https://firebase.google.com/pricing
- https://firebase.google.com/docs/storage

---

## Current Baseline

| Operation | Current PDF Surface behavior | Cost |
| --- | --- | --- |
| Desktop PDF generation | Uses existing project/store data and delegates to Menu Card Export renderer. | No extra export write/upload |
| Mobile PDF generation | Uses mobile selected-project cache; may read selected project if missing from cache. | 0-1 project read |
| PDF artifact | Blob URL downloaded directly to device. | No Storage |
| Freshness marker | Browser `localStorage`. | No Firebase |

Evidence:

- Compatibility generator returns a Blob in browser: `src/lib/export/menuPdfGenerator.ts`.
- Desktop stores download markers in `localStorage`: `src/components/templates/main-app/projects/b2cView/shareModal/index.tsx:235`.
- Mobile stores download markers in `localStorage`: `src/components/mobile/screens/MobileShareScreen.tsx:447`.
- Current docs describe zero generation cost: `__docs__/pdf-surface/pdf-surface_firebase.md:11`.

---

## Implemented Collections

None.

The implementation intentionally does **not** add:

```ts
MENU_CARD_EXPORTS
```

No Firestore index deploy is required.

---

## Storage Paths

None in the implemented default path.

PDFs and print-shop packets are generated as browser `Blob` downloads. No Firebase Storage object is created.

---

## Operation Model

### Preview

| Operation | Count |
| --- | --- |
| Read project/store data | 1 project-summary read when route opens, plus 1 selected-project read when a menu is opened for the first time in that route session |
| Firestore write | 0 |
| Storage write | 0 |
| Storage read | 0 |

Preview runs from route state. There is no preview API route in the default implementation.

Preflight runs inside preview/final export and also does not write. Its warnings are not persisted to Firebase.

The route uses `getExistingProjectsListWithoutLoader()` instead of the legacy auto-creating project list helper. If a store has no menus, the route shows an empty state and does not create a default project.

`ENABLE_MENU_CARD_EXPORT_HISTORY=false` disables the local history UI and skips browser `localStorage` history writes. The default enabled history path remains device-local only and does not create Firebase cost.

### Final Export

| Operation | Count | Notes |
| --- | --- | --- |
| Read project | 0 during export | Route already loaded selected project data. |
| Read store | 0 during export | Uses existing platform store context. |
| Query existing export by hash | 0 Firebase | Local history is checked in `localStorage`. |
| Create export record | 0 Firebase | Local history record only. |
| Upload PDF artifact | 0 | Browser downloads Blob directly. |
| Read logo asset | 0-1 browser image download | Only when `Include logo` is on, a store logo exists, and the URL is not already cached in the route session. Uses the same existing logo URL as OBP. |
| Update export record | 0 Firebase | Local history record only. |
| Generate download URL | 0 | Browser object URL only. |
| Set PDF metadata / filename | 0 Firebase | Browser `jsPDF` document properties and local filename string only. |

### Print-Shop Packet

| Operation | Count | Notes |
| --- | --- | --- |
| Render print PDF | 1 CPU/render operation | No Firestore write by itself. |
| Render optional proof PDF | 0-1 artifact | Feature flag / preset dependent. |
| Build instructions/checklist | 0 Firestore | Generated from export metadata, source summary, and QR destination. |
| Upload packet ZIP | 0 Storage uploads | Browser downloads ZIP directly. |
| Update export record | 0 Firebase | No `packetPath` in default implementation. |

Runtime QA confirmed that the packet ZIP contains the rendered `menu-print.pdf`, `PRINT_INSTRUCTIONS.txt`, and `QR_TEST_CHECKLIST.txt` as browser-generated artifacts. The PDF is converted to `ArrayBuffer` before being added to JSZip, so packet creation does not need a server or Storage handoff.

`ENABLE_MENU_CARD_EXPORT_PRINT_SHOP=false` hides the packet preset and blocks stale flagged UI state from creating a packet.

### Multi-Location Batch

Batch is not exposed in the implemented default path.

Rules:

- Verify every selected store/project before any write.
- Apply hash reuse per project.
- Cap batch size before launch; proposed default is 10 projects per request.
- Return per-project status so one failed render does not trigger duplicate reruns for successful projects.

### Export History

| Operation | Count | Notes |
| --- | --- | --- |
| List export records | 0 Firebase | Reads local browser history only. |
| Generate thumbnail URLs | 0 Firestore | Thumbnails are not generated in v1. |

### Pro/Premium Layout Suggestion

| Operation | Count | Notes |
| --- | --- | --- |
| Feature/plan check | 1 active subscription lookup | Blocks non-Pro/Premium users before provider call. |
| Rate limit | 0 Firebase by default | Uses existing rate-limit helper/config. |
| AI capacity check | 0 extra subscription lookup | Reuses the plan-gate subscription, then refreshes credits only when needed. |
| Provider call | 1 Gemini JSON request | Owner-click only; sends bounded summary, not full raw project data. |
| AI operation log | 1 Firestore write | Written to existing `menulistAiOperations` path after valid recommendation. |
| Credit consumption | 1 subscription write | Consumes one unit after valid recommendation; no consume on provider/validation failure. |
| Export artifact | 0 writes/uploads | The suggestion never creates a PDF, ZIP, Storage object, or export record. |

---

## Cost Guardrails

| Guardrail | Requirement |
| --- | --- |
| Preview no-write | Route preview cannot create export docs or Storage objects. |
| Read-only menu list | The route must use the existing-projects summary helper and must not create a default menu from a print/export surface. |
| Hash reuse | Same source/template/settings/preset is detected from local history. |
| History limit | Route lists max 20 local export records per project. |
| Retention | No Storage retention needed until server artifact storage exists. |
| Thumbnails | Generate only if UI displays them; otherwise store preview model only. |
| AI advisor | Owner-click only, Pro/Premium only, rate-limited, capacity-gated, and not part of critical export path. |
| Print-shop packet | Client-side ZIP only; no Storage cost. |
| Logo embedding | Final-render only; cache the converted logo data URL in memory by source URL. |
| Batch export | Flag off until per-request caps, indexes, and access checks are proven. |

---

## Approximate Per-Export Firebase Impact

This is operation-count planning, not a billing quote.

| Scale | Firestore reads | Firestore writes | Storage uploads | Stored artifact estimate |
| --- | ---: | ---: | ---: | ---: |
| 1 final export | 0 during export | 0 | 0 | 0 |
| 1,000 exports | 0 during export | 0 | 0 | 0 |
| 10,000 exports | 0 during export | 0 | 0 | 0 |

The route does perform normal project reads when the owner opens the route or changes selected menu. That read is required to render the current menu and is not multiplied by style/preset browsing.

If `Include logo` is on and the logo is stored in Firebase Storage but not already browser-cached, branded PDF output can add one normal logo-image download during final render. It does not add Firestore cost, export artifact Storage cost, or any persistent export object.

AI advisor operations are not counted as exports. A successful Pro/Premium suggestion adds existing AI-accounting writes only: one operation log write and one subscription credit update. Non-Pro/Premium attempts do not call the provider and do not consume credits.

## Share And Export Failure Diagnostics

`src/lib/export/exportDiagnostics.ts` is a client-side secure logging helper only. Clipboard copy, Web Share API, external endpoint share, structured JSON/XLSX export, PDF generation, and Menu Kit ZIP/single-asset generation failure paths log normalized failure codes plus bounded presence/length/count/status metadata. They do not log raw menu payloads, endpoint URLs, public share URLs, generated file bodies, project/store payloads, or raw browser/provider error objects.

External endpoint sharing is also browser-admitted before POST: ShareModal accepts only public HTTPS URLs without embedded credentials, rejects localhost, private-network, link-local, metadata, and `.local` targets, and uses manual redirect handling. This prevents menu export data from being posted to unsafe, local, or redirected endpoints without adding any Firebase operation.

These diagnostics add no Firestore read/write, Storage operation, Cloud Function call, API route, cache invalidation, index, rule, export artifact, server renderer, provider call, or owner-facing setting. Successful export paths remain quiet and cost-neutral.

---

## No Firebase Deploy Yet

This implementation does not modify:

- Firestore rules
- Firestore indexes
- Storage rules
- Firebase Functions

No Firebase deploy is required.

Implementation must deploy matching Firebase targets if it changes rules, indexes, Storage rules, or Cloud Function logic.

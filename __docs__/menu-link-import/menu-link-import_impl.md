# Menu Link Import Implementation

**Boundary Reviewed:** September 4, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated Menu Link Import evidence only. Both current intake paths require a signed-in owner before source acquisition or extraction: the owner app uses `/api/menu-link-imports`, while the public `/create-menu` page submits through the authenticated `/api/public/create-menu` route. Current release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:menu-extraction-pipeline`, `npm run verify:functions-deploy-preflight`, authenticated desktop/mobile owner-flow QA, signed-in `/create-menu` browser QA, direct and rendered source-acquisition smoke, Gemini extraction provider smoke where fallback is used, applicable target Firebase/Vercel deploy evidence, and production-host smoke.

## Implementation Summary

Menu Link Import reuses the existing extraction infrastructure instead of adding a separate crawler or AI path.

There are two authenticated intake adapters over the same acquisition/extraction boundary:

- Owner desktop/mobile calls protected `POST /api/menu-link-imports`, writes `menuLinkImportArtifacts`, and targets an existing project review job.
- The publicly reachable `/create-menu` page redirects unauthenticated submitters to sign-in, then calls the `withAuth`-protected `POST /api/public/create-menu`, writes an owner-bound `publicMenuDrafts` record plus one shared extraction job, and requires authenticated claim before project/store publication.

Neither adapter performs anonymous source acquisition or extraction.

1. UI calls `POST /api/menu-link-imports`.
2. The API validates auth, tenant/store access, feature flag, HMAC-hashed owner/tenant/store rate-limit key material, an 8KB bounded JSON body, permission confirmation, and URL safety.
3. The API fetches the source directly with DNS/IP validation, pinned request lookup, redirect re-checks, size caps, and a bounded acquisition budget.
4. HTML/text/JSON sources are converted into a text artifact; PDF/image sources are stored as-is. HTML acquisition can follow bounded same-origin menu/catalog links, Schema.org `hasMenu` URLs, linked PDF/image catalog assets, and rendered client-routed menu pages such as `/#/menu`; otherwise it is rejected before job creation.
5. The API stores one private source artifact and writes a `menuLinkImportArtifacts` document.
6. The API creates a `menuImageProcessingJobs` document with `source: "menu_link_import"`, `forceReview: true`, and `destination.type = "project"`.
7. Cloud Functions first try deterministic text extraction for link-import text artifacts that already contain structured names/prices. If that parser cannot produce a reliable draft, the job falls through to the existing Gemini file extraction pipeline.
8. `forceReview` makes the job land in `preview_ready`.
9. Existing review UI creates the apply plan.
10. Existing `applyExtractionChanges` writes approved source file and menu data, then revalidates public cache through the current path.

Editor source-link previews in `src/components/templates/main-app/projects/editorView/components/FileImagePreview.tsx` open with `noopener,noreferrer`, check the returned browser window, and log `project_file_source_link_open_failed` when the browser blocks or rejects the handoff. Diagnostics use bounded source URL/label/source/file-name/file-type presence-length metadata only, and the UI shows fixed `Unable to open source link` copy. This does not change link import acquisition, extraction, review, apply, cache revalidation, or project writes.

Local/emulator development keeps the existing best-effort `dev_triggerProcessMenuImages` call after a new job is created. If that trigger fails, `src/lib/menu-link-import/client.ts` logs only bounded job ID presence/length, environment presence/length, emulator flag state, and normalized source error metadata through `src/lib/firebase/menuProcessingDiagnostics.ts`. It does not direct-console raw Firebase callable errors, and it does not fail the already-created link import job.

June 29 follow-up: the same browser helper now parses `POST /api/menu-link-imports` responses through `readJsonResponseWithLimit()` with an 8KB cap. Malformed or oversized responses log `menu_link_import_response_parse_failed` with bounded project/URL/status metadata only. Successful HTTP responses must include `success: true` and a non-empty `jobId`; invalid shapes log `menu_link_import_response_invalid` and show the existing fixed owner fallback. The helper still never displays route response text, owner-provided URLs, raw IDs, or browser exception messages.

June 30 follow-up: the browser helper now sends `POST /api/menu-link-imports` with same-origin credentials, `no-store` cache policy, and manual redirect handling before the bounded acknowledgement parser runs. Desktop and mobile already share this helper, so both surfaces use the same request boundary without changing URL acquisition, extraction, review, apply, or project-write behavior.

The authenticated server route uses the same menu-processing diagnostics boundary. Job-created, source-rejected, and unexpected route-failure logs record only stable diagnostic codes, project/job/artifact/source-kind presence and length metadata, status/count booleans, and normalized source error metadata. The route does not log raw project IDs, job IDs, artifact IDs, owner-provided URLs, or caught exception payloads.

June 29 follow-up: the authenticated server route hashes owner, tenant, and store limiter key material before calling the `MENU_LINK_IMPORT` limiter. The limiter fails closed: provider unavailability returns a fixed 503 response before request parsing, project reads, source acquisition, Storage, or job writes. The feature flag, SAFE_MODE gate, route limit, bounded body cap, tenant access check, URL safety validation, source acquisition, artifact write, job creation, and bounded diagnostics remain unchanged; raw user IDs, tenant IDs, and store IDs must not be stored in the limiter key name.

The owner route stamps every authenticated and rejected response with `Cache-Control: private, no-store, max-age=0` and `X-Content-Type-Options: nosniff`. After request-schema validation and before permission/project/provider work, it also requires the project ID to match the authenticated `{tenantId}-...-{storeId}` project contract through the shared `isMenuExtractionProjectIdInScope()` guard. The image/PDF upload route uses the same guard, so both existing intake paths reject cross-scope or malformed project identifiers consistently.

The pinned request lookup handles both Node lookup callback shapes. When Node asks for `all: true`, the importer returns the validated address array shape; when it asks for a single address, the importer returns the single validated address. Multi-address hosts are sorted with IPv4 first but all resolved addresses must still pass the unsafe-IP guard.

The IPv6 unsafe-address guard applies CIDR semantics rather than textual-prefix semantics. Only global-unicast IPv6 literals in `2000::/3` can proceed to the narrower block checks. Link-local, site-local, loopback, unspecified, IPv4-compatible, IPv4-mapped, and NAT64 literal forms therefore fail before any direct request or rendered fallback can begin. HTTP/S URLs with non-standard explicit ports are also rejected on both client and server boundaries.

Direct and discovered binary sources require both an allowed MIME/extension envelope and matching PDF, JPEG, PNG, or WebP magic bytes. A mislabeled HTML/binary response is rejected with `CONTENT_TYPE_MISMATCH` before Storage or extraction work.

## Source Discovery Terms

Source scoring and same-origin candidate discovery are business-agnostic. They use shared business-category context from `src/data/shared/businessTypes.ts` / `functions/src/sharedData/businessTypes.ts`:

- Food & Beverage keeps food/menu terms as category-specific hints.
- Service, retail, professional, creative, health, and specialty businesses use offer catalog terms such as services, products, pricing, rate cards, packages, treatments, classes, collections, appointments, rentals, and repairs.
- If a project has no resolved business category, the importer uses the generic offering vocabulary plus bounded terms across supported categories.

The heuristic only chooses which same-origin page or linked PDF/image is most likely to contain the owner-provided catalog. It does not publish anything and it does not change the extraction schema; the extraction job still receives a text/PDF/image artifact and the existing forced-review flow remains the authority.

Low-confidence HTML shells are not sent to extraction. If a page is mostly a client-rendered app shell, generic marketing page, or route template without enough visible offering/catalog content, the importer first looks for a same-origin PDF/image catalog. If none exists, the API returns the owner-safe fallback message instead of creating an empty review job.

## Same-Origin Discovery Cases

The importer is not a full crawler. It handles the common owner-provided cases with fixed bounds:

1. Direct source URL:
   - HTML/text/JSON becomes a normalized text artifact.
   - PDF/JPEG/PNG/WebP is stored as the extraction artifact.
2. Homepage or landing page with a visible menu/catalog link:
   - Anchor links are scored with business-category-aware offering terms.
   - Only same-origin HTTP/HTTPS links are considered.
   - The shared client validator preserves only SPA router fragments (`#/...` and `#!/...`) and removes ordinary page anchors. Static server fetches remain hashless, while validated router fragments are available to the rendered fallback.
3. Homepage or landing page with Schema.org menu references:
   - JSON-LD `hasMenu` / `menu` URLs are considered when they stay on the same origin.
   - Menu-level URLs are followed; individual item URLs are not treated as source pages.
4. Direct linked asset:
   - Same-origin PDF/image links with strong menu/catalog/rate-card context can become the artifact.
   - UI assets, logos, placeholders, QR images, and social/navigation images are filtered out.
5. Split menu/catalog:
   - Up to 6 same-origin candidate URLs are inspected.
   - Up to 4 high-confidence HTML sources are combined into one text artifact.
   - The combined artifact still goes through the same review pipeline and never writes public truth directly.

Unsupported cases remain login-required pages, third-party marketplace crawling from a homepage, CAPTCHA/blocked pages, unlimited sitemap crawling, multi-location selectors, and cross-domain discovery.

## Rendered Hash-Route Fallback

Some owner-provided links point to a browser-routed app where the initial server response is only an app shell and the actual catalog is mounted after client rendering. The v1 fallback is intentionally narrow:

- It is gated by `FEATURE_FLAGS.ENABLE_MENU_LINK_IMPORT_RENDER_FALLBACK`.
- It runs only after URL safety validation and only after static HTML acquisition does not find usable catalog content.
- It preserves the original URL hash only when the normalized safe URL has the same origin, path, and query.
- It revalidates the final render URL immediately before Chrome starts and skips rendered fallback for IP-literal targets.
- Before Chrome starts, it may inspect at most 12 same-origin script files at 512 KiB each to discover declared dependency hosts needed by a client-rendered catalog. Every discovered host passes the same protocol, DNS, and unsafe-IP validation as the source, and the complete render allowlist is capped at 16 hosts.
- It uses a bounded headless Chrome `--dump-dom` run with disabled extensions, disabled image loading, a temporary user data directory, output byte limits, and a fixed timeout. Each admitted hostname is DNS-pinned to its validated public address; every unlisted hostname is sent through a dead proxy; and `<-loopback>` removes Chrome's implicit localhost bypass.
- It stores only the text artifact used for extraction. Raw HTML is not stored separately.
- It still requires visible offering/catalog evidence such as structured data or prices before job creation.

This means `https://demo2.godirekt.in/spark/app/#/menu` can create a review draft after rendering, while `https://demo2.godirekt.in/spark/app/#/mainpage` is rejected because it resolves to the app shell/navigation surface rather than the menu content.

## Deterministic Link Text Extraction

`functions/src/logic/menuLinkTextExtraction.ts` is the first extractor for `menu_link_import` jobs whose artifact source kind is `html_text`, `rendered_html_text`, `plain_text`, or `json_text`.

The parser is business-agnostic. It looks for category/count boundaries, candidate offer names, and nearby price lines in the captured visible text; it does not use restaurant-only keyword allowlists. It returns the same `ExtractedMenuData` shape as the existing extraction pipeline:

- `languages`
- `categories`
- `items`
- `qualityScore`
- `qualityDetails`
- provenance with `promptVersion: "menu-link-text-parser-v1"` and `model: "deterministic-text-parser"`

The deterministic path is accepted only for a single English target language, when it finds structured sections, and when at least 75% of items are priced. Multilingual and non-English projects continue through the existing AI extraction/translation path. All other ineligible text sources also use the existing AI fallback. This keeps eligible dynamic text menus cheap and repeatable without changing PDF/image or language behavior.

The deterministic extractor accepts only the exact configured-bucket artifact for the current job: `menuLinkImports/{tId}/{sId}/{projectId}/{jobId}/source.txt`, or the exact owner-bound `publicMenuDrafts/{draftId}/source.txt` path. Prefix matches and sibling objects are rejected before Storage download. Success and skip logs use only job ID length, counts, source kind, stable `MENU_LINK_TEXT_EXTRACTION_SKIPPED` failure code, and capped source error name/code/status metadata; they do not log raw job IDs or exception messages.

## Files

### Added

- `src/app/api/menu-link-imports/route.ts`
- `src/lib/menu-link-import/sourceAcquisition.ts`
- `src/lib/menu-link-import/client.ts`
- `__docs__/menu-link-import/*`

### Modified

- `src/config/features.ts`
- `functions/src/constants/features.ts`
- `src/constants/database.ts`
- `functions/src/constants/database.ts`
- `src/lib/rateLimit/configs.ts`
- `src/lib/firebase/menuProcessing.ts`
- `functions/src/types/menuProcessingJob.types.ts`
- `functions/src/logic/processMenuImagesJob.ts`
- `functions/src/logic/parallelProcessingPrompt.ts`
- `src/lib/extraction/applyChanges.ts`
- `src/lib/extraction/comparisonEngine.ts`
- `src/components/templates/main-app/projects/index.tsx`
- `src/components/templates/main-app/projects/FileList.tsx`
- `src/components/templates/main-app/projects/editorView/components/FileImagePreview.tsx`
- `src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewModal.tsx`
- `src/components/templates/main-app/projects/jobScreens/ExtractionJobReviewScreen.tsx`
- `src/components/mobile/sheets/MenuUploadSheet.tsx`
- `firestore.rules`

## Why Not Gemini URL Context

Gemini URL Context remains an optional future diagnostic/fallback, not the canonical importer. It does not give MenuList enough control over fetched artifacts, redirects, retry behavior, source lineage, and future source comparison.

## Why Not Crawlee/Firecrawl/Apify in v1

The v1 requirement is a safe, owner-provided intake path. The existing extraction pipeline already handles image/PDF/text artifacts. Adding a crawler/vendor now would increase operational and policy surface before there is enough product evidence that dynamic crawling is needed.

## Review Behavior

Link import jobs force review:

```ts
source: "menu_link_import"
forceReview: true
```

This prevents blank-project auto-save from applying to link imports. Existing upload/photo/PDF jobs are unchanged and keep their current first-extraction behavior.

## Mixed Upload Behavior

- Link import creates an active processing job and disables the desktop Upload & Continue action until the job finishes or reaches review.
- If local photo/PDF files are selected but not uploaded yet, desktop link import is disabled until the owner uploads or clears those files.
- Existing processed menus expose link import next to the editor "Add Menu" file action, guarded by the same feature flag and the same active-job checks.
- Approved link imports seed a normal processed source-file entry with processing metadata, so the project file list can render imported text/PDF/image artifacts without assuming every processed source is an image.
- Later photo/PDF upload still filters only local base64 files for upload, so approved link source artifacts are ignored by future upload jobs.
- Later photo/PDF review jobs map source-local `file_0`, `file_1`, etc. targets back to the actual uploaded file UIDs for all single-store review jobs, not only link-import jobs. This keeps link-first then image/PDF upload in the same project from completing without writing the uploaded source file.
- Source-local extraction IDs are not trusted as stable cross-source item/category matches. Matching uses name/category similarity; new reviewed items receive source-scoped ids such as `0i1` so a later upload cannot update the wrong existing item just because Gemini reused `1`, `2`, `3`, etc.
- If a later upload adds items into a category already present from another source file, the apply path copies that category row into the new source file with the same category id. The editor can then render the uploaded file coherently while public output deduplicates categories by id.

## Review Resolution Rules

The review screen resolves link-import and re-extraction jobs client-side after owner approval. Firestore rules allow only the owning user to move `preview_ready` jobs to:

- `completed` with `currentStep: "Changes applied"`
- `cancelled` with `currentStep: "Changes discarded by user"`

Completed review updates must also include a bounded integer `appliedChangeCount` from 1 through 5,000. Discarded reviews cannot write that field. The allowed job update fields are restricted to `status`, `completedAt`, `updatedAt`, `currentStep`, and the completion-only count. Project data writes still go through the scoped `/projects/{tId}/{sId}/{projectId}` rules, and linked-outlet projects remain blocked from mutating `files`.

## Review UI Behavior

The review modal uses a viewport-bounded body and sticky action footer so Apply/Discard remain reachable on narrow desktop windows. Apply and discard failures render as an inline error alert in addition to the toast, which makes Firestore rule or data-contract failures visible during owner review.

Large previews are conservative by default. When a comparison contains more than 200 review candidates, desktop and mobile begin with zero approved changes instead of silently selecting the full import. Groups containing more than 50 rows begin collapsed. Selecting a new item also selects its required new category; deselecting that category removes dependent new-item approvals. The apply path independently rejects any new item whose category is not present in the current project or in the approved category changes.

The review modal cannot be dismissed through the shell close icon or mask. Owners must apply or discard, and the empty/no-change state uses the same discard path so the preview job is resolved instead of reopening.

The comparison layer normalizes extracted category ids and item category references at the boundary. It accepts both `categoryId` and the existing extraction shape's `category`, then resolves readable category names before building preview rows. This keeps link-import previews readable and prevents `Unknown Category` rows for deterministic link-text payloads.

When a preview job is restored from session storage after a reload, the projects page reselects the job's project before opening review. The review modal only renders when the active job, selected project, and loaded project all match, so an owner cannot accidentally apply a restored link-import job to a different menu.

The editor source preview checks the source file MIME type before rendering the image zoom tool. Link-import text/PDF source files render as source-file panels with the original source link available, so the editor does not send `text/plain` or PDF artifact URLs through image rendering.

## Apply Safety

`applyExtractionChanges` sanitizes the final Firestore update payload before `updateDoc`. This removes nested `undefined` values from extracted categories/items while preserving Firestore `Timestamp` values. This is required because link/PDF extraction can omit optional fields such as `orderIndex`, and Firestore rejects arrays or objects containing `undefined`.

`applyExtractionChanges` now fails the owner approval action if a reviewed mutation targets a missing source file. This prevents the job from moving to `completed` while silently dropping approved categories/items.

The exact approved-change count is persisted atomically with the project update for single-store reviews and transactionally through the protected route for linked outlets. Completion UI and restored listeners use that persisted count, so a partial approval cannot be presented as though every extracted candidate was applied. Downstream profile, business-detail, and image side effects receive only the approved preview subset; source-wide suggestions are eligible only when the complete preview was approved.

Public Schema.org JSON-LD deduplicates categories by id before building `MenuSection` / `OfferCatalog` output. This preserves source-file editor coherence without duplicating public structured-data sections when multiple source files share the same category id.

## Failure Cleanup

If Storage artifact creation succeeds but the route loses the active-job claim or job creation fails, the API deletes the newly created private Storage object. A failed Storage delete must persist the already validated `menuLinkImportArtifacts` metadata as a durable seven-day cleanup record before the route forgets the path; if neither deletion nor durable recording succeeds, the route fails observably instead of acknowledging cleanup. Once the job document exists, the extraction pipeline owns the job state.

## Storage Scope

V1 stores only the artifact used for extraction: text artifact, PDF, or image. Raw HTML is not stored separately to reduce Storage writes and avoid retaining page content that is not needed for the owner-review flow.

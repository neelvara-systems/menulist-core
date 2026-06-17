# MenuList — Changelog

> What's new, improved, and fixed. Updated with every release.
>
> **Language Rule:** All entries must follow [Language Governance](./constitution/02-language-governance.md). No hype, no "exciting updates". Calm, factual, confident.

---

## June 17, 2026 - CampaignCue Output Picker

### Added

- **CampaignCue output picker added** - CampaignCue pack templates now include business-use output choices such as WhatsApp sales pack, booking push pack, Google local update, Instagram post and story, poster or flyer, staff share, ad handoff, old-asset reuse, and custom size.

### Improved

- **Template filtering stays owner-focused** - Output choices filter already-loaded CampaignCue pack templates by output type, channel, template kind, required facts, and tags instead of showing a generic design-format gallery.

### Cost

- **No new template read path added** - Switching output choices is local filtering over the already-loaded category and workspace template summaries. The custom-size option opens the existing blank editor path.

## June 16, 2026 - Platform Cost Posture

### Added

- **Internal cost posture screen added** - Platform users can open `/platform/cost-posture` to see known internal cost signals, SAFE_MODE state, cost/usage alerts, source coverage, and guardrails across existing platform monitors.
- **Ops navigation linked** - `/ops` now links to Cost Posture, and the Platform sidebar exposes Cost Posture for platform users.

### Improved

- **Platform admin pages separated from settings** - Platform admin and ops surfaces now open as dedicated `/platform/*` pages instead of mounting through the Platform Settings tab shell. Platform Settings stays limited to app settings, fonts, and static assets.

### Cost

- **Bounded read-only platform monitor** - The new screen reads one ops config document, up to 30 alert rows, up to 300 extraction audit rows, and up to 200 Business Health answer events only on manual platform access. It adds no Firestore writes, listeners, scheduler, rules, indexes, or owner/customer runtime reads.
- **Billing forecast boundary preserved** - The screen does not claim whole Firebase bill accuracy until Cloud Billing export to BigQuery is configured.

## June 16, 2026 - Business Health Image Gap Signal

### Improved

- **High-demand missing photos separated** - Business Health owner action planning now uses `image_gap` for active menu items that have current customer attention but no item photo, while missing descriptions stay under `metadata_demand`.

### Cost

- **No new Firebase read path added** - The signal reuses already-loaded project catalog data and settled item views/taps inside dashboard summary aggregation. It adds no collection, listener, index, Storage path, analytics event, or media write.

## June 16, 2026 - Answerlattice Production Hardening Sweep

### Fixed

- **Widget feedback idempotency corrected** - Widget feedback no longer treats a search row's normal `modifiedOn` timestamp as proof that the user already submitted feedback.
- **Public API debug leakage closed** - Production canonical-answer API responses no longer expose internal entity-resolution debug traces through `includeDebug`.
- **Signal ingestion retry noise reduced** - Server-side signal writes now use deterministic IDs for explicit source/request identifiers so public API and widget feedback retries do not append duplicate signal rows.
- **Translation route capped and guarded** - Article translation now respects safe mode, handles invalid JSON as a client error, returns provider throttling as `429`, and blocks oversized article text before the Gemini call.
- **Public bundle proxy protected** - Compiled public context bundle cache misses are now rate-limited before Firebase Storage existence/download calls.
- **Separate Firebase reaction rules restored** - Answerlattice `changelog_feedback/{tId}/{sId}` and `article_feedback/{tId}/{sId}` now have product-scoped Firestore rules in `firestore-answerlattice.rules`, so owner-visible reaction activity works when `ANSWERLATTICE_FIREBASE_MODE=separate`.
- **Multi-language KB tab made usable** - The governance Languages tab now loads scoped KB article IDs from the category cache, fetches article translation status in capped chunks, shows loading/error states, and refreshes only the translated article after a successful translation.
- **Hosted help limiter outage closed** - Hosted Help public pages and settings routes now fail closed when rate limiting is enabled but the limiter provider is unavailable.

### Cost

- **No new collection scans or listeners** - Public API auth remains hash-key scoped and rate-limited; bundle cache hits stay in memory/browser/CDN caches; signal retry hardening prevents duplicate signal documents for explicit external IDs; translation rejects oversized prompts before AI spend; the Languages tab performs one scoped category read plus chunked article reads only when opened.

## June 16, 2026 - Answerlattice Customer Tracking Hardening

### Fixed

- **Owner-visible requester details added** - Answerlattice feedback review, conversations, tickets, Support Board cards, changelog reaction activity, and widget recent questions now surface available customer/requester identity instead of hiding it behind IDs.
- **Widget visitor tracking added** - The v1 widget contract now supports `AnswerlatticeWidget.identify({ id, name, email })`, stored on existing widget search-history rows with session, origin, and path metadata.
- **Changelog/article reactions made auditable** - Likes, dislikes, removals, and comments now write a capped actor activity log so owners can see who reacted when a specific entry is opened.

### Cost

- **No new collection scans or listeners** - Widget activity continues to read the bounded recent search-history query, feedback review remains limit 200, conversations remain paginated, Support Board source identity rides the already-loaded card document, and reaction details read one capped document only when an owner opens an entry preview.

## June 16, 2026 - CampaignCue Pack Template Registry Planning

### Added

- **CampaignCue pack-template registry docs added** - CampaignCue now has a docs-first plan for curated platform campaign pack templates by shared business category, owner-saved reusable packs, event tags, trust checks, and Storage-backed payloads.

### Cost

- **One category catalog read planned** - The default owner flow reads one `campaigncuePlatformPackTemplates/{businessCategory}` document and searches/filter locally, with overflow docs loaded only after explicit owner action.

## June 16, 2026 - Platform Asset Template Manager

### Added

- **Platform template management added** - Platform users can manage printable asset platform templates from `/platform/asset-templates`, with business-category catalogs, asset-type filtering, template family metadata, draft/published/archived status, full editor customization, and delete.
- **Platform template writes added to the client DAL** - Platform catalog management now uses `platformAssetTemplates/{businessCategory}` plus Storage-backed editor documents, matching the owner-facing template registry pattern without adding API routes.

### Cost

- **Platform manager reads one category catalog at a time** - Loading the manager reads the selected `platformAssetTemplates/{businessCategory}` document and filters asset types locally.
- **Platform template saves are explicit** - Saving a platform design reads and writes one bounded category catalog document and uploads one Storage document, with an optional preview upload.

## June 15, 2026 - Shared Creative Editor Toolbar Anchor

### Fixed

- **Selection toolbar placement stabilized** - The shared Creative Editor floating quick actions now anchor below the selected layer border using Fabric viewport coordinates and measured toolbar size, so text, shape, group, and multi-layer selections follow the same placement rule.

### Validation

- **Smoke QA tightened** - `/creative-editor-smoke?qa=1` now checks the toolbar safe gap and centered placement unless the viewport edge requires clamping.

### Cost

- **No Firebase cost added** - This is browser-local editor overlay positioning and development smoke QA only.

## June 15, 2026 - Print-ready Kit Website Editor Proof

### Improved

- **Print-ready Kit page now highlights the editor-backed flow** - `/features/print-ready-kit` now explains finished templates, supported editor customization, protected QR/required link areas, and image/PDF/printer-file downloads from the current approved menu source.
- **Print-ready Kit visual proof expanded** - The dedicated page now shows a template-list/dashboard proof panel and an editor customization proof panel so SMB owners can understand the workflow before reading the details.
- **Product screenshots mounted** - The proof panels now render maintained screenshot assets from `public/images/website/print-ready-kit/`, with the dashboard capture cropped away from account-header details.
- **Asset types kept visible** - The page uses an always-visible asset rail instead of a carousel so owners can see print menu, table, counter, entrance, feedback, and kit outputs without advancing slides.
- **Feature overview copy aligned** - Header dropdown, `/features` cards, route metadata, and `llms.txt` now describe templates, editor customization, QR files, and printer files together.

### Documentation

- **Website and print docs updated** - Main website docs, SEO/AEO metadata docs, Print Assets website guidance, Printable Asset Templates website guidance, and Menu Card Export website metadata now match the editor-backed print-assets flow.

### Cost

- **No Firebase cost change** - This is static public website component, CSS, locale, discovery, and documentation work only. It does not change owner Assets runtime, creative editor runtime, printable rendering, Firebase rules, Cloud Functions, auth, pricing, payment, or customer menu runtime.

## June 15, 2026 - Creative Editor Template Registry for Print Assets

### Added

- **My templates added to Assets** - Desktop printable assets now show owner-saved Creative Editor templates above MenuList templates for supported scan-first assets.
- **Save as template added** - The fullscreen editor can save the current neutral editor document as a reusable template without saving generated downloads as project artifacts.
- **Saved template rehydration added** - Reopened printable asset templates refresh QR/source values from the current selected project before editing or download.

### Cost

- **Generated templates remain zero-write** - Preview, download, and opening generated MenuList templates still do not create registry writes.
- **Explicit template saves are bounded** - A Save as template action writes one Firestore metadata document and uploads document JSON, with optional thumbnail upload, through the authenticated client-side registry DAL.

## June 14, 2026 - Shared Creative Editor Right-Panel Editing Smoothness

### Fixed

- **Right-panel focus retained** - Selected-layer text, typography, layer name, opacity, position, size, simple color, border, shadow, rotation, and gradient edits now patch the active Fabric object in place instead of rebuilding the full canvas after each field change.
- **Floating toolbar focus retained** - Floating and contextual toolbar controls now defer toolbar repositioning while an editor input is focused, so quick color/style edits do not steal focus from the active control.
- **Interaction renders reduced** - Floating toolbar positioning and Grab-mode workspace metrics now coalesce to animation frames, unchanged toolbar state is skipped, and no-op selected-layer changes no longer create document/history updates.

### Boundaries

- **Generated-object rebuilds preserved** - QR regeneration, image filters/outlines/source changes, polygon point edits, line arrow geometry, and path/path-text guide changes still reload the Fabric document because those controls rebuild generated objects.

### Cost

- **No Firebase cost added** - The fix is browser-local editor state and Fabric object patching only.

## June 14, 2026 - Shared Creative Editor Ready-Made Text Templates

### Added

- **Text template catalogue added** - The shared Creative Editor now reads `src/modules/creative-editor/textTemplates.json` for 35 local text templates: default text styles plus SMB-ready multi-layer combinations for promotions, retail, food, services, local openings, events, reviews, social posts, beauty/wellness, and hiring.
- **Editable multi-layer insertion added** - Ready-made text templates insert normal editable text layers scaled to the current output frame, so owners can change, move, delete, restyle, or reorder each word after insertion.
- **Text and Styles panels updated** - The Text drawer now shows visual ready-made template cards, and the Styles drawer reuses the same data-backed text combinations as quick campaign polish shortcuts.

### Cost

- **No Firebase cost added** - Text templates are static local JSON and browser-local layer edits until an existing product-owned save/export path runs.

### Validation

- **Verification updated** - CampaignCue runtime verification now checks the text template JSON file, multi-layer insertion path, and template grid styles.

## June 14, 2026 - Shared Creative Editor VistaCreate Owner Shortcuts

### Added

- **Styles panel added** - The shared Creative Editor now has browser-local project style presets, brand style apply, shuffle style, and font-combination shortcuts for quick campaign polish.
- **My Stuff panel expanded** - My Stuff now exposes local image upload, recent session insertions, and approved product assets in one owner-facing place.
- **Top-bar Download added** - Owners can download the active workspace frame as PNG from the main toolbar without selecting a layer or opening an inspector.
- **VistaCreate comparison documented** - Shared editor docs now record the adopted VistaCreate patterns and the rejected boundaries: no remote stock search, provider upload, paid generation, fixed-page viewport shift, or direct posting.

### Cost

- **No Firebase cost added** - Styles, My Stuff, recent insertion display, and top-bar download are browser-local until an existing product-owned explicit save/export path runs.

### Validation

- **Verification passed** - `npm run verify:campaigncue`, `npx tsc --noEmit --incremental false --pretty false`, `npm run lint`, `git diff --check`, Sass parse, and Chrome browser smoke covered this editor pass.

## June 14, 2026 - Shared Creative Editor Canva-Style Editing Controls

### Added

- **Canvas selected-layer toolbar added** - The shared Creative Editor now shows a floating toolbar near the active Fabric selection for edit, Design Cue entry when connected, color, style/effects, flip, position/layers, lock, duplicate, delete, group, distribute, and more controls.
- **Top contextual toolbar added** - Text, image, shape, line, QR, and multi-select states now expose type-specific controls above the canvas for font, size, color, stroke, opacity, effects, fit/crop, flip, position, grouping, and distribution.
- **Searchable creation drawer added** - The left drawer now supports local search, recent insertion chips, text presets, CampaignCue business text placeholders, Brand Kit colors/assets/text, and searchable local templates/elements.
- **Page controls added** - The editor document can carry optional pages, switch the active artboard, duplicate pages, add pages, lock a page, and export/download the active page while preserving page metadata in JSON.
- **Editor behavior documented** - Shared editor and CampaignCue Creative Studio docs now define the selected-layer toolbar, top contextual toolbar, searchable drawer, Brand Kit, business placeholders, and page controls as product-neutral, browser-local editor UI.
- **Canvas-bound rulers added** - Numeric rulers now attach to the visible artboard scale instead of drifting across the full stage.
- **Text and sticker drawer patterns added** - The Text drawer now includes Canva-style add-text, Brand Kit, default styles, business placeholders, font-combination effects, and path text; the Graphics drawer now includes local stickers and popular search chips.

### Fixed

- **Theme toggle repaired** - Light and dark modes now update editor shell variables, segmented controls, product mark text, and rail icon contrast.
- **Old craft-builder rail icons restored** - Active sidebar icons reuse the copied multi-path SVG palettes instead of being forced into a single solid color.
- **Invalid selected-layer actions removed** - Unlock, ungroup, group, distribute, duplicate, delete, flip, align, and layer-order controls now respect selected layer, group, multi-selection, locked layer, and locked page state.
- **Single-page editor flow cleaned up** - Blank/new editor documents no longer create surprise foreground demo layers, the output frame is fit inside the remaining workspace, and page controls stay hidden unless the document actually has multiple pages.
- **Right inspector selection flow restored** - Selecting a layer now opens the right properties panel for detailed layer editing, matching the old editor interaction model.
- **Old full-canvas editor flow restored** - The visible Fabric canvas again fills the remaining editor workspace, the output/download surface is the internal workspace frame, wheel zoom and Grab mode use Fabric viewport transforms, and export/preview/clipboard output crop back to that frame.

### Boundaries

- **No product-specific editor imports added** - The shared editor still does not import CampaignCue runtime code; CampaignCue only passes adapter-owned brand metadata, approved asset refs, and text placeholders into the product-neutral metadata contract.
- **No provider or Firebase write added** - Search, recents, Brand Kit selection, selected-layer controls, page switching, page duplication, and page locking run in browser memory until an existing product-owned save/export path runs.
- **No overlay export output change** - SVG, PNG, JSON, clipboard PNG, and base64 exports include canvas content only, not the floating toolbar, contextual toolbar, drawer, or page controls.
- **No network search added** - Text preset filtering, sticker search chips, recent insertions, and drawer search remain local browser behavior.

### Cost

- **No Firebase cost added** - Selection, style, position, duplicate, delete, group, distribute, search, Brand Kit, placeholder insertion, and page actions remain browser-local until a product-owned explicit save/export path runs.

### Validation

- **Verification passed** - `node scripts/verification/verify-campaigncue-runtime.js`, `npx tsc --noEmit --incremental false --pretty false`, `npm run lint`, and `git diff --check` passed.
- **Browser smoke passed** - `http://localhost:3000/creative-editor-smoke` rendered the Fabric editor, showed selected-layer controls, kept overlays outside `.canvas-container`, verified drawer search and page controls, and reported no browser console errors.

## June 14, 2026 - CampaignCue Daily Campaign Desk

### Added

- **Daily Campaign Desk added to CampaignCue owner workspace** - The first CampaignCue screen now shows one recommended owner action, missing detail cards, ready-pack controls, manual delivery tasks, asset reuse, multi-format uses, print/photo tasks, saved facts, and quick result memory.
- **Campaign Decision Engine added** - CampaignCue now ranks campaign recipes deterministically from business facts, timing/readiness, assets, missing inputs, trust risk, owner effort, repetition, and compact result memory instead of asking a model what to promote.
- **Auditable decision object added** - Created campaign packs now store the selected `recipeId` and `campaign.pack.decision` with confidence, score, facts used, missing inputs, why-this/why-now explanations, recommended outputs, and trust preflight.
- **Recommendation evidence added to owner UI and exports** - The Daily desk now shows why the recommendation is useful, what is missing, risk/preflight state, and pack outputs; full-pack downloads include the same decision evidence.
- **SMB recipes added** - Restaurant, salon, retail, local-service, fitness, clinic, generic local-business, slow-lunch, weekend-slot, new-arrival, old-poster-reuse, and local-visibility recipes now live under product-scoped CampaignCue constants and guide output formats, print formats, photo tasks, manual delivery tasks, result options, and guardrails.
- **Campaign pack review added** - The latest pack now exposes source facts, missing inputs, trust summary, manual delivery cards, local visibility cues, result question, and result options from the existing overview data.
- **Manual delivery cards added** - WhatsApp, Google/local, creative, ad, video, script, and calendar outputs now carry structured copyable handoff fields for manual owner use.
- **Local visibility surface added** - CampaignCue now has a Visibility operations tab and `cue_local_visibility_refresh` opportunity for Google/local readiness without connected publishing.
- **Campaign pack export expanded** - Full-pack downloads now include owner desk context, details to confirm, output formats, manual delivery checklist, result-memory options, print/in-store uses, photo tasks, local visibility, review checklist, and manual steps.
- **Structured result memory added** - Record-result actions now accept a structured result signal and store compact campaign result memory for repeat/adjust recommendations.
- **Outcome-first editor AI Tools added** - CampaignCue editor AI Tools now lead with ready-to-share and missing-business-detail checks before copy or image-reuse utilities.

### Boundaries

- **No direct posting added** - Daily Campaign Desk routes to existing export/download, approval, schedule, asset, editor, and result actions only. Social posting, WhatsApp direct send, Google publish, and ad spend mutation remain disabled.
- **No generic design-tool flow added** - The editor remains a separate tool surface. The daily desk starts from owner tasks, source facts, packs, print/photo needs, and result memory.

### Cost

- **No additional overview read path** - Daily Campaign Desk and Campaign Decision Engine are computed from the existing CampaignCue overview payload and recomputed locally after owner mutations. Campaign creation uses bounded campaign history in the existing server-authoritative creation path to store the selected decision without raw event scans.
- **No campaign-pack collection added** - Pack review stays derived from existing overview data plus compact campaign metadata.
- **No provider/model decision cost introduced** - The feature adds no Storage path, Cloud Function, realtime listener, paid generation, provider connection, direct provider call, model-owned decision, or paid model call.
- **Firebase summary patterns tightened** - Business/profile saves and source input saves merge into `sourceSnapshots/current` instead of rescanning source inputs, CueLayers stores `current.jobId` for direct replay job reads, asset registration batches metadata and event writes, and synchronous CueLayers upload completion writes design/job/version/idempotency state in one batch.
- **Firebase write commits reduced** - Campaign creation/action success paths now batch summary increments and idempotency completion with the primary mutation, trust-blocked public-use actions batch blocked-event and idempotency completion, and CueLayers now avoids active v1 quality/event/correction/export-report writes while autosave reuses the existing layer index artifact.

### Validation

- **TypeScript passed** - `npx tsc --noEmit --incremental false --pretty false` passed after implementation.
- **Verifier updated** - `node scripts/verification/verify-campaigncue-runtime.js` now checks Daily Campaign Desk constants, broader recipes, decision engine contracts, no provider/Firebase/model decision path, selected decision storage, owner UI, pack export matching, pack export context, and cost boundary.

## June 14, 2026 - CampaignCue Design Cue Deterministic Assistant

### Added

- **Design Cue added to CampaignCue editor** - CampaignCue now renders a plain-language Design Cue panel inside the shared Creative Editor AI Tools drawer, with command chips, comment input, patch review cards, and Apply/Try another/Cancel actions.
- **Deterministic patch spine added** - Known requests such as bigger offer, shorter selected text, add location, add contact line, resize square/story/poster/wide, fact check, brand check, export checklist, premium styling, readability check, and friendly rewrite resolve into validated `CreativeEditorDocument` patch sets.
- **Local editor test route wired** - `/campaigncue/app/editor-test` can exercise Design Cue with an in-memory document and no Firebase writes.
- **Guarded model boundary added** - `POST /api/campaigncue/design-cue/turns` is protected by auth, CampaignCue runtime/scope checks, rate limiting, and Zod validation, then fails closed while model assist is disabled.

### Boundaries

- **No provider-owned editor truth added** - Design Cue updates only through validated document patches and shared editor history; Fabric JSON, raw model output, signed URLs, and base64 payloads are not persisted as product truth.
- **No posting or account connection added** - Design Cue prepares editable changes and export-ready assets only. Direct social posting, WhatsApp send, Google publish, and ad spend mutation remain disabled.
- **Model assistance remains disabled** - Provider-backed intent/copy/critique requires separate SAFE_MODE, capacity/accounting, response-schema, and fixture-test work before enablement.

### Fixed

- **Missing facts no longer create placeholder layers** - If locality or contact details are not confirmed, Design Cue now shows a review card instead of adding placeholder text such as a generic area or contact-review message.
- **Patch validation tightened** - Design Cue now bounds generated geometry/style values and handles invalid JSON on the guarded model route with a safe `400` response.

### Cost

- **Known commands cost zero Firebase/provider operations** - Command chips, deterministic comments, patch preview, and local patch apply do not read Firestore, write Firestore, call Cloud Functions, use Storage, or call an AI provider.
- **Model route is fail-closed** - The active route does not call a provider or create usage records while `ENABLE_CAMPAIGNCUE_DESIGN_CUE_MODEL_ASSIST` is false.

### Validation

- **Design Cue validation report added** - `__docs__/campaigncue/design-cue/design-cue_validation.md` records files reviewed, fixes made, security result, Firebase cost result, UX result, browser smoke, and remaining gated work.
- **Verification passed** - `node scripts/verification/verify-campaigncue-runtime.js`, `npx tsc --noEmit --incremental false --pretty false`, `npm run lint`, `git diff --check`, and browser smoke on `http://localhost:3106/campaigncue/app/editor-test` passed. `npm run build` was not run because production builds are opt-in.

## June 12, 2026 - CampaignCue CueLayers Safe Upload Spine

### Added

- **CueLayers safe upload spine implemented** - CampaignCue owners can upload PNG, JPEG, or WebP images from Editor or Asset Library, open the preserved original in the shared Creative Editor, autosave immutable editor snapshots, and register exported assets for manual download/reuse.
- **CueLayers contracts added** - CampaignCue now has CueLayers constants, types, validation schemas, immutable Storage paths, model capability registry, source-package artifacts with truth snapshots, layer index, repair record, and export metadata contracts. Quality report, job event, correction event, and cost contracts are reserved for provider/decomposition mode.
- **CueLayers API routes added** - Protected routes now cover upload, design list, job read, boot, autosave, fallback repair record, and revision-pinned export.

### Boundaries

- **Provider decomposition remains gated** - Generated-source intake, OCR/text recovery, segmentation, vectorization, semantic background repair, worker dispatch, premium model calls, and high-confidence editable decomposition are disabled until adapters and deterministic fixtures exist.
- **Original image remains first-render truth** - The implemented projection opens the uploaded image unchanged as a locked reference and never persists signed URLs or base64 payloads in durable editor state.

### Cost

- **No model cost introduced** - The current CueLayers path uses validation, Storage, Firestore pointers, and shared-editor export registration only. Provider calls and worker fan-out remain off.
- **Firestore stays pointer-only** - Active v1 source packages, layer indexes, editor snapshots, and exports live in Storage while Firestore stores compact state and pointers. Reconstruction documents, quality reports, and diagnostics remain provider-mode Storage contracts.

### Validation

- **CueLayers validation report added** - `__docs__/campaigncue/cue-layers/cue-layers_validation.md` records implementation scope, files reviewed, fixes made, security result, Firebase cost result, UX result, docs result, and remaining gated work.

## June 12, 2026 - Shared Creative Editor And CampaignCue Adapter

### Added

- **Shared Creative Editor added** - A product-neutral editor module now supports the full Fabric editor shell with top toolbar, left tool rail, asset drawer, central canvas, right inspector, bottom controls, dark/light mode, layers, active templates, text, text decoration, gradient fills, shapes, polygon/path/freehand layers, image URL/file/SVG import, QR blocks, typography, shadow, image filter presets and adjustments, image borders, background settings, preview, SVG/PNG download, JSON document export, and product-owned export callbacks.
- **Shared Creative Editor old-result parity expanded** - The editor now adds path text, arrow and thin-tail arrow layers, click-to-draw polygons, polygon point editing, visible export watermark, image outline controls, multi-stop gradients, RemoveColor/Gamma/grayscale-mode filters, richer dash/cap borders, multi-select distribute X/Y, numeric ruler gutters, replace-image file action, PNG clipboard export, and base64 clipboard export while keeping product-owned backend integrations out of the shared module.
- **CampaignCue adapter added** - CampaignCue can start a blank asset from Asset Library or open a campaign output in the shared editor without making the editor CampaignCue-specific.
- **CampaignCue editor exports register in Asset Library** - Exported editor assets are recorded through the existing CampaignCue asset metadata API with rights review posture and campaign/output refs when available.
- **CueLayers documentation added** - CampaignCue now has a full planned doc set for converting uploaded or generated flat images into safe editable layers in the shared editor, with source-package intake, reconstruction, validation, repair, cost, mobile, and export/download boundaries.
- **CueLayers research addendum added** - The plan now includes current market/model research, business-safe accuracy gates, provider-registry posture, protected text validation, and quality-report storage guidance.
- **CueLayers architecture reuse plan added** - The docs now require reuse of the repo AI Gateway, SAFE_MODE, rate limits, AI capacity checks, Cloud Tasks/worker posture, Storage helpers, image quality guards, and MenuList adapter boundaries for generated menu item images.
- **CueLayers contract feedback adopted** - Follow-up ChatGPT review was validated against repo architecture and current Google/Firebase docs. CueLayers docs now freeze split job status/outcome/step states, `CreativeEditorDocumentSnapshot` as durable editor truth, immutable scoped Storage paths, truth snapshot artifacts, concrete renderer allowlist, revision-pinned export, correction events, migration contracts, and capability-based model registry selection.

### Boundaries

- **No direct provider posting added** - The editor does not enable social account connection, WhatsApp direct send, Google publish, ad spend mutation, paid generation, billing, or provider upload.
- **Fabric runtime added behind the shared editor boundary** - The editor uses `fabric@5.3.0` for selection, dragging, resizing, rotation, object stacking, panning, snap guidelines, and rendered export while preserving the neutral document schema instead of storing Fabric JSON as product persistence.
- **AI tools remain disabled** - The rail keeps AI Tools visible for screen parity, but no provider behavior is active until a governed product contract exists. Templates are local document starters and do not call provider APIs.

### Fixed

- **Shared Creative Editor usability tightened** - The editor now avoids dead Home/drawer/selection controls, uses owner-readable export labels, keeps shared defaults product-neutral, preserves intermediate gradient stops when endpoint colors change, avoids double-point polygon finish glitches, and serializes the latest canvas state before preview/JSON/export.
- **CampaignCue product-domain APIs pass through correctly** - `campaigncue.ai/api/campaigncue/*` now reaches the protected API layer instead of being rewritten into the public `src/app/sites/campaigncue` website namespace.
- **Fabric adapter type safety corrected** - The shared editor Fabric adapter now imports Fabric as a runtime value, serializes Fabric path data defensively, and clears the selection overlay through the installed Fabric 5 API surface.

### Cost

- **Browser-local editing has zero Firebase cost** - Moving layers, editing properties, downloading SVG/PNG/JSON, and switching templates do not write data. CampaignCue writes only when an exported asset record is explicitly saved.

### Validation

- **CampaignCue production checks passed** - `npm run verify:campaigncue` passed with 359 checks, `npx tsc --noEmit --incremental false`, `npm run lint`, `git diff --check`, and a clean `npm run build` passed. Built-server smoke covered `campaigncue.ai/`, `campaigncue.ai/app`, `www.campaigncue.ai/app`, `campaigncue.ai/api/campaigncue/workspace` unauthenticated `401`, local `/__campaigncue`, `/__campaigncue/app`, and `/campaigncue/app`.

## June 12, 2026 - CampaignCue Export Delivery Boundary

### Changed

- **CampaignCue delivery is export/download-first** - Owner workflow now centers on single-output download, full-pack download, manual scheduling, approval, mark-used, and owner-reported results.
- **Social/provider posting is separated** - Direct WhatsApp send, Google publish, social posting, ad mutations, and provider account connection are not active day-one workflows. The future provider layer is documented separately in `__docs__/campaigncue/campaigncue-delivery-boundary.md`.
- **CampaignCue Connections became Exports** - Owner navigation now shows Export and Download instead of Posting Connections. Settings no longer exposes connected-posting or provider-generation toggles.

### Cost

- **Provider connection reads removed from workspace load** - CampaignCue overview no longer reads provider connection records in the active runtime, lowering documented overview reads from 9 to 8.
- **Provider setup writes removed** - `/api/campaigncue/integrations` is read-only posture; no setup-request or manual-confirmation write runs from the owner UI.
- **No provider cost introduced** - No direct posting, social account connection, ad spend, paid generation, rendered media, webhook, or provider metric import is active.

### Validation

- **Verifier updated** - `npm run verify:campaigncue` now enforces export-only campaign actions, read-only integration posture, delivery-boundary docs, and absence of owner integration mutation calls.

## June 12, 2026 - CampaignCue Main Gap Hardening

### Improved

- **CampaignCue now uses source facts instead of only source notes** - Business details and owner inputs derive saved facts, missing fact prompts, vertical risks, and source snapshot hashes for campaign creation and owner review.
- **Campaign ideas are more actionable** - Cues now include owner benefit, evidence, and action labels, and they account for source inputs, asset rights, scheduled manual tasks, location records, and owner-reported outcomes.
- **Campaign packs are structured** - Outputs now include headline, CTA, destination, format, consent note, policy note, approval note, UTM hint, and channel-specific manual handoff steps while keeping download/export text available.
- **Trust checks are deeper** - Checks now cover missing destinations, blocked/unreviewed facts, WhatsApp consent, Google manual verification, salon consent/result risk, restaurant menu verification, missing asset proof, and ad spend handoff.
- **Results are more honest** - Owners can record manual outcomes such as replies, bookings, walk-ins, orders, or useful comments without treating them as provider-proven metrics.
- **Asset records are safer** - Asset metadata now includes consent type, rights notes, and tags before reuse in campaign packs.
- **Launch readiness is visible** - Plan/Access now shows CampaignCue Firebase/env/Admin readiness and keeps connected sending/spend in manual mode until external setup is complete.

### Cost

- **No provider or paid generation cost introduced** - Direct publishing, WhatsApp direct send, ad spend mutation, rendered media, paid generation, and billing checkout remain disabled.
- **Firestore reads remain bounded** - Workspace load still uses bounded subcollection reads and summary documents. Campaign creation now reads bounded source, asset, schedule, location, and summary context so cue resolution stays server-authoritative without raw event scans.
- **No realtime listeners added** - Owner UI continues to merge mutation responses locally instead of keeping live listeners open.

### Validation

- **CampaignCue verifier and typecheck passed** - `npm run verify:campaigncue` passed with 245 checks and `npx tsc --noEmit --incremental false` passed after the source-fact, structured-pack, and outcome contracts were added.
- **Next expansion list added** - Future provider, billing, upload, render, agency portal, multi-location automation, and imported-metric work is parked in `__docs__/campaigncue/campaigncue-next-expansion-list.md`.

## June 12, 2026 - MenuList Owner PWA Website Copy Correction

### Improved

- **Owner PWA Dashboard positioning is clearer** - The main website Features dropdown, `/features` Operations card, and `/features/owner-phone-dashboard` now describe phone/PWA access as core owner workflow access, not just daily menu updates.
- **Owner mobile claim stays practical** - Copy now names menu edits, publishing, QR/link sharing, Business Health, feedback, screens, status, hours, and key settings while still leaving desktop useful for heavier review or precision setup.

### Cost

- **No Firebase cost change** - This is public website locale and documentation copy only. It adds no Firestore reads, writes, listeners, indexes, Cloud Functions, Storage paths, provider calls, scheduler work, cache invalidation, billing behavior, or Firebase deploy target changes.

### Validation

- **Website copy checks passed** - English and Hindi website locale JSON parsed successfully with matching `ownerPhoneDashboard` key coverage, `npm run lint` passed, `git diff --check` passed, and local smoke returned `200` for `/features/owner-phone-dashboard` and `/llms.txt` with the new Owner PWA wording present.
- **TypeScript is blocked by unrelated CampaignCue worktree errors** - `npx tsc --noEmit --incremental false` currently fails in `src/lib/campaigncue/server.ts` because dirty CampaignCue types are out of sync (`CampaignCueMetricConfidence`, missing `CampaignCueOpportunity` fields, missing `CampaignCueOverview` fields, missing `CampaignCueOutput.fields`, and missing `CampaignCueAsset.tags`). This website-copy pass did not modify those CampaignCue files.

## June 11, 2026 - CampaignCue Routing Domain Cross-Check

### Fixed

- **CampaignCue local dev prefix matching is stricter** - Product dev prefixes now match only the exact prefix or a slash-boundary child path, so `/__campaigncue` and `/__campaigncue/app` route to CampaignCue while `/__campaigncuex` does not.
- **CampaignCue URL architecture comments are current** - `src/constants/urls.ts` and `src/lib/multiTenant/domainResolver.ts` now list CampaignCue as an active local, preview, and production product-domain surface.

### Cost

- **No Firebase cost change** - This is route matching, source comments, verifier, and documentation alignment only. It adds no Firestore reads, writes, listeners, indexes, Cloud Functions, Storage paths, provider calls, scheduler work, billing behavior, or Firebase deploy target changes.

### Validation

- **Routing checks passed** - `npm run verify:campaigncue` passed with 228 checks, including exact dev-prefix matching, URL-domain comments, and CampaignCue namespace reservation.
- **Build and domain smoke passed** - `npx tsc --noEmit --incremental false`, `npm run lint`, `git diff --check`, and `npm run build` passed. Built-server smoke covered local `/__campaigncue`, `/__campaigncue/app`, `/campaigncue/app`, `/__campaigncuex`, production `campaigncue.ai` and `www.campaigncue.ai`, preview `campaigncue.menulist.online`, inactive-host redirects, direct `/sites/campaigncue/app` blocking/absence, and unauthenticated API `401`.

## June 11, 2026 - CampaignCue Route Boundary Alignment

### Fixed

- **CampaignCue owner workspace moved out of the public site tree** - The CampaignCue owner app now lives under `src/app/(campaigncue)/campaigncue/app`, matching the Answerlattice route-group pattern. `src/app/sites/campaigncue` is public website only.
- **CampaignCue product-domain app routing is explicit** - CampaignCue `/app` on the product domain and local `/__campaigncue/app` now rewrite to `/campaigncue/app` instead of `/sites/campaigncue/app`.
- **CampaignCue route boundary is documented and verified** - Added the CampaignCue route-boundary doc, updated the global URL routing architecture doc, and extended `npm run verify:campaigncue` so it fails if owner app pages return under `src/app/sites/campaigncue`.

### Cost

- **No Firebase cost change** - This is route structure, middleware rewrite, verifier, and documentation alignment only. It adds no Firestore reads, writes, listeners, indexes, Cloud Functions, Storage paths, provider calls, billing behavior, scheduler work, or Firebase deploy target changes.

### Validation

- **CampaignCue route-boundary checks passed** - `npm run verify:campaigncue` passed with 222 checks, including the public-site vs owner-route-group split.
- **Build and route smoke passed** - `npx tsc --noEmit --incremental false`, `npm run lint`, `git diff --check`, and `npm run build` passed. Built-server smoke confirmed `/__campaigncue/app`, `/campaigncue/app`, `campaigncue.ai/app`, and `campaigncue.menulist.online/app` serve the owner route group, while `/sites/campaigncue/app` is absent or blocked.

## June 11, 2026 - CampaignCue Owner Usability Hardening

### Improved

- **CampaignCue now opens with an owner-first checklist** - The Home screen guides owners through confirming business details, adding today's input, creating a pack, and using it manually.
- **CampaignCue navigation is easier to scan** - Workspace sections are grouped as Start, Campaigns, Channels, and Operations, with owner-readable labels such as Business, Inputs, Connections, Ideas, Packs, Checks, Results, and Plan.
- **CampaignCue setup and posting states are clearer** - The setup-not-ready state no longer exposes Firebase instructions to owners, and connected posting now appears as off unless it is actually enabled.
- **CampaignCue forms and empty states are more practical** - Business details and input screens now include examples, clearer labels, and empty-state guidance for offers, events, service notes, menu links, booking links, and asset records.

### Cost

- **No Firebase cost change** - This is workspace UI, constants, verifier, and docs alignment only. It adds no Firestore reads, writes, listeners, indexes, Cloud Functions, provider calls, billing behavior, direct publishing, Storage uploads, scheduler work, or Firebase deploy target changes.

### Validation

- **CampaignCue static checks passed** - `npm run verify:campaigncue` passed with 196 checks, and `npx tsc --noEmit --incremental false`, `npm run lint`, `git diff --check`, and `npm run build` completed successfully.
- **CampaignCue built-route smoke passed** - Built-server HTTP smoke with `X-Forwarded-Proto: https` returned `200` for `/__campaigncue` and `/__campaigncue/app`, loaded the workspace bundle with `noindex`, and returned `401` for unauthenticated `/api/campaigncue/workspace`. The in-app browser blocked local routes before load, so this pass used HTTP route evidence instead of a fresh visual screenshot.

## June 11, 2026 - Answerlattice Owner Usability Hardening

### Improved

- **Answerlattice dashboard metadata is product-scoped** - Authenticated Answerlattice routes now publish Answerlattice Open Graph, Twitter, author, keyword, and app metadata instead of inheriting MenuList social preview values.
- **Launch and review screens are clearer for founders** - Activation no longer promises a fixed setup time, setup-state messages avoid backend implementation terms, Weekly Digest describes the prepared summary in owner terms, Knowledge Intake has clearer first-run and no-draft next actions, and Governance queues explain what happens when there is nothing to review.
- **Setup docs no longer promise a fixed install time** - Strategy, founder onboarding, and Knowledge Intake docs now describe guided setup and human review instead of using unsupported 10-minute launch claims.
- **Widget install handoff is safer** - Dashboard snippets, install docs, and agent packet source now use an explicit full-key placeholder when the raw one-time widget key is not visible. Saved key identifiers are described as lookup labels only.
- **Agent install packets no longer use saved prefixes as keys** - Workspace packets now keep the saved prefix as a dashboard identifier and use `al_full_widget_key_shown_once` for the install value unless the raw one-time key is intentionally included.
- **Mobile file intake is easier to use** - Knowledge Intake now exposes file selection through a visible 44px `Choose files` button instead of relying on the native unstyled browser file input.
- **Support Board proposal gating is understandable** - The answer-proposal action now explains when a card needs a related product entity, Governance access, or an existing proposal review instead of silently failing later.

### Cost

- **No Firebase cost change** - These are metadata, copy, empty-state, and local UI-control changes only. They add no Firestore reads, writes, listeners, indexes, Cloud Functions, scheduler work, AI calls, cache invalidation paths, or Vercel deployment behavior.

### Validation

- **Static checks passed** - TypeScript, targeted lint, scoped whitespace checks, and Answerlattice PWA verification passed for the touched surfaces.
- **Local route smoke passed** - `/__answerlattice`, `/answerlattice/dashboard`, `/answerlattice/widget/install`, `/answerlattice/knowledge-intake`, and `/answerlattice/weekly-digest` returned `200` after dev-server warm-up. Dashboard HTML no longer includes MenuList social preview markers and includes Answerlattice OG metadata.

## June 11, 2026 - Website Regional Workspace Settings Proof

### Improved

- **Features page now mentions regional workspace settings** - The Operations group now includes a compact card for owner workspace language preference, timezone, date format, and time format, while keeping customer-facing menu languages tied to the approved source.
- **Public website language boundary stays unchanged** - The main website still exposes only reviewed website/resource languages in the language switcher, sitemap, hreflang, and LLM discovery surfaces.

### Cost

- **No Firebase cost change** - This is static public website locale/docs/component copy only. It adds no Firestore reads, writes, listeners, indexes, Cloud Functions, cache invalidation paths, owner dashboard runtime, customer menu runtime, billing, auth, extraction, or Vercel deployment behavior.

## June 11, 2026 - Menu Extraction Pipeline Latency And Payload Hardening

### Improved

- **Public create-menu preview polling is lighter** - The preview client now polls `GET /api/public/create-menu` with `statusOnly=1` until extraction is completed, then fetches the full extracted menu once for review/claim.
- **Owner repeat uploads can reuse a completed extraction** - Normal owner uploads now compute a trusted server-side source fingerprint from Firebase Storage metadata and can return a recent completed job for the same project/user instead of starting another AI extraction.
- **Extraction jobs now include timing telemetry** - Worker jobs record queue wait, provider time, post-processing time, save time, total worker time, and provider upload/batch timing for platform debugging.
- **Completed project job payloads are pruned safely** - Auto-saved first-extraction project jobs keep `result.summary` and can drop heavy `result.combinedData` after the saved project has had time to consume it. Public draft, messaging onboarding, and review jobs keep full payloads while their downstream flows need them.
- **Extraction monitor handles pruned jobs** - Platform job details now show timing fields and falls back to summary data when a completed project job no longer retains full normalized output.

### Cost

- **No new collection, index, scheduler, or owner charge** - Owner upload reuse adds bounded Storage metadata reads and can avoid a new job write/provider call for repeat uploads. The cleanup runs inside the existing `menu_old_cleanup` maintenance task. Initial extraction remains a zero-unit owner operation; provider costs and token usage stay in platform telemetry.

### Validation

- **Extraction pipeline verifiers passed** - `npm run verify:menu-extraction-pipeline` passed 27 checks and `npm run verify:menu-extraction-pipeline:dry-run` passed 48 checks.
- **Type checks passed** - `npx tsc --noEmit --incremental false --pretty false` and `npm --prefix functions run build -- --pretty false` completed successfully.
- **Scoped Firebase deploy is blocked by project billing** - `firebase deploy --only functions:processMenuImagesJob,functions:menulistMaintenanceScheduler --project ecomsai` completed predeploy lint/build but failed Secret Manager validation because billing is disabled on `ecomsai`.

## June 11, 2026 - MenuList Feature Visual Tag De-Duplication

### Fixed

- **Dedicated feature-page hero tags no longer repeat three times on mobile** - The shared feature visual component no longer renders a generic trailing proof-chip row after every feature visual. Feature-specific chips remain only inside the visual where they explain the asset, and the separate page signal strip remains the page-level proof row.
- **Dead feature-visual pill CSS removed** - Website CSS no longer carries the unused `.ws-feature-visual__pills` rules or Official Business Page override.

### Validation

- **Feature visual source scan passed** - No `.ws-feature-visual__pills` references remain after the shared component and CSS cleanup.
- **Dedicated feature routes passed local smoke** - All ten generic feature pages returned `200`, rendered no `.ws-feature-visual__pills` nodes, and showed no missing-message markers on localhost.
- **Static checks passed** - `git diff --check`, `npm run lint`, and `npx tsc --noEmit --incremental false` completed successfully.

### Cost

- **No Firebase cost change** - This is static public website component/CSS/docs cleanup only. It adds no Firestore reads, writes, listeners, indexes, Cloud Functions, cache invalidation paths, auth behavior, pricing, payment, upload, extraction, customer menu runtime, owner dashboard runtime, or Vercel deployment behavior.

## June 11, 2026 - Owner App Locale Expansion

### Improved

- **Owner app language support now includes the regional India expansion, the first international batch, and the final practical global pass** - `APP_LANGUAGES` now exposes `gu-IN`, `kn-IN`, `ml-IN`, `pa-IN`, `ur-IN`, `or-IN`, `as-IN`, `ne-NP`, `mai-IN`, `kok-IN`, `sd-IN`, `ks-IN`, `doi-IN`, `mni-IN`, `sat-IN`, `brx-IN`, `fr-FR`, `pt-BR`, `de-DE`, `it-IT`, `ja-JP`, `zh-CN`, `id-ID`, `vi-VN`, `th-TH`, `ko-KR`, `tr-TR`, `ms-MY`, `nl-NL`, `pl-PL`, `uk-UA`, `cs-CZ`, `ro-RO`, `el-GR`, `hu-HU`, `sv-SE`, `da-DK`, `fi-FI`, `fil-PH`, `zh-TW`, `he-IL`, `fa-IR`, and `sw-KE` alongside the existing supported app locales.
- **Dashboard and mobile dashboard strings now cover the added languages** - The added owner-app locales now include the full `Dashboard` and `MobileDashboard` key sets, with placeholders and ICU plural strings preserved. Native-market copy review remains separate from runtime coverage.
- **Kashmiri and Bodo are fallback-safe pending native copy** - `ks-IN` and `brx-IN` are selectable owner-app locales with English runtime fallback coverage because no reliable machine-translation source was used for those languages in this pass.
- **The first international owner-app batch has compact runtime coverage** - French, Brazilian Portuguese, German, Italian, Japanese, Simplified Chinese, Indonesian, Vietnamese, Thai, Korean, Turkish, and Malay now have owner-app locale files, mobile shell labels, OBP fallback mapping, Ant Design component locale mapping, and public render-language mapping.
- **The final practical global owner-app batch has compact runtime coverage** - Dutch, Polish, Ukrainian, Czech, Romanian, Greek, Hungarian, Swedish, Danish, Finnish, Filipino, Traditional Chinese, Hebrew, Persian, and Swahili now have owner-app locale files, mobile shell labels, OBP fallback mapping, and public render-language mapping. Ant Design component locale mapping is native where the library ships a locale pack; Filipino and Swahili use English Ant Design component chrome.
- **Russian remains excluded from owner app UI locales** - Russian remains in the broader menu-content language list, but it was not added to `APP_LANGUAGES` in this global UI pass pending business/compliance review.
- **Mobile locale shell text covers the added languages** - Mobile confirmation, selection, close, cancel, and fullscreen messages now have localized text for the added owner-app locales.
- **Official Business Page locale fallback recognizes the added language codes** - Public OBP interface labels can resolve the new app locale files while still falling back to English for untranslated keys.
- **Public website resource discovery remains reviewed-only** - The added app locales were not added to the public website language switcher, sitemap, `hreflang`, resource static params, or LLM discovery files because full reviewed resource packs do not exist yet.

### Validation

- **Locale JSON integrity checked** - Added locale files parse correctly and are wired into the app locale resolver.
- **Dashboard/mobile placeholder validation passed** - A focused check confirmed all added locales include every `Dashboard` and `MobileDashboard` key from `en-US`, with matching placeholders and valid plural strings.
- **TypeScript, lint, and resource discovery checks passed** - `npx tsc --noEmit --incremental false --pretty false`, `npm run lint`, `npm run verify:website-resource-locales`, `npm run verify:agent-readiness`, and `git diff --check` completed successfully.
- **Localhost dev smoke passed** - `npm run dev` served `/`, `/signin`, and `/resources/menu-source-audit` with the added locale cookies and no missing-message markers. Unreviewed `/{locale}/resources` paths render the noindex resource-not-found state instead of localized resource content.
- **Chrome visual spot-check passed** - Chrome loaded the sign-in surface on `127.0.0.1:3000` with visible controls and no missing-message markers. Chrome also loaded `/nl-NL/resources` as the noindex resource-not-found boundary. Direct `localhost` navigation was blocked by the Chrome profile, so HTTP smoke remains the broader per-locale proof.

### Cost

- **No Firebase cost change** - This is static locale/config work only. It adds no Firestore reads, writes, listeners, indexes, Cloud Functions, cache invalidation paths, routes, or billing behavior.

## June 11, 2026 - CampaignCue Runtime Alignment And Build Manifest Repair

### Fixed

- **CampaignCue owner URL clearing now works** - Blank website, booking, public menu, and logo URL fields are normalized as unset values and PATCH now clears the stored optional URL instead of preserving the previous value.
- **CampaignCue campaign-create cost accounting now matches the owner UI path** - The runtime and docs now count idempotency placeholder/completion writes in addition to campaign, trust report, event, and dashboard summary writes.
- **CampaignCue idempotency is atomic** - Campaign create/action requests now claim idempotency keys with Firestore `create`, return `CAMPAIGNCUE_IDEMPOTENCY_CONFLICT` for in-flight or reused keys, and avoid duplicate writes under concurrent retries.
- **CampaignCue blocked action retries are safe** - Direct publish/send fallback responses now complete the idempotency key with a replayable error state instead of leaving an in-progress record.
- **CampaignCue analytics counters use atomic increments** - Dashboard summary updates no longer read-modify-write counters, reducing one mutation read and preventing lost increments when owner actions happen concurrently.
- **CampaignCue API reads are narrower** - Standalone campaign, asset, source, integration, location, and analytics endpoints now use workspace-only direct reads instead of loading the full overview; successful owner mutations merge response data locally instead of reloading the workspace after every save/action.
- **CampaignCue initial ChatGPT alignment clarified** - The coverage audit now distinguishes the original rendered banner/video, credit, provider, agency, and multi-location ideas from the active manual/export-first runtime so docs do not imply rendered media, billing, or provider automation is live.
- **CampaignCue constants are product-scoped** - The old flat `src/constants/campaigncue.ts` file was replaced with `src/constants/campaigncue/` submodules for product identity, database, channels, domains, routes, Firebase env/app names, errors, website metadata, workspace defaults, and navigation. Shared loader, routing, env validation, reserved namespace, API, Firebase, and workspace surfaces now consume those constants where safe.
- **Production build manifest repair added** - `next.config.js` now repairs emitted special Pages Router and App Router manifest entries when Next's worker build emits route files but leaves generated manifests incomplete.

### Aligned

- **CampaignCue docs now separate live runtime from provider contracts** - Product, Source Integrations, Opportunity Engine, WhatsApp, Google Local, Analytics, API Boundaries, Permissions/Billing, Campaign Studio, and validation docs now state that the active runtime is manual/export-first and that direct publish, direct send, provider sync, provider metrics, billing checkout, rendered video, paid generation, and MenuList write-back remain disabled.

### Validation

- **CampaignCue verifier passed** - `npm run verify:campaigncue` completed with 178 checks.
- **TypeScript, lint, and production build passed** - `npx tsc --noEmit --incremental false`, `npm run lint`, and `npm run build` completed successfully. The build generated 357 static pages after the manifest repair.

### Cost

- **No provider or Cloud Function cost added** - The changes add no realtime listeners, Cloud Functions, provider calls, direct publishing, billing checkout, paid generation, or Firebase deploy target changes. Campaign creation cost documentation now reflects six owner-path writes when idempotency is used, summary counter updates avoid one read per mutation, action responses avoid a post-write campaign reread, blocked direct-action fallbacks complete idempotency without provider calls, analytics GET reads only workspace plus summary, and successful mutations avoid full overview reloads.

## June 11, 2026 - Dashboard Supported-Language Translation Pass

### Improved

- **Dashboard and mobile dashboard strings are translated across supported MenuList locales** - `Dashboard.owner` and `MobileDashboard` now have translated values for `ar-SA`, `bn-IN`, `es-ES`, `gu-IN`, `hi-IN`, `mr-IN`, `ta-IN`, `te-IN`, and `zh-CN`, with `en-GB` using British-English wording where it differs.
- **Placeholder and plural strings were preserved** - Dynamic strings such as `{count}`, `{rate}`, `{month}`, and dashboard plural messages keep their interpolation and ICU plural syntax across every supported locale.
- **Brand and platform terms stay stable** - Product/platform tokens such as WhatsApp, Instagram, Facebook, iOS, and Android remain unchanged where that is the expected local display name.

### Validation

- **Locale integrity checks passed** - All MenuList locale JSON files parse, every supported locale has the full `Dashboard.owner` and `MobileDashboard` key set, and placeholder/plural validation passed with no leftover translation placeholder tokens.
- **Whitespace check passed** - `git diff --check` completed successfully.

### Cost

- **No Firebase cost change** - This is locale content only. It adds no Firestore reads, writes, listeners, indexes, Cloud Functions, cache invalidation paths, routes, or billing behavior.

## June 11, 2026 - MenuList Route Inventory Smoke

### Validated

- **MenuList page-route inventory was separated from other products** - `src/app` contains 103 MenuList page routes, 103 Answerlattice page routes, 2 CampaignCue page routes, and 5 MyCodex page routes. Answerlattice, CampaignCue, and MyCodex routes were intentionally excluded from MenuList QA.
- **MenuList page routes passed localhost dev smoke** - 101 non-Sentry MenuList page routes were fetched on `npm run dev` with an authenticated platform-owner session and `?e-locale=hi-IN`; 100 returned `200`, the explicit `/404` route returned `404`, and no tested page returned `5xx`, timed out, or rendered missing-message markers.
- **Intentional error routes were skipped** - `/test-sentry` and `/platform/test-sentry` were not smoke-tested because they intentionally trigger monitoring errors.
- **MenuList API routes were inventoried without destructive calls** - 115 MenuList API handlers were classified statically. Mutating POST/PATCH/DELETE handlers were not bulk-called because they can write data, trigger billing/provider operations, or invalidate public truth.

### Notes

- **Tenant-only PWA manifest remains tenant-host proof pending** - `/manifest.webmanifest` correctly returns `{}` with `404` on the platform host. The active platform-owner test store had no configured domain, so tenant-host manifest proof remains pending until a real test subdomain/custom domain is selected.
- **Full mobile visual route certification remains pending** - Dashboard and Transactions mobile routes were checked, and the mobile shell route map was inspected, but every `MobileMoreScreen` sub-screen was not interactively opened in browser during this pass.

### Cost

- **No Firebase cost change** - This is audit/runtime smoke documentation only. It adds no reads, writes, listeners, indexes, Cloud Functions, cache invalidation paths, or billing behavior.

## June 11, 2026 - Dashboard And Transactions Route Language Pass

### Improved

- **Transactions language coverage now spans desktop and mobile** - Desktop Transactions, the transaction details modal, mobile Transactions, the mobile detail sheet, and shared AI-operation labels now use the `Transactions` locale namespace with safe English fallbacks.
- **Dashboard language coverage now spans desktop and mobile sections** - Desktop dashboard tabs, view headings, Today/Daily/Weekly/Monthly/Overview/Overall cards, OBP metrics, customer-app metrics, AI summary, top-items, health signals, owner action plan, quality signals, and mobile dashboard section cards now use dashboard locale keys with safe English fallbacks.
- **Dashboard activity copy now pluralizes correctly** - The monthly activity-days label now uses plural rules so one active day does not render as `1 days`.
- **Supported MenuList locale payloads have the dashboard key structure** - All `public/locales/menulist.ai/*.json` files now include the `Dashboard.owner` and `MobileDashboard` key trees needed to avoid runtime missing-key output. Full native translation review remains separate from this runtime-safety pass.

### Validation

- **TypeScript, lint, and whitespace checks passed** - `npx tsc --noEmit --incremental false --pretty false`, `npm run lint`, and `git diff --check` completed successfully.
- **Locale key coverage passed** - A script confirmed every MenuList locale file includes the `Dashboard.owner` and `MobileDashboard` keys present in `en-US`.
- **Localhost dev route checks passed** - `npm run dev` served `/dashboard`, `/transactions`, `/dashboard?mobileAudit=1`, and `/transactions?mobileAudit=1` with `200 OK` under a non-English locale cookie.
- **Visual QA covered desktop and mobile routes** - Chrome verified the desktop dashboard route and mode tabs plus desktop Transactions before the native pipe dropped. In-app Browser fallback verified desktop dashboard, forced mobile dashboard, desktop Transactions, and forced mobile Transactions after a clean dev-cache restart. No covered route rendered missing translation-key text.
- **Production build was intentionally skipped** - This pass used `npm run dev` on localhost per owner instruction.

### Cost

- **No Firebase cost change** - This is presentation/localization work only. It adds no Firestore reads, writes, listeners, indexes, Cloud Functions, cache invalidation paths, public route changes, or billing behavior.

## June 11, 2026 - MenuList Ops Audit Hardening

### Fixed

- **Desktop QR routes open the active sharing surface** - `/qr-code` and the legacy `/qrCode` alias now render the Use MenuList sharing surface instead of a placeholder page.
- **Tenant compliance pages use compliance-specific metadata** - Public `/privacy`, `/terms`, and `/refund` pages now use their own title and description instead of inheriting default menu metadata.
- **Messaging onboarding ops health reads are bounded** - `/api/ops/messaging-onboarding` now reads the latest health snapshot through `systemHealth/messaging_onboarding_control.lastSnapshotId` and one direct snapshot read instead of a document-id prefix query that required a missing `__name__` index.
- **Ops Control Room actions wrap correctly** - Platform monitor action links now wrap inside the content column instead of creating horizontal page overflow.
- **Platform notification messages stay readable** - The alert table now gives the Message column a fixed readable width and uses table-level horizontal scroll instead of collapsing long alert metadata into a narrow column.

### Validation

- **Authenticated platform-owner HTTP smoke passed** - A local built-server NextAuth credentials smoke established a `PLATFORM` session and verified platform ops pages plus `/api/ops/platform-notifications`, `/api/ops/owner-notifications`, and `/api/ops/messaging-onboarding` returned `200`.
- **TypeScript, lint, and localhost dev validation passed** - `npx tsc --noEmit --incremental false --pretty false`, `npm run lint`, and authenticated `npm run dev` localhost route checks completed after the route fix.
- **Chrome visual QA ran for platform routes** - Chrome visual testing found and verified the platform notification table fix. A source-level Ops Control Room recheck confirmed no page-level overflow, but the final loaded-state production visual recheck is blocked by unrelated CampaignCue TypeScript drift and the synthetic local proxy origin's auth/App Check limits.
- **Whole-app Chrome visual QA covered owner, public, and customer routes** - The follow-up pass covered public website/sign-in, owner desktop, platform/internal, reseller, forced mobile shell, public tenant OBP/menu/compliance/feedback, and public pull API missing-key guards.
- **Production build was not used for this follow-up** - Final route validation used `npm run dev` on localhost per owner instruction.

### Cost

- **No new Firestore index or listener** - The route change replaces an indexed prefix query with one or two direct document reads on a platform-only manual monitor.
- **No Firebase cost change for visual fixes** - The UI changes are layout-only and add no reads, writes, listeners, routes, indexes, or Cloud Functions.
- **QR and compliance metadata fixes do not increase Firebase cost** - QR route reuse does not add Firebase operations, and compliance metadata reuses the existing store lookup while avoiding project metadata fallback for legal/compliance slugs.

## June 11, 2026 - CampaignCue Manual Runtime Implementation

### New

- **CampaignCue protected workspace added** - Added `/__campaigncue/app` locally and `/app` on the CampaignCue product domain for the authenticated CampaignCue workspace.
- **CampaignCue server APIs added** - Added protected `/api/campaigncue/workspace`, `/api/campaigncue/campaigns`, `/api/campaigncue/campaigns/[campaignId]/actions`, `/api/campaigncue/assets`, and `/api/campaigncue/analytics` routes.
- **CampaignCue manual campaign packs added** - CampaignCue can now create deterministic source-backed campaign packs with WhatsApp, Google local, creative, video brief, UGC script, ads handoff, and calendar outputs.
- **CampaignCue trust and manual fallback added** - Outputs now carry deterministic trust gates, and direct publish/direct send actions are blocked with manual fallback posture.
- **CampaignCue Firebase boundary added** - Added dedicated CampaignCue Firebase config/Admin client, `firebase-campaigncue.json`, Firestore rules, Firestore indexes, and Storage rules.
- **CampaignCue implementation audit added** - Added `__docs__/campaigncue/campaigncue-production-implementation-audit.md` with feature-by-feature status, security, cost, UX, docs, and validation notes.
- **CampaignCue setup-blocked state added** - Protected APIs now return safe `503` code `CAMPAIGNCUE_FIREBASE_UNAVAILABLE` when the dedicated CampaignCue Firebase project is unreachable, and the workspace app renders a setup-blocked state instead of a generic failure.
- **CampaignCue source boundary clarified** - Workspace bootstrap reads the signed-in MenuList store profile as a source, while CampaignCue workspace/campaign/trust/asset/schedule/analytics writes stay in the dedicated CampaignCue Firebase project.
- **CampaignCue owner workspace screens added** - Added Basic Details, Source Inputs, Integration Connections, Settings, Creative, Video/Reel, UGC, WhatsApp, Google Local, Ads, Agency, Locations, and Billing/Permissions posture screens with matching protected APIs for owner inputs, integration setup records, and location records.

### Validation

- **TypeScript passed** - `npx tsc --noEmit --incremental false` completed successfully after the runtime implementation.
- **CampaignCue verifier passed** - `npm run verify:campaigncue` checks the CampaignCue route/API/security/Firebase/docs contracts without initializing Firebase Admin, including the owner workspace screens and cost/input-validation guards.
- **Lint and production build passed** - `npm run lint` and `npm run build` completed successfully.
- **Docs aligned to runtime** - Product, API boundary, Business Brain, Source Integrations, Opportunity Engine, Campaign Studio, Asset Library, Calendar Scheduler, Creative Trust Center, Analytics Learning, Firebase, validation, and hub docs were updated to match the implemented runtime.
- **Firebase deploy is blocked externally** - `firebase deploy --config firebase-campaigncue.json --project campaigncue-qa --only firestore:rules,firestore:indexes,storage` failed with HTTP 403 because `campaigncue-qa` is not found or the current account lacks permission.

### Cost

- **Firebase cost is bounded and server-owned** - Workspace load uses bounded server reads, no realtime listeners, and only reads the MenuList source profile during CampaignCue bootstrap. Owner campaign creation writes the idempotency placeholder/completion, campaign, trust report, event, and dashboard summary. Provider publishing, paid AI generation, direct WhatsApp send, rendered video, ad spend mutation, and billing remain disabled.

## June 11, 2026 - CampaignCue Documentation Package

### New

- **CampaignCue docs now exist as a separate product package** - Added the CampaignCue documentation hub, naming decision, ChatGPT coverage audit, product-level doc set, and feature-by-feature documentation under `__docs__/campaigncue/`.
- **Each CampaignCue feature has a standard documentation set** - Business Brain, Source Integrations, Opportunity Engine, Campaign Studio, Creative Studio, Video Reel Studio, UGC Script Studio, WhatsApp Sales Studio, Google Local Studio, Ads Studio, Calendar Scheduler, Asset Library, Creative Trust Center, Analytics Learning, Agency Workspace, Multi-Location Center, Permissions Billing, and API Boundaries now each have README, spec, implementation, marketing, website, helpdoc, Firebase, and mobile-support docs.
- **CampaignCue foundation shell started** - Added the `campaigncue` product id, local `/__campaigncue` route, preview `campaigncue.menulist.online` target, production `campaigncue.ai` target, product-domain registry entry, static public shell, robots output, sitemap output, and reserved namespace protection.
- **CampaignCue runtime modules are feature-gated** - The public shell is enabled, while CampaignCue app shell, source integrations, generation, publishing, billing, and analytics remain disabled until their security, cost, trust, and Firebase boundaries are implemented.
- **CampaignCue branding boundary added** - Added CampaignCue-specific manifest, icon, server loader branding, and client global loader branding so the new product shell does not inherit MenuList loading or PWA metadata.

### Validation

- **ChatGPT conversation coverage checked** - The visible conversation concepts and detailed Points 26-29 were mapped into the CampaignCue coverage audit, with explicit notes for product separation, source-aware campaign packs, trust checks, manual fallback, credits, agency/multi-location boundaries, success metrics, and guardrails.
- **Explicit 29-point alignment checklist added** - The CampaignCue coverage audit now maps Product Definition through Risks and Guardrails point-by-point, including the cross-cutting data model, UX-flow, integration, and success-metric coverage.
- **Founder research addendum added** - CampaignCue now has a current market/platform/policy research addendum covering the product wedge, competitor pressure, WhatsApp, Google Business Profile, ads policy, reviews/testimonials, contact marketing, API posture, analytics confidence, agency/multi-location risk, and domain signal.
- **Current platform constraints were checked before channel docs** - WhatsApp consent/opt-out posture, Google Business Profile post/API limitations, and Google/Meta ads policy/API boundaries were reflected in the relevant feature docs.
- **Foundation runtime smoke passed** - Local `/__campaigncue`, preview-host `campaigncue.menulist.online`, CampaignCue robots output, CampaignCue sitemap output, desktop layout metrics, and 390px mobile layout metrics were checked locally.

### Cost

- **No Firebase cost change** - The CampaignCue foundation adds static product routing and static website files only. It changes no Firestore reads/writes, Storage paths, Cloud Functions, Firebase rules, auth behavior, billing behavior, schedulers, provider calls, public menu runtime, owner dashboard runtime, or MenuList write-back behavior.

## June 10, 2026 — MenuList Feature Visual Launch Polish

### Fixed

- **Feature hero visuals now read as one clean product canvas** - The dedicated feature-page hero visual system now gives the media column more room, removes the nested browser border from the Official Business Page visual, hides redundant bottom tags on that page, and softens proof chips so the visuals no longer feel boxed, repeated, or compressed.
- **Feature visual microcopy is readable on mobile** - Small visual labels now stay at a readable website label size, and the Print-ready Kit mobile visual uses compact rows instead of three narrow mini cards.

### Validation

- **Desktop and mobile browser checks passed** - Representative feature pages were checked at desktop and 390px mobile widths with no horizontal overflow. Official Business Page now renders one occurrence of the hero visual headline, a wider visual canvas, no inner border, and no redundant bottom pill row.
- **Theme checks passed** - The Official Business Page hero visual was checked through the website theme shortcut in light and dark mode; the visual kept the same dimensions and no overflow in both modes.

### Cost

- **No Firebase cost change** - This is static public website component/CSS/docs polish only. It changes no Firestore reads/writes, Cloud Functions, Storage paths, auth, pricing, payment, upload, extraction, customer menu runtime, owner dashboard runtime, or Vercel deployment behavior.

## June 10, 2026 — MenuList Website Final Readiness QA

### Fixed

- **Legacy public brand wording removed from website locale payloads** - Support-feedback labels in the MenuList website locale pack now say `MenuList` instead of `MenuList AI`, matching the current public wordmark and avoiding stale AI-first branding in serialized public page payloads.

### Validation

- **Website brand scan passed** - The active website component tree, route group, main website docs, and locale packs no longer contain live `MenuList AI` marketing copy except archived historical prompt records.

### Cost

- **No Firebase cost change** - This is static public website locale/docs cleanup only. It changes no runtime data access, auth, pricing, payment, upload, customer menu, Firebase rules, Cloud Functions, or Vercel deployment behavior.

## June 10, 2026 — MenuList Feature Page Visual Proof Pass

### Improved

- **Dedicated feature pages now show product-proof visuals** - Generic MenuList feature campaign pages now use `FeatureDetailVisual.tsx` in the hero preview slot, replacing the old generic icon card with feature-specific product states for import, content prep, featured choices, Official Business Page, QR/link sharing, print-ready kit, owner phone dashboard, menu-quality validation, customer feedback loop, and public discovery.
- **Visuals stay tied to real feature copy** - The new visuals reuse existing `Website.FeatureDetail` locale keys and feature config icons instead of adding hardcoded English, fake screenshots, or unsupported product claims.
- **Mobile visuals are compacted for evaluation pages** - Print-ready Kit and Customer Feedback Loop use denser mobile visual grids, and import/content/QR/discovery layouts wrap their proof chips so the hero proof remains readable without horizontal overflow.

### Validation

- **Feature route smoke passed** - `/features/menu-import`, `/features/menu-content-prep`, `/features/featured-choices`, `/features/official-business-page`, `/features/qr-menu-links`, `/features/print-ready-kit`, `/features/owner-phone-dashboard`, `/features/menu-quality-validation`, `/features/customer-feedback-loop`, and `/features/public-discovery` returned `200` locally.
- **Desktop and mobile layout checks passed** - Browser checks across the ten generic feature pages confirmed the new visual slot renders on each route, desktop keeps the intended hero columns, 390px mobile uses one-column hero layout, and no route has horizontal overflow.
- **Static checks passed** - `npm run lint`, `npx tsc --noEmit --incremental false`, and `git diff --check` completed successfully.

### Cost

- **No Firebase cost change** - This is static public website component/CSS/docs work only. It adds no Firestore reads/writes, Cloud Functions, Storage paths, Firebase rules, auth behavior, billing behavior, schedulers, or runtime AI calls.

## June 10, 2026 — Answerlattice Support-Suite Website Pass

### Improved

- **Answerlattice homepage now presents the product as one support suite** - The public homepage keeps support-suite cards, install quickstarts, pricing, objections, and the connected support-surface story so buyers see widget, hosted help, fallback, feedback, changelog, and approved-answer review as one support layer.
- **Answerlattice homepage is shorter for first-time buyers** - The rendered homepage path is reduced from 18 sections to 11 while preserving the sticky support-surface story, feature-wise product cards, and main USP signals, and moving repeated setup, trust, founder-review, and comparison detail to Product, feature, resource, security, and comparison pages.
- **Answerlattice visual assets now have an inventory before asset creation** - Future homepage, feature-page, install, security, and demo visuals are tracked in `src/content/answerlatticePublic/visualAssets.ts`, and rendered product-media slots expose stable `data-answerlattice-asset-slot` metadata for the later asset pass.
- **Answerlattice website assets now use product-scene visuals** - The 25 stable homepage, Product, product-area, feature, widget, and demo PNG slots now render generated Answerlattice dashboard/widget/governance scenes instead of generic dummy frames, with matching internal SVG sources and a manifest for future replacement.
- **Answerlattice concept illustrations added** - Product, Install, Security, and Comparisons now use reusable inline SVG panels for source-to-answer flow, governance review, install verification, safe context, and category positioning instead of adding generic cartoon artwork.
- **Answerlattice feature pages now reconnect to the full product** - Product-area and feature-page templates now explain where each narrower capability fits across setup, in-app support, hosted help, fallback, feedback, owner-approved answers, security boundaries, and category-fit checks.
- **High-intent navigation is clearer** - The Answerlattice header now exposes Demo and Install as top-level links alongside Product, Use Cases, Resources, and Pricing.

### Fixed

- **Homepage animated H1 text now preserves readable spacing** - The animated word spans still keep the visual reveal treatment, but extracted text and the accessible label now read `Support your product users without hiring a support team.` instead of concatenating words across spans.

### Validation

- **Answerlattice public route smoke passed** - All 73 public Answerlattice routes rendered locally through `/__answerlattice` with 200-level responses, H1/title presence, Answerlattice site content, and no obvious error-page or bad asset text.
- **Answerlattice browser route smoke passed** - Homepage, Product, all four product-area pages, all ten product-feature pages, Demo, Install, Security, Comparisons, and all three comparison-detail routes rendered locally at 1440px with no browser errors, no horizontal overflow, no broken loaded images, no placeholder alt text, and no bad asset text leakage.
- **Answerlattice asset generation passed** - `node scripts/website-assets/generate-answerlattice-website-dummy-assets.js` regenerated all 25 stable PNG slots and source SVGs; manifest coverage and representative image inspection passed.
- **Answerlattice concept illustration smoke passed** - Product, Install, Security, and Comparisons rendered the expected concept illustration slots on desktop; Product, Install, Security, and Comparisons used mobile-readable step cards at 390px; no horizontal overflow or browser errors were captured.
- **Answerlattice mobile browser smoke passed** - Homepage, Product, Tickets, Feedback Review, Install, Security, and Comparisons rendered at 390px with no horizontal overflow, no browser errors, readable H1 text, generated assets where expected, and mobile step cards for concept illustrations.
- **Static checks passed** - `npm run lint`, `npx tsc --noEmit --incremental false`, targeted `git diff --check`, asset manifest coverage, and placeholder/dummy wording scans completed successfully.

### Cost

- **No Firebase cost change** - This is static public website and documentation work only. It adds no Firestore reads/writes, Cloud Functions, Storage paths, Firebase rules, auth behavior, billing behavior, schedulers, or runtime AI calls.

## June 10, 2026 — Business Health Owner Signal Pass

### Improved

- **Business Health now shows owner-facing daily signals** - Existing Health and analytics read models are translated into Menu views, Top demand, Best source, and Needs attention instead of generic analytics labels.
- **Problems now map to owner actions** - Business Health check cards and mobile summaries label issues as Promote, Fix, Restock, or Update so owners can see the practical next step faster.

### Cost

- **No Firebase cost change** - This is a presentation/read-model translation on already-loaded Business Health current and analytics-index responses. It does not add analytics events, Firestore reads/writes, Cloud Functions, Storage paths, POS/AOV attribution, or customer menu runtime changes.

## June 10, 2026 — Website Content QA Pass

### Fixed

- **Mobile feature cards no longer squeeze headings** - On narrow screens, clickable feature cards now keep the icon and heading left-aligned and move the `View` action onto its own row, preventing the button from overlapping or compressing titles such as `Descriptions written for you`.
- **Create-menu preview copy is now locale-backed** - Loading, processing, expiry, failure, empty-state, detected-detail, stats, claim-form placeholder, and claim-error strings on `/create-menu/preview/[draftId]` now read from `Website.CreateMenu` locale keys instead of hardcoded English.
- **Marketing helper labels now follow the website copy layer** - Feature-off create-menu fallback copy, industry landing helper headings, footer home aria label, and the scroll-to-top aria label now use `Website` locale keys.

### Validation

- **Public website route/content smoke passed** - Checked homepage, feature pages, supporting pages, resource pages, industry pages, legal pages, `/create-menu`, and Trust & Security locally for 200 responses and placeholder/undefined/typo-pattern leakage.
- **Locale key parity passed** - `Website` namespace key counts match across English and Hindi with no missing or extra keys.
- **Static checks passed** - `npm run lint` and `npx tsc --noEmit --incremental false` completed successfully.

### Cost

- **No Firebase cost change** - This is public website component text, locale, and documentation cleanup only. It does not change create-menu extraction, claim runtime, owner dashboard runtime, customer menu runtime, Firebase rules, Cloud Functions, auth, pricing, payment, or Vercel deployment.

## June 10, 2026 — Customer Feedback Loop Feature Page

### New

- **Customer Feedback Loop added as a dedicated website feature page** - `/features/customer-feedback-loop` now explains the public-to-owner correction loop for private guest feedback from public menus, Official Business Page, QR, or direct links.
- **Feature navigation now links to the feedback loop** - The Operations group, desktop Features dropdown, and mobile hamburger feature list include `Customer feedback loop`.

### Fixed

- **Features dropdown trigger no longer navigates away** - The desktop `Features` header item now behaves as a menu trigger; `/features` remains available through the `Feature overview` row inside the dropdown.
- **Features dropdown is grouped on desktop** - Desktop now mirrors mobile with Start, Publish, and Operate groups so the feature menu reads like a product map instead of one flat list.
- **Features dropdown hover bridge added** - The panel has a small invisible pointer bridge and softer border treatment so it stays open while moving from the trigger into the menu and feels less outlined in dark mode.
- **Clickable feature cards are now distinguishable** - Cards on `/features` now use a leading icon and title row; cards that open a dedicated feature page show a compact top-right `View` action, stronger resting border treatment, and clearer hover/focus movement. Static informational cards keep the same leading-icon structure without the action pill.
- **Feature journey proof cards have more room** - Shared feature detail pages now place the active story copy above the proof-card row on desktop, inside one parent story card without an internal divider, so the three supporting cards no longer feel squeezed inside a narrow right column.
- **Feature journey height is more responsive** - The shared sticky journey now uses a tighter desktop height clamp and responsive proof-card minimums, reducing empty vertical space on tall displays while keeping enough room on shorter laptops.
- **Feature journey pill spacing improved** - The pill row now has a small explicit gap before the proof-card row, so labels such as `Descriptions`, `Images`, and `Languages` do not sit too close to the cards below.

### Documentation

- **Discovery files updated** - `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt` now include the new feature route.
- **Internal Feedback System website guidance added** - The feature docs now define the public copy boundary: frame feedback as issue correction and owner review, not review management, sentiment analysis, or public reputation automation.

### Cost

- **No Firebase cost change** - This is static public website route, locale, metadata, discovery, and documentation work only. It does not change guest feedback runtime, owner inbox runtime, mobile shell runtime, Firebase rules, Cloud Functions, auth, pricing, payment, or customer menu runtime.

## June 10, 2026 — Feature Detail Page Readiness Pass

### Improved

- **Feature pages now match the Print-ready Kit readiness bar** - Menu Import, Menu Content Prep, Featured Choices, Official Business Page, QR Menu and Links, Owner Phone Dashboard, Menu Quality Validation, and Public Discovery now explain the real owner/customer workflow with stronger proof, owner-control boundaries, and claim-safe language.
- **Menu Quality Validation key parity fixed** - The page now has the full generic feature-detail copy set in English and Hindi, and internal process wording was removed from public copy.
- **Metadata and discovery descriptions aligned** - Feature page metadata, the discovery registry, `llms.txt`, and static sitemap dates now match the updated public feature positioning.

### Fixed

- **Platform discovery base URL now uses the production canonical domain** - `getPlatformDiscoveryBaseUrl()` derives its default from the MenuList production deployment target so generated discovery URLs stay on `https://menulist.ai` instead of local or preview defaults.

### Cost

- **No Firebase cost change** - This is public website locale, metadata, discovery, and documentation copy only. It does not change owner dashboard runtime, mobile shell runtime, extraction workers, Assets runtime, Firebase rules, Cloud Functions, auth, pricing, payment, or customer menu runtime.

## June 10, 2026 — Print-ready Kit Feature Page Parity

### Improved

- **Print-ready Kit page now reflects the Assets workflow** - `/features/print-ready-kit` copy now explains asset type selection, supported style families, image-first preview, PDF/image downloads, Menu Kit ZIP, print-shop handoff, and reprint guidance instead of only describing a generic Menu Kit bundle.
- **Template choice wording is accurate** - Public copy uses "up to nine" style families for QR/display assets and avoids claiming every asset has nine templates when some outputs expose only real supported layouts.

### Documentation

- **Print Assets and Printable Asset Templates website docs updated** - Website guidance now matches the implemented Assets route and keeps internal renderer/catalog details out of public copy.

### Cost

- **No Firebase cost change** - This is public website locale and documentation copy only. It does not change owner Assets runtime, printable rendering, mobile shell, Firebase rules, Cloud Functions, auth, pricing, extraction, or customer menu runtime.

## June 10, 2026 — Business Health Not-Ready Cleanup

### Fixed

- **Business Health first-run state no longer shows fallback shortcut sections** - Desktop and mobile Business Health now keep Ask, suggested questions, priority-check workflow, and fallback shortcut cards hidden until a source-backed store check exists.

### Cost

- **No Firebase cost change** - This is owner UI gating and documentation alignment only. It does not change Firestore reads/writes, Cloud Functions, Firebase rules, auth, pricing, scheduler behavior, or customer menu runtime.

## June 9, 2026 — Owner Mobile Screen QA

### Improved

- **Shared mobile navigation controls now meet the 44px touch target rule** - The mobile `NavBar`, picker header actions, temporal inputs, app-settings close action, help search button, bulk-action controls, time-slot color choices, and AI-defaults color input now use mobile-safe touch sizing.
- **Share setup fallbacks stay inside the mobile shell** - Digital Screen and POS setup fallback actions now route to the matching `#mobile/more/...` sub-screen instead of assigning `/business-settings` directly.

### Verified

- **Owner mobile shell route inventory reviewed** - Dashboard, Today, Menu, Share, Feedback, Billing, Transactions, Locations, Users, Business Settings, Print Assets, Business Health, POS Sync, SEO/analytics, domain settings, customer app, and More sub-screens remain routed through `MobileShell` on handheld devices.
- **Theme-token sweep completed for owner mobile screens** - Remaining literal colors in `src/components/mobile/` are preview/swatch/brand-output colors or token-compatible CSS variables, not broad hardcoded owner screen backgrounds.

### Cost

- **No Firebase cost change** - This is owner mobile UI routing, tap-target, and documentation polish only. It does not change Firestore reads/writes, Cloud Functions, Firebase rules, auth, pricing, extraction, or customer menu runtime.

## June 9, 2026 — Website Production Readiness Polish

### Improved

- **Public website dark mode now owns the document background** - Website routes mount a scoped document theme helper so dark mode uses the website dark-gray token on the actual page body, preventing white overscroll or browser-edge flashes without leaking website styling into owner dashboard routes.
- **Resources and industry pages now match the reveal system** - Resource hub cards, article sections, related resources, FAQ blocks, industry proof cards, fit cards, resource links, and final CTAs now use the shared visibility-safe website reveal wrappers.
- **Mobile consent panel is more compact** - The analytics privacy prompt keeps Accept, Decline, and Privacy policy visible while reducing mobile first-viewport coverage and avoiding wrapped action labels.

### Fixed

- **Legal pages hardened for narrow screens** - Privacy, Terms, and Refund policy metadata grids now use mobile-safe grid minimums and wrapping rules so long values do not create horizontal overflow.
- **Sticky feature layouts protected from width bleed** - Shared feature journey and Business Health sticky story containers now carry explicit min-width/width guards for desktop and mobile checks.

### Verification

- `npx tsc --noEmit --incremental false`
- `npm run lint`
- `git diff --check`
- Local Chrome runtime checks across homepage, feature detail, resources, industry, and legal page types in light and dark mode for header/footer presence, body theme color, horizontal overflow, and pending reveal elements.

### Cost

- **No Firebase cost change** - This is static public website component, CSS, and documentation polish only. It does not change owner dashboard runtime, customer menu runtime, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, or Vercel deployment.

## June 9, 2026 — Feature Page Sticky Journey System

### New

- **Menu Quality Validation added as a dedicated website feature page** - `/features/menu-quality-validation` now explains menu quality checks, pricing integrity, public-readiness issues, and customer trust indicators before publishing.
- **Feature detail pages now use a sticky journey layout** - Generic feature campaign pages now share a Business Health-style sticky section with desktop left-rail steps, stacked story panels, and a mobile horizontal step rail.
- **Mobile feature navigation is grouped** - The mobile drawer now groups feature links as Start, Publish, and Operate so the feature navigation stays readable on phones.

### Improved

- **Secondary feature suggestions folded into stronger pages** - Content generation stays in Menu Content Prep, temporary status stays in Owner Phone Dashboard, discovery attributes stay in Official Business Page/Public Discovery, and web sharing/presence placement stays in QR Menu and Links/Print-ready Kit.
- **Features page quality cards now route to validation** - Menu quality signals, pricing integrity, menu validation, and customer trust indicator cards now link to the new validation page.
- **Discovery files updated** - `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt` now include the validation route.

### Cost

- **No Firebase cost change** - This is static public website route, component, CSS, locale, discovery, and documentation work only. It does not change owner dashboard runtime, Menu Correctness Engine, Menu Quality Signals runtime, customer menu runtime, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, or Vercel deployment.

## June 9, 2026 — Feature Dropdown Layout Polish

### Improved

- **Features dropdown now has clearer modal separation** - The desktop Features menu now uses a viewport-centered elevated panel, stronger border/shadow separation, a compact three-column feature grid, and a bottom proof/CTA strip instead of a tall side proof panel that visually merged with the hero.
- **Dropdown hover rhythm tightened** - Feature and resource menu rows now share cleaner hover/focus movement, borders, and background treatment.

### Cost

- **No Firebase cost change** - This is static public website header/CSS/documentation polish only. It does not change feature routes, owner dashboard runtime, customer menu runtime, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, or Vercel deployment.

## June 9, 2026 — Featured Choices Feature Page

### New

- **Featured Choices added as a dedicated website feature page** - `/features/featured-choices` now explains Featured, Quick, and Value choices as customer menu guidance from the current approved menu.
- **Feature navigation now includes Featured Choices** - The header Features dropdown places it after Menu Content Prep, and the `/features` Featured section card now links to the new page.
- **Discovery files updated** - `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt` now include the new feature route.

### Cost

- **No Firebase cost change** - This is static public website route, navigation, locale, discovery, and documentation work only. It does not change Decision Blocks scoring, public menu rendering, owner dashboard controls, analytics, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, or Vercel deployment.

## June 9, 2026 — Menu Content Prep Feature Page

### New

- **Menu Content Prep added as a dedicated website feature page** - `/features/menu-content-prep` now presents customer-friendly descriptions, menu images, and customer languages as one setup/content outcome prepared from the same owner-approved menu source before publishing.
- **Feature navigation now includes Menu Content Prep** - The header Features dropdown places it after Menu Import, and the `/features` Generated images, Descriptions written for you, and One-click translations cards now link to the new page.
- **Discovery files updated** - `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt` now include the new feature route.

### Cost

- **No Firebase cost change** - This is static public website route, navigation, locale, discovery, and documentation work only. It does not change content-generation providers, credit accounting, owner dashboard runtime, customer menu runtime, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, or Vercel deployment.

## June 9, 2026 — Print-ready Kit Feature Page

### New

- **Print-ready Kit added as a dedicated website feature page** - `/features/print-ready-kit` now presents Menu Kit and print-file value as table cards, counter cards, stickers, posters, social images, and printer handoff files from the current owner-approved menu source.
- **Feature navigation now includes Print-ready Kit** - The header Features dropdown and the `/features` Print files / Menu Kit cards now link to the new page.
- **Discovery files updated** - `PLATFORM_DISCOVERY_PAGES`, `public/sitemap.xml`, `public/llms.txt`, and `public/llms-full.txt` now include the new feature route.

### Cost

- **No Firebase cost change** - This is static public website route, navigation, locale, discovery, and documentation work only. It does not change Menu Kit generation, Print Assets runtime, owner dashboard runtime, customer menu runtime, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, or Vercel deployment.

## June 9, 2026 — Business Health Guest Feedback Signal

### Improved

- **Guest feedback now contributes to Business Health** - The store-local Business Health builder creates a capped, PII-safe `feedbackSummary` from recent public guest feedback, adds a “Review guest feedback” check when low-rating unresolved feedback exists, and reuses the existing Feedback inbox navigation action.
- **Feedback questions are grounded in the Health packet** - Owner questions such as “Any guest feedback to check?” answer from `health.feedbackSummary` only. The answer path does not query raw `guestFeedback`, does not include guest contact details, and does not call provider-backed sentiment analysis.
- **Mobile Business Health checks can open target screens** - Mobile checks now include the same registry-backed open action as desktop, so feedback checks can route owners to the existing Feedback inbox.

### Cost

- **No new hot-path Firebase read** - `/current`, `/answer`, dashboard cards, and mobile Business Health reuse the existing current Health packet. The scheduler performs a bounded recent `guestFeedback` read capped at 80 docs per due store and writes the compact summary into existing `platformSummary` Health docs.

## June 9, 2026 — Website Motion And Feature Navigation Polish

### Improved

- **Website reveal motion now has shared presets** - `AnimateOnScroll` and `AnimateStaggerChild` now support named `hero`, `media`, `card`, `footer`, and `fade` presets so homepage, footer, and dedicated feature campaign pages use consistent viewport-entry motion without hiding content by default.
- **Features dropdown now includes a compact proof panel** - The desktop Features dropdown keeps the restrained MenuList navigation shape while adding a small proof/CTA panel that explains the feature pages as one approved-source system, not a broad software-suite menu.
- **Homepage workflow propagation feels more deliberate** - Output pulses and destination-card highlights now arrive in a staggered sequence, so the input-to-MenuList-to-public-surfaces diagram reads as calm propagation instead of simultaneous flashing.
- **Footer reveal polish added** - Footer CTA, proof cards, navigation, and preference controls now use the shared reveal system while preserving semantic footer structure and existing links.

### Fixed

- **Features dropdown overview row corrected** - The Feature overview card now keeps its icon, title/description, and arrow in one aligned row in both light and dark themes.
- **Features dropdown overview interaction added** - The Feature overview card now has hover and keyboard-focus states so it reads as a clickable top-level link like the other dropdown items.

### Cost

- **No Firebase cost change** - This is static public website component, CSS, locale, and documentation polish only. It does not change owner dashboard runtime, Business Health APIs, scheduler read models, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, or Vercel deployment.

## June 9, 2026 — Feature Campaign Scroll Reveal Parity

### Fixed

- **Feature campaign pages now match homepage scroll reveal behavior** - The new feature campaign pages now use the shared `AnimateOnScroll` and staggered card wrappers for hero, section heading, proof-card, and final CTA blocks, with explicit viewport-entry reveal opacity and distance. Business Health keeps its sticky story interaction by using fade-only reveal on the sticky layout while adding the same reveal treatment around stable hero, story heading, and CTA blocks.

### Cost

- **No Firebase cost change** - This is static public website component and documentation polish only. It does not change owner dashboard runtime, Business Health APIs, scheduler read models, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, or Vercel deployment.

## June 8, 2026 — Feature Navigation And Campaign Pages

### New

- **Features dropdown added to the main website header** - Desktop navigation now opens a compact Features dropdown for Menu Import, Official Business Page, QR Menu and Links, Owner Phone Dashboard, Business Health, and Public Discovery. Mobile navigation exposes the same feature links under Features.
- **Dedicated feature campaign pages added** - New public pages were added at `/features/menu-import`, `/features/official-business-page`, `/features/qr-menu-links`, `/features/owner-phone-dashboard`, and `/features/public-discovery`. The existing `/features/business-health` campaign page remains unchanged and is included in the dropdown.
- **Feature cards wired to campaign pages** - The selected cards on `/features` now link to their dedicated feature pages instead of acting only as static cards.
- **Discovery artifacts updated** - Platform discovery, static sitemap, `llms.txt`, and `llms-full.txt` now list the new feature URLs.

### Cost

- **No Firebase cost change** - This is static public website navigation, route, component, CSS, locale, discovery, and documentation work only. It does not change owner dashboard runtime, Business Health APIs, scheduler read models, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, or Vercel deployment.

## June 8, 2026 — Business Health Website Placement

### New

- **Business Health added to the main website** - The homepage now includes a dedicated Business Health section after the prepared owner-capability proof and before Resources. It presents Business Health as the owner-dashboard check for latest menu state, public surfaces, customer attention, locations, freshness, and safe action paths.
- **Business Health added to Features** - The `/features` Operations group now starts with a compact Business Health card covering the latest MenuList check, last checked date, customer attention, whether anything needs action, and the No action needed stable state.
- **Business Health campaign page added** - The public marketing URL `/features/business-health` now explains Business Health as the owner-dashboard check for latest business state, public surfaces, customer attention, last checked date, location state, safe next actions, and No action needed when stable. `/business-health` remains the logged-in owner app route.
- **Business Health campaign page layout upgraded** - The campaign page now uses a MenuList-styled sticky story layout modeled on Answerlattice's "From inputs to support surfaces" section, with left-side tabs for What it checks, Owner outcome, and Why owners can trust it.

### Fixed

- **Business Health sticky story stack fixed** - The campaign page story section now uses a pinned viewport with layered cards, so the stack stays fixed while the left tabs and right-side cards progress through What it checks, Owner outcome, and Why owners can trust it.

### Cost

- **No Firebase cost change** - This is a static public website route/component/CSS/locale/discovery/docs update only. It does not change owner dashboard runtime, Business Health APIs, scheduler read models, Firebase rules, Cloud Functions, pricing, payment, auth, extraction, customer menu runtime, or Vercel deployment.

## June 8, 2026 — Business Health Data-Flow Hardening

### Improved

- **Mobile dashboard shows Business Health summary** - The mobile analytics dashboard now shows the cached Business Health status, freshness note, and selected-menu compact analytics before the detailed analytics tabs. It uses the same current and analytics-index hooks as the Business Health screen and stays disabled until a selected project and store scope exist.

### Fixed

- **Business Health request scope validation tightened** - Current and analytics APIs now validate query scope with the shared Business Health schema, and the desktop route normalizes `projectId` before it reaches client cache keys or answer requests.
- **Unsupported custom analytics dates refused** - Owner questions with custom date ranges no longer fall back to today; Business Health answers only from approved cached periods such as today, this week, last week, this month, and last month.
- **Business Health action targets validated** - Action requests now validate target kind against the registered target enum and the executor rejects target kinds not allowed for the selected action.
- **Provider-text actions hidden until complete** - Description/review provider-text draft actions remain registered but disabled until generated draft content and AI unit accounting are wired end to end.
- **Monitoring write counts corrected** - Answer events, thread writes, and action audits now report write counts that include the monitoring/audit write itself.
- **Thread project scope preserved** - One-doc-per-chat thread history now records the selected menu from either request `projectId` or validated client context.

## June 8, 2026 — Business Health Cache And Location Hardening

### Fixed

- **Project-scoped analytics strip corrected** - Business Health analytics strip now reads the analytics-index packet for the selected menu instead of using store-wide current Health teaser data.
- **Location summary cache scoped** - Multi-location Business Health SWR cache keys now include tenant/store scope so store switching cannot reuse the previous locations response.
- **Deactivated outlets hidden from Business Health locations** - The locations API now filters multi-location rows through `storesSummary` active state before returning them.
- **Legacy location rows sanitized** - The locations API normalizes old multi-location summary rows before sorting/counting them, so malformed `status`, `sourceFactIds`, or numeric store IDs cannot break the response.
- **Business Health page loads independently from analytics** - The page-level Health hook now reads only current Health state; the analytics strip loads its own scoped analytics index separately.
- **Current Health cache no longer fragments by menu** - Dashboard, desktop page, and mobile Business Health now read the store-level current Health packet while analytics, answers, and actions keep selected-menu scope.
- **Mobile analytics scoped to selected menu** - Mobile Business Health now reads compact analytics through the same selected-menu analytics-index hook instead of using store-wide Health teaser data.
- **Business Health action navigation keeps selected menu** - Action Support now preserves `projectId` when routing owners back into `/business-health`.
- **Business Health browser cache guard added** - Current, analytics, and location read-model caches now expire after a short local stale window, so missed browser invalidation cannot keep same-day Health facts pinned all day.
- **Business Health packet invalidation indexed** - Upstash packet writes now maintain a store-scoped packet-key index for exact invalidation, with a bounded legacy cleanup sweep for old unindexed keys.
- **Location freshness made explicit** - Desktop and mobile multi-location rows now show per-outlet check freshness so mixed outlet rebuild times are not shown as one global timestamp.

## June 8, 2026 — Business Health Monitoring And History

### New

- **Owner chat history added behind a flag** - Business Health can now keep a bounded owner conversation thread only when `ENABLE_OWNER_BUSINESS_HEALTH_THREADS` is enabled and a client `threadId` is present.
- **Internal Business Health monitor added** - Platform users can review recent Business Health questions, answers, unsupported gaps, action usage, feedback, provider-call counts, units, internal cost, and owner-charge totals from `/platform/owner-business-assistant`.
- **Business Health monitor is in Platform navigation** - Desktop Platform now includes a Business Health Monitor tab, and mobile platform admins can open the same monitor from More -> Platform Monitoring or the `/platform/owner-business-assistant` deep link.
- **Ops Control Room links the monitor** - The internal `/ops` page now links to Business Health Monitor alongside existing platform monitoring tools.
- **Business Health data coverage note added** - Dashboard, desktop, and mobile Business Health now show the settled date the check uses so owners do not read it as realtime data.
- **Business Health follow-up questions added** - Starter questions are ranked from the cached health/analytics packet, and answers now return compact follow-up questions without a separate AI or Firebase read path.

### Cost

- **Answer-event logging is separate from owner history** - Compact question/answer events write only when `ENABLE_OWNER_BUSINESS_HEALTH_USAGE_LOGGING` is enabled. Deterministic answers log zero units and zero charge; provider cost appears only when a provider-backed answer is actually used.
- **Owner chat history uses one thread document** - Business Health stores bounded `messages[]` inside `ownerBusinessAssistantThreads/{threadId}` instead of creating one Firestore document per chat message.
- **Not-ready fallback cache rejected** - Business Health no longer persists first-run fallback packets in server or browser cache, so a store can show the generated check as soon as the scheduler writes source-backed facts.
- **Question suggestions share existing writes** - Follow-up question IDs are stored only inside the existing thread message and answer-event documents when those flags are enabled.
- **Transaction wording is ready for Business Health** - AI transaction labels now render Business Health answer/draft operations in owner-facing terms if provider-backed accounting is enabled later.

## June 8, 2026 — Business Health Cross-Check Hardening

### Fixed

- **Action flags tightened** - Priority-check action buttons now hide unless the matching Action Support flags are enabled, while read-only Business Health remains usable.
- **Action navigation corrected** - Business Health action targets now resolve to existing owner routes, including dashboard analytics via `/dashboard`.
- **Analytics answers corrected** - Specific period questions now refuse when that period is unavailable instead of falling back to another period; unavailable "today" suggestions are hidden.
- **Draft and thread writes hardened** - Review-reply and temporary-status prepare actions now write compact drafts correctly, check mark/dismiss uses one audit write, and thread persistence is opt-in with bounded `threadId` writes.
- **Mobile action sheet connected** - Mobile Business Health can open returned action options only when Action Support is enabled.
- **Build memory configuration restored** - Production builds now use the documented webpack worker path and keep webpack cache disabled, avoiding local heap-limit failures before route collection.

### Firebase

- **Functions redeployed** - `computeDecisionBlocksScores`, `triggerStoreNightlyScheduler`, and `menulistMaintenanceScheduler` were redeployed to `ecomsai` after the builder changes.
- **Stale assistant-message index removed** - The old live `ownerBusinessAssistantMessages` composite index was deleted by exact index ID; current chat history uses the single thread document pattern and needs no message-query index.

## June 7, 2026 — MenuList Business Health Implementation

### New

- **Business Health runtime enabled for owner testing** - Owner dashboard card, analytics strip, `/business-health` page, mobile More sub-screen, protected APIs, and scheduler-built read models are enabled behind separate cost and safety gates.
- **Owner assistant answering layer added** - The answer API uses cached Business Health context packets, deterministic grounded answers by default, optional AI-answer flagging, source/freshness metadata, and structured action options.
- **Action Support foundation added** - Registry-driven navigation, draft capture, check reviewed/dismissed/cancelled workflow writes, audit logging, permission checks, and public-truth guards are implemented behind separate Action Support flags.

### Firebase

- **Read models and cleanup added** - The existing nightly scheduler can write Business Health current/snapshot docs and optional analytics index docs in `platformSummary`; the existing maintenance scheduler now cleans expired assistant workflow docs.
- **Server-only access enforced** - Assistant workflow collections are denied to clients in Firestore rules and accessed through protected APIs/Admin SDK only.
- **Assistant message index removed from active config** - The initial message-query index was superseded; the active thread-history path now stores bounded `messages[]` inside one thread document.

### Cost

- **Cache-first design implemented** - Browser cache and optional Upstash context cache are used before Firestore reads. Chat-time raw Firebase collection scans are not added.
- **Cost-controlled owner testing** - Owner-testable paths and Upstash packet cache are enabled, while provider-backed AI answers, direct public-truth mutation, and media/image actions remain disabled to avoid surprise provider spend or unsafe writes.

## June 7, 2026 — MenuList Business Health Planning

### Changed

- **Business Health is now documented** - The plan defines a private MenuList owner surface for seeing the latest business check, asking supported questions, and opening the right workflow when something needs attention.
- **ChatGPT proposal validated against repo truth** - Snapshot-first answers, calm owner copy, mobile parity, action confirmation, and cost checks were kept; generic chatbot behavior, floating UI, new hot-path collections, direct public publishing, and chat-time raw Firestore scans were rejected.
- **Implementation strategy is cost-first** - The docs require compact `platformSummary/ownerBusinessHealthCurrent_{tId}_{sId}` and daily snapshot docs, scheduler generation through the existing store-local intelligence path, bounded threads only behind flags, and existing public cache/publish services for confirmed public-truth writes.
- **Architecture cross-check added** - The docs now include a permanent data ownership map, source-adapter contract, function insertion rules, existing-system reuse matrix, provider-accounting requirements, and single-contract runtime-flag stance.
- **Owner analytics and Action Support architecture finalized** - The plan adds `platformSummary/ownerBusinessAnalyticsIndex_{tId}_{sId}` for standard period questions and dashboard analytics, and includes day-one Action Support for approved navigation, price, availability, visibility, category movement, description, image, publish-guard, and check-workflow actions through a registry, draft/confirm flow, existing mutation paths, and cache invalidation.
- **Business Health and Action Support are separately gated** - Business Health remains read-only when `ENABLE_OWNER_BUSINESS_ACTION_SUPPORT` is off, while Action Support has dedicated flags for navigation, drafts, confirmed writes, public truth, media, provider text/image work, and check workflow.
- **Answering layer is cache-first and AI-backed** - The final plan now requires `OwnerBusinessAssistantContextPacket` cache lookup before Firestore reads, AI answers over that packet for typed owner questions, and server validation of source facts, action IDs, permissions, and public-truth guards before rendering.
- **Read-only assistant domains are cache-bound** - Non-analytics Business Health questions now reuse cached public project/store projections or compact summaries. Ordinary read-only answers must not trigger raw project/store/feedback/review/log reads; live Firebase access is reserved for packet refresh on miss and verified mutation paths.
- **Owner-domain coverage matrix added** - Business Health docs now explicitly cover menu/project, store profile, temporary status, public links, QR/share, Customer App, digital screens, domains, locations, billing, users/permissions, POS, compliance, feedback/reviews, and unsupported external web/local-event questions. Action Support also includes page-context target resolution, structured answer artifacts, navigate-only risky surfaces, temporary-status drafts, and review-reply drafts.
- **Website copy stays unchanged** - Public MenuList website copy is withheld until the dashboard card, route, API, scheduler read model, mobile surface, cache behavior, and QA proof exist.

### Cost

- **No Firebase cost change** - This is documentation and planning only. No route, API, Firestore collection, Storage path, Cloud Function, scheduler, Firebase rule, index, feature flag, or public website runtime changed.

## June 7, 2026 — Answerlattice Owner Support Assistant Planning

### Changed

- **Owner Support Assistant is now documented** - The plan defines a private Answerlattice owner/staff support review surface for asking what needs attention, seeing evidence, and opening the correct governed review workflow.
- **ChatGPT proposal validated against repo truth** - Useful ideas such as evidence-first answers, unsupported-action refusals, contextual entry points, and backend contracts were kept, while old product naming, default-on flags, transcript collections, and direct publishing actions were rejected.
- **Implementation strategy is cost-first** - The docs require summary-first context packets, existing Support Board and Governance write paths, assistive AI formatting only after deterministic proof, no assistant-owned transcript/event/session collection, and a compact `platformSummary/ownerSupportAssistantSummary_{tId}_{sId}` read model.
- **Owner dashboard analytics plan finalized** - Support analytics for today, this week, last week, this month, and last month will reuse existing daily aggregate sources plus `platformSummary/ownerSupportAnalyticsSummary_{tId}_{sId}`. No dedicated owner analytics collection is added.
- **Action support architecture finalized** - Ticket status updates, customer replies, unanswered-question review, and other supported business actions must use typed preview/execute adapters over existing product write paths, explicit owner confirmation, idempotency, and audit reuse. No generic action queue or assistant action collection is added.
- **Handled cases/actions documented** - The docs now list supported prompts, owner cases, permission gates, action capabilities, and blocked prompts so the assistant cannot drift into unrestricted business automation.
- **Docs frozen after codebase-truth review** - The freeze review records the final storage, route, permission, analytics, Support Board, ticket, action, and Firebase cost decisions against the current Answerlattice codebase.
- **Website copy stays unchanged** - Public Answerlattice website copy is withheld until the route, API, cost proof, mobile behavior, and governance gates are implemented and verified.

### Cost

- **No Firebase cost change** - This is documentation and planning only. No route, API, Firestore collection, Storage path, Cloud Function, scheduler, Firebase rule, index, feature flag, or public website runtime changed.

## June 6, 2026 — Answerlattice Repeated Reply Import

### Changed

- **Knowledge Intake accepts repeated replies** - Owners can paste one repeated user question and the answer they already send, then create review drafts from that source.
- **Repeated replies can link entities through bounded search** - The repeated-reply form now searches existing product entities only when the owner types, instead of asking for raw IDs or loading the full ontology list.
- **Repeated replies generate focused drafts** - The `repeated_reply` source type creates FAQ and canonical answer proposal drafts only, avoiding the default full KB article draft for this path.
- **Governance stays mandatory** - Canonical proposal acceptance and publishing still require related entities and still land in mutation proposals for review instead of auto-publishing official answers.
- **Support expansion sequence documented** - The post-SupportLayer sequence now records repeated reply import as item 1, with role-based approval, support gap to product task, and email-to-support-gap deferred behind governance proof.
- **Website copy updated narrowly** - Knowledge Intake public copy now mentions repeated replies as owner-provided source material without claiming inbox sync, helpdesk connectors, or automatic replies.

### Cost

- **Bounded Firebase cost** - This adds no Firestore collection, Storage path, new Cloud Function, scheduler, Firebase rule, connector, or AI call. It reuses the existing Knowledge Intake source/review/publish paths, creates at most two review item docs per repeated reply source during analysis, and adds one entity search-index composite index so autocomplete reads stay proportional to matches instead of workspace size.
- **Deploy note** - Local validation passed, but Answerlattice QA index/function deploy is blocked for the active account by Firebase/Cloud Resource Manager `403` permissions. Required commands are recorded in the repeated-reply Firebase doc and Answerlattice QA runbook.

---

## June 6, 2026 — Printable Asset Templates Implemented

### Changed

- **Assets route added** - Owners now have `/assets` as the dedicated print/download workspace, with `Assets` placed immediately after `Use MenuList` in dashboard navigation.
- **Template catalog added** - The workspace exposes 7 asset types and 9 governed template families through centralized registries instead of hardcoded UI cards.
- **Desktop and mobile share one renderer** - Desktop Assets, the compatibility `/use-menulist/print-assets` route, and the mobile More/Share Assets screen now call the same printable asset render adapter.
- **Mobile stays inside the PWA shell** - `/assets` and `/use-menulist/print-assets` map into `MobileShell` More -> Assets, avoiding desktop route reloads.
- **Verification guard added** - `scripts/verification/verify-printable-asset-templates.js` checks the route, catalogs, mobile shell mapping, and hardcoded sample-output guard.

### Cost

- **No Firebase cost change** - Asset selection, preview, and download remain client-side Canvas/jsPDF/QR/JSZip work with no new Firestore reads/writes, Storage uploads, Cloud Functions, rules, or indexes.

---

## June 6, 2026 — Printable Asset Templates Planning

### Changed

- **Printable Asset Templates are now documented as a separate feature** - The plan defines a dedicated Assets workspace, 9 governed template families, desktop/mobile behavior, Firebase cost rules, and the implementation path without merging it into the existing Print Assets docs.

### Cost

- **No Firebase cost change** - This is documentation and planning only. No route, UI, Firestore collection, Storage path, Cloud Function, rule, index, or generated asset storage changed.

---

## June 6, 2026 — Answerlattice Launch Proof Summary

### Changed

- **Activation now shows first-client launch proof** - The Activation Command Center renders `summary.launchProof` for setup, knowledge/surfaces, ontology/canonical answers, widget runtime, governance summaries, and signal-source testing before connector rollout.
- **Launch proof is summary-backed** - The proof is computed from the existing store and compact `platformSummary` reads already used by Activation.
- **AnswerLattice public website copy matches the proof** - Launch Setup, product preview, system coverage, and Updates now describe first-client launch proof instead of only launch checklist/readiness.
- **Feature docs match the runtime contract** - The Client Activation Command Center docs, roadmap, system inventory, and clearance notes now describe the proof field, cost behavior, mobile behavior, and test cases.

### Cost

- **No new Firestore reads or collections** - The launch proof adds no API route, listener, source collection scan, Firebase rule, index, Cloud Function, or feature flag. The activation snapshot may write only when the existing summary signature changes.

---

## June 6, 2026 — Answerlattice Expansion Order Guardrails

### Changed

- **Answerlattice roadmap now starts with first-client proof** - The build priority roadmap now requires onboarding, Knowledge Intake, product surfaces, entity review, canonical answer approval, widget install, signal mutation, and summary dashboards to work before widening integrations or distribution.
- **Jira and helpdesk expansion are gated** - Jira must feed entity-bound knowledge proposals through Governance, and native helpdesk connectors must come after export/import through Knowledge Intake is proven.
- **Rollout status is clearer** - Public API is documented as implemented but default-off, workflow integrations remain bounded, and AI escalation is marked implemented but rollout-gated.

### Cost

- **No Firebase cost change** - This is documentation and roadmap alignment only. No Firestore collection, Storage path, Cloud Function, API route, rule, index, or feature flag changed.

---

## June 6, 2026 — Print Output Visual Refinement

### Changed

- **Print cards use a stronger premium hierarchy** - Table tent and single table/counter card faces now use a brand top panel, logo/initials badge, separator-aware business name hierarchy, purpose pill, neutral QR panel, short-link capsule, and quiet MenuList attribution.
- **QR panel treatment is cleaner** - Print and standalone QR cards now keep more space between the business name and CTA tag, and the QR panel uses a neutral border without colored corner brackets.
- **Print card copy is business-type driven** - Table tent, single table/counter card, and related QR downloads now pass title and scan instruction from store/business-type context instead of composing menu-only copy inside the renderer.
- **Standalone QR outputs use the same visual system** - Menu QR, OBP QR, mobile QR sheets, and feedback QR downloads now share the taller premium portrait treatment while keeping QR modules near-black on white for scan reliability.
- **Verifier guards the new output contract** - The print/export verifier now checks the logo badge, name splitting, neutral QR panel, taller QR card, and standard canvas font-weight usage.

### Cost

- **No Firebase cost change** - This is client-side Canvas rendering and documentation only. No Firestore collection, Storage path, Cloud Function, API artifact route, rule, or index was added.

---

## June 6, 2026 — Print Assets Freeze Readiness

### Changed

- **Print Assets is marked freeze-ready** - The feature docs now record the final freeze gate for desktop Print Assets, mobile PWA Print Assets, Print Menu, Menu Kit print outputs, premium MenuList attribution policy, and lightweight website placement.
- **Verification evidence is documented** - The Print Assets doc set now includes the exact automated checks used for the freeze decision.

### Cost

- **No Firebase cost change** - This is documentation status alignment. Generated print assets remain client-side and no Firestore collection, Storage path, Cloud Function, API artifact route, rule, or index was added.

---

## June 5, 2026 — Website Setup Copy Consistency

### Changed

- **Setup copy now matches the sign-in-first upload path** - `/get-started`, `/create-menu`, and FAQ import wording now describe signing in before adding a photo or menu link.
- **Website claims are calmer** - Customer-browse copy now uses guided choices instead of recommendation wording, supported-business copy stays food/service-first, and setup copy softens handwritten-menu, photoshoot, and copywriting claims.
- **Pricing guidance leaves the plan choice clearer** - Starter is described as enough for one current public menu, while Pro is framed around presentation, languages, and owner controls.

### Cost

- **No Firebase cost change** - This is public website locale copy and documentation alignment. Routing, auth runtime, extraction, pricing/payment, billing, owner dashboard behavior, Firestore, Storage, Cloud Functions, rules, and indexes are unchanged.

---

## June 5, 2026 — Website Footer Theme Control

### Fixed

- **Footer theme selection no longer uses a dropdown** - The Light/System/Dark control is now a compact segmented icon switcher with a clear selected state.
- **Light mode selected state has proper contrast** - The selected Light control uses a pale blue pill with dark icon color so it stays visible on the dark footer surface.

### Cost

- **No Firebase cost change** - This is public website UI/CSS/docs polish only. Routing, auth, billing, Firestore, Storage, Cloud Functions, rules, and indexes are unchanged.

---

## June 5, 2026 — Website Mobile Consent UX Polish

### Fixed

- **Mobile consent panel no longer covers the hero actions** - First-time phone visitors can still tap `Upload your menu` and `See customer preview` while the analytics choice is visible.
- **Hero headline has readable DOM spacing** - The visual line break now preserves the space between `menu.` and `Publish` for assistive technology and text extraction.

### Cost

- **No Firebase cost change** - This is CSS/accessibility polish on the public website. Routing, auth, billing, print generation, Firestore, Storage, Cloud Functions, rules, and indexes are unchanged.

---

## June 5, 2026 — Website Print Assets Copy Alignment

### Changed

- **Website print wording is clearer for owners** - The homepage keeps Print Assets as the light `Print files` output, while the Features page now explains table cards, counter cards, paper menu PDFs, and printer handoff files from the current approved menu.
- **Print Assets stay out of a separate public page** - The website keeps this as a practical owner benefit, not a new marketing route or heavy homepage section.
- **Feature docs match the live placement** - The Print Assets website doc now records the lightweight public placement and keeps the full workspace inside dashboard/mobile.

### Cost

- **No Firebase cost change** - This is public website copy and documentation alignment. Print generation, owner dashboard routes, mobile PWA routes, auth, billing, Firestore, Storage, Cloud Functions, rules, and indexes are unchanged.

---

## June 5, 2026 — Website Analytics Consent

### Changed

- **Website analytics now waits for consent** - Google Analytics and Microsoft Clarity on the main MenuList website load only after a visitor accepts analytics.
- **Analytics choice can be changed from the footer** - The footer preference controls now include an Analytics button beside Language and Theme.
- **Privacy and Trust/Security claims match runtime behavior** - Public copy now distinguishes main website analytics from customer menu analytics and avoids unsupported DPA/SCC/sub-processor readiness, fixed backup windows, exact encryption algorithms, broad model-training guarantees, and universal export/delete control claims.

### Cost

- **No Firebase cost change** - This is a public website consent/copy update. Owner analytics, customer menu analytics, Firebase rules, Cloud Functions, billing, and `/create-menu` runtime are unchanged.

## June 4, 2026 — Website Auth Friction Cleanup

### Changed

- **Website login entry points use the full sign-in page** - Header, mobile drawer, `/get-started`, pricing purchase handoff, and credit-pack handoff now route to `/signin` so phone OTP, Google, and passcode options stay available.
- **Get Started is a calmer directional page** - `/get-started` now points first-time owners to `/create-menu` and existing owners to dashboard sign-in without implying upload-before-auth.
- **Footer and preview copy are less defensive** - Public website copy no longer says "protect this setup" or "not a QR menu maker" in active conversion surfaces.

### Cost

- **No Firebase cost change** - This is website routing/copy cleanup. Auth, OTP, payment, extraction, and dashboard data paths are unchanged.

## June 4, 2026 — Sign In Static Brand Surface

### Changed

- **Sign-in page has static brand context** - `/signin` now uses a quiet static background surface with a product-shaped visual on wide screens instead of leaving the page empty around the auth card.

### Cost

- **No Firebase cost change** - This is a frontend presentation update. Auth, OTP, and login data paths are unchanged.

## June 4, 2026 — Sign In Background Cleanup

### Changed

- **Sign-in background is static** - `/signin` no longer renders the animated canvas background layers behind the auth card.

### Cost

- **No Firebase cost change** - This is a frontend presentation cleanup. Auth, OTP, and login data paths are unchanged.

## June 4, 2026 — Sign In Phone Row Polish

### Changed

- **Sign-in phone code entry is one row** - `/signin` now switches phone-like login values into a country code plus phone number row before sending the WhatsApp code.
- **Passcode fallback stays visible in dark mode** - The fallback button now uses theme-aware text, border, and background values on the sign-in card.
- **Sign-in auth controls use matched heights** - OTP phone controls and the password/passcode field now use the same mobile-safe control height.

### Cost

- **No Firebase cost change** - This is a frontend presentation fix. The existing OTP send/verify endpoints, rate limits, and auth behavior remain unchanged.

## June 4, 2026 — Create Menu Auth Card Polish

### Changed

- **Create-menu auth card is simpler** - `/create-menu` now shows a short setup-safety line, one-row country code plus WhatsApp phone input, a WhatsApp-code primary action, and a direct Google sign-in button.
- **Passcode fallback moved out of the public create-menu card** - Existing passcode and staff fallback flows remain on `/signin`, but first-time create-menu visitors are not shown passcode language before upload.
- **Create-menu phone input no longer repeats the dial code in the placeholder** - The country selector carries the dial code and the phone input now shows only the local-number example.

### Cost

- **No Firebase cost change** - This is a frontend presentation and locale-copy change. The existing OTP send/verify rate limits and authenticated upload guard remain unchanged.

## June 4, 2026 — Print Menu Surfaces Feature Split

### Changed

- **Print Assets route added** - Owners now have `/use-menulist/print-assets` as the focused workspace for table, counter, entrance, feedback, full menu, and Menu Kit printable files.
- **Mobile Print Assets screen added** - Mobile PWA maps `/use-menulist/print-assets` into the More tab `printAssets` sub-screen and the Share tab opens it through shell state.
- **Printable asset IDs are centralized** - Menu Kit print asset indices now live in `src/lib/print-assets/printAssetCatalog.ts`, reducing future hardcoded index drift.
- **Single-asset print generation added** - Individual printable/social downloads now use `generateMenuKitAsset()` by semantic asset key instead of rendering the full Menu Kit ZIP and reading `result.assets[index]`.
- **Print readiness and handoff added** - Desktop and mobile Print Assets now show readiness checks, actual generated output previews, copyable print-shop handoff text, and reprint guidance from a shared helper.
- **Print route transitions stay inside the app shell** - Desktop Use MenuList, Print Assets, and Print Menu now use App Router transitions instead of full page reloads.
- **Print Menu Surfaces now owns tabletop print layouts** - Table tents are treated as physical scan-first menu objects, separate from full menu PDFs and social Menu Kit images.
- **Table tent output now prints as an A5 fold file** - The bundled table tent is generated as `{StoreName}_TableTent_A5_Fold.pdf`, with two A6 portrait faces, one rotated for opposite-side table viewing.
- **Table tent visual contract finalized** - The output now follows the established card view with a brand-color top band, floating white rounded card, centered scan-safe QR, short link, and MenuList footer for non-Premium stores.
- **Single table/counter card added** - Menu Kit now also includes `{StoreName}_SingleTableCard_A6.pdf`, a normal upright A6 card for acrylic holders, counter stands, wall clips, and single-sided table stands.
- **Menu Kit consumes the physical renderer** - Menu Kit still bundles the table tent, but the renderer now lives under `src/lib/print-menu-surfaces/` and the old Menu Kit table tent file is only a compatibility wrapper.
- **Mobile and desktop keep one output source** - Desktop Use MenuList and mobile Share continue to use `generateMenuKit()`, so owners get the same table-tent PDF from both entry points.

### Cost

- **No Firebase cost change** - Print Assets and Print Menu Surfaces generate printable files locally with Canvas/jsPDF/qrcode/JSZip from already-loaded store/logo/color/plan context. They add no Firestore reads/writes, no generated Storage uploads, no Cloud Functions, no rules, and no indexes.

## June 4, 2026 — QR Output Visual Quality

### Changed

- **QR downloads now keep dark scan modules** - Menu Kit, Use MenuList QR cards, feedback QR cards, social/status cards, and active legacy physical cards now default to near-black QR modules instead of tinting the QR with the business accent color.
- **Brand color now frames the asset** - Store/OBP accent color is used for gradient backgrounds, accent panels, borders, and labels so outputs feel branded without weakening QR readability.
- **Social QR images now contain long names** - Instagram Story and WhatsApp Status outputs use fitted text inside a contained card layout instead of fixed oversized headings that can cross layout boundaries.
- **Entrance poster got the same premium treatment** - The A4 entrance poster now uses a branded gradient header, white content sheet, controlled type, and a dark QR on a white scan panel.

### Cost

- **No Firebase cost change** - The visual treatment is generated locally in Canvas/jsPDF from already-loaded store logo, brand color, and plan context. It adds no Firestore reads/writes, no Cloud Functions, and no generated Storage uploads.

## June 3, 2026 — Premium QR And Print Output Parity

### Changed

- **Standalone QR downloads now use branded cards** - Use MenuList, mobile Share, project Share modal, feedback QR, and Official Business Link QR downloads now reuse the store logo and brand color instead of exporting plain black-and-white QR snapshots.
- **Menu Kit assets now share one premium treatment** - Table tents, counter stickers, entrance posters, delivery bag stickers, takeaway cards, social images, Google Maps upload images, and placement guides now use shared brand tokens with scan-safe QR panels.
- **Printable outputs now show MenuList attribution** - Menu Card Export PDFs, standalone QR cards, Menu Kit files, and active legacy Today/mobile physical cards now include subtle MenuList logo/name/domain attribution.
- **Premium removes visible MenuList attribution** - The shared attribution policy hides MenuList logo/name/domain on Premium stores only. Starter, Pro, missing, and unknown plan data keeps attribution visible.
- **Active Today/mobile campaign cards were aligned** - Legacy recommendation tent cards and counter stickers still exposed in Today/mobile Hours now use the same logo/color/QR treatment while remaining maintenance-only behind Menu Kit.

### Cost

- **No new database or server generation cost** - The output treatment and Premium attribution check are client-side over already-loaded `stores/{storeId}.activePlanType`. They add no Firestore reads/writes, no Cloud Functions, and no generated Storage uploads; existing store logo URLs may be fetched by the browser if not already cached.

## June 3, 2026 — Public Create Menu Auth And Cost Guard

### Changed

- **Create-menu source processing now requires sign-in** - `/create-menu` remains a public website page, but photo upload, menu-link import, extraction draft creation, preview polling, and claim now require the owner session.
- **Public create-menu drafts are owner-bound** - Drafts now store `createdByUId`; preview polling and claim reject cross-account or legacy anonymous draft access.
- **Repeated sources reuse existing drafts** - Active pending/processing drafts and same-source completed drafts return the existing preview instead of creating another Storage artifact or extraction job.
- **Rate limiting is user-keyed** - Public create-menu extraction now uses `PUBLIC_MENU_ENTRY_AUTH` at 5 new source attempts per user per 24 hours instead of the old shared IP limiter.

### Cost

- **Anonymous upload cost is removed** - Unauthenticated visitors can no longer create `publicMenuDrafts`, upload to Storage, acquire menu links, or queue extraction jobs. The first signed-in setup preview remains free to the owner, with MenuList-side cost guarded by auth, rate limits, reuse, dedupe, SAFE_MODE, and 24-hour TTL cleanup.

## June 3, 2026 — Owner Analytics Detail Parity

### Changed

- **Desktop and mobile analytics detail now use one source** - Menu details for Today, Overview, Yesterday, This Week, This Month, and Overall now render from the same shared section builder across desktop and mobile.
- **Stored campaign detail is surfaced consistently** - UTM source, medium, campaign, and content are preserved through daily aggregation, dashboard summaries, client normalization, and owner display cards.
- **Overall now carries lifetime detail** - Lifetime Smart Picks, search demand, no-result demand, unavailable interest, actions, source quality, campaign tracking, categories, languages, filters, and top items can display from the same detail card as other periods.

### Fixed

- **WTD/MTD top items use item taps** - Client fallback aggregation now ranks top items from `clicksByItem`, matching the nightly summary path instead of using Smart Picks recommendation taps.

### Cost

- **No extra owner reads** - The parity detail cards consume the existing daily doc and dashboard summary reads. Additional UTM fields are additive counters on existing analytics documents and do not create a new collection or write path.

## June 3, 2026 — Menu Extraction Metadata And Failure Audit

### Changed

- **Dietary labels are canonicalized during extraction** - Visible `VEG`, `NON-VEG`, `NV`, `GF`, `DF`, and `KETO` labels now persist as stable `dietaryTags` values such as `vegetarian`, `non-vegetarian`, `gluten-free`, `dairy-free`, and `keto`.
- **Owner dietary editing matches extraction** - Desktop and mobile item editors now expose `Non-Vegetarian` in the shared food `dietaryTags` options.
- **Non-veg filtering no longer collides with veg** - Public menu filter normalization treats `non-vegetarian` and `nonveg` as non-veg only, not as veg through substring matching.
- **Unknown business type now uses canonical Other** - Menu intake identity no longer turns low-confidence business type detection into `Restaurant`. The shared business type catalog now includes `Other`, messaging/public create-menu fallbacks use `Other` with the best known `businessCategory`, and public drafts carry `detectedBusinessCategory` through claim.
- **Public claim keeps business type on the project** - Public `/create-menu` claims now copy the resolved `businessType` and `businessCategory` onto the created project and project summary, keeping future project-scoped metadata and design defaults aligned with store truth.
- **Business category now drives generic Other behavior** - Store creation, updates, default time slots, Decision Blocks, special menus, trust signals, Menu Kit assets, customer messages, editor metadata fields, availability labels, AI image defaults, and category icon suggestions now resolve from `businessType + businessCategory`, so `Other + food` behaves like a food menu without pretending the exact type is Restaurant.
- **Owner business type changes keep category aligned** - Dashboard and mobile owner saves now use one persisted-store resolver: exact canonical types own their category, while `Other` and legacy/free-text types can keep the best known broad category. Store summary, onboarding, outlet creation, messaging publish, and extraction worker paths use the same rule.
- **Master business type changes now reach outlets** - Master-store identity propagation now includes `businessType` and `businessCategory`, runs through the shared `updateStore()` path for desktop and mobile owner saves, updates outlet `storesSummary`, and respects `outletPolicy.canOverrideBrandIdentity` plus the legacy `allowBrandingOverride` field.
- **Failed extraction attempts are auditable** - Provider failures now write platform extraction audit rows with failed status, error code, retry-after seconds when available, and zero owner credits/charge.
- **Prompt version bumped** - Menu image extraction prompt version is now `parallel_v5` for the dietary label mapping and legacy tag boundary change.

### Cost

- **Owner credits remain unchanged** - Initial extraction remains a zero-unit setup operation. Failed provider attempts also record zero tokens, zero owner charge, and zero units consumed.

## June 3, 2026 — Growth Engine WhatsApp Outreach Guardrails

### Changed

- **WhatsApp outreach kit validated** - The Claim/Invite variant plan, A/B split, pacing tiers, stop rules, and send-log fields were accepted only as a consented Growth Engine micro-experiment, not as cold WhatsApp outreach.
- **Public listing provenance is not consent** - Growth Engine docs now block treating Google, Instagram, Maps, CSV imports, or enriched phone availability as WhatsApp opt-in.
- **Experiment controls are implementation gates** - WhatsApp Claim/Invite sends now require consent proof, suppression checks, approved templates, sender health, webhook readiness, stop rules, masked summaries, and dry-run approval before any assignment, send, follow-up, or winner selection.
- **MenuList production validation gate added** - Aggregator-style public listing outreach, broad source-provider acquisition, and cold WhatsApp/public-phone paths stay blocked until MenuList is proven with real production owners.

### Cost

- **No runtime cost change** - This was documentation and validation only. No Firestore collection, Cloud Function, API route, index, Storage path, provider call, sender, template, or deploy was added.

## June 2, 2026 — Platform Notification Tracking Dashboard

### Changed

- **Internal platform notification monitor added** - Platform users can review founder/operator alerts from `/ops/platform-notifications`, filter by status, severity, and trigger type, inspect runbooks and metadata, acknowledge alerts, and create manual platform alerts.
- **Manual recovery is auditable** - Platform alert rows expose Email and WhatsApp Web actions that prefill an operator message before opening the external tool. Recording manual handoff marks action taken and stores masked handoff metadata on the existing alert document.
- **SAFE_MODE emits platform alerts** - SAFE_MODE activation and deactivation now write classified `systemAlerts` records so cost-protection toggles appear in the platform notification dashboard.
- **Ops Control Room links the monitor** - The internal `/ops` page now links to platform notifications alongside scheduler, extraction, messaging onboarding, and owner notification monitors.
- **Platform alerts can send Email and WhatsApp automatically** - Classified internal triggers now use the shared platform registry to fan out to platform-owner email and WhatsApp recipients when the channel flags and recipient envs are configured.
- **Cloud Functions emit classified platform alerts** - Payment failures, webhook failures, publish verification failures, extraction stuck jobs, owner-notification delivery failures, scheduler failures, WhatsApp onboarding health failures, and GCP budget alerts now attach platform trigger metadata directly instead of relying only on dashboard-side heuristics.

### Cost

- **No new collection was added** - The dashboard reuses `systemAlerts`, uses manual refresh only, caps list scans at 150 recent alerts, uses five count aggregations, and performs one direct detail read only when selecting an alert. Acknowledge/manual handoff are one alert-document write each.
- **Automatic delivery adds no Firestore queue** - Email and WhatsApp fan-out uses existing provider integrations after the existing alert write and mute check; provider charges apply outside Firebase.

### Deployed

- **Firebase Functions deployed to `ecomsai`** - Updated `menulistMaintenanceScheduler`, `computeDecisionBlocksScores`, `triggerStoreNightlyScheduler`, `triggerDecisionBlocksScoring`, `verifyMenuPublish`, `forceRepublish`, `gcpBudgetAlertWebhook`, `messagingOnboarding`, and `msgExtractionWatcher`.

## June 2, 2026 — MenuList Resource Expansion And Industry Pages

### Changed

- **Resource library expanded** - The MenuList website now includes resource pages for restaurant menu schema, official menu URL checks, and common restaurant QR menu mistakes, in addition to the existing official-source, QR, Google menu, SEO, AI/search, checklist, worksheet, and multi-location resources.
- **Reviewed resource locale coverage stays complete** - Hindi, Tamil, Telugu, Marathi, Bengali, Arabic, and Spanish resource packs now cover all 15 article routes with source-versioned content and discovery coverage.
- **Industry pages added** - Restaurants, cafes/bakeries, takeaway/cloud kitchens, and multi-location food businesses now have public landing pages that explain MenuList as the current approved menu source layer for that business type.
- **Checklist copy is measurable** - Resource checklist sections now expose a copy action and emit `resource_checklist_copy` through the public website analytics path. `resource_template_download` remains absent until real downloadable files exist.
- **Discovery files updated** - Sitemap, `llms.txt`, `llms-full.txt`, and platform discovery policy now include the added resource and industry URLs.

### Cost

- **No Firebase cost change** - This is static public website, content, schema, and discovery-file work. No Firestore reads/writes, Storage objects, Cloud Functions, schedulers, Firebase rules, indexes, owner dashboard flows, customer menu runtime, auth, middleware, tenant routing, or billing behavior were changed.

---

## June 2, 2026 — Owner Notification Tracking Dashboard

### Changed

- **Internal owner notification monitor added** - Platform users can review MenuList and Answerlattice owner notification events from `/ops/owner-notifications`, inspect delivery attempts, resolve the current owner contact for one selected event, and retry failed, partial, or skipped events.
- **Manual recovery is auditable** - Failed, partial, and skipped rows expose Email and WhatsApp Web actions that show the registered notification template prefilled before opening the external tool. Platform users can then record an external manual handoff with masked/hashed destination and operator audit fields.
- **Ops Control Room links the monitor** - The internal `/ops` page now links to the owner notification monitor without adding owner-facing navigation.

### Cost

- **Dashboard reads are bounded** - Manual refresh only, no realtime listener, list scan capped at 90 events, delivery/contact reads only after selecting one event, and no new Firestore composite index, rule, Storage path, Cloud Function, or scheduler was added.

## June 2, 2026 — AI Accounting And Credit Handling Hardening

### Changed

- **Billable AI accounting is centralized** - Description, translation, image, campaign, review, SEO, business-copy, new-item metadata, batch image, and menu-card advisor routes now finalize successful provider calls through one server-side accounting helper.
- **AI operation writes are server-only** - Browser clients can still read scoped transaction history, but `menulistAiOperations/{tId}/{sId}` writes are now denied by Firestore rules and the old client write helper throws.
- **AI action cost lookup fails closed** - Every `AI_ACTIONS_TYPES` value must have explicit unit-cost and real-cost entries. Unknown AI actions no longer default to zero units.
- **Free setup operations stay explicit** - Initial extraction, first-pass descriptions, menu intake identity, public create-menu extraction, and structural setup actions remain zero-unit operations. Extraction audit rows now also store `unitsConsumed: 0`.
- **AI transaction dashboards are audience-scoped** - Owner desktop/mobile Transactions now load through an owner-allowlisted server API and show date, action, menu/project, result summary, credits used, no-credit setup actions, and processing time without token, provider-cost, margin, model, raw provider payload, ID, or generation-config internals. Desktop pagination now uses cursor-backed Previous/Next controls. Platform-role debug can inspect the full AI transaction object and paise-safe provider cost fields.
- **Extraction audit rows carry job context** - Menu image extraction provider audit rows now store `jobId`, tenant/store/user context, source, destination, destination id, job mode, and token counts so platform monitoring can drill from AI spend to the exact extraction job without exposing provider internals to owners.

### Fixed

- **Credit deduction cannot be skipped by operation-log failure** - Operation logging is monitored as best-effort, while credit consumption remains mandatory for billable outputs.
- **Paid outputs do not continue after credit-consumption failure** - Billable routes now fail the request if post-provider credit deduction fails instead of returning usable paid output without reducing balance.
- **Batch image operation logs keep tenant/store scope** - The Cloud Task worker passes tenant/store ids directly into the server operation logger instead of relying on a browser session.
- **Extraction monitor separates owner units from token audit cost** - Platform extraction review now labels owner units separately from token-credit and estimated AI-cost telemetry.
- **Extraction monitor cost is paise-safe** - Desktop and mobile platform cost cards now format paise-denominated AI costs as INR, and the job inspector shows raw provider responses plus token breakdown.
- **Extraction audit timestamps stay queryable** - The Firebase worker now preserves `Date`/timestamp values while sanitizing undefined transaction fields, so `MENULIST_AI_OPERATIONS.createdAt` remains usable for daily cost filtering.

### Verification

- `npm run verify:ai-accounting`

### Cost

- **Transaction reads are bounded** - The owner transaction API now applies the shared `DATA_READ` rate limit before Firestore reads. The desktop transactions page only reads project summary metadata when the loaded page has project IDs, and it uses the read-only project-summary helper so opening transaction history cannot create a default project.

---

## June 2, 2026 — Owner Notifications Core Implemented

### Changed

- **Owner notification core is live in code** - Added the shared trigger registry, app-side owner notification processor, MenuList Functions processor, product-specific templates, settings-aware date/time/currency formatting, email channel delivery, guarded WhatsApp channel support, deterministic event IDs, delivery logs, and direct-ID rate-limit counters.
- **MenuList lifecycle notifications now route through owner events** - Billing, credit, publish success/failure, renewal reminder, suspension warning, subscription cancellation/pause/resume/upgrade, credits exhausted, and menu stale owner notices now write `ownerNotificationEvents` and `ownerNotificationDeliveries` before delivery.
- **Answerlattice owner notification test uses the shared core** - The `ANSWERLATTICE_NOTIFICATION_TEST` path now writes and delivers through the owner notification system, while ticket/customer emails and workflow integrations remain separate.
- **Owner date/time/currency formatting is centralized** - Owner notification templates now render billing dates, renewal dates, sent-at timestamps, and money labels from stored timezone, date format, time format, currency code, and currency symbol settings.
- **Rollback paths are preserved** - Existing lifecycle and Answerlattice notification senders remain available when owner-notification migration flags are disabled or the new path throws.

### Deployed

- **Firebase Functions deployed to `ecomsai`** - Updated `verifyMenuPublish`, `computeDecisionBlocksScores`, `triggerDecisionBlocksScoring`, and `triggerStoreNightlyScheduler`.

### Cost

- **New owner notification collections are server-only** - Adds `ownerNotificationEvents`, `ownerNotificationDeliveries`, and `ownerNotificationRateLimits`; no browser read path, Firestore rule change, Storage path, or new scheduled function was added.
- **No new composite index was added** - Retry/digest helpers use bounded single-field queries and in-memory date filtering.

---

## June 2, 2026 — Owner Notifications Architecture Plan

### Changed

- **Owner notification planning is centralized** - A new `owner-notifications` documentation set defines the shared long-term architecture for MenuList and Answerlattice owner/account notices across email and WhatsApp.
- **Notification boundaries are explicit** - The plan separates owner-required messages from internal ops alerts, dashboard toasts, marketing campaigns, manual WhatsApp share links, and Answerlattice workflow integrations.
- **Settings-aware notification formatting is specified** - The implementation plan requires owner/store timezone, date format, time format, currency code, and currency symbol to be resolved before rendering email or WhatsApp content.

### Cost

- **No runtime cost change yet** - This is documentation and architecture planning only. No Firestore collection, Storage path, Cloud Function, scheduler, Firebase rule, index, email send, or WhatsApp send was added in this pass.

---

## June 2, 2026 — Menu Card Export Branded And Business-Type-Aware PDF Output

### Changed

- **Print PDFs now reuse store branding** - The export source now prefers the same `publicPresence.accentColor` used by OBP and embeds the existing store logo in the PDF header when the logo can be loaded safely.
- **Print PDFs show brand color beyond the title band** - Category dividers and prices now use the store accent color so the file no longer looks like a plain black-and-white export when a brand color exists.
- **Print PDF prices are cleaner** - PDF prices now use store currency settings with PDF-safe INR fallback, whole-number prices without forced decimals, preserved price ranges, and measured price width to avoid overlap.
- **Print PDFs feel more like real business sheets** - The renderer now draws warm paper backgrounds, borders, title plaque/editorial headers, section treatments, and dotted price leaders depending on the selected controlled style and business type.
- **Print files now follow business type** - Stores with food, service, retail, professional, health/wellness, or specialty business categories now get automatic menu, service-list, or catalog labels and visual treatment from the existing business type data.
- **Print files now start with an automatic design pick** - The route chooses an initial style, density, description, QR, and contact setting from the current business type and content shape before any AI/provider call.
- **Export freshness includes branding and currency** - Local export hashes now include the logo URL, brand color, currency symbol, and currency code, so old generated files are not treated as reusable after store branding or currency changes.

### Cost

- **No export records or uploads were added** - Branding and physical-menu styling still use the existing store context and client-side PDF generation. Final render may download the existing logo image once when `Include logo` is on and the image is not already cached; repeat exports in the same route session reuse an in-memory logo cache.
- **Business-type styling is client-side** - Business profile selection reuses already-loaded store business type/category data and adds no Firestore read/write, Storage upload, Cloud Function, rule, or index.
- **Auto design is client-side** - The automatic design pick runs over already-loaded print source data and does not consume AI capacity or add Firebase operations.

---

## June 2, 2026 — Menu Extraction Pipeline Consolidation

### Changed

- **Menu extraction job creation is centralized** - Dashboard and mobile uploads now create extraction jobs through `POST /api/menu-extraction/jobs`, which verifies auth, tenant/store access, project existence, Storage URL ownership, rate limits, SAFE_MODE, and menu-intake identity before the job exists.
- **Extraction job contract is shared** - App routes and Cloud Functions now use mirrored `menuExtractionJob` contract files for destination types, source markers, MIME limits, file limits, and routing builders.
- **Public create-menu extraction is durable** - `/create-menu` now creates a public draft and queues the shared `menuImageProcessingJobs` worker instead of running extraction inside the public API request after returning.
- **Extraction destinations are explicit** - Jobs can now target a project, public draft, or messaging onboarding session, while reusing the same worker.
- **Messaging and link import keep their current flows** - Messaging still uses its extraction watcher, and link import still lands in review; both now carry destination metadata.
- **Extraction monitor shows routing metadata** - The internal extraction monitor now surfaces job source and destination so platform review can distinguish owner upload, link import, public draft, and messaging jobs.
- **Extraction contract verification added** - `npm run verify:menu-extraction-pipeline` checks the shared app/Functions contract, server-only job creation, public durable extraction, retry source handling, and worker guards. `npm run verify:menu-extraction-pipeline:dry-run` builds sample jobs for every entry point and verifies routing, source, Storage prefix, MIME, and cancellation-rule behavior offline.

### Fixed

- **Extraction cannot create missing project docs** - Project saves now fail if the target project document does not exist.
- **Browser clients cannot create extraction jobs directly** - Firestore rules now make `menuImageProcessingJobs` creation server-only.
- **Cancellation cannot mutate job payloads** - Firestore rules now restrict client cancellation updates to status/timestamp fields only.
- **Owner job source metadata is server-owned** - The protected owner route no longer accepts client-provided `source` or `sourceMetadata`; retry jobs load lineage from the original failed job after ownership checks.
- **Bad job files are rejected before AI work** - The worker validates MIME type, file count, file size, Firebase bucket, and expected Storage prefix before extraction.
- **Worker MIME validation is source-specific** - Owner upload, public image upload, link import, and messaging onboarding now use their own MIME allow-lists inside the worker, not just at the route layer.
- **Messaging HEIC/HEIF compatibility preserved** - The shared worker MIME contract now includes the HEIC/HEIF types already accepted by WhatsApp messaging intake.
- **Empty extractions stop before save** - Jobs with no extracted menu items fail instead of completing into project or public draft output.
- **Public draft extracted data matches project types** - Public draft completion now normalizes categories, items, attributes, item category references, availability, and languages before preview/claim so claimed projects receive the same extracted-data shape as owner extraction.
- **Public draft claims write standard file shape** - Claimed public drafts now create project file entries with the same active/deleted/index/message fields used by owner extraction and messaging publish paths.
- **Public draft claims render from `/client`** - Claimed public drafts now create project IDs in the normal `{tenantId}-{timestamp}-{storeId}` format so the public client renderer can load the new project from its nested Firestore path.
- **Review apply writes standard file shells** - Link-import/re-extraction review apply now creates source file shells with `active`, `deleted`, `index`, and `extractedData.message` before applying categories/items and revalidating the public menu cache.
- **Messaging publish render contract verified** - Messaging extraction now has verifier coverage for standard project file envelopes, active approval publishing, platform summary writes, and menu/store/client-store cache tags.
- **Public renderer contract verified** - Menu extraction verification now checks that `/client` loads parseable project IDs and that `MenuPageNew` consumes normalized extracted categories/items.

### Cost

- **Public create-menu adds one durable job write** - Public drafts now add a `menuImageProcessingJobs` write and normal worker status writes. No new collection, index, scheduler, or Storage bucket was added.
- **Owner uploads keep the same preflight model** - The protected job route enforces the existing menu-intake identity check before job creation; no new owner-facing setting was added.

---

## June 2, 2026 — Digital Screens Setup And TV Readability Hardening

### Changed

- **Digital Screen setup is clearer** - Owner settings now show Menu Board and Highlights as separate TV setup cards with compact links, QR blocks, open/copy actions, and last-seen status.
- **Menu Board is easier to read on TVs** - The counter screen now uses larger item and price text, fewer rows per page, stable price alignment, menu/category order where available, and no decorative background effects.
- **Highlights owner-only mode is enforced** - When Only custom slides is on, Highlights uses valid uploaded slides only, with a brand fallback if no valid upload remains.
- **Mobile setup matches desktop** - Phone owners now see TV status, compact Menu Board and Highlights cards, custom slide controls, and the same owner-only slide toggle.
- **Screen content is normalized before display** - Digital Screens now clean item/category text, parse currency-bearing prices, normalize tags, dedupe repeated items, and keep custom slide captions safe.
- **Highlight labels are factual** - System-generated slides now use labels such as Today, Popular, Featured, category name, or On menu, avoiding overclaims like permanent availability or chef endorsement.
- **Custom posters stay untouched** - Owner-uploaded poster slides now display as artwork without forced caption or item-title overlays.

### Fixed

- **Menu edits refresh connected screens** - Public menu cache invalidation now also touches Digital Screen content version when a screen already exists, and menu revalidation includes the `screen-data` cache tag.
- **Weak screen fallbacks removed** - Missing Menu Board prices now show `Ask` instead of a dash, common veg/non-veg tags are detected more reliably, and technical category IDs are blocked from display.

### Cost

- **Small write on menu changes where screens exist** - For stores with initialized Digital Screens, public menu/cache invalidation now adds one guarded `platformSummary` read and one `screen.contentVersion` write. Content normalization is CPU-only. No new Firestore collection, Storage path, Cloud Function, scheduler, rule, or index was added.

---

## June 2, 2026 — Firebase Auth Product Boundary Fix

### Fixed

- **MenuList auth sync stays product-scoped** - `/api/auth/set-claims` now creates a separate Answerlattice Firebase custom token only for Answerlattice-scoped requests, preventing normal MenuList owner routes from failing when separate Answerlattice Admin credentials are unavailable.
- **Answerlattice login keeps explicit scope** - The legacy login page now includes Answerlattice product scope for Answerlattice hosts and callbacks so separate Answerlattice Firebase auth still receives the required custom token.

### Cost

- **Avoids unnecessary Admin auth calls** - Normal MenuList Firebase Auth sync no longer performs Answerlattice user lookup, custom-claim, or custom-token work. No Firestore read/write, Storage, Cloud Function, scheduler, Firebase rule, or index change was added.

---

## June 2, 2026 — MenuList Resources Navigation And Discovery Hardening

### Changed

- **Resources navigation is now complete** - The MenuList website header now uses product-led navigation with a compact Resources dropdown, and the mobile drawer exposes the same resource cluster beneath Resources.
- **Homepage resources block aligned** - The homepage now shows the eight strategic resources: menu engineering, QR menu setup, digital menu vs PDF, Google menu source, restaurant menu SEO, AI search discovery, official menu source, and multi-location menu control.
- **Footer resources aligned** - Footer resource links now point to the core content set plus Trust & Security, instead of a smaller checklist-heavy subset.
- **Crawler and LLM discovery hardened** - `robots.txt` now applies protected-route disallows to named search/AI crawlers as well as generic crawlers, `CCBot` is listed in the discovery policy, and LLM context files state MenuList's preferred official-source positioning and claim limits.
- **Resource measurement tightened** - Resource analytics now tracks page views, primary/secondary CTA clicks, related-resource clicks, homepage/hub card clicks, AI/search referrers, upload-menu clicks from resources, and pricing clicks from resources through GA4-only public website events.

### Cost

- **No Firebase cost change** - This is static public website and discovery-file work. No Firestore reads/writes, Storage objects, Cloud Functions, schedulers, Firebase rules, indexes, owner dashboard flows, customer menu runtime, auth, middleware, tenant routing, or billing behavior were changed.

---

## June 2, 2026 — Menu Card Export Dedicated Mobile Screen

### Changed

- **Print Menu mobile screen** - Handheld users now get a dedicated mobile Print Menu screen at `/use-menulist/menu-card-export` instead of the desktop export layout.
- **Shared export controller** - Desktop and mobile Print Menu renderers now share one controller for project loading, source building, preview, preflight, export generation, local history, and Pro/Premium layout suggestion.
- **Mobile verification guard** - `verify:menu-card-export` now checks the shared controller and dedicated mobile screen so the route cannot regress back to desktop-only mobile behavior.

### Cost

- **No new Firebase export cost** - The mobile screen still generates PDF/packet artifacts in the browser and uses device-local history only. No export collection, Storage upload, Cloud Function, Firestore index, Firebase rule, or artifact API route was added.

---

## June 2, 2026 — Growth Engine Implementation Readiness Docs

### Added

- **Implementation readiness contract** - Growth Engine now has a final implementation-entry document covering internal route inventory, UI states, RBAC, feature flags, environment keys, secret handling, Firestore rules/index expectations, seed config, use cases, API guards, UI guards, test readiness, and stop conditions.
- **Readiness gates in core docs** - README, spec, implementation plan, Firebase plan, helpdoc, doctrine, gap audit, and tests now require readiness acceptance before coding or provider execution.
- **Runtime blocker framing** - Gap audit now distinguishes documentation coverage from runtime blockers that code must enforce if any required foundation is missing.

### Changed

- **Implementation handoff** - Provider setup, routing, rules, seed config, UI actions, and tests now have one readiness source before implementation starts.

### Cost

- **Documentation only** - No Firestore reads/writes, Storage objects, Cloud Functions, provider calls, schedulers, indexes, Firebase rules, billing logic, app routes, or credentials were added.

---

## June 2, 2026 — Growth Engine Connections And Activation Docs

### Added

- **Connections And Activation screen** - Growth Engine now has a dedicated internal control-screen spec for adapter IDs, provider secret refs, email pipeline readiness, WhatsApp pipeline readiness, webhook health, budgets, kill switches, validation runs, and activation approvals.
- **Connection data contracts** - Growth Engine docs now define connection adapters, secret references, pipeline connections, activation checks, email pipeline connections, WhatsApp pipeline connections, webhook endpoints, validation runs, and audit events.
- **Provider activation tests** - Test docs now block provider execution without active adapter state, safe secret refs, required webhooks, budget caps, kill-switch scope, validation, and compliance approval.

### Changed

- **Provider execution gate** - Source imports, email sends, WhatsApp sends, webhooks, discovery jobs, and AI/provider calls now require active Connections And Activation state before execution.
- **Operator docs** - Help, mobile, website, implementation, Firebase, doctrine, distribution, automation, and gap-audit docs now treat provider configuration as governed activation, not simple key storage.

### Cost

- **Documentation only** - No Firestore reads/writes, Storage objects, Cloud Functions, provider calls, schedulers, indexes, Firebase rules, billing logic, app routes, or credentials were added.

---

## June 2, 2026 — Growth Engine WhatsApp Governance Docs

### Added

- **WhatsApp governance policy** - Growth Engine now documents WhatsApp as a consented owner-verification and business-truth maintenance rail, not as generic cold outreach or a bulk sender.
- **Message governance foundation** - Growth Engine docs now require consent proof, suppression, approved templates, conversation-window state, sender identity health, webhook ingestion, reputation monitoring, Flow review, governance audit, and kill switches before WhatsApp API outbound use.
- **MenuList truth journeys** - Owner claim, public-info correction, incomplete claim recovery, stale-data confirmation, support handoff, owner referral, and structured WhatsApp Flow truth capture are documented as the only approved WhatsApp journeys.

### Changed

- **Distribution architecture** - WhatsApp is now part of the owned channel control plane only after eligibility and governance checks; scraped, enriched, Google Places, and Foursquare phone numbers do not create WhatsApp opt-in.
- **Internal operator surfaces** - Mobile remains emergency read-only/pause only, while the internal admin plan now includes WhatsApp consent, template, webhook, sender, Flow, and reputation summaries.

### Cost

- **Documentation only** - No Firestore reads/writes, Storage objects, Cloud Functions, provider calls, schedulers, indexes, Firebase rules, billing logic, or app routes were added.

---

## June 2, 2026 — Multi-Location Public Routing Hardening

### Fixed

- **Outlet URL creation** - New outlets now receive a tenant-unique `outletSlug`, and tenant store lists persist the outlet routing fields used by owner share and location switching surfaces.
- **Linked outlet menu summaries** - Outlet creation and master-project propagation now copy canonical slug/default markers into outlet project summaries while keeping the summary `projectId` pointed at the outlet project.
- **Published subdomain lock** - Mobile subdomain settings now match desktop by hiding the editor after first publish, and Firestore rules now reject direct client subdomain changes on published stores.
- **Linked outlet save boundary** - `/api/projects/outlet-save` now persists only the outlet-local fields it is responsible for, ignoring extra project identity/routing fields in full-project client payloads.
- **Public linked-menu fallback** - Customer menu routes now show the not-found fallback when a linked outlet project cannot resolve its master, instead of rendering incomplete local-only data.
- **Deep public redirect paths** - Canonical subdomain/custom-domain redirects now preserve the full public path, so routes such as `/{outletSlug}/{projectSlug}` do not collapse to only the outlet segment during host canonicalization.
- **OBP canonical host guard** - Public OBP metadata now ignores stale stored canonical URLs that point at a different host, preventing one tenant from emitting another tenant's canonical URL.
- **Sitemap special menus** - Public sitemaps now exclude special-menu override projects.
- **Tenant robots route** - Tenant `/robots.txt` now routes to an explicit client robots handler instead of being interpreted as a menu slug.

### Cost

- **No new recurring Firebase workload** - Outlet creation adds bounded summary reads for slug/default copying, linked outlet saves keep the same one project write, and no Cloud Function, scheduler, Storage object, or Firestore index was added.

---

## June 2, 2026 — Menu Card Export Output Identification

### Changed

- **Print Menu file naming** - PDF and print-shop packet downloads now include the business/menu name, preset, generated date, and short source reference in the filename.
- **Print Menu PDF metadata** - Generated PDFs now set document title, subject, author, keywords, creator, and creation date for easier local search and support review.
- **Print-shop packet instructions** - Packet instructions now include preset, style/template version, page count, source reference, renderer version, menu updated date, generated date, and live menu destination.

### Fixed

- **Visible footer cleanup** - Generated PDFs no longer print the full internal source hash in the customer-facing footer.

### Cost

- **No new Firebase export cost** - Metadata, filenames, and packet notes are generated in the browser. No export collection, Storage upload, Cloud Function, Firestore index, Firebase rule, or artifact API route was added.

---

## June 2, 2026 — Menu Card Export Mobile Surface Parity

### Changed

- **Print Menu mobile discovery** - Mobile Share remains the primary print/export surface, Mobile Menu now adds a command-sheet Print Menu shortcut for owners who just edited a menu, and More > Modules now lists Print Menu beside Dashboard for discoverability.
- **Print Menu route helper** - Mobile entry points now share one route helper so selected project links consistently open `/use-menulist/menu-card-export?projectId=...`.

### Fixed

- **Edited mobile menus save before print** - Opening Print Menu from the mobile Menu command sheet now flushes pending local menu edits before route navigation, preventing the export route from reading stale saved menu data after a fresh phone edit.

### Cost

- **No new Firebase export cost** - The new mobile entries are route links only. No export collection, Storage upload, Cloud Function, Firestore index, Firebase rule, or artifact API route was added.

---

## June 1, 2026 — Full Website Resource Locale Coverage

### Added

- **Arabic and Spanish resource packs** - The MenuList resources layer now has reviewed Arabic and Spanish packs for the hub and all 12 article routes, completing long-form resource coverage for every language in the public website switcher.
- **All active resource locale URLs** - `/ar-SA/resources` and `/es-ES/resources` now join Hindi, Tamil, Telugu, Marathi, and Bengali in localized metadata, JSON-LD `inLanguage`, sitemap `hreflang`, `llms.txt`, and `llms-full.txt` coverage.
- **Locale coverage guard** - `verify:website-resource-locales` now fails unless every active non-default website language has a reviewed resource pack and reviewed route coverage.
- **Default resource locale guard** - `verify:website-resource-locales` now also fails if the unprefixed `/resources` routes derive content from the visitor locale cookie instead of the English default route.

### Changed

- **Localized resource layout messages** - Locale-prefixed resource routes now load the matching website locale JSON for all active website languages, with RTL direction applied for Arabic.
- **Footer language menu clearance** - The footer language dropdown now opens farther above the trigger with enough open-up height for the full language list, preventing the last option from overlapping the trigger hit area during resource-language switching.
- **English resource route stability** - `/resources` and `/resources/[slug]` now render through the English website locale boundary, so localized content only appears on locale-prefixed URLs such as `/es-ES/resources/[slug]` and `/ar-SA/resources/[slug]`.

### Cost

- **Static website content only** - No Firestore reads/writes, Storage objects, Cloud Functions, provider calls, schedulers, indexes, billing logic, auth logic, Firebase rules, or deploy targets were added.

---

## June 1, 2026 — Menu Card Export Freeze Guardrails

### Fixed

- **Print Menu mobile route guard** - `/use-menulist/menu-card-export` now bypasses the generic mobile shell on handheld devices, so the route is not replaced by the generic Mobile Share tab.
- **Print Menu feature flag parity** - The local history flag now controls the history UI and browser history write path; the print-shop flag now hides packet creation and blocks stale flagged state from creating a packet.
- **Print Menu freeze cleanup** - Removed unused placeholder modules from the menu-card export library so the frozen surface only contains wired runtime code.

### Cost

- **No new Firebase export cost** - The freeze pass kept PDF/packet generation browser-local. No export collection, Storage upload, Cloud Function, Firestore index, Firebase rule, or artifact API route was added.
- **AI cost guard unchanged** - Pro/Premium layout suggestions remain owner-click only, plan-gated before provider work, capacity-checked before generation, and consumed only after a valid bounded recommendation.

---

## June 1, 2026 — Indian Resource Pack Rollout

### Added

- **Reviewed Indian resource packs** - The MenuList resources layer now has full Tamil, Telugu, Marathi, and Bengali packs for the hub and all 12 article routes, alongside the existing English and Hindi coverage.
- **Locale-prefixed resource discovery** - `/ta-IN/resources`, `/te-IN/resources`, `/mr-IN/resources`, and `/bn-IN/resources` now expose reviewed localized metadata, JSON-LD `inLanguage`, sitemap `hreflang`, and LLM context coverage.
- **Verifier alignment** - `verify:website-resource-locales` now passes for Hindi, Tamil, Telugu, Marathi, and Bengali, and `verify:agent-readiness` derives reviewed/planned resource-locale checks from the resource locale registry.

### Changed

- **Localized hub CTA routing** - Locale-prefixed resource hubs now keep their secondary resource CTA inside the same locale route instead of linking back to the English article path.
- **Resource language switcher routing** - Switching languages while reading a resource now moves between `/resources`, `/hi-IN/resources`, `/ta-IN/resources`, `/te-IN/resources`, `/mr-IN/resources`, and `/bn-IN/resources` instead of only refreshing locale state on the current URL.

### Cost

- **Static website content only** - No Firestore reads/writes, Storage objects, Cloud Functions, provider calls, schedulers, indexes, billing logic, auth logic, Firebase rules, or deploy targets were added.

---

## June 1, 2026 — Featured Choices Public Fallback

### Added

- **Owner note for Featured choices** - Desktop and mobile Featured section controls now include a collapsed owner note explaining that the setting affects only Featured choices, not normal menu order, and how automatic choices behave.
- **Menu action descriptions tightened** - Mobile menu actions and desktop editor actions now use clearer owner-facing descriptions for generation defaults, design, categories, add item, reorder, Featured choices, command center, and outlet-only store customization.
- **Mobile menu action locale coverage** - Active MenuList locale files now include the mobile menu feature keys used by the menu command sheet, bulk actions, text case, repair menu, category reorder, and Featured choices sheets.

### Fixed

- **Owner-selected Featured choices stay visible during stale scoring** - If the background Decision Blocks score document is older than the safe window, the public menu now hides automatic picks but still renders available owner-selected Featured, Quick, and Value choices.

### Cost

- **No new Firebase cost** - The fix reuses the existing public menu render data and existing owner settings. No new reads, writes, collections, indexes, Storage operations, Cloud Functions, provider calls, schedulers, or deploy targets were added.

---

## June 1, 2026 — Hindi Resource URL Layer

### Added

- **Reviewed Hindi resource URLs** - The MenuList resource hub and all 12 resource articles now have stable Hindi URLs under `/hi-IN/resources`.
- **Localized discovery metadata** - Hindi resource pages now use locale-aware metadata, JSON-LD `inLanguage`, and `hreflang` alternates tied to the English resource URLs.
- **Discovery guardrails** - Sitemap, `llms.txt`, `llms-full.txt`, `verify:agent-readiness`, and `verify:website-resource-locales` now check reviewed Hindi exposure. At this stage, Tamil, Telugu, Marathi, and Bengali stayed out of discovery until reviewed packs existed.

### Cost

- **Static website routing only** - No Firestore reads/writes, Storage objects, Cloud Functions, provider calls, schedulers, indexes, billing logic, auth logic, Firebase rules, or deploy targets were added.

---

## June 1, 2026 — Main Website Resource Localization Guardrails

### Added

- **Reviewed Hindi resource pack** - The MenuList resources layer now has a full `hi-IN` resource pack for the hub and all 12 article routes, including long-form sections, checklists, comparison rows, FAQ, metadata, and CTAs.
- **Resource locale architecture** - Added source-versioned resource locale packs, stable FAQ IDs, and a localization builder that applies reviewed packs over the English source of truth.
- **Locale verification** - Added `npm run verify:website-resource-locales` to block reviewed resource packs with missing articles, missing sections, stale source version, forbidden claims, or English body fallback.

### Decision

- **Other Indian languages were deferred until complete** - At this guardrail stage, Tamil, Telugu, Marathi, and Bengali stayed on English fallback for long-form resource content until full reviewed packs were implemented. This was superseded later on June 1, 2026 by the Indian Resource Pack Rollout.
- **Multilingual SEO exposure requires reviewed URLs** - Hindi could be exposed through locale-prefixed URLs after the Hindi Resource URL Layer. Future languages must pass the same route, sitemap, hreflang, and LLM checks before discovery exposure.

### Cost

- **Static website content only** - No Firestore reads/writes, Storage objects, Cloud Functions, provider calls, schedulers, indexes, billing logic, auth logic, Firebase rules, or deploy targets were added.

---

## June 1, 2026 — Mobile Item Feature Guidance

### Changed

- **Item sheet explains customer impact** - Mobile item edit now includes a collapsed guide explaining Reorder, Best seller, Prep time, and Feature level in plain owner language.
- **Feature level replaces raw priority entry** - Mobile owners choose Show less, Normal, or Show more instead of typing a numeric priority value. The setting still saves to the existing `ownerBoost` field.

### Cost

- **No new Firebase cost** - The guidance and three-choice control reuse the existing item save path and existing item fields. No new reads, writes, collections, indexes, Storage operations, Cloud Functions, provider calls, schedulers, or deploy targets were added.

---

## June 1, 2026 — Menu Card Export Website Alignment

### Changed

- **Website keeps Print Menu lightweight** - Menu Card Export is not added as a separate homepage section. The public website now refers to the capability as `Print files` inside existing source-to-public surfaces.
- **Features page copy aligned** - The old `PDF export` card now describes PDFs and printer handoff packets generated from the current approved menu.
- **PDF resource copy aligned** - `/resources/digital-menu-vs-pdf-menu` now explains PDFs and print files as useful generated outputs, while keeping the mobile digital menu as the main public source.

### Cost

- **Website content only** - No Firestore reads/writes, Storage objects, Cloud Functions, provider calls, schedulers, indexes, billing logic, auth logic, or deploy targets were added.

---

## June 1, 2026 — Public Menu Reorder Consistency

### Fixed

- **Linked outlet item order reaches the public menu** - Inherited outlet item `orderIndex` overrides are now merged into the resolved project and sorted within each category before rendering, so customer-facing menus follow the owner’s outlet-specific reorder.

### Cost

- **No new Firebase cost** - The fix uses the existing public project resolution path and existing outlet override data. No new reads, writes, collections, indexes, Storage operations, Cloud Functions, provider calls, schedulers, or deploy targets were added.

---

## June 1, 2026 — Main Website Resources Layer

### Added

- **Resources hub** - Added `/resources` as an evergreen public content layer for menu correctness, QR menu setup, Google menu source cleanup, restaurant menu SEO, AI search discovery, checklists, worksheets, and multi-location menu control.
- **Resource article routes** - Added 12 server-rendered resource articles, including Menu Source Audit, Official Menu Source, QR Menu for Restaurants, Google Business Profile Menu, Digital Menu vs PDF, Menu Update Checklist, QR Placement Checklist, and Menu Engineering Worksheet.
- **Discovery coverage** - Added resource routes to the platform discovery registry, generated sitemap output, static sitemap, `llms.txt`, `llms-full.txt`, robots crawler policy, and agent-readiness verification.

### Changed

- **Homepage resources section** - Added a compact lower-page resources section without changing the hero, upload funnel, pricing, auth, billing, Firebase, owner dashboard, or customer menu runtime.
- **Header and footer navigation** - Added a simple Resources link to the header and resource links to the footer while keeping MenuList product routing separate from Answerlattice, Canonica, MyCodex, GrowthOS, and KitStamp surfaces.

### Cost

- **Static website content only** - No Firestore reads/writes, Storage objects, Cloud Functions, provider calls, schedulers, indexes, billing logic, auth logic, or Firebase deploy targets were added.

---

## June 1, 2026 — Menu Card Export Implementation And QA

### Added

- **Menu Card Export docs** - Added a routed feature plan for creating print-ready menu files from the current MenuList menu, with controlled styles, job presets, preflight, preview, export history, freshness checks, mobile support, and Firebase cost tracking.
- **Menu Card Export research** - Added market and print research covering menu builders, print-shop handoff, QR reliability, PDF quality, and SMB owner workflow additions.
- **Print Menu route** - Added `/use-menulist/menu-card-export` with client-side menu selection, presets, preflight, preview, PDF creation, print-shop packet ZIP, and local export history.
- **Print Menu entry points** - Use MenuList, project Share modal, and Mobile Share now open the routed Print Menu workflow when `ENABLE_MENU_CARD_EXPORT` is on.
- **Multi-project Print Menu selection** - The route uses the shared project selector pattern, honors `projectId` links, avoids stale menu/source mixing while switching, and reuses selected project data within the route session.
- **Menu Card Export verification** - Added `npm run verify:menu-card-export` to check route files, feature flags, client-side generation, local history, and the absence of default API/Firebase write paths.
- **Real-data runtime QA** - Active multi-project demo data generated valid PDFs and print-shop packet ZIPs from separate non-empty menus before the feature was marked production ready.

### Fixed

- **Real menu extraction shape** - Print Menu now reads item/category data from both top-level project data and file-based `project.files[].extractedData.data`, matching real uploaded-menu project documents.
- **Print-shop packet robustness** - The rendered PDF is added to JSZip as an `ArrayBuffer`, so packet creation is reliable without a server-side renderer or Storage handoff.

### Decision

- **Separate route over single button** - The current PDF Surface stays documented as the live lightweight PDF path, while Menu Card Export becomes the planned long-term owner route at `/use-menulist/menu-card-export`.
- **Print workflow over file utility** - The planned route owns Home Print, WhatsApp PDF, Print-shop packet, QR scan checks, and stale-file regeneration instead of expanding Use MenuList or PDF Surface.
- **Firebase cost first** - The implementation intentionally uses browser Blob downloads and local history. No Firestore collection, Firestore index, Storage path, API route, Cloud Function, or Firebase deploy was added.

### Cost

- **Zero Firebase export write path** - Preview/export generation adds no Firestore writes and no Storage uploads. The route performs normal owner menu reads only when opened or when the selected menu changes.

---

## June 1, 2026 — Owner Truth And Menu Quality Polish

### Changed

- **Close-today actions now use Temporary Status** - Mobile "Mark Closed for Today" no longer rewrites the recurring weekday hours field. Recurring hour edits are labeled as regular weekday schedule changes.
- **Temporary Status refreshes public output cache** - Status set/clear now revalidates `menu-store-{storeId}`, `store-{storeId}`, and `client-stores` so customer-facing menu and official page output can refresh promptly.
- **Menu Check actions open the editor context** - Desktop dashboard checks now hand off to the matching project editor action, including repair flow, no-image/no-price filters, language management, and editor review.
- **Menu Check dashboard panel is mounted** - The owner dashboard overview now shows the Menu Check card below the hero card, including before analytics data exists when a selected project is available.
- **Menu Check editor banner uses the same action router** - Editor banner actions now use the same repair/filter/language handoff path as dashboard checks.
- **Menu Check owner polish** - Owner-facing quality surfaces now read as Menu Check, show one primary action, prefer Repair Menu for fixable gaps, use "No action needed" for all-clear, and show "Checked just now" on mobile/dashboard.
- **Presence Monitor readiness tightened** - Mobile and desktop sharing surfaces now treat an active menu project, not merely an OBP/domain URL, as the published-menu readiness signal. Mobile Presence Monitor copied links now include the same analytics source attribution as desktop.

### Cost

- **No new Firebase collection or provider path** - Changes reuse existing store/project reads, existing Temporary Status writes, browser `sessionStorage`, and public cache tag invalidation. No new listener, Cloud Function, Storage object, provider call, scheduler, index, or deploy target was added.

---

## June 1, 2026 — Growth Kits Owner-Value Hardening

### Changed

- **Mobile Today now presents a Sales Pack** - Eligible Pro/Premium stores see the mobile Today card as `Today's Sales Pack`, focused on one customer message, one staff line, and one counter line.
- **Sales Pack is now trigger-based** - Mobile Today surfaces it only for a fresh prepared pack, a previously used stale pack that needs an update, or a strong menu reason. Weak generic actions stay quiet.
- **Legacy Today generation deleted** - The old `No today action yet` / `Generate Today Action` prompt, generation helper, campaign engine, and generation API route were removed. Existing prepared Today campaigns still work, but new generated actions belong to GrowthOS / Sales Pack.
- **Stale packs require an update first** - Mobile and desktop now avoid presenting stale packs as directly usable. Owners are guided to prepare a fresh pack before copy/share/download actions.
- **Desktop Growth Kits copy tightened** - The module now emphasizes the daily Sales Pack outcome and removes owner-facing confidence percentages from the primary action panel.

### Cost

- **Old generator has no cost path** - The retired Social Content generator code is deleted, so there is no hidden endpoint, helper, campaign engine, project-read path, or campaign-write path. Mobile Today uses the existing shared GrowthOS summary read for eligible stores and adds no new Firestore collection, listener, Cloud Function, Storage object, provider call, scheduler, or index.

---

## June 1, 2026 — Custom Business Attribute Icons

### Changed

- **Custom business attributes use the shared icon picker** - Desktop and mobile Business Attributes settings now use the existing category icon/emoji picker for owner-defined public attributes.
- **Official Business Page renders selected custom icons** - Custom attribute chips now render saved Lucide icons and emoji values from `publicPresence.customAttributes[].icon`.

### Cost

- **No new Firebase cost** - The icon value is saved inside the existing OBP settings store update. This adds no Firestore reads, additional writes, listeners, indexes, Storage operations, Cloud Functions, provider calls, schedulers, external credentials, or deploys.

---

## June 1, 2026 — Growth Engine Foursquare Source And Business Truth Graph Policy

### Added

- **Foursquare source policy added** - Added `__docs__/growth-engine/growth-engine_foursquare-source-policy.md` to classify Foursquare as an identity/category/chain graph signal, not a direct cold-outreach source by default.
- **Business Truth Graph added to Growth Engine docs** - Updated Growth Engine architecture, spec, implementation, Firebase, tests, doctrine, marketing, decision brief, and strategy summaries so business/location/outlet/menu/source/claim/surface/handoff/freshness/attribution relationships are implementation contracts.
- **PAYG outreach blocker documented** - Locked that Foursquare Places API pay-as-you-go data must not be used to contact listed businesses as prospects unless a separate contract or written permission explicitly allows it.

### Product Decision

- **Useful but bounded** - Foursquare validates the graph model that matters for MenuList, but Growth Engine must only use it through source policy, field-profile, budget, retention, and public-output blockers.
- **Graph over pages** - Growth Engine creates candidate graph edges; MenuList creates confirmed truth edges through owner confirmation or approved MenuList verification.

### Cost

- **No runtime Firebase cost change** - This is documentation and planning only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, Storage operations, provider calls, routes, schedulers, external credentials, or deploys.

---

## June 1, 2026 — MyCodex Mobile Reading Flow

### Added

- **Mobile continue-reading home** - MyCodex now uses the mobile root route as a short-session home with the last opened document, saved scroll progress, queue, favorites, and recent docs.
- **Read-later queue** - MyCodex adds `/queue` (`/__mycodex/queue` locally) for temporary docs to read or play later.
- **Mobile bottom navigation** - The mobile PWA now has Home, Search, Queue, Saved, and Settings shortcuts above the iOS home indicator.
- **Scroll resume** - Per-document scroll positions are stored locally so a reopened document can resume where reading stopped.

### Decision

- **No database added** - This remains browser-local because MyCodex is a private single-user PWA. The new state is stored under `mycodex:queue-docs` and `mycodex:scroll-positions`.

### Cost

- **No Firebase or provider cost** - This adds no Firestore reads, writes, listeners, functions, indexes, Storage operations, remote database, or provider calls.

---

## June 1, 2026 — MyCodex Favorite Docs

### Added

- **Favorite docs are now local to the reader** - MyCodex adds a star action in the document header on desktop and mobile, plus a Favorites jump list in settings.
- **Favorites stay on the device** - Favorite entries are stored in browser `localStorage` under `mycodex:favorite-docs` with document path, title, source path, and favorite time.
- **Dedicated favorites page** - MyCodex adds `/favorites` (`/__mycodex/favorites` locally) to list every starred document on the current device.
- **Favorites playback** - The favorites page can play one starred document or all starred documents one by one through the browser/device voice engine until playback is stopped.

### Cost

- **No Firebase or provider cost** - Favorites remain browser-local and playback uses the browser/device voice engine. The same-origin MyCodex document route reads Markdown from `__docs__` for favorites playback and adds no Firebase reads, writes, listeners, functions, storage operations, or provider calls.

---

## June 1, 2026 — MyCodex Page Audio Shortcut

### Changed

- **Whole-page reading is now a primary document action** - MyCodex shows a direct read-page control in the document header on desktop and mobile, so full-page playback no longer requires opening settings first.
- **Audio controls are simpler** - Removed selection and section playback from the visible audio controls. The reader now focuses on whole-page play, pause, resume, and stop.
- **Voice choices are India-focused** - The voice picker now shows India-related browser/OS voices only, including Indian English, Hindi, and other India language voices when installed. If none are installed, MyCodex uses the device default without listing unrelated voices.

### Cost

- **No Firebase or provider cost** - This remains browser-local `speechSynthesis` behavior. It adds no reads, writes, listeners, functions, storage operations, provider calls, or API routes.

---

## June 1, 2026 — Growth Engine Google Places Policy

### Added

- **Google Places source policy added** - Added `__docs__/growth-engine/growth-engine_google-places-source-policy.md` to validate Google Places as a controlled candidate-discovery and place identity adapter.
- **Field-mask and cost gates documented** - Updated Growth Engine docs so Google Places runs require approved source policy, named field-mask profiles, SKU/cost estimate, provider budget caps, and no wildcard field masks in production.
- **Retention boundary clarified** - Locked that place IDs can be durable provider handles, while broader Google Places content must not become MenuList truth, public artifact content, sitemap/feed/truth-packet content, or Firestore lead facts.

### Product Decision

- **Useful but bounded** - Google Places is useful for seed discovery, dedupe, and selective enrichment, but the intelligence layer, opportunity scoring, contactability prediction, and distribution activation remain Growth Engine-owned.

### Cost

- **No runtime Firebase cost change** - This is documentation and planning only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, Storage operations, provider calls, routes, schedulers, external credentials, or deploys.

---

## June 1, 2026 — Growth Engine Implementation Readiness Lock

### Changed

- **Growth Engine automation blueprint added** - Added `__docs__/growth-engine/growth-engine_automation-workflow-blueprint.md` to define owned workflows, enrichment waterfalls, AI worker registry, decision snapshots, sender assignment, operator work queues, and optimization loops based on researched GTM workflows.
- **Implementation docs hardened** - Updated Growth Engine spec, implementation, Firebase, help, marketing, mobile, tests, doctrine, decision brief, gap audit, and distribution architecture so implementation requires automation contracts before sending or public distribution.
- **External listing handoffs added** - Added owner-authorized Google Business Profile, Apple Business Connect, and Bing Places handoff tracking as distribution paths only, not lead sources or MenuList truth authorities.
- **Naming shortlist added** - Added `__docs__/growth-engine/growth-engine_naming-shortlist.md` with `MenuNexus` as the recommended name after preliminary domain, search, and company-name availability signals.

### Product Decision

- **Distribution automation over outbound tooling** - Growth Engine must own workflows, waterfalls, decision evidence, AI gates, sender continuity, operator queues, discovery jobs, attribution, and freshness. Third-party tools can be low-level adapters only.
- **AI-heavy but gated** - AI can clean, classify, score, draft inside templates, validate surfaces/feeds, and recommend actions, but DNC, complaint, wrong-contact, private-data, blocked-source, pricing, and unverified-truth fixtures need zero critical misses before autonomy.

### Cost

- **No runtime Firebase cost change** - This is documentation and planning only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, Storage operations, provider calls, routes, schedulers, external credentials, or deploys.

---

## June 1, 2026 — Growth Engine Distribution Direction Lock

### Changed

- **Growth Engine direction updated** - Reframed Growth Engine from lead-generation infrastructure into MenuList-owned distribution infrastructure. Lead generation is now one input, while target acquisition, owner claim routing, canonical truth activation, owned surface publishing, discovery publishing, freshness monitoring, and attribution are the core.
- **Distribution architecture added** - Added `__docs__/growth-engine/growth-engine_distribution-architecture.md` covering distribution target registry, canonical surface publisher, discovery publisher, menu feed exporter, GBP handoff manager, truth packet publisher, surface health, and freshness monitoring.
- **Docs aligned to no-stage baseline** - Updated Growth Engine spec, implementation, Firebase, help, marketing, mobile, test cases, doctrine, gap audit, decision brief, and strategy docs so the launch baseline includes distribution gates rather than a send-first lead-gen flow.

### Product Decision

- **Owned distribution over third-party tools** - Growth Engine should own target identity, source policy, channel rails, public URL inventory, sitemaps, feed exports, discovery jobs, attribution, and freshness. Generic CRM, enrichment, and outreach tools must not become the system of record.
- **Public distribution requires confirmed truth** - Sitemaps, IndexNow, menu feeds, truth packets, and canonical public surfaces must come from owner-confirmed or approved MenuList-verified truth, not scraped candidate data or private artifacts.

### Cost

- **No runtime Firebase cost change** - This is documentation and planning only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, Storage operations, provider calls, routes, schedulers, external credentials, or deploys.

---

## June 1, 2026 — Answerlattice Final Logo Source

### Changed

- **Answerlattice logo source finalized** — `public/answerlattice-logo.svg` is the canonical Answerlattice mark source for logo UI, metadata, favicon, PWA, OpenGraph, and splash derivatives.
- **Answerlattice logo background removed** — The canonical SVG and shared inline logo atom no longer include the exported black canvas/frame; the mark paths, gradients, filters, stroke widths, and geometry stay unchanged and render on transparent SVG backgrounds like the MenuList logo.
- **Answerlattice logo derivatives refreshed** — Regenerated the Answerlattice logo PNGs, favicon files, PWA icons, OpenGraph image, and iOS splash images from the transparent SVG source without recoloring, reshaping, or simplifying the mark.
- **Shared Answerlattice logo wrapper aligned** — Header, footer, diagrams, and dashboard navigation now render the exact canonical SVG path geometry through the shared `AnswerlatticeLogoMark` atom instead of the old inline-redrawn mark.
- **Answerlattice loader animation aligned** — Server and global Answerlattice loading states now use a dedicated loader atom that animates the shared final SVG path geometry and keeps the design-team colors, SVG-native filters, and transparent canvas while matching the MenuList 3-second stroke-draw cycle.
- **Answerlattice external logo shadows removed** — Answerlattice server and global loaders no longer add CSS blur or drop-shadow around the SVG logo, so the only path shadow/effect comes from the design-team SVG itself.
- **Answerlattice website diagrams guarded as vectors** — Visible Answerlattice website diagram components now fail verification if they reintroduce raster images, PNG logo usage, or image-wrapped logo rendering instead of the shared inline SVG-path mark.
- **Answerlattice reveal layer softened-logo fix** — Visible Answerlattice website sections no longer keep a persistent `translate3d`/`will-change` compositing layer after reveal, so inline SVG diagram logos stay crisp when the page is zoomed.

### Cost

- **No runtime Firebase cost change** — This is a static Answerlattice asset and documentation update only. It adds no Firestore reads, writes, listeners, Cloud Functions, Storage operations, provider calls, schedulers, external credentials, or deploys.

---

## May 31, 2026 — KitStamp Permanent Naming Lock

### Changed

- **KitStamp name locked** - Retired the previous VisualMeta planning name and made KitStamp the permanent product brand, slug, product code, and documentation namespace.
- **Docs renamed** - Moved the active documentation set from `__docs__/visual-meta/` to `__docs__/kitstamp/` and renamed active files to the `kitstamp_*` convention.
- **Product constants aligned** - Updated the disabled product-domain placeholder to use `kitstamp`, `/__kitstamp`, `/sites/kitstamp`, and `kitstamp.com` as the primary host.
- **Product code aligned** - Updated product identity references from `VM` to `KS` for KitStamp planning and multi-product doctrine.
- **Naming lock added** - Added `__docs__/kitstamp/kitstamp_naming-lock.md` covering the permanent brand, rejected names, legal-name candidate, MCA/trademark caveats, and implementation naming rules.

### Cost

- **No runtime Firebase cost change** - This is documentation and disabled product-registry alignment only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, Storage operations, provider calls, routes, schedulers, external credentials, or deploys.

---

## May 31, 2026 - Growth Engine Separate Product Planning

### Added

- **Growth Engine planning docs** - Added a new `__docs__/growth-engine/` documentation set for MenuList lead acquisition, outreach safety, campaign dry-runs, tracked onboarding, Firebase cost controls, mobile emergency controls, and product doctrine.
- **Growth Engine operator gap audit** - Added a second-pass web-researched gap audit covering source policy, sender readiness, consent/suppression, artifact QA, provider costs, AI evals, incident handling, and market-positioning gaps.
- **Repo strategy decision** - Documented the recommended path: same repo, separate product boundary, separate Firebase/functions/data, and no MenuList clone.
- **GrowthOS boundary clarified** - Updated GrowthOS and strategy docs so Growth Engine is not confused with GrowthOS/Growth Kits.

### Product Decision

- **Separate internal acquisition product** - Growth Engine is internal lead-generation infrastructure for MenuList, not a customer-facing MenuList feature, not GrowthOS, not a CRM, and not a website-demo factory.
- **Safety-first outbound posture** - Campaign dry-run, suppression, DNC handling, budget caps, channel kill switches, and tracked onboarding routes are required before sending.
- **Readiness before sending** - Source policy registry, jurisdiction/channel policy, sender-domain readiness, global consent/suppression ledger, onboarding flow inventory, artifact takedown, provider register, AI eval thresholds, and incident runbook are now first-slice gates.

### Cost

- **No runtime Firebase cost change** - This is documentation and planning only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, Storage operations, provider calls, routes, schedulers, external credentials, or deploys.

---

## May 31, 2026 — Public Menu Link Import

### Added

- **Public create-menu link input** — `/create-menu` now supports a permission-confirmed public menu link beside menu photo upload.
- **Review-first public link drafts** — Public link import creates a temporary preview draft only. Imported content is not published until an authenticated owner claims the setup.
- **Link import safety reuse** — The public route reuses the existing Menu Link Import source-acquisition guardrails for unsafe protocols, private IPs, unsafe redirects, unsupported sources, and bounded acquisition.

### Cost

- **Controlled public processing cost** — Public photo and link submissions share the existing `PUBLIC_MENU_ENTRY` 3-per-IP-per-day limiter, SAFE_MODE guard, 24-hour draft TTL, and source-size limits. Link input is additionally gated by `ENABLE_MENU_LINK_IMPORT`.

---

## May 31, 2026 — KitStamp Deep Review And Implementation Lock

### Added

- **KitStamp deep ChatGPT review** — Added a line-range review for the new KitStamp discussion, treating ChatGPT proposals as suggestions and recording final accept, modify, reject, and defer decisions.
- **KitStamp implementation lock** — Added `kitstamp_implementation-lock-v1.md` with first-implementation flags, collections, source snapshot schema, content unit schema, asset/text/review schemas, manifest schema, export kit schema, storage paths, API route contracts, MenuList snapshot rules, export template rules, adapter rules, and activation gates.

### Product Decision

- **Export Templates accepted with limits** — Built-in, versioned packaging presets are accepted. Custom template builders, arbitrary scripting, and template marketplaces are rejected for the first implementation.
- **MenuList Snapshot Import accepted with strict separation** — KitStamp can copy selected MenuList item snapshots after preview, but cannot live-sync, write back, consume MenuList AI packs, write to MenuList Storage, or invalidate MenuList public cache.
- **Export Adapters narrowed to file-based handoff** — Generic handoff packages are accepted. Direct Shopify/PIM/DAM/Cloudinary/Google API push, credential storage, live sync, and downstream acceptance guarantees are rejected for the first implementation.

### Cost

- **No runtime Firebase cost change** — This is documentation and planning only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, Storage operations, provider calls, routes, schedulers, external credentials, or deploys.

---

## May 31, 2026 — Answerlattice Pre-Onboarding Safety Boundary

### Changed

- **Pre-onboarding now states source-access limits clearly** — The Answerlattice pre-onboarding page, guide, markdown prompt, owner guide, agent guide, feature docs, and rules now say the prompt only covers sources an AI IDE can inspect.
- **Pre-onboarding is now directly reachable from navigation** — The Answerlattice footer links to the Pre-Onboarding Kit and Guide, and the mobile drawer links to the Pre-Onboarding Kit.
- **Pre-onboarding is now a primary website route** — Desktop navigation, homepage hero, first-scroll homepage section, Resources, and Get Started now route buyers to `/pre-onboarding` before workspace setup.
- **Prompt opens in-page** — The Pre-Onboarding page and guide now open the master prompt in a modal with copy-to-clipboard, preview, and Markdown download actions while keeping `/pre-onboarding.md` available for direct agent access.
- **Blocked sources stay pending** — Private repos, login-only apps, restricted websites, unsupported recordings, screenshots, files, or weak agent sessions must be marked pending or unavailable instead of treated as covered.
- **Confidence language is bounded** — The approved standard is available-source coverage after validation, not guaranteed perfect output across every AI IDE, model, private app, source bundle, or product shape.

### Cost

- **No runtime cost change** — This is public copy, prompt, docs, and rule maintenance only. It adds no Firestore reads, writes, listeners, Cloud Functions, Storage operations, provider calls, schedulers, or deploys.

---

## May 31, 2026 — GrowthOS Deep Conversation Review

### Changed

- **Growth Kits scope is now freeze-ready** — Reviewed the 3,606-line GrowthOS discussion and updated the active GrowthOS Add-on docs so V1 starts with Do This Now, truth readiness, owner voice basics, compliance preflight, one kit to multiple handoffs, Staff Brief Pack, basic export logging, and mobile latest-kit fallback.
- **Pilot features are separated from launch scope** — Existing image adaptation, customer reply snippets, photo capture prompts, multi-outlet localized kits, used-history UI, advanced low-data access, offer builder, and review-triage expansion are now explicitly pilot-gated or deferred.
- **Staff Brief Pack promoted to V1 core** — Staff guidance is now documented as a high-leverage owner workflow, while staff management, shifts, commissions, internal chat, CRM, loyalty, and auto-posting remain rejected.
- **Conversation review archived** — Added `__docs__/growthos-addon/_archive/growthos-deep-conversation-review-2026-05-31.md` with line-range mapping and final accept/defer/reject decisions.

### Cost

- **No runtime Firebase cost change** — This is documentation and planning only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, Storage operations, provider calls, routes, schedulers, or deploys.

---

## May 31, 2026 — MyCodex Installed Icon Padding

### Fixed

- **MyCodex installed icon now has more breathing room** — The PWA icon artwork keeps the same transparent logo mark, but the generated install icons now use additional internal padding so the iPhone home-screen icon no longer appears oversized.

### Cost

- **No Firebase or provider cost** — This is a static MyCodex asset update only. It adds no reads, writes, listeners, functions, storage operations, or API routes.

---

## May 31, 2026 — MyCodex Reader Preference Persistence

### Fixed

- **Reader settings now survive app relaunches safely** — MyCodex loads saved reader, audio, navigation, and recent-document preferences before persistence writes run, preventing first-render defaults from resetting stored settings.
- **Navigation expansion is now remembered** — Expanded documentation folders are stored under `mycodex:expanded-folders` so mobile and desktop navigation returns to the reader's last browsing shape.

### Cost

- **No Firebase or provider cost** — Preferences remain browser-local in `localStorage`. This adds no reads, writes, listeners, functions, storage operations, or API routes.

---

## May 31, 2026 — MyCodex iOS PWA Safe Areas

### Fixed

- **MyCodex now respects iPhone PWA safe areas** — Mobile header, reader content, navigation drawer, settings drawer, login/offline pages, audio mini-player, scroll-to-top button, and status toast now reserve iOS status-bar, notch, home-indicator, and horizontal safe-area space.

### Cost

- **No Firebase or provider cost** — This is MyCodex-scoped CSS/layout handling only. It adds no reads, writes, listeners, functions, storage operations, or API routes.

---

## May 31, 2026 — MyCodex Audio Reader

### Added

- **MyCodex can read docs aloud without provider cost** — Added browser/device voice reading for selected text, current section, and full page inside the MyCodex settings drawer.
- **Reader comfort settings** — Added local voice selection, speed control, follow-reading scroll, best-effort keep-screen-awake, pause/resume/stop, active-block highlight, and an active mini-player.

### Cost

- **No Firebase or cloud TTS cost** — The reader uses the browser `speechSynthesis` API only. It adds no Firestore operations, Cloud Functions, Storage operations, OpenAI calls, Google Cloud calls, or MyCodex audio API route.

---

## May 31, 2026 — Answerlattice Product Pipeline Alignment Audit

### Fixed

- **Owner launch checklist stays in owner routes** — Customer-facing compatibility routes remain available for support surfaces, but owner checklist actions now open Knowledge Base, Ticket Inbox, and Changelog management screens.
- **Answerlattice graph and audit writes keep product scope** — Nightly graph summaries now carry `pId/tId/sId`, Firestore rules recognize the live `entityGraphIndex_*` summary document, old graph summaries get a one-time metadata backfill, and system audit logs from nightly/draft/bootstrap flows include Answerlattice product scope.
- **Non-Answerlattice signed-in accounts leave the dashboard path** — An authenticated Google account without an Answerlattice workspace is routed to Answerlattice pricing/subscription instead of seeing a blocked dashboard state.
- **Answerlattice Firestore read paths now have explicit guardrails** — Added Answerlattice-wide cost read-model docs, tenant-scoped the widget activity fallback query, and clamped signal, audit, and Support Board list limits.

### Cost

- **Low one-time metadata cost** — Existing graph summary documents may receive one merge write to add `pId/tId/sId`; unchanged summaries still skip normal graph rewrites.
- **No new listeners or unbounded scans** — The audit changes add no public reads, no realtime listeners, no new collections, and no scheduler fan-out. Widget activity fallback reads are now tenant-scoped, and caller-provided list limits are clamped.

## May 31, 2026 — KitStamp Separate Product Planning

### Added

- **KitStamp is now planned as a separate product** — Added a full KitStamp documentation set that treats KitStamp as product code `KS`, separate from MenuList, GrowthOS, Answerlattice, and the internal Website Asset Operating System.
- **End-to-end Final Content Kit plan** — Documented the product spec, implementation plan, Firebase cost model, mobile review scope, marketing position, website copy candidate, helpdoc, test cases, and Answerlattice-style doctrine.
- **Product separation doctrine** — Added KitStamp core doctrine, non-goals charter, infrastructure freeze, and product separation playbook covering routes, Firebase, Storage, billing, source snapshots, export kits, and product-boundary tests.

### Product Decision

- **Separate product, export-only** — KitStamp prepares source-backed, human-approved Final Content Kits. It does not publish, schedule, manage live MenuList truth, run ads, replace Canva/Adobe/Photoroom, or auto-approve generated output.
- **Old KitStamp strategy archived** — Moved the previous single-file KitStamp strategy to `__docs__/kitstamp/_archive/kitstamp-strategy-2026-05-31.md` so the new doc set is the active planning source.

### Cost

- **No runtime Firebase cost change** — This is documentation and planning only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, Storage operations, provider calls, routes, schedulers, or deploys.

---

## May 31, 2026 — GrowthOS Add-on Planning

### Added

- **GrowthOS is now planned as a MenuList add-on** — Added a fresh GrowthOS Add-on documentation set that treats GrowthOS as a higher-tier MenuList service labelled Growth Kits, not a standalone product.
- **End-to-end Growth Kits plan** — Documented owner value, market context, product scope, implementation plan, feature flags, entitlement gates, mobile support, Firebase cost, help copy, website copy, marketing packaging, and test cases.

### Product Decision

- **Manual output first** — Growth Kits prepares copy/download/print materials from current MenuList truth. Direct posting, scheduling, ROI claims, standalone routing, and Google review ingestion remain out of scope.
- **Old GrowthOS docs stay historical** — The older GrowthOS strategy and command-center docs now point to `__docs__/growthos-addon/` as the active implementation-planning source.
- **Old GrowthOS folders archived** — Moved previous standalone GrowthOS strategy and command-center docs under `__docs__/growthos-addon/_archive/`, leaving only redirect stubs at the old paths to avoid implementation confusion.

### Cost

- **No runtime Firebase cost change** — This is documentation and planning only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, Storage operations, provider calls, routes, schedulers, or deploys.

---

## May 31, 2026 — Today Weekly Growth Pack

### Added

- **Today now has a gated Weekly Growth Pack** — Added a disabled-by-default `ENABLE_TODAY_WEEKLY_GROWTH_PACK` flag that can show copy-ready WhatsApp, Google Business Profile, Instagram, and staff-line drafts inside the existing Today module.
- **Desktop and mobile use the same pack builder** — Desktop `/today` and the real owner mobile Today tab now share `src/lib/today/weeklyGrowthPack.ts`, so the pack stays deterministic and uses current MenuList truth only.

### Product Decision

- **Weekly Growth Pack remains paused** — Do not freeze or roll it out as a main feature yet. Owner usability and need are not proven, so the flag stays off and the feature can return only through a small owner pilot.

### Cost

- **No Firebase cost change** — The pack is client-side only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, Storage operations, schedulers, provider calls, external posting, routing changes, or deploys.

---

## May 31, 2026 — Answerlattice Website Launch-Ready Positioning

### Changed

- **Answerlattice homepage hero now leads with launch-ready support** — The first-screen copy now says founders can launch their SaaS with support already built, with setup as the primary action and the page-aware demo as proof.
- **Answerlattice public claims now separate generated knowledge from managed support surfaces** — Website and docs now say Answerlattice prepares docs, FAQs, answer drafts, hosted help, and widget support while tickets, changelog publishing, feedback, ratings, and feature requests remain owner-managed.

### Cost

- **No Firebase cost change** — This is static website copy, metadata, and documentation only. It adds no Firestore reads, writes, Cloud Functions, indexes, Storage operations, provider calls, routing changes, or deploys.

---

## May 31, 2026 — Answerlattice Feedback Signals And Owner Review

### Added

- **Feedback Review is now on the Answerlattice public website** — Added `/product/feedback-review` as a buyer-facing feature page and added a homepage/product preview tab showing feedback becoming support review work.
- **Answerlattice owners now have a scoped feedback review route** — `/answerlattice/feedback` shows ratings, product-area feedback, feature requests, suggestions, workspace stats, and detail rows for the current Answerlattice `tId/sId`.
- **Help Center feedback now emits support signals** — Feedback submissions still write to the Answerlattice `feedback` collection and now emit non-blocking `answerlattice_signalEvents(type='feedback')` rows when signal mutation is enabled.
- **Feedback rows can be added directly to Support Board** — Owners can turn a selected feedback item into a private Support Board card without waiting for source sync.
- **Support Board can import feedback signals** — The actionable signal sync path now accepts feedback signals and creates cards with rating/request-aware priority and tags.
- **Feedback submission is now category-correct** — Users can submit general feedback, product-area issues, or feature requests directly; submissions no longer have to pass through the feature-request step.
- **Feedback can now be sorted by Product Surface** — Owners can assign, change, clear, and filter feedback by Product Surface from `/answerlattice/feedback`.
- **Widget answer feedback keeps compact surface context** — Widget search history stores only compact surface fields so negative answer feedback can feed context-aware support signals without persisting the full transient context payload.

### Changed

- **Feedback options are SaaS-support generic** — Removed MenuList/menu-specific feature names from the Answerlattice Help Center feedback options.
- **Support Board cards inherit feedback surface context** — Cards created from feedback now carry `relatedSurfaceId` and `relatedContextKeys` when the feedback row is linked to a Product Surface.
- **Unresolved signals are excluded from automatic mutation clustering** — Feedback remains a review signal until an owner links a Support Board card to a real Answerlattice entity.
- **Answerlattice Firestore rules now support end-user feedback safely** — Authenticated tenant users can create their own feedback and read their own latest row; owner/support users can review scoped workspace feedback.

### Cost

- **Firebase cost is explicit and bounded** — Each feedback submission adds one feedback write and, when signal mutation is enabled, one signal write. Owner review adds one bounded `tId+sId` feedback query plus one Product Surface option query. Assigning a Product Surface updates one feedback document. Adding selected feedback to Support Board adds one card write.

---

## May 31, 2026 — Website Asset Operating System Planning

### Added

- **Website Asset Operating System documentation** — Added a dedicated internal doc set for the cross-product asset contract that will let Codex audit, brief, review, and later regenerate MenuList and Answerlattice website assets without repeated founder context.
- **Product-boundary decision recorded** — The ChatGPT asset-factory proposal is accepted as a separate-product-style internal architecture, not a public market-facing product now, not a MenuList owner feature, and not Answerlattice runtime.
- **Asset governance first-pass scope** — Documented asset slots, manifests, source fingerprints, quality scoring, autonomy levels, founder approval gates, storage policy, mobile output checks, and first implementation tests before any video/media generation work.
- **Internal v1 implementation** — Added `packages/asset-factory/` with typed asset slots, brand contexts, manifest, local audit/review/brief/fingerprint scripts, internal placeholder generation, raw/working guardrails, an asset skill, and an internal review prompt. Added root npm scripts for `assets:audit`, `assets:review`, `assets:brief`, `assets:fingerprint`, and `assets:generate:missing`.
- **Founder usage guide** — Added a practical guide explaining what the system is, why it exists, where it lives, how to run it, how to ask Codex for asset work, and which asset types require founder approval.
- **Answerlattice-adjacent product thesis** — Updated AssetOS docs to position it beside Answerlattice's founder/operator/developer product truth layer: Answerlattice governs support knowledge truth, while AssetOS governs product-media truth through read-only briefs, fingerprints, audits, and founder review.

### Cost

- **No Firebase cost change** — This is local docs and tooling only. It adds no Firestore reads, writes, listeners, Cloud Functions, Firebase Storage operations, indexes, schedulers, public routes, website runtime media, or deploys.

---

## May 31, 2026 — GrowthOS Command Center Planning

### Added

- **GrowthOS Command Center planning docs** — Added a candidate planning set for the pasted GrowthOS conversation, including a grounded ChatGPT review, decision brief, product spec, implementation plan, Firebase cost contract, mobile assessment, marketing notes, website copy candidate, helpdoc candidate, and test matrix.
- **GrowthAction decision guardrails** — Documented `GrowthAction` as a planning abstraction while preserving the current Stage 2 gate, Social Content/Today as GrowthOS v0, export-only first scope, and the rule that GrowthOS must not write MenuList truth unless the founder changes the product-separation boundary.

### Cost

- **No runtime Firebase cost change** — This is documentation and planning only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, Storage operations, provider calls, routing changes, or deploys.

---

## May 31, 2026 — Answerlattice Intake Media And Ledger Hardening

### Added

- **Answerlattice intake now supports screenshots and short media evidence** — Owners can upload supported screenshots/images and short audio/video files into Knowledge Intake; Answerlattice extracts support-relevant source text while keeping authoritative answers review-gated.
- **Answerlattice intake usage ledger now protects paid media processing** — OCR/transcription reserves Answerlattice support credits before provider work, records the AI operation, settles successful extraction, and refunds reserved credits on extraction failure.
- **Answerlattice nightly now refreshes intake analytics** — The existing Answerlattice scheduler writes compact intake summary data from bounded recent job docs and does not retry failed jobs, crawl URLs, call providers, or publish review items.
- **Answerlattice intake now has a scoped platform monitor** — Platform admins can open `/platform/answerlattice-intake`, select a workspace from `answerlatticeTenantsSummary`, observe scoped intake jobs, credit ledger rows, media extraction usage, scheduler intake health, and run a selected-workspace nightly retry.

### Fixed

- **Answerlattice fallback signals now keep entity context** — FAQ/RAG/empty search paths, widget feedback, and escalation tickets preserve matched entity IDs and fallback reasons so nightly mutation can create useful proposals without extra entity-resolution reads.
- **Answerlattice intake publishing is idempotent and entity-safe** — Intake-published KB articles and canonical-answer proposals use deterministic destination IDs, and canonical proposals require at least one related entity before entering governance.
- **Answerlattice intake license checks tolerate stale mirrors** — Paid intake routes use the store subscription mirror first, then a direct subscription record or capped tenant/store fallback before blocking an active workspace.
- **Answerlattice public signal ingestion now requires write scope** — Public read keys can still read entity/answer endpoints, but `/public/v1/signals` and MCP sessions that can write signals now require explicit `signals:write`.
- **Answerlattice intake usage ledger fails closed for unknown actions** — Only known intake OCR, transcription, and embedding actions can reserve intake usage; unsupported future actions cannot silently record zero-unit paid processing.

### Cost

- **Firebase cost is bounded and explicit** — Paid media extraction adds one ledger write plus subscription/store credit updates per reservation, one source write on success, one AI operation log, and one job counter update. The scheduler adds up to 20 job reads plus one summary read per tenant run and writes only when the summary hash changes. The platform monitor first reads one tenant summary and recent scheduler logs; selected-workspace detail refresh adds up to 10 intake jobs and 10 ledger rows. Runtime signal alignment adds fields to existing search/ticket/feedback writes rather than new writes. Intake license checks add a direct subscription read or capped subscription query only when the store mirror is missing or stale. No raw media Storage retention, realtime listener, hidden retry worker, or unbounded intake scan was added.

---

## May 31, 2026 — MyCodex Reader Controls

### Changed

- **MyCodex reader now has persistent reading controls** — Font size, reading width, desktop navigation visibility, and quick search focus can be adjusted from the reader toolbar and keyboard.
- **MyCodex presentation is calmer and easier to scan** — The document surface now uses neutral typography, clearer code/table styling, a reading progress bar, and a less decorative chrome treatment.
- **MyCodex mobile navigation is easier to use** — The header/reader toolbar now share stable sticky heights, the drawer locks background scroll while open, folder rows stay left-aligned, and matched folder searches expand all documents under that folder.
- **MyCodex mobile toolbar now avoids desktop-only controls** — Reading width and sidebar pin controls are desktop-only; mobile keeps font sizing, reset, and hamburger navigation.
- **MyCodex documents are easier to reuse from mobile** — Each opened document now shows its resolved source file path and provides copy path, copy link, share, copy page, and screenshot capture actions.
- **MyCodex reader utilities moved out of the document flow** — Document actions, text sizing, theme, search, and desktop layout controls now live in a settings drawer so mobile reading starts with the document content.
- **MyCodex font sizing has a wider lower range** — Reader text can now be reduced down to `10px` for dense reference reading.
- **MyCodex desktop navigation is easier to manage** — The sidebar header now matches the reader header height, the reader header remains sticky, and desktop navigation can be collapsed and restored from the header.
- **MyCodex document file labels now lead with document type** — Generic doc suffixes such as `_spec`, `_impl`, `_firebase`, `_website`, and review/audit patterns now display as `Spec - Feature Name`, `Impl - Feature Name`, and similar reader labels.
- **MyCodex mobile sign-in now uses a first-party page** — The Vercel reader no longer depends on the browser Basic Auth prompt. The login route validates the existing MyCodex credential env vars server-side and keeps access with an `HttpOnly` session cookie.
- **MyCodex now remembers reading continuity locally** — The settings drawer shows recent documents and previous/next document controls, while the desktop header exposes previous/next buttons for fast doc-to-doc reading.
- **MyCodex now has its own PWA identity** — The internal reader now uses a MyCodex manifest, icon set, Apple launch images, and a private-docs service worker on `menulist.digital` instead of borrowing MenuList platform PWA assets.
- **MyCodex crawler restrictions are explicit** — MyCodex routes now send no-index/no-follow robot metadata and headers, plus a product-scoped `robots.txt` disallow response, without changing MenuList or Answerlattice routes.
- **MyCodex folder URLs now open a document list** — Visiting a folder such as `/__mycodex/ai-enhancement-packs` shows the documents in that folder instead of a generic not-found page when no README exists.

### Cost

- **No Firebase cost change** — These are client-only reader UI changes over local repository markdown. They add no Firestore reads, writes, listeners, Cloud Functions, indexes, or scheduled work.

---

## May 31, 2026 — Answerlattice Knowledge Intake Planning

### Added

- **Answerlattice Knowledge Intake Command Center documentation** — Added a complete day-one document set for the planned paid-gated, source-backed intake architecture that will sit above the current upload-first KB generation pipeline.
- **Intake cost and safety contract** — Documented the source registry, Storage-heavy artifact model, compact Firestore summaries, source authority rules, paid entitlement gates, review queue, source lineage, topic readiness, and test matrix.
- **Product-link intake hardening** — Added selected-page website discovery, app URL crawl boundaries, unchanged-source skip rules, bounded job orchestration, credit settlement, and pre-provider privacy filtering to the intake plan.
- **Summary-first intake infrastructure** — Added workspace intake summaries, bucketed scheduler directory docs, source-version fields, dirty-summary repair, and write-if-changed rules so implementation can avoid growing collection scans.
- **Runtime alignment for intake output** — Added a destination publishing matrix so approved intake output must feed existing KB articles/categories, FAQ retrieval, canonical-first search, vector embeddings, product-surface summaries, changelog/release context, public content cache, and compiled context source-version paths.
- **KB generation successor note** — The existing KB Generation Pipeline docs now clarify that the current runtime remains the compatibility article/FAQ output path, while Knowledge Intake Command Center is the planned long-term Answerlattice intake layer.

### Cost

- **No runtime Firebase cost change yet** — This is documentation/planning work only. The planned implementation is explicitly paid-gated and Storage-heavy: it avoids per-fact/per-section Firestore materialization, broad crawls, realtime intake lists, scheduler collection scans, per-source provider fanout, Firestore docs for skipped website URLs, and AI/provider calls when selected links are unchanged. The runtime alignment update also avoids duplicate retrieval collections by reusing existing cache/version, embedding, surface-summary, public-cache, and compiled-context paths.

---

## May 30, 2026 — MyCodex Product Domain Routing

### Changed

- **MyCodex now uses `menulist.digital` as a dedicated internal product host** — `menulist.digital` and `www.menulist.digital` are documented as product domains that rewrite to `/sites/mycodex` before tenant/custom-domain routing can treat the host as a restaurant domain.
- **MyCodex Vercel access is protected** — The middleware now requires `MYCODEX_BASIC_AUTH_USER` and `MYCODEX_BASIC_AUTH_PASSWORD` outside localhost before serving repository documentation.
- **URL routing docs now include product-domain guardrails** — The URL routing architecture README, spec, implementation guide, ADRs, and Firebase cost note now describe MenuList, Answerlattice, and MyCodex host separation.

### Cost

- **No Firebase cost change** — MyCodex host classification is middleware/domain-registry logic and the reader serves repository markdown from `__docs__`. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, or scheduled work.

---

## May 28, 2026 — Answerlattice Section Header Alignment

### Changed

- **Answerlattice website section introductions now use one centered treatment** — Homepage sections, Product sections, Integrations, Pricing, Quickstarts, Security, and shared product/SEO page templates now use the same centered eyebrow, heading, and subheading pattern instead of alternating between centered, left-aligned, and split layouts.

### Cost

- **No Firebase cost change** — This is static website component and documentation work only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, or scheduled work.

---

## May 28, 2026 — Answerlattice Product Menu Label Fit

### Fixed

- **Answerlattice website Product menu feature labels stay on one line** — The desktop Product dropdown gives the feature column more room and keeps feature labels such as Knowledge Base and FAQ Management from wrapping into two rows.

### Cost

- **No Firebase cost change** — This is static website header UI only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, or scheduled work.

---

## May 28, 2026 — Answerlattice Widget Mobile Suppression

### Fixed

- **MenuList owner mobile no longer gets trapped behind the Answerlattice widget** — The owner-layout embed suppresses the external widget on mobile viewports and force-hides any already-open widget when the route is blocked.
- **Answerlattice widget runtime now exposes hide/show controls** — Client products can force-hide the launcher and open iframe during native mobile or internal admin routes, then release it when the widget should be available again.
- **Answerlattice widget runtime types match the browser contract** — The web package now includes nullable context clearing plus `hide()` and `show()` on the runtime/client type surface.

### Cost

- **No Firebase cost change** — These are shared dashboard UI and widget-loader client changes only. They add no Firestore reads, writes, listeners, Cloud Functions, indexes, or scheduled work.

---

## May 27, 2026 — Answerlattice Product Menu Navigation Polish

### Changed

- **Answerlattice website Product menu now reads like navigation** — The desktop hover menu uses route icons, compact link rows, clearer product-area and feature groups, and a stronger Product overview entry instead of paragraph-heavy cards.

### Cost

- **No Firebase cost change** — This is static website header UI only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, or scheduled work.

---

## May 27, 2026 — Answerlattice Mobile Drawer Icons

### Changed

- **Answerlattice mobile drawer links now include route icons** — Product overview, Product Areas, Product Features, Other links, and the setup CTA now use the existing Lucide icon stack so the drawer scans faster without changing its route grouping or behavior.

### Cost

- **No Firebase cost change** — This is public website header UI only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, or scheduled work.

---

## May 27, 2026 — Answerlattice Mobile Drawer Animation

### Fixed

- **Answerlattice mobile hamburger drawer now animates open and closed** — The drawer mounts off-screen first, then applies the open state after a short browser paint delay. Closing removes the open state before unmounting, so the right-to-left slide and backdrop fade are visible.

### Cost

- **No Firebase cost change** — This is public website header UI only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, or scheduled work.

---

## May 27, 2026 — Answerlattice Website End-to-End Audit

### Fixed

- **Answerlattice website docs now match the live install route set** — The website documentation no longer lists removed standalone `/install/verify`, `/install/security`, `/install/contracts`, or `/install/changelog` HTML pages. It now points to the live generated install pages and Markdown contract mirrors.

### Verified

- **Public website route coverage passed** — Answerlattice homepage, product pages, feature pages, use-case pages, install pages, resources, pricing, legal pages, sitemap, robots, LLM context, and Markdown install docs all returned `200` locally.
- **Rendered layout passed desktop and mobile checks** — 48 sitemap pages were checked at desktop and mobile widths with no horizontal overflow, visible runtime error state, missing header/footer, or missing H1.

### Cost

- **No Firebase cost change** — This is static public website documentation and verification only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, or scheduled work.

---

## May 27, 2026 — Answerlattice Website Mobile Drawer

### Changed

- **Answerlattice public hamburger now opens as a right-side drawer** — Mobile navigation slides in from the right with a backdrop, close action, Escape handling, body scroll lock, and link-close behavior.
- **Mobile drawer keeps the grouped navigation structure** — Product Overview, Product Areas, Product Features, Other, and Start free setup remain grouped inside the drawer.

### Cost

- **No Firebase cost change** — This is public website header UI only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, or scheduled work.

---

## May 27, 2026 — Answerlattice Agent Install Layer

### New

- **Answerlattice now has a generated AI coding agent install packet** — Public install pages, Markdown mirrors, AGENTS.md, CLAUDE.md, Cursor RULE.md, Cursor .mdc, Windsurf, skill files, and agent-kit ZIP all render from one v1 widget contract source.
- **Answerlattice dashboard now has a dedicated Install Center** — `/answerlattice/install-center` keeps the AI install packet, current widget setup, agent files, framework snippets, setup snapshot, verification checklist, and machine-readable docs in one owner route.
- **Widget installs now have a frozen v1 URL** — New installs use `https://answerlattice.com/widget/v1/answerlattice-widget.js`; the existing `/widget/answerlattice-widget.js` path remains compatible.
- **Widget v1 script uses bounded caching** — `/widget/v1/answerlattice-widget.js` stays stable without long immutable caching, so compatible runtime fixes can reach clients without changing their install snippet.
- **Widget settings now hand off to Install Center** — The Widget Install & Embed tab points owners to Install Center for agent handoff and verification, while the widget settings tabs keep appearance, keys, origins, hosted help, and low-level snippets.
- **SDK handoff copy was removed from Answerlattice install surfaces** — Dashboard snippets, public quickstarts, generated install docs, and active Answerlattice docs now present only the supported v1 script and `window.AnswerlatticeWidget` browser contract.
- **Public install navigation is now launch-safe** — Standalone Verify, Security, Changelog, and human Contract install pages were removed from the public install route set. Verification and safety guidance stay inside the dashboard packet, agent kit, and machine-readable contract.
- **Dashboard settings own origins and blocked routes** — Generated prompts no longer ask owners to maintain separate allowed-origin or blocked-route variables in the client product.

### Cost

- **Static public install docs add no Firebase cost** — The public pages and public agent files are generated/static. Opening `/answerlattice/install-center` reads the existing widget-config summary and optionally the activation summary; the protected ZIP endpoint reads the Answerlattice store document once only when the owner downloads the kit.

---

## May 27, 2026 — Multi-Outlet Policy Hardening

### Changed

- **Outlet policy copy now matches the real rules** — Desktop and mobile share the same owner-facing policy categories for inherited menu changes, local menu additions, menu tools, menu design, and languages.
- **Mobile outlet rules sheet is now safer to use** — The sheet shows allowed/blocked state tags, warns about unsaved changes, asks before discarding edits, and saves only changed flags.
- **Disabled outlet extraction is blocked before processing starts** — `processMenuImagesJob` now checks the linked outlet project and master `outletPolicy` before calling extraction providers.

### Cost

- **Linked outlet extraction adds one master-store policy read only when needed** — The job reuses its project read, adds one master store read for linked outlet projects, and avoids provider cost when `canUseMenuExtraction=false`.

---

## May 27, 2026 — Answerlattice Mobile Sidebar Theme Fix

### Fixed

- **Mobile sidebar parent rows now keep readable colors after theme changes** — The shared dashboard sidebar no longer uses mixed color expressions, and expanded parent rows blend into the sidebar surface while collapsed parent rows keep their shaded treatment.

### Cost

- **No Firebase cost change** — This is a shared dashboard UI style fix only. It adds no Firestore reads, writes, listeners, Cloud Functions, or scheduled work.

---

## May 27, 2026 — Answerlattice Owner Navigation Cleanup

### Changed

- **Support Control now shows owner/staff operations only** — The dashboard sidebar keeps Knowledge Base, FAQs, Changelog, Support Board, Ticket Inbox, Conversations, and Weekly Digest under Support Control.
- **Customer support preview routes are no longer dashboard entry points** — Help Center, Documentation, Release Notes, and Submit Ticket remain direct compatibility/customer shell routes, but they are not shown in the owner sidebar or header actions.
- **Management sessions no longer render customer shell routes by accident** — Direct owner visits to Help, Docs, Release Notes, or Submit Ticket redirect to Knowledge Base, Changelog, Ticket Inbox, or the first permitted owner route.
- **Permission fallback stays on owner surfaces for management users** — Staff who open a route they cannot use are redirected to the first permitted owner route instead of the customer help page. Non-management Answerlattice client sessions still fall back to the client help route.

### Cost

- **No Firebase cost change** — This is navigation, routing fallback, and documentation cleanup only. It adds no Firestore reads, writes, listeners, Cloud Functions, or scheduled work.

---

## May 27, 2026 — Access-Based Store Switching

### Changed

- **Store switching now follows staff store mapping** — Desktop and mobile show the switch option only when the user has `canSwitchStores` and more than one active mapped store.
- **HQ is no longer the only switching source** — A mapped user can switch from their default store to another mapped store and back without needing to be in the HQ/master store.
- **Mobile branch switching now lives in More** — The mobile More tab shows a searchable Branch dropdown below the signed-in profile card, so users with many mapped branches can switch directly.
- **Billing store pickers use the same access filter** — Desktop and mobile billing views list only active stores already mapped to the user.

### Cost

- **Switching no longer writes user access** — `/api/auth/switch-store` reads the caller store and tenant list, then checks existing session store mappings. User access is granted during outlet creation or staff assignment, not during switching.

---

## May 27, 2026 — Answerlattice Website Support Board Page

### Added

- **Support Board now has a public product-feature page** — `/product/support-board` explains private support cards, internal notes, status history, selected follow-up, related support context, and answer-proposal handoff.
- **Support Control and buyer resources now mention Support Board where it helps evaluation** — Support Control, FAQ, Resources, Updates, sitemap metadata, and agent-readable context now describe Support Board as a manual-first owner/staff workboard.

### Changed

- **Support Board automation claims stay conservative** — The website does not claim every ticket or signal syncs into the board by default. Ticket/signal sync and nightly board preparation remain controlled rollout wording.

### Cost

- **No Firebase cost for website browsing** — The new page and copy are static public website content. Normal browsing does not add Firestore reads, writes, Cloud Function calls, or scheduler work.

---

## May 27, 2026 — Mobile Outlet Billing Gate Repair

### Fixed

- **Paid outlets now inherit the master subscription even if older tenant summary data is missing the master marker** — Mobile subscription lookup falls back to hydrated store details and the single active unflagged master row, so an outlet does not show the subscribe gate when the master subscription is active.
- **Outlet writes repair the tenant master marker** — Outlet create and policy saves now write `isMaster: true` into `tenants/{tId}.storesList` when the store document is already marked as the master.

### Cost

- **No recurring cost change** — The fallback uses data already loaded in the session. The repair write only happens during outlet create or policy save when the tenant list is missing the master marker.

---

## May 27, 2026 — Answerlattice Support Board Cost Gate and Status History

### Changed

- **Support Board source sync is now controlled rollout** — Ticket/signal sync UI is hidden unless `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SOURCE_SYNC` is enabled, because tickets and signals already have their own owner dashboards.
- **Support Board nightly prep is disabled by default** — `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_SYNC` now gates the scheduler path so consolidated board cards are created only for tenants that need that review mode.
- **Support Board summary reads are disabled by default** — `ENABLE_ANSWERLATTICE_SUPPORT_BOARD_NIGHTLY_SUMMARY` keeps the UI from reading `supportBoardSummary_*` while nightly preparation is off.
- **Support Board cards now track status activity** — Cards keep top-level `status` for filtering and capped `statuses[]` history for timestamped owner/staff activity, matching the support-ticket status-history pattern.

### Cost

- **Default Support Board cost is lower** — Normal board use is a bounded card read plus owner-triggered writes only. Ticket/signal source reads, nightly source scans, and summary reads do not run unless rollout flags are enabled.
- **Status history adds cost only on status changes** — A status change now reads the card once and writes the card once to append capped history. Field edits without status changes stay one write.

---

## May 27, 2026 — Answerlattice Website Contact and Mobile Navigation

### Added

- **Answerlattice contact page now has a full inquiry flow** — `/contact` now includes a buyer-ready form, direct email paths, partnership/security contact paths, privacy/terms consent, and a no-secrets warning.
- **Answerlattice contact submissions stay inside Answerlattice infrastructure** — `POST /api/answerlattice/public/contact` rate-limits anonymous submissions, uses a honeypot, validates input, hashes the requester IP, and writes to Answerlattice Firestore instead of another product's public enquiry collection.
- **Mobile navigation now groups lower-level links** — The Answerlattice hamburger menu keeps Product Overview, Product Areas, and Product Features grouped, then adds an **Other** card for Use Cases, Demo, Install, Pricing, Resources, Updates, and Contact with safe-area bottom padding.

### Cost

- **Normal browsing remains static** — Page views and mobile menu opening add no Firestore reads, listeners, Cloud Functions, or scheduled work.
- **Valid contact form submissions add one bounded Answerlattice Firestore write** — Spam/bot requests are filtered by rate limiting and honeypot handling before the write path.

---

## May 27, 2026 — Answerlattice Support Board Nightly Sync

### Added

- **Support Board now prepares owner review work nightly** — The existing Answerlattice scheduler creates deduped cards for repeated fallback, low-confidence answers, negative feedback, escalations, drifted canonical answers, and release impact.
- **Support Board summary is now compact** — `platformSummary/supportBoardSummary_{tId}_{sId}` stores open work, needs-answer count, high-priority count, source/status counts, and latest sync stats for owner UI.
- **Manual sync remains available** — Ticket and signal sync buttons still exist for immediate review, but the scheduler does not mirror every ticket into Kanban.

### Cost

- **Adds bounded nightly Firestore usage** — Per tenant, nightly sync reads capped search history, signal, drift, release, and recent board-card windows; creates or updates at most 20 board cards; skips resolved/unchanged cards; and writes the compact summary only when changed.

## May 27, 2026 — Answerlattice Website Product Boundary

### Changed

- **Answerlattice public pages no longer mention a specific client product** — About, Footer, FAQ, Security, Security One-Pager, Proof, Product, Launch Setup, Team Access, Updates, system coverage, and LLM context now describe Answerlattice as an independent governed answer infrastructure.
- **Answerlattice streamed loader payload now uses Answerlattice identity** — The root server loader auto-detects Answerlattice product requests so rendered HTML and agent-visible payloads do not expose another product brand.
- **Website documentation now follows the same boundary** — Answerlattice website README, spec, and implementation notes now use generic client/product/platform wording instead of client-specific relationship framing.

### Cost

- **No Firebase cost change** — This is static website copy and documentation work only. It adds no Firestore reads, writes, listeners, Cloud Functions, indexes, or scheduled work.

---

## May 27, 2026 — Answerlattice Website Brand Color

### Changed

- **Answerlattice no longer uses indigo as its primary website color** — The public site now uses `Verdigris Answer Layer`: deep navy background, deep teal primary controls, teal signal accents, and refreshed logo/social SVG colors.
- **Website accents are consistent end to end** — CTAs, badges, tabs, hover states, diagrams, route pages, demo panels, and onboarding form accents now use the verdigris/teal system instead of the previous indigo treatment.
- **Answerlattice website docs now match the implemented palette** — The website spec, implementation log, and README describe the new dark teal direction.

### Cost

- **No Firebase cost change** — This is static website styling, SVG asset, and documentation work only. It adds no Firestore reads, writes, listeners, Cloud Functions, or scheduled work.

---

## May 26, 2026 — Answerlattice Support Board

### Added

- **Answerlattice now has a private Support Board** — `/answerlattice/support-board` gives owners, managers, and support staff a board for missed questions, unresolved tickets, support signals, answer follow-up, and internal notes.
- **Support Board is connected to the support loop** — Owners can create manual support cards, sync recent unresolved tickets, sync actionable support signals, and create a governed answer proposal when a card has a related entity.
- **Support work remains governed** — Board actions do not publish answers. Answer proposals still move through Knowledge Governance before becoming canonical support truth.
- **Support Board docs now track the roadmap** — `__docs__/answerlattice/support-board/` records the delivered MVP, Firebase cost model, and future plan for weekly review, release impact, saved replies, surface health, reminders, integrations, and customer timelines.

### Cost

- **Support Board adds bounded Firestore usage** — Board load reads up to 120 private board cards. Ticket and signal sync are explicit actions that read up to 50 source docs and create up to 20 cards. Notes are embedded and capped at 25 per card to avoid subcollection listeners.

## May 26, 2026 — Answerlattice Website Theme Contract

### Changed

- **Answerlattice public website now has a named theme contract** — `Verdigris Answer Layer` centralizes the deep navy background, teal primary, surface/border tokens, text colors, and success/warning/danger colors.
- **Answerlattice PWA colors now match the public site** — The manifest background and browser theme color use the same deep navy as the website instead of older off-palette navy values.
- **Inline website color usage is narrower** — The Answerlattice 404 page and get-started form now read primary, text, success, and danger colors from the shared website theme tokens.

### Cost

- **No Firebase cost change** — This is static website theme and metadata work only. It adds no Firestore reads, writes, listeners, Cloud Functions, or scheduled work.

## May 26, 2026 — Answerlattice FAQ Custom Answers

### Changed

- **Owner FAQs now act as custom answers in search** — Published active FAQs can answer matching end-user questions after canonical-answer retrieval misses and before embedding/RAG fallback.
- **FAQ/custom answers keep source links** — Owners can continue linking answers to articles, product surfaces, entities, and tags; matched FAQ answers return the linked article as a helpful reference when available.
- **Widget and Help Center responses show answer source** — FAQ/custom-answer hits are marked as owner answers while canonical answers remain the highest-priority verified path.
- **FAQ management wording is clearer** — `/answerlattice/faqs` now presents the screen as FAQs and custom answers, not only a static FAQ page.
- **Answerlattice public website now reflects custom answers** — Homepage, Product, FAQ Management, Support Control, Widget, FAQ, SEO pages, updates, and agent-readable LLM context now describe owner-written Q&A as the implemented shortcut after canonical answers and before fallback.

### Cost

- **Lower AI/provider cost for repeated owner-authored questions** — FAQ/custom-answer hits skip embedding generation, vector search, and answer generation. Cold FAQ retrieval reads a bounded published FAQ list and caches it per tenant/store/source-version for 60 seconds; linked article references add one article read only when a matched FAQ has a linked article.
- **No website runtime Firebase cost change** — The public-site refresh is static copy/metadata only and adds no website Firestore reads, writes, listeners, or Cloud Functions.

## May 26, 2026 — Menu Repair Category Icons

### Changed

- **Repair Menu now fills missing category icons** — Mobile Menu tab repair and desktop Menu Command Center repair add suggested icons for active categories that have no saved icon. Existing owner-selected icons and emojis stay unchanged.
- **Repair summaries include category icons** — The repair preview, confirmation, and completion summary now count category icons alongside missing descriptions, language text, and project details.

### Cost

- **No extra Firebase read path** — Category icon repair uses menu data already loaded in the Menu tab or Command Center. It is saved with the existing project update when the owner applies Repair Menu.

---

## May 26, 2026 — Answerlattice Staff Roles and Permissions

### Added

- **Answerlattice now has workspace team access** — `/answerlattice/team` lets workspace owners add members, assign roles, reset login details, deactivate/remove members, and manage custom roles.
- **Answerlattice staff login follows the shared staff access model** — Team members can use email/password setup or owner-managed staff ID/passcode, with phone metadata, shared one-time passcode sharing, password/passcode reset, and owner force sign-out.
- **Answerlattice public website now exposes Team Access** — Product, Launch Setup, Pricing, Security, Security One-Pager, Get Started, FAQ, Privacy, Resources, Updates, sitemap metadata, and LLM context now include Answerlattice roles, owner reset, force sign-out, and workspace-scoped access.
- **Answerlattice roles are product-specific** — Owner, Manager, and Support Staff roles use Answerlattice permission keys instead of restaurant staff permissions from another product domain.
- **Answerlattice route and API access is permission-aware** — Dashboard navigation, route guards, and protected Answerlattice APIs now check the active Answerlattice role before exposing workspace, knowledge, widget, support, integrations, billing, and rebuild controls.
- **Answerlattice Firestore rules now enforce permission claims** — Direct Answerlattice client reads/writes require Answerlattice permission claims; same-tenant membership alone is no longer enough for managed collections.

### Cost

- **Team Access adds bounded reads and writes** — Opening Team Access reads the active store roles plus tenant users. Staff and role mutations write the Answerlattice user/store role docs and the default auth `productAccounts.AL` bridge. Reset and sign-out operations also call Firebase Auth token revocation. No scheduled functions were added.

## May 26, 2026 — Shared Dashboard Shell for Answerlattice

### Changed

- **Answerlattice now uses the shared dashboard header and sidebar chrome** — The Answerlattice dashboard keeps its own routes, access guards, logo, and product actions while sharing the desktop shell structure used across owner apps.
- **Answerlattice desktop navigation now supports the same sidebar collapse behavior** — The shared sidebar width, hover expansion, active state, and App Appearance/Dark Mode action treatment are consistent across owner dashboards.
- **Answerlattice header now carries direct Help, theme, and profile actions** — Help opens the Answerlattice Help route, the theme button toggles light/dark mode, and the avatar opens the shared profile modal pattern.
- **Answerlattice header has a workspace-switcher slot ready for future workspaces** — No workspace UI is shown until the real workspace model is wired, but the header can accept that control without another shell refactor.
- **Answerlattice mobile navigation keeps safe-area drawer handling** — Mobile continues to use Answerlattice route guards and drawer navigation while inheriting the shared sidebar rendering.

### Cost

- **No Firebase cost change** — This is a UI shell refactor only. It adds no reads, writes, listeners, functions, rules, indexes, or scheduled work.

## May 25, 2026 — MenuList Answerlattice Widget Client Embed

### Changed

- **MenuList owner routes can now load the Answerlattice widget as an external client** — The owner app layout includes an env-configured Answerlattice widget embed for `/projects` and adjacent dashboard routes.
- **No widget key is hardcoded** — The embed renders only when `NEXT_PUBLIC_MENULIST_ANSWERLATTICE_WIDGET_KEY` is set to an Answerlattice-issued `al_` key.
- **Script host follows the environment matrix** — Local uses localhost, QA/Preview uses `ecomsai.com`, and Production uses `answerlattice.com`, with an optional script source override for temporary previews.

### Cost

- **No Firebase cost unless the widget key is configured** — With no key, the component returns `null`. With a key, page load performs the existing widget config lookup against Answerlattice Firebase only; it does not read MenuList Firebase.

---

## May 25, 2026 — Help Center Governance Boundary Fix

### Fixed

- **MenuList Help Center no longer shows Answerlattice governance work queues** — Removed Signal-to-Knowledge Queue, Entity Candidates, Canonical Coverage KPI, and the Governance tab from the Help Center landing and tab list.
- **Governance stays in owner/admin surfaces** — Entity review, mutation proposal review, drift, and answer governance remain available through Answerlattice dashboard/governance routes instead of the end-user Help Center path.

### Cost

- **Firebase reads reduced when Help Center opens** — The Help Center no longer mounts the Answerlattice Coverage KPI card, so it avoids that governance summary read on Help Center landing load. No new reads, writes, listeners, or scheduled work were added.

---

## May 25, 2026 — Answerlattice Widget Image Support Website Refresh

### Changed

- **Answerlattice public pages now explain widget screenshot input accurately** — Homepage widget proof, In-App Help Widget, Install, Quickstarts, Security, Security One-Pager, FAQ, SEO widget pages, Updates, and LLM context now describe user-initiated screenshot upload or paste.
- **Automatic capture stays out of scope** — Public copy explicitly avoids promising host-app screenshot capture, DOM scraping, or background visual collection.
- **No new screenshot page was added** — The image feature is presented as part of the existing page-aware widget and safety model rather than a separate product category.

### Cost

- **No Firebase cost change** — These are static website and documentation changes only. Widget image queries still cost extra only when a user explicitly attaches an image.

---

## May 25, 2026 — Answerlattice Firebase Boundary Hardening

### Changed

- **Answerlattice widget/API keys now stay in Answerlattice Firebase** — In separated Firebase mode, `al_` key validation reads Answerlattice Firestore and fails closed if Answerlattice Admin credentials are missing.
- **Widget runtime no longer falls back to MenuList public API credentials** — `/api/widget/config`, `/api/widget/search`, `/api/widget/feedback`, and predictive-help auth use Answerlattice widget credentials only.
- **MenuList public API keys remain MenuList-only** — Menu and business public API routes reject non-`ml_` keys before credential lookup.
- **Ticket dashboard reads are scoped** — Non-platform Answerlattice ticket reads/listeners require the active Answerlattice `tId/sId`, while platform support sessions keep the existing cross-tenant queue view.
- **Answerlattice dashboard waits for Answerlattice Firebase Auth** — Dashboard child components mount after `ensureFirebaseAuthForSession()` resolves, and Answerlattice-route claim sync uses the Answerlattice tenant record while preserving platform/support access.
- **Widget questions now reflect in Widget Management** — Widget search-history rows carry `mountContext`, and `/answerlattice/widget` shows recent widget questions from the active Answerlattice tenant/store.
- **Answerlattice image search no longer trusts only MenuList Storage** — Help Center image-question validation now trusts configured Firebase Storage buckets for the active product, including Answerlattice QA/production buckets, instead of a hardcoded `ecomsai` bucket path.
- **MenuList Help Center uses Answerlattice as an external client service** — When the signed-in MenuList user has a real Answerlattice product account, `/help-center` searches, tickets, changelog reads, and Firebase Auth sync use that Answerlattice `tId/sId` without a temporary client flag or hardcoded MenuList widget host.
- **Cross-product source context is preserved** — Answerlattice-owned writes keep `pId: AL` while storing the originating product scope in `sourceContext`, so MenuList client activity remains auditable without routing Answerlattice data through MenuList Firebase.

### Cost

- **One bounded dashboard read was added** — `/answerlattice/widget` may read up to 12 recent `aiSearchHistory` rows when the widget activity panel loads or refreshes. Widget runtime query cost is unchanged.
- **No extra search reads were added** — The Storage trust change only changes URL validation before an existing image fetch; it does not add Firestore reads, writes, or listeners.
- **MenuList client scoping does not add new reads** — It reuses the session payload and existing Answerlattice reads/writes that the Help Center, tickets, changelog, and widget flows already perform.

---

## May 25, 2026 — Environment Target Matrix

### Changed

- **MenuList and Answerlattice environment targets are now explicit** — Local development uses MenuList at `http://localhost:3000/` with Firebase `ecomsai` and Answerlattice at `http://localhost:3000/__answerlattice/` with Firebase `answerlattice-qa`.
- **Preview and production routing are separated** — Vercel Preview uses `menulist.online` + `ecomsai` for MenuList and `ecomsai.com` + `answerlattice-qa` for Answerlattice; Vercel Production uses `menulist.ai` + `menulist` and `answerlattice.com` + `answerlattice`.
- **Deploy and verification commands were aligned** — Answerlattice Functions now have explicit QA and production deploy scripts, Firebase aliases include both product targets, and `npm run verify:env-targets` checks the matrix.

### Cost

- **No Firebase reads or writes added** — This is routing, environment validation, CLI alias, and documentation work only. It does not add listeners, scheduled functions, storage operations, or database calls.

---

## May 25, 2026 — Answerlattice Website Day-One Launch Pack

### Changed

- **Answerlattice homepage and Product now package the first rollout** — Added a day-one launch-pack section linking developer quickstarts, starter surfaces, import templates, install verification, ROI/proof, and security handoff from the main buyer path.
- **Rollout resources are easier to find** — Resources, Pricing, Get Started, Security, and LLM context now point buyers toward the existing quickstarts, proof pack, ROI calculator, and security one-pager without adding another public route.

### Cost

- **No Firebase cost change** — The new website sections and links are static public content. They do not add dashboard reads, widget calls, Firestore writes, or scheduler work.

## May 25, 2026 — Answerlattice Developer Install Pack

### Added

- **Answerlattice now has a developer install pack** — Added a typed `@answerlattice/web` source package, public framework quickstarts, and dashboard install snippets for HTML, SDK, route context, Next.js, React, Vue/Nuxt, and vanilla setups.
- **Widget install verification is clearer** — Widget Management now checks key readiness, script load, allowed-origin status, blocked-route status, and context arrival from the existing runtime status payload.
- **Starter product surfaces are productized** — Product owners can seed Billing, Onboarding, Team Settings, Releases, Integrations, and Common Errors surfaces without creating unrelated canonical answers automatically.
- **Knowledge import starters are available** — KB generation upload now includes Markdown docs, FAQ CSV, changelog, and ticket-macro starter templates while keeping URL crawling out of scope.
- **Public buyer enablement pages were added** — Answerlattice now includes `/quickstarts`, `/roi-calculator`, `/proof`, and `/security-one-pager`, with Resources, Pricing, Install, sitemap, and LLM context updated.

### Cost

- **Static website additions have no Firebase cost** — Public quickstarts, ROI calculator, proof pack, and security one-pager are static/client-side pages.
- **Dashboard additions are bounded** — The verifier reuses existing widget settings reads; surface templates only write when an owner applies them, capped at six starter surface writes plus one summary rebuild.

---

## May 25, 2026 — Website Existing Menu Link Intake

### Changed

- **Main website source maps now include existing menu links** — The homepage and How It Works source maps show photo, PDF, existing link, and typed text as intake sources before owner review.
- **Website copy stays inside the reviewed-draft boundary** — The updated homepage, How It Works, and Features copy says MenuList prepares an owner-reviewed version and avoids scraping, marketplace-import, and auto-publish claims.
- **No website runtime or payment flow changed** — Pricing, payment, subscription, auth, onboarding, `/create-menu`, and public customer-menu runtime behavior were not changed.

---

## May 25, 2026 — Answerlattice Website Runtime Scaling Copy

### Changed

- **Answerlattice website now explains compiled context as runtime reliability** — Homepage/product proof, Product, Security, Resources, FAQ, Updates, and LLM context now describe approved context bundles, cache-first widget/runtime paths, and owner-visible readiness without creating a standalone MCP page.
- **Daily governance is described from the buyer point of view** — Public copy now explains workspace-local support-day timing and centralized governance repair without exposing Cloud Scheduler, Firestore document IDs, or lock internals.
- **Agent-context claims stay rollout-gated** — Public pages and agent-readable files clarify that MCP/agent-context tools are not general public access and do not allow agent-side knowledge writes.

---

## May 25, 2026 — Menu Link Import

### Added

- **Import from existing menu link is now implemented behind `ENABLE_MENU_LINK_IMPORT`** — Authenticated owners can paste a public menu link, confirm permission, and create a review draft without changing the existing photo/PDF upload flow.
- **Link imports use the existing extraction review path** — Link sources create private artifacts and forced-review `menuImageProcessingJobs`; nothing is written to the public menu until the owner approves the review.
- **Link import and file upload stay separated in the upload UI** — Desktop blocks link import while selected local files are waiting to upload and blocks Upload & Continue while a link import job is active; mobile keeps link import on the select step only.

### Security

- **Public URL acquisition is guarded before fetch** — The import route blocks non-HTTP schemes, localhost/private/link-local/metadata targets, unsafe redirects, oversized responses, unsupported content types, and rapid retry abuse, then pins outbound requests to validated public DNS answers.

### Documentation

- **Menu Link Import docs added** — Spec, implementation, Firebase, mobile support, website, marketing, helpdoc, test cases, and ChatGPT review notes now live under `__docs__/menu-link-import/`.

---

## May 25, 2026 — Answerlattice Centralized Scheduler

### Changed

- **Answerlattice scheduler work now routes through one master scheduler** — The deployed `answerlatticeNightly` export stays in place, but it now delegates to a centralized scheduler task registry instead of directly running every workspace.
- **Scheduler timing is now workspace-local** — Answerlattice Settings stores workspace timezone and support-day end time, and scheduled work runs after that local day closes plus the settlement buffer.
- **Duplicate scheduler runs are locked** — Scheduler state and per-workspace/date locks in `platformSummary` prevent scheduled/manual overlap from processing the same workspace date twice.
- **MCP server code is split for maintenance** — Tool registration and compiled-bundle handlers now live outside the App Router JSON-RPC shell, with a tenant/store tool-call rate limit.
- **Activation shows Daily Governance status** — Owners can see workspace-local scheduler status, support-day timing, last completed run, and recent workspace runs from compact summaries and capped run logs.
- **Owner operations responses are sanitized and cache-safe** — Activation and Daily Governance APIs now avoid raw scheduler/build errors, global scheduler totals, and cached operational responses.

---

## May 24, 2026 — Answerlattice Compiled Context Distribution

### Changed

- **Answerlattice now has a compiled context serving layer** — Approved product, surface, entity, canonical, release, docs, and widget context can be compiled into versioned Firebase Storage bundles with `platformSummary/sourceVersions_*` and `platformSummary/bundleManifest_*` as the control plane.
- **Runtime reads are bundle-first where safe** — Widget config now returns active public bundle pointers, public entities prefer the compiled server bundle, public bundle proxy reads are server-cached, and MCP has gated read-only session/token tooling backed by private compiled bundles.
- **Activation now exposes bundle readiness** — The Activation Command Center shows compiled context status, version, size, routes, and a guarded manual rebuild action.
- **Backend repair is source-version driven** — Answerlattice source changes mark bundles stale, KB/function writes update source versions, and the nightly Answerlattice scheduler repairs stale bundles with bounded source reads and immutable Storage writes.
- **Storage and rules now enforce the bundle boundary** — Public bundles use opaque `pb_*` paths, private bundles are server-only, and client writes to compiled context objects are denied.

---

## May 24, 2026 — Answerlattice Website Workflow Notification Pages

### Changed

- **Workflow notifications are now public product content** — Answerlattice website now includes a real `/integrations` page plus `/product/workflow-notifications`, covering Slack/email destinations, digest-first delivery, test notification, compact health, and bounded delivery.
- **Proactive help now has scoped buyer-facing copy** — `/product/proactive-help` explains configured page-aware prompts tied to active triggers and approved support summaries without implying always-on autonomous widget behavior.
- **Website discovery stays aligned** — Resources, FAQ, updates, sitemap registry, LLM context, and Answerlattice website docs now include the new feature pages and keep broader adapters controlled rollout.

## May 24, 2026 — Storage Cache Cost Hardening

### Changed

- **Versioned public uploads now carry immutable cache metadata** — Prepared media, OBP fallback images, PWA icon overrides, static asset previews, and public Answerlattice changelog assets now tell browsers/CDNs to reuse unchanged files.
- **Internal source/support uploads use private immutable caching** — Public menu draft images, Answerlattice knowledge-source files, support ticket attachments, and chat images now allow browser reuse without shared public CDN caching.
- **Answerlattice separated Storage paths are respected** — Answerlattice ticket, chat, changelog, and knowledge-source cleanup paths now use Answerlattice Storage when the product runs in separated Firebase mode.

## May 24, 2026 — Answerlattice Optional Expansions Restored

### Changed

- **Answerlattice optional expansions restored and hardened** — Predictive support, external workflow integrations, and graph traversal are active code paths again because they support page-aware guidance, governance notifications, and deterministic retrieval quality.
- **Workflow notifications are owner-configurable** — Product Details now includes Slack and email workflow notifications. Webhook URLs stay server-side, are never returned after save, and delivery payloads/errors are sanitized before logging.
- **Workflow notifications now include test delivery and health** — Owners can queue one controlled Slack/email test notification, and settings show compact last delivery status without reading raw delivery logs.
- **Workflow delivery is digest-first and TTL-backed** — Answerlattice emits one nightly summary plus critical coverage / repeated AI failure alerts for active tenants, uses persistent minute/day delivery caps, and lets Firestore TTL clean event/log/counter records.
- **Predictive support now fails closed without cooldown storage** — The widget predictive endpoint keeps API-key scope, origin checks, rate limits, and hashed user cooldown keys; if Upstash cooldown storage is unavailable, proactive prompts are skipped instead of repeating.
- **Predictive support is now summary-gated** — Widget config advertises predictive support only when active triggers exist, and nightly stores resolved suggestion snippets so runtime calls usually need no canonical-answer read.
- **Graph traversal stays summary-backed** — Retrieval uses the precomputed `platformSummary/entityGraphIndex_{tId}_{sId}` document and reuses the loaded graph for suggestions to avoid duplicate reads per search.
- **Graph summaries skip unchanged writes** — Nightly graph rebuilds compute a deterministic source hash and avoid rewriting `entityGraphIndex` when product structure has not changed.

## May 24, 2026 — Website Mobile Diagram Polish

### Changed

- **Website diagrams now use mobile-only row flow** — Homepage and How It Works show horizontal inputs, centered MenuList review, and outputs below on phone screens.
- **Mobile diagram paths restored** — Homepage and How It Works now keep subtle static dotted connectors on phone screens, aligned to the mobile row layout and anchored to card edges.
- **Diagram themes now match across pages** — Homepage, How It Works, and Multi-location diagrams now use light surfaces in light mode and dark contrast surfaces in dark mode.
- **Diagram pulse added** — Homepage and How It Works keep the static dotted paths and add a subtle reduced-motion-aware pulse that travels from inputs into MenuList, pauses while the center rings keep a light always-on pulse, and then moves from MenuList toward outputs. Multi-location keeps the approved master-to-outlet pulse.
- **Output cards now highlight on arrival** — Destination cards briefly highlight only their existing border when the moving pulse reaches them, using the same diagram color and reduced-motion safeguards.
- **How It Works outputs are grouped on mobile** — Customer outputs now render as two rows of three cards instead of one long vertical stack.
- **Multi-location mobile diagram is lighter** — The mobile master-to-outlet flow now shows three outlet cards while the desktop diagram still shows five. The active website diagram audit found no other mounted diagrams using this pattern.

## May 24, 2026 — Upload Privacy and Source Retention Clarity

### Changed

- **MenuList media uploads now record privacy metadata** — Prepared public media uploads now tag Storage objects with EXIF-normalization status, source metadata policy, and the actual public-asset retention lifecycle.
- **Answerlattice source uploads now show retention context** — Knowledge-source uploads now tell admins that source files stay with the generation job until deletion and warn that images or screenshots can include hidden location or device details.
- **Privacy policy copy now matches upload behavior** — MenuList and Answerlattice privacy pages now describe image metadata handling and Answerlattice source-file retention without adding unsupported time-based retention promises.
- **Upload security docs now separate service uploads from marketing use** — The docs now reject a bundled marketing consent toggle until a separate opt-in, withdrawal, and consent-log flow exists.

## May 23, 2026 — Agent-Readable SEO/AEO Hardening

### Added

- **MenuList agent context hardened** — `llms.txt` and `llms-full.txt` now explain what public agents may read, which official handoff links they may open, when unknown should stay unknown, and which owner-controlled actions remain out of public scope.
- **Answerlattice agent context added** — Answerlattice product domains now serve dedicated `llms.txt` and `llms-full.txt` routes so agents read Answerlattice as governed answer infrastructure, not as generic platform context or a helpdesk replacement.
- **MenuList structured data expanded** — The homepage JSON-LD now renders in server HTML, and active platform marketing/legal pages emit WebPage and BreadcrumbList JSON-LD for clearer machine-readable page identity.
- **Answerlattice structured data expanded** — Public Answerlattice pages now emit page-level WebPage and BreadcrumbList JSON-LD from the shared route registry, while homepage WebSite structured data references the active public route set.
- **Agent-readiness verifier added** — `npm run verify:agent-readiness` checks MenuList and Answerlattice route registries, robots, sitemap, LLM files, redirected-route exclusions, and structured-data wrappers.
- **Agentic web plan documented** — The WebMCP video/ChatGPT plan is recorded under Discovery Infrastructure with the accepted PAL boundary and deferred WebMCP/MCP gates.

### Changed

- **MenuList platform discovery cleaned up** — Public discovery URLs now use `https://menulist.ai`, and the legacy `/product` redirect remains functional but is no longer listed in sitemap or LLM discovery files.
- **Answerlattice robots policy made explicit** — Answerlattice `robots.txt` now enumerates the shared AI/search crawler allowlist and links product-domain LLM context files.

## May 23, 2026 — External Menu Sync Owner Clarity

### Changed

- **External Menu Sync now starts with owner-facing context** — Desktop Business Settings and mobile More now explain what the connection does, who should use it, when owners can ignore it, and how MenuList remains the source of truth before showing provider URL and verification-secret fields.
- **External sync labels are less technical** — Owner UI now uses External Sync, Provider connection URL, Verification secret, Test connection, Updates sent, and Provider setup while preserving the internal `posSync` contract.
- **Answerlattice brand assets now use the dimensional infinity mark** — Answerlattice website metadata, favicon/PWA icons, OpenGraph preview, public header/footer, and dashboard sidebar now use the Answerlattice-colored dimensional infinity logo instead of the temporary `C` mark.
- **Answerlattice website header/footer keep the approved mark shape** — Public header and footer branding now render the approved dimensional mark SVG wrapper instead of the simplified path-redrawn mark.

---

## May 22, 2026 — Mobile Transactions Parity

### Changed

- **Mobile Transactions now matches the desktop essentials** — The More-tab Transactions screen keeps its mobile placement and now supports action filtering, date-range filtering, reset, refresh, infinite scroll, credits/tokens summary, and tap-through transaction details using the shared `getPaginatedAiOperations` DAL.
- **Desktop Menu actions now match mobile command gaps** — The desktop Menu Command Center now includes Repair Menu and Fix Text Case, using shared logic with mobile. The desktop editor More Actions menu also exposes Generation defaults from the same menu-management context.

---

## May 21, 2026 — Answerlattice Website Widget Positioning

### Changed

- **Answerlattice public website corrected to widget-first positioning** — Homepage now includes the page-aware widget section, `/install` is the public widget setup page, and `/integrations` redirects to `/install` so buyer-facing copy does not imply enabled API or workflow-adapter packages.
- **Public API/adapters removed from package copy** — Pricing, resources, sitemap metadata, and Answerlattice website docs now keep rollout-only API/adapters out of the public website promise while preserving the underlying feature-gated code paths.
- **Answerlattice security page expanded from the trust-page pattern** — `/security` now uses facts, controls, and disclosure, with Answerlattice-specific claims: widget context, tenant-scoped data, owner-reviewed answers, rate-limited runtime endpoints, summary-backed dashboards, product separation, and safe reporting guidance.

## May 21, 2026 — Answerlattice Activation Command Center

### Added

- **Answerlattice system inventory added** — Added `__docs__/answerlattice/system-inventory/` as the codebase-first map of Answerlattice routes, features, source files, Firebase collections, scheduler behavior, rollout flags, and website-safe product claims.
- **Answerlattice activation home added** — Answerlattice client owners now land on `/answerlattice/activation`, with launch readiness, widget install status, allowed-origin status, content counts, next action routing, and knowledge-health status.
- **Activation summary API added** — `/api/answerlattice/activation/summary` reads compact store and `platformSummary` docs instead of scanning KB, changelog, tickets, or signal collections.
- **Widget runtime marker added** — Installed Answerlattice widgets now pass sanitized route/context hints during config load so owners can verify that the widget and page context are reaching Answerlattice.
- **Answerlattice three-mode dashboard added** — Answerlattice navigation now separates Launch Setup, Support Control, and Knowledge Governance, with deep links into entity review, canonical answers, trust metrics, and the signal-to-knowledge queue.
- **Draft-to-canonical publishing added** — Generated mutation proposals can now be reviewed, edited, and published as active canonical answers from the Signal Queue.
- **Answerlattice self-sellable strategy logged** — Added the non-enterprise Answerlattice positioning, pricing direction, public messaging bank, product guardrails, and execution task list in `__docs__/answerlattice/self-sellable-product-strategy.md`.
- **Answerlattice self-serve funnel implemented** — Updated public positioning, added an account-free static demo, replaced beta-only pricing with Starter/Growth/Studio INR packaging, extended onboarding with product context fields, seeded initial product surfaces, added editable Product Details, added a summary-backed Weekly Digest route, and added widget greeting configuration.
- **Answerlattice public website completed** — Tightened `/sites/answerlattice` into a coherent public website across homepage, product, demo, pricing, about, contact, get-started, privacy policy, and terms of service, with footer links kept on public Answerlattice routes.
- **Answerlattice website production SEO completed** — Added Answerlattice-owned sitemap/robots routes, FAQ and security pages, page canonical metadata, Answerlattice manifest/icons, OpenGraph image, and homepage structured data.
- **Answerlattice engine pillars restored on public website** — Homepage and Product now show Product Ontology, Canonical Answer Engine, Drift Governance, and Signal Mutation as the implemented control-plane layers, without claiming the deferred API/integration pillar.
- **Answerlattice website system map added** — Homepage now explains the implemented Launch Setup, Support Control, Knowledge Governance, and Runtime layers so public copy matches the code-backed product surface.
- **Answerlattice website product preview added** — Homepage now includes a static product preview for activation, page-aware widget context, and governance queue states so visitors can understand the product shape without account access.
- **Answerlattice website public pages expanded** — Added `/use-cases`, `/install`, `/resources`, and `/updates`, and wired them into navigation, footer, and sitemap coverage without using dashboard-reserved support routes. `/integrations` remains a redirect alias for older links.
- **Answerlattice website metadata separation tightened** — Answerlattice pages now set their own dark theme color and no longer inherit a hardcoded root web-app title from the root layout head.

### Changed

- **Onboarding routes to Activation** — Completed Answerlattice onboarding now sends owners to the Activation Command Center instead of the operations dashboard.
- **Subscription status is mirrored to the store summary** — New Answerlattice onboarding writes a compact `stores/{sId}.answerlatticeSubscription` summary, avoiding normal activation-page subscription queries.
- **Answerlattice API scope hardening** — Answerlattice management APIs now require an Answerlattice product scope instead of falling back to generic MenuList tenant/store session fields.
- **Answerlattice core and expansion flags are ready-to-use** — Ontology, canonical answers, drift, signal mutation, governance UI, instant canonical cache, capped auto knowledge, capped founder onboarding, nightly scheduler, trust metrics, graph traversal, workflow notifications, and predictive support are enabled with caps and fail-closed guards.

## May 21, 2026 — Billing Pause Option Disabled

### Changed

- **Subscription pause is disabled by default** — Added `ENABLE_SUBSCRIPTION_PAUSE: false`, hid Pause/Resume actions from desktop, mobile, and pricing subscription surfaces, and made direct pause/resume API calls return unavailable before any Razorpay or Firestore mutation.
- **Paused legacy subscriptions use support recovery** — If an old subscription is already paused, Billing now shows a support path instead of self-service resume.

## May 20, 2026 — Public Starter Menu Entry Hardening

### Changed

- **Public menu entry now follows upload-before-auth** — Owners can upload a menu and review the extracted preview before signing in; creating the public starter link still requires authentication.
- **Starter activation keeps one permanent public URL** — Claim creates the real subdomain immediately, starter expiry shows a calm holding page on the same URL, and payment restores the same URL without QR/link replacement.
- **Store summary writes now use scheduler-readable nesting** — Public starter creation and payment entitlement sync now mirror store/plan data into `platformSummary/storesSummary.stores.{storeId}` for Cloud Functions and analytics schedulers.
- **Paid location checkout handles UPI subscriptions** — If Razorpay rejects a quantity update for an active UPI-backed subscription, Locations now sends the owner to Billing to create a replacement same-plan checkout with the next paid-location quantity.

### Fixed

- **Claim conversion is transaction-safe** — Draft validation, tenant/store creation, project creation, summary sync, and draft conversion now commit atomically.
- **Razorpay webhook continuity verified** — A signed local subscription webhook activates the subscription, syncs store entitlement, updates storesSummary, and revalidates public cache.
- **Razorpay webhook replay protection added** — Signed webhook retries now claim a server-only event lock before billing mutations, preventing duplicate transaction rows and repeated subscription writes.
- **Billing mutation guardrails tightened** — Cancel, pause, resume, upgrade, verification, reconciliation, and grace-period expiry now block invalid state writes, validate request bodies consistently, and avoid master/outlet fallback when mutating the current store subscription.
- **Billing actions recover faster during rate-limit provider outages** — Upstash failures now time out quickly and open a short local bypass window instead of delaying every payment mutation.
- **Pricing page credit pack crash fixed** — Logged-in stores with lowercase subscription currency values now normalize currency before rendering or purchasing credit packs.
- **Billing history handles top-up audit rows** — Desktop and mobile Billing now use one formatter for lean Razorpay webhook summaries and legacy payload rows, so successful enhancement-pack payments appear without crashing the history view and show the configured credit count when Razorpay omits it from the webhook notes.
- **Enhancement usage dates render correctly** — Desktop and mobile Transactions now normalize Firestore timestamps before rendering and sorting, so usage rows show the real operation date instead of epoch-era fallback dates.
- **Billing failure logging uses monitored logger** — Desktop and mobile Billing mutation failures now use the approved logger instead of browser console errors.
- **Public upload source files remain stable** — Draft uploads now use Firebase download-token URLs and carry file type/size into the claimed project.
- **Plan changes preserve paid location count** — Existing subscriptions no longer fall back to `quantity: 1` when creating a new Razorpay subscription for an upgrade or paid-location checkout.

## May 19, 2026 — Multi-Location Mobile and Outlet Policy Audit

### Changed

- **Locations access now handles legacy premium stores** — Mobile and desktop Locations use the same master-location gate, so a safe one-store tenant without an old `isMaster` flag can manage locations and be repaired server-side during first outlet creation or policy save.
- **Outlet policy updates moved server-side** — Desktop and mobile policy controls now save through a protected API route with tenant access, role permission, master-store validation, legacy repair, and public cache invalidation.
- **Outlet permission enforcement tightened** — Outlet sessions load the master policy when needed and fall back to default-safe outlet restrictions instead of treating a missing hydrated policy as unrestricted access.
- **Linked outlet menu saves moved behind a server contract** — Mobile and desktop linked outlet editors now save only local `L_I_` / `L_C_` records plus allowed overrides through `/api/projects/outlet-save`, with server-side policy enforcement before Firebase writes.

### Fixed

- **Outlet mutation integrity hardened** — Outlet creation now reverts local subscription quantity on later failure and only releases creation locks it acquired; outlet deactivation updates store, tenant list, and summary atomically.
- **Store switching and rename consistency corrected** — Store IDs are normalized across switch/deactivate paths, inactive stores cannot be switched into, and outlet rename now keeps `tenants/{tenantId}.storesList` aligned with the store doc and summary.
- **Mobile Locations locale coverage completed** — All active locale packs now include the `MobileLocations` keys used by the mobile Locations screen.
- **HQ/outlet Firebase Auth claims stay aligned** — Switching between outlet and HQ refreshes Firebase custom claims for the active store before editor reads, preventing permission errors and preventing outlet-only records from appearing in the master project.

## May 19, 2026 — Owner PWA Shortcuts

### Added

- **Owner app shortcuts added** — Installed owner PWAs now expose Today, Menu, Share & QR, and Feedback shortcuts from the app icon, using existing owner routes and mobile navigation so role permissions still apply.
- **Owner app shortcut launches hardened** — Shortcut URLs now use direct owner routes instead of hash-only mobile routes, so launchers that drop URL fragments still open the intended mobile screen.
- **Owner app launch restored to Today** — Opening the installed owner PWA now starts on Today again, and older cached `/dashboard` launches map back to the Today tab on mobile.
- **Mobile profile owns account access** — The More tab user card now opens the signed-in profile, profile edit supports name, email, and phone fields, and password/passcode change moved inside that profile flow instead of staying as a top-level More action.

## May 19, 2026 — Role Permission Set Hardening

### Changed

- **Staff login details are easier to share** — One-time Staff ID/passcode popups now use a closeable mobile sheet, row-level copy icons for Staff ID and passcode, equal-width WhatsApp and Share actions, and `wa.me` sharing that targets the staff phone number when one is saved.
- **Permission set expanded to 29 production flags** — Added dedicated controls for public presence, integrations, menu sharing, menu design, feedback, and digital screens while preserving existing role fields.
- **Desktop and mobile navigation now use shared permission requirements** — Restricted pages and mobile tabs/hubs are hidden or blocked based on normalized role permissions instead of scattered local checks.
- **Protected APIs now enforce store role permissions** — Analytics, domain/subdomain, and POS sync routes now validate the current store role before serving protected owner data or mutation flows.
- **Default roles are normalized safely** — Existing default owner/manager/staff roles receive new default permissions automatically, while custom roles keep missing new permissions denied.
- **Staff access hardening completed** — Self-service password/passcode change now uses protected auth middleware, Zod validation, auth-sensitive rate limiting, and secure logging; mobile role permission switches no longer double-toggle when tapped.
- **Website now surfaces staff access control** — The homepage and Features page now explain staff accounts, roles, passcode reset, and owner sign-out as operations proof for teams without presenting it as HR or payroll software.
- **Legal and security pages now reflect staff access** — Privacy Policy, Terms of Service, and Trust & Security now cover owner-managed staff identities, role-scoped access, passcode reset metadata, and owner session revocation without claiming HR, payroll, attendance, or compliance certification.

## May 19, 2026 — Answerlattice Widget Management

### Added

- **Answerlattice widget management added** — Platform users now have `/answerlattice/widget` for widget keys, install snippets, appearance, behavior, origin allowlists, context snippets, and desktop/mobile preview.
- **Widget runtime config endpoint added** — Installed widget scripts can read saved dashboard settings through `/api/widget/config` without requiring script edits for every configuration change.

### Changed

- **Widget keys separated from public API keys** — Answerlattice widget credentials now use `answerlatticeWidgetApi` with widget scopes. Answerlattice public API routes continue to use `publicApi` and reject widget-only keys.
- **Widget key manager moved to bounded named keys** — Answerlattice widget keys now stay on the existing store document with `keyHashes` and `keysByHash`, support create/rename/copy/delete in the dashboard, and avoid new key collections or extra runtime store reads.
- **Settings now points to widget management** — `/answerlattice/settings` stays available and routes users to the dedicated widget management surface instead of duplicating widget save logic.

## May 18, 2026 — Staff and Permissions Completion

### Changed

- **Staff management moved behind server APIs** — Staff list, create, update, and remove-store flows now use authenticated `/api/staff` routes instead of direct browser writes to the server-only `users` collection.
- **Staff password setup/reset wired** — Staff receive a Staff ID alias. Staff with email also receive Firebase setup email. Owner reset creates a one-time temporary passcode from desktop/mobile staff management.
- **Phone and Staff ID login aliases wired** — Credential login now accepts email, Staff ID, or phone. Messaging-onboarded owners can claim with their WhatsApp number and passcode, and owner-triggered staff reset creates a one-time passcode.
- **Role editing moved behind server APIs** — Desktop and mobile role creation/update/deactivation now use `/api/staff/roles` with store-role permission checks.
- **Staff and role permissions enforced** — Staff lifecycle actions require `canManageUsers`; store/role assignment and role definition edits require `canAssignRoles`.

### Fixed

- **Desktop staff add/edit flow now initializes store and role mapping** — New staff starts with the current store and Staff role instead of submitting an empty store mapping.
- **Mobile staff management now has update and remove actions** — Mobile owners can add staff, change role, activate/deactivate, and remove staff from a store.
- **Last-owner protection added** — The system blocks removing, deactivating, or demoting the last active Owner mapping for a store.

## May 18, 2026 — Maintenance Scheduler Consolidation

### Changed

- **MenuList scheduled maintenance consolidated** — Messaging intake, extraction cleanup, alert escalation, chat stats aggregation, old extraction job cleanup, and messaging session cleanup now run through `menulistMaintenanceScheduler` with a static task registry and per-task Firestore leases.
- **Standalone scheduler exports retired** — `cleanupStuckMenuJobs`, `cleanupOldMenuJobs`, `msgIntakeProcessor`, `msgSessionCleanup`, `alertEscalation`, and scheduled `aggregateDailyChatStats` are no longer exported as independent scheduled functions. `backfillAggregates` remains callable for manual analytics backfills.
- **Scheduler rule persisted** — Future MenuList operational maintenance must use `menulistMaintenanceScheduler` by default; store-EOD work stays in `computeDecisionBlocksScores`; Answerlattice scheduled work stays in `functions-answerlattice/`. Standalone scheduled functions now require explicit trigger/SLA and cost justification.

## May 17, 2026 — Public Route Recovery

### Fixed

- **Public tenant pages restored after Firestore permission failures** — Public tenant route, OBP, manifest, compliance, and sitemap server reads now use Firebase Admin SDK instead of anonymous browser Firestore reads.
- **Customer app icon route uses server credentials** — Public PWA icon generation now reads store identity through Firebase Admin SDK so install icons do not rely on anonymous Firestore access.
- **Public analytics moved behind a server route** — Anonymous menu, OBP, and Customer App analytics queues now flush through `POST /api/public/analytics/track`, keeping Firestore rules strict while avoiding public browser permission errors.

## May 17, 2026 — Messaging Onboarding Monitoring

### Added

- **Messaging onboarding monitor added** — Platform admins now have `/ops/messaging-onboarding` for WhatsApp Cloud API onboarding health, webhook HMAC failures, inbound queue backlog, recent sessions, recent events, and messaging-specific alerts.
- **Messaging onboarding runbook added** — Provider credentials, safe actions, triage signals, and the no-WhatsApp-Web policy are now documented in `__docs__/messaging-onboarding/messaging-onboarding_runbook.md`.

### Changed

- **OpenWA review converted into bounded ops improvements** — MenuList kept the official WhatsApp Cloud API path and adopted only the useful monitoring, HMAC visibility, access-gate, and runbook ideas.

## May 16, 2026 — Firebase Cost Optimization

### Added

- **Firebase cost audit map added** — Cost Self-Protection now includes a platform Firebase usage map covering reads, writes, listeners, queries, public surfaces, owner flows, Cloud Functions, and retained cost risks.
- **Firebase usage scanner added** — `node scripts/verification/firebase-cost-usage-map.mjs` produces a repeatable file-level map for future cost reviews.
- **Public routing summary verifier added** — `node scripts/verification/verify-public-routing-summary-backfill.mjs` checks whether `storesSummary` and `projects_{storeId}` are complete enough before legacy OBP/sitemap fallbacks can be removed.

### Changed

- **Batch image job listener bounded** — Owner image-generation status listening now reads at most one active/result job for the selected project instead of an unbounded matching job set.
- **Digital screen liveness writes reduced** — Screen seen updates now skip the write when the summary already shows the screen was seen today.
- **Owner dashboard overview reads narrowed** — The legacy overview path now reads only the weekly AI summary it needs instead of running the full weekly dashboard read path.
- **Auth session refresh reads reduced** — Routine session checks now reuse a short 15-second sanitized user context while explicit session updates still fetch fresh account, tenant, and store block state.
- **Public analytics write volume reduced** — Public analytics batches wait longer before flushing, skip duplicate same-session item impressions, and ignore one-character search noise.
- **Help Center summary reads narrowed** — The landing-page ticket preview now uses a bounded one-time read, while an opened ticket conversation listens only to that ticket document and the full ticket inbox keeps realtime updates.
- **Sitemap outlet discovery narrowed** — Multi-outlet sitemap generation reads `storesSummary` first and only falls back to the stores collection for legacy summary data.

### Fixed

- **Batch image progress count preserved** — Status-only batch image updates no longer rewrite `generatedCount`, while actual progress updates still increment it.
- **User lookup queries bounded** — Email and phone-login user lookups now limit Firestore results to one matching document and no longer print raw lookup identifiers to the console.

## May 13, 2026 — AI Usage Accounting

### Changed

- **Billing now shows enhancement balance clearly** — Desktop and mobile Billing show total enhancements left, plan balance, pack balance, and used-this-cycle counts.
- **Enhancement activity is easier to read** — Desktop and mobile Transactions now show credits used and token counts instead of relying on internal charge values.
- **Support-search audit writes reduced** — Help Center and widget search now create AI operation records only when Gemini is actually used, avoiding extra Firestore writes for canonical and cached answers.

### Fixed

- **Review reply suggestions now use enhancement accounting** — Review reply generation checks capacity, records the AI operation, deducts one enhancement unit, and syncs the remaining balance back to the app.
- **Silent AI calls now create audit records** — Menu intake checks, public create-menu extraction, weekly analytics narratives, Help Center search/embeddings, and Answerlattice translation now write AI operation records for cost visibility without draining owner packs.

## May 12, 2026 — Billing and Enhancement Packs

### Changed

- **Mobile billing matches desktop handling** — Mobile Billing now supports store selection, inherited HQ billing context for outlets, monthly/yearly plan choices, enhancement pack purchase, and billing history from the effective subscription store.
- **Billing store context clarified** — Desktop Billing now uses the selected store context and states when an outlet is using the HQ subscription.

### Fixed

- **Enhancement pack audit trail completed** — Razorpay top-up creation now writes `topups/{orderId}` as pending, verification marks it paid, and duplicate verification no longer adds credits twice.
- **Billing mutation access hardened** — Subscription and enhancement-pack mutation APIs now require the store role to include `canManageSubscription`.
- **Top-up verification hardened** — Verified enhancement-pack orders must pass Razorpay signature verification and match the authenticated tenant and store from Razorpay order notes before credits are added.
- **AI balance consumption made transactional** — Paid AI operations now deduct plan credits first and enhancement-pack credits second inside a Firestore transaction, avoiding missed deductions during concurrent requests.
- **Billing-cycle credit reset made transactional** — Lazy monthly credit reset now re-reads and writes the subscription inside a Firestore transaction, so renewal reset cannot overwrite a concurrent AI usage deduction.
- **Campaign caption usage accounting added** — Campaign caption generation now records token/cost metadata and consumes one AI unit through the same capacity path.
- **AI operation credit basis aligned** — Cloud Functions menu-image processing now uses the same `TOKENS_PER_CREDIT = 500` accounting basis as app routes, keeping usage logs consistent across desktop, mobile-triggered, and worker-side AI flows.

## May 12, 2026 — Client Menu: Public UX Fixes

### Changed

- **Search suggestions stay data-based** — Focusing public menu search now shows compact suggestions from visible item and section names without adding an API call or owner setting.
- **Temporary status moved out of the top stack** — Public menu temporary notices now render as a centered bottom pill in the trust zone instead of competing with the business header and sticky search row.

### Fixed

- **Mobile grid odd rows fill cleanly** — In compact mobile Grid layout, a single final item spans the full row instead of leaving an empty grid cell.
- **Multi-term search returns each intent** — Searches such as `coffee chai` now keep exact phrase matching first, then show items that match either term, with items matching both terms ranked above single-term matches.
- **Menu language changes update routed content** — Changing menu language now updates the `?lang=` route through Next navigation so server-rendered menu names, item descriptions, and share metadata stay aligned.
- **Item share URLs keep language context** — Public item detail URLs preserve the selected language query so copied item links can render the right title and description preview.
- **Browser share sees open items** — Opening an item PDP from the menu now updates the client document title, canonical URL, Open Graph URL, and Twitter metadata so mobile browser share sheets do not fall back to the base menu link.
- **PWA item sharing added to PDP** — Public item details now include a quiet share action that uses native device sharing when available and copies the exact language-preserving item URL as fallback, without adding Firestore write volume.
- **Menu section and search taps hardened** — Section selection now dismisses the `Sections` navigator before scrolling, and the expanded search row forces focus into the input on the first tap.
- **PDP nutrition facts are visible** — Owner-entered nutrition facts now render in the item detail metadata badges, matching the existing schema/search support.
- **Sections button threshold tightened** — The `Sections` command appears only when a menu has three or more sections.
- **iPhone command-row stability hardened** — Public mobile menu wrappers no longer clip overflow around the command row, and mobile public output switches to a measured fixed layer once the row reaches the top to avoid iOS sticky positioning instability.
- **Expired temporary status reserves no space** — The bottom temporary-status pill renders only while the status is active, so stale expired status data stays hidden without leaving an empty footer gap.

## May 10, 2026 — Client Menu: Public Hardening Pass

### Changed

- **Main website trust copy aligned** — Homepage and feature copy now reflects the current public menu and Official Page customer proof: open status, recent updates, search/sections, photos, and clear Call / WhatsApp / Directions actions.
- **Public feedback surface aligned** — The standalone feedback submission page now uses the same temporary-status banner, public business identity header, quiet card structure, accent treatment, and shared menu footer as the customer menu.

### Fixed

- **Top-of-menu PDP close stability improved** — Item details opened from featured choices now close through the item history state without sticky-row repaint side effects, reducing the iPhone/PWA case where search and category controls stayed hidden or unclickable until the next scroll.
- **Featured PDP close no longer moves category tabs** — Closing a featured item detail no longer remounts the sticky command row or dispatches synthetic scroll events, so the horizontal category rail stays where the customer left it.
- **Sticky search row scroll jitter reduced** — The public menu sticky command row no longer uses compositor transform hints, scroll-spy category updates are frame-throttled, and mobile keeps the sticky anchor at `top: 0` with internal safe-area padding so iPhone Chrome/PWA scrolling does not pull the row down and snap it back.
- **Mobile grid layout restored** — Public mobile menus now honor the owner-selected Grid layout with a compact two-column item grid instead of forcing all handheld output into the single-column list/card stream.
- **Menu language switching keeps descriptions aligned** — Public menu language changes now keep the full enabled-language payload available, ignore stale global language restore on the public renderer, and update the `?lang=` URL state so item descriptions change with names.
- **PDP image preview supports touch zoom** — The fullscreen public image viewer now supports two-finger pinch zoom inside the viewer while the menu page itself continues to block accidental browser-level pinch zoom.
- **Public menu search made stricter** — Short-token matching now avoids broad substring, broad Indic sentence transliteration, and category-leaking synonym matches, so service menus no longer return unrelated food searches such as `chai`.
- **Public menu search false positives reduced** — One-character input no longer triggers a hard empty state, and chai-style typo recovery no longer matches unrelated `choice`, `cheese`, or generic `tea` description text.
- **Public menu numeric search restored** — Two-character numeric queries now prefix-match alphanumeric tokens, so searching `11` finds item names like `Irish coffee (available after 11am)` without matching unrelated prices such as `115`.
- **Deep-scroll search positioning fixed** — Starting a search while scrolled lower in the menu now brings the search result area back under the sticky command row instead of leaving filtered output outside the current viewport.
- **Public menu touch behavior tightened** — Client menu pages now lock mobile pinch zoom, suppress text selection on menu/category controls, and keep footer/business content selectable.
- **Logo and attribution treatment aligned** — Menu and OBP logos render without an extra wrapper border, feedback pages reuse the shared public footer/attribution treatment, and digital screens now show the same quiet `Powered by MenuList. All rights reserved` line.
- **Installed PWA language bleed fixed** — Public menu page, language, and scroll state now use store/project-scoped keys, and the menu language switcher ignores the old global language preference key.
- **Default-language descriptions preserved** — Compact multi-language menu payloads now keep the resolved initial render language description, so an English menu does not fall back to another language when no `?lang=` query is present.
- **Exact search matches rank first** — Customer search now keeps exact visible item-name matches above partial, fuzzy, metadata, and description matches while preserving menu order for ties.
- **Public footer and note alignment tightened** — Menu special notes center in the trust zone, the common Call / WhatsApp / Directions actions stay in one compact row, and menu attribution matches the compact OBP `Powered by MenuList. All rights reserved` treatment.
- **Top language control compacted** — The sticky command-row language button now shows only the language initials; full language names remain inside the picker.
- **Desktop menu polish tightened** — Featured choices now use a desktop grid instead of mobile scroller widths, and footer contact actions render as compact centered chips instead of stretching across the full card.

## May 9, 2026 — Media Image System

### Added

- **Media image profiles added** — Menu item, project, menu background, business logo, digital screen slide, cover, and gallery images now share one purpose-based profile layer for upload type, source limit, aspect ratio, output dimension, and compression budget.
- **Image preparation centralized** — Desktop and mobile item-image, project-image, background-image, logo, digital screen slide, and OBP photo upload paths now prepare images through the shared media contract before saving.
- **Prepared media identity added** — Prepared images now carry media ID, checksum, version, status, named variants, focal point, Blob output, dominant color, and transparency policy metadata.
- **Prepared media upload path added** — Profile-aware media saves now upload Blob data to immutable `media/{profile}/{tenantId}/{storeId}/...` Storage paths instead of saving through the legacy base64 upload path.
- **Photo shape options restricted by purpose** — AI menu photo shape selection now shows only menu-safe ratios instead of every social-media shape.

### Fixed

- **Logo save path hardened** — Desktop logo reset/save no longer treats an existing Firebase URL as a fresh upload, and the store DAL preserves non-base64 logo URLs defensively.
- **Logo Storage path versioned** — Changed business logos now save under an immutable media Storage path so public caches do not depend on overwriting one object.
- **Source photo upload acceptance corrected** — Owner-uploaded photos are no longer rejected for being below a profile's final target dimensions; MenuList accepts valid photos, frames them into the profile shape, and prepares the final output internally.
- **Menu background frame aligned to mobile menus** — Menu background upload and adjust previews now use a mobile-vertical frame instead of a wide banner frame.
- **Mobile OBP photo grid cleaned up** — Business photos now show as clean two-column thumbnails on mobile; replace, adjust, and remove actions open from a photo action sheet.
- **Media profile budgets enforced** — Prepared images now fail when they cannot fit the configured KB budget instead of silently saving an oversized best effort.
- **Manual adjust rotation corrected** — Rotate framing now accounts for rotated image bounds and drag direction.
- **OBP gallery cleanup added** — Replaced or removed Official Business Page gallery photos are queued and deleted from Firebase Storage after the store save succeeds.

### Documentation

- Added `__docs__/media-image-system/` with the feature spec, implementation plan, Firebase cost note, mobile support assessment, test cases, public copy, help doc, validation placeholder, and ChatGPT review.

## May 9, 2026 — Client Menu: Interaction Hardening

### Added

- **Mobile menu design preview added** — The mobile Menu Design screen now keeps a visible `Preview` action in the bottom bar and opens a full-screen customer-menu preview using the same public renderer as desktop. The sheet clearly marks the view as preview-only and uses the current unsaved draft without publishing it.

### Fixed

- **Owner previews no longer affect customer analytics or URLs** — Shared menu preview mode disables customer analytics, menu session-state writes, feedback prompts, and public URL/hash mutations while preserving the same visual renderer.
- **Public menu image data no longer crashes item details** — Item images now pass through a tolerant public-image normalizer before PDP galleries, featured cards, item cards, metadata, and quality checks read them, so legacy object-shaped image data cannot break the customer menu.
- **Installed menu PWA interaction stability improved** — PDP close no longer remounts the sticky search/sections row, item taps blur any active search input before opening details, and top-of-menu PDP scroll lock avoids fixed-body hit-test glitches on iPhone PWAs.
- **Large PDP content stays contained and scrollable** — Item details keep a capped modal/sheet height, allow touch scrolling inside the PDP, and keep the close control reachable while long descriptions, options, or metadata scroll.
- **Back-to-top no longer opens the item underneath** — The scroll-to-top control now acts only on the completed click/tap and stops press propagation, preventing mobile tap retargeting into item cards below the floating button.
- **Featured item taps no longer scroll the menu behind PDP** — Featured choices now open item details directly; the old inline scroll-and-highlight behavior remains only as a fallback when no PDP handler is available.
- **Public menu analytics no longer runs through the authenticated DAL wrapper** — Customer analytics events now enter the local analytics queue directly, avoiding per-event auth-session checks, global loader dispatches, and immediate Firestore writes before coalescing.
- **Mobile menu shell padding is tighter** — The public menu wrapper now caps shell padding by device, using 12px on mobile, 18px on tablet, and the configured design token on desktop so small screens keep more usable content width.
- **Expanded search uses the full command row width** — The sticky search row now removes the parent flex gap and collapses side controls only when those controls are hidden, so expanded search no longer leaves a right-side spacing artifact.
- **Sections popup header is compact** — The `Menu sections` header now keeps a 44px close tap target without letting the close button inflate the header height.
- **Footer freshness no longer repeats** — The bottom menu status block keeps the exact `Published · updated today at time` line and suppresses the secondary `Menu · Updated today` context line in that placement.
- **Menu special notes remain visible** — Public menus now resolve the menu-specific special note first, then legacy project fields, then the store public note fallback so owner-authored notes saved in DB do not disappear from the customer menu.
- **Search command row stays stable** — Search no longer hides `Sections` or language controls while focused, the clear button exits search mode, and sticky-row width animation was removed.
- **Sections and language popovers stay clickable** — Both controls now render above sticky/overflow containers instead of being clipped or covered.
- **Category tab jumps stay stable** — Tapping a category now keeps the selected tab locked during the intentional smooth scroll, avoids intermediate scroll-spy tab changes, and centers the horizontal tab only when needed.
- **Sticky menu controls hardened** — Search expansion is restored with a stable command-row animation, passive scroll category tracking now uses a deterministic section boundary, and the `Sections` popup closes when the page scrolls.
- **PDP close restores top navigation without rail movement** — Closing item details now releases scroll lock without synthetic scroll/resize events, avoiding category-rail movement after a featured item PDP closes.
- **Menu transient motion aligned** — `Sections`, language selection, search-result summary, no-result recovery, and PDP overlays now use the same restrained spring reveal pattern.
- **Public menu icon controls refined** — Search clear, PDP close, PDP image arrows, and back-to-top controls now use calmer theme-aware sizing, background, and color treatment.
- **Item detail is stronger on mobile** — PDP uses a mobile bottom sheet, contain-fit images, eager gallery preloading, bottom image controls, fullscreen image inspection with zoom controls, category identity when enabled, background scroll lock while open, and immediate close-state cleanup.
- **Featured and item image layout tightened** — Featured cards remain inside their own carousel, a single featured card fills the row, and items without images no longer show blank image frames.
- **Footer and navigation termination tightened** — Footer content and actions are centered, compact MenuList attribution avoids duplicate bottom spacing, back-to-top sits at the bottom-right safe-area corner, and the sticky command row keeps a covered top buffer after returning to the top.
- **OBP footer spacing aligned** — Official Business Page footer utility controls and compact MenuList attribution now render as separate cards using the same quiet terminal spacing.

### Documentation

- Updated `__docs__/client-menu/README.md`, `_impl.md`, `client-menu_mobile-support.md`, the ChatGPT UI/UX progress tracker, and `__docs__/official-business-page/official-business-page_impl.md`.

## May 8, 2026 — Client Menu: Featured Category Identity

### Changed

- **Featured cards inherit category identity** — Featured choices now show the item category icon or emoji beside the category label when category icons are enabled in the menu design. Owner-disabled category icons remain hidden.
- **Owner Featured section wording aligned** — The desktop editor, mobile Menu tab, Featured section sheet, analytics settings, and feature copy now use `Featured section`, `Featured choice`, `Quick choice`, and `Value choice` instead of the older smart-recommendation wording.

### Documentation

- Updated `__docs__/client-menu/README.md`, `_impl.md`, and the ChatGPT UI/UX progress tracker.

## May 7, 2026 — Client Menu: Retrieval Foundation

### Changed

- **Public menu search strengthened** — Customer search now handles common spelling, phonetic, accent, punctuation, and lightweight Devanagari/Gujarati transliteration cases across item names, descriptions, categories, attributes, tags, decision facts, and public prices.
- **Multilingual search payload added** — Public SSR attaches compact search terms after client sanitization so large multilingual menus remain searchable without shipping every raw non-primary description.
- **Structured public truth hardened** — Menu JSON-LD now uses active public categories/items, item identifiers/URLs, real availability, visible price rules, project `lastPublishedAt`, and `menuVersion` when present.
- **Offline fallback bounded** — Customer service worker remains network-first, adds an 8s navigation timeout, and still never serves stale cached menu content.

### Documentation

- Added `__docs__/client-menu-retrieval-foundation/` with spec, implementation, cost, mobile, help, website, marketing, and test-case docs.
- Updated `__docs__/client-menu/README.md`, `_spec.md`, `_impl.md`, and `client-menu_mobile-support.md`.

## May 7, 2026 — Client Menu: Public UI Governance Hardening

### Changed

- **Public menu category identity preserves owner choice** — Stored category icon config continues to render through the shared icon system, including owner-selected emoji values.
- **Navigation command layer tightened** — Mobile/tablet menus now keep search and `Sections` in one sticky row, replacing the disconnected category FAB with a structural sections navigator.
- **Sections navigator strengthened** — `Sections` opens a bottom-sheet-style list with localized fallback labels, active state, owner-selected icons, and item counts.
- **Search and category rail tightened** — Search focus has a clearer affordance; mobile/tablet category chips are denser, calmer, and use localization fallback labels.
- **Item card rhythm hardened** — Item titles/descriptions use stricter line governance, price typography is quieter, and image-enabled layouts reserve stable image slots with placeholders to prevent scroll jumps.
- **Theme presets restrained** — Public mood presets keep project-wise design choice but reduce decorative heading drift and improve light-theme surface containment.
- **Footer attribution quieted** — Default public attribution is now `Powered by MenuList` with no marketing CTA unless a caller explicitly opts in.

### Documentation

- Updated `__docs__/client-menu/README.md`, `_spec.md`, `_impl.md`, and `client-menu_mobile-support.md`.
- Added progress tracker at `__docs__/client-menu/_archive/client-menu_chatgpt-ui-ux-review-progress.md`.

## April 18, 2026 — Customer App Analytics: Full Surface Lifecycle Tracking

### Reversed

- **Customer App analytics scope reversed from "none on day one" to "full surface lifecycle tracking"** — The earlier decision to cut analytics was scope protection for an undecided classification. Now that Customer App is formally classified as a **surface** (alongside Digital Menu, PDF Menu, Digital Screens, Official Business Page), it receives the same lifecycle analytics every surface gets. This is not a new feature — it's alignment with existing MenuList surface doctrine.

### New

- **8 Customer App tracking events** added to `TrackingEvent` enum in `src/lib/analytics/unified.ts`:
  - Install funnel: `CUSTOMER_APP_PROMPT_SHOWN`, `CUSTOMER_APP_PROMPT_DISMISSED`, `CUSTOMER_APP_INSTALL_STARTED`, `CUSTOMER_APP_INSTALLED`
  - Usage: `CUSTOMER_APP_OPENED` (fires only in `display-mode: standalone`)
  - Shortcuts: `CUSTOMER_APP_SHORTCUT_MENU`, `CUSTOMER_APP_SHORTCUT_CALL`, `CUSTOMER_APP_SHORTCUT_DIRECTIONS`
- **Reused existing analytics collection** — Uses `projectId='customerApp'` (following the OBP precedent). No new Firestore collection, no new Cloud Function. Existing `aggregateCustomerAnalytics` nightly rollup picks up `customerApp` daily docs automatically.
- **Owner Dashboard card** — New `CustomerAppMetrics.tsx` mounted in `AnalyticsDashboard`. Shows 4 metrics only: Installed Customers, App Opens (30d), Install Conversion, Top Shortcut Used. No heatmaps. No session duration. No customer identity.
- **Per-device install dedupe** — `fireInstalledEventOnce()` uses `localStorage` to prevent reinstalls from inflating install counts. `uniqueInstallSessions` tracked separately from raw `totalInstalled`.

### Decisions (Frozen)

- **Analytics scope: 4 layers only** — Surface Availability (config read), Install Funnel (4 events), Usage (1 event), Shortcut Utility (3 events). Nothing below the surface layer.
- **Privacy: session-level only** — Uses existing `getSessionId()`. No user identity, no device fingerprinting, no heatmaps. Respects existing `storeDetails.analytics.trackMenuViews` flag.
- **One toggle governs all analytics** — When owner disables `trackMenuViews`, Customer App events suppress too. No separate Customer App analytics toggle.
- **Unique installs ≠ raw install events** — Must be tracked separately to prevent reinstall inflation.

### Cost Impact

- ~$2.97/month per 1,000 active stores (100 installs × 10 opens/month each)
- ~$29.71/month per 10,000 active stores
- Analytics events inherit existing `shouldDebounce` (1s) and `shouldRateLimit` (30/min/session) optimization

### Reviewed

- **ChatGPT review of analytics scope** — Validated MOL-style event model (8 events), 4-layer tracking doctrine, unique-vs-raw install separation, surface-analytics-not-marketing-vanity principle. Codebase verification: existing `trackEvent()` infrastructure in `src/lib/analytics/unified.ts`, OBP precedent for `projectId`-based surface routing, `aggregateCustomerAnalytics` Cloud Function already handles pattern-based doc enumeration, `useAnalyticsData` hook accepts `projectId` parameter. Zero new infrastructure needed.

### Documentation Updated

- `customer-app_spec.md` — Added Feature 9 (Surface Analytics), reversed Open Questions 1 & 2, added frozen privacy rule (Q5)
- `customer-app_impl.md` — Added event enum, switch cases, client trigger points, dashboard component path, Sequence 2b (analytics), updated Sequence 5 testing
- `customer-app_firebase.md` — Reinstated write tracking (projectId='customerApp'), updated cost estimates ($2.97/mo per 1k stores), added debounce/dedupe/standalone-only warnings
- `customer-app_helpdoc.md` — Added "Analytics: What You'll See" section with owner-facing metric explanations

---

## April 18, 2026 — Customer App: Installable Menu for Repeat Customers

### New

- **Customer App Surface** — Your customers can add your menu to their home screen as your branded app. They see your logo and restaurant name — not MenuList. One tap opens your live menu. Works on iPhone and Android without app store downloads. Includes app shortcuts: View Menu, Call Store, Get Directions. [Help doc](./customer-app/customer-app_helpdoc.md)
- **Dynamic PWA Manifest** — Each store gets a unique web app manifest generated from store data. Controls app name, icons, start URL, and shortcuts. Updates automatically when you change your branding.
- **Smart Install Prompt** — Suggests app installation to repeat customers on their 3rd visit. 30-day dismissal memory prevents nagging. Respects owner toggle settings.
- **App Icon Generation** — System automatically generates app icons from your store logo. Optional override upload for custom app icons. Generates 192x192, 512x512, and 180x180 (Apple touch) sizes with maskable variants.
- **Minimal Service Worker** — Enables install reliability on Android without caching. No offline storage, no precache, no runtime cache. Menu updates always reflect current state.

### Decisions (Frozen Day-One Policies)

- **Routing model** — Customer App manifest is served at the **tenant origin root** (`{subdomain}.menulist.ai/manifest.webmanifest` or verified custom domain), matching the existing subdomain-per-tenant architecture in `src/middleware.ts` and `src/lib/multiTenant/domainResolver.ts`. Path-based manifests rejected — they would break install scope and identity.
- **Visit persistence** — Install-prompt visit count uses `localStorage` (not `sessionStorage`) and is namespaced per store. Ensures the 3rd-visit trigger works across sessions.
- **No install analytics on day one** — No Firestore writes on install, dismiss, or app-open events. No `pwaAnalytics` collection. Install state lives only in `localStorage` for suppression logic. Privacy, cost, and complexity protection.
- **No custom shortcut icons on day one** — Shortcuts are text-only (View Menu, Call, Directions). No per-store shortcut asset pipeline.
- **No manifest screenshots on day one** — Rejected (not deferred) to keep asset pipeline minimal.
- **Display override** — `["standalone", "minimal-ui"]` only. `window-controls-overlay` removed for consistency.
- **Eligibility gate** — Customer App is only active when the store is `active: true` with a published menu. Otherwise manifest returns 404 and owner toggle is disabled.
- **Churn behavior** — When a merchant leaves the platform, installed apps show a deterministic "This business is currently unavailable." screen. No silent redirects.
- **`next-pwa` scoping** — Existing `next-pwa` configuration in `next.config.js` (which caches `/_client/*` and other tenant traffic) must be scoped away from Customer App origins. A hand-rolled minimal service worker replaces it for customer-facing tenants.
- **Plugin governance rule (frozen)** — No `next-pwa` or Workbox plugin may register runtime caching against tenant-facing URL patterns without explicit architecture review.

### Reviewed

- **ChatGPT review of documentation** — Second-pass review of the customer-app doc set. Accepted: routing correction (subdomain-based, not path), `sessionStorage` → `localStorage` fix, removal of phase/week language, removal of install analytics scope, removal of manifest screenshots and per-store shortcut icons, simplification of `display_override`, addition of explicit eligibility gate, frozen churn policy, and plugin governance rule. Codebase validation confirmed subdomain routing via `src/middleware.ts` and `src/lib/multiTenant/domainResolver.ts`, and identified an existing `next-pwa` runtime cache on `/_client/*` in `next.config.js:145-231` that directly conflicts with the no-caching philosophy — now called out explicitly in the implementation plan.

### Documentation

- **Customer App Specification** — Complete product requirements at `__docs__/customer-app/customer-app_spec.md`
- **Implementation Blueprint** — Technical implementation plan at `__docs__/customer-app/customer-app_impl.md`
- **Marketing & Sales Collateral** — Sales strategy and positioning at `__docs__/customer-app/customer-app_marketing.md`
- **Website Content** — Public website copy at `__docs__/customer-app/customer-app_website.md`
- **Help Documentation** — Customer help guide at `__docs__/customer-app/customer-app_helpdoc.md`
- **Firebase Cost Tracking** — Cost analysis at `__docs__/customer-app/customer-app_firebase.md`
- **Mobile Support Assessment** — Mobile relevance evaluation at `__docs__/customer-app/customer-app_mobile-support.md`

---

## March 22, 2026 — Production Readiness: Dev/Prod Environment Guide + Audit

### Added

- **Dev/Prod Environment Guide** — Comprehensive documentation at `__docs__/production-readiness/dev-prod-environment-guide.md` covering: Firebase project separation, third-party service audit (13 services), environment variable master list, feature flag dev/prod recommendations, incident response playbook (5 scenarios), and execution plan.
- **Environment Variable Validation** — New `src/lib/env/validateEnv.ts` utility validates all required env vars at server startup. Wired into `src/instrumentation.ts`. Warns on missing vars in dev, logs errors in prod. Catches misconfigurations early instead of cryptic runtime failures.
- **ChatGPT Conversation Validation** — 24-claim validation against codebase. ChatGPT accuracy: ~55%. Strategic framing strong (~80%), codebase awareness weak (~15%). 80%+ of suggested infrastructure already exists (MCE, MOL, SAFE_MODE, feature flags, DAL write governance, rate limiting, tenant isolation).

### Fixed

- **Hardcoded Firebase Storage URL** — `firebaseClient.ts` had `ecomsai.appspot.com` hardcoded. Now uses `firebaseConfig.storageBucket` with fallback. Enables dev/prod Firebase project separation.

### Changed

- **Owner Action Items** — Added 8 dev/prod environment separation tasks (all P0 before launch).

### Key Finding

Current system is **~85% production-ready**. Missing pieces: separate Firebase dev project, Razorpay test keys, and enabling 7 monitoring feature flags (SAFE_MODE first, then Sentry, OPS_ALERTS, HEALTH_MONITOR, LIFECYCLE_MESSAGING).

---

## March 21, 2026 — Website Time Claim Update

### Changed

- **Removed "10 minutes" fragile time claims** — All public-facing "under 10 minutes" / "10 min to go live" claims replaced with flexible "in minutes" phrasing across website. Specific time promises create trust risk when actual time varies by connection speed, menu complexity, and AI extraction. Infrastructure positioning uses directional language ("Go live in minutes"), not fragile SaaS feature claims ("10 minutes to go live").
- **Stats section** — Changed from "10 min to go live" to "3 steps to go live" (upload, customize, publish). Concrete, always achievable, no time fragility.
- **Updated across 3 locales** — en-US, hi-IN, es-ES. Affected sections: Stats, Workflow, FAQ, FinalCta.
- **Updated docs** — main-website_content.md, main-website_spec.md, main-website_marketing.md aligned with new phrasing.

### Decision

- **Threshold condition for upgrading**: Only upgrade to "Live in under 5 minutes" when WhatsApp onboarding is default entry AND P95 activation time ≤ 5 minutes. Until both conditions are met, "in minutes" is the durable positioning.

---

## March 20, 2026 — Website Marketing Review + Sticky CTA + PONR Language

### Added

- **Sticky CTA on scroll** — New `StickyCta` component on homepage. Appears after 25% scroll, auto-hides near bottom when FinalCta section is visible. Shows PONR subtitle text on desktop (≥640px), CTA button on all sizes. File: `src/components/website/shared/StickyCta.tsx` (NEW).
- **Ad script templates** — 3 concrete short-form ad formats added to marketing playbook: Reality Check (highest ROI), Embarrassment Trigger, Silent Authority. All Language Governance compliant — use "business" not "restaurant".
- **Post-publish distribution nudges** — 4-message nudge sequence concept documented in marketing playbook. Uses existing lifecycle messaging architecture. Language Governance compliant (no urgency, no "you should").
- **Activation metric** — "% of published businesses on 2+ distribution surfaces within 7 days" defined as true north activation metric. Tracked via Menu Presence Monitor.

### Changed

- **FinalCta subtitle** — Changed from "One menu. Everywhere customers look." to "This becomes your official menu link. Share it everywhere — it stays correct." PONR (Point of No Return) commitment framing — shifts perception from "created a digital menu" to "committed to one official source". Updated in both en-US and hi-IN locale files.

### Reviewed

- **ChatGPT conversation (Marketing Positioning)** — Multi-turn conversation about marketing strategy, landing page wireframes, ad scripts, distribution lock-in. ~40% accuracy. 10 claims already exist, 8 partial, 5 genuinely new, 3 rejected. Key rejections: (1) "restaurant" everywhere (violates Pattern 10 Rule 2), (2) strip features from landing page (violates Rule 6 — ChatGPT unaware of 18+ built features), (3) "distribution control layer" identity (contradicts established product identity). Archive: `__docs__/main-website/_archive/chatgpt-review-marketing-positioning.md`

---

## March 19, 2026 — Silent Correction Systems Implementation + Constitution v3.0

### Added

- **Output Control Layer** — Confidence-gated rendering for hours display across all customer-facing surfaces. When hours data is fresh (<30 days), shows full "Open Now"/"Closed" badges. When stale (>30 days), degrades to "Hours may vary". When very stale (>180 days) or structurally invalid, shows "Check with store". Feature flag: `ENABLE_OUTPUT_CONTROL` (OFF by default). Files: `src/lib/outputControl/` (4 files: types, hoursConfidence, namingStandardization, index). Zero Firebase cost — pure client-side computation.
- **Naming Standardization** — Silent normalization for item/category names. Title-cases, trims whitespace, removes trailing punctuation. Brand-safe detection skips mixed-case patterns (McChicken, iPod, eBay). Feature flag: `ENABLE_NAMING_STANDARDIZATION` (OFF by default). File: `src/lib/outputControl/namingStandardization.ts`. Zero cost.
- **Constitution doc #18: Silent Correction Doctrine** — Governance-level rules for how MenuList silently enforces truth. 6 rules, failure boundary zones, enforcement policy matrix, SMB compatibility guards. Constitution version bumped to 3.0.

### Fixed

- **MCE SUSPICIOUS_PRICE_CHANGE rule was a stub** — Now fully implemented. Compares current vs previous project prices and warns on >200% change. `oldProjectData` now passed to MCE from `updateProject()` DAL function. File: `src/lib/mce/correctnessResolver.ts:208-257`.
- **BrandOBP hours not confidence-gated** — Brand store selector page (multi-outlet) showed raw Open/Closed badges without checking staleness. Now uses output control when flag is ON. Also added `modifiedOn` to outlet data fetch. File: `src/app/_client/obp/BrandOBPContent.tsx`.
- **Fragile oldProject fetch dependency** — MCE price anomaly detection silently failed if `ENABLE_MENU_OBSERVATION` and `ENABLE_MASTER_UPDATE_AWARENESS` were both OFF, because `oldProject` wouldn't be fetched. Added `ENABLE_MCE` to the fetch condition so price anomaly detection works independently. File: `src/database/projects/index.ts:539`.

### Changed

- **OBP hours rendering** — When `ENABLE_OUTPUT_CONTROL` is ON, OBP uses confidence-gated hours display instead of always showing Open/Closed. Stale hours show cautious messaging. File: `src/app/_client/obp/OBPContent.tsx`.
- **TrustSignals hours rendering** — When `ENABLE_OUTPUT_CONTROL` is ON, client menu TrustSignals use confidence-gated hours. Stale hours show muted text. File: `src/components/atoms/TrustSignals.tsx`.
- **MCE CSRInput type** — Added `oldProjectData` field for price anomaly comparison. File: `src/lib/mce/types.ts`.

### Reviewed

- **ChatGPT conversation (Silent Correction Systems)** — ~16,000-word multi-turn conversation reviewed. ~35% accuracy. ~65% of proposals already exist (MCE, MOL, Store Truth Confidence, Hours Engine, Decision Blocks). 6 genuinely new insights extracted and implemented. Archive: `__docs__/silent-correction-systems/_archive/chatgpt-review.md`
- **ChatGPT feedback on implementation** — 10-point review of our implementation. ~70% valid. 2 actionable items implemented: (1) StoreStatusBadge inconsistency resolved — hidden when output control is ON to maintain single truth surface. (2) HoursFreshnessNudge correction trigger added — shows owner a contextual one-liner when hours are stale, completing the detection→correction loop. Staleness Check system (already built at `functions/src/analytics/stalenessCheck.ts`) was partially missed by ChatGPT. File: `src/components/templates/main-app/dashboard/OwnerDashboard/HoursFreshnessNudge.tsx` (NEW).

---

## March 19, 2026 — Feedback Settings Bug Fix + Review Generation Enhancement

### Fixed

- **CRITICAL: Feedback settings never persisted to Firestore** — `feedbackEnabled`, `feedbackDefaults`, and `reviewUrl` were managed as React state in Business Settings but never included in the save payload. Owners could configure review URL and feedback settings but changes were lost on page refresh. The entire Google review redirect pipeline was non-functional. Fixed by adding all three fields to the `addUpdateDetails` save function.

### Added

- **Google Review URL validation** — FeedbackSettingsTab now validates pasted URLs against known Google formats (Maps, review direct, g.page). Shows success/error indicators and help text explaining how to get the review link.
- **Inline feedback nudge on public menu** — Timed card that appears after 18s or 55% scroll on live menu pages. Two CTAs: "Loved it" (→ Google review if URL set, else feedback form) and "Share feedback" (→ internal feedback form). Once per session, dismissible. Feature-flagged behind `ENABLE_GUEST_FEEDBACK`.

### Reviewed

- **ChatGPT conversation (GBP identity + review generation)** — ~16,000-word conversation reviewed. ~20% new value — most suggestions already built. Archive: `__docs__/chatgpt-reviews/chatgpt-review-gbp-identity-review-generation-2026-03-19.md`

---

## March 18, 2026 — Compliance Pages + Review Reply Assist

### Added

- **Compliance Pages (Domain Activation Infrastructure)** — Auto-generated Privacy Policy, Terms & Conditions, and Refund & Cancellation Policy pages served at `/privacy`, `/terms`, and `/refund` on any MenuList-powered domain. Enables Meta/Google/Razorpay verification without building a separate website.
  - Overrides-only model: system content always generated from template, only custom overrides stored
  - Pure template substitution — zero AI, zero cost, zero drift
  - Custom override option (plain text, sanitized, max 15K chars)
  - SSR rendering for verification bot compatibility
  - Dual-entity clause (business + MenuList as platform)
  - Dashboard editing UI integrated into Custom Domain tab (3 tabs: Privacy, Terms, Refund)
  - Feature flag: `ENABLE_COMPLIANCE_PAGES` (OFF by default)
  - OBP footer links: Privacy · Terms · Refund (subtle, footer-only)
  - Cost: ~₹0.003/store/month (cached reads only)

- **Standalone Review Reply Suggest** — Paste a customer review + rating → get a professional AI-generated reply suggestion. Works without GBP API access.
  - Fixed system prompt with strict tone/structure rules
  - Industry-specific constraint modifiers (healthcare, salon, gym, hotel)
  - Forbidden phrase filter + safe fallback templates
  - Dashboard UI: ReviewReplyTool card on Owner Dashboard
  - Feature flag: `ENABLE_AI_REPLY_ASSIST` (OFF by default)
  - Rate limited: 10 suggestions/minute per user

### Changed

- **OBP Footer** — Added conditional Privacy · Terms links when `ENABLE_COMPLIANCE_PAGES` is enabled
- **Firestore Rules** — Added `compliancePages` collection with public read + authenticated write

### Improved (ChatGPT Review Applied)

- **Compliance Pages refactored to overrides-only model** — Eliminated dual source of truth. System content always generated from template (pure function). Only custom overrides stored in Firestore. Zero drift, zero migration, zero staleness detection.

---

## March 17, 2026 — Menu Trust Signals v2.0 (ChatGPT Review Applied)

### Changed (from v1.0 based on ChatGPT feedback)

- **Replaced "OFFICIAL MENU" badge with neutral offering label** — "Restaurant Menu" / "Service List" / "Product Catalog". Self-declared authority is weak; factual labels feel credible. Uses `offeringTitle` instead of `officialUpper`.
- **Switched vague freshness to exact dates** — "Updated Mar 12" instead of "Updated this week" / "Updated recently". Specific dates feel like evidence, not marketing.
- **Added location** — Shows `area, city` (e.g., "Bandra West, Mumbai") from existing store data. Anchors page to physical business.
- **Added operational status** — "Open · Closes at 11 PM" or "Closed · Opens tomorrow at 9 AM" using existing `getStoreStatus()` engine. Green/red color coding.
- **Removed checkmark SVG icon** — Icons make it feel like a badge/promotion. Factual text only.
- **Graceful degradation** — Each signal independently hidden when data is missing.
- **ChatGPT accuracy: ~40%** — 5 of 15 suggestions accepted. Rejected: rename feature flag, add share button, show canonical URL, rename to "Public Business Header System", strategic/loop commentary (already in constitution docs).

---

## March 16, 2026 — Menu Trust Signals v1.0 (Implemented)

### Added

- **Menu Trust Signals** — 4 factual trust signals on customer-facing pages: location, operational status, offering label, freshness date.
- **Pure SSR component** — Zero new Firebase reads, zero new API routes, zero client JS, zero cost.
- **Business-type-aware** — Uses `getOfferingLabels()` across all 7 business categories.
- **Feature flag:** `ENABLE_MENU_TRUST_SIGNALS` (OFF by default)
- **Files created:** `src/components/atoms/TrustSignals.tsx`
- **Files modified:** `src/app/_client/[[...slug]]/page.tsx`, `src/config/features.ts`
- **Cost:** $0.00/month

---

## March 17, 2026 — Customer Communication Kit v1.1 (ChatGPT Review Applied)

### Changed (from v1.0 based on ChatGPT review)

- **Reordered** Quick Reply to template #1 (most frequently used by SMB owners during busy service)
- **Added** "Are You Open?" template (#4) — handles "Are you open?", "What are your timings?" with closed-today and 24h awareness
- **Added** "This link always shows the latest version" reinforcement to Staff Share template
- **Improved** `getTodayHours()` now returns `TodayHoursResult` with `{ hours, isClosed }` — handles 24h businesses (`00:00-23:59`) and closed-today state
- **Templates now 6** (was 5): Quick Reply, Send Menu, Menu+Location, Are You Open?, Business Info, Staff Share
- **Closed-today handling:** Templates 3/4/5 show "We are closed today" / "Closed today" when store has no hours for current day

### ChatGPT Review Summary (~30% accuracy)

- 12 suggestions already existed in codebase (hoursEngine, StoreStatusBadge, QR code, OBP link, etc.)
- 4 accepted improvements (reorder, new template, latest version line, edge cases)
- 4 rejected (order/booking template, remove desktop WhatsApp, redundant standalone features)
- 3 deferred (contextual placement at copy-link, directions link, primary/secondary UX)

---

## March 16, 2026 — Customer Communication Kit (Implemented)

### Added

- **Customer Communication Kit** — 6 pre-generated message templates that owners copy-paste into WhatsApp, SMS, or any messaging app. Each template dynamically combines the menu link with store data (name, address, hours, phone).
- **6 Templates:** Quick Reply, Send Menu, Menu + Location, Are You Open?, Business Info, Share with Staff
- **Desktop:** Section on Use MenuList page (`/use-menulist`) between Share links and Digital Screens
- **Mobile:** Embedded in MobileShareScreen between Menu Kit and Share Actions. WhatsApp as primary action.
- **Today's Hours utility:** `getTodayHours()` derives today's open/close from store working hours with timezone awareness. Returns `TodayHoursResult` with closed-today detection and 24h business handling.
- **Business-type-aware:** Uses `getOfferingLabels()` — templates say "menu" for restaurants, "services" for salons, "catalog" for retail.
- **Feature flag:** `ENABLE_CUSTOMER_COMMUNICATION_KIT` (OFF by default)
- **Files created:** `src/lib/communication/messageTemplates.ts`, `src/components/templates/main-app/useMenuList/CommunicationKit.tsx`, `src/components/mobile/components/CommunicationKit.tsx`
- **Files modified:** `src/components/templates/main-app/useMenuList/index.tsx`, `src/components/mobile/screens/MobileShareScreen.tsx`, `src/config/features.ts`
- **Cost:** $0.00/month. Zero new collections, zero new API routes. Pure client-side string generation.

---

## March 16, 2026 — Menu Quality Signals v1.1 (Implemented + ChatGPT Review)

### Added

- **Menu Quality Signals** — 5 quality signals (descriptions, images, prices, hidden items, price outliers) across 3 surfaces (dashboard, editor banner, publish intercept). Each signal has contextual help text and connects to the existing AI feature that fixes it.
- **3 Surfaces:** Dashboard panel (awareness), Editor banner (action context, closable), Publish intercept (soft modal, never blocks publishing).
- **5 Signals:** Missing descriptions, missing images, missing prices, hidden items, price outliers (median-based detection within categories).
- **Signal capping:** Max 4 warning signals visible on dashboard. Editor/publish use higher thresholds (desc≥3, img≥3, price≥1, outlier≥1).
- **Feature flag:** `ENABLE_MENU_QUALITY_SIGNALS` (OFF by default)
- **Files created:** `qualitySignals.ts`, `MenuQualitySignals.tsx` (desktop), `MenuQualitySignals.tsx` (mobile), `EditorQualityBanner.tsx`
- **Files modified:** `OwnerDashboard/index.tsx`, `Editor.tsx` (banner + publish intercept), `MobileMenuScreen.tsx`
- **Cost:** ~$0.00/month. Zero new collections, zero new API routes.

### Changed (from v1.0 based on ChatGPT review)

- **Replaced** "Large Categories" signal (too subjective, false positives) with "Hidden Items" signal (objective, operational awareness)
- **Added** "Price Outliers" signal — catches OCR errors and typos using median-based detection within categories
- **Added** contextual `helpText` to all signals (e.g., "Customers understand offerings better with details")
- **Added** Editor Banner surface — shows when actionable signals exist during editing
- **Added** Publish Intercept surface — soft suggestion before publishing, never blocks
- **Added** `getVisibleSignals()` helper — caps dashboard warnings at 4
- **Added** `getActionableSignals()` helper — threshold filter for editor/publish surfaces

---

## March 15, 2026 — Owner Feature Documentation (ChatGPT Session Review)

### Documentation Created

- **Menu Presence Monitor** (`__docs__/menu-presence-monitor/`) — 7 docs. Simple status checklist showing where the menu is deployed across 6 key surfaces (Google Business, Instagram, WhatsApp, QR, Screens, Feedback). Manual confirmation + auto-detection. Zero Firebase cost.
- **Menu Quality Signals** (`__docs__/menu-quality-signals/`) — 7 docs. Owner-facing quality nudge panel surfacing description/image/price gaps with one-tap connection to existing AI generators. Reads MCE data. Zero Firebase cost.
- **Customer Communication Kit** (`__docs__/customer-communication-kit/`) — 7 docs. Pre-generated message templates (5 types) for WhatsApp/SMS with dynamic store data (address, hours, menu link). Mobile-first feature. Zero Firebase cost.
- **Menu Trust Signals** (`__docs__/menu-trust-signals/`) — 7 docs. Customer-facing trust indicators on public menu: "Official Menu" badge, "Updated recently" freshness text. Business-type aware. Zero Firebase cost.
- **ChatGPT Review** archived at `__docs__/archive/chatgpt-review-owner-features-session.md` — 30 concepts analyzed, 17 already exist, 4 new features documented, 11 strategic-only (already in constitution).

---

## March 15, 2026 — Use MenuList: Output Center

### Added

- **Use MenuList page** (`/use-menulist`) — Unified output hub where owners get every usable output from MenuList in one place. Links to share, screen URLs to display, and print-ready assets to download.
- **Quick Actions** — Copy Menu Link, Open Menu, Copy Screen Link, Download Menu Kit — all one-tap from the top of the page.
- **Share section** — Official Page link + Direct Menu link with copy/open buttons and sharing guide.
- **Screens section** — Menu Board + Highlights screen links with copy/open and setup tip.
- **Print section** — Individual asset downloads (Table Tent, Counter Sticker, Entrance Poster, Feedback QR, Menu PDF) + Complete Menu Kit ZIP.
- **Resources section** — Setup Guide, Printing Guide, Sharing Guide as contextual modals.
- **Google Business hint** — Inline instruction for adding menu link to Google Maps.
- **Feature flag** `ENABLE_USE_MENULIST` — Controls page visibility in navigation.
- **Navigation entry** — "Use MenuList" added to sidebar between Users and QR Code.

### Documentation

- **8 docs** created in `__docs__/use-menulist/` (README, spec, impl, firebase, marketing, website, helpdoc, mobile-support)
- **ChatGPT review** archived with accuracy assessment (~70%, most suggestions already built)

### Architecture

- Pure UI aggregation layer — zero new backend logic, zero new collections, $0.00 Firebase cost
- Reuses existing: Menu Kit generator, Screen URL builder, OBP URL generator, Feedback QR generator, Menu PDF generator

---

## March 15, 2026 — Menu Kit: Delivery Bag + Takeaway Card Surfaces

### Added

- **Delivery Bag Sticker (6×6 cm)** — New Menu Kit surface for delivery bags/boxes. 60mm square PNG at 300dpi. "VIEW MENU" + QR + store name + short link. Creates off-site discovery — customers scan to view/reorder from home.
- **Takeaway Card (85×55 mm)** — Business-card-sized insert for takeaway orders. Landscape PNG at 300dpi. QR left, store name + "SAVE OUR MENU" right. Customers keep the card for later scanning.
- **UTM tracking** for both new surfaces (`delivery_bag`, `takeaway_card`) — scan attribution flows into existing Unified Analytics.
- **Print instructions** updated with specs for both new surfaces (vinyl sticker 6×6cm, 250-300 GSM card 85×55mm).
- **Placement Guide** updated with delivery bag placement checklist item.

### Changed

- **Menu Kit asset count** — 8 → 10 assets (+ delivery bag sticker, + takeaway card). ZIP bundle includes all 10 + print instructions.
- **Asset indices** fixed across MenuKitSection (desktop) and MobileShareScreen (mobile) for Instagram (5), WhatsApp (6), Google Maps (7).

### Documentation

- **Menu Kit spec** — Added §4 (Delivery Bag) and §5 (Takeaway Card), renumbered §6-10, updated UTM table.
- **Menu Kit helpdoc** — Added file list entries, usage instructions, placement guide items.
- **Menu Kit README** — Updated asset list (10 items), removed takeaway from rejected list, marked delivery bag as DONE in enhancements.

---

## March 15, 2026 — Deep Architecture Review (Physical Surfaces / Menu Kit / Scan Network)

### Documentation

- **ChatGPT deep architecture review** — 159-point analysis across physical surfaces, Menu Kit validation, scan network strategy, edge delivery, customer menu UX, growth loops, moats, competitive analysis, failure modes, and 10-year evolution. 72% accuracy, 70% already implemented, 20% valid new insights, 10% premature/rejected.
- **Menu Kit README updated** — Added validated growth loop priority (3 active NOW, 2 future), moat building priority (4 layers), core physical surface rule, and 2 new P2-P3 future enhancements (delivery bag QR, surface registry).
- **Digital-screens archive updated** — `_archive/digital-screens_chatgpt-review-v4.md` added (comprehensive single review doc per single-document rule).

### Key Validated Insights

- **Core Rule:** "If something is printed, it must remain correct for years. Campaign logic cannot guarantee that. Identity infrastructure can."
- **Growth Loops:** Scan distribution, menu sharing, and restaurant identity loops are active NOW via Menu Kit + Share Modal + OBP.
- **Moats:** Distribution (Menu Kit), canonical database (MCE + extraction), identity layer (OBP), workflow integration (edit-publish habit).
- **All 5 "features QR platforms eventually add"** already built: item availability, daily specials, basic analytics, menu sharing, PDF download.
- **7 catastrophic failure modes** all protected against by existing architecture (ISR caching, MCE, constitution, Menu Kit, MOL).

---

## March 15, 2026 — CMI Strategic Repositioning (Two-Layer Architecture)

### Changed

- **CMI repositioned as two-layer architecture** — Following ChatGPT strategic review validated against Product Evolution Doctrine (constitution #11), CMI is now: **Observation Layer** (MenuList — active) + **Optimization Layer** (GrowthOS — deferred). Autonomous actions (AUTO_HIDE, AUTO_PROMOTE, AUTO_DEMOTE, etc.) remain in code (feature-flagged) but are architecturally classified as GrowthOS territory. MenuList observes; GrowthOS optimizes.
- **CMI language reframed** — All docs updated from "optimization" language to "observation" language. "Automatically adjusts" → "quietly understands." "Promotes winners" → "learns which items attract attention." Aligns with Language Governance doctrine.
- **CMI website positioning** — Repositioned from headline feature to subtle mention in product section. "Observe" not "optimize."
- **viewsByItem correction** — Original spec incorrectly stated per-item views don't exist. `viewsByItem` has been tracked since implementation (`unified.ts:299`). Updated spec to reflect this.

### Documentation

- **8 CMI docs updated** — spec, impl, README, marketing, website, helpdoc, firebase all repositioned
- **ChatGPT review archived** — `__docs__/continuous-menu-intelligence/_archive/chatgpt-review-strategic-repositioning.md` — 32-point analysis, ~65% accuracy
- **Future improvements documented** — Multi-signal scoring, data sufficiency calibration, exposure-based fatigue, client session buffering, item consideration (dwell) signal, schema versioning — all documented in impl doc as future enhancements

---

## March 14, 2026 — Menu Kit Enhancements + Physical Surfaces ChatGPT Review

### Added

- **Dual-orientation table tent** — A5 PDF with content on both halves (one rotated 180°). Owner prints, folds in half → tent card readable from both sides of table. Canvas-based rendering at 300 DPI for reliable rotation.
- **Logo rendering on print assets** — Store logo now appears on table tent (above store name), entrance poster (above store name), counter sticker (between QR and name), Instagram story, and WhatsApp status. Logo pre-loaded once and shared across all templates.
- **URL protocol validation** — `validateMenuUrl()` checks that QR-encoded URLs use http:// or https:// before generation. Prevents malicious protocol injection.
- **i18n infrastructure for surfaces** — `surfaceI18n.ts` with translated surface strings for Hindi (primary non-English market). `locale` field added to `MenuKitInput`. Canvas-based templates support non-Latin scripts via system fonts. PDF templates fall back to English (Helvetica font limitation).
- **QR safety section in helpdoc** — Warns owners about QR tampering (overlay attacks) and how to verify QR authenticity.
- **Image loader utility** — `imageLoader.ts` loads logos from URLs with CORS support, 5-second timeout, and graceful fallback. Pre-loads once in generator, shared across all 7 templates.

### Documentation

- **Physical Surfaces marked LEGACY** — Campaign-based recommendation surfaces (`src/lib/physical-surfaces/`) superseded by Menu Kit for identity infrastructure surfaces.
- **ChatGPT review archived** — 68-point analysis across 12 threads. 85% accuracy. 79% already implemented in Menu Kit.
- **Canonical QR resolver skipped** — Existing `previousSlugs` redirect chain handles slug changes. Adding a redirect hop would slow every scan. Not needed now.

---

## March 13, 2026 (Session 18 — AI Key Rotation + Gateway)

### Added

- **AI Key Rotation** — Multi-key pool (1-4 Gemini API keys) with automatic failover on 429 rate limit errors. Keys auto-discovered from env vars (`GEMINI_AI_KEY`, `_2`, `_3`, `_4`). Exponential cooldown per key (60s→120s→5min cap).
- **AI Gateway** — Transparent proxy wrapping all Gemini API calls with key rotation + exponential backoff retry. Same interface as `GoogleGenAI` — zero changes to 19 call sites across frontend and Cloud Functions.

### Architecture

- **Frontend:** `src/lib/google/genAi/keyManager.ts` + `aiGateway.ts` + updated `index.ts`
- **Cloud Functions:** `functions/src/ai/keyManager.ts` + `aiGateway.ts` + updated `genAiClient.ts`
- **Secrets:** `functions/src/config/secrets.ts` — Added `GEMINI_AI_KEY_2`, `_3`, `_4` to SECRETS and SECRET_GROUPS

### Behavior

- On 429 (rate limit) + multiple keys → rotate key, retry immediately
- On 429 (rate limit) + single key → exponential backoff + retry
- On 5xx (server error) → exponential backoff + retry (6 max attempts)
- On 4xx (client error, non-429) → fail immediately

### Scope

All 17 AI call sites covered: 11 frontend API routes + 6 Cloud Function files. No call-site modifications needed — gateway is a drop-in replacement for the raw `GoogleGenAI` client.

### Bugs Found & Fixed (Production Audit)

- **CRITICAL: `decisionBlocksScoring.ts` missing AI secrets** — Nightly scheduler runs AI features (kbQuality, weeklyNarrative, feedbackAnalysis) but only declared Razorpay secrets. Without GEMINI_AI_KEY, all nightly AI calls would fail silently. Fixed: added all 4 AI key secrets to both `computeDecisionBlocksScores` (scheduled) and `triggerDecisionBlocksScoring` (manual).
- **CRITICAL: `masterScheduler.ts` missing AI secrets** — Both `triggerSchedulerManually` and `triggerWeeklyNarrativeManually` callable functions had zero secrets declared despite calling AI services. Fixed: added all 4 AI key secrets to both functions.
- **CRITICAL: `assetIntelligence.ts` raw HTTP fetch bypassing gateway** — Messaging onboarding's asset validation made a direct `fetch()` to `generativelanguage.googleapis.com` with a hardcoded API key, completely bypassing the AI Gateway. No key rotation, no retry, no circuit breaker. Fixed: replaced with `genAIClient.models.generateContent()` via gateway. Also upgraded model from `gemini-2.0-flash` to `gemini-2.5-flash`.
- **Doc count mismatch** — README and impl.md incorrectly stated "19 call sites". Actual count: 17 files (11 frontend + 6 CF). Fixed.

---

## March 13, 2026 (Session 17 — AI Extraction Hardening Implementation)

### Added

- **Extraction artifact storage** — Raw AI response text preserved in job `result.rawBatchResponses[]` (truncated to 10KB per batch). Enables debugging and future reprocessing. Zero additional Firestore cost.
- **Prompt version tracking** — `EXTRACTION_PROMPT_VERSION` constant. Stored in job `result.promptVersion` + `result.model` for debugging quality regressions.
- **Extraction hardening pipeline** — New `extractionHardening.ts` (549 lines) with category synonym normalization (~30 pairs), semantic integrity validation, and anomaly detection. Runs after AI extraction, before project write. Non-blocking.
- **Extraction monitoring dashboard** — Internal-only at `/ops/extraction`. Health overview, quality metrics, job feed table. Feature flag: `ENABLE_EXTRACTION_MONITORING_DASHBOARD` (OFF). Route: `/ops/extraction`.

### Improved

- **Gemini SDK standardization** — Migrated 4 Cloud Function files from legacy `@google/generative-ai` to `@google/genai`. All now use shared `genAIClient` + `AI_MODEL` (`gemini-2.5-flash`). Files: `feedbackAnalysis.ts`, `weeklyNarrative.ts`, `kbQuality.ts`, `ownerDashboardSummary.ts`.
- **AI Data Extraction docs** — Updated `_impl.md` with hardening section, `_firebase.md` with provenance fields. All doc statuses refreshed.

### Key Files

- **New:** `functions/src/logic/extractionHardening.ts`, `src/lib/ops/extractionTypes.ts`, `src/database/ops/extraction.ts`, `src/app/(main)/ops/extraction/page.tsx`, `src/components/templates/main-app/platform/extractionMonitor/index.tsx`
- **Modified:** `functions/src/constants/ai.ts`, `functions/src/types/menuExtraction.types.ts`, `functions/src/types/menuProcessingJob.types.ts`, `functions/src/logic/processMenuImages.ts`, `functions/src/logic/processMenuImagesJob.ts`, `src/config/features.ts`, + 4 Gemini service files

---

## March 12, 2026 (Session 16 — AI Extraction Pipeline Review & Documentation)

### Added

- **AI System Layer documentation** — Full doc set (`__docs__/ai-system-layer/`) for centralized AI infrastructure: gateway, rate limiting, key management, cost tracking across all Gemini features.
- **AI Extraction Monitoring Dashboard documentation** — Full doc set (`__docs__/ai-extraction-monitoring/`) for internal extraction pipeline health monitoring: job feed, quality metrics, cost monitor, retry control.
- **ChatGPT extraction review** — Validated 46 claims from ChatGPT session against actual codebase. ~55% accuracy. 9 claims were already implemented. Archived at `__docs__/projects/ai-data-extraction/_archive/chatgpt-review-extraction-hardening-2026-03.md`.

### Improved

- **AI Data Extraction README** — Updated to reflect actual codebase architecture: correct file paths, batch processing, parallel upload, circuit breaker, confidence scoring, re-extraction workflow, all 7 job statuses documented.

### Key Decisions

- **AI Gateway (Phase 1)** — Centralize all Cloud Function Gemini calls through single gateway. Frontend routes already have Upstash protection — not included in Phase 1.
- **SDK standardization needed** — Two Gemini SDKs in codebase (`@google/genai` vs `@google/generative-ai`). Target: single SDK (`@google/genai`).
- **Rejected:** Menu AST (premature), Knowledge Graph (needs 10k+ menus), AI Key Pool (Phase 2), Task Queue for all features (extraction already has one), Worker Pools (over-engineering).
- **Validated gaps:** Extraction artifact storage, prompt version tracking, category synonym normalization, semantic integrity validation, anomaly detection.

---

## March 11, 2026 (Session 15 — Website SEO Infrastructure)

### Added

- **Per-page SEO metadata** — Converted 13 website page.tsx files from `'use client'` client components to server components with unique `export const metadata` (title, description, canonical URL, OpenGraph). Previously all pages shared the same generic layout metadata.
- **Canonical URLs** — Self-referencing `alternates.canonical` on all 13 public pages.
- **Preview page noindex** — `/create-menu/preview/[draftId]` marked with `robots: { index: false }` to prevent indexing of dynamic preview pages.

### Fixed

- **Sitemap.xml** — Added 8 missing pages (features, how-it-works, pricing, multi-location, get-started, create-menu, trust-security). Removed nonexistent /blog entries. Fixed stale URLs (/privacy → /privacy-policy, /terms → /terms-of-service). Updated all dates.

### Key Decisions

- **ChatGPT website conversation reviewed** — ~80% of suggestions already existed in codebase (homepage sections, schema markup, FAQ schema, analytics, robots.txt, trust signals, interactive demos). Only 2 real gaps found: per-page metadata and stale sitemap.
- **Rejected:** Blog engine, programmatic SEO pages, free tools, interactive demos, PostHog, exit intent popups, sticky CTA, city/cuisine pages, menu templates, newsletter capture — all either premature, against doctrine, or not aligned with infrastructure identity.
- **Deferred:** Blog/content engine (need content strategy), customer testimonials (need real customers), conversion event tracking (GA + Clarity sufficient for now).

---

## March 11, 2026 (Session 14 — Digital Catalog Responsive Enhancement)

### Added

- **Desktop layout** — Left sidebar category navigation (sticky, 220px) + 2-3 column item grid (max-width 1200px) for screens ≥1024px. Categories highlight on scroll.
- **Tablet layout** — Horizontal sticky category tabs (always visible) + 2-column item grid (max-width 960px) for screens 768-1024px.
- **Desktop hover states** — Subtle card elevation (`hover:shadow-md hover:-translate-y-px`) on menu item cards for mouse interaction.
- **Desktop sidebar hover** — Category items show light background on hover with smooth transition.
- **Item URL slugs** — Menu item URLs changed from `/menu/item/{itemId}` to `/menu/item/{slug}-{shortId}` (e.g., `/menu/item/butter-chicken-abc123`). Human-readable, shareable, AI-crawlable. Backward compatible with old ID-based URLs.
- **ChatGPT review archive** — Full review of 18,288-line digital catalog UX conversation. ~75% of suggestions already existed in codebase. `__docs__/client-menu/_archive/chatgpt-review-digital-catalog.md`

### Changed

- **Content container** — Responsive max-width: 1200px (desktop), 960px (tablet), 768px (mobile). Previously capped at 768px for all devices.
- **DeviceFrame** — Live site (`fromPage !== 'b2c'`) no longer constrains tablet/desktop width. Editor preview retains simulated device widths.
- **Category FAB** — Hidden on desktop (sidebar replaces it). Still shows on mobile when category tabs scroll out of view.
- **Image sizes hint** — Desktop item images use `sizes="300px"` for better responsive loading.

### Key Decisions

- **No side detail panel** — Modal PDP works fine on desktop. Side panel is delivery-app UX, not QR-menu UX.
- **No collapsing header** — Header is already minimal (~48px). Animation adds complexity without measurable gain.
- **No auto-hide navigation** — Sticky nav is stable and predictable. Auto-hide adds scroll jank risk.
- **No item URL slug change** — Current `/menu/item/{itemId}` pattern works for deep linking. Slug-based URLs deferred to avoid breaking changes.
- **No entity IDs / MEG / MRS** — Future infrastructure, not current product need. Deferred per 3-year freeze rule.

### Improved (Master Execution Prompt)

- **Law 14: Customer-Facing Responsive Layout** — New rule: every customer-facing page must render on mobile/tablet/desktop with device-appropriate layout (sidebar, grid columns, hover states). DeviceFrame must not constrain live site.
- **Entity Addressability Rule** — Public items must have human-readable URLs. Infrastructure test: "Does this make entities addressable web resources?"
- **Anti-Toggle Rule** — Don't add settings for behavior already controlled by existing choices. Less knobs = better product for SMB owners.
- **ChatGPT Infrastructure Test** — Step 7 added to Pattern 2: evaluate each suggestion for infrastructure-grade vs UX-polish priority.
- **Critical Patterns** — Added responsive breakpoints and slugify utility to Step 10 reference.

---

## March 10, 2026 (Session 13 — Free Tools Strategy Review + Public Menu Entry Documentation)

### Added

- **Free Tools Strategy Review** — Full ChatGPT conversation review with independent web research validation. Strategic direction validated: build entry pipelines that produce MenuList pages, not random tools. ~70% ChatGPT accuracy. Docs: `__docs__/free-tools-strategy/`
- **Public Menu Entry Documentation** — Full 7-doc set for `/create-menu` feature: public menu upload → AI extraction → preview → signup → publish. No-auth entry pipeline that reuses existing Gemini extraction infrastructure. Feature flag: `ENABLE_PUBLIC_MENU_ENTRY` (OFF). Docs: `__docs__/public-menu-entry/`

### Key Decisions

- **One pipeline at a time** — Build and validate `/create-menu` before expanding to QR generator or other entry points
- **Image-only v1** — No PDF upload in first version (reduces complexity)
- **No editor on preview** — Preview is read-only; editing available after publish in dashboard
- **24-hour draft TTL** — Unclaimed drafts auto-deleted via nightly scheduler
- **Rate limit: 3/IP/day** — Caps Gemini API cost for anonymous users
- **Business Presence Checker REJECTED** — Fails Feature Rejection Gate (1/5)

---

## March 10, 2026 (Session 12 — Answerlattice Knowledge Graph Exploitation: Full Implementation)

### Added

- **Knowledge Graph Exploitation (Expansion Item #11)** — Upgrades Answerlattice retrieval from single-entity FAQ lookup to multi-entity product reasoning. 1-hop graph traversal expands matched entities via existing `answerlattice_entityRelations`, scores answers by multi-entity coverage, detects cross-feature interactions via deterministic rules, and suggests related entities post-answer. Feature flag: `ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH` (OFF).
- New: `src/lib/answerlattice/graphTraversal.ts` — Core graph exploitation pipeline (~250 lines). Graph expansion, interaction detection, related suggestions. All in-memory on precomputed index.
- Enhanced: `src/lib/answerlattice/canonicalRetrieval.ts` — Graph expansion injected after entity matching. `scoreBySpecificity()` gains multi-entity coverage boost (+15 per overlapping entity). Post-answer related suggestions rebuild.
- Enhanced: `src/lib/search/searchCore.ts` — `graphExpansion` wired through `CoreSearchResult`. `GRAPH_EXPANSION_HIT` performance logging. Entity-enriched RAG (Stage 6) uses expanded entities for richer fallback context.
- Enhanced: `src/lib/search/types.ts` — `graphExpansion` field on `CoreSearchResult`.
- Enhanced: `src/types/answerlattice/index.ts` — 6 additive types: `AnswerlatticeInteractionRule`, `AnswerlatticeEntityGraphNode`, `AnswerlatticeEntityGraphIndex`, `AnswerlatticeGraphExpansionResult`, `AnswerlatticeInteractionType`, `ANSWERLATTICE_INTERACTION_TYPES`.
- Enhanced: `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` — Step 15: `rebuildEntityGraphIndex()` (~150 lines). Nightly precomputation of entity graph from relations. Bidirectional expansion. Orphan relation detection. Preserves manually-authored interaction rules across rebuilds.

### Documentation

- Full doc set: `__docs__/answerlattice/knowledge-graph-exploitation/` (8 docs + 1 archive)
- ChatGPT conversation review: System #11 of ICP Coverage Index (5 capability blocks: 58-62). ~70% accuracy. 3 proposed new collections → 0 needed.
- 7 ADRs documented. 6-area parity audit PASS. E2E simulation (5 happy, 3 error, 5 edge cases) PASS. Expansion tracker Item #11 updated to IMPLEMENTED.

### Key Decisions (Cascade)

- **1-hop traversal only** (maxDepth=1) — Industry consensus (Microsoft GraphRAG, Neo4j, Elastic). Hard-coded, non-configurable.
- **Precomputed graph index** — Single `platformSummary` doc per tenant. 1 Firestore read per query vs N live lookups.
- **Zero new Firestore collections** — All in existing `platformSummary` pattern.
- **Deterministic interaction rules** — Human-authored, never LLM-generated. Answerlattice doctrine compliance.
- **Only expand to entities with answers** — `answerCount > 0` filter prevents dead-end expansion.
- **`interactionRules.ts` folded into `graphTraversal.ts`** — Simpler than originally planned. Interaction rules loaded from same graph index doc.
- **Cost: +1 Firestore read/query** (~$0.011/month at 10K queries)

### Fixed (Post-Implementation Audit)

- **Missing API route wiring** — `search-kb/route.ts` and `widget/search/route.ts` were not passing `graphExpansion` data to API responses. Fixed: Help Center gets full expansion data; Widget gets compact version (interaction + suggestions only).
- **RAG enrichment using narrow entity set** — Stage 6 (Entity-enriched RAG) was using only `matchedEntityIds` when graph expansion could provide richer context. Fixed: uses `graphExpansion.expandedEntities` when available, falls back to `matchedEntityIds`.

### Technical

- 1 new file + 10 modified files total (7 in initial implementation + 3 in post-impl audit)
- Feature flags: `ENABLE_ANSWERLATTICE_KNOWLEDGE_GRAPH` in `src/config/features.ts` + `functions-answerlattice/src/constants/features.ts` (both OFF)
- Zero new Firestore collections, zero new indexes
- `tsc --noEmit`: 0 errors

---

## March 9, 2026 (Session 11 — Answerlattice Ticket → Knowledge Loop: Full Implementation)

### Added

- **Ticket → Knowledge Loop (Expansion Item #9)** — Converts resolved support ticket conversations into canonical knowledge via accumulation architecture (Intercom-validated). Nightly Step 14 extracts knowledge candidates from resolved ticket clusters (3+ per entity), generates AI draft canonical answers, routes to founder approval queue. Feature flag: `ENABLE_ANSWERLATTICE_TICKET_KNOWLEDGE` (OFF).
- New CF: `functions-answerlattice/src/answerlattice/resolutionExtractor.ts` — Core extraction pipeline (~310 lines). 3-stage deduplication, accumulation threshold, Gemini extraction, audit logging.
- New CF: `functions-answerlattice/src/answerlattice/ticketKnowledgePrompt.ts` — Gemini prompt + response parser for ticket resolution extraction (~160 lines).
- Enhanced: `src/lib/answerlattice/signalEmitter.ts` — New `emitTicketResolutionSignal()` captures last 5 non-system messages as resolution context on ticket resolve.
- Enhanced: `src/types/answerlattice/index.ts` — 4 additive fields on `suggestedChange` (sourceTicketIds, sourceTicketCount, resolutionContext, extractionConfidence) + `ticket_resolution` draftSource value.
- Enhanced: `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` — Step 14 + 4 result tracking fields.

### Documentation

- Full doc set: `__docs__/answerlattice/ticket-knowledge-loop/` (8 docs + 1 archive)
- ChatGPT conversation review: System #9 of ICP Coverage Index. ~55% accuracy. 9+ proposed collections → 0 needed.
- 5 ADRs documented. 10-area parity audit PASS. Expansion tracker Item #9 updated to IMPLEMENTED.

### Key Decisions (Cascade)

- **Accumulation architecture** — Only extract when 3+ tickets cluster around same entity (Intercom proved 2x approval rate vs per-ticket extraction)
- **Zero new collections** — Reuse `answerlattice_mutationProposals` with `draftSource: 'ticket_resolution'`
- **Nightly batch IS the queue** — Step 14 in existing batch. No separate processing queue needed.
- **Entity-based clustering** — No external vector DB. Existing signal mutation engine's entity clustering is sufficient.
- **Read-only ticket access** — Feature never modifies ticket documents. Resolution captured at signal emission time.
- **Cost: ~$0.12/tenant/month** — Dominated by LLM calls (5-draft-per-run cap)

### Fixed (Deep Audit)

- **Missing UI wiring** — `emitTicketResolutionSignal()` was defined in `signalEmitter.ts` but never called from ticket UI. Wired into `TicketDetailView.tsx:handleTicketUpdate()` — fires on status change to Resolved or Closed. Dynamic import (fire-and-forget), covers both platform admin and client owner paths.

### Technical

- `tsc --noEmit` = 0 errors (both frontend + functions-answerlattice)
- 2 new files + 5 modified files (TicketDetailView.tsx added during deep audit)
- Zero new Firestore collections, zero new indexes

---

## March 9, 2026 (Session 10 — Answerlattice Founder Onboarding: Full Pipeline)

### Added

- **Founder Onboarding Bootstrap Engine** — Automatically bootstraps the Answerlattice canonical layer after KB articles are published. Batch entity extraction, auto-promote high-confidence entities (≥0.7 conf + ≥2 article refs), generate canonical answer drafts per promoted entity. Feature flag: `ENABLE_ANSWERLATTICE_FOUNDER_ONBOARDING`.
- New CF: `functions-answerlattice/src/answerlattice/onboardingBootstrap.ts` — Core bootstrap engine (~500 lines). Uses `firestoreAdmin` directly (admin SDK pattern, same as `draftGenerator.ts`).
- New config: `src/config/onboardingBootstrapConfig.ts` — Thresholds, limits, constants.
- Nightly Step 12 in `answerlatticeNightly.ts` — Separate discovery loop (queries `kb_generation_jobs`, not `answerlattice_entities`) so new tenants with zero entities get bootstrapped.

### Documentation

- Full doc set: `__docs__/answerlattice/founder-onboarding/` (8 docs + 1 archive)
- ChatGPT conversation review: System #6 of ICP Coverage Index. ~55% accuracy. 9 proposed collections → 0 needed.
- Deep audit found 3 critical issues: CF/DAL incompatibility, tenant discovery gap, missing DB constants. All fixed.
- Expansion tracker Item #6 updated to COMPLETE.

### Key Decisions (Cascade)

- **Zero new collections** — all data in existing `answerlattice_entityCandidates`, `answerlattice_mutationProposals`, `answerlattice_entities`, `answerlattice_auditLogs`, `kb_generation_jobs`
- **Separate discovery loop** — `discoverBootstrapCandidates()` queries `kb_generation_jobs` because `discoverActiveTenants()` queries `answerlattice_entities` (empty for new tenants)
- **CF uses firestoreAdmin directly** — Cannot import client-side DAL functions (different SDK). Mirrors DAL logic using admin SDK, same as `draftGenerator.ts`.
- **Auto-promote with guardrails** — ≥0.7 confidence + ≥2 article refs. Audit-logged. Doctrine-compliant.
- **Drafts ≠ Active** — `pending_review` proposals, never served as canonical until founder approves.
- **Cost: ~$0.08/tenant one-time** — ~125 reads + ~155 writes + ~40 Gemini calls per bootstrap.

### Fixed

- **KB Articles tenant isolation** — Added `tId`/`sId` fields to `KnowledgeBaseArticleType` (frontend + CF types). Articles now inherit tenant IDs from parent `kb_generation_jobs` doc during generation. Fixes latent bug where `searchCore.ts` tId filter returned 0 results because articles lacked the field. Fixes multi-tenant data isolation for bootstrap engine. Satisfies ANSWERLATTICE_RULES Rule 6.
- **Pre-existing TS error** — `ProcessedKBArticle` type was missing `qualityScore` property that `startGeneration.ts` writes to. Added optional field.

### Technical

- 2 new files, 8 modified files (3 additional: startGeneration.ts + 2 type files for tId/sId)
- Zero TypeScript errors (frontend + functions + functions-answerlattice — all 3 projects)
- Zero new Firestore collections

---

## March 9, 2026 (Session 9 — Answerlattice Product Friction Intelligence: Full Pipeline)

### Added

- **Product Friction Intelligence** — Converts support signals into actionable product friction insights for SaaS founders. Nightly aggregation of friction metrics per entity, 7-day trend detection, emerging topic alerts, weekly AI-generated insight summary. Feature flag: `ENABLE_ANSWERLATTICE_FRICTION_INTELLIGENCE`.
- New collection: `answerlattice_frictionDailyStats` — daily per-entity friction metrics with 90-day retention.
- GovernanceHub "Friction" tab — health badge, top friction table, emerging topics, weekly AI summary.
- Nightly Steps 10/10b/11 in `answerlatticeNightly.ts` — friction aggregation, stats cleanup, weekly Gemini insight (Sundays).

### Documentation

- Full doc set: `__docs__/answerlattice/product-friction-intelligence/` (8 docs + 1 archive: README, spec, impl, firebase, marketing, website, helpdoc, mobile-support, chatgpt-review)
- ChatGPT conversation review: System #5 of ICP Coverage Index. ~45% accuracy. ~55% of proposed infrastructure already existed. BigQuery, Vector DB, embedding clustering, 6+ new collections all rejected.
- Expansion tracker Item #5 updated to 🟢 COMPLETE.
- Created `firestore-answerlattice.indexes.json` with 6 composite indexes for Answerlattice Firestore.

### Key Decisions (Cascade)

- **Entity graph IS the topic taxonomy** — no separate ML-based clustering needed (Answerlattice doctrine: deterministic > LLM)
- **1 new collection only** — ChatGPT proposed 6+. `platformSummary` pattern handles insights.
- **Zero external services** — no BigQuery, no Vector DB, no Pub/Sub. Firebase-only.
- **Nightly batch** — Intercom uses weekly, we use nightly for faster signals. No real-time processing.
- **Workflow step failure deferred** — needs `ENABLE_ANSWERLATTICE_CONTEXT_AWARE` + sufficient data. Low ROI for v1.

### Technical

- 6 new files, 5+ modified files
- Zero TypeScript errors (frontend + functions-answerlattice)
- Estimated cost: ~$4/month at 100 tenants

---

## March 9, 2026 (Session 8 — Answerlattice Instant Response Infrastructure: Docs + Implementation)

### Added

- **Instant Response Infrastructure** — Upstash Redis cache layer for canonical answers. Entity-based cache keys, version-based invalidation, 24h TTL, graceful degradation. Feature flag: `ENABLE_ANSWERLATTICE_INSTANT_CACHE`.
- Stage 2.5 in `coreSearch()` pipeline — Redis cache lookup before Firestore, cache write after canonical hit.

### Documentation

- Full doc set: `__docs__/answerlattice/instant-response-infrastructure/` (9 files: README, spec, impl, firebase, marketing, website, helpdoc, mobile-support, chatgpt-review archive)
- ChatGPT conversation review: System #3 of ICP Coverage Index. ~55% accuracy. Intent Engine, pre-cache workers, semantic caching, global intent library rejected.
- Expansion tracker Item #3 updated to 🟢 COMPLETE.

### Key Decisions (Cascade)

- **Entity-based cache keys** (not ChatGPT's "Intent Engine") — Answerlattice's entity resolution IS intent classification
- **Canonical-only caching** — RAG responses are non-deterministic, already cached in aiSearchHistory
- **No pre-cache workers** — Cache warms naturally; premature complexity at current scale
- **No semantic caching** — Correctness risk for authoritative knowledge systems
- **Shared Upstash instance** — Reuses existing rate limiting Redis (zero new dependencies)

### Technical

- **New files:** `src/lib/answerlattice/instantCache.ts` (124 lines), `src/lib/answerlattice/instantCache.types.ts` (36 lines)
- **Modified files:** `src/lib/search/searchCore.ts` (Stage 2.5 + cache write), `src/config/features.ts` (flag)
- **New collections:** 0
- **New feature flags:** 1 (`ENABLE_ANSWERLATTICE_INSTANT_CACHE`, default OFF)
- **Breaking changes:** 0
- **TypeScript errors:** 0

---

## March 8, 2026 (Session 7 — Answerlattice Entity System Enhancement: 6 Enhancements)

### Added

- **E1 — Entity Aliases:** `aliases?: string[]` field on `AnswerlatticeEntity`. `syncAliasesToSearchIndex()` DAL function. `updateAliases()` hook action. Aliases are source of truth, synced to search index synonyms.
- **E2 — Article-Entity Bridge:** `entityIds?: string[]` field on `KnowledgeBaseArticleType` and `IngestionJobArticle`. Connects KB articles to product ontology entities for entity-centric retrieval.
- **E3 — Registry-Guided Extraction:** `extractEntitiesFromArticles()` now accepts existing entities as context. AI prompt includes existing entity list to prefer reuse. Post-extraction matching via `matchToExistingEntity()`. Reduces duplicate candidates.
- **E4 — Auto-Extract on Article Save:** `extractEntitiesForArticle()` function with 5-minute debounce. Wired into `addArticle()` and `updateArticle()` DAL as fire-and-forget. TipTap JSON → plain text converter. Async — never blocks article save.
- **E5 — Entity Merge:** `mergeEntities()` DAL function. Transfers canonical answer refs, relations, combines aliases. Merged entity deprecated (soft delete). `merge()` hook action. Full audit trail.
- **E6 — Entity-Enriched RAG Context:** `getEntityDescriptions()` and `buildEntityContextBlock()` in canonical retrieval. When canonical miss has entity matches, entity descriptions injected into RAG payload for better fallback answers.

### Documentation

- Full doc set created: `__docs__/answerlattice/entity-system/` (9 files: README, spec, impl, firebase, marketing, website, helpdoc, mobile-support, chatgpt-review archive)
- ChatGPT conversation review: 9,430-line entity discussion analyzed, 32-concept verdict table, ~40% applicable (70% already built)

### Technical

- **New files:** 0 (all modifications to existing files)
- **New collections:** 0
- **New feature flags:** 0 (uses existing `ENABLE_ANSWERLATTICE_ONTOLOGY`)
- **Breaking changes:** 0 (all additive optional fields)
- **TypeScript:** Zero errors (`npx tsc --noEmit` clean)

---

## March 7, 2026 (Session 6 — Answerlattice ChatGPT Review: Infrastructure Guards)

### Fixed (ChatGPT Review — 2 genuine infrastructure gaps)

- **Knowledge Integrity Guard:** Added `ENTITY_MATCH_MIN_SCORE = 2.0` threshold in `canonicalRetrieval.ts`. If entity match score is below threshold, canonical layer is bypassed and RAG handles the query. Prevents confidently wrong deterministic answers from weak entity matches.
- **Ontology Authority Guard:** Added `ONTOLOGY_AUTHORITY_RULES` to `promoteCandidate()` in `entityCandidates.ts`. Requires `confidence ≥ 0.5` AND (`articles ≥ 2` OR `signals ≥ 3`) before entity promotion. Prevents entity explosion from weak KB extraction.

### Deferred

- **Signal Normalization Layer:** Valid optimization for clustering quality but not needed at current scale (pre-activation, no real traffic). Added to backlog.

### Technical

- **ChatGPT accuracy:** ~75%. Missed existing entity `beta` status, extraction prompt rules, and signal resolution pipeline. Found 2 genuine code gaps.
- **Archive:** `__docs__/answerlattice/_archive/chatgpt-review-phase4-signal-quality.md`
- **TypeScript:** Zero errors (`npx tsc --noEmit` clean)

---

## March 7, 2026 (Session 4+5 — Answerlattice Phase 4: SHARPEN — Full Production Wiring)

### Added

- **Signal Severity Weighting (3.1):** Escalation signals now weight 3x, tickets 1.5x, chat negative 1x in mutation proposal generation. Higher-severity knowledge gaps surface first.
- **Signal Time Decay (3.2):** Exponential decay with 7-day half-life. Recent signals contribute more to weighted scores than older ones within the 14-day window.
- **Batch Signal Count Queries (3.3):** Drift engine now uses `getBatchSignalCounts()` with Firestore `in` operator — reduces N per-entity reads to ceil(N/30) reads. 10-30x read reduction.
- **Canonical Answer Version History (3.4):** `getAnswerVersionHistory()` DAL function + `AnswerVersionHistory.tsx` governance UI tab. Full per-answer timeline of drift, mutation, and validation events.
- **Signal TTL Auto-Archive (3.5):** `archiveExpiredSignals()` is wired in the Answerlattice nightly scheduler. Deletes signal events older than 12 months per doctrine mandate.
- **White-Label / Custom Branding (4.1):** `AnswerlatticeBrandingConfig` type + `WhiteLabelBranding.tsx` settings UI + `branding.ts` DAL (save/load via platformSummary). Fully wired end-to-end.
- **Multi-Language KB Articles (4.2):** `AnswerlatticeArticleTranslation` type + `MultiLanguageArticles.tsx` management UI + `/api/answerlattice/translate` route (Gemini 2.0 Flash). Fully wired end-to-end.
- **3 new feature flags:** `ENABLE_ANSWERLATTICE_SIGNAL_QUALITY`, `ENABLE_ANSWERLATTICE_WHITE_LABEL`, `ENABLE_ANSWERLATTICE_MULTI_LANGUAGE` — all OFF by default.
- **Governance Hub expanded:** 3 new tabs (Version History, Branding, Languages) added to Phase 3 governance hub.
- **3 Firestore composite indexes** added for: batch signal counts (in + timestamp ASC), signal TTL archive (timestamp ASC), answer version history (entityType + entityId + timestamp DESC).

### Improved

- **Drift detection performance:** Replaced per-entity sequential signal queries with single batched query. Significant cost reduction for tenants with many entities.
- **Mutation proposal quality:** Proposals now prioritized by weighted score (severity × recency) instead of raw count. More actionable proposals surface first.
- **Nightly scheduler:** Now 8 steps (was 7). Step 8 = signal TTL auto-archive. Prevents unbounded signal collection growth.

### Technical

- **Files created:** `branding.ts` (DAL), `translate/route.ts` (API), 3 UI components in governance/
- **Files modified:** `signalMutation.ts`, `driftDetection.ts`, `signalEvents.ts`, `auditLogs.ts`, `features.ts`, `types/answerlattice/index.ts`, governance hub `index.tsx`, `answerlatticeNightly.ts`, `firestore.indexes.json`
- **TypeScript:** Zero errors (`npx tsc --noEmit` clean)
- **No new Firestore collections.** All features use existing collections with additive fields only.
- **Deploy prerequisite:** `firebase deploy --only firestore:indexes` (3 new indexes)

---

## March 7, 2026 (Session 3 — Multi-Product File Organization)

### Refactored

- **Multi-product file isolation:** All Answerlattice-specific files moved into product-scoped `/answerlattice/` subfolders across every layer (components, constants, types, data).
- **Components:** `templates/main-app/helpCenter/governance/` (6 files) + `AnswerlatticeCoverageKPI`, `EntityCandidateReview`, `MutationProposalReview` → `templates/answerlattice/`
- **Constants:** `answerlatticeNavigations.ts` → `constants/answerlattice/navigations.ts`
- **Data:** `AnswerlatticePlansList.ts` → `data/answerlattice/plans.ts`
- **Types:** `types/answerlattice.ts` → `types/answerlattice/index.ts`
- All import paths updated across 7 consumer files. Old files deleted. Zero TypeScript errors.

### Rules Added

- **STEP 11B** added to `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md` — Multi-Product File Organization pattern with 10 rules + full folder mapping table for all 5 products.
- **Rule 11** added to `.cascade/rules/ANSWERLATTICE_RULES.md` — Answerlattice file organization with complete folder tree.

### Architecture Decision

- **MenuList = default/root** — no subfolder needed (primary product).
- **All other products** (Answerlattice, SurfaceOS, GrowthOS, KitStamp) get `/[product]/` subfolder in every layer.
- **Shared infrastructure** (auth, security, theme, i18n, Firebase config) stays at root — never duplicated per product.

---

## March 7, 2026 (Session 2 — Answerlattice Dashboard: End-to-End Routing)

### Added

- **Answerlattice Dashboard Route Group:** Complete `(answerlattice)` Next.js route group with own layout, auth, sidebar, header — fully isolated from MenuList.
- **Answerlattice Sidebar:** Clean antd Menu-based sidebar with 8 navigation items across 3 groups (Support, Governance, Management).
- **Answerlattice Header:** Minimal header with page title derivation and user dropdown with sign-out.
- **Answerlattice Navigation Constants:** `src/constants/answerlatticeNavigations.ts` — all routes, sidebar config, nav groups.
- **8 Answerlattice Dashboard Pages:**
  - `/answerlattice/dashboard` — Overview with stats (entities, answers, drifted, signals, coverage KPI, ontology summary, getting-started guide)
  - `/answerlattice/knowledge-base` — KB article management (reuses platform KB component)
  - `/answerlattice/kb-generation` — AI-assisted article generation (reuses platform KBGeneration)
  - `/answerlattice/tickets` — Support ticket management (reuses platform support tickets)
  - `/answerlattice/conversations` — Chat session monitoring (reuses platform chat management)
  - `/answerlattice/governance` — Governance hub from Phase 3 (answers, entities, drift, analytics, health)
  - `/answerlattice/changelog` — Product changelog management (reuses platform changelog)
  - `/answerlattice/settings` — Workspace info, API key status, widget embed code, feature flag status display

### Architecture Decisions

- **Fully isolated route group** — `(answerlattice)` does NOT share layout with `(main)`. MenuList code completely untouched.
- **Shared providers** — Session, Redux, i18n, theme providers reused (same codebase pattern).
- **Component reuse** — Platform components (KB, tickets, chat, changelog) wrapped via dynamic imports in Answerlattice pages.
- **Own layout components** — AnswerlatticeDashboardLayout, AnswerlatticeSidebar, AnswerlatticeHeader — separate from MenuList's AntdLayoutWrapper + SidebarComponent.
- **Auth flow** — Same NextAuth session. Answerlattice tenants identified by `productId: 'AL'` + `onboardingSource: 'ANSWERLATTICE_ONBOARDING'`.

### Files Created (14 new)

- 1 navigation constant: `answerlatticeNavigations.ts`
- 3 layout components: `AnswerlatticeDashboardLayout.tsx`, `AnswerlatticeSidebar.tsx`, `AnswerlatticeHeader.tsx`
- 1 route layout: `(answerlattice)/layout.tsx`
- 9 page routes: dashboard, knowledge-base, kb-generation, tickets, conversations, governance, changelog, settings, base redirect

---

## March 7, 2026 (Session 1 — Answerlattice Phase 3: Governance UI)

### Added

- **Answerlattice Governance Hub:** New tabbed admin interface for daily knowledge governance, accessible from Help Center → "Governance" tab.
- **Canonical Answer Editor (2.1):** Full CRUD UI — create, edit, view canonical answers with entity binding, version management, content editing, governance status display, drift indicators.
- **Entity Management Dashboard (2.2):** List, create, edit, deprecate product ontology entities. Shows relation counts, search index status, type/status filters, search.
- **Drift Dashboard (2.3):** Visual dashboard showing drifted answers by drift class (version, signal, scope conflict, orphan). Summary stats, class breakdown cards, one-click resolve with audit logging, on-demand re-evaluation.
- **Answer Usage Analytics (2.4):** Tracks which canonical answers served most/least/never. Content gap detection (entities without answers). Top/bottom lists, negative feedback ranking, full usage detail table.
- **Entity Health Score (2.5):** Composite health score per entity (40% coverage, 30% drift, 20% signal, 10% indexed). Aggregate stats, worst-first sorting for quick action.
- **Feature flag:** `ENABLE_ANSWERLATTICE_GOVERNANCE_UI: false` (default OFF, enable after ontology + answers are active).

### Technical Details

- 2 new hooks: `useCanonicalAnswers`, `useEntities`
- 6 new UI components in `src/components/templates/main-app/helpCenter/governance/`
- Zero new Firestore collections — all reads from existing Answerlattice collections
- Zero new API routes — all client-side DAL pattern
- Initial load: 5 Firestore reads. Subsequent tab switches: 0 reads (cached).
- Governance tab conditionally rendered based on feature flag
- All governance actions audit-logged via existing `addAuditLog()` DAL

---

## March 6, 2026 (Session — SurfaceOS Product Strategy Documentation)

### Documentation

- **SurfaceOS product strategy created:** Full 16,440-line ChatGPT conversation processed and consolidated into `__docs__/surface-os/README.md` (26 sections, ~800 lines).
- **ChatGPT review archive created:** `__docs__/surface-os/_archive/chatgpt-review.md` — 56-section cross-check, ~85% ChatGPT accuracy assessment, every conversation message verified against documentation.
- **Product defined:** SurfaceOS = Public Discovery Governance Infrastructure for multi-location brands. Controls how business truth appears across Google, Apple Maps, directories, and future discovery surfaces.

### Key Decisions Documented

- SurfaceOS is architecturally **independent** of MenuList (works without it)
- **8 permanent modules** frozen: SRM, Governance, Adapter, Sync, Review, Integrity, Access, Billing
- **10 permanent exclusions**: No ranking tracking, backlinks, keyword research, social scheduling, ads, campaigns, website builder, performance analytics, competitor intelligence, content creation
- **Target ICP:** Mid-market chains (5-75 locations), clinics/dental as launch vertical
- **Architecture:** Modular monolith, Postgres, adapter-based surface abstraction, 3-year freeze
- **Launch order:** MenuList → SurfaceOS → GrowthOS → KitStamp
- **Google-first** adapter strategy (not multi-surface from day one)
- **Parent brand** ("Strata" suggested) — separate from MenuList, quiet until 2+ products have PMF
- **Full System Design Document (SDD)** with 10 frozen components defined

### Portfolio Architecture (4 Products)

| Product    | Layer          | Verb     | Posture   |
| ---------- | -------------- | -------- | --------- |
| MenuList   | Truth          | Own      | Authority |
| SurfaceOS  | Representation | Control  | Control   |
| GrowthOS   | Execution      | Activate | Momentum  |
| KitStamp | Preparation    | Prepare  | Craft     |

---

## March 6, 2026 (Session — Answerlattice Domain & Launch Readiness Review)

### Documentation

- **ChatGPT conversation reviewed:** Domain purchase (answerlattice.com) + support stack evaluation + launch readiness + failure modes. Overall accuracy: ~60%. Core claim (3 missing infrastructure pieces) was 0% accurate — all three already built on March 3.
- **Activation experiment updated:** Added 10 operational failure modes (§10), MenuList entity category suggestions for ontology bootstrap (§11), and canonical answer authoring guidelines (§12) to `ANSWERLATTICE-ACTIVATION-EXPERIMENT.md`.
- **Roadmap updated:** Session 12 added to `menulist-future-roadmap-ssot.md` with domain action items (DNS, email, trademark, social handles).
- **Archive created:** Full conversation review at `__docs__/answerlattice/_archive/chatgpt-review-domain-launch-readiness.md`.

### Key Findings

- All 3 "missing pieces" ChatGPT identified (coverage metrics, signal entity resolution, nightly scheduler) were already implemented in `answerlatticeNightly.ts` on March 3, 2026.
- 4 genuinely new failure mode warnings documented: Entity Ontology Collapse, Canonical Answer Overfitting, Admin Cognitive Overload, Governance Loop Breaking.
- Weekly governance cycle recommended: Monday (proposals) → Wednesday (drift) → Friday (answers).
- Domain infrastructure setup is business operations, not engineering work.

---

## March 2, 2026 (Session — Answerlattice Sprint 1-6 Implementation)

### Implemented

Full 5-pillar infrastructure implementation for Answerlattice — the Governed Answer Infrastructure for SaaS Support. All 6 sprints executed sequentially with zero TypeScript errors.

### Pre-Implementation Setup

- **Product name locked:** Answerlattice — The Governed Answer Infrastructure for SaaS Support
- **Folder renamed:** `__docs__/help-center/` → `__docs__/answerlattice/` (75 docs moved)
- **Master workflow updated:** `.windsurf/workflows/master-execution.md` — Step 0 product detection (MenuList vs Answerlattice)
- **Answerlattice rules created:** `.cascade/rules/ANSWERLATTICE_RULES.md` — 10 binding rules
- **Tenant/store architecture:** Keep existing tId+sId. MenuList = first client.

### Sprint 1 — Data Layer Foundation

- **9 DB_COLLECTIONS** constants added (frontend `src/constants/database.ts` + functions `functions/src/constants/database.ts`)
- **5 feature flags** added to `src/config/features.ts` (all OFF by default): `ENABLE_ANSWERLATTICE_ONTOLOGY`, `ENABLE_ANSWERLATTICE_CANONICAL_ANSWERS`, `ENABLE_ANSWERLATTICE_DRIFT_DETECTION`, `ENABLE_ANSWERLATTICE_SIGNAL_MUTATION`, `ENABLE_ANSWERLATTICE_PUBLIC_API`
- **Full type system:** `src/types/answerlattice.ts` — 15 interfaces, 10 const objects, 2 version normalization helpers
- **7 DAL files** (46 functions total) in `src/database/answerlattice/`: entities.ts (12), canonicalAnswers.ts (8), releases.ts (6), mutationProposals.ts (7), signalEvents.ts (4), auditLogs.ts (3), entityCandidates.ts (6)

### Sprint 2 — Canonical-First Retrieval Pipeline

- **`src/lib/answerlattice/canonicalRetrieval.ts`** — 3-layer retrieval stack: deterministic entity index (Layer 1) → intent classification (Layer 2) → LLM fallback assist (Layer 3). Rule-based specificity scoring. Version window filtering.
- **search-kb route integration** — Canonical-first block added to `src/app/api/helpCenter/search-kb/route.ts` between cache lookup and RAG vector search. Logs CANONICAL_HIT / CANONICAL_MISS.
- **AiSearchHistory type extended** — 4 canonical fields added to `src/types/aiSearchHistory.ts`

### Sprint 3 — Ontology Bootstrap

- **`src/lib/answerlattice/entityExtraction.ts`** — AI entity extraction pipeline from KB articles. Strict extraction rules (no UI labels, no generic nouns, must be versionable). Validation + deduplication + search index builder. Batched processing (5 articles per Gemini call).

### Sprint 4 — Drift Detection Engine

- **`src/lib/answerlattice/driftDetection.ts`** — 4 deterministic drift classes: version_mismatch, signal_anomaly, scope_conflict, deprecated_entity. Idempotent evaluation (running twice = identical results). Derived flags (not toggled). Audit logging on every state change.

### Sprint 5 — Signal Mutation Engine

- **`src/lib/answerlattice/signalMutation.ts`** — Entity-based signal clustering (not embedding-based). 4 mutation types: content_refinement, scope_adjustment, version_update, new_answer_required. Auto-proposal generation from friction signal clusters. Configurable thresholds (min 3 signals, 14-day window, max 10 proposals per run).

### Sprint 6 — Final Verification

- **`tsc --noEmit`:** Zero errors across all sprints
- **5-pillar cross-check:** All pillars implemented and verified
- **End-to-end flow verified:** Query → canonical retrieval → RAG fallback → drift detection → signal mutation → audit trail

### Summary Metrics

- **15 new files** created (7 DAL + 4 lib + 1 types + 1 rules + 1 workflow update + 1 type extension)
- **46 DAL functions** across 7 database files
- **9 Firestore collection** constants (frontend + functions mirrored)
- **5 feature flags** (all OFF — gradual enablement)
- **Zero breaking changes** to existing system (all behind feature flags)
- **All features OFF by default** — existing behavior completely unchanged

---

## March 2, 2026 (Session — Answerlattice Strategic Doctrine & Governance)

### Documented

Full ChatGPT strategic conversation processed, validated against codebase, and documented as binding governance for Answerlattice — the Help Center's future as standalone Governed Answer Infrastructure for SaaS Support.

### Created (`__docs__/help-center/doctrine/`)

1. **README.md** — Doctrine index with document map, key decisions summary, usage guide by role
2. **01-core-doctrine.md** — Product identity (Answerlattice), naming decision, 5 architectural pillars, retrieval doctrine, evolution path, current state assessment (70% SupportOS / 30% Answerlattice)
3. **02-non-goals-charter.md** — Binding non-goals: NOT helpdesk, NOT CMS, NOT AI autopilot, NOT compliance, NOT analytics. Feature rejection filter. Sales alignment rules.
4. **03-infrastructure-freeze-v1.md** — 3-year freeze rules: frozen collections, retrieval logic, governance engines, LLM discipline, economic guardrails. Freeze-break procedure (RFC required).
5. **04-market-validation.md** — TAM (3,000-5,000 mid-market SaaS), ICP ($5M-$40M ARR B2B SaaS), moat analysis (7-8/10 if deep), distribution (founder-led + AI wave piggyback), monetization ($500-$3,000/mo), 5-year durability (7-8/10).
6. **05-architecture-evolution.md** — 5-pillar codebase assessment (Ontology ❌, Canonical Answers ⚠️, Drift ❌, Signal Mutation ⚠️, API ⚠️). Frozen schemas adapted to existing MenuList DAL patterns. Entity/CanonicalAnswer/Release schemas. 4 drift classes. Signal mutation logic. 3-layer retrieval stack. 6-sprint implementation sequence.
7. **06-infrastructure-readiness-certification.md** — IRC v1.0: 10-section hard gate checklist (data integrity, retrieval determinism, drift engine, mutation safety, multi-tenant isolation, security/RBAC, performance/SLO, data durability, integrity audit, failure injection). All must pass before external rollout.
8. **07-execution-roadmap.md** — 12-month roadmap: Q1 (ontology + canonical engine), Q2 (drift + release binding), Q3 (signal mutation), Q4 (API + deep integration). Sprint-level breakdown. CRAV phases (shadow → assisted → enforced). Design partner criteria.
9. **08-threat-model-stride.md** — STRIDE analysis (6 categories + LLM-specific threats). 12 red team scenarios with mitigations. Economic threat modeling (abuse scenarios up to $50K/month unguarded). RBAC matrix for future roles.

### Created (`__docs__/help-center/_archive/`)

10. **chatgpt-review-answerlattice-strategy.md** — Full conversation review: 28 topics with per-claim AGREE/DISAGREE/PARTIAL verdicts. 8 ChatGPT errors identified. 11 strategic decisions locked. 12 components needed vs 12 existing components that support evolution.

### Updated

- `__docs__/help-center/README.md` — Added Answerlattice strategic governance section with doctrine folder link. Version bumped to 3.0.0.

### Key Decisions

- **Name locked:** Answerlattice (not SupportOS, not TrustLayer)
- **Category defined:** Governed Answer Infrastructure for SaaS Support
- **Current state classified:** 70% operational / 30% knowledge infrastructure — must shift to knowledge-first
- **5 pillars locked:** Ontology → Canonical Answers → Drift Governance → Signal Mutation → API Layer
- **Retrieval doctrine:** Canonical-first (permanent). RAG = fallback only.
- **3-year freeze:** Core schema, retrieval logic, governance engines all frozen. Additive only.
- **Separate team confirmed:** Dedicated team for this product (no MenuList distraction concern)
- **Evolution approach:** Gradual layering, not full rewrite
- **Embedding strategy:** Deep into fewer customers (10-20), not shallow horizontal

### ChatGPT Accuracy Assessment

- **~85% aligned** with codebase reality
- **8 errors** identified (didn't know about MCE, MOL, menuVersion, existing DAL patterns, platformRole system, feature checklist has wrong product names)
- **All schemas adapted** from ChatGPT's abstract proposals to match existing MenuList patterns (DB_COLLECTIONS, requestBodyComposer, apiCallComposer, feature flags)

---

## March 2, 2026 (Session — Help Center Feature-by-Feature Deep Documentation)

### Documented

Feature-by-feature deep documentation for 7 Help Center subsystems — 56 sub-feature documents created following the full 8-doc pattern (spec, impl, firebase, marketing, website, helpdoc, mobile-support + README).

### Created (`__docs__/help-center/[feature]/`)

**Feature 1: ticket-system/** (8 docs)

- Full ticket lifecycle, SLA tracking, real-time listeners, conversation threading, browser log capture
- 21 component files, 10 DAL functions, `useTicketCache` hook
- Issues found: `getSupportTickets()` no pagination, `deleteTicket()` is hard delete but UI uses soft delete, 4 DAL functions unused from UI

**Feature 2: ai-qna-chatbot/** (8 docs)

- Full RAG pipeline documentation (Gemini 2.5 Flash + text-embedding-004 + 2.5 Pro for images)
- 59 files, 25 DAL functions, 3 API routes, 3 hooks (useChatData, useChatHandlers, useRequestQueue)
- Chat state machine: idle → loading → typing/streaming → success → error
- Dual mode: QnA (stateless) + Assistant (contextual, last 5 messages)
- Response cache (~60% hit rate) + embedding cache (40-60% hit rate)

**Feature 3: knowledge-base/** (8 docs)

- Single-document categories pattern (all KB navigation in 1 Firestore doc)
- 3-pane platform admin with Ant Design Splitter
- 23 files, 15 DAL functions
- KB is global (platform-wide, no tenant scoping) — documented as intentional

**Feature 4: kb-generation-pipeline/** (8 docs)

- Upload → AI Processing → Review → Reconciliation → Publish → Embed pipeline
- 7 job statuses, 4 reconciliation statuses
- 21 UI files, 5 DAL functions, 2 Cloud Functions
- Mobile: ALL 4 gates FAIL — desktop-only feature

**Feature 5: changelog-system/** (8 docs)

- Paginated document model (~900KB auto-rollover, transaction-based)
- Timeline visualization with Framer Motion, tag filtering, infinite scroll
- 14+ files, 7 DAL functions (all transaction-based)
- Content feedback with sanitized comments

**Feature 6: feedback-system/** (8 docs)

- 3-step wizard: General (stars + comment) → Feature Usage (checklist) → Feature Requests (text + voting)
- Generic content feedback router for articles + changelog + future types
- Issues found: Feature checklist has non-MenuList feature names (Video Upload, Voice Cloning, etc.)
- Mobile: ALL 4 gates FAIL — desktop-only feature

**Feature 7: chat-monitoring/** (8 docs)

- 9-filter conversation dashboard with quality-based filtering
- Admin metadata (status/priority/tags), internal TipTap notes
- ROI calculator, AI weekly digest (Gemini-generated)
- 13 UI files, 13 DAL functions, 4 Cloud Functions
- `ComprehensiveDashboard.tsx` is empty (dead code)

### Updated

- `__docs__/help-center/README.md` — Added sub-feature documentation index with links to all 7 feature folders

### Summary Metrics

- **56 new documents** created across 7 feature folders
- **65 total documents** in help-center/ (9 parent + 56 sub-feature)
- **Every file read in detail** — reverse engineering validation confirms 100% coverage per feature
- **Issues documented per feature** — 6-7 issues per feature, all severity-rated

---

## March 1, 2026 (Session — Help Center Forensic Documentation Audit)

### Documented

Full codebase-first forensic audit of the Help Center feature — 15 subsystems, 170+ files, 17 Firestore collections mapped. No code changes — documentation only.

### Created (`__docs__/help-center/`)

1. **README.md** — Master index with architecture overview, file map, collection map, auth model, RAG pipeline diagram
2. **help-center_spec.md** — Business requirements covering all 15 subsystems, user roles, data isolation, security model
3. **help-center_impl.md** — Technical blueprint with complete file map (170+ files), all 64 DAL functions, RAG pipeline details, Cloud Functions, types, shared utilities, identified issues
4. **help-center_firebase.md** — All 17 Firestore collections, operations per feature, cost estimates ($0.22/month for 10 stores), required indexes, storage paths
5. **help-center_marketing.md** — Sales collateral, differentiators vs Zendesk/Intercom/Freshdesk
6. **help-center_website.md** — Landing page content with SEO meta
7. **help-center_helpdoc.md** — Customer help documentation (zero jargon)
8. **help-center_mobile-support.md** — 4-gate admission test (ALL PASS), mobile architecture rules
9. **help-center_decoupling-analysis.md** — Future standalone SaaS readiness: Overall score 6/10 (Medium), 2 critical blockers (KB tenant scoping, auth adapter), 3 product name suggestions (TrustLayer recommended)

### Key Findings

- **15 subsystems** identified: AI QnA Chat Bot, Knowledge Base, KB Generation Pipeline, Article Embedding, Support Tickets (owner + platform), Changelog (owner + platform), Feedback System, Feature Requests, Chat Monitoring, AI Intelligence Layer, Content Feedback, Contact Us, FAQ, AI Search Modal, Mobile Help Screen
- **17 Firestore collections** mapped with scoping analysis (global vs tenant vs store)
- **64 DAL functions** across 11 database files documented with read/write counts
- **KB articles are global** (no tenant scoping) — intentional for platform-wide KB but blocker for future multi-tenant SaaS
- **Missing `withAuth()` on helpCenter API routes** — relies on `getActiveSession()` instead of middleware enforcement
- **Non-atomic article feedback** — `updateArticleFeedback()` uses read-then-write, not transaction
- **Decoupling score: 6/10** — Auth abstraction (4/10) is deepest coupling point; branding independence (8/10) is strongest

---

## March 1, 2026 (Session — Marketing Strategy & Menu Kit Review)

### Analysis Summary

ChatGPT conversation covering marketing strategy 2026 + Menu Kit concept for restaurant onboarding. **~95% marketing advice misaligned** with infrastructure positioning (violates Docs 01, 11, 15). ChatGPT suggested founder-led content, distribution loops, paid ads — all SaaS/consumer app tactics that conflict with MenuList's silent infrastructure model. **Menu Kit concept 100% aligned** — creates physical dependency (Doc 15 Rule 4), removes cognitive load (Doc 01 Law 6), enables behavioral anchoring (Doc 15 Phase 0). Menu Kit already implemented (feature flag ON).

### Documented

1. **ChatGPT Review Archive** (`__docs__/strategy/_archive/chatgpt-review-session-marketing-menu-kit-march-2026.md`) — Full validation of marketing advice (rejected) + Menu Kit concept (approved). Marketing strategy violates Law 2 (Silence Is a Feature), Law 8 (Trust > Engagement), and infrastructure positioning. Menu Kit validated as operational infrastructure, not marketing collateral. Pilot acquisition tactics partially aligned (execution sound, framing needs language governance correction).

### Key Findings

**Marketing strategy rejected:** ChatGPT's advice (founder posting, content calendars, engagement metrics, paid ads) is for SaaS products, not infrastructure. MenuList's actual "marketing" is physical QR deployment, behavioral anchoring, and structural lock-in — not content loops.

**Menu Kit validated:** Already implemented (`__docs__/menu-kit/menu-kit_spec.md`, feature flag `ENABLE_MENU_KIT`). Auto-generates 7 assets (table tent, counter sticker, IG story, WA status, Google Maps image, placement guide, staff script). Creates physical dependency without feature creep. Zero customization, zero cognitive load.

**Language governance correction needed:** Pilot acquisition should use "official menu infrastructure activation" not "free QR menu pilot" (Doc 02 compliance).

---

## March 1, 2026 (Session — Multi-Thread Strategic Review: Business Models, Infrastructure, Distribution)

### Analysis Summary

ChatGPT conversation covering 4 strategic threads: (1) Business Models 2027 (Layer 3 Authority positioning), (2) Software Factories (code abundant, authority scarce), (3) Individual Empires (infrastructure-first vs creator-first), (4) Distribution System (action engine, batch scaling, QR enforcement). **~95% already documented** in Constitution Docs 15, 17, 11, 01. ChatGPT was unaware of existing Category Dominance Doctrine, Infrastructure Compounding Doctrine, Cleanest Source framework, 5-year inevitability map, and upstream positioning rules. All strategic framing already exists. Only Thread 4 (distribution execution system) contains genuinely new tactical framework (~5%).

### Documented

1. **ChatGPT Review Archive** (`__docs__/strategy/_archive/chatgpt-review-session-multi-thread-march-2026.md`) — Full 4-thread validation. Thread 1: Business models analysis (98% overlap with Doc 15). Thread 2: Software factories thesis (100% overlap with Doc 15's 3-Question Survival Test). Thread 3: Individual empires framing (100% overlap with Doc 11 infrastructure positioning). Thread 4: Distribution system architecture validated as tactical execution framework, not strategic shift.

2. **Distribution Infrastructure Spec** (`__docs__/distribution-infrastructure/distribution-infrastructure_spec.md`) — NEW proposal document for Thread 4's action engine architecture. 3-layer model (Entity/Workflow/Execution), deterministic state machine, batch scaling ladder (10→20/day max, NOT 40/day), QR enforcement pipeline, ASSISTED→AUTO automation path. **Status: PROPOSAL** — requires founder approval before implementation. Aligned with Docs 15, 17, 01 but requires bandwidth allocation decision per Doc 17 (infrastructure deepening vs go-to-market execution).

### Key Findings

**Positive validation:** External AI independently converged on MenuList's infrastructure positioning (Layer 3 Authority, canonical data ownership, physical dependency) without knowing existing doctrine. Confirms robustness of strategic framework.

**Rejected concepts:** "Perceived Ubiquity Engine" (violates Doc 01 Law 2), 40/day volume targets (too aggressive), "psychological dominance" framing (manipulative tone). Reframed as behavioral anchoring (Doc 15 Phase 0) and physical dependency creation (Doc 15 Rule 4).

**Implementation decision pending:** Distribution infrastructure is tactically sound but requires founder decision on bandwidth allocation (go-to-market execution vs infrastructure deepening per Doc 17).

---

## March 1, 2026 (Session — Consumer App Distribution Playbook Review)

### Analysis Summary

ChatGPT conversation analyzing Mau Baron's "$25k/month mobile app" article (consumer app growth: TikTok, UGC armies, influencers, paid ads, psychological onboarding) and deriving infrastructure-native distribution strategy. ChatGPT correctly identified fundamental misalignment with infrastructure positioning. Proposed "5-Layer Distribution Stack" — but all 5 layers already documented across existing feature docs (presence-dominance, seo-aeo, gbp-sync, physical-surfaces, multi-outlet-consistency). Proposed metrics already covered by ISS framework and Authority Metrics doc with more precision. **~95% already documented.**

### Documented

1. **ChatGPT Review Archive** (`__docs__/strategy/_archive/chatgpt-review-session-distribution-playbook.md`) — Full validation of article analysis + infrastructure distribution proposal. Article correctly identified as consumer app playbook (misaligned). 5-layer stack mapped to existing docs. Metrics mapped to existing ISS + Authority Metrics. Only genuinely new contribution: "Time to Live Surface" metric (noted for future reference). No code or doc changes warranted.

---

## March 1, 2026 (Session — Pomelli / KS / GOS / Hardening Review)

### Analysis Summary

ChatGPT conversation covering Google Pomelli (AI marketing tool), KitStamp vs GrowthOS sequencing, product architecture, OBP adoption metrics, and MenuList hardening layers. **~90% already documented** in existing strategy and constitution docs. Our docs are more comprehensive — ChatGPT was unaware of existing Social Content Engine (GrowthOS v0), MCE, menu snapshots, OBP analytics, adoption pulse, and security rules. All strategic conclusions converge with already-locked decisions in Constitution 11/12 and product positioning map.

### Documented

1. **ChatGPT Review Archive** (`__docs__/strategy/_archive/chatgpt-review-session-pomelli-vm-gos-hardening.md`) — Full 14-topic validation. Topics: Pomelli integration (rejected — already locked), KitStamp spec (redundant — 781-line doc exists), GrowthOS spec (redundant — 776-line doc exists), product sequencing (already in Constitution 11), product connection model (already in Constitution 12), brand architecture (already in positioning map), capital allocation (already locked), GrowthOS build/launch (already implied by existing framing), OBP adoption scoring (premature — no GBP API), MenuList hardening (8/10 already built). No code or doc changes warranted.

### Key Finding

Positive validation — an external AI independently converged on the same strategic conclusions already locked in our governance docs. This confirms the robustness of the existing strategic framework.

---

## March 1, 2026 (Session — POS Intelligence Roadmap Review)

### Improved

1. **POS Sync Spec Updated** (`__docs__/pos-webhook-sync/pos-webhook-sync_spec.md`) — Added "POS Feature Ceiling" section with allowed/gray/hard-no zones as permanent boundary definition. Updated Future Scope: marked Platform Pull API as BUILT, added time-window availability as future concept. Updated date to March 2026.

2. **ChatGPT Review Archive** (`__docs__/pos-webhook-sync/_archive/chatgpt-review-session-pos-intelligence.md`) — Full claim-by-claim validation of ~6-turn ChatGPT POS intelligence conversation. ChatGPT proposed bidirectional POS adapter layer — REJECTED because it reverses our locked upstream-only data flow (Doc 15 Rule 1). ~90% of suggestions already existed or were misaligned. Only POS ceiling framing and time-window availability were valid new contributions.

### Analysis Summary

ChatGPT conversation explored POS Sync expansion: adapter layer, availability intelligence, feature ceiling, 5-year roadmap. Fundamental misalignment: ChatGPT proposed reading FROM POS (making MenuList downstream), while our locked architecture is push-only (MenuList → POS). ~80% of suggested systems already built (MCE, multi-outlet governance, Platform Pull API, canonical schema). POS Feature Ceiling section added to spec. No code changes.

---

## March 1, 2026 (Session — B2B/POS Competitive Positioning)

### Improved

1. **Competitive Positioning Section** (`__docs__/strategy/product-positioning-map.md`) — Added "External Competitive Positioning: MenuList vs POS Digital Menus" section. Structural comparison table (8 dimensions), "POS Lock-In Fatigue" competitive wedge (POS switch breaks public links, MenuList survives), positioning narrative ("Your POS runs your counter. MenuList runs your public presence"), and locked B2B pivot decision with revisit criteria.

2. **ChatGPT Review Archive** (`__docs__/strategy/_archive/chatgpt-review-session-b2b-pos-positioning.md`) — Full claim-by-claim validation of ~10-turn ChatGPT B2B/POS strategy conversation. ~95% already existed in codebase/doctrine (POS Webhook Sync, Platform Pull API, B2B View, Constitution Docs 11/12/15). Only competitive positioning framing was genuinely new (~15%).

### Analysis Summary

ChatGPT conversation explored B2B pivot to serve POS vendors. Correctly rejected — aligns with existing locked constitution decisions. ChatGPT was unaware that POS Webhook Sync, Platform Pull API, and B2B View already exist. The "POS Lock-In Fatigue" competitive wedge and structural comparison vs Toast were the only new contributions. No code changes.

---

## March 1, 2026 (Session — Authority Control Stack: Strategic Documentation)

### New

1. **Authority Control Stack** (`__docs__/strategy/authority-control-stack.md`) — Maps MenuList's authority across the 5 layers of the commercial chain (Structured Offer → Presentation → Distribution → Perception → Optimization). Complements Constitution Doc 15's "Cleanest Source" data quality framework with a commercial chain perspective. Maps each layer to existing systems with infrastructure completeness tests.

2. **Infrastructure Strength Score (ISS)** (`__docs__/strategy/infrastructure-strength-score.md`) — New 0-100 composite score framework measuring infrastructure authority vs tool status. 5 pillars: Retention Gravity (0-20), Canonical Dependency (0-20), First-Write Authority (0-20), System Integrity (0-20), Structural Stability (0-20). Includes ISS interpretation bands (Tool → PMF → Authority → Gravity → Default), year 1-2 targets, and example month-12 scenarios. Aligns with Doc 06 allowed metric categories.

3. **Authority Metrics & Expansion Readiness** (`__docs__/strategy/authority-metrics-and-expansion-readiness.md`) — Consolidated operational reference: 5 founder weekly KPIs, system validation metric gaps (surface consistency audit, propagation latency), 5 expansion readiness criteria with numeric thresholds, 10+ failure mode derailers, and pricing power evolution model tied to ISS bands.

4. **ChatGPT Review Archive** (`__docs__/strategy/_archive/chatgpt-review-session-authority-control-stack.md`) — Full claim-by-claim validation of ~20-turn ChatGPT strategic conversation. Overall accuracy: ~25% genuinely new, ~70% already existed in codebase/doctrine. ISS framework was the primary new contribution.

### Improved

5. **Strategy README** — Updated with 3 new document entries in the index table.

### Analysis Summary

ChatGPT conversation covered AI agents article, vertical expansion, 5-layer control stack, ISS scoring, founder KPIs, year targets, pricing evolution, failure modes. ~70% of suggestions already existed in codebase (MCE, MOL, snapshots, authority maturation, infrastructure compounding). ISS framework and pricing/metrics thinking were genuinely new. No code changes — documentation only session.

---

## March 1, 2026 (Session — PDF Surface v2.1: Professional Bistro Layout)

### Improved

1. **PDF Surface v2.1** — Complete visual overhaul of menu PDF generation. New professional bistro-style layout replaces plain text output: full-width charcoal header band (`#2d2d2d`) with white store name, dotted leader lines between item names and prices, left accent bars on category headers with full-width rule, italic descriptions indented 4mm, refined three-zone footer with separator line. All layout decisions are system-decided — no owner configuration. Density auto-detection (standard/compact/high-density) and block-based pagination preserved. Feature flag `ENABLE_PDF_SURFACE: true`.

2. **PDF Version Tracking** — `snapshotHash` (`v-[base36ts]-[hex count]`) now stored in `localStorage` as `menulist_last_pdf_version_{projectId}` on every download. ShareModal updated to import `generateMenuPdf` + `downloadPdf` separately to capture and persist the hash.

3. **PDF Surface Docs Updated** — `pdf-surface_spec.md` and `pdf-surface_impl.md` updated to v2.1 with full design token documentation, visual hierarchy diagrams, and rationale for charcoal color choice.

---

## February 28, 2026 (Session — Reseller Dashboard: Enhancements + Onboarding Source Standardization)

### Improved

1. **Onboarding Source Standardization** — Unified `onboardingSource` field across ALL onboarding flows to use consistent constants: `WEBSITE_ONBOARDING`, `RESELLER_ONBOARDING`, `MESSAGING_ONBOARDING`. Fixed 7 instances of old `"messaging"` value in `claim-account/route.ts` and `msg-preview/.../approve/route.ts`. Added `onboardingSource` to tenant doc in messaging onboarding (was missing). Added new `OnboardingSource` type + `ONBOARDING_SOURCES` constants in `src/constants/user.ts`.

2. **Reseller Profile Expanded** — Full profile fields: name, phone, email, username, password, address, notes. Revenue stats (totalRevenueCollectedPaise, totalTransactions) and onboarding breakdown (totalOnlineStores, totalOfflineStores) stored directly on profile doc. New DAL functions: `createResellerProfile`, `updateResellerProfile`, `getResellerProfileById`, `getAllResellerProfiles`, `updateResellerStatsOnOnboarding`.

3. **Reseller Management Screen** (`/reseller/manage`) — Platform-admin-only screen. Create/edit reseller profiles. View all resellers with stats table (stores, revenue, offline cap usage). Protected by `PLATFORM` role on the page and backing APIs; no client-bundled platform password is used.

4. **Reseller Onboarding Tracking** — `resellerId` + `onboardingSource: 'RESELLER_ONBOARDING'` now written to tenant doc, store doc, AND subscription doc during reseller onboarding.

5. **Pricing Tiers Made Configurable** — Removed hardcoded `RESELLER_TIER_FLAGS` (tier-specific sunset flags). Tiers now disabled via `active: false` in the array. Only `RESELLER_SYSTEM_FLAGS.OFFLINE_MODE_ACTIVE` remains as system-level flag. Clear documentation added that tiers are examples, not final.

### Fixed

6. **onboardingSource type mismatch** — `FirestoreSubscriptionDoc.onboardingSource` was typed as `'self' | 'reseller' | 'messaging'` — updated to `'WEBSITE_ONBOARDING' | 'RESELLER_ONBOARDING' | 'MESSAGING_ONBOARDING'` to match tenant/store types.

---

## February 27, 2026 (Session — Reseller Dashboard: Docs + Implementation)

### New

1. **Reseller Dashboard — Full Implementation** — Built complete reseller assisted onboarding system. Authorized resellers (`platformRole: RESELLER`) can onboard SMB clients with predefined pricing tiers (Founder A ₹400/mo, Founder B ₹500/mo, Standard ₹499/mo), online (Razorpay recurring subscription) or offline (cash/UPI) payment modes. Feature flag: `ENABLE_RESELLER_DASHBOARD` (OFF).
   - **14 new files:** pricing config, types, Zod schemas, DAL, 5 API routes, SWR hook, 2 UI components, 2 page routes
   - **11 modified files:** feature flags (both), DB constants (both), subscription type, billingUtils (critical webhook resolution), auth middleware, nightly scheduler, Firestore indexes, security rules
   - Online mode uses same Razorpay Subscription engine as self-serve (unified billing, auto-renewal)
   - Offline mode uses manual subscription with auto-expiry via nightly scheduler (7-day grace)
   - Concurrent offline cap per reseller (not lifetime) — expired stores free up slots
   - Feature-flag-based tier sunset for controlled phase-out
   - `billingUtils.ts` updated to resolve `reseller_` prefixed planIds in webhooks (prevents silent billing bugs)
   - `withAuth` middleware updated: PLATFORM role can access RESELLER-gated routes (founder fallback)

2. **Reseller Dashboard — Documentation Suite** (8 docs + archive)
   - spec, impl, firebase, marketing, website, helpdoc, mobile-support, changelog
   - 2 ChatGPT reviews processed (initial conversation + doc feedback)
   - 7 ADRs documented

---

## February 25, 2026 (Session 16d — Firebase Deep Audit + Pre-Launch Fixes)

### Critical Fixes (Audit Phase)

1. **🔴 SECURITY: Removed sensitive API key logging** — `functions/src/firebaseAdmin.ts` was logging `GEMINI_AI_KEY`, `UPSTASH_REDIS_REST_URL`, and `UPSTASH_REDIS_REST_TOKEN` to Cloud Function logs at startup. Replaced with presence-only validation that warns if keys are missing without exposing values.
2. **🔴 SECURITY: Added Firestore security rules for 30+ collections** — Comprehensive security rules added for all client-accessed collections that previously had NO rules and fell through to default deny. Covers: tenant-scoped subcollections (todos, notes, campaigns), flat collections (analytics, chatSessions, decisionBlocks, etc.), public/static read collections (pricingPlans, blogs, changelog), KB collections, logging collections (write-only), and server-only collections (explicit deny).
3. **🔴 RUNTIME: Added 6 missing Firestore composite indexes** — `authSecurityEvents` (email+eventType+timestamp), `reviewsState` (tId+sId+blockActive, tId+sId+escalationActive), `systemAlerts` (tId+sId+acknowledged+timestamp, tId+sId+title+timestamp). Without these, queries would crash at runtime with FAILED_PRECONDITION.

### Pre-Launch Fixes (Implementation Phase)

4. **COST: Replaced `collection("_").doc().id` with `crypto.randomUUID()`** — 4 msg-preview API routes (`fix/route.ts`, `route.ts`, `approve/route.ts`) were wasting 1 Firestore read each time to generate random IDs. Now uses Node.js built-in `crypto.randomUUID()` (zero reads).
5. **MAINTENANCE: Centralized hardcoded collection strings → `DB_COLLECTIONS`** — Replaced ~20 hardcoded string literals across 6 Cloud Function files (`feedbackIntelligence.ts`, `weeklyNarrative.ts`, `kbQuality.ts`, `alerts.ts`, `healthCheck.ts`, `publishVerification.ts`). Added 4 new constants: `SYSTEM_HEALTH`, `AUTH_SECURITY_EVENTS`, `APPLICATION_LOGS`, `ERROR_LOGS`.
6. **FIX: Replaced mock VertexAI with real client** — `functions/src/firebaseAdmin.ts` had a dead stub mock returning empty strings. Replaced with real `VertexAI` client from `@google-cloud/vertexai` (already in `package.json` v1.10.0). Removed 40 lines of dead commented-out code (including leaked private key in comments).
7. **COST: Added Firestore TTL auto-deletion for ephemeral collections** — Added `expiresAt` timestamp fields to write paths of 4 collections:
   - `authSecurityEvents` — 90-day TTL (3 write locations in `security.ts`)
   - `systemErrors` — 30-day TTL (`errorTracking.ts`)
   - `systemHealth` — 7-day TTL (`healthCheck.ts`)
   - `messagingOnboardingEvents` — 30-day TTL (4 write locations across msg-preview routes)
   - Created `scripts/setup-firestore-ttl.sh` to configure TTL policies via `gcloud` CLI.

### Type Check

- `functions/`: **ZERO ERRORS**
- Root project: **ZERO ERRORS**

---

## February 25, 2026 (Session 16c — Security Audit Logging Implementation)

### Implemented

- **Security Audit Logging** — Instrumented 5 destructive operations with `logger.security()` calls. Each audit point logs to Sentry in production (with severity tags, fingerprinting, and searchable metadata) and to styled console in development.

### Audit Points Added

1. **Project Deletion** — `src/database/projects/index.ts` `deleteProject()` — severity: medium
2. **Project Restoration** — `src/database/projects/index.ts` `restoreProject()` — severity: low
3. **Outlet Deactivation** — `src/app/api/outlets/deactivate/route.ts` — severity: medium
4. **CSV/Excel Data Export** — `src/utils/exportUtils.ts` — severity: low (tracks record count, filename)
5. **Analytics Data Export** — `src/lib/export/exportService.ts` — severity: low (tracks format, scope)

### Files Changed

- `src/database/projects/index.ts` — added `logger` import + 2 audit points (delete, restore)
- `src/app/api/outlets/deactivate/route.ts` — added `logger` import + 1 audit point
- `src/utils/exportUtils.ts` — added `logger` import + 2 audit points (CSV, Excel)
- `src/lib/export/exportService.ts` — added `logger` import + 1 audit point
- `__docs__/projects/miscellaneous-task.md` — updated Security Audit Logging status to IMPLEMENTED

### Type Check

- Root project: **ZERO ERRORS**

---

## February 25, 2026 (Session 16b — Deep Production Readiness Testing)

### Deep Testing — 7-Phase Audit

1. **File-by-file review** — Read every modified file with before/after context. Verified no existing logic broken. All 16 changed files audited.
2. **Isolation verification** — All 4 injection points (aiResponseUtils, processMenuImagesJob, saveFilesToProject, detectAndLogChanges) confirmed safe. Each wrapped in try/catch or uses pure functions. New code **cannot crash** existing production flows.
3. **Existing feature verification** — MOL price/availability/active changes, auto-merge, nightly scheduler (DI, CMI, authority maturation, guest feedback, menu drift) all confirmed unaffected.
4. **Firestore security rules** — `platformSummary` (write: false, Admin SDK only), `messageLogs` (default deny, Admin SDK only), `menuChangeLog` (client create with tenant scope) all covered.
5. **Race conditions & null derefs** — No races (sequential scheduler). Found & fixed `String(undefined)` bug across 6 files (returns `"undefined"` which is truthy, bypassing guard clauses).
6. **Cost optimization** — Refactored `storesSummary` enrichment from N per-store writes to 1 batch write (saves ~99 writes at 100 stores).
7. **Full codebase scan** — Grepped all `String(storeInfo.tId)` patterns. Found 3 additional pre-existing files with same bug.

### Bugs Found & Fixed

1. **`String(undefined)` = `"undefined"` is truthy** — Pre-existing bug in 6 files. `String(undefined)` produces `"undefined"` (truthy string) which bypasses `!tId` guards, creating invalid Firestore paths like `menuChangeLog/undefined/{sId}`. Fixed with `storeInfo.tId != null ? String(storeInfo.tId) : ''` pattern.
   - `functions/src/decisionBlocksScoring.ts` (2 locations: main loop + special menu switching)
   - `functions/src/analytics/extractionLearning.ts`
   - `functions/src/analytics/storeTruthConfidence.ts`
   - `functions/src/analytics/obpAnalyticsAggregation.ts`
   - `functions/src/analytics/menuDriftMetrics.ts`
   - `functions/src/aggregateDailyChatStats.ts`
2. **N per-store writes to storesSummary** — Enrichment was doing 1 Firestore write per store inside the loop. Refactored to accumulate in memory and write once after loop. Saves N-1 writes per nightly run.
3. **Redundant `!tId` check in menuDriftMetrics.ts** — Two consecutive `!tId` checks. Consolidated into one.

### Type Check

- `functions/`: **ZERO ERRORS**
- Root project: **ZERO ERRORS**

---

## February 25, 2026 (Session 16 — Miscellaneous Task Backlog Audit)

### Audit Results

- **Reviewed all 15 tasks** in `__docs__/projects/miscellaneous-task.md` against current codebase.
- **6 tasks already DONE or SUPERSEDED** — document was stale, updated with accurate status and codebase evidence.
- **7 tasks remain correctly deferred** — no action needed before launch.
- **1 task NOT RECOMMENDED** (cultural adaptation) — correctly documented as violating doctrine.
- **Zero new code implementation required** — all actionable pre-launch items from this list were already completed in previous sessions.

### Tasks Found Complete

1. **AI Cost Control & Budget Tracking** — superseded by AI Enhancement Packs system (`checkAICapacity`, `consumeAICapacity`, `addAiOperation` on all 6 routes)
2. **UI Label Customization** — `src/config/businessLabels.ts` with `getOwnerLabels()` already exists
3. **Store businessCategory** — stored in store document on create/update via `src/database/stores/index.tsx`
4. **Client-Side Logging** — `src/lib/monitoring/logger.ts` with structured levels, Sentry integration, 72+ files
5. **Transaction Recording (addAiOperation)** — active in all 6 AI routes, no longer commented out
6. **Batch Size Limit** — superseded by `checkAICapacity()` enforcement in batch-trigger route

### Files Changed

- `__docs__/projects/miscellaneous-task.md` — updated status markers for all 15 tasks, added codebase evidence, updated summary table

### Type Check

- Root project: **ZERO ERRORS**
- Functions: **ZERO ERRORS**

---

## February 24, 2026 (Session 15d — Infrastructure Compounding Implementation + E2E Dry Run)

### Implemented

- **10.1 Extraction Confidence Scoring** — Per-item AI self-assessment on extraction output. Added `ExtractionConfidence` interface + `ConfidenceSummary` type to `menuExtraction.types.ts`. Modified Gemini prompt in `parallelProcessingPrompt.ts` to request confidence. Normalized confidence in `aiResponseUtils.ts`. Computes aggregate `confidenceSummary` in `processMenuImagesJob.ts` (piggybacked on existing write — zero extra cost).
- **10.2 Extraction Learning Loop** — Added `EXTRACTION_CORRECTION` to `MenuChangeType` union. Created `createExtractionCorrectionEntry()` helper in `menuChangeLog/index.ts`. Modified `detectAndLogChanges()` in `projects/index.ts` to detect recently-extracted items (`_extractedAt` within 24h) and log corrections. Added `_extractedAt` timestamp stamp in `saveFilesToProject.ts`. Created `extractionLearning.ts` nightly aggregation function. Wired into scheduler.
- **10.3 Store Truth Confidence Score** — Created `storeTruthConfidence.ts` with composite 0-100 score from 5 weighted signals (freshness 30%, completeness 25%, stability 20%, extraction 15%, engagement 10%). Writes single aggregate document `platformSummary/storeTruthConfidence`. CONSTANT cost regardless of store count. Wired into scheduler. Enriches `storesSummary` with `lastPublishedAt` + `projectCount` during nightly project loop (zero extra reads).
- **10.4 Periodic Staleness Check** — Created `stalenessCheck.ts` that reads 10.3 `staleFlag`, checks idempotency via `messageLogs`, logs new detections for lifecycle messaging. Throttled to 50 detections per night. 90-day cooldown. Wired into scheduler.

### Feature Flags Added

- `ENABLE_EXTRACTION_LEARNING` — `functions/src/constants/features.ts` + `src/config/features.ts` (default: true)
- `ENABLE_STORE_TRUTH_CONFIDENCE` — `functions/src/constants/features.ts` (default: true)
- `ENABLE_STALENESS_CHECK` — `functions/src/constants/features.ts` (default: true)

### E2E Dry Run Testing — Bugs Found & Fixed

1. **Missing Firestore composite indexes** — `menuChangeLog` (changeType + timestamp) and `messageLogs` (type + recipientStoreId + sentAt) queries would fail at runtime with FAILED_PRECONDITION. Fixed: added 2 indexes to `firestore.indexes.json`.
2. **storesSummary missing freshness fields** — `storeTruthConfidence.ts` read `lastPublishedAt`, `projectCount`, `lastActiveAt` from `storesSummary` but those fields didn't exist. Fixed: (a) enriches `storesSummary` during nightly scheduler project loop (zero extra reads), (b) fixed `computeCompletenessScore` to use actual fields (`name`, `businessCategory`, `businessType`), (c) fixed `computeEngagementScore` to use `lastPublishedAt` instead of non-existent `lastActiveAt`.
3. **`computeEngagementScore` signature mismatch** — Changed to accept `lastPublishedAt` as parameter but call site wasn't updated. Fixed.

### Pre-Existing Bugs Fixed

- `functions/src/decisionBlocksScoring.ts` — Missing `Timestamp` import (used at line 995/996), missing `aggregateOBPAnalyticsForAllStores` import (wrong module path `obpAnalytics` → `obpAnalyticsAggregation`)
- `functions/src/index.ts` — Missing `Timestamp` import + missing `db` (firestoreAdmin) import for `alertEscalation` and `forceRepublish` functions

### Type Check

- `functions/`: **ZERO ERRORS** (was 10 errors before session)
- Root project: **ZERO ERRORS**

---

## February 24, 2026 (Session 15c — ChatGPT Feedback on Infrastructure Compounding Specs)

### Doctrine Check

- **ChatGPT Feedback Review:** Shared all 4 spec docs (10.1–10.4) with ChatGPT. ChatGPT accuracy vs our specs: ~90% redundant — validated direction but was unaware of existing MOL, feature flags, sequential dependency design, and Firebase cost analysis. 3 suggestions rejected: (1) new `extractionErrorLog` collection — we use existing `menuChangeLog` (zero new collections), (2) "highlight low-confidence items subtly" — violates Doc 01 Law 3 + Law 6 (no explanations, no cognitive load), (3) weekly aggregation — nightly is 7x fresher. 1 framing accepted: "closed loop" / "Truth Engine" internal codename. Full review at `__docs__/infrastructure-compounding/_archive/chatgpt-feedback-review.md`.

### Changed

- `__docs__/infrastructure-compounding/README.md` — Added "closed loop" system diagram, "MenuList Truth Engine" internal codename, 6-week implementation timeline

---

## February 24, 2026 (Session 15b — Infrastructure Compounding Documentation)

### New

- **Infrastructure Compounding Feature Set Documentation** — Created comprehensive spec + impl + firebase cost docs for all 4 P1 infrastructure compounding features. Deep codebase analysis mapped: extraction pipeline (`processMenuImages.ts`, `aiResponseUtils.ts`, `saveFilesToProject.ts`), nightly scheduler (`decisionBlocksScoring.ts` — 9 existing tasks), MOL (`menuChangeLog/index.ts`), lifecycle messaging (`messagingEngine.ts`). All 4 features designed for zero new Firestore collections, zero new UI, piggyback on existing writes. Total Firebase cost: ~$0.08/month at 100 stores.

### Documentation Created

1. `__docs__/infrastructure-compounding/README.md` — Feature set index + integration map
2. `__docs__/infrastructure-compounding/extraction-confidence-scoring_spec.md` — 10.1: Per-item AI confidence on extraction. Zero extra cost (piggybacks on existing Gemini call). 7 files modified, 0 new collections.
3. `__docs__/infrastructure-compounding/extraction-confidence-scoring_firebase.md` — 10.1: Firebase cost = $0.00 additional
4. `__docs__/infrastructure-compounding/extraction-learning-loop_spec.md` — 10.2: Track owner corrections, aggregate patterns nightly, inject into extraction prompts. New `EXTRACTION_CORRECTION` MOL event type. 1 new file (`extractionLearning.ts`), 1 new doc (`platformSummary/extractionLearning`).
5. `__docs__/infrastructure-compounding/extraction-learning-loop_firebase.md` — 10.2: Firebase cost = $0.002/month at 100 stores
6. `__docs__/infrastructure-compounding/store-truth-confidence_spec.md` — 10.3: Composite 0-100 score from 5 signals (freshness 30%, completeness 25%, stability 20%, extraction 15%, engagement 10%). CONSTANT cost regardless of store count (1 read, 1 write per night).
7. `__docs__/infrastructure-compounding/store-truth-confidence_firebase.md` — 10.3: Firebase cost = $0.0001/month (constant)
8. `__docs__/infrastructure-compounding/periodic-staleness-check_spec.md` — 10.4: 90-day reconfirmation via existing lifecycle messaging. Calm tone, no metrics, max 1 message per 90-day window. Skips dormant owners.
9. `__docs__/infrastructure-compounding/periodic-staleness-check_firebase.md` — 10.4: Firebase cost = $0.0005/month at 100 stores
10. `__docs__/infrastructure-compounding/infrastructure-compounding_mobile-support.md` — FAILS all 4 gates (internal infra, no UI)

---

## February 24, 2026 (Session 15 — Infrastructure Compounding Strategy)

### Doctrine Check

- **ChatGPT Strategic Review (Session 15):** Analyzed 7-turn ChatGPT conversation on "Canonical Public-Offer Infrastructure" category positioning, execution focus, and infrastructure compounding layers. ChatGPT accuracy: ~75% — unaware of ~65% of existing infrastructure (MCE, MOL, Menu Intelligence, Menu Drift, Authority Maturation, Platform Pull API, menu snapshots, schema.org, llms.txt). ~85% of strategic content was already documented in existing constitution (Doc 01, 11, 15). 15% genuinely new: formal category name, 19-layer compounding checklist, concentration > expansion principle, geographic density strategy, bandwidth trap guardrail. Full review at `__docs__/raw-data/_archive/chatgpt-review-session15-infrastructure-compounding.md`.

### New

- **Constitution: Infrastructure Compounding Doctrine (#17)** — New governance document defining the operational execution plan for infrastructure compounding. Formal category name locked: "Canonical Public-Offer Infrastructure." 7 rules: (1) Category name lock, (2) Concentration over expansion, (3) 19-layer compounding checklist with codebase status per layer, (4) Geographic authority density (win one city first), (5) Bandwidth allocation priority (deepen > build), (6) Compounding measurement signals, (7) Permanent rejection list reinforcement. Extends Doc 15 (Category Dominance) from strategic positioning to operational execution. Constitution version bumped to 2.9. See `__docs__/constitution/17-infrastructure-compounding-doctrine.md`.

### Rejected (from ChatGPT conversation)

- Review analysis + improvement suggestions — marketing optimization SaaS, violates customer-facing boundary (Doc 11 Rule 2)
- XLS/spreadsheet import — low leverage, weak authority signal, extraction engine is superior
- AI business improvement recommendations — advisory layer, not infrastructure (Doc 01 Law 3, Law 6)
- Sentiment dashboards — analytics product territory (Doc 12)
- Public truth graph (now) — premature, requires 100+ stores

### Validated (for future implementation)

- Extraction confidence scoring per item (HIGH priority)
- Extraction learning loop from owner corrections (HIGH priority)
- Store truth confidence composite score (HIGH priority)
- Periodic staleness check / reconfirmation triggers (HIGH priority)
- Silent enrichment layer (dietary auto-detect) (MEDIUM)
- Edge-case menu library for extraction testing (MEDIUM)
- MCE price anomaly rule (MEDIUM)

---

## February 24, 2026 (Session 14c — AICapacityGate Full Pipeline Fix)

### Fixed (Critical Production Blocker)

- **402 Capacity Error pipeline was broken end-to-end.** Backend correctly returned 402, service layer threw `AICapacityError`, but every catch block swallowed it — returning `null`/`[]`. No UI component ever saw the capacity error. Users would see generic "failed" messages instead of the calm enhancement pack upsell.
- **6 service functions fixed:** `generateDescriptionViaAPI`, `getNewItemMetadataViaAPI`, `generateImageViaApi`, `editImageViaApi`, `triggerBatchImageGenerationApi`, `getTranslations` — all now re-throw `AICapacityError` instead of swallowing it.
- **2 utils functions fixed:** `descriptionUtils.ts` (`addDescription`) and `translationsUtils.ts` (`translateFile` + `translateItem`) — re-throw `AICapacityError` to propagate to UI.
- **6 UI editor surfaces wired:** Each now catches `AICapacityError` and shows calm doctrine-compliant message: "Get more AI enhancements to continue. Visit Billing to add an enhancement pack."
- **Batch trigger service was completely missing** `checkCapacityResponse` + `syncBalanceFromResponse` — added both.

### Surfaces Wired

1. `editItemModal.tsx` — `getNewItemMetadataViaAPI` (content generation) + `translateItem` (item translation)
2. `AiImageGenerator/index.tsx` — `generateImageViaApi` (single image generation)
3. `AiImageGenerator/EditImageModal.tsx` — `editImageViaApi` (image editing)
4. `ImageUploadModal.tsx` — `triggerBatchImageGenerationApi` (batch image generation)
5. `DescriptionGenerationModal.tsx` — `addDescription` (description generation + rewrite)
6. `Editor.tsx` — `translateFile` (language addition + retry translations) — discovered during deep cross-check

### Files Changed (14 files)

- `src/services/ai/description/generateDescriptionViaAPI.ts` — re-throw AICapacityError
- `src/services/ai/dataGeneration/getNewItemMetadataViaAPI.ts` — re-throw AICapacityError
- `src/services/ai/image/generateImageViaApi.ts` — re-throw AICapacityError
- `src/services/ai/image/editImageViaApi.ts` — re-throw AICapacityError
- `src/services/ai/image/triggerBatchImageGenerationApi.ts` — add checkCapacityResponse + syncBalanceFromResponse + re-throw
- `src/components/templates/main-app/projects/generateTranslations.ts` — re-throw AICapacityError
- `src/services/ai/description/descriptionUtils.ts` — re-throw AICapacityError in addDescription
- `src/components/templates/main-app/projects/utils/translationsUtils.ts` — re-throw in translateFile + translateItem
- `src/components/templates/main-app/projects/editorView/editItemModal.tsx` — catch AICapacityError (2 surfaces)
- `src/components/templates/main-app/projects/editorView/AiImageGenerator/index.tsx` — catch AICapacityError
- `src/components/templates/main-app/projects/editorView/AiImageGenerator/EditImageModal.tsx` — catch AICapacityError
- `src/components/templates/main-app/projects/editorView/ImageUploadModal.tsx` — catch AICapacityError
- `src/components/templates/main-app/projects/editorView/DescriptionGenerationModal.tsx` — catch AICapacityError
- `src/components/templates/main-app/projects/editorView/Editor.tsx` — catch AICapacityError (2 surfaces)

---

## February 24, 2026 (Session 14b — AI Enhancement Packs Remaining Tasks)

### Changed

- **PlatformFeaturesList.ts:** "Unlimited" → "Included" for AI features (`ai_data_extraction`, `ai_descriptions`, `ai_multi_language`) in both B2C and B2B plans. Doctrine compliance — no capacity language on pricing pages.
- **Pack status API:** Created `GET /api/ai-packs/status` — returns `{ canRunActions: boolean, packAvailable: boolean }` only. No unit counts or credit balances exposed.
- **AICapacityGate component:** Created `src/components/common/AICapacityGate.tsx` — calm upsell CTA wrapper with `ExhaustedCTA` sub-component and `isCapacityError()` static helper.
- **Security audit completed:** All 6 AI routes verified — `withAuth()`, `checkAICapacity()`, Zod validation, rate limiting all present. `remainingBalance` in API responses documented as accepted low-risk (used by `balanceSync.ts` performance optimization, not displayed in UI).
- **Firestore rules:** Added documentation comment on subscription collection explaining field-level read restriction is not possible in Firestore. Capacity fields readable by authenticated owner only, writes are server-only.

### Files Changed

- `src/data/PlatformFeaturesList.ts` — "Unlimited" → "Included" for 3 AI features (B2C + B2B)
- `src/app/api/ai-packs/status/route.ts` — NEW: Boolean-only pack status endpoint
- `src/components/common/AICapacityGate.tsx` — NEW: Calm upsell CTA wrapper
- `firestore.rules` — Added documentation comment on subscription capacity fields

---

## February 24, 2026 (Session 14 — AI Enhancement Packs Frontend Rename)

### Changed

- **AI Enhancement Packs doctrine compliance:** Renamed all customer-facing "Credit" references to "AI Enhancement" across 13 files (desktop billing, website pricing, mobile billing). No credits, tokens, or units are now exposed to customers anywhere in the UI.
- **ActiveSubscriptionCard:** Replaced credit counter panel (numbers, progress bar, "Buy More Credits") with clean AI Features status card ("Active" / "Exhausted" tag, "Get AI Enhancements" CTA).
- **RemainingCreditNote:** Simplified from showing full credit math to "Your remaining plan value will transfer to your new plan."
- **Billing history:** "Credit Pack Purchase" → "AI Enhancement Pack" (desktop + mobile).
- **Success messages:** "Topup Credits purchased successfully" → "AI enhancements are ready!"
- **Website pricing:** CreditPacksCtaSection heading → "Need More AI Enhancements?", CreditPackCard shows `description` instead of `creditAmount`.
- **Website SubscriptionManagement:** Credit numbers panel → AI Features status with Active/Exhausted badge.
- **Mobile billing:** Credit counter + progress bar → AI Features status card with Active/Exhausted tag.
- **usePaymentHandler:** Razorpay checkout name "MenuList.ai Credit Pack" → "MenuList.ai AI Enhancement Pack".
- **Type imports:** `CreditPack` → `AIEnhancementPack` in all consumer files. Deprecated alias kept for backward compatibility.

### Docs Updated

- `ai-enhancement-packs_impl.md` — Updated progress tracking: 21/29 tasks now ✅ (was 0/25). Backend 100%, frontend rename 100%. 5 minor tasks remain (AICapacityGate, pack status API, feature list label, security audit, Firestore rules).
- `pending-implementation-audit.md` — AI Enhancement Packs re-architecture marked as ✅ DONE.

### Files Changed

- `src/data/PlatformPlansList.ts` — Removed `CreditPack` import
- `src/hooks/usePaymentHandler.ts` — `CreditPack` → `AIEnhancementPack`, Razorpay label updated
- `src/components/templates/main-app/billing/index.tsx` — Billing history + success message labels
- `src/components/templates/main-app/billing/ActiveSubscriptionCard.tsx` — Credit panel → AI status panel
- `src/components/templates/main-app/billing/RemainingCreditNote.tsx` — Simplified to value transfer message
- `src/components/templates/website/.../CreditPacksCtaSection.tsx` — AIEnhancementPack + labels
- `src/components/templates/website/.../CreditPackCard.tsx` — AIEnhancementPack + description display
- `src/components/templates/website/.../SubscriptionManagement.tsx` — AI Features status panel
- `src/components/mobile/screens/MobileBillingScreen.tsx` — AI Features status + labels

---

## February 24, 2026 (Session 13b — Pending Implementation Audit)

### Improved

- **Full **docs** vs Codebase Cross-Check:** Scanned all 41 `_impl.md` files + READMEs + specs across 75 feature directories. Cross-checked every pending item against actual codebase. Found 14 features/edge cases where docs said "not implemented" but code was fully built. Updated 11 impl docs with codebase evidence. Added Firestore security rules for `menuChangeLog` and `menuSnapshots` collections (append-only, tenant-scoped). See `__docs__/pending-implementation-audit.md`.

### Docs Updated (Stale → Accurate)

- `cost-self-protection_impl.md` — "Awaiting implementation" → ✅ IMPLEMENTED (22 files)
- `internal-feedback-system_impl.md` — "0% complete" → ✅ 100% COMPLETE (30 files)
- `ops-alerting-delivery_impl.md` — "Awaiting implementation" → ✅ IMPLEMENTED (14 files)
- `menu-health-monitor_impl.md` — "Awaiting implementation" → ✅ IMPLEMENTED
- `store-onboarding_impl.md` — Updated E4, E5, E18 edge cases from ❌ to ✅
- `store-onboarding-billing_impl.md` — Updated BE1, BE2, BE3, BE8 from ❌ to ✅
- `store-onboarding_spec.md` — "UI 0%" → ✅ UI BUILT (15 files)
- `continuous-menu-intelligence_impl.md` — "Needs building" → ✅ BUILT (Cloud Function + DAL + types)
- `special-menu-switching_impl.md` — "Scheduler not implemented" → ✅ IMPLEMENTED in Cloud Functions
- `menu-correctness-engine_impl.md` — Updated phases to DONE, added \_mce Firestore rule risk note

### Files Changed

- `firestore.rules` — Added security rules for `menuChangeLog/{tId}/{sId}` and `menuSnapshots/{tId}/{sId}` (append-only)

---

## February 24, 2026 (Session 13)

### New

- **Canonical Truth Infrastructure — Phase 0 Verified + Phase 1 Implemented:** Deep codebase audit of all 6 Phase 0 items from implementation backlog. 5/6 verified (deterministic rendering deferred to P1). Implemented: `menuVersion` (monotonic publish counter via Firestore `increment()`), `lastPublishedAt` timestamp on project doc, `PUBLISH` event type in MOL, `menuSnapshots/{tId}/{sId}` collection for immutable publish-time snapshots, version + timestamp display on public menu footer with `data-menu-version` attribute for machine readability. Enabled `ENABLE_MCE: true` (18-rule validation engine) and `ENABLE_MENU_OBSERVATION: true` (append-only event ledger). New feature flag: `ENABLE_MENU_SNAPSHOTS`. Total cost impact: ~$0.07/month at 1000 stores. See `__docs__/canonical-truth-infrastructure/`.

### Files Changed

- `src/config/features.ts` — Enabled MCE + MOL, added ENABLE_MENU_SNAPSHOTS
- `src/components/templates/main-app/projects/types/project.types.ts` — Added `menuVersion`, `lastPublishedAt`
- `src/types/menuObservation.ts` — Added `PUBLISH` event type
- `src/constants/database.ts` — Added `MENU_SNAPSHOTS` collection
- `functions/src/constants/database.ts` — Synced `MENU_SNAPSHOTS` (Law 4)
- `src/database/projects/index.ts` — Version increment + snapshot + publish event in `publishProject()`
- `src/components/templates/main-app/projects/b2cView/output/MenuFooter.tsx` — Version + timestamp display
- `src/components/templates/main-app/projects/b2cView/menuPage/menuPageNew.tsx` — Wired version props

---

## February 24, 2026 (Session 12)

### Doctrine Check

- **Citrini Research "2028 GIC" + ChatGPT Strategic Review (Session 12):** Analyzed Citrini Research scenario analysis article ("The 2028 Global Intelligence Crisis") + 12-turn ChatGPT strategic conversation on agent-first economy positioning. ~80% of ChatGPT's strategic content was already documented in existing constitution and previous analyses. 4 genuinely new framings extracted: "Ghost Features" concept (friction-inversion analog), DoorDash direct-ordering as MenuList opportunity, cleanest friction-to-authority articulation. No new constitution document required — added Citrini reference as Appendix B to `15-category-dominance-doctrine.md`. No new implementation items. No code changes needed. Full analysis at `__docs__/raw-data/citrini-2028gic-analysis.md`.

---

## February 24, 2026 (Session 11)

### New

- **Automation Evolution Doctrine (Doc 16) — Constitution Addition:** 4-stage automation evolution path (Control Surface → Assisted Intelligence → Rule-Based Automation → Autonomous Truth Engine) with non-negotiable stage gates and 8 permanent guardrails. Includes tech-savvy SMB expectation analysis (determinism, API optionality, scale readiness) and adoption-first phase sequencing (Adoption → Depth → Revenue). See `__docs__/constitution/16-automation-evolution-doctrine.md`.

### Doctrine Check

- **ChatGPT Strategic Review (Session 11):** Reviewed multi-turn ChatGPT conversation on SMB pain points, passive automation, digital catalog hardening. ~60% of content was already documented in Session 9 research. 2 genuinely new strategic decisions extracted and preserved as Doc 16. Digital catalog 14-point hardening cross-checked: 13/14 already built in codebase. No code changes needed. Full review archived at `__docs__/research/smb-public-truth-industry-analysis/_archive/chatgpt-review-session11.md`.

---

## February 22, 2026 (Session 10)

### New

- **Platform Pull API — Documented + Implemented:** Two public read-only APIs for external systems to pull business details and menu data from MenuList. `GET /api/public/v1/business` returns store info (name, hours, address, status). `GET /api/public/v1/menu` returns full menu data in POS Webhook Sync payload format. API key authentication (`X-API-Key` header), rate-limited (60 req/min). Key management via `POST /api/store/public-api-key`. Feature flag: `ENABLE_PUBLIC_API` (default OFF). See `__docs__/platform-pull-api/`.

### Improved

- **Search/Indexing Authority Dominance — Phase 2 Complete:** Added FAQ schema (auto-generated FAQPage) on OBP pages, BreadcrumbList JSON-LD on menu pages, `dateModified` + `servesCuisine` on menu schema, sitemap enhanced with `/menu` URL. Zero Firebase cost — all computed from existing data at render time. See `__docs__/seo-aeo-discovery-infrastructure/`.
- **Temp Status Layer — Expanded:** Added 2 new status types: "Closing Early" and "Kitchen Closed". Store temporary closures now reflected in schema.org via `specialOpeningHoursSpecification`. Updated across API, desktop, mobile, and public banner components. See `__docs__/temp-status-layer/`.

---

## February 22, 2026 (Session 9)

### New

- **SMB Public Truth Industry Analysis — Deep Research:** Cross-analyzed 4 independent AI research reports (Gemini, Perplexity, Grok, ChatGPT) + Cascade web research on SMB restaurant public business truth problems. Key findings: all 5 sources converge on same root cause (no canonical public source of truth), MenuList already solves ~70% of top 10 industry problems, only 2 gaps qualify for future build (search indexing dominance + real-time status expansion). 7 categories permanently rejected per doctrine. See `__docs__/research/smb-public-truth-industry-analysis/`.

### Doctrine Check

- **No new constitution document required.** ChatGPT's 5-Filter Test is derived from existing doctrine (Doc 08 + Doc 15) and preserved in research docs. No new governance principles discovered.

---

## February 21, 2026 (Session 8)

### New

- **Menu Kit — Documented + Implemented:** Auto-generated "Launch Pack" of print-ready and social-ready assets. Includes 7 assets: Table Tent A6 PDF, Counter Sticker 8×8 PNG, Instagram Story (1080×1920), WhatsApp Status (1080×1920), Google Maps Upload (1200×900), Placement Guide, Staff Script line. 100% client-side generation (Canvas + jsPDF + qrcode + JSZip) — zero Firebase cost. "Download Menu Kit" button in Share Modal downloads ZIP with all 6 files. Feature flag: `ENABLE_MENU_KIT` (default ON). See `__docs__/menu-kit/`.
- **Roadmap SSOT — Session 11:** Logged ChatGPT conversation review (marketing article + pilot strategy + Menu Kit feature). Cascade accuracy: ~55%. Menu Kit emerged as the one genuine new feature. Rejected: Offer Builder, design editor, Review QR cards, handheld printing.

### Improved

- **Master Execution Prompt — Auto-Continue Rule:** Added AUTO-CONTINUE RULE to Master Execution Prompt. Full pipeline now mandatory: Stage 0→1→2→4 (Parity) → Step 6 (Testing 3 Perspectives) → Step 7 (8-phase session end). Stopping after parity check is no longer acceptable. See `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md`.
- **Menu Kit — Full Pipeline Completion:** Ran parity audit (4 mismatches fixed: `secureError`, `label` field, `STAFF_SCRIPT` location, empty name fallback), 3-perspective testing (fixed "A6" jargon → "Table card"), 8-phase session end (5 docs updated to IMPLEMENTED, `_website.md` created, dark mode border fix, scope-for-improvement logged).

---

## February 21, 2026 (Session 7)

### Improved

- **Constitution: Category Dominance Doctrine (#15) — TAI Market Validation:** Added Appendix A with external market validation from Bond Capital TAI Report (Mary Meeker, 2025). Key data: AI inference costs down 99% in 2 years, Big Tech AI CapEx $212B, open-source models commoditizing proprietary moats. All 5 data points independently validate existing doctrine rules (upstream positioning, cleanest source, infrastructure vs SaaS decisions). No governance changes — TAI data confirms thesis, does not modify it.
- **Roadmap SSOT — Session 10:** Logged ChatGPT TAI conversation review. Cascade accuracy assessment: ~25% — ChatGPT unaware of 13+ autonomous nightly tasks, Decision Blocks system, Core Doctrine 10 Laws, AutoMode spec, Product Taste Doctrine. Most "gap" claims already addressed in existing codebase and governance.

---

## February 21, 2026 (Session 6)

### New

- **Constitution: Category Dominance Doctrine (#15)** — New governance document defining MenuList's upstream infrastructure positioning in the LLM era. Based on Nicolas Bustamante's "10 Moats of Vertical Software" analysis — only 3 moats survive LLMs: proprietary aggregated data, trust lock-in, transaction embedding. MenuList scores on all 3. Introduces: "Cleanest Source" 5-layer framework (Structural, Semantic, Temporal, Sync, Output cleanliness), "First Update Behavior" as THE upstream positioning metric, 5-Year Inevitability Map (5 phases from behavioral anchoring to infrastructure consolidation), 10 Infrastructure vs SaaS decisions (locked), 10 behavioral failure risks, Chain-First Authority Multiplier strategy. See `__docs__/constitution/15-category-dominance-doctrine.md`.

---

## February 21, 2026 (Session 5)

### Improved

- **Special Menu Switching — ChatGPT Hardening** — Applied 4 architectural improvements from external strategic review: (1) Removed stored `behaviorTemplate` from `_specialMenu` metadata — now derived at runtime via `getBehaviorTemplate(store.businessType)`, preventing stale template data. (2) Removed `activeSpecialMenuMode` from `StoreDataType` — resolver derives mode from project `_specialMenu.mode`, reducing mutation surface. (3) Added base project deletion guard in `deleteProject()` — blocks if non-expired special menu references it. (4) Added default project guard in `updateProjectMetadata()` — prevents special menu from being set as `isDefault`. Logged 5 pre-flag-ON items (activation atomicity, menuVersion bump, 5-min scheduler, overlay ID namespacing, expiry ordering). Feature now FROZEN under flag OFF — no further development until reopen triggers fire. See `__docs__/special-menu-switching/_archive/code-feedback-audit.md`.

### New

- **Constitution: Feature Lifecycle Doctrine (#14)** — New governance document defining the 6-phase feature lifecycle: Build→Freeze→Trigger→Reopen→Pilot→Production. Establishes reopen triggers (active customer base, organic demand signal, contextual timing, core stability proven). Defines anti-patterns (engineering drift, premature reliability, excitement-driven reopen, demo-driven development). Applies to all non-core features. See `__docs__/constitution/14-feature-lifecycle-doctrine.md`.

---

## February 20, 2026 (Session 4)

### New

- **Special Menu Switching** — Temporary menu override system for festivals, events, and seasonal menus. Full end-to-end implementation: client-side DAL functions (create/activate/deactivate/cancel/list), client-side resolver with Replace + Overlay modes, nightly scheduler activation/deactivation, dashboard UI (SpecialMenuCard + CreateSpecialMenuModal + StatusBadge), mobile management screen (MobileSpecialMenuScreen), SWR hook (useSpecialMenus), behavior templates per business type (dynamic/occasional/minimal via getBusinessCategory). Architecture: special menu = regular project + `_specialMenu` metadata — reuses 100% of existing editor, AI extraction, MCE, publish, screens, PDF. Base menu never modified. Auto-activates at startsAt, auto-reverts at endsAt. Integrates with Temp Status Layer (auto-shows "Special menu available" banner). 6 new files, 10 modified files. Feature flag: `ENABLE_SPECIAL_MENU_SWITCHING` (OFF). Cost: ~₹2.50/month per 1,000 stores. See `__docs__/special-menu-switching/`.

---

## February 20, 2026 (Session 3)

### New

- **Lifecycle Messaging System** — Event-driven operational email infrastructure for store owners. 8 message templates (payment success/failure, renewal reminder, suspension warning, welcome, credit purchase, credits exhausted, grace period) via nodemailer SMTP (free, Gmail or custom domain). Infrastructure-grade tone (calm, non-marketing). Idempotent (composite key prevents duplicates), rate-limited (max 10/store/day, critical messages bypass), feature-flagged (`ENABLE_LIFECYCLE_MESSAGING` defaults OFF). **All 8 events WIRED to production trigger points:** Razorpay webhook (payment success/failure/grace period), verify-subscription (first activation), verify-topup (credit purchase), capacityCheck (credits exhausted), verifyMenuPublish CF (store published), decisionBlocksScoring nightly scheduler (renewal reminders + suspension warnings). Firebase cost: ~₹0.05/month at 50 stores. See `__docs__/lifecycle-messaging/`.
- **Law 13: Launch Prerequisites Rule** — New IDE_PROMPTS law: every feature requiring manual setup (secrets, env vars, config) MUST update `__docs__/production-readiness/launch-prerequisites.md`. Added SMTP email setup as Step 7 in launch prerequisites.
- **Internal Revenue Notifications** — Two-channel messaging architecture: external (to clients) + internal (to founder/team). When someone buys a subscription or credit pack, founder receives email + Telegram push notification with store name, plan, amount. Three internal events: INTERNAL_SUBSCRIPTION_PURCHASED, INTERNAL_CREDIT_PACK_PURCHASED, INTERNAL_SUBSCRIPTION_RENEWED. Recipient configured via `INTERNAL_NOTIFICATION_EMAIL` env var. See `src/constants/internalRecipients.ts`.

### Fixed

- **Mobile publish missing health verification** — `MobileDesignEditorScreen.tsx` was calling `publishProject()` without firing `verifyMenuPublish()`, meaning mobile publishes had no health check and no STORE_PUBLISHED welcome email. Now has the same fire-and-forget health verification as desktop.
- **CRITICAL: Nightly scheduler renewal/suspension scans used wrong collection** — `checkRenewalReminders()` and `checkSuspensionWarnings()` used `collectionGroup('subscriptions')` (queries subcollections) but subscriptions are stored as a top-level `subscriptions` collection. Changed to `db.collection(DB_COLLECTIONS.SUBSCRIPTIONS)`. Without this fix, renewal reminders and suspension warnings would never find any subscriptions.

### Improved

- **SMTP Health Check** — First email send now verifies SMTP connection. If SMTP is broken, fires a critical Telegram alert once per day instead of failing silently per-message. Solo founder gets immediate visibility into email delivery failures.
- **Failed Message Retry** — Nightly scheduler now retries messages that failed in the last 24h (max 1 retry per message, capped at 20). Industry best practice for transient SMTP failures.
- **Daily Messaging Digest** — Nightly scheduler logs sent/failed message counts from last 24h. Gives founder visibility into messaging system activity.
- **Nightly Scheduler Completion Summary** — After all tasks complete, fires a Telegram summary alert with store/project counts, success/failure stats, and duration. Acts as a dead man's switch — if this alert doesn't arrive, the scheduler didn't complete.

### Improved (continued)

- **Deep Monitoring Review** — 7 AI routes now have SAFE_MODE checks (helpCenter x3, weekly-narrative x2, new-item-metadata, batch-generation). 4 auth routes now rate-limited (change-password, claim-account, create-staff, validate-claim). 4 Razorpay mutation routes now rate-limited (cancel, pause, resume, upgrade). Payment webhook failures now trigger Telegram alerts. Master scheduler failures now trigger Telegram alerts. Publish verification now includes cache-busting. Added Law 12 (Operational Monitoring Checklist) to IDE_PROMPTS.

---

## February 20, 2026 (Session 2)

### New

- **Auto Publish Verification** — Every menu publish now automatically triggers health verification in the background. After `publishProject()` succeeds, the frontend fires `verifyMenuPublish()` (fire-and-forget) which checks HTTP 200 + content on the public URL and updates `store.health`. Owner sees no delay — verification runs silently after success toast. See `src/components/templates/main-app/projects/b2cView/index.tsx`.
- **GCP Budget Alert → Auto SAFE_MODE** — New `gcpBudgetAlertWebhook` Cloud Function receives Google Cloud Budget Pub/Sub notifications and automatically activates SAFE_MODE. Sends critical Telegram alert with cost details. Returns 200 even on error to prevent GCP retries. See `functions/src/index.ts`.
- **Alert Escalation** — New `alertEscalation` scheduled Cloud Function runs every 30 minutes. Finds unacknowledged critical alerts older than 30 minutes and sends "STILL UNRESOLVED" Telegram messages. Respects deploy mute window. Firebase cost: ~₹2/month.
- **Force Republish** — New `forceRepublish` callable Cloud Function for admin incident recovery. Finds active project for a store, touches the doc to trigger republish, then runs health verification. Accessible from ops dashboard Emergency Controls section with Store ID + Tenant ID inputs.
- **Store Health in Platform Admin** — Health column added to platform admin store list table. Shows green OK / orange WARNING / red FAILED tags based on `store.health.status` field written by the menu health monitor. Dash (—) shown for stores with no health data yet.
- **Publish Throttle** — `PUBLISH_OPERATION` rate limit config added (5 per 10 minutes per IP). Wired into messaging onboarding approve route. Uses existing Upstash pattern.
- **Launch Prerequisites Guide** — Comprehensive manual setup guide with step-by-step instructions for Telegram bot creation, GCP budget alerts, function deployment, feature flag enablement, and testing checklist. Includes cost breakdown and FAQ (Sentry vs UptimeRobot, why Telegram). See `__docs__/production-readiness/launch-prerequisites.md`.

### Fixed

- **Missing imports in alerts.ts** — `sendTelegramAlert` and `isAlertsMuted` were called but never imported. Would have caused runtime crash when any alert fires.
- **Mid-file import in functions/src/index.ts** — `publishVerification` import moved from line 478 to top of file with other imports.
- **Wrong import path in database/ops/index.ts** — Used `../firebaseClient` instead of `@lib/firebase/firebaseClient`.
- **Stale trigger type in firebase doc** — `menu-health-monitor_firebase.md` incorrectly stated `onDocumentUpdated` trigger, corrected to `onCall`.

### Improved

- **All 4 \_impl.md docs updated** — Status changed from "DOCUMENTED — Implementation pending" to "IMPLEMENTED — Feature flag OFF by default".
- **Incident response doc updated** — Ops Dashboard reference changed from "when built" to "✅ built".
- **Ops dashboard enhanced** — Added Force Republish section with input fields and confirmation modal.

---

## February 20, 2026

### New

- **Operational Infrastructure Implementation (4 Systems)** — Full implementation of four operational infrastructure systems, all feature-flag gated, centralized reusable utilities. (1) **SAFE_MODE Circuit Breaker** (`ENABLE_COST_PROTECTION`): Global killswitch for expensive AI operations. Checks `ops_config/system.SAFE_MODE` doc. Wired into 6 AI routes (image-generation, descriptions, translations, campaigns/generate, campaigns/caption, image-editing, batch-trigger). Fail-open design. Firebase cost: ~₹0.05/month. (2) **Telegram Alert Delivery** (`ENABLE_OPS_ALERTS`): Wired into existing `createAlert()` in alerts.ts. Fire-and-forget HTTP POST to Telegram Bot API. Deploy mute window support. Firebase cost: ₹0/month. (3) **Menu Health Monitor** (`ENABLE_MENU_HEALTH_MONITOR`): `verifyMenuPublish` callable Cloud Function. Checks HTTP 200 + non-empty response. Updates `store.health` field. Triggers alert on failure. Firebase cost: ~₹8/month at 50 stores. (4) **Ops Control Room** (`/ops`): Superadmin-only dashboard with system state, adoption pulse, integrity signals, recent alerts, emergency controls (SAFE_MODE toggle, alert mute). ~8 Firestore reads per load. Total monthly Firebase cost: ~₹8.27 at 50 stores. See [ops guide](./ops-infrastructure-guide.md). New files: `src/lib/ops/` (centralized utilities), `functions/src/monitoring/` (telegramAlert, deployMute, safeMode, publishVerification), `src/database/ops/`, `src/app/api/ops/`, `src/app/(main)/ops/page.tsx`, `src/components/templates/main-app/platform/opsControlRoom/`.
- **Launch Infrastructure Hardening (8 Documentation Sets)** — Comprehensive review of ChatGPT launch readiness conversation. Created 8 new documentation sets covering operational infrastructure for production launch. Systems documented: Menu Health Monitor (post-publish verification), Ops Alert Delivery (Telegram integration for existing alert framework), Cost Self-Protection (SAFE_MODE circuit breaker), Ops Control Room (/ops dashboard), Incident Response Protocol (P0/P1/P2 runbook), Production Readiness Checklist (pre-launch verification), Ownership Transfer (DEFERRED — architecture documented), Support Automation (DEFERRED — assessment only). 12 ChatGPT suggestions rejected as over-engineering (LKG, auto-retry, ops_runtime_events, ops_daily_cost, ops_baselines, write burst protection, 11 alert types, organization entity, self-healing, 6-hour cron, WRITE_LOCK, separate staging Firebase). 6 existing systems ChatGPT didn't know about validated (Upstash rate limiting, Sentry, alert framework, health checks, master scheduler, feedback protection). See [ChatGPT review](./__docs__/system-strengthening/_archive/chatgpt-review-launch-infra.md).
- **Operational Infrastructure Doctrine (Constitution §13)** — New constitution-level governance document establishing 7 laws for operational infrastructure: (1) Detection Before Discovery, (2) Cost Containment Non-Negotiable, (3) Alert on Patterns Not Instances, (4) Restore First Debug Later, (5) Support Volume = Product Clarity Metric, (6) Automation Amplifies Quality, (7) Stale but Visible > Broken. Defines P0/P1/P2 severity levels, cost protection hierarchy, and decision test for operational features. See [doctrine](./constitution/13-operational-infrastructure-doctrine.md).

- **Product Universe SSOT** — Single comprehensive document explaining the entire product universe: MenuList, Control Layer, GrowthOS, and KitStamp. Covers what each is, why it exists, who uses it, what's already built, market validation with industry statistics, competitive landscape, honest viability assessment, build sequence, and decision framework for future questions. Synthesized from 6 strategy docs, 3 constitution docs, and 4 ChatGPT review archives. Includes Cascade's honest take: MenuList (95% confidence, unequivocally build), Control Layer (90%, just keep improving MenuList), GrowthOS (70%, keep inside MenuList for now), KitStamp (40%, probably don't build). See [product universe](./strategy/product-universe-ssot.md).

---

## February 15, 2026

### New

- **Official Business Page (OBP)** — Every business now gets one official link (`yourbusiness.menulist.ai`) that shows business identity, live open/closed status, and a "View Menu" button. Customers see name, logo, hours, and contact actions in one clean page. Share it on WhatsApp, Instagram, Google, packaging — one link replaces PDFs, Zomato links, and screenshots. Always up to date. Feature flag: `ENABLE_OBP`. See [help doc](./official-business-page/official-business-page_helpdoc.md).

### Improved

- **TenantDataType Cleanup** — Separated account-level fields (tenantId, name, email, storesList) from platform-admin-only fields (logo, address, contact, locale). Store-duplicated fields made optional with clear documentation. Tenant is now explicitly an account container; store is the rendering source. See `src/types/platform/tenant.ts`.
- **Outlet Creation — Brand Identity Copy** — New outlets now inherit `logo`, `phoneNumber`, `currencyCode`, `currencySymbol`, `country`, `timeZone`, `defaultLanguage` from master store. Previously outlets were created without logo or contact info, requiring manual setup. See `src/app/api/outlets/create/route.ts`.
- **OBP Analytics** — OBP page views and action clicks (Call, WhatsApp, Directions) are now tracked using the same unified analytics system as the digital menu. Data stored in daily docs with virtual `projectId='obp'`. OBP metrics card added to Owner Dashboard showing 7-day views and action breakdown. See `src/lib/analytics/unified.ts` (OBP_VIEW, OBP_ACTION_CLICK events).
- **MobileShareScreen — OBP Link** — Official Business Link section with QR code, copy button, and QR download added to the top of MobileShareScreen. Gated by `ENABLE_OBP`. Owners can share their official link directly from phone.
- **Brand Propagation** — When a master store updates brand identity fields (logo, phoneNumber, currencyCode, currencySymbol, country, timeZone, defaultLanguage), changes automatically propagate to all outlets where `outletPolicy.allowBrandingOverride !== true`. Non-blocking. See `src/database/multiOutlet/brandPropagation.ts`.
- **OBP Analytics — Full Parity with Digital Menu** — OBP now has the exact same analytics depth as digital menu. Nightly CF produces weekly docs (`_obp_weekly_{week}`), monthly docs (`_obp_monthly_{month}`), and summary doc with `lifetime`, `weekly`, `monthly`, `previousWeek` namespaces + week-over-week % change. Frontend DAL fetches WTD, MTD, yesterday, historical weeks, lifetime — all using the same batch-read optimization as menu. Dashboard card shows This Week with change indicator, MTD, 4-week trend bars, action breakdown (Call/WhatsApp/Directions), and lifetime footer. Feature flag: `ENABLE_OBP_ANALYTICS` in `functions/src/constants/features.ts`.

---

## February 19, 2026 (Night)

### New

- **KitStamp Complete Product Strategy** — Comprehensive strategy document for KitStamp — a future commercial content preparation workspace producing Final Content Kits. Consolidates 24+ ChatGPT design topics into one master doc. Covers: canonical definition ("commercial content preparation workspace"), terminal artifact (Final Content Kit with ZIP structure), ICP lock (content operators at agencies), UI identity (workbench, not dashboard), 7 core features (Content Units, Draft Image/Text/Language, Versioning, Notes, Export), 9-category permanent kill-list, kit-based pricing, trust language (10 production-ready screens), error states, support model, audit layer, V2 expansion path, market research (TAM $36B, SAM $2.9-4.3B). Cross-checked against codebase: MenuList's existing AI Image Generation already implements ~70% of KitStamp's image capability. See [strategy](./kitstamp/README.md).
- **AI Image Generation Code Review (via ChatGPT + Expert)** — Validated existing AI Image Gen codebase. Found: debugger in production (batch-generation/route.ts:164), transaction logging disabled (route.ts:264), no batch size limit. Expert added 18-item development checklist to impl.md, defined USP ("Inline Menu Image Creation" with 3 pillars), scope freeze rules, UI language guidelines. ChatGPT's "too many choices" claim partially validated (count wrong, cognitive concern valid). See [review](./kitstamp/_archive/chatgpt-review.md).

---

## February 19, 2026 (Late Evening)

### New

- **GrowthOS Complete Product Strategy** — Comprehensive strategy document for GrowthOS — a future transactional execution engine that produces ready-to-use promotional content for SMBs. Consolidates 10 ChatGPT design documents into one master doc. Covers: executive intent, SMB reality model, problem taxonomy, output-first philosophy, product surfaces, 6 canonical use cases, workflow engine design, content quality rules, MenuList relationship contract, monetization (pay-per-kit), and kill criteria. Cross-checked against codebase: MenuList's existing Social Content Engine already implements ~60% of GrowthOS vision. Archived at [strategy](./growthos-addon/_archive/growth-execution-strategy-2026-05-31/README.md).
- **Product Separation Doctrine (Constitution 12)** — New governance document permanently locking the separation between MenuList, GrowthOS, and KitStamp. Ten rules: (1) Product identity lock — each answers exactly one question. (2) AI posture rules — Authority (MenuList), Delegate (GrowthOS), Assistant (KitStamp). (3) Time horizon lock — Continuous/Immediate/Deliberate. (4) Dependency direction — one-way read-only from MenuList outward. (5) Surface & UI firewall — no shared components. (6) Monetization separation — subscription/per-kit/per-project. (7) Language separation. (8) Failure isolation. (9) Priority order locked: MenuList #1, GrowthOS #2, KitStamp #3. (10) Red-Flag Test for feature assignment. See [doctrine](./constitution/12-product-separation-doctrine.md).
- **Product Positioning Map** — One-page strategic reference showing how MenuList (infrastructure), GrowthOS (execution), and KitStamp (preparation) form a vertical stack with separate jobs, time horizons, AI postures, surfaces, and monetization. Includes Red-Flag Test: "If it's a bit of all three → kill it." See [positioning map](./strategy/product-positioning-map.md).
- **AgentKits Marketing Repo Analysis** — Assessment of [aitytech/agentkits-marketing](https://github.com/aitytech/agentkits-marketing) (18 agents, 93 commands, 28 skills). Only ~15% relevant to SMB context. Extractable: copywriting frameworks, workflow structure patterns, brand safety rules. Not useful: enterprise marketing (lead scoring, CRO, email funnels, programmatic SEO). Archived at [analysis](./growthos-addon/_archive/growth-execution-strategy-2026-05-31/agentkits-repo-analysis.md).

---

## February 19, 2026 (Evening)

### New

- **Product Evolution Doctrine (Constitution 11)** — New governance document locking MenuList's 3-year product direction. Six rules: (1) Product sequence lock: MenuList → Control Layer inside → GrowthOS → KitStamp optional. (2) Customer-facing only boundary — PERMANENT: never POS/CRM/inventory/payroll. (3) "5-Minute Understanding" rule — non-tech SMB must understand purpose in 5 minutes without training. (4) "Calm, elite infrastructure" identity — simple surface, deep underneath, locked 3 years. (5) Silent autopilot design principle — owner updates once, correct everywhere. (6) Kill-switch philosophy for anything that adds complexity. See [doctrine](./constitution/11-product-evolution-doctrine.md).
- **Control Layer Strategy** — Comprehensive strategic framework documenting how MenuList evolves from "menu infrastructure" to "business truth infrastructure." Consolidates 18 ChatGPT design documents into single master doc. Maps 5 Control Layer Pillars (Business Identity Truth, Operational Public Truth, Menu & Offering Truth, Public Communication Layer, Presence Consistency Layer) to existing 6-Pillar CFI framework. Includes data model, authority hierarchy, surface control map, conflict resolution rules, rollout phases, failure scenarios, and strategic moat analysis. Cross-checked: 60-70% of vision already exists in codebase. See [strategy](./control-layer-strategy/README.md).
- **Growth Execution Strategy (DEFERRED)** — Future reference document for GrowthOS — the revenue execution engine that would sit on top of MenuList's truth infrastructure. Consolidates 9 ChatGPT design documents. Clearly marked as DEFERRED with explicit prerequisites (200+ active stores, >70% link adoption, founder unlock). Documents boundary rules: GrowthOS reads from truth layer, never writes. Archived at [strategy](./growthos-addon/_archive/growth-execution-strategy-2026-05-31/README.md).

---

## February 19, 2026

### New

- **Custom Domain Mapping (Vercel)** — Owners can connect their own domain (e.g., `yourbusiness.com`) to their MenuList page via Business Settings. End-to-end flow: enter domain → configure DNS (CNAME to `cname.vercel-dns.com`) → verify → live. Vercel API handles SSL certificates automatically. API: `POST/GET/DELETE /api/domain`. Requires `VERCEL_TOKEN` + `VERCEL_PROJECT_ID` env vars.
- **Architecture Decision Records (ADRs)** — All URL routing architecture decisions (ADR-1 through ADR-11) now documented with rationale in `url-routing-architecture_adr.md`. Future sessions read this first.
- **Agent Readiness — Enhanced AI Discovery** — Rebuilt `/llms.txt` with structured capability description following the llmstxt.org standard. AI assistants can now understand MenuList's data structure, schema.org types, and how to read business pages. New `/llms-full.txt` provides extended documentation with full data format details. Feature flag placeholder: `ENABLE_AGENT_DISCOVERY`. See [help doc](./agent-readiness-strategy/agent-readiness-strategy_helpdoc.md).
- **Customer-Facing Infrastructure — 6-Pillar Strategy** — Complete strategic framework defining how MenuList becomes silent stability infrastructure for SMBs. Six pillars: Presence Dominance, Truth & Accuracy, Reputation Protection, Trust Health Signal, Loyalty Health Signal, Risk/Decline Detection. Full doc sets (spec, impl, marketing, website, helpdoc, firebase, mobile-support) created for all six pillars. See [strategy overview](./customer-facing-infrastructure/README.md).
- **Business Health Signals (Pillars 4-6) — IMPLEMENTED** — Single-word health indicators for business owners. "Customer Trust: Strong", "Customer Loyalty: Stable", "Business Health: Watch". Privacy-safe aggregate computation from existing analytics data. Cloud Function: `healthSignalsComputation.ts` runs weekly (Sundays via masterScheduler). Desktop: `HealthSignalCards` in Owner Dashboard. Mobile: Health signals grid in `MobileDashboardScreen`. Type: `healthSignals` on StoreDataType. Feature flags: `ENABLE_TRUST_HEALTH_SIGNAL`, `ENABLE_LOYALTY_HEALTH_SIGNAL`, `ENABLE_RISK_DECLINE_DETECTION`. All flags OFF — awaiting real traffic (50+ visitors/week for 4+ weeks threshold).
- **Temporary Status Layer — IMPLEMENTED** — Quick temporary banners on OBP and digital menu ("Closed today", "Opening late", "Special menu only") with auto-expiry. Owner sets status via Business Settings (desktop) or More → Temporary Status (mobile). 4 status types: Closed Today, Opening Late, Special Menu, Custom. Auto-expires at owner-set time. API: `POST /api/store/temp-status` (set/clear). Banner: `TempStatusBanner` atom component. Desktop: `TempStatusCard` in Business Settings. Mobile: `MobileTempStatusScreen`. Feature flag: `ENABLE_TEMP_STATUS`. Zero additional Firebase reads. See [help doc](./temp-status-layer/temp-status-layer_helpdoc.md).
- **Reputation Protection — INFRASTRUCTURE BUILT** — Full review classification infrastructure built and ready. Types: `Review`, `ReviewState`, `ReviewClassification` in `src/types/reviews.ts`. Classification engine: rule-based (`classificationRules.ts`) with 5 states (benign, informational, negative_low/high_risk, volatile). API: `GET /api/reviews/states` returns boolean block/escalation flags. UI: `ReputationGuard` passive notice in Owner Dashboard. Feature flags: `ENABLE_REVIEWS_REPUTATION`, `ENABLE_AI_REPLY_ASSIST`. All OFF — blocked on GBP API access. AI Reply Assist upgraded from banned to allowed with mandatory owner approval. See [reputation protection impl](./reputation-protection/reputation-protection_impl.md).
- **Behavior Engineering — Presence Dominance Activation** — Micro-copy nudges across all share/link surfaces to replace owners' "send PDF" habit with "send MenuList link" reflex. Enhanced: OBPLinkCard, ShareModal, MobileShareScreen, post-publish success screen. New: BehaviorNudgeCard on dashboard home (dismissible). WhatsApp share now pre-fills "Here is our latest menu" with "(Always updated)" suffix. Feature flag: `ENABLE_BEHAVIOR_NUDGES`. Zero Firebase cost. See [behavior engineering docs](./behavior-engineering/README.md).
- **Intelligence Doctrine (Locked Strategy)** — Governing philosophy for business health signals (Pillars 4-6): "Learn silently from Day 1. Show only when confident. Never approximate." Placeholder messages instead of fake dashboards. Signals surface almost hidden, only when meaningful. See [intelligence doctrine](./intelligence-doctrine/README.md).
- **Decision B (LOCKED): Founder-Led Installation** — Strategic decision: first 20-50 premium SMBs get personal founder-led 5-Step Installation Ritual (identity install → WhatsApp reflex → Instagram bio → staff loop → QR placement). Validated by Superhuman Playbook (First Round Review, 2025). Primary KPI: % of stores fully installed in first 7 days (>80% = infrastructure). Feature freeze agreed until >70% adoption validated. See [behavior engineering spec — Decision B](./behavior-engineering/behavior-engineering_spec.md).
- **ChatGPT Session #5 Review — Infra-Level Features Assessment** — Full conversation review extracting 18 proposed infra-level features, anonymous visit intelligence deep-dive, and behavioral deepening topics. Cross-checked against codebase + web research. Key decisions: REJECTED cookie-based visitor tracking (DPDPA consent banner destroys QR UX), REJECTED "welcome back" personalization (uncanny, non-actionable), APPROVED post-save confidence reinforcement (P1), APPROVED schema health monitor (P2), APPROVED wrong info risk alerts (P2). 4 items already covered by existing docs. See [review doc](./strategy/_archive/chatgpt-session5-review.md).
- **ChatGPT Session #6 Review — Product Taste & Niche Focus** — Philosophical conversation reviewing two external posts (AI design taste, nicheless millionaire). 10 topics analyzed, 4 web searches. See [review doc](./strategy/_archive/chatgpt-session6-review.md).
- **Product Taste Doctrine (Constitution 09)** — New governance document for daily product decisions (UI, copy, flows, micro-interactions). Companion to Feature Rejection Gate (08) which covers formal features. Defines "taste" as product judgment, provides 5-question Taste Check for lightweight daily decisions, Builder Hierarchy (taste → judgment → systems → execution), Editor Mindset, Stage-Appropriate Execution, and Taste Anti-Patterns. Wired into IDE_PROMPTS and constitution index. See [doctrine](./constitution/09-product-taste-doctrine.md).
- **Communication & Worldbuilding Doctrine (Constitution 10)** — New governance document for all MenuList messaging, marketing, sales copy, and AI prompts. 9 Communication Laws: Reception > Expression, Enter Their World First, Worldbuilding Is Persuasion, Identity Mirroring, Cognitive Hospitality, One Core Argument, Stories Beat Statistics, Dissonance Creates Openness, Frame Shifts Over Arguments. Includes: restaurant owner psychological world map, 5-step Persuasion Sequence, AI prompt worldbuilding rules, surface application map (landing page / WhatsApp / OBP / outreach / in-product), communication anti-patterns, and the One-Line Test. Validated by Steven Pinker/Harvard, cognitive bias research. Wired into IDE_PROMPTS, constitution index, and reading order for all roles. See [doctrine](./constitution/10-communication-worldbuilding-doctrine.md).
- **Doctrine Preservation Check (Workflow Update)** — Added mandatory Stage 6 to `/chatgpt-review` workflow and Document Creation Prompt: after any conversation review, check if content contains doctrine-worthy guidance and create a proper constitution doc if yes. Prevents losing philosophical/strategic insights in review archives.

### Fixed

- **Domain Cache Invalidation (B6)** — Custom domain API routes (POST/GET/DELETE) were not calling `revalidateTag('client-stores')` after domain changes. This meant subdomain visitors could be redirected to a disconnected domain for up to 60 seconds. Now all domain operations invalidate the store cache immediately.
- **previousSlugs Unbounded Growth (B5)** — Repeated project renames could grow the `previousSlugs` array without limit. Now capped at 5 entries (oldest drops off). In practice, renames are rare (1-2 per project lifetime).
- **Reserved Slug Namespace Bypass (B7)** — A project renamed to a reserved word (e.g., "Reviews") could still be matched at `/reviews` via the name-based fallback resolver. Now the resolver skips reserved slugs during name-based matching, preserving the namespace for future platform surfaces.
- **Messaging Onboarding — Missing Subdomain** — WhatsApp-onboarded stores were created WITHOUT a subdomain field. Now auto-generated from business name (same as manual onboarding). Stores created via messaging onboarding now have working public URLs.
- **Messaging Onboarding — Missing Project Summary** — WhatsApp-onboarded stores had no `projectsSummary` entry, causing slug-based URL resolution to fail. Now created atomically during publish.
- **Messaging Onboarding — Wrong Public URL** — `publicUrl` in messaging onboarding was path-based (`menulist.ai/menu/{storeId}`) — this route doesn't exist. Fixed to subdomain-based (`{subdomain}.menulist.ai`).
- **Tenant-Level Subdomain Missing** — Neither onboarding flow stored `subDomain` on the tenant doc. Dashboard code couldn't get brand URL from tenant context without extra store read. Fixed: `subDomain` field + `subdomain` in `storesList` entries now set in both flows.
- **Variable Ordering Bug** — Manual onboarding used `autoSubdomain` variable before it was declared (would cause ReferenceError at runtime). Fixed declaration ordering.
- **Messaging Onboarding — Missing `isVerified` and `platformRole`** — WhatsApp-onboarded user docs were missing `isVerified: true` and `platformRole: 'OWNER'`. NextAuth `signIn` callback requires `isVerified` to allow login. Without `platformRole`, session defaulted to `"USER"` instead of `"OWNER"`. Fixed: both fields now set during publish.
- **Messaging Onboarding — No Login Path (CRITICAL)** — WhatsApp-onboarded owners received a dashboard link but literally could not log in. Their email was a placeholder (`phone@msg.menulist.ai`), no Firebase Auth user existed, and Google OAuth would create an unlinked new user. Fixed: implemented claim-account flow — publish generates a `claimToken`, dashboard URL includes `?claim=TOKEN`, login page detects token and guides owner to "Sign in with Google to claim your business", post-OAuth the claim API transfers tenant/store ownership to the Google account.
- **Session Role Always Undefined** — `getDatabaseUserForSession` sanitizer mapped `s?.roles` (plural) but Firestore stores `role` (singular). The session callback then read `.role` which was undefined. Fixed: sanitizer now keeps both `role` and `roles` fields.

---

## Auth & User Flow Audit

### New

- **User Profile Modal** — "My Profile" in header now opens a working modal with two sections: Edit Profile (name, phone) and Change Password. APIs: `POST /api/auth/update-profile`, `POST /api/auth/change-password`. Password change verifies current password via Firebase Auth REST API before updating.
- **Claim Account — Email/Password Setup (MODE 2)** — Messaging-onboarded owners can now claim their business via email/password instead of only Google OAuth. Login page shows both options when `?claim=TOKEN` is present. Creates Firebase Auth user via Admin SDK, sets custom claims, and converts placeholder user doc to real account. API: `POST /api/auth/claim-account` with `{ claimToken, email, password }`.
- **Server-Side Staff Creation API** — New `POST /api/auth/create-staff` endpoint creates Firebase Auth users via Admin SDK with a secure random password. Replaces the broken client-side `createUserWithEmailAndPassword(email, email)` which signed the admin out and used email as password.

### Improved

- **Role Sanitizer Cleanup** — Session sanitizer now only maps `role` (singular) per store. Removed `roles` (plural) — Firestore only stores `role: string` per `UserStoreMappingType`. One role per store per user, even in multi-chain.
- **Claim Token — No Expiry** — Removed 7-day expiry from claim tokens. Tokens are 256-bit cryptographic random (brute force impossible). Eliminates support dependency for expired tokens.

### Fixed

- **Staff Creation Signs Out Admin (CRITICAL)** — `createUserWithEmailAndPassword` on client side signed in as the new staff user, breaking the admin's Firebase Auth session. Both `userForm/index.tsx` and `platform/users/index.tsx` now use server-side API instead.
- **Staff Password = Email (SECURITY)** — Staff accounts were created with `password = email` — trivially guessable. Now uses 24-byte cryptographic random password. Staff receives password reset email to set their own password.
- **Platform Users Dead Code** — Removed unused `useEffect` that read `firebaseAuth.currentUser` but never used the result. Fixed TS compilation error.

### Improved

- **MinimalStoreDataType** — Added `subdomain` field so `storesList` entries carry brand subdomain info. Dashboard code can get brand URL from Redux state without extra Firestore read.
- **Onboarding Parity** — Both manual and messaging onboarding flows now create identical data structures (subdomain, subDomain on tenant, storesList entry with subdomain, projectsSummary with slug).
- **Subdomain Uniqueness Check** — Both onboarding flows now pre-check subdomain uniqueness against stores collection before transaction. If collision detected, appends `-{storeId}` suffix for guaranteed uniqueness. See ADR-9.
- **Client Resolver Data Source Fix** — Client page resolver now reads from `projectsSummary` document (1 read) instead of legacy metadata subcollection (N reads). This enables stored slug and previousSlugs lookup to actually work. Falls back to legacy collection if summary doesn't exist. See ADR-10.
- **Outlet Path Routing** — Multi-store brand URLs now resolve outlet slugs: `brand.menulist.ai/pune` finds the outlet store with `outletSlug === "pune"`. Supports two-segment paths: `brand.menulist.ai/pune/food-menu` routes to Pune outlet's "food-menu" project. See ADR-11.
- **Firebase Cost Optimization (6 fixes across all public surfaces):**
  - OPT-1: Eliminated redundant `getStoreById()` in OBP (saves 1 read/visit)
  - OPT-2: OBP `checkHasPublishedMenu` now reads `projectsSummary` (1 read) instead of legacy metadata (N reads)
  - OPT-3: OBP `countActiveStoresForTenant` now reads `storesSummary` (1 read) instead of full `stores` scan (N reads)
  - OPT-5: Eliminated redundant `getStoreById()` in client menu page (saves 1 read/visit)
  - OPT-6: Digital screen SSR reads now cached via `unstable_cache` (60s TTL) — saves ~5.8M reads/year at 1K screens
  - CDN: All public pages served with `s-maxage=60, stale-while-revalidate=300` — ~80% cache hit rate

---

## February 18, 2026

### New

- **Permanent Project Slugs** — Project URLs are now permanent. When you create a menu, the URL slug (e.g., `/food-menu`) is stored and never changes silently. If you rename a project, the old URL automatically redirects to the new one. QR codes and shared links always work. Feature flag: `ENABLE_STORED_SLUGS` (default: ON). See `__docs__/url-routing-architecture/README.md`.
- **Reserved URL Namespace** — Platform-reserved paths (`menu`, `reviews`, `feedback`, `order`, `admin`, etc.) are now blocked at project creation time. Prevents future conflicts when new platform features launch. See `src/constants/reservedSlugs.ts`.
- **Outlet URL Slugs** — New outlets automatically get a URL-safe `outletSlug` (e.g., "pune" from "Pune Store") for future brand-level path routing (`brand.menulist.ai/pune`). See `src/types/platform/store.ts`.

- **Subdomain Auto-Assignment** — New businesses automatically get a subdomain during onboarding (e.g., "Joe's Pizza" → `joes-pizza.menulist.ai`). Reserved names are blocked. Fallback to `name-{storeId}` if taken.
- **Subdomain Settings UI** — New "Subdomain" tab in Business Settings. Owners can view their current link, copy it, open it, and check availability of new subdomains. Outlet stores see an info message instead.
- **Subdomain Availability Checker** — `GET /api/subdomain/check?subdomain=xxx` validates format, reserved list, and Firestore uniqueness. Returns normalized subdomain and preview URL.
- **Brand OBP for Multi-Store Chains** — When a brand has multiple outlets and OBP is enabled, the root URL shows a store selector with all locations, open/closed status, and city info. Single-store brands see the normal OBP (no change).
- **Migration Script** — `scripts/backfill-project-slugs.ts` backfills `slug` field on all existing projects. Dry-run by default. Idempotent.

### Improved

- **CDN Cache Headers** — Public menu and business pages now include `Cache-Control: s-maxage=60, stale-while-revalidate=300`. Vercel Edge serves cached pages globally, reducing load times and Firebase reads.
- **URL Normalization** — Uppercase URLs are 301-redirected to lowercase. Trailing slashes are stripped. Prevents duplicate URLs in Google index.
- **Subdomain → Custom Domain Redirect** — When a store has both subdomain and verified custom domain, visitors to the subdomain are 301-redirected to the custom domain for SEO authority consolidation.
- **URL Routing Architecture Decision** — Corrected subdomain ownership model from accidental store-level to intentional brand-level. Subdomain is set on master store only; outlets use path segments. Zero migration risk (feature was unshipped). See `__docs__/url-routing-architecture/_archive/architecture-validation.md`.

---

## February 17, 2026

### New

- **Messaging Onboarding — Full Implementation** — Zero-friction SMB acquisition engine. Owners send menu photos via WhatsApp, system extracts menu via Gemini AI, generates preview, and publishes a live MenuList presence on approval. Provider-agnostic architecture (WhatsApp v1). 19 new files (~4,100 lines): webhook handler (`onRequest`), session engine (11-state machine), Asset Intelligence (Gemini validation), intake processor (scheduled every 2min with Fast Start logic), extraction watcher (`onDocumentUpdated`), publish pipeline (atomic Firestore transaction: tenant + store + user + project + summaries), event logger (35 event types, fire-and-forget), session cleanup (daily: expiry, 12h reminders, storage cleanup). Mobile-first preview page with editable business info, approve/fix actions. 3 API routes (GET preview, POST approve with double-publish protection + failure recovery, POST fix with max 3 corrections). 7 Firestore indexes, 3 admin-only security rules, 3 feature flags. Feature flag: `ENABLE_MESSAGING_ONBOARDING` (default: OFF). See [help doc](__docs__/messaging-onboarding/messaging-onboarding_helpdoc.md).

### Improved

- **Messaging Onboarding Documentation (v1.6 → v3.1)** — Completed full documentation-to-implementation pipeline. 6 ChatGPT reviews cross-checked, pre-implementation audit (codebase mapping), post-implementation review (4 bugs found and fixed: Fast Start logic, file size limit, noindex meta, preview UI). 139 test cases (97 P0). 13 ADRs. 8 implementation invariants. All 10 doc files updated to Implementation-Complete status.

---

## February 16, 2026

### New

- **Mobile Menu Upload (`MenuUploadSheet`)** — PWA-only users can now upload menu photos from camera or gallery. Full pipeline: capture → optimize (`optimizeImage`) → upload (`uploadFile`) → AI extraction (`createMenuProcessingJob`). Auto-creates project for first-time users. See `src/components/mobile/sheets/MenuUploadSheet.tsx`.
- **Mobile Delete Item** — Items can now be deleted from mobile via `ItemEditSheet` with confirmation dialog. Optimistic delete + background Firestore sync.
- **MobileShell Subscription Gate** — Users without valid subscription see upgrade prompt instead of empty shell. Uses `hasValidSubscriptionAccess()`.
- **Mobile Roles & Permissions (`MobileRolesScreen`)** — Owners can now manage staff roles entirely from phone. View roles, add custom roles, toggle individual/category permissions, delete roles. Uses same `updateStore({ roles })` DAL and `PERMISSION_CATEGORIES_CONFIG` as desktop. Accessible via More → Roles & Permissions. Key scenario: owner at home, staff at shop — owner needs phone control over staff access.
- **Full Mobile Billing (`MobileBillingScreen` rewrite)** — Replaced read-only billing screen with full plan management. View plan details, AI credits with progress bar, upgrade/change plan (Razorpay modal), buy credit packs, pause/resume/cancel subscription, billing history with invoice links. Uses same `usePaymentHandler` hook as desktop. Zero desktop dependency for billing.
- **Mobile Digital Screens (`MobileDigitalScreensScreen`)** — Owner can set up TV screens entirely from phone. Copy Menu Board and Highlights URLs, preview screens, toggle "Use my designs only" override. Uses same `getScreenState`, `initializeScreenState`, `updateScreenSettings` DAL as desktop.
- **Mobile Locations / Chain Control Panel (`MobileLocationsScreen`)** — Multi-outlet management from phone. View all outlets with billing summary, switch between stores, add new outlets with proration display, manage 15 outlet policy toggles (override control, local content, AI features, branding, language). Uses same `updateOutletPolicy` DAL and `/api/outlets/create` endpoint as desktop.
- **Mobile PDF Menu Download** — Added "Download Menu PDF" button to `MobileShareScreen`. Fetches project data on-demand via `getProjectsList` + `getProjectData`, then generates A4 PDF via `jsPDF` client-side. Owner can WhatsApp the PDF to their print shop.
- **Mobile Dashboard (`MobileDashboardScreen`)** — Analytics overview from phone. Status hero ("Your menu is working!"), WTD metrics (scans, clicks, Smart Picks), AI summary bullets, top items list, all-time footer. Uses same `useOwnerDashboard` SWR hook (1 Firestore read/day). Auto-selects first project.
- **Mobile Today (`MobileTodayScreen`)** — Daily campaign actions from phone. Primary campaign card with WhatsApp share, skip button, staff prompt for today, operational campaigns (max 2). Uses same `getTodayCampaigns`, `completeCampaign`, `skipCampaign` DAL. Feature-flagged via `SOCIAL_CONTENT_ENABLED`.
- **Mobile Staff (`MobileUsersScreen`)** — Staff management from phone. View user list with role tags, add new staff (name, email, phone, role), activate/deactivate users, view user detail sheet. Uses same `addPlatformUser`, `updatePlatformUser` DAL. Full HR details (commissions, employment, documents) show "use desktop" hint.
- **Mobile Transactions (`MobileTransactionsScreen`)** — AI credit usage history from phone. Infinite scroll list with action type, date, charge. Color-coded by action (image=blue, language=green, description=purple). Uses same `getPaginatedAiOperations` DAL with server-side pagination.
- **Mobile Help Center (`MobileHelpScreen`)** — Help access from phone. WhatsApp chat button, email support, 6 FAQ items, Knowledge Base link. Ticket submission redirects to desktop (complex form with attachments).
- **39 `_mobile-support.md` Files** — Every `__docs__/` feature folder now has a `_mobile-support.md` file with 4-gate admission test results and desktop → mobile feature mapping. Per Law 11 mandate.

- **SEO/AEO Discovery Infrastructure** — Schema.org structured data enriched across all public pages (OBP + digital menu). Business-specific `@type` (Restaurant, BeautySalon, CafeOrCoffeeShop, etc.), GeoCoordinates, social profile linking (`sameAs`), price range, availability status (`InStock`/`OutOfStock`), dietary info (`suitableForDiet`), and freshness signal (`dateModified`). Shared schema utilities eliminate duplication. Zero new Firestore operations — all computed at render time. See `src/lib/schema/index.ts`, `__docs__/seo-aeo-discovery-infrastructure/`.

### Improved

- **Mobile Empty State** — Menu screen no longer says "Create on desktop." Shows camera icon + "Upload Menu Photo" CTA for PWA-only users.
- **AddItemSheet Persistence** — Previously UI-only (items lost on refresh). Now saves to Firestore via optimistic update + background `updateProject()` sync.
- **Mobile-Support Documentation** — `mobile-operational-support_mobile-support.md` updated with full B2C View audit, Editor 4-gate feature mapping (20+ features), Menu Editor Constitution audit, and 14-step end-to-end PWA user journey.
- **Mobile Advanced Settings (`MobileAdvancedSettingsScreen`)** — Apple Settings-style grouped metadata screen covering Contact Person (name/email/phone), Social Media (6 platform URLs), and Feedback Settings (enable/disable, collect fields, Google Review URL). Auto-saves on blur. Uses same `updateStore` DAL as desktop `BusinessSettings`.
- **Mobile Bulk Actions (`BulkActionsSheet`)** — Simplified Menu Command Center for mobile. Two operations: Bulk Availability (mark available/sold out) and Bulk Show/Hide (permanently show/hide from menu). Multi-select with search, category grouping, and confirmation dialog. Uses same `updateProject` DAL. Bulk pricing and category moves remain desktop-only (complex multi-step UX).
- **Mobile Design Editor (`MobileDesignEditorScreen`)** — Full B2C UI Editor for mobile. Apple Settings-style form with: 3 Quick Start presets (Fresh & Clean, Warm & Cozy, Bold & Modern), Home Style selector (3 options), Menu Mood selector (5 options), Layout selector (4 options with mood compatibility), Brand Color picker (`ColorPickerSheet` with 8 presets + custom hex), Display Options (show images, category tabs), Service Charge note (140 char limit), Preview (opens actual menu URL), Publish button. Uses same `publishProject()` DAL, same `designSystem/index.ts` constants. Quick Start presets are a mobile-only feature that bundles home+mood+layout+color in one tap.
- **Mobile SEO & Analytics (`MobileSeoAnalyticsScreen`)** — Combined SEO + Analytics settings on mobile. SEO: tagline (100), meta title (60), meta description (160), canonical URL. Analytics: GA4 ID, Facebook Pixel ID, Search Console verification, plus 3 tracking toggles (enhanced ecommerce, menu views, customer locations). Auto-saves on blur. Uses same `updateStore` DAL and `storeDetails.analytics.*` fields as desktop `SeoTab` + `AnalyticsTab`.
- **Mobile Time Slots (`MobileTimeSlotsScreen`)** — Full CRUD for time slot presets on mobile. List view with color bars + time display. Add/edit via bottom sheet with name, start/end time pickers, color dots. Delete with confirmation + cascade removal from categories. Uses same `updateTimeSlotPresets()`, `generatePresetId()`, `removePresetFromAllCategories()` DAL as desktop `TimeSlotPresetsTab`.
- **Shared Logic Dedup (Desktop ↔ Mobile)** — Eliminated code duplication between desktop and mobile screens:
  - Extracted `OUTLET_POLICY_CATEGORIES` (15 policy toggle groupings) to `src/config/outletPolicy.ts` — was copy-pasted in both `OutletPolicyEditor` and `MobileLocationsScreen`
  - Extracted `getMealName()`, `getExportMethod()`, `getShortButtonText()` to `src/utils/campaignUtils.ts` — was copy-pasted in `PrimaryCard`, `OperationalSection`, and `MobileTodayScreen`
  - Moved `useTodayCampaigns` SWR hook to `src/hooks/useTodayCampaigns.ts` — pure DAL hook now shared by desktop `TodayScreen` and mobile `MobileTodayScreen`
  - Old desktop hook location re-exports with `@deprecated` marker for backward compatibility

- **Messaging Onboarding (Documentation v1.6 — Renamed + Multi-Provider + Tracking + Access Model + Business Type + Deep Cross-Check)** — Full documentation suite for Messaging Onboarding — MenuList's primary acquisition engine. Provider-agnostic architecture (WhatsApp v1, Telegram/LINE/Viber future-ready). Provider adapter layer (`IMessagingProvider`). Deep review: publish pipeline field mapping, email handling (`@msg.menulist.ai`), magic link login (ADR-8), extraction watcher (ADR-9), preview→publish connection (ADR-10). **Onboarding Observation Layer (§16):** MOL-inspired internal tracking with 35 event types, fire-and-forget logger, `messagingOnboardingEvents` collection (ADR-11). **Post-Publish Access Model (§17, ADR-12):** Free publish → 24h public grace → dashboard restricted → owner pays via existing Razorpay. Store fields: `onboardingSource`, `activationDeadline`. **Business Type Auto-Detection (§8.4, §17.8):** AI detects businessType from menu using existing `BUSINESS_TYPES`/`BUSINESS_CATEGORIES` from `src/data/shared/businessTypes.ts` (60+ types, 7 categories). Confidence-based fallback to Restaurant/food. Editable on preview page. 136 test cases across 14 categories (94 P0), 12 ADRs. Renamed from `whatsapp-onboarding` to `messaging-onboarding` (Feb 17, 2026). See [help doc](__docs__/messaging-onboarding/messaging-onboarding_helpdoc.md).

### Fixed

- **Feedback Badge Count** — `getFeedbackCount` returns a number directly, not an object. Fixed `result?.count` → `typeof result === 'number' ? result : 0`. Badge was always showing 0.

---

## February 14, 2026

### New

- **Mobile Operational Support (v1.0 + Phase 2)** — Purpose-built mobile UI shell for daily business operations. 13 mobile screens across Phase 1 (Menu, Item Edit, Add Item, Hours & Status, Feedback Inbox, Feedback Detail, Share & QR, Public Info, Billing, More) and Phase 2 (Basic Settings, Locale Settings, Working Hours Editor). Camera image upload for item photos. Real QR code rendering via `qrcode.react`. Feedback badge count on navigation. Today Actions (WhatsApp status share). "Return to Mobile" banner for desktop escape hatch. All DAL calls wired: `getProjectsList`, `getProjectData`, `updateProject`, `getFeedbackList`, `getFeedbackCount`, `updateFeedbackStatus`, `updateStore`. Feature flag: `ENABLE_MOBILE_UI` (default: OFF). Desktop codebase completely untouched. See [mobile doctrine](__docs__/mobile-operational-support/02-mobile-ui-doctrine.md) and [PWA analysis](__docs__/mobile-operational-support/08-full-pwa-mobile-analysis.md).
- **Mobile Review Workflow** — New `/mobile-review` workflow for in-depth cross-checking of mobile implementation against 12 UI laws, architecture rules, screen specs, navigation spec, and settings/auth/localization inheritance. 61-point verification checklist across 9 phases.
- **Law 11: Mobile Support by Default** — New absolute law in Master Rules. Every new feature must have `[feature-name]_mobile-support.md` document with Feature Admission Test results (4 gates: Frequency, Speed, Touch, Value). Added to Master Rules, Document Creation Prompt, all relevant workflows.
- **Mobile Support Rules** — New `.cascade/rules/MOBILE_SUPPORT_RULES.md` with 10 mandatory rules covering architecture, settings inheritance, auth, localization, icons, ICP compliance, and optimistic updates.
- **Menu Correctness Engine (MCE) v3.1** — Implementation complete. Validation layer that checks menu data correctness on every save. CSR validates against 5 Correctness Laws (17 rules total) and stamps `_mce` verification metadata on the existing project document. Publish-Gate blocks "Continue to UI Editor" when critical validation fails. 4 new files (1,015 lines), 5 modified files. Zero new Firestore collections, zero additional Firebase cost. `sanitizeForClient()` strips `_mce` from customer-facing surfaces. Feature flag: `ENABLE_MCE` (default: OFF). See [help doc](./menu-correctness-engine/menu-correctness-engine_helpdoc.md).

### Improved

- **POS Webhook Sync** — Reduced from 5 to 2 server-side API routes. Moved `regenerate-secret`, `delivery-history`, and `send-instructions` to client-side Firestore operations. Only `test` and `deliver` remain server-side (required for outbound HTTP to external URLs). Added `posSync` field to `StoreDataType`. Wired `triggerPosSyncDebounced` into Editor.tsx `syncChanges` for automatic menu sync on save. Added Architecture Decision Record (8 ADRs) to `_impl.md` documenting all design decisions with rationale. See [impl doc](./pos-webhook-sync/pos-webhook-sync_impl.md).
- **Menu Command Center** — Added "Show or Hide Items" as 4th bulk action. Permanently show or hide items from the customer menu in bulk. The standalone "Show or Hide Items" action has been removed from "More Actions" popover — all bulk operations are now consolidated inside the Command Center. See [help doc](./menu-command-center/menu-command-center_helpdoc.md).

---

## February 13, 2026

### New

- **Menu Command Center** — Bulk update prices, availability, and categories for many items at once. Three-panel command center modal with live preview, safety guardrails (max +200%/-80%, no zero prices, auto-rounding), 30-second undo, and multi-action session support. Access via "More Actions" → "Menu Command Center" in the editor. See [help doc](./menu-command-center/menu-command-center_helpdoc.md).
- **POS Webhook Sync** — Menu changes automatically reach your POS system via secure webhook. Full snapshot delivery, store-level configuration, HMAC-SHA256 signed payloads, 25-second debounce, and setup tools for POS providers. New "POS Sync" tab in Business Settings with toggle, webhook URL config, signing secret, test button, delivery history table, and instruction sender. Feature flag: `ENABLE_POS_SYNC`. See [help doc](./pos-webhook-sync/pos-webhook-sync_helpdoc.md).
- **OutletPolicy UI Editor** — New `OutletPolicyEditor` component in Chain Control Panel (`/locations`). Master owners can toggle all 15 OutletPolicy flags grouped by category (Override Control, Local Content, AI Features, Branding, Language). Each toggle saves immediately to Firestore via new `updateOutletPolicy()` DAL function. Only visible when outlets exist.
- **Law 9: Doc Staleness Sweep** — New absolute law in Master Rules mandating ALL doc types (`_firebase.md`, `_helpdoc.md`, `_website.md`, `_marketing.md`, `_spec.md`, `_impl.md`) are checked during any cross-check or review — not just impl/spec. Added to `IDE_PROMPTS/00. MASTER RULES & WORKFLOW.md`, `/final-review` workflow (Phase 1B), and `IDE_PROMPTS/9. FINAL-VARIFICATION.md`.

### Improved

- **Multi-Chain Permissions docs rewritten** — Complete rewrite of `multi-chain-permissions/` folder from codebase truth. New spec covers both layers: 23 RolePermissions (staff-level) + 15 OutletPolicy (chain-level). Old v1 docs (StaffRole/checkAccess architecture that was never built) archived to `_archive/`.
- **Production testing guide indexed** — `production-testing-guide.md` added to `__docs__/README.md` and `__docs__/index.md` for discoverability.
- **Full doc audit across 4 features (32+ files)** — Comprehensive staleness sweep of `multi-chain-permissions/`, `roles-permissions/`, `multi-outlet-consistency/`, and `stores-management/`. Every doc file checked for date, accuracy, and cross-references.
- **Firebase docs rewritten** — All 4 feature `_firebase.md` files rewritten from codebase truth with accurate reads/writes/deletes, DAL functions, and cost analysis.
- **Helpdocs overhauled** — All 4 feature `_helpdoc.md` files updated: correct role counts (3+custom), correct permission counts (23 RolePermissions + 15 OutletPolicy), accurate UI paths, two-layer model cross-references, and terminology bridge ("Projects" = "Menus" in dashboard).
- **Website docs updated** — All 4 feature `_website.md` files dated and updated with current feature descriptions.
- **Marketing docs updated** — `multi-chain-permissions_marketing.md` corrected (role/permission counts), `multi-outlet-consistency_marketing.md` pricing fixed (quantity-based Razorpay model, no longer "TBD"), sales enablement converted to proper TODO table.
- **Store onboarding docs status updated** — 3 store-onboarding docs (`_spec.md`, `_impl.md`, `_billing_impl.md`) status changed from "AWAITING REVIEW"/"READY FOR EXECUTION" to "✅ Production Ready".
- **Large doc post-implementation notes** — Added cross-reference headers to 5 large pre-implementation docs (`multi-outlet-consistency_spec.md` 666L, `_impl.md` 1849L, `_test-cases.md` 1619L, `_verification.md` 440L, `_ai-extraction.md` 1767L) noting what was added during implementation.
- **OutletPolicy enforcement model documented** — `multi-chain-permissions_impl.md` §4 now documents that 9/15 OutletPolicy flags are enforced via `applyOutletPolicy()` and 6/15 are enforced at UI/editor level directly. Table explains why and where each unmapped flag is enforced.
- **OutletPolicy spec grouping fixed** — Spec now uses 5 groups (matching `OutletPolicyEditor` UI) instead of 6. `allowProjectDeactivate` moved from "Structural" to "Local Content".
- **Stores-management impl roles issue resolved** — "No Default Roles on Manual Creation" marked as ✅ RESOLVED. Store schema corrected: `roles` field is now auto-populated by `createDefaultRoles()`.
- **Adding-new-permissions guide expanded** — 2 new steps added: update `rolesPermissionsInitialData.ts` (step 4) and `applyOutletPolicy.ts` mapping if OutletPolicy-relevant (step 5).
- **Customer terminology bridge** — "Projects" = "Menus" terminology note added to `multi-outlet-consistency_helpdoc.md` and `client-menu_helpdoc.md`. Developer language replaced with customer language where possible.
- **Stores-management helpdoc expanded** — Added missing basic store setup guides: "How to update your store name and logo" and "How to update your address and contact info".
- **Availability override risk documented** — Warning added to spec and helpdoc: if `availabilityOverride: false`, outlets can't mark items sold out, risking customer orders of unavailable items.
- **Client menu multi-outlet cross-reference** — `client-menu_helpdoc.md` now links to multi-outlet documentation for chain customers.

### Fixed

- **Missing permissions in custom role initial data** — `RolesPermissionsInitialData` was missing `canManageOutlets` and `canSwitchStores`, causing custom roles to have `undefined` for those 2 permissions instead of `true`.
- **roles-permissions spec 21/23 permissions** — Permission matrix was missing `canManageOutlets` and `canSwitchStores`. Now shows all 23.
- **roles-permissions impl "21 permissions" comment** — Code snippet said "all 21 permissions" — corrected to "all 23 permissions".
- **multi-chain-permissions impl wrong PERMISSION_LABELS file reference** — §3 pointed to `rolesPermissionsInitialData.ts` but labels are in `src/constants/permissions.ts`.
- **Marketing forbidden claims contradiction** — "Granular per-user permissions" contradicted objection handling ("Yes, assign different roles"). Changed to "Per-action approval workflows" — what we actually don't support.
- **Helpdoc save/apply contradiction** — "Changes save immediately and apply on next outlet login" was contradictory. Clarified: "save to your account immediately; staff see updated permissions when they next refresh or log in".

---

## February 12, 2026

### New

- **Multi-Outlet Store Onboarding (Feature #4C)** — Complete outlet creation pipeline: billing-first orchestration with Razorpay quantity-based pricing, atomic lock acquisition via Firestore transaction, internal store creation with project propagation, and billing revert on failure. API routes: `POST /api/outlets/create`, `POST /api/outlets/deactivate`, `POST /api/auth/switch-store`. Feature flags: `ENABLE_OUTLET_CREATION`, `ENABLE_OUTLET_BILLING`, `ENABLE_OUTLET_DEACTIVATE`, `ENABLE_CHAIN_CONTROL_PANEL`.
- **Chain Control Panel** — New "Locations" page (`/locations`) for master store owners. Shows billing summary (cost per store, total chain cost), outlets table with status badges, and "Add Outlet" button. Gated by `ENABLE_CHAIN_CONTROL_PANEL` and `isMasterUser`.
- **Store Switcher** — Header dropdown for master users to switch between HQ and outlet stores. Calls `/api/auth/switch-store` with session context update.
- **Add Outlet Modal** — Confirmation modal showing prorated billing impact before outlet creation. Collects outlet name, displays estimated charge for current cycle.
- **Outlet Context Banner** — Persistent yellow banner when master user is viewing an outlet: "You are viewing [outlet] — Changes here affect only this outlet" with "Back to HQ" button.
- **Outlet Subscription Fallback** — Outlets without their own subscription automatically inherit the master store's active subscription. `getActiveSubscriptionForStore()` now checks master store as fallback via `getMasterStoreIdFromList()`.
- **Project Propagation** — When master store creates a new project, `propagateNewProjectToOutlets()` auto-creates linked outlet projects with `masterProjectId` reference.
- **Outlet Permissions** — New `canManageOutlets` and `canSwitchStores` permissions added to `RolePermissions`. Owner gets both, Manager gets `canSwitchStores` only, Staff gets neither. Permissions gate `StoreSwitcher`, `LocationsPage`, and `Add Outlet` button.
- **Outlet Policy Enforcement** — `applyOutletPolicy()` utility merges `RolePermissions` with master store's `OutletPolicy`. Applied in `sessionProvider` for non-master stores. Outlet users automatically lose `canManageOutlets`, `canAddStores`, `canAccessBilling`, `canManageSubscription`.

### Improved

- **Reconciliation migrated to Firebase Functions** — Moved subscription reconciliation from Vercel API route (`/api/internal/reconcile-subscriptions`) + Vercel Cron to Firebase Cloud Function (`functions/src/billing/reconcileSubscriptions.ts`). Now runs as part of the existing nightly scheduler at 2:30 AM UTC alongside Decision Blocks, Menu Intelligence, and other jobs. Benefits: 540s timeout (vs Vercel's 10s), no extra cron infrastructure, same service account as other Firebase jobs. Feature flag: `ENABLE_SUBSCRIPTION_RECONCILIATION`. Requires `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET` as Firebase secrets.
- **ActiveSubscriptionCard quantity display** — Billing card now shows `quantity × price` when subscription has multiple stores (BT10). Shows per-store breakdown below total.
- **Onboarding sets isMaster** — First store in a tenant is automatically marked as master (`isMaster: true`) during onboarding. Subscription created with `quantity: 1`.
- **OutletPolicy unified type** — Merged `StorePermissions` and `OutletCapabilities` into single `OutletPolicy` interface with `DEFAULT_OUTLET_POLICY`. Deprecated aliases kept for backward compatibility.
- **Firebase cost tracking updated** — `multi-outlet-consistency_firebase.md` expanded with all Feature #4C operations: 13 new reads, 17 new writes, 2 external API calls, 5 DAL functions documented.

### Fixed

- **Unused import in LocationsPage** — Removed unused `calculateProration` import and `proration` variable from Chain Control Panel page.
- **Duplicate project IDs in propagation** — `propagateNewProjectToOutlets()` and outlet create route's tx loop could generate identical project IDs when multiple projects exist. Fixed by appending loop index to timestamp-based ID.
- **Sidebar Locations visible to non-master users** — "Locations" nav item was shown to all users. Now filtered by `isMasterUser` and `ENABLE_CHAIN_CONTROL_PANEL`.
- **Deactivate route missing tenant storesList update** — Deactivating an outlet updated store doc and storesSummary but not `tenantDetails.storesList`. Client-side state was stale until full refresh.
- **Missing permission labels in rolesPermissionsInitialData** — `PERMISSION_LABELS` record was missing `canManageOutlets` and `canSwitchStores`, causing TypeScript error.

---

## February 11, 2026

### New Features

- **Subscription State Machine** — Centralized transition validator (`src/lib/billing/subscriptionStateMachine.ts`) governs all subscription status changes. Applied as guard to all 7 webhook cases, 5 API routes, and DAL auto-expire. Logs warnings for invalid transitions without blocking (Razorpay is authoritative). Prevents impossible state combinations at scale.
- **Daily Reconciliation Job** — New internal API route (`/api/internal/reconcile-subscriptions`) syncs Firestore with Razorpay daily at 03:00 UTC via Vercel Cron. Compares status, cycle dates, paid count, and renews-on. Protected by `CRON_SECRET`. Safety net for webhook failures.
- **Shared Billing Utilities** — Extracted `getPlanDetailsFromConstants()` and `getSubscriptionEndDate()` from webhook and verify-subscription routes into shared `src/lib/billing/billingUtils.ts`. Eliminates code duplication (Pattern 1: Redundancy Elimination).

### Improved

- **DAL Refactored to 3-Layer Composition** — `getActiveSubscriptionForStore()` split into `fetchSubscriptionRaw()` (pure query), `expireIfGracePeriodEnded()` (isolated mutation), and orchestrator. Reduces blast radius of auto-expire bugs.
- **Billing Immutability Rule** — `@immutable` documentation added to `FirestoreSubscriptionDoc` type. Documents the 4 authorized write channels (webhook, API routes, reconciliation, DAL auto-expire).
- **Pre-Freeze Testing Matrix** — 26-test matrix added to architecture doc (Section 15) covering INR, USD, edge cases, and security tests. All must pass before billing freeze.

### Fixed

- **Debug console.log removed** — Production debug log in `src/utils/razorpay.ts` was logging sensitive `pastDueTimestamp` data on every grace period check. Removed.

- **Pause/Resume Subscription** — Full implementation of Razorpay Pause/Resume flow. New API routes (`/api/razorpay/pause-subscription`, `/api/razorpay/resume-subscription`), webhook handlers for `subscription.paused` and `subscription.resumed`, new `"paused"` PaymentStatus, DAL query updated to include paused subscriptions, frontend Pause/Resume buttons on ActiveSubscriptionCard with status tag and info text. Follows existing security patterns (withAuth, verifyTenantAccess, tenant isolation).
- **Plan Downgrade** — PricingPlansModal now shows all plans except current (previously only showed higher plans). Button text shows "Change Plan" for lower-tier plans and "Upgrade" for higher-tier. Uses same cancel+new-sub backend flow as upgrades — no new API routes needed.

### Fixed

- **Webhook: `subscription.pending` handler** — Previously fell to default (unhandled) case. Now explicitly sets `status: "past_due"` and records `pastDueSinceAt` when Razorpay is retrying a failed payment. Dual-path handling: works with both payment entity (from `payment.failed` co-firing) and subscription entity (from `subscription.pending`/`subscription.halted` without payment).
- **Webhook: `lastWebhook` field never updated** — Added `lastWebhook: { event, timestamp }` to ALL webhook update payloads (payment.failed, subscription.pending, subscription.halted, subscription.activated, subscription.charged, subscription.completed, subscription.cancelled, subscription.paused, subscription.resumed).
- **Webhook: billingHistory idempotency** — Added duplicate payment ID check before appending to `billingHistory` array. Prevents duplicate entries on webhook retries.
- **BillingHistory: Invoice button condition** — Fixed condition that required both `invoiceUrl` AND `invoiceId` to show button. Now shows button when `invoiceUrl` alone exists.

### Changed

- **`PaymentStatus` type** — Added `"paused"` to union type.
- **`getActiveSubscriptionForStore` DAL query** — Added `"paused"` to status filter so paused subscriptions still show as active entitlements.
- **Subscription `total_count`** — Changed from `1`/`24` to `3`/`36` (yearly/monthly) in both `create-subscription/route.ts` and `onboarding/create-subscription/route.ts`. Enables auto-renewal for up to 3 years.
- **`razorpay_impl.md`** — Updated §23 audit with all implementation statuses (8/8 findings resolved). Added §23.10 International Payments Activation Checklist. Updated §24 backlog (8 items completed, 3 remaining).

---

## February 10, 2026

### Documentation

- **Razorpay Official Docs Audit** — Deep cross-reference of entire Razorpay implementation (8 API routes, 5 library files, webhook handler, types, DAL) against official Razorpay documentation. Verified: subscription lifecycle (7/9 states handled, 2 are backlog pause/resume), webhook signature validation (HMAC-SHA256 + raw body correct), date handling (all Unix→Timestamp conversions correct), currency handling (INR/USD with separate plans per currency), payment retry/dunning (Razorpay auto-retry + our 7-day grace period), cancel flow (immediate cancel by design, local access until cycle end). Findings: (1) `subscription.pending` webhook not explicitly handled — P1 fix ~10 lines, (2) `lastWebhook` field never updated — P2, (3) webhook idempotency not enforced for billingHistory/statuses arrays — P2, (4) invoice download button missing in billing history UI — P2. Confirmed design choices: cancel+new-sub for upgrades (vs Razorpay Update API), immediate cancel (vs cancel_at_cycle_end), yearly total_count=1 (manual renewal). Updated backlog from 6 to 11 items with priorities. Added to `razorpay_impl.md` §23.
- **AI Enhancement Packs — ChatGPT Feedback Audit** — Audited 6 feedback points from external ChatGPT review against codebase. Result: 0 code changes needed. 2 points already handled by existing architecture (margin adjustment via `AI_UNIT_COSTS`, 6-layer abuse protection). 2 points rejected (dormant accounts already handled by subscription lifecycle, internal variable rename would require Firestore migration). 1 improvement added to backlog (AI Cost % of Revenue metric for admin dashboard). 1 flagged for founder decision (pack naming). Updated spec §Risks with detailed abuse math, dormant account analysis, and margin management strategy. Updated impl with admin dashboard backlog.
- **AI Enhancement Packs — ICP & Pricing Psychology** — Extracted product insights from ChatGPT ICP alignment review into three docs. Spec: added 80/15/5 SMB usage segmentation, cognitive/emotional load tests, Chai Shop Test (founder benchmark), critical failure modes, pricing psychology (real-world cost comparison vs designers/agencies), Indian SMB psychology, pack pricing sweet spot (₹1.5k–₹3k), India vs Global pricing architecture rules. Billing Explainer: added yearly Pro plan margin simulation (₹14,990 revenue vs ₹1,320 cost = 91% margin at heavy usage), unit cost sweet spot analysis (why 5 credits/image is correct). Marketing: added real-world competitive frame, Indian SMB buying psychology, India vs Global sales positioning.

### Fixed

- **Monthly Credit Reset Bug** — `monthlyCredits` was set at subscription creation but never reset on renewal. Monthly subscribers kept depleted balances after paying again; yearly subscribers had no monthly reset at all. Fixed with two-layer approach: (1) webhook resets credits on `subscription.charged`, (2) lazy reset in `checkAICapacity()` handles yearly plans and acts as safety net. New `creditsLastResetMonth` field tracks last reset using billing-period-aware YYYYMM key (based on subscription anchor day, not calendar month). Anchor day capped to days-in-month for month-end edge cases (e.g., anchor=31 in Feb→28). Old subscriptions without the field get reset on first AI call.

### Changed

- **`FirestoreSubscriptionDoc`** — Added optional `creditsLastResetMonth?: number` field for credit reset tracking.
- **Webhook handler** — `subscription.activated`/`subscription.charged` now resets `monthlyCredits` to `monthlyCreditsAllowance` and sets `creditsLastResetMonth`.
- **All subscription creation routes** — Now set `creditsLastResetMonth` at creation (create-subscription, onboarding, verify-subscription).

---

## February 9, 2026

### New

- **AI Deep Tracking** — Every AI operation now logs `realCostPaise`, `ourChargePaise`, and `marginPaise` in the transaction document. Enables per-operation profit/loss analysis across all 6 AI API routes (descriptions, image-generation, image-editing, batch-generation, translations, new-item-metadata).
- **Real-Time Balance Sync** — AI API responses now include `remainingBalance` with updated `monthlyCredits` and `topUpCredits`. Frontend services dispatch a `CustomEvent('ai-balance-update')` and `SessionProvider` updates `activeSubscription` state automatically. Eliminates 1 Firestore read per AI operation on the frontend.
- **Balance Sync Utility** — `src/services/ai/balanceSync.ts` provides `syncBalanceFromResponse()` called by all 5 frontend AI services after parsing API responses.
- **IMAGE_EDITING Action Type** — Added `IMAGE_EDITING` to `AI_ACTIONS_TYPES` constant, replaced hardcoded `'image_editing'` strings in route and unit costs.

### Improved

- **Stripe Fully Removed** — All Stripe code permanently deleted: `billingStripe/` folder (10 files), 4 API routes (`/api/subscriptions/*`, `/api/webhook/`), `lib/stripe.ts`, `database/subscriptions/stripe.ts`, `/billing/success/page.tsx`. Removed `stripePriceId` from all plan/pack interfaces and data. Razorpay is now the sole payment provider.
- **AI Unit Cost Calibration** — `src/constants/AI/unitCosts.ts` updated with real Gemini API pricing (Feb 2026). Added `GEMINI_COST_USD` map, `getRealCostPaise()`, `getOurChargePaise()`, and `CHARGE_PER_UNIT_PAISE` for margin calculation. Margins range 16x–300x depending on operation.
- **consumeAICapacity returns balance** — `consumeAICapacity()` in `src/lib/ai/capacityCheck.ts` now returns `RemainingBalance` interface (`{ monthlyCredits, topUpCredits }`) instead of void, enabling the balance sync pattern.

### Documentation

- **AI Billing Explainer** — Created `__docs__/ai-enhancement-packs/AI_BILLING_EXPLAINER.md` with complete founder-friendly explanation: money flow, real margins, per-pack economics, capacity enforcement, code locations, 5 real-world sample scenarios (restaurant, salon chain, capacity exhaustion, free operation, monthly margin snapshot), and free tier strategy analysis.
- **Razorpay Payment Flow** — Created `__docs__/razorpay/RAZORPAY_PAYMENT_FLOW.md` documenting all existing Razorpay capabilities, mapping of deleted Stripe files to Razorpay equivalents, and future enhancement backlog.
- **AI Enhancement Packs impl doc updated** — Removed dead Stripe code sections (now deleted), added Real-Time Balance Sync architecture section with full flow diagram.
- **AI Enhancement Packs firebase doc updated** — Added `realCostPaise`, `ourChargePaise`, `marginPaise` to document schema. Added Balance Sync Optimization section.

### Improved

- **Decision Intelligence — scoring constants consolidated** — `decisionBlocksScoring.ts` now imports `WEIGHTS`, `QUICK_PICK_THRESHOLDS`, `DEFAULT_DURATIONS`, and `normalize()` from the shared `scoreNormalizer.ts` module instead of defining them locally. Single source of truth for all scoring constants.
- **Decision Intelligence — dead types removed** — Removed `SCORING_WEIGHTS` (had incorrect values not matching actual Cloud Function weights), `DisplayBlock`, `DisplayBlocks`, `MenuItemStatsDaily`, and `MenuItemStatsAggregated` from `decisionBlocks.types.ts` — none were imported anywhere.
- **CMI — types comment accuracy** — Fixed misleading comment in `intelligence.ts` that referenced non-existent "Zod schemas". Clarified that Cloud Functions use Firestore `Timestamp` while frontend uses `Date`, with DAL converting on read.
- **Decision Intelligence — scheduler duplicate analytics reads** — `computeForProject()` queried analytics internally, then `fetch7DayAnalytics()` queried the same data again for CMI. Refactored to fetch analytics once and pass to both DI scoring and CMI computation. **Saves ~7 reads per project per nightly run** (~210K fewer reads/month at 1000 projects).

### Fixed

- **Decision Intelligence — recommendation click scoring bug** — `computeForProject()` in `decisionBlocksScoring.ts` was reading `decisionBlockClicksByItem` from analytics, but analytics actually writes `recommendationClicksByItem`. This field name mismatch meant the 2x click weighting for Decision Block interactions **never executed** — recommendation clicks were silently ignored in scoring. Fixed to read the correct field.
- **Decision Intelligence — analytics silently dropped** — `DecisionBlocks.tsx` called `trackDecisionBlockClick` and `trackDecisionBlocksRendered` without `projectId`/`tenantId`/`storeId`. Since `trackAnalyticsEvent` requires these IDs, **all Decision Block click and render events were silently skipped** — never written to Firestore. Fixed by adding `analyticsIds` prop to `DecisionBlocks` and passing IDs from `menuPageNew.tsx`.
- **DI firebase doc — wrong function name + schedule time** — Function was listed as `decisionBlocksScoring` at "02:00 local"; corrected to `computeDecisionBlocksScores` at "02:30 UTC" per actual cron `'30 2 * * *'` with `timeZone: 'UTC'`.
- **CMI spec — internal time contradiction** — Executive summary said "02:00 local store time" while FR-1 and architecture diagram correctly said "02:30 UTC". Fixed to match.
- **DI logic-verification — stale references** — Updated source files truth table (LOC counts, added `scoreNormalizer.ts`), updated WEIGHTS file:line references, added note about line shift.

### Documentation

- **AI Enhancement Packs — full documentation suite** — Created 6 production-ready documents: spec (pricing model, doctrine compliance, dispute stress tests), impl plan (4-week implementation with exact file paths and code changes for all 6 API routes), Firebase cost tracking (read/write estimates, reconciliation strategy, security rules), marketing collateral (sales scripts, objection handlers, email templates), website content (landing page copy, FAQ, SEO metadata), and help documentation (customer-facing, 2-second comprehension rule). All documents follow language governance — zero credit/token/unit exposure to customers. ChatGPT conversation cross-referenced and reviewed in `_archive/chatgpt-review.md`.
- **Decision Intelligence feature LOCKED** — All 8 docs updated to 🔒 LOCKED status. File structure updated to include shared intelligence modules. Document history added. README doc table expanded to include all 7 content layers.
- **Continuous Menu Intelligence feature LOCKED** — All 8 docs updated to 🔒 LOCKED status. Firebase doc corrected: fixed non-existent function names (`nightlyIntelligenceJob` → `computeDecisionBlocksScores`), wrong feature flag (`ENABLE_CONTINUOUS_INTELLIGENCE` → `MENU_INTELLIGENCE_ENABLED`), and inaccurate DAL function table. README doc table expanded to include all 7 content layers. Document history added.

---

## February 8, 2026

### New

- **Digital Screens v2.2 — Metadata Enrichment** — Item descriptions and dietary badges (Veg/Non-Veg) now display on both Menu Board and Highlights modes. Data flows from existing menu through the screen pipeline automatically.
- **Architectural Boundaries** — Permanent constraints documented for Digital Screens: no analytics, no customization, no management UI, no separate pricing, no further polish.
- **Readability First Constraint** — Minimum font sizes, contrast ratios, and decorative element rules documented for restaurant screen viewing at 2m+ distance.

### Improved

- **Menu Board readability** — Category headers increased to 22px (was 18px). Description text opacity increased to 0.45 (was 0.35). Items per page reduced to 10 (was 12) to account for description rows.
- **Screen reliability** — Reload guard prevents rapid consecutive reloads from multiple triggers (30s minimum between reloads). Broken image fallback hides failed images gracefully. Cache-first initialization added to Menu Board (matches Highlights pattern).
- **Dietary badge accuracy** — Fixed MenuBoard dietary dot logic to match Highlights mode. Previous logic false-positived on tags containing "non" (e.g., "Non-Spicy").
- **Type consolidation** — `MenuItemForSlide` and `ScreenStoreInfo` moved to `@type/campaigns.ts` as single source of truth. Circular dependency between `slideGenerator` ↔ `evergreenSlides` eliminated. `guardedReload` extracted to shared `utils.ts` (was duplicated in both screen components).

### Fixed

- **Dietary indicator bug** — Items tagged "Non-Spicy" or "Non-Dairy" no longer incorrectly show as Non-Vegetarian on Menu Board.

### Documentation

- **Digital Screens feature LOCKED at v2.2** — All 8 docs updated to 🔒 LOCKED status. Only readability, reliability, confusion, or scale fixes allowed from this point.
- **ChatGPT Strategic Review v2** — 10-point audit documented. QR screen pairing rejected (2/5 on Feature Rejection Gate). AI image generation for screens resolved as rejected.

---

## February 7, 2026 (Session 2)

### New — Documentation Backfill (67 new docs)

- **Firebase Cost Tracking (`_firebase.md`)** — Added to all 28 features. Every Firestore read/write/delete, Storage operation, Cloud Function invocation, and cost estimate documented per feature.
- **Website Content (`_website.md`)** — Added to 22 customer-facing features. Hero sections, feature benefits, SEO meta, and approved language per feature.
- **Help Documentation (`_helpdoc.md`)** — Added to 24 features. Getting started guides, how-tos, troubleshooting, and tips per feature.
- **Master Index (`index.md`)** — Book-style index listing all 32 features with doc presence status (spec/impl/marketing/website/helpdoc/firebase). All applicable docs now ✅.

### Features with full doc coverage (firebase + website + helpdoc):

- Client Menu, AI Data Extraction, Upload & File Processing, AI Image Generation
- Description Generation, Multi-Language Translation, Data Editor, B2C View
- Stores Management, Decision Intelligence, Continuous Menu Intelligence
- Reviews & Reputation, Digital Screens, Multi-Outlet Consistency
- Multi-Chain Permissions, Hours & Holiday Accuracy, Pricing Integrity System
- GBP Sync, Physical Surfaces, Staff Prompt, Roles & Permissions

### Features with firebase + helpdoc only (no public website needed):

- B2B View, Project Management, Auth Onboarding, Authentication

### Features with firebase only (infrastructure):

- Analytics Tracking, AutoSell Features, Security, System Strengthening

---

## February 7, 2026 (Session 1)

### New

- **Workflow Automation** — 12 slash-command workflows for streamlined development. Type `/help` to get started.
- **Content Layer System** — Every feature now generates website content, help documentation, and changelog entries alongside specs and implementation docs.

### Improved

- **Documentation Structure** — Expanded from 3 doc types (spec/impl/marketing) to 7 (+ website/helpdoc/firebase/changelog) for complete feature coverage.
- **Authority Hierarchy** — Constitution now recognized as highest product authority, integrated into all workflows.

---

<!--
TEMPLATE FOR NEW ENTRIES:

## [Date — e.g., March 15, 2026]

### New
- **[Feature Name]** — [1-2 sentence user-facing description]

### Improved
- **[Feature/Area]** — [What got better and why it matters]

### Fixed
- **[Issue]** — [What was wrong and that it's resolved]

-->

## June 14, 2026

### Improved

- **CampaignCue Campaign Pack Output** — Added a typed `CampaignCueOutputPack`, owner-visible output summary, and structured ZIP download containing the decision card, channel copy, handoff fields, trust summary, reuse notes, mini-page/QR brief, and result prompt. Direct posting, WhatsApp sending, provider account connection, hosted mini-page publishing, and ad-spend mutation remain off.

# MenuList — Changelog

> What's new, improved, and fixed. Updated with every release.
>
> **Language Rule:** All entries must follow [Language Governance](./constitution/02-language-governance.md). No hype, no "exciting updates". Calm, factual, confident.

---

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
- **Silent AI calls now create audit records** — Menu intake checks, public create-menu extraction, weekly analytics narratives, Help Center search/embeddings, and Canonica translation now write AI operation records for cost visibility without draining owner packs.

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

## March 10, 2026 (Session 12 — Canonica Knowledge Graph Exploitation: Full Implementation)

### Added

- **Knowledge Graph Exploitation (Expansion Item #11)** — Upgrades Canonica retrieval from single-entity FAQ lookup to multi-entity product reasoning. 1-hop graph traversal expands matched entities via existing `canonica_entityRelations`, scores answers by multi-entity coverage, detects cross-feature interactions via deterministic rules, and suggests related entities post-answer. Feature flag: `ENABLE_CANONICA_KNOWLEDGE_GRAPH` (OFF).
- New: `src/lib/canonica/graphTraversal.ts` — Core graph exploitation pipeline (~250 lines). Graph expansion, interaction detection, related suggestions. All in-memory on precomputed index.
- Enhanced: `src/lib/canonica/canonicalRetrieval.ts` — Graph expansion injected after entity matching. `scoreBySpecificity()` gains multi-entity coverage boost (+15 per overlapping entity). Post-answer related suggestions rebuild.
- Enhanced: `src/lib/search/searchCore.ts` — `graphExpansion` wired through `CoreSearchResult`. `GRAPH_EXPANSION_HIT` performance logging. Entity-enriched RAG (Stage 6) uses expanded entities for richer fallback context.
- Enhanced: `src/lib/search/types.ts` — `graphExpansion` field on `CoreSearchResult`.
- Enhanced: `src/types/canonica/index.ts` — 6 additive types: `CanonicaInteractionRule`, `CanonicaEntityGraphNode`, `CanonicaEntityGraphIndex`, `CanonicaGraphExpansionResult`, `CanonicaInteractionType`, `CANONICA_INTERACTION_TYPES`.
- Enhanced: `functions-canonica/src/canonica/canonicaNightly.ts` — Step 15: `rebuildEntityGraphIndex()` (~150 lines). Nightly precomputation of entity graph from relations. Bidirectional expansion. Orphan relation detection. Preserves manually-authored interaction rules across rebuilds.

### Documentation

- Full doc set: `__docs__/canonica/knowledge-graph-exploitation/` (8 docs + 1 archive)
- ChatGPT conversation review: System #11 of ICP Coverage Index (5 capability blocks: 58-62). ~70% accuracy. 3 proposed new collections → 0 needed.
- 7 ADRs documented. 6-area parity audit PASS. E2E simulation (5 happy, 3 error, 5 edge cases) PASS. Expansion tracker Item #11 updated to IMPLEMENTED.

### Key Decisions (Cascade)

- **1-hop traversal only** (maxDepth=1) — Industry consensus (Microsoft GraphRAG, Neo4j, Elastic). Hard-coded, non-configurable.
- **Precomputed graph index** — Single `platformSummary` doc per tenant. 1 Firestore read per query vs N live lookups.
- **Zero new Firestore collections** — All in existing `platformSummary` pattern.
- **Deterministic interaction rules** — Human-authored, never LLM-generated. Canonica doctrine compliance.
- **Only expand to entities with answers** — `answerCount > 0` filter prevents dead-end expansion.
- **`interactionRules.ts` folded into `graphTraversal.ts`** — Simpler than originally planned. Interaction rules loaded from same graph index doc.
- **Cost: +1 Firestore read/query** (~$0.011/month at 10K queries)

### Fixed (Post-Implementation Audit)

- **Missing API route wiring** — `search-kb/route.ts` and `widget/search/route.ts` were not passing `graphExpansion` data to API responses. Fixed: Help Center gets full expansion data; Widget gets compact version (interaction + suggestions only).
- **RAG enrichment using narrow entity set** — Stage 6 (Entity-enriched RAG) was using only `matchedEntityIds` when graph expansion could provide richer context. Fixed: uses `graphExpansion.expandedEntities` when available, falls back to `matchedEntityIds`.

### Technical

- 1 new file + 10 modified files total (7 in initial implementation + 3 in post-impl audit)
- Feature flags: `ENABLE_CANONICA_KNOWLEDGE_GRAPH` in `src/config/features.ts` + `functions-canonica/src/constants/features.ts` (both OFF)
- Zero new Firestore collections, zero new indexes
- `tsc --noEmit`: 0 errors

---

## March 9, 2026 (Session 11 — Canonica Ticket → Knowledge Loop: Full Implementation)

### Added

- **Ticket → Knowledge Loop (Expansion Item #9)** — Converts resolved support ticket conversations into canonical knowledge via accumulation architecture (Intercom-validated). Nightly Step 14 extracts knowledge candidates from resolved ticket clusters (3+ per entity), generates AI draft canonical answers, routes to founder approval queue. Feature flag: `ENABLE_CANONICA_TICKET_KNOWLEDGE` (OFF).
- New CF: `functions-canonica/src/canonica/resolutionExtractor.ts` — Core extraction pipeline (~310 lines). 3-stage deduplication, accumulation threshold, Gemini extraction, audit logging.
- New CF: `functions-canonica/src/canonica/ticketKnowledgePrompt.ts` — Gemini prompt + response parser for ticket resolution extraction (~160 lines).
- Enhanced: `src/lib/canonica/signalEmitter.ts` — New `emitTicketResolutionSignal()` captures last 5 non-system messages as resolution context on ticket resolve.
- Enhanced: `src/types/canonica/index.ts` — 4 additive fields on `suggestedChange` (sourceTicketIds, sourceTicketCount, resolutionContext, extractionConfidence) + `ticket_resolution` draftSource value.
- Enhanced: `functions-canonica/src/canonica/canonicaNightly.ts` — Step 14 + 4 result tracking fields.

### Documentation

- Full doc set: `__docs__/canonica/ticket-knowledge-loop/` (8 docs + 1 archive)
- ChatGPT conversation review: System #9 of ICP Coverage Index. ~55% accuracy. 9+ proposed collections → 0 needed.
- 5 ADRs documented. 10-area parity audit PASS. Expansion tracker Item #9 updated to IMPLEMENTED.

### Key Decisions (Cascade)

- **Accumulation architecture** — Only extract when 3+ tickets cluster around same entity (Intercom proved 2x approval rate vs per-ticket extraction)
- **Zero new collections** — Reuse `canonica_mutationProposals` with `draftSource: 'ticket_resolution'`
- **Nightly batch IS the queue** — Step 14 in existing batch. No separate processing queue needed.
- **Entity-based clustering** — No external vector DB. Existing signal mutation engine's entity clustering is sufficient.
- **Read-only ticket access** — Feature never modifies ticket documents. Resolution captured at signal emission time.
- **Cost: ~$0.12/tenant/month** — Dominated by LLM calls (5-draft-per-run cap)

### Fixed (Deep Audit)

- **Missing UI wiring** — `emitTicketResolutionSignal()` was defined in `signalEmitter.ts` but never called from ticket UI. Wired into `TicketDetailView.tsx:handleTicketUpdate()` — fires on status change to Resolved or Closed. Dynamic import (fire-and-forget), covers both platform admin and client owner paths.

### Technical

- `tsc --noEmit` = 0 errors (both frontend + functions-canonica)
- 2 new files + 5 modified files (TicketDetailView.tsx added during deep audit)
- Zero new Firestore collections, zero new indexes

---

## March 9, 2026 (Session 10 — Canonica Founder Onboarding: Full Pipeline)

### Added

- **Founder Onboarding Bootstrap Engine** — Automatically bootstraps the Canonica canonical layer after KB articles are published. Batch entity extraction, auto-promote high-confidence entities (≥0.7 conf + ≥2 article refs), generate canonical answer drafts per promoted entity. Feature flag: `ENABLE_CANONICA_FOUNDER_ONBOARDING`.
- New CF: `functions-canonica/src/canonica/onboardingBootstrap.ts` — Core bootstrap engine (~500 lines). Uses `firestoreAdmin` directly (admin SDK pattern, same as `draftGenerator.ts`).
- New config: `src/config/onboardingBootstrapConfig.ts` — Thresholds, limits, constants.
- Nightly Step 12 in `canonicaNightly.ts` — Separate discovery loop (queries `kb_generation_jobs`, not `canonica_entities`) so new tenants with zero entities get bootstrapped.

### Documentation

- Full doc set: `__docs__/canonica/founder-onboarding/` (8 docs + 1 archive)
- ChatGPT conversation review: System #6 of ICP Coverage Index. ~55% accuracy. 9 proposed collections → 0 needed.
- Deep audit found 3 critical issues: CF/DAL incompatibility, tenant discovery gap, missing DB constants. All fixed.
- Expansion tracker Item #6 updated to COMPLETE.

### Key Decisions (Cascade)

- **Zero new collections** — all data in existing `canonica_entityCandidates`, `canonica_mutationProposals`, `canonica_entities`, `canonica_auditLogs`, `kb_generation_jobs`
- **Separate discovery loop** — `discoverBootstrapCandidates()` queries `kb_generation_jobs` because `discoverActiveTenants()` queries `canonica_entities` (empty for new tenants)
- **CF uses firestoreAdmin directly** — Cannot import client-side DAL functions (different SDK). Mirrors DAL logic using admin SDK, same as `draftGenerator.ts`.
- **Auto-promote with guardrails** — ≥0.7 confidence + ≥2 article refs. Audit-logged. Doctrine-compliant.
- **Drafts ≠ Active** — `pending_review` proposals, never served as canonical until founder approves.
- **Cost: ~$0.08/tenant one-time** — ~125 reads + ~155 writes + ~40 Gemini calls per bootstrap.

### Fixed

- **KB Articles tenant isolation** — Added `tId`/`sId` fields to `KnowledgeBaseArticleType` (frontend + CF types). Articles now inherit tenant IDs from parent `kb_generation_jobs` doc during generation. Fixes latent bug where `searchCore.ts` tId filter returned 0 results because articles lacked the field. Fixes multi-tenant data isolation for bootstrap engine. Satisfies CANONICA_RULES Rule 6.
- **Pre-existing TS error** — `ProcessedKBArticle` type was missing `qualityScore` property that `startGeneration.ts` writes to. Added optional field.

### Technical

- 2 new files, 8 modified files (3 additional: startGeneration.ts + 2 type files for tId/sId)
- Zero TypeScript errors (frontend + functions + functions-canonica — all 3 projects)
- Zero new Firestore collections

---

## March 9, 2026 (Session 9 — Canonica Product Friction Intelligence: Full Pipeline)

### Added

- **Product Friction Intelligence** — Converts support signals into actionable product friction insights for SaaS founders. Nightly aggregation of friction metrics per entity, 7-day trend detection, emerging topic alerts, weekly AI-generated insight summary. Feature flag: `ENABLE_CANONICA_FRICTION_INTELLIGENCE`.
- New collection: `canonica_frictionDailyStats` — daily per-entity friction metrics with 90-day retention.
- GovernanceHub "Friction" tab — health badge, top friction table, emerging topics, weekly AI summary.
- Nightly Steps 10/10b/11 in `canonicaNightly.ts` — friction aggregation, stats cleanup, weekly Gemini insight (Sundays).

### Documentation

- Full doc set: `__docs__/canonica/product-friction-intelligence/` (8 docs + 1 archive: README, spec, impl, firebase, marketing, website, helpdoc, mobile-support, chatgpt-review)
- ChatGPT conversation review: System #5 of ICP Coverage Index. ~45% accuracy. ~55% of proposed infrastructure already existed. BigQuery, Vector DB, embedding clustering, 6+ new collections all rejected.
- Expansion tracker Item #5 updated to 🟢 COMPLETE.
- Created `firestore-canonica.indexes.json` with 6 composite indexes for Canonica Firestore.

### Key Decisions (Cascade)

- **Entity graph IS the topic taxonomy** — no separate ML-based clustering needed (Canonica doctrine: deterministic > LLM)
- **1 new collection only** — ChatGPT proposed 6+. `platformSummary` pattern handles insights.
- **Zero external services** — no BigQuery, no Vector DB, no Pub/Sub. Firebase-only.
- **Nightly batch** — Intercom uses weekly, we use nightly for faster signals. No real-time processing.
- **Workflow step failure deferred** — needs `ENABLE_CANONICA_CONTEXT_AWARE` + sufficient data. Low ROI for v1.

### Technical

- 6 new files, 5+ modified files
- Zero TypeScript errors (frontend + functions-canonica)
- Estimated cost: ~$4/month at 100 tenants

---

## March 9, 2026 (Session 8 — Canonica Instant Response Infrastructure: Docs + Implementation)

### Added

- **Instant Response Infrastructure** — Upstash Redis cache layer for canonical answers. Entity-based cache keys, version-based invalidation, 24h TTL, graceful degradation. Feature flag: `ENABLE_CANONICA_INSTANT_CACHE`.
- Stage 2.5 in `coreSearch()` pipeline — Redis cache lookup before Firestore, cache write after canonical hit.

### Documentation

- Full doc set: `__docs__/canonica/instant-response-infrastructure/` (9 files: README, spec, impl, firebase, marketing, website, helpdoc, mobile-support, chatgpt-review archive)
- ChatGPT conversation review: System #3 of ICP Coverage Index. ~55% accuracy. Intent Engine, pre-cache workers, semantic caching, global intent library rejected.
- Expansion tracker Item #3 updated to 🟢 COMPLETE.

### Key Decisions (Cascade)

- **Entity-based cache keys** (not ChatGPT's "Intent Engine") — Canonica's entity resolution IS intent classification
- **Canonical-only caching** — RAG responses are non-deterministic, already cached in aiSearchHistory
- **No pre-cache workers** — Cache warms naturally; premature complexity at current scale
- **No semantic caching** — Correctness risk for authoritative knowledge systems
- **Shared Upstash instance** — Reuses existing rate limiting Redis (zero new dependencies)

### Technical

- **New files:** `src/lib/canonica/instantCache.ts` (124 lines), `src/lib/canonica/instantCache.types.ts` (36 lines)
- **Modified files:** `src/lib/search/searchCore.ts` (Stage 2.5 + cache write), `src/config/features.ts` (flag)
- **New collections:** 0
- **New feature flags:** 1 (`ENABLE_CANONICA_INSTANT_CACHE`, default OFF)
- **Breaking changes:** 0
- **TypeScript errors:** 0

---

## March 8, 2026 (Session 7 — Canonica Entity System Enhancement: 6 Enhancements)

### Added

- **E1 — Entity Aliases:** `aliases?: string[]` field on `CanonicaEntity`. `syncAliasesToSearchIndex()` DAL function. `updateAliases()` hook action. Aliases are source of truth, synced to search index synonyms.
- **E2 — Article-Entity Bridge:** `entityIds?: string[]` field on `KnowledgeBaseArticleType` and `IngestionJobArticle`. Connects KB articles to product ontology entities for entity-centric retrieval.
- **E3 — Registry-Guided Extraction:** `extractEntitiesFromArticles()` now accepts existing entities as context. AI prompt includes existing entity list to prefer reuse. Post-extraction matching via `matchToExistingEntity()`. Reduces duplicate candidates.
- **E4 — Auto-Extract on Article Save:** `extractEntitiesForArticle()` function with 5-minute debounce. Wired into `addArticle()` and `updateArticle()` DAL as fire-and-forget. TipTap JSON → plain text converter. Async — never blocks article save.
- **E5 — Entity Merge:** `mergeEntities()` DAL function. Transfers canonical answer refs, relations, combines aliases. Merged entity deprecated (soft delete). `merge()` hook action. Full audit trail.
- **E6 — Entity-Enriched RAG Context:** `getEntityDescriptions()` and `buildEntityContextBlock()` in canonical retrieval. When canonical miss has entity matches, entity descriptions injected into RAG payload for better fallback answers.

### Documentation

- Full doc set created: `__docs__/canonica/entity-system/` (9 files: README, spec, impl, firebase, marketing, website, helpdoc, mobile-support, chatgpt-review archive)
- ChatGPT conversation review: 9,430-line entity discussion analyzed, 32-concept verdict table, ~40% applicable (70% already built)

### Technical

- **New files:** 0 (all modifications to existing files)
- **New collections:** 0
- **New feature flags:** 0 (uses existing `ENABLE_CANONICA_ONTOLOGY`)
- **Breaking changes:** 0 (all additive optional fields)
- **TypeScript:** Zero errors (`npx tsc --noEmit` clean)

---

## March 7, 2026 (Session 6 — Canonica ChatGPT Review: Infrastructure Guards)

### Fixed (ChatGPT Review — 2 genuine infrastructure gaps)

- **Knowledge Integrity Guard:** Added `ENTITY_MATCH_MIN_SCORE = 2.0` threshold in `canonicalRetrieval.ts`. If entity match score is below threshold, canonical layer is bypassed and RAG handles the query. Prevents confidently wrong deterministic answers from weak entity matches.
- **Ontology Authority Guard:** Added `ONTOLOGY_AUTHORITY_RULES` to `promoteCandidate()` in `entityCandidates.ts`. Requires `confidence ≥ 0.5` AND (`articles ≥ 2` OR `signals ≥ 3`) before entity promotion. Prevents entity explosion from weak KB extraction.

### Deferred

- **Signal Normalization Layer:** Valid optimization for clustering quality but not needed at current scale (pre-activation, no real traffic). Added to backlog.

### Technical

- **ChatGPT accuracy:** ~75%. Missed existing entity `beta` status, extraction prompt rules, and signal resolution pipeline. Found 2 genuine code gaps.
- **Archive:** `__docs__/canonica/_archive/chatgpt-review-phase4-signal-quality.md`
- **TypeScript:** Zero errors (`npx tsc --noEmit` clean)

---

## March 7, 2026 (Session 4+5 — Canonica Phase 4: SHARPEN — Full Production Wiring)

### Added

- **Signal Severity Weighting (3.1):** Escalation signals now weight 3x, tickets 1.5x, chat negative 1x in mutation proposal generation. Higher-severity knowledge gaps surface first.
- **Signal Time Decay (3.2):** Exponential decay with 7-day half-life. Recent signals contribute more to weighted scores than older ones within the 14-day window.
- **Batch Signal Count Queries (3.3):** Drift engine now uses `getBatchSignalCounts()` with Firestore `in` operator — reduces N per-entity reads to ceil(N/30) reads. 10-30x read reduction.
- **Canonical Answer Version History (3.4):** `getAnswerVersionHistory()` DAL function + `AnswerVersionHistory.tsx` governance UI tab. Full per-answer timeline of drift, mutation, and validation events.
- **Signal TTL Auto-Archive (3.5):** `archiveExpiredSignals()` function + wired as **Step 8** in nightly scheduler. Deletes signal events older than 12 months per doctrine mandate.
- **White-Label / Custom Branding (4.1):** `CanonicaBrandingConfig` type + `WhiteLabelBranding.tsx` settings UI + `branding.ts` DAL (save/load via platformSummary). Fully wired end-to-end.
- **Multi-Language KB Articles (4.2):** `CanonicaArticleTranslation` type + `MultiLanguageArticles.tsx` management UI + `/api/canonica/translate` route (Gemini 2.0 Flash). Fully wired end-to-end.
- **3 new feature flags:** `ENABLE_CANONICA_SIGNAL_QUALITY`, `ENABLE_CANONICA_WHITE_LABEL`, `ENABLE_CANONICA_MULTI_LANGUAGE` — all OFF by default.
- **Governance Hub expanded:** 3 new tabs (Version History, Branding, Languages) added to Phase 3 governance hub.
- **3 Firestore composite indexes** added for: batch signal counts (in + timestamp ASC), signal TTL archive (timestamp ASC), answer version history (entityType + entityId + timestamp DESC).

### Improved

- **Drift detection performance:** Replaced per-entity sequential signal queries with single batched query. Significant cost reduction for tenants with many entities.
- **Mutation proposal quality:** Proposals now prioritized by weighted score (severity × recency) instead of raw count. More actionable proposals surface first.
- **Nightly scheduler:** Now 8 steps (was 7). Step 8 = signal TTL auto-archive. Prevents unbounded signal collection growth.

### Technical

- **Files created:** `branding.ts` (DAL), `translate/route.ts` (API), 3 UI components in governance/
- **Files modified:** `signalMutation.ts`, `driftDetection.ts`, `signalEvents.ts`, `auditLogs.ts`, `features.ts`, `types/canonica/index.ts`, governance hub `index.tsx`, `canonicaNightly.ts`, `firestore.indexes.json`
- **TypeScript:** Zero errors (`npx tsc --noEmit` clean)
- **No new Firestore collections.** All features use existing collections with additive fields only.
- **Deploy prerequisite:** `firebase deploy --only firestore:indexes` (3 new indexes)

---

## March 7, 2026 (Session 3 — Multi-Product File Organization)

### Refactored

- **Multi-product file isolation:** All Canonica-specific files moved into product-scoped `/canonica/` subfolders across every layer (components, constants, types, data).
- **Components:** `templates/main-app/helpCenter/governance/` (6 files) + `CanonicaCoverageKPI`, `EntityCandidateReview`, `MutationProposalReview` → `templates/canonica/`
- **Constants:** `canonicaNavigations.ts` → `constants/canonica/navigations.ts`
- **Data:** `CanonicaPlansList.ts` → `data/canonica/plans.ts`
- **Types:** `types/canonica.ts` → `types/canonica/index.ts`
- All import paths updated across 7 consumer files. Old files deleted. Zero TypeScript errors.

### Rules Added

- **STEP 11B** added to `IDE_PROMPTS/MASTER-EXECUTION-PROMPT.md` — Multi-Product File Organization pattern with 10 rules + full folder mapping table for all 5 products.
- **Rule 11** added to `.cascade/rules/CANONICA_RULES.md` — Canonica file organization with complete folder tree.

### Architecture Decision

- **MenuList = default/root** — no subfolder needed (primary product).
- **All other products** (Canonica, SurfaceOS, GrowthOS, VisualMeta) get `/[product]/` subfolder in every layer.
- **Shared infrastructure** (auth, security, theme, i18n, Firebase config) stays at root — never duplicated per product.

---

## March 7, 2026 (Session 2 — Canonica Dashboard: End-to-End Routing)

### Added

- **Canonica Dashboard Route Group:** Complete `(canonica)` Next.js route group with own layout, auth, sidebar, header — fully isolated from MenuList.
- **Canonica Sidebar:** Clean antd Menu-based sidebar with 8 navigation items across 3 groups (Support, Governance, Management).
- **Canonica Header:** Minimal header with page title derivation and user dropdown with sign-out.
- **Canonica Navigation Constants:** `src/constants/canonicaNavigations.ts` — all routes, sidebar config, nav groups.
- **8 Canonica Dashboard Pages:**
  - `/canonica/dashboard` — Overview with stats (entities, answers, drifted, signals, coverage KPI, ontology summary, getting-started guide)
  - `/canonica/knowledge-base` — KB article management (reuses platform KB component)
  - `/canonica/kb-generation` — AI-powered article generation (reuses platform KBGeneration)
  - `/canonica/tickets` — Support ticket management (reuses platform support tickets)
  - `/canonica/conversations` — Chat session monitoring (reuses platform chat management)
  - `/canonica/governance` — Governance hub from Phase 3 (answers, entities, drift, analytics, health)
  - `/canonica/changelog` — Product changelog management (reuses platform changelog)
  - `/canonica/settings` — Workspace info, API key status, widget embed code, feature flag status display

### Architecture Decisions

- **Fully isolated route group** — `(canonica)` does NOT share layout with `(main)`. MenuList code completely untouched.
- **Shared providers** — Session, Redux, i18n, theme providers reused (same codebase pattern).
- **Component reuse** — Platform components (KB, tickets, chat, changelog) wrapped via dynamic imports in Canonica pages.
- **Own layout components** — CanonicaDashboardLayout, CanonicaSidebar, CanonicaHeader — separate from MenuList's AntdLayoutWrapper + SidebarComponent.
- **Auth flow** — Same NextAuth session. Canonica tenants identified by `productId: 'CN'` + `onboardingSource: 'CANONICA_ONBOARDING'`.

### Files Created (14 new)

- 1 navigation constant: `canonicaNavigations.ts`
- 3 layout components: `CanonicaDashboardLayout.tsx`, `CanonicaSidebar.tsx`, `CanonicaHeader.tsx`
- 1 route layout: `(canonica)/layout.tsx`
- 9 page routes: dashboard, knowledge-base, kb-generation, tickets, conversations, governance, changelog, settings, base redirect

---

## March 7, 2026 (Session 1 — Canonica Phase 3: Governance UI)

### Added

- **Canonica Governance Hub:** New tabbed admin interface for daily knowledge governance, accessible from Help Center → "Governance" tab.
- **Canonical Answer Editor (2.1):** Full CRUD UI — create, edit, view canonical answers with entity binding, version management, content editing, governance status display, drift indicators.
- **Entity Management Dashboard (2.2):** List, create, edit, deprecate product ontology entities. Shows relation counts, search index status, type/status filters, search.
- **Drift Dashboard (2.3):** Visual dashboard showing drifted answers by drift class (version, signal, scope conflict, orphan). Summary stats, class breakdown cards, one-click resolve with audit logging, on-demand re-evaluation.
- **Answer Usage Analytics (2.4):** Tracks which canonical answers served most/least/never. Content gap detection (entities without answers). Top/bottom lists, negative feedback ranking, full usage detail table.
- **Entity Health Score (2.5):** Composite health score per entity (40% coverage, 30% drift, 20% signal, 10% indexed). Aggregate stats, worst-first sorting for quick action.
- **Feature flag:** `ENABLE_CANONICA_GOVERNANCE_UI: false` (default OFF, enable after ontology + answers are active).

### Technical Details

- 2 new hooks: `useCanonicalAnswers`, `useEntities`
- 6 new UI components in `src/components/templates/main-app/helpCenter/governance/`
- Zero new Firestore collections — all reads from existing Canonica collections
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
- **Launch order:** MenuList → SurfaceOS → GrowthOS → VisualMeta
- **Google-first** adapter strategy (not multi-surface from day one)
- **Parent brand** ("Strata" suggested) — separate from MenuList, quiet until 2+ products have PMF
- **Full System Design Document (SDD)** with 10 frozen components defined

### Portfolio Architecture (4 Products)

| Product    | Layer          | Verb     | Posture   |
| ---------- | -------------- | -------- | --------- |
| MenuList   | Truth          | Own      | Authority |
| SurfaceOS  | Representation | Control  | Control   |
| GrowthOS   | Execution      | Activate | Momentum  |
| VisualMeta | Preparation    | Prepare  | Craft     |

---

## March 6, 2026 (Session — Canonica Domain & Launch Readiness Review)

### Documentation

- **ChatGPT conversation reviewed:** Domain purchase (canonica.app) + support stack evaluation + launch readiness + failure modes. Overall accuracy: ~60%. Core claim (3 missing infrastructure pieces) was 0% accurate — all three already built on March 3.
- **Activation experiment updated:** Added 10 operational failure modes (§10), MenuList entity category suggestions for ontology bootstrap (§11), and canonical answer authoring guidelines (§12) to `CANONICA-ACTIVATION-EXPERIMENT.md`.
- **Roadmap updated:** Session 12 added to `menulist-future-roadmap-ssot.md` with domain action items (DNS, email, trademark, social handles).
- **Archive created:** Full conversation review at `__docs__/canonica/_archive/chatgpt-review-domain-launch-readiness.md`.

### Key Findings

- All 3 "missing pieces" ChatGPT identified (coverage metrics, signal entity resolution, nightly scheduler) were already implemented in `canonicaNightly.ts` on March 3, 2026.
- 4 genuinely new failure mode warnings documented: Entity Ontology Collapse, Canonical Answer Overfitting, Admin Cognitive Overload, Governance Loop Breaking.
- Weekly governance cycle recommended: Monday (proposals) → Wednesday (drift) → Friday (answers).
- Domain infrastructure setup is business operations, not engineering work.

---

## March 2, 2026 (Session — Canonica Sprint 1-6 Implementation)

### Implemented

Full 5-pillar infrastructure implementation for Canonica — the Support Knowledge Control Plane for SaaS. All 6 sprints executed sequentially with zero TypeScript errors.

### Pre-Implementation Setup

- **Product name locked:** Canonica — The Support Knowledge Control Plane for SaaS
- **Folder renamed:** `__docs__/help-center/` → `__docs__/canonica/` (75 docs moved)
- **Master workflow updated:** `.windsurf/workflows/master-execution.md` — Step 0 product detection (MenuList vs Canonica)
- **Canonica rules created:** `.cascade/rules/CANONICA_RULES.md` — 10 binding rules
- **Tenant/store architecture:** Keep existing tId+sId. MenuList = first client.

### Sprint 1 — Data Layer Foundation

- **9 DB_COLLECTIONS** constants added (frontend `src/constants/database.ts` + functions `functions/src/constants/database.ts`)
- **5 feature flags** added to `src/config/features.ts` (all OFF by default): `ENABLE_CANONICA_ONTOLOGY`, `ENABLE_CANONICA_CANONICAL_ANSWERS`, `ENABLE_CANONICA_DRIFT_DETECTION`, `ENABLE_CANONICA_SIGNAL_MUTATION`, `ENABLE_CANONICA_PUBLIC_API`
- **Full type system:** `src/types/canonica.ts` — 15 interfaces, 10 const objects, 2 version normalization helpers
- **7 DAL files** (46 functions total) in `src/database/canonica/`: entities.ts (12), canonicalAnswers.ts (8), releases.ts (6), mutationProposals.ts (7), signalEvents.ts (4), auditLogs.ts (3), entityCandidates.ts (6)

### Sprint 2 — Canonical-First Retrieval Pipeline

- **`src/lib/canonica/canonicalRetrieval.ts`** — 3-layer retrieval stack: deterministic entity index (Layer 1) → intent classification (Layer 2) → LLM fallback assist (Layer 3). Rule-based specificity scoring. Version window filtering.
- **search-kb route integration** — Canonical-first block added to `src/app/api/helpCenter/search-kb/route.ts` between cache lookup and RAG vector search. Logs CANONICAL_HIT / CANONICAL_MISS.
- **AiSearchHistory type extended** — 4 canonical fields added to `src/types/aiSearchHistory.ts`

### Sprint 3 — Ontology Bootstrap

- **`src/lib/canonica/entityExtraction.ts`** — AI entity extraction pipeline from KB articles. Strict extraction rules (no UI labels, no generic nouns, must be versionable). Validation + deduplication + search index builder. Batched processing (5 articles per Gemini call).

### Sprint 4 — Drift Detection Engine

- **`src/lib/canonica/driftDetection.ts`** — 4 deterministic drift classes: version_mismatch, signal_anomaly, scope_conflict, deprecated_entity. Idempotent evaluation (running twice = identical results). Derived flags (not toggled). Audit logging on every state change.

### Sprint 5 — Signal Mutation Engine

- **`src/lib/canonica/signalMutation.ts`** — Entity-based signal clustering (not embedding-based). 4 mutation types: content_refinement, scope_adjustment, version_update, new_answer_required. Auto-proposal generation from friction signal clusters. Configurable thresholds (min 3 signals, 14-day window, max 10 proposals per run).

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

## March 2, 2026 (Session — Canonica Strategic Doctrine & Governance)

### Documented

Full ChatGPT strategic conversation processed, validated against codebase, and documented as binding governance for Canonica — the Help Center's future as standalone Support Knowledge Control Plane for SaaS.

### Created (`__docs__/help-center/doctrine/`)

1. **README.md** — Doctrine index with document map, key decisions summary, usage guide by role
2. **01-core-doctrine.md** — Product identity (Canonica), naming decision, 5 architectural pillars, retrieval doctrine, evolution path, current state assessment (70% SupportOS / 30% Canonica)
3. **02-non-goals-charter.md** — Binding non-goals: NOT helpdesk, NOT CMS, NOT AI autopilot, NOT compliance, NOT analytics. Feature rejection filter. Sales alignment rules.
4. **03-infrastructure-freeze-v1.md** — 3-year freeze rules: frozen collections, retrieval logic, governance engines, LLM discipline, economic guardrails. Freeze-break procedure (RFC required).
5. **04-market-validation.md** — TAM (3,000-5,000 mid-market SaaS), ICP ($5M-$40M ARR B2B SaaS), moat analysis (7-8/10 if deep), distribution (founder-led + AI wave piggyback), monetization ($500-$3,000/mo), 5-year durability (7-8/10).
6. **05-architecture-evolution.md** — 5-pillar codebase assessment (Ontology ❌, Canonical Answers ⚠️, Drift ❌, Signal Mutation ⚠️, API ⚠️). Frozen schemas adapted to existing MenuList DAL patterns. Entity/CanonicalAnswer/Release schemas. 4 drift classes. Signal mutation logic. 3-layer retrieval stack. 6-sprint implementation sequence.
7. **06-infrastructure-readiness-certification.md** — IRC v1.0: 10-section hard gate checklist (data integrity, retrieval determinism, drift engine, mutation safety, multi-tenant isolation, security/RBAC, performance/SLO, data durability, integrity audit, failure injection). All must pass before external rollout.
8. **07-execution-roadmap.md** — 12-month roadmap: Q1 (ontology + canonical engine), Q2 (drift + release binding), Q3 (signal mutation), Q4 (API + deep integration). Sprint-level breakdown. CRAV phases (shadow → assisted → enforced). Design partner criteria.
9. **08-threat-model-stride.md** — STRIDE analysis (6 categories + LLM-specific threats). 12 red team scenarios with mitigations. Economic threat modeling (abuse scenarios up to $50K/month unguarded). RBAC matrix for future roles.

### Created (`__docs__/help-center/_archive/`)

10. **chatgpt-review-canonica-strategy.md** — Full conversation review: 28 topics with per-claim AGREE/DISAGREE/PARTIAL verdicts. 8 ChatGPT errors identified. 11 strategic decisions locked. 12 components needed vs 12 existing components that support evolution.

### Updated

- `__docs__/help-center/README.md` — Added Canonica strategic governance section with doctrine folder link. Version bumped to 3.0.0.

### Key Decisions

- **Name locked:** Canonica (not SupportOS, not TrustLayer)
- **Category defined:** Support Knowledge Control Plane for SaaS
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

## March 1, 2026 (Session — Pomelli / VM / GOS / Hardening Review)

### Analysis Summary

ChatGPT conversation covering Google Pomelli (AI marketing tool), VisualMeta vs GrowthOS sequencing, product architecture, OBP adoption metrics, and MenuList hardening layers. **~90% already documented** in existing strategy and constitution docs. Our docs are more comprehensive — ChatGPT was unaware of existing Social Content Engine (GrowthOS v0), MCE, menu snapshots, OBP analytics, adoption pulse, and security rules. All strategic conclusions converge with already-locked decisions in Constitution 11/12 and product positioning map.

### Documented

1. **ChatGPT Review Archive** (`__docs__/strategy/_archive/chatgpt-review-session-pomelli-vm-gos-hardening.md`) — Full 14-topic validation. Topics: Pomelli integration (rejected — already locked), VisualMeta spec (redundant — 781-line doc exists), GrowthOS spec (redundant — 776-line doc exists), product sequencing (already in Constitution 11), product connection model (already in Constitution 12), brand architecture (already in positioning map), capital allocation (already locked), GrowthOS build/launch (already implied by existing framing), OBP adoption scoring (premature — no GBP API), MenuList hardening (8/10 already built). No code or doc changes warranted.

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

3. **Reseller Management Screen** (`/reseller/manage`) — Platform-admin-only screen with password gate. Create/edit reseller profiles. View all resellers with stats table (stores, revenue, offline cap usage). Protected by `PLATFORM` role + `ECOMSAI_PLATFORM_PASSWORD` gate.

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

- **Product Universe SSOT** — Single comprehensive document explaining the entire product universe: MenuList, Control Layer, GrowthOS, and VisualMeta. Covers what each is, why it exists, who uses it, what's already built, market validation with industry statistics, competitive landscape, honest viability assessment, build sequence, and decision framework for future questions. Synthesized from 6 strategy docs, 3 constitution docs, and 4 ChatGPT review archives. Includes Cascade's honest take: MenuList (95% confidence, unequivocally build), Control Layer (90%, just keep improving MenuList), GrowthOS (70%, keep inside MenuList for now), VisualMeta (40%, probably don't build). See [product universe](./strategy/product-universe-ssot.md).

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

- **VisualMeta Complete Product Strategy** — Comprehensive strategy document for VisualMeta — a future commercial content preparation workspace producing Final Content Kits. Consolidates 24+ ChatGPT design topics into one master doc. Covers: canonical definition ("commercial content preparation workspace"), terminal artifact (Final Content Kit with ZIP structure), ICP lock (content operators at agencies), UI identity (workbench, not dashboard), 7 core features (Content Units, Draft Image/Text/Language, Versioning, Notes, Export), 9-category permanent kill-list, kit-based pricing, trust language (10 production-ready screens), error states, support model, audit layer, V2 expansion path, market research (TAM $36B, SAM $2.9-4.3B). Cross-checked against codebase: MenuList's existing AI Image Generation already implements ~70% of VisualMeta's image capability. See [strategy](./visual-meta/README.md).
- **AI Image Generation Code Review (via ChatGPT + Expert)** — Validated existing AI Image Gen codebase. Found: debugger in production (batch-generation/route.ts:164), transaction logging disabled (route.ts:264), no batch size limit. Expert added 18-item development checklist to impl.md, defined USP ("Inline Menu Image Creation" with 3 pillars), scope freeze rules, UI language guidelines. ChatGPT's "too many choices" claim partially validated (count wrong, cognitive concern valid). See [review](./visual-meta/_archive/chatgpt-review.md).

---

## February 19, 2026 (Late Evening)

### New

- **GrowthOS Complete Product Strategy** — Comprehensive strategy document for GrowthOS — a future transactional execution engine that produces ready-to-use promotional content for SMBs. Consolidates 10 ChatGPT design documents into one master doc. Covers: executive intent, SMB reality model, problem taxonomy, output-first philosophy, product surfaces, 6 canonical use cases, workflow engine design, content quality rules, MenuList relationship contract, monetization (pay-per-kit), and kill criteria. Cross-checked against codebase: MenuList's existing Social Content Engine already implements ~60% of GrowthOS vision. See [strategy](./growth-execution-strategy/README.md).
- **Product Separation Doctrine (Constitution 12)** — New governance document permanently locking the separation between MenuList, GrowthOS, and VisualMeta. Ten rules: (1) Product identity lock — each answers exactly one question. (2) AI posture rules — Authority (MenuList), Delegate (GrowthOS), Assistant (VisualMeta). (3) Time horizon lock — Continuous/Immediate/Deliberate. (4) Dependency direction — one-way read-only from MenuList outward. (5) Surface & UI firewall — no shared components. (6) Monetization separation — subscription/per-kit/per-project. (7) Language separation. (8) Failure isolation. (9) Priority order locked: MenuList #1, GrowthOS #2, VisualMeta #3. (10) Red-Flag Test for feature assignment. See [doctrine](./constitution/12-product-separation-doctrine.md).
- **Product Positioning Map** — One-page strategic reference showing how MenuList (infrastructure), GrowthOS (execution), and VisualMeta (preparation) form a vertical stack with separate jobs, time horizons, AI postures, surfaces, and monetization. Includes Red-Flag Test: "If it's a bit of all three → kill it." See [positioning map](./strategy/product-positioning-map.md).
- **AgentKits Marketing Repo Analysis** — Assessment of [aitytech/agentkits-marketing](https://github.com/aitytech/agentkits-marketing) (18 agents, 93 commands, 28 skills). Only ~15% relevant to SMB context. Extractable: copywriting frameworks, workflow structure patterns, brand safety rules. Not useful: enterprise marketing (lead scoring, CRO, email funnels, programmatic SEO). See [analysis](./growth-execution-strategy/agentkits-repo-analysis.md).

---

## February 19, 2026 (Evening)

### New

- **Product Evolution Doctrine (Constitution 11)** — New governance document locking MenuList's 3-year product direction. Six rules: (1) Product sequence lock: MenuList → Control Layer inside → GrowthOS → VisualMeta optional. (2) Customer-facing only boundary — PERMANENT: never POS/CRM/inventory/payroll. (3) "5-Minute Understanding" rule — non-tech SMB must understand purpose in 5 minutes without training. (4) "Calm, elite infrastructure" identity — simple surface, deep underneath, locked 3 years. (5) Silent autopilot design principle — owner updates once, correct everywhere. (6) Kill-switch philosophy for anything that adds complexity. See [doctrine](./constitution/11-product-evolution-doctrine.md).
- **Control Layer Strategy** — Comprehensive strategic framework documenting how MenuList evolves from "menu infrastructure" to "business truth infrastructure." Consolidates 18 ChatGPT design documents into single master doc. Maps 5 Control Layer Pillars (Business Identity Truth, Operational Public Truth, Menu & Offering Truth, Public Communication Layer, Presence Consistency Layer) to existing 6-Pillar CFI framework. Includes data model, authority hierarchy, surface control map, conflict resolution rules, rollout phases, failure scenarios, and strategic moat analysis. Cross-checked: 60-70% of vision already exists in codebase. See [strategy](./control-layer-strategy/README.md).
- **Growth Execution Strategy (DEFERRED)** — Future reference document for GrowthOS — the revenue execution engine that would sit on top of MenuList's truth infrastructure. Consolidates 9 ChatGPT design documents. Clearly marked as DEFERRED with explicit prerequisites (200+ active stores, >70% link adoption, founder unlock). Documents boundary rules: GrowthOS reads from truth layer, never writes. See [strategy](./growth-execution-strategy/README.md).

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

- **Messaging Onboarding (Documentation v1.6 — Renamed + Multi-Provider + Tracking + Access Model + Business Type + Deep Cross-Check)** — Full documentation suite for Messaging Onboarding — MenuList's primary acquisition engine. Provider-agnostic architecture (WhatsApp v1, Telegram/LINE/Viber future-ready). Provider adapter layer (`IMessagingProvider`). Deep review: publish pipeline field mapping, email handling (`@msg.menulist.ai`), magic link login (ADR-8), extraction watcher (ADR-9), preview→publish connection (ADR-10). **Onboarding Observation Layer (§16):** MOL-inspired internal tracking with 35 event types, fire-and-forget logger, `messagingOnboardingEvents` collection (ADR-11). **Post-Publish Access Model (§17, ADR-12):** Free publish → 24h public grace → dashboard restricted → owner pays via existing Razorpay. Store fields: `onboardingSource`, `activationDeadline`. **Business Type Auto-Detection (§8.4, §17.8):** AI detects businessType from menu using existing `BUSINESS_TYPES`/`BUSINESS_CATEGORIES` from `src/constants/common.ts` (60+ types, 7 categories). Confidence-based fallback to Restaurant/food. Editable on preview page. 136 test cases across 14 categories (94 P0), 12 ADRs. Renamed from `whatsapp-onboarding` to `messaging-onboarding` (Feb 17, 2026). See [help doc](__docs__/messaging-onboarding/messaging-onboarding_helpdoc.md).

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

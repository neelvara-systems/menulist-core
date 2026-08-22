# Neelvara Main Website - Validation Report

**Status:** Validated; pending owner/legal launch review
**Implementation date:** June 20, 2026
**Last cross-check:** August 20, 2026
**Runtime:** Shared Next.js/Vercel app under `src/app/sites/neelvara/`
**Local QA URL:** `http://localhost:3000/__neelvara`

---

## August 22, 2026 Is Agentic Baseline And Agent Discovery Hardening

- Created the first public Is Agentic baseline for `https://neelvara.com`: `73/100`, with 59/80 Essential, 13.3/20 Recommended, and +1 bonus point.
- Verified that the live homepage already provides meaningful server-rendered text and a valid H1/H2/H3 hierarchy; no heading rewrite was made solely for the scanner's generic partial finding.
- Added Neelvara-specific `llms.txt` guidance, homepage Markdown content negotiation, cache-safe `Vary` headers, and a non-reflective Markdown 404 recovery body.
- Rejected the scanner's missing-address recommendation because current legal governance prohibits publishing a residential/legal address without owner and legal/CA approval.
- Kept brand-name search visibility as an external indexing task and content-efficiency as a measured optimization constraint rather than replacing the shared Next.js architecture for score gain.
- `npm run test:neelvara-agent-readiness`, scoped ESLint, full TypeScript, scoped `git diff --check`, and the shared `npm run verify:url-routing-boundary` regression passed.
- Local HTTP smoke passed for ordinary homepage HTML, negotiated homepage Markdown, `/__neelvara/llms.txt`, and an unknown Markdown path with HTTP `404`.
- No Vercel deployment or public rescan was performed, so the public score remains the recorded 73/100 baseline until the source changes are explicitly deployed.

### Public rescan and evidence-backed follow-up

- After the approved production deployment, the public Is Agentic rescan reached `94/100`: 76.2/80 Essential, 16/20 Recommended, and +1.6 bonus.
- The remaining report items were reclassified against live HTML and repository truth. The homepage is server-rendered and has a valid H1/H2/H3 hierarchy, so no scanner-driven heading rewrite or alternate bot-only HTML was added.
- Updated `/llms.txt` so its canonical company, product, and page destinations are real Markdown links.
- Replaced inline hydrated product-logo SVG components on Neelvara pages with existing static public logo assets, reducing avoidable HTML and client-boundary overhead without changing the product lineup or visible identity.
- Kept the Organization address omitted: no verified and owner/legal-approved public address exists in the current source contract. Adding a partial or residential address only to increase a scanner score remains prohibited.
- Exact-name search still does not surface `neelvara.com`; robots, sitemap, canonical metadata, rendered content, and Organization/WebSite JSON-LD already pass, so this remains a search-engine indexing/authority follow-up rather than a code defect.
- Focused agent-readiness tests, scoped ESLint, full TypeScript, URL-routing regression, logo-asset verification, and scoped whitespace checks pass.
- Local browser verification at desktop and `390x844` confirms both static product marks load at their intended dimensions, the H1/H2/H3 structure remains valid, there is no horizontal overflow, and no browser warning/error is emitted.
- These follow-up source changes are local until a separately approved Vercel deployment; the public `94/100` score describes the preceding deployed commit.

---

## August 20, 2026 Trust & Verification Page

- Added `/trust` as a footer-level static page with a maintained status ledger for company identity, operated products, company-site privacy/terms, security contact discovery, product-specific controls, and pending legal evidence.
- Kept the trust surface within the Neelvara boundary: no certification, audit, uptime, security-control, product-data, API, form, analytics, Firebase, or product-funnel claim was introduced.
- Updated `NEELVARA_PUBLIC_PAGES`, page metadata, sitemap output, shared footer navigation, responsive CSS, and the maintained Neelvara documentation/test matrix.
- Focused source checks passed: `git diff --check` over the Neelvara runtime/constants/docs scope, scoped ESLint, and `npx tsc --noEmit --incremental false --pretty false`.
- Local route smoke passed for `/__neelvara/trust`, `/__neelvara/sitemap.xml`, `/__neelvara/robots.txt`, and `/__neelvara/.well-known/security.txt`; trust HTML includes the status ledger, canonical URL, and pending-review language; sitemap includes the trust URL once.
- Browser checks passed at `1440x1000`, `390x844`, and `320x720`: no horizontal overflow, six status rows render, footer Trust link is present, mobile navigation opens with Products/About/Contact, all reached reveal targets become visible after scrolling, and no browser console errors were captured.

---

## August 20, 2026 Brand Tagline Synchronization

- Centralized the Neelvara umbrella tagline and supporting line in `src/constants/neelvara/website.ts` and used them in homepage metadata and hero copy.
- Added the bounded MenuList and Answerlattice taglines to the Neelvara product lineup, product page, product cards, and generated Open Graph card.
- Regenerated the Neelvara PNG derivative set after updating `scripts/website-assets/generate-neelvara-logo-assets.js`.
- Kept historical transcript and archived strategy wording unchanged; only current public surfaces and maintained docs were synchronized.

## August 17, 2026 WhatsApp Open Graph Card Audit

- Replaced the logo-only Open Graph derivative with an opaque `1200x630` branded social card so WhatsApp and other link previews explain the company before the page is opened.
- The card now uses the public-facing reading order: one Neelvara wordmark, a plain-language purpose statement, MenuList and Answerlattice product explanations, and one `https://neelvara.com` URL in the bottom-right corner. Formal trade-name and full-description details remain in page metadata and structured data.
- Added shared identity constants for the trade name, public brand, and full business description. The Organization JSON-LD now exposes `alternateName: Neelvara` and the full approved description.
- Kept the existing page-specific Open Graph/Twitter metadata contract and pointed every Neelvara page to the same branded card asset.
- Updated the asset verifier so transparent-corner requirements apply to logo, favicon, touch, and manifest assets, while the OG asset is explicitly required to be opaque.
- Regenerated the card through `npm run generate:neelvara-assets` and visually inspected the final PNG at its native `1200x630` dimensions.

---

## August 10, 2026 Company-Site Benchmark And Simplification Audit

- Benchmarked the current Neelvara surface against the official Automattic, 37signals, and Tiny company/portfolio sites. Adopted their direct company-first hierarchy, restrained product proof, and short route-to-product model without importing their unrelated claims or brand systems.
- Reviewed Mailmodo only for landing-page hierarchy and CTA discipline. Its product-funnel density, social proof, conversion modules, and repeated calls to action remain intentionally out of scope for this quiet operating-company website.
- Replaced the homepage's category-style headline with the company name as the primary first-viewport signal, followed by one clear operating statement and the exact current product relationship.
- Removed the duplicate company-reference panel, comparison table, product map, boundary summary, right-side page summary cards, and repeated closing calls to action. The retained sections now give visitors only distinct company, product, policy, and contact information.
- Simplified the Products page to two canonical product cards and one company/product-boundary statement. MenuList and Answerlattice retain their actual shared logo components and canonical product destinations.
- Converted Contact into compact inbox rows and converted About, Legal, Privacy, and Terms content into unframed horizontal information rows. On small screens, every row becomes one readable column.
- Reduced the reveal distance and duration, widened the observer entry margin, and made responsive-hidden reveal targets resolve immediately. A completed scroll no longer leaves reached content transparent.
- Made local alias links hydration-stable. The server and first client render now agree before the client resolves `/__neelvara` or `/nv`, eliminating the prior route-prefix hydration mismatch.
- Simplified the real catch-all `404` response to one branded recovery surface and retained its actual HTTP `404` status, `noindex` directive, product shortcuts, and 44px actions.
- Kept Akshar as the only primary Neelvara typeface with Inter/system fallback, retained the owner-supplied SVG artwork and exact palette, kept CampaignCue and ConstantLayer absent, and added no form, analytics, preference storage, Firebase, or API behavior.
- Public-host check: `https://neelvara.com` resolves and returns `200`, but it currently identifies GoDaddy Website Builder in the response and is not this repository implementation. No Vercel deployment or DNS change was made.
- External product destinations `https://menulist.ai` and `https://answerlattice.com` both return `200`.
- Email DNS publishes Google MX, SPF, Google DKIM, and DMARC (`p=none`). This verifies DNS configuration, not mailbox send/receive behavior for the three public role addresses.
- Local route checks pass for all seven pages, `robots.txt`, `sitemap.xml`, `security.txt`, and the real `404`. Rendered checks pass at `1440x1000`, `390x844`, and `320x720` with no overflow, broken assets, small visible targets, retired product names, browser warnings/errors, or reached reveal targets left pending.
- Metadata checks confirm one H1 per page, page-specific title/description/canonical/Open Graph values, one parseable Organization/WebSite JSON-LD graph, and only MenuList and Answerlattice in `knowsAbout`.
- Focused Neelvara lint, logo-asset verification, environment-target verification, documentation-link integrity, documented-command verification, and scoped diff integrity pass.
- Repository-wide TypeScript passes after the OG metadata/card update; no Neelvara diagnostics are reported.

---

## July 26, 2026 Supplied SVG Identity Replacement

- Corrected the foreground contrast after the saturated logo-palette adoption: solid CTAs, their visited/icon states, active segmented controls, and the static 404 primary action now use white text over the darker supplied blue/indigo/violet stops.
- Added a persistent blue active state to the primary header navigation so Products, About, and Contact visibly identify their current page on desktop and mobile.
- Removed the redundant homepage company-reference card because it repeated the company, product, email, and country facts already presented in the ledger directly below; the hero now prioritizes one clear company statement and action group.
- Used Mailmodo only as a structural reference for stronger landing-page rhythm: added an unframed source-logo hero visual, converted the operating principles from a generic three-column row into an asymmetric editorial chapter, and introduced one controlled high-contrast product band while preserving Neelvara's company-reference boundary.
- Replaced the former three-panel glass mark with the owner-supplied continuous loop-and-arrow SVG.
- Preserved `public/neelvara-logo.svg` byte-for-byte from the uploaded file; its SHA-256 is `c62797f5332e11abfb7b8fdea41618a77ae2a532deffb35ed985c856d2dad98a`.
- Preserved the supplied `0 0 1135 686` canvas, single compound path, and exact gradient colors `#2384FF`, `#1457D9`, `#2737C8`, and `#6542E8`.
- Regenerated the transparent compatibility PNG, favicon SVG/PNGs, Apple touch icon, manifest icons, generic app icon, and Open Graph image from the new source.
- Updated the generator and verifier for the new one-path source. The verifier now locks the source hash, rejects raster embedding and transforms, compares the favicon path with the master path, validates exact colors, and checks transparency, dimensions, optical balance, metadata, structured data, header/footer, and 404 references.
- Adjusted only the website display box to `54x34px` so the heavier new mark is clear beside the wordmark without changing the artwork.
- Replaced the static 404 recovery panel and dormant bento visual's old three-panel imitations with the exact master SVG, then removed the retired pastel palette from both the shared site stylesheet and static 404.
- `npm run verify:neelvara-logo-assets`, generator/verifier syntax checks, scoped diff integrity, all seven public route checks, the true 404 check, and all ten public identity-asset HTTP checks pass.
- Rendered desktop and mobile checks confirm the source SVG in header, reference panels, footer, and 404; there are no broken images, horizontal overflow, browser warnings/errors, or retired visual reconstructions.
- Full TypeScript and full root lint now pass after the unrelated Public API revoke acknowledgement and lineage-specific brace-expansion resolution repairs. These repository-wide closures do not change the Neelvara website behavior validated here.
- The July 11 three-panel logo notes below remain historical implementation evidence and are superseded by this replacement.

---

## July 11, 2026 Cross-Page Reference-Led Relayout

- Removed the decorative company-routing studio mock, marquee, bento/reference tabs, spotlight grid, and duplicate quote treatment from the public homepage flow.
- Replaced the mock dashboard with one factual company reference panel containing only the current operated products, company inbox, and country.
- Rebuilt the homepage around a split hero, compact entity ledger, unframed operating principles, canonical relationship statement, two product cards, boundary table, contact directory, and final CTA.
- Rebuilt About, Legal, Privacy, and Terms around a shared split hero and consistent horizontal content rows; duplicate summary-card grids and alternating row directions were removed.
- Products and Contact retain their product-specific flows while using the same factual reference-summary treatment.
- Scroll reveals now use IntersectionObserver only, with shorter distance/duration and reduced-motion fallback; no window scroll handler is attached.
- Rendered checks at `1440x1000` and `390x844` cover Home, Products, About, Contact, Legal, Privacy, and Terms. All routes have zero horizontal overflow, zero stuck reveal states after entry, and no browser warnings or errors.

---

## July 11, 2026 Logo Canvas And Small-Size Asset Hardening

- Preserved all three canonical SVG path `d` values byte-for-byte, including their relative sizes, positions, overlap, and angles.
- Replaced the uneven `0 0 578 328` master canvas with the optically balanced `68 0 487 320` viewBox. The visible path bounds now retain approximately equal transparent padding on the left/right and top/bottom without applying path transforms.
- Added `scripts/website-assets/generate-neelvara-logo-assets.js` as the canonical generator for the transparent compatibility PNG, square favicon SVG, `16x16` and `32x32` favicon PNGs, touch/manifest icons, generic app icon, and `1200x630` Open Graph image.
- Added `scripts/verification/verify-neelvara-logo-assets.js` to lock the three paths and approved palette, reject embedded rasters/transforms, check all PNG dimensions and transparent corners, verify optical centering and tiny-size contrast, and confirm manifest, metadata, structured-data, header/footer, and 404 references.
- The SVG favicon keeps the exact path geometry and approved gradient colors while using only favicon-specific fill-opacity and outline-strength adjustments for legibility at `16-32px`.
- Generated visual inspection passes for the master PNG, `16px`/`32px` favicons, `96px` app icon, and Open Graph image.
- Rendered homepage checks pass at `1280x720` and `390x844`: header/footer marks resolve from `/neelvara-logo.svg`, all metadata icon links are present, no images are broken, and document width equals scroll width.
- Rendered static 404 check passes at `390x844`: the true `404` page uses the `487x320` master SVG, optimized SVG favicon, `noindex`, and no horizontal overflow.
- Dedicated logo verification, script syntax, strict TypeScript, focused Neelvara lint, dependency freeze, documentation links, documented npm commands, environment targets, scoped diff integrity, and all 15 local route/asset HTTP checks pass.

---

## July 11, 2026 Cross-Page Section Layout Cross-Check

- Audited all 52 rendered sections across Home, Products, About, Contact, Legal, Privacy, and Terms at desktop `1440x1000` and mobile `390x844` widths.
- Confirmed Home product cards, company/contact directories, and shared three-card highlight grids fill their declared tracks without unused columns.
- Found and removed two Products-page three-column assumptions that were rendering only two products: the product map wasted `254px` and the detail grid left an entire third track empty.
- Rebuilt the Products product map as a full-width header, one company-information root strip, and two equal compact product nodes. Removed duplicated summary copy from the map because the two detail cards already carry the canonical summaries.
- Products desktop now renders two `591px` map nodes and two `591px` detail cards with zero unused grid width. Mobile renders one `354px` column with full-size targets.
- Kept the shared About/Legal/Privacy/Terms information panels, Contact support panels, page heroes, quote, and final-action bands because rendered review confirmed balanced columns, purposeful framing, and no forced empty height.
- All 14 route/viewport combinations have zero horizontal overflow, broken images, CampaignCue references, unused repeated-grid width, or pending reached reveal targets. Akshar resolves site-wide with Inter/system fallback.

---

## July 11, 2026 Home Product Layout Redesign

- Replaced the oversized split glass panel, forced `420px` summary column, `5rem` title, and table-like product rows with an unframed section header and two individual product cards.
- Preserved the approved `Current products` / `Operated products` hierarchy, product summaries, lineup, canonical logos, and destination URLs.
- Added named visit actions while keeping the complete product card as the link.
- MenuList accents reuse `#29AAE3` to `#0051D2`; Answerlattice accents reuse `#25B9A6` to `#08513E`, matching the canonical logo gradients without recoloring either mark.
- Desktop `1440x1000` renders two equal `591x306` cards in a `645px` full-width section. Mobile `390x844` renders two stacked `350x277` cards. Narrow mobile `320x720` renders two `292x297` cards with headings and actions fitting their containers.
- All three rendered widths have no horizontal overflow, undersized product links, broken images, pending reached reveal targets, or console warnings/errors.
- Repository TypeScript, focused Neelvara lint, environment-target readiness, route smoke, documentation links, content contracts, and diff integrity pass.

---

## July 11, 2026 Answerlattice Logo Source Correction

- Removed Neelvara's cropped, recolored two-stroke Answerlattice approximation.
- Reused `src/components/atoms/answerlatticeLogoMark/index.tsx`, the exact shared component rendered by the Answerlattice website header and footer.
- Preserved the canonical `0 0 8367 5131` viewBox, path geometry, overlap details, filters, stroke widths, and green gradient stops; Neelvara only controls the rendered tile size.
- Assigned each Neelvara placement a unique SVG ID prefix so the two Answerlattice marks on the Products page cannot collide.
- Runtime comparison against the local Answerlattice header confirms exact matches for all six paths, six filters, two gradients, stroke widths, overlap fills, and gradient stops.
- Desktop `1440x900` and mobile `390x844` checks pass on Home and Products with the canonical mark rendered at approximately `44x27`, no horizontal overflow, no broken images, no pending reached reveal targets, and no console warnings or errors.
- Focused Neelvara/mark lint, environment-target readiness, documentation links, logo-source integrity, and diff integrity pass.
- The repository-wide TypeScript command was rerun during the later Home Product Layout cross-check and passes on the current worktree.

---

## July 11, 2026 Final CampaignCue Removal Cross-Check

- Re-ran source and rendered scans across Home, Products, About, Contact, Legal, Privacy, Terms, 404, manifest, metadata, JSON-LD, sitemap, robots, security.txt, logos, icons, and Akshar font assets.
- Confirmed the local Neelvara runtime exposes only MenuList and Answerlattice; all CampaignCue names, URLs, logo paths, campaign-context wording, and structured-data values are absent.
- Fixed a shared-global-CSS conflict that made the mobile menu toggle visible beside desktop navigation; the scoped desktop rule now wins, while the toggle remains a 44px mobile control below 900px.
- Added a 44px minimum width to desktop primary navigation links so short labels remain full-size interaction targets.
- Desktop `1440x900`, mobile `390x844`, and narrow mobile `320x720` checks pass without overflow, broken images, non-Akshar content, console warnings/errors, or hidden reached reveal targets.
- Root -> missing route -> root returns `200 -> 404 -> 200`; all seven pages and trust routes return their expected statuses.
- Focused TypeScript, lint, environment-target, documentation-link, naming, and diff-integrity gates pass.
- The public preview at `https://neelvara.menulist.online` still serves the old CampaignCue reference and link because this worktree has not been deployed. No Vercel deployment was run.

---

## July 10, 2026 CampaignCue Public Reference Withdrawal

CampaignCue is intentionally unpublished from the Neelvara website for now.

- Removed CampaignCue from the active product lineup, relationship sentence, product cards, product-logo rendering, support/contact copy, metadata keywords, structured data, marquee, manifest, and static 404 shortcuts.
- Removed CampaignCue-derived campaign/reusable-context wording so the public narrative now reflects MenuList and Answerlattice only.
- Kept the CampaignCue product runtime, product website, deployment constants, and assets outside Neelvara unchanged.
- Runtime source scan across `src/app/sites/neelvara`, `src/constants/neelvara`, and `public/neelvara.webmanifest` returns zero CampaignCue references.
- Rendered HTML scan across Home, Products, About, Contact, Legal, Privacy, Terms, the static 404, and the webmanifest returns zero CampaignCue references.
- Browser checks confirm two product cards/links only, no CampaignCue value in JSON-LD, no broken images, no horizontal overflow, and no console warnings or errors.

---

## July 10, 2026 End-to-End Readiness Cross-Check

The complete Neelvara public surface was rechecked across source, route behavior, rendered responsive layouts, keyboard access, content, metadata, motion, static trust files, product destinations, and current public DNS.

Corrections applied:

- Added a keyboard-accessible mobile navigation menu so Products, About, and Contact remain available below the desktop breakpoint.
- Added a visible-on-focus skip link and a focusable `main-content` target to every standard Neelvara page and the static 404 response.
- Restored browser zoom (`maximum-scale=5`, `user-scalable=yes`) and added the missing level-two heading for secondary-page highlight cards.
- Corrected mobile secondary panels to one column so list content cannot remain clipped by the desktop grid.
- Raised static 404 recovery/product links to the 44px touch-target minimum.
- Removed duplicated decorative marquee content from the accessibility tree.
- Unified public copy around company reference, product websites, and product apps; removed the inaccurate `Owner apps` label and tightened About/Products metadata wording.
- Rewrote bare Neelvara homepage aliases to `/sites/neelvara` so the root remains `200` after the catch-all route returns a real `404`.
- Added fast-scroll reveal recovery so already-reached sections cannot stay transparent after a scrollbar jump, Page Down, or anchor movement.

Current verification:

- Root/catch-all sequence: `/__neelvara` `200`, missing route `404`, root `200`, `/__neelvara/home` `200`.
- All public pages, `robots.txt`, `sitemap.xml`, and `/.well-known/security.txt`: local `200`; unmatched route: local `404`.
- Rendered widths `320`, `390`, and desktop: no horizontal overflow, clipped secondary content, broken images, or undersized visible controls.
- Mobile menu opens, exposes all primary links, closes on route change, and returns focus on Escape.
- Skip link is the first keyboard target and moves focus to the main region.
- Akshar is the resolved font across Neelvara content; Inter/system remains fallback only.
- Fast jump from the top to the end of Home changes all 11 reveal targets to visible; no reached target remains pending.
- Reduced-motion CSS keeps reveal targets visible and disables transitions and ambient motion.
- TypeScript, focused lint, env-target readiness verification, and diff integrity pass.

Public-launch verdict:

- **Code/local runtime:** ready after this pass.
- **Public production:** not ready. `neelvara.com` and `www.neelvara.com` do not currently resolve; the three `@neelvara.com` contact addresses therefore cannot be treated as verified; owner/CA/legal approval and trademark evidence remain pending; and no Vercel deployment was requested in this session.
- **Preview:** `https://neelvara.menulist.online` is publicly reachable, but it does not include this worktree until a later explicitly approved deployment.

---

## July 5, 2026 Viewport Reveal Stabilization

The Neelvara viewport-entry reveal layer was aligned with the shared product-site reveal model.

Applied changes:

- Replaced the old root-wide `nv-reveal-ready` hiding rule with explicit `nv-reveal--pending` and `nv-reveal--visible` states.
- Added route-aware reveal reinitialization so client navigation between Neelvara pages does not keep stale animation state.
- Added initial viewport handling, animation-frame scheduling, sibling-based delays, fallback viewport check, and cleanup for observer/timer/frame resources.
- Tuned the intersection threshold for Neelvara's large section-level reveal targets so mobile sections reveal as they enter the viewport instead of staying hidden until too much of the section is visible.
- Kept the animation limited to opacity, transform, and blur, with reduced-motion users receiving visible content and no reveal transitions.

Verification completed in this pass:

- `npm run lint -- --dir src/app/sites/neelvara --file src/app/layout.tsx --file src/middleware.ts`: pass.
- `npx tsc --noEmit --incremental false --pretty false`: pass.
- Local route smoke through `http://127.0.0.1:3000`: Home returns `200`, Products returns `200`, and missing route returns `404`.
- Rendered browser scroll audit at `1440x1000`: Home reveal targets progress from pending to visible through scroll, final scroll reveals all targets, no pending target remains visible in the viewport, and no horizontal overflow is present.
- Rendered browser scroll audit at `390x844`: Home reveal targets progress from pending to visible through scroll, final scroll reveals all targets, no pending target remains visible in the viewport, and no horizontal overflow is present.
- Rendered reduced-motion audit at `390x844`: all reveal targets are visible, no target remains pending, and reveal transitions are disabled.

---

## July 5, 2026 Akshar Typography Unification

The Neelvara website now uses self-hosted Akshar as the primary typeface across every Neelvara public website surface.

Applied changes:

- Expanded Akshar from brand lockups to site-wide text: display headings, body copy, buttons, nav, compact labels, product cards, legal pages, footer, header, and segment not-found UI.
- Replaced the earlier mixed Instrument Serif, Inter, and JetBrains Mono runtime stack with one Akshar-first stack.
- Retained `Inter` only as the first fallback font after Akshar.
- Updated the standalone inline 404 response so missing routes do not fall back to Inter or Georgia.
- Kept routes, logo geometry, legal copy meaning, product content, Prism glass layout, and color tokens unchanged.

Verification completed in this pass:

- `git diff --check -- src/app/sites/neelvara src/app/sites/neelvara/[...missing]/route.ts __docs__/neelvara-main-website __docs__/changelog.md public/fonts/neelvara`: pass.
- Runtime font-family scan: pass for Neelvara source and active website docs; the old Instrument Serif, JetBrains Mono, Georgia, and Google Fonts runtime stack is not present in Neelvara runtime source.
- Font asset validation: pass; `public/fonts/neelvara/akshar-300.ttf`, `akshar-400.ttf`, `akshar-500.ttf`, `akshar-600.ttf`, and `akshar-700.ttf` are valid TrueType files and served locally as `font/ttf`.
- `npm run lint -- --dir src/app/sites/neelvara --file src/app/layout.tsx --file src/middleware.ts`: pass.
- `npx tsc --noEmit --incremental false --pretty false`: pass.
- Local HTTP smoke through `http://127.0.0.1:3000`: Home returns `200`, missing route returns `404`, and Akshar font assets return `200`.
- Rendered browser font audit at `1440x1000`: Home, Products, Privacy, and missing route all resolve sampled visible text to an Akshar-first font stack with no non-Akshar sampled text and no horizontal overflow.
- Rendered browser font probe at `390x844`: Akshar 300, 400, and 700 resolve when requested, and the mobile Home page has no horizontal overflow.

---

## July 4, 2026 Final Prism Polish

The Neelvara website received a final presentation polish pass after the current-color Prism relayout.

Applied changes:

- Removed repeated final CTA eyebrow labels from Home, Products, Contact, About, Legal, Privacy, and Terms so closing sections read as direct company guidance instead of another labeled content block.
- Added consistent hover, focus, and active states for glass CTAs, product rows, product architecture cards, contact routing cards, support product links, footer links, and checklist links.
- Added paragraph `text-wrap: pretty` handling to reduce awkward final-line breaks in public copy.
- Adjusted the active reference tab to white text over the darker parent-logo gradient stops for accessible contrast.
- Added reduced-motion and reduced-transparency handling for the glass interface without changing the logo geometry, product routing, legal copy, or static-site boundary.
- Applied the repo-local Taste pre-flight: the Home product lineup now stays in the same light/frosted page theme instead of switching to a dark band, and Neelvara viewport-height guards now use `100dvh`.
- Added a self-hosted Akshar wordmark font for the header brand, footer brandline, and Home brand H1 only. Body copy, nav labels, legal text, product descriptions, routes, and logo geometry remained unchanged in that pass.

Verification completed in this pass:

- `npm run lint -- --dir src/app/sites/neelvara --file src/app/layout.tsx --file src/middleware.ts`: pass.
- `npx tsc --noEmit --incremental false --pretty false`: pass.
- `git diff --check -- src/app/sites/neelvara src/app/layout.tsx src/constants/neelvara __docs__/neelvara-main-website __docs__/changelog.md public/neelvara*`: pass.
- Old saturated-gradient color scan over Neelvara runtime, logo SVGs, and website docs: pass; no `#1457D9`, `#2384FF`, `#2737C8`, or `#6542E8` remnants were found.
- Taste hard-tell scan over Neelvara runtime: pass for visible em-dashes/en-dashes, numbered eyebrows, Acme/Lorem/Oops placeholder copy, startup cliches, old saturated colors, `100vh`, and cookie/storage banner strings.
- Local route smoke through `http://127.0.0.1:3000`: Home, Products, Contact, About, Legal, Privacy, Terms return `200`; missing route returns `404`.
- CSS delivery smoke: `/_next/static/css/app/layout.css` returns `200`, contains the approved logo palette, contains `.nv-page-prism`, `.nv-final-band`, and the reduced-transparency fallback.
- In-app browser visual smoke at `1440x1000`: Home renders the Neelvara logo SVG, styled Prism hero, visible first-viewport CTAs, light/frosted product lineup, no cookie/storage banner text, no final-band eyebrow, and no horizontal overflow.
- In-app browser visual smoke at `390x844`: Home and Products render styled Prism surfaces, product CTAs fit the viewport, no cookie/storage banner text, no final-band eyebrow, and no horizontal overflow.

---

## July 4, 2026 Current-Color Prism Glass Relayout

The Neelvara website now applies the initial Prism glass layout language across every Neelvara public page while keeping the current Neelvara color system.

Applied changes:

- Home keeps the company-reference content direction and adds Prism rhythm: hero, marquee band, ledger, bento/reference modules, spotlight cards, quote, comparison table, product lineup, contact routing, CTA, and footer.
- Products and Contact now use the same two-column page hero and current-color Prism panel pattern as the secondary pages.
- About, Legal, Privacy, and Terms inherit the shared secondary-page Prism hero, alternating glass section rhythm, and compact page panels.
- Static not-found output now uses the same light Prism mesh/glass treatment and product-shortcut recovery links.
- Neelvara global CSS is imported from `src/app/layout.tsx`, matching the existing product-site CSS pattern so the Neelvara styles are emitted inside `/_next/static/css/app/layout.css`.
- Generic presentation selectors such as `glass`, `serif`, `mono`, and `gradient-text` are scoped under `.neelvara-site` so the root CSS import does not leak Neelvara styling into other app surfaces.
- Brand gradients and inline color chips now use the actual Neelvara logo palette: `#6F86E2`, `#9FC6F6`, `#8798E7`, `#B7ACEF`, `#A9C2F5`, `#D0C8F4`, and `#D9CBF3`; the older saturated site gradient colors are not present in Neelvara source, rendered HTML, or the emitted CSS asset.
- No product funnel, pricing, lead form, analytics, auth, API route, Firebase runtime, cookie banner, Vercel deploy, or production build was added.

Verification completed in this pass:

- `npm run lint -- --dir src/app/sites/neelvara --file src/app/layout.tsx --file src/middleware.ts`: pass.
- `npx tsc --noEmit --incremental false --pretty false`: pass.
- `node scripts/verification/verify-agent-readiness.js --env-targets-only`: pass.
- `git diff --check -- src/app/sites/neelvara src/app/layout.tsx src/constants/neelvara __docs__/neelvara-main-website __docs__/changelog.md public/neelvara*`: pass.
- HTTP smoke through `http://localhost:3000` for `/__neelvara`, `/__neelvara/`, `/__neelvara/home`, Products, About, Contact, Legal, Privacy, Terms, robots, sitemap, security.txt, and a missing route: pass.
- CSS delivery smoke: `/_next/static/css/app/layout.css` returns `200` and contains `.neelvara-site`, `.nv-page-prism`, and `.nv-marquee`.
- Logo-gradient smoke: Neelvara source, rendered Home/Products/404 HTML, and emitted CSS contain the logo palette and no `#1457D9`, `#2384FF`, `#2737C8`, or `#6542E8` gradient/color-chip remnants.
- In-app browser visual smoke: desktop Home renders styled Prism glass chrome; mobile Products, Contact, Legal, and missing route render styled Prism panels without obvious horizontal spill or fallback text.

---

## July 4, 2026 Neelvara Parent Glass Logo Palette Refinement

The Neelvara website now uses the supplied true-vector glass-prism geometry with a parent-brand glass palette everywhere.

Applied changes:

- Preserved the supplied three-path SVG geometry from `logo_3shape_true_svg_no_bg.svg`.
- Refined only the gradient stops, fill opacity, stroke color, stroke opacity, and stroke width toward frosted periwinkle, muted blue-violet, and silver-lavender.
- Replaced `public/neelvara-favicon.svg` with a square true-vector wrapper using the same paths, gradients, and colors as the refined source mark.
- Regenerated `public/neelvara-logo.png`, favicon PNGs, Apple touch icon, manifest icon, generic app-icon PNGs, and `public/neelvara-og-image.png` from the refined true-vector source.
- Updated logo docs to reflect that the source SVG is true vector, product-color-separated, and contains no embedded raster payload.

Verification completed in this pass:

- Supplied-geometry smoke: pass; the three path `d` values in `public/neelvara-logo.svg` match `/Users/danny/Downloads/logo_3shape_true_svg_no_bg.svg`.
- True-vector SVG smoke: pass for `public/neelvara-logo.svg` and `public/neelvara-favicon.svg`; no `<image>`, `base64`, or `data:image` payloads remain.
- SVG source size check: `public/neelvara-logo.svg` is 1,763 bytes and `public/neelvara-favicon.svg` is 1,845 bytes.
- PNG dimension and transparency smoke: pass for `public/neelvara-logo.png`, favicon derivatives, Apple touch icon, manifest icons, generic `neelvara-icon.png`, and `public/neelvara-og-image.png`.
- `git diff --check` over Neelvara runtime/constants/docs/assets: pass.
- Scoped Neelvara lint with middleware: pass.
- Full TypeScript check with `npx tsc --noEmit --incremental false --pretty false`: blocked in that logo-asset pass by an unrelated public-asset-tools type error that is no longer present in the current Prism relayout validation.
- `node scripts/verification/verify-agent-readiness.js --env-targets-only`: pass.
- HTTP smoke through `http://localhost:3000` for `/__neelvara/`, `/__neelvara/products`, `/neelvara-logo.svg`, `/neelvara-favicon.svg`, PNG icon derivatives, Open Graph image, and manifest: pass.
- Local rendered PNG visual inspection for `public/neelvara-logo.png`, `public/neelvara-icon-512.png`, and `public/neelvara-og-image.png`: pass.
- Browser screenshot smoke was not rerun in this pass because the local `playwright` package is not installed in this workspace.

---

## July 4, 2026 Product Icon Tile Fix

The Neelvara product lineup now uses one shared product-logo renderer for Home and Products pages.

Applied changes:

- Added `src/app/sites/neelvara/ProductLogo.tsx`.
- Replaced the small Answerlattice product tile mark with a compact no-filter SVG variant for Neelvara product rows.
- Reused the same product-logo renderer on `/__neelvara` and `/__neelvara/products`.
- Kept the MenuList product mark unchanged and reused the existing Answerlattice mark geometry.

This compact no-filter variant was superseded on July 11, 2026 by direct reuse of the canonical Answerlattice header/footer component.

Verification completed in this pass:

- Scoped Neelvara lint with middleware: pass.
- Full TypeScript check with `npx tsc --noEmit --incremental false --pretty false`: pass.
- Rendered mobile browser icon smoke at `390x844`: Home and Products pages use the compact Answerlattice SVG class, no SVG filters, two stroke paths, visible dimensions of `38 x 28`, and no horizontal overflow.
- Screenshots captured:
  - `tmp/neelvara-answerlattice-icon-fix-home-390-2026-07-04.png`
  - `tmp/neelvara-product-icons-products-390-2026-07-04.png`

---

## July 4, 2026 Mobile Bento Tab Fix

The homepage Company, Products, and Contact segmented control was changed from static visual labels to real client-side tabs.

Applied changes:

- Added `src/app/sites/neelvara/BentoReferenceSection.tsx` as the local client component for the homepage reference tabs.
- Removed the stale static `SegmentControl`, `BoundaryList`, and `BENTO_CARDS` exports from `content.tsx`.
- Updated the segmented control CSS to target `<button>` tabs with 44px visible tap targets.
- Kept the section inside the existing static Neelvara product-site boundary: no Firebase, API route, auth, analytics, or route change was added.

Verification completed in this pass:

- Scoped Neelvara lint with middleware: pass.
- Full TypeScript check with `npx tsc --noEmit --incremental false --pretty false`: pass.
- Rendered mobile browser interaction at `390x844`: Company, Products, and Contact tabs are buttons, change `aria-selected`, and switch the visible panel title/body.
- Mobile tab hit targets are `44px` high and no horizontal overflow was detected.
- Screenshot captured: `tmp/neelvara-tabs-mobile-click-fix-2026-07-04.png`.

---

## June 28, 2026 Neelvara Rename Pass

The parent operating website was renamed from the earlier working name to Neelvara Systems across runtime code, routing constants, public assets, env keys, docs, and URL-routing references.

Applied changes:

- Runtime route group is now `src/app/sites/neelvara/`.
- Shared constants live under `src/constants/neelvara/`.
- Public assets use `neelvara` filenames: manifest, icon, and Open Graph image.
- Local development prefix is `/__neelvara`.
- Private MyCodex-side portfolio shortcut is `/nv`.
- Production canonical domain is `https://neelvara.com`.
- Optional public env keys use `NEXT_PUBLIC_NEELVARA_*`.
- Historical transcript file remains in the docs packet, but visible company-name tokens were name-normalized during the Neelvara rename so repo-wide stale-name scans stay clean.

Verification completed in this pass:

- Stale retired-name token scan: pass outside the preserved raw transcript.
- Scoped retired-acronym scan in Neelvara runtime/assets: pass.
- Filename scan for retired-name paths outside ignored build/temp folders: pass.
- Follow-up repo-wide scan after transcript normalization: pass for joined, spaced, hyphenated, underscored, typo, env-key, import-path, route-path, and filename variants of the retired working name.
- Exact uppercase acronym scan only leaves the legitimate Chile ISO country code in shared country data.
- Exact lowercase acronym scan only leaves unrelated language/archive text; no product route alias or CSS prefix remains.
- `npx tsc --noEmit --incremental false --pretty false`: pass.
- `npm run lint -- --dir src/app/sites/neelvara --file src/middleware.ts`: pass.
- `node scripts/verification/verify-agent-readiness.js --env-targets-only`: pass.
- `git diff --check` over Neelvara runtime/constants/docs/routing/assets: pass.
- Local route smoke: `/__neelvara`, `/products`, `/about`, `/contact`, `/legal`, `/privacy`, `/terms`, `/sitemap.xml`, `/robots.txt`, `/.well-known/security.txt` return `200`; `/__neelvara/missing-page` returns `404`; the retired local prefix returns `404`.
- Former MyCodex alias smoke is historical only; no active public MyCodex host is configured.
- Browser render smoke at `1440x1000` and `390x844`: title and H1 use Neelvara, canonical points to `https://neelvara.com`, `.neelvara-site` root is present, 3 product rows render, no retired-name string appears in visible text or markup, and no horizontal overflow is present.

Screenshots captured:

- `tmp/neelvara-rename-desktop-2026-06-28.png`
- `tmp/neelvara-rename-mobile-2026-06-28.png`

Note: local dev Host-header spoofing for `neelvara.com` is not a valid product-domain route check under the local deployment stage because production domains are not active local domains. Production-domain registration is covered by `deploymentTargets.ts`, `productDomains.ts`, and `verify-agent-readiness`.

---

## June 26, 2026 Content Audit Follow-Up

The latest external content audit was accepted where it matched repo truth and the Neelvara company-site boundary.

Applied changes:

- Homepage changed from reference-sheet/product-count framing to problem-first company framing.
- Relationship language changed to `MenuList and Answerlattice are operated by Neelvara Systems.`
- Products page rebuilt around operated products, product boundaries, and company-to-product routing.
- Contact page rebuilt as routing: company inboxes, product support links, before-you-contact guidance, and country of operation.
- Privacy and Terms now carry `Last updated: June 26, 2026` and page-specific policy sections.
- Legal moved sensitive identifier guidance out of About and keeps entity copy narrow.
- Static catch-all 404 now includes Home, Products, Contact, and product shortcuts.
- Primary header navigation now shows Products, About, and Contact only; Legal, Privacy, and Terms remain footer/legal-surface links.
- Neelvara Open Graph image added at `public/neelvara-og-image.png`.
- Uploaded `public/neelvara-logo.svg` is now the source visible mark for header, footer, 404, and Organization JSON-LD.
- SVG-derived PNG compatibility assets exist for favicon, Apple touch icon, manifest, and Open Graph surfaces.
- `/.well-known/security.txt` added with the existing legal inbox as the security contact route.
- `/nv` internal alias responses now send `X-Robots-Tag: noindex, nofollow`.
- Internal labels and implementation terms were removed from runtime copy: old relationship phrasing, reference-pipeline labels, storage/API/Firebase wording, page-count proof, and custom-solutions wording.
- Follow-up content polish removed the hero mock product-count tile, changed the homepage boundary list to affirmative routing items, and softened defensive support/contact phrasing.

Verification completed in this pass:

- `git diff --check -- src/app/sites/neelvara src/constants/neelvara __docs__/neelvara-main-website`: pass
- `npx tsc --noEmit --incremental false --pretty false`: pass
- `npm run lint -- --dir src/app/sites/neelvara`: pass
- `npm run lint -- --dir src/app/sites/neelvara --file src/middleware.ts`: pass
- `node scripts/verification/verify-agent-readiness.js --env-targets-only`: pass
- Local rendered route smoke for `/`, `/products`, `/about`, `/contact`, `/legal`, `/privacy`, `/terms`, `/home`, `/sitemap.xml`, `/robots.txt`, and a missing path under `/__neelvara`: pass
- Static trust route smoke for `/__neelvara/.well-known/security.txt`: pass
- Internal route smoke for `/sites/neelvara/products`: pass
- Former `/nv` alias smoke: historical only; no active public MyCodex host is configured.
- OG image metadata and `/neelvara-og-image.png` asset smoke: pass
- Browser layout smoke at `1440x1000`, `390x844`, and `320x720`: pass
- Final browser layout smoke after nav/metadata/security follow-up at `1440x1000` and `390x844`: pass
- SVG logo asset smoke for `/neelvara-logo.svg`, `/neelvara-logo.png`, `/neelvara-icon.png`, `/neelvara-og-image.png`, and `/neelvara.webmanifest`: pass
- Expanded icon smoke for `/neelvara-favicon-16.png`, `/neelvara-favicon-32.png`, `/neelvara-apple-touch-icon.png`, `/neelvara-icon-96.png`, `/neelvara-icon-128.png`, `/neelvara-icon-180.png`, `/neelvara-icon-192.png`, and `/neelvara-icon-512.png`: pass
- Duplicate `/home` metadata check: canonical URL is `/`; it remains `index, follow` because the local root alias renders through the same route.
- Page-specific Twitter metadata check: Products, About, Contact, Legal, Privacy, and Terms expose page-specific Twitter title/description values instead of inheriting the root page values.
- Static 404 metadata check: unmatched routes return HTTP `404`, `noindex`, Neelvara theme color, manifest, favicon, Apple touch icon, and SVG logo.
- Browser logo treatment smoke at `1440x1000`, `390x844`, and `320x720`: pass. Assertions covered SVG background in visible logo marks, transparent logo background, no visible logo frame/shadow, no horizontal overflow, no small visible tap targets, and SVG-branded 404 rendering.
- Follow-up route/content smoke after company-routing polish for `/`, `/products`, `/about`, `/contact`, `/legal`, `/privacy`, `/terms`, `/home`, missing path, `/sitemap.xml`, `/robots.txt`, `/.well-known/security.txt`, and `/neelvara-og-image.png`: pass
- Follow-up viewport smoke at `1440x1000`, `390x844`, and `320x720`: pass. Assertions covered no horizontal scroll, no visible cookie banner text, product marks present, `Company routing` retained in the hero artifact, and no product-count tile wording.

External product-link check:

- `https://menulist.ai`: HTTP 200
- `https://answerlattice.com`: HTTP 200
- `neelvara.com`: Google MX, SPF, Google DKIM, and DMARC records present

Owner-side launch blocker: complete a send/receive round trip for each public role inbox before treating email delivery as verified.

---

## Neelvara Current-Color Prism Glass Validation

The Neelvara site was recalibrated against the approved blue-rooted Neelvara brand direction and then relaid out with the Prism glass format while preserving the company-site legal/data boundary.

| Check | Status | Evidence |
| --- | --- | --- |
| Neelvara palette tokens present | Pass | `styles.css` defines `#071323`, `#1457D9`, `#2384FF`, `#2737C8`, `#6542E8`, `#F7F9FC`, `#EEF3FA`, and `#5D6678` |
| Brand ratio preserved | Pass | Ice-white page canvas and pale surfaces dominate; the light product band, blue/green product accents, and blue CTAs remain controlled accents |
| Uploaded logo applied | Pass | Header/footer, favicon metadata, manifest, Organization JSON-LD, and OG metadata use the uploaded glass-prism logo source or derivatives with no visible frame |
| Warm palette removed | Pass | Runtime styles and public SVG assets no longer use rose, peach, amber, cyan-heavy, or pure-purple branding |
| Mesh and grain layers present | Pass | `src/app/sites/neelvara/styles.css` defines `.nv-page-mesh` and `.nv-grain` |
| Shared glass primitive present | Pass | `styles.css` defines `.glass` and spotlight cards reuse the same fill/stroke/blur treatment |
| Akshar typography present | Pass | `styles.css` self-hosts Akshar and uses it as the primary font across display headings, body copy, buttons, labels, legal pages, product cards, and page chrome, with Inter only as fallback |
| Floating glass nav present | Pass | `src/app/sites/neelvara/content.tsx` renders `nv-header-inner glass` |
| Home page rebuilt in company-site section order | Pass | Home includes a brand-first hero, entity ledger, operating approach, relationship statement, two-product lineup, compact contact directory, and footer |
| Secondary pages redesigned | Pass | `SecondaryPage` renders one clear hero, unframed policy rows, policy dates where needed, and one page-specific final action for About, Legal, Privacy, and Terms |
| Custom Products page | Pass | `/products` explains the two distinct product jobs through two canonical product cards and one company/product-boundary statement, without a duplicate product map or hero summary card |
| Custom Contact page | Pass | `/contact` uses compact inbox rows, product support links, and focused first-message guidance without a duplicate hero summary card or closing CTA |
| Product/legal boundary preserved | Pass | No pricing, checkout, lead form, account, API route, Firebase, analytics, or owner app surface added |
| Homepage transition | Pass | Hero leads directly into the compact entity ledger without a decorative or duplicate company-reference panel |
| Solid CTA contrast | Pass | Primary CTA uses white text on Neel blue/indigo gradient |
| Desktop first viewport | Pass | Rendered audit at `1440x1000` shows the hero and ledger meeting at approximately `647px`, with no horizontal overflow |
| Mobile first viewport | Pass | Rendered audit at `390x844` shows the hero and ledger meeting at approximately `593px`; the ledger is visible without horizontal overflow |

Screenshots captured:

- `tmp/neelvara-blue-palette-desktop-2026-06-28.png`
- `tmp/neelvara-blue-palette-mobile-390-2026-06-28.png`

---

## Engineering Checklist Verification

| Checklist item | Status | Evidence |
| --- | --- | --- |
| Uses existing Next/Vercel product-site architecture | Pass | `src/app/sites/neelvara/page.tsx` |
| Local product-site path registered | Pass | `src/constants/deploymentTargets.ts` |
| Production domain registered | Pass | `src/constants/deploymentTargets.ts` |
| Product-domain route entry registered | Pass | `src/constants/productDomains.ts` |
| No Neelvara database product code | Pass | No `PRODUCT_IDS.NEELVARA` in `src/constants/product.ts` |
| Empty Firebase project id | Pass | `neelvara` targets use `firebaseProjectId: ''` |
| Entity strings centralized | Pass | `src/constants/neelvara/website.ts` |
| Public relationship line centralized | Pass | `src/constants/neelvara/website.ts` |
| Public lineup centralized | Pass | `src/constants/neelvara/website.ts` |
| Public routes centralized for sitemap | Pass | `src/constants/neelvara/website.ts` |
| Canonical URL helper | Pass | `src/constants/neelvara/website.ts` |
| Global metadata in layout | Pass | `src/app/sites/neelvara/layout.tsx` |
| JSON-LD support | Pass | `src/app/sites/neelvara/content.tsx` |
| Header and footer shared across pages | Pass | `src/app/sites/neelvara/content.tsx` |
| Static page chrome | Pass | Local path prefix is handled in `SiteHeaderNav.tsx`; no server header dependency remains |
| Bare local prefix | Pass | `/__neelvara` rewrites through the Neelvara home alias instead of falling into the global 404 |
| Sitemap route | Pass | `src/app/sites/neelvara/sitemap.xml/route.ts` |
| Robots route | Pass | `src/app/sites/neelvara/robots.txt/route.ts` |
| Security contact route | Pass | `src/app/sites/neelvara/.well-known/security.txt/route.ts` |
| 404 catch-all | Pass | `src/app/sites/neelvara/[...missing]/route.ts` returns HTTP `404` |

---

## UI Checklist

| Check | Status | Evidence |
| --- | --- | --- |
| Design tokens scoped to Neelvara site | Pass | `src/app/sites/neelvara/styles.css` |
| Neelvara blue token values used | Pass | ice-white canvas, deep navy text, Neel blue CTA, indigo structure, restrained violet accent, and glass fill/stroke/blur tokens in `styles.css` |
| Single fixed mesh background | Pass | `.nv-page-mesh` is the only full-page glow layer; sections do not introduce unrelated hue systems |
| Glass surfaces use consistent primitive | Pass | Header, cards, tables, product band, and CTAs reuse the same glass fill/stroke/blur language |
| Hero identifies brand in first viewport | Pass | Home H1 is `Neelvara Systems` |
| Hero brand does not split mid-word | Pass | Desktop and mobile screenshots show `Neelvara` intact |
| Hero leaves next-section signal | Pass | Home page shows the entity ledger on all tested desktop, tablet, and mobile viewports |
| Touch targets | Pass | Visible links/buttons measured with no sub-36px hit areas after scoped brand and footer target fixes |
| Active navigation | Pass | Header nav marks Products, About, Contact, and Legal-family pages with `aria-current="page"` |
| Public-facing copy | Pass | Homepage no longer exposes internal UI/design critique language |
| Text overlap guards | Pass | CSS uses `min-width: 0`, responsive clamps, and wrapping rules |
| Mobile breakpoint coverage | Pass | Browser checks at 390px and 320px |
| Public lineup positioning | Pass | Runtime copy shows MenuList and Answerlattice as the products currently published on Neelvara |
| Product links | Pass | Home and Products page link only to `https://menulist.ai` and `https://answerlattice.com` |
| Product logos | Pass | Home product cards render the MenuList and canonical Answerlattice logo marks from existing repo components |
| Product link affordance | Pass | Linked product cards show a named visit action and external-link icon on desktop and mobile |
| Product section visual strength | Pass | Home uses one full-width dark contrast band with an unframed section header, two equal light product cards, logo-color accents, and direct product links |
| Reference presentation depth | Pass | Home page uses the company-routing hero mock, entity ledger, bento grid, spotlight cards, quote, product band, and contact-routing cards |
| Viewport reveal motion | Pass | Section-level `nv-reveal` blocks appear once through a local IntersectionObserver, with reduced-motion fallback and no global smooth-scroll layer |
| Internal alias scope | Pass | `/nv` is documented as private alias context only, not a canonical Neelvara URL or product-code alias |
| Legal copy scope | Pass | Home and Products copy now uses entity/reference wording instead of ownership phrasing |
| Structured data scope | Pass | Organization JSON-LD uses `knowsAbout` for the lineup and no longer uses `owns` |

---

## Reference Benchmark Check

The premium redesign was checked against current public examples before the final UI pass:

| Reference | Relevant lesson applied |
| --- | --- |
| Alphabet (`https://abc.xyz/`) | Parent entity sites can be simple, clear, and relationship-led instead of product-funnel heavy. |
| Stripe (`https://stripe.com/`) | The first viewport needs a strong thesis and proof structure, not generic card sections. |
| 37signals (`https://37signals.com/`) | Editorial restraint and clear convictions can carry a company site without decorative clutter. |
| One Page Love parent-company examples (`https://onepagelove.com/tag/parent-company`) | Parent-company sites often work best with limited information and direct orientation. |
| HTMLBurger holding-company examples (`https://htmlburger.com/blog/holding-company-website-examples/`) | Clean layout, whitespace, navigation clarity, typography, and straightforward information matter more than decoration. |
| Supahub (`https://supahub.com/`) | Hero proof details and below-fold product-surface signals can add depth, but the purple glow/testimonial-heavy approach is not appropriate for Neelvara. |
| Gamma (`https://gamma.app/`) | Product-mode grids and generated-output previews are useful pacing references; rendered browser review was blocked, so only public HTML structure was used. |
| Overflow (`https://overflow.io/`) | Large cropped interface artifacts and a three-mode story pattern informed the reference artifact direction. |
| Protoio Inc. (`https://protoioinc.com/`) | Parent-company restraint, editorial spacing, and product-lineup framing are the closest external fit. |
| Dock (`https://www.dock.us/`) | Horizontal product selectors and cropped interface staging informed the product-surface/reference-module presentation. |
| Outseta (`https://www.outseta.com/`) | Bordered modules with compact labels, icon squares, and row-level details informed the reference modules. |
| Peppermint (`https://paywithpeppermint.com/`) | Single-offer hierarchy is useful; loud illustration, playful copy, and saturated palette were rejected for this company site. |
| Front (`https://front.com/`) | Centered statement, three proof tracks, and large cropped product image informed the section pacing, not the saturated purple theme or product claims. |

     Applied outcome: the home page now uses a Neelvara-blue company hero, entity ledger, problem-first bento grid, spotlight cards, pull quote, product band, contact-routing cards, CTA, and footer instead of a product-funnel SaaS template.

Additional applied outcome: the latest external audit removed internal reference labels, product-count proof, page-count proof, storage/API wording, and broad boundary tables from public copy while preserving the no-form, no-database, company-site boundary.

Additional applied outcome: a follow-up polish pass changed the hero artifact from a numeric product-total proof to company routing, and changed the homepage bento boundary list from positive/negative checks to affirmative company, product-site, contact, and policy routing.

Additional applied outcome: the July 11 homepage simplification removed that routing artifact entirely so visitors reach the company, product, and contact summary sooner.

Additional applied outcome: the July 4 content polish replaced generic portfolio/problem framing with infrastructure wording around maintained information sources, product boundaries, company reference, and routing.

---

## Security Checklist

| Check | Status | Evidence |
| --- | --- | --- |
| No Neelvara API routes | Pass | Route files are pages plus static sitemap, robots, security.txt, and 404 responses only |
| No forms or submissions | Pass | Contact page uses displayed email contacts |
| No account/auth surface | Pass | No Neelvara auth routes |
| No analytics script | Pass | No analytics package or external script |
| Shared middleware remains generic | Pass | No Neelvara-specific middleware branch added |
| Privacy notice scope | Pass | Privacy page identifies technical request logs, visitor-initiated email data, and product-policy exclusions |

---

## Legal Content Audit

Audit date: June 20, 2026.

| Check | Status | Evidence |
| --- | --- | --- |
| Official privacy reference checked | Pass | DPDP Act and DPDP Rules official MeitY/PIB references reviewed for clear notice, purpose, and contact expectations |
| Official e-commerce reference checked | Pass | Consumer Protection e-commerce duties reviewed; company site has no checkout, order flow, marketplace, refund path, or paid-service terms |
| Runtime legal copy scoped | Pass | `/legal` says product policies stay on product sites and does not claim incorporation, subsidiaries, or holding-company structure |
| Runtime privacy copy scoped | Pass | `/privacy` identifies technical request logs, visitor-initiated email data, and product-policy exclusions |
| Runtime terms copy scoped | Pass | `/terms` keeps checkout, subscriptions, product onboarding, refunds, cancellation, payment, warranty, and service availability on product sites |
| Runtime contact copy scoped | Pass | `/contact` warns not to send private records, secrets, customer datasets, or sensitive documents unless requested by the legal/privacy inbox |
| Structured data scoped | Pass | Rendered JSON-LD uses `knowsAbout` for MenuList and Answerlattice and does not use `owns` |

Targeted legal route checks on local runtime:

Rechecked after the Neelvara current-color Prism glass relayout at `http://localhost:3000/__neelvara`.

Result: all returned `200`.

Rendered content assertions passed for:

- legal policy split and no JSON-LD `owns`
- privacy technical-log and email-inquiry scope
- terms paid-service deferral
- contact sensitive-document warning

Current Chrome DevTools Protocol checks passed for `/legal`, `/privacy`, `/terms`, and `/contact` at `1440x1000`, `375x812`, and `320x720`; every route had `scrollWidth === clientWidth`, valid H1 content, and scoped structured data.

---

## Firebase Cost Checklist

| Check | Status | Evidence |
| --- | --- | --- |
| Firestore reads | Pass | 0 |
| Firestore writes | Pass | 0 |
| Firestore deletes | Pass | 0 |
| Firebase Auth | Pass | 0 |
| Cloud Functions | Pass | 0 |
| Firebase Storage | Pass | 0 |
| Firebase rules/indexes | Pass | No changes |
| Firebase deploy | Pass | Not required |

---

## Validation Commands

```bash
git diff --check -- src/app/sites/neelvara src/app/layout.tsx src/constants/neelvara __docs__/neelvara-main-website __docs__/changelog.md public/neelvara*
npx tsc --noEmit --incremental false --pretty false
npm run lint -- --dir src/app/sites/neelvara --file src/app/layout.tsx --file src/middleware.ts
node scripts/verification/verify-agent-readiness.js --env-targets-only
```

Result:

- scoped diff integrity: pass
- focused Neelvara lint: pass
- Neelvara logo verifier: pass
- environment-target verification: pass
- documentation links: 0 broken links; 62 existing video-artifact filename warnings outside this feature
- documented npm commands: pass
- full TypeScript: blocked by unrelated `TS2802` errors in `src/lib/campaigncue/exportArchiveClient.ts:48` and `:89`; no Neelvara diagnostic reported

---

## Route QA

Local route checks on `http://localhost:3000`:

| Route | Status |
| --- | --- |
| `/__neelvara` | 200 |
| `/__neelvara/products` | 200 |
| `/__neelvara/about` | 200 |
| `/__neelvara/contact` | 200 |
| `/__neelvara/legal` | 200 |
| `/__neelvara/privacy` | 200 |
| `/__neelvara/terms` | 200 |
| `/__neelvara/robots.txt` | 200 |
| `/__neelvara/sitemap.xml` | 200 |
| `/__neelvara/.well-known/security.txt` | 200 |
| `/__neelvara/missing-page` | 404 |

Additional internal route checks also passed for `/sites/neelvara`, `/sites/neelvara/products`, `/sites/neelvara/about`, `/sites/neelvara/contact`, `/sites/neelvara/legal`, `/sites/neelvara/privacy`, and `/sites/neelvara/terms`.

Rendered link checks confirmed local internal links keep the `/__neelvara` prefix.

Rendered content checks confirmed all public pages include the current-public-lineup relationship wording and do not expose the old MenuList-only relationship sentence.

Rendered product-link checks confirmed the Products page exposes only MenuList and Answerlattice canonical production URLs.

Rendered product-boundary checks confirmed no exact public-page hits for private, reserved, or unapproved names: Canonica, GrowthOS, Growth Kits, KitStamp, SurfaceOS, MyCodex, or SignalDesk. The same rendered sweep found no `future products`, `product portfolio`, or standalone `portfolio` wording.

---

## Browser QA

Chrome DevTools Protocol verification:

| Viewport | Routes | Result |
| --- | --- | --- |
| Desktop 1440x1000 | Home, Products, About, Contact, Legal, Privacy, Terms, missing route | `scrollWidth === clientWidth`; no overflow, no old palette tokens, and no unexpected 404 |
| Mobile 390x844 | Home, Products, About, Contact, Legal, Privacy, Terms, missing route | `scrollWidth === clientWidth`; no overflow, no old palette tokens, and no unexpected 404 |
| Mobile 320x720 | Home, Products, About, Contact, Legal, Privacy, Terms, missing route | `scrollWidth === clientWidth`; no overflow, no old palette tokens, and no unexpected 404 |

Additional measured evidence:

- primary CTA text color: `rgb(255, 255, 255)`
- primary CTA `-webkit-text-fill-color`: `rgb(255, 255, 255)`
- home background color: `rgb(247, 249, 252)`
- home text color: `rgb(7, 19, 35)`
- primary CTA background: `linear-gradient(135deg, rgb(20, 87, 217) 0%, rgb(39, 55, 200) 68%, rgb(101, 66, 232) 100%)`
- logo mark background: `url("/neelvara-logo.svg") center / contain no-repeat`
- visible logo mark source: `public/neelvara-logo.svg`, preserving the uploaded `0 0 1135 686` true-vector canvas, one compound path, and exact approved blue-to-violet gradient colors
- `public/neelvara-logo.png`, favicon derivatives, Apple touch icon, and manifest icon derivatives have transparent corner pixels
- page metadata exposes title, description, canonical, Open Graph, Twitter, manifest, favicon, Apple touch icon, theme color, and Organization JSON-LD on all public pages
- desktop home H1: `Neelvara Systems`
- mobile home H1: `Neelvara Systems`
- mobile 390x844 document width: `390px`, scroll width: `390px`
- mobile 320x720 document width: `320px`, scroll width: `320px`
- Neelvara cookie banner check: no banner is mounted
- visible touch-target check: no small visible targets across all tested routes/viewports
- homepage hero flows directly into the compact entity ledger on all viewports
- active nav check: primary header nav exposes Products, About, and Contact; Legal, Privacy, and Terms remain available through footer/legal links
- current-public-lineup check: Home and Products show MenuList and Answerlattice only
- unpublished-product check: no public route renders CampaignCue
- 404 check: unmatched Neelvara routes return HTTP `404`, `noindex`, and a plain Neelvara-branded page

---

## Documentation Cross-Check

| Check | Status | Evidence |
| --- | --- | --- |
| Feature README status updated | Pass | README records the restrained company-site presentation, current host boundary, and validation commands |
| Spec no longer draft | Pass | Specification status is implemented/validated and includes current-color Prism glass presentation constraints |
| Marketing no longer pre-redesign | Pass | Presentation direction accepts scoped Neelvara mesh/prism/glass and rejects unrelated gradient systems |
| Help/support boundary current | Pass | Helpdoc confirms the redesign does not alter support routing or data scope |
| Test cases include visual checks | Pass | Test cases include Neelvara mesh/glass, section order, mobile hero, and CTA contrast checks |
| Implementation inventory current | Pass | Implementation doc lists `SpotlightCard.tsx`, Neelvara styles, and confirms no Neelvara cookie-banner mount remains |

---

## Remaining Launch Blockers

These are owner-side or deployment-side blockers, not code blockers:

- explicit Vercel deployment, domain attachment, and DNS cutover from the current GoDaddy Website Builder page
- send/receive verification for `hello@neelvara.com`, `legal@neelvara.com`, and `privacy@neelvara.com`; authentication records already exist
- CA/legal approval of public identity wording
- trademark/search evidence pack

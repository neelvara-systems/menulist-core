# Neelvara Main Website - Validation Report

**Status:** Validated; pending owner/legal launch review
**Implementation date:** June 20, 2026
**Last cross-check:** July 5, 2026
**Runtime:** Shared Next.js/Vercel app under `src/app/sites/neelvara/`
**Local QA URL:** `http://localhost:3000/__neelvara`

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

- `git diff --check -- src/app/sites/neelvara src/app/sites/neelvara/[...missing]/route.ts __docs__/neelvara-main-website __docs__/CHANGELOG.md public/fonts/neelvara`: pass.
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
- Adjusted the active reference tab to dark text over the parent-logo gradient for better contrast.
- Added reduced-motion and reduced-transparency handling for the glass interface without changing the logo geometry, product routing, legal copy, or static-site boundary.
- Applied the repo-local Taste pre-flight: the Home product lineup now stays in the same light/frosted page theme instead of switching to a dark band, and Neelvara viewport-height guards now use `100dvh`.
- Added a self-hosted Akshar wordmark font for the header brand, footer brandline, and Home brand H1 only. Body copy, nav labels, legal text, product descriptions, routes, and logo geometry remained unchanged in that pass.

Verification completed in this pass:

- `npm run lint -- --dir src/app/sites/neelvara --file src/app/layout.tsx --file src/middleware.ts`: pass.
- `npx tsc --noEmit --incremental false --pretty false`: pass.
- `git diff --check -- src/app/sites/neelvara src/app/layout.tsx src/constants/neelvara __docs__/neelvara-main-website __docs__/CHANGELOG.md public/neelvara*`: pass.
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
- Neelvara global CSS is imported from `src/app/layout.tsx`, matching the existing Answerlattice/CampaignCue product-site CSS pattern so the Neelvara styles are emitted inside `/_next/static/css/app/layout.css`.
- Generic presentation selectors such as `glass`, `serif`, `mono`, and `gradient-text` are scoped under `.neelvara-site` so the root CSS import does not leak Neelvara styling into other app surfaces.
- Brand gradients and inline color chips now use the actual Neelvara logo palette: `#6F86E2`, `#9FC6F6`, `#8798E7`, `#B7ACEF`, `#A9C2F5`, `#D0C8F4`, and `#D9CBF3`; the older saturated site gradient colors are not present in Neelvara source, rendered HTML, or the emitted CSS asset.
- No product funnel, pricing, lead form, analytics, auth, API route, Firebase runtime, cookie banner, Vercel deploy, or production build was added.

Verification completed in this pass:

- `npm run lint -- --dir src/app/sites/neelvara --file src/app/layout.tsx --file src/middleware.ts`: pass.
- `npx tsc --noEmit --incremental false --pretty false`: pass.
- `node scripts/verification/verify-agent-readiness.js --env-targets-only`: pass.
- `git diff --check -- src/app/sites/neelvara src/app/layout.tsx src/constants/neelvara __docs__/neelvara-main-website __docs__/CHANGELOG.md public/neelvara*`: pass.
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
- Kept MenuList and CampaignCue product marks unchanged.

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
- MyCodex alias smoke with `Host: www.menulist.digital`: `/nv` and `/nv/products` return `200` with `X-Robots-Tag: noindex, nofollow`.
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
- Relationship language changed to `MenuList, Answerlattice, and CampaignCue are operated by Neelvara Systems.`
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
- Alias smoke for `/nv/products` with `Host: www.menulist.digital`: pass, including `X-Robots-Tag: noindex, nofollow`
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
- `https://campaigncue.ai`: DNS did not resolve from this environment
- `https://campaigncue.menulist.online`: HTTP 200 and routes to `x-product-id: campaigncue`

Launch blocker: Neelvara currently links to the repo production CampaignCue target, `https://campaigncue.ai`. DNS for that production domain must be configured, or the product deployment target must be intentionally changed in a separate deployment-target review.

Owner-side launch blocker: configure and verify SPF, DKIM, and DMARC for `neelvara.com` contact inboxes before treating email trust as complete.

---

## Neelvara Current-Color Prism Glass Validation

The Neelvara site was recalibrated against the approved blue-rooted Neelvara brand direction and then relaid out with the Prism glass format while preserving the company-site legal/data boundary.

| Check | Status | Evidence |
| --- | --- | --- |
| Neelvara palette tokens present | Pass | `styles.css` defines `#071323`, `#1457D9`, `#2384FF`, `#2737C8`, `#6542E8`, `#F7F9FC`, `#EEF3FA`, and `#5D6678` |
| Brand ratio preserved | Pass | Ice-white page canvas and pale surfaces dominate; navy product band and blue CTAs are controlled accents |
| Uploaded logo applied | Pass | Header/footer, favicon metadata, manifest, Organization JSON-LD, and OG metadata use the uploaded glass-prism logo source or derivatives with no visible frame |
| Warm palette removed | Pass | Runtime styles and public SVG assets no longer use rose, peach, amber, cyan-heavy, or pure-purple branding |
| Mesh and grain layers present | Pass | `src/app/sites/neelvara/styles.css` defines `.nv-page-mesh` and `.nv-grain` |
| Shared glass primitive present | Pass | `styles.css` defines `.glass` and spotlight cards reuse the same fill/stroke/blur treatment |
| Akshar typography present | Pass | `styles.css` self-hosts Akshar and uses it as the primary font across display headings, body copy, buttons, labels, legal pages, product cards, and page chrome, with Inter only as fallback |
| Floating glass nav present | Pass | `src/app/sites/neelvara/content.tsx` renders `nv-header-inner glass` |
| Home page rebuilt in company-site section order | Pass | Home includes hero, studio mock, marquee, ledger, problem-first bento, spotlight cards, quote, comparison table, product lineup, contact routes, CTA, and footer |
| Secondary pages redesigned | Pass | `SecondaryPage` renders mesh/glass page hero, current-color Prism panel, spotlight cards, glass text panels, policy dates where needed, and page-specific final CTAs for About, Legal, Privacy, and Terms |
| Custom Products page | Pass | `/products` explains operated products, product boundaries, focus chips, direct product-site CTAs, and uses the shared Prism page panel |
| Custom Contact page | Pass | `/contact` routes company inboxes, product support links, before-you-contact guidance, country of operation, and uses the shared Prism page panel |
| Product/legal boundary preserved | Pass | No pricing, checkout, lead form, account, API route, Firebase, analytics, or owner app surface added |
| Small-phone hero behavior | Pass | `styles.css` hides the large hero mock under `640px`; CDP audit at `375x812` shows ledger top at `688px` and no overflow |
| Solid CTA contrast | Pass | Primary CTA uses white text on Neel blue/indigo gradient |
| Desktop first viewport | Pass | CDP audit at `1440x1000` shows ledger top at `925px`, no horizontal overflow |
| Direct CampaignCue SVG render | Pass | Home and Products HTML now use `src="/campaigncue-icon.svg"` directly and do not emit `/_next/image` optimizer URLs |

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
| Public lineup positioning | Pass | Runtime copy shows MenuList, Answerlattice, and CampaignCue as products operated by Neelvara Systems without the old MenuList-only relationship line |
| Product links | Pass | Home and Products page link to `https://menulist.ai`, `https://answerlattice.com`, and `https://campaigncue.ai` |
| Product logos | Pass | Home product rows render the MenuList logo mark, Answerlattice logo mark, and CampaignCue icon from existing repo assets/components |
| Product link affordance | Pass | Linked product rows show an external-link icon on desktop and mobile |
| Product section visual strength | Pass | Home product section uses a dark product band with actual product marks and direct product links |
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
| Runtime contact copy scoped | Pass | `/contact` warns not to send PAN, residential address, private registration records, or sensitive documents unless requested by the legal/privacy inbox |
| Structured data scoped | Pass | Rendered JSON-LD uses `knowsAbout` for MenuList, Answerlattice, and CampaignCue and does not use `owns` |

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
git diff --check -- src/app/sites/neelvara src/app/layout.tsx src/constants/neelvara __docs__/neelvara-main-website __docs__/CHANGELOG.md public/neelvara*
npx tsc --noEmit --incremental false --pretty false
npm run lint -- --dir src/app/sites/neelvara --file src/app/layout.tsx --file src/middleware.ts
node scripts/verification/verify-agent-readiness.js --env-targets-only
```

Result: pass.

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

Rendered product-link checks confirmed the Products page exposes MenuList, Answerlattice, and CampaignCue canonical production URLs.

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
- visible logo mark source: `public/neelvara-logo.svg`, using the uploaded 578x328 true-vector path geometry with the approved frosted parent palette
- `public/neelvara-logo.png`, favicon derivatives, Apple touch icon, and manifest icon derivatives have transparent corner pixels
- page metadata exposes title, description, canonical, Open Graph, Twitter, manifest, favicon, Apple touch icon, theme color, and Organization JSON-LD on all public pages
- desktop home H1: `Neelvara Systems`
- mobile home H1: `Neelvara Systems`
- mobile 390x844 document width: `390px`, scroll width: `390px`
- mobile 320x720 document width: `320px`, scroll width: `320px`
- Neelvara cookie banner check: no banner is mounted
- visible touch-target check: no small visible targets across all tested routes/viewports
- large hero mock is hidden on small phones by design; desktop/tablet retains the full studio mock
- active nav check: primary header nav exposes Products, About, and Contact; Legal, Privacy, and Terms remain available through footer/legal links
- current-public-lineup check: Home and Products show MenuList, Answerlattice, and CampaignCue
- stale relationship check: no public route renders the old MenuList-only relationship sentence
- 404 check: unmatched Neelvara routes return HTTP `404`, `noindex`, and a plain Neelvara-branded page
- desktop screenshot: `tmp/neelvara-blue-palette-desktop-2026-06-28.png`
- mobile screenshot: `tmp/neelvara-blue-palette-mobile-390-2026-06-28.png`
- SVG logo desktop screenshot: `tmp/neelvara-svg-logo-clean-desktop-2026-06-29.png`
- SVG logo mobile screenshot: `tmp/neelvara-svg-logo-clean-mobile-390-2026-06-29.png`
- product-logo render check: Home and Products HTML use direct `/campaigncue-icon.svg` and no `/_next/image` optimizer URL

---

## Documentation Cross-Check

| Check | Status | Evidence |
| --- | --- | --- |
| Feature README status updated | Pass | README now records the current-color Prism glass relayout and current validation commands |
| Spec no longer draft | Pass | Specification status is implemented/validated and includes current-color Prism glass presentation constraints |
| Marketing no longer pre-redesign | Pass | Presentation direction accepts scoped Neelvara mesh/prism/glass and rejects unrelated gradient systems |
| Help/support boundary current | Pass | Helpdoc confirms the redesign does not alter support routing or data scope |
| Test cases include visual checks | Pass | Test cases include Neelvara mesh/glass, section order, mobile hero, and CTA contrast checks |
| Implementation inventory current | Pass | Implementation doc lists `SpotlightCard.tsx`, Neelvara styles, and confirms no Neelvara cookie-banner mount remains |

---

## Remaining Launch Blockers

These are owner-side or deployment-side blockers, not code blockers:

- final domain ownership
- email inbox deliverability
- CA/legal approval of public identity wording
- trademark/search evidence pack
- explicit Vercel deploy request

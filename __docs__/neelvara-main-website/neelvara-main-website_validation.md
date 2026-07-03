# Neelvara Main Website - Validation Report

**Status:** Validated; pending owner/legal launch review
**Implementation date:** June 20, 2026
**Last cross-check:** June 28, 2026
**Runtime:** Shared Next.js/Vercel app under `src/app/sites/neelvara/`
**Local QA URL:** `http://localhost:3000/__neelvara`

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
- Products page rebuilt around `Focused products. One shared direction.`
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

## Neelvara Blue Redesign Validation

The Neelvara site was recalibrated against the approved blue-rooted Neelvara brand direction while preserving the company-site legal/data boundary.

| Check | Status | Evidence |
| --- | --- | --- |
| Neelvara palette tokens present | Pass | `styles.css` defines `#071323`, `#1457D9`, `#2384FF`, `#2737C8`, `#6542E8`, `#F7F9FC`, `#EEF3FA`, and `#5D6678` |
| Brand ratio preserved | Pass | Ice-white page canvas and pale surfaces dominate; navy product band and blue CTAs are controlled accents |
| Uploaded logo applied | Pass | Header/footer, favicon metadata, manifest, Organization JSON-LD, and OG metadata use transparent uploaded-logo PNG assets with no visible frame |
| Warm palette removed | Pass | Runtime styles and public SVG assets no longer use rose, peach, amber, cyan-heavy, or pure-purple branding |
| Mesh and grain layers present | Pass | `src/app/sites/neelvara/styles.css` defines `.nv-page-mesh` and `.nv-grain` |
| Shared glass primitive present | Pass | `styles.css` defines `.glass` and spotlight cards reuse the same fill/stroke/blur treatment |
| Editorial/mono typography present | Pass | `styles.css` imports Instrument Serif, Inter, and JetBrains Mono |
| Floating glass nav present | Pass | `src/app/sites/neelvara/content.tsx` renders `nv-header-inner glass` |
| Home page rebuilt in company-site section order | Pass | Home includes hero, studio mock, ledger, problem-first bento, spotlight cards, quote, product lineup, contact routes, CTA, and footer |
| Secondary pages redesigned | Pass | `SecondaryPage` renders mesh/glass page hero, spotlight cards, glass text panels, policy dates where needed, and page-specific final CTAs for About, Legal, Privacy, and Terms |
| Custom Products page | Pass | `/products` explains the shared information layer, product boundaries, focus chips, and direct product-site CTAs |
| Custom Contact page | Pass | `/contact` routes company inboxes, product support links, before-you-contact guidance, and country of operation |
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

Rechecked after the Neelvara blue redesign at `http://localhost:3000/__neelvara`.

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
git diff --check -- src/app/sites/neelvara src/components/shared/publicCookieConsent/PublicCookieConsentBanner.module.css __docs__/neelvara-main-website
npx tsc --noEmit --incremental false --pretty false
npm run lint -- --dir src/app/sites/neelvara
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
- visible logo mark source: `public/neelvara-logo.svg`, with no `<rect>`, no embedded raster `<image>`, and no background/checkerboard content
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
| Feature README status updated | Pass | README now records the Neelvara blue redesign and current validation commands |
| Spec no longer draft | Pass | Specification status is implemented/validated and includes Neelvara blue presentation constraints |
| Marketing no longer pre-redesign | Pass | Presentation direction accepts scoped Neelvara mesh/glass and rejects unrelated gradient systems |
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

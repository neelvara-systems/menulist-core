# ConstantLayer Main Website - Validation Report

**Status:** Validated; pending owner/legal launch review
**Implementation date:** June 20, 2026
**Last cross-check:** June 26, 2026
**Runtime:** Shared Next.js/Vercel app under `src/app/sites/constantlayer/`
**Local QA URL:** `http://localhost:3000/__constantlayer`

---

## Prism Glass Redesign Validation

The ConstantLayer site was redesigned against the supplied Prism glass design direction while preserving the parent-site legal/data boundary.

| Check | Status | Evidence |
| --- | --- | --- |
| Prism mesh and grain layers present | Pass | `src/app/sites/constantlayer/styles.css` defines `.cl-page-mesh` and `.cl-grain` |
| Shared glass primitive present | Pass | `styles.css` defines `.glass` and spotlight cards reuse the same fill/stroke/blur treatment |
| Editorial/mono typography present | Pass | `styles.css` imports Instrument Serif, Inter, and JetBrains Mono |
| Floating glass nav present | Pass | `src/app/sites/constantlayer/content.tsx` renders `cl-header-inner glass` |
| Home page rebuilt in Prism section order | Pass | Home includes hero, studio mock, ledger, marquee, bento, spotlight cards, quote, stats, comparison, product lineup, contact routes, CTA, footer |
| Secondary pages redesigned | Pass | `SecondaryPage` renders mesh/glass page hero, spotlight cards, glass text panels, and final CTA for Products, About, Contact, Legal, Privacy, and Terms |
| Product/legal boundary preserved | Pass | No pricing, checkout, lead form, account, API route, Firebase, analytics, or owner app surface added |
| Small-phone hero behavior | Pass | `styles.css` hides the large hero mock under `640px`; CDP audit at `375x812` shows ledger top at `688px` and no overflow |
| Solid CTA contrast | Pass | CDP computed `color` and `-webkit-text-fill-color` for `.cl-button-solid` as `rgb(7, 7, 13)` |
| Desktop first viewport | Pass | CDP audit at `1440x1000` shows ledger top at `925px`, no horizontal overflow |

Screenshots captured:

- `/tmp/constantlayer-cdp-desktop-final.png`
- `/tmp/constantlayer-cdp-mobile-final.png`

---

## Engineering Checklist Verification

| Checklist item | Status | Evidence |
| --- | --- | --- |
| Uses existing Next/Vercel product-site architecture | Pass | `src/app/sites/constantlayer/page.tsx` |
| Local product-site path registered | Pass | `src/constants/deploymentTargets.ts` |
| Production domain registered | Pass | `src/constants/deploymentTargets.ts` |
| Product-domain route entry registered | Pass | `src/constants/productDomains.ts` |
| No ConstantLayer database product code | Pass | No `PRODUCT_IDS.CONSTANTLAYER` in `src/constants/product.ts` |
| Empty Firebase project id | Pass | `constantlayer` targets use `firebaseProjectId: ''` |
| Entity strings centralized | Pass | `src/constants/constantlayer/website.ts` |
| Public relationship line centralized | Pass | `src/constants/constantlayer/website.ts` |
| Public lineup centralized | Pass | `src/constants/constantlayer/website.ts` |
| Public routes centralized for sitemap | Pass | `src/constants/constantlayer/website.ts` |
| Canonical URL helper | Pass | `src/constants/constantlayer/website.ts` |
| Global metadata in layout | Pass | `src/app/sites/constantlayer/layout.tsx` |
| JSON-LD support | Pass | `src/app/sites/constantlayer/content.tsx` |
| Header and footer shared across pages | Pass | `src/app/sites/constantlayer/content.tsx` |
| Static page chrome | Pass | Local path prefix is handled in `SiteHeaderNav.tsx`; no server header dependency remains |
| Bare local prefix | Pass | `/__constantlayer` rewrites through the ConstantLayer home alias instead of falling into the global 404 |
| Sitemap route | Pass | `src/app/sites/constantlayer/sitemap.xml/route.ts` |
| Robots route | Pass | `src/app/sites/constantlayer/robots.txt/route.ts` |
| 404 catch-all | Pass | `src/app/sites/constantlayer/[...missing]/route.ts` returns HTTP `404` |

---

## UI Checklist

| Check | Status | Evidence |
| --- | --- | --- |
| Design tokens scoped to ConstantLayer site | Pass | `src/app/sites/constantlayer/styles.css` |
| Prism token values used | Pass | deep midnight canvas, six-stop mesh palette, glass fill/stroke/blur tokens in `styles.css` |
| Single fixed mesh background | Pass | `.cl-page-mesh` is the only full-page glow layer; sections do not introduce unrelated hue systems |
| Glass surfaces use consistent primitive | Pass | Header, cards, tables, product band, and CTAs reuse the same glass fill/stroke/blur language |
| Hero identifies brand in first viewport | Pass | Home H1 is `ConstantLayer Systems` |
| Hero brand does not split mid-word | Pass | Desktop and mobile screenshots show `ConstantLayer` intact |
| Hero leaves next-section signal | Pass | Home page shows the entity ledger on all tested desktop, tablet, and mobile viewports |
| Touch targets | Pass | Visible links/buttons measured with no sub-36px hit areas after scoped brand, footer, and compact ConstantLayer cookie-banner target fixes |
| Active navigation | Pass | Header nav marks Products, About, Contact, and Legal-family pages with `aria-current="page"` |
| Public-facing copy | Pass | Homepage no longer exposes internal UI/design critique language |
| Text overlap guards | Pass | CSS uses `min-width: 0`, responsive clamps, and wrapping rules |
| Mobile breakpoint coverage | Pass | Browser checks at 390px and 320px |
| Public lineup positioning | Pass | Runtime copy shows MenuList, Answerlattice, and CampaignCue as current public product surfaces without the old MenuList-only relationship line |
| Product links | Pass | Home and Products page link to `https://menulist.ai`, `https://answerlattice.com`, and `https://campaigncue.ai` |
| Product link affordance | Pass | Linked product rows show an external-link icon on desktop and mobile |
| Product section visual strength | Pass | Home product section uses a dark product band with a compact current-public-lineup summary panel |
| Reference presentation depth | Pass | Home page uses the Prism hero mock, entity ledger, bento grid, spotlight cards, comparison table, product band, and contact-routing cards |
| Viewport reveal motion | Pass | Section-level `cl-reveal` blocks appear once through a local IntersectionObserver, with reduced-motion fallback and no global smooth-scroll layer |
| Internal alias scope | Pass | `/cl` is documented as private alias context only, not a canonical ConstantLayer URL or product-code alias |
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
| Supahub (`https://supahub.com/`) | Hero proof details and below-fold product-surface signals can add depth, but the purple glow/testimonial-heavy approach is not appropriate for ConstantLayer. |
| Gamma (`https://gamma.app/`) | Product-mode grids and generated-output previews are useful pacing references; rendered browser review was blocked, so only public HTML structure was used. |
| Overflow (`https://overflow.io/`) | Large cropped interface artifacts and a three-mode story pattern informed the reference artifact direction. |
| Protoio Inc. (`https://protoioinc.com/`) | Parent-company restraint, editorial spacing, and product-lineup framing are the closest external fit. |
| Dock (`https://www.dock.us/`) | Horizontal product selectors and cropped interface staging informed the product-surface/reference-module presentation. |
| Outseta (`https://www.outseta.com/`) | Bordered modules with compact labels, icon squares, and row-level details informed the reference modules. |
| Peppermint (`https://paywithpeppermint.com/`) | Single-offer hierarchy is useful; loud illustration, playful copy, and saturated palette were rejected for this parent site. |
| Front (`https://front.com/`) | Centered statement, three proof tracks, and large cropped product image informed the section pacing, not the saturated purple theme or product claims. |

Applied outcome: the home page now uses a Prism glass hero, entity ledger, marquee, bento grid, spotlight cards, pull quote, stats, comparison table, product band, contact-routing cards, CTA, and footer instead of a product-funnel SaaS template.

Additional applied outcome: the reference-site review added a meaningful hero artifact and glass proof sections while preserving the no-form, no-database, parent-site boundary.

---

## Security Checklist

| Check | Status | Evidence |
| --- | --- | --- |
| No ConstantLayer API routes | Pass | Route files are pages, sitemap, and robots only |
| No forms or submissions | Pass | Contact page uses displayed email contacts |
| No account/auth surface | Pass | No ConstantLayer auth routes |
| No analytics script | Pass | No analytics package or external script |
| Shared middleware remains generic | Pass | No ConstantLayer-specific middleware branch added |
| Privacy notice scope | Pass | Privacy page identifies technical request logs, visitor-initiated email data, and product-policy exclusions |

---

## Legal Content Audit

Audit date: June 20, 2026.

| Check | Status | Evidence |
| --- | --- | --- |
| Official privacy reference checked | Pass | DPDP Act and DPDP Rules official MeitY/PIB references reviewed for clear notice, purpose, and contact expectations |
| Official e-commerce reference checked | Pass | Consumer Protection e-commerce duties reviewed; parent site has no checkout, order flow, marketplace, refund path, or paid-service terms |
| Runtime legal copy scoped | Pass | `/legal` says product policies stay on product surfaces and does not claim incorporation, subsidiaries, or holding-company structure |
| Runtime privacy copy scoped | Pass | `/privacy` identifies technical request logs, visitor-initiated email data, and product-policy exclusions |
| Runtime terms copy scoped | Pass | `/terms` keeps checkout, subscriptions, product onboarding, refunds, cancellation, payment, warranty, and service availability on product surfaces |
| Runtime contact copy scoped | Pass | `/contact` warns not to send PAN, residential address, private registration records, or sensitive documents unless requested by the legal/privacy inbox |
| Structured data scoped | Pass | Rendered JSON-LD uses `knowsAbout` for MenuList, Answerlattice, and CampaignCue and does not use `owns` |

Targeted legal route checks on local runtime:

Rechecked after the Prism redesign at `http://localhost:3000/__constantlayer`.

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
git diff --check -- src/app/sites/constantlayer src/components/shared/publicCookieConsent/PublicCookieConsentBanner.module.css __docs__/constantlayer-main-website
npx tsc --noEmit --incremental false --pretty false
npm run lint -- --dir src/app/sites/constantlayer
node scripts/verification/verify-agent-readiness.js --env-targets-only
```

Result: pass.

---

## Route QA

Local route checks on `http://localhost:3000`:

| Route | Status |
| --- | --- |
| `/__constantlayer` | 200 |
| `/__constantlayer/products` | 200 |
| `/__constantlayer/about` | 200 |
| `/__constantlayer/contact` | 200 |
| `/__constantlayer/legal` | 200 |
| `/__constantlayer/privacy` | 200 |
| `/__constantlayer/terms` | 200 |
| `/__constantlayer/robots.txt` | 200 |
| `/__constantlayer/sitemap.xml` | 200 |
| `/__constantlayer/missing-page` | 404 |

Additional internal route checks also passed for `/sites/constantlayer`, `/sites/constantlayer/products`, `/sites/constantlayer/about`, `/sites/constantlayer/contact`, `/sites/constantlayer/legal`, `/sites/constantlayer/privacy`, and `/sites/constantlayer/terms`.

Rendered link checks confirmed local internal links keep the `/__constantlayer` prefix.

Rendered content checks confirmed all public pages include the current-public-lineup relationship wording and do not expose the old MenuList-only relationship sentence.

Rendered product-link checks confirmed the Products page exposes MenuList, Answerlattice, and CampaignCue canonical production URLs.

---

## Browser QA

Chrome DevTools Protocol verification:

| Viewport | Routes | Result |
| --- | --- | --- |
| Desktop 1440x1000 | Home, Products, About, Contact, Legal, Privacy, Terms | `scrollWidth === clientWidth`; no overflow, clipped text, or small visible targets |
| Mobile 375x812 | Home, Products, About, Contact, Legal, Privacy, Terms | `scrollWidth === clientWidth`; no overflow; homepage ledger begins in the first viewport |
| Mobile 320x720 | Home, Products, About, Contact, Legal, Privacy, Terms | `scrollWidth === clientWidth`; no overflow across all pages |

Additional measured evidence:

- primary CTA text color: `rgb(7, 7, 13)`
- primary CTA `-webkit-text-fill-color`: `rgb(7, 7, 13)`
- desktop home H1: `ConstantLayer Systems`
- desktop 1440x1000 ledger top: `925px`
- mobile home H1: `ConstantLayer Systems`
- mobile 375x812 ledger top: `688px`
- mobile 375x812 document width: `375px`, scroll width: `375px`
- mobile 320x720 document width: `320px`, scroll width: `320px`
- mobile 320x720 ledger top: `715px`
- first-visit cookie banner height: `95px` desktop, `135px` at 375px mobile, `123px` at 320px mobile
- visible touch-target check: no small visible targets across all tested routes/viewports
- large hero mock is hidden on small phones by design; desktop/tablet retains the full studio mock
- active nav check: Products/About/Contact mark themselves; Legal also marks Legal, Privacy, and Terms pages
- current-public-lineup check: Home and Products show MenuList, Answerlattice, and CampaignCue
- stale relationship check: no public route renders the old MenuList-only relationship sentence
- 404 check: unmatched ConstantLayer routes return HTTP `404`, `noindex`, and a plain ConstantLayer-branded page
- desktop screenshot: `/tmp/constantlayer-cdp-desktop-final.png`
- mobile screenshot: `/tmp/constantlayer-cdp-mobile-final.png`

---

## Documentation Cross-Check

| Check | Status | Evidence |
| --- | --- | --- |
| Feature README status updated | Pass | README now records the Prism redesign and current validation commands |
| Spec no longer draft | Pass | Specification status is implemented/validated and includes Prism presentation constraints |
| Marketing no longer pre-redesign | Pass | Presentation direction accepts scoped Prism mesh/glass and rejects unrelated gradient systems |
| Help/support boundary current | Pass | Helpdoc confirms the redesign does not alter support routing or data scope |
| Test cases include visual checks | Pass | Test cases include Prism mesh/glass, section order, mobile hero, and CTA contrast checks |
| Implementation inventory current | Pass | Implementation doc lists `SpotlightCard.tsx`, Prism styles, and the ConstantLayer-only cookie-banner touch-target stylesheet change |

---

## Remaining Launch Blockers

These are owner-side or deployment-side blockers, not code blockers:

- final domain ownership
- email inbox deliverability
- CA/legal approval of public identity wording
- trademark/search evidence pack
- explicit Vercel deploy request

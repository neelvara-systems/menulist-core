# ConstantLayer Main Website - Validation Report

**Status:** Validated; pending owner/legal launch review  
**Implementation date:** June 20, 2026  
**Runtime:** Shared Next.js/Vercel app under `src/app/sites/constantlayer/`  
**Local QA URL:** `http://127.0.0.1:3020/__constantlayer`

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
| Portfolio relationship line centralized | Pass | `src/constants/constantlayer/website.ts` |
| Product lineup centralized | Pass | `src/constants/constantlayer/website.ts` |
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
| Main website token values used | Pass | white/slate/blue tokens in `styles.css` |
| No full-page decorative gradient/orb backgrounds | Pass | `styles.css` uses solid token backgrounds with a restrained system-scene layer |
| Cards use 8px radius | Pass | `--cl-radius: 8px` |
| Hero identifies brand in first viewport | Pass | Home H1 is `ConstantLayer Systems` |
| Hero brand does not split mid-word | Pass | Desktop and mobile screenshots show `ConstantLayer` intact |
| Hero leaves next-section signal | Pass | Home page shows the entity ledger on all tested desktop, tablet, and mobile viewports |
| Touch targets | Pass | Visible links/buttons measured at 44px minimum target size |
| Active navigation | Pass | Header nav marks Products, About, Contact, and Legal-family pages with `aria-current="page"` |
| Public-facing copy | Pass | Homepage no longer exposes internal UI/design critique language |
| Text overlap guards | Pass | CSS uses `min-width: 0`, responsive clamps, and wrapping rules |
| Mobile breakpoint coverage | Pass | Browser checks at 390px and 320px |
| Portfolio positioning | Pass | Runtime copy shows MenuList, Answerlattice, and CampaignCue without the old MenuList-only relationship line |
| Product links | Pass | Home and Products page link to `https://menulist.ai`, `https://answerlattice.com`, and `https://campaigncue.ai` |
| Product link affordance | Pass | Linked product rows show an external-link icon on desktop and mobile |
| Product section visual strength | Pass | Home product section uses a dark portfolio band with a compact summary panel instead of the oversized `Portfolio` wordmark |
| Reference presentation depth | Pass | Hero scene uses labeled parent-record/product-surface/routing artifacts, and the home page includes reference modules for entity, product, and contact verification |
| Viewport reveal motion | Pass | Section-level `cl-reveal` blocks appear once through a local IntersectionObserver, with reduced-motion fallback and no global smooth-scroll layer |
| Internal alias scope | Pass | `/cl` is documented as a MyCodex/private portfolio alias only, not a canonical ConstantLayer URL or product-code alias |
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

Applied outcome: the home page now uses an editorial hero, entity ledger, dark portfolio relationship band, row-based operating principles, and a direct contact directory instead of a card-heavy SaaS template.

Additional applied outcome: the reference-site review added a meaningful hero artifact and a restrained reference-modules section while preserving the no-form, no-database, parent-site boundary.

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

```bash
curl -s -o /tmp/cl-legal.html -w '%{http_code}' http://127.0.0.1:3020/__constantlayer/legal
curl -s -o /tmp/cl-privacy.html -w '%{http_code}' http://127.0.0.1:3020/__constantlayer/privacy
curl -s -o /tmp/cl-terms.html -w '%{http_code}' http://127.0.0.1:3020/__constantlayer/terms
curl -s -o /tmp/cl-contact.html -w '%{http_code}' http://127.0.0.1:3020/__constantlayer/contact
```

Result: all returned `200`.

Rendered content assertions passed for:

- legal policy split and no JSON-LD `owns`
- privacy technical-log and email-inquiry scope
- terms paid-service deferral
- contact sensitive-document warning

Bundled Playwright layout checks passed for `/legal`, `/privacy`, `/terms`, and `/contact` at `1440x900` and `390x844`; every route had `scrollWidth === clientWidth`, valid H1 content, no small visible targets, and scoped structured data.

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
npx tsc --noEmit --incremental false --pretty false
node scripts/verification/verify-agent-readiness.js
npm run lint
git diff --check -- src/app/sites/constantlayer src/constants/constantlayer src/constants/deploymentTargets.ts src/constants/productDomains.ts src/constants/urls.ts src/lib/env/validateEnv.ts scripts/verification/verify-agent-readiness.js __docs__/constantlayer-main-website __docs__/url-routing-architecture __docs__/CHANGELOG.md public/constantlayer-icon.svg public/constantlayer.webmanifest
```

Result: pass.

---

## Route QA

Local route checks on `http://127.0.0.1:3020`:

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

Rendered link checks confirmed local internal links keep the `/__constantlayer` prefix.

Rendered content checks confirmed all public pages include the portfolio relationship wording and do not expose the old MenuList-only relationship sentence.

Rendered product-link checks confirmed the Products page exposes MenuList, Answerlattice, and CampaignCue canonical production URLs.

---

## Browser QA

Chrome DevTools Protocol verification:

| Viewport | Routes | Result |
| --- | --- | --- |
| Desktop 1440x900 | Home, Products, About, Contact, Legal, Privacy, Terms | `scrollWidth === clientWidth`; no overflow, clipped text, or small visible targets |
| Desktop 1280x720 | Home, Products, About, Contact, Legal, Privacy, Terms | `scrollWidth === clientWidth`; home exposes the entity ledger below the hero |
| Tablet 768x1024 | Home, Products, About, Contact, Legal, Privacy, Terms | `scrollWidth === clientWidth`; system scene no longer collides with headline |
| Mobile 390x844 | Home, Products, About, Contact, Legal, Privacy, Terms | `scrollWidth === clientWidth`; one primary hero CTA and visible entity ledger |
| Mobile 320x568 | Home, Products, About, Contact, Legal, Privacy, Terms | `scrollWidth === clientWidth`; next section signal remains visible |

Additional measured evidence:

- primary and header action button text color: `rgb(255, 255, 255)`
- desktop home H1: `ConstantLayer\nSystems`
- desktop 1440x900 home hero height: `631px`
- desktop 1440x900 next section top: `704px`
- desktop 1280x720 home hero height: `605px`
- desktop 1280x720 next section top: `678px`
- desktop home header height: `73px`
- mobile home H1: `ConstantLayer\nSystems`
- mobile 390x844 home hero height: `420px`
- mobile 390x844 next section top: `551px`
- mobile 320x568 home hero height: `430px`
- mobile 320x568 next section top: `561px`
- mobile home header height after touch-target fix: `131px`
- mobile home action button: `44px` square icon target
- clipped system-scene artwork extends inside the hidden hero layer by design; it does not create document scroll
- active nav check: Products/About/Contact mark themselves; Legal also marks Legal, Privacy, and Terms pages
- portfolio lineup check: Home and Products show MenuList, Answerlattice, and CampaignCue
- stale relationship check: no public route renders the old MenuList-only relationship sentence
- 404 check: unmatched ConstantLayer routes return HTTP `404`, `noindex`, and a plain ConstantLayer-branded page
- desktop screenshot: `/tmp/constantlayer-crosscheck-desktop-wide-home.png`
- desktop short screenshot: `/tmp/constantlayer-crosscheck-desktop-short-home.png`
- mobile screenshot: `/tmp/constantlayer-crosscheck-mobile-standard-home.png`
- mobile product screenshot: `/tmp/constantlayer-crosscheck-mobile-standard-products.png`
- small mobile 404 screenshot: `/tmp/constantlayer-crosscheck-mobile-small-missing.png`

---

## Remaining Launch Blockers

These are owner-side or deployment-side blockers, not code blockers:

- final domain ownership
- email inbox deliverability
- CA/legal approval of public identity wording
- trademark/search evidence pack
- explicit Vercel deploy request

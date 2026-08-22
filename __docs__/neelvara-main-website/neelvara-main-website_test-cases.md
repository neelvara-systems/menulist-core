# Neelvara Main Website - Test Cases

**Status:** Implemented; launch checks pending owner/legal review  
**Scope:** Next/Vercel public product-site route  
**Runtime target:** `src/app/sites/neelvara/`

---

## 1. Documentation Checks

| ID | Check | Expected |
| --- | --- | --- |
| DOC-01 | README exists | `README.md` present in feature folder |
| DOC-02 | Standard docs exist | spec, impl, marketing, website, helpdoc, firebase, mobile-support, test-cases present |
| DOC-03 | Transcript preserved | Raw ChatGPT transcript remains in the folder |
| DOC-04 | Changelog updated | `__docs__/changelog.md` has a dated entry |
| DOC-05 | Repo evidence included | Docs cite product registry and deployment target boundaries |

---

## 2. Architecture Checks

| ID | Check | Expected |
| --- | --- | --- |
| ARCH-01 | Neelvara not added to product ids | No `PRODUCT_IDS.NEELVARA` |
| ARCH-02 | Neelvara added to product-site routing | `src/constants/productDomains.ts` includes `neelvara` |
| ARCH-03 | Neelvara added to deployment targets | local, preview, and production targets exist |
| ARCH-04 | No Firebase project introduced | Neelvara targets have empty `firebaseProjectId` |
| ARCH-05 | Static site only | No Neelvara API routes, server functions, or DB clients |
| ARCH-06 | Local dev prefix works | `/__neelvara/` rewrites to `/sites/neelvara` |
| ARCH-07 | Homepage survives catch-all compilation | Root returns `200` after a missing Neelvara route returns `404` |
| ARCH-08 | Homepage aliases stay canonical | `/__neelvara/home` and `/nv/home` render the same `/sites/neelvara` page |
| ARCH-09 | Alias hydration is stable | Server markup and the first client render agree before internal links resolve to `/__neelvara` or `/nv`; no hydration mismatch is logged |

---

## 3. Content Checks

| ID | Check | Expected |
| --- | --- | --- |
| CNT-01 | Brand spelling | `Neelvara Systems` everywhere |
| CNT-02 | Relationship line | Approved operated-product sentence appears where company/product relationship is explicit |
| CNT-03 | Public lineup | MenuList and Answerlattice are shown; CampaignCue and all other unpublished products are absent |
| CNT-04 | CTA set | Company-site primary CTAs route to `View Products`, contact, or email paths |
| CNT-05 | No product funnel | No pricing, demo, trial, sign-in, or checkout |
| CNT-06 | Legal wording safe | No Pvt Ltd/LLP/Inc/group/holding-company claim unless approved |
| CNT-07 | GST/PAN/address | Not displayed unless approved |
| CNT-08 | Product links | Products page links to MenuList and Answerlattice canonical production URLs only |
| CNT-09 | Public copy audit | No placeholders, hype claims, forbidden AI language, unsupported company-status claims, or inactive product names |
| CNT-10 | Trust boundary | Trust page distinguishes published/current/product-specific/pending-review references and does not invent certifications or security guarantees |

---

## 4. Legal And Compliance Checks

| ID | Check | Expected |
| --- | --- | --- |
| LEG-01 | Trade-name approval | CA/legal confirms display wording |
| LEG-02 | Trademark search | IP India search evidence saved |
| LEG-03 | Domain ownership | Canonical domain is owned and configured |
| LEG-04 | Email delivery | SPF/DKIM/DMARC configured for contact inboxes |
| LEG-05 | Privacy scope | Privacy page covers the company website only |
| LEG-06 | Terms scope | Terms page covers the company website only |
| LEG-07 | Product split | Product data/terms are not absorbed into company website terms |
| LEG-08 | Paid service deferral | Refund/cancellation/payment terms deferred to relevant product sites |
| LEG-09 | Structured data scope | JSON-LD does not claim subsidiaries, holding-company structure, or legal ownership beyond the approved operated-by relationship |
| LEG-10 | Privacy notice detail | Privacy page identifies likely technical logs and visitor-initiated email data |

---

## 5. SEO Checks

| ID | Check | Expected |
| --- | --- | --- |
| SEO-01 | Canonical host | `https://neelvara.com` |
| SEO-02 | Page titles | Unique titles for public pages |
| SEO-03 | Meta descriptions | Unique descriptions for public pages |
| SEO-04 | Canonical tags | Every page has canonical metadata |
| SEO-05 | Sitemap | Public pages included |
| SEO-06 | Robots | `robots.txt` references sitemap |
| SEO-07 | JSON-LD | Organization JSON-LD present |
| SEO-08 | Site logo and icons | `public/neelvara-logo.svg` remains byte-identical to the uploaded source mark; `public/neelvara-favicon.svg` reuses its exact compound path and colors; favicon PNG fallbacks, Apple touch icon, and manifest PNG derivatives exist with transparent corners; the Open Graph asset is an opaque 1200x630 branded card |
| SEO-09 | Missing routes | Unmatched Neelvara URLs return HTTP `404` and `noindex` |
| SEO-10 | Open Graph image | Neelvara pages expose `public/neelvara-og-image.png` in metadata |
| SEO-11 | Security contact discovery | `/.well-known/security.txt` returns a static security contact file |
| SEO-12 | `/nv` alias indexing | `/nv` alias responses carry `X-Robots-Tag: noindex, nofollow` |
| SEO-13 | Trust canonical | `/trust` exposes a canonical URL and appears once in the sitemap |
| SEO-14 | Agent context | `/llms.txt` names the correct company/product boundary, when-to-use guidance, canonical pages, and no-action boundary; canonical destinations use Markdown links rather than plain-text URLs |
| SEO-15 | Markdown negotiation | Homepage requests with `Accept: text/markdown` return Markdown plus `Vary: Accept, Accept-Encoding`; ordinary HTML requests remain unchanged |
| SEO-16 | Agent-friendly 404 | Unknown Markdown requests return a non-reflective Markdown recovery body with HTTP `404` and links to home, `llms.txt`, and sitemap |

---

## 6. Visual And Presentation Checks

| ID | Check | Expected |
| --- | --- | --- |
| VIS-01 | Neelvara mesh/grain | Background mesh and grain are scoped to Neelvara pages |
| VIS-02 | Selective glass primitive | Navigation, product cards, and primary actions use restrained glass/gradient treatment; policy and contact rows remain unframed and readable |
| VIS-03 | No product-funnel import | SaaS pricing/customer/testimonial sections are not copied as-is |
| VIS-04 | Home section order | Brand-first hero, entity ledger, operating approach, relationship statement, product lineup, contact routes, footer |
| COPY-01 | Brand tagline system | Neelvara homepage and generated social card use the approved umbrella tagline; product cards use the approved MenuList and Answerlattice taglines without absolute promises |
| VIS-05 | Homepage transition | Hero flows directly into the entity ledger without a decorative or duplicate company-reference panel |
| VIS-06 | CTA contrast | Solid CTA text remains white and readable in normal, visited, and focus states over the supplied blue-to-violet gradient |
| VIS-07 | Akshar typography | Neelvara content, navigation, buttons, cards, footer, and legal text resolve to Akshar with Inter/system fallback |
| VIS-08 | Scroll reveal completion | Normal scroll, fast scrollbar jumps, Page Down, and anchor movement cannot leave reached sections transparent |
| VIS-09 | Reduced motion | Reveal and decorative motion are disabled while all content remains visible |
| VIS-10 | Header breakpoint separation | Desktop hides the menu toggle and exposes 44px primary links; mobile hides the full nav until the 44px toggle opens it |
| VIS-11 | Product logo source | Answerlattice product placements reuse `src/components/atoms/answerlatticeLogoMark/index.tsx`, the same mark used by the Answerlattice header and footer, without copied or recolored paths |
| VIS-12 | Home product layout | The product section uses an unframed header and two equal product cards on desktop, stacks cards on mobile, preserves actual logos and links, and has no horizontal overflow |
| VIS-13 | Cross-page grid fit | Every repeated-item layout uses the current item count without empty tracks; the two-product detail grid uses two columns and collapses to one column on mobile |
| VIS-14 | No duplicate summary UI | Home has no comparison table or repeated final CTA; Products has no product map; secondary heroes have no right-side summary card |
| VIS-15 | Company-first hierarchy | The homepage H1 is `Neelvara Systems`; the company identity appears before category explanation or product detail |
| VIS-16 | Trust ledger | Trust page opens with a readable status ledger, links to published sources, and keeps policy rows unframed |

---

## 7. Mobile And Accessibility Checks

| ID | Check | Expected |
| --- | --- | --- |
| MOB-01 | 320px-390px width | No overlap or horizontal scroll |
| MOB-02 | Mobile nav | Links remain reachable and do not overlap |
| MOB-03 | Tap targets | Header/footer/CTA targets are at least 44px |
| MOB-04 | Text readability | No viewport-scaled tiny text |
| MOB-05 | Footer legal links | Legal/privacy/terms visible on mobile |
| MOB-06 | Collapsed mobile navigation | Products, About, and Contact remain reachable through the 44px menu control |
| MOB-07 | Secondary information rows | About, Legal, Privacy, and Terms rows collapse to one column without clipped list content or excessive empty space |
| MOB-08 | Trust status rows | Trust ledger and status labels collapse to one column at 320px-390px without overflow |
| A11Y-01 | Keyboard nav | Header, CTAs, and footer links reachable |
| A11Y-02 | Focus states | Browser focus indicator remains visible |
| A11Y-03 | Semantic headings | One H1 per page, logical heading order |
| A11Y-04 | Color contrast | Text and buttons meet readable contrast |
| A11Y-05 | Skip link | The first keyboard target reveals a visible skip link and moves focus to `main-content` |
| A11Y-06 | Zoom | Viewport metadata permits user zoom up to 5x |

---

## 8. Static Code Checks

Run from repo root:

```bash
npx tsc --noEmit --incremental false --pretty false
npm run lint -- --dir src/app/sites/neelvara
node scripts/verification/verify-agent-readiness.js --env-targets-only
```

Expected:

- no TypeScript errors
- no Firebase package required by Neelvara
- no `.env` required for Neelvara pages
- no new dependency required

---

## 9. No-Firebase Checks

| ID | Check | Expected |
| --- | --- | --- |
| FB-01 | Firestore | No Firestore SDK/config/import in Neelvara route |
| FB-02 | Auth | No Firebase Auth |
| FB-03 | Functions | No Cloud Functions |
| FB-04 | Storage | No Firebase Storage |
| FB-05 | Rules/indexes | No Firebase rules/index changes |
| FB-06 | Product pId | No Neelvara pId |
| FB-07 | Cost note | Firebase cost remains zero |

---

## 10. Launch Checks

| ID | Check | Expected |
| --- | --- | --- |
| LCH-01 | Legal approval | Written approval or owner decision recorded |
| LCH-02 | DNS | Canonical host resolves |
| LCH-03 | HTTPS | Valid TLS certificate |
| LCH-04 | Email | Contact inboxes receive and send mail |
| LCH-05 | Email authentication | SPF, DKIM, and DMARC are configured for `neelvara.com` |
| LCH-06 | External links | Product links point to production canonical URLs |
| LCH-07 | Search preview | Titles/descriptions and OG image render correctly |
| LCH-08 | Missing routes | Unmatched Neelvara routes return the Neelvara 404 response |
| LCH-09 | Deployment approval | User explicitly requested Vercel deployment in current session |
| LCH-10 | Product destination availability | Every production product hostname resolves and serves the intended product website |

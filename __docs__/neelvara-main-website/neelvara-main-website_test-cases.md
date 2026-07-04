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

---

## 3. Content Checks

| ID | Check | Expected |
| --- | --- | --- |
| CNT-01 | Brand spelling | `Neelvara Systems` everywhere |
| CNT-02 | Relationship line | Approved operated-product sentence appears where company/product relationship is explicit |
| CNT-03 | Public lineup | MenuList, Answerlattice, and CampaignCue are shown; no inactive, future, or unapproved product cards |
| CNT-04 | CTA set | Company-site primary CTAs route to `View Products`, contact, or email paths |
| CNT-05 | No product funnel | No pricing, demo, trial, sign-in, or checkout |
| CNT-06 | Legal wording safe | No Pvt Ltd/LLP/Inc/group/holding-company claim unless approved |
| CNT-07 | GST/PAN/address | Not displayed unless approved |
| CNT-08 | Product links | Products page links to MenuList, Answerlattice, and CampaignCue canonical production URLs |

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
| SEO-08 | Site logo and icons | `public/neelvara-logo.svg` exists as the source mark; `public/neelvara-favicon.svg` exists as the preferred browser favicon; favicon PNG fallbacks, Apple touch icon, and manifest PNG derivatives exist with transparent corners |
| SEO-09 | Missing routes | Unmatched Neelvara URLs return HTTP `404` and `noindex` |
| SEO-10 | Open Graph image | Neelvara pages expose `public/neelvara-og-image.png` in metadata |
| SEO-11 | Security contact discovery | `/.well-known/security.txt` returns a static security contact file |
| SEO-12 | `/nv` alias indexing | `/nv` alias responses carry `X-Robots-Tag: noindex, nofollow` |

---

## 6. Visual And Presentation Checks

| ID | Check | Expected |
| --- | --- | --- |
| VIS-01 | Neelvara mesh/grain | Background mesh and grain are scoped to Neelvara pages |
| VIS-02 | Glass primitive | Header, cards, policy panels, product band, and CTAs reuse one glass treatment |
| VIS-03 | No product-funnel import | SaaS pricing/customer/testimonial sections are not copied as-is |
| VIS-04 | Home section order | Hero, studio mock, ledger, problem-first bento, spotlight cards, quote, product lineup, contact routes, CTA, footer |
| VIS-05 | Small-phone hero | Large hero mock is hidden on small phones so the entity ledger appears in the first viewport |
| VIS-06 | CTA contrast | Solid CTA text remains dark and readable in normal, visited, and focus states |

---

## 7. Mobile And Accessibility Checks

| ID | Check | Expected |
| --- | --- | --- |
| MOB-01 | 320px-390px width | No overlap or horizontal scroll |
| MOB-02 | Mobile nav | Links remain reachable and do not overlap |
| MOB-03 | Tap targets | Header/footer/CTA targets are at least 44px |
| MOB-04 | Text readability | No viewport-scaled tiny text |
| MOB-05 | Footer legal links | Legal/privacy/terms visible on mobile |
| A11Y-01 | Keyboard nav | Header, CTAs, and footer links reachable |
| A11Y-02 | Focus states | Browser focus indicator remains visible |
| A11Y-03 | Semantic headings | One H1 per page, logical heading order |
| A11Y-04 | Color contrast | Text and buttons meet readable contrast |

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

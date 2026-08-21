# AnswerLattice Website Content Contract

> **Status:** Implemented
> **Last audited:** August 11, 2026 (whole-site route and buyer-language pass)

## Public Source Of Truth

- Route registry and sitemap metadata: `src/app/sites/answerlattice/siteConfig.ts`
- Public claim guardrails: `src/content/answerlatticePublic/guardrails.ts`
- Pricing amounts and limits: `src/data/answerlattice/plans.ts`
- Billing projection: `src/lib/billing/productBillingPlans.ts`
- Install and agent packet: `src/lib/answerlattice/installContract/`
- Public website runtime: `src/app/sites/answerlattice/`

Public pages must not duplicate plan amounts, private dashboard routes, or provider/API contracts when an existing source exists.

## Buyer Journey

1. Homepage starts from the founder's recognizable reality: product knowledge is scattered across docs, tickets, releases, screenshots, recordings, notes, and repeated replies. It shows how AnswerLattice turns that material into reviewed support across the widget, help center, documentation, FAQs, changelog, fallback, feedback review, and future AI-agent context.
2. The founder-review section leads with plain outcomes, then links to Daily Brief, Knowledge Map, Product Friction Evidence, Release Impact Guard, Answer Tests, and public article topic maps without turning the homepage into a dashboard.
3. Demo shows a disclosed seeded support-improvement sequence without Firebase or AI calls.
4. Product, support-control, knowledge-governance, install, security, trust, resources, and comparisons support evaluation.
5. Pricing renders the three monthly plans from the plan source.
6. Get Started validates plan, currency, company, optional product details, selected product pages, and legal links.
7. The authenticated onboarding route creates a workspace and pending provider checkout.
8. Billing and Activation own post-creation payment and launch proof.

## Homepage Front Door

The public product tagline is `The governed source behind customer answers.` The supporting line is `Keep approved product knowledge structured, reviewable, and current across support, docs, search, and AI-assisted surfaces.` Use these as brand-level framing above the existing founder-first hero, not as a replacement for the implemented approved-answer, fallback, and review-loop proof.

The visible homepage description is intentionally shorter: `Turn scattered product knowledge into reviewed support for your widget, help center, docs, search, and AI-assisted surfaces. Approved answers come first; missing coverage becomes visible review work.` Keep the longer transformation wording in metadata where it supports discovery, rather than repeating the full inventory in the first fold.

The footer must present three separate levels: the reviewed-support-layer category, the canonical tagline, and the supporting description. Do not collapse them into one dense paragraph.

The compressed homepage must communicate one transformation before it explains internal product systems:

`scattered founder knowledge -> reviewed support structure -> familiar support destinations -> owner-approved official guidance`

Approved answers, safe fallback, and explicit founder review explain why the support can be trusted. They must remain a differentiator inside the broader support-layer story, not replace that story with answer-only or chatbot positioning. The first fold must not imply a free tier, outsourced support, guaranteed uptime, autonomous publication, or a complete helpdesk replacement.

## Owner Decision Content

The homepage presents outcome-first links into one connected decision path rather than six unexplained internal product names:

`focused Daily Brief -> selected product area -> Product Friction Evidence -> private Knowledge Map context -> Answer Tests and release impact -> explicit owner decision`

The section may link to implemented product-detail routes. It must not fetch tenant data, render private metrics, start real-time listeners, generate a map, or invoke an AI provider.

The private Knowledge Map may include reviewed product structure and owner-only review signals. The public knowledge-base map is a separate sanitized article-heading navigation surface. Public pages must not imply that private entities, drafts, tickets, signals, or raw graph relationships are exposed to readers.

## Discovery

`ANSWERLATTICE_PUBLIC_PAGES` is the sitemap and structured-data page registry. Every registered path must resolve to a public page file and must stay outside private dashboard, API, widget, sign-in, and unauthorized prefixes. The source verifier currently requires 75 canonical routes and admits only two declared aliases: `/home` for `/` and `/use-cases/vibe-coded-saas` for `/use-cases/ai-built-saas`.

The sitemap intentionally omits `lastmod` until page-specific source timestamps exist. A build timestamp is not page freshness evidence.

The homepage SoftwareApplication offer derives Starter monthly INR pricing from the plan source. Review and aggregate-rating schema remain prohibited until real review evidence exists.

## Public Forms

The contact form uses a semantic form, native field constraints, consent, honeypot, Turnstile when configured, bounded request/response bodies, rate limiting, and one AnswerLattice-only enquiry write.

Get Started uses a semantic details form, bound labels, server-matching length limits, safe HTTP(S) URL admission, at least one selected product page, strict response parsing, allowlisted Razorpay checkout URLs, and linked terms/privacy pages.

Browser errors remain fixed and bounded. Provider or API exception text is not rendered.

## Trust And Legal

Trust, security, and privacy may state current source-backed operational controls and current non-claims. Shared retention constants must be used where available. They must not infer certification, a contractual subprocessor schedule, residency, Gemini no-training or zero retention, or a complete deletion guarantee from implementation controls or provider marketing pages.

The Terms page is a product terms summary. It may state that AnswerLattice is operated by Neelvara Systems as the verified operating trade name. Registered-entity identity, governing law, liability, warranty, SLA, customer-specific refund, and jurisdiction language require founder and legal approval and must not be invented in code.

Pricing, FAQ, Billing, and pricing-resource copy must match the operation-level support-credit ledger. Do not use broad phrases such as `AI-assisted answers` or `review work` when the actual charged operation is narrower.

## Verification

Run:

```bash
npm run verify:answerlattice-public-website
npm run verify:answerlattice-public-content-boundary
npm run verify:answerlattice-pwa
```

The public-website verifier is included in `verify:answerlattice-runtime-truth`.

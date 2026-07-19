# AnswerLattice Website Content Contract

> **Status:** Implemented
> **Last audited:** July 19, 2026

## Public Source Of Truth

- Route registry and sitemap metadata: `src/app/sites/answerlattice/siteConfig.ts`
- Public claim guardrails: `src/content/answerlatticePublic/guardrails.ts`
- Pricing amounts and limits: `src/data/answerlattice/plans.ts`
- Billing projection: `src/lib/billing/productBillingPlans.ts`
- Install and agent packet: `src/lib/answerlattice/installContract/`
- Public website runtime: `src/app/sites/answerlattice/`

Public pages must not duplicate plan amounts, private dashboard routes, or provider/API contracts when an existing source exists.

## Buyer Journey

1. Homepage states the founder support problem and product boundary.
2. Demo shows a disclosed seeded governance event without Firebase or AI calls.
3. Product, install, security, trust, resources, and comparisons support evaluation.
4. Pricing renders the three monthly plans from the plan source.
5. Get Started validates plan, currency, company, optional product details, selected product pages, and legal links.
6. The authenticated onboarding route creates a workspace and pending provider checkout.
7. Billing and Activation own post-creation payment and launch proof.

## Discovery

`ANSWERLATTICE_PUBLIC_PAGES` is the sitemap and structured-data page registry. Every registered path must resolve to a public page file and must stay outside private dashboard, API, widget, sign-in, and unauthorized prefixes.

The sitemap intentionally omits `lastmod` until page-specific source timestamps exist. A build timestamp is not page freshness evidence.

The homepage SoftwareApplication offer derives Starter monthly INR pricing from the plan source. Review and aggregate-rating schema remain prohibited until real review evidence exists.

## Public Forms

The contact form uses a semantic form, native field constraints, consent, honeypot, Turnstile when configured, bounded request/response bodies, rate limiting, and one AnswerLattice-only enquiry write.

Get Started uses a semantic details form, bound labels, server-matching length limits, safe HTTP(S) URL admission, at least one selected product surface, strict response parsing, allowlisted Razorpay checkout URLs, and linked terms/privacy pages.

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

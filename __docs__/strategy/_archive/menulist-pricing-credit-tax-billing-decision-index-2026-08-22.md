# MenuList Pricing, Credits, Tax, and Billing Decision Index

**Status:** Working review index; the transcript and preliminary verdicts are not approved commercial, tax, payment, invoice, or implementation decisions
**Created:** August 22, 2026
**Source transcript:** [`temp-pricing-strategy-menulist-chat.md`](../../main-website/website-prep-codex-prompts/temp-pricing-strategy-menulist-chat.md)
**Review method:** ChatGPT advice is input only. Current code, maintained feature documentation, current provider behavior, official regulatory sources, and founder-approved legal facts are the decision authority.

## Purpose

The captured conversation asks seven connected questions. They must not be implemented as one large pricing edit because each decision changes a different contract: public positioning, plan entitlement, provider cost control, tax treatment, payment settlement, customer documents, and legal seller identity.

We will settle the topics one at a time in the order below. Each review must end with an explicit **ADOPT**, **CHANGE**, **REJECT**, or **BLOCKED PENDING EVIDENCE** decision before the next topic changes code or public copy.

## Current Repository Reality

- MenuList already has stable internal B2C plan IDs: `starter`, `pro`, and `premium`. Public names may be reviewed, but these IDs must not be casually changed because runtime upgrade and entitlement logic depends on them (`src/data/PlatformPlansList.ts:5-57`).
- The current B2C price books are INR and USD, with monthly and yearly variants. Current monthly prices are Starter INR 499/USD 29, Pro INR 1,499/USD 79, and Premium INR 3,999/USD 149 (`src/data/PlatformPlansList.ts:9-58`).
- Monthly content allowances already differ by plan and currency. The current values are not the same as ChatGPT's proposal (`src/data/PlatformPlansList.ts:14-55`).
- MenuList already sells one 250-credit Content Credit Pack for INR 2,999 or USD 29 (`src/data/PlatformPlansList.ts:96-109`).
- Credit costs are already defined by operation: description rewrite 1, generated image 5, language addition 3, item translation 1, image translation 5, and image edit 5 (`src/data/shared/contentCreditPolicy.ts:1-8`).
- Razorpay is the frozen payment provider. The implementation already includes subscriptions, top-ups, webhook settlement, pending-checkout recovery, billing history, mobile parity, reseller/manual billing boundaries, grace handling, and entitlement synchronization (`__docs__/razorpay/README.md:1-37`).
- Payment authentication or provider activation alone does not grant access. Only verified captured-payment evidence can settle the subscription and activate entitlement (`__docs__/razorpay/README.md:18-22`).
- Current Billing History links to Razorpay-hosted invoice URLs when the provider supplies them. MenuList does not yet own a complete statutory invoice-generation system (`src/components/templates/main-app/billing/BillingHistory.tsx:30-45`, `src/components/templates/main-app/billing/BillingHistory.tsx:114-129`).
- The historical pricing strategy is not launch authority. It explicitly records that the older pay-first/no-Starter position was superseded by verified seven-day setup using the same permanent URL and QR (`__docs__/strategy/pricing-strategy.md:1-19`).

## Decision Sequence

### 1. Pricing Architecture and Regional Price Books

**Original question:** What should MenuList charge Indian and non-Indian ICPs?

**ChatGPT recommendation:** One entitlement model, separate India/global price books, and three public plans named Official, Pro, and Multi-location. It proposed INR 599/1,499/2,999 monthly and USD 29/79/149 monthly, annual pricing equal to ten monthly payments, and additional-location pricing.

**Repo-aware preliminary answer:** **CHANGE BEFORE ADOPTION.** The regional-price-book and three-plan direction matches the current product shape, but the suggested figures cannot be accepted as-is.

Reasons:

- The current implementation already uses three stable plan IDs and two currencies, so this is an evolution, not a new architecture.
- ChatGPT's proposed India Starter and Premium prices conflict with current INR 499 and INR 3,999 values.
- Renaming public labels is possible; renaming internal IDs is unnecessary and risky.
- Additional-location pricing cannot be decided independently of the existing quantity, inherited-HQ entitlement, reseller, and multi-location contracts.
- The seven-day setup must remain an activation state, not be reframed as a permanent free plan or a disposable expiring public URL.

**Questions this item must resolve:**

1. Final INR and USD monthly/yearly prices.
2. Whether annual pricing is exactly ten months or another explicit discount.
3. Public plan names while preserving internal IDs.
4. Included active-location quantity per plan.
5. Additional-location pricing and quantity-change behavior.
6. Whether prices are displayed tax-inclusive or tax-exclusive by region.
7. Grandfathering and migration rules for any existing subscriptions or provider plans.
8. Which plan is recommended and why, using truthful owner outcomes rather than unsupported popularity claims.

**Required output:** One founder-approved price book and migration policy, mapped to current plan IDs and provider-plan behavior.

### 2. Plan Entitlements and Feature Inventory

**Original question:** Which current MenuList features belong in each plan?

**ChatGPT recommendation:** Keep complete public truth in the base plan; monetize workload reduction in Pro and central governance in Multi-location. Do not meter menu items, categories, views, scans, or ordinary manual updates.

**Repo-aware preliminary answer:** **PARTIAL ADOPT.** The entitlement principle is strong, but every proposed feature assignment must be checked against current feature flags, plan values, runtime gates, mobile parity, provider cost, and actual production readiness.

**Governing product rule:** The base paid plan must remain a credible official customer-link product. Higher plans should primarily sell operating relief, generated-content capacity, presentation depth, staff controls, and multi-location governance. They must not hold correctness, owner approval, basic public access, or ordinary manual correction hostage.

**Questions this item must resolve:**

1. Exact Starter/Pro/Premium feature matrix from current code and docs.
2. Which features are product truth, cost-bearing enhancements, operational scale, or multi-location governance.
3. Which capabilities are live, gated, paused, internal, reseller-only, or not launch-certified.
4. Desktop/mobile parity for every paid owner capability.
5. Which limits are understandable to non-technical SMB owners.
6. Whether B2B/API plans remain public, private, or separate from the main owner pricing page.
7. Which public claims must be removed because the runtime does not support them yet.

**Required output:** A code-mapped entitlement matrix that becomes the single source for website pricing, checkout, owner Billing, mobile Billing, APIs, and verification.

### 3. Content Credits and Top-Ups

**Original question:** How many credits should each plan include, what should each operation cost, and how should top-ups behave?

**ChatGPT recommendation:** Rename credits as Content Credits, use one weighted wallet, provide plan allowances, sell a 250-credit top-up, let monthly credits reset, and let purchased credits remain until used.

**Repo-aware preliminary answer:** **PARTIAL ADOPT; VALUES REQUIRE REVIEW.** MenuList already uses Content Credit Pack language, weighted operation costs, monthly allowance plus top-up balance, captured-payment settlement, and non-expiring top-ups. ChatGPT's proposed allowances are not current truth.

**Questions this item must resolve:**

1. Whether the existing operation weights still match current Gemini/image/provider cost and owner value.
2. Final monthly allowance by plan and region. Different regional allowances currently exist and need an explicit policy.
3. Whether owner-facing UI shows a single simple balance while retaining separate monthly/top-up accounting internally.
4. Consumption order, reset timing, yearly-plan behavior, upgrade carry-forward, cancellation, refund, and failed-settlement rules.
5. Top-up price, pack size, tax treatment, entitlement prerequisites, and whether more than one pack creates unnecessary choice.
6. Referral credits and administrative corrections without corrupting paid-credit accounting.
7. Abuse, concurrency, idempotency, provider-failure, and cost-ceiling protection.

**Required output:** A cost-verified credit policy plus exact shared constants and ledger invariants. No provider or Firestore changes should occur before this policy is approved.

### 4. Taxation and Regulatory Treatment

**Original question:** How should GST, Indian customers, international customers, exports, and credit-pack taxes work?

**ChatGPT recommendation:** Treat India prices as pre-tax, charge CGST/SGST or IGST based on place of supply, treat qualifying international sales as zero-rated exports under LUT, preserve remittance evidence, and avoid building worldwide tax calculation at launch.

**Repo-aware preliminary answer:** **BLOCKED PENDING CURRENT PRIMARY-SOURCE AND PROFESSIONAL VALIDATION.** The transcript contains plausible concepts, but it is not sufficient authority for tax configuration or invoice wording.

**This review must use:**

- Current official GST/CBIC guidance and relevant statutory rules.
- Current RBI/bank remittance requirements where applicable.
- Current Razorpay international-payment, settlement, and document behavior.
- Founder-provided legal entity, GST registration, place of business, LUT, bank, and customer-type facts.
- Chartered accountant or tax-counsel confirmation before production use.

**Questions this item must resolve:**

1. Legal supplier and GST registration details.
2. India B2B versus B2C data requirements.
3. Intra-state versus inter-state place-of-supply handling.
4. Tax-inclusive versus tax-exclusive public display and checkout disclosure.
5. Subscription and credit-pack tax classification.
6. International service/export eligibility, LUT status, currency, and evidence retention.
7. Refund, cancellation, credit-note, and tax-return effects.
8. Foreign indirect-tax thresholds and when a Merchant of Record becomes necessary.

**Required output:** A CA-approved tax decision table and data requirements. Until then, no tax percentage, export statement, SAC code, or invoice declaration from the transcript is approved.

### 5. Razorpay Payment Architecture

**Original question:** Can Razorpay handle both Indian and international customers, and how should MenuList use it?

**ChatGPT recommendation:** Use Razorpay as the single gateway for India and international cards, select INR or USD by market, settle to the Indian entity, and enable international payments after KYC/approval.

**Repo-aware preliminary answer:** **ADOPT RAZORPAY; BLOCK COMMERCIAL CONFIGURATION PENDING EVIDENCE.** Razorpay is already the only provider and the payment lifecycle is deeply integrated. Replacing it is outside this discussion. International acceptance, live credentials, currencies, recurring mandates, fees, settlement, refunds, and provider invoices remain evidence-dependent.

**Protected runtime contracts:**

- Exact product/tenant/store scoping.
- Idempotent checkout creation and recovery.
- Captured-payment authority for entitlement.
- Signed webhook convergence and replay protection.
- Separate subscription and top-up settlement.
- Desktop/mobile Billing parity.
- Manual/reseller billing isolation.
- No raw payment identifiers or signatures in logs.

**Questions this item must resolve:**

1. Which Razorpay products are used for recurring subscriptions, top-ups, retries, and reseller handoffs.
2. Approved domestic and international currencies and country eligibility.
3. International card/recurring support for the actual merchant account.
4. Provider fees, FX, settlement timing, refund, dispute, and chargeback handling.
5. Live KYC, keys, webhook secrets, event subscriptions, and callback domains.
6. Provider plan migration when prices change.
7. Checkout customer fields required for tax and invoicing.

**Required output:** A provider configuration matrix and migration plan that preserves the existing state machine.

### 6. Invoices, Receipts, Credit Notes, and Billing History

**Original question:** Should customers use Razorpay invoices, or should MenuList create, display, download, and email its own invoices?

**ChatGPT recommendation:** MenuList should own the branded invoice experience while Razorpay remains the payment processor.

**Repo-aware preliminary answer:** **PARTIAL ADOPT, BUT THIS IS NEW COMPLIANCE SCOPE.** MenuList already displays payment history and links to Razorpay invoice URLs. Building a MenuList-generated invoice is not a cosmetic replacement; it introduces statutory numbering, immutable seller/customer snapshots, tax calculations, PDF/email delivery, corrections, credit notes, retention, and reconciliation.

**Questions this item must resolve:**

1. Is the required customer document a tax invoice, receipt, payment confirmation, or different document by transaction/customer type?
2. Which document is legally authoritative and which is only a payment-provider artifact?
3. Numbering series, issue time, immutable snapshots, seller/customer fields, tax lines, currency, exchange-rate evidence, and declarations.
4. Subscription renewal, top-up, refund, partial refund, failed payment, and credit-note handling.
5. Whether documents are generated synchronously from captured settlement or through a retryable post-settlement job.
6. Owner Billing UI, mobile parity, download, resend, email delivery, accessibility, retention, and audit.
7. Reconciliation among Razorpay payment IDs, MenuList transaction records, statutory documents, and accounting exports.

**Required output:** An accountant-approved invoice/receipt specification. Razorpay invoice links remain the current behavior until that system is complete and verified.

### 7. Neelvara Seller Identity and MenuList Product Identity

**Original question:** If Neelvara is the parent/legal entity, what should customers see in checkout, invoices, policies, and banking?

**ChatGPT recommendation:** Neelvara owns the legal and financial obligations; MenuList remains the product and customer-facing brand.

**Repo-aware preliminary answer:** **PARTIAL ADOPT; BLOCK FINAL WORDING PENDING VERIFIED LEGAL FACTS.** This separation matches the repository's product-boundary model, but the exact entity suffix, registered address, GSTIN, legal registrations, bank descriptor, domains, email addresses, and policy wording cannot be inferred.

**Questions this item must resolve:**

1. Verified legal supplier name and registration type.
2. Approved “MenuList is a product of/operated by” wording.
3. Checkout merchant name and statement descriptor.
4. Invoice issuer, product description, support identity, and remittance beneficiary.
5. Terms, Privacy, Refund, Pricing, checkout, email, and owner Billing consistency.
6. Product-level revenue attribution without creating a false separate legal seller.

**Required output:** A founder-verified legal identity matrix used consistently across every commercial surface.

### 8. Cross-System Implementation, Migration, and Certification

This item begins only after Items 1-7 are approved. It is not a separate commercial decision; it is the controlled implementation of those decisions.

**Expected affected surfaces:**

- Shared plan/feature constants and stable entitlement resolution.
- Razorpay provider plans, subscriptions, quantities, top-ups, checkout notes, webhooks, and settlement.
- Existing-subscription grandfathering or migration.
- Pricing website, FAQ, checkout, onboarding, desktop Billing, mobile Billing, and reseller/manual surfaces.
- Content-credit policy, ledger, reset, notification, and cost guards.
- Tax/customer identity capture and validation.
- Invoice/receipt documents, billing history, email, downloads, refunds, and accounting export.
- Legal, Privacy, Terms, Refund, metadata, structured data, support, and help documentation.
- Firestore operations, security rules/indexes if needed, Firebase cost documentation, analytics, and observability.
- Unit, integration, verifier, Razorpay sandbox, desktop/mobile browser, hosted QA, and production-provider certification.

**Required output:** One implementation plan with explicit migration, rollback, compatibility, security, cost, mobile, and launch gates. Public pricing must not be changed ahead of runtime enforcement and provider readiness.

## Conversation-Level Verdict

The ChatGPT conversation is useful as a structured question set and contains several directionally sound principles:

- one entitlement model with regional price books;
- three understandable owner plans;
- a complete base public-truth product rather than a crippled QR tier;
- higher plans monetizing workload reduction and governance;
- weighted content credits separated from feature entitlement;
- Razorpay as processor while MenuList owns the customer relationship;
- Neelvara as the likely legal/economic entity and MenuList as product identity.

It is not implementation-ready because it assumes prices, allowances, tax treatment, international payment capability, invoice requirements, and legal details without proving them against the current runtime or verified external facts.

**Doctrine preservation:** No new doctrine is required. Existing codebase-truth, MenuList product-identity, owner-value, security, billing-authority, and documentation-governance rules already govern these decisions.

## Working Order

We will now review one item per conversation turn:

1. **Pricing architecture and regional price books**
2. **Plan entitlement and feature matrix**
3. **Content credits and top-ups**
4. **Taxation and regulatory treatment**
5. **Razorpay domestic/international configuration**
6. **Invoices, receipts, refunds, and credit notes**
7. **Neelvara/MenuList legal identity**
8. **Cross-system implementation and certification**

The immediate next item is **Item 1: Pricing architecture and regional price books**. That review must use the current ICP, product capabilities, current pricing page, current plan constants, entitlement boundaries, multi-location behavior, provider costs, and current primary market evidence before recommending final prices.

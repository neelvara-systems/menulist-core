# Answerlattice Commercial System Implementation

**Status:** Implementation source of truth
**Product:** Answerlattice (`AL`)
**Environment posture:** Fresh launch; no legacy plan migration or backfill

## Decisions

- Active plans are `answerlattice_launch`, `answerlattice_growth`, and `answerlattice_studio`.
- Monthly prices are INR 1,499 / 4,999 / 12,999 and USD 29 / 99 / 249.
- Annual prices equal ten monthly payments: INR 14,990 / 49,990 / 1,29,990 and USD 290 / 990 / 2,490.
- Monthly included support credits are 250 / 1,000 / 4,000.
- One-time support-credit packs are 500 credits for INR 1,999 or USD 39 and 2,000 credits for INR 5,999 or USD 119.
- Billing currency is derived from the customer billing country. India uses INR. Other countries use USD only after international checkout and export-tax configuration are explicitly enabled.
- The browser cannot select an unsupported regional price by changing a currency control or request body.
- Answerlattice uses the shared Razorpay lifecycle, tax-calculation, document, refund, credit-note, and owner-notification mechanics, while keeping its Firebase project, product identity, billing records, document sequence, branding, and recipient resolution isolated from MenuList.
- Tax invoices and credit notes remain disabled until the legal supplier identity, GST status and GSTIN, SAC, registered address, state code, document-series treatment, signatory treatment, LUT/export wording, exchange-rate treatment, e-invoicing applicability, and retention policy have been approved and configured.
- Billing documents are delivered by email by default when a valid billing/owner/support email exists. WhatsApp delivery is also attempted only when the owner number is verified and notification consent is active. The PDF remains available in Answerlattice Billing even when delivery is unavailable.
- Razorpay webhooks are the settlement authority. Browser callbacks do not issue invoices, credit notes, credits, or entitlements.
- No free live workspace, hidden founding discount, unverified tax claim, cross-product data fallback, or fake capacity claim is permitted.

## Storage and isolation

- Answerlattice subscriptions, transactions, credit ledgers, invoices, credit notes, and notification outbox records use the Answerlattice Firebase project.
- Every commercial record carries `pId` / `productId = AL`, tenant ID, and workspace/store ID.
- Browser writes to billing documents and document counters are denied. Server issuance is idempotent by the settled payment or refund reference.
- Invoice and credit-note counters use Answerlattice-specific prefixes and sequences.

## Regional checkout

1. Collect a complete billing profile before creating the pending subscription.
2. Normalize and validate the billing country, Indian state, and optional GSTIN.
3. Resolve currency from billing country.
4. Calculate and freeze the tax snapshot before creating the Razorpay plan/subscription.
5. Store the billing profile and tax snapshot with the pending subscription.
6. Reconcile the frozen snapshot against the provider-settled amount before activation or document issuance.

## Billing documents and delivery

1. A captured subscription or top-up payment issues one immutable tax invoice when document issuance is configured.
2. A settled refund issues one immutable credit note linked to the original tax invoice.
3. The document PDF uses Answerlattice branding and the frozen supplier, customer, line-item, tax, and settlement values.
4. A document-issued notification queues product-scoped email and eligible WhatsApp delivery.
5. Delivery retries never create a second legal document.

## Pending owner and accountant inputs

- Exact legal seller name and registered address
- GST registration status and GSTIN
- Approved SAC
- Invoice and credit-note series approval
- Signature or authorised-signatory treatment
- LUT/export declaration wording
- International exchange-rate treatment
- E-invoicing applicability
- Retention and cancelled-document policy
- Production Razorpay invoice-email configuration

These inputs are configuration gates, not reasons to weaken the source contract or insert placeholder legal values.

### QA-only synthetic supplier fixture

Hosted subscription certification may use an unmistakably synthetic supplier profile only when `ANSWERLATTICE_BILLING_SYNTHETIC_QA_ENABLED=true`, Vercel identifies the custom target as `qa` (`VERCEL_ENV=preview`, `VERCEL_TARGET_ENV=qa`), and the configured Razorpay key starts with `rzp_test_`. The server fails closed when any boundary disagrees. The fixture must remain scoped to Vercel `qa`; billing documents and delivery stay disabled, and the values must never be copied to Production or represented as Neelvara's verified legal identity.

## Release evidence - August 24, 2026

- The base commercial source is committed on `staging` at `82cf3701d7789b098277f325b5fca71920e5605b`. The final QA EmailOS secret-binding correction remains an unstaged working-tree change until a separate Git operation is authorized.
- Answerlattice QA and production serve the exact reviewed Firestore Rules artifact: 115,461 bytes, SHA-256 `461bf3a20a5bf5259653f6f7e99e2fee3305ed0b1e0d774f3720ff63e358f31a`.
- The three required `billingDocuments` indexes are `READY` in both Answerlattice Firebase projects.
- QA `processIntegrationEvent` is active on revision `processintegrationevent-00003-yod`, uses Node.js 22, retries idempotently, binds `ANSWERLATTICE_RESEND_API_KEY`, and is restricted to the Answerlattice integration-event collection. This proves the integration-event EmailOS worker only; billing-document delivery is a separate Next.js NotificationOS path.
- Secret Manager metadata confirms a QA `ANSWERLATTICE_RESEND_API_KEY` version and no production `ANSWERLATTICE_RESEND_API_KEY` version at this evidence timestamp. Production outbound email remains blocked until the owner confirms or creates the real production secret and a separately authorized deployment binds it. Do not create a placeholder secret.
- WhatsApp billing-document delivery is source-complete but provider-blocked in both environments until the four product-isolated WhatsApp secrets exist and `answerlattice_billing_document_issued_v1` is approved with a document header.
- No Vercel deployment was performed as part of this Firebase release. The website, checkout routes, Billing UI, PDF routes, and owner-notification source require a separately authorized Vercel release before they become hosted behavior.

## Payment-flow reconciliation - August 24, 2026

- Public pricing and onboarding now state that displayed prices are before applicable taxes. Billing-country and validated billing-profile data remain the server authority for currency, tax treatment, and the final provider amount.
- Support-credit notifications are emitted at the first crossing of 70% used, 90% used, and exhausted. Intake warnings run only after successful usage settlement, so a failed provider operation that refunds its reservation cannot create a false low-balance alert. Event identity includes milestone, subscription, and billing period so replay does not duplicate a warning.
- Both general AI accounting and successfully settled paid intake usage use the same Answerlattice credit-notification producer. Existing approved answers remain available at zero; only credit-consuming work pauses.
- Billing-document delivery preserves `partial` as a distinct state. A later confirmed send can advance it to `sent`; a failed retry cannot erase known partial-delivery evidence.
- Billing history exposes the current delivery state and an authenticated, rate-limited email resend action for seller-issued invoices and credit notes.
- These changes are source-validated only until an explicitly authorized Vercel release and hosted checkout/Billing smoke test are completed.

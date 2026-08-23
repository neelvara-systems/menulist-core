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

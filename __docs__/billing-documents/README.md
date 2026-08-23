# MenuList Billing Documents

> Status: Implemented; issuance remains operator-gated
> Last updated: August 23, 2026

MenuList issues its own immutable tax invoices for captured direct-owner subscription and content-credit payments, and credit notes for processed refunds. Razorpay remains payment evidence and may retain a provider receipt, but it is not the MenuList GST-document authority.

## Authority

- Tax snapshot: `src/data/shared/billingTaxPolicy.ts`
- Numbering, allocation, and hashes: `src/lib/billing/billingDocumentPolicy.ts`
- Issuance ledger and delivery: `src/lib/billing/billingDocumentServer.ts`
- PDF renderer: `src/lib/billing/billingDocumentPdf.ts`
- Private routes: `src/app/api/billing-documents/`
- Settlement triggers: `src/app/api/razorpay/webhook/route.ts`

## Decisions

- No browser or Firestore client reads the legal record directly.
- Issuance is idempotent by provider payment/order/refund identity.
- Invoice series is `MLYY-YY-NNNNNN`; credit-note series is `MCYY-YY-NNNNNN`. Both stay within 16 characters and reset by Indian financial year.
- A document freezes seller, customer, supply, line-item, tax, and provider evidence. Later profile or pricing changes do not rewrite it.
- Partial refunds allocate taxable value and tax components from the remaining component balances, so cumulative credits cannot exceed the original base, CGST, SGST, IGST, tax, or gross amounts.
- PDFs are generated from the immutable record behind an authenticated, tenant/store-scoped route.
- Billing-document delivery is separately gated and enters NotificationOS after issuance. The billing owner can use email only, WhatsApp only, or both through the existing notification channel setting. Email delegates to EmailOS; WhatsApp delegates to WhatsAppOS only after verified-phone, consent, provider, and approved-template gates pass.
- Email attaches the generated PDF. WhatsApp uploads the same PDF directly to Meta and sends it as the approved utility template's document header. Both messages keep the authenticated MenuList document URL as fallback; MenuList creates no public bearer URL or stored public PDF copy.
- No automatic deletion is implemented. Cancelled or corrected commercial activity uses credit notes; issued documents are never overwritten.

## Required operator gates

Keep `MENULIST_BILLING_DOCUMENTS_ENABLED=false` until the owner/accountant confirms the legal supplier values, SAC, GSTIN/state, e-invoice applicability, and any LUT/export wording. Keep `MENULIST_BILLING_DOCUMENT_DELIVERY_ENABLED=false` until Razorpay invoice emails are configured to avoid duplicate customer messages, EmailOS is certified, and the WhatsApp template is approved if that channel will be offered.

See sibling files for detailed scope, implementation, owner guidance, Firebase/cost, mobile behavior, website claims, and test cases.

Cross-system certification is maintained in
[`__docs__/commercial-readiness/`](../commercial-readiness/README.md).

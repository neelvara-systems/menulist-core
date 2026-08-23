# Billing Documents Implementation

> Status: Implemented; issuance remains operator-gated
> Last updated: August 23, 2026

## Flow

1. Checkout freezes a validated `MenuListTaxSnapshot`.
2. Razorpay webhook validates signature and captured/processed provider evidence.
3. Existing subscription/top-up/refund settlement completes.
4. `billingDocumentServer` issues or reuses the deterministic document.
5. A transaction reads the document and FY counter before writing either; credit notes also read prior credits and allocate from the remaining component balances in that transaction.
6. Desktop/mobile history loads transaction summaries plus private document summaries.
7. The PDF route rechecks active session scope and renders from the frozen record.
8. Issuance makes a best-effort NotificationOS request under the deterministic document ID. NotificationOS resolves the billing owner once, renders the immutable PDF from the scoped billing record, applies the owner's email/WhatsApp/both mode, and records exact per-channel outcomes. Email receives the PDF attachment plus the authenticated owner-app link. WhatsApp uploads the same PDF directly to Meta and sends it through the approved utility template's document header; the authenticated link remains in the message as fallback.

## Failure behavior

- Disabled runtime gate: payment settlement continues and no document is created. This is setup-only behavior and must not be used after launch.
- Enabled but invalid legal configuration: issuance throws, webhook returns retryable failure, and replay reuses already-completed payment settlement without duplicating entitlement.
- Duplicate webhook: deterministic ID returns the existing document.
- Notification failure: the document stays issued. NotificationOS owns deterministic event/channel claims and exact per-channel outcomes; EmailOS and WhatsAppOS remain provider adapters. WhatsApp fails closed without verified consent, an approved document-header Meta template, or a successful bounded media upload.
- Refund without one matching invoice: credit-note issuance fails for reconciliation.
- Refund authority: only one exact `refund.processed` entity can issue a credit
  note. `payment.refunded` is retained as cumulative provider evidence and does
  not issue a second document or founder movement.
- Refunded top-up credits: the same processed refund reverses the proportional
  purchased-credit entitlement transactionally before credit-note completion;
  exact webhook replay cannot reverse credits twice.

## Data model

- `billingDocuments/{documentId}`: immutable accounting content plus aggregate delivery-request state.
- `billingDocumentCounters/{counterId}`: server-only FY/type sequence.
- `ownerNotificationEvents` and `ownerNotificationDeliveries`: deterministic cross-channel delivery authority and per-channel result.

No PDF bytes, provider media URLs, or public download tokens are stored in MenuList. Rendering is deterministic from the ledger record. Attachment bytes exist only in the trusted sender invocation; EmailOS accepts one bounded PDF and WhatsAppOS accepts one bounded PDF for the registered document-header template. If Meta accepts the upload but definitively rejects the message request, WhatsAppOS attempts to delete that orphaned media; an ambiguous or accepted send keeps provider media available for delivery and reconciliation.

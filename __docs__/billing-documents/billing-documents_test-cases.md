# Billing Documents Test Cases

> Status: Maintained verification contract
> Last updated: August 23, 2026

## Policy

- Indian FY boundary on March 31/April 1 in Asia/Kolkata.
- Invoice and credit-note number length/prefix/sequence.
- Exact replay ID and canonical content hash.
- Intra-state CGST/SGST, inter-state IGST, and zero-rated export lines.
- Full and partial credit allocation; multiple credits cannot exceed any original base/tax component or invoice gross, including one-minor-unit rounding boundaries.

## Issuance

- Captured subscription and paid top-up issue once.
- Non-captured events never issue.
- Duplicate webhook returns the existing document without incrementing sequence.
- Missing/required e-invoice status fails closed after runtime enablement.
- Refund matches exactly one invoice and records its number.

## Security and UI

- Direct Firestore client read/write denied for both collections.
- Unauthenticated PDF/list/email denied.
- Different tenant/store receives 404.
- Desktop and mobile prefer MenuList document, preserve provider fallback, and display credit notes.
- Billing-document delivery disabled sends nothing. When enabled, one deterministic NotificationOS event supports email-only, WhatsApp-only, or combined delivery according to owner settings. Email carries one generated PDF attachment plus the private link. WhatsApp requires verified consent, the approved document-header template, and a successful Meta media upload; it carries the same PDF plus the private-link fallback. Webhook replay cannot create another terminal channel delivery.
- Arbitrary attachments, non-PDF MIME types, unsafe filenames, multiple files, and files above the 8MB MenuList sender limit fail closed before provider delivery.
- The Functions recovery processor can reconstruct the PDF from the same scoped immutable billing record; it does not require a public URL or persisted PDF bytes.
- A confirmed Meta message rejection best-effort deletes the uploaded orphan PDF; an ambiguous provider outcome preserves it and remains non-retryable until reconciliation.

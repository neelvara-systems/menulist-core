# Billing Documents Specification

> Status: Implemented; issuance remains operator-gated
> Last updated: August 23, 2026

## Goal

Provide owners with private, durable tax invoices and credit notes that match settled MenuList payments without allowing payment-provider receipts, mutable profiles, or client code to become accounting authority.

## Admission

- Product must be MenuList (`ML`). This includes direct MenuList checkout and
  online reseller-assisted subscriptions that carry the same frozen billing
  profile, tax snapshot, provider settlement, and tenant/store scope.
- Tax invoice: captured `subscription.charged` after local settlement, or verified `order.paid` top-up after credit settlement.
- Credit note: `refund.processed` matched to exactly one MenuList tax invoice.
- Source feature and runtime gates must both be enabled.
- E-invoice status must be explicitly accountant-confirmed as `not_required`; `required` remains blocked until IRP integration has a reviewed implementation.

## Record contract

Every record stores dual product/tenant/store aliases, legal document identity, FY and sequence, issue time, payment/provider references, related invoice identity for credit notes, seller/customer/supply snapshots, line items, totals, schema/render versions, immutable content hash, and mutable delivery status.

## Invariants

1. One source identity produces one document.
2. Legal numbering is allocated transactionally.
3. Existing identity mismatches fail; they are never merged.
4. Tax totals are integer minor units and must equal line-item totals.
5. Credit notes allocate against transaction-current remaining component balances and cannot cumulatively exceed the invoice base, CGST, SGST, IGST, tax, or gross value.
6. Issued content is immutable; only delivery metadata may change.
7. Access is authenticated and exact tenant/store scoped.
8. Provider invoice URL is fallback receipt evidence, not the tax-document source.
9. NotificationOS owns event/channel idempotency. EmailOS and WhatsAppOS own provider delivery, while the billing record keeps only aggregate request state.
10. Email-only, WhatsApp-only, and combined delivery use the billing owner's existing NotificationOS setting. WhatsApp additionally requires a verified phone, explicit consent, enabled provider, and approved transactional template.
11. Email and WhatsApp receive the same PDF rendered from the immutable scoped record. The WhatsApp template requires a PDF document header; arbitrary attachment types and URLs are not admitted.
12. Delivery links remain private authenticated owner-app URLs; no billing document is exposed through a public bearer URL.

## Non-goals

No e-invoice IRN/QR integration, manual/offline reseller-collection invoices,
backfill, migration, accounting-software export, foreign VAT/GST automation,
or owner-editable issued documents.

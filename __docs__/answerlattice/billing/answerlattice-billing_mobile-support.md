# Answerlattice Billing — Mobile Support

> **Version:** 1.3.0
> **Last Updated:** 2026-08-24
> **Audience:** Developers / QA

Answerlattice billing is rendered inside `AnswerlatticeDashboardLayout`, which already uses a responsive sidebar drawer and compact content padding on mobile.

## Mobile Routes

- `/answerlattice/billing`
- `/answerlattice/transactions`

## Mobile Expectations

- Billing header actions wrap instead of overflowing.
- Subscription, support-credit, and history cards stack vertically.
- Plan and credit-pack modals use existing responsive Ant Design grid breakpoints.
- Transactions table remains horizontally scrollable through Ant Design table behavior.
- Billing and Transactions use the same workspace-scoped subscription, payment, invoice, and support-credit records as desktop; mobile does not maintain a second billing state.
- Support-credit usage starts with 12 rows and loads additional rows through the same cursor boundary as desktop. A failed usage request does not erase successfully loaded billing history, and a failed billing-history request does not erase successfully loaded usage.
- Mobile copy remains owner-facing: provider and diagnostic details stay out of alerts and toasts.
- Mobile checkout uses the same strict minimal subscription/order response and exact hosted-provider URL boundary as desktop.
- Unsafe invoice URLs are omitted rather than rendered as mobile links.
- If current billing state cannot be loaded, mobile shows the same blocking retry alert as desktop and disables plan mutation; it does not render an empty-subscription checkout state.
- Billing country and legal billing details are collected during onboarding, not through a mobile-only currency picker.
- Issued Answerlattice invoices and credit notes are shown through the same protected Billing API and downloadable PDF path as desktop.
- Email and eligible consented WhatsApp delivery are convenience channels. Delivery failure never removes the Billing copy or creates another document.

## QA Notes

Current source gates pass through `npm run verify:billing-entitlement-boundary` and the complete `npm run verify:answerlattice-runtime-truth` chain. Authenticated real-device/mobile visual QA and disposable Razorpay test-mode mutations remain external release evidence and are not replaced by source verification.

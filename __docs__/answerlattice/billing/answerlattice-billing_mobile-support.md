# Answerlattice Billing — Mobile Support

> **Version:** 1.1.0
> **Last Updated:** 2026-07-14
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

## QA Notes

Current source gates pass through `npm run verify:billing-entitlement-boundary` and the complete `npm run verify:answerlattice-runtime-truth` chain. Authenticated real-device/mobile visual QA and disposable Razorpay test-mode mutations remain external release evidence and are not replaced by source verification.

# Answerlattice Billing — Mobile Support

> **Version:** 1.0.0
> **Last Updated:** 2026-05-21
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

## QA Notes

Local route compile was verified through Next dev. In-app Browser page inspection was blocked after the auth redirect by Browser URL policy, so authenticated mobile visual QA should be run through the user's logged-in Chrome profile.


# Owner Referral Immediate Founder Implementation Approval

**Decision owner:** Founder
**Recorded:** `2026-07-10T12:12:46+05:30`
**Status:** Engineering implementation authorized immediately

## Decision

The founder explicitly authorized immediate end-to-end implementation of the payment-only Owner Referral feature and waived the remaining cooling-period wait for engineering work.

The approved product contract remains:

- 100 credits to the referring MenuList business;
- 50 credits to the referred MenuList business;
- both direct MenuList subscription wallets must be verified paid;
- referral attribution must exist before the referred business's first successful subscription payment;
- no referral cap, post-payment action, distribution requirement, or waiting period.

## Accounting Requirement

Every issued reward must be auditable as a referral reward. The atomic settlement transaction must update both `topUpCredits` wallets, mark the referral issued, and create one deterministic `payment_transactions` reward-credit ledger row for each recipient.

Reward rows are zero-cash credit events. They must not be represented as Razorpay payments or Enhancement Pack purchases.

## Rollout Boundary

This approval authorizes engineering and Firebase validation/deployment. Acquisition and settlement feature flags remain off until implementation verification, sandbox payment proof, and browser/device QA pass. External finance/legal/pilot confirmations remain release-readiness records rather than blockers to writing and testing the code.

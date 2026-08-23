# Commercial Readiness Test Cases

## Source and policy

- Canonical plan IDs, prices, periods, quantity, and allowances.
- Checkout intent and payment-capture authority.
- Content Credit reservation, settlement, refund, and balance sync.
- Domestic/export tax snapshots and legal-identity fail-closed behavior.
- Invoice and credit-note numbering, replay, allocation, access, and email gate.
- QA/production environment-key parity.
- No unconditional emailed-invoice promise in owner UI.

## Emulator

- AI capacity reservation concurrency.
- Pricing-plan rule access.
- Checkout and provider-plan registry concurrency.
- Razorpay lifecycle replay and quantity changes.
- Webhook lease ownership and recovery.
- Billing coordination direct-client denial.
- MenuList/Answerlattice product and tenant isolation.
- Reseller onboarding settlement idempotency.

## External

- Read-only Razorpay test-mode inventory and synthetic signature test.
- Disposable test subscription activate, renew, quantity-update, cancel, and
  refund journey.
- QA and production environment review with different provider credentials.
- Founder/accountant approval of every legal and tax input before gate changes.

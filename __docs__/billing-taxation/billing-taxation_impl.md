# Billing Taxation Implementation

## Flow

1. Pricing setup collects a private billing profile.
2. `OnboardingSubscriptionSchema` validates the profile and selected currency.
3. `calculateConfiguredMenuListTax` reads server-only supplier configuration and creates a `MenuListTaxSnapshot`.
4. Razorpay receives the gross unit amount/order amount.
5. The local subscription stores net/base unit amounts and current provider tax terms; a top-up stores its immutable transaction snapshot.
6. Upgrades and packs reuse the last subscription snapshot's billing profile, then calculate a new snapshot under the current policy.

## Data ownership

- `FirestoreSubscriptionDoc.amount`: net unit price.
- `FirestoreSubscriptionDoc.chargedUnitAmount`: tax-inclusive provider unit charge.
- `FirestoreSubscriptionDoc.taxSnapshot`: current provider tax terms. Quantity changes resize totals from the stored unit amounts and do not invoke a newer policy.
- `FirestoreTopupDoc.amount`: provider gross charge.
- `FirestoreTopupDoc.baseAmount`: net pack price.
- `FirestoreTopupDoc.taxSnapshot`: immutable pack tax evidence.

Provider quantity changes are applied billing-first and then resize the local subscription snapshot. Historical transaction/invoice snapshots remain separate and immutable.

Before sign-in, the validated purchase intent is held only in same-tab `sessionStorage`, expires after two hours, and is removed when the flow completes or fails. Billing-profile content must never be written to diagnostics or security logs.

## Provider limits

Razorpay subscription notes stay within the provider's 15-key limit. Full billing addresses and tax evidence remain in MenuList storage and are never placed in provider notes.

## Separate boundaries

Invoice numbering/PDF/email and credit-note/refund documents consume this contract but are implemented under their own billing-document boundary. They must not alter historical snapshots.

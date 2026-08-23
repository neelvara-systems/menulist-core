# Billing Taxation Firebase and Cost

This feature adds no new collection and no extra read per onboarding checkout.

- Subscription tax data is written with the existing subscription creation.
- Pack tax data is written with the existing pending top-up creation.
- Upgrades and packs reuse the subscription already read by the checkout flow.
- No scheduler, function, index, migration, or backfill is required.

Billing profiles are stored only inside private billing documents. Public business projections must not include `taxSnapshot` or `billingProfile`.

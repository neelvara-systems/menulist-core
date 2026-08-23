# Billing Taxation Test Cases

1. Maharashtra supplier + Maharashtra customer produces 18% split between CGST and SGST.
2. Maharashtra supplier + Karnataka customer produces 18% IGST.
3. Quantity multiplies net, tax, and gross amounts without changing the net unit price.
4. GSTIN state prefix must match selected customer state.
5. Indian billing rejects USD; non-Indian billing rejects INR.
6. International checkout fails unless all export gates and LUT are configured.
7. Export snapshot is zero-rated and marked for destination-tax review.
8. Missing merchant GST details fail before tenant/provider creation.
9. Subscription stores net amount separately from provider gross amount.
10. Top-up stores base and gross amounts plus its own tax snapshot.
11. Outlet quantity changes preserve net/gross unit amounts and resize only current subscription totals.
12. Proration display uses the tax-inclusive provider unit amount while MRR remains tax-exclusive.
13. Captured subscription amount and currency must match stored MenuList gross terms before activation.
14. Billing-profile values never appear in logs or public projections.
15. Answerlattice billing remains outside the MenuList GST policy.
16. Unknown Indian GST state codes and whitespace-only supplier configuration fail closed.
17. A signed-in MenuList owner without a stored tax snapshot must complete billing details before the first direct subscription checkout.
18. Reseller-assisted online and offline transactions are not represented as covered by the direct-owner tax boundary.

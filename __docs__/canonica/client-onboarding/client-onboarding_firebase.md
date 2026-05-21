# Canonica Client Onboarding — Firebase Cost

> **Version:** 1.2.0
> **Last Updated:** 2026-05-21
> **Audience:** Developers / Ops

---

## Collections Used (Per Onboarding)

| Collection | Operation | Count | Purpose |
|------------|-----------|-------|---------|
| `users` | QUERY | 1 | Duplicate check in Canonica project by email |
| `platformSummary` | READ | 1 | Get current tenant/store counters |
| `tenants` | WRITE | 1 | Create new tenant |
| `stores` | WRITE | 1 | Create new store |
| `stores` | WRITE | 1 | Set `canonicaWidgetApi.apiKeyHash`, keyPrefix, purpose, productId, and widget scopes |
| `platformSummary` | WRITE | 2 | Update counters and Canonica tenant scheduler registry |
| `storesSummary` | WRITE | 1 | Store summary used by scheduler/discovery flows |
| `users` | WRITE | 1 | Create/update Canonica-project user tenant/store |
| Default auth `users` | WRITE | 1 | Add only `productAccounts.CN` bridge while keeping MenuList root tenant/store |
| `subscriptions` | WRITE | 1 | Create subscription record |

**Approx total per onboarding: 2 reads + 9 writes = still negligible for a one-time client event.** Actual billed reads can vary slightly with duplicate checks and rule/auth behavior.

## No New Collections

Reuses ALL existing collections. Zero new Firestore collections created.

## Monthly Cost Projections

| New Clients/Month | Approx Reads | Approx Writes | Cost Profile |
|-------------------|--------------|---------------|--------------|
| 10 | 20 | 90 | Negligible |
| 50 | 100 | 450 | Negligible |
| 100 | 200 | 900 | Negligible |
| 500 | 1,000 | 4,500 | Still small; watch auth/duplicate-query volume only if onboarding spikes |

**Negligible cost.** Onboarding is a one-time event per client.

## Razorpay Cost

- Beta plan: $0 (no Razorpay call)
- Paid plans: Standard Razorpay subscription creation fee (same as MenuList)

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-21 | 1.2.0 | Updated cost model for separate Firebase mode, `productAccounts.CN` bridge, and `canonicaWidgetApi` key storage |
| 2026-05-19 | 1.1.0 | Added Canonica tenant scheduler registry write for cost-optimized nightly discovery |
| 2026-03-07 | 1.0.0 | Initial cost analysis |

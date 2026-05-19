# Canonica Client Onboarding — Firebase Cost

> **Version:** 1.1.0
> **Last Updated:** 2026-05-19
> **Audience:** Developers / Ops

---

## Collections Used (Per Onboarding)

| Collection | Operation | Count | Purpose |
|------------|-----------|-------|---------|
| `platformSummary` | READ | 1 | Get current tenant/store counters |
| `tenants` | WRITE | 1 | Create new tenant |
| `stores` | WRITE | 1 | Create new store |
| `stores` | WRITE | 1 | Set publicApi.apiKeyHash + keyPrefix |
| `platformSummary` | WRITE | 3 | Update summary, storesSummary, and Canonica tenant scheduler registry |
| `users` | WRITE | 1 | Link tenantId + storeId |
| `subscriptions` | WRITE | 1 | Create subscription record |

**Total per onboarding: 1 read + 8 writes = ~$0.00072 (~INR 0.06 at INR 83/USD)**

## No New Collections

Reuses ALL existing collections. Zero new Firestore collections created.

## Monthly Cost Projections

| New Clients/Month | Reads | Writes | Monthly Cost |
|-------------------|-------|--------|-------------|
| 10 | 10 | 80 | ~$0.007 |
| 50 | 50 | 400 | ~$0.04 |
| 100 | 100 | 800 | ~$0.07 |
| 500 | 500 | 4,000 | ~$0.35 |

**Negligible cost.** Onboarding is a one-time event per client.

## Razorpay Cost

- Beta plan: $0 (no Razorpay call)
- Paid plans: Standard Razorpay subscription creation fee (same as MenuList)

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-19 | 1.1.0 | Added Canonica tenant scheduler registry write for cost-optimized nightly discovery |
| 2026-03-07 | 1.0.0 | Initial cost analysis |

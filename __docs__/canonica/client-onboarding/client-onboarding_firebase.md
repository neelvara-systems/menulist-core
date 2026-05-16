# Canonica Client Onboarding — Firebase Cost

> **Version:** 1.0.0
> **Last Updated:** 2026-03-07
> **Audience:** Developers / Ops

---

## Collections Used (Per Onboarding)

| Collection | Operation | Count | Purpose |
|------------|-----------|-------|---------|
| `platformSummary` | READ | 1 | Get current tenant/store counters |
| `tenants` | WRITE | 1 | Create new tenant |
| `stores` | WRITE | 1 | Create new store |
| `stores` | WRITE | 1 | Set publicApi.apiKeyHash + keyPrefix |
| `platformSummary` | WRITE | 2 | Update summary + storesSummary |
| `users` | WRITE | 1 | Link tenantId + storeId |
| `subscriptions` | WRITE | 1 | Create subscription record |

**Total per onboarding: 1 read + 7 writes = ~$0.00063**

## No New Collections

Reuses ALL existing collections. Zero new Firestore collections created.

## Monthly Cost Projections

| New Clients/Month | Reads | Writes | Monthly Cost |
|-------------------|-------|--------|-------------|
| 10 | 10 | 70 | ~$0.006 |
| 50 | 50 | 350 | ~$0.03 |
| 100 | 100 | 700 | ~$0.06 |
| 500 | 500 | 3,500 | ~$0.30 |

**Negligible cost.** Onboarding is a one-time event per client.

## Razorpay Cost

- Beta plan: $0 (no Razorpay call)
- Paid plans: Standard Razorpay subscription creation fee (same as MenuList)

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-07 | 1.0.0 | Initial cost analysis |

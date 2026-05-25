# Canonica Client Onboarding — Firebase Cost

> **Version:** 1.6.1
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
| `stores` | WRITE | 1 | Set initial `canonicaWidgetApi` key-manager state (`keyHashes`, `keysByHash`, active key metadata, purpose, productId, and widget scopes) |
| `canonica_productSurfaces` | WRITE | 3-8 | Seed initial product surfaces selected during onboarding |
| `platformSummary` | WRITE | 3 | Update counters, Canonica tenant scheduler registry, and compact context summary |
| `storesSummary` | WRITE | 1 | Store summary used by scheduler/discovery flows |
| `users` | WRITE | 1 | Create/update Canonica-project user tenant/store |
| Default auth `users` | WRITE | 1 | Add only `productAccounts.CN` bridge while keeping MenuList root tenant/store |
| `subscriptions` | WRITE | 1 | Create subscription record |

**Approx total per onboarding: 2 reads + 13-18 writes = still negligible for a one-time client event.** Actual billed reads can vary slightly with duplicate checks and rule/auth behavior.

## No New Collections

Reuses ALL existing collections. Zero new Firestore collections created.

## Monthly Cost Projections

| New Clients/Month | Approx Reads | Approx Writes | Cost Profile |
|-------------------|--------------|---------------|--------------|
| 10 | 20 | 130-180 | Negligible |
| 50 | 100 | 650-900 | Negligible |
| 100 | 200 | 1,300-1,800 | Negligible |
| 500 | 1,000 | 6,500-9,000 | Still small; watch auth/duplicate-query volume only if onboarding spikes |

## Workspace Profile API

`GET /api/canonica/workspace-profile` reads the existing `stores/{sId}` document once.

`PUT /api/canonica/workspace-profile` reads the store once, skips the write when unchanged, and writes only the product profile fields plus `canonicaLaunchProfile` when values changed.

No new collection is introduced.

**Negligible cost.** Onboarding is a one-time event per client.

## Subscription Ownership Shape

Canonica onboarding writes subscription records with both compatibility and product-native ownership fields:

- `tenantId` / `storeId`
- `tId` / `sId`
- `pId: "CN"`
- `productId: "CN"`

The `stores/{sId}.canonicaSubscription` summary stores the active provider subscription id. Billing screens use that summary to direct-read `subscriptions/{subscriptionId}` instead of scanning subscriptions by status/date. This keeps the first billing load to one store read plus one subscription read in the normal path.

## KB Import Source Cost

The KB import screen can upload files, pasted docs URLs, and pasted starter answers. URL and starter-answer inputs are converted into bounded `text/plain` source files and uploaded to Canonica Storage. This avoids introducing a URL crawler, Firestore staging collection, or repeated backend reads.

Per import job:

- Storage writes: one object per uploaded file/text source
- Firestore writes: one `kb_generation_jobs` document
- Realtime listener: one active-job listener scoped by `tId`, `sId`, active statuses, and `limit(5)`
- Previous job history: manual button read, capped at 20 by default

The import flow must use Canonica session scope and `canonicaStorage` in separate Firebase mode.

## Razorpay Cost

- Beta plan: $0 (no Razorpay call)
- Paid plans: Standard Razorpay subscription creation fee (same provider flow as MenuList)
- Paid onboarding passes `productId: "CN"` into Razorpay plan lookup and provider notes, so Canonica paid plans cannot reuse or collide with MenuList plan lookup keys.
- Paid activation: shared Razorpay verify/webhook routes write to Canonica Firebase when `productId: "CN"` is present in request body or Razorpay notes.
- Support credit packs: one `topups` write on order creation, one transaction update on verification, and one subscription balance update.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-21 | 1.6.1 | Documented product-scoped Razorpay plan lookup for paid Canonica onboarding |
| 2026-05-21 | 1.6.0 | Added Canonica subscription ownership fields and store-summary direct-read billing contract |
| 2026-05-21 | 1.5.0 | Added product-aware Razorpay activation and support credit pack cost notes |
| 2026-05-21 | 1.4.0 | Added KB import source cost notes for URL/starter-answer text sources and Canonica storage usage |
| 2026-05-21 | 1.3.0 | Added initial product-surface writes, compact context-summary seed, and workspace-profile API cost notes |
| 2026-05-21 | 1.2.0 | Updated cost model for separate Firebase mode, `productAccounts.CN` bridge, and `canonicaWidgetApi` key storage |
| 2026-05-19 | 1.1.0 | Added Canonica tenant scheduler registry write for cost-optimized nightly discovery |
| 2026-03-07 | 1.0.0 | Initial cost analysis |

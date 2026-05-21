# Canonica Billing — Firebase Cost

> **Version:** 1.1.1
> **Last Updated:** 2026-05-21
> **Audience:** Developers / Ops

## Collections

Canonica billing uses the same collection names as MenuList, but in Canonica Firebase when `CANONICA_FIREBASE_MODE=separate`.

| Collection | Operation | Trigger | Cost Note |
|------------|-----------|---------|-----------|
| `subscriptions` | WRITE | subscription creation / verification / webhook / mutation | One document by provider subscription id |
| `stores` | READ | billing dashboard active subscription load | Reads `stores/{sId}.canonicaSubscription` summary first |
| `subscriptions` | READ | billing dashboard active subscription load | Direct `subscriptions/{subscriptionId}` read from store summary; query fallback is tenant/store scoped and capped at 10 |
| `topups` | WRITE | support credit order create / verify | One document by Razorpay order id |
| `payment_transactions` | WRITE | Razorpay webhook audit | One compact transaction row per payment event |
| `payment_transactions` | QUERY | transactions screen / billing history | Scoped by `tenantId`, `storeId`, capped at 50, then event-filtered/sorted client-side to 25 |
| `stores` | WRITE | Canonica entitlement sync | Updates compact `canonicaSubscription` summary |

## Cost Controls

- No realtime listeners were added.
- Billing history is explicitly loaded and capped at 50 Firestore reads, then reduced to 25 display rows.
- Active subscription reads are request-deduped in the client DAL and prefer the store summary direct-doc path.
- Server-side billing mutations use the same store summary direct-doc path before falling back to the capped tenant/store query. This keeps API payment operations aligned with the dashboard read model and avoids the old composite status/date lookup during normal operation.
- Single-object billing reads do not use the generic client `apiCallComposer`, because that helper returns `[]` on error for list-style DAL calls.
- Webhook writes compact transaction summaries instead of full raw Razorpay payloads.
- Canonica entitlement sync updates only `stores/{sId}` and the subscription doc; it does not fan out to MenuList public cache tags.

## Rules And Indexes

Separate Canonica Firestore rules must allow tenant-scoped reads for:

- `stores/{sId}`
- `subscriptions/{subscriptionId}`
- `payment_transactions/{transactionId}`

No broad client writes are allowed for those collections; payment and entitlement mutations remain server/API/webhook owned.

The active-subscription direct-doc path avoids the old composite query on `status + cycleEndDate + tenantId + storeId`. The payment history query avoids `event in + orderBy` and instead uses the tenant/store scope required by rules, then filters the small result locally.

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-05-21 | 1.1.1 | Aligned server-side Canonica billing lookup with the store-summary direct subscription path |
| 2026-05-21 | 1.1.0 | Switched billing reads to store-summary direct subscription lookup, documented Canonica read-only rules, and removed composite-heavy history query shape |
| 2026-05-21 | 1.0.0 | Initial Canonica billing cost model |

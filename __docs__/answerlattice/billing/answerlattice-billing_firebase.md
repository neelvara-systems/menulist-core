# Answerlattice Billing — Firebase Cost

> **Version:** 1.2.2
> **Last Updated:** 2026-06-20
> **Audience:** Developers / Ops

## Collections

Answerlattice billing uses the same collection names as MenuList, but in Answerlattice Firebase when `ANSWERLATTICE_FIREBASE_MODE=separate`.

| Collection | Operation | Trigger | Cost Note |
|------------|-----------|---------|-----------|
| `subscriptions` | WRITE | subscription creation / verification / webhook / mutation | One document by provider subscription id |
| `stores` | READ | billing dashboard active subscription load | Reads `stores/{sId}.answerlatticeSubscription` summary first |
| `subscriptions` | READ | billing dashboard active subscription load | Direct `subscriptions/{subscriptionId}` read from store summary; query fallback is tenant/store scoped and capped at 10 |
| `topups` | WRITE | support credit order create / verify | One document by Razorpay order id; verification is idempotent and product-scoped |
| `payment_transactions` | WRITE | Razorpay webhook audit | One compact transaction row per payment event |
| `payment_transactions` | QUERY | transactions screen / billing history | Scoped by `tenantId`, `storeId`, capped at 50, then event-filtered/sorted client-side to 25 |
| `stores` | WRITE | Answerlattice entitlement sync / support credit top-up verify / support-credit debit | Updates compact `answerlatticeSubscription` summary, current monthly credits, top-up credits, and reset period |
| `answerlattice_aiOperations/{tId}/{sId}` | WRITE | Answerlattice app/API, legacy client-triggered helper, and Cloud Function AI provider calls | One compact accounting row per provider-backed call; raw provider payloads are not stored in accounting-only mode |
| `answerlattice_aiOperations/{tId}/{sId}` | QUERY | transactions screen support-credit usage table through `/api/answerlattice/ai-operations` | Server/API-owned query scoped to resolved Answerlattice tenant/store, capped at 50 per request, default page size 12; direct tenant Firestore reads are not allowed because raw rows include platform accounting fields |
| `answerlattice_intakeUsageLedger` | WRITE | paid Knowledge Intake OCR/transcription reserve/finalize/refund | Immutable reservation/settlement rows for charged media extraction |

## Cost Controls

- No realtime listeners were added.
- Billing history is explicitly loaded and capped at 50 Firestore reads, then reduced to 25 display rows.
- Active subscription reads are request-deduped in the client DAL and prefer the store summary direct-doc path.
- Server-side billing mutations use the same store summary direct-doc path before falling back to the capped tenant/store query. This keeps API payment operations aligned with the dashboard read model and avoids the old composite status/date lookup during normal operation.
- Single-object billing reads do not use the generic client `apiCallComposer`, because that helper returns `[]` on error for list-style DAL calls.
- Webhook writes compact transaction summaries instead of full raw Razorpay payloads.
- Answerlattice entitlement sync updates only `stores/{sId}` and the subscription doc; it does not fan out to MenuList public cache tags.
- Payment verification writes product/scope mirror keys back to the touched subscription document. This repairs legacy records during normal successful payments and prevents helper defaults from replacing missing tenant/store keys with platform defaults.
- AI operation history is accounting-only by default. Owner-visible reads include action, units, token counts, token count source, source/model, timing, compact client response, and support-credit debit breakdown when present. Provider payloads, raw prompts, real cost, margin, and charge internals stay hidden.
- Manual draft regeneration and article entity extraction do not call Gemini from the browser and do not write Firestore directly. They run through dedicated Answerlattice API routes, apply the relevant Answerlattice permission, rate limit the provider call, and record zero-unit internal usage.
- Token counts are provider-confirmed when Gemini returns usage metadata. Older SDK and embedding paths may write estimated token counts and mark `tokenCountSource='estimated'`.
- Support credit purchase and consumption reconcile through two ledgers: `topups`/`subscriptions.topUpCredits` for purchased credits, and `answerlattice_intakeUsageLedger` plus `answerlattice_aiOperations.unitsConsumed` for consumed credits. Provider token counts are recorded separately and do not debit support credits unless the action has a non-zero unit cost.
- Knowledge Intake media extraction keeps the existing reserve-before-provider and refund-on-failure support-credit ledger. Non-intake Answerlattice AI calls log zero-unit internal/public usage unless an explicit support-credit unit cost is assigned.

## Rules And Indexes

Separate Answerlattice Firestore rules must allow tenant-scoped reads for:

- `stores/{sId}`
- `subscriptions/{subscriptionId}`
- `payment_transactions/{transactionId}`
- `answerlattice_intakeUsageLedger/{ledgerId}`

`answerlattice_aiOperations/{tId}/{sId}/{docId}` direct Firestore reads are platform-only. Owner billing history reads go through `/api/answerlattice/ai-operations`, which applies Answerlattice billing permission checks, rate limiting, tenant/store session scope, capped pagination, and owner-safe field filtering.

No broad client writes are allowed for those collections; payment and entitlement mutations remain server/API/webhook owned.

The active-subscription direct-doc path avoids the old composite query on `status + cycleEndDate + tenantId + storeId`. The payment history query avoids `event in + orderBy` and instead uses the tenant/store scope required by rules, then filters the small result locally.

The AI operation history query uses the nested tenant/store path plus `orderBy(createdOn desc)`. Action filters are applied by a bounded scan window to avoid new composite indexes during this pass.

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-06-20 | 1.2.2 | Added top-up store-summary mirror and purchased-vs-consumed-vs-provider-token reconciliation notes |
| 2026-06-20 | 1.2.1 | Documented server-owned manual draft/entity extraction routes and platform-only raw AI operation reads |
| 2026-06-20 | 1.2.0 | Added Answerlattice AI operation/support-credit usage accounting, capped transaction-page reads, and token-count source notes |
| 2026-05-21 | 1.1.2 | Added product-scoped Razorpay plan lookup and subscription metadata normalization notes |
| 2026-05-21 | 1.1.1 | Aligned server-side Answerlattice billing lookup with the store-summary direct subscription path |
| 2026-05-21 | 1.1.0 | Switched billing reads to store-summary direct subscription lookup, documented Answerlattice read-only rules, and removed composite-heavy history query shape |
| 2026-05-21 | 1.0.0 | Initial Answerlattice billing cost model |

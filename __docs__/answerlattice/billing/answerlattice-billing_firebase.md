# Answerlattice Billing — Firebase Cost

> **Version:** 1.2.3
> **Last Updated:** 2026-06-28
> **Audience:** Developers / Ops

## Collections

Answerlattice billing uses the same collection names as MenuList, but in Answerlattice Firebase when `ANSWERLATTICE_FIREBASE_MODE=separate`.

Billing read failures and entitlement sync failures use `src/lib/answerlattice/diagnostics.ts` and return the existing fallbacks for active subscription lookup / best-effort entitlement sync. Do not debug billing reads or sync writes by logging raw tenant/store IDs, subscription IDs, provider payloads, or exception messages.

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
| `answerlattice_aiOperations/{tId}/{sId}` | QUERY | transactions screen support-credit usage table through `/api/answerlattice/ai-operations` | Server/API-owned query scoped to resolved Answerlattice tenant/store, rate-limited before permission/read work, capped at 50 per request, default page size 12; direct tenant Firestore reads are not allowed because raw rows include platform accounting fields |
| `answerlattice_intakeUsageLedger` | WRITE | paid Knowledge Intake OCR/transcription reserve/finalize/refund | Immutable reservation/settlement rows for charged media extraction |

## Cost Controls

- No realtime listeners were added.
- Billing history is explicitly loaded and capped at 50 Firestore reads, then reduced to 25 display rows.
- Active subscription reads are request-deduped in the client DAL and prefer the store summary direct-doc path.
- Server-side billing mutations use the same store summary direct-doc path before falling back to the capped tenant/store query. This keeps API payment operations aligned with the dashboard read model and avoids the old composite status/date lookup during normal operation.
- Single-object billing reads do not use the generic client `apiCallComposer`, because that helper returns `[]` on error for list-style DAL calls.
- Webhook writes compact transaction summaries instead of full raw Razorpay payloads.
- Answerlattice entitlement sync updates only `stores/{sId}` and the subscription doc; it does not fan out to MenuList public cache tags.
- Answerlattice entitlement sync diagnostics are logs only. Failed sync attempts log `answerlattice_subscription_entitlement_sync_failed` with bounded subscription/tenant/store/plan/status/source metadata and source error name/code/status only; they do not add Firestore reads/writes or change best-effort failure behavior.
- Payment verification writes product/scope mirror keys back to the touched subscription document. This repairs legacy records during normal successful payments and prevents helper defaults from replacing missing tenant/store keys with platform defaults.
- AI operation history is accounting-only by default. Owner-visible reads include action, units, token counts, token count source, source/model, timing, compact client response, and support-credit debit breakdown when present. Provider payloads, raw prompts, real cost, margin, and charge internals stay hidden.
- AI accounting finalizer diagnostics are logs only. Failed operation-log, support-credit debit, or AI-operation balance-detail update paths log stable `answerlattice_ai_accounting_*` codes with bounded scope/action metadata and source error name/code/status only; they do not add Firestore reads/writes or change debit failure behavior.
- Manual draft regeneration and article entity extraction do not call Gemini from the browser and do not write Firestore directly. They run through dedicated Answerlattice API routes, resolve Answerlattice scope, check safe mode, rate limit before permission/body/provider work, and record zero-unit internal usage.
- Token counts are provider-confirmed when Gemini returns usage metadata. Older SDK and embedding paths may write estimated token counts and mark `tokenCountSource='estimated'`.
- Support credit purchase and consumption reconcile through two ledgers: `topups`/`subscriptions.topUpCredits` for purchased credits, and `answerlattice_intakeUsageLedger` plus `answerlattice_aiOperations.unitsConsumed` for consumed credits. Provider token counts are recorded separately and do not debit support credits unless the action has a non-zero unit cost.
- Knowledge Intake media extraction keeps the existing reserve-before-provider and refund-on-failure support-credit ledger. Non-intake Answerlattice AI calls log zero-unit internal/public usage unless an explicit support-credit unit cost is assigned.

## Rules And Indexes

Separate Answerlattice Firestore rules must allow tenant-scoped reads for:

- `stores/{sId}`
- `subscriptions/{subscriptionId}`
- `payment_transactions/{transactionId}`
- `answerlattice_intakeUsageLedger/{ledgerId}`

`answerlattice_aiOperations/{tId}/{sId}/{docId}` direct Firestore reads are platform-only. Owner billing history reads go through `/api/answerlattice/ai-operations`, which validates query shape, resolves tenant/store session scope, rate-limits before permission/read work, applies Answerlattice billing permission checks, uses capped pagination, filters owner-safe fields, and logs read failures with bounded scope/query metadata. The browser DAL sends the request with no-store cache, same-origin credentials, and manual redirect handling, then caps the route response at 512 KB and requires the paginated `{ data, hasMore, lastVisibleDoc }` shape before returning usage rows to billing screens; malformed, oversized, rejected, or wrong-shape responses stay on fixed local failure handling with bounded diagnostics.

No broad client writes are allowed for those collections; payment and entitlement mutations remain server/API/webhook owned.

The active-subscription direct-doc path avoids the old composite query on `status + cycleEndDate + tenantId + storeId`. The payment history query avoids `event in + orderBy` and instead uses the tenant/store scope required by rules, then filters the small result locally.

The AI operation history query uses the nested tenant/store path plus `orderBy(createdOn desc)`. Action filters are applied by a bounded scan window to avoid new composite indexes during this pass.

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-06-28 | 1.2.4 | Documented safe-mode/rate-limit admission and bounded diagnostics for manual draft/entity extraction routes |
| 2026-06-28 | 1.2.3 | Documented bounded Answerlattice entitlement sync diagnostics |
| 2026-06-20 | 1.2.2 | Added top-up store-summary mirror and purchased-vs-consumed-vs-provider-token reconciliation notes |
| 2026-06-20 | 1.2.1 | Documented server-owned manual draft/entity extraction routes and platform-only raw AI operation reads |
| 2026-06-20 | 1.2.0 | Added Answerlattice AI operation/support-credit usage accounting, capped transaction-page reads, and token-count source notes |
| 2026-05-21 | 1.1.2 | Added product-scoped Razorpay plan lookup and subscription metadata normalization notes |
| 2026-05-21 | 1.1.1 | Aligned server-side Answerlattice billing lookup with the store-summary direct subscription path |
| 2026-05-21 | 1.1.0 | Switched billing reads to store-summary direct subscription lookup, documented Answerlattice read-only rules, and removed composite-heavy history query shape |
| 2026-05-21 | 1.0.0 | Initial Answerlattice billing cost model |

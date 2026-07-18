# Answerlattice Billing — Firebase Cost

> **Version:** 1.6.1
> **Last Updated:** 2026-07-14
> **Audience:** Developers / Ops

## Collections

Answerlattice billing uses the same collection names as MenuList, but in Answerlattice Firebase when `ANSWERLATTICE_FIREBASE_MODE=separate`.

Exception: shared Razorpay concurrency coordination is deliberately central. `billingCheckoutLeases` and `billingProviderPlans` live in MenuList Firestore because MenuList and Answerlattice share one Razorpay account and provider plan namespace. They contain only server-owned coordination/provider identity; a successful checkout changes its existing scope lease into a two-minute replay checkpoint rather than appending another record. All `AL` subscription, support-credit, transaction, store-summary, entitlement, and AI-operation truth stays in Answerlattice Firestore. Firestore rules deny browser read/write access to both central collections.

Billing read failures and entitlement sync failures use `src/lib/answerlattice/diagnostics.ts` and return the existing fallbacks for active subscription lookup / best-effort entitlement sync. Do not debug billing reads or sync writes by logging raw tenant/store IDs, subscription IDs, provider payloads, or exception messages.

| Collection | Operation | Trigger | Cost Note |
|------------|-----------|---------|-----------|
| `subscriptions` | WRITE | subscription creation / verification / webhook / mutation | One document by provider subscription id |
| `stores` | READ | billing dashboard active subscription load | Reads `stores/{sId}.answerlatticeSubscription` summary first |
| `subscriptions` | READ | billing dashboard active subscription load | Direct `subscriptions/{subscriptionId}` read from store summary; query fallback is tenant/store scoped and capped at 10 |
| `subscriptions` | TRANSACTION QUERY | entitlement synchronization | Reads the triggering document plus at most 10 current active subscriptions for the same tenant/store before selecting the authoritative summary |
| `topups` | READ/WRITE | support credit order create / browser verify / signed `order.paid` recovery | One immutable snapshot by Razorpay order id; shared transaction settlement is idempotent and product-scoped |
| `payment_transactions` | WRITE | Razorpay webhook audit | One compact transaction row per payment event |
| `payment_transactions` | QUERY | transactions screen / billing history | Scoped by `tenantId`, `storeId`, paid event, ordered by `created_at desc`, and limited to 25 in Firestore |
| `stores` | WRITE | Answerlattice entitlement sync / support credit top-up verify / support-credit debit | Updates compact `answerlatticeSubscription` summary, current monthly credits, top-up credits, and reset period |
| `answerlattice_aiOperations/{tId}/{sId}` | WRITE | Answerlattice app/API, legacy client-triggered helper, and Cloud Function AI provider calls | One compact accounting row per provider-backed call; raw provider payloads are not stored in accounting-only mode |
| `answerlattice_aiOperations/{tId}/{sId}` | QUERY | transactions screen support-credit usage table through `/api/answerlattice/ai-operations` | Server/API-owned query scoped to resolved Answerlattice tenant/store, rate-limited before permission/read work, capped at 50 per request, default page size 12; direct tenant Firestore reads are not allowed because raw rows include platform accounting fields |
| `answerlattice_intakeUsageLedger` | WRITE | paid Knowledge Intake OCR/transcription reserve/finalize/refund | Workspace-bound reservation state machine with billing-period debit/refund evidence |

The operation-history cursor lookup remains one scoped document read when a cursor is supplied. The route now admits that existing snapshot only when it exists, has a valid `createdOn` timestamp, and lies inside the active date range. An invalid cursor stops before the continuation query, so the change adds no valid-path Firestore operation, collection, index, rule, schema, cache, Function, or cross-product data access.

The Answerlattice AI operation response projector is read-only and Firebase-cost neutral. It applies the product's owner/platform field allowlist before traversing already-read document values, keeps the document path as canonical response identity, and omits raw provider, batch, generation, and full Gemini payloads. It changes no document, query, read/write/delete count, collection, index, rule, schema, Function, or deployment target.

The browser operation-row projector is likewise read-only and cost neutral. After the existing 512 KB response cap, it runtime-validates every visible row and the complete pagination/cursor relationship before Answerlattice billing state consumes the page. Invalid successful payloads use the existing fixed failure path and unknown row fields are omitted. No Firestore operation, collection, index, rule, persisted schema, Function, cache, entitlement, payment, support-credit, or deployment target changes.

## Cost Controls

- No realtime listeners were added.
- Answerlattice Razorpay mutations re-read the current workspace store and current user membership/role before provider or financial mutation work. This adds one store read and up to two canonical user-query reads per admitted or rejected mutation; the bounded two-row legacy `tId` query runs only when the canonical tenant query misses. It prevents a stale session role or the default non-billing Manager role from reaching Admin-SDK billing writes.
- Subscription and top-up creation apply their existing product/user/workspace rate limits before those authorization reads, bounding repeated denied-request read cost. Verification and lifecycle mutations already rate-limit before permission work.
- Existing-workspace subscription creation adds a direct-current lookup and pending query capped at 10. Exact provider-created checkout retry writes nothing; conflicting pending/current intent fails closed. A provider-created/local-persistence failure re-reads the exact row before provider cancellation compensation.
- Answerlattice onboarding user ID boundary: `/api/answerlattice/onboard` validates the authenticated session user ID with `src/lib/answerlattice/onboardingUserIdBoundary.ts` before user document refs, default auth product-account sync, subscription metadata, and product-surface creator fields. This is an admission guard only; valid onboarding keeps the same Firestore read/write shape.
- Billing history is one ordered paid-event query capped at 25 Firestore reads; limiting no longer happens before sorting/filtering.
- Active subscription reads are request-deduped with normalized tenant/store cache keys and prefer the store summary direct-doc path. The store must have exact Answerlattice ownership; direct subscriptions and standalone summaries must have exact `AL` product plus numeric tenant/store ownership with no conflicting aliases before return. An embedded `id` field cannot override the Firestore document ID.
- Answerlattice App Billing Document ID Boundary: `src/lib/answerlattice/billingDocumentIdBoundary.ts` is the shared source for strict subscription/ledger IDs and exact positive numeric tenant/store request scope. `src/lib/answerlattice/billingScopeBoundary.ts` is the stricter persisted-financial boundary: product aliases must be exact `AL`, stored tenant/store aliases must be numeric positive safe integers, and every duplicate alias must agree. Client/server billing, onboarding, Knowledge Intake, AI accounting, entitlement, and paid-history paths validate before refs, filters, cache keys, balance changes, or projection; malformed or ambiguous financial rows fail closed for authorized reconciliation.
- Server-side billing mutations use the same store summary direct-doc path before falling back to the capped tenant/store query. This keeps API payment operations aligned with the dashboard read model and avoids the old composite status/date lookup during normal operation.
- Single-object billing reads do not use the generic client `apiCallComposer`, because that helper returns `[]` on error for list-style DAL calls.
- Webhook writes compact transaction summaries instead of full raw Razorpay payloads. Payment-only events with missing product/scope notes may add one bounded internal subscription lookup to recover exact Answerlattice ownership instead of writing to MenuList.
- Answerlattice entitlement sync updates only `stores/{sId}` and the subscription doc; it does not fan out to MenuList public cache tags.
- Answerlattice entitlement sync diagnostics are logs only. Failed sync attempts log `answerlattice_subscription_entitlement_sync_failed` with bounded subscription/tenant/store/plan/status/source metadata and source error name/code/status only; they do not add Firestore reads/writes or change best-effort failure behavior.
- Payment verification writes product/scope mirror keys back to the touched subscription document. This repairs legacy records during normal successful payments and prevents helper defaults from replacing missing tenant/store keys with platform defaults.
- AI operation history is accounting-only by default. Owner-visible reads include action, units, token counts, token count source, source/model, timing, compact client response, and support-credit debit breakdown when present. Provider payloads, raw prompts, real cost, margin, and charge internals stay hidden.
- Answerlattice transactions raw load-reason diagnostics boundary: transactions-page load failures are logs only and use fixed runtime diagnostic codes with bounded tenant/store presence-length metadata plus page-state counts. They do not add Firestore reads/writes and do not log raw rejected Promise reasons, exception messages, tenant IDs, store IDs, transaction rows, or AI operation rows.
- AI accounting finalizer diagnostics are logs only. Failed operation-log, support-credit debit, or AI-operation balance-detail update paths log stable `answerlattice_ai_accounting_*` codes with bounded scope/action metadata and source error name/code/status only; they do not add Firestore reads/writes or change debit failure behavior.
- Manual draft regeneration and article entity extraction do not call Gemini from the browser and do not write Firestore directly. They run through dedicated Answerlattice API routes, resolve Answerlattice scope, check safe mode, rate limit before permission/body/provider work, and record zero-unit internal usage.
- Token counts are provider-confirmed when Gemini returns usage metadata. Older SDK and embedding paths may write estimated token counts and mark `tokenCountSource='estimated'`.
- Support credit purchase and consumption reconcile through two ledgers: `topups`/`subscriptions.topUpCredits` for purchased credits, and `answerlattice_intakeUsageLedger` plus `answerlattice_aiOperations.unitsConsumed` for consumed credits. Browser verification and signed `order.paid` use the same pending-snapshot + exact-subscription transaction; the first application writes both documents and mirrors the store summary, while replay performs validation reads but no second credit write. Provider token counts are recorded separately and do not debit support credits unless the action has a non-zero unit cost.
- Knowledge Intake media extraction keeps reserve-before-provider and refund-on-failure support-credit accounting. Reserve, finalize, and refund use transactions and require exact ledger/subscription `tId/sId` agreement. Finalize and refund can no longer both win. The reservation stores its billing-period key; an in-period failure restores monthly and top-up debits, while a later-period failure restores only purchased top-up credits and records expired monthly credits instead of inflating the new cycle. Non-intake Answerlattice AI calls log zero-unit internal/public usage unless an explicit support-credit unit cost is assigned.

## Rules And Indexes

Separate Answerlattice Firestore rules must allow tenant-scoped reads for:

- `stores/{sId}`
- `subscriptions/{subscriptionId}`
- `payment_transactions/{transactionId}`
- `answerlattice_intakeUsageLedger/{ledgerId}`

`answerlattice_aiOperations/{tId}/{sId}/{docId}` direct Firestore reads are platform-only. Owner billing history reads go through `/api/answerlattice/ai-operations`, which validates query shape, resolves tenant/store session scope, rate-limits before permission/read work, applies Answerlattice billing permission checks, uses capped pagination, filters owner-safe fields, and logs read failures with bounded scope/query metadata. The route also validates operation-history query cursors and date filters through `src/lib/ai/operationHistoryQuery.ts`: cursor values must be simple Firestore document IDs, date filters must be strict `YYYY-MM-DD` or browser ISO `...Z` values, and reversed or wider-than-366-day ranges are rejected before Firestore cursor/query work. The browser DAL sends the request with no-store cache, same-origin credentials, and manual redirect handling, caps the route response at 512 KB, and runtime-projects every row plus the exact pagination/cursor relationship before returning usage rows to billing screens; malformed, oversized, rejected, or wrong-shape responses stay on fixed local failure handling with bounded diagnostics.

No broad client writes are allowed for those collections; payment and entitlement mutations remain server/API/webhook owned.

The active-subscription direct-doc read path avoids the old general billing-page composite query. Entitlement synchronization intentionally uses a bounded current-active query so an old subscription cannot clear a concurrently active replacement; `firestore-answerlattice.indexes.json` therefore includes `subscriptions` on `status + storeId + tenantId + cycleEndDate`. Paid billing history uses the dedicated `payment_transactions` composite index on `event + storeId + tenantId + created_at desc`; the same history index exists in the shared MenuList index file and the dedicated Answerlattice index file.

Lifecycle status changes and grace expiry re-read the subscription inside a transaction before appending history. Upgrade carry-forward reads and writes the old and replacement subscriptions in one transaction and preserves any existing replacement top-up balance. Entitlement sync reads the source subscription plus the bounded active-subscription query and transactionally writes the store summary and subscription audit mirror. These are correctness reads/writes on billing mutations only; no polling, scheduled function, Storage operation, or browser write is added. The dedicated Answerlattice subscription index requires a scoped Firebase index deployment before this query is runtime-certified.

Replacement finalization pre-reads old/new rows, fetches old provider state, then re-reads both in the carry-forward transaction. The first application writes both rows; `carryForwardFromSubscriptionId` makes replay write-free. Existing onboarding compensation remains failure-path-only and does not add a normal-path Firestore operation.

The AI operation history query uses the nested tenant/store path plus `orderBy(createdOn desc)`. Action filters are applied by a bounded scan window to avoid new composite indexes during this pass.

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-14 | 1.6.0 | Documented central shared-provider checkout/plan coordination while preserving separate Answerlattice financial truth |
| 2026-07-14 | 1.5.0 | Documented pending checkout admission, provider persistence compensation, replacement finalization, webhook product recovery, and exactly-once `order.paid` top-up recovery |
| 2026-07-13 | 1.4.3 | Applied creation rate limits before persisted billing-permission reads and expanded role regression coverage |
| 2026-07-13 | 1.4.2 | Enforced current persisted `canManageBilling` permission across every shared Answerlattice Razorpay mutation |
| 2026-07-11 | 1.4.1 | Added strict persisted subscription/history product and numeric workspace admission plus scoped entitlement-summary ownership fields |
| 2026-07-10 | 1.4.0 | Added transactional lifecycle/grace/upgrade settlement, authoritative active entitlement selection, and the subscription composite index |
| 2026-07-10 | 1.3.0 | Enforced current/scoped billing summaries, strict shared scope IDs, authoritative Firestore IDs, ordered paid-history query, and dedicated composite index |
| 2026-07-06 | 1.2.8 | Added Answerlattice product-billing store-scope document-ID boundary coverage |
| 2026-07-06 | 1.2.7 | Documented Answerlattice product-billing subscription document-ID boundary coverage |
| 2026-07-05 | 1.2.6 | Documented the Answerlattice onboarding user ID boundary and unchanged valid-request Firestore cost shape |
| 2026-07-05 | 1.2.5 | Documented transactions-page bounded load failure diagnostics and no-cost behavior |
| 2026-06-28 | 1.2.4 | Documented safe-mode/rate-limit admission and bounded diagnostics for manual draft/entity extraction routes |
| 2026-06-28 | 1.2.3 | Documented bounded Answerlattice entitlement sync diagnostics |
| 2026-06-20 | 1.2.2 | Added top-up store-summary mirror and purchased-vs-consumed-vs-provider-token reconciliation notes |
| 2026-06-20 | 1.2.1 | Documented server-owned manual draft/entity extraction routes and platform-only raw AI operation reads |
| 2026-06-20 | 1.2.0 | Added Answerlattice AI operation/support-credit usage accounting, capped transaction-page reads, and token-count source notes |
| 2026-05-21 | 1.1.2 | Added product-scoped Razorpay plan lookup and subscription metadata normalization notes |
| 2026-05-21 | 1.1.1 | Aligned server-side Answerlattice billing lookup with the store-summary direct subscription path |
| 2026-05-21 | 1.1.0 | Switched billing reads to store-summary direct subscription lookup, documented Answerlattice read-only rules, and removed composite-heavy history query shape |
| 2026-05-21 | 1.0.0 | Initial Answerlattice billing cost model |

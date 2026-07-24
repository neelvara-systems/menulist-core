# Answerlattice Billing — Firebase Cost

> **Version:** 2.0.1
> **Last Updated:** 2026-07-19
> **Audience:** Developers / Ops

## Collections

Answerlattice billing uses the same collection names as MenuList, but in Answerlattice Firebase when `ANSWERLATTICE_FIREBASE_MODE=separate`.

Exception: shared Razorpay concurrency coordination is deliberately central. `billingCheckoutLeases` and `billingProviderPlans` live in MenuList Firestore because MenuList and Answerlattice share one Razorpay account and provider plan namespace. They contain only server-owned coordination/provider identity. Each new checkout provider create and each new provider-plan create adds its own exact `provider_creating` fence transaction. Ambiguous subscription or plan creation remains recovery-only; support-credit order recovery retains the same unique receipt. A successful checkout changes the same scope document into a provider checkpoint and then a two-minute replay checkpoint, while a plan key becomes one durable exact `ready` provider ID. All `AL` subscription, support-credit, transaction, store-summary, entitlement, and AI-operation truth stays in Answerlattice Firestore. Firestore rules deny browser read/write access to both central collections.

Shared `razorpayWebhookEvents` coordination also remains in MenuList Firestore. One signed event uses a claim transaction and an attempt-fenced terminal transaction. Processed replay returns success, active work returns retryable `503`, and failed/expired work can be re-owned without allowing a stale worker to overwrite the newer result. Answerlattice `payment_transactions/{eventKey}` remains in the Answerlattice project; its retry transaction preserves the first valid `createdOn`, rejects product/event identity collisions and writes real Firestore timestamps.

Billing read failures and entitlement sync failures use `src/lib/answerlattice/diagnostics.ts`. Active-subscription read failures are rethrown to the Billing screen so the UI blocks mutation and offers retry instead of presenting false absence. Entitlement synchronization remains the separate best-effort path. Do not debug billing reads or sync writes by logging raw tenant/store IDs, subscription IDs, provider payloads, or exception messages.

| Collection | Operation | Trigger | Cost Note |
|------------|-----------|---------|-----------|
| `subscriptions` | WRITE | subscription creation / verification / webhook / mutation | One document by provider subscription id |
| `stores` | READ | billing dashboard active subscription load | Reads `stores/{sId}.answerlatticeSubscription` summary first |
| `subscriptions` | READ | billing dashboard active subscription load | Direct `subscriptions/{subscriptionId}` read from store summary; query fallback constrains both product aliases and both tenant/store alias pairs before the cap of 10 |
| `subscriptions` | TRANSACTION QUERY | entitlement synchronization | Reads the triggering document plus at most 10 current active subscriptions for the same tenant/store before selecting the authoritative summary |
| `topups` | SERVER READ/WRITE | support credit order create / authenticated API verify / signed `order.paid` recovery | One immutable snapshot by Razorpay order id; shared transaction settlement is idempotent and product-scoped; no Answerlattice tenant browser read |
| `payment_transactions` | WRITE | Razorpay webhook audit | One compact transaction row per payment event |
| `payment_transactions` | QUERY | transactions screen / billing history | Scoped by exact `pId: AL` + `productId: AL`, `tenantId`, `storeId`, paid event, ordered by `created_at desc`, and limited to 25 in Firestore |
| `stores` | WRITE | Answerlattice entitlement sync / support credit top-up verify / support-credit debit | Updates compact `answerlatticeSubscription` summary, current monthly credits, top-up credits, and reset period |
| `answerlattice_aiOperations/{tId}/{sId}` | WRITE | Answerlattice app/API, legacy client-triggered helper, and Cloud Function AI provider calls | One compact accounting row per provider-backed call; raw provider payloads are not stored in accounting-only mode |
| `answerlattice_aiOperations/{tId}/{sId}` | QUERY | transactions screen support-credit usage table through `/api/answerlattice/ai-operations` | Server/API-owned query scoped to resolved Answerlattice tenant/store, rate-limited before permission/read work, capped at 50 per request, default page size 12; direct tenant Firestore reads are not allowed because raw rows include platform accounting fields |
| `answerlattice_aiCapacityReservations` | SERVER READ/WRITE | support-search pre-provider reservation / settlement / failure refund / hourly stale recovery | One deterministic root pointer per reserved operation; bounded `recoveryAt <= now` scheduler query; both rule sets default-deny all browser reads/writes |

`firestore-answerlattice.indexes.json` and the shared MenuList index file both define `subscriptions(pId, productId, tenantId, storeId, tId, sId)` for the exact fallback shape. This changes index requirements, not per-request document reads. Until both QA indexes are deployed, affected fallback queries can fail with an index-required error and must not be reported as live-verified.
| `answerlattice_intakeUsageLedger` | WRITE | paid Knowledge Intake OCR/transcription reserve/finalize/refund | Workspace-bound reservation state machine with billing-period debit/refund evidence |

The operation-history cursor lookup remains one scoped document read when a cursor is supplied. The route now admits that existing snapshot only when it exists, has a valid `createdOn` timestamp, and lies inside the active date range. An invalid cursor stops before the continuation query, so the change adds no valid-path Firestore operation, collection, index, rule, schema, cache, Function, or cross-product data access.

The Answerlattice AI operation response projector is read-only and Firebase-cost neutral. It applies the product's owner/platform field allowlist before traversing already-read document values, keeps the document path as canonical response identity, and omits raw provider, batch, generation, and full Gemini payloads. It changes no document, query, read/write/delete count, collection, index, rule, schema, Function, or deployment target.

The browser operation-row projector is likewise read-only and cost neutral. After the existing 512 KB response cap, it runtime-validates every visible row and the complete pagination/cursor relationship before Answerlattice billing state consumes the page. Invalid successful payloads use the existing fixed failure path and unknown row fields are omitted. No Firestore operation, collection, index, rule, persisted schema, Function, cache, entitlement, payment, support-credit, or deployment target changes.

## Cost Controls

- No realtime listeners were added.
- Checkout response projection, hosted-URL normalization, and bounded Billing diagnostics add no Firestore operation.
- Product-scoped client and Admin queries add both `pId == 'AL'` and `productId == 'AL'` to subscription fallback, current-active entitlement, Knowledge Intake/accounting, activation-summary, and transaction-history reads. This changes query admission and index shape, not the maximum valid-path document count.
- Answerlattice Razorpay mutations re-read the current workspace store and current user membership/role before provider or financial mutation work. This adds one store read and up to two canonical user-query reads per admitted or rejected mutation; the bounded two-row legacy `tId` query runs only when the canonical tenant query misses. It prevents a stale session role or the default non-billing Manager role from reaching Admin-SDK billing writes.
- Subscription and top-up creation apply their existing product/user/workspace rate limits before those authorization reads, bounding repeated denied-request read cost. Verification and lifecycle mutations already rate-limit before permission work.
- Existing-workspace subscription creation adds a direct-current lookup and pending query capped at 10. Exact provider-created checkout retry writes nothing; conflicting pending/current intent fails closed. A provider-created/local-persistence failure re-reads the exact row before provider cancellation compensation.
- Answerlattice onboarding user ID boundary: `/api/answerlattice/onboard` validates the authenticated session user ID with `src/lib/answerlattice/onboardingUserIdBoundary.ts` before user document refs, default auth product-account sync, subscription metadata, and product-surface creator fields. This is an admission guard only; valid onboarding keeps the same Firestore read/write shape.
- Billing history is one ordered paid-event query capped at 25 Firestore reads; limiting no longer happens before sorting/filtering.
- Active subscription reads are request-deduped with normalized tenant/store cache keys and prefer the store summary direct-doc path. The store must have exact Answerlattice ownership; direct subscriptions and standalone summaries must have exact `AL` product plus numeric tenant/store ownership with no conflicting aliases before return. An embedded `id` field cannot override the Firestore document ID.
- Answerlattice App Billing Document ID Boundary: `src/lib/answerlattice/billingDocumentIdBoundary.ts` is the shared source for strict subscription/ledger IDs and exact positive numeric tenant/store request scope. `src/lib/answerlattice/billingScopeBoundary.ts` is the stricter persisted-financial boundary and returns the exact authoritative numeric scope only when product aliases are exact `AL`, stored tenant/store aliases are numeric positive safe integers, and every duplicate alias agrees. Client/server billing, onboarding, Knowledge Intake, AI accounting, direct subscription lookup, payment/lifecycle/webhook transactions, entitlement, and paid-history paths validate before refs, filters, cache keys, balance changes, or projection; malformed or ambiguous financial rows fail closed for authorized reconciliation.
- The blocking Billing load-error state is Firebase-cost neutral. It changes how an existing rejected read is represented in the browser and adds no read, write, listener, index, collection, or Function.
- Server-side billing mutations use the same store summary direct-doc path before falling back to the capped tenant/store query. This keeps API payment operations aligned with the dashboard read model and avoids the old composite status/date lookup during normal operation.
- Single-object billing reads do not use the generic client `apiCallComposer`, because that helper returns `[]` on error for list-style DAL calls.
- Webhook writes compact transaction summaries instead of full raw Razorpay payloads. Payment-only events with missing product/scope notes may add one bounded internal subscription lookup to recover exact Answerlattice ownership instead of writing to MenuList.
- Answerlattice entitlement sync updates only `stores/{sId}` and the subscription doc; it does not fan out to MenuList public cache tags.
- Answerlattice entitlement sync diagnostics are logs only. Failed sync attempts log `answerlattice_subscription_entitlement_sync_failed` with bounded subscription/tenant/store/plan/status/source metadata and source error name/code/status only; they do not add Firestore reads/writes or change best-effort failure behavior.
- Payment verification writes product/scope mirror keys back to the touched subscription document. This repairs legacy records during normal successful payments and prevents helper defaults from replacing missing tenant/store keys with platform defaults.
- AI operation history is accounting-only by default. Owner-visible reads include action, units, token counts, token count source, source/model, timing, compact client response, and support-credit debit breakdown when present. Provider payloads, raw prompts, real cost, margin, and charge internals stay hidden.
- Answerlattice transactions raw load-reason diagnostics boundary: transactions-page load failures are logs only and use fixed runtime diagnostic codes with bounded tenant/store presence-length metadata plus page-state counts. They do not add Firestore reads/writes and do not log raw rejected Promise reasons, exception messages, tenant IDs, store IDs, transaction rows, or AI operation rows.
- AI accounting finalizer diagnostics are logs only. Failed operation-log, support-credit debit, or AI-operation balance-detail update paths log stable `answerlattice_ai_accounting_*` codes with bounded scope/action metadata and source error name/code/status only; they do not add Firestore reads/writes or change debit failure behavior.
- Support-search credit admission and settlement reject coercible or fractional `subscriptions` credit fields instead of normalizing them. The idempotent `answerlattice_aiOperations` replay path requires exact safe-integer units plus complete arithmetic-consistent `creditConsumption` before returning the stored balance; invalid evidence produces no second debit or mirror write.
- Support search debits before provider work in the same transaction that creates its protected `reserved` operation and root recovery pointer. Monthly reset and both new/resumed reservations revalidate transaction-current product, workspace, and status before any write or provider admission. Settlement or request failure deletes the pointer; the existing hourly master scheduler bounds stale recovery to 50 pointers per run and restores credits only after exact product/scope/subscription/unit/debit/period validation. A malformed pointer remains for repair and makes the recovery task fail with a fixed bounded code after other pointers are processed, rather than publishing a successful scheduler outcome. This adds no scheduled Function export and needs no composite index.
- Manual draft regeneration and article entity extraction do not call Gemini from the browser and do not write Firestore directly. They run through dedicated Answerlattice API routes, resolve Answerlattice scope, check safe mode, rate limit before permission/body/provider work, and record zero-unit internal usage.
- Token counts are provider-confirmed when Gemini returns usage metadata. Older SDK and embedding paths may write estimated token counts and mark `tokenCountSource='estimated'`.
- Support credit purchase and consumption reconcile through two ledgers: `topups`/`subscriptions.topUpCredits` for purchased credits, and `answerlattice_intakeUsageLedger` plus `answerlattice_aiOperations.unitsConsumed` for consumed credits. Browser verification and signed `order.paid` use the same pending-snapshot + exact-subscription transaction; the first application writes both documents and mirrors the store summary, while replay performs validation reads but no second credit write. Provider token counts are recorded separately and do not debit support credits unless the action has a non-zero unit cost.
- Knowledge Intake media extraction keeps reserve-before-provider and refund-on-failure support-credit accounting. Reserve, finalize, and refund use transactions and require exact ledger/subscription `tId/sId` agreement. Finalize and refund can no longer both win. The reservation stores its billing-period key; an in-period failure restores monthly and top-up debits, while a later-period failure restores only purchased top-up credits and records expired monthly credits instead of inflating the new cycle. Non-intake Answerlattice AI calls log zero-unit internal/public usage unless an explicit support-credit unit cost is assigned.

## Rules And Indexes

Separate Answerlattice Firestore rules allow billing-permission-scoped reads for:

- `stores/{sId}`
- `subscriptions/{subscriptionId}`
- `payment_transactions/{transactionId}`
- `answerlattice_intakeUsageLedger/{ledgerId}` through its existing governed path

Answerlattice browser users do not read `topups`. Payment routes and signed webhooks own top-up verification and settlement.

`answerlattice_aiOperations/{tId}/{sId}/{docId}` direct Firestore reads are platform-only. Owner billing history reads go through `/api/answerlattice/ai-operations`, which validates query shape, resolves tenant/store session scope, rate-limits before permission/read work, applies Answerlattice billing permission checks, uses capped pagination, filters owner-safe fields, and logs read failures with bounded scope/query metadata. The route also validates operation-history query cursors and date filters through `src/lib/ai/operationHistoryQuery.ts`: cursor values must be simple Firestore document IDs, date filters must be strict `YYYY-MM-DD` or browser ISO `...Z` values, and reversed or wider-than-366-day ranges are rejected before Firestore cursor/query work. The browser DAL sends the request with no-store cache, same-origin credentials, and manual redirect handling, caps the route response at 512 KB, and runtime-projects every row plus the exact pagination/cursor relationship before returning usage rows to billing screens; malformed, oversized, rejected, or wrong-shape responses stay on fixed local failure handling with bounded diagnostics.

No broad client writes are allowed for those collections; payment and entitlement mutations remain server/API/webhook owned.

The active-subscription direct-doc read path avoids the old general billing-page composite query. Its capped fallback query includes exact `pId + productId + tenantId + storeId`. Entitlement synchronization intentionally uses a bounded exact-dual-`AL` current-active Admin query so an old or foreign-product subscription cannot clear a concurrently active replacement; `firestore-answerlattice.indexes.json` includes `subscriptions` on `pId + productId + status + storeId + tenantId + cycleEndDate`. Paid billing history uses `payment_transactions` on `pId + productId + event + storeId + tenantId + created_at desc`; the same product-scoped history index exists in the shared MenuList and dedicated Answerlattice index files.

`firestore-answerlattice.rules` and shared `firestore.rules` both require both exact Answerlattice aliases, exact current workspace, and current `canManageBilling` for Answerlattice subscription and transaction reads. Shared payment-ledger rules admit MenuList rows only with both exact `ML` aliases. Focused emulator tests prove that a one-alias query and conflicting aliases are denied before browser disclosure in both configurations.

Lifecycle status changes and grace expiry re-read the subscription inside a transaction before appending history. Upgrade carry-forward reads and writes the old and replacement subscriptions in one transaction and preserves any existing replacement top-up balance. Entitlement sync reads the source subscription plus the bounded active-subscription query and transactionally writes the store summary and subscription audit mirror. These are correctness reads/writes on billing mutations only; no polling, scheduled function, Storage operation, or browser write is added. The dedicated Answerlattice subscription index requires a scoped Firebase index deployment before this query is runtime-certified.

Replacement finalization pre-reads old/new rows, fetches old provider state, then re-reads both in the carry-forward transaction. The first application writes both rows; `carryForwardFromSubscriptionId` makes replay write-free. Existing onboarding compensation remains failure-path-only and does not add a normal-path Firestore operation.

The AI operation history query uses the nested tenant/store path plus `orderBy(createdOn desc)`. Action filters are applied by a bounded scan window to avoid new composite indexes during this pass.

Transactions workspace-settlement hardening adds no Firestore operation, collection, rule, index, Function, Storage, Auth, queue, cache, or scheduler work. It discards obsolete browser completions and hides prior-scope rows immediately while the current workspace read settles.

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-23 | 2.0.2 | Documented operation-count-neutral Transactions workspace/request settlement |
| 2026-07-19 | 2.0.1 | Documented fail-closed active-subscription read presentation and exact persisted record-scope enforcement on server mutations |
| 2026-07-19 | 2.0.0 | Documented exact product query/rule parity, `pId` billing-history indexes, server-only top-up reads, and cost-neutral response/URL/diagnostic hardening |
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
### Exact duplicate-scope aliases (July 22, 2026)

Dedicated and shared billing rules require exact `AL` product aliases plus present, agreeing numeric `tId/tenantId` and `sId/storeId`. Browser subscription and payment-history queries constrain both alias pairs, and dedicated composites include `tId/sId`. Server direct reads and transaction-current payment, webhook, lifecycle and replacement mutations share the same exact product-scope projector; conflicting or incomplete records fail closed rather than being normalized into Answerlattice ownership.

### Create-only subscription producer (July 22, 2026)

Answerlattice initial subscription persistence uses Firestore `create`; it cannot overwrite an existing provider document. Payload composition requires exact `AL` aliases and agreeing numeric workspace aliases, and direct updates re-read exact ownership transactionally. Shared create-subscription pending reuse constrains and reprojects all product/workspace aliases before provider access. The isolated product-subscription emulator runs Answerlattice through supported shared demo mode and proves conflicting creation fails while exact creation remains readable.

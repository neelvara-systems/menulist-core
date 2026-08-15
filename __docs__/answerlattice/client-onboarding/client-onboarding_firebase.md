# Answerlattice Client Onboarding — Firebase Cost

> **Version:** 1.10.0
> **Last Updated:** 2026-08-14
> **Audience:** Developers / Ops

---

## Collections Used (Per Onboarding)

The pre-plan launch preview is a pure browser projection over locally entered product-surface choices and the bundled First Trusted Answer starter definitions. Viewing it adds **zero Firestore reads, writes, listeners, Storage objects, Function calls, AI/provider calls, payment objects, collections, or indexes**. The table below begins only when the founder chooses a paid plan and submits workspace creation.

| Collection | Operation | Count | Purpose |
|------------|-----------|-------|---------|
| `users` | READ/QUERY | 2+ | Direct account check, transaction revalidation, and normalized-email fallback capped at two records so duplicate identity fails closed |
| `platformSummary` | READ | 2+ | Canonical counter plus compatibility/summary reads used by shared allocation |
| `tenants` / `stores` | READ | 2+ | Candidate-ID collision probes and finalization ownership checks |
| `tenants` | WRITE | 1 | Create new tenant, including optional closed-list `selfReportedDiscovery` in the same document write |
| `stores` | WRITE | 1 | Create new store |
| `stores` | WRITE | 1 | Set initial `answerlatticeWidgetApi` key-manager state (`keyHashes`, `keysByHash`, active key metadata, purpose, productId, and widget scopes) |
| `answerlattice_productSurfaces` | WRITE | 3-8 | Seed initial product surfaces selected during onboarding |
| `platformSummary` | WRITE | 3 | Update counters, Answerlattice tenant scheduler registry, and compact context summary |
| `storesSummary` | WRITE | 1 | Store summary used by scheduler/discovery flows |
| `users` | WRITE | 1 | Create/update Answerlattice-project user tenant/store |
| Default auth `users` | READ/WRITE | 2 reads + 1 write | Current-user admission plus transaction-current `productAccounts.AL` bridge; existing MenuList root tenant/store remains unchanged |
| `subscriptions` | WRITE | 1 | Create subscription record |

**Normal successful onboarding is a bounded one-time path, but it is not a two-read path.** Current source performs roughly 11 or more document/query reads and about 13-18 writes before optional transaction retries, email fallback, collision probes, summary/bootstrap helpers, or provider-recovery work. Firestore may retry transactions, so billed reads are not a fixed promise.

The get-started browser client parses onboarding responses through a 16 KB bounded JSON reader and validates the success, plan, billing, subscription, recovery, and widget-key shape before showing completion state. HTTP(S)-only product URL admission and route-wide private/no-store response headers add no Firestore operations; they prevent unsafe stored URLs and cached account/billing responses.

Optional self-reported discovery adds no read, write, collection, index,
listener, scheduler, Storage object, Function, or provider operation. It is an
additive field on the one tenant document already created by the provisioning
transaction. It is not copied to the store, subscription, user bridge, or
platform summary.

Resumable provisioning adds correctness reads only on retries or failures:

- the Answerlattice user read recovers `provisioning` or `payment_pending` state even after the default-auth session already contains `productAccounts.AL`;
- a resumed provisioning attempt reads its scoped store and uses a bounded Razorpay provider search before creating another subscription;
- an indeterminate provider result writes `provider_recovery_pending` across the exact tenant/store/user scope; the transaction reads and writes all three documents and preserves their ownership;
- a known provider ID is preserved before provider fetch, so a transient fetch failure does not rewrite the recovery scope as unknown;
- retries without a known provider ID wait 15 minutes before bounded provider search, so a timeout cannot immediately produce a duplicate provider object;
- a known exact provider checkout in `cancelled`, `completed`, or `expired` state uses the existing compensation transaction so it cannot hold the founder in recovery forever;
- a new attempt after compensation clears stale provider/recovery fields on the reused user document;
- pending subscription, store summary, widget-key state, and tenant/store/user statuses commit in one transaction;
- payment-pending recovery reads the scoped store and returns the existing checkout with no new subscription or widget-key write;
- payment-pending recovery requires the original request fingerprint, transactionally revalidates the current default-auth bridge, and retries missing surface/summary/control-plane bootstrap;
- bootstrap reads the bounded selected surface documents plus compact summary in one transaction, creates only missing rows, and leaves existing owner-edited surface/summary truth unchanged;
- compensation runs only when provider creation is proven not to have occurred or the exact owned provider checkout is confirmed terminal; it reads the exact attempt-owned tenant/store/user and optional subscription, then deactivates only that scope and updates compact summaries.

The shared allocator creates a provisional `storesSummary` row. A recovery-pending scope remains active so it can be resumed, while compensation marks it inactive. Paid AI and Knowledge Intake still require active/trialing subscription entitlement, and the Answerlattice scheduler registry is published only by post-finalization summary work.

## No New Collections

Reuses ALL existing collections. Zero new Firestore collections created.

## Monthly Cost Projections

| New Clients/Month | Approx Reads | Approx Writes | Cost Profile |
|-------------------|--------------|---------------|--------------|
| 10 | 110+ | 130-180 | Small one-time volume; excludes retries |
| 50 | 550+ | 650-900 | Small one-time volume; monitor failures/retries |
| 100 | 1,100+ | 1,300-1,800 | Track transaction retry and provider-recovery rates |
| 500 | 5,500+ | 6,500-9,000 | Review allocator contention and recovery frequency |

## Workspace Profile API

After permission admission, `GET /api/answerlattice/workspace-profile` reads the existing `stores/{sId}` profile document once. Permission admission separately reads the scoped store and, for non-platform users, performs the bounded scoped staff-user lookup.

After the same permission admission, `PUT /api/answerlattice/workspace-profile` transactionally reads the store once for unchanged or stale-revision requests. A changed request also reads and validates the compiled source-version and manifest documents, then commits four writes together: the store profile and launch-profile mirror, one tenant-summary shard entry, the compiled source-version document, and the compiled bundle stale marker. This prevents the UI from acknowledging profile truth while scheduler timing or runtime context remains stale.

The Settings UI sends workspace-profile load/save calls with no-store cache, same-origin credentials, and manual redirect handling, then parses responses through a 64 KB bounded response reader and requires a strict `{ profile, revision }` object before form state or success copy advances. Stale edits receive `409` and reload current values. This browser validation adds no Firestore operations.

No new collection is introduced.

See `__docs__/answerlattice/workspace-profile/workspace-profile_firebase.md` for the maintained profile-save cost boundary.

## Subscription Ownership Shape

Answerlattice onboarding writes subscription records with both compatibility and product-native ownership fields:

- `tenantId` / `storeId`
- `tId` / `sId`
- `pId: 'AL'`
- `productId: 'AL'`

All provisioning tenant/store/user ownership checks, every proposed pending-subscription payload, and every existing `subscriptions/{providerSubscriptionId}` mutation require both product aliases plus agreeing numeric `tId/tenantId` and `sId/storeId` scope. The final write derives all four workspace aliases from the validated provisioning scope; contradictory payloads fail before the transaction, leaving subscription, store summary, widget-key state, and onboarding status unchanged. Conflicting or incomplete legacy rows remain unchanged for investigation; they are never reclaimed or cancelled by onboarding compensation.

The `stores/{sId}.answerlatticeSubscription` summary stores the active provider subscription id. Billing screens use that summary to direct-read `subscriptions/{subscriptionId}` instead of scanning subscriptions by status/date. This keeps the first billing load to one store read plus one subscription read in the normal path.

## KB Import Source Cost

The KB import screen can upload files, pasted docs URLs, and pasted starter answers. URL and starter-answer inputs are converted into bounded `text/plain` source files and uploaded to Answerlattice Storage. This avoids introducing a URL crawler, Firestore staging collection, or repeated backend reads.

Per import job:

- Storage writes: one object per uploaded file/text source
- Firestore writes: one `kb_generation_jobs` document
- Realtime listener: one active-job listener scoped by `tId`, `sId`, active statuses, and `limit(5)`
- Previous job history: manual button read, capped at 20 by default

The import flow must use Answerlattice session scope and `answerlatticeStorage` in separate Firebase mode.

## Razorpay Cost

- Plans: Standard Razorpay subscription creation fee (same provider flow as MenuList)
- Paid onboarding passes `productId: 'AL'` into Razorpay plan lookup and provider notes, so Answerlattice paid plans cannot reuse or collide with MenuList plan lookup keys.
- Paid activation: shared Razorpay verify/webhook routes write to Answerlattice Firebase when `productId: 'AL'` is present in request body or Razorpay notes.
- Support credit packs: one `topups` write on order creation, one transaction update on verification, and one subscription balance update.

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-08-14 | 1.10.0 | Documented the zero-I/O client-only proof step before the unchanged paid provisioning request |
| 2026-08-01 | 1.8.4 | Added current-auth/bridge transaction reads and bounded non-destructive payment-pending bootstrap repair costs |
| 2026-07-28 | 1.8.3 | Documented exact pending-subscription payload admission, canonical four-alias projection, and no-write behavior on scope conflict |
| 2026-07-19 | 1.8.2 | Corrected workspace-profile cost and atomic downstream synchronization after the Feature 29 audit |
| 2026-07-19 | 1.8.1 | Documented duplicate-email read cap, terminal-checkout compensation, known-provider preservation, retry-field cleanup, and zero-read URL/response hardening |
| 2026-07-19 | 1.8.0 | Replaced the obsolete two-read estimate with the shared allocator/finalization cost boundary and documented durable provider-recovery, entitlement, summary, and transaction-retry behavior |
| 2026-07-11 | 1.7.0 | Added retry/recovery/compensation operation notes and the atomic pending-subscription plus widget-key finalization boundary |
| 2026-06-30 | 1.6.2 | Documented that get-started response-boundary hardening is browser-local and adds no Firebase operations |
| 2026-05-21 | 1.6.1 | Documented product-scoped Razorpay plan lookup for paid Answerlattice onboarding |
| 2026-05-21 | 1.6.0 | Added Answerlattice subscription ownership fields and store-summary direct-read billing contract |
| 2026-05-21 | 1.5.0 | Added product-aware Razorpay activation and support credit pack cost notes |
| 2026-05-21 | 1.4.0 | Added KB import source cost notes for URL/starter-answer text sources and Answerlattice storage usage |
| 2026-05-21 | 1.3.0 | Added initial product-surface writes, compact context-summary seed, and workspace-profile API cost notes |
| 2026-05-21 | 1.2.0 | Updated cost model for separate Firebase mode, `productAccounts.AL` bridge, and `answerlatticeWidgetApi` key storage |
| 2026-05-19 | 1.1.0 | Added Answerlattice tenant scheduler registry write for cost-optimized nightly discovery |
| 2026-03-07 | 1.0.0 | Initial cost analysis |

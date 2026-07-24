# SignalDesk Content Distribution Rail - Test Cases

**Status:** Current focused coverage
**Date:** June 24, 2026
**Last Updated:** July 22, 2026

## Functional

| Case | Expected |
| --- | --- |
| Save content source | Creates or updates `signaldeskContentSources` through protected action API. |
| Concurrent exact content-source mutation | Returns one durable source and produces one claim/timeline/audit/cost effect set. |
| Content-source cost delta | Exact replay-safe source mutation reports five writes: source, claim, timeline, audit, and daily cost. |
| Reuse content-source key with changed input | Fails with `CONTENT_SOURCE_IDEMPOTENCY_CONFLICT`. |
| Edit selected source | Hydrates the selected record, submits its explicit ID, and preserves creation/asset-recency fields. |
| Change an existing source type or canonical URL | Fails with `CONTENT_SOURCE_PROVENANCE_IMMUTABLE`. |
| Case-sensitive source URLs | `/Case?Ref=Owner` and `/case?ref=owner` remain distinct identities. |
| Matching legacy source ID | Reuses the existing document rather than creating a v2 duplicate. |
| Malformed, credentialed, or non-HTTP source URL | Fails before persistence; malformed legacy rows are omitted from workspace output. |
| Active source with missing/held/unapproved pod | Fails before source/accounting writes. |
| Clear optional default pod | Explicit `null` persists a cleared pod instead of preserving the old reference. |
| Re-run default seed | Preserves existing source truth and creates no source while content distribution is paused. |
| Create content asset | Writes canonical message, proof level, CTA, source, and status. |
| Concurrent exact content-asset mutation | Returns one durable asset and produces one claim/timeline/audit/cost effect set. |
| Source-backed asset cost delta | New asset reports six writes including source recency; standalone or existing asset reports five. |
| Reuse content-asset key with changed input | Fails with `CONTENT_ASSET_IDEMPOTENCY_CONFLICT`. |
| Missing or inactive selected source | Fails before asset or accounting writes. |
| Selected source type contradicts asset input | Fails with `CONTENT_SOURCE_TYPE_MISMATCH`. |
| Missing/inactive explicit CTA or held/unapproved market pod | Fails before asset or accounting writes. |
| Concurrent exact proof-permission mutation | Returns one durable permission and produces one claim/audit/cost effect set. |
| Proof-permission cost delta | Exact replay-safe permission mutation reports four writes: permission, claim, audit, and daily cost. |
| Reuse proof-permission key with changed input | Fails with `PROOF_PERMISSION_IDEMPOTENCY_CONFLICT`. |
| Missing target or cross-target permission ID | Fails before permission/accounting writes. |
| Verified two-surface activation with active public permission | Selects the target, permission, and usable existing source; prefills review fields and performs no write. |
| Missing activation time, evidence reference, approved integrity, or second distinct surface | Rejects proof preparation before permission/source prefill. |
| Activation proof preparation without permission | Selects the target, shows the permission requirement, and leaves asset creation blocked. |
| Activation proof preparation with unknown/bounded-out target | Shows an unavailable warning and does not select another target. |
| Mobile activation proof preparation | Disabled; Content remains desktop-only. |
| Generate drafts | Creates one draft per selected channel with pending approval. |
| Concurrent exact draft generation | Returns the same channel drafts and produces one claim/queue/timeline/audit/cost effect set. |
| Draft-generation cost delta | Reports five fixed writes plus one per draft, one per revised head, and optional CTA backfill. |
| Reuse generation key with changed channels | Fails with `CONTENT_DRAFT_GENERATION_IDEMPOTENCY_CONFLICT`. |
| Generate drafts from held asset | Fails with `Content asset is not ready`. |
| Approve draft | Moves draft to approved status. |
| Reject draft | Moves draft to rejected status. |
| Concurrent exact review retry | Returns current durable draft truth and produces one review/claim/timeline/audit/cost effect set. |
| Draft-review cost delta | Reports six writes including exact queue settlement. |
| Reuse review key with changed decision | Fails with `CONTENT_REVIEW_IDEMPOTENCY_CONFLICT`. |
| Schedule unapproved draft | Fails with `Content draft must be approved before scheduling`. |
| Schedule approved draft | Creates or updates one calendar item and queues draft. |
| Concurrent exact schedule retry | Returns one durable calendar item and produces one draft/calendar/claim/timeline/audit/cost effect set. |
| Schedule cost delta | Reports six writes exactly once. |
| Reuse schedule key with changed input | Fails with `CONTENT_SCHEDULE_IDEMPOTENCY_CONFLICT`. |
| Record performance with publication evidence | Writes one compact record and atomically marks the approved draft/calendar published and asset distributed. |
| Record non-zero metrics without publication evidence | Fails with `CONTENT_PERFORMANCE_PUBLICATION_EVIDENCE_REQUIRED`. |
| Record publication evidence without draft/calendar | Fails before any performance or publication state write. |
| Record publication evidence for mismatched asset/draft/channel/calendar | Fails closed before any write. |
| Record evidence contradicting an already published calendar item | Fails with `CONTENT_PERFORMANCE_PUBLICATION_MISMATCH`. |
| Record owner signals | Also updates demand signal summary and control-room count. |
| Concurrent exact performance retry | Returns one durable performance record and produces one analytics, demand, audit, control, and cost effect set. |
| Reuse performance key with changed input | Fails with the idempotency conflict and leaves the first observation unchanged. |
| Record two independent owner-signal observations | Preserves both observations and increments the daily demand count by their combined signal count. |
| Record performance for an unrelated draft | Fails with `CONTENT_PERFORMANCE_DRAFT_MISMATCH` before any write. |

## Security

| Case | Expected |
| --- | --- |
| Unauthenticated API call | Blocked by `withAuth()`. |
| Invalid payload | Returns `Invalid input` and logs validation failure. |
| Client Firestore write | Denied by rules. |
| Feature flag disabled | Route and workspace section return not found, advanced link is absent, and all mutations fail closed. |
| Draft-only workspace reader | Receives content lists but no target options used for proof grants. |
| Mobile content action | Rejected; current mobile support is dashboard-only. |
| Content pause active | Mutating content rail actions fail with `Content distribution is paused`. |
| Pause becomes active before content-asset settlement | The transaction rejects the asset before source-recency/accounting effects. |
| Source, proof permission/target, CTA, or market-pod authority changes before asset settlement | Transaction-current authority fails closed without a partial asset. |
| Selected source contradicts asset URL/type/audience/pod | Fails before asset/accounting writes; browser payload derives those fields from the selected source. |
| Pause becomes active before performance settlement | The transaction reads the current pause and rejects the observation without partial effects. |
| Pause becomes active before schedule settlement | The transaction rejects scheduling before draft/calendar/accounting writes. |
| Pause becomes active before review settlement | The transaction rejects review before draft/accounting writes. |
| Pause/proof permission/CTA changes before draft generation | Current transaction state is used; invalid proof or pause fails before writes. |
| Draft approval changes before schedule settlement | Current transaction state fails closed with the existing approval-required error. |

## Verification

```bash
npm run verify:signaldesk
npm run typecheck
SIGNALDESK_E2E_FOCUS=outcome-proof-content npm run test:signaldesk:e2e:local
```

## Authority Reduction And Natural Expiry - July 15, 2026

| Case | Expected |
| --- | --- |
| Naturally expired active permission | Hourly leased task materializes one deterministic expiry token and completes bounded dependency reconciliation. |
| Overlapping scheduler invocations | Exactly one lease owner runs; the other skips. A second successful invocation in the same hour skips. |
| Interrupted reconciliation | Durable cursor/progress resumes without repeating settled counters or effects. |
| Foreign-product permissions before a valid row | `pId == SD` query scoping excludes them; the valid row completes and foreign rows remain unchanged. |
| Permission changes to a foreign product after query selection | Transaction-current failure reporting writes no SignalDesk incident/control/audit/timeline/permission effect. |
| Malformed pending permission or dependency before a valid row | The poison row enters failed/backoff state with one high-severity failure incident; the later valid permission completes. |
| Draft stored-ID/lifecycle or calendar ID/link/publication-pair drift | Fails with a stable `SIGNALDESK_*` code before dependency mutation. |
| Malformed asset publication marker | Fails visibly; the asset is not silently treated as unpublished or held, and later permissions continue. |
| Retryable collision | Retry starts after five minutes, exponential backoff doubles, a resolved failure incident reopens exactly once, and corrected truth completes automatically. |
| Later founder grant after a failed/completed cycle | New expiry gets a new token with retry count zero and no inherited current failure/backoff fields. |
| Published marker plus older draft/calendar evidence | Asset remains distributed and incident retains the newest marker snapshot without mixed stale URL/draft fields. |
| Published draft-only or calendar-only legacy evidence | Published row is preserved; asset is review-marked and one deterministic removal/review incident opens. |
| Resolved removal incident under a later authority token | Same incident ID reopens; total incident count does not increase and open count increases once. |
| Wrong control product or colliding incident shape | Reconciliation fails with durable pending token/progress and no partial review/incident effect; corrected retry completes. |
| App updater encounters `proof-permission-expiry-v1` pending token | Returns `CONTENT_AUTHORITY_RECONCILIATION_PENDING`; scheduler kind/token/progress remain unchanged. |
| Direct CTA published dependency with blank asset `ctaId` | Published draft/calendar and ready asset are preserved and review-marked through the draft CTA link. |
| Scheduler task contains isolated permission failures | Wrapper returns task success with `activity: true`, exposes failed/retried counts, and stores details. |
| Deterministic failure incident has a colliding malformed shape | Diagnostic failure is counted/logged without overwriting the collision, and a later valid permission completes. |
| Scheduler-wide failure after an earlier successful hour | Last completion timestamp/bucket remain intact; separate last-failure fields are recorded and the original lifecycle error is rethrown even if outcome recording fails. |

Focused proof:

```bash
npm run test:signaldesk:proof-permission-lifecycle
GCLOUD_PROJECT=demo-signaldesk-authority firebase emulators:exec --only firestore --project demo-signaldesk-authority --config firebase-signaldesk.json "SIGNALDESK_E2E_FOCUS=authority node scripts/verification/e2e-signaldesk-local.js"
```

The July 15 local runs used an equivalent temporary emulator config on port `8181` because another coordinated SignalDesk E2E owned `8080`; both focused scripts passed and the temporary configs were removed.

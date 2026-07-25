# Internal Ops Control Room And Platform Monitoring — Implementation

**Status:** Implemented; code is the primary source
**Last updated:** July 16, 2026

## Current authorization

### Current-Authorization And Bounded-Monitor Audit

Every privileged monitor/mutation uses a fail-closed per-operator limiter where the operation can expose private platform data or spend recovery/provider work. SAFE_MODE transitions are transactional and idempotent.

```text
signed PLATFORM session
        |
        +-- /ops or /platform layout
        |      -> requirePlatformAdminRouteAccess()
        |      -> getCurrentPlatformUser()
        |
        +-- direct browser monitor refresh
        |      -> /api/platform/current-access
        |      -> fail-closed DATA_READ limiter
        |      -> getCurrentPlatformUser()
        |      -> browser Firestore rules + bounded queries
        |
        +-- server monitor or mutation API
               -> signed role gate
               -> fail-closed limiter
               -> getCurrentPlatformUser()
               -> bounded reads/writes/provider work
```

`src/lib/auth/currentPlatformUser.ts` is the current persisted authority boundary. It requires exact agreement between supplied `session.uId` and `session.user.id`, exact user document identity, matching normalized email, `active`, `isVerified`, exact platform role, valid lifecycle/block state, issued-at evidence and no later session/token/access revocation.

`/api/platform/current-access` exists for direct browser Firestore monitors and MobileShell sub-screens. Root and nested session user-ID aliases must agree before the limiter identity and exact current `users/{userId}` read; contradictory aliases fail closed. `src/lib/auth/currentPlatformAccessClient.ts` caps its response at 4KB and requires `{ authorized: true, accessModel: 'current_persisted_platform_user' }`. `usePlatformStoreSummaryOptions()` runs this check before reading `platformSummary/storesSummary`.

## Control Room snapshot

`src/database/ops/index.ts::getOpsControlRoomSnapshot()` performs one fresh access check and then the existing read-only calls:

- `ops_config/system`: one document read.
- newest `systemAlerts`: one document read for state plus at most ten for the recent list.
- two Firestore aggregation count queries for new stores and recently publishing stores.
- one aggregation count query for stores with a last publish at least 60 days old.

The DAL uses no realtime listener and no write. `maxResults` is clamped to 1–30. Alert rows are projected instead of spread raw; overview title/message become presence/length summaries.

Any source error is logged with bounded `ops_*` diagnostics and rejects the snapshot. Desktop and mobile keep a prior successful snapshot only with an explicit unavailable warning. They never infer SAFE_MODE OFF or “no alerts” from a failed read.

## Emergency controls

### SAFE_MODE toggle

`POST /api/ops/safe-mode` uses a 2KB body, a 10/hour fail-closed operator limit and current authority. A Firestore transaction reads `ops_config/system` and writes only on a real transition. Repeating the current state is a no-write success. A changed transition emits a best-effort durable platform alert; `alertRecorded` exposes secondary alert failure without rolling back the committed state.

SAFE_MODE wording follows the actual boundary: guarded app AI routes and shared Functions Gemini generation/upload stop; provider-file cleanup, public menus, publishing and unrelated maintenance remain available.

### Alert mute

`POST /api/ops/mute-alerts` accepts 1–120 minutes under the same current-authority/fail-closed pattern and stores `alertsMutedUntil`, `alertsMutedAt` and `alertsMutedBy` in `ops_config/system`.

### Force republish

Desktop and mobile force-republish callable results require `success`, a bounded `projectCount` from 1 to 100, a representative project ID and verification state before acknowledgement. The Function rechecks current platform authority and canonical tenant/store/project scope, requests cache and Digital Screen effects, and reports unavailable verification rather than claiming stale output is fixed.

Desktop/mobile snapshots are latest-request-owned and settle only for a mounted current-platform screen. SAFE_MODE, mute and force-republish actions admit synchronously once per surface; force republish captures the confirmed tenant/store. The callable also uses a 90-second exact-owner tenant/store `_system` lease. Lease acquisition transactionally proves the current active tenant, store, user and persisted platform role before its first write; the project transaction rechecks that authority before project writes. This rejects cross-tab/device concurrency while allowing intentional later recovery and stale-lease takeover.

The shared platform store selector is also session-bound. Storeless platform sessions receive an exact user provider key, role/user transitions mask and reset cached options, and each mounted selector must pass `/api/platform/current-access` before exposing even an already loaded summary. A cached summary avoids another Firestore read but never the current persisted-role check. Pending access/summary work settles only for the latest mounted, enabled, same-platform-user request.

Source gate: `npm run verify:ops-control-room-boundary` locks the platform-only SAFE_MODE and alert-mute routes, fresh/latest browser admission, bounded snapshot failure behavior, action ownership, force-republish acknowledgement/server lease, desktop/mobile parity and docs. It runs a local Firestore emulator for lease concurrency, partitioning, expiry and revoked-role no-write behavior. It does not invoke a deployed callable, provider, browser, Firebase deploy, or Vercel deploy.

## Scheduler Monitor

`src/database/ops/scheduler.ts` clamps history to 30 and settlement rows to 100. The unfiltered dashboard reuses one run query for the table and health calculation; filtered history adds one capped health query. Invalid document IDs, run status/trigger, timestamp or settlement rows are omitted. Text/control fields, task/error arrays and detail maps are bounded before rendering.

Manual recovery invokes `triggerStoreNightlyScheduler({ tId, sId })`. `src/lib/ops/schedulerRecoveryResponse.ts` requires a valid Firestore run-log ID, exact `success|partial|failed` status agreement, exactly one store and bounded safe-integer counts. Raw callable output cannot generate success copy. A validated `partial` response is warning copy; a validated `failed` response is error copy. Error-detail run-log IDs are normalized before display/logging.

Scheduled and manual store-nightly execution share one tenant/store `_system/storeNightlyScheduler_{tId}_{sId}` lease. The transaction blocks another current owner, permits stale-lease recovery after ten minutes, and requires the exact owner token to finalize. This prevents concurrent hourly/manual runs or duplicate platform actions from repeating analytics, Business Health, Decision Blocks, Menu Intelligence, provider, cache, and project effects. Desktop and mobile also admit one recovery dialog/action synchronously, capture its store, suppress obsolete settlement, and use latest-request ownership for monitor filters/refresh.

Source gate: `npm run verify:scheduler-monitor-boundary` locks the read-only scheduler DAL, bounded desktop/mobile scheduler detail rendering, store-scoped `triggerStoreNightlyScheduler` manual recovery, shared store scheduler lease, per-store acquisition timing, MobileShell route mapping and docs. Its Firestore emulator proves concurrent exclusion, exact scope separation, intentional later rerun, stale-lease recovery, and stale-owner finalization refusal.

## Extraction Monitor

`getExtractionDashboardSnapshot()` performs current access admission, one capped recent-job read (150) and one capped cost read (100). It reuses job rows for health, quality and list output. Failed reads reject rather than returning an empty/zero snapshot. Desktop SWR and mobile manual refresh label unavailable/previous data.

Job details validate the job ID before one direct read and normalize file, result, timing, transaction and error fields. Failed-job retry remains `POST /api/ops/extraction/jobs/{jobId}/retry`, with fail-closed limiter, current user, SAFE_MODE, original job/project/Storage ownership and active-job transaction admission.

## Server monitor APIs

The following now all re-prove current persisted platform authority before private reads or writes:

- `/api/ops/messaging-onboarding`
- `/api/ops/platform-notifications`
- `/api/ops/owner-notifications`
- `/api/platform/founder-monitor`
- `/api/platform/cost-posture`
- `/api/platform/owner-business-assistant/monitor`
- `/api/platform/answerlattice-intake` GET/POST
- `/api/platform/entity-blocks`

Their privileged read/mutation limiters fail closed on provider outage. Messaging onboarding now reports `accessModel: current_persisted_platform_user`; its persisted health/event/session/alert rows continue through `messagingOnboardingOpsBoundary.ts` rather than raw forwarding.

Notification monitors retain the existing bounded recent-window counts, DTO projection, action IDs, idempotent acknowledge/manual-handoff/retry boundaries and provider separation.

`/ops/platform-notifications` keeps its manual refresh model, bounded action body, simple Firestore document ID admission and hashed per-operator action limiter. Actions update only existing alert documents after current persisted platform authorization. Rows and counts come from one bounded, newest-first window. Rejected, oversized, malformed, or invalid responses use fixed platform failure copy. Source gate: `npm run verify:platform-notifications-boundary`; it does not run Firestore reads/writes, provider calls, browser smoke, Firebase deploy, or Vercel deploy.

Entity block mutations revalidate tenant/store/user state transactionally, preserve Firebase Auth reconciliation, and keep the existing public cache/screen and Business Health invalidation contracts.

## Retention

Scheduler run writers already set 90-day `expiresAt`, and the consolidated scheduler cleans expired plus eligible legacy run logs. Item 29 adds `SYSTEM_ALERT_RETENTION_DAYS: 90` and one `system_alert_retention_cleanup` task to `menulistMaintenanceScheduler` at 06:15 UTC. The leased daily task deletes at most 100 alerts whose `timestamp` is older than the cutoff. It adds no scheduler export, collection, index or listener.

## Deployment boundary

The app/current-access, UI, DAL and server API changes require the normal approved Vercel/app release; none was run. The Function retention task requires `functions:menulistMaintenanceScheduler`. The July 16 QA attempt ran predeploy lint/build successfully, then Cloud Resource Manager returned HTTP 403 `The caller does not have permission` before upload. No QA Function revision changed.

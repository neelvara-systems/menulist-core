# Internal Ops Control Room And Platform Monitoring

**Status:** Item 29 locally source complete; deployment/browser evidence pending
**Last updated:** July 28, 2026
**Audience:** MenuList platform operators and maintainers
**Public/owner surface:** None

This feature is the internal operating layer for MenuList. It combines the lean Control Room with linked scheduler, extraction, messaging, notification, Founder, cost, Business Health, Answerlattice-intake and entity-block surfaces. It is not a single claim of whole-platform health and it does not replace Firebase, provider or production-host evidence.

## Runtime map

| Area | Desktop route | MobileShell | Authority/data boundary |
| --- | --- | --- | --- |
| Control Room | `/ops`, `/platform/ops-control-room` | `opsControlRoom` | Fresh persisted platform check, then bounded browser reads |
| Scheduler | `/ops/scheduler`, `/platform/scheduler-monitor` | `schedulerMonitor` | Fresh check, capped run/settlement reads, current-authority callable |
| Extraction | `/ops/extraction`, `/platform/extraction-monitor` | `extractionMonitor` | Flag + fresh check + capped job/cost reads; retry is server-authorized |
| Messaging onboarding | `/ops/messaging-onboarding` | internal wrapper | Server Admin reads after fail-closed limit and fresh check |
| Platform notifications | `/ops/platform-notifications` | internal wrapper | Bounded recent window; acknowledge/manual handoff is server-authorized |
| Owner notifications | `/ops/owner-notifications` | internal wrapper | Product-scoped recent window and bounded recovery actions |
| Founder Monitor | `/platform/founder-monitor` | internal wrapper | Precomputed summaries and capped movement ledger |
| Cost Posture | `/platform/cost-posture` | internal wrapper | Bounded known-cost sources; Cloud Billing export remains required |
| Business Health monitor | `/platform/owner-business-assistant` | internal wrapper | Bounded server monitor API |
| Answerlattice intake | `/platform/answerlattice-intake` | internal wrapper | Separate Answerlattice Admin client, bounded selected-workspace reads |
| Entity Blocks | `/platform/entity-blocks` | `entityBlocks` | Fail-closed mutation limit, current authority, transactional scope checks |

## Current authorization contract

Signed `platformRole === 'PLATFORM'` is necessary but not sufficient.

- `/ops` and `/platform` layouts call `requirePlatformAdminRouteAccess()`, which now re-reads the exact current `users/{uId}` record.
- Browser Firestore monitors call `/api/platform/current-access` immediately before bounded cross-tenant reads. This also protects MobileShell sub-screens mounted under `/dashboard`.
- Server monitor and mutation APIs use a fail-closed HMAC-keyed limiter where expensive/private work follows, then re-read `getCurrentPlatformUser()`.
- Current identity, email, active/verified state, platform role, blocking/deletion/auth-disable state, auth issuance and revocation must all pass.
- Firebase rules remain the independent browser-data boundary. Current access checks do not weaken rules or replace token revocation.

## Truthful failure behavior

Control Room, Scheduler and Extraction snapshots reject when a source cannot be read. Desktop and mobile show an unavailable/stale warning; they do not convert a permission/index/network failure into SAFE_MODE OFF, zero failures, no alerts or a healthy pipeline.

Scheduler monitor filters and refreshes are latest-request-owned on desktop and mobile. Manual recovery is additionally protected by one synchronous action guard per mounted surface and the server's tenant/store lease shared with the hourly scheduler. Recovery callable responses require a valid status/count/run-log envelope; duplicate current work is rejected before scheduler side effects.

Stored Control Room alert text is projected as presence/length summaries. Scheduler run and settlement rows are normalized, bounded and control-character-cleaned before rendering. Recovery callable responses require a valid status/count/run-log envelope; `partial` is warning copy and `failed` is error copy.

The scheduler task projector includes every current nightly and maintenance task name, so maintenance activity/failures are not silently removed from the latest-run breakdown. Maintenance run status is `failed` when every attempted task failed and `partial` only when attempted work has mixed outcomes. “Runs (7d)” comes from one exact bounded count aggregation rather than the ten-row health sample.

## SAFE_MODE scope

SAFE_MODE stops guarded app AI routes and shared Functions Gemini generation/upload paths. Provider-file cleanup stays available. Public menus, publishing, unrelated Firestore work and non-AI maintenance continue. A config-read failure remains fail-open by design and is logged; SAFE_MODE is not a global maintenance lock.

## Cost and retention

- No realtime listener is used by these monitors.
- Core browser snapshots are fetch-on-open/manual refresh and capped.
- Notification windows and details are capped; counts describe the same bounded window.
- Founder and Cost Posture use precomputed/known sources rather than scanning every tenant/store subcollection.
- Scheduler run logs retain their existing 90-day boundary.
- `systemAlerts` now has one daily, leased 90-day cleanup task inside `menulistMaintenanceScheduler`, capped at 100 deletes per run. No new scheduler, collection or index was added.

## Verification

```bash
npm run verify:ops-control-room-boundary
npm run verify:ops-current-authorization-boundary
npm run verify:scheduler-monitor-boundary
npm run verify:messaging-onboarding-monitor-boundary
npm run verify:platform-cost-posture-boundary
npm run verify:platform-founder-monitor-boundary
npm run verify:platform-entity-blocks-boundary
npm run test:internal-ops-runtime-boundaries
npx tsc --noEmit --pretty false
npm --prefix functions run build
```

The scoped QA deployment for `functions:menulistMaintenanceScheduler` passed predeploy lint/build on July 16, 2026, then stopped before upload at Cloud Resource Manager HTTP 403: `The caller does not have permission`. The exact retry is owner/IAM-pending. Vercel/app release, authenticated platform desktop/MobileShell smoke, live Upstash/provider/Telegram/Email/WhatsApp evidence and production-host evidence remain pending.

## Maintained docs

- [Specification](./ops-control-room_spec.md)
- [Implementation](./ops-control-room_impl.md)
- [Firebase and cost](./ops-control-room_firebase.md)
- [Mobile support](./ops-control-room_mobile-support.md)
- [Operator help](./ops-control-room_helpdoc.md)
- [Internal positioning](./ops-control-room_marketing.md)
- [Website boundary](./ops-control-room_website.md)

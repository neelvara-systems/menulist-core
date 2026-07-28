# Internal Ops Control Room And Platform Monitoring — Specification

**Status:** Implemented; local source complete for audit item 29
**Last updated:** July 16, 2026

## Purpose

Give the founder/operator a small, truthful recovery and observability surface without creating an owner-facing analytics product, realtime control plane or second monitoring datastore.

## Required flows

1. A current platform operator opens an internal route. Server layout admission rechecks persisted authority.
2. Direct browser monitors recheck current authority immediately before bounded Firestore reads.
3. A monitor either presents a verified snapshot, a clearly labelled previous snapshot, or unavailable state. Read failure must never appear as healthy zero state.
4. SAFE_MODE and alert-mute actions are bounded, fail-closed on limiter outage, current-authorized and acknowledged before success copy.
5. Scheduler recovery selects a canonical store summary row, invokes the existing store-level nightly callable, validates its response and refreshes the monitor.
6. Extraction retry revalidates the original failed job, project and Storage ownership on the server before an active-job claim.
7. Notification and messaging monitors read only capped recent windows and expose only bounded operational DTOs.
8. Entity block mutations revalidate tenant/store/user state transactionally and report post-commit effects separately.
9. Operational history has explicit retention: scheduler runs and system alerts are kept for 90 days rather than forever.

## Access requirements

- Product: MenuList platform operator only.
- Signed role claim: exact `PLATFORM`.
- Persisted authority: exact current user document identity/email/role/lifecycle/revocation.
- Browser data: Firestore rules plus fresh current-access admission.
- High-risk mutation/provider work: server or callable current-authority check.
- No SMB owner, customer, public website or sibling-product tenant access.

## Functional surfaces

### Control Room

Shows SAFE_MODE, alert mute state, bounded recent alert presence, new stores, recently publishing stores and 60-day publish inactivity. It also links the specialized monitors and exposes SAFE_MODE, mute and force-republish controls.

It does not compute the historical placeholder metrics `publishedToday`, `feedbackToday`, `noProject` or `unpublished48h`. They are absent from the active DTO and owner surfaces rather than represented as false zero measurements.

### Scheduler Monitor

Shows capped recent run logs, health derived from the latest ten valid runs and at most 100 nightly settlement rows. Manual recovery runs analytics settlement, Decision Blocks, Menu Intelligence and current store-nightly work for one selected store. It is not a generic scheduler replay console.

### Extraction Monitor

Shows the latest 150 job rows and up to 100 current-day extraction operation rows per snapshot. Desktop supports bounded inspection and platform-only failed-job retry; mobile is summary/recovery awareness only.

### Notification and messaging monitors

Platform alerts, owner notifications and messaging onboarding use server Admin APIs because their data is server-only or recovery-sensitive. Counts describe bounded recent windows, not lifetime totals.

### Founder, cost and specialist monitors

Founder, Cost Posture, Business Health and Answerlattice intake are read-only manual-refresh views. They use precomputed summaries or capped source reads. Cost Posture must keep the Cloud Billing export gap explicit.

### Entity blocks

Tenant/store/user block controls are platform recovery tools. They preserve current transaction, Firebase Auth reconciliation, public cache/screen and Business Health invalidation contracts.

## Non-functional requirements

- No realtime listeners.
- Every list/query has a hard cap.
- No raw provider/callable error in browser copy.
- No false healthy/zero state on read failure.
- No raw signed URLs, secrets, recipient data or unbounded stored metadata in overview diagnostics.
- Current authorization before private/expensive work.
- Fail-closed rate limiting for privileged mutations and bounded platform monitor APIs.
- Desktop and MobileShell parity for admitted platform recovery flows.
- One consolidated maintenance scheduler owns retention.

## Non-goals

- No public status page.
- No automatic incident remediation engine.
- No whole Firebase bill forecast without Cloud Billing export.
- No new ops event warehouse, baseline collection, realtime listener or standalone scheduler.
- No owner settings or notifications for internal platform controls.

## Completion boundary

Local source completion requires focused verifiers/tests, exact TypeScript, focused lint, Functions build/lint/preflight, docs links and diff integrity. It does not certify deployed IAM, Upstash, Firebase target data, provider delivery, browser/device UI or production hosts.

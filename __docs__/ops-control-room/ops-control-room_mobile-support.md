# Internal Ops Monitoring — Mobile Support

**Status:** Implemented as a platform-only MobileShell layer
**Last updated:** July 16, 2026

This is not an SMB-owner mobile feature. It appears only in the internal Platform section and inherits the normal MobileShell providers/navigation.

## Current mobile contract

- Ops Control Room, Scheduler Monitor and Extraction Monitor use dedicated touch-sized mobile screens.
- Founder, Cost Posture, Business Health, Messaging Onboarding, Owner Notifications, Platform Notifications and Answerlattice Intake use the shared platform internal wrapper where configured.
- Entity Blocks has its existing platform-only mobile entry.
- The signed `platformRole === 'PLATFORM'` check controls visibility, while each direct browser snapshot calls the fresh `/api/platform/current-access` boundary before cross-tenant Firestore reads.
- `usePlatformStoreSummaryOptions()` uses the same current access check before store options are loaded.
- Storeless platform sessions have exact user provider keys. A user/role transition masks and resets shared store options, while every mounted selector re-proves current access before cached options are exposed.

## Failure and mutation parity

- Failed current-access or data reads render unavailable/previous-snapshot warnings; missing data is not shown as zero health.
- SAFE_MODE confirmation describes guarded AI generation/upload scope, not a global platform lock.
- SAFE_MODE and alert-mute actions use the shared 16KB acknowledgement readers.
- Force republish keeps the shared response guard, captures the confirmed tenant/store and uses the callable's exact-scope server lease for cross-client concurrency authority.
- Scheduler recovery uses the shared validated callable response and normalized run-log ID.
- Mobile extraction remains summary-only; desktop owns deep raw inspection and retry.

Source gate: `npm run verify:ops-control-room-boundary` locks the mobile platform-only screen, latest snapshot ownership, synchronous SAFE_MODE/mute/republish admission, captured force-republish scope, current snapshot admission, failure warning, server lease and MobileShell route mapping. Its local Firestore emulator covers concurrent exclusion, scope partitioning, stale recovery and revoked-role no-write behavior.

Source gate: `npm run verify:scheduler-monitor-boundary` locks the mobile scheduler monitor, store-scoped manual recovery, bounded response/detail rendering, shared store-summary selector and MobileShell route mapping.

Scheduler refresh settlement is latest-request-owned. A retired load cannot replace newer health/run/settlement state or emit feedback after platform admission is lost or the screen unmounts. Recovery captures one selected store before confirmation, blocks duplicate dialogs/actions synchronously, and suppresses obsolete success/error/loading effects; the shared server lease remains the cross-tab and scheduled/manual concurrency authority.

Ops Control Room refresh uses the same latest-mounted-current-platform settlement rule. SAFE_MODE, alert mute and force republish admit one action synchronously before a dialog or request can be duplicated. Role loss/unmount suppresses retired success/error/loading effects, and force republish uses its captured store rather than a later selection.

Local gates do not certify a real revoked-session transition, physical device, offline/reconnect behavior, target Firebase rules, deployed callable, provider delivery or production host. Those remain pending.

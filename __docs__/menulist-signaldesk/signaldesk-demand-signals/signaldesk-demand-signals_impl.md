# SignalDesk Demand Signals - Implementation

**Status:** Implemented internal runtime
**Created:** June 23, 2026
**Runtime reconciled:** July 28, 2026

## Runtime Modules

```txt
src/app/api/signaldesk/actions/route.ts
src/lib/signaldesk/workflowServer.ts
src/lib/signaldesk/demandSignalContracts.ts
src/lib/signaldesk/workspaceContracts.ts
src/components/signaldesk/SignalDeskWorkspace.tsx
```

## Operator Capture

```txt
desktop Attribution form
  -> target.review + feature/mobile/rate-limit/schema admission
  -> actor/key request fingerprint
  -> transaction reads claim and optional target
  -> replay proves strict claim + event + immutable event-day summary
  -> new capture validates strict target and deterministic summary authority
  -> create event + exact summary + claim + audit + control + cost
  -> workspace reads only strict bounded summaries
```

The browser retains one operation key for an unchanged retry. The server ignores caller target labels for target-scoped demand and rejects free-text labels for general demand. Summary identity is `day + signalType + sourceSurface + target/general`; its count is exact-replaced from validated current truth rather than increment-merged into an unknown document.

## Other Producers

| Producer | Demand behavior |
| --- | --- |
| Content performance | Owner-quality outcomes may add a general `referral/manual` summary and control count inside the content transaction. |
| Trust partner metrics | Owner leads, current-list submissions, and activations may add a general `referral/manual` summary and control count inside the partner transaction. |

Both producers write null target identity and skip all demand writes when `ENABLE_MENULIST_SIGNALDESK_DEMAND_SIGNALS` is false. They do not create raw demand events because their own immutable metric records are the evidence authority.

## Read Model

Dashboard/common and Attribution desktop workspaces read up to 30 strict summaries through the bounded generic projector. Malformed recent rows are skipped with bounded diagnostics and fill-through. No client method reads `signaldeskDemandSignals`.

## Failure Handling

| Failure | Result |
| --- | --- |
| Feature disabled or mobile request | Reject before demand persistence. |
| Missing permission | Reject through shared access guard. |
| Target missing, foreign, or malformed | Reject before writes. |
| Free-text target name without target ID | Reject before Firestore work. |
| Existing summary malformed or wrong lineage | Reject the full transaction. |
| Replay claim/event/summary missing or malformed | Fail closed; do not acknowledge duplicate. |
| Timestamp accessor throws, changes, is non-finite, or is outside the JavaScript date range | Normalize to the exact persisted-contract error before summary identity or transaction effects. |
| Same key with changed type/surface/target | Idempotency conflict. |
| Suppressed target | Record compact demand; preserve suppression and all contact blocks. |

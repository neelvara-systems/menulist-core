# Canonica Scheduler Architecture Implementation

## Files

- `functions-canonica/src/index.ts` keeps the deployed `canonicaNightly` and `triggerCanonicaNightly` exports.
- `functions-canonica/src/canonica/canonicaMasterScheduler.ts` owns the scheduler task registry, task lease, tenant-date locks, and scheduler state.
- `functions-canonica/src/canonica/canonicaNightly.ts` owns the governance batch and accepts a pre-filtered `tenantScope`.
- `functions-canonica/src/canonica/schedulerTime.ts` mirrors the MenuList runtime-timezone settlement pattern for Canonica.
- `functions-canonica/src/canonica/tenantSummary.ts` stores scheduler metadata in `platformSummary/canonicaTenantsSummary`.
- `src/app/api/canonica/workspace-profile/route.ts` persists timezone/EOD settings behind Canonica management scope, returns no-store owner responses, and syncs the scheduler registry.
- `src/app/api/canonica/operations/status/route.ts` exposes owner-safe scheduler status from one store doc, two platformSummary docs, and five capped run logs.
- `src/components/templates/canonica/CanonicaSettings.tsx` lets owners set workspace timezone and support-day end time.
- `src/components/templates/canonica/activation/CanonicaOperationsPanel.tsx` shows Daily Governance status inside Activation without giving owners manual scheduler controls.

## Runtime Flow

```text
Cloud Scheduler -> canonicaNightly export
  -> runCanonicaMasterScheduler()
  -> governance_nightly task lease
  -> read platformSummary/canonicaTenantsSummary
  -> filter tenants by local EOD settlement window
  -> acquire per-tenant/date lock
  -> runCanonicaNightly({ tenantScope })
  -> mark tenant/date completed or failed
```

## Owner Status Flow

```text
Activation Command Center
  -> GET /api/canonica/operations/status
  -> read store/{sId}
  -> read platformSummary/canonicaSchedulerState
  -> read platformSummary/canonicaNightlyState_{tId}_{sId}
  -> read five capped canonica_schedulerRunLogs
  -> return workspace-scoped Daily Governance status
```

The owner panel never triggers `triggerCanonicaNightly`. Manual scheduler execution remains an ops recovery path protected by the existing secret. Owners can adjust timezone/EOD in Settings and can rebuild compiled context through the existing bundle rebuild action.

## Compatibility

The deployed export names are unchanged. This avoids creating a second scheduled function and avoids a destructive function rename during rollout.

## MCP Maintainability

MCP is split into:

- `src/app/api/canonica/mcp/route.ts` for JSON-RPC/auth/rate-limit shell.
- `src/app/api/canonica/mcp/session/route.ts` for API-key-to-session exchange.
- `src/lib/canonica/mcpSession.ts` for signed session tokens.
- `src/lib/canonica/mcpTools.ts` for tool registration and compiled-bundle tool handlers.

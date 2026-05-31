# Answerlattice Scheduler Architecture Implementation

## Files

- `functions-answerlattice/src/index.ts` keeps the deployed `answerlatticeNightly` and `triggerAnswerlatticeNightly` exports.
- `functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts` owns the scheduler task registry, task lease, tenant-date locks, and scheduler state.
- `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` owns the governance batch and accepts a pre-filtered `tenantScope`.
- `functions-answerlattice/src/answerlattice/schedulerTime.ts` mirrors the MenuList runtime-timezone settlement pattern for Answerlattice.
- `functions-answerlattice/src/answerlattice/tenantSummary.ts` stores scheduler metadata in `platformSummary/answerlatticeTenantsSummary`.
- `src/app/api/answerlattice/workspace-profile/route.ts` persists timezone/EOD settings behind Answerlattice management scope, returns no-store owner responses, and syncs the scheduler registry.
- `src/app/api/answerlattice/operations/status/route.ts` exposes owner-safe scheduler status from one store doc, two platformSummary docs, and five capped run logs.
- `src/components/templates/answerlattice/AnswerlatticeSettings.tsx` lets owners set workspace timezone and support-day end time.
- `src/components/templates/answerlattice/activation/AnswerlatticeOperationsPanel.tsx` shows Daily Governance status inside Activation without giving owners manual scheduler controls.

## Runtime Flow

```text
Cloud Scheduler -> answerlatticeNightly export
  -> runAnswerlatticeMasterScheduler()
  -> governance_nightly task lease
  -> read platformSummary/answerlatticeTenantsSummary
  -> filter tenants by local EOD settlement window
  -> acquire per-tenant/date lock
  -> runAnswerlatticeNightly({ tenantScope })
  -> mark tenant/date completed or failed
```

## Owner Status Flow

```text
Activation Command Center
  -> GET /api/answerlattice/operations/status
  -> read store/{sId}
  -> read platformSummary/answerlatticeSchedulerState
  -> read platformSummary/answerlatticeNightlyState_{tId}_{sId}
  -> read five capped answerlattice_schedulerRunLogs
  -> return workspace-scoped Daily Governance status
```

The owner panel never triggers `triggerAnswerlatticeNightly`. Manual scheduler execution remains an ops recovery path protected by the existing secret. Owners can adjust timezone/EOD in Settings and can rebuild compiled context through the existing bundle rebuild action.

## Compatibility

The deployed export names are unchanged. This avoids creating a second scheduled function and avoids a destructive function rename during rollout.

## MCP Maintainability

MCP is split into:

- `src/app/api/answerlattice/mcp/route.ts` for JSON-RPC/auth/rate-limit shell.
- `src/app/api/answerlattice/mcp/session/route.ts` for API-key-to-session exchange.
- `src/lib/answerlattice/mcpSession.ts` for signed session tokens.
- `src/lib/answerlattice/mcpTools.ts` for tool registration and compiled-bundle tool handlers.

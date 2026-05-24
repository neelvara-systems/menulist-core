# Canonica Scheduler Architecture Implementation

## Files

- `functions-canonica/src/index.ts` keeps the deployed `canonicaNightly` and `triggerCanonicaNightly` exports.
- `functions-canonica/src/canonica/canonicaMasterScheduler.ts` owns the scheduler task registry, task lease, tenant-date locks, and scheduler state.
- `functions-canonica/src/canonica/canonicaNightly.ts` owns the governance batch and accepts a pre-filtered `tenantScope`.
- `functions-canonica/src/canonica/schedulerTime.ts` mirrors the MenuList runtime-timezone settlement pattern for Canonica.
- `functions-canonica/src/canonica/tenantSummary.ts` stores scheduler metadata in `platformSummary/canonicaTenantsSummary`.
- `src/app/api/canonica/workspace-profile/route.ts` persists timezone/EOD settings and syncs the scheduler registry.
- `src/components/templates/canonica/CanonicaSettings.tsx` lets owners set workspace timezone and support-day end time.

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

## Compatibility

The deployed export names are unchanged. This avoids creating a second scheduled function and avoids a destructive function rename during rollout.

## MCP Maintainability

MCP is split into:

- `src/app/api/canonica/mcp/route.ts` for JSON-RPC/auth/rate-limit shell.
- `src/app/api/canonica/mcp/session/route.ts` for API-key-to-session exchange.
- `src/lib/canonica/mcpSession.ts` for signed session tokens.
- `src/lib/canonica/mcpTools.ts` for tool registration and compiled-bundle tool handlers.


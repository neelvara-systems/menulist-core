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

Manual trigger diagnostics use bounded request/scope metadata. Unauthorized requests log a stable `answerlattice_manual_scheduler_unauthorized` code with request IP presence/length metadata only. Invalid scoped retry payloads return the fixed `ANSWERLATTICE_MANUAL_SCOPE_INVALID` response code instead of raw local exception text. Valid scoped retry logs keep tenant/store scope booleans rather than raw `tId/sId` values.

Master scheduler task diagnostics use fixed failure codes and bounded source metadata. `runAnswerlatticeMasterScheduler()` still writes task outcomes to `platformSummary/answerlatticeSchedulerState`, but failed task summaries and `lastError` now use `ANSWERLATTICE_MASTER_SCHEDULER_TASK_FAILED`; source error name/code/status are persisted separately, and task/lease failure logs use fixed codes instead of raw exception text.

Governance batch diagnostics use fixed scheduler failure codes and bounded metadata. `runAnswerlatticeNightly()` still writes the structured run log and per-tenant task diagnostics, but diagnostic `error` values are fixed local codes, human `errorMessages` use `scoped`/`global` instead of raw tenant/store IDs, logger payloads use source error name/code/status plus scope booleans, and workflow summary event payloads carry bounded diagnostic strings instead of raw diagnostic objects.

Workflow integration adapter checks are part of those governance diagnostics. If Step 13 cannot read a tenant's integration config, the tenant workflow integration task is recorded as failed with `ANSWERLATTICE_INTEGRATION_ADAPTER_CHECK_FAILED`; the scheduler run continues, and a legitimate disabled/no-config adapter remains a skipped task.

AI provider health diagnostics use fixed codes. `functions-answerlattice/src/answerlattice/aiProviderHealth.ts` still runs the daily Gemini smoke check and writes `platformSummary/answerlatticeAiProviderHealth`, but failed checks store `ANSWERLATTICE_AI_PROVIDER_HEALTH_CHECK_FAILED` or `ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE` plus source error name/code/status metadata. The thrown scheduler error is the same fixed code, not provider/runtime exception text.

## Compatibility

The deployed export names are unchanged. This avoids creating a second scheduled function and avoids a destructive function rename during rollout.

## MCP Maintainability

MCP is split into:

- `src/app/api/answerlattice/mcp/route.ts` for JSON-RPC/auth/rate-limit shell.
- `src/app/api/answerlattice/mcp/session/route.ts` for API-key-to-session exchange.
- `src/lib/answerlattice/mcpSession.ts` for signed session tokens.
- `src/lib/answerlattice/mcpTools.ts` for tool registration and compiled-bundle tool handlers.

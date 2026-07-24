# Answerlattice Scheduler Architecture Implementation

## Files

- `functions-answerlattice/src/index.ts` keeps the deployed `answerlatticeNightly` and `triggerAnswerlatticeNightly` exports.
- `functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts` owns the scheduler task registry, task lease, tenant-date locks, and scheduler state.
- `functions-answerlattice/src/answerlattice/answerlatticeNightly.ts` owns the governance batch and accepts a pre-filtered `tenantScope`.
- `functions-answerlattice/src/answerlattice/schedulerReadTelemetry.ts` owns bounded, failure-safe logical source-window observations for the governance batch.
- `functions-answerlattice/src/answerlattice/schedulerTime.ts` mirrors the MenuList runtime-timezone settlement pattern for Answerlattice.
- `functions-answerlattice/src/answerlattice/tenantSummary.ts` reads the legacy `platformSummary/answerlatticeTenantsSummary` document and up to 64 deterministic `answerlatticeTenantsSummaryShard_*` documents. New writes use shards; the root is read-only migration input.
- `src/app/api/answerlattice/workspace-profile/route.ts` validates revisioned timezone/EOD settings behind Answerlattice management scope and returns private no-store owner responses.
- `src/lib/answerlattice/workspaceProfileServer.ts` commits the store profile, scheduler registry, compiled source version, and stale bundle marker in one transaction.
- `src/app/api/answerlattice/operations/status/route.ts` exposes owner-safe scheduler status from one store doc, two platformSummary docs, and five capped run logs.
- `src/components/templates/answerlattice/AnswerlatticeSettings.tsx` lets owners set workspace timezone and support-day end time.
- `src/components/templates/answerlattice/activation/AnswerlatticeOperationsPanel.tsx` shows Daily Governance status inside Activation without giving owners manual scheduler controls.

## Runtime Flow

```text
Cloud Scheduler -> answerlatticeNightly export
  -> runAnswerlatticeMasterScheduler()
  -> governance_nightly task lease
  -> merge legacy answerlatticeTenantsSummary + populated registry shards
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

Governance tasks also share one source-window observer per tenant task run. The observer records compact tuples containing source, semantic window, operation count, documents returned, configured limit, and saturation. Duplicate source/window tuples aggregate, malformed observations are ignored, and each task persists at most eight unique windows in the existing run-log write on success or failure. The platform intake monitor returns at most 80 windows for the selected run. This is logical source-operation telemetry for finding repeated work; it is not a Firebase bill estimate and does not include index-entry charges, transaction retries, uninstrumented direct-document reads, provider calls, or cache effects.

Query reuse remains evidence-gated. Collect at least 14 complete daily observations across representative active tenants, then consolidate only when source, filters, ordering, limits, freshness, completeness, and failure-isolation behavior are identical. Saturated windows, task failures, or negligible expected reduction block consolidation.

Workflow integration adapter checks are part of those governance diagnostics. If Step 13 cannot read a tenant's integration config, the tenant workflow integration task is recorded as failed with `ANSWERLATTICE_INTEGRATION_ADAPTER_CHECK_FAILED`; the scheduler run continues, and a legitimate disabled/no-config adapter remains a skipped task.

Tenant-summary selection is an exact persisted contract. The legacy root is merged first and shard entries override it, including inactive compensation tombstones. Each resulting `tenants.{tId}_{sId}` entry must have `pId='AL'`, a map key that matches its embedded tenant/store identity, `active: true`, `hasEntities: true`, and positive safe-integer scope. Canonical legacy numeric strings such as `"11"` are normalized for read compatibility, while leading-zero, exponent, decimal, unsafe, partial, cross-product or key-mismatched identity is excluded. Invalid/empty selection falls back to the bounded entity scan and sharded backfill.

The manual trigger accepts POST JSON only, requires the Answerlattice-specific bearer secret, and requires either an exact `tId/sId` pair or explicit `forceAllTenants: true`. Empty bodies and unknown fields fail closed. Every acquired tenant lease is settled independently with `Promise.allSettled`; a missing tenant result or thrown nightly batch marks that tenant failed rather than falsely completed.

Registry writers no longer default every merge to active. Onboarding and entity-created/entity-scan paths explicitly set `active: true`; onboarding keeps `hasEntities: false` until entity creation/promotion explicitly changes it to true. Workspace-profile updates omit lifecycle fields, preserving the current active/entity state while updating timezone/EOD metadata in the same transaction as profile truth and compiled-context invalidation. Optional fields are omitted rather than writing `undefined`.

AI provider health state uses an exact replacement contract. `functions-answerlattice/src/answerlattice/aiProviderHealth.ts` still runs the daily Gemini smoke check and writes `platformSummary/answerlatticeAiProviderHealth`, but success and failure each replace the document with their own allowlisted shape so stale error, usage, or unknown private fields cannot survive a state transition. A daily skip requires exact `status: ok`, `success: true`, a canonical day key, and a valid non-future completion timestamp. Failed checks store `ANSWERLATTICE_AI_PROVIDER_HEALTH_CHECK_FAILED` or `ANSWERLATTICE_AI_PROVIDER_HEALTH_UNEXPECTED_RESPONSE` plus bounded source error name/code/status metadata. Provider execution and state persistence are separate failure phases; persistence failures emit `ANSWERLATTICE_AI_PROVIDER_HEALTH_FAILURE_STATE_WRITE_FAILED`, and scheduler-facing errors never contain provider/runtime exception text.

## Compatibility

The deployed export names are unchanged. This avoids creating a second scheduled function and avoids a destructive function rename during rollout.

## MCP Maintainability

MCP is split into:

- `src/app/api/answerlattice/mcp/route.ts` for JSON-RPC/auth/rate-limit shell.
- `src/app/api/answerlattice/mcp/session/route.ts` for API-key-to-session exchange.
- `src/lib/answerlattice/mcpSession.ts` for signed session tokens.
- `src/lib/answerlattice/mcpTools.ts` for tool registration and compiled-bundle tool handlers.

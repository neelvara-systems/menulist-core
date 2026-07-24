# SignalDesk Operating Layer - Implementation

**Status:** Implemented and cross-checked
**Created:** June 24, 2026
**Last Updated:** July 22, 2026

## Runtime Sources

```txt
src/app/(signaldesk)/signaldesk/mission/page.tsx
src/app/(signaldesk)/signaldesk/opportunities/page.tsx
src/app/api/signaldesk/workspace/route.ts
src/app/api/signaldesk/actions/route.ts
src/components/signaldesk/SignalDeskWorkspace.tsx
src/lib/signaldesk/dailyActivationDesk.ts
src/lib/signaldesk/workflowServer.ts
src/lib/signaldesk/workspaceContracts.ts
src/database/signaldesk/index.ts
src/types/signaldesk/index.ts
src/constants/signaldesk/database.ts
src/config/features.ts
firestore-signaldesk.rules
firestore-signaldesk.indexes.json
scripts/verification/e2e-signaldesk-local.js
scripts/verification/verify-signaldesk-runtime.js
scripts/verification/test-signaldesk-daily-activation-desk.ts
```

## Gates

- Parent: `ENABLE_MENULIST_SIGNALDESK_OPERATING_LAYER`.
- Research child: `ENABLE_MENULIST_SIGNALDESK_RESEARCH_AGENT_TABLE`.
- Route pages return not found when the parent is disabled.
- `GET /api/signaldesk/workspace?section=mission` returns not found when disabled.
- Server functions enforce flags independently of the UI.

## Actions and Permissions

| Action | Permission |
| --- | --- |
| `create-daily-growth-mission` | `target.review` |
| `review-growth-mission` | `target.review` |
| `create-experiment-card` | `target.review` |
| `review-experiment-card` | `target.review` |
| `upsert-offer-cta` | `signaldesk.configure` |
| `upsert-reply-playbook` | `draft.create` |
| `create-source-quality-snapshot` | `source.configure` |
| `recommend-market-pod-plan` | `source.configure` |
| `review-market-pod` | founder-admin plus `signaldesk.configure` |
| `create-research-agent-run` | `source.configure` plus provider-run admission |

The workspace uses these exact permissions for control visibility/disablement; it does not rely on a broad edit flag.

## Read Model

Mission loading parallelizes independent bounded reads. Content assets, trust-partner profiles/deals, Revenue records, and Research records are fetched only when their child feature is enabled. Daily mission generation follows the same rule, preventing stale disabled-layer records from influencing action ranking.

Dashboard research summaries are also empty when the Research Agent child flag is disabled. No raw provider payload is loaded into these read models.

## Today Orchestration

`buildSignalDeskDailyActivationDesk()` is a pure client projection over the existing bounded Dashboard response. It:

1. takes the current non-terminal Daily Growth Mission in stored rank order;
2. drops mission reply/approval items already resolved by the live Dashboard summaries;
3. resolves only safe target identity from current conversation/approval links;
4. fills remaining capacity from current activation opportunities by server-derived priority;
5. deduplicates by target and caps the desk at five actions; and
6. maps every item to an existing section or existing score/evidence/draft action.

Successful direct mutations advance to the next item only after `runAction()` returns durable success and refreshes Today. Navigation and Journey actions never claim completion. The explicit `Next` control changes local focus only.

`buildSignalDeskWeeklyActivationSnapshot()` counts only existing seven-day outcome summaries. Two-surface totals require the same owner-qualified, owner-reviewed, evidence-backed, approved-integrity, distinct-surface outcome contract used by the server. Its routed-cohort percentage links unique targets with an in-window `route_created` outcome to those same targets' in-window verified activation outcomes; it does not mix current interested conversations into a historical rate. `Stalled now` requires a durable activation deadline strictly before the current time and excludes activated, terminal, suppressed, and source-policy-expired opportunities. It does not infer revenue, contact, or activation from send volume.

The existing Opportunity Case drawer is the read-only Target Journey. It combines already-loaded target, conversation, approval, outcome, and verified-activation projections. It adds no detail endpoint and exposes no raw contact identity.

The MenuList handoff copies the existing anonymous founder-pilot setup URL. It does not use the dormant route-token bridge, because the production bridge secret and MenuList-owned signed emitter remain pending. Proof preparation routes a target to `/signaldesk/content?proofTargetId=...` only when the durable target projection has an activation timestamp, evidence reference, approved `menulist-signed` or `owner-reviewed-manual` integrity, and at least two distinct activation surfaces. Content then selects an active public proof permission and approved existing source when available and prefills reviewable asset fields. It never creates an asset, generates drafts, approves, schedules, publishes, or records performance automatically.

## Mutation Integrity

- Experiment, reply-playbook, source-quality, and market-pod records are projected through canonical DTO readers before returning or comparing them.
- Reply playbook exact retry returns the stored record with no duplicate write, audit, timeline, or cost update.
- Source-quality creation validates explicit policy/run references, rejects missing references and policy/run mismatch, preserves the run's authoritative policy ID, and uses no-write exact replay.
- Market-pod recommendation requires the parent flag, rejects malformed stored pod data, and uses no-write exact replay.
- Mission and experiment identities preserve their existing deterministic retry rules.
- Audit, timeline, and daily-cost summary effects commit with the corresponding mutation transaction.

## Research Agent

The Research Agent creates a durable run/idempotency claim before provider execution, invokes only a source provider admitted by policy/budget/kill-switch rules, stores normalized target/research rows rather than raw provider payloads, and finalizes rows/run/pod/audit/timeline/cost atomically. Exact concurrent replay does not rerun the provider. Ambiguous completion probes durable truth before compensation.

## Safety

The Operating Layer can prepare, rank, review, and record. It cannot send, publish, spend automatically, infer contact permission, mutate MenuList truth, or autonomously promote an experiment. No new collection, index, listener, scheduler, provider adapter, or dependency was added in the July 21 hardening pass.

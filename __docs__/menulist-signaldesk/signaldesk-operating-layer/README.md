# SignalDesk Operating Layer

**Status:** Implemented and cross-checked
**Created:** June 24, 2026
**Last Updated:** July 22, 2026
**Parent:** [MenuList SignalDesk](../README.md)
**Audience:** Internal only

## Purpose

The Operating Layer compresses governed SignalDesk records into the founder's smallest useful daily decision set. It contains:

- a Daily Growth Mission capped at five ranked actions;
- an activation-first Today desk that merges the current mission with live opportunity state, removes resolved reply/approval work, deduplicates targets, and keeps discovery collapsed while outcome work exists;
- a read-only target journey from opportunity evidence through contact, approval, MenuList setup outcomes, two-surface activation, and proof readiness;
- a seven-day outcome snapshot based on existing route, upload, preview, publish, and two-surface summaries;
- experiment cards with a versioned baseline/candidate readback plan, explicit comparison windows, confounders, stop rules, result evidence, and founder decisions;
- approved offer/CTA records;
- reply-to-conversion playbooks;
- source-quality snapshots tied to real policy and run authority;
- a Research Agent Table and a maximum 30-row lead batch;
- founder-reviewed market-pod recommendations; and
- the bounded seven-day operating trial.

## Runtime Boundary

- The parent flag `ENABLE_MENULIST_SIGNALDESK_OPERATING_LAYER` gates the Mission and legacy Opportunities routes, the Mission workspace API, every Operating Layer mutation, market-pod recommendation, and Research Agent execution.
- `ENABLE_MENULIST_SIGNALDESK_RESEARCH_AGENT_TABLE` is an additional child gate for new research work and research UI.
- Disabled Content, Trust Partner, Revenue, or Research child layers contribute no records to Mission generation or Mission/dashboard read models.
- Mutations are desktop-only and require their exact permission. Mobile receives the compact Dashboard only.
- All records remain private SignalDesk data. No action writes MenuList stores, projects, menus, billing, onboarding, or public output.
- No provider send.
- Provider sending, public publishing, paid campaigns, automatic winner promotion, and automatic rollback remain disabled.

Research provider execution can occur only through the existing governed Research Agent path after source-policy, budget, kill-switch, permission, and child-flag admission. It is not automatic and it is not outbound sending.

## Maintained Documents

| Document | Purpose |
| --- | --- |
| [Specification](./signaldesk-operating-layer_spec.md) | Product and authority contract. |
| [Implementation](./signaldesk-operating-layer_impl.md) | Routes, actions, loaders, replay, and projections. |
| [Firebase](./signaldesk-operating-layer_firebase.md) | Collections, access, read/write posture, and deploy boundary. |
| [Compliance](./signaldesk-operating-layer_compliance.md) | Source, claim, suppression, spend, and human-review rules. |
| [Mobile Support](./signaldesk-operating-layer_mobile-support.md) | Dashboard-only mobile boundary. |
| [Test Cases](./signaldesk-operating-layer_test-cases.md) | Current source and deterministic E2E coverage. |
| [Research Agent Table](./signaldesk-operating-layer_research-agent-table.md) | Governed prompt-to-table workflow. |

## Verified Flow

```txt
governed source and outcome records
  -> optional Research Agent run
  -> founder-readable lead batch
  -> deterministic Daily Growth Mission
  -> controlled experiment / offer / reply / source decision
  -> audit + timeline + daily cost summary
  -> no provider send and no MenuList truth mutation
```

The main route is `/signaldesk/mission`. `/signaldesk/opportunities` remains a guarded legacy entry into the same private workspace.

Today is the daily operator entry. Direct score/evidence/draft actions are offered only for current `verified` or `actionable` opportunities and retain their existing server authority. Suppressed, expired, candidate, or already-contacted work opens the read-only journey instead of inheriting an older research recommendation. When the bounded Dashboard does not carry enough authority to safely admit a direct action, Today opens Opportunities instead of bypassing the existing guard. MenuList handoff copies the existing anonymous founder-pilot `/create-menu` URL for manual use; it sends nothing, mints no route token, and writes no MenuList or SignalDesk outcome. Observed progress is recorded separately in Activations.

## Version History

| Version | Date | Change |
| --- | --- | --- |
| 1.4 | July 22, 2026 | Added activation-first Today orchestration, read-only target journey, explicit observer-only MenuList handoff, seven-day outcomes, collapsed discovery, and focused regression coverage without new Firebase work. |
| 1.3 | July 21, 2026 | Cross-checked parent/child flags, child-layer isolation, permission parity, strict projections, reference integrity, no-write replay, mobile scope, and cost documentation. |
| 1.2 | July 16, 2026 | Required a fresh bounded result summary for every experiment decision. |
| 1.1 | July 16, 2026 | Added the closed-loop experiment readback contract. |
| 1.0 | June 24, 2026 | Created the Operating Layer docs and runtime. |

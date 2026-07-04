# Public Truth Monitor Add-On - Documentation Hub

> **Feature:** Public Truth Monitor Add-On
> **Status:** V2 paid add-on runtime implemented for entitlement-gated saved history and reports
> **Last Updated:** July 4, 2026

---

## Purpose

Public Truth Monitor Add-On is the paid V2 lane for MenuList Tools.

It exists only when the owner, agency, or multi-location operator needs recurring checks, saved history, monthly reports, multi-location comparison, or owner-approved setup/repair work. It is not a better one-time free check.

## Quick Navigation

| Audience | Document | Purpose |
| --- | --- | --- |
| CEO / PM | [Spec](./public-truth-monitor-addon_spec.md) | Paid add-on scope, user jobs, and non-goals |
| Developers | [Implementation](./public-truth-monitor-addon_impl.md) | Runtime architecture, file map, and remaining scheduler boundary |
| Sales | [Marketing](./public-truth-monitor-addon_marketing.md) | Internal packaging and qualification language |
| Website | [Website](./public-truth-monitor-addon_website.md) | Public copy boundaries if surfaced later |
| Help | [Help Doc](./public-truth-monitor-addon_helpdoc.md) | Owner-facing support article draft |
| Firebase | [Firebase](./public-truth-monitor-addon_firebase.md) | Reads, writes, retention, scheduler, and cost gates |
| Mobile | [Mobile Support](./public-truth-monitor-addon_mobile-support.md) | Owner mobile admission and placement |
| QA | [Test Cases](./public-truth-monitor-addon_test-cases.md) | Acceptance and refusal matrix |

## Current State

| Lane | State |
| --- | --- |
| V0 public tools | Implemented as public, browser-local lead magnets |
| V1 owner readiness | Implemented inside Business Health with eighteen read-only modules |
| V2 paid add-on | Implemented as paid owner saved history inside Business Health; background scheduler and external adapters remain off |

## Runtime Boundary

Implemented runtime:

- authenticated summary API: `/api/public-truth-monitor/summary`
- authenticated refresh API: `/api/public-truth-monitor/refresh`
- paid plan entitlement: Pro/Premium by default
- capped latest/history document: `platformSummary/publicTruthMonitor_{storeId}`
- desktop Business Health panel
- mobile Business Health card inside `MobileShell`
- text report download for owner/partner handoff

Still not implemented:

- background scheduled monthly refresh
- standalone public V2 route
- external source fetching
- AI/search/provider sampling
- external platform updates
- report email jobs
- owner-approved managed repair workflow

## Source Gate

Runtime is source-gated by:

```txt
npm run verify:public-truth-monitor-addon
npm run verify:public-truth-tools
```

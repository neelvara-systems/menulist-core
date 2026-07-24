# AI Extraction Internal Monitoring Dashboard — Mobile Support Assessment

**Feature:** Internal monitoring dashboard for the menu extraction pipeline  
**Status:** Enabled bounded platform mobile support — not current device or release certification
**Last Updated:** July 23, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated AI Extraction Monitoring evidence only. Current source sets `ENABLE_EXTRACTION_MONITORING_DASHBOARD=true` and exposes platform-only desktop routes at `/ops/extraction` and `/platform/extraction-monitor` plus `MobileExtractionMonitorScreen` inside `MobileShell`. Cross-tenant job reads and `MENULIST_AI_OPERATIONS` reads are Firestore-rule-gated to platform admins; ordinary authenticated users retain own-job reads only. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:ai-accounting`, `npm run verify:menu-extraction-pipeline`, `npm run verify:agent-readiness`, `npm run verify:mobile-shell-route-map`, `npm run verify:auth-security-failure-matrix`, authenticated platform desktop/mobile browser QA, bounded read/cost and desktop retry smoke, current extraction/provider smoke, applicable target Firebase rules/index/Functions and Vercel deploy evidence, and production-host smoke.

---

## Mobile Relevance Decision: **BOUNDED PLATFORM SUPPORT**

The source includes `MobileExtractionMonitorScreen` inside `MobileShell`. It gives a platform admin a compact operational summary while preserving detailed diagnosis and mutation controls on desktop.

---

## Feature Admission Test (4 Gates)

| Gate | Question | Answer | Pass? |
|------|----------|--------|-------|
| **Frequency** | Daily/multiple times per day? | Reactive operational checks; not an owner workflow | BOUNDED |
| **Speed** | Completes in <5 seconds on mobile? | A manual summary refresh is short; diagnosis remains desktop work | PASS FOR SUMMARY |
| **Touch** | Works with thumb-only? | Cards, status filters, recent-job list, and refresh use touch controls | PASS FOR SUMMARY |
| **Value** | Needed while away from desk? | Useful for confirming health, cost, quality, and recent failures | PASS FOR SUMMARY |

**Result:** Admit a read-only summary for platform admins. Keep detailed job inspection, raw-data copy, and retry on desktop.

---

## Current Mobile Contract

- Entry: `MobileShell` -> More -> Platform -> Extraction Monitor.
- Route mapping: `/ops/extraction` and `/platform/extraction-monitor` resolve to the shell sub-screen.
- Admission: `ENABLE_EXTRACTION_MONITORING_DASHBOARD` must be enabled, the signed role must be exact `PLATFORM`, and the snapshot must pass the fresh current persisted platform-access API before Firestore reads.
- Read failure shows unavailable/previous-snapshot copy; zero metrics are never synthesized from a failed request.
- Reads: `getExtractionDashboardSnapshot({ status, pageSize: 20 })` on initial load, status-filter change, or manual refresh.
- Settlement: each load owns a monotonically increasing request ID. A filter change invalidates the prior request synchronously, and only the latest still-mounted request may replace metrics/jobs, show failure feedback, or clear loading. Losing platform admission or unmounting also invalidates outstanding work.
- Visible data: health, cost today, quality, and recent-job summaries.
- Mutations: none. Mobile has no Job Inspector, raw-data copy, or retry action.
- Refresh: no automatic interval. The operator explicitly refreshes when current evidence is needed.

The same Firestore rules independently restrict cross-tenant and cross-store `menuImageProcessingJobs` reads and all `MENULIST_AI_OPERATIONS` reads to platform admins. Ordinary authenticated users require both exact job ownership and current job tenant/store membership; a historical `uId` cannot read an old scope after switching location.

## Required Device Evidence

Release evidence must cover an authenticated platform session and a non-platform denial state on a supported mobile viewport. Confirm route-to-shell mapping, filter changes, manual refresh, bounded failure copy, no horizontal overflow, and no desktop-only mutation controls.

---

_Document Status: Enabled bounded platform mobile support; not current device or release certification._

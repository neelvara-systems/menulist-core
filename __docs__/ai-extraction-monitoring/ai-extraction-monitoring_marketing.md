# AI Extraction Internal Monitoring Dashboard — Marketing & Sales Collateral

**Feature:** Internal monitoring dashboard for the menu extraction pipeline  
**Status:** Source-gated internal positioning — not customer marketing or launch approval
**Last Updated:** July 10, 2026
**Audience:** Internal only (not customer-facing)

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated AI Extraction Monitoring evidence only. Current source sets `ENABLE_EXTRACTION_MONITORING_DASHBOARD=true` and exposes platform-only desktop routes at `/ops/extraction` and `/platform/extraction-monitor` plus `MobileExtractionMonitorScreen` inside `MobileShell`. Cross-tenant job reads and `MENULIST_AI_OPERATIONS` reads are Firestore-rule-gated to platform admins; ordinary authenticated users retain own-job reads only. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:ai-accounting`, `npm run verify:menu-extraction-pipeline`, `npm run verify:agent-readiness`, `npm run verify:mobile-shell-route-map`, `npm run verify:auth-security-failure-matrix`, authenticated platform desktop/mobile browser QA, bounded read/cost and desktop retry smoke, current extraction/provider smoke, applicable target Firebase rules/index/Functions and Vercel deploy evidence, and production-host smoke.

---

## Internal Positioning

This is a **founder-only operational tool**. It has zero customer-facing marketing value.

### Why It Matters Internally

1. **Consolidates debugging evidence** across recent extraction jobs, cost rows, and quality summaries
2. **Surfaces recorded failures** for platform review
3. **Provides cost visibility** for AI spend decisions
4. **Enables controlled desktop recovery** when a failed job remains eligible for the existing retry path

### Elevator Pitch (Internal)

> "One platform page for recent extraction health, cost, quality, job evidence, and controlled retry where eligible."

---

## Approved Language

| Use | Avoid |
|-----|-------|
| "Extraction monitor" | "AI dashboard" |
| "Operational health" | "AI analytics" |
| "Debug console" | "Intelligence hub" |
| "Pipeline status" | "AI performance metrics" |

This is a debug tool, not an analytics product.

---

_Document Status: Source-gated internal positioning; not customer marketing or launch approval._

# AI Extraction Internal Monitoring Dashboard — Website Content

**Feature:** Internal monitoring dashboard for the menu extraction pipeline  
**Status:** Source-backed internal website reference — not public content or launch approval
**Last Updated:** July 10, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated AI Extraction Monitoring evidence only. Current source sets `ENABLE_EXTRACTION_MONITORING_DASHBOARD=true` and exposes platform-only desktop routes at `/ops/extraction` and `/platform/extraction-monitor` plus `MobileExtractionMonitorScreen` inside `MobileShell`. Cross-tenant job reads and `MENULIST_AI_OPERATIONS` reads are Firestore-rule-gated to platform admins; ordinary authenticated users retain own-job reads only. Current release approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:ai-accounting`, `npm run verify:menu-extraction-pipeline`, `npm run verify:agent-readiness`, `npm run verify:mobile-shell-route-map`, `npm run verify:auth-security-failure-matrix`, authenticated platform desktop/mobile browser QA, bounded read/cost and desktop retry smoke, current extraction/provider smoke, applicable target Firebase rules/index/Functions and Vercel deploy evidence, and production-host smoke.

---

## Website Relevance: **NONE**

This is an **internal-only operational tool** accessible only to platform administrators (`platformRole === 'PLATFORM'`).

It has no customer-facing website content, no landing page, and no SEO considerations.

---

_Document Status: Source-backed internal website reference; no public website content._

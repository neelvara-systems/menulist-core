# AI System Layer — Marketing & Sales Collateral

**Feature:** Centralized AI Infrastructure for MenuList  
**Status:** Source-gated internal positioning — not approved sales or launch collateral
**Last Updated:** July 26, 2026
**Audience:** Internal (not customer-facing)

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated AI System Layer evidence only. Current MenuList approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:ai-accounting`, `npm run verify:functions-deploy-preflight`, `npm run verify:menu-extraction-pipeline`, scoped Firebase deploy evidence for affected MenuList Functions, target Vercel deploy evidence for affected app routes, provider smoke with target-specific key/model/quota configuration, SAFE_MODE/rate-limit/accounting/provider-health smoke, authenticated browser/device QA for affected owner/platform surfaces, and production-host smoke. Answerlattice retains separate doctrine, credentials, Firebase target, billing/cost evidence, deploy approval, and release certification; this document cannot authorize an Answerlattice deploy or release.

---

## Elevator Pitch

MenuList's AI System Layer provides shared gateways, model constants, bounded diagnostics, and provider-health records for covered AI paths. Billable app routes and extraction retain their existing compact ledgers. It is internal infrastructure, not a customer-facing feature or a guarantee of provider availability.

---

## Feature Narrative

### Why This Matters

MenuList uses AI for its core value proposition: converting menu images into structured data. As the platform grows, AI usage expands across descriptions, translations, image generation, analytics summaries, and help center search.

Without centralized control, each feature independently manages its own Gemini calls — creating inconsistent error handling, unpredictable costs, and cascading failures when the API has issues.

The AI System Layer reduces duplication through shared gateway patterns and source-defined route/job guards. It does not create one universal queue, limiter, circuit breaker, or usage ledger for every AI call.

### Business Value

1. **Bounded cost evidence** — Extraction and billable app routes retain their existing compact accounting records
2. **Guarded failures** — Covered calls use shared provider classification, retry, and owner-safe failure patterns
3. **Operational consistency** — Shared model constants, diagnostics, and daily health records reduce duplicated handling
4. **Reusable controls** — New AI work can adopt the established gateway, SAFE_MODE, limiter, and accounting contracts where applicable

---

## Internal Positioning

This is **NOT a customer-facing feature**. Customers never see or interact with the AI System Layer.

The July 26 model/SDK migration is operational maintenance. Do not turn model names, SDK versions, Interactions API availability, or provider pricing into public claims.

It is **infrastructure** that:
- Reduces operational risk as AI usage grows
- Enables cost tracking for pricing decisions
- Provides the foundation for source-backed AI infrastructure candidates such as knowledge reuse or caching
- Makes the founder's life easier (single monitoring point)

---

## Talking Points

### For Product Discussions

- "Covered AI paths use shared provider classification and model constants; route-specific limiters, SAFE_MODE, retries, and accounting stay explicit"
- "Extraction and billable app routes retain compact cost and operation evidence; internal calls are not described as universally metered"
- "New AI work must adopt the existing gateway and the controls required by its route or job"
- "Provider failures return through bounded errors and circuit-breaker behavior where the covered path implements them"

### For Technical Discussions

- "Single SDK family with separate MenuList app/Functions and Answerlattice gateway ownership"
- "Expensive routes and jobs use existing feature flags, SAFE_MODE, or scheduler controls where the source contract defines them"
- "Extraction keeps its existing queue and compact operation ledger"
- "No universal `aiUsageLog` collection exists; current ledgers remain `MENULIST_AI_OPERATIONS` and `menulistAiOperations/{tId}/{sId}`"

---

## Approved Language

| Use | Avoid |
|-----|-------|
| "Centralized AI infrastructure" | "AI-powered system" |
| "Cost-controlled pipeline" | "Smart cost optimization" |
| "Unified protection layer" | "Intelligent failover" |
| "Operational simplicity" | "Revolutionary AI management" |

---

_Document Status: Source-gated internal positioning; not approved sales or launch collateral._

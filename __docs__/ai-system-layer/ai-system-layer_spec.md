# AI System Layer — Product Specification

**Feature:** Centralized AI Infrastructure for MenuList  
**Status:** Source-implemented and hardened — not current launch or deploy certification
**Last Updated:** August 13, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated AI System Layer evidence only. Current MenuList approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:ai-accounting`, `npm run verify:functions-deploy-preflight`, `npm run verify:menu-extraction-pipeline`, scoped Firebase deploy evidence for affected MenuList Functions, target Vercel deploy evidence for affected app routes, provider smoke with target-specific key/model/quota configuration, SAFE_MODE/rate-limit/accounting/provider-health smoke, authenticated browser/device QA for affected owner/platform surfaces, and production-host smoke. Answerlattice retains separate doctrine, credentials, Firebase target, billing/cost evidence, deploy approval, and release certification; this document cannot authorize an Answerlattice deploy or release.

---

## Executive Summary

MenuList uses Google Gemini AI across multiple features: menu extraction, descriptions, translations, image generation, help center search, feedback analysis, weekly narratives, review drafts, and KB quality scoring. The AI System Layer centralizes AI operations through a gateway, shared model constants, key failover, retry handling, and scheduled provider health checks.

### What It Does

- **AI Gateway** → Single entry point for all Gemini API calls across Cloud Functions
- **Rate Limiting** → Existing route/job guards protecting Gemini API entry points
- **Retry Handler** → Consistent exponential backoff with circuit breaker
- **Cost Tracking** → Extraction and billable app-route operation ledgers for cost monitoring
- **Model Constants** → Product/runtime-specific model selection
- **SDK Standardization** → Single Gemini SDK across all features
- **Provider Health** → Daily Gemini health records for MenuList and Answerlattice

### What It Does NOT Do

- ❌ Does not change AI prompts or extraction logic (each feature keeps its own adapter)
- ❌ Does not introduce a task queue for all features (extraction already has one; other paths use route guards or schedulers)
- ✅ Shared API key failover pool (1-3 keys) plus one dedicated paid menu-extraction credential
- ❌ Does not add a knowledge caching runtime
- ✅ Covers BOTH frontend API routes AND Cloud Functions (transparent proxy on both sides)

---

## Problem Statement

### Solved Issues

1. **SDK standardization**
   - Active source uses `@google/genai` behind gateway entry points.

2. **Consistent retry and key failover**
   - MenuList app routes and Functions use the shared gateway.
   - Answerlattice app/Functions paths now share product-specific model constants.

3. **Model deprecation cleanup**
   - Active source no longer calls Gemini 2.0 Flash ids.
   - Stable production ids live in constants instead of scattered literals.

4. **Provider health visibility**
   - Daily health records now exist for MenuList and Answerlattice.

### Remaining Risks

1. **Global rate protection**
   - If many live owner routes and nightly jobs run together, cross-feature throttling is still limited to the existing route/job guards.

2. **Cross-feature cost visibility**
   - Extraction costs tracked in `MENULIST_AI_OPERATIONS` collection
   - Some newer billable app routes use `menulistAiOperations`
   - Not every internal scheduler feature has unified per-feature cost reporting

3. **Provider abstraction**
   - Gemini is still the only live provider in active production paths.
   - Any non-Gemini fallback needs a shared interface and source-backed architecture decision, not direct provider calls.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────┐
│ AI FEATURES (Consumers)                           │
│                                                    │
│  Menu Extraction    Descriptions    Translations   │
│  Image Generation   Feedback AI     Weekly AI      │
│  KB Quality         Help Search     Dashboard AI   │
└───────────────────────┬──────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│ FEATURE AI ADAPTERS                               │
│                                                    │
│  Each feature defines its own:                     │
│  • Prompt construction                            │
│  • Input formatting                               │
│  • Response parsing                               │
│  • Post-processing                                │
└───────────────────────┬──────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│ AI GATEWAY (Single entry point)                   │
│                                                    │
│  ┌─────────────┐  ┌──────────────┐               │
│  │ Model Router │  │ Cost Tracker  │               │
│  └─────────────┘  └──────────────┘               │
│  ┌─────────────┐  ┌──────────────┐               │
│  │ Rate Limiter │  │ Retry Handler│               │
│  └─────────────┘  └──────────────┘               │
│  ┌─────────────┐                                  │
│  │ Cir. Breaker│                                  │
│  └─────────────┘                                  │
└───────────────────────┬──────────────────────────┘
                        │
                        ▼
┌──────────────────────────────────────────────────┐
│ GEMINI API                                        │
└──────────────────────────────────────────────────┘
```

---

## Goals

| Goal                      | Success Metric                                                           |
| ------------------------- | ------------------------------------------------------------------------ |
| **Unified protection**    | All Cloud Function AI calls have rate limiting + retry + circuit breaker |
| **SDK standardization**   | Single Gemini SDK (`@google/genai`) across all Cloud Functions           |
| **Model consistency**     | Explicit stable registry: `gemini-3.5-flash-lite` for high-throughput work, `gemini-3.6-flash` for complex/escalation work, and deliberate balanced/image overrides |
| **Cost visibility**       | Per-feature AI cost tracked and queryable                                |
| **Zero breaking changes** | Existing extraction pipeline behavior unchanged                          |

---

## User Stories

### Platform Owner (Founder)

> "As the platform owner, I want all AI features to have consistent protection so that one feature's AI failure doesn't cascade to others."

**Acceptance Criteria:**

- All AI calls go through the gateway
- Circuit breaker prevents cascade failures
- Cost is tracked per feature
- Single place to check AI health

### Developer

> "As a developer adding a new AI feature, I want a simple interface to call Gemini without worrying about rate limiting, retries, or key management."

**Acceptance Criteria:**

- Simple `executeAITask(config)` interface
- Automatic rate limiting and retry
- Feature adapter pattern for prompt/parsing separation

---

## Requirements

### Functional Requirements

| ID    | Requirement                                    | Priority | Status |
| ----- | ---------------------------------------------- | -------- | ------ |
| FR-01 | Centralized AI gateway for Gemini calls        | P0       | ✅     |
| FR-02 | Global rate limiter (requests/second)          | P0       | 📝     |
| FR-03 | Unified retry handler with exponential backoff | P0       | ✅     |
| FR-04 | Circuit breaker (reuse existing)               | P0       | ✅     |
| FR-05 | Model constants                                | P1       | ✅     |
| FR-06 | Per-feature cost tracking                      | P1       | 📝     |
| FR-07 | SDK standardization to `@google/genai`         | P1       | ✅     |
| FR-08 | Feature adapter pattern (prompt separation)    | P1       | 📝     |
| FR-09 | Shared 1-3 key pool plus isolated extraction credential | P0       | ✅     |
| FR-10 | Request fingerprint caching                    | P2       | 📝     |
| FR-11 | Translation memory                             | P3       | 📝     |
| FR-12 | Description cache                              | P3       | 📝     |
| FR-13 | Daily AI provider health check                 | P0       | ✅     |

### Non-Functional Requirements

| ID     | Requirement                         | Target                   |
| ------ | ----------------------------------- | ------------------------ |
| NFR-01 | Gateway overhead per call           | < 50ms                   |
| NFR-02 | Zero breaking changes to extraction | Must pass existing tests |
| NFR-03 | Stable production models            | No preview/latest/experimental aliases in active prod paths |
| NFR-04 | Key isolation                       | Separate staging/production values and no extraction fallback into the shared pool |

---

## Feature Flag

No feature flag needed. The gateway is **always active** — it replaced the raw `GoogleGenAI` export:

- With 1 key: acts as a retry handler (exponential backoff on errors)
- With 2+ keys: full key rotation + retry on rate limits

Behavior is determined by how many keys are configured in environment variables.

---

## Current AI Features Inventory (Codebase Truth)

### Cloud Functions (Backend)

| Feature           | File                                                     | SDK             | Model constant | Cost/Call | Frequency  |
| ----------------- | -------------------------------------------------------- | --------------- | -------------- | --------- | ---------- |
| Menu Extraction   | `functions/src/logic/processMenuImages.ts`               | `@google/genai` | `AI_MODEL`     | ~$0.001   | Per upload |
| Feedback Analysis | `functions/src/services/gemini/feedbackAnalysis.ts`      | `@google/genai` | `AI_MODEL`     | No active runtime cost | Dormant compatibility source |
| Owner Dashboard   | `functions/src/services/gemini/ownerDashboardSummary.ts` | `@google/genai` | `OWNER_ANALYTICS_AI_MODEL` | ~$0.001 | Nightly |
| Weekly Narrative  | `functions/src/analytics/weeklyNarrative.ts`             | `@google/genai` | `AI_MODEL`     | No active runtime cost | Dormant compatibility source |
| KB Quality        | Retired MenuList source                                  | —               | —              | No runtime cost | Worker and provider helper absent; Answerlattice owns current truth |
| AI Provider Health | `functions/src/schedulers/aiProviderHealth.ts`          | `@google/genai` | `AI_MODEL`     | tiny      | Daily      |

### Frontend API Routes (Client → Server → Gemini)

| Feature           | Route                       | Protection          |
| ----------------- | --------------------------- | ------------------- |
| Descriptions      | `/api/descriptions`         | Upstash + SAFE_MODE |
| Translations      | `/api/image-translations`   | Upstash + SAFE_MODE |
| Image Generation  | `/api/image-generation`     | Upstash + SAFE_MODE |
| Help Search       | `/api/helpCenter/search-kb` | Upstash + SAFE_MODE |
| New Item Metadata | `/api/new-item-metadata`    | Upstash + SAFE_MODE |

Frontend routes use the same gateway entry point from `src/lib/google/genAi/` and model constants from `src/constants/AI/models.ts` or `src/constants/answerlattice/ai.ts`.

---

## Phased Implementation

### Current Runtime — Gateway Foundation

- AI Gateway module behind the active Gemini client entry points
- Reuse existing circuit breaker
- Reuse existing route/job rate limiters
- Model constants with product/runtime-specific names
- Migrate Cloud Function AI features to gateway
- Extraction and billable app-route operation ledgers
- Gateway entry points stay always-on; no `ENABLE_AI_GATEWAY` bypass exists in active code.

### Conditional Cost Control Candidates

- ✅ ~~Shared 1-3 key pool with failover~~ (DONE — moved to Phase 1)
- ✅ ~~Dedicated paid menu-extraction credential~~ (DONE — one Functions-only key, no shared fallback)
- ✅ ~~Key health monitoring and cooldown~~ (DONE — exponential cooldown per key)
- Request fingerprint caching (avoid duplicate calls)
- Per-tenant AI budget guardrails
- Provider abstraction for non-Gemini fallback

These items are not current runtime behavior. They require source-backed demand evidence, invalidation rules, cost impact, and docs before implementation.

### Conditional Knowledge Reuse Candidates

- Translation memory (shared dictionary)
- Description cache (common dishes)
- Image prompt library
- Dish name normalization

These items are not current runtime behavior. They require source-backed volume evidence and a separate architecture decision before implementation.

---

## Cost Model

### Current AI Cost (estimated per 1000 restaurants/month)

| Feature                                         | Calls/month | Cost/call | Monthly        |
| ----------------------------------------------- | ----------- | --------- | -------------- |
| Menu Extraction                                 | 3,000       | $0.001    | $3.00          |
| Descriptions                                    | 2,000       | $0.001    | $2.00          |
| Translations                                    | 1,000       | $0.001    | $1.00          |
| Images                                          | 500         | $0.02     | $10.00         |
| Nightly AI (5 features × 30 days × 1000 stores) | 150,000     | $0.0005   | $75.00         |
| **Total**                                       |             |           | **~$91/month** |

### Conditional Cost-Reduction Ideas (Not Current Runtime)

| Optimization       | Reduction              |
| ------------------ | ---------------------- |
| Translation memory | -30% translation calls |
| Description cache  | -40% description calls |
| Request dedup      | -10% overall           |
| **Net reduction**  | **~25-35%**            |

These are planning estimates only. Do not treat them as production savings, launched behavior, or committed runtime scope.

---

## Out of Scope

| Feature                         | Reason                                    |
| ------------------------------- | ----------------------------------------- |
| Menu AST                        | Premature — current extraction works well |
| Menu Knowledge Graph            | Needs 10k+ menus to be valuable           |
| Multi-provider (OpenAI, Claude) | Gemini is sufficient                      |
| Real-time streaming             | Not needed for batch AI tasks             |
| Frontend AI route migration     | Already have Upstash protection           |

---

## Related Documents

| Document                                | Purpose              |
| --------------------------------------- | -------------------- |
| `_impl.md`                              | Technical blueprint  |
| `_firebase.md`                          | Cost tracking        |
| `__docs__/projects/ai-data-extraction/` | Primary consumer     |
| `__docs__/ai-extraction-monitoring/`    | Monitoring dashboard |

---

## Version History

| Version | Date     | Changes                                                         |
| ------- | -------- | --------------------------------------------------------------- |
| 1.0     | Mar 2026 | Initial documentation from ChatGPT review + codebase validation |

---

_Document Status: Source-implemented and hardened; not current launch or deploy certification._

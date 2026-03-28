# AI System Layer — Product Specification

**Feature:** Centralized AI Infrastructure for MenuList  
**Status:** ✅ PHASE 1 COMPLETE — Key rotation + AI Gateway implemented globally  
**Last Updated:** March 13, 2026

---

## Executive Summary

MenuList uses Google Gemini AI across multiple features: menu extraction, descriptions, translations, image generation, help center search, feedback analysis, weekly narratives, and KB quality scoring. Currently, each feature calls Gemini independently with inconsistent SDKs, models, retry logic, and rate limiting. The AI System Layer centralizes all AI operations through a single gateway with unified rate limiting, key management, retry handling, and cost tracking.

### What It Does

- **AI Gateway** → Single entry point for all Gemini API calls across Cloud Functions
- **Rate Limiting** → Global request throttle protecting the Gemini API
- **Retry Handler** → Consistent exponential backoff with circuit breaker
- **Cost Tracking** → Per-feature, per-tenant AI cost monitoring
- **Model Router** → Task-based model selection (centralized)
- **SDK Standardization** → Single Gemini SDK across all features

### What It Does NOT Do

- ❌ Does not change AI prompts or extraction logic (each feature keeps its own adapter)
- ❌ Does not introduce a task queue for all features (extraction already has one; others don't need it yet)
- ✅ API key rotation with multi-key pool (1-4 keys, auto-discovered from env vars)
- ❌ Does not add knowledge caching (Phase 3, needs data volume)
- ✅ Covers BOTH frontend API routes AND Cloud Functions (transparent proxy on both sides)

---

## Problem Statement

### Current Issues

1. **Two Gemini SDKs in use**
   - `@google/genai` (new SDK) — used by menu extraction
   - `@google/generative-ai` (legacy SDK) — used by feedback analysis, weekly narrative, owner dashboard, KB quality
   - Different initialization patterns, different response handling

2. **Inconsistent protection**
   - Menu extraction: rate limiting ✅, retry ✅, circuit breaker ✅
   - Feedback analysis: rate limiting ❌, retry ❌, circuit breaker ❌
   - Weekly narrative: rate limiting ❌, retry ❌, circuit breaker ❌

3. **Model inconsistency**
   - Extraction: `gemini-2.5-flash` (latest)
   - Other Cloud Functions: `gemini-2.0-flash-exp` (older, experimental)

4. **No global rate protection**
   - If nightly scheduler runs 8 AI tasks simultaneously for all tenants, no global throttle prevents Gemini rate limit errors

5. **No cross-feature cost visibility**
   - Extraction costs tracked in `MENULIST_AI_OPERATIONS` collection
   - Other AI features: no cost tracking at all

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
| **Model consistency**     | All features use `gemini-2.5-flash` unless explicitly overridden         |
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
| FR-01 | Centralized AI gateway for all CF Gemini calls | P0       | 📝     |
| FR-02 | Global rate limiter (requests/second)          | P0       | 📝     |
| FR-03 | Unified retry handler with exponential backoff | P0       | 📝     |
| FR-04 | Circuit breaker (reuse existing)               | P0       | 📝     |
| FR-05 | Model router (task → model mapping)            | P1       | 📝     |
| FR-06 | Per-feature cost tracking                      | P1       | 📝     |
| FR-07 | SDK standardization to `@google/genai`         | P1       | 📝     |
| FR-08 | Feature adapter pattern (prompt separation)    | P1       | 📝     |
| FR-09 | API key pool with failover                     | P0       | ✅     |
| FR-10 | Request fingerprint caching                    | P2       | 📝     |
| FR-11 | Translation memory                             | P3       | 📝     |
| FR-12 | Description cache                              | P3       | 📝     |

### Non-Functional Requirements

| ID     | Requirement                         | Target                   |
| ------ | ----------------------------------- | ------------------------ |
| NFR-01 | Gateway overhead per call           | < 50ms                   |
| NFR-02 | Zero breaking changes to extraction | Must pass existing tests |
| NFR-03 | Feature flag controlled             | `ENABLE_AI_GATEWAY`      |

---

## Feature Flag

No feature flag needed. The gateway is **always active** — it replaced the raw `GoogleGenAI` export:

- With 1 key: acts as a retry handler (exponential backoff on errors)
- With 2+ keys: full key rotation + retry on rate limits

Behavior is determined by how many keys are configured in environment variables.

---

## Current AI Features Inventory (Codebase Truth)

### Cloud Functions (Backend)

| Feature           | File                                                     | SDK                     | Model                  | Cost/Call | Frequency  |
| ----------------- | -------------------------------------------------------- | ----------------------- | ---------------------- | --------- | ---------- |
| Menu Extraction   | `functions/src/logic/processMenuImages.ts`               | `@google/genai`         | `gemini-2.5-flash`     | ~$0.001   | Per upload |
| Feedback Analysis | `functions/src/services/gemini/feedbackAnalysis.ts`      | `@google/generative-ai` | `gemini-2.0-flash-exp` | ~$0.001   | Nightly    |
| Owner Dashboard   | `functions/src/services/gemini/ownerDashboardSummary.ts` | `@google/generative-ai` | `gemini-2.0-flash-exp` | ~$0.001   | Nightly    |
| Weekly Narrative  | `functions/src/analytics/weeklyNarrative.ts`             | `@google/generative-ai` | varies                 | ~$0.001   | Weekly     |
| KB Quality        | `functions/src/analytics/kbQuality.ts`                   | `@google/generative-ai` | varies                 | ~$0.001   | Nightly    |

### Frontend API Routes (Client → Server → Gemini)

| Feature           | Route                       | Protection          |
| ----------------- | --------------------------- | ------------------- |
| Descriptions      | `/api/descriptions`         | Upstash + SAFE_MODE |
| Translations      | `/api/image-translations`   | Upstash + SAFE_MODE |
| Image Generation  | `/api/image-generation`     | Upstash + SAFE_MODE |
| Help Search       | `/api/helpCenter/search-kb` | Upstash + SAFE_MODE |
| New Item Metadata | `/api/new-item-metadata`    | Upstash + SAFE_MODE |

**Phase 1 scope:** Cloud Functions only (backend). Frontend routes already have Upstash protection.

---

## Phased Implementation

### Phase 1 — Gateway Foundation (MVP)

- AI Gateway module with `executeAITask()`
- Reuse existing circuit breaker
- Reuse existing rate limiter (add global limiter)
- Model router with task→model mapping
- Migrate Cloud Function AI features to gateway
- Per-feature cost tracking
- Feature flag: `ENABLE_AI_GATEWAY`

### Phase 2 — Cost Control & Caching (Future)

- ✅ ~~API key pool with failover~~ (DONE — moved to Phase 1)
- ✅ ~~Key health monitoring and cooldown~~ (DONE — exponential cooldown per key)
- Request fingerprint caching (avoid duplicate calls)
- Per-tenant AI budget guardrails

### Phase 3 — Knowledge Reuse

- Translation memory (shared dictionary)
- Description cache (common dishes)
- Image prompt library
- Dish name normalization

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

### Cost Reduction with Knowledge Reuse (Phase 3)

| Optimization       | Reduction              |
| ------------------ | ---------------------- |
| Translation memory | -30% translation calls |
| Description cache  | -40% description calls |
| Request dedup      | -10% overall           |
| **Net reduction**  | **~25-35%**            |

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

_Document Status: ✅ PHASE 1 IMPLEMENTED — Key rotation + gateway live_

# AI System Layer

**Feature:** Centralized AI Infrastructure for MenuList
**Status:** ✅ PRODUCTION HARDENING ACTIVE — Gateway, rotation, model constants, daily health checks
**Source:** ChatGPT extraction hardening session (Mar 2026) → Cascade codebase validation
**Last Updated:** June 28, 2026

---

## Overview

The AI System Layer is a centralized infrastructure that governs AI operations across MenuList and the shared Answerlattice paths that live in this repo. Instead of each feature calling Gemini independently with its own retry logic, rate limiting, and error handling, AI calls flow through a gateway plus shared model constants.

**Core principle:** AI is an expensive, rate-limited external resource. Treat it like a database — centralize access, control cost, and monitor health.

Production rule: API keys are failover and rotation credentials, not a quota scaling strategy. Google Gemini rate limits are enforced at the project/model tier, so production capacity must be handled with billing, quota monitoring, model choice, and provider health checks.

---

## Documentation

| Document             | Audience          | Purpose                                            |
| -------------------- | ----------------- | -------------------------------------------------- |
| `_spec.md`           | Product, Business | Requirements, architecture decisions, cost model   |
| `_impl.md`           | Developers        | Technical blueprint, file structure, API contracts |
| `_firebase.md`       | Developers        | Firestore operations, cost tracking                |
| `_marketing.md`      | Internal          | Positioning, pitch for internal stakeholders       |
| `_website.md`        | Public            | Landing page content (if applicable)               |
| `_helpdoc.md`        | Public            | Customer-facing help documentation                 |
| `_mobile-support.md` | Internal          | Mobile relevance assessment                        |

---

## Quick Reference

### Current State (✅ Updated June 25, 2026)

AI call sites use the gateway and shared model constants. Active source code no longer calls Gemini 2.0 Flash models.

June 28 hardening: frontend and Cloud Functions AI gateways classify rate limits, hard quota, and retryable provider errors from structured source code/name/status/quota/limit indicators only. Shared app-route provider helpers use the same structured retry/rate-limit posture. They do not parse raw provider `message` fields for retry decisions or diagnostics.

| AI Feature              | SDK             | Model                                | Key Rotation | Retry           | Rate Limiting |
| ----------------------- | --------------- | ------------------------------------ | ------------ | --------------- | ------------- |
| Menu Extraction         | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway + CB | ✅ Upstash    |
| Feedback Analysis       | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ❌ Nightly    |
| Owner Dashboard Summary | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ❌ Nightly    |
| KB Quality Analysis     | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ❌ Nightly    |
| Weekly Narrative        | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ❌ Nightly    |
| KB Generation           | `@google/genai` | `gemini-2.5-pro`                     | ✅ Gateway   | ✅ Gateway      | ❌ None       |
| Embeddings (CF)         | `@google/genai` | `text-embedding-004`                 | ✅ Gateway   | ✅ Gateway      | ❌ None       |
| Help Center Search      | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Descriptions            | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Translations            | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Image Generation        | `@google/genai` | `gemini-2.5-flash-image`             | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Image Editing           | `@google/genai` | `gemini-2.5-flash-image`             | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| New Item Metadata       | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Campaign Captions       | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Review Drafts           | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Answerlattice Translate | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Public Create Menu      | `@google/genai` | varies                               | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Answerlattice Embeddings | `@google/genai` | `gemini-embedding-001`               | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |

### Architecture (Implemented)

```
All AI Features (17 files import genAIClient)
     ↓
genAIClient (transparent proxy — same interface as GoogleGenAI)
     ↓
AI Gateway (aiGateway.ts)
  ├── On 429 → Key Manager rotates to next key → immediate retry
  ├── On 5xx → Exponential backoff → retry same key
  └── On 4xx → Fail immediately (no retry)
     ↓
Key Manager (keyManager.ts)
  ├── Pool of 1-4 GoogleGenAI clients
  ├── Round-robin with health tracking
  └── Cooldown: 60s → 120s → 240s → 5min cap
     ↓
Gemini API (via @google/genai SDK)
```

---

## Key Decisions

| Decision              | Choice                           | Rationale                                                   |
| --------------------- | -------------------------------- | ----------------------------------------------------------- |
| Gateway scope         | **BOTH frontend + CF**           | All AI calls need key rotation protection                   |
| SDK standardization   | `@google/genai` (new SDK)        | Already used by extraction, newer API                       |
| Default model         | `gemini-2.5-flash`               | Cost-effective, already proven in extraction                |
| Key pool              | **✅ IMPLEMENTED** (1-4 keys)    | Auto-discovers available keys from env vars                 |
| Proxy approach        | Transparent (same interface)     | Zero changes to 19 call sites                               |
| Production key policy | Separate restricted keys per environment | Limits blast radius; keys are not exposed client-side       |
| Quota policy          | Per Google project/model tier    | Extra keys are for failover/rotation, not unlimited quota   |
| Model names           | Stable names only for production | No `latest`, preview, or experimental aliases in active prod paths |
| Answerlattice embeddings | Keep `gemini-embedding-001` until reindex | Embedding 2 migration requires a planned vector-space rebuild |
| Answerlattice Functions provider | `@google/genai` API-key gateway | Same SDK/gateway pattern as MenuList while preserving Answerlattice credential and billing isolation |
| Provider health       | Daily scheduler checks           | Detect key, model, or quota failures before owners report them |
| Universal task queue  | Not current runtime              | Extraction already has a job queue; other paths use route guards or schedulers |
| Knowledge reuse layer | Conditional candidate only       | Not implemented in the current runtime; requires a separate source-backed design |

---

## Related Features

| Feature                  | Relationship                                    |
| ------------------------ | ----------------------------------------------- |
| AI Data Extraction       | Primary consumer, already has advanced pipeline |
| AI Extraction Monitoring | Depends on AI System Layer for metrics          |
| Menu Correctness Engine  | Uses AI for validation (client-side)            |
| Help Center Search       | Uses Gemini for RAG responses                   |
| Answerlattice                 | Uses Gemini for various AI operations           |

---

## Key Files

### Frontend (src/)

| File                                 | Purpose                                       |
| ------------------------------------ | --------------------------------------------- |
| `src/lib/google/genAi/index.ts`      | Entry point — exports `genAIClient` (gateway) |
| `src/lib/google/genAi/aiGateway.ts`  | AI Gateway — retry + key rotation proxy with bounded diagnostics |
| `src/lib/google/genAi/diagnostics.ts` | Shared route diagnostics with bounded provider and security metadata |
| `src/lib/google/genAi/keyManager.ts` | Key Manager — pool + health tracking          |
| `src/lib/ai/providerErrors.ts`       | Shared app-route provider rate-limit/retry helper with structured indicators |
| `src/constants/AI/models.ts`         | Shared MenuList model constants               |
| `src/constants/answerlattice/ai.ts`  | Shared Answerlattice model constants          |

### Cloud Functions (functions/src/)

| File                              | Purpose                                       |
| --------------------------------- | --------------------------------------------- |
| `functions/src/genAiClient.ts`    | Entry point — exports `genAIClient` (gateway) |
| `functions/src/ai/aiGateway.ts`   | AI Gateway — retry + key rotation proxy with bounded diagnostics |
| `functions/src/ai/keyManager.ts`  | Key Manager — pool + health tracking          |
| `functions/src/config/secrets.ts` | Secret names + groups (4 AI key slots)        |
| `functions/src/constants/ai.ts`   | Cloud Functions AI model constants            |
| `functions/src/schedulers/aiProviderHealth.ts` | Daily MenuList Gemini health check |

### Answerlattice Cloud Functions

| File | Purpose |
| --- | --- |
| `functions-answerlattice/src/genAiClient.ts` | Entry point — exports `answerlatticeGenAIClient` (gateway) |
| `functions-answerlattice/src/ai/aiGateway.ts` | Answerlattice AI Gateway — retry + key rotation proxy with bounded diagnostics |
| `functions-answerlattice/src/ai/keyManager.ts` | Answerlattice Key Manager — product-scoped key pool + health tracking |
| `functions-answerlattice/src/config/secrets.ts` | Answerlattice secret names + groups (cron + 4 AI key slots) |
| `functions-answerlattice/src/constants/ai.ts` | Answerlattice Functions AI model constants |
| `functions-answerlattice/src/answerlattice/aiProviderHealth.ts` | Daily Answerlattice Gemini health check |

### Health Records

| Product | Scheduler | Health Record |
| --- | --- | --- |
| MenuList | `menulistMaintenanceScheduler` task `ai_provider_health_check` | `_health/aiProvider_gemini` |
| Answerlattice | `answerlatticeMasterScheduler` task `ai_provider_health_check` | `platformSummary/answerlatticeAiProviderHealth` |

### Environment Variables

| Variable          | Required | Where                     |
| ----------------- | -------- | ------------------------- |
| `GEMINI_AI_KEY`   | ✅ Yes   | Vercel + Firebase Secrets |
| `GEMINI_AI_KEY_2` | Optional | Vercel + Firebase Secrets |
| `GEMINI_AI_KEY_3` | Optional | Vercel + Firebase Secrets |
| `GEMINI_AI_KEY_4` | Optional | Vercel + Firebase Secrets |
| `ANSWERLATTICE_GEMINI_AI_KEY` | ✅ Yes for Answerlattice Functions AI | Answerlattice Firebase Secrets |
| `ANSWERLATTICE_GEMINI_AI_KEY_2` | Optional | Answerlattice Firebase Secrets |
| `ANSWERLATTICE_GEMINI_AI_KEY_3` | Optional | Answerlattice Firebase Secrets |
| `ANSWERLATTICE_GEMINI_AI_KEY_4` | Optional | Answerlattice Firebase Secrets |

Each environment must use its own key values. Do not share the production key with local or staging. Restrict keys to the Gemini API and keep browser code behind server routes or Firebase Functions.

Missing-key behavior is fail-closed. If no Gemini key is configured, the app-route and Cloud Functions AI gateways throw the stable `AI_PROVIDER_CONFIG_MISSING` error before any provider call instead of constructing an empty-key client. This keeps startup safe while making secret misconfiguration explicit and local to the gateway.

Answerlattice Cloud Functions do not use MenuList's `GEMINI_AI_KEY` pool. They use the same `@google/genai` API-key gateway shape with Answerlattice-owned `ANSWERLATTICE_GEMINI_AI_KEY*` secrets declared on AI scheduler, task, and callable functions. API-key mode has no provider-region override.

### Accounting Guardrails

Billable AI routes must finalize successful provider output through `src/lib/ai/accounting.ts`. The finalizer writes operation telemetry with Admin SDK access, then consumes paid capacity. Operation logging is best-effort; credit consumption is not. `menulistAiOperations/{tId}/{sId}` is read-scoped to the store/admin and write-denied to browser clients.

Every declared `AI_ACTIONS_TYPES` value must be present in both `AI_UNIT_COSTS` and `GEMINI_COST_USD`. Unknown AI actions throw during capacity/logging instead of defaulting to a free operation.

Regression command:

```bash
npm run verify:ai-accounting
```

---

_Last Updated: June 28, 2026_

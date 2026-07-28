# AI System Layer

**Feature:** Centralized AI Infrastructure for MenuList
**Status:** Source-implemented and hardened — not current launch or deploy certification
**Source:** ChatGPT extraction hardening session (Mar 2026) → Cascade codebase validation
**Last Updated:** July 26, 2026

> **Launch boundary:** Not current launch certification or deploy approval. This document records source-gated AI System Layer evidence only. Current MenuList approval still requires the active production-readiness audit, External Certification Runbook evidence, `npm run verify:production-readiness-local`, `npm run verify:ai-accounting`, `npm run verify:functions-deploy-preflight`, `npm run verify:menu-extraction-pipeline`, scoped Firebase deploy evidence for affected MenuList Functions, target Vercel deploy evidence for affected app routes, provider smoke with target-specific key/model/quota configuration, SAFE_MODE/rate-limit/accounting/provider-health smoke, authenticated browser/device QA for affected owner/platform surfaces, and production-host smoke. Answerlattice retains separate doctrine, credentials, Firebase target, billing/cost evidence, deploy approval, and release certification; this document cannot authorize an Answerlattice deploy or release.

---

## Overview

The AI System Layer is a centralized infrastructure that governs AI operations across MenuList and the shared Answerlattice paths that live in this repo. Instead of each feature calling Gemini independently with its own retry logic, rate limiting, and error handling, AI calls flow through a gateway plus shared model constants.

**Core principle:** AI is an expensive, rate-limited external resource. Treat it like a database — centralize access, control cost, and monitor health.

Production rule: API keys are failover and rotation credentials, not a quota scaling strategy. Google Gemini rate limits are enforced at the project/model tier, so production capacity must be handled with billing, quota monitoring, model choice, and provider health checks.

### 2026 provider migration register

| Workload | Active source | Stable candidate | Current action |
| --- | --- | --- | --- |
| Answerlattice query/article embeddings | `gemini-embedding-2` on `embedding` | Active source contract | Pre-launch single-vector contract; no legacy model, dual-write, migration task, or corpus backfill |
| Deterministic extraction, translation, summaries, structured JSON | `gemini-3.5-flash-lite` | Active source contract | Benchmark complete request cost, latency, schema validity, retries, and tool loops before changing an operation to another model |
| Complex reasoning and recovery/escalation | `gemini-3.6-flash` | Active selective contract | Keep selective; it is not the universal default |
| Balanced Gemini 3 text work | `gemini-3.5-flash` | Active explicit option | Use only where the operation deliberately selects the balanced model |
| High-volume image generation/editing | `gemini-3.1-flash-lite-image` | Active high-throughput contract | Use the shared generator adapter and retain explicit model accounting |
| Quality-sensitive image output | `gemini-3.1-flash-image` | Active quality contract | Reserve when output quality justifies the higher effective cost |

The model registry lives in `src/data/shared/geminiRuntime.ts` and is byte-identical in MenuList and Answerlattice Functions. The three gateways compile every `generateContent` request before retry/provider work. The compiler removes deprecated sampling fields from every admitted Gemini 3.x request and removes unsupported `candidateCount`; it rejects final prefilled model turns where disallowed, `thinkingBudget`, invalid `thinkingLevel`, incomplete function responses, unstable aliases, and unknown model IDs. It does not mutate the caller's request.

`@google/genai` is pinned at 2.13.0 in the root, MenuList Functions, and Answerlattice Functions. Existing mature `generateContent` paths remain on that supported interface; there is no blanket Interactions API rewrite. A future Interactions adoption requires a separate workload benchmark and persistence/tool-loop design rather than a transport-only change.

Image operation accounting records the concrete provider model ID instead of the internal `GEMINI` adapter key. All three Cloud Functions packages declare Node.js 22 and pin stable Firebase Functions 7.3.0; Answerlattice CI pins Firebase CLI 15.24.0.

Firebase AI Logic one-time App Check tokens do not map to the current expensive-operation architecture: MenuList and Answerlattice AI calls are server-mediated by authenticated/rate-limited Next routes or dedicated Cloud Functions, and the repository has no client-side Firebase AI Logic call path. Do not add a second client-exposed AI transport solely to use replay protection. Cloud Storage hierarchical namespace is also not configured in the repository's Firebase Storage setup; the empty-folder lifecycle change has no source action unless a bucket is later enabled outside this repo.

July 5 Weekly narrative output boundary: `/api/analytics/weekly-narrative/generate-local` now normalizes AI-generated `narrative`, `highlights`, and `recommendations` before writing `insights/{tId}/stores/{sId}/ai/weekly`. The route strips control/template characters, collapses whitespace, caps the narrative and list items, keeps the existing deterministic fallback narrative, and returns only the existing count/length success envelope.

July 5 text AI operation response summaries boundary: text/design AI routes now pass pre-summarized `clientResponse` payloads into AI accounting. Descriptions, translations, new-item metadata, business copy, SEO copy, Review Reply, Campaign Caption, and Menu Card Export design-advisor operation rows keep count/shape summaries with `responseSummaryKind` markers instead of generated owner-facing text objects. Valid owner API responses still return the generated content.

July 5 transaction DB local error boundary: `/api/business-copy`, `/api/descriptions`, `/api/image-editing`, `/api/new-item-metadata`, `/api/seo`, and `/api/translations` now write bounded source-error metadata for local `TRANSACTION_DB_ERROR` logs instead of raw accounting exception objects. The existing `logAIRouteFailure(...)` diagnostics, rethrow behavior, successful accounting finalizer, credit consumption, and owner-facing output are unchanged.

July 5 response-parse boundary: `/api/campaigns/caption` now logs unrecoverable provider-response parse failures through capped `campaign_caption_provider_response_parse_failed` diagnostics with fixed `return_caption_generation_failed` policy. Fenced JSON and extractable object-fragment JSON are accepted before the fail-closed caption failure path, and non-object provider output now fails closed. AI accounting input now carries bounded prompt summaries and caption response summaries instead of raw prompt item/business fields or generated caption objects. Raw provider response text, prompt item/business copy, generated captions, response preview text, raw prompt item/business fields, and exception text are not logged.

July 5 response-parse boundary: `/api/new-item-metadata` now logs unrecoverable provider-response parse failures through capped `new_item_metadata_provider_response_parse_failed` diagnostics with fixed `return_metadata_generation_failed` policy. Fenced JSON and extractable object-fragment JSON are accepted before the existing fail-closed metadata failure path. Local response logs record response presence/length/usage metadata only, and AI accounting input now carries bounded item/language summaries instead of raw prompt item/language payloads. Raw provider response text, prompt item/language copy, generated metadata, response preview text, full provider response objects, and exception text are not logged.

July 5 image route boundary: `/api/image-generation`, `/api/image-editing`, `/api/image-generation/batch-trigger`, and `/api/image-generation/batch-generation` now keep local route logs and AI operation input bounded. Local logs use request/response/transaction/task summaries, batch-trigger prompt-block responses return counts only, and operation rows use `itemSummary` plus `generationConfigSummary` instead of raw image item details or generation config payloads. Raw prompts, item descriptions/categories/attributes, reference image URLs, generated base64 images, raw item ID arrays, full provider responses, full transaction objects, and raw image accounting input payloads are not written by those paths.

July 5 response-parse boundary: `/api/seo` now logs unrecoverable provider-response parse failures through capped `seo_provider_response_parse_failed` diagnostics with fixed `return_seo_generation_failed` policy. Fenced JSON and extractable object-fragment JSON are accepted before the existing fail-closed SEO failure path. Local accounting-error logs record bounded transaction/result summaries instead of full transaction objects. Raw provider response text, prompt/menu/store copy, generated metadata, store/tenant/user IDs, response preview text, full transaction objects, and exception text are not logged.

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

### Current State (✅ Updated July 26, 2026)

AI call sites use the gateway, shared request compiler, and explicit stable model constants. Active source code no longer calls Gemini 2.0 or 2.5 models. Retired SignalDesk IDs exist only in the persisted-route migration registry and cannot reach the provider adapter.

June 28 hardening: frontend and Cloud Functions AI gateways classify rate limits, hard quota, and retryable provider errors from structured source code/name/status/quota/limit indicators only. Shared app-route provider helpers use the same structured retry/rate-limit posture. They do not parse raw provider `message` fields for retry decisions or diagnostics.

| AI Feature              | SDK             | Model                                | Key Rotation | Retry           | Rate Limiting |
| ----------------------- | --------------- | ------------------------------------ | ------------ | --------------- | ------------- |
| Menu Extraction         | `@google/genai` | `gemini-3.5-flash-lite`              | ✅ Gateway   | ✅ Gateway + CB | ✅ Upstash    |
| Feedback Analysis       | `@google/genai` | `gemini-3.5-flash-lite`              | Dormant compatibility source | Gateway if deliberately invoked | Not scheduled |
| Owner Dashboard Summary | `@google/genai` | `gemini-3.5-flash-lite`              | ✅ Gateway   | ✅ Gateway      | ❌ Nightly    |
| KB Quality Analysis     | —               | —                                    | Retired MenuList source | Source absent | Answerlattice owns current truth |
| Weekly Narrative        | `@google/genai` | `gemini-3.5-flash-lite`              | Dormant compatibility source | Gateway if deliberately invoked | Not scheduled |
| KB Generation           | `@google/genai` | `gemini-3.6-flash`                   | ✅ Gateway   | ✅ Gateway      | ❌ None       |
| Embeddings (CF)         | `@google/genai` | `gemini-embedding-2`                 | ✅ Gateway   | ✅ Gateway      | ❌ None       |
| Help Center Search      | `@google/genai` | `gemini-3.5-flash-lite`              | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Descriptions            | `@google/genai` | `gemini-3.5-flash-lite`              | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Translations            | `@google/genai` | `gemini-3.5-flash-lite`              | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Image Generation        | `@google/genai` | `gemini-3.1-flash-image`             | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Image Editing           | `@google/genai` | `gemini-3.1-flash-image`             | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| New Item Metadata       | `@google/genai` | `gemini-3.5-flash-lite`              | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Campaign Captions       | `@google/genai` | `gemini-3.5-flash-lite`              | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Review Drafts           | `@google/genai` | `gemini-3.5-flash-lite`              | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Answerlattice Translate | `@google/genai` | `gemini-3.5-flash-lite`              | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Public Create Menu      | `@google/genai` | varies                               | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Answerlattice Embeddings | `@google/genai` | `gemini-embedding-2`                 | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |

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
| Default model         | `gemini-3.5-flash-lite`          | High-throughput structured default; complex recovery uses `gemini-3.6-flash` |
| Request compatibility | Shared compile-before-call guard | Stops known Gemini 3 contract failures before paid provider work |
| Key pool              | **✅ IMPLEMENTED** (1-4 keys)    | Auto-discovers available keys from env vars                 |
| Proxy approach        | Transparent (same interface)     | Zero changes to 19 call sites                               |
| Production key policy | Separate restricted keys per environment | Limits blast radius; keys are not exposed client-side       |
| Quota policy          | Per Google project/model tier    | Extra keys are for failover/rotation, not unlimited quota   |
| Model names           | Stable names only for production | No `latest`, preview, or experimental aliases in active prod paths |
| Answerlattice embeddings | `gemini-embedding-2` on `embedding` | Registry-locked query/document formatting and cache key `gemini-embedding-2:768:v1`; the pre-launch codebase has no alternate vector space or backfill path |
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

Billable MenuList AI routes must reserve exact positive integer units through `reserveAiCapacity()` before provider work and finalize successful output through `src/lib/ai/accounting.ts` with that reservation. The reservation transaction debits current subscription buckets and writes a hidden operation shell atomically; settlement promotes that same shell into operation telemetry without a second debit. Provider/pre-settlement failure refunds the exact charged buckets idempotently. Free platform-absorbed actions remain zero-unit and do not reserve. `menulistAiOperations/{tId}/{sId}` is read-scoped to the store/admin and write-denied to browser clients.

Every declared `AI_ACTIONS_TYPES` value must be present in both `AI_UNIT_COSTS` and `GEMINI_COST_USD`. Unknown AI actions throw during capacity/logging instead of defaulting to a free operation.

Business Copy provider-response parsing remains fail-closed and observable. `/api/business-copy` still retries once when Gemini returns unrecoverable invalid JSON, and an unrecoverable retry still returns the existing generic owner-safe failure without writing a usable AI operation row or consuming credits. Empty, malformed non-object, or malformed object-fragment provider responses log capped `business_copy_provider_response_parse_failed` diagnostics with fixed `retry_once_then_return_business_copy_failed` policy and response-shape metadata only. Raw provider response text, prompt/menu/store copy, generated copy, store/tenant/user IDs, response preview text, and exception text are not logged.

Regression command:

```bash
npm run verify:ai-accounting
```

---

_Document Status: Source-implemented and hardened; not current launch or deploy certification._
_Last Updated: July 26, 2026_

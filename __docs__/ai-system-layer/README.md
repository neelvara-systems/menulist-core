# AI System Layer

**Feature:** Centralized AI Infrastructure for MenuList  
**Status:** ✅ PHASE 1 COMPLETE — Key rotation + AI Gateway implemented globally  
**Source:** ChatGPT extraction hardening session (Mar 2026) → Cascade codebase validation  
**Last Updated:** June 2, 2026

---

## Overview

The AI System Layer is a centralized infrastructure that governs ALL AI operations across MenuList. Instead of each feature calling Gemini independently with its own retry logic, rate limiting, and error handling, all AI calls flow through a single gateway.

**Core principle:** AI is an expensive, rate-limited external resource. Treat it like a database — centralize access, control cost, and monitor health.

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

### Current State (✅ Implemented March 13, 2026)

All 18 AI call sites (11 frontend + 7 CF) now flow through the AI Gateway with multi-key rotation:

| AI Feature              | SDK             | Model                                | Key Rotation | Retry           | Rate Limiting |
| ----------------------- | --------------- | ------------------------------------ | ------------ | --------------- | ------------- |
| Menu Extraction         | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway + CB | ✅ Upstash    |
| Feedback Analysis       | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ❌ Nightly    |
| Owner Dashboard Summary | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ❌ Nightly    |
| KB Quality Analysis     | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ❌ Nightly    |
| Weekly Narrative        | `@google/genai` | varies                               | ✅ Gateway   | ✅ Gateway      | ❌ Nightly    |
| KB Generation           | `@google/genai` | `gemini-2.5-pro`                     | ✅ Gateway   | ✅ Gateway      | ❌ None       |
| Embeddings (CF)         | `@google/genai` | `text-embedding-004`                 | ✅ Gateway   | ✅ Gateway      | ❌ None       |
| Help Center Search      | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Descriptions            | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Translations            | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Image Generation        | `@google/genai` | `gemini-2.5-flash-preview-05-20`     | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Image Editing           | `@google/genai` | `gemini-2.0-flash-preview-image-gen` | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| New Item Metadata       | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Campaign Captions       | `@google/genai` | `gemini-2.5-flash`                   | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Answerlattice Translate      | `@google/genai` | varies                               | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Public Create Menu      | `@google/genai` | varies                               | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |
| Embeddings (Frontend)   | `@google/genai` | `text-embedding-004`                 | ✅ Gateway   | ✅ Gateway      | ✅ Upstash    |

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
| Gateway scope         | **BOTH frontend + CF** (Phase 1) | All AI calls need key rotation protection                   |
| SDK standardization   | `@google/genai` (new SDK)        | Already used by extraction, newer API                       |
| Default model         | `gemini-2.5-flash`               | Cost-effective, already proven in extraction                |
| Key pool              | **✅ IMPLEMENTED** (1-4 keys)    | Auto-discovers available keys from env vars                 |
| Proxy approach        | Transparent (same interface)     | Zero changes to 19 call sites                               |
| Task queue            | Phase 2 (not MVP)                | Extraction already has job queue; others don't need one yet |
| Knowledge reuse layer | Phase 3                          | Needs real data volume before caching is valuable           |

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
| `src/lib/google/genAi/aiGateway.ts`  | AI Gateway — retry + key rotation proxy       |
| `src/lib/google/genAi/keyManager.ts` | Key Manager — pool + health tracking          |

### Cloud Functions (functions/src/)

| File                              | Purpose                                       |
| --------------------------------- | --------------------------------------------- |
| `functions/src/genAiClient.ts`    | Entry point — exports `genAIClient` (gateway) |
| `functions/src/ai/aiGateway.ts`   | AI Gateway — retry + key rotation proxy       |
| `functions/src/ai/keyManager.ts`  | Key Manager — pool + health tracking          |
| `functions/src/config/secrets.ts` | Secret names + groups (4 AI key slots)        |

### Environment Variables

| Variable          | Required | Where                     |
| ----------------- | -------- | ------------------------- |
| `GEMINI_AI_KEY`   | ✅ Yes   | Vercel + Firebase Secrets |
| `GEMINI_AI_KEY_2` | Optional | Vercel + Firebase Secrets |
| `GEMINI_AI_KEY_3` | Optional | Vercel + Firebase Secrets |
| `GEMINI_AI_KEY_4` | Optional | Vercel + Firebase Secrets |

### Accounting Guardrails

Billable AI routes must finalize successful provider output through `src/lib/ai/accounting.ts`. The finalizer writes operation telemetry with Admin SDK access, then consumes paid capacity. Operation logging is best-effort; credit consumption is not. `menulistAiOperations/{tId}/{sId}` is read-scoped to the store/admin and write-denied to browser clients.

Every declared `AI_ACTIONS_TYPES` value must be present in both `AI_UNIT_COSTS` and `GEMINI_COST_USD`. Unknown AI actions throw during capacity/logging instead of defaulting to a free operation.

Regression command:

```bash
npm run verify:ai-accounting
```

---

_Last Updated: June 2, 2026_

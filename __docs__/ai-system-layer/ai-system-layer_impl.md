# AI System Layer — Implementation

**Feature:** Centralized AI Infrastructure for MenuList  
**Status:** ✅ PRODUCTION HARDENING ACTIVE — Gateway, model constants, scheduled health checks
**Last Updated:** June 25, 2026

---

## Codebase Analysis — Current AI Architecture

### Solved: SDK Standardization (✅ Complete)

All Cloud Functions now use a single SDK (`@google/genai`) via the AI Gateway.
The legacy `@google/generative-ai` SDK has been fully removed from the codebase.

### Solved: Consistent Protection (✅ Complete)

All AI calls now flow through the AI Gateway with key rotation and retry.

| Feature           | Rate Limit | Retry         | Circuit Breaker | Cost Tracking    |
| ----------------- | ---------- | ------------- | --------------- | ---------------- |
| Menu Extraction   | ✅ Upstash | ✅ Gateway+CB | ✅ Full         | ✅ AI Operations |
| Feedback Analysis | ❌ Nightly | ✅ Gateway    | ❌              | ❌               |
| Owner Dashboard   | ❌ Nightly | ✅ Gateway    | ❌              | ❌               |
| Weekly Narrative  | ❌ Nightly | ✅ Gateway    | ❌              | ❌               |
| KB Quality        | ❌ Nightly | ✅ Gateway    | ❌              | ❌               |

---

## File Structure

### New Files (Implemented March 13, 2026)

```
src/lib/google/genAi/
├── index.ts                # Entry point — exports genAIClient (gateway)
├── aiGateway.ts            # AI Gateway — retry + key rotation proxy
└── keyManager.ts           # Key Manager — pool + health tracking

functions/src/
├── genAiClient.ts          # Entry point — exports genAIClient (gateway)
├── ai/
│   ├── aiGateway.ts          # AI Gateway — retry + key rotation proxy
│   └── keyManager.ts         # Key Manager — pool + health tracking
├── config/
│   └── secrets.ts            # (MODIFIED) Added GEMINI_AI_KEY_2/_3/_4
├── lib/
│   └── circuitBreaker.ts     # (EXISTING) Reused as-is by extraction
```

### Files NOT Modified (Zero call-site changes)

All 17 AI call sites continue to import `genAIClient` from the same path.
The gateway is a transparent proxy with the same interface as `GoogleGenAI`.

**Frontend (11 files):**

- `src/app/api/descriptions/route.ts`
- `src/app/api/translations/route.ts`
- `src/app/api/image-generation/route.ts`
- `src/app/api/image-generation/batch-generation/route.ts`
- `src/app/api/image-editing/route.ts`
- `src/app/api/new-item-metadata/route.ts`
- `src/app/api/campaigns/caption/route.ts`
- `src/app/api/answerlattice/translate/route.ts`
- `src/app/api/analytics/weekly-narrative/generate-local/route.ts`
- `src/app/api/public/create-menu/route.ts`
- `src/lib/vectorEmbeddings/index.ts`

**Cloud Functions (7 files):**

- `functions/src/logic/processMenuImages.ts`
- `functions/src/services/gemini/feedbackAnalysis.ts`
- `functions/src/services/gemini/ownerDashboardSummary.ts`
- `functions/src/services/gemini/weeklyNarrative.ts`
- `functions/src/services/gemini/kbQuality.ts`
- `functions/src/utils/aiUtils.ts`
- `functions/src/messagingOnboarding/assetIntelligence.ts`

---

## Key Components (Implemented)

### 1. Key Manager (`keyManager.ts`)

Manages a pool of 1-4 API keys with health tracking.

```typescript
// Key discovery from environment variables
const KEY_ENV_VARS = [
  "GEMINI_AI_KEY", // Required (primary)
  "GEMINI_AI_KEY_2", // Optional
  "GEMINI_AI_KEY_3", // Optional
  "GEMINI_AI_KEY_4", // Optional
];

class KeyManager {
  getClient(): GoogleGenAI; // Returns current healthy client
  markCurrentKeyRateLimited(): void; // Triggers rotation + cooldown
  markCurrentKeySuccess(): void; // Resets consecutive failure counter
  hasAlternativeKeys(): boolean; // Are there other non-cooled-down keys?
  getStats(): KeyManagerStats; // For monitoring
}
```

**Cooldown strategy:** Exponential — 60s → 120s → 240s → capped at 5min per key.
On success, the consecutive failure counter resets to 0.

### 2. AI Gateway (`aiGateway.ts`)

Transparent proxy that matches the `GoogleGenAI` interface.

```typescript
class AIGateway {
  // Same interface as GoogleGenAI—zero call-site changes needed
  get models() {
    return {
      generateContent: (config) =>
        this.executeWithRetry("generateContent", config),
      embedContent: (config) => this.executeWithRetry("embedContent", config),
      generateImages: (config) =>
        this.executeWithRetry("generateImages", config),
    };
  }
  get files() {
    return {
      upload: (config) => this.executeWithRetry("fileUpload", config),
    };
  }
}
```

**Retry strategy (6 max attempts):**

- 429 (rate limit) + multiple keys → rotate key, retry **immediately**
- 429 (rate limit) + single key → exponential backoff + retry
- 5xx (server error) → exponential backoff + retry
- 4xx (client error, non-429) → fail immediately
- All attempts exhausted → throw last error

### 3. Entry Points (genAIClient exports)

Both frontend and CF export the gateway as `genAIClient`:

```typescript
// src/lib/google/genAi/index.ts (frontend)
import { createAIGateway } from "./aiGateway";
import { keyManager } from "./keyManager";
export const genAIClient = createAIGateway(keyManager);

// functions/src/genAiClient.ts (Cloud Functions)
import { createAIGateway } from "./ai/aiGateway";
import { keyManager } from "./ai/keyManager";
export const genAIClient = createAIGateway(keyManager);
```

### 4. Existing Circuit Breaker (Unchanged)

The extraction pipeline's `circuitBreaker.ts` + `retryWithBackoff()` still
wrap the gateway call in `processMenuImages.ts`. This gives extraction
**triple protection**: gateway retry → retryWithBackoff → circuit breaker.

---

## Migration Strategy (Completed)

The transparent proxy approach eliminated the need for per-feature migration.
All 19 call sites automatically use the gateway because `genAIClient` now
exports the gateway instead of a raw `GoogleGenAI` instance.

```
BEFORE (direct):
  route.ts → genAIClient (GoogleGenAI) → Gemini API

AFTER (gateway):
  route.ts → genAIClient (AIGateway) → KeyManager → GoogleGenAI → Gemini API
                                         └─ On 429: rotate key + retry
                                         └─ On 5xx: backoff + retry
```

Each feature keeps its own:

- Prompt construction
- Input formatting
- Response parsing
- Error-specific handling

Gateway handles:

- Key rotation on rate limits
- Retry with exponential backoff
- Key health tracking

---

## Feature Flag

No feature flag needed. The gateway is always active:

- With 1 key: acts as a retry handler (exponential backoff on errors)
- With 2+ keys: full key rotation + retry on rate limits

The behavior is determined by how many keys are configured in environment variables.
Adding more keys is a deployment config change, not a code change.

---

## Constants

```typescript
// functions/src/constants/ai.ts
export const AI_MODEL = "gemini-2.5-flash";
export const OWNER_ANALYTICS_AI_MODEL = "gemini-2.5-flash-lite";
export const AI_ADVANCED_MODEL = "gemini-2.5-pro";
export const AI_EMBEDDING_MODEL = "text-embedding-004";
export const EXTRACTION_PROMPT_VERSION = "parallel_v2";
export const AI_OPERATIONS_COLLECTION = "MENULIST_AI_OPERATIONS";
export const CIRCUIT_BREAKER_CONFIG = {
  name: "gemini-ai",
  failureThreshold: 5,
  resetTimeout: 30000,
  halfOpenRequests: 3,
};
```

Application routes use `src/constants/AI/models.ts`. Answerlattice app routes use
`src/constants/answerlattice/ai.ts`, and Answerlattice Functions use
`functions-answerlattice/src/constants/ai.ts`.

Production model policy:

- Stable model ids only in production paths.
- No `latest`, preview, experimental, or Gemini 2.0 Flash ids in active source.
- Keep Answerlattice RAG on `gemini-embedding-001` until a planned re-embed and
  index migration is executed.
- Frontier stable constants can exist in `src/constants/AI/models.ts`, but a
  workload should move to them only after prompt/output regression checks.

## Provider Health Checks

MenuList runs a daily health task through the existing maintenance scheduler:

```text
functions/src/schedulers/menulistMaintenanceScheduler.ts
  task: ai_provider_health_check
  writes: _health/aiProvider_gemini
```

Answerlattice runs a matching daily task through its master scheduler:

```text
functions-answerlattice/src/answerlattice/answerlatticeMasterScheduler.ts
  task: ai_provider_health_check
  writes: platformSummary/answerlatticeAiProviderHealth
```

Both tasks perform a small Gemini request, record latency/status/model metadata,
and throw on failure so the existing scheduler alert path can report the issue.

---

## Cost Tracking (Current State)

Extraction cost tracking uses the existing `MENULIST_AI_OPERATIONS` collection (1 doc per extraction with token usage, credits, charges).

**Still deferred:**

- `aiUsageLog` collection (cross-feature cost tracking) — deferred to Phase 2
- `AI_TASK_TYPES` constant — deferred to Phase 2
- `AI_GLOBAL_RATE_LIMIT` constant — deferred to Phase 2
- Per-feature cost tracking beyond extraction — deferred to Phase 2

---

## SDK Standardization (✅ COMPLETE)

All Cloud Functions have been migrated to `@google/genai` via the gateway.
The legacy `@google/generative-ai` package has been fully removed.

```
functions/src/genAiClient.ts → AI Gateway (exports genAIClient)
functions/src/ai/aiGateway.ts → Retry + key rotation proxy
functions/src/ai/keyManager.ts → Pool of 1-4 GoogleGenAI clients
functions/src/services/gemini/*.ts → All import genAIClient from ../genAiClient
```

---

## Validation Checklist

| Requirement                | Implementation                         | Location                                   | Status |
| -------------------------- | -------------------------------------- | ------------------------------------------ | ------ |
| AI Gateway (transparent)   | `createAIGateway()` proxy              | `functions/src/ai/aiGateway.ts`            | ✅     |
| Key Manager                | Pool of 1-4 keys with health tracking  | `functions/src/ai/keyManager.ts`           | ✅     |
| Frontend Gateway           | Same transparent proxy                 | `src/lib/google/genAi/aiGateway.ts`        | ✅     |
| Frontend Key Manager       | Same pool + health logic               | `src/lib/google/genAi/keyManager.ts`       | ✅     |
| SDK migration              | All CF use `@google/genai` via gateway | `functions/src/services/gemini/*.ts`       | ✅     |
| Extraction unchanged       | Zero behavioral change                 | `functions/src/logic/processMenuImages.ts` | ✅     |
| Circuit breaker reuse      | Existing singleton                     | `functions/src/lib/circuitBreaker.ts`      | ✅     |
| Retry handler reuse        | Existing function                      | `functions/src/logic/processMenuImages.ts` | ✅     |
| Cross-feature cost tracker | `aiUsageLog` collection                | —                                          | 📝 P2  |
| Model constants            | Centralized per product/runtime         | `src/constants/AI/models.ts`, `src/constants/answerlattice/ai.ts`, `functions/src/constants/ai.ts`, `functions-answerlattice/src/constants/ai.ts` | ✅ |
| Global rate limiter        | Cross-feature request throttle         | —                                          | 📝 P2  |
| MenuList provider health   | Daily Gemini smoke task                | `functions/src/schedulers/aiProviderHealth.ts` | ✅ |
| Answerlattice provider health | Daily Gemini smoke task             | `functions-answerlattice/src/answerlattice/aiProviderHealth.ts` | ✅ |

---

## Testing Guide

### Quick Tests

| Test             | Steps                                   | Expected                             |
| ---------------- | --------------------------------------- | ------------------------------------ |
| Gateway direct   | Call a guarded AI route or scheduler task with a small prompt | Response returned through `genAIClient` |
| Route rate limiting | Fire repeated guarded app-route requests in staging | Requests over the limit are blocked by the route guard |
| Circuit breaker  | Simulate 5 failures                     | Circuit opens, fast-fail for 30s     |
| Cost tracking    | Process one extraction                  | Usage record in `MENULIST_AI_OPERATIONS` |
| Provider health  | Run scheduler health task               | Latest status doc updates and failures alert through scheduler path |
| SDK migration    | Run feedback analysis                   | Same results through `@google/genai` |

---

## Disagreements with ChatGPT

| ChatGPT Suggestion                       | Our Decision | Reason                                                                                      |
| ---------------------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| "Build AI Task Queue for all features"   | **DEFER**    | Only extraction needs async queue. Nightly features run in scheduler (already queued).      |
| "API Key Pool with rotation"             | **IMPLEMENTED** | Useful for leak response and transient failover; not a way to bypass per-project quotas. |
| "Translation memory + description cache" | **PHASE 3**  | Needs real data volume (1000+ menus) before caching provides value.                         |
| "Worker pools with priority system"      | **REJECT**   | Over-engineering. Cloud Functions scale automatically. Priority handled by scheduler order. |
| "Queue backpressure"                     | **REJECT**   | Not needed at current scale. Rate limiter handles this.                                     |
| "AI request fingerprint caching"         | **PHASE 2**  | Valid for repeated operations but requires careful invalidation logic.                      |

---

_Document Status: ✅ PRODUCTION HARDENING ACTIVE — Gateway, rotation, constants, and health checks live_
_Last Updated: June 25, 2026_

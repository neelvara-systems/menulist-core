# AI System Layer — Implementation

**Feature:** Centralized AI Infrastructure for MenuList
**Status:** ✅ PRODUCTION HARDENING ACTIVE — Gateway, model constants, scheduled health checks
**Last Updated:** July 1, 2026

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

### Solved: Capacity Exhaustion Handoff Diagnostics (✅ Complete)

`src/lib/ai/capacityCheck.ts` still consumes subscription credits through the existing subscription transaction and still sends the `CREDITS_EXHAUSTED` lifecycle message as fire-and-forget after both monthly and top-up balances reach zero. Failed lifecycle message imports or sends now use bounded runtime diagnostics (`ai_capacity_credits_exhausted_lifecycle_message_*`) with units and identifier presence/length metadata only. Capacity math, subscription writes, and owner-facing 402 behavior are unchanged.

### Solved: Protected Owner AI Route RBAC (Complete)

Protected owner AI routes now run `requireAnyStorePermission()` before expensive work. Menu text routes use `canGenerateDescriptions`, image routes use `canGenerateImages`, public-presence copy routes use `canManagePublicPresence` or `canManageStore`, campaign/Menu Card routes use the existing menu output permissions, AI pack status uses `canAccessBilling`, and weekly narrative uses `canViewAnalytics`. Body-based routes validate the bounded request first, then check permission before outlet policy, capacity, provider, media-fetch, task fanout, analytics reads, insight writes, or accounting work.

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
  hasConfiguredKeys(): boolean; // Is at least one real key configured?
  getStats(): KeyManagerStats; // For monitoring
}
```

**Cooldown strategy:** Exponential — 60s → 120s → 240s → capped at 5min per key.
On success, the consecutive failure counter resets to 0.

**Missing-key behavior:** the key manager does not create an empty-key client. If no Gemini key exists, `getClient()` throws `AI_PROVIDER_CONFIG_MISSING`, and the AI gateway fails before provider I/O with bounded diagnostics.

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

**Diagnostic rule:** gateway logs for retry, key rotation, hard-quota fast-fail,
and exhausted attempts use fixed local messages plus method, attempt count,
delay, key-count, and source error name/code/status metadata only. Raw Gemini
provider messages and raw provider detail JSON must not be emitted from gateway
diagnostics. Route-level Gemini diagnostics also record only source error
name/code/status, message/stack presence, nested detail counts, and response
text lengths; they must not return raw provider messages, nested detail payloads,
stack previews, or response text previews. `npm run verify:ai-accounting` guards
both gateway mirrors and the shared route diagnostic helper.

**Classification rule:** frontend and Cloud Functions gateways derive rate-limit,
hard-quota, and retryable-provider decisions from structured source error
code/name/status/quota/limit indicators only. They must not parse raw provider
`message` fields, nested provider message fields, or raw provider detail JSON to
decide retries.

`src/lib/ai/providerErrors.ts` follows the same rule for app-route rate-limit
responses used by Help Center, widget search, article embedding, Answerlattice
translation, and FAQ generation routes. `retryAfterSeconds`, `retryAfter`,
`retryDelaySeconds`, or `retryDelay` may be honored when they are structured
fields; raw provider message text is not parsed for retry seconds.

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

Billable app-route AI usage uses `menulistAiOperations/{tId}/{sId}` and is exposed to owners through the protected `/api/ai-operations` transaction-history route. That route preserves owner/platform field separation and logs read failures or rate-limit events with bounded tenant/store/user/action/cursor metadata only.

June 29 follow-up: `/api/ai-operations` and `/api/analytics/weekly-narrative/generate-local` now hash owner, tenant, and store limiter key material before calling the shared Upstash limiter. The route limits, `DATA_READ`/`BATCH_OPERATION` profiles, bounded diagnostics, session scope checks, weekly narrative Firestore queries, AI provider call, and accounting behavior are unchanged; raw user IDs, tenant IDs, and store IDs must not be stored in these limiter key names.

June 30 follow-up: `/api/analytics/weekly-narrative/generate-local` now normalizes stored chat-analytics metrics before they enter the weekly narrative prompt or fallback copy. Numeric counters are coerced to bounded non-negative values, top-question scanning is capped, category text is stripped of control/template characters and capped at 80 characters, and category totals use a null-prototype accumulator. This prevents malformed historical analytics docs from creating `NaN` math, prototype-key surprises, or oversized category text in the AI prompt while preserving the existing authenticated route, rate limit, SAFE_MODE, Gemini call, fallback narrative, Firestore write, and AI operation accounting contract.

June 30 follow-up: SEO and Business Copy prompt builders now normalize owner/stored text immediately before prompt interpolation. `src/app/api/seo/prompt.ts` and `src/app/api/business-copy/prompt.ts` preserve the same request schemas, provider calls, output schemas, capacity checks, and accounting, but strip control/template characters, normalize whitespace, cap scalar prompt text, cap list items, and cap list counts before including store/menu/public-presence/social fields in prompts. This is a prompt-boundary hardening layer on top of existing Zod request-size validation; it does not change the owner-facing generated-copy workflow or generated output contract.

June 30 follow-up: `/api/new-item-metadata` now passes the validated Zod payload into its prompt builder instead of switching back to `rawData.item`, `rawData.targetLang`, and `rawData.sourceLang` after validation. Attribute price strings are capped at 120 characters in `NewItemMetadataRequestSchema` while numeric prices must be finite, and missing business type context uses the neutral `unspecified` value instead of silently biasing the prompt toward restaurants. This preserves the same owner workflow, generated metadata contract, provider call, and accounting path, but prevents oversized or unvalidated raw request fields from entering the multilingual item prompt after validation has already succeeded.

June 30 follow-up: Menu Card Export's Pro/Premium design-advisor prompt now normalizes validated menu-summary and preflight-warning text immediately before provider serialization. `src/app/api/menu-card-export/design-advisor/prompt.ts` strips control/template characters, normalizes whitespace, caps scalar/list prompt text, caps category/warning scans, and serializes `promptPayload.sourceSummary`, `promptPayload.preflightWarnings`, and sanitized `sourceHash` instead of raw request objects. Existing auth, tenant access, plan gate, capacity check, provider call, recommendation schema, and AI accounting remain unchanged.

June 30 follow-up: Review Reply suggestions now normalize pasted review text and business type before prompt construction. `/api/reviews/suggest` strips control/template characters, normalizes whitespace, caps `businessType`, escapes sanitized review text with `JSON.stringify()`, uses sanitized business type for industry constraints and accounting metadata, and records sanitized prompt length. Existing disabled-feature gates, auth, tenant access, SAFE_MODE, rate limiting, AI capacity checks, Gemini fallback behavior, suggestion response shape, and AI accounting remain unchanged.

June 30 follow-up: `/api/translations` now validates translation input keys and values with explicit length caps before route admission, then serializes a prompt-only sanitized copy of `inputJson` instead of raw owner/menu strings. Translation identifiers are preserved exactly for response mapping, while values strip control/template characters, normalize whitespace, and cap at the same 2000-character text boundary before provider prompt construction. Existing auth, tenant access, linked-outlet policy, SAFE_MODE, rate limiting, capacity checks, Gemini call, fallback normalization, translation coverage accounting, and client persistence remain unchanged.

June 30 follow-up: `/api/image-editing` now rejects missing generated edit prompts before provider work, and the active image-editing prompt router normalizes owner prompt text plus item name/category/description placeholders before helper interpolation. The helper preserves the existing edit-feature routing and template instructions, but dynamic owner/menu strings now strip control/template characters, collapse whitespace, and stay within the existing schema caps before reaching the Gemini multimodal request. Existing auth, tenant/outlet policy, SAFE_MODE, rate limiting, capacity checks, media fetch guards, provider call shape, response handling, and AI accounting remain unchanged for valid edit requests.

June 30 follow-up: Campaign Caption prompt construction now normalizes item, description, price, category, business, and language fields before provider serialization, and campaign/surface context lookup uses safe module-level maps instead of dynamic raw map keys in the prompt builder. Existing `/api/campaigns/caption` auth, tenant check, bounded body, schema validation, SAFE_MODE, rate limiting, capacity checks, Gemini call, phrase guard, response shape, and AI accounting remain unchanged.

June 29 follow-up: the desktop `/transactions` page also uses fixed runtime diagnostics for transaction-list and project-name lookup failures (`ai_transactions_page_load_failed` and `ai_transactions_projects_load_failed`) with bounded filter/cursor/page metadata. Existing API reads, cursor pagination, owner-safe field filtering, project-name enrichment, and owner-visible failure copy are unchanged.

June 29 follow-up: `/api/ai-operations` now shapes platform responses through an explicit `PLATFORM_VISIBLE_FIELDS` allowlist instead of returning full operation documents to platform browsers. The allowlist keeps accounting audit fields such as model, token counts, owner charge, provider cost, margin, project/file IDs, and the owner-visible operation fields, but excludes raw provider response fields, generation config, token-usage internals, tenant/store/user IDs, and raw batch/provider payloads. The desktop and mobile transaction detail panels render the same accounting rows and owner summary, but no longer render full transaction JSON. Desktop image-processing transaction details also render extracted rows for all tenant types instead of using a B2B raw `clientResponse` JSON branch; the dedicated B2B project JSON editor remains the raw-data surface for technical B2B users.

June 30 follow-up: MenuList and Answerlattice AI-operation history DALs now parse `/api/ai-operations` and `/api/answerlattice/ai-operations` responses through a 512 KB bounded JSON reader and require the paginated `{ data, hasMore, lastVisibleDoc }` shape before returning transaction state. Rejected, malformed, oversized, or wrong-shape responses log bounded client diagnostics and fall back through the existing transaction-history failure path instead of silently normalizing a bad response into an empty result.

June 29 follow-up: `src/app/api/translations/route.ts` now passes the Gemini response object directly into `finalizeAiOperationAccounting()` instead of pre-stringifying the provider response in the route transaction object. The shared AI-operation serializer remains responsible for detailed-mode compaction, so translation operation rows keep usage metadata plus response-text presence/length only, and local development logs summarize provider response shape instead of receiving a route-built raw provider-response string.

June 29 follow-up: `src/services/ai/aiServiceDiagnostics.ts` now also owns `readAiServiceResponseJson()`, a bounded successful-response parser for shared owner AI clients. Item metadata, SEO, descriptions, menu translations, business-copy generation/localization, image generation/editing, and batch image trigger clients use route-specific byte caps plus `*_response_parse_failed` / `*_response_invalid` diagnostics before preserving existing capacity handling, balance sync, and owner fallback behavior.

June 30 follow-up: `src/services/ai/aiServiceDiagnostics.ts` now also owns `AI_SERVICE_ROUTE_REQUEST_OPTIONS`, the shared browser request policy for owner AI route handoffs. Item metadata, SEO, descriptions, menu translations, business-copy generation/localization, image generation/editing, batch image trigger, and Menu Card design-advisor clients use no-store cache policy, same-origin credentials, and manual redirect handling before capacity checks or bounded response parsing.

June 29 follow-up: `src/lib/search/helpCenterSearchResponse.ts` now owns the shared browser response parser for `/api/helpCenter/search-kb`. Help Chat and the legacy AI Search modal cap response JSON at 1MB and require `id`, `craftedAnswer`, and reference objects with article/category IDs before rendering or persisting assistant output. Malformed or oversized responses log `help_center_search_response_parse_failed`; invalid successful envelopes log `help_center_search_response_invalid`.

June 30 follow-up: the same helper now owns `HELP_CENTER_SEARCH_REQUEST_POLICY`, the shared browser request policy for authenticated Help Center search. Help Chat and the legacy AI Search modal use no-store cache, same-origin credentials, and manual redirect handling before the existing bounded response parser. Valid search route auth, Answerlattice retrieval, AI provider behavior, and accounting are unchanged.

## App Route Diagnostics

`src/lib/google/genAi/diagnostics.ts` now includes the shared `logAIRouteFailure()` and `getAIRouteLogContext()` helpers for MenuList app-route AI failures. The helper keeps source error name/code/status metadata, bounds route identifiers as presence/length fields, records safe numeric counts, and summarizes AI Gateway key stats without logging raw provider exceptions or per-key payloads.

June 30 follow-up: the same diagnostics module now exposes `getAIRouteSecurityContext()` for protected owner AI route security events. Business copy, campaign caption, descriptions, image generation/editing, batch image trigger, Menu Card design advisor, new-item metadata, review suggestion, SEO, and translation routes no longer spread raw `buildSecurityContext()` output into validation, tenant-scope, or outlet-policy `logger.security()` events. Description, translation, new-item metadata, and batch trigger validation now use bounded route metadata instead of raw language, item, project, or job snippets.

July 1 follow-up: business copy, campaign caption, descriptions, image generation/editing, batch image trigger, Menu Card design advisor, new-item metadata, SEO, translations, AI pack status, and weekly narrative now have server-side route permission gates matching their owner surface. The guard runs before capacity, provider, task fanout, analytics Firestore reads, insight writes, or accounting work.

July 1 follow-up: batch image trigger now preflights Cloud Tasks config readiness through `getImageGenerationTaskConfigStatus()` before AI capacity reads or enqueue fanout. Missing worker URL, queue id, project location, project id, or worker secret fails the existing batch job with owner-safe unavailable copy and stable diagnostics. Configured runs keep the existing worker secret header and Cloud Tasks flow.

June 29 follow-up: the desktop description-generation modal and shared description-generation utility now use fixed `menu_description_modal_generation_failed`, `ai_description_empty_response`, and `ai_description_file_generation_failed` diagnostics with bounded project/file/language/count metadata. Existing owner-visible copy, capacity handling, `/api/descriptions` calls, project persistence, multi-outlet governance filtering, and description merge behavior are unchanged.

Current migrated protected AI app-route family:

- `src/app/api/business-copy/route.ts`
- `src/app/api/campaigns/caption/route.ts`
- `src/app/api/descriptions/route.ts`
- `src/app/api/image-generation/batch-trigger/route.ts`
- `src/app/api/image-generation/route.ts`
- `src/app/api/image-generation/generators.ts`
- `src/app/api/image-editing/route.ts`
- `src/app/api/menu-card-export/design-advisor/route.ts`
- `src/app/api/reviews/suggest/route.ts`
- `src/app/api/seo/route.ts`
- `src/app/api/new-item-metadata/route.ts`
- `src/app/api/translations/route.ts`

These routes use stable failure codes for provider-call, parse, helper, non-object or retry failure, accounting, and top-level catch paths, with bounded warning context for retry/incomplete-response/partial-coverage branches. Media and design routes keep local development log behavior unchanged while production diagnostics record only counts, lengths, booleans, gateway stats, bounded security metadata, and source error name/code/status.

June 30 follow-up: `src/services/gemini/prompts/v1/campaignCaption.prompt.ts` now normalizes campaign caption prompt inputs immediately before interpolation. Item name, description, price, category, business name, and language strip control/template characters, normalize whitespace, and cap prompt lengths; campaign type and execution surface are clamped to the approved context/guideline maps. Existing `/api/campaigns/caption` auth, SAFE_MODE, rate limiting, bounded body admission, Zod schema, tenant check, capacity check, Gemini call, output phrase guard, response shape, and AI accounting remain unchanged.

**Current source contract:**

- `aiUsageLog` is not a live collection. Current extraction cost rows use `MENULIST_AI_OPERATIONS`.
- Billable app-route operation rows use `menulistAiOperations/{tId}/{sId}` through `src/lib/ai/operationLog.ts`.
- `AI_TASK_TYPES` and `AI_GLOBAL_RATE_LIMIT` are not live constants.
- Cross-feature cost visibility exists only where source paths write the current operation ledgers; do not imply a universal tracker.

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
| Operation ledgers          | Extraction and billable app-route accounting | `MENULIST_AI_OPERATIONS`, `menulistAiOperations/{tId}/{sId}` | ✅ |
| Model constants            | Centralized per product/runtime         | `src/constants/AI/models.ts`, `src/constants/answerlattice/ai.ts`, `functions/src/constants/ai.ts`, `functions-answerlattice/src/constants/ai.ts` | ✅ |
| Scoped AI route limiters   | Route/job guards for AI entry points   | `src/lib/rateLimit/configs.ts`, `functions/src/lib/rateLimit.ts` | ✅ |
| MenuList provider health   | Daily Gemini smoke task                | `functions/src/schedulers/aiProviderHealth.ts` | ✅ |
| Answerlattice provider health | Daily Gemini smoke task             | `functions-answerlattice/src/answerlattice/aiProviderHealth.ts` | ✅ |
| Gateway diagnostics        | Bounded retry/exhaustion metadata and structured retry classification | `src/lib/google/genAi/aiGateway.ts`, `functions/src/ai/aiGateway.ts` | ✅ |
| Provider error helper      | Structured rate-limit and retry-after detection | `src/lib/ai/providerErrors.ts` | ✅ |
| Route AI diagnostics       | Bounded provider metadata              | `src/lib/google/genAi/diagnostics.ts` | ✅ |

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
| "Build AI Task Queue for all features"   | **NOT CURRENT RUNTIME** | Only extraction needs async queue. Nightly features run in scheduler. |
| "API Key Pool with rotation"             | **IMPLEMENTED** | Useful for leak response and transient failover; not a way to bypass per-project quotas. |
| "Translation memory + description cache" | **CONDITIONAL CANDIDATE** | Not current runtime; requires source-backed volume evidence and invalidation design. |
| "Worker pools with priority system"      | **REJECT**   | Over-engineering. Cloud Functions scale automatically. Priority handled by scheduler order. |
| "Queue backpressure"                     | **REJECT**   | Not needed at current scale. Rate limiter handles this.                                     |
| "AI request fingerprint caching"         | **CONDITIONAL CANDIDATE** | Valid only with a separate invalidation design and source-backed demand evidence. |

---

_Document Status: ✅ PRODUCTION HARDENING ACTIVE — Gateway, rotation, constants, and health checks live_
_Last Updated: July 1, 2026_

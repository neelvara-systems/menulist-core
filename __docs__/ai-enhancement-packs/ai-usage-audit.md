# AI Usage Audit — Full System Map

> **Purpose**: Production-grade audit of every AI touchpoint across the MenuList codebase.
> **Goal**: Enable output/credit-based pricing + internal AI usage tracking with zero gaps.
> **Date**: February 9, 2026
> **Status**: Historical audit. See June 2 runtime status below for current implementation.

## June 2, 2026 Runtime Status

The original February audit found missing usage tracking across the billable AI routes. The current runtime has the implementation alignment in place:

| Area | Current status |
| --- | --- |
| Single image generation | Capacity check, operation log, unit cost, token/cost metadata, balance consumption |
| Batch image generation worker | Capacity check, operation log, unit cost, token/cost metadata, balance consumption, Cloud Tasks project-header guard |
| Image editing | Capacity check, operation log, unit cost, token/cost metadata, balance consumption |
| Description generation | Capacity check, operation log, unit cost, token/cost metadata, balance consumption |
| Translation | Capacity check, operation log, unit cost, token/cost metadata, balance consumption |
| New item metadata | Capacity check, operation log, unit cost, token/cost metadata, balance consumption |
| SEO/AEO and business copy | Capacity check, operation log, token/cost metadata; currently zero-unit setup actions |
| Campaign caption | Capacity check, operation log, unit cost, token/cost metadata, balance consumption |
| Review reply suggestion | Capacity check, operation log, unit cost, token/cost metadata, balance consumption |
| Menu intake identity preflight | Free setup operation; operation log, token/cost metadata, no owner balance consumption |
| Public create-menu extraction | Public/platform operation; operation log, token/cost metadata, no owner balance consumption |
| Weekly analytics narrative | Internal operation; operation log, token/cost metadata, no owner balance consumption |
| Help Center and widget search plus embeddings | Internal/public support/control-plane operation log, no owner balance consumption |
| Answerlattice translation | Internal Answerlattice operation log, no MenuList owner balance consumption |
| Cloud Functions menu-image processing | Operation log and token/cost metadata use the same `TOKENS_PER_CREDIT = 500` accounting basis as app routes |

Balance consumption now happens in `consumeAICapacity()` through a Firestore transaction. It deducts `monthlyCredits` first, then `topUpCredits`, and returns `remainingBalance` for desktop/mobile state sync.

June 2 hardening centralizes billable app-route accounting in `finalizeAiOperationAccounting()`. Operation logging is best-effort, credit consumption is mandatory for billable actions, browser writes to `menulistAiOperations` are denied, and unknown AI actions throw unless explicitly listed in both `AI_UNIT_COSTS` and `GEMINI_COST_USD`.

Cost optimization: Help Center and widget search write AI operation audit rows only when the shared search core actually reaches an AI provider (`image_query_generation`, `embedding_generation`, or `answer_generation`). Canonical hits, instant-cache hits, and ordinary cached answers do not create `menulistAiOperations` writes.

Rows below this status section are retained as February audit evidence. Any `COMMENTED OUT` or `ZERO TRACKING` labels below should be read as historical findings unless they are explicitly repeated in this June 2 runtime status section.

---

## Table of Contents

1. [Master AI Usage Map](#1-master-ai-usage-map)
2. [Feature-Wise Breakdown](#2-feature-wise-breakdown)
3. [Missing Tracking Points](#3-missing-tracking-points)
4. [Cost Risk Areas](#4-cost-risk-areas)
5. [Architecture Recommendation](#5-architecture-recommendation)
6. [Redundant or Waste Calls](#6-redundant-or-waste-calls)

---

## 1. MASTER AI USAGE MAP

### 1A. All Direct AI Model Calls — Frontend (Next.js API Routes)

| #   | API Route                                        | Function                        | Model                                       | Feature                              | Input Type                                    | Output Type                                          | Tracking Status  |
| --- | ------------------------------------------------ | ------------------------------- | ------------------------------------------- | ------------------------------------ | --------------------------------------------- | ---------------------------------------------------- | ---------------- |
| 1   | `/api/image-generation`                          | `generateGeminiImageViaFlash`   | `gemini-2.5-flash-image`            | Single image generation              | Text prompt + optional ref image              | Base64 image(s)                                      | ⚠️ COMMENTED OUT |
| 2   | `/api/image-generation`                          | `generateGeminiImageViaImagen3` | `imagen-3.0-generate-002`                   | Single image generation (Imagen)     | Text prompt                                   | Base64 image(s)                                      | ⚠️ COMMENTED OUT |
| 3   | `/api/image-generation/batch-generation`         | `generateGeminiImageViaFlash`   | `gemini-2.5-flash-image`            | Batch image generation               | Text prompt + optional ref image              | Base64 image(s) + upload to Storage                  | ⚠️ COMMENTED OUT |
| 4   | `/api/image-generation/batch-generation`         | `generateGeminiImageViaImagen3` | `imagen-3.0-generate-002`                   | Batch image generation (Imagen)      | Text prompt                                   | Base64 image(s) + upload to Storage                  | ⚠️ COMMENTED OUT |
| 5   | `/api/image-editing`                             | `editImageViaFlash`             | `gemini-2.5-flash-image` | Image editing                        | Reference image + edit prompt                 | Base64 edited image                                  | ⚠️ COMMENTED OUT |
| 6   | `/api/descriptions`                              | `POST handler`                  | `gemini-2.5-flash`                          | Description generation               | Menu item list + language + tone              | JSON (descriptions per item)                         | ⚠️ COMMENTED OUT |
| 7   | `/api/translations`                              | `POST handler`                  | `gemini-2.5-flash`                          | Multi-language translation           | JSON key-value pairs + source/target lang     | JSON (translated key-value pairs)                    | ⚠️ COMMENTED OUT |
| 8   | `/api/new-item-metadata`                         | `POST handler`                  | `gemini-2.5-flash`                          | New item metadata generation         | Item name + languages + business type         | JSON (descriptions, translations, metadata)          | ⚠️ COMMENTED OUT |
| 9   | `/api/campaigns/caption`                         | `POST handler`                  | `gemini-2.5-flash`                          | Campaign caption generation          | Item details + campaign type + surface        | JSON (caption, shortCaption)                         | ❌ ZERO TRACKING |
| 10  | `/api/analytics/weekly-narrative/generate-local` | `POST handler`                  | `gemini-2.5-flash`            | Weekly narrative (local fallback)    | Aggregated analytics metrics                  | JSON (narrative, highlights, recommendations)        | ❌ ZERO TRACKING |
| 11  | `/api/helpCenter/search-kb`                      | `callGeminiChat`                | `gemini-2.5-flash`                          | KB search — answer generation        | User query + matched KB docs + optional image | JSON (craftedAnswer, references, suggestedQuestions) | ❌ ZERO TRACKING |
| 12  | `/api/helpCenter/search-kb`                      | `callGeminiEmbedding`           | `text-embedding-004`                        | KB search — query embedding          | User query text                               | Vector (768 dimensions)                              | ❌ ZERO TRACKING |
| 13  | `/api/helpCenter/search-kb`                      | `generateSearchQueryFromImage`  | `gemini-2.5-pro`                            | KB search — image-to-text query      | User query + image                            | Text (search query)                                  | ❌ ZERO TRACKING |
| 14  | `/api/helpCenter/search-kb-stream`               | `callGeminiChatStream`          | `gemini-2.5-flash`                          | KB search — streaming answer         | User query + matched KB docs + optional image | SSE stream (JSON chunks)                             | ❌ ZERO TRACKING |
| 15  | `/api/helpCenter/search-kb-stream`               | `callGeminiEmbedding`           | `text-embedding-004`                        | KB search — query embedding (stream) | User query text                               | Vector (768 dimensions)                              | ❌ ZERO TRACKING |
| 16  | `/api/helpCenter/article-embedding`              | `callGeminiEmbedding`           | `text-embedding-004`                        | KB article indexing                  | Article category + section + title + content  | Vector (768 dimensions)                              | ❌ ZERO TRACKING |

### 1B. All Direct AI Model Calls — Cloud Functions

| #   | File                       | Function                             | Model                            | Feature                            | Input Type                                          | Output Type                                   | Tracking Status                                |
| --- | -------------------------- | ------------------------------------ | -------------------------------- | ---------------------------------- | --------------------------------------------------- | --------------------------------------------- | ---------------------------------------------- |
| 17  | `processMenuImages.ts`     | `processSingleBatch`                 | `gemini-2.5-flash`               | Menu OCR extraction                | Menu images (uploaded to Gemini) + target languages | JSON (categories, items, languages)           | ✅ ACTIVE — writes to `MENULIST_AI_OPERATIONS` |
| 18  | `aiUtils.ts`               | `generateKbFromSourceUsingGenAi`     | `gemini-2.5-pro`                 | KB generation from source files    | Source files (PDF/images) + prompt                  | JSON (structured KB articles)                 | ❌ ZERO TRACKING                               |
| 19  | `aiUtils.ts`               | `generateKbFromSource` (Vertex)      | `gemini-2.5-pro`                 | KB generation from source (Vertex) | Source files (GCS URIs) + prompt                    | JSON (structured KB articles)                 | ❌ ZERO TRACKING                               |
| 20  | `aiUtils.ts`               | `generateArticleEmbeddingUsingGenAi` | `text-embedding-004`             | KB article embedding (server)      | Article text (category+title+content)               | Vector (768 dimensions)                       | ❌ ZERO TRACKING                               |
| 21  | `aiUtils.ts`               | `generateArticleEmbedding` (Vertex)  | `text-embedding-004`             | KB article embedding (Vertex)      | Article text                                        | Vector (768 dimensions)                       | ❌ ZERO TRACKING                               |
| 22  | `feedbackAnalysis.ts`      | `generateFeedbackAnalysis`           | `gemini-2.5-flash` | Feedback intelligence              | Negative feedback messages                          | JSON (themes, severity, recommendations)      | ❌ ZERO TRACKING                               |
| 23  | `weeklyNarrative.ts`       | `generateWeeklyNarrative`            | `gemini-2.5-flash` | Weekly narrative generation        | Aggregated weekly metrics                           | JSON (narrative, highlights, recommendations) | ❌ ZERO TRACKING                               |
| 24  | `kbQuality.ts`             | `analyzeKBArticleQuality`            | `gemini-2.5-flash` | KB quality analysis                | Article + low-confidence queries + feedback         | JSON (qualityScore, issues, suggestions)      | ❌ ZERO TRACKING                               |
| 25  | `ownerDashboardSummary.ts` | `generateOwnerDashboardSummary`      | `gemini-2.5-flash` | Weekly owner summary               | Weekly menu analytics metrics                       | JSON (bulletPoints)                           | ❌ ZERO TRACKING                               |
| 26  | `ownerDashboardSummary.ts` | `generateDailyAISummary`             | `gemini-2.5-flash` | Daily owner summary                | Daily menu analytics metrics                        | JSON (bulletPoints)                           | ❌ ZERO TRACKING                               |
| 27  | `ownerDashboardSummary.ts` | `generateMonthlyAISummary`           | `gemini-2.5-flash` | Monthly owner summary              | Monthly menu analytics metrics                      | JSON (bulletPoints)                           | ❌ ZERO TRACKING                               |

### 1C. Client-Side Service Layer (Frontend → API Routes)

| #   | File                                                     | Function                         | Calls Route                           | Feature                             |
| --- | -------------------------------------------------------- | -------------------------------- | ------------------------------------- | ----------------------------------- |
| C1  | `services/ai/image/generateImageViaApi.ts`               | `generateImageViaApi`            | `/api/image-generation`               | Single image generation UI          |
| C2  | `services/ai/image/editImageViaApi.ts`                   | `editImageViaApi`                | `/api/image-editing`                  | Image editing UI                    |
| C3  | `services/ai/image/triggerBatchImageGenerationApi.ts`    | `triggerBatchImageGenerationApi` | `/api/image-generation/batch-trigger` | Batch generation trigger            |
| C4  | `services/ai/description/generateDescriptionViaAPI.ts`   | `getDescriptionsViaAPI`          | `/api/descriptions`                   | Description generation UI           |
| C5  | `services/ai/dataGeneration/getNewItemMetadataViaAPI.ts` | `getNewItemMetadataViaAPI`       | `/api/new-item-metadata`              | New item metadata UI                |
| C6  | `projects/generateTranslations.ts`                       | `getTranslations`                | `/api/translations`                   | Translation UI                      |
| C7  | `editorView/editItemModal.tsx`                           | `onGenerateContent`              | (via C5) `/api/new-item-metadata`     | Add/edit item — AI generate button  |
| C8  | `editorView/editCategoryModal.tsx`                       | `onGenerateContent`              | N/A — **TODO stub**                   | Category generate — not implemented |

### 1D. Cloud Function Triggers & Schedulers

| #   | File                            | Trigger                      | Calls AI Functions                                                 | Schedule              |
| --- | ------------------------------- | ---------------------------- | ------------------------------------------------------------------ | --------------------- |
| S1  | `masterScheduler.ts`            | `onSchedule('0 2 * * *')`    | feedbackIntelligence → #22, kbQuality → #24, weeklyNarrative → #23 | Daily 2 AM UTC        |
| S2  | `aggregateCustomerAnalytics.ts` | `onSchedule('0 3 * * *')`    | ownerDashboardSummary → #25, #26, #27                              | Daily 3 AM UTC        |
| S3  | `processMenuImagesJob.ts`       | Firestore `onCreate` trigger | processMenuImagesLogic → #17                                       | On-demand (job queue) |

---

## 2. FEATURE-WISE BREAKDOWN

### Feature A: Menu Image Processing (OCR Extraction)

| Attribute              | Value                                                                                        |
| ---------------------- | -------------------------------------------------------------------------------------------- |
| **AI Call #**          | #17                                                                                          |
| **Trigger**            | User uploads menu images → Firestore job → Cloud Function                                    |
| **Model**              | `gemini-2.5-flash`                                                                           |
| **Input**              | 1–N menu images (max 10 per batch), uploaded to Gemini file API                              |
| **Input token range**  | ~2,000–50,000 tokens (images are large; multi-page menus can hit 65K output limit)           |
| **Output**             | Structured JSON: categories[], items[], languages[]                                          |
| **Output token range** | ~1,000–65,536 tokens (large menus with 100+ items)                                           |
| **Frequency**          | Per project upload (1–5x per tenant on onboarding, then rare)                                |
| **Batch support**      | Yes — chunks of 10 images, sequential with exponential backoff                               |
| **Retry/fallback**     | `retryWithBackoff` (max 2 retries, 2s base delay) + circuit breaker                          |
| **Output stored**      | Firestore `projectsData` (extractedData per file)                                            |
| **Regeneration**       | Rare — only on re-upload or re-extraction                                                    |
| **Tracking status**    | ✅ **ACTIVE** — `addAiOperation()` writes to `MENULIST_AI_OPERATIONS` with full token counts |
| **Cost risk**          | 🟡 MEDIUM — Large menus can hit 65K output tokens. 10-image batches amplify cost.            |
| **Prompt file**        | `functions/src/logic/parallelProcessingPrompt.ts`                                            |

### Feature B: Image Generation (Single)

| Attribute              | Value                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------ |
| **AI Call #**          | #1, #2                                                                                           |
| **Trigger**            | User clicks "Generate Image" in editor                                                           |
| **Model**              | `gemini-2.5-flash-image` (Gemini) or `imagen-3.0-generate-002` (Imagen)                  |
| **Input**              | Text prompt (built from item details + style config + business type), optional reference image   |
| **Input token range**  | ~200–800 tokens (text prompt) + image tokens if reference image                                  |
| **Output**             | 1–4 base64 images                                                                                |
| **Output token range** | Gemini: ~4,000–20,000 tokens (image output); Imagen: fixed per image                             |
| **Frequency**          | High — users generate many images per project. ~5–20 per session                                 |
| **Batch support**      | No (single request, but can execute multiple prompts sequentially)                               |
| **Retry/fallback**     | None — single attempt                                                                            |
| **Output stored**      | NOT stored in Firestore; returned to client; user manually saves to project                      |
| **Regeneration**       | Very frequent — users regenerate until satisfied                                                 |
| **Tracking status**    | ⚠️ COMMENTED OUT — `addAiOperation()` call exists but replaced with `"test"`                     |
| **Cost risk**          | 🔴 HIGH — Most frequent AI call. Users regenerate repeatedly. Image output tokens are expensive. |
| **Prompt file**        | `src/app/api/image-generation/prompt.ts`                                                         |

### Feature C: Image Generation (Batch)

| Attribute           | Value                                                                           |
| ------------------- | ------------------------------------------------------------------------------- |
| **AI Call #**       | #3, #4                                                                          |
| **Trigger**         | User triggers batch generation → Cloud Tasks dispatches per-item jobs           |
| **Model**           | Same as Feature B                                                               |
| **Input**           | Same as Feature B, per item                                                     |
| **Output**          | Base64 images → uploaded to Firebase Storage → URLs stored in batch job doc     |
| **Frequency**       | Less frequent than single, but N items × prompts per batch                      |
| **Tracking status** | ⚠️ COMMENTED OUT — `addAiOperation()` exists but replaced with `"test"`         |
| **Cost risk**       | 🔴 HIGH — Multiplier effect: 50 items × 1 image each = 50 AI calls in one batch |
| **Prompt file**     | `src/app/api/image-generation/prompt.ts` (shared with single)                   |

### Feature D: Image Editing

| Attribute             | Value                                                                                |
| --------------------- | ------------------------------------------------------------------------------------ |
| **AI Call #**         | #5                                                                                   |
| **Trigger**           | User edits an existing image in editor                                               |
| **Model**             | `gemini-2.5-flash-image`                                          |
| **Input**             | Reference image + edit prompt + optional additional prompt images                    |
| **Input token range** | ~500–2,000 tokens (text) + image tokens                                              |
| **Output**            | 1 base64 edited image                                                                |
| **Frequency**         | Moderate — less than generation, per-item                                            |
| **Tracking status**   | ⚠️ COMMENTED OUT — `addAiOperation()` exists but replaced with `crypto.randomUUID()` |
| **Cost risk**         | 🟡 MEDIUM — Less frequent but image I/O is token-heavy                               |
| **Prompt file**       | `src/app/api/image-editing/promptsList.ts`                                           |

### Feature E: Description Generation

| Attribute              | Value                                                                          |
| ---------------------- | ------------------------------------------------------------------------------ |
| **AI Call #**          | #6                                                                             |
| **Trigger**            | User clicks "Generate Descriptions" in editor                                  |
| **Model**              | `gemini-2.5-flash`                                                             |
| **Input**              | Item list (names, categories) + source/target language + content length + tone |
| **Input token range**  | ~200–2,000 tokens (depends on item count)                                      |
| **Output**             | JSON: description per item ID                                                  |
| **Output token range** | ~200–4,096 tokens                                                              |
| **Frequency**          | Moderate — typically once per file per language                                |
| **Tracking status**    | ⚠️ COMMENTED OUT — `addAiOperation()` exists but replaced with `Date.now()`    |
| **Cost risk**          | 🟢 LOW — Small I/O, infrequent                                                 |
| **Prompt file**        | `src/app/api/descriptions/prompt.ts`                                           |

### Feature F: Multi-Language Translation

| Attribute              | Value                                                                                              |
| ---------------------- | -------------------------------------------------------------------------------------------------- |
| **AI Call #**          | #7                                                                                                 |
| **Trigger**            | User adds a language or retranslates in editor                                                     |
| **Model**              | `gemini-2.5-flash`                                                                                 |
| **Input**              | JSON key-value map (item names, descriptions, attributes, category names) + source/target language |
| **Input token range**  | ~300–5,000 tokens (proportional to menu size)                                                      |
| **Output**             | JSON key-value map (translated strings)                                                            |
| **Output token range** | ~300–8,192 tokens                                                                                  |
| **Frequency**          | Moderate — once per language per file. Can be triggered per-item (retry)                           |
| **Tracking status**    | ⚠️ COMMENTED OUT — `addAiOperation()` exists but replaced with `Date.now()`                        |
| **Cost risk**          | 🟡 MEDIUM — Scales with menu size × number of languages                                            |
| **Prompt file**        | `src/app/api/translations/prompt.ts`                                                               |

### Feature G: New Item Metadata

| Attribute              | Value                                                                       |
| ---------------------- | --------------------------------------------------------------------------- |
| **AI Call #**          | #8                                                                          |
| **Trigger**            | User adds a new item and clicks "Generate Content"                          |
| **Model**              | `gemini-2.5-flash`                                                          |
| **Input**              | Item name + target languages + source language + business type              |
| **Input token range**  | ~200–500 tokens                                                             |
| **Output**             | JSON: translated names, descriptions, attributes                            |
| **Output token range** | ~200–2,048 tokens                                                           |
| **Frequency**          | Per new item added — moderate                                               |
| **Tracking status**    | ⚠️ COMMENTED OUT — `addAiOperation()` exists but replaced with `Date.now()` |
| **Cost risk**          | 🟢 LOW — Small per-call cost, moderate frequency                            |
| **Prompt file**        | `src/app/api/new-item-metadata/prompt.ts`                                   |

### Feature H: Campaign Caption Generation

| Attribute              | Value                                                                                    |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| **AI Call #**          | #9                                                                                       |
| **Trigger**            | User creates a campaign and generates a caption                                          |
| **Model**              | `gemini-2.5-flash`                                                                       |
| **Input**              | Item name, description, price, category, business name, campaign type, surface, language |
| **Input token range**  | ~200–400 tokens                                                                          |
| **Output**             | JSON: caption, shortCaption                                                              |
| **Output token range** | ~100–300 tokens                                                                          |
| **Frequency**          | Low — per campaign per item                                                              |
| **Tracking status**    | ❌ ZERO TRACKING — No `transactionObject`, no `addAiOperation()`, no token logging       |
| **Cost risk**          | 🟢 LOW — Tiny I/O, infrequent                                                            |
| **Prompt file**        | `src/services/gemini/prompts/v1/campaignCaption.prompt.ts`                               |

### Feature I: Help Center / KB Search (Non-Streaming + Streaming)

| Attribute              | Value                                                                                                                      |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **AI Call #**          | #11, #12, #13, #14, #15                                                                                                    |
| **Trigger**            | End-customer or admin types a question in Help Center chat                                                                 |
| **Models**             | `text-embedding-004` (embedding), `gemini-2.5-flash` (answer), `gemini-2.5-pro` (image-to-query)                           |
| **Input**              | User query text (+ optional image + optional conversation history) + matched KB docs                                       |
| **Input token range**  | Embedding: ~50–500 tokens. Chat: ~500–5,000 tokens (includes KB doc context)                                               |
| **Output**             | Embedding: 768-dim vector. Chat: JSON (craftedAnswer, references, suggestedQuestions)                                      |
| **Output token range** | Chat: ~200–2,000 tokens                                                                                                    |
| **Frequency**          | 🔴 HIGHEST — Every customer chat message triggers embedding + answer generation                                            |
| **Caching**            | ✅ Embedding cache (`queryEmbeddings` collection) + search result cache (`aiSearchHistory`)                                |
| **Tracking status**    | ❌ ZERO TRACKING — No transactionObject, no token logging, no cost calculation                                             |
| **Cost risk**          | 🔴 HIGH — Scales with customer traffic. Every chat = 2+ AI calls (embedding + answer). Image queries add a 3rd (Pro model) |
| **Prompt file**        | Inline in `src/lib/vectorEmbeddings/index.ts`                                                                              |

### Feature J: KB Article Embedding (Admin Side)

| Attribute             | Value                                                                                  |
| --------------------- | -------------------------------------------------------------------------------------- |
| **AI Call #**         | #16, #20, #21                                                                          |
| **Trigger**           | Admin publishes/updates a KB article                                                   |
| **Model**             | `text-embedding-004`                                                                   |
| **Input**             | Article category + section + title + content (plain text extracted from Tiptap editor) |
| **Input token range** | ~100–2,000 tokens                                                                      |
| **Output**            | 768-dimension vector                                                                   |
| **Frequency**         | Low — only when KB articles are created/updated                                        |
| **Tracking status**   | ❌ ZERO TRACKING                                                                       |
| **Cost risk**         | 🟢 LOW — Infrequent, cheap embedding calls                                             |

### Feature K: KB Generation from Source Files

| Attribute              | Value                                                                                     |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| **AI Call #**          | #18, #19                                                                                  |
| **Trigger**            | Admin uploads source files to build KB                                                    |
| **Model**              | `gemini-2.5-pro`                                                                          |
| **Input**              | Source files (PDF, images) uploaded to Gemini/Vertex + structured prompt                  |
| **Input token range**  | ~5,000–100,000+ tokens (entire PDF documents)                                             |
| **Output**             | Structured JSON (categories, articles, QnA pairs)                                         |
| **Output token range** | ~2,000–65,000 tokens                                                                      |
| **Frequency**          | Very rare — only during KB setup                                                          |
| **Tracking status**    | ❌ ZERO TRACKING                                                                          |
| **Cost risk**          | 🟡 MEDIUM — Pro model is expensive. Large PDFs = large token counts. But very infrequent. |

### Feature L: Scheduled AI Intelligence (Cloud Functions)

| Attribute              | Value                                                                                                      |
| ---------------------- | ---------------------------------------------------------------------------------------------------------- |
| **AI Call #**          | #22, #23, #24, #25, #26, #27                                                                               |
| **Trigger**            | Master scheduler (daily 2 AM UTC) + customer analytics aggregation (daily 3 AM UTC)                        |
| **Models**             | `gemini-2.5-flash` (current SDK — `@google/genai`)                                                 |
| **Functions**          | Feedback analysis, weekly narrative, KB quality, daily/weekly/monthly owner summaries                      |
| **Input token range**  | ~200–2,000 tokens per call                                                                                 |
| **Output token range** | ~100–500 tokens per call                                                                                   |
| **Frequency**          | Daily (per store) — scales linearly with tenant count                                                      |
| **Tracking status**    | ❌ ZERO TRACKING — None of these 6 functions have any cost tracking                                        |
| **Cost risk**          | 🟡 MEDIUM at scale — Low per-call cost, but `N stores × 4-6 AI calls × daily` adds up                      |
| **Note**               | Uses the current `@google/genai` gateway path. Confirm per-feature operation accounting before treating this historical table as current. |

---

## 3. MISSING TRACKING POINTS

### 3A. Critical Gaps (Revenue-Impacting Features — User-Triggered)

These are AI calls triggered directly by user actions in the dashboard. They consume tokens we pay for, and the user receives direct value. **Must track for pricing.**

| #   | Feature                   | Route/Function                           | Gap Description                                                                                                   |
| --- | ------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1   | Image Generation (single) | `/api/image-generation`                  | `addAiOperation()` commented out. `transactionObject` built correctly with full token counts but never persisted. |
| 2   | Image Generation (batch)  | `/api/image-generation/batch-generation` | Same as above. Per-item calls are untracked.                                                                      |
| 3   | Image Editing             | `/api/image-editing`                     | `addAiOperation()` commented out. Uses `crypto.randomUUID()` as placeholder.                                      |
| 4   | Description Generation    | `/api/descriptions`                      | `addAiOperation()` commented out. Uses `Date.now()` as placeholder.                                               |
| 5   | Translation               | `/api/translations`                      | `addAiOperation()` commented out. Uses `Date.now()` as placeholder.                                               |
| 6   | New Item Metadata         | `/api/new-item-metadata`                 | `addAiOperation()` commented out. Uses `Date.now()` as placeholder.                                               |
| 7   | Campaign Caption          | `/api/campaigns/caption`                 | **No transactionObject at all.** No token counting. No cost calculation. Complete gap.                            |

### 3B. Secondary Gaps (Platform Features — Not Directly Billable)

These consume tokens but serve the platform (help center, analytics intelligence). May or may not be charged to tenants.

| #   | Feature                           | Route/Function                                           | Gap Description                                                  |
| --- | --------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| 8   | KB Search (embedding)             | `/api/helpCenter/search-kb`                              | No token tracking. Embedding calls are cheap but high volume.    |
| 9   | KB Search (answer)                | `/api/helpCenter/search-kb`                              | No token tracking. Chat answer generation is the expensive part. |
| 10  | KB Search (image-to-query)        | `/api/helpCenter/search-kb`                              | No token tracking. Uses `gemini-2.5-pro` (most expensive model). |
| 11  | KB Search (streaming)             | `/api/helpCenter/search-kb-stream`                       | Same as #8-10 but streaming mode.                                |
| 12  | KB Article Embedding              | `/api/helpCenter/article-embedding`                      | No token tracking. Low volume.                                   |
| 13  | KB Generation from Source         | `functions/src/utils/aiUtils.ts`                         | No token tracking. Uses Pro model.                               |
| 14  | Feedback Intelligence             | `functions/src/services/gemini/feedbackAnalysis.ts`      | No token tracking. Scheduled.                                    |
| 15  | Weekly Narrative                  | `functions/src/services/gemini/weeklyNarrative.ts`       | No token tracking. Scheduled.                                    |
| 16  | KB Quality Analysis               | `functions/src/services/gemini/kbQuality.ts`             | No token tracking. Scheduled (batch).                            |
| 17  | Owner Dashboard Summary (daily)   | `functions/src/services/gemini/ownerDashboardSummary.ts` | No token tracking. Scheduled.                                    |
| 18  | Owner Dashboard Summary (weekly)  | Same file                                                | No token tracking. Scheduled.                                    |
| 19  | Owner Dashboard Summary (monthly) | Same file                                                | No token tracking. Scheduled.                                    |

### 3C. Summary

| Category                  | Total AI Calls                 | Tracked  | Untracked | Percentage Tracked |
| ------------------------- | ------------------------------ | -------- | --------- | ------------------ |
| User-triggered (billable) | 7 routes (10 AI call points)   | 0 active | 7 routes  | **0%**             |
| Cloud Function (OCR)      | 1                              | 1 active | 0         | **100%**           |
| Platform features         | 12 call points                 | 0        | 12        | **0%**             |
| **TOTAL**                 | **27 distinct AI call points** | **1**    | **26**    | **3.7%**           |

**Only 1 out of 27 AI call points is actively tracked.** The sole active tracker is Menu Image Processing (Cloud Function #17).

---

## 4. COST RISK AREAS

### 4A. Token Explosion Risks (Where Scale Breaks the Budget)

| Risk Level  | Feature                              | Why It Explodes                                                                                                                                                                                       | Scale Factor             |
| ----------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| 🔴 CRITICAL | **Image Generation**                 | Users regenerate repeatedly until satisfied. Each gen = ~10K–20K output tokens (Gemini image output). 20 items × 3 regenerations = 60 calls.                                                          | Per user per session     |
| 🔴 CRITICAL | **Batch Image Generation**           | 50 items in one batch = 50 sequential AI calls. Each with full image generation cost. Cloud Tasks retries amplify on failure.                                                                         | Per batch job            |
| 🔴 CRITICAL | **Help Center KB Search**            | Every customer chat message = embedding + answer generation (2 AI calls minimum). Image queries add `gemini-2.5-pro` call (most expensive model). Scales with end-customer traffic, not tenant count. | Per customer message     |
| 🟡 HIGH     | **Translation**                      | Menu with 100 items × 5 languages = 5 translation calls, each with ~5K input tokens. Retranslation per-item feature allows unlimited retries.                                                         | Per language × menu size |
| 🟡 HIGH     | **Scheduled Intelligence**           | `N tenants × 4-6 daily AI calls`. At 100 tenants = 400-600 AI calls/day. At 1,000 tenants = 4,000-6,000/day.                                                                                          | Linear with tenant count |
| 🟡 MEDIUM   | **Menu OCR Extraction**              | Multi-page menus (10+ images) trigger batched processing. Large menus can hit 65K output tokens. But frequency is low (onboarding).                                                                   | Per onboarding           |
| 🟡 MEDIUM   | **KB Generation from Source**        | Uses `gemini-2.5-pro` (most expensive). Large PDFs = 100K+ input tokens. But very rare (KB setup only).                                                                                               | One-time                 |
| 🟢 LOW      | **Descriptions, Metadata, Captions** | Small I/O, moderate frequency. No explosion risk.                                                                                                                                                     | Per item                 |

### 4B. Uncontrolled Cost Multipliers

1. **No capacity enforcement** — No check if tenant has remaining credits before AI call executes
2. **No per-call cost ceiling** — A 10-image batch with retries can consume unlimited tokens
3. **No customer-facing rate limits on KB search** — End-customer chat has rate limiting but it's per-API-route, not per-store
4. **Imagen pricing** — Fixed cost per image ($0.04/image at Imagen 3), not token-based. Constants `CHARGE_PER_IMAGEN_IMAGE` and `TOKENS_PER_IMAGEN_IMAGE` exist but don't reflect actual Google billing

### 4C. Cost Constants Mismatch

**Frontend** (`src/constants/common.ts`):

```
TOKENS_PER_CREDIT = 500
CHARGE_PER_CREDIT = 100 (paise)
```

**Cloud Functions** (`functions/src/constants/ai.ts`):

```
TOKENS_PER_CREDIT = 1000
CHARGE_PER_CREDIT = 100 (paise)
```

⚠️ **CRITICAL**: `TOKENS_PER_CREDIT` is **500 on frontend** but **1000 in Cloud Functions**. This means the same AI operation is priced differently depending on whether it runs in a Next.js API route or a Cloud Function. The Cloud Function (OCR) — the only one actively tracking — uses the wrong constant (1000 instead of 500), **undercharging by 50%**.

---

## 5. ARCHITECTURE RECOMMENDATION

### 5A. Where to Inject Usage Tracking Layer

**Principle**: Single tracking middleware, not per-route hacks.

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI TRACKING ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  UI (Client Component)                                           │
│    │                                                             │
│    ▼                                                             │
│  Service Layer (generateImageViaApi, etc.)                       │
│    │                                                             │
│    ▼                                                             │
│  API Route (/api/image-generation, etc.)                         │
│    │                                                             │
│    ├──→ [1] PRE-CALL: checkCapacity(tId, sId, estimatedUnits)   │
│    │         └─ Read subscription credits (monthlyCredits+topUp) │
│    │         └─ If insufficient → 402 Payment Required           │
│    │                                                             │
│    ├──→ [2] EXECUTE: genAIClient.models.generateContent(...)     │
│    │                                                             │
│    ├──→ [3] POST-CALL: recordAiUsage(transactionObject)         │
│    │         ├─ Write append-only event to AI_OPERATIONS         │
│    │         ├─ Atomic decrement subscription credits            │
│    │         └─ Include: model, tokens, units, tId, sId, action │
│    │                                                             │
│    ▼                                                             │
│  Response to client (no cost details exposed)                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 5B. Recommended Implementation Files

| File                                     | Purpose                                                                                        | New/Modify |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------- |
| `src/lib/ai/trackUsage.ts`               | Central tracking function — builds transactionObject, writes to Firestore, decrements capacity | **NEW**    |
| `src/lib/ai/checkCapacity.ts`            | Pre-call capacity check — reads subscription credits (per-store), returns allow/deny           | **NEW**    |
| `src/lib/ai/unitCosts.ts`                | Unit cost mapping per operation type (replaces scattered `TOKENS_PER_CREDIT` usage)            | **NEW**    |
| `src/constants/common.ts`                | Remove `TOKENS_PER_CREDIT`, `CHARGE_PER_CREDIT` — replaced by `unitCosts.ts`                   | **MODIFY** |
| `functions/src/constants/ai.ts`          | Same — remove duplicated constants, align with frontend                                        | **MODIFY** |
| `src/database/aiOperations/index.tsx`    | Uncomment `addAiOperation()`, align with new tracking structure                                | **MODIFY** |
| All 7 API routes (#1-8)                  | Uncomment tracking calls, wire to `trackUsage()` + `checkCapacity()`                           | **MODIFY** |
| `src/app/api/campaigns/caption/route.ts` | Add transactionObject + tracking (currently has zero)                                          | **MODIFY** |

### 5C. Unit Cost Model Design

Instead of raw tokens, define **internal units** per operation type:

```typescript
// src/lib/ai/unitCosts.ts
export const AI_UNIT_COSTS: Record<string, number> = {
  // Core menu operations (user-triggered, billable)
  IMAGE_GENERATION_GEMINI: 5, // ~10K-20K tokens, expensive
  IMAGE_GENERATION_IMAGEN: 5, // Fixed Google price
  IMAGE_EDITING: 4, // Image I/O heavy
  BATCH_IMAGE_GENERATION: 5, // Same as single, per item
  DESCRIPTION_GENERATION: 1, // Small I/O
  TRANSLATION: 1, // Small-medium I/O
  NEW_ITEM_METADATA: 1, // Small I/O
  CAMPAIGN_CAPTION: 1, // Tiny I/O
  MENU_OCR_EXTRACTION: 3, // Per image in batch

  // Platform features (may or may not be billable)
  KB_SEARCH_EMBEDDING: 0, // Cheap, platform cost
  KB_SEARCH_ANSWER: 0, // Platform cost (customer-facing)
  KB_SEARCH_IMAGE_QUERY: 0, // Platform cost
  KB_ARTICLE_EMBEDDING: 0, // Admin action, platform cost
  KB_GENERATION: 0, // Rare, platform cost
  FEEDBACK_INTELLIGENCE: 0, // Scheduled, platform cost
  WEEKLY_NARRATIVE: 0, // Scheduled, platform cost
  KB_QUALITY_ANALYSIS: 0, // Scheduled, platform cost
  OWNER_SUMMARY_DAILY: 0, // Scheduled, platform cost
  OWNER_SUMMARY_WEEKLY: 0, // Scheduled, platform cost
  OWNER_SUMMARY_MONTHLY: 0, // Scheduled, platform cost
};
```

This keeps pricing logic **completely isolated** from feature logic. Features call `trackUsage('IMAGE_GENERATION_GEMINI')` — they don't know or care about the unit cost.

### 5D. How to Avoid Performance Hit

1. **Capacity check is a single Firestore read** — subscription document for the store (already planned in spec doc)
2. **Usage recording is fire-and-forget** — Write the append-only event AFTER returning the response to the user. Use `Promise.resolve().then(...)` or similar pattern to not block the response
3. **Atomic decrement uses `FieldValue.increment(-units)`** — No read-then-write race condition
4. **Embedding cache already exists** — `queryEmbeddings` collection prevents redundant embedding calls

### 5E. How to Keep Clean + Modular

1. **All tracking logic in `src/lib/ai/`** — Never scattered across routes
2. **Routes call `trackUsage()` with operation type** — Routes don't calculate costs
3. **Unit costs defined in one file** — Changed in one place, applies everywhere
4. **Platform vs billable distinction** — Unit cost of `0` means tracked for observability but not billed
5. **Cloud Functions share same unit cost file** — Import from shared constants or duplicate with comment

---

## 6. REDUNDANT OR WASTE CALLS

### 6A. Confirmed Inefficiencies

| #   | Issue                                       | Location                                                                                                                                                                                                        | Impact                                                                            | Fix                                                                                                   |
| --- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| 1   | **Duplicate image generation functions**    | `route.ts` and `batch-generation/route.ts` both define identical `generateGeminiImageViaFlash` and `generateGeminiImageViaImagen3` functions (exact copy-paste)                                                 | Maintenance burden, inconsistency risk                                            | Extract to shared `src/lib/ai/imageGeneration.ts`                                                     |
| 2   | **Duplicate safety settings**               | Every API route defines the same `safetySettings` array inline                                                                                                                                                  | 100+ lines of duplicated code                                                     | Use `AI_MODELS` config from `src/constants/AI/models.ts` which already defines per-operation settings |
| 3   | **Cloud Functions SDK migration**          | `feedbackAnalysis.ts`, `weeklyNarrative.ts`, `kbQuality.ts`, and `ownerDashboardSummary.ts` now use `@google/genai` through the shared gateway. | Historical risk resolved; keep future functions on the gateway path. | No action unless a new direct provider call is introduced. |
| 4   | **`TOKENS_PER_CREDIT` mismatch**            | Frontend: 500. Cloud Functions: 1000.                                                                                                                                                                           | Cloud Function OCR is undercharging by 50%                                        | Unify to single source of truth                                                                       |
| 5   | **AI_MODELS config unused**                 | `src/constants/AI/models.ts` defines 9 operation-specific model configs, but API routes hardcode model strings directly                                                                                         | Model configs drift from centralized constants                                    | Wire routes to use `AI_MODELS.IMAGE_GENERATION.model` etc.                                            |
| 6   | **Weekly narrative local route**            | `/api/analytics/weekly-narrative/generate-local/route.ts` now uses `genAIClient` and shared model constants. | Historical client-key risk resolved; keep server-side provider calls only. | No action unless a new browser-exposed provider key path is introduced. |
| 7   | **No embedding deduplication for articles** | `article-embedding/route.ts` regenerates embedding every time an article is saved, even if content hasn't changed                                                                                               | Wasted embedding calls                                                            | Add content hash check before re-embedding                                                            |
| 8   | **console.log in production routes**        | `new-item-metadata/route.ts` has 3 `console.log` statements in production code                                                                                                                                  | Noise, potential data leak                                                        | Replace with `logger.debug`                                                                           |

### 6B. Reuse Opportunities

| #   | Opportunity                              | Current State                                                                                | Potential Savings                                                                                           |
| --- | ---------------------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | **Cache image generation prompts**       | Same item with same config generates same prompt every time. No cache check.                 | If user regenerates same config → skip re-generation, show cached result. Saves ~50% of image gen calls.    |
| 2   | **Cache translations per language pair** | Same item translated to same language produces same result. No cache.                        | If item content hasn't changed → serve cached translation. Saves 100% on re-translation of unchanged items. |
| 3   | **Batch descriptions**                   | Currently one AI call per description request.                                               | Already batched (sends itemsList). No issue here.                                                           |
| 4   | **KB search embedding cache**            | ✅ Already implemented — `queryEmbeddings` collection caches embeddings by normalized query. | Good. No change needed.                                                                                     |
| 5   | **KB search result cache**               | ✅ Already implemented — `aiSearchHistory` collection caches full search results.            | Good. No change needed.                                                                                     |

---

## APPENDIX A: Complete File Reference

### Frontend AI Files

| File                                                                          | Purpose                                                                   |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/lib/google/genAi/index.ts`                                               | GenAI client singleton (`@google/genai`)                                  |
| `src/constants/AI/models.ts`                                                  | Centralized model configs (9 operations)                                  |
| `src/constants/common.ts`                                                     | `TOKENS_PER_CREDIT=500`, `CHARGE_PER_CREDIT=100`, `AI_ACTIONS_TYPES`      |
| `src/lib/vectorEmbeddings/index.ts`                                           | Embedding + Chat + Streaming + Image-to-query functions                   |
| `src/database/aiOperations/index.tsx`                                         | DAL for `MENULIST_AI_OPERATIONS` (addAiOperation commented out in routes) |
| `src/app/api/image-generation/route.ts`                                       | Single image generation route                                             |
| `src/app/api/image-generation/batch-generation/route.ts`                      | Batch image generation route (Cloud Tasks worker)                         |
| `src/app/api/image-generation/batch-trigger/route.ts`                         | Batch trigger (creates Cloud Tasks)                                       |
| `src/app/api/image-generation/prompt.ts`                                      | Image generation prompt builder                                           |
| `src/app/api/image-editing/route.ts`                                          | Image editing route                                                       |
| `src/app/api/image-editing/promptsList.ts`                                    | Image editing prompt builder                                              |
| `src/app/api/descriptions/route.ts`                                           | Description generation route                                              |
| `src/app/api/descriptions/prompt.ts`                                          | Description prompt builder                                                |
| `src/app/api/translations/route.ts`                                           | Translation route                                                         |
| `src/app/api/translations/prompt.ts`                                          | Translation prompt builder                                                |
| `src/app/api/new-item-metadata/route.ts`                                      | New item metadata route                                                   |
| `src/app/api/new-item-metadata/prompt.ts`                                     | New item metadata prompt builder                                          |
| `src/app/api/campaigns/caption/route.ts`                                      | Campaign caption generation route                                         |
| `src/app/api/helpCenter/search-kb/route.ts`                                   | KB search (non-streaming)                                                 |
| `src/app/api/helpCenter/search-kb-stream/route.ts`                            | KB search (streaming SSE)                                                 |
| `src/app/api/helpCenter/article-embedding/route.ts`                           | KB article embedding route                                                |
| `src/app/api/analytics/weekly-narrative/generate-local/route.ts`              | Weekly narrative (local fallback)                                         |
| `src/services/ai/image/generateImageViaApi.ts`                                | Client service: image generation                                          |
| `src/services/ai/image/editImageViaApi.ts`                                    | Client service: image editing                                             |
| `src/services/ai/image/triggerBatchImageGenerationApi.ts`                     | Client service: batch trigger                                             |
| `src/services/ai/description/generateDescriptionViaAPI.ts`                    | Client service: descriptions                                              |
| `src/services/ai/dataGeneration/getNewItemMetadataViaAPI.ts`                  | Client service: new item metadata                                         |
| `src/services/gemini/prompts/v1/campaignCaption.prompt.ts`                    | Campaign caption prompt (versioned)                                       |
| `src/components/templates/main-app/projects/generateTranslations.ts`          | Client service: translations                                              |
| `src/components/templates/main-app/projects/editorView/editItemModal.tsx`     | UI: "Generate Content" button for items                                   |
| `src/components/templates/main-app/projects/editorView/editCategoryModal.tsx` | UI: "Generate Content" button for categories (TODO stub)                  |

### Cloud Function AI Files

| File                                                     | Purpose                                                                       |
| -------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `functions/src/genAiClient.ts`                           | GenAI client singleton for Cloud Functions                                    |
| `functions/src/firebaseAdmin.ts`                         | Vertex AI client (`vertexAIClient`)                                           |
| `functions/src/constants/ai.ts`                          | `AI_MODEL`, `TOKENS_PER_CREDIT=1000`, safety settings, circuit breaker config |
| `functions/src/logic/processMenuImages.ts`               | Menu OCR extraction logic (batch processing)                                  |
| `functions/src/logic/processMenuImagesJob.ts`            | Job wrapper for OCR (Firestore trigger)                                       |
| `functions/src/logic/parallelProcessingPrompt.ts`        | OCR prompt builder                                                            |
| `functions/src/utils/aiUtils.ts`                         | KB generation + embedding utilities                                           |
| `functions/src/services/gemini/feedbackAnalysis.ts`      | Feedback intelligence AI service                                              |
| `functions/src/services/gemini/weeklyNarrative.ts`       | Weekly narrative AI service                                                   |
| `functions/src/services/gemini/kbQuality.ts`             | KB quality analysis AI service                                                |
| `functions/src/services/gemini/ownerDashboardSummary.ts` | Owner dashboard AI summaries (daily/weekly/monthly)                           |
| `functions/src/schedulers/masterScheduler.ts`            | Daily scheduler (2 AM UTC)                                                    |
| `functions/src/aggregateCustomerAnalytics.ts`            | Analytics aggregation + AI summaries (3 AM UTC)                               |

---

## APPENDIX B: Cross-Reference with AI Enhancement Packs Documentation

This audit directly feeds into the implementation plan documented in:

| Document                           | Relevance                                                                   |
| ---------------------------------- | --------------------------------------------------------------------------- |
| `ai-enhancement-packs_spec.md`     | Pricing model, pack structure, capacity enforcement                         |
| `ai-enhancement-packs_impl.md`     | Step-by-step implementation tasks (uncomment tracking, add capacity checks) |
| `ai-enhancement-packs_firebase.md` | Firestore collections, read/write patterns, cost estimates                  |

### Key Alignments

1. **Impl doc Task 1** ("Uncomment `addAiOperation()` in 6 API routes") — This audit confirms **7 routes** need tracking (not 6 — campaigns/caption was missed). Updated count.
2. **Impl doc Task 2** ("Add capacity check before AI call") — This audit identifies the exact injection point: after rate limiting, before `genAIClient.models.generateContent()`.
3. **Spec doc "Internal Cost Accounting"** — The `TOKENS_PER_CREDIT` mismatch (500 vs 1000) was NOT caught in the spec review. This audit surfaces it as a **critical fix**.
4. **Firebase doc** — Platform AI calls (Features I-L, 12 call points) were not accounted for in the Firebase cost estimates. They don't consume user credits but do consume Google AI quota and should be tracked for observability.
5. **Spec doc "Existing Infrastructure Alignment"** (added Feb 2026) — Documents 7 critical conflicts between the existing credit system (`PlatformPlansList.ts`, `CreditPack`, Razorpay top-up flow, `subscription.topUpCredits`) and the proposed AI Enhancement Packs model. Key findings:
   - Existing Razorpay top-up flow is production-ready and must be **adapted**, not replaced
   - Credit storage **stays on subscription** (per-store). Per-tenant was REJECTED after codebase validation — see spec doc Conflict 2
   - UI currently exposes "credits" (violates doctrine) — needs label rename to "AI enhancements"
   - `PlatformFeaturesList.ts` marks AI features as "Unlimited" — must change to "Included" to align with capacity enforcement
   - `CreditPack` interface and `creditPacksList` must be renamed to `AIEnhancementPack` / `aiEnhancementPacksList`

---

## APPENDIX C: Action Priority Matrix

### Immediate (Before Launch)

| Priority | Action                                                  | Impact                    |
| -------- | ------------------------------------------------------- | ------------------------- |
| P0       | Fix `TOKENS_PER_CREDIT` mismatch (500 vs 1000)          | Cost calculation accuracy |
| P0       | Uncomment `addAiOperation()` in all 7 routes            | Enable tracking           |
| P0       | Add transactionObject to campaigns/caption route        | Close zero-tracking gap   |
| P0       | Add `checkCapacity()` pre-call to all 7 billable routes | Enforce credit limits     |
| P0       | Create `src/lib/ai/unitCosts.ts` with unit cost map     | Centralized pricing logic |

### Soon After Launch

| Priority | Action                                                                    | Impact                                 |
| -------- | ------------------------------------------------------------------------- | -------------------------------------- |
| P1       | Migrate 4 Cloud Function AI services to new SDK (`@google/genai`)         | Enable token tracking for scheduled AI |
| P1       | Extract duplicate image gen functions to shared module                    | Code quality                           |
| P1       | Wire API routes to use `AI_MODELS` constants instead of hardcoded strings | Consistency                            |
| P1       | Add observability tracking for all platform AI calls (unit cost = 0)      | Visibility into total AI spend         |
| P1       | Add content hash check before KB article re-embedding                     | Waste reduction                        |

### Nice to Have

| Priority | Action                                                               | Impact              |
| -------- | -------------------------------------------------------------------- | ------------------- |
| P2       | Image generation result caching (same prompt → cached result)        | ~50% call reduction |
| P2       | Translation caching (unchanged content → cached translation)         | Call reduction      |
| P2       | Remove/secure weekly-narrative local route                           | Security            |
| P2       | Replace `console.log` with `logger.debug` in new-item-metadata route | Code quality        |

---

_End of AI Usage Audit_

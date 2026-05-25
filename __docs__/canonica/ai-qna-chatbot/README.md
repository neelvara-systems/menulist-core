# AI QnA Chatbot — Feature Documentation

> **Status:** DOCUMENTED (Forensic Audit)
> **Last Updated:** 2026-03-02
> **Parent Feature:** Help Center
> **Audit Type:** Codebase-first, every file read

---

## What Is This

The AI QnA Chatbot is MenuList's **RAG-powered conversational support system** — an AI assistant that answers user questions by searching a knowledge base of uploaded articles using semantic vector search, then generating contextual answers via Gemini 2.5 Flash. Supports two modes (QnA stateless + Assistant conversational), image queries, response caching, embedding caching, streaming responses (SSE), feedback collection, and full chat history persistence.

---

## Document Index

| # | Document | Audience | Purpose |
|---|----------|----------|---------|
| 1 | **README.md** (this file) | Everyone | Master index |
| 2 | `ai-qna-chatbot_spec.md` | CEO/PM | Business requirements, user flows |
| 3 | `ai-qna-chatbot_impl.md` | Developers | Technical blueprint, RAG pipeline, every file |
| 4 | `ai-qna-chatbot_firebase.md` | Developers/Ops | Firestore operations, Gemini costs |
| 5 | `ai-qna-chatbot_marketing.md` | Sales/Marketing | Pitch points |
| 6 | `ai-qna-chatbot_website.md` | Public | Landing page content |
| 7 | `ai-qna-chatbot_helpdoc.md` | End users | Customer help article |
| 8 | `ai-qna-chatbot_mobile-support.md` | Mobile team | Mobile assessment |

---

## Key Files

### API Routes
- `src/app/api/helpCenter/search-kb/route.ts` — Non-streaming RAG search (370 lines)
- `src/app/api/helpCenter/search-kb-stream/route.ts` — Streaming RAG search via SSE (384 lines)
- `src/app/api/helpCenter/article-embedding/route.ts` — Generate & store article embeddings (63 lines)

### Chat UI Components (33 files)
- `src/components/templates/main-app/helpChat/` — Full chat interface
- `src/components/organisms/AISearchModal/` — Global quick search modal (13 files)

### Core Libraries
- `src/lib/vectorEmbeddings/index.ts` — Gemini embedding + chat functions (290 lines)
- `src/lib/vectorEmbeddings/articleEmbeddings.ts` — TipTap JSON → plain text extraction
- `src/lib/validation/chatSchemas.ts` — Zod validation schemas (147 lines)

### Database Layer
- `src/database/chatSessions/index.ts` — 12 DAL functions (663 lines)
- `src/database/chatAnalytics/index.ts` — 8 DAL functions (683 lines)
- `src/database/aiSearchHistory/index.ts` — 3 DAL functions
- `src/database/queryEmbeddings/index.ts` — 2 DAL functions

### Types
- `src/types/chatSession.ts` — ChatMessage, ChatSession, ConversationFilters (119 lines)

### Hooks
- `src/components/templates/main-app/helpChat/hooks/useChatData.ts` — SWR data fetching
- `src/components/templates/main-app/helpChat/hooks/useChatHandlers.ts` — All action handlers (715 lines)
- `src/components/templates/main-app/helpChat/hooks/useRequestQueue.ts` — Race condition prevention

### Cloud Functions
- `functions/src/aggregateDailyChatStats.ts` — Nightly chat analytics aggregation
- `functions/src/analytics/feedbackIntelligence.ts` — AI feedback analysis
- `functions/src/analytics/weeklyNarrative.ts` — Weekly digest generation

---

## RAG Pipeline Summary

```
User Query → Zod Validation → Rate Limit → SAFE_MODE Check
  → [Image?] → Gemini 2.5 Flash: image → bounded visual search context
  → Response Cache Check (aiSearchHistory)
  → Embedding Cache Check (queryEmbeddings)
  → [Miss] Gemini gemini-embedding-001 → 768-dim vector
  → Firestore Vector Search (COSINE, limit 12, status=published)
  → Similarity Filter (threshold 0.4-0.6)
  → Gemini 2.5 Flash → JSON answer with references + suggested questions
  → Save to search history cache
  → Return response
```

---

## Feature Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `ENABLE_STREAMING_RESPONSES` | `false` | Toggle streaming SSE vs non-streaming |
| `ENABLE_RATE_LIMITING` | `true` | Upstash rate limiting on search routes |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-02 | 1.0.0 | Initial forensic documentation — 33 UI files, 3 API routes, 25 DAL functions, full RAG pipeline |

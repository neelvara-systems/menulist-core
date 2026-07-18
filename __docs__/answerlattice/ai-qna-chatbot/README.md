# AI QnA Chatbot — Feature Documentation

> **Status:** MAINTAINED — Canonical-first retrieval is live; bounded hybrid evidence retrieval remains default off
> **Last Updated:** 2026-07-18
> **Parent Feature:** Help Center
> **Audit Type:** Codebase-first, every file read

---

## What Is This

The AI QnA Chatbot is Answerlattice's shared support-answer runtime for the authenticated Help Center and embeddable widget. It checks approved canonical answers and published FAQs before using workspace-scoped knowledge-base retrieval and Gemini answer generation. The runtime supports QnA and conversational modes, bounded image context, response and embedding caches, feedback, safe empty results, and a default-off exact technical evidence lane.

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
- `src/app/api/helpCenter/search-kb/route.ts` — Authenticated wrapper for the shared search runtime
- `src/app/api/widget/search/route.ts` — Widget-authenticated wrapper for the shared search runtime
- `src/app/api/helpCenter/article-embedding/route.ts` — Generate and store article embeddings

### Chat UI Components
- `src/components/templates/main-app/helpChat/` — Full chat interface
- `src/components/organisms/AISearchModal/` — Global quick search modal
- `src/components/templates/main-app/helpChat/helpChatDiagnostics.ts` — Bounded client diagnostics for draft storage and feedback submission state

### Core Libraries
- `src/lib/search/searchCore.ts` — Canonical-first shared retrieval and answer runtime
- `src/lib/answerlattice/hybridEvidenceRetrieval.ts` — Default-off exact technical evidence qualification and rank fusion
- `src/lib/vectorEmbeddings/index.ts` — Gemini embedding and chat functions
- `src/lib/vectorEmbeddings/articleEmbeddings.ts` — TipTap JSON → plain text extraction
- `src/lib/validation/chatSchemas.ts` — Zod validation schemas
- `src/lib/answerlattice/supportClipboard.ts` — Browser-local copy acknowledgement helper for HelpChat, AI Search, and article links

### Database Layer
- `src/database/chatSessions/index.ts` — Chat session persistence
- `src/database/chatAnalytics/index.ts` — Chat analytics persistence
- `src/database/aiSearchHistory/index.ts` — Search history persistence
- `src/database/queryEmbeddings/index.ts` — Scoped query embedding cache

### Types
- `src/types/chatSession.ts` — ChatMessage, ChatSession, and ConversationFilters

### Hooks
- `src/components/templates/main-app/helpChat/hooks/useChatData.ts` — SWR data fetching
- `src/components/templates/main-app/helpChat/hooks/useChatHandlers.ts` — All action handlers (715 lines)
- `src/components/templates/main-app/helpChat/hooks/useRequestQueue.ts` — Race condition prevention

---

## RAG Pipeline Summary

```
User Query → Zod Validation → Rate Limit → SAFE_MODE Check
  → [Image?] → Gemini 2.5 Flash: image → bounded visual search context
  → Response Cache Check (aiSearchHistory)
  → Canonical answer lookup
  → Approved FAQ lookup
  → Embedding Cache Check (queryEmbeddings)
  → [Miss] Gemini gemini-embedding-2 → canonical 768-dim vector
  → Firestore Vector Search (COSINE, limit 12, status=published)
  → Similarity Filter (threshold 0.4-0.6)
  → [Gated technical query] exact-token + resolved-entity article lookup (limit 12)
  → Deterministic rank fusion (no model reranker)
  → Gemini 2.5 Flash → JSON answer with references + suggested questions
  → Save to search history cache
  → Return response
```

---

## Feature Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `ENABLE_ANSWERLATTICE_HYBRID_EVIDENCE_RETRIEVAL` | `false` | Add the bounded exact technical-token/entity article lane after canonical and FAQ miss |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-07-18 | 1.1.0 | Added the default-off bounded hybrid evidence lane for exact technical literals plus resolved entities; canonical and approved FAQ priority remain unchanged |
| 2026-06-30 | 1.0.2 | HelpChat message copy, AI Search answer copy, and article-link copy now share acknowledged Clipboard API plus textarea fallback handling with bounded support metadata; no retrieval, schema, Firestore, Storage, Cloud Function, or product-scope change |
| 2026-06-27 | 1.0.1 | Bounded HelpChat client diagnostics added for draft storage and feedback submission paths; no retrieval, schema, Firestore, Storage, Cloud Function, or product-scope change |
| 2026-03-02 | 1.0.0 | Initial forensic documentation — 33 UI files, 3 API routes, 25 DAL functions, full RAG pipeline |

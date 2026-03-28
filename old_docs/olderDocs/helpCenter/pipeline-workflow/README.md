# Help Center Pipeline & Workflow

## Overview

This pipeline covers creating KB articles (JSON blocks with images), generating embeddings using Google Gemini, storing articles in Firestore, performing vector search, and using RAG-style answers.

## Flow

1. Admin creates or updates an article via `/helpCenter/create-kb`.
2. The Next.js API `/api/helpCenter/create-kb`:
   - Validates admin via Firebase ID token.
   - Stores the KB JSON document in `kb_articles`.
   - Extracts text blocks and calls Gemini embedding endpoint.
   - Saves embedding back to the KB document.
3. Users search via the UI (`/helpCenter/search`) which calls `/api/helpCenter/search-kb`:
   - Query embedding is created server-side via Gemini.
   - Candidate published articles are fetched, cosine similarity computed.
   - Top results returned and displayed.
4. RAG behavior (optional):
   - Use top-K results to form a context and call Gemini chat model to generate a concise answer with citations.

## Data model

- Collection: `kb_articles`
  - Fields: `id`, `title`, `category`, `tags`, `content: { blocks: [...] }`, `embedding`, `createdAt`, `updatedAt`, `status`

## Environment variables

- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- GEMINI_API_KEY
- GEMINI_EMBED_MODEL
- GEMINI_CHAT_MODEL

## Notes

- Embeddings and chat calls are server-side only.
- Re-embed an article via `/api/helpCenter/embed-kb`.
- For very large KBs, move to chunk-level embeddings.

# AI QnA Chatbot — Marketing & Sales Collateral

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Audience:** Sales, Marketing (Internal)

---

## 1. Elevator Pitch

**One-liner:** "AI-powered answers from your knowledge base — instant, cited, and contextual."

**30 seconds:** MenuList's AI chatbot searches your entire knowledge base using semantic understanding (not keyword matching) and generates clear answers with source citations. Upload a screenshot if words aren't enough. Switch to conversation mode for multi-turn troubleshooting. Every answer cites its source. Every repeated question gets faster. Built directly into the dashboard — no external chatbot tools needed.

---

## 2. Key Differentiators

| Traditional Search | MenuList AI QnA |
|-------------------|-----------------|
| Keyword matching | Semantic vector search (understands meaning) |
| Returns article links | Generates a direct answer with source citations |
| Text-only queries | Text + image queries (screenshot analysis) |
| No context | Assistant mode carries conversation history |
| Manual article browsing | AI suggests 3 follow-up questions per answer |
| No quality tracking | Similarity scores + quality-based admin filtering |
| Cold start every time | 40-60% cache hit rate — instant repeated answers |

---

## 3. Technical Selling Points

- **768-dimension embeddings** — Semantic understanding, not keyword matching
- **Dual threshold** — High confidence (0.6) with fallback (0.4) for broader coverage
- **Source citations** — Every answer shows which KB article it came from
- **Image analysis** — Gemini 2.5 Pro understands screenshots and generates search queries
- **Response caching** — ~60% of queries return instant cached results
- **Embedding caching** — 40-60% fewer API calls, faster response times
- **Streaming ready** — SSE streaming for real-time ChatGPT-like experience (feature-flagged)
- **Race condition prevention** — Sequential request queue prevents duplicate messages
- **Graceful failures** — AI suggests alternative topics instead of "I don't know"

---

## 4. Competitive Comparison

| Feature | MenuList AI QnA | Intercom Fin | Zendesk AI | Freshdesk Freddy |
|---------|:--------------:|:------------:|:----------:|:----------------:|
| Built into product | ✅ | ❌ External | ❌ External | ❌ External |
| Source citations | ✅ | ✅ | ⚠️ Limited | ❌ |
| Image queries | ✅ | ❌ | ❌ | ❌ |
| Conversation mode | ✅ | ✅ | ✅ | ⚠️ |
| Response caching | ✅ | Unknown | Unknown | Unknown |
| Quality scoring | ✅ | ❌ | ❌ | ❌ |
| Suggested questions | ✅ | ⚠️ | ❌ | ❌ |
| Streaming responses | ✅ (flagged) | ✅ | ❌ | ❌ |
| Cost | $0.18/mo (10 stores) | $0.99/resolution | $1/automated resolution | $0.50/session |

---

## 5. Metrics That Matter

| Metric | What It Proves |
|--------|---------------|
| **Cache hit rate (~60%)** | System gets faster with usage — answers cached for repeat queries |
| **Satisfaction rate** | % of positive thumbs-up feedback on AI answers |
| **Regeneration rate** | Low = AI gets it right the first time |
| **Knowledge gap count** | Declining = KB coverage is improving |
| **Average response time** | Cached: ~100ms, Uncached: ~3s |

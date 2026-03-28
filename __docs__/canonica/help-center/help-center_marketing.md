# Help Center — Marketing & Sales Collateral

> **Version:** 1.0.0
> **Last Updated:** 2026-03-01
> **Audience:** Sales, Marketing, Partnerships
> **Source:** Codebase forensic audit

---

## 1. One-Line Pitch

**"Built-in support infrastructure that resolves questions before they become tickets."**

---

## 2. Elevator Pitch (30 seconds)

MenuList's Help Center is an AI-powered support system embedded directly inside the dashboard. Owners get instant answers from a RAG chatbot trained on your knowledge base, file structured tickets when they need human help, browse organized documentation, and track every interaction — all without leaving the product. Platform administrators get real-time chat monitoring, automated quality scoring, SLA tracking, and AI-generated weekly performance reports. Zero external tools. Zero integration headaches.

---

## 3. Key Differentiators

| Traditional Helpdesk | MenuList Help Center |
|---------------------|---------------------|
| External tool (Zendesk, Intercom) | Built into the product |
| Separate login/context | Same auth, same session |
| Manual article writing | AI generates articles from raw files |
| Keyword search | Semantic vector search (understands meaning) |
| Canned responses | AI generates contextual answers with source citations |
| Manual quality monitoring | Automated quality scoring per conversation |
| Weekly reports built manually | AI generates weekly narratives automatically |
| SLA tracking requires setup | SLA built in with auto-calculation |
| Separate analytics platform | Dashboard with ROI calculator built in |

---

## 4. Feature Highlights for Sales

### For SMB Owners (End Users)
- **Instant AI Answers** — Ask anything, get an answer in seconds with source article citations
- **Visual Questions** — Upload a screenshot, AI understands and finds relevant docs
- **Follow-up Conversations** — Switch to Assistant mode for contextual multi-turn conversations
- **One-Click Tickets** — Submit support tickets with auto-captured browser logs for faster resolution
- **Track Everything** — See ticket status, SLA progress, and conversation history
- **Stay Updated** — Browse What's New changelog with release notes

### For Platform Administrators
- **AI Content Pipeline** — Upload PDFs/docs/videos → AI generates structured KB articles → review and publish
- **Quality Dashboard** — Filter conversations by AI confidence score (Good/Low/Very Low)
- **SLA Automation** — Priority-based SLA with auto-calculated breach/risk status
- **Real-Time Tickets** — Live updates via Firestore listeners, no refresh needed
- **Weekly AI Digest** — Gemini generates performance narrative with highlights and recommendations
- **ROI Calculator** — Quantify hours saved, cost saved, automation rate
- **Knowledge Gap Detection** — AI identifies topics where KB needs improvement
- **Team Notes** — Rich text internal notes on conversations for team collaboration

---

## 5. Technical Selling Points

- **RAG Architecture** — Retrieval-Augmented Generation with Gemini 2.5 Flash, not simple keyword matching
- **768-Dimension Embeddings** — text-embedding-004 for semantic understanding
- **40-60% Cache Hit Rate** — Embedding and response caching for instant repeat queries
- **99.95% Read Reduction** — Aggregated analytics vs raw session scanning
- **Multi-Tenant Isolated** — Every data point scoped by tenant and store
- **Paginated Everything** — Cost-controlled queries with cursor-based pagination
- **Transaction-Safe Changelog** — Atomic page operations with auto-rollover at 900KB

---

## 6. Metrics That Matter

| Metric | What It Proves |
|--------|---------------|
| **Cache hit rate** | System gets faster as more questions are asked |
| **Satisfaction rate** | % of positive AI answer feedback |
| **Knowledge gap count** | Declining = KB is improving |
| **Regeneration rate** | Low = AI answers are good first time |
| **SLA compliance** | % of tickets resolved within SLA |
| **Automation rate** | % of questions resolved without human ticket |

---

## 7. Pricing Context

This is a **platform feature**, not a separately priced module. It's included in all MenuList subscriptions as core infrastructure. The AI operations (Gemini API calls) are covered by the platform's AI credit system.

For future standalone SaaS (see `help-center_decoupling-analysis.md`), pricing could be:
- Per-seat (support agents)
- Per-conversation (AI interactions)
- Per-KB-article (content volume)
- Tiered by features (basic KB + tickets vs full AI + analytics)

---

## 8. Competitive Landscape

| Competitor | Weakness vs MenuList Help Center |
|-----------|--------------------------------|
| **Zendesk** | External tool, expensive, complex setup |
| **Intercom** | Expensive per-seat, heavy JS bundle |
| **Freshdesk** | External tool, limited AI capabilities |
| **Crisp** | Limited RAG, no embedded KB generation |
| **HelpScout** | No AI answer generation, manual-only KB |

**MenuList advantage:** Fully embedded, same auth, AI-native from day one, no integration overhead.

# Help Center — Product Specification

> **Version:** 1.1.0
> **Last Updated:** 2026-03-04
> **Audience:** CEO, PM, Clients, Strategy
> **Source:** Codebase forensic audit (code is truth)

---

## 1. What It Is

The Help Center is MenuList's **integrated support infrastructure** — a dual-sided system serving both **SMB owners** (who use the MenuList dashboard) and **platform administrators** (who manage KB content, tickets, and monitor chat quality).

It is NOT a standalone support tool. It is deeply integrated with MenuList's auth, tenancy, permissions, and Firestore architecture.

---

## 2. User Roles & Access

### 2.1 SMB Owner (Dashboard User)

**Route:** `/help-center`
**What they see:**

- AI-powered search bar (QnA + Assistant modes)
- Knowledge Base browser (categories → sections → articles)
- Support ticket submission and history
- Share Feedback (3-step wizard: general → feature usage → feature requests)
- FAQ page
- Contact Us
- What's New (changelog viewer)

### 2.2 Platform Administrator

**Routes:** `/platform/support-tickets`, `/platform/changelog`, `/platform/chat-management`, `/platform/knowledge-base`, `/platform/kb-generation`
**What they see:**

- Support ticket dashboard (real-time updates, SLA tracking, messaging, status management)
- Changelog CRUD (create/edit/delete release notes)
- Chat monitoring (conversation list, quality filters, ROI calculator, weekly AI digest)
- Knowledge Base management (category/section/article CRUD, article editing)
- KB generation pipeline (upload files → AI generates articles → review → publish → embed)

### 2.3 End User (Indirect)

End users interact with the **AI chatbot** through the search modal or help chat panel. They see:

- AI-generated answers with source citations
- Suggested follow-up questions
- Ability to provide feedback (thumbs up/down with reasons)
- Chat history persistence across sessions
- Image upload support for visual queries

---

## 3. Feature Map (15 Subsystems)

### 3.1 AI QnA Chat Bot

**Purpose:** Answer user questions using knowledge base articles via RAG pipeline.
**Modes:**

- **QnA Mode** — Stateless, single question/answer pairs
- **Assistant Mode** — Conversational, maintains context from last 5 messages

**Capabilities:**

- Text queries with Gemini 2.5 Flash answer generation
- Image queries (upload screenshot → Gemini 2.5 Pro generates search query → vector search)
- Source article citations with similarity scores
- Suggested follow-up questions (3 per answer)
- Feedback per message (thumbs up/down, reasons, comments)
- Regenerate answers (replace previous AI response)
- Chat session persistence (Firestore, per-user, per-tenant)
- Response caching (40-60% speedup for repeated queries)
- Embedding caching (avoids redundant Gemini API calls)
- Streaming responses (SSE, feature-flagged, currently OFF)

### 3.2 Knowledge Base

**Purpose:** Hierarchical documentation system for owner self-service.
**Structure:** Categories → Sections → Articles
**Article features:**

- TipTap rich text editor content (JSON format)
- Vector embeddings for semantic search
- Status lifecycle: draft → needs_review → published → archived
- Likes/dislikes feedback
- Source file provenance tracking
- Category/section metadata for navigation

### 3.3 KB Article Generation Pipeline

**Purpose:** Upload raw files → AI generates structured KB articles → human review → publish → embed.
**Supported file types:** PDF, Image, Video, Audio, Document, Website, YouTube, Google Drive, Copied Text
**Pipeline:**

1. Upload source files to Firebase Storage
2. Create ingestion job (status: pending)
3. AI processes files → generates categories/sections/articles
4. Job moves to `needs_review` → human reviews generated articles
5. Review reconciliation (replace existing, discard, keep both)
6. Publish → articles written to `kb_articles` collection
7. Embedding generation → vector stored on each article document
8. Job status: published

**Job statuses:** pending → processing → needs_review → publishing → published (or failed/cancelled)

### 3.4 Support Ticket System

**Purpose:** Structured support requests from owners to platform team.
**Lifecycle:** Open → In Progress → Resolved → Closed (Re-Opened possible)
**Features:**

- 7 categories: Technical Issue, Billing Inquiry, General Question, Content Update, Feature Suggestion, Account & Login Help, Other
- 3 priority levels: Low, Normal, High
- SLA configuration per priority (response: 2-24h, resolution: 24-168h)
- SLA status calculation: on_time, at_risk, breached
- File attachments (tenant-scoped storage)
- Conversation messages (separate from status changes)
- Status audit trail with timestamps and changedBy
- Platform notes and tags
- Soft delete (deleted flag, not hard delete)
- Client browser logs captured on submission
- Real-time updates via Firestore `onSnapshot` listeners
- Display ID (first 6 chars of doc ID, uppercase)

### 3.5 Changelog System

**Purpose:** Release notes visible to owners, managed by platform team.
**Architecture:** Paginated document model (entries stored in page documents, ~900KB page limit)
**Features:**

- Rich text content (TipTap JSON)
- File attachments
- Tags for categorization
- Version numbers
- Published/unpublished state
- Release date
- Likes/dislikes per entry
- YouTube link support
- KB source references (link changelog to related KB articles)
- Automatic page rollover when size limit reached
- Transaction-based atomic updates

### 3.6 Feedback System

**Purpose:** Multi-step feedback wizard for owners to share platform experience.
**3 Steps:**

1. **General Feedback** — Star rating (1-5) + free-text comment
2. **Feature Usage** — Feature-specific issues checklist + comment
3. **Feature Requests** — Free-text request + vote on popular requests (thumbs up/down)

**Popular requests are hardcoded** (5 items). Voting data stored per submission.

### 3.7 Chat Monitoring Dashboard

**Purpose:** Platform admins monitor and manage AI chat conversations.
**Features:**

- Paginated conversation list with filters (mode, feedback, status, priority, quality, tags, notes, unread, date range)
- Conversation detail drawer with full message thread
- Admin metadata popover (status, priority, tags)
- Internal notes (TipTap rich text, team collaboration)
- Quality-based filtering (Good ≥60%, Low <60%, Very Low <40% based on similarity scores)
- ROI calculator (hours saved, cost saved, automation rate)
- Weekly AI digest (Gemini-generated narrative, highlights, recommendations)
- Comprehensive dashboard with charts and insights
- CSV export with full conversation data
- Transcript export in Markdown format

### 3.8 AI Intelligence Layer

**Purpose:** Automated AI-powered analytics generated by Cloud Functions.
**Components:**

- **Daily Chat Aggregation** — Nightly CF aggregates chat sessions into daily analytics docs
- **Feedback Intelligence** — AI analyzes negative feedback for themes and patterns
- **KB Quality** — AI scores article quality, identifies articles needing updates
- **Weekly Narrative** — AI generates weekly performance summary (Sundays 2 AM UTC)

### 3.9 Content Feedback

**Purpose:** Detailed feedback on specific changelog entries and KB articles.
**Features:**

- Comment text (sanitized, max 500 chars)
- Sentiment (like/dislike)
- Stored in tenant/store-scoped subcollections
- Transaction-based for atomicity

### 3.10 Contact Us

**Purpose:** Owner-facing escalation chooser for selecting the correct support path without creating another support workflow.
**Current content:**

- Submit a ticket for account, menu, upload, billing, setup, or other issues that need tracking
- Ask the Help Center assistant for quick answers from docs and known setup steps
- Share feedback for product suggestions and confusing workflows
- Email `support@menulist.ai` as a fallback when tickets are not accessible
- Partnership note links to `partners@menulist.ai`

**Canonica boundary:** Contact Us does not add a new helpdesk workflow. It routes owners into existing Canonica signal sources: tickets, feedback, and knowledge retrieval.

### 3.11 FAQ

**Purpose:** Public short-answer page for repeated customer questions.
**Implementation:** `FaqView.tsx` reads published Canonica FAQs through `getPublishedFaqsForSession()` with a hard cap and falls back to static legacy copy if Canonica FAQ data is unavailable.

**Owner management:** `/canonica/faqs`

**Data model:** `canonica_faqs` with optional `articleId`, `contextKeys`, `entityIds`, and `tags`.

**Relationship:** FAQ owns the article link; `kb_articles.faqIds` is only a bounded mirror for cheap article-side lookup.

### 3.12 Search Experience

**Purpose:** Hero search bar that connects to AI chat and navigates between tabs.
**Features:**

- Search triggers AI chat modal
- Tab navigation (KB, Tickets, Feedback, FAQ, Contact, Changelog)
- Landing page with browse categories, trending topics, recently viewed, running tickets, what's new

### 3.13 AI Search Modal

**Purpose:** Quick AI search accessible from anywhere in the dashboard.
**Features:**

- Keyboard shortcut activation
- Inline search results
- Feedback modal
- Local search results
- Typing indicator
- Action buttons

### 3.14 Article View

**Purpose:** Display individual KB articles with rich content.
**Features:**

- Full article rendering from TipTap JSON
- Article view modal (popup)
- Help sidebar navigation
- On-this-page navigation (section anchors)
- Like/dislike feedback

### 3.15 Mobile Help Screen

**Purpose:** Mobile-optimized help center view.
**File:** `src/components/mobile/screens/MobileHelpScreen.tsx`

---

## 4. Data Isolation Model

| Scope              | Description                                        | Enforced By                                              |
| ------------------ | -------------------------------------------------- | -------------------------------------------------------- |
| **Tenant** (`tId`) | All user data is tenant-isolated                   | Firestore queries with `where('tId', '==', session.tId)` |
| **Store** (`sId`)  | Multi-store tenants have store-level isolation     | Firestore queries with `where('sId', '==', session.sId)` |
| **User** (`uId`)   | Chat sessions are per-user within tenant           | Firestore queries with `where('uId', '==', session.uId)` |
| **Platform**       | KB articles, categories are platform-wide (shared) | No tenant filter — all owners see same KB                |

**Critical distinction:** Knowledge Base is **global** (platform-wide), not tenant-scoped. All owners access the same KB articles. This is intentional — it's a platform help center, not per-tenant documentation.

---

## 5. Security Model

| Layer                    | Mechanism                                                                   |
| ------------------------ | --------------------------------------------------------------------------- |
| **Auth**                 | NextAuth session required for all dashboard routes                          |
| **API Rate Limiting**    | Upstash sliding window (30 req/min per user)                                |
| **SAFE_MODE**            | Kill switch for all AI routes during maintenance                            |
| **Input Validation**     | Zod schemas on search API (XSS prevention, buffer overflow prevention)      |
| **Image Validation**     | HTTPS-only, Firebase Storage host-only, 10MB max, path traversal prevention |
| **Content Sanitization** | `sanitizeFeedbackComment()` for user-submitted text                         |
| **Tenant Isolation**     | Every DAL query includes `tId` filter                                       |
| **Store Isolation**      | Critical queries include `sId` filter                                       |
| **Storage Paths**        | Tenant-scoped: `{collection}/{fileType}/{tId}/{sId}/{fileId}`               |

---

## 6. Cost Model Summary

See `help-center_firebase.md` for detailed cost breakdown.

**Key cost drivers:**

- Gemini API calls (embedding generation, answer generation, image analysis)
- Firestore reads (vector search, chat history, analytics aggregation)
- Firebase Storage (uploaded files, chat images, ticket attachments)

**Cost optimizations in place:**

- Embedding cache (avoids 40-60% of Gemini embedding calls)
- Response cache (avoids full RAG pipeline for repeated queries)
- Aggregated analytics (99.95% read reduction vs raw session queries)
- Hybrid live+aggregated dashboard (fresh today data + historical aggregates)

---

## 7. STEP 9C Production Readiness Audit (2026-03-04)

### Orchestration Layer Bugs Fixed

- Removed `console.error` from `WhatsNew.tsx`, `BrowseCategories.tsx`, `TrendingTopics.tsx`

### Full Feature Audit Summary (7 sub-features)

| Feature                |  Bugs Fixed  |                               Improvements                                | Web Research |
| ---------------------- | :----------: | :-----------------------------------------------------------------------: | :----------: |
| KB Generation Pipeline |  5 + 6 impl  | Job watchdog, retry, cancel, delete in review, quality scoring, freshness |      ✅      |
| Knowledge Base         |  5 + 3 impl  |             Article search, bulk status, freshness indicators             |      ✅      |
| AI QnA Chatbot         | 15+ + 3 impl |             Conversation limit, embedding TTL, error boundary             |      ✅      |
| Chat Monitoring        | 14 + 1 impl  |                           Batch metadata update                           |      ✅      |
| Changelog System       |  8 + 1 impl  |                      "New" badge for unread entries                       |      ✅      |
| Ticket System          | 17 + 1 impl  |                         CSAT satisfaction survey                          |      ✅      |
| Feedback System        | 3 (data fix) |                     Feature names updated to MenuList                     |      ✅      |
| **Total**              |   **~70**    |                                  **15**                                   |   **7/7**    |

### Industry Comparison (Sources: Userpilot, Zendesk, Intercom, Beamer, Featurebase)

All standard SaaS help center patterns covered: prominent search, category navigation, AI chatbot, KB, tickets with SLA, changelog, feedback, recently viewed, trending topics, mobile support, tab navigation.

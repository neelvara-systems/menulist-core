# Help Center — Decoupling Analysis (Future Standalone SaaS Readiness)

> **Version:** 1.0.0
> **Last Updated:** 2026-03-01
> **Audience:** Strategy, Architecture
> **Purpose:** Assess readiness for future separation into standalone support SaaS product
> **Rule:** This document assesses only. No redesign proposed.

---

## 1. Strategic Context

The Help Center is currently embedded within the MenuList dashboard as a feature module. The future intent is to extract it as a **standalone support infrastructure SaaS product** for other SaaS companies.

**Target ICP (future):** SaaS tool owners who need embedded support infrastructure
**End users (future):** Customers of those SaaS tools
**Base architecture:** Will remain Next.js + Firebase + Gemini

This analysis scores the current architecture across 7 dimensions for decoupling readiness.

### Current Client Boundary Note

As of 2026-05-25, MenuList `/help-center` behaves as an independent Answerlattice client when the signed-in user has `productAccounts.AL`. The client route scopes Help Center search, tickets, changelog, and Firebase Auth to Answerlattice ownership while preserving the original MenuList product scope in `sourceContext`. This is a real product-account bridge, not a temporary client flag or hardcoded MenuList widget embed.

---

## 2. Readiness Scores

| # | Dimension | Score (1-10) | Risk | Assessment |
|---|-----------|:---:|:---:|------------|
| 1 | **Data Isolation** | 7/10 | Low | KB is global (platform-wide), chat/tickets/changelog are tenant-scoped. Minor refactor needed for KB tenant isolation. |
| 2 | **Auth Abstraction** | 4/10 | Medium | Deeply coupled to NextAuth + MenuList session shape. `getActiveSession()` returns MenuList-specific `tId`, `sId`, `uId`. Would need auth adapter layer. |
| 3 | **Tenant Abstraction** | 6/10 | Medium | Tenant model works (tId/sId), but numeric IDs and MenuList-specific session fields are hardcoded throughout. Need generic tenant interface. |
| 4 | **Namespace Independence** | 5/10 | Medium | Collection names are generic (`chatSessions`, `supportTickets`). But `DB_COLLECTIONS` constant lives in MenuList's shared constants. File paths reference `@constant/database`, `@lib/apiHelper`, etc. |
| 5 | **Branding Independence** | 8/10 | Low | UI components use Ant Design with no MenuList-specific branding. Email in ContactUs (`partners@menulist.ai`) is only hard-coded brand reference in logic layer. |
| 6 | **API Boundary Clarity** | 6/10 | Medium | 3 clean API routes exist for AI search. But KB management, tickets, changelog all use client-side DAL (Firestore direct). Would need API route layer for multi-tenant SaaS. |
| 7 | **Infra Portability** | 5/10 | Medium | Tightly coupled to Firebase (Firestore, Storage, Cloud Functions, Vector Search). Gemini is sole LLM. Would need abstraction layers for alternative providers. |

**Overall Decoupling Difficulty Score: 6/10** (Medium difficulty)

---

## 3. Detailed Analysis Per Dimension

### 3.1 Data Isolation (7/10 — Low Risk)

**What works:**
- Chat sessions: Tenant-scoped (`tId + uId`)
- Chat analytics: Tenant+Store-scoped (`tId + sId`)
- Support tickets: Tenant+Store-scoped (`tId + sId`)
- Changelog: Tenant+Store-scoped (subcollection path `changelog/{tId}/{sId}`)
- Feedback: Tenant+Store+User-scoped
- Content feedback: Tenant+Store-scoped (subcollection)
- Search history: Tenant-scoped
- Storage paths: Tenant+Store-scoped (`{collection}/{fileType}/{tId}/{sId}/{fileId}`)

**What needs work:**
- `kb_articles` — **No tenant scoping**. Articles are global (platform-wide). For multi-tenant SaaS, each tenant needs their own KB. This requires either:
  - Adding `tId` field to articles + tenant filter on all queries (recommended)
  - Or separate collections per tenant (over-engineering)
- `kb_categories` — **Single global document**. Same issue as articles.
- `queryEmbeddings` — **No tenant scoping**. Cache keys are query-based, not tenant-scoped. Different tenants with same question would share cache.
- `kb_generation_jobs` — Has `tId + sId` fields but `getIngestionJobs()` fetches ALL jobs without filter.

**Effort estimate:** 2-3 days to add tenant scoping to KB collections and update all queries.

### 3.2 Auth Abstraction (4/10 — Medium Risk)

**Current coupling points:**

1. **`getActiveSession()`** — Returns MenuList-specific session with `tId`, `sId`, `uId`, `user.id`, `user.name`, `userName`. Used in:
   - All DAL files (tickets, changelog, feedback, chat sessions, search history)
   - API routes (search-kb, article-embedding)
   - Components (for display names, IDs)

2. **`requestBodyComposer()`** — Auto-injects `tId`, `sId`, `uId`, `createdBy`, `modifiedBy`, `createdOn`, `modifiedOn` from session. Every write operation depends on this.

3. **Platform role checks** — Support tickets admin uses `platformRole` check. KB management is platform-only.

4. **No explicit `withAuth()` on helpCenter API routes** — They rely on session being available rather than enforcing auth middleware.

**For standalone SaaS:**
- Need auth adapter interface: `getSession(): { tenantId, userId, userName }`
- Need to abstract `requestBodyComposer` to accept generic session shape
- Need tenant-aware auth middleware
- Need role abstraction (platform admin → SaaS admin, owner → SaaS tenant user)

**Effort estimate:** 5-7 days. Requires creating adapter layer without breaking existing MenuList functionality.

### 3.3 Tenant Abstraction (6/10 — Medium Risk)

**Current implementation:**
- Tenant ID (`tId`) and Store ID (`sId`) are numeric (stored as numbers in Firestore)
- IDs come from NextAuth session which gets them from MenuList's auth flow
- `requestBodyComposer` injects these automatically
- Queries use `where('tId', '==', session.tId)` pattern consistently

**For standalone SaaS:**
- Need generic `tenantId` (string, not numeric)
- `sId` concept may not apply (not all SaaS have "stores"). Could become optional "workspace" or "project" scope.
- Need tenant registration/provisioning flow
- Need tenant-level configuration (KB branding, chat widget settings, etc.)

**Effort estimate:** 3-5 days for core abstraction, plus ongoing work for tenant management features.

### 3.4 Namespace Independence (5/10 — Medium Risk)

**Current coupling:**
- `DB_COLLECTIONS` in `src/constants/database.ts` — Shared with ALL MenuList features. Help Center collections are mixed with menu, projects, billing collections.
- Path aliases (`@constant/`, `@lib/`, `@type/`, `@hook/`) — Standard across MenuList, but the actual files contain MenuList-specific imports and types.
- `src/lib/apiHelper/` — Shared utilities used by all features, not just Help Center.
- `src/lib/firebase/` — Shared Firebase initialization.
- `src/lib/auth/` — MenuList auth layer.

**For standalone SaaS:**
- Need to extract Help Center-specific collections into own constants file
- Need to extract shared utilities (`apiCallComposer`, `requestBodyComposer`) or create equivalent
- Firebase initialization can be parameterized (different project per tenant)

**Effort estimate:** 3-4 days for extraction. The DAL pattern itself is clean and portable.

### 3.5 Branding Independence (8/10 — Low Risk)

**Current MenuList references in Help Center code:**
- `ContactUsView.tsx:11` — `partners@menulist.ai` email
- `search-kb/route.ts:38` — Empty response mentions "Menu Management" in suggestions
- Historical note: image validation previously trusted only the MenuList Storage bucket. It now derives trusted bucket paths from configured MenuList and Answerlattice Firebase Storage env values, so Answerlattice QA/production image questions do not depend on `ecomsai`.

**Everything else is brand-agnostic:**
- UI components use Ant Design with no MenuList-specific styling
- Help Center layout is generic (could be any SaaS dashboard)
- Chat interface has no MenuList-specific branding
- KB explorer is fully generic

**Effort estimate:** < 1 day. Replace 3-4 hardcoded strings with configuration.

### 3.6 API Boundary Clarity (6/10 — Medium Risk)

**Current architecture:**
- **3 API routes** (clean boundaries): `search-kb`, `search-kb-stream`, `article-embedding`
- **All CRUD operations use client-side DAL** (Firestore direct from browser):
  - KB articles: Client-side read/write
  - KB categories: Client-side read/write
  - Chat sessions: Client-side read/write
  - Tickets: Client-side read/write
  - Changelog: Client-side read/write
  - Feedback: Client-side read/write

**For standalone SaaS:**
- Client-side Firestore access works within a single Firebase project
- Multi-tenant SaaS with separate Firebase projects per tenant would need API route layer
- Alternatively: Single shared Firebase project with security rules (current approach scales)
- Would need REST API for external integrations (widget embed, webhooks, etc.)

**Effort estimate:** 5-10 days if REST API layer needed. 0 days if staying single-project.

### 3.7 Infra Portability (5/10 — Medium Risk)

**Firebase dependencies:**
- **Firestore** — All data storage (17 collections)
- **Firestore Vector Search** — `findNearest()` with cosine distance
- **Firebase Storage** — File uploads (images, documents)
- **Firebase Cloud Functions** — Nightly aggregation, embedding workers, AI intelligence
- **Firebase Auth** (via NextAuth) — Session management

**Gemini dependencies:**
- `text-embedding-004` — Query and article embeddings
- `gemini-2.5-flash` — Answer generation
- `gemini-2.5-pro` — Image analysis
- `@google/genai` SDK — Direct Gemini API usage

**For alternative infra:**
- Firestore → Any document database with vector search (Pinecone, Weaviate, Supabase pgvector)
- Firebase Storage → S3, R2, any object storage
- Cloud Functions → Any serverless (AWS Lambda, Vercel functions)
- Gemini → OpenAI, Anthropic, or any LLM with embedding + chat + vision capabilities

**Effort estimate:** 10-15 days for full infra abstraction. Major undertaking but architecturally possible since DAL pattern creates natural abstraction boundaries.

---

## 4. Critical Blockers for Decoupling

| # | Blocker | Severity | Description | Resolution |
|---|---------|----------|-------------|------------|
| 1 | **KB tenant scoping** | High | KB articles are global, not per-tenant | Add tId to articles + category doc |
| 2 | **Auth adapter** | High | Session shape is MenuList-specific | Create auth adapter interface |
| 3 | **requestBodyComposer** | Medium | Auto-injects MenuList session fields | Parameterize or create equivalent |
| 4 | **Firestore Vector Search** | Medium | Uses Firestore-native vector search | Abstract behind search interface |
| 5 | **DB_COLLECTIONS sharing** | Low | Constants mixed with other features | Extract to own constants file |

---

## 5. Recommended Extraction Order (If/When)

1. **Phase 0:** Add tenant scoping to KB collections (prerequisite)
2. **Phase 1:** Create auth adapter interface (AuthProvider)
3. **Phase 2:** Extract Help Center constants and types into own package
4. **Phase 3:** Create DAL abstraction layer (DataProvider interface)
5. **Phase 4:** Build API route layer for all operations
6. **Phase 5:** Create embeddable widget (chat + KB explorer)
7. **Phase 6:** Tenant management (registration, provisioning, billing)
8. **Phase 7:** LLM provider abstraction (Gemini/OpenAI/Anthropic swappable)

**Estimated total effort:** 6-8 weeks for a senior developer.

---

## 6. What's Already Decoupled (Good News)

| Aspect | Status | Evidence |
|--------|--------|---------|
| **UI components** | ✅ Generic | Ant Design, no MenuList-specific components |
| **DAL pattern** | ✅ Clean | `apiCallComposer` + `requestBodyComposer` is a portable pattern |
| **Type system** | ✅ Self-contained | `types/knowledgeBase.ts`, `types/chatSession.ts`, `types/supportTicket.ts` are feature-specific |
| **RAG pipeline** | ✅ Modular | `lib/vectorEmbeddings/` is self-contained with clear inputs/outputs |
| **Hooks** | ✅ Portable | `useTicketCache`, `useChangelogCache`, `useFeedback` are standard SWR |
| **Cloud Functions** | ✅ Independent | Each CF has clear single responsibility |
| **Chat architecture** | ✅ Well-structured | Clean separation: orchestrator → panel → input → messages → hooks |
| **Ticket system** | ✅ Complete | Full lifecycle with SLA, messaging, audit trail |
| **Changelog** | ✅ Clever pagination | Transaction-based page rollover model is portable |

---

## 7. Product Name Suggestions

**Constraints:** Infrastructure-grade, not generic, category-creating, enterprise-expandable, globally neutral.

| # | Name | Rationale |
|---|------|-----------|
| 1 | **ResolveBase** | "Resolve" = action-oriented support. "Base" = infrastructure/platform. Implies foundational support system, not a tool. Expandable: ResolveBase for Enterprise, ResolveBase AI, etc. |
| 2 | **TrustLayer** | "Trust" = the outcome of good support. "Layer" = infrastructure positioning (like data layer, auth layer). Signals that this sits underneath the SaaS product as invisible infrastructure. Aligns with MenuList's "trust > engagement" doctrine. |
| 3 | **SupportFrame** | "Support" = clear purpose. "Frame" = structural foundation (like framework). Implies the skeleton that support is built on, not the support itself. Enterprise-ready: SupportFrame Pro, SupportFrame AI, SupportFrame for Teams. |

**Recommendation:** **TrustLayer** — Strongest category-creating potential, aligns with infrastructure positioning, and the "Layer" suffix signals that this is foundational infrastructure, not another helpdesk tool.

---

## 8. Summary

| Metric | Value |
|--------|-------|
| **Overall Decoupling Difficulty** | **6/10** (Medium) |
| **Estimated Extraction Effort** | 6-8 weeks (senior developer) |
| **Critical Blockers** | 2 (KB tenant scoping, auth adapter) |
| **Already Decoupled** | 9 major aspects (UI, DAL, types, RAG, hooks, CFs, chat, tickets, changelog) |
| **Highest Risk** | Auth abstraction (4/10) — deepest coupling |
| **Lowest Risk** | Branding independence (8/10) — almost no MenuList branding |

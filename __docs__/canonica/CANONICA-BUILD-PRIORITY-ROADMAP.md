# Canonica — Build Priority Roadmap

> **Created:** 2026-03-07
> **Sources:** Internal docs audit (5 documents) + Industry research (8 sources) + Codebase truth
> **Purpose:** Single consolidated priority list for what to build next in Canonica
> **Rule:** Prioritize by: (1) Can users USE the product? → (2) Can users TRUST the product? → (3) Can users LOVE the product?

---

## Current State (What's Built)

Canonica has **complete backend infrastructure** across all 5 pillars:

- ✅ Product Ontology (entity extraction, candidates, promotion, search index)
- ✅ Canonical Answer Engine (3-layer deterministic retrieval, version-aware, scope-filtered)
- ✅ Drift Governance (4 drift classes, nightly batch, auto-clearing)
- ✅ Signal Mutation (signal emission, clustering, mutation proposals, human approval UI)
- ✅ Nightly Scheduler (7-step batch: drift + resolution + mutation + coverage + fallback + impact + confidence)
- ✅ Coverage KPI tracking
- ✅ Activation Experiment Framework defined

**What's NOT built:** Distribution layer. No way for SaaS founders (Canonica's ICP) to actually USE Canonica inside their own products.

---

## Priority Tiers

### Tier 0 — ACTIVATION (Do First, Before Any Features)

These are **manual founder actions** that must happen before ANY feature work. No code needed.

| #    | Action                                             | Doc Reference                                     | Status      |
| ---- | -------------------------------------------------- | ------------------------------------------------- | ----------- |
| 0.1  | Create Canonica Firebase project in GCP            | `doctrine/10-implementation-action-items.md` §1   | ⬜ NOT DONE |
| 0.2  | Fill CANONICA*FIREBASE*\* env vars (.env + Vercel) | `doctrine/10-implementation-action-items.md` §2-3 | ⬜ NOT DONE |
| 0.3  | Move Cloud Functions to functions-canonica/        | `doctrine/10-implementation-action-items.md` §4-6 | ⬜ NOT DONE |
| 0.4  | Deploy both function sets                          | `doctrine/10-implementation-action-items.md` §7   | ⬜ NOT DONE |
| 0.5  | Enable `ENABLE_CANONICA_NIGHTLY` (CF flag)         | `canonica-activation-clearance.md` §13            | ⬜ NOT DONE |
| 0.6  | Enable `ENABLE_CANONICA_SIGNAL_MUTATION`           | `canonica-activation-clearance.md` §13            | ⬜ NOT DONE |
| 0.7  | Run entity extraction on KB articles               | `canonica-activation-clearance.md` §13            | ⬜ NOT DONE |
| 0.8  | Approve 20-40 entity candidates                    | `canonica-activation-experiment.md` §5            | ⬜ NOT DONE |
| 0.9  | Create 20-40 canonical answers                     | `canonica-activation-experiment.md` §5            | ⬜ NOT DONE |
| 0.10 | Enable remaining Canonica flags one by one         | `canonica-activation-experiment.md` §5            | ⬜ NOT DONE |

**Why first:** All backend infrastructure exists but has NEVER been activated. Zero real data. Must prove the system works with real traffic before building distribution layer.

---

### Tier 1 — DISTRIBUTION (Required for Any External User)

Without these, no SaaS founder can use Canonica. These are **adoption requirements**, not features.

| #   | Feature                                           | Why Critical                                                                                                                                             | Effort | Source                                                                                                                                                        |
| --- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| 1.1 | **Canonica Website (canonica.app)** ✅            | Product needs a public face. No one can discover/evaluate Canonica without a website.                                                                    | Medium | **DONE** (2026-03-07). 6 pages, shared components, Tailwind, dark theme, full SEO. Docs: `canonica-website/`                                                  |
| 1.2 | **Embeddable Help Widget** ✅                     | 91% of users prefer in-app self-service (industry data). SaaS founders MUST embed help inside their product. Without widget, Canonica is dashboard-only. | High   | **DONE** (2026-03-07). Embed script + iframe page + public API + feature flag. Docs: `help-widget/`                                                           |     |
| 1.3 | **Email Notifications (Tickets)** ✅              | Users have no way to know a ticket is answered. Universal standard — every support system has this. Without it, ticket system is broken.                 | Medium | **DONE** (2026-03-07). Generic notification service + 3 ticket templates + API route. Docs: `email-notifications/`                                            |
| 1.4 | **Public API (KB + Tickets + Canonical Answers)** | SaaS founders need programmatic access. Without API, Canonica is locked inside dashboard. Prevents integration with Slack, custom systems, CI/CD.        | High   | `doctrine/06-strategic-gap-analysis.md` Tier 1 Gap #3. `doctrine/07-execution-roadmap.md` Sprint 7. Feature flag `ENABLE_CANONICA_PUBLIC_API` already exists. |
| 1.5 | **Multi-Tenant Onboarding Flow** ✅               | Currently Canonica has ONE tenant (MenuList). Need a way for external SaaS founders to sign up and configure their instance.                             | High   | **DONE** (2026-03-07). Self-service signup, Google OAuth, atomic provisioning, beta plan, API key gen. Docs: `client-onboarding/`                             |

**Industry validation:** Every KB platform compared in research (Zendesk, Intercom, Freshdesk, Document360, Help Scout, HelpCrunch, Pylon) ships with embeddable widget + API + email notifications as baseline. These are not differentiators — they are table stakes.

---

### Tier 2 — GOVERNANCE UX (Make the Backend Usable) ✅ COMPLETE

Backend infrastructure works. Admin UX is minimal. These make governance practical for daily use.

| #   | Feature                         | Why Important                                                                                                        | Effort | Status                                                                                                |
| --- | ------------------------------- | -------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------- |
| 2.1 | **Canonical Answer Editor UI**  | Currently no UI to create/edit canonical answers. Must write directly to Firestore. Admin needs a structured editor. | Medium | ✅ **DONE** (2026-03-07). Full CRUD, entity binding, version mgmt, content editing, drift indicators. |
| 2.2 | **Entity Management Dashboard** | No visual entity management. Need list view + create/edit/merge entities + see relationships.                        | Medium | ✅ **DONE** (2026-03-07). List/create/edit/deprecate, relations, search index, type filters, search.  |
| 2.3 | **Drift Dashboard**             | Drifted answers visible via DAL only. Need visual dashboard showing drifted count per entity with drill-down.        | Medium | ✅ **DONE** (2026-03-07). 4-class breakdown, summary stats, resolve actions, re-evaluate on demand.   |
| 2.4 | **Answer Usage Analytics**      | Track which canonical answers are served most/least/never. Identifies gaps and dead content.                         | Low    | ✅ **DONE** (2026-03-07). Usage ranking, content gaps, negative feedback, never-used detection.       |
| 2.5 | **Entity Health Score**         | Composite score: signal rate + drift status + answer coverage. Quick view of ontology health.                        | Low    | ✅ **DONE** (2026-03-07). Weighted composite (coverage 40%, drift 30%, signal 20%, index 10%).        |

---

### Tier 3 — SIGNAL QUALITY (Make Governance Smarter) ✅ COMPLETE

Improve the quality of signals and mutation proposals after real-world data proves the basic loop works.

| #   | Feature                                | Why Important                                                                                       | Effort | Status                                                                                                  |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------- |
| 3.1 | **Signal Severity Weighting**          | Currently all signal types equal. Escalations should weight 3x. Improves mutation proposal quality. | Low    | ✅ **DONE** (2026-03-07). Escalation=3x, Ticket=1.5x, Chat=1x weights in signalMutation.ts              |
| 3.2 | **Signal Time Decay**                  | Recent signals weighted higher than old ones. Prevents stale signals from dominating clusters.      | Low    | ✅ **DONE** (2026-03-07). Exponential decay with 7-day half-life in signalMutation.ts                   |
| 3.3 | **Batch Signal Count Queries**         | Currently N reads per entity in drift loop. Batch with `in` query for 10-30x read reduction.        | Medium | ✅ **DONE** (2026-03-07). getBatchSignalCounts() in signalEvents.ts, used by driftDetection.ts          |
| 3.4 | **Canonical Answer Version History**   | Answer-level changelog. Proves governance rigor. Audit trail exists but no per-answer history view. | Low    | ✅ **DONE** (2026-03-07). getAnswerVersionHistory() DAL + AnswerVersionHistory.tsx UI in governance hub |
| 3.5 | **Signal TTL (12-month auto-archive)** | Doctrine says archive > 12 months. No TTL implemented. Prevents unbounded signal growth.            | Low    | ✅ **DONE** (2026-03-07). archiveExpiredSignals() in signalEvents.ts, called by nightly scheduler       |

---

### Tier 4 — COMPETITIVE DIFFERENTIATORS (Make Canonica Stand Out) — Partial ✅

Only build AFTER Tiers 1-3 are solid.

| #   | Feature                                            | Why Important                                                                                 | Effort | Status                                                                                                                           |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------- |
| 4.1 | **White-Label / Custom Branding**                  | SaaS founders want brand-matched help center. Standard expectation for B2B.                   | Medium | ✅ **DONE** (2026-03-07). CanonicaBrandingConfig type + WhiteLabelBranding.tsx settings UI. Flag: `ENABLE_CANONICA_WHITE_LABEL`  |
| 4.2 | **Multi-Language KB Articles**                     | 75% of internet users non-English. next-intl exists but articles English-only.                | Medium | ✅ **DONE** (2026-03-07). CanonicaArticleTranslation type + MultiLanguageArticles.tsx UI. Flag: `ENABLE_CANONICA_MULTI_LANGUAGE` |
| 4.3 | **Live Chat / Agent Handoff**                      | AI can't solve everything. Users need real-time human escalation path.                        | High   | ⬜ DEFERRED — Requires proven demand from paying Canonica clients first                                                          |
| 4.4 | **Canonical Answer Embeddings (Hybrid Retrieval)** | Generate embeddings for canonical answers. Enables hybrid deterministic + semantic retrieval. | Medium | ⬜ DEFERRED — Deterministic retrieval sufficient at current scale                                                                |

---

### Tier 5 — FUTURE (Don't Build Until Demand Proven)

| #   | Feature                               | Source                                                |
| --- | ------------------------------------- | ----------------------------------------------------- |
| 5.1 | In-App Onboarding Tours               | `doctrine/06-strategic-gap-analysis.md` Tier 2 Gap #5 |
| 5.2 | Omnichannel (Email, Social, WhatsApp) | `doctrine/06-strategic-gap-analysis.md` Tier 2 Gap #8 |
| 5.3 | Community Forum                       | `doctrine/06-strategic-gap-analysis.md` Tier 3        |
| 5.4 | Status Page                           | `doctrine/06-strategic-gap-analysis.md` Tier 3        |
| 5.5 | Canned Responses / Macros             | `doctrine/06-strategic-gap-analysis.md` Tier 3        |
| 5.6 | CSAT Auto-Send after resolution       | `doctrine/06-strategic-gap-analysis.md` Tier 3        |
| 5.7 | Ticket Auto-Close (stale)             | `doctrine/06-strategic-gap-analysis.md` Tier 3        |

---

## Permanently Rejected (Do Not Build)

From `canonica-strategic-improvements.md` §10 + `doctrine/02-non-goals-charter.md`:

1. Ontology export format (no external consumers)
2. LLM-based drift detection (violates doctrine — must be deterministic)
3. Auto-approval of mutation proposals (violates human-in-the-loop invariant)
4. Real-time drift detection (nightly batch is sufficient for SMB scale)
5. Embedding-based entity matching as primary (deterministic index is primary per doctrine)
6. Escalation signal weighting (no escalation flow exists yet)
7. Cross-entity drift propagation (premature — basic drift not proven)
8. Multi-language canonical answers (English KB only today — articles first)
9. Entity relationship graph visualization (developer tool, not SMB ICP tool)
10. Advanced ticket routing
11. Agent gamification
12. Marketing site feature explosion
13. Compliance suite
14. Marketplace integrations
15. Fancy analytics dashboards
16. AI rewriting everywhere
17. PLG onboarding sprawl

---

## Recommended Execution Order

```
PHASE 1: PROVE (Weeks 1-4)
├── Tier 0: Activate on MenuList (manual founder steps)
├── Run 4-week experiment per canonica-activation-experiment.md
└── Collect data: hit rate, feedback delta, latency, drift rate

PHASE 2: DISTRIBUTE (Weeks 5-12)
├── 1.1: Canonica website (real content, not placeholder)
├── 1.2: Embeddable help widget
├── 1.3: Email notifications for tickets
├── 1.4: Public API (KB + canonical answers + signals)
└── 1.5: Multi-tenant onboarding

PHASE 3: GOVERN (Weeks 13-18) ✅ COMPLETE (2026-03-07)
├── 2.1: Canonical answer editor UI ✅
├── 2.2: Entity management dashboard ✅
├── 2.3: Drift dashboard ✅
├── 2.4: Answer usage analytics ✅
└── 2.5: Entity health score ✅

PHASE 4: SHARPEN (Weeks 19-24) ✅ COMPLETE (2026-03-07)
├── 3.1: Signal severity weighting ✅ (escalation=3x, ticket=1.5x, chat=1x)
├── 3.2: Signal time decay ✅ (7-day half-life exponential)
├── 3.3: Batch signal count queries ✅ (10-30x read reduction)
├── 3.4: Answer version history ✅ (DAL + governance UI tab)
├── 3.5: Signal TTL 12-month auto-archive ✅
├── 4.1: White-label branding ✅ (CanonicaBrandingConfig + settings UI)
└── 4.2: Multi-language articles ✅ (CanonicaArticleTranslation + management UI)
```

---

## How This Consolidates All Existing Docs

| Existing Doc                                                  | Covered In                           |
| ------------------------------------------------------------- | ------------------------------------ |
| `canonica-strategic-improvements.md` §10 Remaining (5 items)  | Tiers 2-3 (#2.3, 2.4, 2.5, 3.3, 3.4) |
| `canonica-activation-clearance.md` §13 Limitations (6 items)  | Tiers 0-2                            |
| `canonica-activation-experiment.md` §9 Post-Experiment        | Tiers 2-3                            |
| `doctrine/06-strategic-gap-analysis.md` Tier 1-3 (13 gaps)    | Tiers 1-5                            |
| `doctrine/07-execution-roadmap.md` Q1-Q4                      | Mapped to Phases 1-4                 |
| `doctrine/10-implementation-action-items.md` (8 manual steps) | Tier 0                               |

**This document is now the SINGLE SOURCE OF TRUTH for Canonica build priorities.** Other docs remain as reference for design details and rationale.

---

## Industry Research Summary

### What Every KB Platform Ships With (Table Stakes)

- Embeddable widget (Document360, Intercom, Zendesk, Help Scout, Freshdesk)
- API access (REST, GraphQL, or webhooks)
- Email notifications on ticket updates
- Multi-language support
- Custom branding / white-label
- AI-powered search
- Analytics dashboard

### What Canonica Has That NO Competitor Has

- **Canonical Answer Engine** — Deterministic, versioned, entity-bound answers
- **4-Class Drift Governance** — Detects stale answers automatically
- **Signal Mutation Engine** — Converts support friction into knowledge proposals
- **Product Ontology** — First-class product entities with relationships
- **KB Generation Pipeline** — Upload files → AI generates articles
- **Coverage KPI** — Measures canonical vs RAG ratio

### What Canonica Lacks That EVERY Competitor Has

1. Embeddable widget ← **Must build (Tier 1)**
2. Email notifications ← **Must build (Tier 1)**
3. Public API ← **Must build (Tier 1)**
4. Multi-language ← ✅ **BUILT** (Phase 4)
5. Live chat / agent handoff ← **Deferred** (Tier 4, needs demand)
6. White-label ← ✅ **BUILT** (Phase 4)

### Key Industry Stats (2025-2026)

- 91% of users prefer in-app self-service if accessible (Knowledge Base stats)
- 85% of customer interactions handled without human agent by 2026 (Gartner)
- 80% of common issues resolved by AI autonomously by 2029 (Research prediction)
- Companies with robust KB see 15-30% ticket reduction (industry average)

---

## Version History

| Date       | Change                                                                                                                                                                                                                                                                                                                                                     |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-03-07 | Initial consolidated roadmap from 5 internal docs + industry research                                                                                                                                                                                                                                                                                      |
| 2026-03-07 | Phase 3 (GOVERN) — All 5 Tier 2 features implemented: Answer Editor, Entity Dashboard, Drift Dashboard, Answer Analytics, Entity Health Score. Feature flag: `ENABLE_CANONICA_GOVERNANCE_UI`                                                                                                                                                               |
| 2026-03-07 | Phase 4 (SHARPEN) — All 7 features implemented: Signal Severity Weighting (3.1), Time Decay (3.2), Batch Signal Queries (3.3), Answer Version History (3.4), Signal TTL (3.5), White-Label Branding (4.1), Multi-Language Articles (4.2). Feature flags: `ENABLE_CANONICA_SIGNAL_QUALITY`, `ENABLE_CANONICA_WHITE_LABEL`, `ENABLE_CANONICA_MULTI_LANGUAGE` |

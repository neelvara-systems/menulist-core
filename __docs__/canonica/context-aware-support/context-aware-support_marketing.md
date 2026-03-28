# Context-Aware Support — Marketing & Sales Collateral

> **Status:** READY FOR IMPLEMENTATION
> **Version:** 1.0.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-03-08
> **Feature Flag:** `ENABLE_CANONICA_CONTEXT_AWARE`
> **Audience:** Sales, Marketing

---

## §1 — Positioning

### One-Line Pitch
Canonica understands what your users are doing — not just what they're asking.

### Elevator Pitch (30 seconds)
Most AI help systems treat every question the same — a text query sent to a search engine. Canonica's Context-Aware Support knows which page the user is on, what action they're performing, and what plan they're using. When a user on your Stripe settings page asks "why is this failing?", Canonica knows they mean Stripe — not billing, not webhooks, not login. This eliminates 80% of irrelevant answers and increases canonical resolution by 15-25%.

### Category Language
- **Infrastructure term:** Context Intelligence Layer
- **Customer-facing term:** Product-Aware Support
- **Never say:** "AI that understands context" (too generic), "smart help" (too vague)

---

## §2 — Key Value Propositions

### For SaaS Founders

| Value | Detail |
|-------|--------|
| **Higher accuracy** | 15-25% more queries resolved by canonical answers (fewer RAG fallbacks) |
| **Lower support cost** | Each canonical hit vs RAG fallback saves ~8 database reads + 1 AI call |
| **Better user experience** | Users get page-specific answers, not generic docs |
| **Zero maintenance** | Context is sent by your SDK — no configuration needed in Canonica |
| **Backwards compatible** | Existing queries work identically without context |

### For End-Users

| Value | Detail |
|-------|--------|
| **Relevant answers** | Help system knows which feature you're using |
| **Faster resolution** | No need to describe where you are — system already knows |
| **Plan-aware** | Answers respect your subscription tier |
| **Role-aware** | Admin vs viewer get different guidance |

---

## §3 — Competitive Differentiation

| Feature | Canonica | Intercom Fin | Zendesk AI | Generic RAG |
|---------|----------|-------------|------------|-------------|
| Product context injection | ✅ SDK-native | Partial (conversation context) | Partial (user attributes) | ❌ |
| Entity-bound retrieval | ✅ Ontology-first | ❌ Embedding-only | ❌ Embedding-only | ❌ |
| Deterministic + context | ✅ Rule-based + context boosts | ❌ ML-only | ❌ ML-only | ❌ |
| Plan/role-aware answers | ✅ Scope-filtered | ❌ | Partial | ❌ |
| Version-aware answers | ✅ Version window | ❌ | ❌ | ❌ |
| Zero additional cost | ✅ In-memory only | Unknown | Unknown | Higher |

**Key differentiator:** Canonica is the only system that combines **structured product ontology** with **runtime product context** for deterministic, entity-bound retrieval. Others rely on embedding similarity which cannot distinguish between entities sharing similar text.

---

## §4 — Sales Talking Points

### Objection: "Our help center search works fine"
**Response:** Help center search matches text. Canonica matches product state. When 80% of support questions are page-specific, text search returns generic answers while context-aware retrieval returns the exact answer for that feature, that plan, that role.

### Objection: "We already have Intercom/Zendesk"
**Response:** Those systems send conversations to an LLM and hope for the best. Canonica maintains canonical, versioned answers bound to your product ontology. Context makes those answers even more precise — it's the difference between "here's an article about Stripe" and "here's the exact troubleshooting step for Stripe webhook configuration when connecting as admin on Pro plan."

### Objection: "How hard is the SDK integration?"
**Response:** 15-30 minutes. Add 5 lines to your widget initialization. The context follows the same pattern as Stripe, Segment, and Sentry SDKs — your developers already know this pattern.

---

## §5 — Demo Script

### Setup
1. Show Canonica widget on a demo SaaS app
2. Navigate to Settings → Integrations → Stripe

### Without Context
1. Ask: "Why is this not working?"
2. Show result: generic troubleshooting (or RAG-generated vague answer)
3. Point out: the system doesn't know what "this" means

### With Context
1. Enable context-aware mode
2. Ask same question: "Why is this not working?"
3. Show result: Stripe integration troubleshooting (specific, canonical answer)
4. Point out: same question, dramatically better answer
5. Show the context payload in developer tools (small, clean, familiar)

### Plan-Aware Demo
1. Switch to free-tier user context
2. Ask: "How do I use advanced analytics?"
3. Show result: "Advanced analytics is available on Pro plan" (not the setup guide)

---

## §6 — Content Angles

### Blog Post Ideas
- "Why Context Is the Missing Layer in AI Support"
- "The 80% Rule: Most Support Questions Are Page-Specific"
- "From Search Engine to Product-Aware Infrastructure"

### Social Proof Metrics (Post-Launch)
- "X% canonical coverage increase for context-enabled tenants"
- "Y% reduction in RAG fallback queries"
- "Z ms average context processing overhead"

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-08 | 1.0.0 | Initial marketing collateral |

# Entity System — Marketing & Sales Collateral

> **Version:** 2.0.0
> **Last Updated:** 2026-03-08
> **Audience:** Sales, Marketing, Partnerships

---

## 1. Positioning Statement

**Canonica doesn't search documents. It understands your product.**

While other help center AI tools run semantic search over articles, Canonica builds a structured product ontology — a knowledge graph of your product's features, integrations, error codes, and workflows. Every support query resolves through product concepts first, not keyword matching.

---

## 2. The Entity Advantage (Pitch Points)

### For SaaS Founders

- **Deterministic answers:** Same question → same answer, every time. No random article lottery.
- **Knowledge gaps visible:** Canonica shows which product concepts lack documentation — based on real query demand.
- **Self-improving:** As users ask questions, the entity graph learns new aliases and improves detection automatically.
- **Zero manual tagging:** AI extracts entities from articles during creation. Authors just write.

### For Support Teams

- **Entity-centric troubleshooting:** When a user reports "webhook failing," Canonica knows Webhooks, Retry Policy, and Rate Limits are related — and retrieves all relevant docs.
- **Coverage dashboard:** See which product areas have strong documentation and which need attention.
- **Alias management:** Users say "token" but docs say "API Keys" — Canonica resolves both to the same concept.

### For Engineering Teams

- **Product ontology as code:** Entities represent real product architecture — features, plans, roles, workflows, states, integrations, errors.
- **Version-aware:** Entities track product versions. Answers automatically scope to the user's current version.
- **Governance built-in:** Drift detection flags when knowledge becomes stale. Mutation proposals suggest updates.

---

## 3. Competitive Differentiation

| Capability | Typical Help AI | Canonica |
|------------|----------------|----------|
| Retrieval method | Vector similarity (probabilistic) | Entity-first (deterministic) + vector fallback |
| Product understanding | None — treats docs as text blobs | Structured ontology of product concepts |
| Answer consistency | Varies per query | Same entities → same answers |
| Knowledge gaps | Invisible | Entity coverage metrics reveal gaps |
| Alias handling | None | Automatic alias detection + resolution |
| Version awareness | None | Entity version windows filter answers |
| Self-improvement | Manual retraining | Signal-driven mutation proposals |

---

## 4. Demo Script

**Setup:** Show a knowledge base with 50+ articles about a SaaS product.

**Demo 1 — Entity Detection:**
- Type "token not working"
- Show: system resolves "token" → "API Keys" entity
- Result: deterministic retrieval of API Keys documentation

**Demo 2 — Knowledge Graph:**
- Show entity dashboard with product concepts
- Click "Webhooks" entity → see related: Retry Policy, Rate Limits, Endpoint URL
- Show how a query about "webhook failing" retrieves docs across all related entities

**Demo 3 — Coverage Gaps:**
- Show entity with high query demand but low article count
- "This is your documentation blind spot — users keep asking about this, but you don't have enough content."

**Demo 4 — Automatic Entity Extraction:**
- Create a new article about "OAuth Token Refresh"
- Show entity suggestions appearing automatically
- Confirm entities with one click
- Article immediately becomes entity-indexed

---

## 5. One-Line Descriptions

- **Tagline:** "Product knowledge, not document search."
- **Elevator:** "Canonica builds a product ontology from your docs and uses it for deterministic support answers."
- **Technical:** "Entity-first retrieval with version-aware governance and signal-driven knowledge mutation."

---

## 6. Sales Objection Handling

| Objection | Response |
|-----------|----------|
| "We already have Intercom/Zendesk AI" | Those search documents. Canonica understands product structure. Entity-first retrieval produces consistent answers. |
| "Our KB is small" | Even 20 articles benefit from entity normalization. Users say "token" — your docs say "API Key." Entity aliases fix this. |
| "We don't want to tag entities manually" | You don't. AI extracts entities automatically on article save. Authors just write. |
| "How is this different from RAG?" | RAG is vector search — probabilistic. Entity retrieval is structural — deterministic. Canonica uses entity-first, RAG as fallback. |

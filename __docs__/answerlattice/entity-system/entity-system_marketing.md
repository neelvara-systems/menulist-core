# Entity System — Marketing & Sales Collateral

> **Version:** 2.1.0
> **Last Updated:** 2026-07-18
> **Audience:** Sales, Marketing, Partnerships

---

## 1. Positioning Statement

**Answerlattice governs product concepts before fallback searches documents.**

Answerlattice combines a structured product ontology with approved canonical answers and bounded knowledge-base fallback. The ontology represents product features, integrations, errors, roles, plans, states, and workflows; it does not make generated answers authoritative.

---

## 2. The Entity Advantage (Pitch Points)

### For SaaS Founders

- **Canonical authority:** Matching canonical questions return the approved answer; fallback remains explicitly non-canonical.
- **Knowledge gaps visible:** Answerlattice shows which product concepts lack documentation — based on real query demand.
- **Governed improvement:** Support signals can produce review work; they do not silently rewrite entities or aliases.
- **Assisted tagging:** When ontology is enabled, post-save extraction reuses known entities and proposes new concepts for review.
- **Controlled lifecycle:** A product concept cannot be deprecated while approved answers, support content, product surfaces, or relationships still depend on it.

### For Support Teams

- **Entity-centric troubleshooting:** When a user reports "webhook failing," governed entity relationships can add relevant product context without allowing fallback evidence to override an approved answer.
- **Coverage dashboard:** See which product areas have strong documentation and which need attention.
- **Alias management:** Users say "token" but docs say "API Keys" — Answerlattice resolves both to the same concept.

### For Engineering Teams

- **Product ontology as code:** Entities represent real product architecture — features, plans, roles, workflows, states, integrations, errors.
- **Version-aware answers:** Approved answers can carry explicit version applicability and validation windows.
- **Governance built-in:** Drift detection flags when knowledge becomes stale. Mutation proposals suggest updates.

---

## 3. Competitive Differentiation

| Capability | Typical Help AI | Answerlattice |
|------------|----------------|----------|
| Retrieval method | Usually document or vector retrieval | Canonical first, deterministic entity resolution, then bounded fallback |
| Product understanding | None — treats docs as text blobs | Structured ontology of product concepts |
| Answer consistency | Generated output may vary | Approved canonical answers remain authoritative |
| Knowledge gaps | Invisible | Entity coverage metrics reveal gaps |
| Alias handling | Varies | Owner-governed aliases with deterministic resolution |
| Product-change propagation | Often manual | Bounded governed merge updates dependent answers, articles, FAQs, product surfaces, relationships, and search index together |
| Version awareness | Varies | Explicit answer version windows |
| Self-improvement | Manual retraining | Signal-driven mutation proposals |

---

## 4. Demo Script

**Setup:** Use a real, owner-approved SaaS knowledge base and representative support questions.

**Demo 1 — Entity Detection:**
- Type "token not working"
- Show: system resolves "token" → "API Keys" entity
- Result: deterministic entity resolution followed by an approved answer or bounded fallback

**Demo 2 — Knowledge Graph:**
- Show entity dashboard with product concepts
- Click "Webhooks" entity → see related: Retry Policy, Rate Limits, Endpoint URL
- Show how a query about "webhook failing" uses approved relationships without overriding canonical authority

**Demo 3 — Coverage Gaps:**
- Show entity with high query demand but low article count
- "This is your documentation blind spot — users keep asking about this, but you don't have enough content."

**Demo 4 — Post-Save Entity Extraction:**
- Enable ontology for the demo workspace
- Create a new article about "OAuth Token Refresh"
- Show the best-effort post-save extraction result
- Review any new entity candidates in the governance queue
- Show the linked entities after the protected route succeeds
- Change the article during a test extraction and show that stale provider output is rejected rather than applied

---

## 5. One-Line Descriptions

- **Tagline:** "Product knowledge, not document search."
- **Elevator:** "Answerlattice structures product concepts, serves approved answers first, and uses bounded fallback when approved truth is not available."
- **Technical:** "Canonical-first retrieval with deterministic entity resolution, explicit applicability, and human-reviewed knowledge mutation."

---

## 6. Sales Objection Handling

| Objection | Response |
|-----------|----------|
| "We already have Intercom/Zendesk AI" | Answerlattice is the governed authority layer behind support surfaces: approved answers, product applicability, dependency tracking, and reviewable change. |
| "Our KB is small" | Start with the repeated questions whose wrong answers cost founder time. Entity aliases help when user language and product terminology differ. |
| "We don't want to tag entities manually" | With ontology enabled, Answerlattice matches known entities after article save and sends genuinely new concepts to review. |
| "How is this different from RAG?" | Retrieval is a mechanism. Answerlattice keeps approved answers authoritative, records applicability and evidence, and turns unresolved gaps into human review. |

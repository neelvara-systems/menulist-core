# Canonica — Guided Workflows: Marketing & Sales Collateral

> **Status:** DESIGNED — Ready for Implementation
> **Version:** 1.0.0
> **Created:** 2026-03-08
> **Last Updated:** 2026-03-08
> **Audience:** Sales, Marketing

---

## §1 — Positioning

### One-Liner
Canonica delivers deterministic, step-by-step procedure answers — not AI-generated paragraphs — for "how to" support queries.

### Elevator Pitch (30 seconds)
Most AI support tools answer procedural questions with paragraphs. Your users ask "how do I invite a teammate?" and get a wall of text. Canonica returns numbered, structured steps — like an internal SOP, not a chatbot response. Steps are version-tracked, entity-bound, and governed. When your product UI changes, Canonica flags outdated procedures automatically.

---

## §2 — Key Differentiators

| Feature | Typical AI Help Center | Canonica |
|---------|----------------------|----------|
| Procedure answers | AI-generated text blob | Structured atomic steps |
| Version tracking | None | Product version-bound with drift detection |
| Accuracy | Probabilistic (may hallucinate) | Deterministic (human-approved steps) |
| Warnings | Omitted by AI | Structured severity-based warnings |
| Prerequisites | Not tracked | Role/plan/state-aware prerequisites |
| Update governance | Manual review | Mutation pipeline with signal-driven proposals |

---

## §3 — Target Audience Pain Points

### SaaS Founders
- "Our AI chatbot gives users long paragraphs for simple how-to questions"
- "When we change the UI, support articles become outdated silently"
- "Users follow old instructions and get stuck, then create tickets"

### Support Teams
- "We answer the same procedural questions repeatedly"
- "Our KB articles are paragraphs that users don't read"
- "When the product changes, we don't know which articles to update"

---

## §4 — Sales Talking Points

1. **Deterministic, not generative** — Procedure answers come from governed, human-approved steps. Not AI generation. Same query = same answer = consistent support.

2. **Version-aware** — Procedures are bound to product versions. When you release a new version, Canonica flags potentially outdated procedures for review.

3. **Structured for rendering** — Widget clients receive structured JSON (steps, warnings, prerequisites). Can render as numbered lists, guided walkthroughs, or interactive tutorials.

4. **Zero additional infrastructure cost** — Procedure data is embedded in existing canonical answer documents. No new databases, no additional query costs.

5. **Works with existing governance** — Same drift detection, mutation pipeline, and audit logging that governs text answers also governs procedure answers.

---

## §5 — Objection Handling

| Objection | Response |
|-----------|----------|
| "We already have documentation" | Documentation is paragraphs. Canonica procedures are atomic steps — versioned, governed, and directly served via API. |
| "AI can generate step-by-step answers" | AI generates plausible steps. Canonica serves verified steps. The difference matters when your user follows incorrect AI steps and breaks something. |
| "Too much effort to create procedures" | Most SaaS products have 50-120 procedures. Once created, they're governed automatically. Future: AI-assisted drafting from existing docs. |

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-08 | 1.0.0 | Initial marketing collateral |

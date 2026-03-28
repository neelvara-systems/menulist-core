# Canonica — Doctrine & Strategic Governance

> **Status:** LOCKED
> **Last Updated:** 2026-03-02
> **Purpose:** Binding governance documents for Canonica (the Help Center's future as standalone support infrastructure platform)
> **Source:** ChatGPT strategic session (March 2026) + Cascade codebase validation

---

## What Is This

This folder contains the **strategic and architectural governance documents** for Canonica — the long-term vision for the Help Center system to become a standalone **Support Knowledge Control Plane for SaaS**.

These documents are binding. They govern product direction, architecture decisions, feature rejection, and execution discipline.

---

## Document Index

| #   | Document                                       | Purpose                                                                                                                           | Authority                                          |
| --- | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| 1   | `01-core-doctrine.md`                          | Product identity, naming, 5 pillars, retrieval doctrine, evolution path, current state assessment                                 | **BINDING** — All decisions must align             |
| 2   | `02-non-goals-charter.md`                      | What Canonica will NOT become (helpdesk, CMS, AI autopilot, compliance, analytics)                                                | **PERMANENT** — Requires RFC to override           |
| 3   | `03-infrastructure-freeze-v1.md`               | 3-year freeze: what's frozen, what's allowed, freeze-break procedure                                                              | **LOCKED** — 3 years, additive only                |
| 4   | `04-market-validation.md`                      | TAM, ICP, moat analysis, distribution, monetization, 5-year durability                                                            | **STRATEGIC** — Informs product decisions          |
| 5   | `05-architecture-evolution.md`                 | 5-pillar assessment, schemas (adapted to codebase), drift logic, signal mutation, retrieval architecture, implementation sequence | **TECHNICAL** — Blueprint for engineering          |
| 6   | `06-infrastructure-readiness-certification.md` | IRC v1.0 — Hard gate checklist (10 sections) that must pass before external rollout                                               | **GATE** — No rollout until 100% pass              |
| 7   | `07-execution-roadmap.md`                      | 12-month roadmap (Q1-Q4), sprint breakdown, CRAV phases, design partner criteria                                                  | **EXECUTION** — Sprint-level guidance              |
| 8   | `08-threat-model-stride.md`                    | STRIDE security analysis, red team findings (12 scenarios), economic threat modeling, RBAC matrix                                 | **SECURITY** — Must be addressed before enterprise |

---

## Related Documents

| Document                | Location                                                           | Relationship                                     |
| ----------------------- | ------------------------------------------------------------------ | ------------------------------------------------ |
| ChatGPT Review Archive  | `__docs__/canonica/_archive/chatgpt-review-canonica-strategy.md`   | Full conversation review with per-claim verdicts |
| Canonica README         | `__docs__/canonica/README.md`                                      | Parent feature documentation (current state)     |
| Decoupling Analysis     | `__docs__/canonica/help-center/help-center_decoupling-analysis.md` | Technical readiness for standalone extraction    |
| Feature-by-Feature Docs | `__docs__/canonica/[feature]/`                                     | 7 sub-feature documentation suites               |

---

## Key Strategic Decisions (Summary)

| Decision                | Choice                                     | Rationale                                                             |
| ----------------------- | ------------------------------------------ | --------------------------------------------------------------------- |
| **Product name**        | Canonica                                   | Infrastructure-grade, category-creating, aligns with MenuList pattern |
| **Category**            | Support Knowledge Control Plane for SaaS   | Not helpdesk, not chatbot, not CMS                                    |
| **Architecture center** | Knowledge-first (not operations-first)     | Operations secondary, knowledge is the spine                          |
| **Evolution approach**  | Gradual layering (not full rewrite)        | Market validation while deepening core                                |
| **Retrieval doctrine**  | Canonical-first, RAG as fallback           | Deterministic > probabilistic                                         |
| **Entity resolution**   | Deterministic index primary, LLM secondary | Infrastructure cannot depend on probabilistic parsing                 |
| **Embedding strategy**  | Deep into fewer customers first            | 10-20 deeply embedded > 200 shallow installs                          |
| **Freeze duration**     | 3 years, additive-only                     | Infrastructure credibility requires stability                         |
| **Scope boundary**      | Knowledge infrastructure only              | Not compliance, not analytics, not CMS                                |
| **Separate team**       | Confirmed                                  | Dedicated team, not solo effort                                       |

---

## How To Use These Documents

### For Engineering

1. Read `01-core-doctrine.md` for identity and pillars
2. Read `05-architecture-evolution.md` for schemas and implementation
3. Read `07-execution-roadmap.md` for sprint priorities
4. Check `02-non-goals-charter.md` before proposing any feature
5. Check `03-infrastructure-freeze-v1.md` before any schema change

### For Product

1. Read `01-core-doctrine.md` for positioning
2. Read `04-market-validation.md` for ICP and TAM
3. Read `02-non-goals-charter.md` for scope boundaries
4. Check feature rejection filter before adding to roadmap

### For Sales

1. Read `04-market-validation.md` for ICP and buyer personas
2. Read `02-non-goals-charter.md` Section VIII for sales alignment rules
3. Never promise helpdesk replacement, AI autopilot, or compliance engine

### For Security

1. Read `08-threat-model-stride.md` for all threat analysis
2. Read `06-infrastructure-readiness-certification.md` for certification checklist
3. Sign off required before external rollout

---

## Version History

| Date       | Version | Change                                                                                   |
| ---------- | ------- | ---------------------------------------------------------------------------------------- |
| 2026-03-02 | 1.0.0   | Initial doctrine suite — 8 documents from ChatGPT strategic session + Cascade validation |

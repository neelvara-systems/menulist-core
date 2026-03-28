# Canonica — Non-Goals Charter (Binding)

> **Status:** PERMANENT
> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Applies To:** Product, Engineering, Sales, Partnerships
> **Override Policy:** Requires new RFC + freeze break justification
> **Source:** ChatGPT strategic session + Cascade validation

---

## Purpose

This document explicitly defines what Canonica will NOT become. Non-goals protect focus more than goals. Infrastructure products die from scope creep, not bugs.

---

## I. Canonica Is NOT a Helpdesk

Canonica will NOT:
- Own ticket routing logic
- Replace Zendesk / Intercom / Freshdesk
- Compete on agent workflow features
- Build live chat infrastructure
- Build multi-channel messaging stack
- Build SLA analytics dashboards beyond governance

**Rule:** Canonica governs knowledge behind support systems. It does not become the support system.

**Codebase reality:** Existing ticket system (SLA, status audit trail, conversation threading) remains as operational layer and signal source. But no further ticket workflow expansion.

---

## II. Canonica Is NOT a Documentation CMS

Canonica will NOT:
- Become a full website builder
- Build marketing documentation pages
- Add WYSIWYG-heavy publishing features
- Compete on SEO blog tooling
- Add theme marketplaces

**Rule:** Canonica governs structured truth. Presentation layer is secondary and minimal.

**Codebase reality:** Existing KB with TipTap editor remains. But knowledge modeling evolves toward ontology + canonical answers, not richer publishing.

---

## III. Canonica Is NOT an AI Autopilot

Canonica will NOT:
- Auto-resolve tickets without canonical grounding
- Prioritize generative coverage over canonical coverage
- Replace structured governance with probabilistic responses
- Expose raw LLM confidence as truth

**Rule:** LLM assists the control plane. It never becomes the control plane.

**Codebase reality:** Existing RAG pipeline becomes fallback path. Canonical-first retrieval is the target architecture.

---

## IV. Canonica Is NOT a Compliance / GRC Platform

Canonica will NOT:
- Track regulatory frameworks
- Build ISO/SOC workflow tooling
- Become enterprise policy engine
- Expand into cross-department risk systems

**Rule:** Auditability is supported. Regulatory enforcement is not core.

---

## V. Canonica Is NOT a Business Analytics Platform

Canonica will NOT:
- Build BI dashboards
- Provide executive performance reporting
- Expand into company-wide analytics

**Rule:** Metrics serve governance health only. No expansion into decision intelligence platform.

**Codebase reality:** Existing ROI calculator and chat analytics remain as operational tooling. No expansion.

---

## VI. Canonica Will Not Break Core Invariants

Under no circumstances will Canonica:
- Allow direct canonical answer editing bypassing mutation pipeline
- Allow overlapping version windows
- Allow drift flags to be cleared without validation
- Allow release timeline editing
- Allow cross-tenant data visibility
- Allow fallback to override canonical answers

These are architectural laws.

---

## VII. Canonica's Only Expansion Axis

Canonica may expand only along:
- Ontology depth
- Canonical coverage increase
- Release binding automation
- Drift detection precision
- Mutation efficiency
- Deterministic retrieval performance

Any roadmap item must clearly align with one of these.

---

## VIII. Sales Alignment Rule

Sales may NOT promise:
- Helpdesk replacement
- Automated full AI support
- Compliance engine
- Ticket workflow automation suite

Positioning must always reflect: **Support Knowledge Control Plane.**

---

## IX. Feature Rejection Filter

Before building anything new, ask:

1. Does this increase Canonical Coverage?
2. Does this strengthen Release Binding?
3. Does this improve Drift Detection?
4. Does this reduce Fallback Reliance?
5. Does this reinforce Ontology Quality?

If none → **REJECT**.

---

## X. Annual Reaffirmation

Once per year, leadership must reaffirm Non-Goals Charter. Drift in vision is as dangerous as drift in data.

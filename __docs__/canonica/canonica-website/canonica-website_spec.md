# Canonica Website — Spec

> **Version:** 1.0.0
> **Last Updated:** 2026-03-07
> **Audience:** CEO / PM / Marketing

---

## Purpose

Public-facing marketing website for Canonica at `canonica.app`. Serves as the primary discovery and evaluation surface for SaaS founders considering Canonica as their support knowledge control plane.

---

## Target Audience (ICP)

| Attribute | Value |
|-----------|-------|
| Role | VP Engineering, Head of Support, CTO at mid-market SaaS |
| ARR | $5M–$40M |
| Release cadence | Biweekly or monthly |
| Team size | 5+ support agents |
| Pain | AI support gives inconsistent answers, knowledge drifts after product updates |
| Current tools | Zendesk, Intercom, Freshdesk + AI chatbot with accuracy issues |

---

## Pages & Content Architecture

### 1. Homepage (`/`)
**Goal:** Communicate what Canonica is in < 10 seconds. Drive to "Request Early Access" or "See How It Works".

**Sections:**
1. **Hero** — Headline, subheadline, 2 CTAs, "Now in private beta" badge
2. **Pillars** — 5 cards showing the architectural pillars (numbered, with highlight labels)
3. **How It Works** — 5-step vertical timeline (Model → Write → Retrieve → Detect → Evolve)
4. **Comparison** — 8-row table comparing Traditional KB/RAG vs Canonica
5. **CTA** — Final conversion section with "Request Early Access" + "Talk to Us"

### 2. Product (`/product`)
**Goal:** Deep technical credibility for evaluating SaaS technical leaders.

**Sections:**
- Hero with "Knowledge infrastructure, not another tool" headline
- 5 feature deep-dive sections (one per pillar), each with:
  - Badge (Pillar N)
  - Title + description
  - 5 capability bullet points
- Bottom CTA

### 3. Pricing (`/pricing`)
**Goal:** Transparent pricing. During beta: $0 with all features included.

**Sections:**
- Single beta pricing card ($0)
- 10-item included features list
- Post-beta pricing note (per-tenant, based on volume)

### 4. About (`/about`)
**Goal:** Build trust. Explain the "why" behind Canonica.

**Sections:**
- Problem statement (knowledge scattered, AI inconsistent, drift silent)
- 5 belief cards (infrastructure, LLM as assist, drift measurable, friction as signal, coverage as KPI)
- Team origin (built by MenuList team)

### 5. Contact (`/contact`)
**Goal:** Multiple contact paths for different intents.

**Sections:**
- Email (hello@canonica.app)
- Partnerships (partners@canonica.app)
- Design partner program description

### 6. Get Started (`/get-started`)
**Goal:** Beta application flow. Convert interested visitors to beta applications.

**Sections:**
- Design partner criteria (5 items with descriptions)
- Application card (email-based, beta@canonica.app)
- 3-step "what happens next" process

---

## Design System

| Element | Value |
|---------|-------|
| Primary color | Indigo 500 (#6366f1) |
| Background | Dark navy (#0a0a1a) |
| Text primary | White (#ffffff) |
| Text secondary | Muted lavender (#a0a0c0) |
| Text muted | Deep gray (#6b6b8a) |
| Cards | White 3% opacity + 6% border |
| Font | Inter (system fallback) |
| Border radius | 0.75rem (cards), 0.5rem (buttons) |
| Max content width | 6xl (1152px) |

---

## SEO

| Page | Title | Description |
|------|-------|-------------|
| `/` | Canonica — The Support Knowledge Control Plane for SaaS | Canonica turns your support knowledge into a single, governed source of truth. Canonical answers. Zero drift. Enterprise-grade knowledge infrastructure. |
| `/product` | Product \| Canonica | Canonica's five architectural pillars... |
| `/pricing` | Pricing \| Canonica | Simple, transparent pricing for Canonica... |
| `/about` | About \| Canonica | Canonica is the Support Knowledge Control Plane for SaaS... |
| `/contact` | Contact \| Canonica | Get in touch with the Canonica team... |
| `/get-started` | Get Started \| Canonica | Request early access to Canonica... |

OpenGraph and Twitter cards configured in layout.tsx with `canonica-og-image.png` (TODO: create actual OG image).

---

## Conversion Funnel

```
Visitor lands on homepage
  ↓
Reads hero + pillars → "Request Early Access" or "See How It Works"
  ↓
Product page → deep technical understanding
  ↓
Pricing → confirms beta is free
  ↓
Get Started → reads criteria → sends email to beta@canonica.app
```

---

## Version History

| Date | Version | Change |
|------|---------|--------|
| 2026-03-07 | 1.0.0 | Initial spec |

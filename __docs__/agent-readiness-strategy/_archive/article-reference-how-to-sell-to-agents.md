# Reference: "How to Sell to Agents" by Brian Flynn (@Flynnjamm)

**Published:** February 17, 2025
**Author:** Brian Flynn
**Source:** Twitter/X thread, later expanded
**Saved:** February 19, 2026 — for MenuList strategic reference

---

## Why This Article Matters for MenuList

This article articulates the shift from human-centric discovery to machine-centric discovery. For MenuList, the key insight is: **if AI agents can't discover your structured data programmatically, you don't exist to them.** MenuList's OBP + schema.org infrastructure positions it well, but the llms.txt and discovery layer needs enhancement.

---

## Core Thesis

Ronald Coase (1937 Nobel Prize): firms exist because transaction costs (finding, evaluating, negotiating) make markets inefficient. AI agents collapse these costs — search and evaluation approach zero cost. This shifts the default from "build in-house" to "buy on the open market." The buyers are software with budgets.

---

## Key Concepts

### 1. The Attention Economy Doesn't Apply to Agents

| Human Buyers | Agent Buyers |
|-------------|-------------|
| Browse, compare, get distracted | Query, optimize, decide instantly |
| Brand loyalty, impulse purchases | Zero loyalty, pure optimization |
| Marketing sites, pricing pages | API responses, structured data |
| Status signaling, emotional bias | Can you solve? How fast? How much? How reliable? |

**MenuList Implication:** OBP pages with deep schema.org ARE the "API" for AI. Marketing copy is irrelevant to agents — structured data is everything.

### 2. Agent Selection Criteria (4 Variables)

1. **Can you solve the task?** — Does MenuList have the data?
2. **How fast?** — Response time (target: <200ms)
3. **How reliable?** — Uptime, accuracy, consistency
4. **How cheap?** — Cost of query (MenuList: free public pages)

### 3. Discovery Must Be Programmatic

- Humans: word of mouth, search results, social media
- Agents: machine-readable capability registries, structured data
- **If your service can't be discovered by a machine, it doesn't exist to agents**

### 4. The Two Entry Points

1. **Allowlist Stage (Human Decision):** A company decides "our agents can use these services." This is where brand + trust + positioning matters. Win this → you enter the system.
2. **Runtime Stage (Agent Decision):** Agent chooses between allowed tools. Pure optimization: latency, uptime, accuracy, cost.

### 5. Agent-Native Service Checklist (from article)

1. Machine-readable capabilities (JSON manifest, not marketing page)
2. Pricing in the protocol (structured, not on a webpage)
3. Automatable onboarding (programmatic auth/payment/access)
4. Provable reliability (uptime, latency percentiles, accuracy metrics)
5. Faster and cheaper than self-computation

---

## Market Data (from web research, Feb 2026)

| Metric | Source | Value |
|--------|--------|-------|
| 2025 holiday retail influenced by AI agents | Salesforce | 20% |
| Agent-driven traffic conversion vs social | Salesforce | 9x higher |
| US spending by agentic shoppers by 2030 | Morgan Stanley | $385B |
| Possible upper estimate by 2030 | McKinsey | $1T |
| Retailers with branded AI agents: sales growth | Industry data | 32% faster than peers |
| Websites with llms.txt | BuiltWith (Oct 2025) | 844,000+ |

---

## Emerging Standards & Protocols

### llms.txt (llmstxt.org)
- **What:** Markdown file at `/llms.txt` providing LLM-friendly content
- **Format:** H1 title, blockquote summary, section links to detailed .md files
- **Purpose:** Help LLMs understand your site at inference time (not training)
- **Adoption:** 844K+ websites
- **MenuList Status:** EXISTS but generic. Needs rebuild.

### Google Universal Commerce Protocol (UCP)
- **What:** Open standard for agentic commerce
- **Partners:** Google, Shopify, Walmart, Stripe, Mastercard, Visa, 20+ more
- **Format:** JSON manifest at `/.well-known/ucp`
- **Purpose:** Agent discovery of commerce capabilities (checkout, fulfillment, payments)
- **MenuList Relevance:** LOW — UCP is for shopping/checkout. MenuList provides read-only business truth. Different paradigm entirely.

### Model Context Protocol (MCP)
- **What:** Standard for AI systems to connect with external tools/data
- **Origin:** Anthropic, now under Linux Foundation (Agentic AI Foundation)
- **Purpose:** Agent ↔ tool communication
- **MenuList Relevance:** FUTURE — If MenuList ever exposes an agent API, MCP would be the transport layer. Not needed now.

### Schema.org Structured Data
- **What:** Vocabulary for structured data on web pages
- **Types Used by MenuList:** Restaurant, Menu, MenuItem, Offer, LocalBusiness, PostalAddress, GeoCoordinates, OpeningHoursSpecification
- **MenuList Status:** ✅ DEEP implementation. Already best-in-class for SMB menu data.

---

## How This Maps to MenuList's Existing Infrastructure

| Article Concept | MenuList Equivalent | Status |
|----------------|--------------------|---------| 
| Machine-readable capabilities | Schema.org JSON-LD on OBP + menu pages | ✅ BUILT |
| Structured response format | OBP page with deep schema + clean HTML | ✅ BUILT |
| Discovery layer | llms.txt + schema.org + sitemap.xml | ⚠️ llms.txt needs enhancement |
| Reliability metrics | Sentry monitoring + MCE correctness | ✅ PARTIAL |
| Speed optimization | SSR + caching + CDN | ✅ BUILT |
| Canonical data source | OBP + subdomain architecture | ✅ BUILT |
| Trust layer | dateModified + MCE + schema consistency | ✅ PARTIAL |
| Agent manifest | Not built (and not needed yet) | ❌ DEFERRED |

---

## Strategic Takeaways for MenuList

### DO (validated by both article and codebase):
1. **Continue schema.org depth** — Already best-in-class, keep extending
2. **Push OBP adoption** — Every SMB link = AI discovery footprint
3. **Enhance llms.txt** — Current one is generic marketing, needs structured rebuild
4. **Obsess over accuracy** — MCE + validation = trust compound
5. **Maintain speed** — SSR + caching = agent preference

### DON'T (rejected after codebase cross-check):
1. **Don't build agent API** — Public pages ARE the API for now
2. **Don't implement UCP** — It's for commerce checkout, not data queries
3. **Don't add per-request pricing** — Wrong business model
4. **Don't chase "identity monopoly"** — Focus on quality, not dominance
5. **Don't build developer platform** — Years premature

### WATCH (monitor, don't act):
1. **Google UCP evolution** — If it expands beyond shopping to data queries, reassess
2. **llms.txt adoption** — If it becomes standard discovery mechanism, prioritize
3. **Agent traffic to OBP pages** — Monitor via analytics for early signals
4. **Competitor structured data** — Watch if Google/Yelp/others improve their schema

---

**Filed by:** Cascade (Lead Architect)
**Date:** February 19, 2026
**Purpose:** Strategic reference for MenuList's agent-readiness positioning

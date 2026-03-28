# Agent Readiness Strategy

> **Position MenuList as the most trusted, structured, machine-readable source of SMB business truth — so AI agents, search engines, and assistants naturally prefer it.**

This is a **strategic positioning feature**, not a product feature. It documents how MenuList prepares for the shift from human-centric discovery to machine-centric discovery, and what infrastructure changes are needed to ensure AI systems treat MenuList as a canonical data source.

---

## Quick Navigation

| Audience            | Document                                                                     | Purpose                                      |
| ------------------- | ---------------------------------------------------------------------------- | -------------------------------------------- |
| CEO / PM            | [Spec](./agent-readiness-strategy_spec.md)                                   | Business strategy, scope, positioning        |
| Developers          | [Impl](./agent-readiness-strategy_impl.md)                                   | Technical blueprint, file changes            |
| Sales / Marketing   | [Marketing](./agent-readiness-strategy_marketing.md)                         | Positioning narrative, sales talking points   |
| Potential Customers | [Website](./agent-readiness-strategy_website.md)                             | Landing page content, SEO meta               |
| Existing Customers  | [Help Doc](./agent-readiness-strategy_helpdoc.md)                            | Customer-facing explanation                  |
| Cost Control        | [Firebase](./agent-readiness-strategy_firebase.md)                           | Cost tracking (minimal — no new collections) |
| Mobile              | [Mobile Support](./agent-readiness-strategy_mobile-support.md)               | Mobile admission test (0/4 — N/A)            |
| Archive             | [ChatGPT Review](./_archive/chatgpt-review.md)                              | Full critical review of ChatGPT conversation |
| Archive             | [Article Reference](./_archive/article-reference-how-to-sell-to-agents.md)   | "How to Sell to Agents" article analysis     |

---

## One-Liner

Enhance MenuList's machine-readable discovery layer (llms.txt, schema.org, structured metadata) so AI agents and assistants naturally discover and trust MenuList as the canonical source of SMB business truth.

---

## Architecture Overview (60-Second Summary)

MenuList already has **deep schema.org structured data** on OBP and menu pages. This strategy adds:

1. **Enhanced `/llms.txt`** — Rebuilt from generic marketing copy to structured capability description following the llmstxt.org standard
2. **New `/llms-full.txt`** — Extended version with detailed data format documentation for deeper LLM context
3. **Feature flag placeholder** — `ENABLE_AGENT_DISCOVERY` for future agent-facing endpoints
4. **Strategic documentation** — Long-term positioning guide for the B2A (Business-to-Agent) future

**What this is NOT:**
- ❌ Public API / developer platform
- ❌ Agent billing / per-request pricing
- ❌ UCP (Universal Commerce Protocol) implementation
- ❌ Architecture rewrite

---

## Key Files in Codebase

| File | Purpose | Status |
|------|---------|--------|
| `public/llms.txt` | LLM-friendly site description (enhanced) | MODIFIED |
| `public/llms-full.txt` | Extended LLM context with data format details | NEW |
| `src/config/features.ts` | Feature flag placeholder | MODIFIED |
| `src/lib/schema/index.ts` | Shared schema.org utilities (existing) | UNCHANGED |
| `src/app/_client/obp/schema.ts` | OBP schema generator (existing) | UNCHANGED |
| `src/app/_client/[[...slug]]/page.tsx` | Menu schema generator (existing) | UNCHANGED |

---

## Relationship to Existing Features

| Feature | Relationship |
|---------|-------------|
| **SEO/AEO Discovery Infrastructure** | PARENT — This extends that strategy with agent-specific discovery layer |
| **Official Business Page (OBP)** | DEPENDENCY — OBP is the canonical page agents will read |
| **Menu Correctness Engine (MCE)** | SUPPORTS — Data accuracy = agent trust |
| **Schema.org Structured Data** | FOUNDATION — Already deep, this strategy adds discovery metadata |
| **GBP Sync** | RELATED — Another distribution channel for canonical truth |
| **URL Routing Architecture** | SUPPORTS — Stable URLs = reliable agent references |

---

## Feature Flag

```typescript
ENABLE_AGENT_DISCOVERY: false  // Placeholder for future agent-facing endpoints
```

Currently a **placeholder only**. The llms.txt enhancement ships without a flag (static files, always served). The flag is for future agent API endpoints.

---

## Strategic Context

### The Shift
- **Old world:** Humans browse → find → decide → buy
- **New world:** Agents query → evaluate → select → act
- **MenuList's role:** Be the structured data source agents query for SMB truth (menus, hours, business info)

### MenuList's Position (Already Strong)
- ✅ Deep schema.org (Restaurant, Menu, MenuItem, Offer, GeoCoordinates, OpeningHours)
- ✅ OBP as canonical identity page with subdomain architecture
- ✅ MCE for data accuracy validation
- ✅ SSR + caching for speed
- ✅ Stable URLs with stored slugs

### What Was Missing
- ❌ llms.txt was generic marketing copy (19 lines, no data description)
- ❌ No llms-full.txt for extended LLM context
- ❌ No strategic documentation for agent-readiness positioning

---

## Version History

| Date | Change |
|------|--------|
| Feb 19, 2026 | Initial creation. ChatGPT conversation reviewed. Enhanced llms.txt and llms-full.txt implemented. |

---

**Document Signature:** Cascade (Lead Architect)
**Last Updated:** February 19, 2026

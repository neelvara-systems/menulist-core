# Agent Readiness Strategy

> **Position MenuList as a structured, machine-readable public source of SMB business truth. External AI and search systems decide what they crawl, cite, show, or summarize.**

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

Enhance MenuList's machine-readable discovery layer (llms.txt, schema.org, structured metadata) so owner-approved public business facts are available to AI and search systems when they crawl or read MenuList pages. This is not a ranking, citation, or answer-placement guarantee.

---

## Architecture Overview (60-Second Summary)

MenuList already has **deep schema.org structured data** on OBP and menu pages. This strategy adds:

1. **Enhanced `/llms.txt`** — Structured capability description following the llmstxt.org standard
2. **`/llms-full.txt`** — Extended data format documentation for deeper LLM context
3. **Shared discovery policy** — Platform sitemap and crawler rules now use shared route/crawler constants
4. **Reserved feature flag** — `ENABLE_AGENT_DISCOVERY` is disabled and not connected to any route
5. **Strategic documentation** — Long-term positioning guide for agent-readable public business truth

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
| `src/config/features.ts` | Reserved disabled flag | MODIFIED |
| `src/lib/schema/index.ts` | Shared schema.org utilities (existing) | UNCHANGED |
| `src/lib/seo/discoveryPolicy.ts` | Shared platform route and crawler discovery policy | ADDED |
| `src/lib/seo/publicMetadata.ts` | Shared public preview metadata normalization | ADDED |
| `src/app/client/obp/schema.ts` | OBP schema generator (existing) | UNCHANGED |
| `src/app/client/[[...slug]]/page.tsx` | Menu schema generator (existing) | UNCHANGED |

---

## Relationship to Existing Features

| Feature | Relationship |
|---------|-------------|
| **SEO/AEO Discovery Infrastructure** | PARENT — This extends that strategy with agent-specific discovery layer |
| **Official Business Page (OBP)** | DEPENDENCY — OBP is the canonical page agents will read |
| **Menu Correctness Engine (MCE)** | SUPPORTS — Data accuracy keeps the public source reliable |
| **Schema.org Structured Data** | FOUNDATION — Already deep, this strategy adds discovery metadata |
| **GBP Sync** | RELATED — Another distribution channel for canonical truth |
| **URL Routing Architecture** | SUPPORTS — Stable URLs = reliable agent references |

---

## Feature Flag

```typescript
ENABLE_AGENT_DISCOVERY: false  // Reserved only; no current source reads this flag
```

Currently a **reserved disabled flag only**. The `llms.txt` and `llms-full.txt` discovery layer ships without a flag because those are static public files. No current MenuList route, API, or Cloud Function reads `ENABLE_AGENT_DISCOVERY`.

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
**Last Updated:** May 9, 2026

# Agent Readiness Strategy — Spec

**Feature:** Agent Readiness Strategy
**Status:** Active Strategy
**Last Updated:** February 19, 2026
**Audience:** CEO, PM, Founder, Non-technical stakeholders
**Source gate:** `npm run verify:agent-readiness`

---

## Executive Summary

### What

Position MenuList as a structured public data source that AI agents, search engines, and voice assistants can read when they crawl MenuList pages for SMB business truth (menus, hours, contact info, availability).

### Why

The internet is shifting from human browsing to machine querying. By 2030, Morgan Stanley estimates $385B in US spending will be controlled by AI agents. These agents don't read marketing pages — they query structured data. MenuList already has deep schema.org structured data for SMB menus. This strategy improves MenuList's machine-readable public source layer; it does not guarantee crawler access, ranking, citation, or answer placement.

### For Whom

- **Primary:** AI assistants (ChatGPT, Gemini, Perplexity, voice assistants) querying business truth
- **Secondary:** Search engines evaluating structured data quality
- **Tertiary:** Conditional agent ecosystems (Google AI Mode, Operator, etc.)

### Scope

**In Scope:**

- Enhanced llms.txt (machine-readable site description)
- llms-full.txt (extended context for deeper LLM understanding)
- Strategic documentation and positioning guide
- Reserved disabled feature flag for conditional agent endpoints

**Out of Scope:**

- Anonymous API, API marketplace, OAuth platform, official SDK ecosystem, or write-capable developer platform. The existing scoped read-only Platform Pull API remains a separate implemented integration surface.
- Agent billing / per-request pricing
- UCP (Universal Commerce Protocol) implementation
- Architecture rewrites or new Firestore collections
- Agent onboarding automation

---

## Goals & Success Metrics

| Goal                      | Metric                                                                | Target                               |
| ------------------------- | --------------------------------------------------------------------- | ------------------------------------ |
| **Primary link adoption** | SMBs using MenuList OBP as their official public link                 | #1 priority — track actively         |
| Dataset accuracy          | Schema.org validation pass rate + MCE pass rate                       | 100%                                 |
| AI discoverability        | MenuList businesses cited in AI answers (ChatGPT, Gemini, Perplexity) | Monitor manually, establish baseline |
| Freshness signals         | dateModified freshness on OBP pages                                   | Reflects the owner-approved public source after save/cache refresh |

> **Infrastructure baseline (not a goal):** `llms.txt` and `llms-full.txt` are served at their respective URLs. These are hygiene — table stakes for any serious structured data platform. They do not create competitive advantage on their own.

---

## Target Customers (ICP)

This feature has **no direct customer-facing UI**. The "customers" are AI systems:

| AI System                      | How They Interact with MenuList                       |
| ------------------------------ | ----------------------------------------------------- |
| ChatGPT / Perplexity           | Browse MenuList OBP pages, read schema.org data       |
| Google AI Mode / Gemini        | Crawl structured pages, evaluate schema depth         |
| Voice Assistants (Siri, Alexa) | Query for business hours, menu info                   |
| Booking/Discovery Agents       | Evaluate structured business data for recommendations |

The **indirect beneficiaries** are SMB owners whose businesses get cited by AI when customers ask questions like "What's on the menu at [business]?" or "Is [business] open right now?"

---

## Immediate Priorities (Founder Directive)

> **This feature is infrastructure hygiene, not strategic progress.** The llms.txt enhancement, documentation, and schema work prepare MenuList for machine discovery — but preparation does not create dependency or adoption. The real work remains real-world usage.

Priority hierarchy (non-negotiable):

1. **Primary link adoption** — Push SMBs to use their MenuList OBP URL as their official public link (Google listing, Instagram bio, WhatsApp status, QR codes, packaging). Without this, all agent-readiness work is irrelevant. This is the #1 metric.
2. **Dataset accuracy** — Menus accurate, hours accurate, availability current, updates frequent. Clean dataset = long-term power. Messy dataset = permanent weakness.
3. **Agent discovery preparation** — Schema.org depth, llms.txt, fast SSR, stable URLs. This is what the current feature delivers. It is necessary foundation — but it is foundation, not the building.

No more heavy "agent readiness" implementation needed for now. Shift focus back to adoption + accuracy.

---

## The Strategic Shift

### Old World (Human Discovery)

1. Customer searches Google
2. Finds website / Google Maps listing
3. Browses menu (PDF, website, photo)
4. Decides to visit or order

### New World (Agent Discovery)

1. Customer asks AI assistant: "Find me a cafe with vegan options near me"
2. Agent may query structured public sources
3. Agent may evaluate completeness, freshness, schema depth, and speed
4. Agent decides what to show based on its own retrieval and ranking rules
5. Customer acts on recommendation

### MenuList's Role

MenuList is **not** selling to agents. MenuList exposes an owner-approved structured public source that agents and search systems can read when they crawl MenuList pages. The business model doesn't change (SMB subscriptions). What changes is that MenuList's public data becomes clearer and easier to evaluate; external systems still decide what they crawl, cite, show, or summarize.

---

## Competitive Landscape

| Competitor              | Structured Data          | Speed          | Freshness                  | Schema Depth                                       |
| ----------------------- | ------------------------ | -------------- | -------------------------- | -------------------------------------------------- |
| Google Business Profile | Good (own ecosystem)     | Fast           | Owner-dependent            | Medium                                             |
| Yelp                    | Basic                    | Medium         | Scraped/user-generated     | Low                                                |
| Restaurant websites     | None (unstructured HTML) | Slow           | Often outdated             | None                                               |
| PDF menus               | None                     | N/A            | Static                     | None                                               |
| **MenuList**            | **Deep schema.org**      | **SSR + cache** | **Owner-approved source with public cache refresh** | **Deep (Menu, MenuItem, Offer, Hours, Geo, Diet)** |

**MenuList Advantage:** Only platform where the menu data is:

1. Owner-maintained (not scraped)
2. Deeply structured (schema.org with full item-level detail)
3. Validated (MCE correctness engine)
4. Fast (SSR + caching)
5. Stable URLs (stored slugs, subdomains)

---

## What We're Building (Current Static Discovery Layer)

### 1. Enhanced llms.txt

Rebuild `/llms.txt` from generic marketing copy to structured capability description following the llmstxt.org standard (844K+ websites already use this).

**Before:** 19 lines of generic marketing
**After:** Structured Markdown describing what MenuList provides, data formats, page types, and how to access structured business data

### 2. llms-full.txt

Extended version with detailed documentation about MenuList's data structure, schema.org implementation, and how to interpret the structured data on public pages.

### 3. Reserved Disabled Flag

`ENABLE_AGENT_DISCOVERY` in `src/config/features.ts` is disabled and not connected to any current route, API, Cloud Function, or client workflow. It is reserved for a separate source-backed implementation decision if agent-facing endpoints become necessary.

### 4. Strategic Documentation

Full doc suite documenting the long-term positioning, competitive analysis, and decision rationale.

---

## What We're NOT Building (Explicit Rejections)

| Rejected Idea                   | Reason                                                                                                           |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Public API marketplace          | Premature. MenuList's public pages ARE the data layer. No proven demand for API access.                          |
| Per-request pricing / HTTP 402  | Wrong business model. Revenue = SMB subscriptions, not agent billing.                                            |
| UCP manifest (/.well-known/ucp) | UCP is for commerce checkout (Shopify, Walmart). MenuList provides read-only business truth. Different paradigm. |
| Agent onboarding automation     | Agents don't "onboard" to MenuList. They read public pages.                                                      |
| Broad developer portal or SDK ecosystem | Rejected. The public `/developers` reference is limited to the existing scoped read-only Platform Pull API and does not create anonymous access, OAuth, writes, MCP actions, or an official SDK. |
| Trust scoring API               | Over-engineering. dateModified + MCE + schema consistency is sufficient.                                         |

---

## Long-Term Vision (3-5 Year Horizon)

### Current Foundation

- **OBP adoption is THE priority** — every SMB must use their MenuList link as official public link
- Data accuracy obsession (MCE, validation, owner nudges for completeness)
- Schema.org depth maintained and extended
- llms.txt/llms-full.txt served as infrastructure baseline
- Monitor AI citations manually (early signal, not KPI)

### Year 2-3: Recognition

- AI systems may cite MenuList businesses when they crawl and trust the public source
- OBP URLs spread across internet (Google listings, bios, QR)
- MenuList becomes recognizable structured data source
- **Decision point:** If agent API demand appears, build read-only endpoint

### Year 3-5: Default Source

- MenuList remains a clear structured source for SMB queries
- Structured data quality creates natural moat
- Possible: lightweight read-only API for verified agent partners
- Possible: trust/reliability metadata in responses

---

## Risks & Open Questions

| Risk                                          | Mitigation                                                                                        |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Google improves its own structured data (GBP) | MenuList has owner-maintained data + deeper menu schema. GBP doesn't have item-level menu detail. |
| llms.txt standard doesn't gain traction       | Low cost to implement. Even if standard fades, well-structured content helps SEO.                 |
| SMBs don't adopt OBP as primary link          | OBP adoption is in the 90-day plan. Push through onboarding and dashboard nudges.                 |
| AI systems scrape but don't cite              | Schema.org depth + canonical URLs increase citation probability. Can't force citations.           |

### Open Questions

1. When (if ever) should MenuList expose a read-only structured data API?
2. Should MenuList participate in emerging agent registries when they mature?
3. How to measure "AI trust" in MenuList data quantitatively?

---

**Document Signature:** Cascade (Lead Architect)
**Last Updated:** February 19, 2026

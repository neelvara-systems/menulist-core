# Agent Readiness Strategy — Implementation Plan

**Feature:** Agent Readiness Strategy
**Status:** Phase 1 COMPLETE — Post-feedback updates applied
**Last Updated:** February 19, 2026
**Audience:** Developers

---

## Architecture Overview

This is a **lightweight infrastructure enhancement**, not a product feature. No new Firestore collections, no new API routes, no new UI components. Changes are limited to:

1. Static file enhancement (`public/llms.txt`)
2. New static file (`public/llms-full.txt`)
3. Feature flag placeholder (`src/config/features.ts`)

All changes leverage existing infrastructure:

- Schema.org structured data (`src/lib/schema/index.ts`)
- OBP page rendering (`src/app/_client/obp/`)
- Menu page rendering (`src/app/_client/[[...slug]]/page.tsx`)

---

## Analysis: ChatGPT vs Codebase

| ChatGPT Suggestion          | Codebase Reality                                  | Decision                                  |
| --------------------------- | ------------------------------------------------- | ----------------------------------------- |
| Build capability manifest   | `public/llms.txt` exists but is generic           | ENHANCE llms.txt                          |
| Build truth response engine | OBP + menu pages already serve structured truth   | NO ACTION — pages ARE the engine          |
| Build agent API             | No demand, premature                              | DEFER — add feature flag placeholder only |
| Trust scoring layer         | `dateModified` in OBP schema, MCE on project docs | NO ACTION — sufficient for now            |
| Speed optimization          | `unstable_cache`, SSR, CDN already configured     | NO ACTION — continue current path         |

### Disagreements with ChatGPT

1. **"Build internal Truth Response Engine"** — Disagree. `OBPContent.tsx` already outputs full structured business data. `page.tsx` outputs full structured menu data. These public pages ARE the truth response engine. Adding a separate internal API duplicates existing output for zero benefit.

2. **"Per-request pricing / HTTP 402"** — Reject. MenuList's revenue model is subscription-based. Public pages are free by design. Adding billing complexity for a non-existent agent audience would violate the Constitution's simplicity doctrine.

3. **"Agent capability manifest at /.well-known/ucp"** — Reject UCP specifically. UCP is for commerce checkout (Google + Shopify). MenuList provides read-only business truth. The correct discovery mechanism is llms.txt (designed for data/content sites).

---

## Database Schema

**No changes.** No new Firestore collections, no new fields, no schema modifications.

---

## API Contracts

**No new API routes.** Static files only.

| File                   | Method | Path             | Purpose                                       |
| ---------------------- | ------ | ---------------- | --------------------------------------------- |
| `public/llms.txt`      | GET    | `/llms.txt`      | LLM-friendly site description (Markdown)      |
| `public/llms-full.txt` | GET    | `/llms-full.txt` | Extended LLM context with data format details |

Both served as static files by Next.js/Vercel. No auth, no rate limiting, no dynamic generation.

---

## File Inventory

### Modified Files

| File                     | LOC Changed          | Purpose                     |
| ------------------------ | -------------------- | --------------------------- |
| `public/llms.txt`        | ~80 lines (rewrite)  | Enhanced LLM discovery file |
| `src/config/features.ts` | ~15 lines (addition) | Feature flag placeholder    |

### New Files

| File                                                                                    | LOC        | Purpose                 |
| --------------------------------------------------------------------------------------- | ---------- | ----------------------- |
| `public/llms-full.txt`                                                                  | ~150 lines | Extended LLM context    |
| `__docs__/agent-readiness-strategy/README.md`                                           | ~120 lines | Feature hub             |
| `__docs__/agent-readiness-strategy/agent-readiness-strategy_spec.md`                    | ~180 lines | Business spec           |
| `__docs__/agent-readiness-strategy/agent-readiness-strategy_impl.md`                    | THIS FILE  | Technical blueprint     |
| `__docs__/agent-readiness-strategy/agent-readiness-strategy_marketing.md`               | ~100 lines | Sales positioning       |
| `__docs__/agent-readiness-strategy/agent-readiness-strategy_website.md`                 | ~80 lines  | Website content         |
| `__docs__/agent-readiness-strategy/agent-readiness-strategy_helpdoc.md`                 | ~60 lines  | Customer help           |
| `__docs__/agent-readiness-strategy/agent-readiness-strategy_firebase.md`                | ~30 lines  | Cost tracking           |
| `__docs__/agent-readiness-strategy/agent-readiness-strategy_mobile-support.md`          | ~30 lines  | Mobile assessment       |
| `__docs__/agent-readiness-strategy/_archive/chatgpt-review.md`                          | ~200 lines | ChatGPT critical review |
| `__docs__/agent-readiness-strategy/_archive/article-reference-how-to-sell-to-agents.md` | ~180 lines | Article analysis        |

---

## Implementation Details

### 1. Enhanced llms.txt

**Location:** `public/llms.txt`

**Format:** Follows llmstxt.org specification:

- H1 with project name
- Blockquote with summary
- Sections with H2 headers
- File lists with markdown hyperlinks and descriptions

**Content Structure:**

```markdown
# MenuList

> Summary of what MenuList provides as structured data

## About

Key information about MenuList's data capabilities

## Public Pages

- [OBP Pages](url): Canonical business identity with schema.org
- [Menu Pages](url): Full structured menu with items, prices, availability

## Data Format

- Schema.org types used
- Data fields available

## Optional

- Additional context links
```

### 2. llms-full.txt

**Location:** `public/llms-full.txt`

Extended version that includes:

- Detailed schema.org type mapping (all 20+ business types)
- Menu data structure explanation
- Hours format documentation
- Example structured data output
- How to interpret MenuList pages

### 3. Feature Flag

**Location:** `src/config/features.ts`

```typescript
ENABLE_AGENT_DISCOVERY: false; // Placeholder for future agent-facing endpoints
```

Not connected to any code. Pure placeholder for architectural readiness.

---

## Security Checklist

| Check                     | Status                                |
| ------------------------- | ------------------------------------- |
| No new API routes exposed | ✅ Static files only                  |
| No new auth requirements  | ✅ N/A                                |
| No new Firestore access   | ✅ N/A                                |
| No PII exposure           | ✅ llms.txt contains only public info |
| No rate limit needed      | ✅ Static files served by CDN         |

---

## Implementation Phases

### Phase 1: Documentation + Static Files (Feb 19, 2026) — ✅ COMPLETE

- [x] Create `__docs__/agent-readiness-strategy/` doc suite (9 files)
- [x] Archive ChatGPT review
- [x] Archive article analysis with market data
- [x] Enhance `public/llms.txt` (19 → 36 lines, structured capability description)
- [x] Create `public/llms-full.txt` (~130 lines, full data format documentation)
- [x] Add feature flag placeholder (`ENABLE_AGENT_DISCOVERY`)
- [x] Update changelog
- [x] Cross-reference SEO/AEO docs
- [x] Type check passes

### Phase 2: Monitor (Ongoing, No Code)

> **Strategic context:** Phase 1 delivered infrastructure hygiene. The real metric is **primary link adoption** — SMBs using their MenuList OBP URL as their official public link. Agent discovery is a lagging indicator of adoption + accuracy, not a leading one. Do not invest further engineering time in "agent readiness" until adoption proves the data layer is valuable.

- **Track OBP primary link adoption** — #1 metric. How many SMBs use their MenuList link on Google, Instagram bio, QR, WhatsApp?
- Manually test AI citations for MenuList businesses (early signal, not KPI)
- Monitor llms.txt standard evolution
- Watch Google UCP expansion

### Phase 3: Future (If Demand Appears)

- Read-only structured data API endpoint
- Agent partner verification
- Trust/reliability metadata in responses
- Activate `ENABLE_AGENT_DISCOVERY` flag

---

## Testing Guide

### Manual Verification

1. **llms.txt accessible:**

   ```
   curl https://www.menulist.ai/llms.txt
   ```

   Expected: Markdown content with structured sections

2. **llms-full.txt accessible:**

   ```
   curl https://www.menulist.ai/llms-full.txt
   ```

   Expected: Extended Markdown content

3. **AI discovery test (manual):**
   - Ask ChatGPT: "What structured data does MenuList provide?"
   - Ask Perplexity: "Tell me about MenuList menu data format"
   - Observe if llms.txt content improves AI understanding

---

## Related Documentation

| Document                                              | Purpose                                      |
| ----------------------------------------------------- | -------------------------------------------- |
| `__docs__/seo-aeo-discovery-infrastructure/README.md` | Parent strategy — schema enrichment          |
| `__docs__/official-business-page/`                    | OBP implementation (canonical identity page) |
| `__docs__/menu-correctness-engine/`                   | MCE implementation (data accuracy)           |
| `__docs__/url-routing-architecture/`                  | Stable URLs for agent references             |

---

**Document Signature:** Cascade (Lead Architect)
**Last Updated:** February 19, 2026

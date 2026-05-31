# KitStamp — Complete Product Strategy

> **KitStamp is a commercial content preparation workspace.**
> Its sole terminal output is the **Final Content Kit**.
> Humans approve. KitStamp prepares. Nothing acts on its own.

**Created:** February 19, 2026
**Source:** ChatGPT Product Design Session (24+ topics) → Cascade Cross-Check
**Status:** 🔒 LOCKED DEFINITION — Optional product, Stage 3 in evolution sequence
**Priority:** #3 (after MenuList #1 and GrowthOS #2)
**Governance:** `__docs__/constitution/12-product-separation-doctrine.md`
**Review:** `__docs__/kitstamp/_archive/chatgpt-review.md`

---

## Table of Contents

1. [What KitStamp Is](#1-what-kitstamp-is)
2. [Existing Codebase Reality](#2-existing-codebase-reality)
3. [Target Users (ICP)](#3-target-users-icp)
4. [The Problem It Solves](#4-the-problem-it-solves)
5. [Core Features (7 Only)](#5-core-features-7-only)
6. [The Final Content Kit](#6-the-final-content-kit)
7. [UI & UX Identity](#7-ui--ux-identity)
8. [AI Posture Rules](#8-ai-posture-rules)
9. [Feature Kill-List (Permanent)](#9-feature-kill-list-permanent)
10. [Pricing & Packaging](#10-pricing--packaging)
11. [Trust Language & Microcopy](#11-trust-language--microcopy)
12. [Error States & Failure Handling](#12-error-states--failure-handling)
13. [Support & Ops Surface](#13-support--ops-surface)
14. [Audit & Compliance](#14-audit--compliance)
15. [Growth Logic](#15-growth-logic)
16. [V2 Expansion Path](#16-v2-expansion-path)
17. [Market Research & Validation](#17-market-research--validation)
18. [MenuList Relationship](#18-menulist-relationship)
19. [Build Prerequisites](#19-build-prerequisites)
20. [Kill Criteria](#20-kill-criteria)

---

## 1. What KitStamp Is

### Canonical Definition (Immutable)

**KitStamp is a commercial content preparation workspace.**

This is the single source of truth. Every decision must pass this filter.

### What This Means

- **Pre-publish only** — prepares drafts; never publishes
- **Human-controlled** — assists; never decides
- **Content units** — images, descriptions, translations — aligned but draft-state
- **System-agnostic** — feeds any downstream system (websites, marketplaces, POS, menus, ads)
- **No authority claims** — no "ready", no "best", no auto-apply

### What KitStamp Is NOT

| ❌ NOT This | Why |
|------------|-----|
| CMS | KitStamp doesn't manage live content |
| Design tool | KitStamp doesn't compete with Canva/Adobe |
| Publishing tool | KitStamp stops before publishing |
| Analytics tool | KitStamp never measures performance |
| Marketing tool | KitStamp never claims outcomes |
| Decision engine | KitStamp never chooses for users |
| AI tool (marketed) | AI is internal plumbing, not the product |

### The One Question KitStamp Answers

> "Prepare this content perfectly before I publish it."

If a feature can't serve this question → it doesn't belong.

---

## 2. Existing Codebase Reality

**Critical finding:** MenuList's AI Image Generation system already implements ~70% of KitStamp's image preparation capability.

### What Already Exists in MenuList

| Capability | MenuList Component | LOC | KitStamp Reusability |
|-----------|-------------------|-----|----------------------|
| Single image generation | `AiImageGenerator/index.tsx` | 573 | **100%** reusable |
| Batch image generation | `batchImageGeneration/` (3 components) | 1,040 | **100%** reusable |
| Cloud Tasks pipeline | `src/lib/google/cloudTask/index.ts` | 67 | **100%** reusable |
| Image editing | `EditImageModal.tsx` | 507 | **100%** reusable |
| Batch job DAL | `src/database/imageBatchProcessing/` | 119 | **100%** reusable |
| Real-time listener | `useImageBatchJobListener.ts` | 94 | **100%** reusable |
| Style presets | `IMAGE_GENERATION_STYLES` | 207 | **100%** reusable |
| Business-specific features | `imageViewType.ts` | 6,723 | **80%** — needs generalization |
| Prompt construction | `prompt.ts` | 279 | **90%** — needs business-type agnostic version |
| Safety settings | Gemini HarmCategory blocks | — | **100%** reusable |
| Image quality guard | `imageQualityGuard.ts` | 105 | **100%** (not yet integrated in MenuList either) |
| Image optimization | `optimizeImage.ts` | 254 | **100%** (not yet integrated) |
| API routes | `/api/image-generation/`, `/api/image-editing/` | 1,204 | **80%** — needs decoupling from menu context |

### What Does NOT Exist (Must Build)

| Capability | Status | Notes |
|-----------|--------|-------|
| Content Units workspace | 🔴 Not started | Atomic "one sellable thing" concept |
| Draft description generation | 🔴 Not started | Structured text drafts with tone presets |
| Language variants as parallel drafts | 🔴 Not started | Translation system exists, but not draft-parallel |
| Final Content Kit assembly | 🔴 Not started | ZIP export with structured directory |
| Version history per unit | 🔴 Not started | Lightweight, not audit-grade |
| Notes & review comments | 🔴 Not started | Inline collaboration |
| Export / handoff flow | 🔴 Not started | The actual product endpoint |
| Draft-state UI paradigm | 🔴 Not started | Workbench layout, not dashboard |

### Extraction Strategy

KitStamp does NOT copy MenuList code. It shares infrastructure:

- **Shared**: AI model APIs, image generation pipeline, safety settings, storage utilities
- **Separate**: UI, state management, data model, auth scope, billing
- **Extraction trigger**: Only when organic demand justifies a separate product

---

## 3. Target Users (ICP)

### Primary ICP (Locked): Content Operator

**Job titles:** Content executive, marketing coordinator, creative assistant, catalog ops, listing ops

**Environment:**
- Works inside agencies, franchises, multi-location brands, or aggregators
- Handles multiple clients or projects
- Uses too many tools (Docs + Drive + Canva + WhatsApp)
- Gets feedback from people above them

**Daily reality:**
- "Can you make this ready by today?"
- "We need this in 3 languages."
- "Client wants a visual."
- Missing images, inconsistent descriptions, wrong translations

**What they want:** "Give me clean, usable assets fast."

**What they do NOT want:** AI deciding things, auto-publishing, optimization claims, dashboards

### Secondary ICP: SMB Owner (Hands-on)

> **Cascade addition** — ChatGPT excluded this, but Indian market reality requires it.

**Valid only when:**
- Actively preparing content themselves
- Not delegating to agencies
- Want reuse across platforms (menu + delivery app + social)

**This ICP is a beneficiary, not the growth driver.**

### Who KitStamp Is NOT For

- ❌ Growth hackers
- ❌ Performance marketers
- ❌ Data analysts
- ❌ Anyone asking "what performs better"
- ❌ Designers wanting creative control
- ❌ Founders wanting leverage (→ that's MenuList)

---

## 4. The Problem It Solves

### The Missing Middle

Content work has three phases:

```
1. Creation — generating raw material (Canva, Adobe, AI tools)
2. Preparation — shaping, validating, packaging (NOBODY owns this properly)
3. Activation — publishing, measuring, optimizing (CMS, ads, social tools)
```

The market is crowded in phases 1 and 3. **No tool owns phase 2.**

### The Real Pain

> "I need good-looking, accurate content before I can use any tool."

Before: POS, Website, Menu, Marketplace, Ads, Print, Social
**Every system assumes content already exists.**

KitStamp exists before all of them.

### Why Images + Text + Translation Belong Together

Preparation is multi-dimensional:
- If you only generate images → text remains inconsistent
- If you only generate text → visuals break trust
- If you only translate → meaning drifts

KitStamp aligns all three in one draft workspace.

---

## 5. Core Features (7 Only)

These define KitStamp completely. Everything else is out.

### 1. Content Units (Foundation)

A neutral workspace per sellable thing. Each unit includes:
- Title / name
- Draft description(s)
- Draft image(s)
- Language variants
- Notes

**Rules:** No "items live" status, no performance, no system judgment.

### 2. Draft Image Generation

- Contextual, optional, user-triggered
- Always labeled "Draft"
- Always user-selected (no auto-pick, no ranking)
- Multiple versions allowed
- Existing MenuList infrastructure reusable

### 3. Draft Description Generation

- Structured text drafts with tone/length presets
- Fully human-editable
- No SEO scores, no keyword density, no "improvement" metrics

### 4. Language Variants

- Parallel drafts, not overwrites
- Each language editable independently
- Translation as preparation, not automation

### 5. Lightweight Versioning

- Quiet safety net per content unit
- "Earlier draft", "Revised draft"
- No audit logs, no rollback systems, no change tracking across users

### 6. Notes & Review

- Inline comments per content unit
- Internal or client-facing
- Contextual, not threaded chaos
- No approval workflows

### 7. Export / Handoff (The Endpoint)

- JSON, CSV, image download, copy-ready blocks, ZIP package
- **Export is the end of KitStamp's responsibility**
- No sync, no push, no background jobs

### Feature Loop

```
Create content unit
  → Generate drafts (image / text / language)
  → Revise & comment
  → Compare versions
  → Export
  → Leave
```

No loops back. No lifecycle. No long-term state.

---

## 6. The Final Content Kit

### Canonical Name: **Final Content Kit**

Not: asset pack, media kit, marketing kit, creative bundle.

### What It Is

A structured, exportable, human-approved package of prepared commercial content for a single item. Complete enough to hand off. Incomplete by design (no outcomes attached).

### Structure (Locked)

```
Final_Content_Kit_[KitName]/
│
├── visuals/
│   ├── primary/
│   │   ├── image_01.jpg
│   │   └── image_02.jpg
│   └── alternates/
│       └── image_alt_01.jpg
│
├── text/
│   ├── description_en.txt
│   ├── description_hi.txt
│   └── description_fr.txt
│
├── metadata/
│   ├── kit_summary.txt
│   └── usage_notes.txt
│
└── README.txt
```

### README.txt Content (Locked)

```
This Final Content Kit contains prepared commercial content.

All images and text were reviewed and approved by the user
before export.

KitStamp does not publish, modify, or deploy content.

Responsibility for usage lies with the recipient.
```

### Export Guarantees

- ✅ Content frozen at export time
- ✅ No silent changes after export
- ✅ Export is reproducible
- ✅ Audit log references this export

### What Is NOT Exported

- ❌ Discarded drafts
- ❌ Version history
- ❌ AI explanations
- ❌ "Best option" indicators
- ❌ Prompt info or generation metadata

---

## 7. UI & UX Identity

### Core Feel (Non-Negotiable)

KitStamp must feel like: **a desk with tools on it**

| KitStamp Must Feel | KitStamp Must NOT Feel |
|---------------------|------------------------|
| Calm | Operational |
| Neutral | Live |
| Draft-oriented | System-driven |
| Non-authoritative | Confident about outcomes |
| Tool-like | "In charge" |

### Layout Model

```
┌─────────────────────────────────────────────┐
│  Top bar: Workspace name + context          │
├─────────────────────────────────────────────┤
│  Left: Content Units list                   │
│                                             │
│  Right: Active preparation panel            │
│                                             │
│  Bottom (optional): Draft history / notes   │
└─────────────────────────────────────────────┘
```

Feels like: Figma, Notion, Google Docs
NOT like: Admin panel, ops dashboard

### Language Rules

| ✅ Allowed Verbs | ❌ Forbidden Verbs |
|-----------------|-------------------|
| Prepare, Draft, Generate | Publish, Apply, Sync |
| Revise, Edit, Compare | Optimize, Activate, Improve |
| Save, Export, Discard | Decide, Update (auto-context) |

### State Model (Only These)

- **Draft** — content being prepared
- **Revised** — content has been edited
- **Ready for hand-off** — (optional) user marks as exportable
- **Discarded** — content removed

NO: Live, Failed, Inactive, Enabled, Running.

---

## 8. AI Posture Rules

Per Constitution 12 Rule 2:

| Product | AI Posture | Description |
|---------|-----------|-------------|
| MenuList | **Authority** | Silent, decisive. System knows best. |
| **KitStamp** | **Assistant** | Visible, collaborative. System helps. |
| GrowthOS | **Delegate** | Invisible, transactional. System delivers. |

### What "Assistant" Means for KitStamp

- AI generates drafts when asked
- AI never auto-selects or auto-applies
- AI output is always labeled "Draft"
- User must explicitly choose, edit, or discard
- No "AI recommends" or "AI chose the best"

### Mixing Postures = Failure

- If KitStamp acts like Authority (silent, decisive) → confusion
- If KitStamp acts like Delegate (invisible, transactional) → no trust
- KitStamp must be visible, collaborative, but never confident

---

## 9. Feature Kill-List (Permanent)

If a feature shifts judgment, authority, or outcomes away from the human → **dead on arrival**.

| # | Category | What's Banned | Why |
|---|----------|--------------|-----|
| 1 | **Publishing** | Auto-publish, post to social, push to CMS, scheduling | Publishing = outcome ownership |
| 2 | **Performance** | CTR, engagement, "best performing", A/B testing, conversion tracking | Metrics imply optimization → decision authority |
| 3 | **Auto-selection** | "We picked the best", auto-replace, silent updates | Final content must always be explicitly chosen |
| 4 | **Prompt-centric UX** | Prompt libraries, prompt analytics, "improve your prompt" | Prompts are implementation detail |
| 5 | **Asset management** | Media libraries, folders/tags, reusable asset banks | Turns KitStamp into DAM software |
| 6 | **Learning claims** | "Learns from edits", "gets better", "understands your brand" | Creates false authority and legal ambiguity |
| 7 | **Personalization** | Different outputs per viewer, dynamic swapping | Preparation = single, stable artifacts |
| 8 | **Scoring** | Star ratings, quality scores, confidence meters, heatmaps | Scoring is judgment. Judgment stays human. |
| 9 | **Autonomous flows** | Auto-prepare kits, background generation, scheduled drafts | Autonomy breaks responsibility clarity |

### The One Test

> "Does this help a human prepare a Final Content Kit — without deciding anything for them?"
> If not → kill it.

---

## 10. Pricing & Packaging

### Billable Unit: Final Content Kit

Users pay for preparing kits. Not AI credits. Not tokens. Not generations.

### Tier Structure

| Tier | Kits/Month | Users | Key Features |
|------|-----------|-------|-------------|
| **Starter** | 20 | 1 | All core features, export enabled |
| **Team** | 100 | 3-5 | Shared workspace, priority generation |
| **Agency** | 300+ | Unlimited | Client separation, SLA support |

### What Is NOT Metered

Inside a kit, these are unlimited:
- Regenerations
- Draft images
- Text edits
- Language variants
- Notes & revisions

**Because preparation is messy. Charging for messiness kills adoption.**

### Pricing Philosophy (Locked)

> **KitStamp charges for completion, not experimentation.**

### Free Trial

3 Final Content Kits (not 7 days, not unlimited AI).
Trial success metric: "Did the user export at least one kit?"

### When Limit Is Reached

- Allow view & export of existing kits
- Block creation of new kits
- Message: "You've prepared all your content kits for this month."
- **No urgency. No guilt. No AI guilt.**

### Cascade Note: Indian Market Pricing

ChatGPT's $150-600/mo agency pricing may not work in India. Likely needs:
- ₹999/mo Starter (20 kits)
- ₹2,999/mo Team (100 kits)
- Custom Agency pricing

Validate with first 10 agencies before locking.

---

## 11. Trust Language & Microcopy

### Key Screen Copy (Production-Ready)

**Empty Dashboard (First Login):**
> "Prepare your first Final Content Kit"
> "KitStamp helps you prepare commercial-ready content — images, descriptions, and variations — in one place. Nothing is published. Nothing changes without your approval."

**AI Generation Disclaimer (Once per session):**
> "Generated content is a starting point. Review, edit, and approve everything before export."

**Export Confirmation:**
> "By exporting, you confirm this content is ready for use outside KitStamp."

**Monthly Limit Reached:**
> "You've prepared all your content kits for this month. You can still view and export existing kits."

### Global Copy Rules

- Always use: Prepare, Draft, Review, Choose, Export
- Never use: Optimize, Perform, Best, Smart, Auto, Publish

---

## 12. Error States & Failure Handling

### Core Principle

> Errors are operational events, not user mistakes and not AI failures.

| Error Type | Title | Body | CTA |
|-----------|-------|------|-----|
| Generation failed | "Draft couldn't be prepared" | "This request didn't complete. Your kit is unchanged." | "Try again" |
| Partial success | "Some drafts were prepared" | "X drafts are ready. Y didn't complete." | "Review prepared drafts" / "Retry failed" |
| Quality rejection | "Draft didn't meet quality standards" | "This draft was discarded to avoid low-quality output." | "Generate again" |
| Timeout | "Still preparing..." | "This is taking longer than expected. You can wait, or continue working." | "Continue working" |
| Export failed | "Export didn't complete" | "Your content is safe. The export step didn't finish." | "Retry export" |
| System unavailable | "Preparation temporarily unavailable" | "We're working to restore service." | "Check status" |

### Never Surface

- Prompt text in errors
- Model names
- Safety category names
- Stack traces
- Token usage

---

## 13. Support & Ops Surface

### Core Principle

> Support exists to resolve preparation issues, not to explain or justify content.

### Support Entry Points (Limited)

1. Export failure
2. Repeated generation failure
3. Explicit "Help / Support" screen

### Support NEVER

- Interprets content
- Edits content
- Approves content
- Asks "What prompt did you use?"
- Says "The AI did..." or "The model decided..."

### Response Tone

> "Thanks for reaching out. We reviewed the preparation step you mentioned. The issue is resolved. You can retry now."

---

## 14. Audit & Compliance

### Principle

> KitStamp records actions, never judgments.

### What Gets Logged

- Kit created / renamed / deleted / exported
- Draft image generated / discarded
- Draft text generated / edited
- Language variant added / removed
- Export initiated / completed / failed
- User added / removed

### What Is NEVER Logged

- Prompts
- Generated content
- Revision text
- User intent
- AI model info
- "Recommended" anything

### User-Facing View

Simple vertical timeline inside each kit:
> "12 Feb, 10:42 — Draft images generated by Alex"
> "12 Feb, 11:10 — Kit exported by Jamie"

No filters. No analytics. No scores. **Evidence, not insight.**

---

## 15. Growth Logic

### How KitStamp Grows

1. **Multi-destination pain** — "I need this content in more than one place" → KitStamp becomes necessary
2. **Operator-to-operator spread** — Operators carry tools across jobs
3. **Agency gravity** — Once an agency adopts, each new client is auto-exposed

### Growth Is

- Bottom-up
- Operator-led
- Upstream
- Quiet

**No virality required.**

### North Star Metric

> **Time from "idea exists" → "content ready for handoff"**
> If KitStamp compresses this reliably, it wins.

### Real Competitors

Not Canva. Not AI tools. The real competitors are:
- Google Docs
- Spreadsheets
- WhatsApp + Drive
- Ad-hoc chaos

---

## 16. V2 Expansion Path

V2 makes the Final Content Kit **richer, not smarter.**

| # | Idea | Status | Constraint |
|---|------|--------|-----------|
| 1 | **Content Variants Pack** | ✅ Keep | Context-ready variants (Menu/Delivery/Social) — KitStamp never says which is "better" |
| 2 | **Brand Guardrails** | ✅ Keep | Explicit constraints (allowed colors, forbidden tones) — mechanical, not adaptive |
| 3 | **Short-Form Motion Draft** | ✅ Keep (V3+) | Food flash, outfit turn, hairstyle reveal — silent, no music, no captions, always "Draft" |
| 4 | **Client Review Mode** | 🟡 Keep with limits | Read-only shareable link. No feedback intelligence, no "most requested change" |

### What DIES in V2

- ❌ "Best variant" (performance implication)
- ❌ "Auto-select for Instagram" (publishing logic)
- ❌ "What usually works" (learning + authority)
- ❌ "Engagement-ready" (outcome promise)
- ❌ "AI recommends" (any recommendation language)

---

## 17. Market Research & Validation

### Market Size (Directional)

| Level | Size | Basis |
|-------|------|-------|
| **TAM** | ~$36B (2025) | Global digital content creation market (Grand View Research) |
| **SAM** | ~$2.9B–$4.3B | Upstream content-prep slice (8-12% of TAM) |
| **SOM** (3-5yr) | ~$14M–$22M ARR | 0.5% of SAM with agency-first GTM |

### Revenue Path

| Scenario | ARPA | Customers Needed | ARR |
|----------|------|-----------------|-----|
| Small agencies | $150/mo ($1,800/yr) | 8,000 | $14.4M |
| Mid-market agencies | $600/mo ($7,200/yr) | 2,000 | $14.4M |

### Competitive Positioning

| Tool | What They Do | Where KitStamp Differs |
|------|-------------|------------------------|
| Canva | Design (creation) | KitStamp = preparation, not design |
| Adobe Express | Creative suite + publishing | KitStamp stops before publishing |
| Jasper | AI copy + performance optimization | KitStamp has no performance claims |
| Copy.ai | AI copy + workflow automation | KitStamp has no automation |
| Google Docs + Drive | Ad-hoc content prep | KitStamp adds structure + AI + export |

### Cascade's Honest Assessment

| Aspect | Assessment |
|--------|-----------|
| Market need | ✅ Real — "messy middle" is underserved |
| Category validity | ⚠️ Requires education — "content preparation" isn't established |
| Build feasibility | ✅ High — 70% of image capability exists |
| Competitive moat | ⚠️ Philosophical (restraint), not technical |
| Viability | ⚠️ Maybe, only if ruthless — per positioning map |

---

## 18. MenuList Relationship

### Dependency Direction (Per Constitution 12)

```
MenuList  ──►  KitStamp  (read-only, one-way)
```

- KitStamp may read public MenuList data (store name, business type)
- KitStamp NEVER writes to MenuList
- MenuList may consume exported Content Kits
- **KitStamp never knows or cares where kits go**

### Shared Infrastructure (Allowed)

- AI model APIs (Gemini, Imagen)
- Image generation pipeline
- Safety settings
- Firebase Storage
- Auth (NextAuth, scoped)

### Separate (Required)

- UI / navigation / layout
- Data model (Content Units ≠ Menu Items)
- Billing / pricing
- Feature flags
- State management

### The Key Difference

| Dimension | MenuList | KitStamp |
|-----------|----------|-----------|
| Owns | Live reality | Drafts |
| Time horizon | Continuous | Project-based |
| AI posture | Authority | Assistant |
| Output | Autonomous actions | Human-approved kits |
| End state | "Running" | "Exported" |

---

## 19. Build Prerequisites

Per Constitution 11 (Product Evolution Doctrine), KitStamp is **Stage 3 — Optional**.

### Must Be True Before Building

- [ ] MenuList is system-of-record for SMB public presence
- [ ] GrowthOS is either stable or deliberately paused
- [ ] 200+ active MenuList stores
- [ ] Organic demand for content preparation (not manufactured)
- [ ] Founder explicit unlock decision

### What "Building" Means

KitStamp extraction from MenuList only happens when scale demands it. The AI Image Generation system remains inside MenuList regardless.

---

## 20. Kill Criteria

### When to Shut Down KitStamp

| Signal | Action |
|--------|--------|
| KitStamp distracts from MenuList | Pause immediately |
| No organic demand after 6 months | Re-evaluate |
| Users ask for publishing / analytics | Product is drifting — correct or kill |
| Canva adds "draft preparation mode" | Re-assess differentiation |
| Pricing doesn't cover AI costs | Restructure or pause |

### The Honest Truth

> If KitStamp is never built — **you still win.**
> MenuList is the OS. GrowthOS is the revenue lever.
> KitStamp is the optional expansion.

---

## Cross-References

| Document | Relevance |
|----------|-----------|
| `__docs__/constitution/11-product-evolution-doctrine.md` | Product sequence: KitStamp = Stage 3 |
| `__docs__/constitution/12-product-separation-doctrine.md` | Separation rules, AI posture, dependency direction |
| `__docs__/strategy/product-positioning-map.md` | 3-product stack model |
| `__docs__/growthos-addon/README.md` | Active GrowthOS add-on plan |
| `__docs__/control-layer-strategy/README.md` | Control Layer (Stage 1) |
| `__docs__/strategy/menulist-future-roadmap-ssot.md` | Overall build sequence |
| AI Image Gen docs | `__docs__/projects/ai-image-generation/` — existing infrastructure |

---

**Last Updated:** February 19, 2026
**Next Review:** When build prerequisites are met
**Authority:** Founder reference document — strategic planning only, not implementation spec

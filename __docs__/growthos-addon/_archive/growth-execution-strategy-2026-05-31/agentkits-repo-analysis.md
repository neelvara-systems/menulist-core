# AgentKits Marketing Repo — Analysis & Extraction Plan

**Repo:** [aitytech/agentkits-marketing](https://github.com/aitytech/agentkits-marketing)  
**Analyzed:** February 19, 2026  
**Purpose:** Determine what's useful for GrowthOS (future) from this open-source marketing agent framework  
**Status:** Reference only — no active extraction needed now

---

## What The Repo Contains

| Component | Count | Description |
|-----------|-------|-------------|
| **Marketing Agents** | 18 | Specialized .md agent definitions (attraction, lead-qualifier, email-wizard, copywriter, CRO, SEO, etc.) |
| **Slash Commands** | 93 | Structured command patterns: `/campaign:plan`, `/content:blog`, `/seo:keywords`, `/cro:page`, etc. |
| **Skills** | 28 | Marketing mental models, frameworks, playbooks (psychology, copywriting, pricing, SEO, CRO) |
| **Workflows** | 3 | Campaign lifecycle, sales workflow, CRM workflow |
| **Training Modules** | 23+ | Multi-language interactive lessons |

**Nature:** This is a prompt-ops knowledge base for AI assistants, not software. Written in human-readable `.md` format. No engineering code, no APIs, no UI components.

---

## What's Extractable for GrowthOS

### Tier 1: Directly Useful (~15% of repo)

| Component | What to Extract | How It Maps to GrowthOS |
|-----------|----------------|------------------------|
| **Copywriting skill** | Tone frameworks, headline patterns, CTA structures | Content generation quality rules |
| **Campaign lifecycle workflow** | Multi-step campaign process | Internal workflow engine design |
| **Brand voice guardian agent** | Consistency rules, voice detection | Brand safety filter logic |
| **Marketing psychology skill** | 70+ mental models for persuasion | Used INTERNALLY for output quality, never exposed to user |
| **Content command patterns** | `/content:landing`, `/content:email` structure | Task → workflow → output mapping pattern |

### Tier 2: Partially Useful (~10% of repo)

| Component | What's Useful | What's Not |
|-----------|--------------|-----------|
| **SEO specialist agent** | Local SEO description patterns | Programmatic SEO, keyword research (too technical) |
| **Launch strategy skill** | Announcement copy frameworks | Full launch planning (too complex for SMBs) |
| **Pricing strategy skill** | Value anchoring language | Pricing page optimization (wrong product) |

### Tier 3: Not Useful (~75% of repo)

| Component | Why Not Useful |
|-----------|---------------|
| Lead qualifier agent | CRM territory — permanently rejected |
| Email wizard agent | Email marketing — different product category |
| Sales enabler agent | B2B sales — wrong market |
| Continuity specialist | Retention strategy — requires analytics |
| Upsell maximizer | Revenue optimization — requires tracking |
| Conversion optimizer (CRO) | Landing page optimization — wrong surface |
| Programmatic SEO | Scaled page generation — enterprise tool |
| A/B test setup | Testing — permanently banned |
| Form/signup/onboarding CRO | SaaS optimization — irrelevant |
| Referral program | Growth hacking — wrong approach for SMBs |
| Training modules | Education — permanently rejected per GrowthOS doctrine |

---

## Architecture Pattern Worth Studying

The repo's structure reveals a useful **agent decomposition pattern** that GrowthOS can adapt:

```
Repo Pattern:
  Agent (role definition) → Command (task trigger) → Skill (knowledge) → Workflow (multi-step)

GrowthOS Adaptation:
  Use Case (task) → Workflow (fixed pipeline) → Internal Roles (invisible) → Output (Final Content Kit)
```

### Key Differences

| Aspect | agentkits-marketing | GrowthOS |
|--------|-------------------|----------|
| Agent visibility | Visible to user | Invisible — internal only |
| Commands | User types slash commands | User taps one button |
| Skills | User can explore | System uses internally, never exposed |
| Workflows | Multi-step with user decisions | Fixed pipeline, no user involvement |
| Output | Suggestions + drafts | Final Content Artifact only |

---

## Specific Extraction Recommendations

### 1. Copywriting Frameworks → Content Generator Rules

**From repo:** `skills/copywriting/` contains headline formulas, CTA patterns, persuasion frameworks.

**Adapt for GrowthOS:**
- Use headline formulas for WhatsApp message openers
- Use CTA patterns for Google Business posts
- Apply persuasion rules as INTERNAL constraints (never as options for user)
- Strip all marketing jargon — convert to "sounds like a local business owner" tone

### 2. Campaign Lifecycle → Workflow Structure

**From repo:** `workflows/primary-workflow.md` defines a campaign lifecycle (research → plan → create → review → launch → analyze).

**Adapt for GrowthOS:**
- Collapse to: `Input → Generate → Validate → Deliver` (4 steps max)
- Remove: research, planning, review, analysis phases (violate output-first doctrine)
- Keep: the concept of validation as a distinct step before delivery

### 3. Brand Voice Guardian → Safety Filter

**From repo:** `agents/brand-voice-guardian.md` defines consistency rules.

**Adapt for GrowthOS:**
- Convert to automated safety filter (not an interactive agent)
- Rules: no AI language, no hype, no false claims, local-appropriate tone
- Runs silently on every output before delivery
- Aligns with Language Governance (`__docs__/constitution/02-language-governance.md`)

### 4. Marketing Psychology → Internal Quality Layer

**From repo:** `skills/marketing-psychology/` contains 70+ mental models.

**Adapt for GrowthOS:**
- Use selected models INTERNALLY to improve output quality
- Relevant models: social proof, urgency (within safety limits), loss aversion, anchoring
- Never expose these models to users
- Never use jargon like "social proof" in outputs

---

## What NOT To Do With This Repo

1. **Do NOT import the repo** into MenuList or GrowthOS codebase
2. **Do NOT use their agent definitions** as-is (they're for developer/marketer assistants, not SMB tools)
3. **Do NOT expose slash commands** to users (violates output-first philosophy)
4. **Do NOT use their training modules** (education is permanently rejected)
5. **Do NOT adopt "Vibe Marketing" branding** or terminology
6. **Do NOT treat this as a foundation** — treat it as a reference for workflow patterns only

---

## Bottom Line

The repo is ~15% useful for GrowthOS. The useful parts are:
- **Structural patterns** (how to decompose marketing tasks into steps)
- **Copywriting frameworks** (how to write effective, safe promotional text)
- **Safety/consistency rules** (how to maintain brand voice)

Everything else is enterprise/SaaS marketing content that doesn't serve local SMBs.

The most valuable insight from studying this repo: **the difference between a marketing toolkit (what they built) and a marketing execution engine (what GrowthOS should be) is the removal of all user decisions between intent and output.**

---

**Last Updated:** February 19, 2026  
**Authority:** Reference document — no action required

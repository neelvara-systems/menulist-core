**Prerequisite:** Read `00-master-production-audit-governance.md` first.

---

# PHASE 2 — AI SYSTEM, TOKEN USAGE & COST CONTROL AUDIT

**MenuList Production Readiness**

Execute strictly under Master Production Audit Governance.

This phase is **financial survival + AI stability audit**.

If this phase is wrong →
AI costs will silently explode or system will behave unpredictably at scale.

You must audit like:
**You are paying the AI bill personally.**

---

# PRIMARY OBJECTIVE

Create a **complete AI usage intelligence map** across MenuList:

- Every AI call
- Every token/output flow
- Every hidden usage
- Every cost risk
- Every retry loop
- Every scaling danger
- Every place where tracking must exist

We are preparing for:
**Output/credit-based pricing + internal AI usage tracking**

Nothing must be missed.

---

# PART 1 — MASTER AI USAGE DISCOVERY

Scan entire codebase and identify **ALL AI usage points**.

Include:

### Direct AI calls

- Gemini calls
- OpenAI calls (if any)
- Image generation APIs
- Translation APIs
- Embedding APIs (if any)
- AI parsing/extraction
- Any decision AI
- Any future placeholder calls

### Indirect AI calls

- Utility wrappers calling AI
- Background jobs calling AI
- Batch generation jobs
- Retry handlers
- Fallback models
- Queue systems

### For EACH AI call document:

- File path
- Function name
- Feature it belongs to
- Model used
- Trigger point (UI/button/background)
- Sync or async
- Single or batch
- User-triggered or system-triggered

Goal:
**Complete AI call map of entire system**

---

# PART 2 — FEATURE-WISE AI BREAKDOWN

Audit deeply per feature:

### 1. Menu extraction

### 2. Description generation

### 3. Image generation & editing

### 4. Multi-language translation

### 5. Any internal AI decision logic

### 6. Any hidden/internal-only AI usage

### 7. Any upcoming AI-ready placeholders

For each feature:

- Where AI called
- How often
- Trigger pattern
- Batch vs single
- Can be abused?
- Can be spammed?
- Can loop accidentally?

---

# PART 3 — TOKEN INPUT ANALYSIS

For every AI call:

Document input side:

- Prompt source
- Prompt builder location
- Static vs dynamic prompts
- Avg input token size
- Worst-case input size
- Menu size impact
- Multi-language multiplier
- Image prompt size
- Is prompt repeated unnecessarily?

Find:
Where token input can explode.

---

# PART 4 — OUTPUT & RESPONSE ANALYSIS

For each AI call:

- Avg output tokens
- Worst-case output tokens
- Structured or long-form?
- Stored in DB?
- Regenerated often?
- Re-generated on edit?
- Used once or repeatedly?
- Cached or not cached?

Find:
Where output tokens burn cost repeatedly.

---

# PART 5 — FREQUENCY & SCALE SIMULATION

Simulate usage at scale.

Example:
1000 SMBs
Each with:

- 50–200 menu items
- Multi-language
- Images
- Edits per month

Calculate:

- AI calls per store
- Per day
- Per month
- Worst-case heavy user
- Worst-case abusive user

Goal:
Find **real cost exposure**.

---

# PART 6 — HIDDEN COST & LOOP DETECTION

Identify:

- Repeated AI calls for same output
- Regeneration without change
- Double-trigger bugs
- Infinite retry loops
- Background jobs calling AI silently
- Multiple calls per action
- AI call inside render/effect loops
- Translation multiplier effects
- Image regen misuse

This is where SaaS dies financially.

---

# PART 7 — CACHING & REUSE OPPORTUNITIES

Check:

- Are outputs stored?
- Reused properly?
- Recalled instead of regenerated?
- Any duplicate generation?
- Any missing cache layer?
- Any safe reuse possible?

Goal:
**Never pay twice for same output**

---

# PART 8 — USAGE TRACKING INSERTION POINTS

We will implement:
**Internal usage tracking + credit/output pricing**

You must identify:

### Where tracking must be inserted:

- Before AI call
- After response
- Per item
- Per menu
- Per batch
- Per store
- Per language
- Per image
- Per feature

### Also define:

- Central tracking layer location
- Clean architecture placement
- How to avoid messy feature-level tracking
- How to avoid performance hit
- How to keep future-proof

DO NOT implement.
Only design placement.

---

# PART 9 — COST EXPLOSION RISK REPORT

Identify:

### Critical risks:

Where costs can spiral uncontrollably.

### Abuse scenarios:

- User spams generation
- Large menu regen repeatedly
- Multi-language spam
- Image spam
- Automation misuse

### System risks:

- Background silent calls
- Retry storms
- Loop triggers

---

# PART 10 — DELIVERABLES

Create:

## `phase-02-ai-cost-audit-report.md`

Include:

### 1. MASTER AI USAGE MAP

Every AI call in system.

### 2. FEATURE-WISE BREAKDOWN

Usage per feature.

### 3. TOKEN INPUT/OUTPUT ANALYSIS

Estimated usage patterns.

### 4. SCALE COST SIMULATION

100 / 1k / 10k SMB impact.

### 5. HIDDEN COST RISKS

Where money can burn silently.

### 6. REDUNDANT CALLS

Wasteful usage found.

### 7. CACHING OPPORTUNITIES

Where reuse possible.

### 8. TRACKING INSERTION PLAN

Where usage tracking must live.

### 9. MUST-FIX BEFORE PRICING MODEL

Critical fixes required before credit system.

### 10. PHASE VERDICT

Answer brutally:

If launched without tracking:

- How fast will cost explode?
- Biggest financial risk?
- Abuse risk level?
- Confidence score /10?

---

# EXECUTION MODE

Move slowly.
Trace everything.
Miss nothing.

Even one hidden AI call untracked
= future financial leak.

When done:
Return Phase 2 report only.

# Automation Evolution Doctrine

**Version:** 1.0  
**Status:** 🔒 LOCKED — 3-YEAR COMMITMENT (February 2026 → February 2029)  
**Authority:** Maximum — Governs all automation/intelligence expansion  
**Source:** ChatGPT Strategic Session (Feb 24, 2026) → Cascade Review + Codebase Cross-Check  
**Review:** `__docs__/research/smb-public-truth-industry-analysis/_archive/chatgpt-review-session11.md`

---

## The Single Decision

> **MenuList will evolve from a control surface into an autonomous public truth engine — but only through a disciplined 4-stage transition that never sacrifices owner trust or control.**

Not via AI magic. Via deterministic, rule-based, observable automation.  
Not overnight. Via years of behavioral data collection and pattern validation.

---

## Rule 1 — The 4-Stage Evolution Path (LOCKED)

MenuList follows **one** automation evolution. No stage skipping. No parallel experiments.

```
STAGE 1: CONTROL SURFACE (NOW)
    Owner actively opens MenuList to update truth.
    High interaction frequency. Habit formation.
    MenuList = "where I go to change my menu"
    
    ↓ (only when MenuList is default update surface for 50+ stores)

STAGE 2: ASSISTED INTELLIGENCE
    System observes patterns silently (MOL data).
    Suggests rules: "Item usually unavailable after 10 PM. Auto-disable?"
    Owner confirms once → rule created.
    System never acts without confirmation at this stage.
    
    ↓ (only when owners trust suggestions and accept 70%+ of them)

STAGE 3: RULE-BASED AUTOMATION
    Confirmed rules execute automatically.
    Deterministic, reversible, logged.
    Owner interaction frequency drops naturally.
    MenuList = "system that follows my rules"
    
    ↓ (only when rule accuracy >95% and zero trust incidents)

STAGE 4: AUTONOMOUS TRUTH ENGINE
    System self-maintains public truth.
    Owner intervenes only for structural changes.
    MenuList = "system that keeps everything correct"
```

### Stage Gates (Non-Negotiable)

| Gate | Requirement | Metric |
|------|-------------|--------|
| 1 → 2 | MenuList is default update surface | >50 active stores, daily usage habit |
| 2 → 3 | Owner trust in suggestions | >70% suggestion acceptance rate |
| 3 → 4 | Rule execution reliability | >95% accuracy, 0 trust incidents in 6 months |

---

## Rule 2 — Automation Guardrails (PERMANENT)

These guardrails apply at ALL stages and can never be relaxed.

1. **Never auto-change base pricing without explicit global permission**
2. **Never delete items permanently via automation**
3. **Never publish major structural menu changes autonomously**
4. **Always maintain reversible history and instant rollback**
5. **Every automated action must be logged and explainable**
6. **Owner override always takes priority: Owner > Rule > System**
7. **Automation must be opt-in, never forced**
8. **No black-box AI decisions — all automation is rule-based and deterministic**

### The Trust Test

> If an owner ever asks "Why did this change?" and the answer is "AI decided" — **we have failed.**

Correct answer must always be: "Because of rule X that you approved on date Y."

---

## Rule 3 — Technical Foundation Required

Before ANY automation stage can begin, these foundations must exist:

### Already Built (Stage 1 Ready)

| Foundation | Status | Evidence |
|---|---|---|
| Structured catalog with stable IDs | ✅ | `ExtractedDataItem.id` — `extractedData.types.ts:46` |
| Deterministic ordering | ✅ | `orderIndex` on categories/items/attributes |
| Availability flag (public truth toggle) | ✅ | `ExtractedDataItem.available` — `extractedData.types.ts:60` |
| Visibility flag (active/hidden) | ✅ | `ExtractedDataItem.active` — `extractedData.types.ts:59` |
| Change detection (MOL) | ✅ | `detectAndLogChanges()` — `src/database/projects/index.ts:107` |
| Change logging | ✅ | `src/database/menuChangeLog/index.ts` |
| Atomic publish | ✅ | Single Firestore doc update per publish |
| Multi-language single object | ✅ | `name: { [key: string]: string }` pattern |
| Chain governance (master/outlet) | ✅ | `ProjectOverrides` type — `project.types.ts:229` |
| Temp status with auto-expiry | ✅ | Temp Status Layer — `ENABLE_TEMP_STATUS` |

### Required for Stage 2 (Build When Entering Stage 2)

| Foundation | Status | What It Does |
|---|---|---|
| Pattern detection from MOL data | ❌ Not built | Identify repeating behavior (item toggles, closure patterns) |
| Confidence scoring for patterns | ❌ Not built | Must reach threshold before suggesting |
| Suggestion UI (minimal) | ❌ Not built | One-tap accept/reject for proposed rules |

### Required for Stage 3 (Build When Entering Stage 3)

| Foundation | Status | What It Does |
|---|---|---|
| Rule engine (deterministic) | ❌ Not built | Execute approved rules on schedule |
| Rule audit log | ❌ Not built | Every auto-action traced to rule + approval |
| Rollback capability | ❌ Not built | Instant undo of any automated change |

### Required for Stage 4 (Build When Entering Stage 4)

| Foundation | Status | What It Does |
|---|---|---|
| External drift detection | ❌ Not built | Monitor Google/aggregators for mismatches |
| Self-correction engine | ❌ Not built | Auto-fix detected external drift |
| Owner supervision dashboard (minimal) | ❌ Not built | "What system did this week" summary |

---

## Rule 4 — Tech-Savvy SMB Expectations

MenuList serves two ICP segments. The product surface is identical — but the trust expectations differ.

### Segment A: Non-Tech SMB Owner (Current Primary ICP)

- **Mindset:** "Help me manage menu easily"
- **Expects:** Simplicity, zero jargon, instant results
- **Judges by:** Speed of update, visual clarity
- **Trust signal:** "It looks right on my phone"

### Segment B: Tech-Savvy SMB Owner (Emerging ICP)

- **Mindset:** "Make this the system I trust as my public truth infrastructure"
- **Expects:** Determinism, reliability, predictability, scale readiness
- **Judges by:** Correctness guarantee, system behavior consistency
- **Trust signal:** "If I update here, it's correct everywhere — always"

### What Tech-Savvy SMBs Expect (that Non-Tech SMBs Don't Notice)

| Expectation | Current Status |
|---|---|
| Deterministic publishing (update → live everywhere) | ✅ Already deterministic |
| System reliability (no random behavior) | ✅ MCE + pricing integrity |
| API/export optionality | ✅ Platform Pull API shipped |
| Multi-location scale readiness | ✅ Chain architecture built |
| Clean data ownership (no lock-in) | ✅ Export via API possible |
| Predictable propagation | ✅ Single Firestore → all surfaces |

### Design Implication

> **Keep surface identical for both segments.** Increase depth silently. Never add "advanced mode" or "power user features." Infrastructure feels the same to everyone — but tech-savvy users notice the depth.

---

## Rule 5 — Adoption-First Phase Sequencing

The business must grow in this exact order. No mixing.

```
Phase 1 → ADOPTION (Now)
    Become default digital menu for premium SMBs.
    Optimize for: daily usage, habit formation, behavioral anchoring.
    
Phase 2 → DEPTH / INEVITABILITY (After adoption base)
    Make MenuList irreplaceable.
    Optimize for: version authority, search dominance, reliability.
    
Phase 3 → REVENUE EXPANSION (After dependence)
    Monetize infrastructure position.
    Optimize for: multi-location pricing, premium tiers, AI pack usage.
```

### Why This Order Is Non-Negotiable

- Revenue before inevitability → churn rises
- Depth before adoption → growth stalls
- Adoption without depth → replaceable tool

---

## Rule 6 — What Automation Must NEVER Become

### Warning Signs of Drift

- [ ] Automation feels "magical" or unexplainable
- [ ] Owner cannot understand why something changed
- [ ] System makes pricing decisions autonomously
- [ ] Automation requires its own dashboard to manage
- [ ] Rules become too complex for owner to mentally model
- [ ] System acts differently than owner expects
- [ ] "AI-powered" language appears in marketing

### The Kill-Switch

If any automation feature:
- Reduces owner trust → **disable immediately**
- Creates confusion → **simplify or remove**
- Requires explanation → **too complex, redesign**
- Behaves non-deterministically → **fix or disable**

---

## Relationship to Existing Doctrine

| Existing Document | This Doc Extends It By |
|---|---|
| `01-core-doctrine.md` — 10 Laws | Adding automation-specific guardrails aligned with Law 2 (Silence), Law 8 (Trust > Engagement) |
| `04-automode-spec.md` — Autonomous states | Adding the 4-stage transition path to reach full autonomy |
| `11-product-evolution-doctrine.md` — Stage 0-3 sequence | Adding automation evolution within Stage 0→1 transition |
| `13-operational-infrastructure-doctrine.md` — Ops laws | Adding rule engine + audit requirements for future stages |
| `15-category-dominance-doctrine.md` — Upstream positioning | Adding tech-savvy SMB expectations as validation of infrastructure positioning |

---

## The Success Sentences

**Stage 1 (Now):** "Let me open MenuList and update."  
**Stage 2:** "MenuList suggested closing early on Sundays — smart."  
**Stage 3:** "MenuList handles my daily toggles automatically now."  
**Stage 4:** "I don't think about my public menu anymore — it's always correct."

---

**Document Signature:** Founder Constitution  
**Created:** February 24, 2026  
**Lock Expires:** February 2029 (3-year minimum)  
**Modification:** Founder only, requires explicit unlock decision

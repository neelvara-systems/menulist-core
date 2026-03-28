# 18. Silent Correction Doctrine

**Version:** 1.0  
**Added:** March 19, 2026  
**Source:** ChatGPT strategic conversation → Cascade codebase review  
**Authority:** Constitution-level governance  
**Applies to:** All MenuList correctness, integrity, and rendering systems

---

## Core Principle

> **Every system MenuList builds should make the business look more correct — without the owner noticing it happened.**

MenuList is not helping owners manage truth. MenuList is **enforcing a consistent public reality**.

---

## The Pattern: Silent Correction Systems

A "Silent Correction System" is any system that:

1. **Observes** — detects issues in business data
2. **Corrects gently** — normalizes, degrades, or suppresses
3. **Never asks** — no confirmation dialogs, no approval flows
4. **Never explains** — no dashboards, no metrics, no "AI detected..."

If a system requires owner attention to function → it is NOT a Silent Correction System.

---

## 6 Rules

### Rule 1: Fix What Breaks Trust First

Build order is strict and non-negotiable:

1. **Correctness layer** — hours, price (fix trust damage)
2. **Stability layer** — ordering, consistency (fix perceived quality)
3. **Quality layer** — completeness, naming (polish)

Never build quality systems before correctness systems are solid.

### Rule 2: Failure Boundaries Are Law

Every field in MenuList belongs to exactly one failure zone:

| Zone | Fields | Behavior | Allowed Actions |
|------|--------|----------|----------------|
| **Zero-Failure** | Price consistency, structural validity, data format | Must NEVER be wrong | BLOCK, SUPPRESS, FORCE NORMALIZE |
| **Controlled-Failure** | Hours status, availability, anomalies | May degrade, never mislead | DEGRADE, WARN |
| **Tolerated Imperfection** | Descriptions, images, naming | Silent improvement only | NORMALIZE, AUTO-FILL |

**Escalation rule:** A cosmetic issue must NEVER be escalated to suppression. A structural issue must ALWAYS be escalated.

### Rule 3: Soft Degrade Over Hard Hide

When data is uncertain:

- **Prefer:** Degrading the display (remove badges, show cautious messaging)
- **Avoid:** Hiding content entirely (breaks continuity, causes owner panic)

Exception: Structurally broken items (orphan, invalid) may be hidden from customers but MUST remain visible to owners with a flag.

### Rule 4: Owner Is Authoritative but Not Absolute

- Owner input is the highest-trust source **at time of entry**
- Time invalidates truth — stale data degrades automatically
- System enforcement can override public output when confidence is low
- Owner can always fix root data to restore full display

This is the line between **tool** (shows whatever owner entered) and **infrastructure** (decides what is safe to show).

### Rule 5: No UI Exposure of System Intelligence

Owners and customers must NEVER see:

- Confidence scores
- Trust weights
- System state names (TRUSTED, RISKY, BROKEN)
- "AI detected..." messages
- Dashboards showing integrity metrics

All intelligence is **embedded into rendering decisions**. The system feels calm, not smart.

### Rule 6: Extend, Don't Rebuild

When adding correction capabilities:

- **Extend MCE** (Menu Correctness Engine) — don't create parallel validation
- **Extend MOL** (Menu Observation Log) — don't create parallel audit
- **Extend Store Truth Confidence** — don't create parallel scoring
- **Extend Hours Engine** — don't create parallel computation

Every new correction behavior must plug into existing architecture.

---

## Enforcement Policy

### Per-Zone Actions

| Action | Zero-Failure | Controlled | Tolerated |
|--------|-------------|------------|-----------|
| ALLOW | ✅ | ✅ | ✅ |
| NORMALIZE | ✅ | ✅ | ✅ |
| WARN | ❌ (too weak) | ✅ | ❌ (not needed) |
| DEGRADE | ❌ (insufficient) | ✅ | ❌ (not needed) |
| SUPPRESS | ✅ | ❌ (too aggressive) | ❌ |
| BLOCK | ✅ | ❌ (unless structural) | ❌ |

### Cross-Zone Rules

1. Only TRUSTED data can drive strong UI signals (badges, "Open Now", etc.)
2. Only 1 value per field is allowed publicly at any time (no contradictions)
3. Never delete or overwrite owner data — only control visibility/output
4. Cosmetic issues never escalate to suppression

---

## SMB Compatibility Guards

These guards prevent the system from being correct but confusing:

| Guard | Rule |
|-------|------|
| **Brand-safe normalization** | Skip naming normalization for mixed-case patterns (McChicken, iPod) |
| **Recently-edited freeze** | Don't auto-adjust items touched within 24 hours |
| **One-time generation** | AI descriptions generated once when empty. Owner edits are permanent |
| **Stability boost** | Unchanged data for >90 days + no conflicts = higher confidence, not lower |
| **Micro-feedback only** | When system acts, show one-line contextual explanation ("Hours hidden due to outdated data"), not dashboards |
| **Dual visibility** | Hidden items: invisible to customer, visible to owner with flag |

---

## What This Doctrine Rejects

| Rejected | Why |
|----------|-----|
| Analytics dashboards for truth metrics | Violates Law 2 (Silence Is a Feature) |
| Recommendation engines ("try promoting this item") | Adds thinking, doesn't remove it |
| A/B testing on menu presentation | Complexity without authority |
| Optimization UI | Destroys infrastructure positioning |
| Alerts/notifications for data quality | Creates monitoring burden |
| Complex source weighting formulas | Over-engineering for 2 input sources |

---

## Relationship to Existing Constitution

| Constitution Doc | Relationship |
|-----------------|-------------|
| 01-core-doctrine.md (Law 5: "Show less, not wrong") | This doctrine operationalizes Law 5 at the system level |
| 01-core-doctrine.md (Law 2: "Silence Is a Feature") | Silent Correction is the enforcement mechanism for Law 2 |
| 01-core-doctrine.md (Law 10: "Authority Is Fragile") | Failure Boundaries protect authority from erosion |
| 08-feature-rejection-gate.md | Any "integrity feature" that requires owner attention fails the gate |
| 13-operational-infrastructure-doctrine.md | Silent Correction is the quality complement to ops monitoring |
| 17-infrastructure-compounding-doctrine.md | Each correction system compounds truth quality over time |

---

## The Infrastructure Test

For every proposed correction system, ask:

> "Does this make MenuList more correct — without making the owner think?"

- If yes → build
- If it requires owner attention → reject or redesign
- If it's visible to customers as "system intelligence" → reject

---

**Document Signature:** Constitution  
**Authority:** Governance-level — applies to all MenuList development  
**Version:** 1.0

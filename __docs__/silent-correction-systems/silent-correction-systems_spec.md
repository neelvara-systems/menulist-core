# Silent Correction Systems — Product Specification

**Document Type:** Non-Technical Strategy + Governance  
**Status:** DOCUMENTED — Validated against codebase  
**Date:** March 19, 2026  
**Author:** Cascade (Lead Architect)  
**Source:** ChatGPT strategic conversation → full codebase cross-reference  
**Audience:** CEO, PM, Engineering

---

## Executive Summary

**What:** A governance framework for systems that silently detect, correct, and enforce business truth across all MenuList surfaces — without owner intervention, without dashboards, without explanation.

**Why:** MenuList's identity is "the system keeps working when no one is watching." Silent Correction Systems formalize HOW that promise is delivered. They ensure customers never see wrong hours, wrong prices, broken menus, or inconsistent data — even when owners forget to update.

**For whom:** Every MenuList business and their customers. Owners benefit from reduced anxiety. Customers benefit from reliable information.

**Key insight:** This is NOT a feature. It's a pattern class that governs how all existing correctness systems (MCE, MOL, Hours Engine, Store Truth Confidence) evolve together.

---

## The Pattern (Lock This)

Every Silent Correction System must be:

| Property | Meaning |
|----------|---------|
| **Silent** | No UI required. No dashboards. No notifications unless critical |
| **Corrective** | Improves truth, not behavior. Not analytics, not recommendations |
| **Bounded** | Never aggressive. Prefer degradation over removal |
| **Reversible** | Safe by default. Owner can always override |
| **Compounding** | Gets better over time without additional effort |

If a proposed system fails ANY of these → don't build it.

---

## Strategic Layering (Build Order)

### Phase 1 — Truth Protection (EXTEND existing)

**Goal:** Never be wrong. Never confidently communicate uncertain truth.

**What exists:** MCE validates on every save. MOL logs changes. Hours engine computes open/closed. Store Truth Confidence scores stores nightly. Staleness check detects abandoned stores.

**What's missing:**
- MCE doesn't produce field-level confidence states (only project-level verified/not)
- Hours engine always shows Open/Closed with no degradation for stale data
- MCE's SUSPICIOUS_PRICE_CHANGE rule is a stub (needs old project data)
- No hours structural validation (overlapping ranges, impossible times)

**Build:**
1. Extend Store Truth Confidence to compute per-field states (hours, price, structure)
2. Complete the MCE price anomaly rule
3. Add hours structural validation rules to MCE
4. Add staleness flags to hours confidence

### Phase 2 — Output Control (NEW — primary new system)

**Goal:** Confidence-gated rendering across all surfaces.

**What exists:** All surfaces read from same Firestore data. 60-second propagation guaranteed. But every surface renders raw values without checking confidence.

**What's missing:**
- A rendering layer that checks confidence before displaying
- Degradation behavior (remove badges, show cautious messaging)
- Surface-aware strictness (screens stricter than web)

**Build:**
1. Output control resolver: field × confidence state → render decision
2. Hours degradation (RISKY → remove "Open Now", show "Hours may vary")
3. Integration into client menu, OBP, and screen renderers

### Phase 3 — Perception Quality (low priority)

**Goal:** Always look professional.

**What exists:** AI description generation, AI image generation (both in editor, user-triggered).

**What's missing:**
- Automatic naming standardization (capitalization, trimming)
- Duplicate item detection

**Build (only if bandwidth):**
1. Naming normalization utility (capitalize, trim, format)
2. Brand-safe detection (skip for "McChicken", "iPod" patterns)

---

## Failure Boundaries (Governance Framework)

This framework defines WHERE MenuList must be absolutely correct versus where it can tolerate imperfection.

### Zero-Failure Zone

**These must NEVER be wrong. Failure here = immediate trust collapse.**

| Field | Guarantee | Enforcement |
|-------|-----------|-------------|
| Price consistency across surfaces | Same price on QR, Web, PDF, Screens, OBP | Single Firestore source + 60s propagation + MCE validation |
| Structural validity | No broken menus, no empty categories shown, no orphan items | MCE Laws 4+5 block publish. Suppress at render if post-publish |
| Data format integrity | No corrupted fields, no unparsable values | MCE Law 1 blocks invalid formats |

**Allowed actions in this zone:** BLOCK (on write), SUPPRESS (on render), FORCE NORMALIZE (all surfaces)  
**Forbidden:** WARN only, DEGRADE only, multiple values existing simultaneously

### Controlled-Failure Zone

**These can degrade gracefully but must never mislead.**

| Field | Acceptable Behavior | Enforcement |
|-------|-------------------|-------------|
| Hours (real-time status) | Remove "Open Now" badge when uncertain. Show "Hours may vary" | DEGRADE: remove badge, add cautious text |
| Availability | Show item but mark unavailable | DEGRADE: reduce opacity, add "Not available" |
| Price anomalies | Temporary internal instability, short delay before propagation | WARN + delay propagation 30-60s |

**Allowed actions:** ALLOW, DEGRADE, WARN  
**Forbidden:** Show confident wrong state, fabricate values, hard block (unless structurally invalid)

### Tolerated Imperfection Zone

**These do NOT affect core trust. Silent improvement only.**

| Field | Acceptable Behavior | Enforcement |
|-------|-------------------|-------------|
| Descriptions | Missing → auto-fill via AI. Low quality → leave alone | NORMALIZE (auto-fill) only when missing |
| Images | Missing → optional generation. Present → never replace | NORMALIZE only when empty |
| Naming | Inconsistent → normalize on save | NORMALIZE only. Never BLOCK or SUPPRESS |

**Allowed actions:** NORMALIZE, AUTO-FILL  
**Forbidden:** BLOCK, SUPPRESS, overwrite owner content

---

## SMB Compatibility Corrections

The ChatGPT conversation proposed systems optimized for correctness. These corrections ensure they work for **real non-technical SMB owners** in India and globally.

### Correction 1: Replace Silence with Safe Language

**Problem:** Removing the "Open Now" badge creates ambiguity. Customer can't tell if store is open.

**Fix:** Replace with deterministic messages:
- TRUSTED → "Open Now" (green)
- RISKY → "Hours may vary" (neutral)
- BROKEN → "Check with store" (muted)

**Rule:** Never show nothing. Always communicate something safe.

### Correction 2: Dual Visibility Model

**Problem:** System hides item from customer → owner sees it "disappeared" → panic.

**Fix:**
- Customer view: hidden (if structurally broken)
- Owner dashboard: visible + flagged with reason ("Hidden from customers — missing category")

**Rule:** Never silently disappear items from owner view.

### Correction 3: Brand-Safe Normalization

**Problem:** Aggressive capitalization normalization breaks brand names ("McChicken" → "Mcchicken").

**Fix:** If mixed casing detected (uppercase not at word start) → skip normalization for that item.

**Rule:** Normalize format, never alter brand identity.

### Correction 4: Recently-Edited Freeze

**Problem:** Ordering stabilizer moves items owner just arranged → perceived loss of control.

**Fix:** Items edited within last 24 hours are frozen in place. Max position change: ±2 positions.

**Rule:** Owner intent is sacred within 24 hours.

### Correction 5: One-Time Generation Rule

**Problem:** System repeatedly regenerates AI descriptions, overwriting owner's manual edits.

**Fix:** If `descriptionSource === "OWNER"` → never auto-replace. If owner clears description → wait 72 hours before auto-fill.

**Rule:** Generate once when empty. Respect owner edits permanently.

### Correction 6: Stability Confidence Boost

**Problem:** Stable menus unchanged for 6 months get incorrectly downgraded to "risky."

**Fix:** If unchanged > 90 days AND no conflicts → increase confidence slightly (stability boost). Hours decay aggressively; items/descriptions decay slowly.

**Rule:** Stability is a positive signal, not a negative one. Different fields decay at different rates.

### Correction 7: Price Anomaly Stabilization Window

**Problem:** Staff typo (₹199 → ₹19) propagates instantly to all surfaces.

**Fix:** If price change > 70%, mark as ANOMALY internally. Delay propagation to PDF/screens for 30-60s (aligns with existing debounce). Allow on web/QR immediately (reversible).

**Rule:** Extreme changes get a brief stabilization window, not a block.

---

## UI State Matrix

### Hours Display States

| System State | Badge | Secondary Text | Visual Style |
|-------------|-------|---------------|-------------|
| TRUSTED + Currently Open | "Open Now" | "Closes at [time]" | Green badge |
| TRUSTED + Currently Closed | "Closed" | "Opens at [time]" or "Opens [day] at [time]" | Neutral/grey |
| RISKY (stale >30 days, no conflicts) | No badge | "Hours may vary" | Muted text |
| BROKEN (invalid structure or very stale) | No badge | "Check with store" | Muted text |

### Item Display States

| System State | Customer View | Owner View |
|-------------|--------------|------------|
| Available + Trusted | Full display | Full display |
| Unavailable | Shown at 60% opacity + "Not available" label | Shown + "Unavailable" toggle |
| Broken (orphan/invalid) | Hidden | Visible + "Hidden from customers" flag |

### Price Display States

| System State | Display | Surface Behavior |
|-------------|---------|-----------------|
| TRUSTED | Show normally | All surfaces |
| RISKY (anomaly detected) | Show canonical value | Web/QR immediate; PDF/screens delayed 30-60s |
| BROKEN (invalid/unparsable) | Hide price OR fallback to last valid | Rare edge case |

---

## Enforcement Policy Summary

### Per-Zone Allowed/Forbidden Actions

| Zone | ALLOW | NORMALIZE | WARN | DEGRADE | SUPPRESS | BLOCK |
|------|-------|-----------|------|---------|----------|-------|
| **Zero-Failure** | ✅ | ✅ | ❌ (too weak) | ❌ (insufficient) | ✅ | ✅ |
| **Controlled** | ✅ | ✅ | ✅ | ✅ | ❌ (too aggressive) | ❌ (unless structural) |
| **Tolerated** | ✅ | ✅ | ❌ (not needed) | ❌ (not needed) | ❌ | ❌ |

### Cross-Zone Rules

1. **Escalation boundary:** Cosmetic issue → NEVER escalate to suppression
2. **Confidence gate:** Only TRUSTED data can drive strong UI signals
3. **Single truth rule:** Only 1 value allowed per field publicly at any time
4. **No silent destruction:** Never delete or overwrite owner data. Only control visibility/output

---

## What This Is NOT

| Not This | Why |
|----------|-----|
| Analytics dashboard | Violates "no monitoring" doctrine |
| Recommendation engine | Adds thinking, not removes it |
| AI suggestion panel | Creates decisions, not resolves them |
| A/B testing | Complexity without authority |
| Optimization UI | Destroys infrastructure positioning |
| Feature-rich system | This is invisible infrastructure |

---

## Success Definition

> **Customers never experience contradictions or confidently wrong information.**

Not:
- "Menu is always perfect" (impossible)
- "System catches every error" (over-promise)

But:
- No wrong "Open Now" when closed
- No conflicting prices across surfaces
- No broken menu navigation
- No confidently asserted uncertain truth

---

## Relationship to MenuList Identity

This framework codifies how MenuList's promise is enforced at the system level:

| MenuList Promise | Silent Correction Enforcement |
|-----------------|------------------------------|
| "It just works" | Systems correct silently without asking |
| "Change once, updates everywhere" | Render consistency + price integrity |
| "Owner doesn't think about menu" | Staleness detection + auto-degradation |
| "Customers trust MenuList" | Failure boundaries prevent confidence violations |

---

**Document Signature:** Cascade (Lead Architect)  
**Last Updated:** March 19, 2026

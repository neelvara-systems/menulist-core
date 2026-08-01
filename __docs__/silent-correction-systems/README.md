# Silent Correction Systems — Strategic Architecture

> Systems that observe, correct gently, never ask, never explain.

**Status:** ✅ IMPLEMENTED — Phase 1+2+3 complete, flags OFF  
**Date:** March 19, 2026 (docs) / March 19, 2026 (implementation)  
**Source:** ChatGPT strategic conversation → Cascade full codebase review  
**ChatGPT Accuracy:** ~35% (philosophy strong, implementation proposals ~65% redundant with existing systems)

---

## Quick Navigation

| Document                                     | Audience   | Purpose                                               |
| -------------------------------------------- | ---------- | ----------------------------------------------------- |
| [This README](README.md)                     | All        | Master index, architecture overview, codebase mapping |
| [Spec](silent-correction-systems_spec.md)    | CEO/PM     | Business strategy, phased roadmap, failure boundaries |
| [ChatGPT Review](_archive/chatgpt-review.md) | Developers | Full accuracy assessment of ChatGPT conversation      |

---

## What Is This?

"Silent Correction Systems" is a **pattern class** — not a single feature. It describes systems that:

1. **Observe** — detect issues in business data (hours, prices, structure)
2. **Correct gently** — normalize, degrade, or suppress without owner intervention
3. **Never ask** — no confirmation dialogs, no approval flows
4. **Never explain** — no dashboards, no metrics, no AI language

This pattern is the operational extension of MenuList's core identity: **the system keeps working when no one is watching.**

---

## Architecture Overview

```
Owner edits → Mutation Pipeline → Confidence Assessment → Integrity Rules → Output Control → Surfaces
                                        ↑                      ↑                  ↑
                                   [EXTEND]              [EXTEND MCE]         [NEW]
                              Store Truth Confidence    + new action types    Confidence-gated
                              + field-level states      + hours validation    rendering layer
```

---

## Codebase Reality Map

### What Already Exists (DO NOT REBUILD)

| System                            | Location                                                                | What It Does                                                                                         |
| --------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| **MCE** (Menu Correctness Engine) | `src/lib/mce/`                                                          | 17 validation rules, 5 Laws, runs on every save, stamps `_mce` metadata                              |
| **MOL** (Menu Observation Log)    | `src/lib/pricing/molLogger.ts`                                          | Append-only event ledger: price changes, hours updates, PDF events                                   |
| **Hours Engine**                  | `src/lib/hours/hoursEngine.ts`                                          | Timezone-aware open/closed computation, overnight handling                                           |
| **OBP Hours Status**              | `src/lib/obp/hoursStatus.ts`                                            | Independent hours computation for Official Business Page                                             |
| **Store Truth Confidence**        | `functions/src/analytics/storeTruthConfidence.ts`                       | Composite score: freshness(30%), completeness(25%), stability(20%), extraction(15%), engagement(10%) |
| **Extraction Confidence**         | `functions/src/types/menuExtraction.types.ts`                           | Per-extraction confidence scores from AI pipeline                                                    |
| **Extraction Learning Loop**      | `functions/src/analytics/extractionLearning.ts`                         | Tracks corrections to improve future extractions                                                     |
| **Staleness Check**               | `functions/src/analytics/stalenessCheck.ts`                             | Detects stale stores, triggers lifecycle messaging                                                   |
| **Decision Blocks / CMI**         | `src/components/.../DecisionBlocks.tsx` + `src/lib/intelligence/dal.ts` | 2-layer system: CF precompute + runtime filter. Item confidence + priority                           |
| **Menu Snapshots**                | `src/database/projects/index.ts` (publishProject)                       | Best-effort short-term immutable publish evidence; `menuVersion` is the authoritative publish counter |
| **Pricing Integrity**             | `__docs__/pricing-integrity-system/`                                    | Full doc set. Screen refresh, PDF regen, MOL audit trail                                             |
| **Hours Holiday Accuracy**        | `__docs__/hours-holiday-accuracy/`                                      | Full doc set. Hours display, timezone handling                                                       |
| **Truth Accuracy Dominance**      | `__docs__/truth-accuracy-dominance/`                                    | Pillar 2 of 6. MCE + hours = complete truth stack                                                    |
| **60s Propagation**               | CDN config + `unstable_cache`                                           | All surfaces sync within 60 seconds                                                                  |

### What's Genuinely New (BUILD)

| System                            | Priority | What It Adds                                                                       |
| --------------------------------- | -------- | ---------------------------------------------------------------------------------- |
| **Output Control Layer**          | P0       | Confidence-gated rendering: degrade display when data is uncertain                 |
| **Field-Level Confidence States** | P1       | Extend Store Truth Confidence with per-field TRUSTED/RISKY/BROKEN                  |
| **MCE Action Expansion**          | P1       | Add SUPPRESS, NORMALIZE, DEGRADE actions to existing rule engine                   |
| **Hours Integrity Rules**         | P1       | Extend MCE with structural hours validation (overlaps, stale detection)            |
| **Micro-feedback Layer**          | P2       | Minimal owner notifications when system acts ("Hours hidden due to outdated data") |
| **Naming Standardization**        | P3       | Normalize capitalization, formatting on save                                       |
| **Duplicate Detection**           | P3       | Detect similar items, suggest merge                                                |

### What's Rejected

| Proposal                                                            | Reason                                                                        |
| ------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Source Weighting Model (complex formulas)                           | Only 2 real input sources (owner + AI). Over-engineering                      |
| External Truth Sync (GBP)                                           | SurfaceOS scope — separate product per `__docs__/surface-os/`                 |
| Visibility Integrity                                                | GrowthOS scope — not MenuList's layer                                         |
| Separate audit system                                               | MOL already exists. Extend it, don't duplicate                                |
| New folder structure (`/integrity/`, `/confidence/`, `/mutations/`) | Conflicts with existing architecture. Use `src/lib/mce/` and `src/lib/hours/` |

---

## Failure Boundaries Framework (NEW — worth codifying)

### Zero-Failure Zone (NEVER be wrong here)

| Field                   | Guarantee                               | Existing Coverage                                         |
| ----------------------- | --------------------------------------- | --------------------------------------------------------- |
| **Price consistency**   | Same price across all surfaces          | ✅ Single Firestore source + 60s propagation              |
| **Structural validity** | No broken menus, no orphan items        | ✅ MCE Laws 4+5 (Data Completeness, Structural Integrity) |
| **Data format**         | No corrupted fields, no invalid formats | ✅ MCE Law 1 (Price Integrity validation)                 |

**Enforcement:** BLOCK on write. SUPPRESS on render. No exceptions.

### Controlled-Failure Zone (degrade, never mislead)

| Field               | Acceptable Behavior                    | Existing Coverage                                                  |
| ------------------- | -------------------------------------- | ------------------------------------------------------------------ |
| **Hours status**    | Degrade to "Hours may vary" when stale | ⚠️ PARTIAL — Hours engine always shows Open/Closed. No degradation |
| **Availability**    | Show item, mark unavailable            | ✅ Available/Unavailable toggles exist                             |
| **Price anomalies** | Temporary delay before propagation     | ⚠️ PARTIAL — MCE SUSPICIOUS_PRICE_CHANGE is a stub                 |

**Enforcement:** DEGRADE display. Remove strong signals. Never fabricate.

### Tolerated Imperfection Zone (silent improvement)

| Field            | Acceptable Behavior              | Existing Coverage                             |
| ---------------- | -------------------------------- | --------------------------------------------- |
| **Descriptions** | Missing → auto-fill via AI       | ✅ AI description generation exists in editor |
| **Images**       | Missing → optional AI generation | ✅ AI image generation exists in editor       |
| **Naming**       | Inconsistent → normalize         | ❌ NEW — no normalization exists              |

**Enforcement:** NORMALIZE only. Never BLOCK or SUPPRESS.

---

## Phased Implementation Roadmap

### Phase 1: Truth Protection (EXTEND existing)

**Goal:** Never be wrong. Never confidently communicate uncertain truth.

| Task                                                                        | Type                                                     | Dependencies            |
| --------------------------------------------------------------------------- | -------------------------------------------------------- | ----------------------- |
| Extend Store Truth Confidence to per-field states (hours, price, structure) | EXTEND `functions/src/analytics/storeTruthConfidence.ts` | None                    |
| Complete MCE SUSPICIOUS_PRICE_CHANGE rule (needs oldProject data)           | EXTEND `src/lib/mce/correctnessResolver.ts:208`          | Pass old project to CSR |
| Add hours structural validation to MCE (overlaps, impossible ranges)        | EXTEND MCE with new Law 3 rules                          | Hours engine            |
| Add staleness flag to hours confidence                                      | EXTEND nightly scheduler                                 | Store Truth Confidence  |

### Phase 2: Output Control (NEW)

**Goal:** Confidence-gated rendering across all surfaces.

| Task                                                                 | Type                          | Dependencies              |
| -------------------------------------------------------------------- | ----------------------------- | ------------------------- |
| Define render output contract (value, visibility, modifiers)         | NEW types                     | Phase 1 confidence states |
| Build output control resolver (field × confidence → render decision) | NEW `src/lib/outputControl/`  | Render contract           |
| Integrate into client menu renderer                                  | MODIFY `src/app/_client/`     | Output control            |
| Integrate into OBP renderer                                          | MODIFY `src/app/_client/obp/` | Output control            |
| Hours degradation: RISKY → remove "Open Now", show "Hours may vary"  | MODIFY hours engine + client  | Output control            |

### Phase 2C: Correction Loop Expansion (FUTURE — requires WhatsApp API)

**Goal:** Guaranteed awareness even for owners who don't visit dashboard.

| Task                                                    | Type                       | Dependencies                                             |
| ------------------------------------------------------- | -------------------------- | -------------------------------------------------------- |
| WhatsApp single-shot correction trigger for stale hours | NEW lifecycle event        | WhatsApp Cloud API access (Messaging Onboarding feature) |
| Email-based correction trigger (fallback)               | EXTEND lifecycle messaging | `src/lib/messaging/` templates                           |

**Constraints:** Only once per cycle (90-day cooldown matches staleness system). No spam. No follow-ups. Pull from existing `functions/src/analytics/stalenessCheck.ts` detection.

**Status:** LOGGED — Deferred until WhatsApp API access is available.

### Phase 3: Quality (EXTEND + NEW)

**Goal:** Always look professional.

| Task                                                                      | Type        | Dependencies |
| ------------------------------------------------------------------------- | ----------- | ------------ |
| Naming standardization on save (capitalize, trim, format)                 | NEW utility | None         |
| Brand-safe detection (skip normalization for mixed case like "McChicken") | NEW guard   | Naming util  |
| Owner micro-feedback for suppressed items (dual visibility model)         | NEW layer   | Phase 2      |

### Phase 4: Internal Quality (NEW, low priority)

**Goal:** Prepare for scale.

| Task                                                          | Type       | Dependencies |
| ------------------------------------------------------------- | ---------- | ------------ |
| Duplicate item detection (similarity matching)                | NEW        | None         |
| MOL expansion: log confidence changes and integrity decisions | EXTEND MOL | Phase 1+2    |

---

## Key Decisions (Locked)

### Decision 1: Soft Degrade > Hard Hide

When data is uncertain, **degrade display** (remove badges, show cautious messaging) rather than **hide content** (which breaks continuity and causes owner panic).

### Decision 2: Owner Is Authoritative but Not Absolute

Owner input is the highest-trust source at time of entry. But **time invalidates truth** — stale owner data degrades automatically. The system decides what is safe to show.

### Decision 3: System Enforcement Can Override Public Output

When confidence is low, the system may suppress real-time signals (like "Open Now") even though the owner entered hours. This is the line between **tool** and **infrastructure**.

### Decision 4: Extend MCE, Don't Rebuild

MCE's architecture (5 Laws, rule-based validation, publish-gate) is the correct foundation. New enforcement behaviors (SUPPRESS, DEGRADE, NORMALIZE) are additive, not replacements.

### Decision 5: No UI Exposure of Confidence

Owners should NEVER see confidence scores, trust weights, or system state names. All intelligence is embedded into rendering decisions. The system feels calm, not smart.

### Decision 6: External Sync Is SurfaceOS

GBP conflict resolution, external surface sync, and cross-platform truth governance belong to SurfaceOS — a separate product with separate infrastructure. MenuList controls internal truth only.

---

## UI State Matrix (Lock Before Implementation)

### Hours States

| Confidence       | Badge      | Message            | Style   |
| ---------------- | ---------- | ------------------ | ------- |
| TRUSTED + Open   | "Open Now" | none               | green   |
| TRUSTED + Closed | "Closed"   | "Opens at [time]"  | neutral |
| RISKY            | none       | "Hours may vary"   | muted   |
| BROKEN           | none       | "Check with store" | muted   |

### Item Availability

| State               | Display                                 | Style                               |
| ------------------- | --------------------------------------- | ----------------------------------- |
| Available           | Normal                                  | full opacity                        |
| Unavailable         | Shown, marked                           | 60% opacity + "Not available" label |
| Broken (structural) | Hidden from customer, flagged for owner | dual visibility                     |

### Price

| Confidence | Display                          | Behavior            |
| ---------- | -------------------------------- | ------------------- |
| TRUSTED    | Show normally                    | —                   |
| RISKY      | Show canonical                   | enforce consistency |
| BROKEN     | Fallback to last trusted OR hide | rare edge case      |

---

## Existing Feature Flags (Related)

| Flag                            | Status       | Purpose                     |
| ------------------------------- | ------------ | --------------------------- |
| `ENABLE_MCE`                    | `true`       | Menu Correctness Engine     |
| `ENABLE_MENU_OBSERVATION`       | `true`       | MOL event logging           |
| `ENABLE_MENU_SNAPSHOTS`         | `true`       | Publish-time snapshots      |
| `ENABLE_HOURS_STATUS_DISPLAY`   | `true`       | Real-time Open/Closed       |
| `ENABLE_STORE_TRUTH_CONFIDENCE` | `false` (CF) | Store-level confidence      |
| `ENABLE_EXTRACTION_LEARNING`    | `false` (CF) | Extraction improvement loop |
| `ENABLE_STALENESS_CHECK`        | `false` (CF) | Stale store detection       |

### New Flags Needed (when implemented)

| Flag                            | Purpose                                 | Default |
| ------------------------------- | --------------------------------------- | ------- |
| `ENABLE_OUTPUT_CONTROL`         | Confidence-gated rendering              | `false` |
| `ENABLE_FIELD_CONFIDENCE`       | Per-field confidence states             | `false` |
| `ENABLE_HOURS_INTEGRITY`        | Extended hours validation in MCE        | `false` |
| `ENABLE_NAMING_STANDARDIZATION` | Compatibility helper enabled; no active runtime consumer | `true` |

`ENABLE_NAMING_STANDARDIZATION` currently exposes the shared normalization
contract only. Repository runtime searches show no persistence, extraction, or
public-rendering caller, so turning the flag on does not silently rewrite menu
truth. Any future integration requires its own data-contract and regression
review.

---

## Relationship to Existing Docs

| Existing Doc Set                           | Relationship                                                                          |
| ------------------------------------------ | ------------------------------------------------------------------------------------- |
| `__docs__/canonical-truth-infrastructure/` | **Parent architecture.** Silent correction operates on this foundation                |
| `__docs__/truth-accuracy-dominance/`       | **Pillar 2.** This strategy extends Pillar 2's guarantees                             |
| `__docs__/pricing-integrity-system/`       | **Subsumed.** Pricing integrity becomes one subsystem                                 |
| `__docs__/hours-holiday-accuracy/`         | **Extended.** Hours engine gains confidence-gated output                              |
| `__docs__/menu-correctness-engine/`        | **Extended.** MCE gains new action types and rules                                    |
| `__docs__/infrastructure-compounding/`     | **Foundation.** Store Truth Confidence, staleness, extraction learning feed into this |
| `__docs__/surface-os/`                     | **Boundary.** External sync is SurfaceOS scope, not this                              |

---

## Version History

| Date       | Change                                                          | By      |
| ---------- | --------------------------------------------------------------- | ------- |
| 2026-03-19 | Initial creation — ChatGPT review + codebase mapping + strategy | Cascade |

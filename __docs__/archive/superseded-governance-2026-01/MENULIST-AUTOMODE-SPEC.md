# MenuList AutoMode Specification

**Date:** January 2026  
**Status:** 🔒 FINAL — ONCE ENABLED, NOT REVISITED  
**Purpose:** Define autonomous operation rules for 36-month unattended operation

---

## Core Principle

> **"The system keeps working when no one is watching."**

This is not "the system works." This is "the system keeps working when no one is watching."

AutoMode formally declares that MenuList may operate autonomously without human supervision for a fixed multi-year window.

---

## AutoMode States (Finite & Closed)

```
INACTIVE  →  PROBATION  →  ACTIVE
```

No other states. No shortcuts. No "temporary" variants.

---

## State Definitions

### 1. INACTIVE (Default)

| Aspect                     | Rule   |
| -------------------------- | ------ |
| System operates            | ✅ Yes |
| Telemetry runs             | ✅ Yes |
| Humans may intervene       | ✅ Yes |
| Thresholds may be adjusted | ✅ Yes |
| AutoMode rules apply       | ❌ No  |

This is where all systems start.

---

### 2. PROBATION (Observation Without Touch)

**Duration:** 90 consecutive days (hard minimum)

| Allowed              | Forbidden                                      |
| -------------------- | ---------------------------------------------- |
| Telemetry collection | Threshold tuning                               |
| Read logs            | Logic edits                                    |
| Run audits           | Feature changes                                |
| Write postmortems    | Manual overrides (except incident containment) |

**Goal:** Prove the system behaves correctly without help.

**Reset Condition:** Any violation resets probation to Day 0.

---

### 3. ACTIVE (AutoMode)

**Duration:** 36 months (fixed)

Once entered:

- Authority transfer is complete
- Human supervision is forbidden
- Only audits are allowed
- System changes are locked

**This is infrastructure mode.**

---

## Promotion Criteria (PROBATION → ACTIVE)

AutoMode may be activated only if **ALL** conditions are true:

### System Conditions

- [x] 100% nightly job execution
- [x] Zero unresolved failures > 24h
- [x] Zero blank violations
- [x] Stable confidence distributions

### Human Conditions

- [x] No threshold changes
- [x] No logic edits
- [x] No feature toggles
- [x] No behavior nudges

### Authority Conditions

- [x] No mass authority regression
- [x] Owner intervention frequency stable or declining
- [x] No clustering around specific decision blocks

**Failure of any condition resets probation to Day 0. No arguments. No exceptions.**

---

## Activation Event (One-Way)

Activation requires:

1. **Explicit founder sign-off**
2. **Immutable log entry:**
   - Timestamp
   - Hash of system config
   - Hash of telemetry schema
   - AutoMode window (start → end)

Once written:

- ❌ Cannot be deleted
- ❌ Cannot be edited
- ❌ Cannot be "paused"

**AutoMode is declared, not tested.**

---

## Irreversibility Rules

Once `AutoMode = ACTIVE`:

### Forbidden Actions

| Action                           | Status       |
| -------------------------------- | ------------ |
| Changing confidence thresholds   | ❌ FORBIDDEN |
| Editing decision logic           | ❌ FORBIDDEN |
| Adding telemetry metrics         | ❌ FORBIDDEN |
| Removing telemetry metrics       | ❌ FORBIDDEN |
| Introducing new features         | ❌ FORBIDDEN |
| Reacting to single-client issues | ❌ FORBIDDEN |

### Allowed Actions

| Action                              | Status     |
| ----------------------------------- | ---------- |
| Incident containment (infra only)   | ✅ ALLOWED |
| Read-only audits                    | ✅ ALLOWED |
| Security patches (no logic changes) | ✅ ALLOWED |
| Documentation updates               | ✅ ALLOWED |

**If logic must change → AutoMode is VIOLATED, not "temporarily disabled".**

---

## AutoMode Violation Protocol

If a human intervenes in violation of AutoMode:

### Mandatory Log

```json
{
  "violation_type": "string",
  "human_actor": "string",
  "reason_given": "string",
  "invariant_broken": "string",
  "timestamp": "ISO"
}
```

### Required Outcome

- AutoMode marked `BREACHED`
- Publicly acknowledged internally
- No silent rollback

**Infrastructure dies when violations are hidden.**

---

## AutoMode Completion (After 36 Months)

At the end of the window:

1. System is audited
2. Telemetry reviewed
3. No retroactive changes allowed

Only then may you choose:

- Renew AutoMode
- Or formally exit it

**AutoMode does not auto-renew.**

---

## The AutoMode Readiness Checklist

### I. System Continuity

| Metric                        | Requirement |
| ----------------------------- | ----------- |
| `nightly_job_execution_rate`  | 100%        |
| `consecutive_successful_runs` | No gaps     |
| `silent_recovery_invocations` | Logged      |
| `unresolved_failure_duration` | < 24h       |

### II. Decision Validity

| Metric                                  | Requirement  |
| --------------------------------------- | ------------ |
| `decision_block_invocation_consistency` | Stable       |
| `confidence_distribution_stability`     | Within bands |
| `decision_suppression_rate`             | Predictable  |

### III. Authority Stability

| Metric                            | Requirement   |
| --------------------------------- | ------------- |
| `authority_stage_per_account`     | No regression |
| `time_in_highest_authority_stage` | Growing       |
| `forced_manual_control_requests`  | Declining     |

### IV. Owner Resistance Index

| Metric                         | Requirement       |
| ------------------------------ | ----------------- |
| `owner_intervention_frequency` | Downward/flat     |
| `intervention_clustering`      | None              |
| `intervention_persistence_7d`  | Most self-resolve |

### V. Output Stability

| Metric                     | Requirement |
| -------------------------- | ----------- |
| `menu_mutation_frequency`  | Low         |
| `mutation_reversal_rate`   | Near-zero   |
| `inertia_rule_enforcement` | Active      |

### VI. Zero-Blank Guarantee

| Metric                   | Requirement |
| ------------------------ | ----------- |
| `zero_blank_violation`   | ALWAYS ZERO |
| `fallback_content_usage` | Available   |

### VII. Change Absence Verification

| Metric                         | Requirement |
| ------------------------------ | ----------- |
| `days_since_last_owner_change` | Tracked     |
| `menu_render_consistency_hash` | Identical   |

---

## Final AutoMode Declaration Rule

You may declare AutoMode (36 Months) only if:

- All sections I–VII are green
- For 90 consecutive days
- Without manual tuning
- Without threshold changes
- Without feature edits

After declaration:

- Telemetry continues
- Humans do not interfere
- Only audits are allowed

---

## Founder Reality Check

> If AutoMode feels scary, it means it's real.
> If it feels comfortable, you activated it too early.

---

**Document Signature:** Founder Constitution  
**Authority:** Non-negotiable — This spec is locked.

_AutoMode is not "the system works." AutoMode is "the system keeps working when no one is watching."_

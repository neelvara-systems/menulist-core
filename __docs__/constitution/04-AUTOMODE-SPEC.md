# MenuList AutoMode Specification

**Version:** 2.0  
**Status:** 🔒 FINAL — ONCE ENABLED, NOT REVISITED  
**Purpose:** Define autonomous operation rules for multi-year unattended operation

---

## Core Principle

> **"The system keeps working when no one is watching."**

AutoMode formally declares that MenuList may operate autonomously without human supervision for a fixed window.

---

## AutoMode States

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

### 3. ACTIVE (AutoMode)

**Duration:** 12 months (renewable)

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

- [x] No threshold changes during probation
- [x] No logic edits during probation
- [x] No feature toggles during probation

### Authority Conditions

- [x] No mass authority regression
- [x] Owner intervention frequency stable or declining
- [x] No clustering around specific decision blocks

**Failure of any condition resets probation to Day 0. No exceptions.**

---

## Activation Event (One-Way)

Activation requires:

1. Explicit founder sign-off
2. Immutable log entry:
   - Timestamp
   - System version
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

- `violation_type`
- `human_actor`
- `reason_given`
- `invariant_broken`

### Required Outcome

- AutoMode marked `BREACHED`
- Publicly acknowledged internally
- No silent rollback

**Infrastructure dies when violations are hidden.**

---

## AutoMode Completion

At the end of the window:

1. System is audited
2. Telemetry reviewed
3. No retroactive changes allowed

Only then may you choose:

- Renew AutoMode (new 12-month window)
- Or formally exit it

**AutoMode does not auto-renew.**

---

## Founder Rule

> If AutoMode feels scary, it means it's real.  
> If it feels comfortable, you activated it too early.

---

**Document Signature:** Founder Constitution  
**Last Updated:** January 2026

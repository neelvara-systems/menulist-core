# SILENCE POLICY

**Document Type:** Governance  
**Last Updated:** 2026-01-11  
**Status:** 🔒 LOCKED  
**Audience:** All Teams

---

## PURPOSE

This document defines when and why MenuListAi chooses to show nothing.

**Core Principle:**  
Silence is a feature, not a failure.

---

## PHILOSOPHY

### Why Silence Matters

| Reason          | Explanation                          |
| --------------- | ------------------------------------ |
| **Authority**   | Uncertainty undermines trust         |
| **Simplicity**  | Less is easier to act on             |
| **Correctness** | Better to say nothing than say wrong |
| **Calm**        | No urgency if no action needed       |

### The Silence Threshold

```
If confidence < threshold → show nothing
If data insufficient → show nothing
If action not valuable → show nothing
```

---

## WHEN TO BE SILENT

### Campaign Selection

| Condition                    | Action            |
| ---------------------------- | ----------------- |
| No items meet 0.6 confidence | No campaign shown |
| All items skipped today      | Empty Today tab   |
| New store (no data)          | Fallback only     |

### Staff Prompt

| Condition                    | Action                |
| ---------------------------- | --------------------- |
| No item meets 0.8 confidence | Hide section entirely |
| No item has 10-day stability | Hide section entirely |
| Item fails any gate          | Hide section entirely |

### Decision Blocks

| Condition             | Action              |
| --------------------- | ------------------- |
| <3 items meet 0.65    | Hide block entirely |
| Insufficient data     | Hide block entirely |
| All items unavailable | Hide block entirely |

### Digital Screens

| Condition             | Action               |
| --------------------- | -------------------- |
| No campaigns meet 0.7 | Show evergreen only  |
| No evergreen content  | Show brand fallback  |
| No brand content      | Show system fallback |

---

## SILENCE UI PATTERNS

### Today Tab (Empty)

```
┌─────────────────────────────┐
│                             │
│    Nothing to do today.     │
│                             │
│    Check back tomorrow.     │
│                             │
└─────────────────────────────┘
```

### Staff Prompt (Hidden)

```
(Section does not render at all)
```

### Decision Block (Hidden)

```
(Block does not render at all)
```

### Screen (Fallback)

```
┌─────────────────────────────┐
│                             │
│       [Store Logo]          │
│       [Store Name]          │
│                             │
└─────────────────────────────┘
```

---

## WHAT SILENCE IS NOT

### Silence ≠ Error

| Scenario        | Correct Interpretation             |
| --------------- | ---------------------------------- |
| Empty Today     | "Nothing to promote" (intentional) |
| No Staff Prompt | "No item ready" (intentional)      |
| Fallback screen | "No campaigns" (intentional)       |

### Silence ≠ Bug

If a user reports "nothing is showing":

1. Check if this is intentional silence
2. Verify confidence thresholds
3. If thresholds not met → system is working correctly
4. If thresholds met but hidden → investigate bug

---

## COMMUNICATING SILENCE

### To Users

**Approved:**

```
"There's nothing to do today. That's okay!
Check back tomorrow."
```

**Not Approved:**

```
"Sorry, we couldn't find any recommendations.
This might be because you don't have enough data yet."
```

### To Support

**Approved:**

```
"User's store doesn't have items meeting threshold.
This is expected behavior."
```

**Not Approved:**

```
"The AI couldn't generate recommendations.
Let me escalate to engineering."
```

---

## SILENCE LOGGING

### What Gets Logged

| Event                            | Logged        |
| -------------------------------- | ------------- |
| Silence due to low confidence    | ✅ (internal) |
| Silence due to insufficient data | ✅ (internal) |
| Silence due to all items skipped | ✅ (internal) |

### What Is NOT Exposed

| Data                  | Exposed  |
| --------------------- | -------- |
| Confidence scores     | ❌ Never |
| Threshold comparisons | ❌ Never |
| Silence reason        | ❌ Never |

---

## SILENCE DURATION LIMITS

### Maximum Silence Periods

| Surface         | Max Days   | Fallback                |
| --------------- | ---------- | ----------------------- |
| Today tab       | 7 days     | Menu Highlight campaign |
| Staff Prompt    | Indefinite | (None—stays hidden)     |
| Decision Blocks | Indefinite | (None—stays hidden)     |
| Screens         | 0 days     | Always has fallback     |

### Menu Highlight (Fallback Campaign)

After 7 consecutive empty days:

- System generates "Menu Highlight" campaign
- Selects any available item
- Minimum viable action

---

## ANTI-PATTERNS

### Do NOT Do This

| Pattern                         | Why It's Wrong            |
| ------------------------------- | ------------------------- |
| Show low-confidence items       | Erodes trust              |
| Explain why empty               | Invites questions         |
| Suggest "add more data"         | Owner's job, not system's |
| Show metrics to explain silence | Undermines authority      |
| Apologize for empty state       | Silence is intentional    |

---

## ENFORCEMENT

This policy is enforced through:

1. **Code review** — Empty states follow pattern
2. **QA testing** — Silence scenarios verified
3. **Support training** — Silence scripts memorized
4. **Governance review** — Quarterly audit

---

_Document Status: 🔒 LOCKED_

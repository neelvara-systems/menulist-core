# Feature Rejection Gate — Decision Framework

**Created:** January 11, 2026  
**Status:** 🔒 **LOCKED — APPLY TO EVERY FEATURE**  
**Authority:** Founder Only  
**Audience:** Product, Engineering, Everyone

---

## The Core Rule

> **"If a feature requires explanation to justify its existence, it is rejected."**

This is not a guideline. This is a gate.

---

## Why This Exists

As MenuListAi succeeds, three forces will try to kill it:

1. **Customer requests** — "Can you just add..."
2. **Team ideas** — "What if we also..."
3. **Competitor fear** — "They have X, we need..."

Every feature that passes creates:

- More code to maintain
- More edge cases to handle
- More UI to explain
- More decisions for owners
- More ways to break trust

**The default answer is NO.**

---

## The Gate: 5 Questions

Every feature must pass ALL 5 questions. Not 4. Not "mostly."

### Question 1: Does It Remove a Decision?

```
✅ PASS: Owner used to decide X. Now they don't.
❌ FAIL: Owner now has a new option to consider.
```

**Example:**

- ✅ "Auto-refresh screen" — removes manual refresh
- ❌ "Choose refresh interval" — adds decision

### Question 2: Would Anyone Notice If We Didn't Build It?

```
✅ PASS: Customers/owners would complain about absence
❌ FAIL: Only the team thinks it's important
```

**Example:**

- ✅ "Screen goes blank sometimes" — owners notice
- ❌ "Add analytics export" — nobody asked

### Question 3: Does It Strengthen the Core Moment?

The core moment is: **Customer decides faster.**

```
✅ PASS: Directly helps customer decide
❌ FAIL: Helps owner manage/analyze/control
```

**Example:**

- ✅ "Better Decision Block copy" — helps customer
- ❌ "Campaign performance dashboard" — helps owner obsess

### Question 4: Can We Explain It in One Sentence Without "And"?

```
✅ PASS: "Shows the most chosen item."
❌ FAIL: "Shows the most chosen item AND lets you edit it AND tracks clicks."
```

If you need "and" to explain it, it's two features. Kill one.

### Question 5: Will This Still Matter in 3 Years?

```
✅ PASS: Fundamental to how customers decide
❌ FAIL: Trend, competitor response, or optimization
```

**Example:**

- ✅ "Offline screen support" — always needed
- ❌ "TikTok-style video menus" — trend chasing

---

## The Process

### Step 1: Feature Request Arrives

Source can be:

- Customer request
- Team idea
- Founder brainstorm
- Competitor analysis

**All sources are treated equally.** No shortcuts.

### Step 2: Apply the 5 Questions

Document answers. Be honest.

| Question                    | Answer | Pass/Fail |
| --------------------------- | ------ | --------- |
| Removes decision?           |        |           |
| Would notice absence?       |        |           |
| Strengthens core moment?    |        |           |
| One sentence without "and"? |        |           |
| Still matters in 3 years?   |        |           |

### Step 3: Calculate Result

- **5/5 PASS** → Proceed to founder review
- **4/5 or below** → **REJECTED** (no appeal)

### Step 4: Founder Review (Only for 5/5)

Founder asks one final question:

> "If we build this and it succeeds, will we regret it in 2 years?"

If YES → Rejected  
If NO → Approved

---

## Pre-Rejected Features (Never Ask Again)

These features have been permanently rejected. Do not re-propose.

| Feature                             | Rejection Reason          |
| ----------------------------------- | ------------------------- |
| Analytics dashboard expansion       | Creates owner obsession   |
| A/B testing for recommendations     | Introduces uncertainty    |
| Scheduled campaigns                 | Creates management burden |
| Staff app/notifications             | Creates surveillance      |
| Custom recommendation templates     | Breaks consistency        |
| API for third parties               | Premature complexity      |
| White-label mode                    | Dilutes brand             |
| Gamification/points                 | Wrong product category    |
| Loyalty system                      | Wrong product category    |
| POS integration                     | We're not a connector     |
| CRM integration                     | We're not a connector     |
| Multi-location management UI        | Premature                 |
| "Why this recommendation" explainer | Kills authority           |
| Manual scoring adjustment           | Dual authority            |
| Campaign playlist control           | Owner micromanagement     |
| Staff compliance tracking           | Surveillance              |
| Recommendation history log          | Audit mindset             |
| "Disagree" button                   | Invites conflict          |

**If someone proposes these, point them to this document.**

---

## How Features Sneak In (And How to Stop Them)

### Sneaky Pattern 1: "Just a Small Toggle"

> "Can we just add a toggle to enable/disable X?"

**Response:** Every toggle is a decision. Decisions are the enemy.

### Sneaky Pattern 2: "Customers Are Asking"

> "Three customers asked for this feature."

**Response:** Three customers is not a pattern. Pain is a pattern.

### Sneaky Pattern 3: "Competitor Has It"

> "Zomato/DotPe/Petpooja added this."

**Response:** We don't compete on features. We compete on confidence.

### Sneaky Pattern 4: "It's Just for Power Users"

> "Most owners won't see it, but power users need it."

**Response:** Power users are the most dangerous. They'll expect more.

### Sneaky Pattern 5: "It's Already Half Built"

> "We already have the backend, just need UI."

**Response:** Sunk cost is not a reason. Kill it anyway.

### Sneaky Pattern 6: "Founder Mentioned It Once"

> "Danny said in a call that this might be useful."

**Response:** Founder brainstorms are not approvals. Follow the gate.

---

## Emergency Override (Extremely Rare)

Only the founder can override a rejection. Override requires:

1. Written justification (why the gate is wrong in this case)
2. 48-hour cooling period
3. Second review after cooling period
4. Public announcement to team with reasoning

**If override becomes common, the gate is failing.**

---

## Tracking

### Monthly Review

Track:

- Features proposed
- Features rejected (and why)
- Features approved
- Override uses

### Warning Signs

| Signal                             | Meaning                   |
| ---------------------------------- | ------------------------- |
| More than 2 approvals/month        | Building too much         |
| Override used more than 1x/quarter | Gate being ignored        |
| Same feature proposed 3x           | Need clearer rejection    |
| Rejections feel hard               | Gate is working correctly |

---

## Quick Reference: The One Question

If you only remember one thing:

> **"Would we be embarrassed to explain why this exists in 3 years?"**

If yes → Reject  
If no → Maybe (proceed to full gate)

---

## Document Governance

### Who Can Modify

- Founder only
- Changes require 48-hour review
- Additions to "Pre-Rejected" list require documentation

### Review Schedule

- Monthly: Review rejection log
- Quarterly: Review pre-rejected list
- Annually: Full framework audit

---

**Document Status:** Enforced immediately  
**Last Updated:** January 11, 2026  
**Next Review:** April 2026

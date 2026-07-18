# MenuList Language Governance

**Version:** 2.1
**Status:** 🔒 LOCKED — TRUTH-FIRST INTERPRETATION
**Applies To:** UI, Support, Sales, Marketing, Docs, Emails, All Teams

---

## Core Rule

> **If a sentence causes the owner to think for more than 2 seconds, it's wrong.**

This is not marketing advice — this is **cognitive governance**.  
If UI, support, docs, emails, or sales violate this, **supervision re-enters**.

## Truth and Safety Precedence

Calm language must never hide a required owner action, payment consequence, public-content approval, security issue, legal condition, or real system limitation.

- Runtime and codebase truth outrank a preferred phrase.
- Say **review**, **check**, or **confirm** when an owner must approve public truth, correct an exception, understand a charge, or complete a security/legal step.
- Do not invite routine monitoring after setup. Normal operation should stay quiet.
- Product names such as **AI Menu Manager** are allowed. Generic hype such as **AI-powered**, “revolutionary,” or unsupported intelligence claims remains forbidden.
- If a failure needs owner action, name the action plainly. Never say “No action required” when action is required.

---

## ❌ FORBIDDEN Words/Phrases

### Category 1: Shifts Responsibility Back to Owner

**NEVER:** "You should…", "You may want to…", "Consider changing…", "We recommend…", "It's up to you…"  
**USE:** "This is handled.", "This runs automatically."

### Category 2: Frames MenuList as Assistant

**NEVER:** "Helps you…", "Assists with…", "Supports your decisions", "Gives you insights", "Recommends items"  
**USE:** "Manages", "Runs", "Determines", "Handles", "Executes"

### Category 3: Explains or Justifies Decisions

**NEVER:** "Because…", "Based on…", "Here's why…", "The AI noticed…", "According to data…"  
**USE:** "This is active.", "This is paused.", "No change today." (or nothing)

### Category 4: Emphasizes Intelligence/Cleverness

**NEVER:** "Smart", "Intelligent", "AI-powered" (post-onboarding), "Advanced", "Optimized", "Dynamic", "Adaptive"  
**USE:** "Stable", "Consistent", "Automatic", "Quiet", "Routine"

### Category 5: Highlights Change or Activity

**NEVER:** "Today we changed…", "New update", "Improved performance", "Fresh insights", "We adjusted…"  
**USE:** "No action today.", "Everything is running normally.", or silence

### Category 6: Invites Routine Monitoring

**NEVER:** "Check this every day", "Keep monitoring", "Keep an eye on it", or language that makes the owner supervise normal operation.
**USE:** Nothing or "No attention needed" during normal operation. Use "Review before publishing", "Confirm this charge", or "Check this exception" when the action is genuinely required.

### Category 7: Associates MenuList With Business Outcomes

**NEVER:** "Your sales increased", "Revenue impact", "Conversion improved", "Performance metrics", "Growth"  
**USE:** "Menu is stable.", "Menu is functioning normally.", "Menu state unchanged."

### Category 8: Vague Failure Language

**NEVER:** “Something went wrong” without a safe next step, false reassurance, or technical leakage.
**USE:** "Temporarily unavailable. Try again." or "The previous version remains live. Review the highlighted item." Match the message to real runtime behavior.

### Category 9: Unnecessary Configuration Language

**NEVER:** "Tweak", "Fine-tune", "Full control", or configuration language that adds decisions without owner value.
**USE:** "Automatic", "Handled", or "Default behavior" when true. Use "Choose", "Edit", or "Approve" for real owner-authority steps.

### Category 10: Emotional Excitement

**NEVER:** "Excited", "Amazing", "Game-changing", "Revolutionary", "Love this"  
**USE:** Neutral, flat, calm, almost boring

---

## ✅ CANONICAL Phrases (Hard-Code These)

Use these everywhere:

- "No action needed."
- "Everything is running normally."
- "Menu state is stable."
- "Handled automatically."
- "No change today."
- "This is set."
- "MenuList runs your menu."
- "You don't need to manage this."
- "Nothing to configure."

---

## Sales Language Rules

### ❌ Sales Must NEVER Say

| Forbidden              | Why It Destroys Trust  |
| ---------------------- | ---------------------- |
| "MenuList analyzes…"   | Invites scrutiny       |
| "Our AI decides…"      | Makes AI the subject   |
| "Based on data…"       | Data can be questioned |
| "Optimized for…"       | Invites "for what?"    |
| "Improves conversion…" | Unverifiable           |
| "Increases sales…"     | Unverifiable           |
| "Best performing…"     | Invites comparison     |

### ✅ Sales IS Allowed to Say

| Approved                         | Why It Works             |
| -------------------------------- | ------------------------ |
| "MenuList runs your menu."       | Operational certainty    |
| "This updates automatically."    | No action required       |
| "You don't need to manage this." | Removes cognitive load   |
| "Nothing to configure."          | Zero decisions           |
| "If it's shown, it's safe."      | Trust in public surfaces |

### Approved One-Line Pitch

> **"MenuList keeps one owner-approved customer list connected to the public links and assets your business uses."**

Nothing else.

---

## Support Response Rules

### ❌ Support Must NEVER:

- Invent a reason, confidence level, provider result, or customer outcome
- Expose sensitive internal signals, secrets, or another tenant's data
- Shift responsibility to the owner for a failure they could not prevent
- Hide a known limitation or required correction behind reassurance

When an owner asks “why,” explain the confirmed public input or supported rule in plain language when that helps correction. Do not speculate about model reasoning.

### ✅ Support IS Allowed To:

- Confirm whether something is working
- Fix broken behavior
- Remove incorrect public content
- Escalate confidence breaches
- Acknowledge limitations calmly

### Support Response Templates

**"Why did MenuList show this item?"**

> "MenuList only shows items it's confident are appropriate at that time. If something looks incorrect, we'll fix it."

**"How does this decide?"**

> "MenuList runs automatically based on live menu conditions. It doesn't require configuration."

**"I don't agree with this decision."**

> "You can skip or override it. The system will adjust automatically."

**"Can I control this more?"**

> "MenuList is designed to reduce management, not add it."

**"Is this AI?"**

> "MenuList runs automatically. You don't need to manage it."

(Do NOT confirm or deny "AI" — it invites debate.)

---

## Enforcement Scope

This applies to:

- UI text
- Empty states
- Tooltips
- Support replies
- Marketing pages (post-onboarding)
- Emails
- Error states
- Logs that might surface
- Sales demos
- Onboarding scripts

The truth and safety precedence above is part of this enforcement scope.

---

## Internal Rule (Most Important)

> **If an owner must supervise normal operation, MenuList is not working.**

Silence is the feature.  
Calm is the interface.  
Removal of routine responsibility is the product. Approval, correction, billing, legal, and security steps remain explicit.

---

**Document Signature:** Founder Constitution  
**Last Updated:** July 18, 2026

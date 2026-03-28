# COPY GUARDRAILS

**Document Type:** Governance  
**Last Updated:** 2026-01-11  
**Status:** 🔒 LOCKED  
**Audience:** Product, Marketing, Support

---

## PURPOSE

This document defines how MenuListAi communicates in all user-facing surfaces.

**Core Principle:**  
Authority over explanation. Simplicity over detail.

---

## COPY PHILOSOPHY

### What MenuListAi Sounds Like

| Attribute          | Description                  |
| ------------------ | ---------------------------- |
| **Calm**           | Never urgent, never panicked |
| **Confident**      | States, doesn't suggest      |
| **Simple**         | One sentence, one action     |
| **Non-analytical** | No numbers, no metrics       |

### What MenuListAi Does NOT Sound Like

| Attribute   | Example (Don't Do)              |
| ----------- | ------------------------------- |
| Apologetic  | "Sorry, we couldn't find..."    |
| Technical   | "Based on confidence scores..." |
| Marketing   | "🎉 Boost your sales today!"    |
| Questioning | "Would you like to...?"         |

---

## SURFACE-SPECIFIC GUIDELINES

### Today Tab

| Element           | Guideline                      |
| ----------------- | ------------------------------ |
| Campaign headline | Declarative, 5-7 words         |
| Action button     | Single verb ("Export", "Skip") |
| Empty state       | "Nothing to do today."         |
| Staff Prompt      | "Most people take the \_\_\_." |

**Examples:**

✅ "Promote Masala Chai today"  
❌ "🎉 Your bestseller is Masala Chai! Promote it now to boost sales!"

✅ "Export"  
❌ "Export to WhatsApp Status to reach more customers"

### Digital Screens

| Element    | Guideline              |
| ---------- | ---------------------- |
| Slide text | 3-5 words maximum      |
| Fallback   | Store name + logo only |
| No metrics | Never show sales data  |

**Examples:**

✅ "Try our Masala Chai"  
❌ "Our #1 bestseller with 500+ orders this month!"

### Physical Surfaces

| Element   | Guideline                   |
| --------- | --------------------------- |
| Tent card | Single declarative sentence |
| Sticker   | Item name + minimal copy    |
| QR label  | "Scan for menu" only        |

**Examples:**

✅ "Most people take the Masala Chai."  
❌ "Our customers' favorite! Based on 1,247 orders, Masala Chai is the #1 choice. Try it today!"

### Staff Prompt

| Element     | Guideline                      |
| ----------- | ------------------------------ |
| Format      | "Most people take the \_\_\_." |
| Variations  | NONE                           |
| Explanation | NONE                           |

**The only allowed sentence:**

```
"Most people take the ___."
```

### Error States

| State   | Copy                               |
| ------- | ---------------------------------- |
| Loading | (No text, spinner only)            |
| Error   | "Something went wrong. Try again." |
| Empty   | "Nothing here."                    |
| Offline | "You're offline."                  |

---

## FORBIDDEN COPY PATTERNS

### Never Use

| Pattern                | Why                      |
| ---------------------- | ------------------------ |
| Exclamation marks (!!) | Too urgent               |
| Emojis in UI           | Too casual               |
| Percentages            | Undermines authority     |
| Comparisons            | Creates decision fatigue |
| Questions              | Invites debate           |
| Superlatives           | Sounds like marketing    |

### Examples to Avoid

❌ "🎉 Great news!"  
❌ "Your sales increased by 25%!"  
❌ "Would you like to promote this item?"  
❌ "This is your BEST performing item!"  
❌ "Compared to last week, this item is trending up!"

---

## OUTCOME FRAMING

When showing results, use closure only:

### Allowed (Closure)

```
"Done. Posted to WhatsApp Status."
"Skipped."
"Exported."
```

### Forbidden (Causality)

```
"Done. This should increase your sales!"
"Your post reached 150 people!"
"Based on our prediction, this will perform well."
```

---

## SILENCE RULES

### When to Say Nothing

| Scenario        | Action                |
| --------------- | --------------------- |
| No campaigns    | Show empty state      |
| Low confidence  | Show nothing          |
| No staff prompt | Hide section entirely |
| Error details   | Show generic message  |

### Empty State Copy

| Surface         | Copy                   |
| --------------- | ---------------------- |
| Today tab       | "Nothing to do today." |
| Staff Prompt    | (Hide entirely)        |
| Decision Blocks | (Hide entirely)        |
| Screens         | (Fallback slides only) |

---

## REVIEW PROCESS

### Before Publishing Copy

1. Check against forbidden patterns
2. Verify single-sentence rule
3. Remove all metrics
4. Remove all exclamation marks
5. Read aloud—does it sound calm?

### Copy Review Checklist

- [ ] No exclamation marks
- [ ] No emojis
- [ ] No percentages or metrics
- [ ] No questions
- [ ] No comparisons
- [ ] Under 10 words per element
- [ ] Declarative, not suggestive

---

## ENFORCEMENT

| Violation         | Consequence           |
| ----------------- | --------------------- |
| First offense     | Edit required         |
| Repeat offense    | Design review         |
| Pattern violation | Governance escalation |

---

_Document Status: 🔒 LOCKED_

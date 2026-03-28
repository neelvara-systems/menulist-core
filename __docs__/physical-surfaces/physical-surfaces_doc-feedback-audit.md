# 📝 DOC FEEDBACK AUDIT - Physical Surfaces (DOCS ONLY)

**Created:** January 11, 2026  
**Mode:** Documentation validation only — NO CODE CHANGES

---

## Summary

| Metric       | Count |
| ------------ | ----- |
| Total Points | 6     |
| Accepted     | 5     |
| Rejected     | 1     |
| Clarify      | 0     |

---

## Audit Table

| #   | ChatGPT Comment                                                | Valid? | Current Doc Evidence                              | Action                                                            | Target Doc       |
| --- | -------------------------------------------------------------- | ------ | ------------------------------------------------- | ----------------------------------------------------------------- | ---------------- |
| 1   | Tent Card confidence 0.6 too low → should be 0.7               | ✅     | spec.md:106 says 0.6, impl.md:111 says 0.6        | **Accept** — Printed = public + persistent, higher gate justified | spec.md, impl.md |
| 2   | Owner size selection (A6/A5) is a leak → system should decide  | ✅     | impl.md:472-480 shows Radio.Group for size        | **Accept** — Aligns with "zero options" philosophy                | spec.md, impl.md |
| 3   | Template 5 as default is too exploratory                       | ✅     | impl.md:173 defaults to template 5                | **Accept** — Printed surfaces need stronger authority             | spec.md, impl.md |
| 4   | Success metrics mentioning "scans" is dangerous                | ✅     | spec.md:301 says "Customers scan 10% of walk-ins" | **Accept** — Contradicts "no analytics" philosophy                | spec.md          |
| 5   | validUntil = 1 day for tent cards too short → should be 7 days | ✅     | impl.md:140 shows `getValidUntil(1)`              | **Accept** — Printed cards are persistent                         | impl.md          |
| 6   | Ship Counter Sticker 1-2 weeks after Tent Card                 | ❌     | N/A                                               | **Reject** — 3-year freeze rule: ships complete, not phased       | None             |

---

## Analysis

### ✅ Point 1: Confidence Thresholds

**ChatGPT's Argument:**

- Tent Card seen by every customer, stays visible for days/weeks
- 0.6 acceptable for screens/Today, but printed = higher stakes

**Current State:**

- spec.md:106: "Same as campaigns: ≥ 0.6"
- impl.md:111: `TENT_CARD_THRESHOLD = 0.6`

**Decision:** ACCEPT

- Increase Tent Card threshold to **0.7**
- Counter Sticker already at 0.75 (spec.md:143), increase to **0.8**

---

### ✅ Point 2: Size Selection Leak

**ChatGPT's Argument:**

- Radio buttons for A6/A5 create micro-decision
- "Which is better?" thinking = hesitation
- System should decide

**Current State:**

- impl.md:472-480: Radio.Group with A6/A5 buttons
- spec.md:97: Shows "Size: A6 / A5" as options

**Decision:** ACCEPT

- Remove size selection from docs
- System decides: Tables → A6, Counters → A5

---

### ✅ Point 3: Template Selection

**ChatGPT's Argument:**

- Template 5 ("Customers often try this first") is exploratory
- Printed surfaces must remove doubt, not invite it
- Lock defaults harder

**Current State:**

- impl.md:173: `default: return 5; // "Customers often try..."`

**Decision:** ACCEPT

- Tent Cards: Bestseller/Meal Push → Template 1 only
- Default for unknowns → Template 1 (authoritative), not Template 5

---

### ✅ Point 4: Success Metrics (Scans)

**ChatGPT's Argument:**

- Mentioning "10% scan rate" creates internal pressure to track/optimize
- Team/sales will want to show it, owners will demand it
- Printed surfaces should have NO success metrics

**Current State:**

- spec.md:301: "Customers scan | 10% of walk-ins | QR analytics (menu page views)"

**Decision:** ACCEPT

- Remove scan metrics entirely
- Success = "Owner printed once, never asked to change it"

---

### ✅ Point 5: validUntil Duration

**ChatGPT's Argument:**

- Printed cards don't expire daily
- Tent Card should be 7 days, Counter Sticker 30 days

**Current State:**

- impl.md:140: `validUntil: getValidUntil(1), // 1 day`
- impl.md:158: `validUntil: getValidUntil(7), // 7 days`

**Decision:** ACCEPT

- Update docs: Tent Card = 7 days, Counter Sticker = 30 days

---

### ❌ Point 6: Phased Rollout (REJECTED)

**ChatGPT's Argument:**

- Ship Counter Sticker 1-2 weeks after Tent Card
- Observe confidence stability first

**Decision:** REJECT

- **Reason:** Violates 3-Year Architecture Freeze Rule
- Both surfaces ship complete at launch
- Feature flags can control visibility, but architecture is complete

---

## 🎯 DOC UPDATE PLAN

### spec.md Updates

| Section       | Change                                                        |
| ------------- | ------------------------------------------------------------- |
| Line 106      | Change confidence gate from 0.6 to **0.7**                    |
| Line 97-98    | Remove size selection, add "Size: System-selected"            |
| Lines 143     | Change counter sticker threshold from 0.75 to **0.8**         |
| Lines 294-302 | Replace success metrics table with authority-based definition |

### impl.md Updates

| Section       | Change                                                            |
| ------------- | ----------------------------------------------------------------- |
| Line 17       | Change tent card threshold from 0.6 to **0.7**                    |
| Line 18       | Change sticker threshold from 0.75 to **0.8**                     |
| Lines 165-174 | Update template selection to default to 1, not 5                  |
| Line 140      | Update validUntil comment: 7 days, not 1 day                      |
| Lines 437-480 | Remove size selection Radio.Group, document system-decided sizing |

### marketing.md Updates

| Section | Change                                                        |
| ------- | ------------------------------------------------------------- |
| None    | No changes needed — already aligned with authority philosophy |

---

**Audit Complete:** Ready for Stage 2 (Doc Updates)

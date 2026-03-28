**Prerequisite:** Read `00-master-production-audit-governance.md` first.

---

# PHASE 7 — NON-TECH SMB OWNER UX & USABILITY AUDIT

**MenuList Production Readiness**

Execute strictly under Master Production Audit Governance.

This phase evaluates the system from the perspective of:
**A busy, non-technical SMB owner using MenuList alone.**

Not a developer.
Not a tech founder.
A real restaurant/cafe/salon owner with zero patience.

If they feel confused → they stop using product.
If they lose confidence → churn.
If they make mistakes → support burden.

You must audit like:
**A first-time SMB owner using MenuList under time pressure.**

---

# PRIMARY OBJECTIVE

Ensure MenuList is:

- Obvious to use
- Calm and simple
- Impossible to misuse
- Hard to break
- Confidence-building
- Low cognitive load
- Forgiving to mistakes

Owner should feel:
**“This just makes sense.”**

Not:
“Where do I click?”

---

# PART 1 — FIRST-TIME OWNER ONBOARDING FLOW

Simulate brand new owner:

No prior context.
No guidance.
No developer help.

Test:

1. Signup
2. First login
3. Create first store
4. Add first menu
5. Add items
6. Generate descriptions/images
7. Publish menu
8. View live menu

Check:

- Confusion points?
- Decision overload?
- Missing guidance?
- Too many steps?
- Unclear terminology?
- Any anxiety moments?
- Any “what now?” moments?

Owner must reach live menu smoothly.

---

# PART 2 — MENU CREATION & EDITING SIMPLICITY

Simulate real usage:

Owner adding/editing menu.

Check:

- Add item clarity
- Edit item clarity
- Category management clarity
- Price editing clarity
- Availability toggles
- Image generation flow
- Description generation flow
- Multi-language clarity

Look for:

- Cognitive overload
- Too many decisions
- Hidden actions
- Confusing labels
- Misclick risk
- Fear of breaking something

Owner should feel safe editing anytime.

---

# PART 3 — MISTAKE RECOVERY & CONFIDENCE

Simulate mistakes:

- Wrong price entered
- Wrong image generated
- Wrong description
- Deleted item accidentally
- Edited wrong outlet
- Changed something unknowingly

Check:

- Can owner recover easily?
- Undo possible?
- Confirmation present?
- Safe editing feeling?
- Fear of breaking live menu?

Product must feel:
**Safe to experiment**

---

# PART 4 — TERMINOLOGY & LANGUAGE CLARITY

Audit all visible text:

- Buttons
- Labels
- Messages
- Empty states
- Errors
- Tooltips
- Settings
- Toggles

Check:

- Any technical wording?
- Any internal jargon?
- Any confusing labels?
- Any developer-centric terms?
- Any unclear action wording?

Everything must be:
**SMB language, not SaaS language**

---

# PART 5 — COGNITIVE LOAD TEST

Measure mental effort required.

Check:

- Too many choices?
- Too many options per screen?
- Too many modals?
- Too much reading?
- Too many steps to publish?
- Any decision fatigue?
- Any unclear hierarchy?

Owner should feel:
**Calm control, not dashboard stress**

---

# PART 6 — ERROR MESSAGE & FEEDBACK QUALITY

Test all error/feedback states:

- AI failure
- Image failure
- Save failure
- Network issue
- Invalid input
- Empty state
- Success states

Check:

- Clear message?
- Blame-free language?
- Helpful next step?
- Or confusing technical error?

Error messaging defines trust.

---

# PART 7 — MOBILE OWNER EXPERIENCE

Simulate owner using phone only.

Test:

- Edit menu from mobile
- Add item from mobile
- Upload/generate image
- Toggle availability
- Publish menu
- View dashboard

Check:

- Too cramped?
- Hard to tap?
- Hidden actions?
- Confusing scroll?
- Broken layout?

Many SMBs will use only phone.

---

# PART 8 — SPEED & FEEL PERCEPTION

Owner perception matters more than actual speed.

Check:

- Does system feel fast?
- Any awkward delays?
- Any confusing loaders?
- Any “did it save?” doubt?
- Any frozen moment?
- Any double-click confusion?

Owner must feel:
**Confident system responded**

---

# PART 8B — LANGUAGE GOVERNANCE COMPLIANCE

MenuList follows strict language governance (infrastructure positioning).

Audit ALL visible text against these rules:

Forbidden patterns:

- "You should..." / "Consider..." (shifts responsibility)
- "Helps you..." / "Assists with..." (assistant framing)
- "Smart" / "AI-powered" / "Optimized" (intelligence emphasis)
- "New update!" / "Improved!" (highlights change)
- "Sorry for the inconvenience" (apologies)
- "You're in control" / "Customize" (empowerment)
- "Amazing!" / "Game-changing!" (excitement)

Required patterns:

- "No action needed."
- "Everything is running normally."
- "Handled automatically."
- "This is set."

Check: buttons, tooltips, errors, empty states, success messages,
onboarding text, settings labels, notification text.

Infrastructure language = trust. Assistant language = doubt.

Reference: `__docs__/5YEAR-VISION-2026-COMPLETE.md` (Language Governance appendix)

---

# PART 9 — TRUST & CONTROL PERCEPTION

Evaluate emotional experience:

Does owner feel:

- In control?
- Safe?
- Calm?
- Smart using it?
- Confident menu is correct?

Or:

- Nervous to edit?
- Afraid to publish?
- Unsure what happened?
- Dependent on developer?

This decides retention.

---

# PART 10 — DELIVERABLES

Create:

## `phase-07-smb-ux-audit-report.md`

Include:

### 1. FIRST-TIME OWNER EXPERIENCE

Smooth or confusing?

### 2. EDITING & MANAGEMENT UX

Safe and simple?

### 3. CONFUSION POINTS

Where owners may get stuck.

### 4. TERMINOLOGY ISSUES

Non-SMB-friendly language.

### 5. COGNITIVE LOAD RISKS

Too complex areas.

### 6. ERROR & FEEDBACK QUALITY

Trust-building or confusing?

### 7. MOBILE OWNER EXPERIENCE

Usable or frustrating?

### 8. TRUST & CONTROL SCORE

Does owner feel confident?

### 9. MUST-FIX BEFORE LAUNCH

Critical UX risks.

### 10. PHASE VERDICT

Answer brutally:

If a non-tech restaurant owner uses this alone:

- Will they succeed?
- Where will they get confused?
- Where might they churn?
- Confidence score /10?

---

# EXECUTION MODE

Think like:
Busy restaurant owner
5 minutes patience
No tech knowledge

If they hesitate or feel unsure:
That is a product failure.

Return Phase 7 report only.

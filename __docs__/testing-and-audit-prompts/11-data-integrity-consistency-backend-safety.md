**Prerequisite:** Read `00-master-production-audit-governance.md` first.

---

# PHASE 11 — DATA INTEGRITY, CONSISTENCY & BACKEND SAFETY AUDIT

**MenuList Production Readiness**

Execute strictly under Master Production Audit Governance.

This phase verifies the most critical production truth:

**Can MenuList ever corrupt, lose, mismatch, or damage customer data?**

If even one restaurant loses menu data or shows wrong pricing →
trust is permanently damaged.

This phase is about:
**Data correctness, durability, and long-term integrity.**

You must audit like:
**You are responsible if a paying SMB loses their menu data.**

---

# PRIMARY OBJECTIVE

Guarantee that MenuList data is:

- Accurate
- Durable
- Consistent across surfaces
- Impossible to corrupt
- Safe during edits
- Safe during concurrency
- Safe during failures
- Safe across time

System must maintain:
**Single source of truth integrity**

at all times.

---

# PART 1 — MENU DATA INTEGRITY CORE TEST

Verify menu data consistency across:

- Editor view
- Public menu
- Digital screens
- Multi-language
- PDF (if exists)
- Cached versions
- Firestore storage

Check:

- Any mismatch between surfaces?
- Price mismatch?
- Description mismatch?
- Language mismatch?
- Image mismatch?
- Missing items?
- Duplicate items?

Menu must always be consistent everywhere.

---

# PART 2 — SAVE & UPDATE SAFETY

Audit save mechanisms:

When owner edits:

- Item name
- Price
- Description
- Image
- Availability
- Category
- Language

Check:

- Partial save risk?
- Failed save overwriting correct data?
- Concurrent edit overwrite?
- Double-save duplication?
- Old data overwriting new?

Ensure:
Last correct edit always preserved.

---

# PART 3 — PUBLISH & VERSION CONSISTENCY

Verify publish behavior:

- Publish updates everywhere?
- Public menu updated instantly?
- Screens updated correctly?
- No old data shown?
- No partial publish?
- No mixed-version display?

Check:
Version mismatch risk across surfaces.

---

# PART 4 — MULTI-OUTLET DATA SAFETY

Test:

Master store → outlet inheritance
Outlet override logic

Verify:

- Master update doesn't destroy outlet override
- Outlet override doesn't corrupt master
- Price override safe
- Availability override safe
- Category visibility safe
- Sync safe across updates

Multi-outlet errors can corrupt entire chains.

---

# PART 5 — AI DATA WRITE SAFETY

Test AI-generated data:

- Description generation save
- Image generation save
- Translation save
- Regeneration overwrite logic
- Manual edit after AI
- AI after manual edit

Check:

- AI overwriting manual edits incorrectly?
- Partial AI output saved?
- Mixed language issues?
- Image mismatch?
- Description mismatch?

AI must never corrupt real menu data.

---

# PART 6 — DELETE & RECOVERY SAFETY

Test:

- Delete item
- Delete category
- Delete image
- Remove language
- Remove outlet override
- Replace image

Check:

- Accidental delete risk?
- Recovery possible?
- Wrong delete propagation?
- Hidden orphan data?
- Broken references?

Delete must never cause data chaos.

---

# PART 7 — CONCURRENT EDIT & RACE CONDITION TEST

Simulate:

- Same menu edited in 2 tabs
- Same item edited simultaneously
- Rapid updates
- Edit during publish
- Edit during AI generation
- Edit during translation
- Edit while screen active

Check:

- Last-write correctness?
- Conflict resolution?
- Overwrite risk?
- Data duplication?
- Corruption risk?

---

# PART 8 — LONG-TERM DATA CONSISTENCY

Simulate long-term usage:

- Frequent edits over weeks
- Repeated publish cycles
- Multiple AI regenerations
- Image replacements
- Language updates
- Multi-outlet updates

Check:

- Data drift?
- Hidden duplicates?
- Old orphan fields?
- Broken references?
- Inconsistent fields?

System must remain clean after heavy use.

---

# PART 9 — AUDIT LOG & TRACEABILITY

Verify:

- Menu changes logged?
- Price changes traceable?
- AI generation tracked?
- Publish events logged?
- Outlet overrides logged?

If something breaks:
Can we trace what happened?

---

# PART 10 — ZERO-DATA-LOSS PRINCIPLE

System must guarantee:

Never:

- Lose menu data
- Show wrong price
- Show wrong item
- Show blank menu
- Show partial menu
- Corrupt stored data

Test:
All failure scenarios from Phase 9 again
→ observe data integrity.

---

# PART 11 — DELIVERABLES

Create:

## `phase-11-data-integrity-report.md`

Include:

### 1. CORE DATA CONSISTENCY

Menu accuracy across surfaces.

### 2. SAVE & UPDATE SAFETY

Overwrite/partial save risks.

### 3. PUBLISH CONSISTENCY

Version mismatch risks.

### 4. MULTI-OUTLET DATA SAFETY

Inheritance & override safety.

### 5. AI DATA SAFETY

AI corruption risks.

### 6. DELETE & RECOVERY RISKS

Accidental damage risks.

### 7. CONCURRENT EDIT RISKS

Race condition findings.

### 8. LONG-TERM DATA HEALTH

Drift or corruption risk.

### 9. AUDIT LOG READINESS

Traceability strength.

### 10. MUST-FIX BEFORE LAUNCH

Data safety blockers.

### 11. PHASE VERDICT

Answer brutally:

If 1,000 SMBs trust MenuList with menus:

- Can any data corrupt?
- Can wrong price show?
- Any hidden data integrity risk?
- Confidence score /10?

---

# EXECUTION MODE

Data integrity = product trust.

If menu data becomes unreliable:
Product dies immediately.

Be paranoid.
Assume worst-case scenarios.
Verify everything.

Return Phase 11 report only.

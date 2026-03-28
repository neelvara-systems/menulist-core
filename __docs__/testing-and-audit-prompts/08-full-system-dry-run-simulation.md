**Prerequisite:** Read `00-master-production-audit-governance.md` first.

---

# PHASE 8 — FULL SYSTEM DRY RUN & REAL USAGE SIMULATION

**MenuList Production Readiness**

Execute strictly under Master Production Audit Governance.

This phase simulates **real-life usage over time**, not isolated feature testing.

We are testing:
**What actually happens when real SMBs use MenuList daily.**

This phase connects everything:

- Auth
- Menu creation
- AI usage
- Editing
- Publishing
- Screens
- Updates
- Multi-outlet
- Real-world behavior

If system breaks in real workflow → launch risk.

You must audit like:
**You are a real SMB using MenuList for 90 days.**

---

# PRIMARY OBJECTIVE

Simulate complete lifecycle:

From:
New signup → live usage → daily edits → updates → scale usage

Goal:
Find issues that appear only during real usage sequences.

Not single feature tests.
Full system behavior over time.

---

# PART 1 — DAY 0: NEW STORE SETUP SIMULATION

Simulate brand-new SMB:

1. Signup
2. Create store
3. Add store details
4. Create first menu
5. Add categories/items
6. Generate descriptions
7. Generate images
8. Set prices
9. Publish menu
10. Open public menu

Observe:

- Any friction?
- Any break?
- Any confusion?
- Any data inconsistency?
- Any unexpected delay?

---

# PART 2 — DAY 1–7: INITIAL USAGE SIMULATION

Simulate early usage:

Owner:

- Edits menu daily
- Adjusts prices
- Updates availability
- Regenerates descriptions
- Regenerates images
- Uses translation
- Publishes updates
- Checks public menu
- Uses screen display

Check:

- Data consistency
- Save reliability
- Publish reliability
- AI behavior consistency
- Image stability
- Language stability
- Screen sync correctness

---

# PART 3 — DAY 7–30: REALISTIC OPERATION SIMULATION

Simulate ongoing usage:

- Frequent menu edits
- Seasonal changes
- Add/remove items
- Change images
- Multi-language updates
- Screen running daily
- Feedback collection active
- Re-publish multiple times

Check:

- Any data drift?
- Any stale cache?
- Any broken links?
- Any outdated screen data?
- Any performance degradation?
- Any save conflicts?
- Any duplication issues?

---

# PART 4 — MULTI-OUTLET / MASTER STORE SIMULATION

Simulate chain scenario:

- Master store controls menu
- Outlet inherits
- Outlet override allowed areas
- Menu update from master
- Outlet reflects update
- Outlet override preserved?

Check:

- Override safety
- Inheritance consistency
- Data overwrite risk
- Sync reliability
- Permission enforcement

Multi-outlet errors = serious risk.

---

# PART 5 — AI FEATURE REAL USAGE SIMULATION

Simulate realistic AI usage:

- Generate all descriptions
- Regenerate some
- Generate images for many items
- Regenerate images repeatedly
- Multi-language generation
- Translation updates after edit
- Menu re-edit after generation

Check:

- Cost risk patterns
- Duplicate generation risk
- Save reliability
- Partial generation risk
- Mismatch between text/image
- Latency perception
- Any system slowdown

---

# PART 6 — PUBLISH & LIVE UPDATE SIMULATION

Simulate real workflow:

Owner updates menu while customers viewing.

Check:

- Publish timing
- Cache refresh
- Screen update delay
- Public menu update delay
- Any stale content shown?
- Any blank moment?
- Version mismatch risk?

Publishing must feel instant and safe.

---

# PART 7 — STRESS & EDGE USAGE SIMULATION

Simulate:

- Very large menu (300+ items)
- Many images
- Multiple languages
- Frequent edits
- Rapid save actions
- Multiple tabs editing
- Screen open continuously
- Owner editing while screen running

Check:

- Performance degradation
- Save conflicts
- Data corruption risk
- UI slowdowns
- Firebase load patterns

---

# PART 8 — DATA CONSISTENCY OVER TIME

After full simulation:

Verify:

- Menu data integrity intact?
- Any duplicate items?
- Any missing items?
- Any corrupted fields?
- Any language mismatch?
- Any image mismatch?
- Any orphan data?
- Any version mismatch?

System must remain clean after heavy use.

---

# PART 9 — SILENT FAILURE DETECTION

Look for:

- Actions that fail silently
- Partial saves
- Incomplete AI output saved
- Image mismatch
- Translation mismatch
- Cache not updating
- Screen not syncing
- Logs not capturing

Silent failures kill trust.

---

# PART 10 — DELIVERABLES

Create:

## `phase-08-full-system-dry-run-report.md`

Include:

### 1. DAY 0 SETUP RESULT

Smooth or friction?

### 2. REAL USAGE (DAY 1–30)

Stability over time.

### 3. MULTI-OUTLET BEHAVIOR

Consistency & safety.

### 4. AI FEATURE BEHAVIOR

Stable or risky?

### 5. PUBLISH & LIVE UPDATE

Safe & instant?

### 6. STRESS TEST RESULTS

Large usage behavior.

### 7. DATA INTEGRITY RESULT

Clean or drift?

### 8. SILENT FAILURE RISKS

Any unnoticed issues.

### 9. MUST-FIX BEFORE LAUNCH

Critical workflow risks.

### 10. PHASE VERDICT

Answer brutally:

If 500 SMBs actively use daily:

- Will system stay stable?
- Any long-term corruption risk?
- Biggest operational risk?
- Confidence score /10?

---

# EXECUTION MODE

Think like:
Real SMB running business daily.

Not testing features —
testing life of product over time.

System must remain:
Stable
Predictable
Calm
Reliable

Return Phase 8 report only.

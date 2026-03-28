**Prerequisite:** Read `00-master-production-audit-governance.md` first.

---

# PHASE 9 — FAILURE, CHAOS & BREAKPOINT TESTING

**MenuList Production Readiness**

Execute strictly under Master Production Audit Governance.

This phase intentionally tries to **break the system**.

Not normal usage.
Not happy path.

We simulate:

- Failures
- Interruptions
- Network issues
- Partial operations
- Race conditions
- Extreme usage
- Unexpected behavior

Goal:
Find where system collapses, freezes, corrupts data, or behaves unpredictably.

You must audit like:
**You are trying to make MenuList fail in real production.**

---

# PRIMARY OBJECTIVE

Force system into failure conditions and observe:

- Does system recover safely?
- Does it corrupt data?
- Does it freeze?
- Does it confuse user?
- Does it burn cost?
- Does it show blank screens?
- Does it silently break?

Production-grade systems must be **resilient under chaos**.

---

# PART 1 — NETWORK FAILURE SIMULATION

Simulate:

- Network drops during save
- Network drops during AI generation
- Network drops during image generation
- Network drops during publish
- Network drops during translation
- Network drops during screen loading
- Slow network + save action

Check:

- Partial save risk?
- Duplicate writes?
- UI stuck loading?
- Retry behavior?
- Safe recovery?
- Corrupted state?
- Ghost updates?

System must never corrupt data during interruption.

---

# PART 2 — AI FAILURE & TIMEOUT TEST

Force:

- AI timeout
- AI partial response
- AI API failure
- Image generation failure
- Translation failure
- AI returns malformed output

Check:

- Safe fallback?
- Error clarity?
- Partial data saved?
- Broken UI?
- Retry safe?
- Cost loop risk?

AI failure must never break system flow.

---

# PART 3 — FIREBASE FAILURE SIMULATION

Simulate:

- Firestore write fail
- Firestore read delay
- Listener disconnect
- Partial document save
- Permission denied response
- Timeout on fetch

Check:

- UI response?
- Data consistency?
- Retry logic?
- User confusion?
- Silent failure?

System must degrade gracefully.

---

# PART 4 — USER INTERRUPTION TEST

Simulate:

- User closes tab during save
- User refreshes mid-edit
- User refreshes during publish
- User refreshes during AI generation
- Multiple tabs editing same menu
- Back button during edit
- Double-click save/publish

Check:

- Data corruption?
- Duplicate entries?
- Lost edits?
- Partial saves?
- State mismatch?

---

# PART 5 — CONCURRENT ACTION CONFLICT TEST

Simulate:

- Same menu edited in two tabs
- Same item edited quickly multiple times
- Rapid publish clicks
- Rapid image generation clicks
- Rapid translation triggers
- Rapid availability toggles

Check:

- Last-write safety?
- Conflict resolution?
- Overwrite risk?
- Duplicate generation?
- System slowdown?

---

# PART 6 — EXTREME DATA SCENARIOS

Test:

- Very large menu (500+ items)
- Very long descriptions
- Many images
- Multi-language heavy menu
- Large category counts
- Rapid updates on large menu

Check:

- Performance collapse?
- Save delays?
- Publish delays?
- Screen sync delays?
- Data corruption?

---

# PART 7 — BACKGROUND PROCESS CHAOS

Simulate:

- Multiple AI tasks running
- Menu editing during AI run
- Publish during generation
- Screen active during update
- Translation during edit
- Rapid sequential operations

Check:

- Queue conflicts?
- Overwrites?
- Partial saves?
- Cost spikes?
- UI confusion?

---

# PART 8 — CACHE & SYNC FAILURE TEST

Test:

- Publish but cache not updated
- Screen using stale data
- Public menu outdated
- Translation cache mismatch
- Image cache mismatch

Check:

- Version mismatch?
- Old data shown?
- Refresh recovery?
- Any blank state?

---

# PART 9 — ZERO-FAIL PRINCIPLE UNDER CHAOS

Verify system NEVER shows:

- Blank screen
- Frozen UI
- Infinite loader
- Broken layout
- Corrupt menu
- Missing menu
- Raw errors
- Duplicate menu items

Even under chaos:
System must degrade safely.

---

# PART 10 — DELIVERABLES

Create:

## `phase-09-failure-chaos-report.md`

Include:

### 1. NETWORK FAILURE RESULTS

Safe or risky?

### 2. AI FAILURE RESULTS

System behavior under AI failure.

### 3. FIREBASE FAILURE RESULTS

Graceful or dangerous?

### 4. USER INTERRUPTION RESULTS

Data safety verified?

### 5. CONCURRENT ACTION RISKS

Overwrite/duplication risks.

### 6. EXTREME DATA TEST RESULTS

Large-scale behavior.

### 7. BACKGROUND CONFLICT RISKS

Multi-operation stability.

### 8. CACHE & SYNC RISKS

Stale/mismatch risk.

### 9. MUST-FIX BEFORE LAUNCH

Critical resilience gaps.

### 10. PHASE VERDICT

Answer brutally:

If chaos happens during peak restaurant hours:

- Will system survive?
- Can data corrupt?
- Biggest failure fear?
- Confidence score /10?

---

# EXECUTION MODE

You are not testing features.
You are trying to break system under stress.

A production system is defined by:
How it behaves when things go wrong.

Find breaking points.
Expose fragility.
Document everything.

Return Phase 9 report only.

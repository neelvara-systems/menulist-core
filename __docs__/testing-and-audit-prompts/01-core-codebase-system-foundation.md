**Prerequisite:** Read `00-master-production-audit-governance.md` first.

---

# PHASE 1 — CORE CODEBASE & SYSTEM FOUNDATION AUDIT

**MenuList Production Readiness**

Execute this phase under the Master Audit Governance rules already provided.

This phase validates whether the **core system foundation** is strong enough for production.

If the foundation is weak, nothing else matters.

You must audit like the engineer responsible if the system collapses at scale.

---

# PRIMARY OBJECTIVE

Determine whether MenuList codebase and architecture are:

- Structurally clean
- Scalable
- Stable
- Maintainable
- Production-safe
- Cost-safe
- Debuggable

You are not reviewing features.
You are reviewing **system survival**.

---

# PART 1 — COMPLETE CODEBASE STRUCTURE MAPPING

Create a full structural map of the system.

Identify and document:

### A. Project structure

- Folder hierarchy
- Feature grouping logic
- Shared modules
- Service layers
- Utils/helpers
- Config areas
- Firebase layer
- AI integration layer
- API layer (if exists)
- Hooks/state management

### B. Evaluate structure quality

Check:

- Is structure logical or chaotic?
- Are responsibilities clearly separated?
- Any massive bloated files?
- Any God-components?
- Any tight coupling between modules?
- Any circular dependencies?
- Any fragile dependency chains?

### Output:

Clear architecture map + structural risks.

---

# PART 2 — ARCHITECTURE DISCIPLINE CHECK

Verify consistency across system.

Check:

- Naming conventions consistency
- File structure consistency
- Component patterns consistency
- Hook patterns
- API/service pattern consistency
- Firebase interaction pattern consistency
- Async handling consistency
- State update patterns
- Form handling patterns
- Modal/editor patterns

Find:

- Random coding styles
- Copy-paste implementations
- One-off custom logic
- Inconsistent approaches

System must feel built by **one disciplined senior engineer**.

---

# PART 3 — DEAD CODE & TECH DEBT DETECTION

Scan for:

- Unused files
- Unused functions
- Old feature remnants
- Commented blocks
- Debug code left
- Duplicate utilities
- Multiple implementations of same logic
- Temporary hacks
- Quick fixes never cleaned

Mark each:

- Safe to delete
- Needs refactor
- Risky to delete
- Cleanup recommended

Lean codebase = stable codebase.

---

# PART 4 — ERROR HANDLING & FAIL-SAFETY

Audit entire system for failure handling.

Check:

### Backend/API/Firebase

- Try/catch coverage
- Safe fallbacks
- Proper error propagation
- Partial write handling
- Retry logic

### Frontend/UI

- Loader stuck states
- Silent failures
- Broken UI after error
- Unhandled promise errors
- UI crash scenarios
- Missing fallback UI

### AI calls

- Failure handling
- Timeout handling
- Partial response handling

Goal:
**No silent failure anywhere**

If something fails:
System must recover or clearly inform.

---

# PART 5 — LOGGING & DEBUGGING READINESS

If production issue happens,
can we diagnose in 5 minutes?

Audit:

- Console logs left?
- Structured logs exist?
- Error logs stored?
- Firebase logs usable?
- Critical actions logged?
- AI calls logged?
- Menu changes logged?
- Store-level actions logged?

Identify:
Where debugging production will be hard.

---

# PART 6 — CONFIG & ENVIRONMENT SAFETY

Audit:

- Environment variable usage
- Hardcoded secrets
- API keys exposure risk
- Dev vs prod separation
- Feature flags safety
- Debug modes left active
- Unsafe defaults
- Test configs in prod

Goal:
System must be safe even if public repo leaked.

---

# PART 7 — DATA FLOW & STATE INTEGRITY

Trace critical flows end-to-end:

1. Store creation
2. Menu creation
3. Menu editing
4. Menu publish
5. Multi-outlet logic
6. AI generation → save
7. Image generation → save
8. Translation → save
9. Screen display data flow

Check:

- Race conditions?
- Partial save risk?
- Overwrite risk?
- State mismatch risk?
- Multi-tab edit conflicts?
- Inconsistent cache/state?

No data corruption allowed in production.

---

# PART 8 — EDGE CASE HANDLING

Verify handling for:

- Empty menus
- Large menus (200–500 items)
- Very slow network
- Firebase timeout
- AI timeout
- User refresh mid-save
- Double clicks
- Multi-tab editing
- Concurrent edits
- Store with huge images
- Unexpected null data

Production systems fail at edges.

---

# PART 9 — CODE-LEVEL PERFORMANCE RISKS

Identify:

- Heavy re-renders
- Large component trees
- Inefficient loops
- Repeated Firebase reads
- No caching where needed
- Oversized payloads
- Image loading inefficiency
- Unnecessary state updates

Find future performance bombs.

---

# PART 9B — TYPESCRIPT STRICTNESS & TYPE SAFETY

Audit:

- `tsconfig.json` strict mode settings
- Any `any` type overuse
- Missing type annotations on public functions
- Unsafe type assertions (`as any`, `as unknown`)
- Untyped API responses
- Missing return types on DAL functions
- Type coverage across critical paths (auth, payments, data writes)

Weak typing = hidden runtime errors at scale.

---

# PART 10 — DELIVERABLES

Follow Master Governance logging.

Create:

## `phase-01-codebase-audit-report.md`

Include:

### 1. Architecture Health Verdict

Clean / risky / messy?

### 2. Structural Risks

Weak areas in system design.

### 3. Tech Debt & Dead Code

Cleanup list.

### 4. Error Handling Gaps

Where system can silently break.

### 5. Logging & Debug Readiness

Can we debug production fast?

### 6. Config & Security Risks

Keys/env/config issues.

### 7. Data Integrity Risks

Possible corruption/race issues.

### 8. Performance Risks

Future slowdowns/cost issues.

### 9. Must-Fix Before Phase 2

Critical blockers.

### 10. Phase Verdict

Answer brutally:

If launched to 1,000 SMBs:

- Will system hold?
- First breaking point?
- Biggest hidden risk?
- Confidence score /10?

---

# EXECUTION MODE

- Move slow and deep
- Trace full flows
- Assume scale
- Assume real-world chaos
- No assumption system is safe
- Validate everything

When complete:
Return Phase 1 report only.

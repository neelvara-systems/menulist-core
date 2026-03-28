**Prerequisite:** Read `00-master-production-audit-governance.md` first.

---

# PHASE 4 — AUTHENTICATION, ACCESS CONTROL & TENANT SAFETY AUDIT

**MenuList Production Readiness**

Execute strictly under Master Production Audit Governance.

This phase determines whether:

- Customer data is safe
- Stores remain isolated
- Unauthorized access is impossible
- Admin boundaries are secure
- Account recovery cannot be abused

If this phase fails → trust is gone permanently.

You must audit like:
**A malicious user is actively trying to break the system.**

---

# PRIMARY OBJECTIVE

Validate that authentication and access control are:

- Secure
- Predictable
- Isolated per store
- Impossible to bypass
- Safe under edge cases
- Safe under multi-outlet scenarios
- Safe under direct API/Firebase calls

No assumptions allowed.

---

# PART 1 — AUTH FLOW COMPLETE MAPPING

Map entire authentication system:

### Identify:

- Auth provider (Firebase Auth etc)
- Login flow
- Signup flow
- Session handling
- Token lifecycle
- Logout handling
- Session persistence
- Multi-device login behavior

Trace:
User login → dashboard → store access → actions allowed

Check:

- Any inconsistent session state?
- Any ghost login state?
- Any broken redirect flows?
- Any unsafe session reuse?

---

# PART 2 — ROLE & PERMISSION MODEL

Document all roles and access layers.

Check:

- Store owner permissions
- Multi-outlet structure
- Master store authority
- Outlet-level restrictions
- Admin/internal access
- Any hidden super-admin logic
- Feature flag access
- Read vs write permissions

Verify:

- Can any user access another store?
- Can outlet override master?
- Can role escalation happen?
- Can permissions be bypassed via UI manipulation?

---

# PART 3 — FIREBASE SECURITY RULES AUDIT

Deep audit Firebase rules.

Check:

### Tenant isolation

- tId enforced everywhere?
- sId enforced correctly?
- Any wildcard access?
- Any overly broad rule?
- Any rule allowing read without strict match?
- Any rule allowing write without validation?

### Write safety

- Can user overwrite another store?
- Can user modify master store?
- Can user access global collections?
- Any missing validation in rules?

### Read safety

- Any cross-tenant reads possible?
- Any public data accidentally exposed?
- Any sensitive internal collections readable?

Simulate:
Malicious user with Firebase inspector trying direct calls.

---

# PART 4 — SESSION & TOKEN SAFETY

Audit:

- Token expiry handling
- Session persistence
- Logout invalidation
- Multi-tab sessions
- Multi-device login
- Session after password change
- Session after account disable
- Any long-lived unsafe session?

Check:
Can old token still access data?

---

# PART 5 — ACCOUNT RECOVERY & ACCESS EDGE CASES

Audit:

- Forgot password flow
- Email change flow
- Account recovery flow
- New device login
- Session restore after refresh
- Partial signup states
- Interrupted signup

Check:
Can account be hijacked via recovery?

---

# PART 6 — MULTI-TENANT ISOLATION TEST

Simulate:

User A (Store A)
User B (Store B)

Attempt:

- Access via URL manipulation
- API call with different storeId
- Firebase query override
- Local storage edit
- Manual request replay

Verify:
**Zero cross-store access possible**

---

# PART 7 — ADMIN / INTERNAL ACCESS SAFETY

Check:

- Any hidden admin routes?
- Any debug panel accessible?
- Any feature flag bypass?
- Any internal tools exposed?
- Any unsafe environment toggles?
- Any dev bypass left?

Ensure:
No internal control exposed publicly.

---

# PART 8 — ACTION-LEVEL PERMISSION TEST

Test sensitive actions:

- Delete menu
- Edit menu
- Publish menu
- Regenerate AI
- Delete images
- Change store settings
- Multi-outlet overrides
- Access analytics (if any)
- Access feedback inbox

Check:
Can unauthorized user perform these?

---

# PART 9 — ABUSE & ATTACK SCENARIOS

Simulate:

1. Logged-out user hitting API
2. Expired session hitting API
3. Token reuse attack
4. StoreId manipulation
5. Concurrent login conflict
6. Session race condition
7. Brute force login attempts
8. Rapid login attempts
9. Multiple tab editing

Check system response.

---

# PART 10 — DELIVERABLES

Create:

## `phase-04-auth-security-audit-report.md`

Include:

### 1. AUTH FLOW VERDICT

Safe / risky / inconsistent?

### 2. ROLE & PERMISSION RISKS

Escalation or bypass risks.

### 3. FIREBASE RULE RISKS

Any tenant leak or weak rule.

### 4. SESSION RISKS

Token/session weaknesses.

### 5. ACCOUNT RECOVERY RISKS

Hijack possibilities.

### 6. CROSS-TENANT TEST RESULTS

Isolation strength.

### 7. ADMIN ACCESS RISKS

Any exposed control.

### 8. ACTION PERMISSION GAPS

Unauthorized action risk.

### 9. MUST-FIX BEFORE LAUNCH

Critical security fixes.

### 10. PHASE VERDICT

Answer brutally:

If public launch today:

- Can any store access another?
- Can attacker manipulate data?
- Biggest auth/security danger?
- Confidence score /10?

---

# EXECUTION MODE

Think like attacker + security architect.

Assume:
If something can be exploited,
someone eventually will.

No trust.
Only verification.

Return Phase 4 report only.

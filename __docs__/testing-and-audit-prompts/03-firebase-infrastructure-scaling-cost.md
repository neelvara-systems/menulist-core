**Prerequisite:** Read `00-master-production-audit-governance.md` first.

---

# PHASE 3 — FIREBASE, INFRASTRUCTURE & SCALING COST AUDIT

**MenuList Production Readiness**

Execute strictly under Master Production Audit Governance.

This phase decides whether MenuList will:

- Scale safely
- Or silently bleed money
- Or crash under load

Most SaaS don’t die from lack of users.
They die from **infra cost explosions + bad query design**.

You must audit like:
**You are personally paying Firebase bill at 10,000 SMB scale.**

---

# PRIMARY OBJECTIVE

Create a complete Firebase + infra intelligence map:

- Firestore usage
- Reads/writes patterns
- Query efficiency
- Realtime listeners
- Storage usage
- Function triggers
- Background jobs
- Caching logic
- Worst-case cost scenarios

We need to know:
**If 1k–10k SMBs join, will infra cost stay controlled or explode?**

---

# PART 1 — FIREBASE ARCHITECTURE MAPPING

Map complete Firebase usage across system.

Document:

### Firestore structure

- Collections
- Subcollections
- Document depth
- Tenant isolation (tId/sId)
- Menu storage structure
- Image/meta storage
- Audit logs
- MOL/internal logs

### Storage usage

- Image storage
- Generated images
- Menu assets
- Public assets
- Any unused storage

### Cloud functions (if any)

- Triggered functions
- Background jobs
- Scheduled jobs
- Webhooks
- AI jobs
- Sync jobs

Output:
**Full Firebase architecture map**

---

# PART 2 — READ/WRITE PATTERN ANALYSIS

For every major feature:

Trace:
UI action → Firestore reads/writes → result

Identify:

### High-frequency reads

- Menu load
- Screen load
- Editor load
- Public menu load
- Hours/status load
- Multi-language load

### High-frequency writes

- Menu edits
- AI generation save
- Translation save
- Image save
- Logs
- Audit events

For each:

- Reads per action
- Writes per action
- Batch or multiple
- Avoidable?
- Cached or not?

Goal:
Detect hidden read bombs.

---

# PART 3 — REALTIME LISTENER AUDIT

Check all:

- onSnapshot listeners
- Realtime subscriptions
- Live menu updates
- Dashboard updates
- Screen sync logic

For each listener:

- When activated?
- How long active?
- Per user or per store?
- Multiple listeners stacking?
- Unsubscribed properly?
- Needed or overkill?

Realtime misuse = silent cost killer.

---

# PART 4 — QUERY EFFICIENCY & INDEX REVIEW

Audit all Firestore queries:

Check:

- Unindexed queries
- Large collection scans
- Inefficient filters
- Ordering without index
- Over-fetching fields
- Fetching entire documents unnecessarily
- N+1 query patterns
- Repeated same query

Identify:
Queries that will slow or cost more at scale.

---

# PART 5 — STORAGE COST & USAGE AUDIT

Audit Firebase storage:

- Generated images
- Uploaded images
- Menu assets
- Old unused images
- Duplicate images
- Image size optimization
- Public vs private storage
- CDN usage pattern

Check:
Will storage cost balloon over time?

---

# PART 6 — BACKGROUND JOBS & FUNCTION COST

Identify all background activity:

- Scheduled jobs
- PDF generation jobs
- AI jobs
- Sync jobs
- Logging jobs
- Cleanup jobs

For each:

- Frequency
- Trigger logic
- Runs per store?
- Runs per menu?
- Runs unnecessarily?
- Can multiply with scale?

Silent background jobs kill margins.

---

# PART 7 — SCALE SIMULATION (CRITICAL)

Simulate Firebase cost at scale:

### Scenario A — 100 SMBs

### Scenario B — 1,000 SMBs

### Scenario C — 10,000 SMBs

Calculate approximate:

- Reads/day
- Writes/day
- Storage growth
- Function executions
- Bandwidth usage

Identify:
First cost explosion point.

---

# PART 8 — CACHING & OPTIMIZATION CHECK

Check:

- Cached menu data?
- Cached public menu?
- Cached screens?
- Cached translations?
- CDN usage?
- Re-fetching same data repeatedly?
- Can reads be reduced safely?

Goal:
**Never pay twice for same read**

---

# PART 9 — TENANT ISOLATION & SAFETY

Verify:

- tId/sId isolation strict?
- Any cross-tenant query risk?
- Any global collection misuse?
- Any shared doc misuse?
- Any data leakage possibility?

Multi-tenant safety must be bulletproof.

---

# PART 10 — COST EXPLOSION RISK ZONES

Identify clearly:

### Critical cost risks

Where Firebase bill can spike suddenly.

### Silent risks

Where cost grows slowly unnoticed.

### Scale risks

Where system works at 10 users but breaks at 1k.

### Abuse risks

If user spams edits/uploads.

---

# PART 11 — DELIVERABLES

Create:

## `phase-03-firebase-cost-audit-report.md`

Include:

### 1. FIREBASE ARCHITECTURE MAP

Collections + flows.

### 2. READ/WRITE ANALYSIS

Per feature usage.

### 3. REALTIME LISTENER RISKS

Cost + necessity.

### 4. QUERY & INDEX RISKS

Slow/expensive queries.

### 5. STORAGE COST RISKS

Image/storage growth.

### 6. BACKGROUND JOB COST RISKS

Silent cost generators.

### 7. SCALE COST SIMULATION

100 / 1k / 10k SMB projection.

### 8. CACHING & OPTIMIZATION

Where cost can be reduced.

### 9. TENANT SAFETY

Isolation verification.

### 10. MUST-FIX BEFORE LAUNCH

Critical infra risks.

### 11. PHASE VERDICT

Answer brutally:

If 5,000 SMBs onboard:

- Will Firebase cost stay controlled?
- First cost explosion point?
- Biggest hidden infra risk?
- Confidence score /10?

---

# EXECUTION MODE

Think like:
Infra architect + CFO combined.

Every extra read = money.
Every bad query = scaling pain.
Every listener = silent bill.

Move slow.
Trace deeply.
Miss nothing.

Return Phase 3 report only.

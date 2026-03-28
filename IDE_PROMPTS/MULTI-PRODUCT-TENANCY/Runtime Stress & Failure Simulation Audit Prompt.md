You are now performing a RUNTIME STRESS TEST and FAILURE SIMULATION audit for this platform.

The architecture audit has already been completed.

Your task now is to evaluate whether this system will remain stable under real production conditions.

This audit must focus on:

• concurrency
• retry safety
• idempotency
• scaling behavior
• Firestore query safety
• token abuse protection
• cross-product failure isolation
• runtime edge cases

This is NOT theoretical.

You must analyze the real code paths and simulate scenarios.

If issues are found:

1. Fix them when safe.
2. Update docs if architecture behavior changes.
3. Do NOT introduce speculative architecture.

---

# SYSTEM CONTEXT

This platform contains:

MenuList — truth layer  
Canonica — knowledge/support system

Integration model:

MenuList → Canonica via Canonica Client Token (CCT)

Identity model:

pId / tId / sId

Two Firestore databases:

MenuList → ecomsai  
Canonica → canonica

Cloud Functions split:

functions/ → MenuList  
functions-canonica/ → Canonica

---

# PHASE 1 — Concurrency & Idempotency Simulation

Simulate high-concurrency events.

Example cases:

### Ticket Creation Retry Storm

Scenario:

User submits ticket  
Network fails  
Frontend retries  
Multiple requests sent

Verify:

• requestId prevents duplicate tickets
• idempotency logic exists
• race conditions cannot create duplicate documents

If missing:

Implement duplicate-prevention logic.

---

### Chat Session Flood

Simulate:

100 concurrent chat messages from same user.

Check:

• document write contention
• transaction safety
• message ordering issues
• document size growth

Fix any unsafe patterns.

---

### Canonica Mutation Approval Race

Simulate:

Two admins approve same mutation simultaneously.

Ensure:

• transactions prevent double mutations
• canonical answers do not create overlapping version windows

Fix if needed.

---

# PHASE 2 — Firestore Write Hotspot Analysis

Check for write hotspot risks.

Common Firestore failure patterns:

• sequential document IDs
• single document counters
• high-write collections without partitioning

Audit collections:

entities  
canonicalAnswers  
signalEvents  
mutationProposals  
tickets  
chatSessions

Check:

• write frequency patterns
• document update frequency
• shard requirements

If dangerous patterns exist:

Introduce safe write strategies.

---

# PHASE 3 — Firestore Query Scale Simulation

Evaluate query cost at scale.

Simulate dataset sizes:

• 100k tickets
• 500k chat messages
• 50k KB articles
• 1M signal events

Check:

• query complexity
• composite index requirements
• Firestore scan patterns

Ensure:

queries always filter by tenant.

If not:

Fix queries.

---

# PHASE 4 — Token Abuse Simulation

Test CCT token system against abuse patterns.

Simulate:

### Expired token

Verify rejection.

### Tampered token

Verify signature validation.

### Token replay attack

Check if requestId prevents duplicate effects.

### Missing source fields

Ensure Canonica rejects invalid tokens.

Fix validation logic if needed.

---

# PHASE 5 — Failure Isolation Simulation

Simulate Canonica infrastructure failure.

Assume:

• Canonica Firestore unavailable
• Canonica callable functions fail
• token verification service unavailable

Verify MenuList behavior.

MenuList MUST:

• continue functioning
• degrade gracefully
• show help center unavailable message
• not crash dashboard

Fix any coupling issues.

---

# PHASE 6 — Cloud Function Execution Safety

Audit all Cloud Functions for:

• infinite retry risk
• long-running loops
• memory leaks
• missing timeout guards
• unhandled promise chains

Check:

canonicaNightly  
embedArticleWorker  
regenerateEmbedding  
publishApprovedJob  
kbQuality

Ensure:

• retry-safe
• idempotent
• bounded execution

Fix issues.

---

# PHASE 7 — Document Size Safety

Check Firestore document size risks.

Firestore max document size:

1 MB

Audit documents:

tickets  
chatSessions  
canonicalAnswers  
signalEvents

Ensure:

documents cannot grow unbounded.

If risk exists:

introduce pagination or event collections.

---

# PHASE 8 — Logging & Observability Audit

Verify observability infrastructure.

Ensure:

traceId propagates to:

• documents
• audit logs
• mutation logs
• error logs

Check that logs allow debugging full request chain.

If gaps exist:

add trace propagation.

---

# PHASE 9 — Cold Start & Latency Risks

Audit runtime paths for cold start impact.

Check:

• callable functions
• server actions
• API routes

Evaluate:

• critical request latency
• heavy initialization logic

Optimize if needed.

---

# PHASE 10 — Data Corruption Safeguards

Simulate corrupted data.

Examples:

• entity without canonical answer
• canonical answer referencing missing entity
• release referencing invalid version

Ensure system fails safely.

Add validation guards if needed.

---

# FINAL REPORT

Produce a runtime stability report including:

1. concurrency safety
2. idempotency verification
3. Firestore scaling safety
4. token security validation
5. cloud function stability
6. failure isolation confirmation
7. document size safety
8. runtime latency risk

Verdict must be:

• STABLE FOR PRODUCTION  
• STABLE WITH RISKS  
• NOT SAFE FOR PRODUCTION

Fix issues where safe.

Document all changes made.

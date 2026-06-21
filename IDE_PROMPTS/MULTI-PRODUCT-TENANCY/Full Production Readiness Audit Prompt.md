You are performing a FULL PRODUCTION READINESS AUDIT for a multi-product platform architecture.

This repository contains two major systems:

1. MenuList — customer-facing truth layer
2. Answerlattice — governed answer infrastructure for SaaS support

Both systems now run in a single Next.js codebase but use **separate Firebase projects**.

MenuList → Firebase projects: menulist-qa for local/preview, menulist for production
Answerlattice → Firebase project: answerlattice

The platform architecture includes:

• multi-product identity model
• token-based cross-product integration (CCT)
• two Firestore databases
• two Cloud Functions deployments
• DAL separation
• canonical knowledge system
• platform doctrine enforcing identity rules

Your job is to **audit the entire system end-to-end for production readiness**.

This is NOT a basic lint pass.

This is a **deep architecture + runtime + deployment audit**.

You must validate:

• architecture correctness
• implementation correctness
• security correctness
• cross-product isolation
• document model correctness
• deployment readiness
• code-doc parity

If issues are found:

1. FIX them directly in code when safe
2. UPDATE the relevant documentation if behavior changes
3. NEVER introduce new architecture without justification
4. NEVER break the doctrine rules

---

# PHASE 1 — Architecture Conformance Audit

Cross-check the repository against these architecture documents:

• 07-multi-product-tenancy.md
• 08-product-separation-playbook.md
• 09-multi-product-doctrine.md
• 10-implementation-action-items.md

Validate that implementation matches the documented architecture.

Check:

1. pId / tId / sId identity model enforced everywhere
2. Answerlattice documents include required root + sourceContext fields
3. requestBodyComposer behavior matches doctrine
4. Answerlattice writes DO NOT use requestBodyComposer for cross-product events
5. DAL separation is correct
6. MenuList DAL uses MenuList Firebase client
7. Answerlattice DAL uses Answerlattice Firebase client
8. No accidental cross-database access
9. No shared firebaseClient imports in Answerlattice DAL

If violations exist:

• fix code
• document the change

---

# PHASE 2 — Firebase Infrastructure Audit

Verify Firebase separation is correctly implemented.

Check:

MenuList infrastructure:

src/lib/firebase/firebaseClient.ts
src/lib/firebase/firebaseAdmin.ts
src/lib/firebase/config.ts

Answerlattice infrastructure:

src/lib/firebase/answerlatticeFirebaseClient.ts
src/lib/firebase/answerlatticeFirebaseAdmin.ts
src/lib/firebase/answerlatticeConfig.ts

Validate:

• two Firebase apps initialized correctly
• no cross-project Firestore usage
• environment variables correct
• Admin SDK uses correct project credentials
• callable functions use correct Firebase instance
• storage references use correct bucket

If problems exist:

• correct initialization
• update env usage
• update docs if needed

---

# PHASE 3 — Answerlattice Client Token (CCT) Audit

Audit the token integration system.

Check:

CCT structure matches doctrine:

clientId
traceId
requestId
pId
tId
sId
uId
name
email
phone
iat
exp

Validate:

• token generation location
• token verification logic
• secret key usage
• AnswerlatticePlatformContext creation
• idempotency enforcement using requestId
• traceId propagation to documents

Ensure:

• tokens are NEVER generated client-side
• secrets are never exposed in frontend code

If violations exist:

• fix implementation
• update docs

---

# PHASE 4 — DAL Layer Audit

Audit all DAL files.

Answerlattice DAL directories:

src/database/answerlattice/
src/database/knowledgeBase/
src/database/tickets/
src/database/chatSessions/
src/database/aiSearchHistory/
src/database/queryEmbeddings/
src/database/contentFeedback/
src/database/changelog/
src/database/feedback/
src/database/kb-generation/
src/database/chatAnalytics/

Validate:

• correct Firestore client usage
• correct collection names
• correct tenant scoping
• correct identity injection
• no missing pId fields
• correct document ownership

Ensure:

MenuList DAL → active MenuList Firestore (`menulist-qa` local/preview, `menulist` production)
Answerlattice DAL → answerlattice Firestore

Fix any violations.

---

# PHASE 5 — Cloud Functions Separation Audit

Audit Cloud Functions architecture.

Validate separation:

functions/ → MenuList
functions-answerlattice/ → Answerlattice

Check:

• correct firebase config usage
• correct project deployment config
• correct environment usage
• correct exports
• correct scheduler placement
• no Answerlattice functions remaining in MenuList runtime

Ensure:

MenuList scheduler does not call Answerlattice code.

Fix if needed.

---

# PHASE 6 — Query Pattern & Index Risk Audit

Analyze Firestore query patterns.

Validate:

• tenant-scoped queries
• index explosion risk
• inefficient query patterns
• missing composite indexes
• misuse of orderBy / where combinations

Recommend:

primary query axis per collection.

If dangerous patterns exist:

• refactor queries
• update indexes
• document change

---

# PHASE 7 — Security Audit

Check for:

• exposed secrets
• token signing in frontend
• unsafe Firestore writes
• missing server validation
• cross-tenant leakage risk
• incorrect Firebase rules assumptions

Fix vulnerabilities immediately.

---

# PHASE 8 — Failure Isolation Audit

Validate graceful degradation rules.

Ensure:

MenuList continues functioning if Answerlattice fails.

Check:

• try/catch around Answerlattice features
• UI fallback states
• Firestore error handling
• callable function failures

Fix any coupling issues.

---

# PHASE 9 — Production Deployment Audit

Verify readiness for deployment.

Check:

• environment variables completeness
• Vercel compatibility
• Firebase CLI configs
• functions deploy scripts
• tsconfig correctness
• TypeScript build health
• no runtime imports of dev tools

Ensure:

tsc --noEmit passes.

---

# PHASE 10 — Code vs Documentation Consistency

If implementation differs from docs:

1. decide which is correct
2. fix code OR docs
3. update documentation accordingly

Docs must always match real architecture.

---

# PHASE 11 — Final Production Certification

After audit, produce a report containing:

1. architecture compliance status
2. security findings
3. database isolation verification
4. deployment readiness
5. fixed issues list
6. remaining risks
7. final certification verdict

Status must be one of:

• PRODUCTION READY
• PRODUCTION READY WITH WARNINGS
• NOT READY

---

# STRICT RULES

You must NOT:

• introduce new architecture
• restructure repository
• change doctrine rules
• break platform identity model

You may:

• fix bugs
• fix violations
• enforce doctrine
• improve safety
• update documentation

---

Begin the audit now.

Work systematically through all phases.
Document findings as you go.
Fix issues immediately when safe.

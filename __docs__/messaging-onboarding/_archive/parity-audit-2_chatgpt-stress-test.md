# Messaging Onboarding — Parity Audit #2 + ChatGPT Stress Test Review

**Date:** February 18, 2026  
**Trigger:** ChatGPT stress test conversation — pre-testing validation  
**Methodology:** `/parity-audit` workflow (STEP 1-8) + `/chatgpt-review` workflow  
**Status:** PASS — All findings resolved

---

## Part 1: Spec-vs-Code Parity Audit

### Methodology

Built two system maps independently:
1. **Expected** — from `_spec.md` (800 lines) + `_impl.md` (2313 lines)
2. **Actual** — from all implementation files (14 code files across functions/ and src/)

Cross-compared 10 areas line-by-line per parity-audit workflow.

### Results by Area

| Area | Status | Notes |
|------|--------|-------|
| **A. State Machine** | PASS | 11 states, TERMINAL_STATES includes COOLDOWN, 6 forbidden transition rules expanded to 19 entries |
| **B. Constants & Limits** | PASS | All 12 numeric values match spec exactly |
| **C. Message Templates** | PASS | All 15 messages match spec word-for-word |
| **D. API Contracts** | PASS | 3 routes with Zod schemas matching spec |
| **E. DB Schema** | PASS | Session fields match §3.1, rate limit fields match §3.2 |
| **F. Publish Pipeline** | 3 FINDINGS | See below |
| **G. Security** | PASS | 12/12 security checklist items verified |
| **H. Integration Points** | PASS | All helpers imported from correct sources |
| **I. Feature Flags** | PASS | 3 flags in both dashboard config and CF constants |
| **J. Error Handling** | 1 FINDING | See below |

### Findings

| # | Area | Type | Finding | Fix Applied |
|---|------|------|---------|-------------|
| F-1 | Publish | DUPLICATE | CF `publishPipeline.ts:executePublish()` is dead code (never called). Approve route uses `executePublishFromApiRoute()` per ADR-10. CF version missing `timeSlotPresets`. | Added deprecation notice with sync instructions |
| F-2 | Publish | DRIFT | Comment said "71 countries" but code now uses 252-country dataset | Fixed comment |
| J-1 | Error | MISSING | `PASSWORD_PROTECTED_PDF` message defined but no code detects encrypted PDFs | Implemented `isPdfEncrypted()` check in `processAndStoreUpload()` — checks PDF header for `/Encrypt` marker |

### Shared Data Parity (Law 4) — Previously Fixed

| File | Frontend | Backend | Status |
|------|----------|---------|--------|
| `businessTypes.ts` | `src/data/shared/` | `functions/src/sharedData/` | IDENTICAL |
| `defaultRoles.ts` | `src/data/shared/` | `functions/src/sharedData/` | IDENTICAL |
| `countryData.ts` | `src/components/atoms/phoneNumberInput/` | `functions/src/sharedData/` | IDENTICAL |

---

## Part 2: ChatGPT Stress Test Review

### ChatGPT's 7 Risk Areas — Codebase Verification

| Risk | ChatGPT Concern | Codebase Status | Verdict |
|------|----------------|-----------------|---------|
| **RISK 1: Duplicate Webhook Storms** | Meta sends same webhook 3-5x | `providerMessageIds` array dedup in `sessionEngine.ts:551-561`. Each message ID checked before processing. | COVERED — code handles it |
| **RISK 2: Double Publish Race** | Two simultaneous approve clicks | Firestore transaction in `approve/route.ts:59-96` atomically checks `state === AWAITING_APPROVAL` and transitions to `PUBLISHING`. Second request gets 409 error. | COVERED — transaction-safe |
| **RISK 3: Weird AI Output** | Empty categories/items from Gemini | Blank prevention gate in `extractionWatcher.ts:91` checks `categoryCount === 0 \|\| itemCount === 0`. Returns FAILED state + asks for clearer photos. | COVERED |
| **RISK 4: Storage + Cleanup Leak** | Orphan images from abandoned sessions | `messagingSessionCleanup.ts:161-199` runs daily, deletes uploads for expired sessions (48h buffer), then deletes session doc. | COVERED |
| **RISK 5: Multi-Upload During Processing** | New images while extraction running | `sessionEngine.ts:653-675` sets `pendingUploadsWhileProcessing: true`. After extraction, `extractionWatcher.ts:215-221` logs but doesn't auto-restart — owner decides via full-resend (3+ images). | COVERED |
| **RISK 6: Payment Lock** | Dashboard access after free publish | `onboardingSource: 'messaging'` + `activationDeadline` fields set on store. Dashboard restriction logic documented in impl §17.4. | ARCHITECTURE READY — dashboard restriction component not yet built (post-v1) |
| **RISK 7: WhatsApp Real Latency** | Out-of-order delivery, retries | Safe-Ignore Principle (INV-1): every message safely ignorable. Dedup by `providerMessageId`. State machine prevents corruption. Webhook responds 200 immediately, processes async. | COVERED by design |

### ChatGPT's Testing Stages — Readiness Assessment

| Stage | Description | Can We Test? | Blockers |
|-------|-------------|--------------|----------|
| STAGE 1 | Local System Verification | YES | Need Firebase emulator setup |
| STAGE 2 | Firestore Inspection | YES | Manual check after Stage 1 |
| STAGE 3 | Failure Injection | YES | Mock Gemini responses, force errors |
| STAGE 4 | Real WhatsApp Sandbox | YES | Need Meta developer account + sandbox setup |
| STAGE 5 | 5 Real Restaurant Test | AFTER Stage 4 | Need live WhatsApp Business number |
| STAGE 6 | Production | AFTER Stage 5 | All previous stages must pass |

### ChatGPT Recommendations — Accepted/Rejected

| Recommendation | Decision | Justification |
|---------------|----------|---------------|
| Test duplicate webhooks 5x | ACCEPT | Critical — dedup logic must be verified |
| Test double publish race | ACCEPT | Critical — transaction safety must be verified |
| Test empty AI output | ACCEPT | Blank prevention gate must be verified |
| Test storage cleanup | ACCEPT | Cost leak prevention |
| Test payment lock | DEFER | Dashboard restriction component is post-v1 |
| Test real WhatsApp latency | ACCEPT | Only after local tests pass |
| Build automated test suite | PARTIAL | Manual testing first, automate later |

---

## Final Verdict

**PARITY AUDIT: PASS**
- 3 findings found and fixed (F-1 deprecation notice, F-2 comment fix, J-1 PDF encryption detection)
- All 10 cross-comparison areas verified
- Shared data parity verified (Law 4)

**CHATGPT STRESS TEST: VALIDATED**
- 6/7 risks fully covered in code
- 1 risk (payment lock) architecturally ready but UI not built (post-v1, acceptable)
- Testing stages 1-3 can begin immediately
- Stage 4+ requires Meta developer account setup

**NEXT ACTION: Begin Stage 1 — Local System Verification**

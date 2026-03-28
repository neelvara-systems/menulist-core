# ChatGPT Feedback — Signal Emitters & Activation Wiring Audit

> **Date:** March 2, 2026
> **Context:** ChatGPT reviewed the Activation Phase 1 implementation (signal emitters, nightly scheduler, drift wiring)
> **Cascade Action:** Validated all 8 points against codebase. Found 1 real gap. Fixed it.

---

## Summary

| # | ChatGPT Claim | Verdict | Action Taken |
|---|---------------|:-------:|-------------|
| 1 | Signal emitters emit noisy signals | ✅ Already protected | Mutation engine has min threshold + human approval |
| 2 | Fire-and-forget may block callers | ✅ Already handled | No `await`, try/catch, console.warn |
| 3 | Release-triggered drift missing | ❌ **VALID GAP** | **FIXED:** Wired `evaluateDriftForTenant` into `activateRelease()` |
| 4 | Double gating (flag + ops_config) good | ✅ Correct | No action needed |
| 5 | Behavior metrics unproven | ✅ Correct | Deferred — needs data seeding first |
| 6A | Tenant discovery may leak | ✅ Already handled | `.limit(100)` + tId/sId scoping on all queries |
| 6B | Signal amplification gamable | ✅ Low risk | Human approval gate prevents damage |
| 6C | Cold start cost unknown | ✅ Negligible | ~$0.001 at 100 tenants per nightly run |
| 7 | Maturity: 70% → 85% | ✅ Agree | — |
| 8 | Next step: seed data, not more code | ✅ Agree | — |

---

## Detailed Validation

### 1. Signal Quality — Emit-Everything, Filter-Later (CORRECT DESIGN)

ChatGPT worried that every ticket/feedback emitting a signal could cause false clustering.

**Protection layers in codebase:**
- `MUTATION_CONFIG.minSignalsForProposal: 3` — clusters below 3 signals skipped
- `MUTATION_CONFIG.maxProposalsPerRun: 10` — caps proposals per nightly run
- `SIGNAL_DRIFT_THRESHOLDS.minSignalCount: 5` — drift engine ignores low-signal entities
- All mutation proposals require **human approval** — never auto-applied
- `confidenceScore` normalized to 0–1 based on signal volume

**Design rationale:** Raw signals should be emitted unfiltered. The mutation engine's clustering + thresholding + human approval is the quality gate. Filtering at emission time would lose data that might become significant when combined.

**Files:** `src/lib/canonica/signalEmitter.ts`, `functions/src/canonica/canonicaNightly.ts` (lines 230–233)

### 2. Fire-and-Forget Safety (ALL 3 CHECKS PASS)

| Check | Result | Evidence |
|-------|:------:|---------|
| Does failure block ticket creation? | ✅ No | `emitCanonicaSignal({...})` called without `await` |
| Does emitter swallow errors? | ✅ Yes | Entire body in try/catch |
| Does it log failures? | ✅ Yes | `console.warn('[Canonica Signal] Failed...')` |

**Files:** `src/database/tickets/index.ts` (line 84), `src/components/templates/main-app/helpChat/api.ts` (line 96)

### 3. Release-Triggered Drift — GAP FOUND AND FIXED

**The gap:** `activateRelease()` just flipped status to 'active'. No drift evaluation ran. Class A (version drift) was **never triggered** because:
- The nightly job has no release context (skips Class A)
- No code called `evaluateDriftForTenant()` with release version + changed entities

**The doctrine violation:** `releases.ts` header says *"Drift engine must process before release becomes active"* — but it wasn't happening.

**Fix applied to `src/database/canonica/releases.ts`:**
1. Fetch release data (entityChanges + versionNormalized)
2. Mark release as `processing`
3. Call `evaluateDriftForTenant(tId, sId, { releaseVersion, changedEntityIds })` — advisory, wrapped in try/catch
4. Activate release

Drift evaluation failure does NOT block activation — it's advisory. Drifted answers get flagged for review but continue serving.

### 4. Double Gating — Confirmed Correct

- **Client-side:** `FEATURE_FLAGS.ENABLE_CANONICA_*` in `src/config/features.ts`
- **Server-side:** `ops_config/canonica.enabled` in Firestore (read by Cloud Function)
- Both must be true for the respective code paths to execute

### 5. Behavior Metrics — Deferred (Correct)

Cannot measure until data exists:
- Canonical hit rate vs RAG fallback rate
- Negative feedback rate change
- Drift detection accuracy
- Mutation proposal quality

**Blocked by:** Ontology seeding (activation item #2)

### 6A. Tenant Discovery — Isolation Verified

```
discoverActiveTenants() → .limit(100) — bounded scan
runDriftDetection(tId, sId) → all queries scoped by tId + sId
runSignalMutation(tId, sId) → all queries scoped by tId + sId
```

Each tenant processed in isolated try/catch — one failure cannot affect another.

### 6B. Signal Amplification — Human Gate Is Sufficient

**Theoretical attack:** User spams negative feedback → 3+ signals → mutation proposal generated.

**Mitigations already in place:**
- `feedbackInProgressRef` prevents concurrent submissions per message
- Proposals require **human review** before any knowledge change
- `minSignalsForProposal: 3` means 3 distinct feedback events needed
- `maxProposalsPerRun: 10` caps system-wide impact

**Known limitation:** No per-user signal deduplication. Acceptable for V1 because:
1. Human approval is the final gate
2. Negative feedback is rare behavior (most users don't bother)
3. Adding dedup adds complexity without clear ROI until data exists

### 6C. Cold Start Cost — Negligible

**Per tenant per nightly run:**
- Reads: 4 collection queries + up to 10 per-cluster lookups = ~14 reads
- Writes: drift updates + audit logs + proposals = ~20 writes max

**At scale:**
| Tenants | Reads | Writes | Firestore Cost |
|:-------:|:-----:|:------:|:--------------:|
| 1 | ~14 | ~20 | $0.00001 |
| 10 | ~140 | ~200 | $0.0001 |
| 100 | ~1,400 | ~2,000 | $0.001 |

Cost is negligible even at 100× current scale.

---

## What ChatGPT Got Right

1. **Release-triggered drift was a real gap** — Class A version drift was completely inert. Fixed.
2. **"Signal quality > signal existence"** — Correct framing. Our design accounts for this at the analysis layer.
3. **"Do not build more. Run a controlled experiment."** — Agree. Next step is ontology seeding, not more infrastructure.

## What ChatGPT Missed

1. **The mutation engine already had thresholds** — `minSignalsForProposal: 3` and `maxProposalsPerRun: 10` were in place. ChatGPT speculated they might be missing.
2. **The emitter was already non-blocking** — Called without `await`. ChatGPT asked to "confirm" something that was already correct.
3. **Tenant isolation was already strict** — Every query includes `tId` + `sId` filters. No cross-tenant risk.

---

## Updated Status

**Canonica Activation Phase:** 4/7 items complete.

| # | Item | Status |
|---|------|:------:|
| 1 | Firestore composite indexes | ✅ DONE |
| 2 | Seed ontology for MenuList | TODO |
| 3 | Wire signal emitters | ✅ DONE |
| 4 | Deploy drift+mutation scheduler | ✅ DONE |
| 4b | Wire release-triggered drift (Class A) | ✅ DONE (this session) |
| 5 | Run mutation engine manually | TODO |
| 6 | Load test canonical retrieval | DEFERRED |
| 7 | Flag toggle drill | DEFERRED |

**Next step:** Seed ontology + canonical answers for MenuList tenant, then run first live cycle.

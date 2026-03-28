# Canonica — Infrastructure Readiness Certification (IRC v1.0)

> **Version:** 1.0.0
> **Last Updated:** 2026-03-02
> **Purpose:** Hard gate before any external rollout. No partial approval.
> **Source:** ChatGPT strategic session + Cascade codebase validation

---

## Certification Requirements

**All checks must pass. Any structural invariant failure = REJECTED.**

Sign-off required from: Engineering Lead, Security Owner, Product Owner, Architecture Owner.

---

## Section 1 — Data Model Integrity

- [ ] 1.1 Every core document includes immutable `tenantId`
- [ ] 1.2 `tenantId` enforced server-side (not client-only)
- [ ] 1.3 CanonicalAnswer enforces: `entityIds.length ≥ 1`, non-overlapping version windows, status transition constraints, scope constraints validated transactionally
- [ ] 1.4 Entity.type immutable after creation
- [ ] 1.5 Entity deletion blocked if referenced by CanonicalAnswer or EntityRelation
- [ ] 1.6 Release objects immutable after creation
- [ ] 1.7 MutationProposal cannot alter CanonicalAnswer directly (must go through pipeline)

## Section 2 — Retrieval Determinism

- [ ] 2.1 Canonical-first retrieval enforced globally
- [ ] 2.2 Fallback always logged with `non_canonical` flag
- [ ] 2.3 Specificity scoring rule-based (no LLM ranking for canonical selection)
- [ ] 2.4 Conflict detection logic implemented (identical specificity = flagged + deterministic fallback)
- [ ] 2.5 Version window filtering uses normalized integers (no string comparison)
- [ ] 2.6 Retrieval idempotent: 10K repeated queries produce identical result

## Section 3 — Drift Engine Integrity

- [ ] 3.1 All 4 drift classes implemented (version_mismatch, signal_anomaly, scope_conflict, deprecated_entity)
- [ ] 3.2 Drift evaluation idempotent (running twice produces same flags)
- [ ] 3.3 Nightly audit completion rate ≥ 99.5%
- [ ] 3.4 Release-triggered drift runs automatically on release activation
- [ ] 3.5 Drift flag cannot be cleared without validation event + audit log

## Section 4 — Mutation Safety

- [ ] 4.1 Mutation approvals transactional (no partial state)
- [ ] 4.2 Overlapping version window creation impossible (transactional check)
- [ ] 4.3 Duplicate version creation prevented
- [ ] 4.4 All mutation actions produce append-only audit log
- [ ] 4.5 Failed mutation leaves system unchanged (no partial corruption)

## Section 5 — Multi-Tenant Isolation

- [ ] 5.1 Firestore security rules enforce tenant match on all core collections
- [ ] 5.2 All composite indexes include `tenantId` as leading key
- [ ] 5.3 Cross-tenant query attempts fail (adversarial test required)
- [ ] 5.4 Cache keys include `tenantId` (no shared entity cache across tenants)
- [ ] 5.5 Background jobs (drift, mutation, signal) partition by tenant

## Section 6 — Security & RBAC

- [ ] 6.1 All writes to core collections server-enforced (no client-side writes)
- [ ] 6.2 RBAC matrix enforced server-side for all mutation endpoints
- [ ] 6.3 Role change invalidates previous session token
- [ ] 6.4 Audit logs append-only (no update, no delete)
- [ ] 6.5 No production console write access to core collections

## Section 7 — Performance & SLO

- [ ] 7.1 P95 canonical retrieval ≤ 150ms
- [ ] 7.2 P95 full pipeline (including formatting) ≤ 400ms
- [ ] 7.3 Fallback path (LLM-assisted) ≤ 900ms P95
- [ ] 7.4 Drift engine completes within defined time window per tenant
- [ ] 7.5 No Firestore index scan warnings under stress load

## Section 8 — Data Durability

- [ ] 8.1 Daily snapshot backup active for all core collections
- [ ] 8.2 Restore test executed successfully (dry-run)
- [ ] 8.3 RTO < 4 hours validated
- [ ] 8.4 RPO < 24 hours validated

## Section 9 — Integrity Audit Job

- [ ] 9.1 Nightly job verifies no overlapping version windows
- [ ] 9.2 Nightly job verifies no duplicate active answers per scope
- [ ] 9.3 Nightly job verifies no orphan entity relations
- [ ] 9.4 Nightly job verifies no mutation status mismatch
- [ ] 9.5 Nightly job verifies no drift flag inconsistency

## Section 10 — Failure Injection Pass

- [ ] 10.1 Drift job interruption → no corruption
- [ ] 10.2 Mutation transaction interruption → no partial state
- [ ] 10.3 Firestore throttling → graceful degradation
- [ ] 10.4 LLM timeout → canonical retrieval continues
- [ ] 10.5 High QPS retrieval → deterministic behavior maintained

---

## Certification Output

Upon passing all sections:

**Produce:** Infrastructure Readiness Report including:
- SLO metrics evidence
- Stress test results
- Integrity audit summary
- Security validation report
- Sign-off signatures

This report becomes part of enterprise onboarding package.

---

## Incident Severity Levels (Post-Certification)

| Severity | Examples | Response |
|----------|---------|----------|
| **Sev 1** | Data corruption, cross-tenant leak, incorrect canonical retrieval | Immediate production freeze. Hotfix only. |
| **Sev 2** | Latency > SLO, drift audit missed, mutation queue blocked | Priority sprint. |
| **Sev 3** | Dashboard inconsistency, non-critical fallback spike | Scheduled fix. |

**Failure budget policy:** If SLO breached → feature development pauses until resolved.

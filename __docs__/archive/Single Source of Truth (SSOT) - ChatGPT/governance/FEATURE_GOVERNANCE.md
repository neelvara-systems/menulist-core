> **Status:** Historical archive evidence; not current launch certification.
>
> **Current Launch Boundary:** This archive file is preserved only as historical context. It is not current MenuList source of truth, production approval, deploy approval, launch approval, or release certification. Current readiness is decided only by the active [production-readiness audit](../../../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../../../production-readiness/external-certification-runbook.md) evidence, current source verifiers, browser/device QA, provider smoke, target deploy evidence, and production-host smoke.

# FEATURE GOVERNANCE POLICY

**Document Type:** Governance  
**Last Updated:** 2026-01-11  
**Status:** 🔒 LOCKED  
**Audience:** Product, Engineering, Leadership

---

## PURPOSE

This document defines how features are governed in MenuListAi.

**Core Principle:**  
Features are locked. The system is frozen. No exceptions without CEO approval.

---

## FEATURE STATUS DEFINITIONS

| Status       | Meaning                                  |
| ------------ | ---------------------------------------- |
| 🔒 LOCKED    | Production-ready, no changes allowed     |
| ⚠️ FLAGGED   | Capability exists, can be toggled        |
| ❌ FORBIDDEN | Not allowed until architecture unfreezes |

---

## CURRENT FEATURE STATUS

### Core Features (LOCKED)

| Feature                            | Status | Last Modified |
| ---------------------------------- | ------ | ------------- |
| CMI (Continuous Menu Intelligence) | 🔒     | 2026-01-11    |
| Decision Blocks                    | 🔒     | 2026-01-11    |
| Digital Screens                    | 🔒     | 2026-01-11    |
| Physical Surfaces                  | 🔒     | 2026-01-11    |
| Staff Prompt Mode                  | 🔒     | 2026-01-11    |
| Social Content (Today)             | 🔒     | 2026-01-11    |

### Capability Flags (FLAGGED)

| Capability      | Current | Allowed to Toggle |
| --------------- | ------- | ----------------- |
| Direct Posting  | OFF     | ✅                |
| Outcome Framing | OFF     | ✅                |
| Learned Model   | OFF     | ✅                |

### Forbidden Features (UNTIL 2028)

| Feature                | Reason                   |
| ---------------------- | ------------------------ |
| New decision surfaces  | Architecture freeze      |
| Realtime analytics     | Undermines authority     |
| Owner configuration UI | Creates decision fatigue |
| A/B testing on logic   | Breaks consistency       |
| New collections        | Database freeze          |

---

## FEATURE REQUEST PROCESS

### For Capability Flag Changes

1. **Request:** Written justification
2. **Review:** Engineering lead approval
3. **Test:** Staging verification
4. **Deploy:** Config update
5. **Monitor:** 24-hour observation

### For New Features (BLOCKED)

```
❌ NOT ALLOWED UNTIL 2028

All new feature requests will be:
1. Logged
2. Reviewed post-freeze
3. Rejected if incompatible with SSOT
```

---

## FEATURE FLAG CHANGES

### Allowed Changes

| Change                        | Approval         |
| ----------------------------- | ---------------- |
| Toggle existing flag          | Engineering Lead |
| Add new flag (no code change) | CTO              |
| Modify flag behavior          | CEO + CTO        |

### Forbidden Changes

| Change              | Status |
| ------------------- | ------ |
| New logic branches  | ❌     |
| New database fields | ❌     |
| New API endpoints   | ❌     |
| New UI components   | ❌     |

---

## EXCEPTION PROCESS

Exceptions require:

1. **CEO approval** (written)
2. **Justification** (>500 words)
3. **Impact assessment** (all 6 features)
4. **Cost analysis** (Firebase, Gemini)
5. **Rollback plan** (documented)
6. **48-hour review** (stakeholder sign-off)

---

## GOVERNANCE CALENDAR

| Event                      | Frequency | Owner                 |
| -------------------------- | --------- | --------------------- |
| Flag status review         | Monthly   | Engineering Lead      |
| Exception review           | As needed | CEO                   |
| Full governance review     | Quarterly | Product + Engineering |
| Architecture freeze review | Annually  | CEO + CTO             |

---

## ENFORCEMENT

### Violation Types

| Type                     | Example                   | Consequence      |
| ------------------------ | ------------------------- | ---------------- |
| Unreviewed flag change   | Toggling without approval | Revert + warning |
| Unauthorized feature add | New component deployed    | Revert + review  |
| Exception bypass         | Skipping approval         | Incident report  |

### Audit Trail

All changes logged in:

- Git history
- Deployment logs
- This document (CHANGELOG section)

---

## CHANGELOG

| Date       | Change       | Approver |
| ---------- | ------------ | -------- |
| 2026-01-11 | Initial lock | CEO      |
| —          | —            | —        |

---

_Document Status: 🔒 LOCKED_

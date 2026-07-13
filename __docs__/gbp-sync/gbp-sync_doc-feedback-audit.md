# 📝 DOC FEEDBACK AUDIT - GBP Sync (DOCS ONLY)

**Feature:** #3 — Google Business Profile Minimal Sync  
**Feedback Source:** ChatGPT Review  
**Audit Date:** January 19, 2026  
**Auditor:** Lead Architect (Cascade)

> **Launch boundary:** Not current launch certification or deploy approval. This document records disabled/reserved GBP Sync evidence only: `ENABLE_GBP_SYNC` remains false, token operations fail closed with `GBP_TOKEN_STORE_DISABLED`, and manual Google handoff is the only current owner path. Current implementation or release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:public-business-truth`, Google Business Profile API access, OAuth and target-secret setup, provider smoke, scoped deploy evidence, browser/device QA, and production-host smoke.

---

## Summary

| Metric           | Value |
| ---------------- | ----- |
| **Total Points** | 4     |
| **Accepted**     | 4     |
| **Rejected**     | 0     |
| **Clarify**      | 0     |

---

## Audit Table

| #   | ChatGPT Comment                                                                                              | Valid? | Evidence                                                                                                                | Action                       | Target Doc       |
| --- | ------------------------------------------------------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ---------------- |
| 1   | "Hours drift detection underspecified — compare only weekly hours, ignore specialHours, overnight → UNKNOWN" | ✅     | Codebase `workingHours` is simple key-value format (`src/types/platform/store.ts:87-89`), no overnight/special handling | Add hours comparison rules   | spec.md, impl.md |
| 2   | "Menu link field ambiguous — hard lock to `websiteUri` only, add NOT_WRITABLE status"                        | ✅     | GBP API has multiple URL fields; spec/impl use "websiteUrl/menu link" interchangeably                                   | Clarify to `websiteUri` only | spec.md, impl.md |
| 3   | "Token storage path sloppy — change `gbpTokens/{sId}` to `gbp/{sId}`"                                        | ✅     | impl.md line 121 says `gbpTokens` — cleaner namespace with `gbp`                                                        | Update path                  | impl.md          |
| 4   | "Marketing violates Language Governance: 'Get alerted', '78%', 'No credit card'"                             | ✅     | Per `constitution/02-language-governance.md` — no unverified claims, no notification language, no pricing promises      | Fix 3 phrases                | marketing.md     |

---

## 🎯 DOC UPDATE PLAN

### ✅ #1 → spec.md + impl.md: Hours comparison rules

**Add to spec.md:**

- Scope clarification: "Weekly hours only (Phase 1)"
- Overnight hours → mark `hoursStatus='UNKNOWN'`

**Add to impl.md:**

- Algorithm update: Skip specialHours comparison
- Handle overnight hours edge case

### ✅ #2 → spec.md + impl.md: Menu link field clarification

**Add to spec.md:**

- Explicit: "Updates `websiteUri` field only"

**Add to impl.md:**

- Clarify: Only `websiteUri` managed
- `linkStatus='NOT_WRITABLE'` already exists in schema

### ✅ #3 → impl.md: Token storage path

**Change:**

- FROM: `tenants/{tId}/integrations/gbpTokens/{sId}`
- TO: `tenants/{tId}/integrations/gbp/{sId}`

### ✅ #4 → marketing.md: Language Governance fixes

**Replace:**

- "Get alerted when hours drift" → "Shows when hours don't match"
- "78% of customers check Google" → "Google is often the first place guests look"
- "No credit card required to try" → REMOVE

---

## ❌ REJECTED FEEDBACK

_None — all 4 points were valid improvements._

---

**HISTORICAL AUDIT STATUS:** The January 2026 docs-only review was completed and its accepted edits are retained as prior documentation evidence. It does not authorize implementation.

**CURRENT STATUS:** GBP Sync remains disabled; there is no current implementation next step until the launch-boundary prerequisites above are satisfied.

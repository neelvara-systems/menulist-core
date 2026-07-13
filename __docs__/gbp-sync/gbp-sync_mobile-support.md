# GBP Sync — Mobile Support

**Last Updated:** July 10, 2026
**Decision:** No active GBP mobile surface while `ENABLE_GBP_SYNC` is false

> **Launch boundary:** Not current launch certification or deploy approval. This document records disabled/reserved GBP Sync evidence only: `ENABLE_GBP_SYNC` remains false, token operations fail closed with `GBP_TOKEN_STORE_DISABLED`, and manual Google handoff is the only current owner path. Current implementation or release approval still requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md), [External Certification Runbook](../production-readiness/external-certification-runbook.md), `npm run verify:production-readiness-local`, `npm run verify:public-business-truth`, Google Business Profile API access, OAuth and target-secret setup, provider smoke, scoped deploy evidence, browser/device QA, and production-host smoke.

---

## Feature Admission Test

| Gate | Result | Reasoning |
|------|--------|-----------|
| **Frequency** | ⚠️ MIXED | Owners do not use it daily, but may check status on phone |
| **Speed** | ✅ PASS | Read-only status checks are quick on mobile |
| **Touch** | ⚠️ MIXED | OAuth/linking remains poor on mobile |
| **Value** | ✅ PASS | Verifying connection and drift status away from desk is useful |

**Current source boundary:** Mobile shows no Google sync surface while `ENABLE_GBP_SYNC` is false. OAuth, mapping, sync status, and apply-hours actions are not current runtime.

Reserved mobile support after provider gates may show operational status only:
- connection status
- linked location
- menu link state
- hours sync state

OAuth, mapping, and full setup remain desktop-first.

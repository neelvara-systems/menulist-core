# Security — Firebase Cost Tracking

**Feature:** Application Security Layer (20 Mandatory Rules)
**Status:** Firebase cost evidence; not current launch certification
**Last Updated:** February 7, 2026
**Priority:** CRITICAL — Security operations embedded in every API call. No incremental cost.

---

## Current Launch Boundary

Current release approval requires the active [production-readiness audit](../audits/menulist-production-readiness-audit.md) and [External Certification Runbook](../production-readiness/external-certification-runbook.md) evidence, current security-source review, QA/deploy evidence for any changed Firestore rules, indexes, Storage rules, or Cloud Functions, and confirmation that cost monitoring covers any security path that now writes Firebase data. This document is Firebase cost evidence only; it is not production-launch approval.

---

## Summary

Security is not a separate feature with its own Firebase operations. Instead, it's a set of middleware and patterns applied to ALL features. This document tracks the Firebase cost impact of security enforcement.

- **Collections Used:** None dedicated (security uses existing collections)
- **Storage Buckets:** None
- **Cloud Functions:** None dedicated
- **Estimated Monthly Cost:** **$0.00** — Security is middleware overhead, not Firebase operations

---

## Security Patterns & Their Firebase Impact

### `withAuth()` Middleware
- **Impact:** Validates JWT token. No Firestore read (token-based).
- **Cost:** $0 per call

### `verifyTenantAccess()` 
- **Impact:** Checks session tId/sId match. No Firestore read (session-based).
- **Cost:** $0 per call

### `sanitizeForFirestore()` (Rule #16)
- **Impact:** Replaces undefined values with null before writes. No extra operations.
- **Cost:** $0 (CPU only)

### `checkExpensiveAILimit()` Rate Limiting
- **Impact:** May read/write a rate limit counter doc. Lightweight.
- **Cost:** ~$0.00 (negligible)

### `secureLog()` (Rule #18)
- **Impact:** Logs to Sentry, not Firestore. No Firebase cost.
- **Cost:** $0

### Firestore Security Rules
- **Impact:** Default deny. Rules evaluated server-side by Firebase. No cost per rule evaluation.
- **Cost:** $0

---

## Security Rules Summary

| Rule | Firebase Impact |
|------|----------------|
| API route protection (`withAuth`) | $0 — JWT validation |
| Multi-tenant isolation | $0 — session check |
| Zod input validation | $0 — CPU only |
| Security event logging | $0 — Sentry, not Firestore |
| Rate limiting | ~$0 — lightweight counter |
| Firestore rules (default deny) | $0 — server-side |
| No sensitive data in logs | $0 — prevention, not operation |
| HTTPS only | $0 — transport layer |
| Generic error messages | $0 — response formatting |
| Session data sanitization | $0 — CPU only |

---

## Cost Estimate

**$0.00/month** — Security is middleware overhead with zero incremental Firebase cost.
